// src/components/requests/ReviewRequestsManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SubmissionsTableView from '../portal-shared/SubmissionsTableView';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const DEFAULT_SCHEMAS = [
  { form_name: 'complaint', display_name: 'Review Complaints', icon: 'fa-comments' },
  { form_name: 'career', display_name: 'Job Applications', icon: 'fa-file-signature' },
];

export const ReviewRequestsManager = ({ user, fullName, userRoles = [], initialSchema = null }) => {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(initialSchema || 'complaint');
  const [loadingSchemas, setLoadingSchemas] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [splitView, setSplitView] = useState(false);

  const fetchSchemas = useCallback(async () => {
    setLoadingSchemas(true);
    try {
      const { data, error } = await supabase
        .from('dynamic_form_configs')
        .select('form_name, display_name, icon, data_id, fields')
        .order('form_name', { ascending: true });

      if (error) {
        console.warn('Failed to fetch dynamic form configs for review requests:', error.message);
        setSchemas(DEFAULT_SCHEMAS);
      } else if (Array.isArray(data) && data.length > 0) {
        // Map database schemas and ensure complaint & career are nicely named
        const schemaMap = new Map();

        // Seed with defaults
        DEFAULT_SCHEMAS.forEach((ds) => schemaMap.set(ds.form_name, ds));

        // Overwrite or append with live database entries
        data.forEach((row) => {
          const existing = schemaMap.get(row.form_name) || {};
          schemaMap.set(row.form_name, {
            ...existing,
            ...row,
            display_name: row.display_name || existing.display_name || row.form_name,
            icon: row.icon || existing.icon || 'fa-clipboard-list',
          });
        });

        const list = Array.from(schemaMap.values());
        setSchemas(list);

        // If current selection is invalid or none selected, pick the first
        if (!selectedSchema || !schemaMap.has(selectedSchema)) {
          const defaultPick =
            initialSchema || (schemaMap.has('complaint') ? 'complaint' : list[0].form_name);
          setSelectedSchema(defaultPick);
        }
      } else {
        setSchemas(DEFAULT_SCHEMAS);
        if (!selectedSchema) setSelectedSchema(initialSchema || 'complaint');
      }
    } catch (err) {
      console.error('Exception fetching schemas:', err);
      setSchemas(DEFAULT_SCHEMAS);
      if (!selectedSchema) setSelectedSchema(initialSchema || 'complaint');
    } finally {
      setLoadingSchemas(false);
    }
  }, [initialSchema, selectedSchema]);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas, refreshTrigger]);

  // The schema can be requested from elsewhere (e.g. the Records button in Form Configurations).
  useEffect(() => {
    if (!initialSchema) return;
    setSelectedSchema(initialSchema);
  }, [initialSchema]);

  const activeSchemaObj = useMemo(() => {
    return (
      schemas.find((s) => s.form_name === selectedSchema) || {
        form_name: selectedSchema,
        display_name: selectedSchema,
        icon: 'fa-inbox',
      }
    );
  }, [schemas, selectedSchema]);

  const handleCopyPublicLink = () => {
    if (!selectedSchema) return;
    try {
      const url = `${window.location.origin}/${selectedSchema}`;
      navigator.clipboard.writeText(url);
      showToast(`Direct form link copied: ${url}`, 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  return (
    <div className="w-full flex flex-col min-h-[500px]" data-feature="review-requests">
      {/* ── HEADER SECTION ── */}
      <div className="w-full bg-white border-b border-light-border px-4 sm:px-6 py-4 print:hidden shadow-2xs space-y-3">
        {/* Row 1: Title & Icon + Global Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shadow-2xs shrink-0 border border-indigo-100">
              <i className="fas fa-inbox" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
                  Review Requests
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activeSchemaObj.display_name || activeSchemaObj.form_name}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
                Review and process submitted feedback, complaints, job applications, and dynamic
                form entries.
              </p>
            </div>
          </div>

          {/* Form Schemas Dropdown & Actions */}
          <div
            className="flex flex-wrap items-center gap-2.5 w-full md:w-auto"
            data-feature-filter="schema"
          >
            {/* Schema Dropdown */}
            <div className="flex-1 sm:flex-initial relative min-w-[200px]">
              <label htmlFor="form-schema-select" className="sr-only">
                Select Form Schema
              </label>
              <select
                id="form-schema-select"
                value={selectedSchema}
                onChange={(e) => setSelectedSchema(e.target.value)}
                disabled={loadingSchemas}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-light-border rounded-xl pl-3.5 pr-8 py-2 text-xs font-bold text-dark-primary outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all shadow-xs"
              >
                {schemas.map((s) => (
                  <option key={s.form_name} value={s.form_name}>
                    {s.display_name || s.form_name} ({s.form_name})
                  </option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dark-muted pointer-events-none" />
            </div>

            {/* Copy / Share Direct Link */}
            <button
              onClick={handleCopyPublicLink}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-dark-primary rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200/80 cursor-pointer shadow-xs"
              title={`Copy direct public submission link for ${activeSchemaObj.display_name}`}
            >
              <i className="fas fa-link text-[10px] text-indigo-600" />
              <span className="hidden sm:inline">Share Link</span>
            </button>

            {/* Open Form Preview */}
            <a
              href={`/${selectedSchema}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-dark-primary rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200/80 cursor-pointer shadow-xs"
              title={`Open direct public submission page for ${activeSchemaObj.display_name}`}
            >
              <i className="fas fa-external-link-alt text-[10px] text-slate-500" />
              <span className="hidden sm:inline">Open Form</span>
            </a>

            {/* View Mode Toggle: Table / Split */}
            <div
              className="inline-flex p-1 bg-slate-100 border border-slate-200/80 rounded-xl shadow-xs shrink-0"
              data-feature-toggle="review-requests-view-mode"
              role="group"
              aria-label="Submissions view mode"
            >
              <button
                type="button"
                onClick={() => setSplitView(false)}
                aria-pressed={!splitView}
                className={`h-7 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !splitView
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
                title="Show the complete table view"
              >
                <i className="fas fa-table text-[11px]" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitView(true)}
                aria-pressed={splitView}
                className={`h-7 px-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  splitView
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
                title="Show the list and full details view"
              >
                <i className="fas fa-columns text-[11px]" />
                <span className="hidden sm:inline">Split</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => setRefreshTrigger((n) => n + 1)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-dark-primary flex items-center justify-center transition-all border border-slate-200/80 cursor-pointer shadow-xs"
              title="Refresh submissions"
            >
              <i className={`fas fa-rotate-right text-xs ${loadingSchemas ? 'fa-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT SECTION ── */}
      <div
        className="w-full flex-1 flex flex-col animate-in fade-in duration-200"
        data-feature="review-requests-content"
      >
        {selectedSchema ? (
          <SubmissionsTableView
            key={`${selectedSchema}-${refreshTrigger}`}
            formUuid={selectedSchema}
            title={activeSchemaObj.display_name || activeSchemaObj.form_name}
            user={user}
            fullName={fullName}
            userRoles={userRoles}
            splitView={splitView}
          />
        ) : (
          <div className="p-4 sm:p-6 flex-1">
            <div className="p-16 text-center text-dark-muted bg-white rounded-2xl border border-light-border">
              <i className="fas fa-clipboard-question text-3xl mb-3 text-slate-300" />
              <p className="text-sm font-semibold">
                Please select a Form Schema from the dropdown above to load data.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewRequestsManager;
