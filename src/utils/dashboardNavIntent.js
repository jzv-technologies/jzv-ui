/**
 * Module-level navigation intent store.
 * Used to pass pre-filter data from the Dashboard tile to the
 * Lesson Planner & Tracker tile without prop-drilling through AppRoutes.
 *
 * Usage:
 *   // Writer (e.g. Dashboard on heatmap cell click):
 *   setNavIntent({ classId: '12', bookId: '5', tab: 'class-progress' });
 *
 *   // Reader (e.g. SyllabusTrackerPortal on mount):
 *   const intent = consumeNavIntent();
 *   if (intent) { apply filters ... }
 */

let _intent = null;

export const setNavIntent = (intent) => {
  _intent = intent;
};

/** Returns and clears the stored intent (one-shot read). */
export const consumeNavIntent = () => {
  const intent = _intent;
  _intent = null;
  return intent;
};
