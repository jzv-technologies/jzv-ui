// src/components/portals/admin/timetable/TimetableManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../utils/supabase';
import { showToast } from '../../../../utils/toast';
import TimetableAdminView from './TimetableAdminView';
import ConfirmModal from '../../../ConfirmModal';
import TimetableCompareModal from './TimetableCompareModal';
import { TimetableTools } from './TimetableTools';

import { TeachersSetup, ClassesSetup, PeriodsSetup, generateLocalId } from './TimetableSetupTabs';
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_SUBJECTS as DEFAULT_MOCK_SUBJECTS,
  MOCK_TEACHERS as DEFAULT_MOCK_TEACHERS,
  MOCK_CLASSES as DEFAULT_MOCK_CLASSES,
  MOCK_PERIODS as DEFAULT_MOCK_PERIODS,
  MOCK_ASSIGNMENTS as DEFAULT_MOCK_ASSIGNMENTS,
  MOCK_SLOTS as DEFAULT_MOCK_SLOTS,
  MOCK_TIMETABLE_STATE,
  MOCK_CLASSIFICATIONS as DEFAULT_MOCK_CLASSIFICATIONS,
} from '../../../../data/mockTimetable';

const makeDefaultSeasonsConfig = (initialPeriods, initialSlots) => ({
  active_season_id: 'summer',
  seasons: {
    summer: {
      id: 'summer',
      name: 'Summer',
      periods: initialPeriods || [],
      slots: initialSlots || [],
      weekday_config: {
        Monday: 'Weekday',
        Tuesday: 'Weekday',
        Wednesday: 'Weekday',
        Thursday: 'Weekday',
        Friday: 'Weekday',
        Saturday: 'Working Weekend',
        Sunday: 'Holiday Weekend',
      },
    },
    winter: {
      id: 'winter',
      name: 'Winter',
      periods: initialPeriods || [],
      slots: [],
      weekday_config: {
        Monday: 'Weekday',
        Tuesday: 'Weekday',
        Wednesday: 'Weekday',
        Thursday: 'Weekday',
        Friday: 'Weekday',
        Saturday: 'Working Weekend',
        Sunday: 'Holiday Weekend',
      },
    },
    exam: {
      id: 'exam',
      name: 'Exam Season',
      periods: initialPeriods || [],
      slots: [],
      weekday_config: {
        Monday: 'Weekday',
        Tuesday: 'Weekday',
        Wednesday: 'Weekday',
        Thursday: 'Weekday',
        Friday: 'Weekday',
        Saturday: 'Working Weekend',
        Sunday: 'Holiday Weekend',
      },
    },
    festival: {
      id: 'festival',
      name: 'Festival Season',
      periods: initialPeriods || [],
      slots: [],
      weekday_config: {
        Monday: 'Weekday',
        Tuesday: 'Weekday',
        Wednesday: 'Weekday',
        Thursday: 'Weekday',
        Friday: 'Weekday',
        Saturday: 'Working Weekend',
        Sunday: 'Holiday Weekend',
      },
    },
  },
});

const TimetableManager = () => {
  const [activeTab, setActiveTab] = useState('scheduler'); // "view" | "classes" | "teachers" | "subjects" | "periods" | "sync"

  // Timetable State
  const [classifications, setClassifications] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [seasonsConfig, setSeasonsConfig] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Connection State
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbSetupInstructionOpen, setDbSetupInstructionOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // JSON Import trigger
  const fileInputRef = React.useRef(null);
  const compareInputRef = React.useRef(null);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Test if supabase tables are accessible
      const { data: testClass, error: testErr } = await supabase
        .from('classes')
        .select('id')
        .limit(1);

      if (testErr) {
        throw new Error('Supabase tables not found. Falling back to local offline mode.');
      }

      // Fetch from Supabase
      const [
        { data: dbClassifications },
        { data: dbSubjects },
        { data: dbTeachers },
        { data: dbTeacherSubjectsMap },
        { data: dbTeacherSubjectsDirect },
        { data: dbClasses },
        { data: dbAssignments },
        { data: dbSlots },
        { data: dbPeriods },
      ] = await Promise.all([
        supabase.from('syl_classifications').select('*').order('name', { ascending: true }),
        supabase.from('syl_subjects').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('map_teacher_subject').select('*'),
        supabase.from('teacher_subjects').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('class_assignments').select('*'),
        supabase.from('timetable_slots').select('*'),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
      ]);

      const dbTeacherSubjects = dbTeacherSubjectsMap || dbTeacherSubjectsDirect || [];

      const teachersWithSubjects = (dbTeachers || []).map((t) => {
        const tid = t.teacher_id || t.id;
        return {
          ...t,
          id: tid,
          teacher_id: tid,
          subjects: (dbTeacherSubjects || [])
            .filter((ts) => String(ts.teacher_id) === String(tid))
            .map((ts) => ts.subject_id),
        };
      });

      setClassifications(dbClassifications || []);
      setSubjects(dbSubjects || []);
      setTeachers(teachersWithSubjects);
      setClasses(dbClasses || []);
      setAssignments(dbAssignments || []);
      setSlots(dbSlots || []);

      let finalPeriods = [];
      if (dbPeriods && dbPeriods.length > 0) {
        finalPeriods = dbPeriods;
      } else {
        try {
          const insertPayload = DEFAULT_MOCK_PERIODS.map((p) => ({
            period_number: p.period_number,
            name: p.name,
            start_time: p.start_time,
            end_time: p.end_time,
            is_break: p.is_break,
          }));
          const { data: insertedPeriods } = await supabase
            .from('periods')
            .insert(insertPayload)
            .select()
            .order('period_number', { ascending: true });
          finalPeriods = insertedPeriods || DEFAULT_MOCK_PERIODS;
        } catch (insertErr) {
          console.warn('Failed to auto-populate default periods:', insertErr.message);
          finalPeriods = DEFAULT_MOCK_PERIODS;
        }
      }

      // 1. Fetch seasons config from Supabase
      let fetchedSeasonsConfig = null;
      try {
        const { data: settingsData } = await supabase
          .from('admin_configruation')
          .select('*')
          .eq('key', 'timetable_seasons_config')
          .maybeSingle();

        if (settingsData && settingsData.val) {
          fetchedSeasonsConfig =
            typeof settingsData.val === 'string' ? JSON.parse(settingsData.val) : settingsData.val;
        }
      } catch (settingsErr) {
        console.warn('Failed to load seasons config from DB:', settingsErr.message);
      }

      // If not fetched from DB, check LocalStorage
      if (!fetchedSeasonsConfig) {
        const localRaw = localStorage.getItem('jzv_timetable_seasons_config');
        if (localRaw) {
          try {
            fetchedSeasonsConfig = JSON.parse(localRaw);
          } catch (e) {
            console.error('Failed to parse local seasons config', e);
          }
        }
      }

      // If still not found, construct default seasons config mapping existing DB/mock slots & periods to summer
      if (!fetchedSeasonsConfig) {
        fetchedSeasonsConfig = makeDefaultSeasonsConfig(finalPeriods, dbSlots || []);
      }

      setSeasonsConfig(fetchedSeasonsConfig);

      // Now set the periods and slots based on the active season in the configuration
      const activeId = fetchedSeasonsConfig.active_season_id || 'summer';
      const activeSeason = fetchedSeasonsConfig.seasons[activeId];

      const mappedPeriods = finalPeriods.map((dbP) => {
        const seasonP = activeSeason?.periods?.find((up) => up.period_number === dbP.period_number);
        return {
          ...dbP,
          icon: seasonP ? seasonP.icon : null,
          applicable_on_weekends: seasonP ? seasonP.applicable_on_weekends : false,
        };
      });

      setPeriods(mappedPeriods);
      setIsSupabaseMode(true);
    } catch (err) {
      console.warn('Supabase mode not active, loading from LocalStorage:', err.message);
      setIsSupabaseMode(false);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setClassifications(parsed.classifications || DEFAULT_MOCK_CLASSIFICATIONS);
        setSubjects(parsed.subjects || []);
        setTeachers(parsed.teachers || []);
        setClasses(parsed.classes || []);
        setAssignments(parsed.assignments || []);
        setSlots(parsed.slots || []);

        const localRaw = localStorage.getItem('jzv_timetable_seasons_config');
        let fetchedSeasonsConfig = null;
        if (localRaw) {
          try {
            fetchedSeasonsConfig = JSON.parse(localRaw);
          } catch (e) {
            console.error('Failed to parse local seasons config', e);
          }
        }

        const localPeriods = parsed.periods || DEFAULT_MOCK_PERIODS;
        const localSlots = parsed.slots || [];
        if (!fetchedSeasonsConfig) {
          fetchedSeasonsConfig = makeDefaultSeasonsConfig(localPeriods, localSlots);
        }

        setSeasonsConfig(fetchedSeasonsConfig);

        const activeId = fetchedSeasonsConfig.active_season_id || 'summer';
        const activeSeason = fetchedSeasonsConfig.seasons[activeId];

        const mappedPeriods = localPeriods.map((dbP) => {
          const seasonP = activeSeason?.periods?.find(
            (up) => up.period_number === dbP.period_number
          );
          return {
            ...dbP,
            icon: seasonP ? seasonP.icon : null,
            applicable_on_weekends: seasonP ? seasonP.applicable_on_weekends : false,
          };
        });

        setPeriods(mappedPeriods);
      } catch (e) {
        console.error('Failed to parse local timetable data', e);
        initializeMockData();
      }
    } else {
      initializeMockData();
    }
  };

  const initializeMockData = () => {
    setClassifications(DEFAULT_MOCK_CLASSIFICATIONS);
    setSubjects(DEFAULT_MOCK_SUBJECTS);
    setTeachers(DEFAULT_MOCK_TEACHERS);
    setClasses(DEFAULT_MOCK_CLASSES);
    setPeriods(DEFAULT_MOCK_PERIODS);
    setAssignments(DEFAULT_MOCK_ASSIGNMENTS);
    setSlots(DEFAULT_MOCK_SLOTS);

    const defaultSeasons = makeDefaultSeasonsConfig(DEFAULT_MOCK_PERIODS, DEFAULT_MOCK_SLOTS);
    setSeasonsConfig(defaultSeasons);
    localStorage.setItem('jzv_timetable_seasons_config', JSON.stringify(defaultSeasons));

    // Save to local storage
    const state = {
      classifications: DEFAULT_MOCK_CLASSIFICATIONS,
      subjects: DEFAULT_MOCK_SUBJECTS,
      teachers: DEFAULT_MOCK_TEACHERS,
      classes: DEFAULT_MOCK_CLASSES,
      periods: DEFAULT_MOCK_PERIODS,
      assignments: DEFAULT_MOCK_ASSIGNMENTS,
      slots: DEFAULT_MOCK_SLOTS,
    };
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(state));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync state helper
  const saveState = async (updates) => {
    const nextClassifications =
      updates.classifications !== undefined ? updates.classifications : classifications;
    const nextSubjects = updates.subjects !== undefined ? updates.subjects : subjects;
    const nextTeachers = updates.teachers !== undefined ? updates.teachers : teachers;
    const nextClasses = updates.classes !== undefined ? updates.classes : classes;
    const nextPeriods = updates.periods !== undefined ? updates.periods : periods;
    const nextAssignments = updates.assignments !== undefined ? updates.assignments : assignments;
    const nextSlots = updates.slots !== undefined ? updates.slots : slots;

    // Local Storage sync (always update local storage as redundant copy)
    const localState = {
      classifications: nextClassifications,
      subjects: nextSubjects,
      teachers: nextTeachers,
      classes: nextClasses,
      periods: nextPeriods,
      assignments: nextAssignments,
      slots: nextSlots,
    };
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(localState));

    // Update seasonsConfig state if loaded
    if (seasonsConfig) {
      const activeId = seasonsConfig.active_season_id || 'summer';
      const updatedConfig = {
        ...seasonsConfig,
        seasons: {
          ...seasonsConfig.seasons,
          [activeId]: {
            ...seasonsConfig.seasons[activeId],
            periods: nextPeriods,
            slots: nextSlots,
          },
        },
      };
      setSeasonsConfig(updatedConfig);
      localStorage.setItem('jzv_timetable_seasons_config', JSON.stringify(updatedConfig));

      // Sync seasonsConfig with DB in background/async
      if (isSupabaseMode) {
        supabase
          .from('admin_configruation')
          .upsert(
            {
              key: 'timetable_seasons_config',
              val: updatedConfig,
            },
            { onConflict: 'key' }
          )
          .then(({ error }) => {
            if (error) console.error('Error saving seasons config to DB:', error);
          });
      }
    }

    // Update React State
    if (updates.classifications !== undefined) setClassifications(updates.classifications);
    if (updates.subjects !== undefined) setSubjects(updates.subjects);
    if (updates.teachers !== undefined) setTeachers(updates.teachers);
    if (updates.classes !== undefined) setClasses(updates.classes);
    if (updates.periods !== undefined) setPeriods(updates.periods);
    if (updates.assignments !== undefined) setAssignments(updates.assignments);
    if (updates.slots !== undefined) setSlots(updates.slots);
  };

  // TEACHER ACTION HANDLERS
  const handleAddTeacher = async (name, qualifiedSubjects, isMale = true) => {
    const newTeacher = {
      id: generateLocalId(),
      name,
      subjects: qualifiedSubjects,
      is_male: isMale,
      is_active: true,
    };
    let updatedTeachers = [...teachers, newTeacher];

    if (isSupabaseMode) {
      try {
        // 1. Insert into teachers
        const { data: teacherData, error: teacherErr } = await supabase
          .from('employees')
          .insert([{ name, is_male: isMale, is_active: true }])
          .select();

        if (teacherErr) throw teacherErr;
        const insertedTeacher = teacherData[0];

        // 2. Insert qualified subjects into map_teacher_subject
        if (qualifiedSubjects.length > 0) {
          const relationPayload = qualifiedSubjects.map((subId) => ({
            teacher_id: insertedTeacher.id,
            subject_id: subId,
          }));
          const { error: relErr } = await supabase
            .from('map_teacher_subject')
            .insert(relationPayload);
          if (relErr) throw relErr;
        }

        updatedTeachers = [...teachers, { ...insertedTeacher, subjects: qualifiedSubjects }];
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }
    saveState({ teachers: updatedTeachers });
  };

  const handleUpdateTeacher = async (id, name, qualifiedSubjects, isMale = true) => {
    const updatedTeachers = teachers.map((t) =>
      String(t.id) === String(id) ? { ...t, name, subjects: qualifiedSubjects, is_male: isMale } : t
    );

    // Also verify currently assigned classes/slots for this teacher
    // If a subject is removed from the teacher's qualifications, clear those assignments/slots
    const updatedAssignments = assignments.filter((a) => {
      if (
        String(a.teacher_id) === String(id) &&
        !qualifiedSubjects.some((sid) => String(sid) === String(a.subject_id))
      ) {
        return false;
      }
      return true;
    });

    const updatedSlots = slots.map((s) => {
      if (
        String(s.teacher_id) === String(id) &&
        s.subject_id &&
        !qualifiedSubjects.some((sid) => String(sid) === String(s.subject_id))
      ) {
        return { ...s, subject_id: null, teacher_id: null };
      }
      return s;
    });

    if (isSupabaseMode && !id.toString().startsWith('local-')) {
      try {
        // 1. Update teachers table
        const { error: teacherErr } = await supabase
          .from('employees')
          .update({ name, is_male: isMale })
          .eq('id', id);
        if (teacherErr) throw teacherErr;

        // 2. Delete existing relations
        const { error: delErr } = await supabase
          .from('map_teacher_subject')
          .delete()
          .eq('teacher_id', id);
        if (delErr) throw delErr;

        // 3. Insert new relations
        if (qualifiedSubjects.length > 0) {
          const relationPayload = qualifiedSubjects.map((subId) => ({
            teacher_id: id,
            subject_id: subId,
          }));
          const { error: insErr } = await supabase
            .from('map_teacher_subject')
            .insert(relationPayload);
          if (insErr) throw insErr;
        }
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }
    saveState({
      teachers: updatedTeachers,
      assignments: updatedAssignments,
      slots: updatedSlots,
    });
  };

  const mutateSupabaseTable = async (tableName, action, payload, idVal) => {
    if (!idVal && action !== 'insert') return { data: [], error: null };

    const primaryCol = tableName === 'teachers' ? 'teacher_id' : 'id';
    const fallbackCol = tableName === 'teachers' ? 'id' : 'emp_id';

    const execute = async (col) => {
      let q = supabase.from(tableName);
      if (action === 'delete') {
        q = q.delete().eq(col, idVal);
      } else if (action === 'update') {
        q = q.update(payload).eq(col, idVal);
      } else if (action === 'insert') {
        q = q.insert(payload);
      }
      return await q.select();
    };

    let res = await execute(primaryCol);
    if (res.error && (res.error.code === '42703' || res.error.message?.includes('does not exist'))) {
      res = await execute(fallbackCol);
    }
    return res;
  };

  const handleDeleteTeacher = async (id) => {
    let dbDeleted = true;
    let dbErrDetail = null;

    if (isSupabaseMode && !id.toString().startsWith('local-')) {
      try {
        await supabase.from('class_assignments').delete().eq('teacher_id', id);
        await supabase.from('timetable_slots').update({ teacher_id: null }).eq('teacher_id', id);
        await supabase.from('teacher_subjects').delete().eq('teacher_id', id);
        await supabase.from('map_teacher_subject').delete().eq('teacher_id', id);

        const resTeach = await mutateSupabaseTable('teachers', 'delete', null, id);
        const resEmp = await mutateSupabaseTable('employees', 'delete', null, id);

        const teacherDeleted =
          (resTeach.data && resTeach.data.length > 0) ||
          (resEmp.data && resEmp.data.length > 0);

        if (!teacherDeleted) {
          dbDeleted = false;
          dbErrDetail = resTeach.error?.message || resEmp.error?.message || 'Database permissions / RLS blocked row deletion.';
        }
      } catch (err) {
        dbDeleted = false;
        dbErrDetail = err.message;
      }

      if (!dbDeleted) {
        showToast('Error deleting teacher: ' + dbErrDetail, 'error');
        return;
      }
    }

    const updatedTeachers = teachers.filter((t) => String(t.id) !== String(id));
    const updatedAssignments = assignments.filter((a) => String(a.teacher_id) !== String(id));
    const updatedSlots = slots.filter((s) => String(s.teacher_id) !== String(id));

    saveState({
      teachers: updatedTeachers,
      assignments: updatedAssignments,
      slots: updatedSlots,
    });
    showToast('Teacher deleted successfully!', 'success');
  };

  const handleToggleTeacherActive = async (id) => {
    const teacher = teachers.find((t) => String(t.id) === String(id));
    if (!teacher) return;
    const nextActive = teacher.is_active === false ? true : false;

    const updatedTeachers = teachers.map((t) =>
      String(t.id) === String(id) ? { ...t, is_active: nextActive } : t
    );

    if (isSupabaseMode && !id.toString().startsWith('local-')) {
      try {
        const { error } = await supabase
          .from('employees')
          .update({ is_active: nextActive })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }
    saveState({ teachers: updatedTeachers });
    showToast(
      `Teacher "${teacher.name}" ${nextActive ? 'reactivated' : 'deactivated'} successfully.`,
      'success'
    );
  };

  // CLASS ACTION HANDLERS
  const handleAddClass = async (name) => {
    const newClass = { id: generateLocalId(), name };
    let updatedClasses = [...classes, newClass];

    if (isSupabaseMode) {
      try {
        const { data, error } = await supabase.from('classes').insert([{ name }]).select();
        if (error) throw error;
        updatedClasses = [...classes, data[0]];
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }
    saveState({ classes: updatedClasses });
  };

  const handleUpdateClass = async (id, name) => {
    const updatedClasses = classes.map((c) => (String(c.id) === String(id) ? { ...c, name } : c));

    if (isSupabaseMode && !id.toString().startsWith('local-')) {
      try {
        const { error } = await supabase.from('classes').update({ name }).eq('id', id);
        if (error) throw error;
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }
    saveState({ classes: updatedClasses });
  };

  const handleDeleteClass = async (id) => {
    const updatedClasses = classes.filter((c) => String(c.id) !== String(id));
    const updatedAssignments = assignments.filter((a) => String(a.class_id) !== String(id));
    const updatedSlots = slots.filter((s) => String(s.class_id) !== String(id));

    if (isSupabaseMode && !id.toString().startsWith('local-')) {
      try {
        await supabase.from('classes').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    saveState({
      classes: updatedClasses,
      assignments: updatedAssignments,
      slots: updatedSlots,
    });
  };

  // CLASS ASSIGNMENT HANDLERS
  const handleAddAssignment = async (classId, teacherId, subjectId) => {
    // Check if assignment already exists
    const exists = assignments.some(
      (a) =>
        String(a.class_id) === String(classId) &&
        String(a.teacher_id) === String(teacherId) &&
        String(a.subject_id) === String(subjectId)
    );
    if (exists) return;

    const newAss = {
      id: generateLocalId(),
      class_id: classId,
      teacher_id: teacherId,
      subject_id: subjectId,
    };
    let updatedAssignments = [...assignments, newAss];

    if (
      isSupabaseMode &&
      !classId.toString().startsWith('local-') &&
      !teacherId.toString().startsWith('local-') &&
      !subjectId.toString().startsWith('local-')
    ) {
      try {
        const { data, error } = await supabase
          .from('class_assignments')
          .insert([{ class_id: classId, teacher_id: teacherId, subject_id: subjectId }])
          .select();
        if (error) throw error;
        updatedAssignments = [...assignments, data[0]];
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }
    saveState({ assignments: updatedAssignments });
  };

  const handleRemoveAssignment = async (id) => {
    const ass = assignments.find((a) => String(a.id) === String(id));
    if (!ass) return;

    const updatedAssignments = assignments.filter((a) => String(a.id) !== String(id));
    // Set scheduled slots with this mapping to Free Period
    const updatedSlots = slots.map((s) => {
      if (
        String(s.class_id) === String(ass.class_id) &&
        String(s.subject_id) === String(ass.subject_id) &&
        String(s.teacher_id) === String(ass.teacher_id)
      ) {
        return { ...s, subject_id: null, teacher_id: null };
      }
      return s;
    });

    if (isSupabaseMode && !id.toString().startsWith('local-')) {
      try {
        await supabase.from('class_assignments').delete().eq('id', id);
      } catch (err) {
        console.error(err);
      }
    }
    saveState({ assignments: updatedAssignments, slots: updatedSlots });
  };

  const handleRemoveMultipleAssignments = async (idsToRemove) => {
    if (!idsToRemove || idsToRemove.length === 0) return;
    const idsSet = new Set(idsToRemove.map(String));

    const removedAssList = assignments.filter((a) => idsSet.has(String(a.id)));
    const updatedAssignments = assignments.filter((a) => !idsSet.has(String(a.id)));

    // Clear any slots scheduled with these removed assignments
    const updatedSlots = slots.map((s) => {
      const match = removedAssList.some(
        (ass) =>
          String(s.class_id) === String(ass.class_id) &&
          String(s.subject_id) === String(ass.subject_id) &&
          String(s.teacher_id) === String(ass.teacher_id)
      );
      if (match) {
        return { ...s, subject_id: null, teacher_id: null };
      }
      return s;
    });

    if (isSupabaseMode) {
      const dbIds = idsToRemove.filter((id) => !id.toString().startsWith('local-'));
      if (dbIds.length > 0) {
        try {
          await supabase.from('class_assignments').delete().in('id', dbIds);
        } catch (err) {
          console.error('Failed to batch delete class_assignments:', err);
        }
      }
    }

    saveState({ assignments: updatedAssignments, slots: updatedSlots });
    showToast(`Removed ${idsToRemove.length} duplicate assignment(s)`, 'success');
  };

  const handleSwapTeachers = async ({ teacherAId, teacherBId, classIds, mapMode }) => {
    setLoading(true);
    try {
      let updatedSlots = [...slots];
      let updatedAssignments = [...assignments];
      let updatedTeachers = [...teachers];

      const classIdsSet = new Set(classIds.map(String));

      // Get teacher qualifications
      const teacherA = teachers.find((t) => String(t.id) === String(teacherAId));
      const teacherB = teachers.find((t) => String(t.id) === String(teacherBId));
      if (!teacherA || !teacherB) throw new Error('Selected teachers not found.');

      const qualifiedA = new Set((teacherA.subjects || []).map(String));
      const qualifiedB = new Set((teacherB.subjects || []).map(String));

      const newQualificationsA = new Set();
      const newQualificationsB = new Set();

      const slotsToUpsert = [];

      // Swap in slots
      updatedSlots = updatedSlots.map((s) => {
        if (!classIdsSet.has(String(s.class_id))) return s;

        if (String(s.teacher_id) === String(teacherAId)) {
          // Swap to B
          const isQualified =
            qualifiedB.has(String(s.subject_id)) || newQualificationsB.has(String(s.subject_id));
          if (isQualified) {
            slotsToUpsert.push({ ...s, teacher_id: teacherBId });
            return { ...s, teacher_id: teacherBId };
          } else if (mapMode === 'auto_qualify') {
            newQualificationsB.add(String(s.subject_id));
            slotsToUpsert.push({ ...s, teacher_id: teacherBId });
            return { ...s, teacher_id: teacherBId };
          }
        } else if (String(s.teacher_id) === String(teacherBId)) {
          // Swap to A
          const isQualified =
            qualifiedA.has(String(s.subject_id)) || newQualificationsA.has(String(s.subject_id));
          if (isQualified) {
            slotsToUpsert.push({ ...s, teacher_id: teacherAId });
            return { ...s, teacher_id: teacherAId };
          } else if (mapMode === 'auto_qualify') {
            newQualificationsA.add(String(s.subject_id));
            slotsToUpsert.push({ ...s, teacher_id: teacherAId });
            return { ...s, teacher_id: teacherAId };
          }
        }
        return s;
      });

      // Database sync for qualifications
      if (isSupabaseMode) {
        if (newQualificationsA.size > 0) {
          const relationPayload = Array.from(newQualificationsA).map((subId) => ({
            teacher_id: teacherAId,
            subject_id: subId,
          }));
          const { error } = await supabase
            .from('map_teacher_subject')
            .upsert(relationPayload, { onConflict: 'teacher_id,subject_id' });
          if (error) throw error;
        }
        if (newQualificationsB.size > 0) {
          const relationPayload = Array.from(newQualificationsB).map((subId) => ({
            teacher_id: teacherBId,
            subject_id: subId,
          }));
          const { error } = await supabase
            .from('map_teacher_subject')
            .upsert(relationPayload, { onConflict: 'teacher_id,subject_id' });
          if (error) throw error;
        }
      }

      // Update local teachers qualifications
      updatedTeachers = updatedTeachers.map((t) => {
        if (String(t.id) === String(teacherAId) && newQualificationsA.size > 0) {
          return {
            ...t,
            subjects: [...new Set([...(t.subjects || []), ...Array.from(newQualificationsA)])],
          };
        }
        if (String(t.id) === String(teacherBId) && newQualificationsB.size > 0) {
          return {
            ...t,
            subjects: [...new Set([...(t.subjects || []), ...Array.from(newQualificationsB)])],
          };
        }
        return t;
      });

      // Database sync for slots
      if (isSupabaseMode && slotsToUpsert.length > 0) {
        const upsertPayload = slotsToUpsert.map((s) => ({
          class_id: s.class_id,
          day: s.day,
          period_id: s.period_id,
          subject_id: s.subject_id,
          teacher_id: s.teacher_id,
        }));
        const { error } = await supabase
          .from('timetable_slots')
          .upsert(upsertPayload, { onConflict: 'class_id,day,period_id' });
        if (error) throw error;
      }

      // Update class assignments
      const neededAssignments = new Map();
      updatedSlots.forEach((s) => {
        if (s.teacher_id && s.subject_id) {
          const key = `${s.class_id}-${s.teacher_id}-${s.subject_id}`;
          neededAssignments.set(key, {
            class_id: s.class_id,
            teacher_id: s.teacher_id,
            subject_id: s.subject_id,
          });
        }
      });

      const otherAssignments = assignments.filter((a) => {
        const isTargetClass = classIdsSet.has(String(a.class_id));
        const isTargetTeacher =
          String(a.teacher_id) === String(teacherAId) ||
          String(a.teacher_id) === String(teacherBId);
        return !(isTargetClass && isTargetTeacher);
      });

      const newAssignmentsForTargets = [];
      neededAssignments.forEach((val) => {
        const isTargetClass = classIdsSet.has(String(val.class_id));
        const isTargetTeacher =
          String(val.teacher_id) === String(teacherAId) ||
          String(val.teacher_id) === String(teacherBId);
        if (isTargetClass && isTargetTeacher) {
          newAssignmentsForTargets.push(val);
        }
      });

      if (isSupabaseMode) {
        const { error: delErr } = await supabase
          .from('class_assignments')
          .delete()
          .in('class_id', classIds)
          .in('teacher_id', [teacherAId, teacherBId]);
        if (delErr) throw delErr;

        if (newAssignmentsForTargets.length > 0) {
          const { data: insertedData, error: insErr } = await supabase
            .from('class_assignments')
            .insert(
              newAssignmentsForTargets.map((a) => ({
                class_id: a.class_id,
                teacher_id: a.teacher_id,
                subject_id: a.subject_id,
              }))
            )
            .select();
          if (insErr) throw insErr;
          updatedAssignments = [...otherAssignments, ...(insertedData || [])];
        } else {
          updatedAssignments = otherAssignments;
        }
      } else {
        const localNewAssignments = newAssignmentsForTargets.map((a) => ({
          id: generateLocalId(),
          ...a,
        }));
        updatedAssignments = [...otherAssignments, ...localNewAssignments];
      }

      saveState({
        slots: updatedSlots,
        assignments: updatedAssignments,
        teachers: updatedTeachers,
      });

      showToast('Teachers swapped successfully!', 'success');
      await loadData();
    } catch (err) {
      showToast('Error during swap: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReassignTeacher = async ({ existingTeacherId, newTeacherId, classIds, mapMode }) => {
    setLoading(true);
    try {
      let updatedSlots = [...slots];
      let updatedAssignments = [...assignments];
      let updatedTeachers = [...teachers];

      const classIdsSet = new Set(classIds.map(String));

      const newTeacher = teachers.find((t) => String(t.id) === String(newTeacherId));
      if (!newTeacher) throw new Error('New teacher not found.');

      const qualifiedNew = new Set((newTeacher.subjects || []).map(String));
      const newQualificationsNew = new Set();

      const slotsToUpsert = [];

      updatedSlots = updatedSlots.map((s) => {
        if (!classIdsSet.has(String(s.class_id))) return s;

        if (String(s.teacher_id) === String(existingTeacherId)) {
          const isQualified =
            qualifiedNew.has(String(s.subject_id)) ||
            newQualificationsNew.has(String(s.subject_id));
          if (isQualified) {
            slotsToUpsert.push({ ...s, teacher_id: newTeacherId });
            return { ...s, teacher_id: newTeacherId };
          } else if (mapMode === 'auto_qualify') {
            newQualificationsNew.add(String(s.subject_id));
            slotsToUpsert.push({ ...s, teacher_id: newTeacherId });
            return { ...s, teacher_id: newTeacherId };
          }
        }
        return s;
      });

      if (isSupabaseMode && newQualificationsNew.size > 0) {
        const relationPayload = Array.from(newQualificationsNew).map((subId) => ({
          teacher_id: newTeacherId,
          subject_id: subId,
        }));
        const { error } = await supabase
          .from('map_teacher_subject')
          .upsert(relationPayload, { onConflict: 'teacher_id,subject_id' });
        if (error) throw error;
      }

      updatedTeachers = updatedTeachers.map((t) => {
        if (String(t.id) === String(newTeacherId) && newQualificationsNew.size > 0) {
          return {
            ...t,
            subjects: [...new Set([...(t.subjects || []), ...Array.from(newQualificationsNew)])],
          };
        }
        return t;
      });

      if (isSupabaseMode && slotsToUpsert.length > 0) {
        const upsertPayload = slotsToUpsert.map((s) => ({
          class_id: s.class_id,
          day: s.day,
          period_id: s.period_id,
          subject_id: s.subject_id,
          teacher_id: s.teacher_id,
        }));
        const { error } = await supabase
          .from('timetable_slots')
          .upsert(upsertPayload, { onConflict: 'class_id,day,period_id' });
        if (error) throw error;
      }

      const neededAssignments = new Map();
      updatedSlots.forEach((s) => {
        if (s.teacher_id && s.subject_id) {
          const key = `${s.class_id}-${s.teacher_id}-${s.subject_id}`;
          neededAssignments.set(key, {
            class_id: s.class_id,
            teacher_id: s.teacher_id,
            subject_id: s.subject_id,
          });
        }
      });

      const otherAssignments = assignments.filter((a) => {
        const isTargetClass = classIdsSet.has(String(a.class_id));
        const isTargetTeacher =
          String(a.teacher_id) === String(existingTeacherId) ||
          String(a.teacher_id) === String(newTeacherId);
        return !(isTargetClass && isTargetTeacher);
      });

      const newAssignmentsForTargets = [];
      neededAssignments.forEach((val) => {
        const isTargetClass = classIdsSet.has(String(val.class_id));
        const isTargetTeacher =
          String(val.teacher_id) === String(existingTeacherId) ||
          String(val.teacher_id) === String(newTeacherId);
        if (isTargetClass && isTargetTeacher) {
          newAssignmentsForTargets.push(val);
        }
      });

      if (isSupabaseMode) {
        const { error: delErr } = await supabase
          .from('class_assignments')
          .delete()
          .in('class_id', classIds)
          .in('teacher_id', [existingTeacherId, newTeacherId]);
        if (delErr) throw delErr;

        if (newAssignmentsForTargets.length > 0) {
          const { data: insertedData, error: insErr } = await supabase
            .from('class_assignments')
            .insert(
              newAssignmentsForTargets.map((a) => ({
                class_id: a.class_id,
                teacher_id: a.teacher_id,
                subject_id: a.subject_id,
              }))
            )
            .select();
          if (insErr) throw insErr;
          updatedAssignments = [...otherAssignments, ...(insertedData || [])];
        } else {
          updatedAssignments = otherAssignments;
        }
      } else {
        const localNewAssignments = newAssignmentsForTargets.map((a) => ({
          id: generateLocalId(),
          ...a,
        }));
        updatedAssignments = [...otherAssignments, ...localNewAssignments];
      }

      saveState({
        slots: updatedSlots,
        assignments: updatedAssignments,
        teachers: updatedTeachers,
      });

      showToast('Teacher reassigned successfully!', 'success');
      await loadData();
    } catch (err) {
      showToast('Error during reassign: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // PERIOD CONFIGURATION HANDLER
  const handleSavePeriods = async (configuredPeriods) => {
    let finalPeriods = [...configuredPeriods];
    let updatedSlots = [...slots];
    const maxPeriod = finalPeriods.length;

    if (isSupabaseMode) {
      try {
        // 1. Fetch current database periods
        const { data: existingPeriods } = await supabase.from('periods').select('*');

        // 2. Delete periods exceeding the new count
        await supabase.from('periods').delete().gt('period_number', maxPeriod);

        // 3. Upsert/update the remaining periods
        for (const period of finalPeriods) {
          const exists = existingPeriods?.find((p) => p.period_number === period.period_number);
          if (exists) {
            await supabase
              .from('periods')
              .update({
                name: period.name || `Period ${period.period_number}`,
                start_time: period.start_time || null,
                end_time: period.end_time || null,
                is_break: period.is_break || false,
              })
              .eq('id', exists.id);
          } else {
            await supabase.from('periods').insert([
              {
                period_number: period.period_number,
                name: period.name || `Period ${period.period_number}`,
                start_time: period.start_time || null,
                end_time: period.end_time || null,
                is_break: period.is_break || false,
              },
            ]);
          }
        }

        // 4. Reload periods from database to get correct IDs
        const { data: updatedDbPeriods } = await supabase
          .from('periods')
          .select('*')
          .order('period_number', { ascending: true });

        // Map custom attributes (icon, applicable_on_weekends) back to reloaded periods
        finalPeriods = (updatedDbPeriods || []).map((dbP) => {
          const origP = configuredPeriods.find((p) => p.period_number === dbP.period_number);
          return {
            ...dbP,
            icon: origP ? origP.icon : null,
            applicable_on_weekends: origP ? origP.applicable_on_weekends : false,
          };
        });
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }

    // Filter local slots to only keep ones belonging to remaining periods
    const remainingIds = finalPeriods.map((p) => p.id);
    updatedSlots = updatedSlots.filter((s) => remainingIds.includes(s.period_id));

    saveState({ periods: finalPeriods, slots: updatedSlots });
  };

  // SAVE SEASONS CONFIGURATION & OPTIONALLY SWITCH ACTIVE SEASON
  const handleSaveSeasonsConfig = async (newConfig, targetActiveSeasonId = null) => {
    setLoading(true);
    try {
      let finalConfig = { ...newConfig };

      if (targetActiveSeasonId) {
        const currentActiveId = seasonsConfig.active_season_id;

        // 1. Save current memory state (periods & slots) to the config for current active season
        finalConfig.seasons[currentActiveId] = {
          ...finalConfig.seasons[currentActiveId],
          periods: periods,
          slots: slots,
        };

        // 2. Set new active season ID
        finalConfig.active_season_id = targetActiveSeasonId;

        const targetSeason = finalConfig.seasons[targetActiveSeasonId];
        const targetPeriods = targetSeason.periods || [];
        const targetSlots = targetSeason.slots || [];

        if (isSupabaseMode) {
          // Clear all periods (which cascades and deletes all timetable_slots)
          const { error: delError } = await supabase.from('periods').delete().neq('id', -1);
          if (delError) throw delError;

          // Insert target season's periods
          const dbPeriodsToInsert = targetPeriods.map((p) => ({
            period_number: p.period_number,
            name: p.name,
            start_time: p.start_time || null,
            end_time: p.end_time || null,
            is_break: p.is_break || false,
          }));

          if (dbPeriodsToInsert.length > 0) {
            const { data: insertedPeriods, error: insError } = await supabase
              .from('periods')
              .insert(dbPeriodsToInsert)
              .select();
            if (insError) throw insError;

            // Map target slots to the new period IDs
            const periodNumToId = {};
            insertedPeriods.forEach((p) => {
              periodNumToId[p.period_number] = p.id;
            });

            const slotsToInsert = targetSlots
              .map((s) => {
                const origPeriod = targetPeriods.find(
                  (p) => String(p.id) === String(s.period_id) || p.period_number === s.period_number
                );
                const periodNum = origPeriod ? origPeriod.period_number : s.period_number;
                const newPeriodId = periodNumToId[periodNum];
                if (!newPeriodId) return null;
                return {
                  class_id: s.class_id,
                  day: s.day,
                  period_id: newPeriodId,
                  subject_id: s.subject_id,
                  teacher_id: s.teacher_id,
                };
              })
              .filter(Boolean);

            if (slotsToInsert.length > 0) {
              const { error: slotsError } = await supabase
                .from('timetable_slots')
                .insert(slotsToInsert);
              if (slotsError) throw slotsError;
            }
          }

          // Save settings to database
          const { error: settingsError } = await supabase.from('admin_configruation').upsert(
            {
              key: 'timetable_seasons_config',
              val: finalConfig,
            },
            { onConflict: 'key' }
          );
          if (settingsError) throw settingsError;
        } else {
          // Local offline mode
          localStorage.setItem('jzv_timetable_seasons_config', JSON.stringify(finalConfig));

          const localState = {
            classifications,
            subjects,
            teachers,
            classes,
            periods: targetPeriods,
            assignments,
            slots: targetSlots,
          };
          localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(localState));
        }

        // Reload data to refresh UI state
        await loadData();
        showToast(
          `Successfully switched to active season: ${targetSeason.name || targetActiveSeasonId}`,
          'success'
        );
      } else {
        // Just save config in state and storage
        setSeasonsConfig(finalConfig);
        localStorage.setItem('jzv_timetable_seasons_config', JSON.stringify(finalConfig));

        if (isSupabaseMode) {
          const { error: settingsError } = await supabase.from('admin_configruation').upsert(
            {
              key: 'timetable_seasons_config',
              val: finalConfig,
            },
            { onConflict: 'key' }
          );
          if (settingsError) throw settingsError;
        }
        showToast('Season settings saved successfully.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving season settings: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // COPY TIMETABLE/PERIODS FROM ONE SEASON TO ANOTHER
  const handleCopySeason = async (sourceSeasonId, targetSeasonId, copyType) => {
    if (!seasonsConfig) return;

    const currentActiveId = seasonsConfig.active_season_id;
    const sourceSeason = { ...seasonsConfig.seasons[sourceSeasonId] };

    // If copying from active, make sure we use current in-memory slots/periods
    if (sourceSeasonId === currentActiveId) {
      sourceSeason.periods = periods;
      sourceSeason.slots = slots;
    }

    const targetSeason = { ...seasonsConfig.seasons[targetSeasonId] };

    if (copyType === 'all' || copyType === 'periods_only') {
      targetSeason.periods = sourceSeason.periods.map((p) => ({ ...p }));
      targetSeason.weekday_config = { ...sourceSeason.weekday_config };
    }

    if (copyType === 'all' || copyType === 'slots_only') {
      const sourcePeriods = sourceSeason.periods || [];
      const targetPeriods = targetSeason.periods || [];

      const mappedSlots = (sourceSeason.slots || [])
        .map((s) => {
          const srcP = sourcePeriods.find((p) => String(p.id) === String(s.period_id));
          if (!srcP) return null;

          const tgtP = targetPeriods.find((p) => p.period_number === srcP.period_number);
          if (!tgtP) return null;

          return {
            ...s,
            id: generateLocalId(),
            period_id: tgtP.id,
          };
        })
        .filter(Boolean);

      targetSeason.slots = mappedSlots;
    }

    const updatedConfig = {
      ...seasonsConfig,
      seasons: {
        ...seasonsConfig.seasons,
        [targetSeasonId]: targetSeason,
      },
    };

    if (targetSeasonId === currentActiveId) {
      await handleSaveSeasonsConfig(updatedConfig, targetSeasonId);
    } else {
      await handleSaveSeasonsConfig(updatedConfig);
    }
    showToast(
      `Successfully copied ${
        copyType === 'all'
          ? 'all configurations'
          : copyType === 'periods_only'
            ? 'periods configuration'
            : 'slots schedule'
      } from ${sourceSeason.name} to ${targetSeason.name}`,
      'success'
    );
  };

  // SLOT ASSIGNMENT HANDLER (THE CORE SCHEDULING CALCULATION)
  const handleUpdateSlot = async (classId, dayOrDays, periodId, subjectId, teacherId) => {
    const targetDays = Array.isArray(dayOrDays) ? dayOrDays : [dayOrDays];
    let updatedSlots = [...slots];

    // Local state updates first
    for (const day of targetDays) {
      const existingIndex = updatedSlots.findIndex(
        (s) =>
          String(s.class_id) === String(classId) &&
          s.day === day &&
          String(s.period_id) === String(periodId)
      );

      if (subjectId === null && teacherId === null) {
        // Clear slot
        if (existingIndex > -1) {
          updatedSlots.splice(existingIndex, 1);
        }
      } else {
        // Assign slot
        const newSlotVal = {
          class_id: classId,
          day,
          period_id: periodId,
          subject_id: subjectId,
          teacher_id: teacherId,
        };
        if (existingIndex > -1) {
          updatedSlots[existingIndex] = { ...updatedSlots[existingIndex], ...newSlotVal };
        } else {
          updatedSlots.push({ id: generateLocalId(), ...newSlotVal });
        }
      }
    }

    // Supabase DB Sync
    if (isSupabaseMode && !String(classId).startsWith('local-')) {
      try {
        if (subjectId === null && teacherId === null) {
          // Batch delete from db
          const { error } = await supabase
            .from('timetable_slots')
            .delete()
            .eq('class_id', classId)
            .eq('period_id', periodId)
            .in('day', targetDays);
          if (error) throw error;
        } else {
          // Batch upsert to db
          const upsertPayload = targetDays.map((day) => ({
            class_id: classId,
            day,
            period_id: periodId,
            subject_id: subjectId,
            teacher_id: teacherId,
          }));

          const { data, error } = await supabase
            .from('timetable_slots')
            .upsert(upsertPayload, { onConflict: 'class_id,day,period_id' })
            .select();
          if (error) throw error;

          // Replace local slots with returned DB slots to have real IDs
          if (data && data.length > 0) {
            data.forEach((dbSlot) => {
              const idx = updatedSlots.findIndex(
                (s) =>
                  String(s.class_id) === String(dbSlot.class_id) &&
                  s.day === dbSlot.day &&
                  String(s.period_id) === String(dbSlot.period_id)
              );
              if (idx > -1) {
                updatedSlots[idx] = dbSlot;
              } else {
                updatedSlots.push(dbSlot);
              }
            });
          }
        }
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }

    saveState({ slots: updatedSlots });
  };

  // CLEAR SLOTS HANDLER (Clear multiple periods for multiple days for class)
  const handleClearSlots = async (classId, targetDays, targetPeriodIds) => {
    let updatedSlots = [...slots];

    // Local state updates
    for (const day of targetDays) {
      for (const periodId of targetPeriodIds) {
        const existingIndex = updatedSlots.findIndex(
          (s) =>
            String(s.class_id) === String(classId) &&
            s.day === day &&
            String(s.period_id) === String(periodId)
        );
        if (existingIndex > -1) {
          updatedSlots.splice(existingIndex, 1);
        }
      }
    }

    // DB Sync
    if (isSupabaseMode && !String(classId).startsWith('local-')) {
      try {
        const { error } = await supabase
          .from('timetable_slots')
          .delete()
          .eq('class_id', classId)
          .in('day', targetDays)
          .in('period_id', targetPeriodIds);
        if (error) throw error;
        showToast('Slots cleared successfully.', 'success');
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        return;
      }
    }

    saveState({ slots: updatedSlots });
  };

  // MOVE SLOT HANDLER (Move slot from source day/period to target day/period)
  const handleMoveSlot = async (classId, sourceDay, sourcePeriodId, targetDay, targetPeriodId) => {
    const sourceSlot = slots.find(
      (s) =>
        String(s.class_id) === String(classId) &&
        s.day === sourceDay &&
        String(s.period_id) === String(sourcePeriodId)
    );
    if (!sourceSlot) return;

    const { subject_id: subjectId, teacher_id: teacherId } = sourceSlot;
    let updatedSlots = [...slots];

    // Remove source slot
    const srcIndex = updatedSlots.findIndex(
      (s) =>
        String(s.class_id) === String(classId) &&
        s.day === sourceDay &&
        String(s.period_id) === String(sourcePeriodId)
    );
    if (srcIndex > -1) {
      updatedSlots.splice(srcIndex, 1);
    }

    // Set target slot
    const tgtIndex = updatedSlots.findIndex(
      (s) =>
        String(s.class_id) === String(classId) &&
        s.day === targetDay &&
        String(s.period_id) === String(targetPeriodId)
    );

    const newSlotVal = {
      class_id: classId,
      day: targetDay,
      period_id: targetPeriodId,
      subject_id: subjectId,
      teacher_id: teacherId,
    };

    if (tgtIndex > -1) {
      updatedSlots[tgtIndex] = { ...updatedSlots[tgtIndex], ...newSlotVal };
    } else {
      updatedSlots.push({ id: generateLocalId(), ...newSlotVal });
    }

    if (isSupabaseMode && !String(classId).startsWith('local-')) {
      try {
        // Delete source
        await supabase
          .from('timetable_slots')
          .delete()
          .eq('class_id', classId)
          .eq('day', sourceDay)
          .eq('period_id', sourcePeriodId);

        // Upsert target
        const { data, error } = await supabase
          .from('timetable_slots')
          .upsert([newSlotVal], { onConflict: 'class_id,day,period_id' })
          .select();
        if (error) throw error;

        if (data && data.length > 0) {
          const idx = updatedSlots.findIndex(
            (s) =>
              String(s.class_id) === String(data[0].class_id) &&
              s.day === data[0].day &&
              String(s.period_id) === String(data[0].period_id)
          );
          if (idx > -1) {
            updatedSlots[idx] = data[0];
          }
        }
      } catch (err) {
        showToast('DB Error: ' + err.message, 'error');
        await loadData();
        return;
      }
    }

    saveState({ slots: updatedSlots });
    showToast('Slot moved successfully!', 'success');
  };

  // MOVE COLUMN HANDLER (Move all slots for a class from one period to another)
  const handleMoveColumn = async (classId, sourcePeriodId, targetPeriodId) => {
    let updatedSlots = [...slots];
    const slotsToMove = updatedSlots.filter(
      (s) =>
        String(s.class_id) === String(classId) && String(s.period_id) === String(sourcePeriodId)
    );

    if (slotsToMove.length === 0) {
      showToast('No slots to move in this column.', 'info');
      return;
    }

    const existingTargetSlots = updatedSlots.filter(
      (s) =>
        String(s.class_id) === String(classId) && String(s.period_id) === String(targetPeriodId)
    );

    const executeMove = async () => {
      // Remove source slots
      updatedSlots = updatedSlots.filter(
        (s) =>
          !(
            String(s.class_id) === String(classId) && String(s.period_id) === String(sourcePeriodId)
          )
      );

      // Remove old target slots (overwrite)
      updatedSlots = updatedSlots.filter(
        (s) =>
          !(
            String(s.class_id) === String(classId) && String(s.period_id) === String(targetPeriodId)
          )
      );

      const newSlotsVal = slotsToMove.map((s) => ({
        class_id: classId,
        day: s.day,
        period_id: targetPeriodId,
        subject_id: s.subject_id,
        teacher_id: s.teacher_id,
        room_id: s.room_id,
      }));

      newSlotsVal.forEach((ns) => {
        updatedSlots.push({ id: generateLocalId(), ...ns });
      });

      if (isSupabaseMode && !String(classId).startsWith('local-')) {
        try {
          await supabase
            .from('timetable_slots')
            .delete()
            .eq('class_id', classId)
            .in('period_id', [sourcePeriodId, targetPeriodId]);

          const { data, error } = await supabase
            .from('timetable_slots')
            .upsert(newSlotsVal, { onConflict: 'class_id,day,period_id' })
            .select();

          if (error) throw error;

          if (data && data.length > 0) {
            data.forEach((dbSlot) => {
              const idx = updatedSlots.findIndex(
                (s) =>
                  String(s.class_id) === String(dbSlot.class_id) &&
                  s.day === dbSlot.day &&
                  String(s.period_id) === String(dbSlot.period_id)
              );
              if (idx > -1) updatedSlots[idx] = dbSlot;
            });
          }
        } catch (err) {
          showToast('DB Error: ' + err.message, 'error');
          await loadData();
          return;
        }
      }
      saveState({ slots: updatedSlots });
      showToast('Column moved successfully!', 'success');
    };

    if (existingTargetSlots.length > 0) {
      setConfirmConfig({
        title: 'Overwrite Assignments',
        message:
          'The target column already has assignments for this class. They will be overwritten. Proceed?',
        type: 'warning',
        confirmText: 'Overwrite',
        onConfirm: () => {
          setConfirmConfig(null);
          executeMove();
        },
      });
      return;
    }

    await executeMove();
  };

  // JSON EXPORT HANDLER
  const handleExportJson = () => {
    const backupData = {
      version: '2.0',
      school: 'Jamia Zaytoonah Vellore',
      exportedAt: new Date().toISOString(),
      subjects,
      teachers,
      classes,
      periods,
      assignments,
      slots,
    };

    const str = JSON.stringify(backupData, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `jzv-timetable-finalized-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON IMPORT HANDLER
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        // Simple schema validation
        if (
          !Array.isArray(parsed.classes) ||
          !Array.isArray(parsed.teachers) ||
          !Array.isArray(parsed.subjects) ||
          !Array.isArray(parsed.periods) ||
          !Array.isArray(parsed.assignments) ||
          !Array.isArray(parsed.slots)
        ) {
          throw new Error('Invalid file format. Missing core timetable arrays.');
        }

        setConfirmConfig({
          title: 'Import Timetable',
          message:
            'Importing this file will overwrite your current timetable configuration. Proceed?',
          confirmText: 'Import',
          type: 'danger',
          onConfirm: async () => {
            setConfirmConfig(null);
            if (isSupabaseMode) {
              // Overwrite database
              setLoading(true);
              try {
                // Delete everything
                await Promise.all([
                  supabase.from('timetable_slots').delete().gt('id', 0),
                  supabase.from('class_assignments').delete().gt('id', 0),
                  supabase.from('map_teacher_subject').delete().gt('id', 0),
                  supabase.from('employees').delete().gt('id', 0),
                  supabase.from('classes').delete().gt('id', 0),
                  supabase.from('syl_subjects').delete().gt('id', 0),
                  supabase.from('periods').delete().gt('id', 0),
                ]);
              } catch (err) {
                console.warn('DB reset failed during import: ', err.message);
              } finally {
                setLoading(false);
              }
            }

            saveState({
              subjects: parsed.subjects,
              teachers: parsed.teachers,
              classes: parsed.classes,
              periods: parsed.periods,
              assignments: parsed.assignments,
              slots: parsed.slots,
            });

            showToast('Timetable imported successfully!', 'success');
          },
        });
      } catch (err) {
        showToast('Failed to parse JSON file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  // JSON COMPARE HANDLER
  const handleCompareJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        // Simple schema validation
        if (
          !Array.isArray(parsed.classes) ||
          !Array.isArray(parsed.teachers) ||
          !Array.isArray(parsed.subjects) ||
          !Array.isArray(parsed.periods) ||
          !Array.isArray(parsed.assignments) ||
          !Array.isArray(parsed.slots)
        ) {
          throw new Error('Invalid file format. Missing core timetable arrays.');
        }

        setCompareData(parsed);
        setIsCompareOpen(true);
      } catch (err) {
        showToast('Failed to parse JSON file for comparison: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col min-h-[500px]">
      {/* Top Banner Control Panel */}
      <div className="bg-light-lbg border border-light-border p-2 sm:p-4 mb-2 flex flex-col gap-2 -mx-2 print:hidden">
        {/* Title & Actions Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-dark-primary flex items-center gap-2">
              <i className="fas fa-calendar-alt text-brand-primary"></i>
              Timetable Planner
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xl font-bold ${
                    isSupabaseMode ? 'text-green-dark' : 'text-orange-dark'
                  }`}
                >
                  <i className="fas fa-lightbulb "></i>
                </span>
                <button
                  onClick={() => setActiveTab('sync')}
                  className="text-xl text-brand-primary font-bold hover:underline"
                >
                  <i className="fas fa-cog text-brand-primary"></i>
                </button>
              </div>
            </h2>
          </div>

          {/* Workspace Tabs (Inside the Top Banner Card) */}
          {/* Mobile view (< md): Dropdown */}
          <div className="md:hidden w-full">
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full appearance-none bg-white border border-light-border rounded-xl px-3.5 py-2 pr-8 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
              >
                {[
                  { id: 'scheduler', label: 'Scheduler Setup' },
                  { id: 'classes', label: 'Classes Setup' },
                  { id: 'teachers', label: 'Teachers Setup' },
                  { id: 'periods', label: 'Season Setup' },
                  { id: 'tools', label: 'Switch Teacher' },
                ].map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-dark-soft pointer-events-none" />
            </div>
          </div>

          {/* Desktop view (>= md): Pill tabs */}
          <div className="hidden md:flex bg-light-bg/40 p-1 rounded-xl border border-light-border flex-wrap gap-1 w-full md:w-auto">
            {[
              { id: 'scheduler', label: 'Scheduler Setup', icon: 'fa-eye' },
              { id: 'classes', label: 'Classes Setup', icon: 'fa-building' },
              { id: 'teachers', label: 'Teachers Setup', icon: 'fa-users' },
              { id: 'periods', label: 'Season Setup', icon: 'fa-clock' },
              { id: 'tools', label: 'Switch Teacher', icon: 'fa-exchange-alt' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-white bg-brand-primary shadow-sm'
                    : 'text-dark-soft hover:text-dark-primary'
                }`}
              >
                <i className={`fas ${tab.icon} text-[10px]`}></i>
                {tab.label}
              </button>
            ))}
          </div>
          {/* Export / Import backup */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleExportJson}
              className="flex-1 md:flex-none bg-green-500 hover:bg-green-800 text-white border border-light-border px-3 py-2 rounded-xl text-xl font-bold flex items-center justify-center gap-2 transition-all"
              title="Download full timetable configuration in JSON format"
            >
              <i className="fas fa-file-download"></i>
            </button>

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportJson}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 md:flex-none bg-blue-500 hover:bg-blue-800 text-white border border-light-border px-3 py-2 rounded-xl text-xl font-bold flex items-center justify-center gap-2 transition-all"
              title="Upload and restore timetable config from a JSON file"
            >
              <i className="fas fa-file-upload"></i>
            </button>

            {/* Compare Button */}
            <input
              type="file"
              accept=".json"
              ref={compareInputRef}
              onChange={handleCompareJson}
              className="hidden"
            />
            <button
              onClick={() => compareInputRef.current?.click()}
              className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-800 text-white border border-light-border px-2 py-2 rounded-xl text-xl font-bold flex items-center justify-center gap-2 transition-all"
              title="Compare offline JSON with currently active timetable"
            >
              <i className="fas fa-wave-square"></i>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className={`text-light-text hover:text-brand-primary transition-all p-1.5 rounded-lg hover:bg-light-ui/80 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh Timetable Data"
            >
              <i
                className={`fas fa-sync-alt ${loading ? 'animate-spin text-brand-primary' : ''}`}
              ></i>
            </button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && classes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1">
          {activeTab === 'scheduler' && (
            <TimetableAdminView
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              classifications={classifications}
              periods={periods}
              slots={slots}
              assignments={assignments}
              onRefresh={loadData}
              refreshing={loading}
              onUpdateSlot={handleUpdateSlot}
              onMoveSlot={handleMoveSlot}
              onClearSlots={handleClearSlots}
              onMoveColumn={handleMoveColumn}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersSetup
              teachers={teachers}
              subjects={subjects}
              classifications={classifications}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onToggleTeacherActive={handleToggleTeacherActive}
              slots={slots}
              assignments={assignments}
            />
          )}

          {activeTab === 'classes' && (
            <ClassesSetup
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              classifications={classifications}
              assignments={assignments}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onAddAssignment={handleAddAssignment}
              onRemoveAssignment={handleRemoveAssignment}
              onRemoveMultipleAssignments={handleRemoveMultipleAssignments}
              slots={slots}
            />
          )}

          {activeTab === 'periods' && (
            <PeriodsSetup
              periods={periods}
              onSavePeriods={handleSavePeriods}
              slots={slots}
              seasonsConfig={seasonsConfig}
              onSaveSeasonsConfig={handleSaveSeasonsConfig}
              onCopySeason={handleCopySeason}
            />
          )}

          {activeTab === 'tools' && (
            <TimetableTools
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              slots={slots}
              assignments={assignments}
              onSwapTeachers={handleSwapTeachers}
              onReassignTeacher={handleReassignTeacher}
            />
          )}

          {activeTab === 'sync' && (
            <div className="bg-white border border-light-border p-6 sm:p-8 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-dark-deepblue mb-1">
                  Database Integration Settings
                </h3>
                <p className="text-xs text-dark-soft">
                  Enable cloud database synchronization via Supabase for multi-user access and
                  secure backups.
                </p>
              </div>

              <div className="border border-light-border p-5 rounded-2xl bg-light-lbg/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full animate-pulse ${
                      isSupabaseMode ? 'bg-green-bright' : 'bg-orange-primary'
                    }`}
                  />
                  <div>
                    <span className="text-xs text-dark-soft font-bold block">
                      Current Sync Mode
                    </span>
                    <span className="text-sm font-extrabold text-dark-deepblue">
                      {isSupabaseMode
                        ? 'Supabase Live Database'
                        : 'Offline (Local Browser Storage)'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => loadData()}
                  className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <i className="fas fa-sync mr-1.5 animate-spin-slow"></i> Re-test Connection
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                  <h4 className="text-sm font-bold text-blue-dark uppercase tracking-wider mb-2 flex items-center gap-2">
                    <i className="fas fa-info-circle"></i> Supabase Setup Instructions
                  </h4>
                  <p className="text-xs text-dark-soft leading-relaxed mb-3">
                    If you haven't set up the timetable tables in Supabase yet, please run the
                    following SQL commands in your Supabase SQL editor. Once the tables are
                    successfully created, reload this page to connect.
                  </p>

                  <details className="cursor-pointer group">
                    <summary className="text-xs font-bold text-brand-primary hover:underline outline-none">
                      Show SQL Migration Commands
                    </summary>
                    <div className="mt-3 bg-dark-deepblue text-brand-lbg p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-[300px]">
                      <pre>{`-- 1. Create Subjects Table
CREATE TABLE public.subjects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  requires_teacher BOOLEAN DEFAULT TRUE,
  deactivated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Teachers Table
CREATE TABLE public.teachers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Teacher Subjects Table
CREATE TABLE public.map_teacher_subject (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id BIGINT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (teacher_id, subject_id)
);

-- 4. Create Periods Table
CREATE TABLE public.periods (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_number INTEGER NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  start_time TIME,
  end_time TIME,
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Classes Table
CREATE TABLE public.classes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Class Assignments Table
CREATE TABLE public.class_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id BIGINT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (class_id, teacher_id, subject_id)
);

-- 7. Create Timetable Slots Table
CREATE TABLE public.timetable_slots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day VARCHAR(20) NOT NULL,
  period_id BIGINT NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  subject_id BIGINT REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id BIGINT REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (class_id, day, period_id)
);

-- 8. Enforce Conflict Prevention
CREATE UNIQUE INDEX unique_teacher_period ON public.timetable_slots (day, period_id, teacher_id) WHERE teacher_id IS NOT NULL;`}</pre>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        type={confirmConfig?.type}
        confirmText={confirmConfig?.confirmText}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
      <TimetableCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentData={{ classes, teachers, subjects, periods, slots }}
        importedData={compareData}
      />
    </div>
  );
};

export default TimetableManager;
