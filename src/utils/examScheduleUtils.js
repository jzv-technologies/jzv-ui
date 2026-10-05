// src/utils/examScheduleUtils.js

/**
 * Safely determines if an exam schedule's progress report is published.
 * Guards against string representations ('true', 'false'), numbers (1, 0),
 * Postgres character booleans ('t', 'f'), and null/undefined.
 *
 * @param {object|null|undefined} schedule
 * @returns {boolean}
 */
export const isScheduleReportPublished = (schedule) => {
  if (!schedule) return false;
  const val = schedule.is_report_published;
  if (
    val === true ||
    val === 'true' ||
    val === 1 ||
    val === '1' ||
    val === 't' ||
    val === 'TRUE' ||
    val === 'True'
  ) {
    return true;
  }
  return false;
};

/**
 * Broadcasts schedule report published status change across current window and other browser tabs/windows.
 *
 * @param {string|number} scheduleId
 * @param {boolean} isPublished
 */
export const broadcastSchedulePublishedChange = (scheduleId, isPublished) => {
  const publishedBool = Boolean(isPublished);

  // 1. Dispatch custom event on current window
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('exam-schedule-published-changed', {
          detail: { scheduleId: String(scheduleId), is_report_published: publishedBool },
        })
      );
    }
  } catch (e) {
    console.warn('Failed to dispatch exam-schedule-published-changed event:', e);
  }

  // 2. Broadcast across other tabs/windows in the browser
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('exam_schedules_sync');
      bc.postMessage({
        type: 'SCHEDULE_PUBLISHED_CHANGED',
        scheduleId: String(scheduleId),
        is_report_published: publishedBool,
      });
      bc.close();
    }
  } catch (e) {
    // BroadcastChannel unsupported or blocked
  }
};
