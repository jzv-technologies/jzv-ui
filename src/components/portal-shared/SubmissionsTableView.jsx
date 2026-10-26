// src/components/portal-shared/SubmissionsTableView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataGrid from '../DataGrid';
import DetailModal from '../DetailModal';
import ConfirmModal from '../ConfirmModal';
import { useCanAccess } from './ConditionalBlock';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';
import {
  applySheetMapping,
  buildColumnConfig,
  buildFieldLabelMap,
  getConversationColumns,
  getEditableFieldNames,
  getExcludedDetailColumns as getExcludedDetailColumnsFromConfig,
  getExcludedGridColumns as getExcludedGridColumnsFromConfig,
  getFieldLabel,
  getFieldName,
  isConversationField,
  isFieldEditableByUser,
  isStatusValue,
  orderRecordKeys,
  parseConversation,
  resolveSubmissionSource,
} from '../../utils/submissionFields';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

const LOCAL_MAPPING_FALLBACK = {
  complaint: {
    google_sheet_id: '1E97QNg6HM6ZJlTGdYUlK5FiD-WwhNYl3vTDRixRgA9A',
    data_sheet_name: 'complaint_data',
  },
  career: {
    google_sheet_id: '1rtxVBXFij9ZxwQhjRhzB8X6Phb0oxOKgxWgBYpSQ6xI',
    data_sheet_name: 'career_data',
  },
};

const DETAIL_GRID_CLASS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

const STATUS_BADGE_CLASS = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'in progress': 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const getStatusBadgeClass = (value) =>
  STATUS_BADGE_CLASS[
    String(value ?? '')
      .toLowerCase()
      .trim()
  ] || 'bg-gray-50 text-gray-700 border-gray-200';

const getRecordKey = (record, index) =>
  record?.id !== undefined && record?.id !== null && record?.id !== ''
    ? `id:${record.id}`
    : `idx:${index}`;

export const SubmissionsTableView = ({
  formUuid,
  title,
  user,
  fullName,
  userRoles = [],
  splitView = false,
}) => {
  const [submissions, setSubmissions] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);
  const [visibleGridColumns, setVisibleGridColumns] = useState([]);
  const [selectedNavKey, setSelectedNavKey] = useState(null);
  const [detailColumns, setDetailColumns] = useState(2);
  const [sheetSource, setSheetSource] = useState(null);

  const canAccess = useCanAccess(userRoles);
  const canDeleteRecords = canAccess('form-config-records-delete');
  const [bulkSelection, setBulkSelection] = useState([]);
  const [selectionResetToken, setSelectionResetToken] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingRecords, setDeletingRecords] = useState(false);
  const [sendingConversationKey, setSendingConversationKey] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    if (!formUuid) return;
    setLoading(true);
    setError('');
    setSubmissions([]);
    setFormFields([]);
    try {
      // 1. Form config supplies the field list and the data source id
      const { data: configData, error: configError } = await supabase
        .from('dynamic_form_configs')
        .select('fields, data_id, form_name')
        .eq('form_name', formUuid);
      if (configError) {
        console.warn('Failed to load form config for review requests:', configError.message);
      }
      const configRecord = Array.isArray(configData) ? configData[0] : null;
      const fieldsField = configRecord?.fields;
      const parsedFields = typeof fieldsField === 'string' ? JSON.parse(fieldsField) : fieldsField;
      setFormFields(parsedFields || []);

      // 2. The Apps Script addresses data by sheet, not by form name
      const dataId = configRecord?.data_id || null;
      let mappingRows = [];
      if (dataId) {
        const { data, error: mappingError } = await supabase
          .from('google_sheet_mappings')
          .select('google_sheet_id, data_sheet_name, data_id')
          .eq('data_id', dataId);
        if (mappingError) {
          console.warn('Failed to load Google Sheet mapping:', mappingError.message);
        }
        mappingRows = Array.isArray(data) ? data : [];
      }

      const source = resolveSubmissionSource({
        formName: formUuid,
        dataId,
        mappings: mappingRows,
        fallbacks: LOCAL_MAPPING_FALLBACK,
      });
      setSheetSource(source);

      const searchPayload = applySheetMapping(
        { action: 'search', uuid: source.uuid, criteria: {} },
        source
      );

      const res = await fetch(`${APPS_SCRIPT_URL}?action=search`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(searchPayload),
      });
      const result = await res.json();
      if (result.success) {
        setSubmissions(result.data || []);
      } else if (/not found/i.test(String(result.error || '')) && !source.mapping) {
        throw new Error(
          `This form is not linked to a Google Sheet data source (data ID: "${source.uuid}"). ` +
            'Configure a Google Sheet mapping in Form Configurations to review its submissions.'
        );
      } else {
        throw new Error(result.error || 'Failed to fetch submissions');
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setError('Failed to load submissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [formUuid]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleGridColumnsChange = useCallback(({ visibleHeaders }) => {
    const next = Array.isArray(visibleHeaders) ? visibleHeaders : [];
    setVisibleGridColumns((prev) =>
      prev.length === next.length && prev.every((header, index) => header === next[index])
        ? prev
        : next
    );
  }, []);

  // Keep a record selected in split view (default to the first one)
  useEffect(() => {
    if (!splitView) return;
    if (submissions.length === 0) {
      if (selectedNavKey !== null) setSelectedNavKey(null);
      return;
    }
    const stillExists = submissions.some(
      (record, index) => getRecordKey(record, index) === selectedNavKey
    );
    if (!stillExists) setSelectedNavKey(getRecordKey(submissions[0], 0));
  }, [splitView, submissions, selectedNavKey]);

  // Field visibility / column rules come from the shared dynamic-form semantics
  const excludedGridColumns = useMemo(
    () => getExcludedGridColumnsFromConfig(formFields, userRoles),
    [formFields, userRoles]
  );
  const excludedDetailColumns = useMemo(
    () => getExcludedDetailColumnsFromConfig(formFields, userRoles),
    [formFields, userRoles]
  );

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    const initialData = {};
    initialData['Status'] = record.Status || record.status || 'Open';
    initialData['Comments'] = record.Comments || record.comments || '';
    initialData['Resolution'] = record.Resolution || record.resolution || '';

    formFields.forEach((field) => {
      const key = field['Field Name']?.trim();
      const type = field['Field Type']?.trim().toLowerCase();
      if (key) {
        if (type === 'conversation' || key === 'conversation') {
          initialData[key] = '';
        } else if (type === 'checkbox') {
          initialData[key] =
            record[key] === true || String(record[key] ?? '').toLowerCase() === 'true';
        } else {
          initialData[key] = record[key] || '';
        }
      }
    });

    setEditFormData(initialData);
  };

  const getCurrentRecordState = () => {
    if (!selectedRecord) return { current: 0, total: 0, hasPrev: false, hasNext: false };
    const currentIndex = submissions.findIndex((r) => r.id === selectedRecord.id);
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
      handleRowClick(submissions[current - 1]);
    }
  };

  const handleNextRecord = () => {
    const { hasNext, current } = getCurrentRecordState();
    if (hasNext) {
      handleRowClick(submissions[current + 1]);
    }
  };

  const handleEditFieldChange = (fieldName, value) =>
    setEditFormData((prev) => ({ ...prev, [fieldName]: value }));

  // Every field update is gated by "Update Allowed" + the user's portal role.
  const permissionContext = (record) => ({
    userRoles,
    user,
    fullName,
    record,
    fields: formFields,
  });

  const findStatusConfig = (record) => {
    if (!record) return { statusField: null, statusKey: null, resolutionKey: null };
    const statusField =
      formFields.find(
        (field) =>
          String(field['Field Type'] || '')
            .toLowerCase()
            .trim() === 'status'
      ) ||
      formFields.find((field) => getFieldName(field).toLowerCase() === 'status') ||
      null;
    const statusName = statusField ? getFieldName(statusField) : 'status';
    const statusKey = Object.keys(record).find(
      (key) => key.toLowerCase() === statusName.toLowerCase()
    );
    const resolutionKey = Object.keys(record).find((key) => key.toLowerCase() === 'resolution');
    return { statusField, statusKey: statusKey || null, resolutionKey: resolutionKey || null };
  };

  // Controls for the "Update Record" section of the detail modal
  const buildEditableControls = (record) => {
    if (!record) return null;
    const context = permissionContext(record);
    const { statusField, statusKey, resolutionKey } = findStatusConfig(record);
    const controls = {};

    if (statusField && statusKey && isFieldEditableByUser(statusField, context)) {
      const listOptions = String(statusField.List || '')
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean);
      controls[statusKey] = {
        value: editFormData[statusKey] ?? record[statusKey] ?? '',
        onChange: handleEditFieldChange,
        type: 'select',
        options:
          listOptions.length > 0
            ? listOptions
            : ['New', 'In Review', 'In Progress', 'Resolved', 'Closed'],
      };
      if (resolutionKey) {
        controls[resolutionKey] = {
          value: editFormData[resolutionKey] ?? record[resolutionKey] ?? '',
          onChange: handleEditFieldChange,
          type: 'textarea',
        };
      }
    }

    formFields.forEach((field) => {
      const key = getFieldName(field);
      if (!key || isConversationField(field)) return;
      const lowerKey = key.toLowerCase();
      if (statusKey && lowerKey === statusKey.toLowerCase()) return;
      if (resolutionKey && lowerKey === resolutionKey.toLowerCase()) return;
      if (excludedDetailColumns.some((column) => column.toLowerCase() === lowerKey)) return;
      // Only touch columns that actually exist in the sheet
      const recordKey = Object.keys(record).find((rk) => rk.toLowerCase() === lowerKey);
      if (!recordKey) return;
      if (!isFieldEditableByUser(field, context)) return;

      const type = String(field['Field Type'] || '')
        .toLowerCase()
        .trim();
      const value = editFormData[recordKey] ?? record[recordKey] ?? '';
      const listOptions = String(field.List || '')
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean);

      const isSelectType = [
        'dropdown',
        'select',
        'radio',
        'currentassignee',
        'person',
        'status',
      ].includes(type);

      if (isSelectType && (listOptions.length > 0 || type === 'status')) {
        controls[recordKey] = {
          value,
          onChange: handleEditFieldChange,
          type: 'select',
          options: listOptions,
        };
      } else if (type === 'checkbox') {
        controls[recordKey] = {
          value:
            value === true || String(value).toLowerCase() === 'true'
              ? true
              : value === false || String(value).toLowerCase() === 'false'
                ? false
                : Boolean(value),
          onChange: handleEditFieldChange,
          type: 'checkbox',
        };
      } else if (['textarea', 'description'].includes(type)) {
        controls[recordKey] = { value, onChange: handleEditFieldChange, type: 'textarea' };
      } else {
        controls[recordKey] = {
          value,
          onChange: handleEditFieldChange,
          type:
            type === 'number'
              ? 'number'
              : type === 'date'
                ? 'date'
                : type === 'email'
                  ? 'email'
                  : 'text',
        };
      }
    });

    return Object.keys(controls).length > 0 ? controls : null;
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord?.id) {
      showToast("Error: Record does not have an 'id' field.", 'error');
      return;
    }

    const context = permissionContext(selectedRecord);
    const { statusField, statusKey, resolutionKey } = findStatusConfig(selectedRecord);
    const statusEditable = Boolean(
      statusField && statusKey && isFieldEditableByUser(statusField, context)
    );
    const editableNames = new Set(
      getEditableFieldNames(formFields, context).map((name) => name.toLowerCase())
    );

    const finalStatus = statusKey
      ? (editFormData[statusKey] ?? selectedRecord[statusKey] ?? '')
      : '';
    const finalResolution = resolutionKey
      ? (editFormData[resolutionKey] ?? selectedRecord[resolutionKey] ?? '')
      : '';
    const isResolved = String(finalStatus).toLowerCase() === 'resolved';

    if (statusEditable && isResolved && !String(finalResolution).trim()) {
      showToast('Resolution is required when status is marked as Resolved.', 'error');
      return;
    }

    setSavingRecord(true);
    try {
      const updateData = {};

      if (statusEditable) {
        updateData[statusKey] = finalStatus;
        if (resolutionKey) updateData[resolutionKey] = isResolved ? finalResolution : '';

        if (isResolved) {
          const daysKey =
            Object.keys(selectedRecord).find((k) =>
              ['days_taken', 'days index', 'days to resolve', 'resolve days', 'days'].includes(
                k.toLowerCase()
              )
            ) || 'days_taken';

          let daysTaken = 0;
          const dateKey = Object.keys(selectedRecord).find((k) =>
            ['timestamp', 'time-stamp', 'created', 'created_at', 'reported_at', 'date'].includes(
              k.toLowerCase()
            )
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
      }

      formFields.forEach((field) => {
        const key = getFieldName(field);
        if (!key || isConversationField(field)) return;
        const lowerKey = key.toLowerCase();
        if (statusKey && lowerKey === statusKey.toLowerCase()) return;
        if (resolutionKey && lowerKey === resolutionKey.toLowerCase()) return;
        if (!editableNames.has(lowerKey)) return;
        if (excludedDetailColumns.some((column) => column.toLowerCase() === lowerKey)) return;

        const recordKey = Object.keys(selectedRecord).find((rk) => rk.toLowerCase() === lowerKey);
        if (!recordKey) return;

        updateData[recordKey] =
          editFormData[recordKey] !== undefined
            ? editFormData[recordKey]
            : (selectedRecord[recordKey] ?? '');
      });

      if (Object.keys(updateData).length === 0) {
        showToast('No fields are editable for your role on this record.', 'info');
        return;
      }

      const updatePayload = applySheetMapping(
        {
          action: 'update',
          uuid: sheetSource?.uuid || formUuid,
          matchColumn: 'id',
          records: [
            {
              matchValue: selectedRecord.id,
              data: updateData,
            },
          ],
        },
        sheetSource
      );

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(updatePayload),
      });

      const result = await res.json();
      if (result.success) {
        setSelectedRecord(null);
        showToast('Record updated successfully!', 'success');
        fetchSubmissions();
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update record: ' + err.message, 'error');
    } finally {
      setSavingRecord(false);
    }
  };

  const { current, total, hasPrev, hasNext } = getCurrentRecordState();

  // Deleting always sends one request with every id: the Apps Script iterates the values
  // server-side instead of the client looping over single-record requests.
  const requestDeleteRecords = (records) => {
    const ids = (Array.isArray(records) ? records : [])
      .map((record) => record?.id)
      .filter((id) => id !== undefined && id !== null && id !== '');
    if (ids.length === 0) {
      showToast("These records have no 'id' column and cannot be deleted.", 'error');
      return;
    }
    setConfirmDelete({ ids });
  };

  const handleDeleteRecords = async () => {
    if (!confirmDelete || deletingRecords) return;
    const { ids } = confirmDelete;
    setDeletingRecords(true);
    try {
      const payload = applySheetMapping(
        {
          action: 'delete',
          uuid: sheetSource?.uuid || formUuid,
          matchColumn: 'id',
          values: ids,
        },
        sheetSource
      );
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Delete failed');

      const removed = Number(result.data?.deleted);
      showToast(
        Number.isFinite(removed) && removed > 0
          ? `${removed} record${removed === 1 ? '' : 's'} deleted.`
          : 'Records deleted.',
        'success'
      );
      setConfirmDelete(null);
      setBulkSelection([]);
      setSelectionResetToken((token) => token + 1);
      setSelectedRecord(null);
      setSelectedNavKey((currentKey) =>
        ids.some((id) => `id:${id}` === currentKey) ? null : currentKey
      );
      fetchSubmissions();
    } catch (err) {
      showToast(`Failed to delete records: ${err.message}`, 'error');
    } finally {
      setDeletingRecords(false);
    }
  };

  // Appends one message to a conversation column and saves the whole thread back.
  const handleSendConversationMessage = async (fieldKey, message) => {
    if (!selectedRecord || !String(message || '').trim()) return;
    const recordKey =
      Object.keys(selectedRecord).find((key) => key.toLowerCase() === fieldKey.toLowerCase()) ||
      fieldKey;
    const author = fullName || user?.email || 'Reviewer';
    const thread = [
      ...parseConversation(selectedRecord[recordKey]),
      { sender: author, 'time-stamp': new Date().toLocaleString(), message: String(message).trim() },
    ];

    setSendingConversationKey(recordKey);
    try {
      const payload = applySheetMapping(
        {
          action: 'update',
          uuid: sheetSource?.uuid || formUuid,
          matchColumn: 'id',
          records: [{ matchValue: selectedRecord.id, data: { [recordKey]: JSON.stringify(thread) } }],
        },
        sheetSource
      );
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Message could not be saved');

      const updated = { ...selectedRecord, [recordKey]: JSON.stringify(thread) };
      setSelectedRecord(updated);
      setSubmissions((prev) =>
        prev.map((record) =>
          String(record?.id) === String(selectedRecord.id) ? { ...record, [recordKey]: updated[recordKey] } : record
        )
      );
      showToast('Message sent.', 'success');
    } catch (err) {
      showToast(`Message failed: ${err.message}`, 'error');
    } finally {
      setSendingConversationKey(null);
    }
  };

  // Split view: navigation mirrors the first two currently visible/ordered grid columns
  const navColumns = visibleGridColumns.slice(0, 2);
  const activeNavIndex = submissions.findIndex(
    (record, index) => getRecordKey(record, index) === selectedNavKey
  );
  const activeNavRecord = activeNavIndex >= 0 ? submissions[activeNavIndex] : null;

  // Field metadata comes from the shared dynamic-form semantics
  const fieldLabels = useMemo(() => buildFieldLabelMap(formFields), [formFields]);

  const gridColumnConfig = useMemo(
    () => buildColumnConfig(submissions, fieldLabels),
    [submissions, fieldLabels]
  );

  // All record fields, ordered by the form config so sheet columns that nobody
  // configured (id, email, timestamps…) come last.
  const activeNavDetailFields = useMemo(
    () => orderRecordKeys(activeNavRecord, formFields, excludedDetailColumns),
    [activeNavRecord, excludedDetailColumns, formFields]
  );

  const navCellValue = (record, column) => String(record?.[column] ?? '').trim();

  // Role-gated edit controls: built from "Update Allowed" + the user's portal role
  const selectedRecordEditableControls = selectedRecord
    ? buildEditableControls(selectedRecord)
    : null;
  const activeRecordEditableControls = activeNavRecord
    ? buildEditableControls(activeNavRecord)
    : null;

  // Conversation threads are shown inline in split view instead of behind a detail modal
  const conversationColumns = useMemo(() => getConversationColumns(formFields), [formFields]);

  // Conversation fields of the modal's record, with a composer so a reviewer can reply.
  const selectedRecordConversationFields = useMemo(() => {
    if (!selectedRecord) return [];
    const context = { userRoles, user, fullName, record: selectedRecord, fields: formFields };
    return formFields
      .filter((field) => isConversationField(field) && isFieldEditableByUser(field, context))
      .map((field) => {
        const name = getFieldName(field);
        const recordKey =
          Object.keys(selectedRecord).find((key) => key.toLowerCase() === name.toLowerCase()) ||
          name;
        return {
          key: recordKey,
          label: getFieldLabel(fieldLabels, name),
          value: parseConversation(selectedRecord[recordKey]),
          isSending: sendingConversationKey === recordKey,
          onSendMessage: handleSendConversationMessage,
        };
      });
  }, [
    selectedRecord,
    formFields,
    fieldLabels,
    userRoles,
    user,
    fullName,
    sendingConversationKey,
  ]);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className={splitView ? 'hidden' : ''} aria-hidden={splitView}>
        {canDeleteRecords && bulkSelection.length > 0 && (
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2.5 rounded-2xl border border-red-200 bg-red-50 mb-3"
            data-feature="review-requests-bulk-delete"
          >
            <span className="text-xs font-bold text-red-800">
              <i className="fas fa-square-check mr-1.5" />
              {bulkSelection.length} record{bulkSelection.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkSelection([]);
                  setSelectionResetToken((token) => token + 1);
                }}
                className="px-3 py-1.5 rounded-xl border border-red-200 bg-white text-xs font-bold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => requestDeleteRecords(bulkSelection)}
                disabled={deletingRecords}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <i className="fas fa-trash-alt" />
                Delete selected
              </button>
            </div>
          </div>
        )}
        <DataGrid
          data={submissions}
          loading={loading}
          error={error}
          onRetry={fetchSubmissions}
          onRowClick={handleRowClick}
          excludeColumns={excludedGridColumns}
          columnConfig={gridColumnConfig}
          onColumnsChange={handleGridColumnsChange}
          mobileCardView
          selectable={canDeleteRecords}
          getRowKey={(record, index) => getRecordKey(record, index)}
          onSelectionChange={setBulkSelection}
          selectionResetToken={selectionResetToken}
        />
      </div>

      {splitView && (
        <div className="w-full flex flex-col md:flex-row border-t border-light-border md:min-h-[520px]">
          {/* Left navigation */}
          <aside className="w-full md:w-80 shrink-0 md:border-r border-b md:border-b-0 border-light-border bg-gray-50/60 flex flex-col">
            <div className="px-3 py-2 bg-white border-b border-light-border flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-dark-muted">
                Records
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                {submissions.length}
              </span>
            </div>
            <div className="overflow-y-auto max-h-[40vh] md:max-h-[70vh] divide-y divide-light-border">
              {submissions.map((record, idx) => {
                const recordKey = getRecordKey(record, idx);
                const isActive = recordKey === selectedNavKey;
                return (
                  <button
                    key={recordKey}
                    type="button"
                    onClick={() => setSelectedNavKey(recordKey)}
                    className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer border-l-4 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-600'
                        : 'border-transparent hover:bg-white'
                    }`}
                  >
                    <div
                      className={`text-xs font-extrabold truncate ${
                        isActive ? 'text-indigo-900' : 'text-dark-primary'
                      }`}
                    >
                      {navCellValue(record, navColumns[0]) || `Record #${idx + 1}`}
                    </div>
                    {navColumns[1] && (
                      <div className="text-[11px] font-semibold text-dark-muted truncate mt-0.5">
                        {navCellValue(record, navColumns[1]) || '—'}
                      </div>
                    )}
                  </button>
                );
              })}
              {submissions.length === 0 && !loading && (
                <div className="px-3 py-8 text-center text-[11px] font-semibold text-dark-muted">
                  No records found.
                </div>
              )}
            </div>
          </aside>

          {/* Right detail pane */}
          <section className="flex-1 min-w-0 bg-white">
            {activeNavRecord ? (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-light-border pb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-dark-primary break-words">
                      {navCellValue(activeNavRecord, navColumns[0]) ||
                        `Record #${activeNavIndex + 1}`}
                    </h3>
                    <p className="text-[11px] font-semibold text-dark-muted mt-0.5">
                      Record {activeNavIndex + 1} of {submissions.length}
                    </p>
                  </div>

                  {/* Detail grid column selection */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeRecordEditableControls && (
                      <button
                        type="button"
                        onClick={() => handleRowClick(activeNavRecord)}
                        className="h-8 px-3 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                        title="Update the fields your role is allowed to edit"
                      >
                        <i className="fas fa-pen text-[10px]" />
                        <span className="hidden sm:inline">Update</span>
                      </button>
                    )}
                    {canDeleteRecords && (
                      <button
                        type="button"
                        onClick={() => requestDeleteRecords([activeNavRecord])}
                        disabled={deletingRecords}
                        className="h-8 px-3 rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Delete this record"
                        data-feature="review-requests-delete-record"
                      >
                        <i className="fas fa-trash-alt text-[10px]" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                    <span className="hidden sm:inline text-[10px] font-extrabold uppercase tracking-wider text-dark-muted">
                      Columns
                    </span>
                    <div className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-xl">
                      {[1, 2, 3].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setDetailColumns(count)}
                          aria-pressed={detailColumns === count}
                          className={`w-8 h-7 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                            detailColumns === count
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-dark-muted hover:bg-white'
                          }`}
                          title={`Show data in ${count} column${count > 1 ? 's' : ''}`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className={`grid gap-2.5 ${DETAIL_GRID_CLASS[detailColumns] || DETAIL_GRID_CLASS[2]}`}
                  data-feature="review-request-full-details"
                >
                  {activeNavDetailFields.map((field) => {
                    const raw = String(activeNavRecord[field] ?? '').trim();
                    const isLong = raw.length > 80 || raw.includes('\n');
                    return (
                      <div
                        key={field}
                        className={`min-w-0 rounded-2xl border border-light-border bg-gray-50/50 px-3 py-2 ${
                          isLong && detailColumns > 1 ? 'sm:col-span-2' : ''
                        }`}
                      >
                        <div className="text-[9px] font-extrabold uppercase tracking-wide text-dark-muted break-words">
                          {getFieldLabel(fieldLabels, field)}
                        </div>
                        <div className="text-[11px] font-semibold text-dark-charcoal break-words whitespace-pre-line mt-0.5">
                          {isStatusValue(raw) ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(raw)}`}
                            >
                              {raw}
                            </span>
                          ) : (
                            raw || <span className="text-gray-300 italic">None</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeNavDetailFields.length === 0 && (
                    <div className="col-span-full px-3 py-8 text-center text-[11px] font-semibold text-dark-muted">
                      No detail fields available for this record.
                    </div>
                  )}
                </div>

                {conversationColumns.map((column) => {
                  const messages = parseConversation(activeNavRecord[column]);
                  if (messages.length === 0) return null;
                  return (
                    <div key={column} className="space-y-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-dark-muted flex items-center gap-1.5">
                        <i className="fas fa-comments text-indigo-500" />
                        {column}
                      </div>
                      <div className="border border-light-border rounded-2xl bg-gray-50/50 p-3 max-h-72 overflow-y-auto space-y-2.5">
                        {messages.map((msg, msgIdx) => (
                          <div
                            key={msgIdx}
                            className="rounded-xl bg-white border border-light-border px-3 py-2"
                          >
                            <div className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-700">
                              {msg.sender || 'Reporter'}
                              <span className="text-dark-muted font-semibold normal-case tracking-normal ml-1.5">
                                {msg['time-stamp'] || msg.timestamp || ''}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-dark-charcoal break-words mt-0.5 whitespace-pre-line">
                              {msg.message || ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-dark-muted">
                <i className="fas fa-hand-pointer text-3xl mb-3 text-slate-300" />
                <p className="text-xs font-semibold">
                  Select a record from the list to view details.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          excludeFields={excludedDetailColumns}
          fieldLabels={fieldLabels}
          editableFields={selectedRecordEditableControls}
          onSave={selectedRecordEditableControls ? handleUpdateRecord : undefined}
          onPrevRecord={handlePrevRecord}
          onNextRecord={handleNextRecord}
          hasPrevRecord={hasPrev}
          hasNextRecord={hasNext}
          currentRecordIndex={current}
          totalRecords={total}
          isSaving={savingRecord}
          conversationFields={selectedRecordConversationFields}
          title={title || 'Details'}
        />
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title={confirmDelete?.ids?.length > 1 ? 'Delete Records' : 'Delete Record'}
        message={
          confirmDelete?.ids?.length > 1
            ? `Delete ${confirmDelete.ids.length} records? This removes the rows from the linked Google Sheet and cannot be undone.`
            : `Delete record "${confirmDelete?.ids?.[0] ?? ''}"? This removes the row from the linked Google Sheet and cannot be undone.`
        }
        type="danger"
        confirmText={deletingRecords ? 'Deleting…' : 'Delete'}
        onConfirm={handleDeleteRecords}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default SubmissionsTableView;
