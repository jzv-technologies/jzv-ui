import React, { useState, useEffect, useMemo, useRef } from "react";

const DataGrid = ({
  data = [],
  loading = false,
  error = "",
  onRetry = null,
  onRowClick = null,
  excludeColumns = ["uuid"],
  columnConfig = {},
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [columnFilters, setColumnFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const columnManagerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnManagerRef.current && !columnManagerRef.current.contains(e.target)) {
        setShowColumnManager(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize / merge columns when data changes (preserve user preferences)
  useEffect(() => {
    if (data.length === 0) return;

    const allHeaders = Array.from(
      new Set(data.flatMap((item) => Object.keys(item))),
    );
    const headers = allHeaders.filter((k) => !excludeColumns.includes(k));

    // Preserve existing column order, add new columns at the end
    setColumnOrder((prevOrder) => {
      const existing = prevOrder.filter((h) => headers.includes(h));
      const added = headers.filter((h) => !prevOrder.includes(h));
      return [...existing, ...added];
    });

    // Preserve existing visibility, default new columns to visible
    setVisibleColumns((prevVisible) => {
      const updated = { ...prevVisible };
      headers.forEach((h) => {
        if (updated[h] === undefined) updated[h] = true;
      });
      return updated;
    });
  }, [data, excludeColumns]);

  // Drag & drop for column order (only on header row)
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("dragIndex", index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("dragIndex"));
    if (dragIndex === targetIndex) return;
    const newOrder = [...columnOrder];
    const [draggedCol] = newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCol);
    setColumnOrder(newOrder);
  };

  const toggleColumnVisibility = (col) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Memoized filterable columns detection
  const filterableCols = useMemo(() => {
    if (data.length === 0) return [];

    const filterable = [];
    columnOrder.forEach((key) => {
      if (excludeColumns.includes(key)) return;

      if (columnConfig[key]?.filterable === true) {
        const uniqueVals = Array.from(
          new Set(
            data.map((item) => String(item[key] ?? "").trim()).filter(Boolean),
          ),
        );
        filterable.push({ key, options: uniqueVals });
        return;
      }

      const uniqueVals = Array.from(
        new Set(
          data.map((item) => String(item[key] ?? "").trim()).filter(Boolean),
        ),
      );
      if (uniqueVals.length > 0 && uniqueVals.length <= 8) {
        filterable.push({ key, options: uniqueVals });
      }
    });
    return filterable;
  }, [data, columnOrder, excludeColumns, columnConfig]);

  const getProcessedData = () => {
    let processed = [...data];

    // Apply filters
    Object.keys(columnFilters).forEach((colKey) => {
      const filterValue = columnFilters[colKey];
      if (!filterValue) return;
      const isDropdown = filterableCols.some(
        (f) => f.key.toLowerCase() === colKey.toLowerCase(),
      );
      if (isDropdown) {
        processed = processed.filter(
          (item) =>
            String(item[colKey] ?? "").toLowerCase() ===
            filterValue.toLowerCase(),
        );
      } else {
        processed = processed.filter((item) =>
          String(item[colKey] ?? "")
            .toLowerCase()
            .includes(filterValue.toLowerCase()),
        );
      }
    });

    // Apply sorting
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

  if (loading) {
    return (
      <div className="p-20 text-center text-dark-muted bg-white border border-light-border rounded-2xl shadow-sm">
        <i className="fas fa-spinner fa-spin text-3xl mb-4 text-indigo-600"></i>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-red-600 bg-red-50 border border-red-200 rounded-2xl">
        <i className="fas fa-exclamation-circle text-3xl mb-3"></i>
        <p className="font-bold">Error loading data</p>
        <p className="text-sm mt-1">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const processedData = getProcessedData();
  const visibleHeaders = columnOrder.filter((h) => visibleColumns[h] !== false);

  return (
    <div className="bg-white border-0 shadow-none overflow-hidden rounded-none animate-in fade-in slide-in-from-bottom-4 duration-500 w-full m-0 p-0 flex flex-col">
      {/* Stats & Column Manager Bar */}
      <div className="px-6 py-3 border-b border-light-border bg-gray-50 flex justify-between items-center text-sm shrink-0">
        <span className="text-dark-muted font-medium">
          Showing{" "}
          <strong className="text-dark-deepblue">{processedData.length}</strong>{" "}
          of <strong className="text-dark-deepblue">{data.length}</strong>{" "}
          records
        </span>
        <div className="flex items-center gap-2">
          {Object.values(columnFilters).some(Boolean) && (
            <button
              onClick={() => setColumnFilters({})}
              className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 hover:underline"
            >
              <i className="fas fa-times-circle"></i> Clear Filters
            </button>
          )}
          <div ref={columnManagerRef} className="relative">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5 hover:underline px-2 py-1 rounded hover:bg-indigo-50 transition-all"
            >
              <i className="fas fa-columns"></i> Columns
            </button>
            {showColumnManager && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-light-border rounded-lg shadow-lg z-20 min-w-[200px] p-2">
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {columnOrder.map((col) => (
                    <label
                      key={col}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[col] !== false}
                        onChange={() => toggleColumnVisibility(col)}
                        className="w-4 h-4 rounded border-light-border cursor-pointer"
                      />
                      <span className="text-dark-deepblue font-medium">
                        {columnConfig[col]?.label || columnConfig[col]?.Label || col}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {processedData.length === 0 ? (
        <div className="p-16 text-center text-dark-muted">
          <i className="fas fa-search text-3xl mb-3 text-gray-300"></i>
          <p>No records match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Filter Row - no drag & drop */}
              <tr className="bg-gray-100/50 border-b border-light-border">
                {visibleHeaders.map((h) => {
                  const isDropdown = filterableCols.find(
                    (f) => f.key.toLowerCase() === h.toLowerCase(),
                  );
                  return (
                    <th key={`filter-${h}`} className="p-3">
                      {isDropdown ? (
                        <select
                          value={columnFilters[h] || ""}
                          onChange={(e) =>
                            setColumnFilters((prev) => ({
                              ...prev,
                              [h]: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1.5 border border-light-border bg-white rounded-lg outline-none text-xs text-dark-deepblue focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                        >
                          <option value="">All</option>
                          {isDropdown.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
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
                            onChange={(e) =>
                              setColumnFilters((prev) => ({
                                ...prev,
                                [h]: e.target.value,
                              }))
                            }
                            className="w-full pl-5 pr-2 py-1.5 border border-light-border bg-white rounded-lg outline-none text-xs text-dark-deepblue focus:border-indigo-500 transition-all font-normal"
                          />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>

              {/* Header Row - draggable columns */}
              <tr className="bg-gray-50 text-dark-deepblue uppercase text-xs font-bold tracking-wider border-b border-light-border">
                {visibleHeaders.map((h, idx) => {
                  const columnIndex = columnOrder.indexOf(h);
                  return (
                    <th
                      key={h}
                      onClick={() => handleSort(h)}
                      className="p-6 border-b whitespace-nowrap cursor-move hover:bg-gray-100/70 transition-colors select-none group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, columnIndex)}
                    >
                      <div className="flex items-center gap-1.5">
                        {columnConfig[h]?.label || columnConfig[h]?.Label || h}
                        <span className="text-gray-400 group-hover:text-indigo-600 transition-colors text-[10px] cursor-pointer">
                          {sortConfig.key === h ? (
                            sortConfig.direction === "asc" ? (
                              <i className="fas fa-sort-up"></i>
                            ) : (
                              <i className="fas fa-sort-down"></i>
                            )
                          ) : (
                            <i className="fas fa-sort"></i>
                          )}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, idx) => {
                const rowClass = getRowStatusClass(item);
                return (
                  <tr
                    key={idx}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`border-b border-light-border last:border-0 transition-colors cursor-pointer ${rowClass}`}
                    title={onRowClick ? "Click to view details" : ""}
                  >
                    {visibleHeaders.map((h) => {
                      const valStr = String(item[h] ?? "");
                      const valClean = valStr.toLowerCase().trim();
                      const isStatus = ["open", "in-progress", "in progress", "resolved", "rejected"].includes(valClean);
                      return (
                        <td
                          key={h}
                          className="p-6 text-sm text-dark-charcoal whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                        >
                          {isStatus ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyles(item[h])}`}>
                              {item[h]}
                            </span>
                          ) : (
                            valStr
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const getStatusStyles = (status) => {
  const s = String(status || "").toLowerCase().trim();
  switch (s) {
    case "open":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "in-progress":
    case "in progress":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "resolved":
      return "bg-green-50 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getRowStatusClass = (item) => {
  let s = "";
  const statusKey = Object.keys(item).find((k) => k.toLowerCase() === "status");
  if (statusKey) {
    s = String(item[statusKey] || "").toLowerCase().trim();
  } else {
    for (const k in item) {
      const val = String(item[k] || "").toLowerCase().trim();
      if (["open", "in-progress", "in progress", "resolved", "rejected"].includes(val)) {
        s = val;
        break;
      }
    }
  }
  switch (s) {
    case "open":
      return "bg-blue-50/10 hover:bg-blue-100/20";
    case "in-progress":
    case "in progress":
      return "bg-amber-50/10 hover:bg-amber-100/20";
    case "resolved":
      return "bg-green-50/10 hover:bg-green-100/20";
    case "rejected":
      return "bg-red-50/10 hover:bg-red-100/20";
    default:
      return "hover:bg-indigo-50/20";
  }
};

export default DataGrid;
