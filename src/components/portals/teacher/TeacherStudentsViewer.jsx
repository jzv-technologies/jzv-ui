// src/components/portals/teacher/TeacherStudentsViewer.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import DataGrid from "../../DataGrid";
import DetailModal from "../../DetailModal";

const STUDENTS_STORAGE_KEY = "jzv_students_local_data";
const TIMETABLE_STORAGE_KEY = "jzv_timetable_local_data";

const DEFAULT_MOCK_STUDENTS = [
  {
    id: 1,
    admission_no: "101",
    edsoft_id: "ED-10001",
    student_name: "Zayd Ahmed",
    birth_date: "2015-05-12",
    age: 11,
    gender: "Male",
    father_name: "Abdur Rahman",
    class_id: "c-1",
    mobile1: "9876543210",
    mobile2: "9876543220",
    enrollment: "Active",
    hostel: "Yes",
    transport_point: "Point A",
  },
  {
    id: 2,
    admission_no: "102",
    edsoft_id: "ED-10002",
    student_name: "Fatima Patel",
    birth_date: "2016-08-20",
    age: 9,
    gender: "Female",
    father_name: "Imran Patel",
    class_id: "c-2",
    mobile1: "9876543211",
    mobile2: "",
    enrollment: "Active",
    hostel: "No",
    transport_point: "Point B",
  },
  {
    id: 3,
    admission_no: "103",
    edsoft_id: "ED-10003",
    student_name: "Mohammed Siddique",
    birth_date: "2015-11-05",
    age: 10,
    gender: "Male",
    father_name: "Yusuf Siddique",
    class_id: "c-3",
    mobile1: "9876543212",
    mobile2: "",
    enrollment: "Active",
    hostel: "No",
    transport_point: "",
  },
];

const TeacherStudentsViewer = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const getCurrentRecordState = () => {
    if (!selectedRecord)
      return { current: 0, total: 0, hasPrev: false, hasNext: false };
    const currentIndex = submissions.findIndex(
      (r) => r.id === selectedRecord.id,
    );
    return {
      current: currentIndex,
      total: submissions.length,
      hasPrev: currentIndex > 0,
      hasNext: currentIndex < submissions.length - 1,
    };
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
  };

  const handlePrevRecord = () => {
    const { hasPrev, current } = getCurrentRecordState();
    if (hasPrev) {
      handleRowClick(submissions[current - 1]);
    }
  };

  const handleNextRecord = () => {
    const { hasNext, current } = getCurrentRecordState();
    if (hasNext) {
      handleRowClick(submissions[current + 1]);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    setSubmissions([]);

    // 1. Fetch classes
    let loadedClasses = [];
    try {
      const { data: dbCls } = await supabase.from("classes").select("*");
      if (dbCls) {
        loadedClasses = dbCls;
      }
    } catch (e) {
      console.warn("Failed to load classes in TeacherStudentsViewer:", e);
    }
    if (loadedClasses.length === 0) {
      try {
        const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          loadedClasses = parsed.classes || [];
        }
      } catch (e) {
        console.error("Failed to parse local classes in TeacherStudentsViewer:", e);
      }
    }

    // 2. Fetch students
    try {
      const { data, error: dbErr } = await supabase.from("students").select("*");
      if (dbErr) throw dbErr;

      // Filter and map fields only visible to teachers
      const formatted = (data || []).map((s) => {
        const cls = loadedClasses.find((c) => String(c.id) === String(s.class_id));
        return {
          id: s.id,
          "Admission No": s.admission_no || "",
          "Student Name": s.student_name || "",
          "Class": cls ? cls.name : "Unassigned",
          "Father Name": s.father_name || "",
          "Birth Date": s.birth_date || "",
          "Age": s.age || "",
          "Hostel": s.hostel || "No",
          "Transport Point": s.transport_point || "",
        };
      });
      setSubmissions(formatted);
    } catch (err) {
      console.warn("Supabase student fetch failed, falling back to LocalStorage in Teacher view:", err.message);
      const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
      let localStds = [];
      if (raw) {
        try {
          localStds = JSON.parse(raw) || [];
        } catch (e) {
          console.error(e);
        }
      } else {
        localStds = DEFAULT_MOCK_STUDENTS;
      }

      // Filter and map fields only visible to teachers
      const formatted = localStds.map((s) => {
        const cls = loadedClasses.find((c) => String(c.id) === String(s.class_id));
        return {
          id: s.id,
          "Admission No": s.admission_no || "",
          "Student Name": s.student_name || "",
          "Class": cls ? cls.name : "Unassigned",
          "Father Name": s.father_name || "",
          "Birth Date": s.birth_date || "",
          "Age": s.age || "",
          "Hostel": s.hostel || "No",
          "Transport Point": s.transport_point || "",
        };
      });
      setSubmissions(formatted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const { current, total, hasPrev, hasNext } = getCurrentRecordState();

  return (
    <div className="flex flex-col min-h-[500px]">
      <div className="bg-light-lbg border border-light-border p-4 sm:p-6 mb-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-dark-primary flex items-center gap-2">
            <i className="fas fa-graduation-cap text-emerald-600"></i>
            Student Records
          </h2>
          <p className="text-xs sm:text-sm text-dark-soft mt-1">
            Browse student directory details. Sensitive contact and admission system IDs are hidden.
          </p>
        </div>
        <button
          onClick={fetchStudents}
          className="bg-light-bg hover:bg-light-ui border border-light-border px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all"
        >
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div className="flex-1 bg-white border border-light-border rounded-2xl overflow-hidden shadow-sm">
        <DataGrid
          data={submissions}
          loading={loading}
          error={error}
          onRetry={fetchStudents}
          onRowClick={handleRowClick}
          excludeColumns={["id"]}
        />
      </div>

      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSave={null}
          onPrevRecord={handlePrevRecord}
          onNextRecord={handleNextRecord}
          hasPrevRecord={hasPrev}
          hasNextRecord={hasNext}
          currentRecordIndex={current}
          totalRecords={total}
          title="Student Profile Details"
          excludeFields={["id"]}
          editableFields={null}
        />
      )}
    </div>
  );
};

export default TeacherStudentsViewer;
