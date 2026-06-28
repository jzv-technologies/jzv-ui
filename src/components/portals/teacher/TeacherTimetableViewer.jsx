// src/components/portals/teacher/TeacherTimetableViewer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import TimetableAdminView from '../admin/timetable/TimetableAdminView';
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_SUBJECTS as DEFAULT_MOCK_SUBJECTS,
  MOCK_TEACHERS as DEFAULT_MOCK_TEACHERS,
  MOCK_CLASSES as DEFAULT_MOCK_CLASSES,
  MOCK_PERIODS as DEFAULT_MOCK_PERIODS,
  MOCK_SLOTS,
  MOCK_TIMETABLE_STATE,
} from '../../../data/mockTimetable';

const TeacherTimetableViewer = ({ user }) => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [slots, setSlots] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMockFallback = () => {
    console.log('Loading mock timetable data in Teacher portal...');
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.classes?.length > 0 && parsed.slots?.length > 0) {
          setSubjects(parsed.subjects || []);
          setTeachers(parsed.teachers || []);
          setClasses(parsed.classes || []);
          setPeriods(parsed.periods || DEFAULT_MOCK_PERIODS);
          setSlots(parsed.slots || []);
          setClassifications(parsed.classifications || []);
          return;
        }
      } catch (e) {
        console.error('Failed to parse local storage in teacher view', e);
      }
    }
    setSubjects(DEFAULT_MOCK_SUBJECTS);
    setTeachers(DEFAULT_MOCK_TEACHERS);
    setClasses(DEFAULT_MOCK_CLASSES);
    setPeriods(DEFAULT_MOCK_PERIODS);
    setSlots(MOCK_SLOTS);
    setClassifications([]);
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(MOCK_TIMETABLE_STATE));
  };

  const fetchTimetableData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data: testClass, error: testErr } = await supabase
        .from('classes')
        .select('id')
        .limit(1);

      if (testErr) {
        throw new Error('Supabase tables not found. Loading local data.');
      }

      const [
        { data: dbSubjects },
        { data: dbTeachers },
        { data: dbTeacherSubjects },
        { data: dbClasses },
        { data: dbSlots },
        { data: dbPeriods },
        { data: dbClassifications },
      ] = await Promise.all([
        supabase.from('subjects').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('teacher_subjects').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('timetable_slots').select('*'),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
        supabase.from('subject_classifications').select('*'),
      ]);

      if (!dbClasses || dbClasses.length === 0 || !dbSlots || dbSlots.length === 0) {
        throw new Error('No classes or slots found in database. Loading mock data.');
      }

      const teachersWithSubjects = (dbTeachers || []).map((t) => ({
        ...t,
        subjects: (dbTeacherSubjects || [])
          .filter((ts) => String(ts.teacher_id) === String(t.id))
          .map((ts) => ts.subject_id),
      }));

      setSubjects(dbSubjects || []);
      setTeachers(teachersWithSubjects);
      setClasses(dbClasses || []);
      setSlots(dbSlots || []);
      setClassifications(dbClassifications || []);

      if (dbPeriods && dbPeriods.length > 0) {
        setPeriods(dbPeriods);
      } else {
        setPeriods(DEFAULT_MOCK_PERIODS);
      }
    } catch (err) {
      console.warn('Falling back to local storage/mock for teacher view:', err.message);
      loadMockFallback();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimetableData(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white border border-light-border rounded-3xl">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TimetableAdminView
      user={user}
      showMyTimetable={true}
      classes={classes}
      teachers={teachers}
      subjects={subjects}
      periods={periods}
      slots={slots}
      classifications={classifications}
      onRefresh={() => fetchTimetableData(false)}
      refreshing={refreshing}
      allowedViews={['scheduler']}
    />
  );
};

export default TeacherTimetableViewer;
