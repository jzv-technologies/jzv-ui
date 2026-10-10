// src/types/timetable-draft.js
/**
 * TypeScript types for Timetable Draft System
 * Defines the structure for draft versions, comparisons, and scheduling
 */

// Core timetable data structure (matches existing TimetableManager state)
export const TimetableDataSchema = {
  classifications: 'array',
  subjects: 'array',
  teachers: 'array',
  classes: 'array',
  periods: 'array',
  assignments: 'array',
  slots: 'array',
  seasonsConfig: 'object',
};

/**
 * Draft version status
 * @typedef {'draft' | 'published' | 'scheduled' | 'archived'} DraftStatus
 */

/**
 * Draft version object
 * @typedef {Object} TimetableDraft
 * @property {string} id - Unique identifier
 * @property {string} name - Human-readable name
 * @property {string} description - Optional description
 * @property {Object} data - Complete timetable data snapshot
 * @property {DraftStatus} status - Current status
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {string} createdBy - User ID who created
 * @property {string} parentVersionId - ID of version this was based on
 * @property {string} scheduledAt - ISO timestamp for scheduled publication (optional)
 * @property {number} versionNumber - Sequential version number
 */

/**
 * Comparison diff result
 * @typedef {Object} ComparisonDiff
 * @property {string} type - 'added' | 'removed' | 'modified'
 * @property {string} entity - 'slots' | 'assignments' | 'periods' | 'teachers' | 'classes' | 'subjects'
 * @property {string} key - Unique key for the item
 * @property {Object} oldValue - Previous value (for modified/removed)
 * @property {Object} newValue - New value (for added/modified)
 * @property {string} description - Human-readable description
 */

/**
 * Side-by-side comparison result
 * @typedef {Object} ComparisonResult
 * @property {TimetableDraft} draft - Draft version
 * @property {Object} liveData - Current live data
 * @property {ComparisonDiff[]} diffs - Array of differences
 * @property {Object} summary - Summary counts { added, removed, modified }
 */

/**
 * Schedule configuration
 * @typedef {Object} ScheduleConfig
 * @property {string} draftId - ID of draft to schedule
 * @property {string} scheduledAt - ISO timestamp for publication
 * @property {boolean} notifyUsers - Whether to notify affected users
 */

/**
 * Rollback configuration
 * @typedef {Object} RollbackConfig
 * @property {string} targetVersionId - Version to rollback to
 * @property {boolean} createBackup - Whether to backup current state before rollback
 */

/**
 * Draft filter options
 * @typedef {Object} DraftFilter
 * @property {DraftStatus[]} status - Filter by status
 * @property {string} search - Search term for name/description
 * @property {string} sortBy - 'createdAt' | 'updatedAt' | 'name' | 'versionNumber'
 * @property {string} sortOrder - 'asc' | 'desc'
 */

/**
 * Draft list item (lightweight for list views)
 * @typedef {Object} DraftListItem
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {DraftStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} versionNumber
 * @property {string} scheduledAt
 */

export default {
  TimetableDataSchema,
};