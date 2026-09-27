/* ============================================================
   GradeLog — storage layer
   Pure data. No DOM. Schema v1.
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'gradelog.data.v1';
  const SCHEMA_VERSION = 1;
  const MAX_YEARS = 6;

  /* ---------------------------------------------------------- */
  /* Grade scales                                                */
  /* ---------------------------------------------------------- */
  const SCALES = {
    '5.0': {
      label: '5.0 (Nigerian)',
      points: { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
      letters: ['A', 'B', 'C', 'D', 'E', 'F'],
      max: 5,
      bands: [
        { min: 4.50, label: 'First Class',          key: 'first' },
        { min: 3.50, label: 'Second Class Upper',   key: '21' },
        { min: 2.40, label: 'Second Class Lower',   key: '22' },
        { min: 1.50, label: 'Third Class',          key: 'third' },
        { min: 1.00, label: 'Pass',                 key: 'pass' },
        { min: -Infinity, label: 'Below Pass Mark', key: 'fail' }
      ]
    },
    '4.0': {
      label: '4.0 (US)',
      points: { A: 4, B: 3, C: 2, D: 1, F: 0 },
      letters: ['A', 'B', 'C', 'D', 'F'],
      max: 4,
      bands: [
        { min: 3.85, label: 'Summa Cum Laude', key: 'first' },
        { min: 3.50, label: 'Magna Cum Laude', key: 'first' },
        { min: 3.00, label: 'Cum Laude',       key: '21' },
        { min: 2.00, label: 'Satisfactory',    key: '22' },
        { min: 1.00, label: 'Pass',            key: 'third' },
        { min: -Infinity, label: 'Fail',       key: 'fail' }
      ]
    }
  };

  /* ---------------------------------------------------------- */
  /* Dummy data for ?view=1 demo mode                            */
  /* ---------------------------------------------------------- */
  const DUMMY_DATA = {
    version: 1,
    scale: '5.0',
    years: [1, 2],
    semesters: {
      '1-1': { active: true },
      '1-2': { active: true },
      '2-1': { active: true },
      '2-2': { active: false }
    },
    courses: [
      { id: 'd1', year: 1, semester: 1, courseCode: 'BIO 101', units: 3, grade: 'A', createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z' },
      { id: 'd2', year: 1, semester: 1, courseCode: 'CHM 101', units: 3, grade: 'B', createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z' },
      { id: 'd3', year: 1, semester: 1, courseCode: 'PHY 101', units: 2, grade: 'A', createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z' },
      { id: 'd4', year: 1, semester: 1, courseCode: 'MTH 101', units: 3, grade: 'B', createdAt: '2025-09-01T08:00:00Z', updatedAt: '2025-09-01T08:00:00Z' },
      { id: 'd5', year: 1, semester: 2, courseCode: 'BIO 102', units: 3, grade: 'A', createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-01-15T08:00:00Z' },
      { id: 'd6', year: 1, semester: 2, courseCode: 'CHM 102', units: 3, grade: 'A', createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-01-15T08:00:00Z' },
      { id: 'd7', year: 1, semester: 2, courseCode: 'PHY 102', units: 2, grade: 'B', createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-01-15T08:00:00Z' },
      { id: 'd8', year: 2, semester: 1, courseCode: 'PCL 201', units: 4, grade: 'A', createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
      { id: 'd9', year: 2, semester: 1, courseCode: 'PHA 201', units: 3, grade: 'B', createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
      { id: 'd10', year: 2, semester: 1, courseCode: 'PCL 203', units: 2, grade: null, createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z' },
      { id: 'd11', year: 2, semester: 2, courseCode: 'PCL 202', units: 3, grade: null, createdAt: '2027-01-15T08:00:00Z', updatedAt: '2027-01-15T08:00:00Z' }
    ],
    settings: {
      theme: 'light',
      studentName: '',
      matricNumber: '',
      institution: '',
      lastSync: null,
      driveClientId: ''
    }
  };

  /* ---------------------------------------------------------- */
  /* Core read / write                                           */
  /* ---------------------------------------------------------- */
  function defaultData() {
    return {
      version: SCHEMA_VERSION,
      scale: '5.0',
      years: [1],
      semesters: { '1-1': { active: true }, '1-2': { active: true } },
      courses: [],
      settings: {
        theme: 'light',
        studentName: '',
        matricNumber: '',
        institution: '',
        lastSync: null,
        driveClientId: ''
      }
    };
  }

  function readRaw() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      console.warn('Storage read failed:', e);
      return null;
    }
  }

  function writeRaw(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  }

  function read() {
    const raw = readRaw();
    if (!raw) return defaultData();
    // Future migrations go here
    return { ...defaultData(), ...raw };
  }

  function write(data) {
    return writeRaw(data);
  }

  /* ---------------------------------------------------------- */
  /* Helpers                                                     */
  /* ---------------------------------------------------------- */
  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowISO() { return new Date().toISOString(); }

  function getScale(id) {
    return SCALES[id] || SCALES['5.0'];
  }

  function pointsFor(grade, scaleId) {
    const s = getScale(scaleId);
    return grade && s.points[grade] !== undefined ? s.points[grade] : 0;
  }

  function classify(gpa, scaleId) {
    if (gpa === null || isNaN(gpa)) return { label: '—', key: 'none' };
    const s = getScale(scaleId);
    for (const b of s.bands) {
      if (gpa >= b.min) return { label: b.label, key: b.key };
    }
    return { label: '—', key: 'none' };
  }

  /* ---------------------------------------------------------- */
  /* Public API                                                  */
  /* ---------------------------------------------------------- */
  const api = {
    SCALES,
    MAX_YEARS,
    SCHEMA_VERSION,

    /* Bulk */
    getData() { return read(); },
    setData(data) { return write(data); },
    reset() { return write(defaultData()); },

    /* Scale */
    getScale,
    setScale(id) {
      const data = read();
      if (!SCALES[id]) return null;
      data.scale = id;
      write(data);
      return data;
    },

    /* Courses */
    addCourse({ year, semester, courseCode = '', units = 3, grade = null }) {
      const data = read();
      const course = {
        id: uuid(),
        year: Number(year),
        semester: Number(semester),
        courseCode: String(courseCode).trim(),
        units: Number(units) || 0,
        grade: grade || null,
        createdAt: nowISO(),
        updatedAt: nowISO()
      };
      data.courses.push(course);
      write(data);
      return course;
    },

    updateCourse(id, patch) {
      const data = read();
      const idx = data.courses.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      const merged = { ...data.courses[idx], ...patch, id, updatedAt: nowISO() };
      data.courses[idx] = merged;
      write(data);
      return merged;
    },

    removeCourse(id) {
      const data = read();
      const before = data.courses.length;
      data.courses = data.courses.filter((c) => c.id !== id);
      write(data);
      return data.courses.length < before;
    },

    getCourse(id) {
      return read().courses.find((c) => c.id === id) || null;
    },

    coursesFor(year, semester) {
      return read().courses.filter(
        (c) => c.year === Number(year) && c.semester === Number(semester)
      );
    },

    /* Years */
    addYear(year) {
      const data = read();
      if (data.years.includes(year)) return data;
      if (year > MAX_YEARS || year < 1) return data;
      data.years.push(year);
      data.years.sort((a, b) => a - b);
      if (!data.semesters[`${year}-1`]) data.semesters[`${year}-1`] = { active: false };
      if (!data.semesters[`${year}-2`]) data.semesters[`${year}-2`] = { active: false };
      write(data);
      return data;
    },

    removeYear(year) {
      const data = read();
      data.years = data.years.filter((y) => y !== Number(year));
      delete data.semesters[`${year}-1`];
      delete data.semesters[`${year}-2`];
      data.courses = data.courses.filter((c) => c.year !== Number(year));
      write(data);
      return data;
    },

    /* Semester active toggle */
    setSemesterActive(year, semester, active) {
      const data = read();
      data.semesters[`${year}-${semester}`] = { active: !!active };
      write(data);
      return data;
    },

    isSemesterActive(year, semester) {
      const data = read();
      const s = data.semesters[`${year}-${semester}`];
      return s ? s.active : false;
    },

    /* Settings */
    getSettings() {
      return read().settings;
    },

    updateSettings(patch) {
      const data = read();
      data.settings = { ...data.settings, ...patch };
      write(data);
      return data.settings;
    },

    /* Math */
    pointsFor,
    classify,

    gpaOf(courses, scaleId) {
      const list = courses.filter((c) => c.units > 0 && c.grade);
      const totalUnits = list.reduce((s, c) => s + (Number(c.units) || 0), 0);
      if (!totalUnits) return null;
      const totalPoints = list.reduce(
        (s, c) => s + (Number(c.units) || 0) * pointsFor(c.grade, scaleId), 0
      );
      return totalPoints / totalUnits;
    },

    totalsOf(courses, scaleId) {
      const list = courses.filter((c) => c.units > 0 && c.grade);
      const units = list.reduce((s, c) => s + (Number(c.units) || 0), 0);
      const points = list.reduce(
        (s, c) => s + (Number(c.units) || 0) * pointsFor(c.grade, scaleId), 0
      );
      return { units, points };
    },

    /* Derived: only courses inside active semesters */
    activeCourses(data) {
      const d = data || read();
      return d.courses.filter((c) => {
        const s = d.semesters[`${c.year}-${c.semester}`];
        return s ? s.active : false;
      });
    },

    cgpa(data) {
      const d = data || read();
      return api.gpaOf(api.activeCourses(d), d.scale);
    },

    /* Demo mode */
    getDummyData() { return JSON.parse(JSON.stringify(DUMMY_DATA)); },

    /* Debug */
    _raw: { read, write, readRaw, writeRaw, KEY, defaultData }
  };

  global.Storage = api;
})(window);
