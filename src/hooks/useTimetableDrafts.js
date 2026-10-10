// src/hooks/useTimetableDrafts.js
/**
 * React Hook for Timetable Draft Management
 * Provides state management and actions for draft system
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getAllDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  deleteDraft,
  publishDraftSafely,
  scheduleDraft,
  cancelScheduledDraft,
  archiveDraft,
  duplicateDraft,
  getFilteredDrafts,
  getDueScheduledDrafts,
  createBackupDraft,
} from '../services/timetableDraftService';
import { compareTimetableData } from '../utils/timetableComparison';

/**
 * Custom hook for managing timetable drafts
 * @param {Object} liveData - Current live timetable data
 * @returns {Object} Draft state and actions
 */
export const useTimetableDrafts = (liveData = null, onScheduledPublish = null) => {
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [filter, setFilter] = useState({
    status: [],
    search: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  // Load drafts on mount and when filter changes
  useEffect(() => {
    const loadDrafts = async () => {
      setIsLoading(true);
      try {
        const loadedDrafts = await getFilteredDrafts(filter);
        setDrafts(loadedDrafts);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadDrafts();
  }, [filter]);

  // Process scheduled drafts periodically. Each due draft is applied to live first and only then
  // marked published, so a failed apply stays scheduled and is retried on the next tick instead of
  // being reported as live.
  // The callback is held in a ref so a new inline arrow cannot reset the interval timer.
  const scheduledPublishRef = useRef(onScheduledPublish);
  useEffect(() => {
    scheduledPublishRef.current = onScheduledPublish;
  }, [onScheduledPublish]);

  useEffect(() => {
    const interval = setInterval(async () => {
      // Without a live writer there is nothing that can safely publish, so leave the drafts due.
      if (typeof scheduledPublishRef.current !== 'function') return;

      const due = await getDueScheduledDrafts();
      if (due.length === 0) return;

      let publishedAny = false;
      for (const draft of due) {
        try {
          await publishDraftSafely(draft.id, async (liveData) => {
            await scheduledPublishRef.current(liveData);
          });
          publishedAny = true;
        } catch (err) {
          setError(`Scheduled publish of "${draft.name}" failed: ${err.message}`);
        }
      }

      if (publishedAny) {
        setDrafts(await getFilteredDrafts(filter));
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [filter]);

  // Memoized stats computed from the already-loaded drafts (kept synchronous so the
  // counters render real values instead of an unresolved promise).
  const stats = useMemo(
    () => ({
      total: drafts.length,
      draft: drafts.filter((d) => d.status === 'draft').length,
      published: drafts.filter((d) => d.status === 'published').length,
      scheduled: drafts.filter((d) => d.status === 'scheduled').length,
      archived: drafts.filter((d) => d.status === 'archived').length,
      latestDraft: drafts[0] || null,
      latestPublished: drafts.find((d) => d.status === 'published') || null,
    }),
    [drafts]
  );

  // Selected draft
  const selectedDraft = useMemo(
    () => (selectedDraftId ? drafts.find((d) => d.id === selectedDraftId) : null),
    [selectedDraftId, drafts]
  );

  // Actions
  const createNewDraft = useCallback(
    async (name, description, parentVersionId = null) => {
      if (!liveData) {
        setError('No live data available to create draft');
        return null;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const newDraft = await createDraft({
          name,
          description,
          data: liveData,
          parentVersionId,
        });
        const loadedDrafts = await getFilteredDrafts(filter);
        setDrafts(loadedDrafts);
        setSelectedDraftId(newDraft.id);
        return newDraft;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [liveData, filter]
  );

  const updateDraftData = useCallback(
      async (draftId, updates) => {
      setIsLoading(true);
      setError(null);
      
      try {
          const updated = await updateDraft(draftId, updates);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          if (selectedDraftId === draftId) {
            setSelectedDraftId(draftId); // Trigger re-render
          }
          return updated;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [filter, selectedDraftId]
    );

    const deleteDraftById = useCallback(
      async (draftId) => {
        setIsLoading(true);
        setError(null);
      
        try {
          const success = await deleteDraft(draftId);
          if (success) {
            const loadedDrafts = await getFilteredDrafts(filter);
            setDrafts(loadedDrafts);
            if (selectedDraftId === draftId) {
              setSelectedDraftId(null);
              setComparisonResult(null);
              setShowComparison(false);
            }
          }
          return success;
        } catch (err) {
          setError(err.message);
          return false;
        } finally {
          setIsLoading(false);
        }
      },
      [filter, selectedDraftId]
    );

    /**
     * Publish a draft to live, in the only safe order: apply to live first, mark published last.
     * Throws on failure so a caller cannot mistake an unapplied draft for a live one.
     * @param {string} draftId
     * @param {(liveData: Object) => Promise<void>} applyToLive
     */
    const publishDraftById = useCallback(
      async (draftId, applyToLive) => {
        setIsLoading(true);
        setError(null);

        try {
          const result = await publishDraftSafely(draftId, applyToLive);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          return result;
        } catch (err) {
          setError(err.message);
          throw err;
        } finally {
          setIsLoading(false);
        }
      },
      [filter]
    );

    const scheduleDraftById = useCallback(
      async (draftId, scheduledAt, notifyUsers = true) => {
        setIsLoading(true);
        setError(null);
      
        try {
          const updated = await scheduleDraft(draftId, scheduledAt, notifyUsers);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          return updated;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [filter]
    );

    const cancelScheduledDraftById = useCallback(
      async (draftId) => {
        setIsLoading(true);
        setError(null);
      
        try {
          const updated = await cancelScheduledDraft(draftId);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          return updated;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [filter]
    );

    const archiveDraftById = useCallback(
      async (draftId) => {
        setIsLoading(true);
        setError(null);
      
        try {
          const updated = await archiveDraft(draftId);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          return updated;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [filter]
    );

    const duplicateDraftById = useCallback(
      async (draftId, newName) => {
        setIsLoading(true);
        setError(null);
      
        try {
          const newDraft = await duplicateDraft(draftId, newName);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          setSelectedDraftId(newDraft.id);
          return newDraft;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [filter]
    );

    const compareWithLive = useCallback(
      async (draftId) => {
        const draft = drafts.find((d) => d.id === draftId);
        if (!draft || !liveData) {
          setError('Draft or live data not available');
          return null;
        }
      
        setIsLoading(true);
        setError(null);
      
        try {
          const result = compareTimetableData(draft.data, liveData);
          setComparisonResult({
            draft,
            liveData,
            ...result,
          });
          setShowComparison(true);
          return result;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [liveData, drafts]
    );

    const createBackup = useCallback(
      async (reason) => {
        if (!liveData) {
          setError('No live data available for backup');
          return null;
        }
      
        setIsLoading(true);
        setError(null);
      
        try {
          const backup = await createBackupDraft(liveData, reason);
          const loadedDrafts = await getFilteredDrafts(filter);
          setDrafts(loadedDrafts);
          return backup;
        } catch (err) {
          setError(err.message);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
      [liveData, filter]
    );

    const clearError = useCallback(() => setError(null), []);

    const clearComparison = useCallback(() => {
      setComparisonResult(null);
      setShowComparison(false);
    }, []);

    const selectDraft = useCallback((draftId) => {
      setSelectedDraftId(draftId);
      setComparisonResult(null);
      setShowComparison(false);
    }, []);

    return {
      // State
      drafts,
      allDrafts: drafts,
      selectedDraft,
      selectedDraftId,
      comparisonResult,
      showComparison,
      filter,
      stats,
      isLoading,
      error,
    
      // Actions
      createDraft: createNewDraft,
      updateDraft: updateDraftData,
      deleteDraft: deleteDraftById,
      publishDraft: publishDraftById,
      scheduleDraft: scheduleDraftById,
      cancelScheduledDraft: cancelScheduledDraftById,
      archiveDraft: archiveDraftById,
      duplicateDraft: duplicateDraftById,
      compareWithLive,
      createBackup,
      setFilter,
      setSelectedDraftId: selectDraft,
      setShowComparison,
      clearError,
      clearComparison,
    };
  };

export default useTimetableDrafts;