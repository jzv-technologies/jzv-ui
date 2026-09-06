// src/components/portal-shared/SubmissionsTableView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataGrid from '../DataGrid';
import DetailModal from '../DetailModal';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export const SubmissionsTableView = ({ formUuid, title, user, fullName, userRoles = [] }) => {
  const [submissions, setSubmissions] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingRecord, setSavingRecord] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    if (!formUuid) return;
    setLoading(true);
    setError('');
    setSubmissions([]);
    setFormFields([]);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=search`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'search',
          uuid: formUuid,
          criteria: {},
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSubmissions(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch submissions');
      }

      // Fetch dynamic form configs for fields and permissions
      const { data: configData, error: configError } = await supabase
        .from('dynamic_form_configs')
        .select('fields')
        .eq('form_name', formUuid);
      if (!configError && configData && configData.length > 0) {
        const fieldsField = configData[0].fields;
        const parsedFields =
          typeof fieldsField === 'string' ? JSON.parse(fieldsField) : fieldsField;
        setFormFields(parsedFields || []);
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

  const getExcludedGridColumns = useCallback(() => {
    const baseExcludes = ['uuid'];
    formFields.forEach((field) => {
      const fieldName = field['Field Name']?.trim();
      if (fieldName) {
        const displayIn = field['Screen'];
        if (displayIn !== undefined && displayIn !== null && displayIn !== '') {
          const options = String(displayIn)
            .split(',')
            .map((s) => s.trim().toLowerCase());
          if (options.length > 0 && !options.includes('data grid')) {
            baseExcludes.push(fieldName);
            return;
          }
        }
        const visibility = field['Field Visibility'];
        if (visibility !== undefined && visibility !== null && visibility !== '') {
          const allowed = String(visibility)
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          if (allowed.length > 0) {
            let hasAccess = false;
            if (allowed.includes('all')) {
              hasAccess = true;
            } else if (allowed.includes('none')) {
              hasAccess = false;
            } else {
              const userRolesLower = (userRoles || []).map((r) => r.toLowerCase());
              hasAccess =
                userRolesLower.some((r) => allowed.includes(r)) || allowed.includes('reviewer');
            }
            if (!hasAccess) {
              baseExcludes.push(fieldName);
            }
          }
        }
      }
    });
    return baseExcludes;
  }, [formFields, userRoles]);

  const getExcludedDetailFields = useCallback(() => {
    const baseExcludes = ['uuid'];
    formFields.forEach((field) => {
      const fieldName = field['Field Name']?.trim();
      if (fieldName) {
        const type = field['Field Type']?.trim().toLowerCase();
        if (type === 'conversation' || fieldName.toLowerCase() === 'conversation') {
          baseExcludes.push(fieldName);
          return;
        }
        const displayIn = field['Screen'];
        if (displayIn !== undefined && displayIn !== null && displayIn !== '') {
          const options = String(displayIn)
            .split(',')
            .map((s) => s.trim().toLowerCase());
          if (options.length > 0 && !options.includes('detail view')) {
            baseExcludes.push(fieldName);
            return;
          }
        }
        const visibility = field['Field Visibility'];
        if (visibility !== undefined && visibility !== null && visibility !== '') {
          const allowed = String(visibility)
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          if (allowed.length > 0) {
            let hasAccess = false;
            if (allowed.includes('all')) {
              hasAccess = true;
            } else if (allowed.includes('none')) {
              hasAccess = false;
            } else {
              const userRolesLower = (userRoles || []).map((r) => r.toLowerCase());
              hasAccess =
                userRolesLower.some((r) => allowed.includes(r)) || allowed.includes('reviewer');
            }
            if (!hasAccess) {
              baseExcludes.push(fieldName);
            }
          }
        }
      }
    });
    return baseExcludes;
  }, [formFields, userRoles]);

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

  const handleUpdateRecord = async () => {
    if (!selectedRecord?.id) {
      showToast("Error: Record does not have an 'id' field.", 'error');
      return;
    }

    const statusField = formFields.find(
      (f) =>
        f['Field Type']?.trim().toLowerCase() === 'status' ||
        f['Field Name']?.trim().toLowerCase() === 'status'
    );
    const statusFieldName = statusField ? statusField['Field Name']?.trim() : 'status';
    const statusKey =
      Object.keys(selectedRecord).find((k) => k.toLowerCase() === statusFieldName.toLowerCase()) ||
      statusFieldName;
    const resolutionKey =
      Object.keys(selectedRecord).find((k) => k.toLowerCase() === 'resolution') || 'resolution';

    const finalStatus =
      editFormData[statusKey] !== undefined
        ? editFormData[statusKey]
        : selectedRecord[statusKey] || 'New';
    const finalResolution =
      editFormData[resolutionKey] !== undefined
        ? editFormData[resolutionKey]
        : selectedRecord[resolutionKey] || '';

    if (finalStatus === 'Resolved' && !finalResolution.trim()) {
      showToast('Resolution is required when status is marked as Resolved.', 'error');
      return;
    }

    setSavingRecord(true);
    try {
      const updateData = {
        [statusKey]: finalStatus,
        [resolutionKey]: finalStatus === 'Resolved' ? finalResolution : '',
      };

      if (finalStatus === 'Resolved') {
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

      formFields.forEach((field) => {
        const key = field['Field Name']?.trim();
        const type = field['Field Type']?.trim().toLowerCase();
        if (
          key &&
          type !== 'conversation' &&
          key.toLowerCase() !== statusKey.toLowerCase() &&
          key.toLowerCase() !== resolutionKey.toLowerCase() &&
          !getExcludedDetailFields().includes(key)
        ) {
          updateData[key] =
            editFormData[key] !== undefined ? editFormData[key] : (selectedRecord[key] ?? '');
        }
      });

      const updatePayload = {
        action: 'update',
        uuid: formUuid,
        matchColumn: 'id',
        records: [
          {
            matchValue: selectedRecord.id,
            data: updateData,
          },
        ],
      };

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

  return (
    <div className="w-full">
      <DataGrid
        data={submissions}
        loading={loading}
        error={error}
        onRetry={fetchSubmissions}
        onRowClick={handleRowClick}
        excludeColumns={getExcludedGridColumns()}
      />

      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          excludeFields={getExcludedDetailFields()}
          onSave={handleUpdateRecord}
          onPrevRecord={handlePrevRecord}
          onNextRecord={handleNextRecord}
          hasPrevRecord={hasPrev}
          hasNextRecord={hasNext}
          currentRecordIndex={current}
          totalRecords={total}
          isSaving={savingRecord}
          title={title || 'Details'}
        />
      )}
    </div>
  );
};

export default SubmissionsTableView;
