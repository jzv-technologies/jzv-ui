import React, { useState, useEffect } from "react";
import RolePortal from "./RolePortal";
import { showToast } from "../../utils/toast";
import { calculateAge } from "../../utils/dateUtils";
import DynamicForm from "../DynamicForm";
import DataGrid from "../DataGrid";
import DetailModal from "../DetailModal";
import { supabase } from "../../utils/supabase";
import { MOCK_STUDENTS as DEFAULT_MOCK_STUDENTS } from "../../data/mockStudents";
import TimetableAdminView from "./admin/timetable/TimetableAdminView";
import SyllabusProgressReport from "./admin/syllabus/SyllabusProgressReport";
import SyllabusManager from "./admin/syllabus/SyllabusManager";
import { CARD_THEMES } from "../../utils/cardTheme";
import {
  TIMETABLE_STORAGE_KEY,
  MOCK_SUBJECTS as DEFAULT_MOCK_SUBJECTS,
  MOCK_TEACHERS as DEFAULT_MOCK_TEACHERS,
  MOCK_CLASSES as DEFAULT_MOCK_CLASSES,
  MOCK_PERIODS as DEFAULT_MOCK_PERIODS,
  MOCK_SLOTS as DEFAULT_MOCK_SLOTS,
} from "../../data/mockTimetable";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const ManagementPortal = ({ user, fullName, userRoles, subView, onSetSubView, openModal }) => {
  const [submissions, setSubmissions] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dynamicConfigs, setDynamicConfigs] = useState([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from("dynamic_form_configs")
          .select("*");
        if (!error && data) {
          setDynamicConfigs(data);
        }
      } catch (err) {
        console.error("Failed to load configs in ManagementPortal:", err);
      }
    };
    fetchConfigs();
  }, []);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("Open");
  const [editComments, setEditComments] = useState("");
  const [editResolution, setEditResolution] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [personOptions, setPersonOptions] = useState([]);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    const fetchPersonOptions = async () => {
      try {
        const [teachersRes, usersRes] = await Promise.all([
          supabase.from("teachers").select("name"),
          supabase.from("admin_users_view").select("full_name"),
        ]);
        const namesMap = new Map();
        if (teachersRes.data) {
          teachersRes.data.forEach((t) => {
            if (t.name) {
              const trimmed = t.name.trim();
              if (trimmed) {
                namesMap.set(trimmed.toLowerCase(), trimmed);
              }
            }
          });
        }
        if (usersRes.data) {
          usersRes.data.forEach((u) => {
            if (u.full_name) {
              const trimmed = u.full_name.trim();
              if (trimmed && !namesMap.has(trimmed.toLowerCase())) {
                namesMap.set(trimmed.toLowerCase(), trimmed);
              }
            }
          });
        }
        setPersonOptions(Array.from(namesMap.values()).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.warn("Failed to fetch person list:", err);
      }
    };
    fetchPersonOptions();
  }, []);

  // Timetable state (read-only for management)
  const [ttSubjects, setTtSubjects] = useState([]);
  const [ttTeachers, setTtTeachers] = useState([]);
  const [ttClasses, setTtClasses] = useState([]);
  const [ttPeriods, setTtPeriods] = useState([]);
  const [ttAssignments, setTtAssignments] = useState([]);
  const [ttSlots, setTtSlots] = useState([]);
  const [ttLoading, setTtLoading] = useState(false);

  // UUID mapping
  const uuidMap = {
    resumes: "career",
    complaints: "complaint",
  };

  // ── Timetable data fetch (read-only) ─────────────────────────────────────
  const fetchTimetableData = async () => {
    setTtLoading(true);
    try {
      const { data: testClass, error: testErr } = await supabase
        .from('classes')
        .select('id')
        .limit(1);

      if (testErr) throw new Error('Supabase not available');

      const [
        { data: dbSubjects },
        { data: dbTeachers },
        { data: dbTeacherSubjects },
        { data: dbClasses },
        { data: dbAssignments },
        { data: dbSlots },
        { data: dbPeriods },
      ] = await Promise.all([
        supabase.from('subjects').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('teacher_subjects').select('*'),
        supabase.from('classes').select('*'),
        supabase.from('class_assignments').select('*'),
        supabase.from('timetable_slots').select('*'),
        supabase.from('periods').select('*').order('period_number', { ascending: true }),
      ]);

      const teachersWithSubjects = (dbTeachers || []).map((t) => ({
        ...t,
        subjects: (dbTeacherSubjects || [])
          .filter((ts) => String(ts.teacher_id) === String(t.id))
          .map((ts) => ts.subject_id),
      }));

      setTtSubjects(dbSubjects || []);
      setTtTeachers(teachersWithSubjects);
      setTtClasses(dbClasses || []);
      setTtAssignments(dbAssignments || []);
      setTtSlots(dbSlots || []);
      setTtPeriods(dbPeriods && dbPeriods.length > 0 ? dbPeriods : DEFAULT_MOCK_PERIODS);
    } catch (err) {
      // Fallback to localStorage / mock data
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
        } catch (e) {
          setTtSubjects(DEFAULT_MOCK_SUBJECTS);
          setTtTeachers(DEFAULT_MOCK_TEACHERS);
          setTtClasses(DEFAULT_MOCK_CLASSES);
          setTtPeriods(DEFAULT_MOCK_PERIODS);
          setTtAssignments([]);
          setTtSlots(DEFAULT_MOCK_SLOTS);
        }
      } else {
        setTtSubjects(DEFAULT_MOCK_SUBJECTS);
        setTtTeachers(DEFAULT_MOCK_TEACHERS);
        setTtClasses(DEFAULT_MOCK_CLASSES);
        setTtPeriods(DEFAULT_MOCK_PERIODS);
        setTtAssignments([]);
        setTtSlots(DEFAULT_MOCK_SLOTS);
      }
    } finally {
      setTtLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    setSubmissions([]);
    
    // 1. Fetch classes first
    let loadedClasses = [];
    try {
      const { data: dbCls } = await supabase.from("classes").select("*");
      if (dbCls) {
        loadedClasses = dbCls;
      }
    } catch (e) {
      console.warn("Failed to load classes in ManagementPortal:", e);
    }
    if (loadedClasses.length === 0) {
      try {
        const raw = localStorage.getItem("jzv_timetable_local_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          loadedClasses = parsed.classes || [];
        }
      } catch (e) {
        console.error("Failed to parse local classes in ManagementPortal:", e);
      }
    }

    // 2. Fetch students
    try {
      const { data, error: dbErr } = await supabase.from("students").select("*");
      if (dbErr) throw dbErr;

      const formatted = (data || []).map((s) => {
        const cls = loadedClasses.find((c) => String(c.id) === String(s.class_id));
        return {
          id: s.id,
          "Admission No": s.admission_no || "",
          "Edsoft ID": s.edsoft_id || "",
          "Student Name": s.student_name || "",
          "Class": cls ? cls.name : "Unassigned",
          "Father Name": s.father_name || "",
          "Birth Date": s.birth_date || "",
          "Age": calculateAge(s.birth_date),
          "Mobile 1": s.mobile1 || "",
          "Mobile 2": s.mobile2 || "",
          "Enrollment": s.enrollment || "Active",
          "Hostel": s.hostel || "No",
          "Transport Point": s.transport_point || "",
        };
      });
      setSubmissions(formatted);
    } catch (err) {
      console.warn("Supabase student fetch failed, falling back to LocalStorage in Management:", err.message);
      const raw = localStorage.getItem("jzv_students_local_data");
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
      
      const formatted = localStds.map((s) => {
        const cls = loadedClasses.find((c) => String(c.id) === String(s.class_id));
        return {
          id: s.id,
          "Admission No": s.admission_no || "",
          "Edsoft ID": s.edsoft_id || "",
          "Student Name": s.student_name || "",
          "Class": cls ? cls.name : "Unassigned",
          "Father Name": s.father_name || "",
          "Birth Date": s.birth_date || "",
          "Age": calculateAge(s.birth_date),
          "Mobile 1": s.mobile1 || "",
          "Mobile 2": s.mobile2 || "",
          "Enrollment": s.enrollment || "Active",
          "Hostel": s.hostel || "No",
          "Transport Point": s.transport_point || "",
        };
      });
      setSubmissions(formatted);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (uuid) => {
    setLoading(true);
    setError("");
    setSubmissions([]);
    setFormFields([]);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=search`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "search",
          uuid: uuid,
          criteria: {},
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSubmissions(result.data || []);
      } else {
        throw new Error(result.error || "Failed to fetch submissions");
      }

      // Fetch dynamic form configs to get display permissions
      const { data: configData, error: configError } = await supabase
        .from("dynamic_form_configs")
        .select("fields")
        .eq("form_name", uuid);
      if (!configError && configData && configData.length > 0) {
        const fieldsField = configData[0].fields;
        const parsedFields = typeof fieldsField === "string" ? JSON.parse(fieldsField) : fieldsField;
        setFormFields(parsedFields || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load submissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getExcludedGridColumns = () => {
    const baseExcludes = ["uuid"];
    if (subView === "students") return baseExcludes;
    formFields.forEach((field) => {
      const fieldName = field["Field Name"]?.trim();
      if (fieldName) {
        const displayIn = field["Screen"];
        if (displayIn !== undefined && displayIn !== null && displayIn !== "") {
          const options = String(displayIn).split(",").map(s => s.trim().toLowerCase());
          if (options.length > 0 && !options.includes("data grid")) {
            baseExcludes.push(fieldName);
            return;
          }
        }
        const visibility = field["Field Visibility"];
        if (visibility !== undefined && visibility !== null && visibility !== "") {
          const allowed = String(visibility).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
          if (allowed.length > 0) {
            let hasAccess = false;
            if (allowed.includes("all")) {
              hasAccess = true;
            } else if (allowed.includes("none")) {
              hasAccess = false;
            } else {
              const userRolesLower = (userRoles || []).map(r => r.toLowerCase());
              hasAccess = userRolesLower.some(r => allowed.includes(r)) || allowed.includes("reviewer");
            }
            if (!hasAccess) {
              baseExcludes.push(fieldName);
            }
          }
        }
      }
    });
    return baseExcludes;
  };

  const getExcludedDetailFields = () => {
    const baseExcludes = ["uuid"];
    if (subView === "students") return baseExcludes;
    formFields.forEach((field) => {
      const fieldName = field["Field Name"]?.trim();
      if (fieldName) {
        const type = field["Field Type"]?.trim().toLowerCase();
        if (type === "conversation" || fieldName.toLowerCase() === "conversation") {
          baseExcludes.push(fieldName);
          return;
        }
        const displayIn = field["Screen"];
        if (displayIn !== undefined && displayIn !== null && displayIn !== "") {
          const options = String(displayIn).split(",").map(s => s.trim().toLowerCase());
          if (options.length > 0 && !options.includes("update")) {
            baseExcludes.push(fieldName);
            return;
          }
        }
        const visibility = field["Field Visibility"];
        if (visibility !== undefined && visibility !== null && visibility !== "") {
          const allowed = String(visibility).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
          if (allowed.length > 0) {
            let hasAccess = false;
            if (allowed.includes("all")) {
              hasAccess = true;
            } else if (allowed.includes("none")) {
              hasAccess = false;
            } else {
              const userRolesLower = (userRoles || []).map(r => r.toLowerCase());
              hasAccess = userRolesLower.some(r => allowed.includes(r)) || allowed.includes("reviewer");
            }
            if (!hasAccess) {
              baseExcludes.push(fieldName);
            }
          }
        }
      }
    });
    return baseExcludes;
  };

  useEffect(() => {
    if (subView === "resumes" || subView === "complaints") {
      fetchSubmissions(uuidMap[subView]);
    } else if (subView === "students") {
      fetchStudents();
    } else if (subView === "timetable") {
      fetchTimetableData();
    }
  }, [subView]);

  const baseManagementTiles = [
    {
      id: "resumes",
      title: "Job Applications",
      description: "View and review submitted teacher and staff resumes.",
      icon: "fa-file-signature",
      buttonColor: "bg-indigo-600 text-white",
      shadow: "shadow-indigo-200",
      onClick: () => onSetSubView("resumes"),
    },
    {
      id: "complaints",
      title: "Registered Complaints",
      description: "Track and review user complaints and feedback.",
      icon: "fa-comments",
      buttonColor: "bg-amber-600 text-white",
      shadow: "shadow-amber-200",
      onClick: () => onSetSubView("complaints"),
    },
    {
      id: "students",
      title: "Student Records",
      description: "View and filter student records in the database.",
      icon: "fa-user-graduate",
      buttonColor: "bg-emerald-600 text-white",
      shadow: "shadow-emerald-200",
      onClick: () => onSetSubView("students"),
    },
    {
      id: "timetable",
      title: "Timetable Viewer",
      description: "View all class and teacher schedules across the school.",
      icon: "fa-calendar-alt",
      buttonColor: "bg-brand-primary text-white",
      shadow: "shadow-brand-lbg",
      onClick: () => onSetSubView("timetable"),
    },
    {
      id: "take-test",
      title: "Take Test",
      description: "Access and take online teacher evaluation tests.",
      icon: "fa-vial",
      buttonColor: "bg-teal-600 text-white",
      shadow: "shadow-teal-200",
      onClick: () => onSetSubView("take-test"),
    },
    {
      id: "syllabus-report",
      title: "Syllabus Progress Reports",
      description: "View syllabus coverage, time spent on chapters/lessons, and revisions.",
      icon: "fa-chart-line",
      buttonColor: "bg-blue-600 text-white",
      shadow: "shadow-blue-200",
      onClick: () => onSetSubView("syllabus-report"),
    },
    {
      id: "syllabus-manager",
      title: "Syllabus Manager",
      description: "Add and manage books, lessons, and syllabus structure.",
      icon: "fa-book-open",
      buttonColor: "bg-purple-600 text-white",
      shadow: "shadow-purple-200",
      onClick: () => onSetSubView("syllabus-manager"),
    },
  ];

  const dynamicTiles = dynamicConfigs
    .filter((config) => {
      if (!config.form_visibility) return false;
      const roles = config.form_visibility
        .split(",")
        .map((r) => r.trim().toLowerCase());
      return roles.includes("management") || roles.includes("all");
    })
    .map((config) => {
      const themeKey = config.card_theme || "orange";
      const theme = CARD_THEMES[themeKey] || CARD_THEMES.orange;
      let shadowClass = "shadow-orange-200";
      if (themeKey.startsWith("pink")) shadowClass = "shadow-pink-200";
      else if (themeKey.startsWith("blue")) shadowClass = "shadow-blue-200";
      else if (themeKey.startsWith("teal")) shadowClass = "shadow-teal-200";
      else if (themeKey === "green") shadowClass = "shadow-green-200";
      else if (themeKey === "red") shadowClass = "shadow-red-200";
      else if (themeKey === "dark" || themeKey === "charcoal") shadowClass = "shadow-gray-200";

      return {
        id: config.form_name,
        title: config.display_name || config.form_name,
        description: config.description || `Fill out the ${config.display_name || config.form_name} form.`,
        icon: config.icon || "fa-clipboard-list",
        buttonColor: theme.color ? `bg-${theme.color} text-white` : 'bg-orange-dark text-white',
        shadow: shadowClass,
        onClick: () => openModal(config.form_name),
      };
    });

  const managementTiles = [...baseManagementTiles, ...dynamicTiles];

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    const initialData = {};
    initialData["Status"] = record.Status || record.status || "Open";
    initialData["Comments"] = record.Comments || record.comments || "";
    initialData["Resolution"] = record.Resolution || record.resolution || "";

    formFields.forEach((field) => {
      const key = field["Field Name"]?.trim();
      const type = field["Field Type"]?.trim().toLowerCase();
      if (key) {
        if (type === "conversation" || key === "conversation") {
          initialData[key] = "";
        } else if (type === "checkbox") {
          initialData[key] = record[key] === true || String(record[key] ?? "").toLowerCase() === "true";
        } else {
          initialData[key] = record[key] || "";
        }
      }
    });

    setEditFormData(initialData);
    setEditStatus(initialData["Status"]);
    setEditComments(initialData["Comments"]);
    setEditResolution(initialData["Resolution"]);
  };

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

  const handlePrevRecord = () => {
    const { hasPrev, current } = getCurrentRecordState();
    if (hasPrev) {
      const prevRecord = submissions[current - 1];
      handleRowClick(prevRecord);
    }
  };

  const handleNextRecord = () => {
    const { hasNext, current } = getCurrentRecordState();
    if (hasNext) {
      const nextRecord = submissions[current + 1];
      handleRowClick(nextRecord);
    }
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord.id) {
      showToast(
        "Error: Record does not have an 'id' field, unable to update database.",
        "error"
      );
      return;
    }

    // Find the correct status and resolution keys
    const statusField = formFields.find(f => 
      f["Field Type"]?.trim().toLowerCase() === "status" || 
      f["Field Name"]?.trim().toLowerCase() === "status"
    );
    const statusFieldName = statusField ? statusField["Field Name"]?.trim() : "status";
    const statusKey = Object.keys(selectedRecord).find(k => k.toLowerCase() === statusFieldName.toLowerCase()) || statusFieldName;
    const resolutionKey = Object.keys(selectedRecord).find(k => k.toLowerCase() === 'resolution') || 'resolution';

    const finalStatus = editFormData[statusKey] !== undefined ? editFormData[statusKey] : (selectedRecord[statusKey] || "New");
    const finalResolution = editFormData[resolutionKey] !== undefined ? editFormData[resolutionKey] : (selectedRecord[resolutionKey] || "");

    if (finalStatus === "Resolved" && !finalResolution.trim()) {
      showToast("Resolution is required when status is marked as Resolved.", "error");
      return;
    }

    setSavingRecord(true);
    try {
      const updateData = {
        [statusKey]: finalStatus,
        [resolutionKey]: finalStatus === "Resolved" ? finalResolution : "",
      };

      // Calculate resolution days if status is set to Resolved
      if (finalStatus === "Resolved") {
        const daysKey = Object.keys(selectedRecord).find(k => 
          ["days_taken", "days index", "days to resolve", "resolve days", "days"].includes(k.toLowerCase())
        ) || "days_taken";

        let daysTaken = 0;
        const dateKey = Object.keys(selectedRecord).find(k => 
          ["timestamp", "time-stamp", "created", "created_at", "reported_at", "date"].includes(k.toLowerCase())
        );
        if (dateKey && selectedRecord[dateKey]) {
          const start = new Date(selectedRecord[dateKey]);
          if (!isNaN(start.getTime())) {
            const diffMs = new Date() - start;
            daysTaken = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          }
        }
        updateData[daysKey] = daysTaken;
      }

      // Add dynamic fields that are editable and not excluded
      formFields.forEach((field) => {
        const key = field["Field Name"]?.trim();
        const type = field["Field Type"]?.trim().toLowerCase();
        // Skip status and resolution as they are handled explicitly
        if (
          key && 
          type !== "conversation" && 
          key.toLowerCase() !== statusKey.toLowerCase() && 
          key.toLowerCase() !== resolutionKey.toLowerCase() && 
          !getExcludedDetailFields().includes(key)
        ) {
          updateData[key] = editFormData[key] !== undefined ? editFormData[key] : (selectedRecord[key] ?? "");
        }
      });

      const updatePayload = {
        action: "update",
        uuid: uuidMap[subView],
        matchColumn: "id",
        records: [
          {
            matchValue: selectedRecord.id,
            data: updateData,
          },
        ],
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(updatePayload),
      });

      const result = await res.json();
      if (result.success) {
        setSelectedRecord(null);
        showToast("Record updated successfully!", "success");
        fetchSubmissions(uuidMap[subView]);
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update record: " + err.message, "error");
    } finally {
      setSavingRecord(false);
    }
  };

  const handleEditFieldChange = (fieldName, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    const lowerName = fieldName.toLowerCase();
    if (lowerName === "status") {
      setEditStatus(value);
    } else if (lowerName === "comments") {
      setEditComments(value);
    } else if (lowerName === "resolution") {
      setEditResolution(value);
    }
  };

  const handleSendConversationMessage = async (fieldName, messageText) => {
    let existing = [];
    try {
      existing = JSON.parse(selectedRecord[fieldName] || "[]");
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const senderName = userRoles.includes("admin") ? "Admin" : "Management";
    const newMsgObj = {
      sender: senderName,
      "time-stamp": new Date().toLocaleString(),
      message: messageText,
    };
    const nextVal = JSON.stringify([...existing, newMsgObj]);

    setSavingRecord(true);
    try {
      const updatePayload = {
        action: "update",
        uuid: uuidMap[subView],
        matchColumn: "id",
        records: [
          {
            matchValue: selectedRecord.id,
            data: {
              [fieldName]: nextVal,
            },
          },
        ],
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(updatePayload),
      });

      const result = await res.json();
      if (result.success) {
        const updatedRecord = { ...selectedRecord, [fieldName]: nextVal };
        setSelectedRecord(updatedRecord);
        setSubmissions((prev) =>
          prev.map((r) => (r.id === selectedRecord.id ? updatedRecord : r))
        );
        showToast("Response sent successfully!", "success");
      } else {
        throw new Error(result.error || "Failed to update conversation");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to send message: " + err.message, "error");
    } finally {
      setSavingRecord(false);
    }
  };

  const renderTableView = () => {
    const { current, total, hasPrev, hasNext } = getCurrentRecordState();

    const isReadOnlyForReviewer = (field) => {
      const type = field["Field Type"]?.trim().toLowerCase();
      const rolesLower = (userRoles || []).map(r => r.toLowerCase());
      if (rolesLower.length === 0) {
        rolesLower.push("management");
      }

      // 1. Force system fields to be read-only always
      if (type === "currenttimestamp" || type === "currentuser") {
        return true;
      }

      // 2. If Update Allowed is "None", it is read-only for everyone
      const updateAllowed = field["Update Allowed"] || field["Read Only For"];
      const allowedRoles = updateAllowed
        ? String(updateAllowed).split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
        : [];

      if (allowedRoles.includes("none")) return true;

      // 3. Admin can always edit everything else
      if (rolesLower.includes("admin")) return false;

      // 4. Force status type fields to be editable ONLY by teacher, management, admin
      if (type === "status") {
        const canChangeStatus = rolesLower.some(r => ["teacher", "management", "admin"].includes(r));
        if (!canChangeStatus) return true;
      }

      // 5. If no restriction is specified, it should be editable
      if (!updateAllowed || updateAllowed.trim() === "") {
        return false;
      }

      if (allowedRoles.includes("all")) return false;

      // Check if user has allowed role
      if (rolesLower.some(r => allowedRoles.includes(r))) return false;

      const currentUserIdentities = [user?.email, user?.id, fullName]
        .map(s => String(s || '').toLowerCase().trim())
        .filter(Boolean);

      // Check if "Reporter" is allowed and current user is the reporter
      if (allowedRoles.includes("reporter") && selectedRecord) {
        const reporterField = formFields.find(f => f["Field Type"]?.trim().toLowerCase() === "currentuser")?.["Field Name"]?.trim();
        const reporterKey = Object.keys(selectedRecord).find(k => k.toLowerCase() === 'reporter' || k.toLowerCase() === 'reported by');
        const recordReporter = selectedRecord[reporterField] || selectedRecord[reporterKey];
        const isUserReporter = recordReporter && currentUserIdentities.includes(String(recordReporter).toLowerCase().trim());
        if (isUserReporter) return false;
      }

      // Check if "Reviewer" is allowed and current user is the assignee/reviewer
      if (allowedRoles.includes("reviewer") && selectedRecord) {
        const assigneeField = formFields.find(f => ["currentassignee", "person"].includes(f["Field Type"]?.trim().toLowerCase()))?.["Field Name"]?.trim();
        const assigneeKey = Object.keys(selectedRecord).find(k => ["assigned", "assignee", "assignedto", "assigned to"].includes(k.toLowerCase()));
        const recordAssignee = selectedRecord[assigneeField] || selectedRecord[assigneeKey];
        const isUserAssignee = recordAssignee && currentUserIdentities.includes(String(recordAssignee).toLowerCase().trim());
        if (isUserAssignee) return false;
      }

      return true;
    };

    // Build dynamic fieldLabels & columnConfig
    const columnConfig = {};
    const fieldLabels = {};
    formFields.forEach((field) => {
      const name = field["Field Name"]?.trim();
      if (name) {
        columnConfig[name] = {
          label: field.Label || name
        };
        columnConfig[name.toLowerCase()] = {
          label: field.Label || name
        };
        fieldLabels[name.toLowerCase()] = field.Label || name;
      }
    });

    // Make sure standard/hardcoded labels map beautifully
    fieldLabels["status"] = "Status";
    fieldLabels["comments"] = "Comments";
    fieldLabels["resolution"] = "Resolution";

    // 1. Build dynamic editableFields
    let modalEditableFields = null;
    if (selectedRecord && subView !== "students") {
      // Find status field from form config
      const statusField = formFields.find(f => 
        f["Field Type"]?.trim().toLowerCase() === "status" || 
        f["Field Name"]?.trim().toLowerCase() === "status"
      );
      
      const statusFieldName = statusField ? statusField["Field Name"]?.trim() : "status";
      const statusKey = Object.keys(selectedRecord).find(k => k.toLowerCase() === statusFieldName.toLowerCase()) || statusFieldName;
      
      const resolutionKey = Object.keys(selectedRecord).find(k => k.toLowerCase() === 'resolution') || 'resolution';

      let statusOptions = ["New", "In Review", "In Progress", "Resolved", "Closed"];
      if (statusField && statusField.List) {
        statusOptions = statusField.List.split(",").map(s => s.trim()).filter(Boolean);
      }

      const activeStatusValue = editFormData[statusKey] ?? selectedRecord[statusKey] ?? "New";

      modalEditableFields = {
        [statusKey]: {
          value: activeStatusValue,
          onChange: handleEditFieldChange,
          type: "select",
          options: statusOptions,
        },
        ...(activeStatusValue === "Resolved" && {
          [resolutionKey]: {
            value: editFormData[resolutionKey] ?? selectedRecord[resolutionKey] ?? "",
            onChange: handleEditFieldChange,
            type: "textarea",
          },
        }),
      };

      // Add dynamic fields that are not excluded
      formFields.forEach((field) => {
        const key = field["Field Name"]?.trim();
        if (!key) return;
        const type = field["Field Type"]?.trim().toLowerCase();
        const isExcluded = getExcludedDetailFields().includes(key);

        if (
          type === "conversation" || 
          key.toLowerCase() === "conversation" || 
          key.toLowerCase() === statusKey.toLowerCase() || 
          key.toLowerCase() === resolutionKey.toLowerCase() || 
          isExcluded || 
          isReadOnlyForReviewer(field)
        ) return;

        const listOptions = field.List
          ? field.List.split(",").map(s => s.trim()).filter(Boolean)
          : [];

        if (type === "person" || type === "currentassignee") {
          modalEditableFields[key] = {
            value: editFormData[key] ?? selectedRecord[key] ?? "",
            onChange: handleEditFieldChange,
            type: "select",
            options: personOptions,
          };
        } else if (type === "dropdown" || type === "select") {
          modalEditableFields[key] = {
            value: editFormData[key] ?? selectedRecord[key] ?? "",
            onChange: handleEditFieldChange,
            type: "select",
            options: listOptions,
          };
        } else if (type === "checkbox") {
          modalEditableFields[key] = {
            value: editFormData[key] !== undefined ? editFormData[key] : (selectedRecord[key] === true || String(selectedRecord[key]).toLowerCase() === "true"),
            onChange: handleEditFieldChange,
            type: "checkbox",
          };
        } else {
          modalEditableFields[key] = {
            value: editFormData[key] ?? selectedRecord[key] ?? "",
            onChange: handleEditFieldChange,
            type: (type === "textarea" || type === "description" || type === "conversation") ? "textarea" : "text",
          };
        }
      });
    }

    // 2. Build conversationFieldsData for the chat interface
    const conversationFieldsData = [];
    if (selectedRecord) {
      formFields.forEach((field) => {
        const key = field["Field Name"]?.trim();
        const type = field["Field Type"]?.trim().toLowerCase();
        if (key && (type === "conversation" || key.toLowerCase() === "conversation")) {
          // Check visibility
          const visibility = field["Field Visibility"];
          let hasAccess = true;
          if (visibility !== undefined && visibility !== null && visibility !== "") {
            const allowed = String(visibility).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
            if (allowed.length > 0) {
              if (allowed.includes("all")) {
                hasAccess = true;
              } else if (allowed.includes("none")) {
                hasAccess = false;
              } else {
                const userRolesLower = (userRoles || []).map(r => r.toLowerCase());
                hasAccess = userRolesLower.some(r => allowed.includes(r)) || allowed.includes("reviewer");
              }
            }
          }

          if (hasAccess) {
            conversationFieldsData.push({
              key: key,
              label: field.Label || key,
              value: selectedRecord[key] || "[]",
              onSendMessage: handleSendConversationMessage,
              isSending: savingRecord,
            });
          }
        }
      });
    }

    return (
      <>
        <DataGrid
          data={submissions}
          loading={loading}
          error={error}
          onRetry={() => subView === "students" ? fetchStudents() : fetchSubmissions(uuidMap[subView])}
          onRowClick={handleRowClick}
          excludeColumns={getExcludedGridColumns()}
          columnConfig={columnConfig}
        />

        {selectedRecord && (
          <DetailModal
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            excludeFields={getExcludedDetailFields()}
            onSave={subView === "students" ? null : handleUpdateRecord}
            onPrevRecord={handlePrevRecord}
            onNextRecord={handleNextRecord}
            hasPrevRecord={hasPrev}
            hasNextRecord={hasNext}
            currentRecordIndex={current}
            totalRecords={total}
            isSaving={savingRecord}
            title={
              subView === "resumes"
                ? "Application Details"
                : subView === "complaints"
                  ? "Complaint Details"
                  : "Student Details"
            }
            editableFields={modalEditableFields}
            conversationFields={conversationFieldsData}
            fieldLabels={fieldLabels}
          />
        )}
      </>
    );
  };

  const renderTakeTestView = () => {
    return (
      <div className="bg-white border-0 shadow-none rounded-none animate-in fade-in slide-in-from-bottom-4 duration-500 w-full m-0 p-0 flex flex-col">
        <div className="p-8 sm:p-12 max-w-5xl mx-auto w-full">
          <DynamicForm uuid="online-teacher-test" textColor="text-teal-600" />
        </div>
      </div>
    );
  };

  return (
    <RolePortal
      userRoles={userRoles}
      role="management"
      tiles={managementTiles}
      subView={subView}
      onSetSubView={onSetSubView}
    >
      {subView === "resumes" || subView === "complaints" || subView === "students"
        ? renderTableView()
        : null}
      {subView === "take-test" ? renderTakeTestView() : null}
      {subView === "syllabus-report" && (
        <SyllabusProgressReport />
      )}
      {subView === "syllabus-manager" && (
        <SyllabusManager role="management" user={user} />
      )}
      {subView === "timetable" && (
        ttLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TimetableAdminView
            classes={ttClasses}
            teachers={ttTeachers}
            subjects={ttSubjects}
            periods={ttPeriods}
            slots={ttSlots}
            assignments={ttAssignments}
            onRefresh={fetchTimetableData}
            refreshing={ttLoading}
            // no onUpdateSlot = read-only
          />
        )
      )}
    </RolePortal>
  );
};

export default ManagementPortal;
