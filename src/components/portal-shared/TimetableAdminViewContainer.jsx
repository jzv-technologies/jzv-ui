// src/components/portal-shared/TimetableAdminViewContainer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import TimetableAdminView from '../timetable/TimetableAdminView';
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_SUBJECTS as DEFAULT_MOCK_SUBJECTS,
  MOCK_TEACHERS as DEFAULT_MOCK_TEACHERS,
  MOCK_CLASSES as DEFAULT_MOCK_CLASSES,
  MOCK_PERIODS as DEFAULT_MOCK_PERIODS,
  MOCK_SLOTS as DEFAULT_MOCK_SLOTS,
} from '../../data/mockTimetable';

const DEFAULT_MOCK_CLASSIFICATIONS = [
  { id: '1', name: 'Primary' },
  { id: '2', name: 'Secondary' },
];

export const TimetableAdminViewContainer = ({ user }) => {
  const [ttClasses, setTtClasses] = useState([]);
  const [ttTeachers, setTtTeachers] = useState([]);
  const [ttSubjects, setTtSubjects] = useState([]);
  const [ttPeriods, setTtPeriods] = useState([]);
  const [ttAssignments, setTtAssignments] = useState([]);
  const [ttSlots, setTtSlots] = useState([]);
  const [ttClassifications, setTtClassifications] = useState([]);
  const [ttSeasonsConfig, setTtSeasonsConfig] = useState(null);
  const [ttLoading, setTtLoading] = useState(false);

  const fetchTimetableData = useCallback(async () => {
    setTtLoading(true);
    try {
      const { error: testErr } = await supabase.from('classes').select('id').limit(1);
      if (testErr) throw new Error('Supabase not available');

      const [
        { data: dbSubjects },
        { data: dbTeacherSubjectsMap },
        { data: dbTeacherSubjectsDirect },
        { data: dbClasses },
        { data: dbAssignments },
        { data: dbSlots },
        { data: dbPeriods },
        { data: dbClassifications },
        { data: secureTeachersData, error: secureTeachersErr },
        { data: settingsData },
      ] = await Promise.all([
        supabase.from('syl_subjects').select('*'),
        supabase.from('map_teacher_subject').select('*'),
        supabase.from('map_teacher_subject').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('class_assignments').select('*'),
        supabase.from('timetable_slots').select('*'),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
        supabase.from('syl_classifications').select('*').order('name', { ascending: true }),
        supabase.rpc('get_teachers_with_auth_secure', { p_auth_id: user?.id || null }),
        supabase
          .from('admin_configruation')
          .select('*')
          .eq('key', 'timetable_seasons_config')
          .maybeSingle(),
      ]);

      const dbTeacherSubjects = dbTeacherSubjectsMap || dbTeacherSubjectsDirect || [];

      let teacherRows = Array.isArray(secureTeachersData) ? secureTeachersData : [];
      if (secureTeachersErr) {
        const { data: fallbackTeachers } = await supabase.from('teachers').select('*');
        teacherRows = Array.isArray(fallbackTeachers) ? fallbackTeachers : [];
      }

      const teachersWithSubjects = teacherRows.map((t) => {
        const tid = t.teacher_id || t.id;
        return {
          id: tid,
          teacher_id: tid,
          name: t.name,
          is_male: t.is_male,
          auth_id: t.auth_id || null,
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

      setTtSeasonsConfig(fetchedSeasonsConfig);

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

      setTtSubjects(dbSubjects || []);
      setTtTeachers(teachersWithSubjects);
      setTtClasses(dbClasses || []);
      setTtAssignments(dbAssignments || []);
      setTtSlots(dbSlots || []);
      setTtClassifications(dbClassifications || []);
      setTtPeriods(mappedPeriods);
    } catch (err) {
      const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setTtSubjects(parsed.subjects || DEFAULT_MOCK_SUBJECTS);
          setTtTeachers(parsed.teachers || DEFAULT_MOCK_TEACHERS);
          setTtClasses(parsed.classes || DEFAULT_MOCK_CLASSES);
          setTtPeriods(parsed.periods || DEFAULT_MOCK_PERIODS);
          setTtAssignments(parsed.assignments || []);
          setTtSlots(parsed.slots || DEFAULT_MOCK_SLOTS);
          setTtClassifications(parsed.classifications || DEFAULT_MOCK_CLASSIFICATIONS);
        } catch (e) {
          setTtSubjects(DEFAULT_MOCK_SUBJECTS);
          setTtTeachers(DEFAULT_MOCK_TEACHERS);
          setTtClasses(DEFAULT_MOCK_CLASSES);
          setTtPeriods(DEFAULT_MOCK_PERIODS);
          setTtAssignments([]);
          setTtSlots(DEFAULT_MOCK_SLOTS);
          setTtClassifications(DEFAULT_MOCK_CLASSIFICATIONS);
        }
      } else {
        setTtSubjects(DEFAULT_MOCK_SUBJECTS);
        setTtTeachers(DEFAULT_MOCK_TEACHERS);
        setTtClasses(DEFAULT_MOCK_CLASSES);
        setTtPeriods(DEFAULT_MOCK_PERIODS);
        setTtAssignments([]);
        setTtSlots(DEFAULT_MOCK_SLOTS);
        setTtClassifications(DEFAULT_MOCK_CLASSIFICATIONS);
      }
    } finally {
      setTtLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  if (ttLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <TimetableAdminView
      classes={ttClasses}
      teachers={ttTeachers}
      subjects={ttSubjects}
      classifications={ttClassifications}
      periods={ttPeriods}
      slots={ttSlots}
      assignments={ttAssignments}
      seasonsConfig={ttSeasonsConfig}
      onRefresh={fetchTimetableData}
      refreshing={ttLoading}
    />
  );
};

export default TimetableAdminViewContainer;
