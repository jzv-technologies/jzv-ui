// src/data/mockTimetable.js
// ─── Demo/fallback timetable data ─────────────────────────────────────────────
// Used when Supabase is unavailable or timetable tables have no data (e.g. RLS).
// The localStorage key below is shared across all timetable components.

export const TIMETABLE_STORAGE_KEY = 'jzv_timetable_local_data';

export const MOCK_CLASSIFICATIONS = [
  { id: 'cls-1', name: 'English Literacy' },
  { id: 'cls-2', name: 'Arabic Literacy' },
  { id: 'cls-3', name: 'Tamil Literacy' },
  { id: 'cls-4', name: 'Urdu Literacy' },
  { id: 'cls-5', name: 'Hadees' },
  { id: 'cls-6', name: 'Tafseer' },
  { id: 'cls-7', name: 'Fiqh' },
  { id: 'cls-8', name: '10th Board' },
  { id: 'cls-9', name: '12th Board' },
  { id: 'cls-10', name: 'Modern Education' },
  { id: 'cls-11', name: 'Critical Thinking' },
  { id: 'cls-12', name: 'Personality Development' }
];

export const MOCK_SUBJECTS = [
  { id: 'sub-1', name: 'Mathematics', classification_id: 'cls-10' },
  { id: 'sub-2', name: 'English Language', classification_id: 'cls-1' },
  { id: 'sub-3', name: 'Science', classification_id: 'cls-10' },
  { id: 'sub-4', name: 'Arabic Language', classification_id: 'cls-2' },
  { id: 'sub-5', name: 'Holy Quran', classification_id: 'cls-6' },
  { id: 'sub-6', name: 'Islamic Studies', classification_id: 'cls-7' },
  { id: 'sub-7', name: 'Computer Science', classification_id: 'cls-10' },
];

export const MOCK_TEACHERS = [
  { id: 't-1', name: 'Maulana Abdur Rahman', subjects: ['sub-4', 'sub-5', 'sub-6'], is_male: true },
  { id: 't-2', name: 'Ms. Ayesha Siddiqua',  subjects: ['sub-2', 'sub-6'],          is_male: false },
  { id: 't-3', name: 'Mr. Mohammed Khan',    subjects: ['sub-1', 'sub-7'],          is_male: true },
  { id: 't-4', name: 'Dr. Sarah Fatima',     subjects: ['sub-3', 'sub-1'],          is_male: false },
  { id: 't-5', name: 'Maulana Bilal Ahmed',  subjects: ['sub-5', 'sub-4'],          is_male: true },
  { id: 't-6', name: 'Mrs. Zainab Patel',   subjects: ['sub-2', 'sub-3'],          is_male: false },
];

export const MOCK_CLASSES = [
  { id: 'c-1', name: 'Class 1' },
  { id: 'c-2', name: 'Class 2' },
  { id: 'c-3', name: 'Class 3' },
  { id: 'c-4', name: 'Class 4' },
  { id: 'c-5', name: 'Class 5' },
  { id: 'c-6', name: 'Class 6' },
  { id: 'c-7', name: 'Class 7' },
  { id: 'c-8', name: 'Class 8' },
];

export const MOCK_PERIODS = [
  { id: 'p-1',  period_number: 1,  name: 'Period 1',         start_time: '08:00', end_time: '08:45', is_break: false },
  { id: 'p-2',  period_number: 2,  name: 'Period 2',         start_time: '08:45', end_time: '09:30', is_break: false },
  { id: 'p-3',  period_number: 3,  name: 'Period 3',         start_time: '09:30', end_time: '10:15', is_break: false },
  { id: 'p-4',  period_number: 4,  name: 'Period 4',         start_time: '10:15', end_time: '11:00', is_break: false },
  { id: 'p-5',  period_number: 5,  name: 'Period 5',         start_time: '11:00', end_time: '11:45', is_break: false },
  { id: 'p-6',  period_number: 6,  name: 'Period 6 (Break)', start_time: '11:45', end_time: '12:30', is_break: true  },
  { id: 'p-7',  period_number: 7,  name: 'Period 7',         start_time: '12:30', end_time: '01:10', is_break: false },
  { id: 'p-8',  period_number: 8,  name: 'Period 8',         start_time: '01:10', end_time: '01:50', is_break: false },
  { id: 'p-9',  period_number: 9,  name: 'Period 9',         start_time: '01:50', end_time: '02:30', is_break: false },
  { id: 'p-10', period_number: 10, name: 'Period 10',        start_time: '02:30', end_time: '03:10', is_break: false },
  { id: 'p-11', period_number: 11, name: 'Period 11',        start_time: '03:10', end_time: '03:50', is_break: false },
];

export const MOCK_ASSIGNMENTS = [
  { id: 'a-1', class_id: 'c-1', teacher_id: 't-1', subject_id: 'sub-5' },
  { id: 'a-2', class_id: 'c-1', teacher_id: 't-3', subject_id: 'sub-1' },
  { id: 'a-3', class_id: 'c-2', teacher_id: 't-2', subject_id: 'sub-2' },
  { id: 'a-4', class_id: 'c-2', teacher_id: 't-4', subject_id: 'sub-3' },
];

// ─── Generate slot rows for all demo classes across all school days ────────────
const SCHOOL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const makeSlots = (classId, schedule) =>
  SCHOOL_DAYS.flatMap((day) =>
    schedule.map(({ period_id, subject_id, teacher_id }) => ({
      class_id: classId,
      day,
      period_id,
      subject_id,
      teacher_id,
    }))
  );

export const MOCK_SLOTS = [
  ...makeSlots('c-1', [
    { period_id: 'p-1', subject_id: 'sub-5', teacher_id: 't-1' }, // Holy Quran
    { period_id: 'p-2', subject_id: 'sub-1', teacher_id: 't-3' }, // Mathematics
    { period_id: 'p-3', subject_id: 'sub-2', teacher_id: 't-2' }, // English
    { period_id: 'p-4', subject_id: 'sub-3', teacher_id: 't-4' }, // Science
    { period_id: 'p-5', subject_id: 'sub-6', teacher_id: 't-1' }, // Islamic Studies
    { period_id: 'p-7', subject_id: 'sub-7', teacher_id: 't-3' }, // Computer Science
    { period_id: 'p-8', subject_id: 'sub-4', teacher_id: 't-5' }, // Arabic
  ]),
  ...makeSlots('c-2', [
    { period_id: 'p-1', subject_id: 'sub-2', teacher_id: 't-2' }, // English
    { period_id: 'p-2', subject_id: 'sub-5', teacher_id: 't-5' }, // Holy Quran
    { period_id: 'p-3', subject_id: 'sub-3', teacher_id: 't-4' }, // Science
    { period_id: 'p-4', subject_id: 'sub-1', teacher_id: 't-3' }, // Mathematics
    { period_id: 'p-5', subject_id: 'sub-4', teacher_id: 't-1' }, // Arabic
    { period_id: 'p-7', subject_id: 'sub-6', teacher_id: 't-2' }, // Islamic Studies
    { period_id: 'p-8', subject_id: 'sub-7', teacher_id: 't-3' }, // Computer Science
  ]),
  ...makeSlots('c-3', [
    { period_id: 'p-1', subject_id: 'sub-4', teacher_id: 't-1' }, // Arabic
    { period_id: 'p-2', subject_id: 'sub-1', teacher_id: 't-3' }, // Mathematics
    { period_id: 'p-3', subject_id: 'sub-5', teacher_id: 't-5' }, // Holy Quran
    { period_id: 'p-4', subject_id: 'sub-2', teacher_id: 't-2' }, // English
    { period_id: 'p-5', subject_id: 'sub-3', teacher_id: 't-4' }, // Science
    { period_id: 'p-7', subject_id: 'sub-7', teacher_id: 't-3' }, // Computer Science
    { period_id: 'p-8', subject_id: 'sub-6', teacher_id: 't-2' }, // Islamic Studies
  ]),
];

// ─── Pre-built snapshot for localStorage seeding ─────────────────────────────
// Used by TimetableManager.loadData() when Supabase is unavailable.
export const MOCK_TIMETABLE_STATE = {
  classifications: MOCK_CLASSIFICATIONS,
  subjects:    MOCK_SUBJECTS,
  teachers:    MOCK_TEACHERS,
  classes:     MOCK_CLASSES,
  periods:     MOCK_PERIODS,
  assignments: MOCK_ASSIGNMENTS,
  slots:       MOCK_SLOTS,
};
