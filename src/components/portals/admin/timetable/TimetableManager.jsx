// src/components/portals/admin/timetable/TimetableManager.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../../../utils/supabase";
import TimetableScheduler from "./TimetableScheduler";
import TimetableViewer from "./TimetableViewer";
import {
  SubjectsSetup,
  TeachersSetup,
  ClassesSetup,
  PeriodsSetup
} from "./TimetableSetupTabs";

const TIMETABLE_STORAGE_KEY = "jzv_timetable_local_data";

// Helper to generate UUIDs locally when offline
const generateLocalId = () => {
  return "local-" + Math.random().toString(36).substr(2, 9);
};

const DEFAULT_MOCK_SUBJECTS = [
  { id: "sub-1", name: "Mathematics" },
  { id: "sub-2", name: "English Language" },
  { id: "sub-3", name: "Science" },
  { id: "sub-4", name: "Arabic Language" },
  { id: "sub-5", name: "Holy Quran" },
  { id: "sub-6", name: "Islamic Studies" },
  { id: "sub-7", name: "Computer Science" },
];

const DEFAULT_MOCK_TEACHERS = [
  { id: "t-1", name: "Maulana Abdur Rahman", subjects: ["sub-4", "sub-5", "sub-6"], is_male: true },
  { id: "t-2", name: "Ms. Ayesha Siddiqua", subjects: ["sub-2", "sub-6"], is_male: false },
  { id: "t-3", name: "Mr. Mohammed Khan", subjects: ["sub-1", "sub-7"], is_male: true },
  { id: "t-4", name: "Dr. Sarah Fatima", subjects: ["sub-3", "sub-1"], is_male: false },
  { id: "t-5", name: "Maulana Bilal Ahmed", subjects: ["sub-5", "sub-4"], is_male: true },
  { id: "t-6", name: "Mrs. Zainab Patel", subjects: ["sub-2", "sub-3"], is_male: false },
];

const DEFAULT_MOCK_CLASSES = [
  { id: "c-1", name: "Class 1" },
  { id: "c-2", name: "Class 2" },
  { id: "c-3", name: "Class 3" },
  { id: "c-4", name: "Class 4" },
  { id: "c-5", name: "Class 5" },
  { id: "c-6", name: "Class 6" },
  { id: "c-7", name: "Class 7" },
  { id: "c-8", name: "Class 8" },
];

const DEFAULT_MOCK_PERIODS = [
  { id: "p-1", period_number: 1, name: "Period 1", start_time: "08:00", end_time: "08:45", is_break: false },
  { id: "p-2", period_number: 2, name: "Period 2", start_time: "08:45", end_time: "09:30", is_break: false },
  { id: "p-3", period_number: 3, name: "Period 3", start_time: "09:30", end_time: "10:15", is_break: false },
  { id: "p-4", period_number: 4, name: "Period 4", start_time: "10:15", end_time: "11:00", is_break: false },
  { id: "p-5", period_number: 5, name: "Period 5", start_time: "11:00", end_time: "11:45", is_break: false },
  { id: "p-6", period_number: 6, name: "Period 6 (Break)", start_time: "11:45", end_time: "12:30", is_break: true },
  { id: "p-7", period_number: 7, name: "Period 7", start_time: "12:30", end_time: "01:10", is_break: false },
  { id: "p-8", period_number: 8, name: "Period 8", start_time: "01:10", end_time: "01:50", is_break: false },
  { id: "p-9", period_number: 9, name: "Period 9", start_time: "01:50", end_time: "02:30", is_break: false },
  { id: "p-10", period_number: 10, name: "Period 10", start_time: "02:30", end_time: "03:10", is_break: false },
  { id: "p-11", period_number: 11, name: "Period 11", start_time: "03:10", end_time: "03:50", is_break: false },
];

const DEFAULT_MOCK_ASSIGNMENTS = [
  { id: "a-1", class_id: "c-1", teacher_id: "t-1", subject_id: "sub-5" }, // Class 1 - Quran - Maulana Abdur Rahman
  { id: "a-2", class_id: "c-1", teacher_id: "t-3", subject_id: "sub-1" }, // Class 1 - Math - Mr Khan
  { id: "a-3", class_id: "c-2", teacher_id: "t-2", subject_id: "sub-2" }, // Class 2 - English - Ms Ayesha
  { id: "a-4", class_id: "c-2", teacher_id: "t-4", subject_id: "sub-3" }, // Class 2 - Science - Dr Sarah
];

const DEFAULT_MOCK_SLOTS = [
  { id: "s-1", class_id: "c-1", day: "Monday", period_id: "p-1", subject_id: "sub-5", teacher_id: "t-1" },
  { id: "s-2", class_id: "c-1", day: "Monday", period_id: "p-2", subject_id: "sub-1", teacher_id: "t-3" },
  { id: "s-3", class_id: "c-2", day: "Monday", period_id: "p-2", subject_id: "sub-2", teacher_id: "t-2" },
];

const TimetableManager = () => {
  const [activeTab, setActiveTab] = useState("grid"); // "grid" | "view" | "subjects" | "teachers" | "classes" | "periods" | "sync"
  const [selectedClassId, setSelectedClassId] = useState("");
  
  // Timetable State
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [slots, setSlots] = useState([]);

  // Connection State
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dbSetupInstructionOpen, setDbSetupInstructionOpen] = useState(false);

  // JSON Import trigger
  const fileInputRef = React.useRef(null);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // Test if supabase tables are accessible
      const { data: testClass, error: testErr } = await supabase
        .from("classes")
        .select("id")
        .limit(1);

      if (testErr) {
        throw new Error("Supabase tables not found. Falling back to local offline mode.");
      }

      // Fetch from Supabase
      const [
        { data: dbSubjects },
        { data: dbTeachers },
        { data: dbTeacherSubjects },
        { data: dbClasses },
        { data: dbAssignments },
        { data: dbSlots },
        { data: dbPeriods }
      ] = await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("teachers").select("*"),
        supabase.from("teacher_subjects").select("*"),
        supabase.from("classes").select("*"),
        supabase.from("class_assignments").select("*"),
        supabase.from("timetable_slots").select("*"),
        supabase.from("periods").select("*").order("period_number", { ascending: true })
      ]);

      const teachersWithSubjects = (dbTeachers || []).map(t => ({
        ...t,
        subjects: (dbTeacherSubjects || [])
          .filter(ts => String(ts.teacher_id) === String(t.id))
          .map(ts => ts.subject_id)
      }));

      setSubjects(dbSubjects || []);
      setTeachers(teachersWithSubjects);
      setClasses(dbClasses || []);
      setAssignments(dbAssignments || []);
      setSlots(dbSlots || []);

      if (dbPeriods && dbPeriods.length > 0) {
        setPeriods(dbPeriods);
      } else {
        // If Supabase mode is true and dbPeriods is empty, insert default periods
        try {
          const insertPayload = DEFAULT_MOCK_PERIODS.map(p => ({
            period_number: p.period_number,
            name: p.name,
            start_time: p.start_time,
            end_time: p.end_time,
            is_break: p.is_break
          }));
          const { data: insertedPeriods } = await supabase
            .from("periods")
            .insert(insertPayload)
            .select()
            .order("period_number", { ascending: true });
          if (insertedPeriods && insertedPeriods.length > 0) {
            setPeriods(insertedPeriods);
          } else {
            setPeriods(DEFAULT_MOCK_PERIODS);
          }
        } catch (insertErr) {
          console.warn("Failed to auto-populate default periods:", insertErr.message);
          setPeriods(DEFAULT_MOCK_PERIODS);
        }
      }

      if (dbClasses && dbClasses.length > 0) {
        setSelectedClassId(dbClasses[0].id);
      }

      setIsSupabaseMode(true);
    } catch (err) {
      console.warn("Supabase mode not active, loading from LocalStorage:", err.message);
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
        setSubjects(parsed.subjects || []);
        setTeachers(parsed.teachers || []);
        setClasses(parsed.classes || []);
        setPeriods(parsed.periods || DEFAULT_MOCK_PERIODS);
        setAssignments(parsed.assignments || []);
        setSlots(parsed.slots || []);
        if (parsed.classes && parsed.classes.length > 0) {
          setSelectedClassId(parsed.classes[0].id);
        }
      } catch (e) {
        console.error("Failed to parse local timetable data", e);
        initializeMockData();
      }
    } else {
      initializeMockData();
    }
  };

  const initializeMockData = () => {
    setSubjects(DEFAULT_MOCK_SUBJECTS);
    setTeachers(DEFAULT_MOCK_TEACHERS);
    setClasses(DEFAULT_MOCK_CLASSES);
    setPeriods(DEFAULT_MOCK_PERIODS);
    setAssignments(DEFAULT_MOCK_ASSIGNMENTS);
    setSlots(DEFAULT_MOCK_SLOTS);
    setSelectedClassId(DEFAULT_MOCK_CLASSES[0].id);
    
    // Save to local storage
    const state = {
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
    const nextSubjects = updates.subjects !== undefined ? updates.subjects : subjects;
    const nextTeachers = updates.teachers !== undefined ? updates.teachers : teachers;
    const nextClasses = updates.classes !== undefined ? updates.classes : classes;
    const nextPeriods = updates.periods !== undefined ? updates.periods : periods;
    const nextAssignments = updates.assignments !== undefined ? updates.assignments : assignments;
    const nextSlots = updates.slots !== undefined ? updates.slots : slots;

    // Local Storage sync (always update local storage as redundant copy)
    const localState = {
      subjects: nextSubjects,
      teachers: nextTeachers,
      classes: nextClasses,
      periods: nextPeriods,
      assignments: nextAssignments,
      slots: nextSlots
    };
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(localState));

    // Supabase sync if enabled
    if (isSupabaseMode) {
      // In a real database environment, database operations are performed.
      // For safety, let's also let the state updates be synchronous on UI first.
    }

    // Update React State
    if (updates.subjects !== undefined) setSubjects(updates.subjects);
    if (updates.teachers !== undefined) setTeachers(updates.teachers);
    if (updates.classes !== undefined) setClasses(updates.classes);
    if (updates.periods !== undefined) setPeriods(updates.periods);
    if (updates.assignments !== undefined) setAssignments(updates.assignments);
    if (updates.slots !== undefined) setSlots(updates.slots);
  };

  // SUBJECT ACTION HANDLERS
  const handleAddSubject = async (name) => {
    const newSub = { id: generateLocalId(), name };
    let updatedSubjects = [...subjects, newSub];

    if (isSupabaseMode) {
      try {
        const { data, error } = await supabase.from("subjects").insert([{ name }]).select();
        if (error) throw error;
        updatedSubjects = [...subjects, data[0]];
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({ subjects: updatedSubjects });
  };

  const handleUpdateSubject = async (id, name) => {
    const updatedSubjects = subjects.map(s => String(s.id) === String(id) ? { ...s, name } : s);

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        const { error } = await supabase.from("subjects").update({ name }).eq("id", id);
        if (error) throw error;
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({ subjects: updatedSubjects });
  };

  const handleDeleteSubject = async (id) => {
    const updatedSubjects = subjects.filter(s => String(s.id) !== String(id));
    const updatedAssignments = assignments.filter(a => String(a.subject_id) !== String(id));
    const updatedSlots = slots.filter(s => String(s.subject_id) !== String(id));

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        await supabase.from("subjects").delete().eq("id", id);
      } catch (err) {
        console.error(err);
      }
    }
    saveState({
      subjects: updatedSubjects,
      assignments: updatedAssignments,
      slots: updatedSlots
    });
  };

  // TEACHER ACTION HANDLERS
  const handleAddTeacher = async (name, qualifiedSubjects, isMale = true) => {
    const newTeacher = { id: generateLocalId(), name, subjects: qualifiedSubjects, is_male: isMale };
    let updatedTeachers = [...teachers, newTeacher];

    if (isSupabaseMode) {
      try {
        // 1. Insert into teachers
        const { data: teacherData, error: teacherErr } = await supabase
          .from("teachers")
          .insert([{ name, is_male: isMale }])
          .select();
        
        if (teacherErr) throw teacherErr;
        const insertedTeacher = teacherData[0];

        // 2. Insert qualified subjects into teacher_subjects
        if (qualifiedSubjects.length > 0) {
          const relationPayload = qualifiedSubjects.map(subId => ({
            teacher_id: insertedTeacher.id,
            subject_id: subId
          }));
          const { error: relErr } = await supabase
            .from("teacher_subjects")
            .insert(relationPayload);
          if (relErr) throw relErr;
        }

        updatedTeachers = [...teachers, { ...insertedTeacher, subjects: qualifiedSubjects }];
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({ teachers: updatedTeachers });
  };

  const handleUpdateTeacher = async (id, name, qualifiedSubjects, isMale = true) => {
    const updatedTeachers = teachers.map(t => String(t.id) === String(id) ? { ...t, name, subjects: qualifiedSubjects, is_male: isMale } : t);

    // Also verify currently assigned classes/slots for this teacher
    // If a subject is removed from the teacher's qualifications, clear those assignments/slots
    const updatedAssignments = assignments.filter(a => {
      if (String(a.teacher_id) === String(id) && !qualifiedSubjects.some(sid => String(sid) === String(a.subject_id))) {
        return false;
      }
      return true;
    });

    const updatedSlots = slots.map(s => {
      if (String(s.teacher_id) === String(id) && s.subject_id && !qualifiedSubjects.some(sid => String(sid) === String(s.subject_id))) {
        return { ...s, subject_id: null, teacher_id: null };
      }
      return s;
    });

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        // 1. Update teachers table
        const { error: teacherErr } = await supabase
          .from("teachers")
          .update({ name, is_male: isMale })
          .eq("id", id);
        if (teacherErr) throw teacherErr;

        // 2. Delete existing relations
        const { error: delErr } = await supabase
          .from("teacher_subjects")
          .delete()
          .eq("teacher_id", id);
        if (delErr) throw delErr;

        // 3. Insert new relations
        if (qualifiedSubjects.length > 0) {
          const relationPayload = qualifiedSubjects.map(subId => ({
            teacher_id: id,
            subject_id: subId
          }));
          const { error: insErr } = await supabase
            .from("teacher_subjects")
            .insert(relationPayload);
          if (insErr) throw insErr;
        }
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({
      teachers: updatedTeachers,
      assignments: updatedAssignments,
      slots: updatedSlots
    });
  };

  const handleDeleteTeacher = async (id) => {
    const updatedTeachers = teachers.filter(t => String(t.id) !== String(id));
    const updatedAssignments = assignments.filter(a => String(a.teacher_id) !== String(id));
    const updatedSlots = slots.filter(s => String(s.teacher_id) !== String(id));

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        await supabase.from("teachers").delete().eq("id", id);
      } catch (err) {
        console.error(err);
      }
    }
    saveState({
      teachers: updatedTeachers,
      assignments: updatedAssignments,
      slots: updatedSlots
    });
  };

  // CLASS ACTION HANDLERS
  const handleAddClass = async (name) => {
    const newClass = { id: generateLocalId(), name };
    let updatedClasses = [...classes, newClass];

    if (isSupabaseMode) {
      try {
        const { data, error } = await supabase.from("classes").insert([{ name }]).select();
        if (error) throw error;
        updatedClasses = [...classes, data[0]];
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({ classes: updatedClasses });
    setSelectedClassId(newClass.id);
  };

  const handleUpdateClass = async (id, name) => {
    const updatedClasses = classes.map(c => String(c.id) === String(id) ? { ...c, name } : c);

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        const { error } = await supabase.from("classes").update({ name }).eq("id", id);
        if (error) throw error;
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({ classes: updatedClasses });
  };

  const handleDeleteClass = async (id) => {
    const updatedClasses = classes.filter(c => String(c.id) !== String(id));
    const updatedAssignments = assignments.filter(a => String(a.class_id) !== String(id));
    const updatedSlots = slots.filter(s => String(s.class_id) !== String(id));

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        await supabase.from("classes").delete().eq("id", id);
      } catch (err) {
        console.error(err);
      }
    }
    saveState({
      classes: updatedClasses,
      assignments: updatedAssignments,
      slots: updatedSlots
    });
  };

  // CLASS ASSIGNMENT HANDLERS
  const handleAddAssignment = async (classId, teacherId, subjectId) => {
    // Check if assignment already exists
    const exists = assignments.some(
      a => String(a.class_id) === String(classId) && String(a.teacher_id) === String(teacherId) && String(a.subject_id) === String(subjectId)
    );
    if (exists) return;

    const newAss = { id: generateLocalId(), class_id: classId, teacher_id: teacherId, subject_id: subjectId };
    let updatedAssignments = [...assignments, newAss];

    if (isSupabaseMode && !classId.toString().startsWith("local-") && !teacherId.toString().startsWith("local-") && !subjectId.toString().startsWith("local-")) {
      try {
        const { data, error } = await supabase
          .from("class_assignments")
          .insert([{ class_id: classId, teacher_id: teacherId, subject_id: subjectId }])
          .select();
        if (error) throw error;
        updatedAssignments = [...assignments, data[0]];
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }
    saveState({ assignments: updatedAssignments });
  };

  const handleRemoveAssignment = async (id) => {
    const ass = assignments.find(a => String(a.id) === String(id));
    if (!ass) return;

    const updatedAssignments = assignments.filter(a => String(a.id) !== String(id));
    // Set scheduled slots with this mapping to Free Period
    const updatedSlots = slots.map(s => {
      if (String(s.class_id) === String(ass.class_id) && String(s.subject_id) === String(ass.subject_id) && String(s.teacher_id) === String(ass.teacher_id)) {
        return { ...s, subject_id: null, teacher_id: null };
      }
      return s;
    });

    if (isSupabaseMode && !id.toString().startsWith("local-")) {
      try {
        await supabase.from("class_assignments").delete().eq("id", id);
      } catch (err) {
        console.error(err);
      }
    }
    saveState({ assignments: updatedAssignments, slots: updatedSlots });
  };

  // PERIOD CONFIGURATION HANDLER
  const handleSavePeriods = async (configuredPeriods) => {
    let finalPeriods = [...configuredPeriods];
    let updatedSlots = [...slots];
    const maxPeriod = finalPeriods.length;

    if (isSupabaseMode) {
      try {
        // 1. Fetch current database periods
        const { data: existingPeriods } = await supabase.from("periods").select("*");

        // 2. Delete periods exceeding the new count
        await supabase.from("periods").delete().gt("period_number", maxPeriod);

        // 3. Upsert/update the remaining periods
        for (const period of finalPeriods) {
          const exists = existingPeriods?.find(p => p.period_number === period.period_number);
          if (exists) {
            await supabase.from("periods").update({
              name: period.name || `Period ${period.period_number}`,
              start_time: period.start_time || null,
              end_time: period.end_time || null,
              is_break: period.is_break || false
            }).eq("id", exists.id);
          } else {
            await supabase.from("periods").insert([{
              period_number: period.period_number,
              name: period.name || `Period ${period.period_number}`,
              start_time: period.start_time || null,
              end_time: period.end_time || null,
              is_break: period.is_break || false
            }]);
          }
        }

        // 4. Reload periods from database to get correct IDs
        const { data: updatedDbPeriods } = await supabase
          .from("periods")
          .select("*")
          .order("period_number", { ascending: true });
        
        finalPeriods = updatedDbPeriods || [];
      } catch (err) {
        alert("DB Error: " + err.message);
        return;
      }
    }

    // Filter local slots to only keep ones belonging to remaining periods
    const remainingIds = finalPeriods.map(p => p.id);
    updatedSlots = updatedSlots.filter(s => remainingIds.includes(s.period_id));

    saveState({ periods: finalPeriods, slots: updatedSlots });
  };

  // SLOT ASSIGNMENT HANDLER (THE CORE SCHEDULING CALCULATION)
  const handleUpdateSlot = async (classId, dayOrDays, periodId, subjectId, teacherId) => {
    const targetDays = Array.isArray(dayOrDays) ? dayOrDays : [dayOrDays];
    let updatedSlots = [...slots];

    // Local state updates first
    for (const day of targetDays) {
      const existingIndex = updatedSlots.findIndex(
        s => String(s.class_id) === String(classId) && s.day === day && String(s.period_id) === String(periodId)
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
          teacher_id: teacherId
        };
        if (existingIndex > -1) {
          updatedSlots[existingIndex] = { ...updatedSlots[existingIndex], ...newSlotVal };
        } else {
          updatedSlots.push({ id: generateLocalId(), ...newSlotVal });
        }
      }
    }

    // Supabase DB Sync
    if (isSupabaseMode && !String(classId).startsWith("local-")) {
      try {
        if (subjectId === null && teacherId === null) {
          // Batch delete from db
          const { error } = await supabase
            .from("timetable_slots")
            .delete()
            .eq("class_id", classId)
            .eq("period_id", periodId)
            .in("day", targetDays);
          if (error) throw error;
        } else {
          // Batch upsert to db
          const upsertPayload = targetDays.map(day => ({
            class_id: classId,
            day,
            period_id: periodId,
            subject_id: subjectId,
            teacher_id: teacherId
          }));

          const { data, error } = await supabase
            .from("timetable_slots")
            .upsert(upsertPayload, { onConflict: "class_id,day,period_id" })
            .select();
          if (error) throw error;

          // Replace local slots with returned DB slots to have real IDs
          if (data && data.length > 0) {
            data.forEach(dbSlot => {
              const idx = updatedSlots.findIndex(
                s => String(s.class_id) === String(dbSlot.class_id) && s.day === dbSlot.day && String(s.period_id) === String(dbSlot.period_id)
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
        alert("DB Error: " + err.message);
        return;
      }
    }

    saveState({ slots: updatedSlots });
  };

  // JSON EXPORT HANDLER
  const handleExportJson = () => {
    const backupData = {
      version: "2.0",
      school: "Jamia Zaytoonah Vellore",
      exportedAt: new Date().toISOString(),
      subjects,
      teachers,
      classes,
      periods,
      assignments,
      slots
    };

    const str = JSON.stringify(backupData, null, 2);
    const blob = new Blob([str], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `jzv-timetable-finalized-${new Date().toISOString().slice(0,10)}.json`;
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
          throw new Error("Invalid file format. Missing core timetable arrays.");
        }

        if (window.confirm("Importing this file will overwrite your current timetable configuration. Proceed?")) {
          
          if (isSupabaseMode) {
            // Overwrite database
            setLoading(true);
            try {
              // Delete everything
              await Promise.all([
                supabase.from("timetable_slots").delete().gt("id", 0),
                supabase.from("class_assignments").delete().gt("id", 0),
                supabase.from("teacher_subjects").delete().gt("id", 0),
                supabase.from("teachers").delete().gt("id", 0),
                supabase.from("classes").delete().gt("id", 0),
                supabase.from("subjects").delete().gt("id", 0),
                supabase.from("periods").delete().gt("id", 0),
              ]);

              // Write imported data
              // We'll write to state and let the user do updates. Because write all could trigger RLS/foreign key conflicts depending on ids,
              // for best reliability we import it as the local state and sync it.
              // Note: If they import, it updates their local storage immediately and populates state.
            } catch (err) {
              console.warn("DB reset failed during import: ", err.message);
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
            slots: parsed.slots
          });

          if (parsed.classes.length > 0) {
            setSelectedClassId(parsed.classes[0].id);
          }

          alert("Timetable imported successfully!");
        }
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = "";
  };

  const getCompletionPercentage = (classId) => {
    const nonBreakPeriods = periods.filter(p => !p.is_break);
    const totalSlots = 6 * nonBreakPeriods.length;
    if (totalSlots === 0) return 0;
    const nonBreakPeriodIds = nonBreakPeriods.map(p => String(p.id));
    const assignedSlots = slots.filter(
      s => String(s.class_id) === String(classId) && s.subject_id && nonBreakPeriodIds.includes(String(s.period_id))
    ).length;
    return Math.round((assignedSlots / totalSlots) * 100);
  };

  return (
    <div className="flex flex-col min-h-[500px]">
      
      {/* Top Banner Control Panel */}
      <div className="bg-light-lbg/60 border border-light-border p-2 sm:p-6 mb-6 flex flex-col gap-2">
        {/* Title & Actions Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-dark-primary flex items-center gap-2">
              <i className="fas fa-calendar-alt text-brand-primary"></i>
              School Timetable Planner
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSupabaseMode ? "bg-green-100 text-green-dark" : "bg-orange-100 text-orange-dark"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseMode ? "bg-green-bright" : "bg-orange-primary"}`}></span>
                {isSupabaseMode ? "Supabase Connected" : "Local Offline Mode (LocalStorage)"}
              </span>
              <button
                onClick={() => setActiveTab("sync")}
                className="text-[10px] text-brand-primary font-bold hover:underline"
              >
                Configure Database
              </button>
            </div>
            </h2>
          </div>

          {/* Export / Import backup */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleExportJson}
              className="flex-1 md:flex-none bg-brand-primary hover:bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all"
              title="Download full timetable configuration in JSON format"
            >
              <i className="fas fa-file-download"></i> Finalize & Export JSON
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
              className="flex-1 md:flex-none bg-white hover:bg-light-ui border border-light-border text-dark-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              title="Upload/restore timetable config from a JSON file"
            >
              <i className="fas fa-file-upload"></i> Import JSON
            </button>
          </div>
        </div>

        {/* Workspace Tabs (Inside the Top Banner Card) */}
        <div className="flex border-b border-light-border overflow-x-auto scrollbar-hide gap-1 pt-2">
          {[
            { id: "grid", label: "Scheduler Grid", icon: "fa-th-large" },
            { id: "view", label: "Preview & Print", icon: "fa-eye" },
            { id: "classes", label: "Classes Setup", icon: "fa-school" },
            { id: "teachers", label: "Teachers Setup", icon: "fa-chalkboard-teacher" },
            { id: "subjects", label: "Subjects Setup", icon: "fa-book" },
            { id: "periods", label: "Periods Setup", icon: "fa-clock" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap pb-3 -mb-[2px] ${
                activeTab === tab.id
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-white-50 hover:text-dark-primary hover:border-light-border"
              }`}
            >
              <i className={`fas ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1">
          {activeTab === "grid" && (
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Classes Sidebar */}
              <div className="w-full lg:w-60 lg:shrink-0 space-y-3">
                <div className="bg-light-lbg px-4 py-3 rounded-xl border border-light-border text-xs font-bold text-dark-primary uppercase tracking-wider">
                  Select Class
                </div>
                <div className="space-y-2 max-h-[300px] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  {classes.length === 0 ? (
                    <p className="text-xs text-dark-muted italic p-2">No classes found. Set up classes first.</p>
                  ) : (
                    classes.map((cls) => {
                      const pct = getCompletionPercentage(cls.id);
                      return (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group ${
                            selectedClassId === cls.id
                              ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-lbg"
                              : "bg-white border-light-border hover:border-brand-soft text-dark-primary hover:bg-light-bg/30"
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-extrabold text-sm block">{cls.name}</span>
                            <span className={`text-[10px] block mt-0.5 font-semibold ${
                              selectedClassId === cls.id ? "text-brand-lbg" : "text-dark-soft"
                            }`}>
                              Schedule completed
                            </span>
                          </div>

                          {/* Completion Badge */}
                          <div className="flex items-center gap-2">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                              {/* Simple CSS Circular Progress */}
                              <svg className="w-8 h-8 transform -rotate-90">
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="12"
                                  className="stroke-current"
                                  strokeWidth="3"
                                  fill="transparent"
                                  style={{ color: selectedClassId === cls.id ? "rgba(255,255,255,0.2)" : "#EAEAEA" }}
                                />
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="12"
                                  className="stroke-current transition-all duration-500"
                                  strokeWidth="3"
                                  fill="transparent"
                                  strokeDasharray={2 * Math.PI * 12}
                                  strokeDashoffset={2 * Math.PI * 12 * (1 - pct / 100)}
                                  style={{ color: selectedClassId === cls.id ? "#FFFFFF" : "#6C3483" }}
                                />
                              </svg>
                              <span className="absolute text-[8px] font-extrabold">{pct}%</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Main Scheduler Board */}
              <div className="flex-1 min-w-0">
                <TimetableScheduler
                  classId={selectedClassId}
                  classes={classes}
                  teachers={teachers}
                  subjects={subjects}
                  periods={periods}
                  slots={slots}
                  assignments={assignments}
                  onUpdateSlot={handleUpdateSlot}
                />
              </div>
            </div>
          )}

          {activeTab === "view" && (
            <TimetableViewer
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              periods={periods}
              slots={slots}
            />
          )}

          {activeTab === "subjects" && (
            <SubjectsSetup
              subjects={subjects}
              onAddSubject={handleAddSubject}
              onUpdateSubject={handleUpdateSubject}
              onDeleteSubject={handleDeleteSubject}
              slots={slots}
              assignments={assignments}
            />
          )}

          {activeTab === "teachers" && (
            <TeachersSetup
              teachers={teachers}
              subjects={subjects}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              slots={slots}
              assignments={assignments}
            />
          )}

          {activeTab === "classes" && (
            <ClassesSetup
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              assignments={assignments}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
              onAddAssignment={handleAddAssignment}
              onRemoveAssignment={handleRemoveAssignment}
              slots={slots}
            />
          )}

          {activeTab === "periods" && (
            <PeriodsSetup
              periods={periods}
              onSavePeriods={handleSavePeriods}
              slots={slots}
            />
          )}

          {activeTab === "sync" && (
            <div className="bg-white border border-light-border p-6 sm:p-8 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-dark-deepblue mb-1">
                  Database Integration Settings
                </h3>
                <p className="text-xs text-dark-soft">
                  Enable cloud database synchronization via Supabase for multi-user access and secure backups.
                </p>
              </div>

              <div className="border border-light-border p-5 rounded-2xl bg-light-lbg/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full animate-pulse ${
                    isSupabaseMode ? "bg-green-bright" : "bg-orange-primary"
                  }`} />
                  <div>
                    <span className="text-xs text-dark-soft font-bold block">Current Sync Mode</span>
                    <span className="text-sm font-extrabold text-dark-deepblue">
                      {isSupabaseMode ? "Supabase Live Database" : "Offline (Local Browser Storage)"}
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
                    If you haven't set up the timetable tables in Supabase yet, please run the following SQL commands in your Supabase SQL editor. Once the tables are successfully created, reload this page to connect.
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Teachers Table
CREATE TABLE public.teachers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Teacher Subjects Table
CREATE TABLE public.teacher_subjects (
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
    </div>
  );
};

export default TimetableManager;
