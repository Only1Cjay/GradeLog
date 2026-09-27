/* ============================================================
   GradeLog — app.js
   Shell + Chunk B (year tree, semester rows, add/edit course)
   ============================================================ */

(() => {
  'use strict';

  const LS = {
    theme: 'gradelog.theme',
    installDismissed: 'gradelog.installDismissed',
    uiState: 'gradelog.ui.state'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    readOnly: false,
    demoMode: false,
    data: null,
    openYears: {},        // { 1: true, 2: false }
    openSemesters: {}     // { '1-1': true }
  };

  /* ---------------------------------------------------------- */
  /* URL flags                                                   */
  /* ---------------------------------------------------------- */
  function parseUrlFlags() {
    const params = new URLSearchParams(location.search);
    state.demoMode = params.get('view') === '1';
    state.readOnly = state.demoMode;
  }

  /* ---------------------------------------------------------- */
  /* UI state persistence                                        */
  /* ---------------------------------------------------------- */
  function loadUiState() {
    try {
      const raw = localStorage.getItem(LS.uiState);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state.openYears = parsed.years || {};
      state.openSemesters = parsed.semesters || {};
    } catch (e) {}
  }

  function saveUiState() {
    try {
      localStorage.setItem(LS.uiState, JSON.stringify({
        years: state.openYears,
        semesters: state.openSemesters
      }));
    } catch (e) {}
  }

  function isYearOpen(year, hasCourses) {
    return state.openYears[year] !== undefined
      ? !!state.openYears[year]
      : hasCourses;
  }

  function isSemesterOpen(year, semester, hasCourses) {
    const k = `${year}-${semester}`;
    return state.openSemesters[k] !== undefined
      ? !!state.openSemesters[k]
      : hasCourses;
  }

  /* ---------------------------------------------------------- */
  /* Theme                                                       */
  /* ---------------------------------------------------------- */
  const themeToggle = $('#themeToggle');
  const themeIcon = $('#themeIcon');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0F17' : '#1E3A5F');
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (!state.readOnly) {
      localStorage.setItem(LS.theme, next);
      Storage.updateSettings({ theme: next });
    }
  });

  /* ---------------------------------------------------------- */
  /* Menu                                                        */
  /* ---------------------------------------------------------- */
  const menuBtn = $('#menuBtn');
  const menuDropdown = $('#menuDropdown');
  const menuBackdrop = $('#menuBackdrop');

  function openMenu() {
    menuDropdown.hidden = false;
    menuBackdrop.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menuDropdown.hidden = true;
    menuBackdrop.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.hidden ? openMenu() : closeMenu();
  });

  menuBackdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      if (!$('#viewRoot').hidden) { closeView(); return; }
      closeModal();
    }
  });

  $$('.menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      closeMenu();
      handleMenuAction(action);
    });
  });

  function handleMenuAction(action) {
    switch (action) {
      case 'search':       toast('Search coming in Chunk D', { icon: 'fa-magnifying-glass' }); break;
      case 'calculators':  openView('calculators'); break;
      case 'reports':      openView('reports'); break;
      case 'settings':     toast('Settings coming in Chunk D', { icon: 'fa-gear' }); break;
      case 'tools':        openToolsSheet(); break;
    }
  }

  /* ---------------------------------------------------------- */
  /* Toast                                                       */
  /* ---------------------------------------------------------- */
  const toastStack = $('#toastStack');
  const MAX_TOASTS = 3;

  function toast(message, opts = {}) {
    const {
      icon = 'fa-circle-info',
      type = 'info',
      duration = 5000,
      action = null,
      persist = false
    } = opts;

    const existing = $$('.toast', toastStack);
    if (existing.length >= MAX_TOASTS) dismissToast(existing[0]);

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <span class="toast-msg"></span>
      ${action ? '<button class="toast-action"></button>' : ''}
      <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
    `;
    el.querySelector('.toast-msg').textContent = message;

    if (action) {
      const btn = el.querySelector('.toast-action');
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick?.();
        dismissToast(el);
      });
    }

    el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
    toastStack.appendChild(el);

    if (!persist && duration > 0) {
      el._timer = setTimeout(() => dismissToast(el), duration);
    }
    return el;
  }

  function dismissToast(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._timer);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 240);
  }

  /* ---------------------------------------------------------- */
  /* Modal                                                       */
  /* ---------------------------------------------------------- */
  const modalRoot = $('#modalRoot');
  const modalSlot = $('#modalSlot');
  const modalBackdrop = $('#modalBackdrop');

  function openModal(contentEl) {
    modalSlot.innerHTML = '';
    modalSlot.appendChild(contentEl);
    modalRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (modalRoot.hidden) return;
    modalRoot.hidden = true;
    modalSlot.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  modalBackdrop.addEventListener('click', closeModal);

  /* ---------------------------------------------------------- */
  /* View system                                                 */
  /* ---------------------------------------------------------- */
  const viewRoot = $('#viewRoot');

  function openView(name) {
    viewRoot.innerHTML = '';
    viewRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('view-open');

    const el = document.createElement('div');
    el.className = 'view';
    viewRoot.appendChild(el);

    if (name === 'calculators') renderCalculatorsView(el);
    else if (name === 'reports') renderReportsView(el);
    else renderPlaceholderView(el, name);
  }

  function renderPlaceholderView(el, name) {
    el.innerHTML = `
      <div class="view-header">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="view-title">${escapeHTML(name)}</h2>
      </div>
      <div class="view-body">
        <div style="padding:48px 24px; text-align:center; color:var(--muted);">
          Coming in a later chunk.
        </div>
      </div>
    `;
    el.querySelector('[data-act="back"]').addEventListener('click', closeView);
  }

  function closeView() {
    viewRoot.hidden = true;
    viewRoot.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('view-open');
  }

  /* ---------------------------------------------------------- */
  /* Utilities                                                   */
  /* ---------------------------------------------------------- */
  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(n, digits = 2) {
    return n === null || n === undefined || isNaN(n) ? '—' : Number(n).toFixed(digits);
  }

  function gradeClass(grade, scale) {
    if (!grade) return 'grade-null';
    const s = Storage.SCALES[scale] || Storage.SCALES['5.0'];
    const p = s.points[grade];
    if (p === undefined) return 'grade-null';
    const ratio = p / s.max;
    if (ratio >= 0.9) return 'grade-a';
    if (ratio >= 0.7) return 'grade-b';
    if (ratio >= 0.5) return 'grade-c';
    if (ratio >= 0.3) return 'grade-d';
    return 'grade-f';
  }

  /* ---------------------------------------------------------- */
  /* Tools sheet (stub)                                          */
  /* ---------------------------------------------------------- */
  function openToolsSheet() {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Tools</h3>
      <div style="padding:24px; text-align:center; color:var(--muted); font-size:13.5px;">
        Backup, restore, import, export, print — coming in Chunk D.
      </div>
    `;
    openModal(sheet);
  }

  /* ---------------------------------------------------------- */
  /* Offline banner                                              */
  /* ---------------------------------------------------------- */
  const offlineBanner = $('#offlineBanner');
  function updateOnlineStatus() {
    offlineBanner.classList.toggle('show', !navigator.onLine);
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  /* ---------------------------------------------------------- */
  /* Install prompt                                              */
  /* ---------------------------------------------------------- */
  const installBanner = $('#installBanner');
  const installAccept = $('#installAccept');
  const installDismiss = $('#installDismiss');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem(LS.installDismissed) !== '1') {
      installBanner.hidden = false;
    }
  });

  installAccept.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.hidden = true;
    toast(outcome === 'accepted' ? 'Installing…' : 'Install dismissed', {
      type: outcome === 'accepted' ? 'success' : 'info',
      icon: 'fa-circle-down'
    });
  });

  installDismiss.addEventListener('click', () => {
    installBanner.hidden = true;
    localStorage.setItem(LS.installDismissed, '1');
  });

  /* ---------------------------------------------------------- */
  /* Service worker                                              */
  /* ---------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });
        setInterval(() => reg.update(), 30 * 60 * 1000);
      }).catch((err) => console.warn('SW registration failed:', err));
    });
  }

  function showUpdateToast(reg) {
    const menuBadge = $('#menuBadge');
    const el = toast('New version available', {
      icon: 'fa-arrows-rotate',
      type: 'info',
      persist: true,
      action: {
        label: 'Refresh',
        onClick: () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 200);
        }
      }
    });

    setTimeout(() => {
      if (el && !el._dismissed) {
        dismissToast(el);
        menuBadge.hidden = false;
      }
    }, 30000);

    menuBadge.addEventListener('click', () => {
      menuBadge.hidden = true;
      showUpdateToast(reg);
    }, { once: true });
  }

  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  /* ============================================================ */
  /* Chunk B — Data rendering                                     */
  /* ============================================================ */

  const yearTree = $('#yearTree');
  const addYearBtn = $('#addYearBtn');
  const doneNote = $('#doneNote');
  const statCgpa = $('#statCgpa');
  const statClass = $('#statClass');
  const statUnits = $('#statUnits');

  function refresh() {
    state.data = state.readOnly ? state.data : Storage.getData();
    renderAll();
  }

  function renderAll() {
    renderStats();
    renderYearTree();
    renderAddYearControl();
  }

  /* ---------------------------------------------------------- */
  /* Stat strip                                                  */
  /* ---------------------------------------------------------- */
  function renderStats() {
    const data = state.data;
    const cgpa = Storage.cgpa(data);
    const classInfo = Storage.classify(cgpa, data.scale);

    statCgpa.textContent = cgpa === null ? '—' : cgpa.toFixed(2);
    statClass.textContent = classInfo.label === '—' ? '—' : classInfo.label;

    // Class color
    statClass.className = 'stat-strip-value';
    if (classInfo.key && classInfo.key !== 'none') {
      statClass.classList.add(`class-${classInfo.key}`);
    }

    const totals = Storage.totalsOf(Storage.activeCourses(data), data.scale);
    statUnits.textContent = totals.units;
  }

  /* ---------------------------------------------------------- */
  /* Year tree                                                   */
  /* ---------------------------------------------------------- */
  function renderYearTree() {
    const data = state.data;
    yearTree.innerHTML = '';

    if (!data.years.length) {
      yearTree.appendChild(renderEmptyState());
      return;
    }

    data.years.slice().sort((a, b) => a - b).forEach((year) => {
      yearTree.appendChild(renderYearBlock(year));
    });
  }

  function renderEmptyState() {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.innerHTML = `
      <svg class="empty-icon" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M60 20 L108 44 L60 68 L12 44 Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
        <path d="M30 56 V84 C30 84 44 96 60 96 C76 96 90 84 90 84 V56" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
        <path d="M96 50 V82" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="96" cy="86" r="4" fill="currentColor"/>
      </svg>
      <div class="empty-title">No years yet</div>
      <div class="empty-sub">Tap <strong>Add Year</strong> below to start building your record.</div>
    `;
    return el;
  }

  function renderYearBlock(year) {
    const data = state.data;
    const scale = data.scale;

    const sem1 = data.courses.filter((c) => c.year === year && c.semester === 1);
    const sem2 = data.courses.filter((c) => c.year === year && c.semester === 2);

    // Year average uses only active semesters
    const activeSem1 = Storage.isSemesterActive(year, 1) ? sem1 : [];
    const activeSem2 = Storage.isSemesterActive(year, 2) ? sem2 : [];
    const yearCourses = [...activeSem1, ...activeSem2];
    const yearGpa = Storage.gpaOf(yearCourses, scale);

    const hasCourses = sem1.length > 0 || sem2.length > 0;
    const open = isYearOpen(year, hasCourses);

    const block = document.createElement('div');
    block.className = 'year-block' + (open ? ' open' : '');
    block.dataset.year = year;

    // --- Header ---
    const head = document.createElement('div');
    head.className = 'year-head';
    head.innerHTML = `
      <div class="year-head-left">
        <h2>Year ${year}</h2>
        <span class="year-gpa num">${yearGpa === null ? 'not started' : 'avg ' + fmt(yearGpa)}</span>
      </div>
      <div class="year-head-right">
        <button class="year-menu-btn" aria-label="Year actions" tabindex="0">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
        <span class="chevron ${open ? 'open' : ''}"><i class="fa-solid fa-chevron-down"></i></span>
      </div>
    `;

    head.addEventListener('click', (e) => {
      if (e.target.closest('.year-menu-btn')) return;
      const nowOpen = !block.classList.contains('open');
      block.classList.toggle('open', nowOpen);
      state.openYears[year] = nowOpen;
      saveUiState();
      head.querySelector('.chevron').classList.toggle('open', nowOpen);
    });

    head.querySelector('.year-menu-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openYearMenu(year, e.currentTarget);
    });

    block.appendChild(head);

    // --- Body ---
    const body = document.createElement('div');
    body.className = 'year-body';

    body.appendChild(renderSemester(year, 1, sem1));
    body.appendChild(renderSemester(year, 2, sem2));

    block.appendChild(body);
    return block;
  }

  function renderSemester(year, semester, courses) {
    const data = state.data;
    const scale = data.scale;
    const active = Storage.isSemesterActive(year, semester);
    const gpa = active ? Storage.gpaOf(courses, scale) : null;
    const open = isSemesterOpen(year, semester, courses.length > 0);

    const wrap = document.createElement('div');
    wrap.className = 'sem' + (active ? '' : ' sem-inactive') + (open ? ' open' : '');

    // --- Header ---
    const head = document.createElement('div');
    head.className = 'sem-head';
    head.innerHTML = `
      <div class="sem-head-left">
        <button class="sem-switch" role="switch" aria-checked="${active}" aria-label="Toggle semester ${semester}" ${state.readOnly ? 'disabled' : ''}>
          <span></span>
        </button>
        <h3 class="sem-title">Semester ${semester}</h3>
      </div>
      <div class="sem-head-right">
        <span class="sem-gpa num ${gpa === null ? 'sem-gpa-empty' : ''}">${gpa === null ? '' : 'GPA ' + fmt(gpa)}</span>
        <span class="chevron ${open ? 'open' : ''}"><i class="fa-solid fa-chevron-down"></i></span>
      </div>
    `;

    if (!state.readOnly) {
      head.querySelector('.sem-switch').addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !Storage.isSemesterActive(year, semester);
        Storage.setSemesterActive(year, semester, next);
        refresh();
      });
    }

    head.addEventListener('click', (e) => {
      if (e.target.closest('.sem-switch')) return;
      const nowOpen = !wrap.classList.contains('open');
      wrap.classList.toggle('open', nowOpen);
      state.openSemesters[`${year}-${semester}`] = nowOpen;
      saveUiState();
      head.querySelector('.chevron').classList.toggle('open', nowOpen);
    });

    wrap.appendChild(head);

    // --- Body ---
    const body = document.createElement('div');
    body.className = 'sem-content';

    if (!courses.length) {
      const empty = document.createElement('div');
      empty.className = 'sem-empty';
      empty.textContent = 'No courses yet.';
      body.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'course-list';
      courses
        .slice()
        .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''))
        .forEach((course) => list.appendChild(renderCourseRow(course)));
      body.appendChild(list);
    }

    if (!state.readOnly) {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-course-btn';
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i><span>Add Course</span>';
      addBtn.addEventListener('click', () => {
        openCourseSheet({ year, semester, mode: 'add' });
      });
      body.appendChild(addBtn);
    }

    wrap.appendChild(body);
    return wrap;
  }

  function renderCourseRow(course) {
    const scale = state.data.scale;
    const row = document.createElement('button');
    row.className = 'course-row';
    row.type = 'button';

    const gc = gradeClass(course.grade, scale);
    const gradeText = course.grade || '—';

    row.innerHTML = `
      <span class="course-code">${escapeHTML(course.courseCode || 'Untitled')}</span>
      <span class="course-units num">${course.units} <span class="course-units-label">u</span></span>
      <span class="course-grade ${gc}">${gradeText}</span>
    `;

    row.addEventListener('click', () => {
      if (state.readOnly) return;
      openCourseSheet({ year: course.year, semester: course.semester, courseId: course.id, mode: 'edit' });
    });

    return row;
  }

  /* ---------------------------------------------------------- */
  /* Add Year                                                    */
  /* ---------------------------------------------------------- */
  function renderAddYearControl() {
    const data = state.data;
    const years = data.years.slice().sort((a, b) => a - b);
    const nextYear = years.length ? Math.max(...years) + 1 : 1;

    if (state.readOnly) {
      addYearBtn.hidden = true;
      doneNote.hidden = true;
      return;
    }

    if (nextYear <= Storage.MAX_YEARS) {
      addYearBtn.hidden = false;
      doneNote.hidden = true;
      addYearBtn.innerHTML = `<i class="fa-solid fa-plus"></i><span>Add Year ${nextYear}</span>`;
      addYearBtn.onclick = () => {
        Storage.addYear(nextYear);
        state.openYears[nextYear] = true;
        saveUiState();
        refresh();
        toast(`Year ${nextYear} added`, { type: 'success', icon: 'fa-plus' });
      };
    } else {
      addYearBtn.hidden = true;
      doneNote.hidden = false;
    }
  }

  /* ---------------------------------------------------------- */
  /* Year menu (popover)                                         */
  /* ---------------------------------------------------------- */
  function openYearMenu(year, anchor) {
    const data = state.data;
    const isLastYear = data.years.length === 1;

    const menu = document.createElement('div');
    menu.className = 'popover-menu';
    menu.innerHTML = `
      <button data-act="remove" class="danger" ${isLastYear ? 'disabled' : ''}>
        <i class="fa-solid fa-trash-can"></i>Remove Year ${year}
      </button>
    `;

    const rect = anchor.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.max(12, rect.right - 200)}px`;
    menu.style.zIndex = 65;
    document.body.appendChild(menu);

    const close = () => menu.remove();
    const onDocClick = (e) => {
      if (!menu.contains(e.target)) {
        close();
        document.removeEventListener('click', onDocClick);
      }
    };
    setTimeout(() => document.addEventListener('click', onDocClick), 0);

    menu.querySelector('[data-act="remove"]').addEventListener('click', () => {
      close();
      if (isLastYear) return;
      confirmRemoveYear(year);
    });
  }

  function confirmRemoveYear(year) {
    const data = state.data;
    const coursesInYear = data.courses.filter((c) => c.year === year);
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Remove Year ${year}?</h3>
      <p class="sheet-body">
        This will delete the year, both semesters, and
        <strong>${coursesInYear.length}</strong> course${coursesInYear.length === 1 ? '' : 's'}.
        You'll have 5 seconds to undo.
      </p>
      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-danger" data-act="confirm">Remove</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);
    sheet.querySelector('[data-act="confirm"]').addEventListener('click', () => {
      closeModal();
      doRemoveYearWithUndo(year);
    });
  }

  function doRemoveYearWithUndo(year) {
    const snapshot = JSON.parse(JSON.stringify(state.data));
    Storage.removeYear(year);
    delete state.openYears[year];
    saveUiState();
    refresh();

    toast(`Year ${year} removed`, {
      type: 'info',
      icon: 'fa-trash-can',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          Storage._raw.write(snapshot);
          refresh();
          toast('Restored', { type: 'success', icon: 'fa-rotate-left' });
        }
      }
    });
  }

  /* ---------------------------------------------------------- */
  /* Course sheet (add / edit)                                   */
  /* ---------------------------------------------------------- */
  function openCourseSheet({ year, semester, courseId = null, mode = 'add' }) {
    const data = state.data;
    const scale = data.scale;
    const letters = Storage.SCALES[scale].letters;

    const editing = mode === 'edit' && courseId
      ? data.courses.find((c) => c.id === courseId)
      : null;

    let currentUnits = editing?.units ?? 3;
    let currentGrade = editing?.grade ?? null;

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet course-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">${editing ? 'Edit Course' : 'Add Course'}</h3>
      <div class="course-sheet-context">
        Year ${year} · Semester ${semester}
      </div>

      <label class="field">
        <span class="field-label">Course Code</span>
        <input type="text" id="fCode" placeholder="e.g. PCL 201" autocomplete="off" spellcheck="false" autocapitalize="characters" value="${editing ? escapeHTML(editing.courseCode || '') : ''}">
      </label>

      <div class="field">
        <span class="field-label">Units</span>
        <div class="units-stepper">
          <button type="button" class="units-step" data-act="dec" aria-label="Decrease units">
            <i class="fa-solid fa-minus"></i>
          </button>
          <input type="number" id="fUnits" min="1" max="12" value="${currentUnits}" inputmode="numeric">
          <button type="button" class="units-step" data-act="inc" aria-label="Increase units">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">Grade</span>
        <div class="grade-pills" id="gradePills">
          <button type="button" class="grade-pill grade-null" data-grade="">—</button>
          ${letters.map((L) => {
            const gc = gradeClass(L, scale);
            return `<button type="button" class="grade-pill ${gc}" data-grade="${L}">${L}</button>`;
          }).join('')}
        </div>
        <div class="field-hint">Tap — for courses without a grade yet (planned semesters).</div>
      </div>

      <div class="sheet-actions ${editing ? 'three' : ''}">
        ${editing ? '<button class="btn-danger-ghost" data-act="delete"><i class="fa-solid fa-trash-can"></i> Delete</button>' : ''}
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-primary" data-act="save">${editing ? 'Save' : 'Add'}</button>
      </div>
    `;

    openModal(sheet);

    const codeInput = sheet.querySelector('#fCode');
    const unitsInput = sheet.querySelector('#fUnits');
    const pillsWrap = sheet.querySelector('#gradePills');

    function updatePills() {
      pillsWrap.querySelectorAll('.grade-pill').forEach((p) => {
        const g = p.dataset.grade || null;
        p.classList.toggle('active', (g || null) === (currentGrade || null));
      });
    }

    function updateUnits(val) {
      currentUnits = Math.max(1, Math.min(12, Number(val) || 1));
      unitsInput.value = currentUnits;
    }

    sheet.querySelector('[data-act="dec"]').addEventListener('click', () => updateUnits(currentUnits - 1));
    sheet.querySelector('[data-act="inc"]').addEventListener('click', () => updateUnits(currentUnits + 1));
    unitsInput.addEventListener('input', () => updateUnits(unitsInput.value));
    unitsInput.addEventListener('blur', () => { unitsInput.value = currentUnits; });

    pillsWrap.querySelectorAll('.grade-pill').forEach((p) => {
      p.addEventListener('click', () => {
        currentGrade = p.dataset.grade || null;
        updatePills();
      });
    });

    updatePills();

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    sheet.querySelector('[data-act="save"]').addEventListener('click', () => {
      const code = codeInput.value.trim();
      if (!code) {
        toast('Please add a course code', { type: 'warn', icon: 'fa-triangle-exclamation' });
        codeInput.focus();
        return;
      }

      if (editing) {
        Storage.updateCourse(editing.id, {
          courseCode: code,
          units: currentUnits,
          grade: currentGrade
        });
        toast('Course updated', { type: 'success', icon: 'fa-check' });
      } else {
        Storage.addCourse({
          year, semester,
          courseCode: code,
          units: currentUnits,
          grade: currentGrade
        });
        toast('Course added', { type: 'success', icon: 'fa-plus' });
      }
      closeModal();
      refresh();
    });

    if (editing) {
      sheet.querySelector('[data-act="delete"]').addEventListener('click', () => {
        closeModal();
        doDeleteCourseWithUndo(editing);
      });
    }

    setTimeout(() => {
      if (!editing) codeInput.focus();
    }, 250);
  }

  function doDeleteCourseWithUndo(course) {
    Storage.removeCourse(course.id);
    refresh();

    toast('Course removed', {
      type: 'info',
      icon: 'fa-trash-can',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const data = Storage.getData();
          data.courses.push(course);
          Storage.setData(data);
          refresh();
          toast('Restored', { type: 'success', icon: 'fa-rotate-left' });
        }
      }
    });
  }

  /* ============================================================ */
  /* Chunk C — Calculators                                       */
  /* ============================================================ */

  function renderCalculatorsView(root) {
    root.innerHTML = `
      <div class="view-header">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="view-title">Calculators</h2>
      </div>
      <div class="calc-tabs" role="tablist">
        <button class="calc-tab active" data-tab="target" role="tab" aria-selected="true">Target</button>
        <button class="calc-tab" data-tab="whatif" role="tab" aria-selected="false">What-If</button>
        <button class="calc-tab" data-tab="projections" role="tab" aria-selected="false">Projections</button>
        <button class="calc-tab" data-tab="bestworst" role="tab" aria-selected="false">Best/Worst</button>
      </div>
      <div class="view-body" id="calcBody"></div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const body = root.querySelector('#calcBody');
    const tabs = Array.from(root.querySelectorAll('.calc-tab'));

    function setTab(name) {
      tabs.forEach((t) => {
        const active = t.dataset.tab === name;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });
      if (name === 'target') renderTargetCalc(body);
      else if (name === 'whatif') renderWhatIfCalc(body);
      else if (name === 'projections') renderProjectionsCalc(body);
      else if (name === 'bestworst') renderBestWorstCalc(body);
    }

    tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
    setTab('target');
  }

  /* Shared context for all calculators */
  function calcContext() {
    const data = state.data;
    const active = Storage.activeCourses(data);
    const totals = Storage.totalsOf(active, data.scale);
    const cgpa = totals.units ? totals.points / totals.units : null;
    return {
      data,
      scale: data.scale,
      max: Storage.SCALES[data.scale].max,
      units: totals.units,
      points: totals.points,
      cgpa
    };
  }

  /* -------- Target Calculator -------- */
  function renderTargetCalc(body) {
    const ctx = calcContext();

    body.innerHTML = `
      <div class="calc-card">
        <h3 class="calc-card-title">Target Calculator</h3>
        <p class="calc-card-sub">
          How many straight-A units do you need to reach a specific CGPA?
        </p>

        <div class="target-pills" id="targetPills">
          ${[3.5, 4.0, 4.5, 5.0]
            .filter((v) => v <= ctx.max)
            .map((v) => `<button class="target-pill" data-value="${v}">${v.toFixed(1)}</button>`)
            .join('')}
        </div>

        <label class="field">
          <span class="field-label">Custom target (max ${ctx.max.toFixed(1)})</span>
          <input type="number" id="targetInput" step="0.01" min="0" max="${ctx.max}" placeholder="e.g. 4.20">
        </label>

        <div id="targetResult"></div>
      </div>

      <div class="calc-context-strip">
        <div><span>Current CGPA</span><strong class="num">${ctx.cgpa === null ? '—' : ctx.cgpa.toFixed(2)}</strong></div>
        <div><span>Total units</span><strong class="num">${ctx.units}</strong></div>
      </div>
    `;

    const input = body.querySelector('#targetInput');
    const pills = Array.from(body.querySelectorAll('.target-pill'));
    const result = body.querySelector('#targetResult');

    function clearPills() {
      pills.forEach((p) => p.classList.remove('active'));
    }

    function compute() {
      const target = parseFloat(input.value);

      if (!target || isNaN(target)) { result.innerHTML = ''; return; }

      if (target > ctx.max) {
        result.innerHTML = `
          <div class="calc-result neutral">
            <div class="calc-result-sub">A CGPA above ${ctx.max.toFixed(2)} isn't possible on this scale.</div>
          </div>`;
        return;
      }

      if (ctx.cgpa === null) {
        result.innerHTML = `
          <div class="calc-result neutral">
            <div class="calc-result-sub">Add a few graded courses first to compute this.</div>
          </div>`;
        return;
      }

      if (ctx.cgpa >= target) {
        result.innerHTML = `
          <div class="calc-result success">
            <div class="calc-result-check"><i class="fa-solid fa-check"></i></div>
            <div class="calc-result-label">Already there</div>
            <div class="calc-result-sub">Current CGPA is ${ctx.cgpa.toFixed(2)}, above your target of ${target.toFixed(2)}.</div>
          </div>`;
        return;
      }

      if (target >= ctx.max) {
        result.innerHTML = `
          <div class="calc-result neutral">
            <div class="calc-result-sub">Only reachable with straight A's indefinitely.</div>
          </div>`;
        return;
      }

      const needed = Math.ceil((target * ctx.units - ctx.points) / (ctx.max - target));

      result.innerHTML = `
        <div class="calc-result">
          <div class="calc-result-label">Units of straight A's needed</div>
          <div class="calc-result-value num">${needed}</div>
          <div class="calc-result-sub">to reach a ${target.toFixed(2)} CGPA</div>
        </div>`;
    }

    pills.forEach((p) => {
      p.addEventListener('click', () => {
        input.value = Number(p.dataset.value).toFixed(2);
        clearPills();
        p.classList.add('active');
        compute();
      });
    });

    input.addEventListener('input', () => { clearPills(); compute(); });
    compute();
  }

  /* -------- What-If Simulator -------- */
  function renderWhatIfCalc(body) {
    const ctx = calcContext();
    let whatIfUnits = 15;
    let whatIfGrade = 'A';

    body.innerHTML = `
      <div class="calc-card">
        <h3 class="calc-card-title">What-If Simulator</h3>
        <p class="calc-card-sub">
          See how your CGPA changes if you take more units at a given grade.
        </p>

        <div class="units-stepper" style="margin: 0 0 20px;">
          <button type="button" class="units-step" data-act="dec" aria-label="Decrease">
            <i class="fa-solid fa-minus"></i>
          </button>
          <input type="number" id="whatIfUnits" min="0" max="200" value="15" inputmode="numeric">
          <button type="button" class="units-step" data-act="inc" aria-label="Increase">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>

        <div class="field-label" style="padding:0; margin-bottom:8px;">At grade</div>
        <div class="grade-pills" id="whatIfPills" style="margin-bottom:20px;"></div>

        <div id="whatIfResult"></div>
      </div>

      <div class="calc-context-strip">
        <div><span>Current CGPA</span><strong class="num">${ctx.cgpa === null ? '—' : ctx.cgpa.toFixed(2)}</strong></div>
        <div><span>Current units</span><strong class="num">${ctx.units}</strong></div>
      </div>
    `;

    const unitsInput = body.querySelector('#whatIfUnits');
    const pillsWrap = body.querySelector('#whatIfPills');
    const result = body.querySelector('#whatIfResult');

    const letters = Storage.SCALES[ctx.scale].letters;

    pillsWrap.innerHTML = letters.map((L) => {
      const gc = gradeClass(L, ctx.scale);
      return `<button class="grade-pill ${gc} ${L === whatIfGrade ? 'active' : ''}" data-grade="${L}">${L}</button>`;
    }).join('');

    function compute() {
      if (ctx.cgpa === null || ctx.units === 0) {
        result.innerHTML = `
          <div class="calc-result neutral">
            <div class="calc-result-sub">Add a few graded courses first to simulate.</div>
          </div>`;
        return;
      }

      const addPoints = whatIfUnits * Storage.pointsFor(whatIfGrade, ctx.scale);
      const newCgpa = (ctx.points + addPoints) / (ctx.units + whatIfUnits);
      const diff = newCgpa - ctx.cgpa;
      const isUp = diff >= -0.001;
      const isFlat = Math.abs(diff) < 0.005;

      const diffLabel = isFlat
        ? 'no change'
        : (diff > 0 ? '+' + diff.toFixed(2) : diff.toFixed(2));

      result.innerHTML = `
        <div class="calc-result ${isUp ? '' : 'danger'}">
          <div class="calc-result-label">Projected CGPA</div>
          <div class="calc-result-value num">${newCgpa.toFixed(2)}</div>
          <div class="calc-result-sub">${diffLabel} vs current · ${whatIfUnits} units at ${whatIfGrade}</div>
        </div>`;
    }

    body.querySelector('[data-act="dec"]').addEventListener('click', () => {
      whatIfUnits = Math.max(0, whatIfUnits - 1);
      unitsInput.value = whatIfUnits;
      compute();
    });
    body.querySelector('[data-act="inc"]').addEventListener('click', () => {
      whatIfUnits++;
      unitsInput.value = whatIfUnits;
      compute();
    });
    unitsInput.addEventListener('input', () => {
      whatIfUnits = Math.max(0, Number(unitsInput.value) || 0);
      compute();
    });

    pillsWrap.querySelectorAll('.grade-pill').forEach((p) => {
      p.addEventListener('click', () => {
        whatIfGrade = p.dataset.grade;
        pillsWrap.querySelectorAll('.grade-pill').forEach((x) => x.classList.remove('active'));
        p.classList.add('active');
        compute();
      });
    });

    compute();
  }

  /* -------- Projections -------- */
  function renderProjectionsCalc(body) {
    const ctx = calcContext();
    const data = ctx.data;

    // Estimate remaining units from active semester count
    const activeSemCount = new Set(
      Storage.activeCourses(data)
        .filter((c) => c.units > 0)
        .map((c) => `${c.year}-${c.semester}`)
    ).size;

    const avgUnitsPerSem = activeSemCount > 0 ? ctx.units / activeSemCount : 18;
    const remainingSems = Math.max(0, 12 - activeSemCount);
    const defaultRemaining = Math.round(remainingSems * avgUnitsPerSem);

    body.innerHTML = `
      <div class="calc-card">
        <h3 class="calc-card-title">Projections</h3>
        <p class="calc-card-sub">
          Forecast your graduating CGPA based on the units you have left.
        </p>

        <label class="field">
          <span class="field-label">Remaining units</span>
          <input type="number" id="projUnits" min="0" max="500" value="${defaultRemaining}" inputmode="numeric">
        </label>

        <label class="field">
          <span class="field-label">Expected average grade point</span>
          <input type="number" id="projAvg" min="0" max="${ctx.max}" step="0.01"
                 value="${ctx.cgpa !== null ? ctx.cgpa.toFixed(2) : ''}"
                 placeholder="e.g. 4.20">
        </label>

        <div id="projResult"></div>
      </div>

      <div class="calc-context-strip">
        <div><span>Covered semesters</span><strong class="num">${activeSemCount}/12</strong></div>
        <div><span>Current units</span><strong class="num">${ctx.units}</strong></div>
      </div>
    `;

    const unitsIn = body.querySelector('#projUnits');
    const avgIn = body.querySelector('#projAvg');
    const result = body.querySelector('#projResult');

    function compute() {
      if (ctx.cgpa === null) {
        result.innerHTML = `
          <div class="calc-result neutral">
            <div class="calc-result-sub">Add some graded courses first.</div>
          </div>`;
        return;
      }

      const remUnits = Math.max(0, Number(unitsIn.value) || 0);
      const expected = parseFloat(avgIn.value);

      if (!remUnits || isNaN(expected)) {
        result.innerHTML = '';
        return;
      }

      const projected = (ctx.points + remUnits * expected) / (ctx.units + remUnits);
      const maxPossible = (ctx.points + remUnits * ctx.max) / (ctx.units + remUnits);
      const minPossible = ctx.points / (ctx.units + remUnits);

      result.innerHTML = `
        <div class="calc-result">
          <div class="calc-result-label">Projected graduating CGPA</div>
          <div class="calc-result-value num">${projected.toFixed(2)}</div>
          <div class="calc-result-sub">if you average ${expected.toFixed(2)} over ${remUnits} units</div>
        </div>

        <div class="proj-range">
          <div class="proj-range-row">
            <span>Best case (all ${ctx.max.toFixed(2)}s)</span>
            <strong class="num">${maxPossible.toFixed(2)}</strong>
          </div>
          <div class="proj-range-row">
            <span>Worst case (all F's)</span>
            <strong class="num">${minPossible.toFixed(2)}</strong>
          </div>
        </div>
      `;
    }

    unitsIn.addEventListener('input', compute);
    avgIn.addEventListener('input', compute);
    compute();
  }

  /* -------- Best / Worst -------- */
  function renderBestWorstCalc(body) {
    const ctx = calcContext();
    const data = ctx.data;

    const sems = [];
    data.years.forEach((y) => {
      [1, 2].forEach((s) => {
        const active = Storage.isSemesterActive(y, s);
        if (!active) return;
        const courses = data.courses.filter(
          (c) => c.year === y && c.semester === s && c.units > 0 && c.grade
        );
        if (!courses.length) return;
        const gpa = Storage.gpaOf(courses, ctx.scale);
        sems.push({
          year: y,
          semester: s,
          gpa,
          units: courses.reduce((sum, c) => sum + c.units, 0),
          count: courses.length
        });
      });
    });

    if (!sems.length) {
      body.innerHTML = `
        <div class="calc-card">
          <h3 class="calc-card-title">Best &amp; Worst Semester</h3>
          <div class="calc-empty">No graded semesters yet.</div>
        </div>`;
      return;
    }

    const sorted = sems.slice().sort((a, b) => b.gpa - a.gpa);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const rows = sems
      .slice()
      .sort((a, b) => (a.year - b.year) || (a.semester - b.semester))
      .map((s) => {
        const cls = Storage.classify(s.gpa, ctx.scale);
        return `
          <div class="sem-row">
            <div class="sem-row-left">
              <div class="sem-row-title">Year ${s.year}, Semester ${s.semester}</div>
              <div class="sem-row-sub">${s.count} course${s.count === 1 ? '' : 's'} · ${s.units} units</div>
            </div>
            <div class="sem-row-right">
              <div class="sem-row-gpa num">${s.gpa.toFixed(2)}</div>
              <div class="sem-row-class class-${cls.key}">${cls.label}</div>
            </div>
          </div>`;
      }).join('');

    body.innerHTML = `
      <div class="calc-card">
        <h3 class="calc-card-title">Best &amp; Worst Semester</h3>
        <p class="calc-card-sub">Across all active, graded semesters.</p>

        <div class="best-worst-grid">
          <div class="best-worst-tile success">
            <div class="bw-label"><i class="fa-solid fa-trophy"></i> Strongest</div>
            <div class="bw-value num">${best.gpa.toFixed(2)}</div>
            <div class="bw-sub">Year ${best.year}, Sem ${best.semester}</div>
          </div>
          <div class="best-worst-tile danger">
            <div class="bw-label"><i class="fa-solid fa-arrow-trend-down"></i> Weakest</div>
            <div class="bw-value num">${worst.gpa.toFixed(2)}</div>
            <div class="bw-sub">Year ${worst.year}, Sem ${worst.semester}</div>
          </div>
        </div>
      </div>

      <div class="calc-card">
        <h3 class="calc-card-title">All Semesters</h3>
        <div class="sem-list">${rows}</div>
      </div>
    `;
  }

  /* ============================================================ */
  /* Chunk C — Reports                                           */
  /* ============================================================ */

  function renderReportsView(root) {
    const data = state.data;
    const years = data.years.slice().sort((a, b) => a - b);

    root.innerHTML = `
      <div class="view-header">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="view-title">Reports</h2>
      </div>
      <div class="view-body">
        <div class="report-intro">
          Choose what to print. The report opens in a new tab — use your browser's
          Print dialog to save as PDF.
        </div>

        <button class="report-scope-btn primary" data-scope-type="full">
          <i class="fa-solid fa-file-lines"></i>
          <div class="report-scope-text">
            <div class="report-scope-title">Full academic record</div>
            <div class="report-scope-sub">Every active course, current CGPA and classification</div>
          </div>
          <i class="fa-solid fa-chevron-right report-scope-chevron"></i>
        </button>

        ${years.length ? `
          <div class="report-section-label">By year</div>
          <div class="report-year-list">
            ${years.map((y) => `
              <button class="report-scope-btn" data-scope-type="year" data-year="${y}">
                <i class="fa-solid fa-layer-group"></i>
                <div class="report-scope-text">
                  <div class="report-scope-title">Year ${y}</div>
                  <div class="report-scope-sub">Semester 1, Semester 2, or full year</div>
                </div>
                <i class="fa-solid fa-chevron-right report-scope-chevron"></i>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <div class="report-section-label">By semester across all years</div>
        <div class="report-year-list">
          <button class="report-scope-btn" data-scope-type="sem" data-semester="1">
            <i class="fa-solid fa-list-ol"></i>
            <div class="report-scope-text">
              <div class="report-scope-title">All Semester 1s</div>
              <div class="report-scope-sub">Every semester 1 combined</div>
            </div>
            <i class="fa-solid fa-chevron-right report-scope-chevron"></i>
          </button>
          <button class="report-scope-btn" data-scope-type="sem" data-semester="2">
            <i class="fa-solid fa-list-ol"></i>
            <div class="report-scope-text">
              <div class="report-scope-title">All Semester 2s</div>
              <div class="report-scope-sub">Every semester 2 combined</div>
            </div>
            <i class="fa-solid fa-chevron-right report-scope-chevron"></i>
          </button>
        </div>
      </div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    root.querySelectorAll('.report-scope-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.scopeType;
        if (type === 'full') {
          printReport({ type: 'full' });
        } else if (type === 'year') {
          const year = Number(btn.dataset.year);
          openYearScopeSheet(year);
        } else if (type === 'sem') {
          const semester = Number(btn.dataset.semester);
          printReport({ type: 'sem', semester });
        }
      });
    });
  }

  function openYearScopeSheet(year) {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Year ${year} — Select scope</h3>
      <div class="scope-sheet-options">
        <button class="scope-option" data-scope="year-full">
          <i class="fa-solid fa-layer-group"></i>
          <div>
            <div class="scope-option-title">Full Year ${year}</div>
            <div class="scope-option-sub">Both semesters</div>
          </div>
        </button>
        <button class="scope-option" data-scope="year-sem" data-sem="1">
          <i class="fa-solid fa-list"></i>
          <div>
            <div class="scope-option-title">Semester 1 only</div>
            <div class="scope-option-sub">Year ${year}, Semester 1</div>
          </div>
        </button>
        <button class="scope-option" data-scope="year-sem" data-sem="2">
          <i class="fa-solid fa-list"></i>
          <div>
            <div class="scope-option-title">Semester 2 only</div>
            <div class="scope-option-sub">Year ${year}, Semester 2</div>
          </div>
        </button>
      </div>
      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    sheet.querySelectorAll('.scope-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.scope;
        closeModal();
        if (kind === 'year-full') printReport({ type: 'year', year, includeBoth: true });
        else printReport({ type: 'year', year, semester: Number(btn.dataset.sem) });
      });
    });
  }

  /* -------- Report builder -------- */
  function buildReportCourses(scope) {
    const data = state.data;
    const active = Storage.activeCourses(data);

    if (scope.type === 'full') {
      return { courses: active, label: 'Full Academic Record', cumulativeThrough: null };
    }

    if (scope.type === 'year') {
      if (scope.includeBoth) {
        const courses = active.filter((c) => c.year === scope.year);
        const cumThrough = active.filter(
          (c) => c.year < scope.year || (c.year === scope.year)
        );
        return {
          courses,
          label: `Year ${scope.year} — Full Year`,
          cumulativeThrough: cumThrough
        };
      }
      const courses = active.filter(
        (c) => c.year === scope.year && c.semester === scope.semester
      );
      const cumThrough = active.filter(
        (c) => c.year < scope.year || (c.year === scope.year && c.semester <= scope.semester)
      );
      return {
        courses,
        label: `Year ${scope.year}, Semester ${scope.semester}`,
        cumulativeThrough: cumThrough
      };
    }

    if (scope.type === 'sem') {
      const courses = active.filter((c) => c.semester === scope.semester);
      return {
        courses,
        label: `All Semester ${scope.semester}s`,
        cumulativeThrough: active
      };
    }

    return { courses: [], label: 'Report', cumulativeThrough: null };
  }

  function printReport(scope) {
    const data = state.data;
    const scale = data.scale;
    const scaleInfo = Storage.SCALES[scale];
    const settings = data.settings || {};

    const { courses, label, cumulativeThrough } = buildReportCourses(scope);

    if (!courses.length) {
      toast('No courses in that scope', { type: 'warn', icon: 'fa-triangle-exclamation' });
      return;
    }

    const sorted = courses.slice().sort(
      (a, b) => (a.year - b.year) || (a.semester - b.semester)
        || (a.courseCode || '').localeCompare(b.courseCode || '')
    );

    const totals = Storage.totalsOf(sorted, scale);
    const gpa = Storage.gpaOf(sorted, scale);
    const cumCgpa = cumulativeThrough
      ? Storage.gpaOf(cumulativeThrough, scale)
      : gpa;
    const classInfo = Storage.classify(cumCgpa, scale);

    const issued = new Date().toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const rows = sorted.map((c) => {
      const pts = c.units * Storage.pointsFor(c.grade, scale);
      return `
        <tr>
          <td class="col-code">${escapeHTML((c.courseCode || '').toUpperCase())}</td>
          <td class="col-num">${c.units}</td>
          <td class="col-grade">${c.grade || '—'}</td>
          <td class="col-num">${c.grade ? pts.toFixed(1) : '—'}</td>
        </tr>`;
    }).join('');

    const institutionLine = settings.institution
      ? `<div class="rpt-institution">${escapeHTML(settings.institution)}</div>`
      : '';

    const studentLine = (settings.studentName || settings.matricNumber)
      ? `
        <div class="rpt-meta-grid">
          ${settings.studentName ? `<div><span>Name</span><strong>${escapeHTML(settings.studentName)}</strong></div>` : ''}
          ${settings.matricNumber ? `<div><span>Matric No.</span><strong>${escapeHTML(settings.matricNumber)}</strong></div>` : ''}
          <div><span>Issued</span><strong>${escapeHTML(issued)}</strong></div>
        </div>`
      : `
        <div class="rpt-meta-grid">
          <div><span>Issued</span><strong>${escapeHTML(issued)}</strong></div>
        </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(label)} — Academic Record</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #12161E;
    --ink-soft: #4A5160;
    --muted: #8A8F9C;
    --line: #D8D5CC;
    --line-soft: #EDEBE5;
    --navy: #1E3A5F;
    --amber: #D4922A;
    --bg: #F7F6F3;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .rpt-toolbar {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    background: #fff;
    border-bottom: 1px solid var(--line-soft);
    z-index: 10;
  }

  .rpt-toolbar-title {
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--navy);
  }

  .rpt-toolbar-actions {
    display: flex;
    gap: 8px;
  }

  .rpt-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 999px;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .rpt-btn.primary {
    background: var(--navy);
    color: #fff;
  }
  .rpt-btn.primary:hover { background: #142A47; }

  .rpt-btn.ghost {
    background: #F1EFEA;
    color: var(--ink-soft);
  }
  .rpt-btn.ghost:hover { color: var(--ink); }

  .rpt-page {
    max-width: 780px;
    margin: 28px auto;
    background: #fff;
    padding: 48px 56px 56px;
    box-shadow: 0 4px 24px rgba(18, 22, 30, 0.06);
    border-radius: 4px;
  }

  .rpt-header {
    text-align: center;
    padding-bottom: 24px;
    border-bottom: 2px solid var(--navy);
    margin-bottom: 28px;
  }

  .rpt-institution {
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 10px;
  }

  .rpt-title {
    font-family: 'Sora', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.01em;
    margin: 0 0 8px;
  }

  .rpt-scope {
    font-size: 14px;
    color: var(--ink-soft);
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .rpt-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 32px;
    padding: 0 0 24px;
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 24px;
  }

  .rpt-meta-grid > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rpt-meta-grid span {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
  }

  .rpt-meta-grid strong {
    font-family: 'Sora', sans-serif;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--ink);
  }

  .rpt-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }

  .rpt-table thead th {
    font-family: 'Sora', sans-serif;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1.5px solid var(--navy);
  }

  .rpt-table thead th.col-num,
  .rpt-table thead th.col-grade { text-align: right; }

  .rpt-table tbody td {
    padding: 11px 8px;
    border-bottom: 1px solid var(--line-soft);
    font-size: 13.5px;
    color: var(--ink);
    vertical-align: middle;
  }

  .rpt-table tbody tr:nth-child(even) td {
    background: #FAFAF7;
  }

  .rpt-table tbody td.col-code {
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .rpt-table tbody td.col-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .rpt-table tbody td.col-grade {
    text-align: right;
    font-family: 'Sora', sans-serif;
    font-weight: 800;
    color: var(--navy);
  }

  .rpt-table tfoot td {
    padding: 12px 8px 8px;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--navy);
    border-top: 1.5px solid var(--navy);
  }

  .rpt-table tfoot td.col-num { text-align: right; font-variant-numeric: tabular-nums; }

  .rpt-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding: 22px 0;
    border-top: 1px solid var(--line-soft);
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 40px;
  }

  .rpt-summary-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .rpt-summary-item span {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
  }

  .rpt-summary-item strong {
    font-family: 'Sora', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: var(--navy);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  .rpt-summary-item.class strong {
    font-size: 14px;
    letter-spacing: 0;
    font-weight: 700;
    text-transform: none;
  }

  .rpt-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-top: 48px;
  }

  .rpt-sig {
    flex: 1;
    max-width: 260px;
  }

  .rpt-sig-line {
    border-bottom: 1px solid var(--ink-soft);
    height: 42px;
  }

  .rpt-sig-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin-top: 8px;
  }

  .rpt-credit {
    text-align: right;
    font-size: 10.5px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }

  .rpt-credit strong {
    color: var(--navy);
    font-weight: 700;
  }

  /* ---------- Print ---------- */
  @page {
    size: A4;
    margin: 18mm 16mm;
  }

  @media print {
    html, body { background: #fff; }
    .rpt-toolbar { display: none; }
    .rpt-page {
      max-width: none;
      margin: 0;
      padding: 0;
      box-shadow: none;
      border-radius: 0;
      background: #fff;
    }
    .rpt-table tbody tr:nth-child(even) td { background: #FAFAF7; }
    .rpt-table tr { page-break-inside: avoid; }
    .rpt-summary { page-break-inside: avoid; }
    .rpt-footer { page-break-inside: avoid; }
  }

  @media (max-width: 640px) {
    .rpt-page { padding: 28px 20px; margin: 12px; }
    .rpt-title { font-size: 20px; }
    .rpt-summary { grid-template-columns: 1fr; gap: 14px; }
    .rpt-meta-grid { grid-template-columns: 1fr; }
    .rpt-footer { flex-direction: column; align-items: flex-start; }
    .rpt-credit { text-align: left; }
  }
</style>
</head>
<body>

<div class="rpt-toolbar">
  <div class="rpt-toolbar-title">Academic Record Preview</div>
  <div class="rpt-toolbar-actions">
    <button class="rpt-btn ghost" onclick="window.close()">Close</button>
    <button class="rpt-btn primary" onclick="window.print()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Save as PDF
    </button>
  </div>
</div>

<main class="rpt-page">

  <header class="rpt-header">
    ${institutionLine}
    <h1 class="rpt-title">Statement of Academic Record</h1>
    <div class="rpt-scope">${escapeHTML(label)}</div>
  </header>

  ${studentLine}

  <table class="rpt-table">
    <thead>
      <tr>
        <th class="col-code">Course Code</th>
        <th class="col-num">Units</th>
        <th class="col-grade">Grade</th>
        <th class="col-num">Points</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr>
        <td>Totals</td>
        <td class="col-num">${totals.units}</td>
        <td></td>
        <td class="col-num">${totals.points.toFixed(1)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="rpt-summary">
    <div class="rpt-summary-item">
      <span>Scope GPA</span>
      <strong>${gpa === null ? '—' : gpa.toFixed(2)}</strong>
    </div>
    <div class="rpt-summary-item">
      <span>Cumulative CGPA</span>
      <strong>${cumCgpa === null ? '—' : cumCgpa.toFixed(2)}</strong>
    </div>
    <div class="rpt-summary-item class">
      <span>Classification</span>
      <strong>${escapeHTML(classInfo.label)}</strong>
    </div>
  </div>

  <footer class="rpt-footer">
    <div class="rpt-sig">
      <div class="rpt-sig-line"></div>
      <div class="rpt-sig-label">Registrar</div>
    </div>
    <div class="rpt-credit">
      <strong>GradeLog</strong><br>
      Generated ${escapeHTML(issued)}<br>
      Grade scale: ${escapeHTML(scaleInfo.label)}
    </div>
  </footer>

</main>

</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      toast('Please allow pop-ups to view the report', {
        type: 'warn',
        icon: 'fa-triangle-exclamation',
        duration: 6000
      });
      return;
    }

    // Clean up blob URL after the tab has loaded
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ---------------------------------------------------------- */
  /* Init                                                        */
  /* ---------------------------------------------------------- */
  function init() {
    parseUrlFlags();
    loadUiState();

    if (state.demoMode) {
      state.data = Storage.getDummyData();
      $('#viewBadge').hidden = false;
    } else {
      state.data = Storage.getData();
    }

    const theme = state.data?.settings?.theme
      || localStorage.getItem(LS.theme)
      || 'light';
    applyTheme(theme);

    renderAll();
  }

  init();

  /* ---------------------------------------------------------- */
  /* Public API                                                  */
  /* ---------------------------------------------------------- */
  window.GradeLog = {
    toast, dismissToast,
    openModal, closeModal,
    openView, closeView,
    refresh,
    getState: () => state
  };

})();
