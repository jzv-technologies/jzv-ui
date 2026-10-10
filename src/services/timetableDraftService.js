// src/services/timetableDraftService.js
/**
 * Timetable Draft Service
 * Handles CRUD operations for timetable drafts using Supabase admin_configuration table
 * Key format: timetable_draft_{draftId}
 *
 * Drafts are keyed by their IMMUTABLE id, never by name. Keying by name meant a rename wrote
 * a second row and orphaned the original, which surfaced as a duplicate draft sharing the same
 * version number. Rows left behind by the old name-based scheme are re-keyed and purged on read.
 */

import { supabase } from '../utils/supabase';

/**
 * Generate a unique ID
 * @returns {string}
 */
const generateId = () => {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current user ID (placeholder - integrate with auth system)
 * @returns {string}
 */
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('jzv_user') || '{}');
    return user.id || user.email || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

const DRAFT_KEY_PREFIX = 'timetable_draft_';

const sanitizeKeyPart = (value) => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');

/**
 * Canonical storage key for a draft, derived from its immutable id.
 * @param {Object|string} draftOrId - Draft object or draft id
 * @returns {string} Key in format timetable_draft_{id}
 */
const getDraftKey = (draftOrId) => {
  const id = typeof draftOrId === 'object' && draftOrId !== null ? draftOrId.id : draftOrId;
  return `${DRAFT_KEY_PREFIX}${sanitizeKeyPart(id)}`;
};

/**
 * Legacy storage key derived from the draft name. Only used to clean up rows written by the
 * old name-based scheme.
 * @param {string} draftName - Draft name
 * @returns {string} Key in format timetable_draft_{name}
 */
const getLegacyDraftKey = (draftName) => `${DRAFT_KEY_PREFIX}${sanitizeKeyPart(draftName)}`;

/**
 * Parse a config row into a draft, returning null for rows that are not drafts.
 * @param {Object} row - Row with key/val
 * @returns {Object|null}
 */
const parseDraftRow = (row) => {
  try {
    const draft = typeof row.val === 'string' ? JSON.parse(row.val) : row.val;
    return draft && draft.id ? draft : null;
  } catch {
    return null;
  }
};

/**
 * Get all drafts from localStorage (fallback)
 * @returns {Array} Array of draft objects
 */
const getAllDraftsLocal = () => {
  try {
    const raw = localStorage.getItem('jzv_timetable_drafts');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load drafts from localStorage:', err);
    return [];
  }
};

/**
 * Save drafts to localStorage (fallback)
 * @param {Array} drafts - Array of draft objects
 */
const saveAllDraftsLocal = (drafts) => {
  try {
    localStorage.setItem('jzv_timetable_drafts', JSON.stringify(drafts));
  } catch (err) {
    console.error('Failed to save drafts to localStorage:', err);
  }
};

/**
 * Get all drafts from Supabase admin_configuration
 * @returns {Promise<Array>} Array of draft objects
 */
export const getAllDrafts = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_configruation')
      .select('key, val')
      .like('key', `${DRAFT_KEY_PREFIX}%`);

    if (error) throw error;

    const byId = new Map();
    const staleKeys = [];

    (data || []).forEach((row) => {
      const draft = parseDraftRow(row);
      if (!draft) return;

      const canonicalKey = getDraftKey(draft);
      const isCanonical = row.key === canonicalKey;
      const existing = byId.get(draft.id);

      if (!existing) {
        byId.set(draft.id, { draft, key: row.key, isCanonical });
      } else if (isCanonical && !existing.isCanonical) {
        // Same draft stored twice: keep the canonical row, drop the other.
        staleKeys.push(existing.key);
        byId.set(draft.id, { draft, key: row.key, isCanonical });
      } else {
        staleKeys.push(row.key);
      }
    });

    const entries = [...byId.values()];

    // Re-key rows written under the old name-based scheme BEFORE removing anything, so a draft
    // that only exists under a legacy key is never lost.
    const needsMigration = entries.filter((e) => !e.isCanonical);
    if (needsMigration.length > 0) {
      const { error: migrateErr } = await supabase
        .from('admin_configruation')
        .upsert(
          needsMigration.map((e) => ({ key: getDraftKey(e.draft), val: e.draft })),
          { onConflict: 'key' }
        );
      if (migrateErr) {
        console.error('Failed to migrate legacy draft rows:', migrateErr.message);
      } else {
        needsMigration.forEach((e) => staleKeys.push(e.key));
      }
    }

    const keysToPurge = [...new Set(staleKeys)];
    if (keysToPurge.length > 0) {
      const { error: purgeErr } = await supabase
        .from('admin_configruation')
        .delete()
        .in('key', keysToPurge);
      if (purgeErr) {
        console.warn('Failed to purge stale draft rows:', purgeErr.message);
      }
    }

    return entries
      .map((e) => e.draft)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (err) {
    console.error('Failed to load drafts from Supabase:', err);
    // Fallback to localStorage for offline mode
    return getAllDraftsLocal();
  }
};

/**
 * Save draft to Supabase admin_configuration under its canonical id key.
 * @param {Object} draft - Draft object
 * @returns {Promise<boolean>}
 */
const saveDraftToSupabase = async (draft) => {
  try {
    const key = getDraftKey(draft);
    const { error } = await supabase
      .from('admin_configruation')
      .upsert({ key, val: draft }, { onConflict: 'key' });

    if (error) throw error;

    // Drop any row left behind under the old name-based key. This is what previously made a
    // rename look like it created a second draft.
    const legacyKey = getLegacyDraftKey(draft.name);
    if (legacyKey !== key) {
      const { error: cleanupErr } = await supabase
        .from('admin_configruation')
        .delete()
        .eq('key', legacyKey);
      if (cleanupErr) {
        console.warn('Failed to remove legacy draft row:', cleanupErr.message);
      }
    }

    return true;
  } catch (err) {
    console.error('Failed to save draft to Supabase:', err);
    return false;
  }
};

/**
 * Delete draft from Supabase, removing both the canonical id key and any legacy name key.
 * @param {Object} draft - Draft object
 * @returns {Promise<boolean>}
 */
const deleteDraftFromSupabase = async (draft) => {
  try {
    const keys = [...new Set([getDraftKey(draft), getLegacyDraftKey(draft.name)])];
    const { error } = await supabase
      .from('admin_configruation')
      .delete()
      .in('key', keys);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete draft from Supabase:', err);
    return false;
  }
};

/**
 * Create a new draft from current timetable data
 * @param {Object} params - Draft creation parameters
 * @param {string} params.name - Draft name
 * @param {string} params.description - Draft description
 * @param {Object} params.data - Complete timetable data snapshot
 * @param {string} params.parentVersionId - Optional parent version ID
 * @returns {Promise<Object>} Created draft
 */
export const createDraft = async ({ name, description = '', data, parentVersionId = null }) => {
  const newDraft = {
    id: generateId(),
    name,
    description,
    data: JSON.parse(JSON.stringify(data)), // Deep clone
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: getCurrentUserId(),
    parentVersionId,
    scheduledAt: null,
    versionNumber: Date.now(), // Use timestamp as version
  };
  
  // Save to Supabase
  const saved = await saveDraftToSupabase(newDraft);
  if (!saved) {
    // Fallback to localStorage
    const drafts = getAllDraftsLocal();
    drafts.unshift(newDraft);
    saveAllDraftsLocal(drafts);
  }
  
  return newDraft;
};

/**
 * Get a draft by ID
 * @param {string} draftId - Draft ID
 * @returns {Promise<Object|null>} Draft object or null if not found
 */
export const getDraftById = async (draftId) => {
  const drafts = await getAllDrafts();
  return drafts.find((d) => d.id === draftId) || null;
};

/**
 * Update a draft
 * @param {string} draftId - Draft ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated draft or null if not found
 */
export const updateDraft = async (draftId, updates) => {
  const drafts = await getAllDrafts();
  const index = drafts.findIndex((d) => d.id === draftId);
  
  if (index === -1) return null;
  
  const updatedDraft = {
    ...drafts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    // Prevent changing certain fields
    id: drafts[index].id,
    createdAt: drafts[index].createdAt,
    createdBy: drafts[index].createdBy,
    versionNumber: drafts[index].versionNumber,
  };
  
  // Save to Supabase
  const saved = await saveDraftToSupabase(updatedDraft);
  if (!saved) {
    // Fallback to localStorage
    drafts[index] = updatedDraft;
    saveAllDraftsLocal(drafts);
  }
  
  return updatedDraft;
};

/**
 * Delete a draft
 * @param {string} draftId - Draft ID
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteDraft = async (draftId) => {
  const drafts = await getAllDrafts();
  const draft = drafts.find((d) => d.id === draftId);
  
  if (!draft) return false;
  
  // Delete from Supabase (removes the id key and any legacy name key)
  const deleted = await deleteDraftFromSupabase(draft);
  if (!deleted) {
    // Fallback to localStorage
    const filtered = drafts.filter((d) => d.id !== draftId);
    saveAllDraftsLocal(filtered);
  }
  
  return true;
};

/**
 * Mark a draft as the published version.
 *
 * Only called once the draft's data is actually live. Marking it earlier is what made the draft
 * list claim a version was live when the write had in fact been refused.
 *
 * @param {string} draftId - Draft ID
 * @returns {Promise<Object|null>} Updated draft or null if not found
 */
export const markDraftAsPublished = async (draftId) => {
  const drafts = await getAllDrafts();
  if (!drafts.some((d) => d.id === draftId)) return null;

  const updated = await updateDraft(draftId, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  });

  // Only one version can be live at a time, so any other draft still flagged as published is not
  // live any more. publishedAt is kept, so the history stays visible in the version list.
  for (const other of drafts.filter((d) => d.id !== draftId && d.status === 'published')) {
    await updateDraft(other.id, { status: 'draft' });
  }

  return updated;
};

/**
 * Publish a draft in the only safe order: read its data, apply it to live, and mark it published
 * LAST. If applying fails, the draft keeps its previous status, so the UI never reports a version
 * as live when it is not.
 *
 * @param {string} draftId - Draft ID
 * @param {(liveData: Object) => Promise<void>} applyToLive - Writes the data to live; must throw on failure
 * @returns {Promise<Object>} Published draft with live data
 */
export const publishDraftSafely = async (draftId, applyToLive) => {
  if (typeof applyToLive !== 'function') {
    throw new Error('publishDraftSafely requires an applyToLive callback');
  }

  const draft = await getDraftById(draftId);
  if (!draft) throw new Error('Draft not found');

  await applyToLive(draft.data);

  const updated = await markDraftAsPublished(draftId);
  return { ...(updated || draft), liveData: draft.data };
};

/**
 * Schedule a draft for future publication
 * @param {string} draftId - Draft ID
 * @param {string} scheduledAt - ISO timestamp for publication
 * @param {boolean} notifyUsers - Whether to notify users
 * @returns {Promise<Object>} Updated draft
 */
export const scheduleDraft = async (draftId, scheduledAt, notifyUsers = true) => {
  const draft = await getDraftById(draftId);
  if (!draft) throw new Error('Draft not found');
  
  if (new Date(scheduledAt) <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }
  
  return updateDraft(draftId, {
    status: 'scheduled',
    scheduledAt,
    notifyUsers,
  });
};

/**
 * Cancel a scheduled draft
 * @param {string} draftId - Draft ID
 * @returns {Promise<Object>} Updated draft
 */
export const cancelScheduledDraft = async (draftId) => {
  return updateDraft(draftId, {
    status: 'draft',
    scheduledAt: null,
    notifyUsers: false,
  });
};

/**
 * Archive a draft
 * @param {string} draftId - Draft ID
 * @returns {Promise<Object>} Updated draft
 */
export const archiveDraft = async (draftId) => {
  return updateDraft(draftId, { status: 'archived' });
};

/**
 * Duplicate a draft
 * @param {string} draftId - Draft ID to duplicate
 * @param {string} newName - Name for the duplicate
 * @returns {Promise<Object>} New draft
 */
export const duplicateDraft = async (draftId, newName) => {
  const draft = await getDraftById(draftId);
  if (!draft) throw new Error('Draft not found');
  
  return createDraft({
    name: newName || `${draft.name} (Copy)`,
    description: draft.description,
    data: draft.data,
    parentVersionId: draft.id,
  });
};

/**
 * Get drafts with filtering and sorting
 * @param {Object} filter - Filter options
 * @returns {Promise<Array>} Filtered and sorted drafts
 */
export const getFilteredDrafts = async (filter = {}) => {
  let drafts = await getAllDrafts();
  
  // Filter by status
  if (filter.status && filter.status.length > 0) {
    drafts = drafts.filter((d) => filter.status.includes(d.status));
  }
  
  // Filter by search term
  if (filter.search) {
    const term = filter.search.toLowerCase();
    drafts = drafts.filter(
      (d) => d.name.toLowerCase().includes(term) || 
             d.description.toLowerCase().includes(term)
    );
  }
  
  // Sort
  const sortBy = filter.sortBy || 'updatedAt';
  const sortOrder = filter.sortOrder || 'desc';
  
  drafts.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'scheduledAt') {
      valA = new Date(valA || 0).getTime();
      valB = new Date(valB || 0).getTime();
    } else if (sortBy === 'versionNumber') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    }
    return valA < valB ? 1 : -1;
  });
  
  return drafts;
};

/**
 * Get draft statistics
 * @returns {Promise<Object>} Statistics object
 */
export const getDraftStats = async () => {
  const drafts = await getAllDrafts();
  
  return {
    total: drafts.length,
    draft: drafts.filter((d) => d.status === 'draft').length,
    published: drafts.filter((d) => d.status === 'published').length,
    scheduled: drafts.filter((d) => d.status === 'scheduled').length,
    archived: drafts.filter((d) => d.status === 'archived').length,
    latestDraft: drafts[0] || null,
    latestPublished: drafts.find((d) => d.status === 'published') || null,
  };
};

/**
 * Check for scheduled drafts that should be published
 * @returns {Promise<Array>} Array of drafts ready for publication
 */
export const getDueScheduledDrafts = async () => {
  const drafts = await getAllDrafts();
  const now = new Date();
  
  return drafts.filter(
    (d) => d.status === 'scheduled' && d.scheduledAt && new Date(d.scheduledAt) <= now
  );
};

/**
 * Create a backup of current live data as a draft
 * @param {Object} liveData - Current live timetable data
 * @param {string} reason - Reason for backup
 * @returns {Promise<Object>} Created backup draft
 */
export const createBackupDraft = async (liveData, reason = 'Auto-backup before changes') => {
  const timestamp = new Date().toLocaleString();
  return createDraft({
    name: `Backup ${timestamp}`,
    description: reason,
    data: liveData,
  });
};

export default {
  getAllDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  deleteDraft,
  publishDraftSafely,
  markDraftAsPublished,
  scheduleDraft,
  cancelScheduledDraft,
  archiveDraft,
  duplicateDraft,
  getFilteredDrafts,
  getDraftStats,
  getDueScheduledDrafts,
  createBackupDraft,
};