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
      case 'search':       toast('Search coming in Chunk C', { icon: 'fa-magnifying-glass' }); break;
      case 'calculators':  toast('Calculators coming in Chunk C', { icon: 'fa-calculator' }); break;
      case 'reports':      toast('Reports coming in Chunk C', { icon: 'fa-file-lines' }); break;
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
