import React, { useState, useEffect } from "react";
import RolePortal from "./RolePortal";
import DynamicForm from "../DynamicForm";
import DataGrid from "../DataGrid";
import DetailModal from "../DetailModal";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const ManagementPortal = ({ userRoles, subView, onSetSubView }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("Open");
  const [editComments, setEditComments] = useState("");
  const [editResolution, setEditResolution] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);

  // UUID mapping
  const uuidMap = {
    resumes: "career",
    complaints: "complaint",
  };

  const fetchSubmissions = async (uuid) => {
    setLoading(true);
    setError("");
    setSubmissions([]);
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
    } catch (err) {
      console.error(err);
      setError("Failed to load submissions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subView === "resumes" || subView === "complaints") {
      fetchSubmissions(uuidMap[subView]);
    }
  }, [subView]);

  const managementTiles = [
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
      id: "take-test",
      title: "Take Test",
      description: "Access and take online teacher evaluation tests.",
      icon: "fa-vial",
      buttonColor: "bg-teal-600 text-white",
      shadow: "shadow-teal-200",
      onClick: () => onSetSubView("take-test"),
    },
  ];

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setEditStatus(record.Status || record.status || "Open");
    setEditComments(record.Comments || record.comments || "");
    setEditResolution(record.Resolution || record.resolution || "");
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
      alert(
        "Error: Record does not have an 'id' field, unable to update database.",
      );
      return;
    }
    if (editStatus === "Resolved" && !editResolution.trim()) {
      alert("Resolution is required when status is marked as Resolved.");
      return;
    }

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
              Status: editStatus,
              Comments: editComments,
              Resolution: editStatus === "Resolved" ? editResolution : "",
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
        setSelectedRecord(null);
        alert("Record updated successfully!");
        fetchSubmissions(uuidMap[subView]);
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update record: " + err.message);
    } finally {
      setSavingRecord(false);
    }
  };

  const handleEditFieldChange = (fieldName, value) => {
    switch (fieldName) {
      case "Status":
        setEditStatus(value);
        break;
      case "Comments":
        setEditComments(value);
        break;
      case "Resolution":
        setEditResolution(value);
        break;
      default:
        break;
    }
  };

  const renderTableView = () => {
    const { current, total, hasPrev, hasNext } = getCurrentRecordState();

    return (
      <>
        <DataGrid
          data={submissions}
          loading={loading}
          error={error}
          onRetry={() => fetchSubmissions(uuidMap[subView])}
          onRowClick={handleRowClick}
          excludeColumns={["uuid"]}
        />

        {selectedRecord && (
          <DetailModal
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onSave={handleUpdateRecord}
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
                : "Complaint Details"
            }
            editableFields={{
              Status: {
                value: editStatus,
                onChange: handleEditFieldChange,
                type: "select",
                options: ["Open", "In-Progress", "Deferred", "Resolved"],
              },
              ...(editStatus === "Resolved" && {
                Resolution: {
                  value: editResolution,
                  onChange: handleEditFieldChange,
                  type: "textarea",
                },
              }),
              Comments: {
                value: editComments,
                onChange: handleEditFieldChange,
                type: "textarea",
              },
            }}
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
      {subView === "resumes" || subView === "complaints"
        ? renderTableView()
        : null}
      {subView === "take-test" ? renderTakeTestView() : null}
    </RolePortal>
  );
};

export default ManagementPortal;
