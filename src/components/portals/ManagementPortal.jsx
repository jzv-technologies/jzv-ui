import React, { useState, useEffect } from "react";
import RolePortal from "./RolePortal";
import { supabase } from "../../utils/supabase";
import DynamicForm from "../DynamicForm";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const ManagementPortal = ({ userRoles, subView, onSetSubView }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search & Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [columnFilters, setColumnFilters] = useState({});

  // Selected record modal states
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("Open");
  const [editComments, setEditComments] = useState("");
  const [editResolution, setEditResolution] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);

  const fetchSubmissions = async (uuid) => {
    setLoading(true);
    setError("");
    setSubmissions([]);
    setSearchTerm("");
    setSortConfig({ key: null, direction: "asc" });
    setColumnFilters({});
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=search`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          action: "search",
          uuid: uuid,
          criteria: {}
        })
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
    if (subView === "resumes") {
      fetchSubmissions("career");
    } else if (subView === "complaints") {
      fetchSubmissions("complaint");
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
      onClick: () => onSetSubView("resumes")
    },
    {
      id: "complaints",
      title: "Registered Complaints",
      description: "Track and review user complaints and feedback.",
      icon: "fa-comments",
      buttonColor: "bg-amber-600 text-white",
      shadow: "shadow-amber-200",
      onClick: () => onSetSubView("complaints")
    },
    {
      id: "take-test",
      title: "Take Test",
      description: "Access and take online teacher evaluation tests.",
      icon: "fa-vial",
      buttonColor: "bg-teal-600 text-white",
      shadow: "shadow-teal-200",
      onClick: () => onSetSubView("take-test")
    }
  ];

  // Sorting Handler
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Row Details Click
  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setEditStatus(record.Status || record.status || "Open");
    setEditComments(record.Comments || record.comments || "");
    setEditResolution(record.Resolution || record.resolution || "");
  };

  // Update Record in DB
  const handleUpdateRecord = async () => {
    if (!selectedRecord.id) {
      alert("Error: Record does not have an 'id' field, unable to update database.");
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
        uuid: subView === "resumes" ? "career" : "complaint",
        matchColumn: "id",
        records: [
          {
            matchValue: selectedRecord.id,
            data: {
              Status: editStatus,
              Comments: editComments,
              Resolution: editStatus === "Resolved" ? editResolution : ""
            }
          }
        ]
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(updatePayload)
      });

      const result = await res.json();
      if (result.success) {
        setSelectedRecord(null);
        alert("Record updated successfully!");
        fetchSubmissions(subView === "resumes" ? "career" : "complaint");
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

  // Process sorting and column-specific filters
  const getProcessedSubmissions = () => {
    let processed = [...submissions];

    // Column-specific filters
    Object.keys(columnFilters).forEach(colKey => {
      const filterValue = columnFilters[colKey];
      if (filterValue) {
        const isDropdown = getFilterableColumns().find(f => f.key.toLowerCase() === colKey.toLowerCase());
        if (isDropdown) {
          // Exact match for dropdown filters
          processed = processed.filter(sub => 
            String(sub[colKey] ?? "").toLowerCase() === filterValue.toLowerCase()
          );
        } else {
          // Substring match for text input filters
          processed = processed.filter(sub => 
            String(sub[colKey] ?? "").toLowerCase().includes(filterValue.toLowerCase())
          );
        }
      }
    });

    // Sorting
    if (sortConfig.key) {
      processed.sort((a, b) => {
        const valA = a[sortConfig.key] ?? "";
        const valB = b[sortConfig.key] ?? "";
        
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return processed;
  };

  // Detect which columns are filterable (columns with <= 8 distinct values)
  const getFilterableColumns = () => {
    if (submissions.length === 0) return [];
    
    const excludeKeys = ["uuid", "id", "created", "updated", "timestamp"];
    const allKeys = Array.from(new Set(submissions.flatMap(s => Object.keys(s))));
    
    const filterable = [];
    allKeys.forEach(key => {
      if (excludeKeys.includes(key.toLowerCase())) return;
      
      const uniqueVals = Array.from(
        new Set(submissions.map(s => String(s[key] ?? "").trim()).filter(Boolean))
      );
      if (uniqueVals.length > 0 && uniqueVals.length <= 8) {
        filterable.push({
          key,
          options: uniqueVals
        });
      }
    });
    
    // Ensure Status is always filterable
    if (!filterable.some(f => f.key.toLowerCase() === "status")) {
      filterable.push({
        key: "Status",
        options: ["Open", "In-Progress", "Deferred", "Resolved"]
      });
    }
    
    return filterable;
  };

  const renderSubmissionsTable = () => {
    if (loading) {
      return (
        <div className="p-20 text-center text-dark-muted bg-white border border-light-border rounded-2xl shadow-sm">
          <i className="fas fa-spinner fa-spin text-3xl mb-4 text-indigo-600"></i>
          <p>Loading submissions...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-12 text-center text-red-600 bg-red-50 border border-red-200 rounded-2xl">
          <i className="fas fa-exclamation-circle text-3xl mb-3"></i>
          <p className="font-bold">Error loading submissions</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => fetchSubmissions(subView === "resumes" ? "career" : "complaint")}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
          >
            Retry
          </button>
        </div>
      );
    }

    const processedSubmissions = getProcessedSubmissions();
    const filterableCols = getFilterableColumns();

    const excludeKeys = ["uuid"];
    const headers = Array.from(
      new Set(
        submissions.flatMap(s => Object.keys(s))
      )
    ).filter(k => !excludeKeys.includes(k));

    return (
      <div className="bg-white border-0 shadow-none overflow-hidden rounded-none animate-in fade-in slide-in-from-bottom-4 duration-500 w-full m-0 p-0 flex flex-col">
        {/* Compact stats & clear filters bar */}
        <div className="px-6 py-3 border-b border-light-border bg-gray-50 flex justify-between items-center text-sm shrink-0">
          <span className="text-dark-muted font-medium">
            Showing <strong className="text-dark-deepblue">{processedSubmissions.length}</strong> of <strong className="text-dark-deepblue">{submissions.length}</strong> records
          </span>
          {Object.values(columnFilters).some(Boolean) && (
            <button
              onClick={() => setColumnFilters({})}
              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 hover:underline"
            >
              <i className="fas fa-times-circle"></i> Clear Filters
            </button>
          )}
        </div>

        {/* Submissions Table List */}
        {processedSubmissions.length === 0 ? (
          <div className="p-16 text-center text-dark-muted">
            <i className="fas fa-search text-3xl mb-3 text-gray-300"></i>
            <p>No records match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                {/* Column Filters Row (placed just above header names) */}
                <tr className="bg-gray-100/50 border-b border-light-border">
                  {headers.map(h => {
                    const isDropdown = filterableCols.find(f => f.key.toLowerCase() === h.toLowerCase());
                    const isIdCol = ["id", "uuid", "created", "updated", "timestamp"].includes(h.toLowerCase());
                    
                    return (
                      <th key={`filter-${h}`} className="p-3">
                        {!isIdCol && (
                          isDropdown ? (
                            <select
                              value={columnFilters[h] || ""}
                              onChange={(e) => setColumnFilters(prev => ({ ...prev, [h]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-light-border bg-white rounded-lg outline-none text-xs text-dark-deepblue focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                            >
                              <option value="">All</option>
                              {isDropdown.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-400 text-[10px]">
                                <i className="fas fa-filter"></i>
                              </span>
                              <input
                                type="text"
                                placeholder="Filter..."
                                value={columnFilters[h] || ""}
                                onChange={(e) => setColumnFilters(prev => ({ ...prev, [h]: e.target.value }))}
                                className="w-full pl-5 pr-2 py-1.5 border border-light-border bg-white rounded-lg outline-none text-xs text-dark-deepblue focus:border-indigo-500 transition-all font-normal"
                              />
                            </div>
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>

                {/* Column Header Names Row */}
                <tr className="bg-gray-50 text-dark-deepblue uppercase text-xs font-bold tracking-wider border-b border-light-border">
                  {headers.map(h => (
                    <th 
                      key={h} 
                      onClick={() => handleSort(h)}
                      className="p-6 border-b whitespace-nowrap cursor-pointer hover:bg-gray-100/70 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        {h}
                        <span className="text-gray-400 group-hover:text-indigo-600 transition-colors text-[10px]">
                          {sortConfig.key === h ? (
                            sortConfig.direction === "asc" ? <i className="fas fa-sort-up"></i> : <i className="fas fa-sort-down"></i>
                          ) : (
                            <i className="fas fa-sort"></i>
                          )}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedSubmissions.map((sub, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => handleRowClick(sub)}
                    className="hover:bg-indigo-50/30 transition-colors border-b border-light-border last:border-0 cursor-pointer"
                    title="Click to view details"
                  >
                    {headers.map(h => (
                      <td key={h} className="p-6 text-sm text-dark-charcoal whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                        {String(sub[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
          {/* Modal Header */}
          <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl font-bold">Record Details</h3>
              <p className="text-xs opacity-75 font-mono mt-0.5">ID: {selectedRecord.id || "N/A"}</p>
            </div>
            <button 
              onClick={() => setSelectedRecord(null)}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all text-white font-bold"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-8 overflow-y-auto flex-1 space-y-6">
            {/* Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-light-border">
              {Object.entries(selectedRecord)
                .filter(([key]) => !["uuid"].includes(key))
                .map(([key, val]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-xs font-bold text-dark-muted uppercase tracking-wider">{key}</span>
                    <span className="text-sm font-semibold text-dark-deepblue mt-0.5 break-words">
                      {String(val ?? "") || <span className="text-gray-300 italic">None</span>}
                    </span>
                  </div>
                ))}
            </div>

            {/* Status & Comments Update Section */}
            <div className="border-t border-light-border pt-6 space-y-4">
              <h4 className="text-base font-bold text-dark-deepblue flex items-center gap-2">
                <i className="fas fa-edit text-indigo-600"></i> Update Record Status
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-dark-deepblue mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-light-border bg-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-semibold text-dark-deepblue cursor-pointer"
                  >
                    <option value="Open">Open</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Deferred">Deferred</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                {editStatus === "Resolved" && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-bold text-dark-deepblue mb-1.5">
                      Resolution <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Detail the resolution..."
                      value={editResolution}
                      onChange={(e) => setEditResolution(e.target.value)}
                      className="w-full px-4 py-2.5 border border-light-border rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-dark-deepblue mb-1.5">Comments</label>
                <textarea
                  rows={3}
                  placeholder="Add comments or notes regarding this record..."
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="w-full px-4 py-3 border border-light-border rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-light-border bg-gray-50 flex justify-end gap-3 shrink-0">
            <button
              onClick={() => setSelectedRecord(null)}
              className="px-5 py-2.5 bg-white border border-light-border hover:bg-gray-100 text-dark-deepblue rounded-xl font-bold text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateRecord}
              disabled={savingRecord}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-100 font-bold"
            >
              {savingRecord ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTakeTestView = () => {
    return (
      <div className="bg-white border-0 shadow-none rounded-none animate-in fade-in slide-in-from-bottom-4 duration-500 w-full m-0 p-0 flex flex-col">

        {/* Dynamic Form wrapper */}
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
      {subView === "resumes" || subView === "complaints" ? renderSubmissionsTable() : null}
      {subView === "take-test" ? renderTakeTestView() : null}
      {renderDetailModal()}
    </RolePortal>
  );
};

export default ManagementPortal;
