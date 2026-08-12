// src/components/portals/teacher/TeacherTimetableViewer.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import TimetableAdminView from './TimetableAdminView';
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_SUBJECTS as DEFAULT_MOCK_SUBJECTS,
  MOCK_TEACHERS as DEFAULT_MOCK_TEACHERS,
  MOCK_CLASSES as DEFAULT_MOCK_CLASSES,
  MOCK_PERIODS as DEFAULT_MOCK_PERIODS,
  MOCK_ASSIGNMENTS as DEFAULT_MOCK_ASSIGNMENTS,
  MOCK_SLOTS,
  MOCK_TIMETABLE_STATE,
} from '../../data/mockTimetable';

const TeacherTimetableViewer = ({ user }) => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [slots, setSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [seasonsConfig, setSeasonsConfig] = useState(null);
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
          setAssignments(parsed.assignments || DEFAULT_MOCK_ASSIGNMENTS);
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
    setAssignments(DEFAULT_MOCK_ASSIGNMENTS);
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
        { data: dbTeacherSubjectsMap },
        { data: dbTeacherSubjectsDirect },
        { data: dbClasses },
        { data: dbSlots },
        { data: dbPeriods },
        { data: dbClassifications },
        { data: dbTeachers },
        { data: currentTeacherData },
        { data: settingsData },
        { data: dbAssignments },
      ] = await Promise.all([
        supabase.from('syl_subjects').select('*'),
        supabase.from('map_teacher_subject').select('*'),
        supabase.from('teacher_subjects').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('timetable_slots').select('*'),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
        supabase.from('syl_classifications').select('*'),
        supabase.from('teachers').select('*'),
        supabase.rpc('get_current_teacher_details', { p_auth_id: user?.id || null }),
        supabase
          .from('admin_configruation')
          .select('*')
          .eq('key', 'timetable_seasons_config')
          .maybeSingle(),
        supabase.from('class_assignments').select('*'),
      ]);

      if (!dbClasses || dbClasses.length === 0 || !dbSlots || dbSlots.length === 0) {
        throw new Error('No classes or slots found in database. Loading mock data.');
      }

      const dbTeacherSubjects = dbTeacherSubjectsMap || dbTeacherSubjectsDirect || [];

      const currentTeacher = Array.isArray(currentTeacherData)
        ? currentTeacherData[0]
        : currentTeacherData || null;

      let allTeachers = Array.isArray(dbTeachers) && dbTeachers.length > 0 ? dbTeachers : [];
      if (allTeachers.length === 0 && currentTeacher) {
        allTeachers = [currentTeacher];
      }

      const teachersWithSubjects = allTeachers.map((t) => {
        const tid = t.teacher_id || t.id;
        const isCurrent =
          currentTeacher && String(currentTeacher.id || currentTeacher.teacher_id) === String(tid);
        return {
          ...t,
          id: tid,
          teacher_id: tid,
          name: t.name,
          is_male: t.is_male,
          auth_id: isCurrent ? user?.id || t.auth_id || null : t.auth_id || null,
          subjects: (dbTeacherSubjects || [])
            .filter((ts) => String(ts.teacher_id) === String(tid))
            .map((ts) => ts.subject_id),
        };
      });

      let fetchedSeasonsConfig = null;
      if (settingsData && settingsData.val) {
        fetchedSeasonsConfig =
          typeof settingsData.val === 'string' ? JSON.parse(settingsData.val) : settingsData.val;
      }
      if (!fetchedSeasonsConfig) {
        const localRaw = localStorage.getItem('jzv_timetable_seasons_config');
        if (localRaw) {
          try {
            fetchedSeasonsConfig = JSON.parse(localRaw);
          } catch (e) {}
        }
      }

      setSeasonsConfig(fetchedSeasonsConfig);

      const activeId = fetchedSeasonsConfig?.active_season_id || 'summer';
      const activeSeason = fetchedSeasonsConfig?.seasons?.[activeId];

      const rawPeriods = dbPeriods && dbPeriods.length > 0 ? dbPeriods : DEFAULT_MOCK_PERIODS;
      const mappedPeriods = rawPeriods.map((dbP) => {
        const seasonP = activeSeason?.periods?.find((up) => up.period_number === dbP.period_number);
        return {
          ...dbP,
          icon: seasonP ? seasonP.icon : dbP.icon || null,
          applicable_on_weekends: seasonP ? seasonP.applicable_on_weekends : true,
        };
      });

      setSubjects(dbSubjects || []);
      setTeachers(teachersWithSubjects);
      setClasses(dbClasses || []);
      setSlots(dbSlots || []);
      setAssignments(dbAssignments || []);
      setClassifications(dbClassifications || []);
      setPeriods(mappedPeriods);
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
      assignments={assignments}
      classifications={classifications}
      seasonsConfig={seasonsConfig}
      onRefresh={() => fetchTimetableData(false)}
      refreshing={refreshing}
      allowedViews={['scheduler', 'teacher', 'free_teachers', 'assigned_teachers']}
    />
  );
};

export default TeacherTimetableViewer;
