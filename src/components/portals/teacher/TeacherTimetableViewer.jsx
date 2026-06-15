// src/components/portals/teacher/TeacherTimetableViewer.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import TimetableViewer from "../admin/timetable/TimetableViewer";

const TIMETABLE_STORAGE_KEY = "jzv_timetable_local_data";

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

const TeacherTimetableViewer = () => {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTimetableData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      // Test if supabase tables exist
      const { data: testClass, error: testErr } = await supabase
        .from("classes")
        .select("id")
        .limit(1);

      if (testErr) {
        throw new Error("Supabase tables not found. Loading local data.");
      }

      // Fetch from Supabase
      const [
        { data: dbSubjects },
        { data: dbTeachers },
        { data: dbTeacherSubjects },
        { data: dbClasses },
        { data: dbSlots },
        { data: dbPeriods }
      ] = await Promise.all([
        supabase.from("subjects").select("*"),
        supabase.from("teachers").select("*"),
        supabase.from("teacher_subjects").select("*"),
        supabase.from("classes").select("*"),
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
      setSlots(dbSlots || []);

      if (dbPeriods && dbPeriods.length > 0) {
        setPeriods(dbPeriods);
      } else {
        setPeriods(DEFAULT_MOCK_PERIODS);
      }

    } catch (err) {
      console.warn("Falling back to local storage for teacher view:", err.message);
      
      // Load from LocalStorage
      const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSubjects(parsed.subjects || []);
          setTeachers(parsed.teachers || []);
          setClasses(parsed.classes || []);
          setPeriods(parsed.periods || DEFAULT_MOCK_PERIODS);
          setSlots(parsed.slots || []);
        } catch (e) {
          console.error("Failed to parse local storage in teacher view", e);
        }
      }
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
    <TimetableViewer
      classes={classes}
      teachers={teachers}
      subjects={subjects}
      periods={periods}
      slots={slots}
      onRefresh={() => fetchTimetableData(false)}
      refreshing={refreshing}
    />
  );
};

export default TeacherTimetableViewer;
