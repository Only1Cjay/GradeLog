/* ============================================================
   GradeLog — storage layer
   Pure data. No DOM. Schema v1.
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'gradelog.data.v1';
  const SCHEMA_VERSION = 1;

  /* Grade scales */
  const SCALES = {
    '5.0': {
      label: '5.0 (Nigerian)',
      points: { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
      max: 5,
      bands: [
        { min: 4.50, label: 'First Class',          key: 'first' },
        { min: 3.50, label: 'Second Class Upper',   key: '21' },
        { min: 2.40, label: 'Second Class Lower',   key: '22' },
        { min: 1.50, label: 'Third Class',          key: 'third' },
        { min: 1.00, label: 'Pass',                 key: 'pass' },
        { min: -Infinity, label: 'Below Pass Mark', key: 'pass' }
      ]
    },
    '4.0': {
      label: '4.0 (US)',
      points: { A: 4, B: 3, C: 2, D: 1, F: 0 },
      max: 4,
      bands: [
        { min: 3.85, label: 'Summa Cum Laude', key: 'first' },
        { min: 3.50, label: 'Magna Cum Laude', key: 'first' },
        { min: 
