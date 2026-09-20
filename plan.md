---
## Plan: Exam Schedule, Results Entry, Dashboard & Role System Enhancements

### TL;DR
This plan covers 10 major requirement areas across Exam Schedule (Teacher View, Scheduler, Notice Board Print, Parent Portal), Exam Results Entry (Results Entry redesign, Progress Report), Dashboard (Weekly Book Progress Trend), and General improvements (Role Hierarchy, Cache, Network Calls). The implementation will leverage existing components like MultiSelectDropdown, ConditionalBlock, and the app_view_controller system.
---

### Phase 1: Exam Schedule Enhancements

#### 1.1 Teacher View - Multi-Teacher Selection & Multi-Table Display

**Files to modify:**

- `ExamTeacherView.jsx` - Main component
- `ExamScheduleManager.jsx` - Parent component

**Changes:**

- Replace single `<select>` with `MultiSelectDropdown` for teacher selection
- Add "All" option to select all teachers
- Modify rendering logic to display multiple tables (one per selected teacher)
- Update `selectedTeacherId` state to `selectedTeacherIds` (array)

#### 1.2 Scheduler - Default to All Classes & MultiSelectDropdown

**Files to modify:**

- `ExamSchedulerGrid.jsx`

**Changes:**

- Change default `viewMode` from `'single'` to `'all'`
- Swap button order: "All Classes" first, then "Selected Class"
- Remove "Class:" label before dropdown
- Replace single `<select>` with `MultiSelectDropdown` for class selection
- Update `selectedClassId` to `selectedClassIds` (array)

#### 1.3 Notice Board Print - MultiSelectDropdown, Top Bar, Gear Icon Config

**Files to modify:**

- `ExamNoticeBoardPrint.jsx`

**Changes:**

- Replace custom class dropdown with `MultiSelectDropdown`
- Move view mode tabs and filters to top bar above selection controls (left-aligned)
- Add gear icon next to Print button with configuration modal
- Config options: header color, font size, row height, border, banded row/column, column width, font colors, Header Text, Header Image
- Save config to `admin_configuration` table with key `exam_notice_board_config`
- Apply saved config to all rendered tables

#### 1.4 Parent Portal - Ward Exam Timetable

**Files to modify:**

- `ParentExamTimetableView.jsx` - Verify registration
- `UnifiedPortal.jsx` - Ensure parent role gets the tile

**Changes:**

- Verify `ParentExamTimetableView` is registered in `app_view_controller` for parent role
- Add "Ward Exam Timetable" tile in parent portal

---

### Phase 2: Exam Results Entry Redesign

#### 2.1 Results Entry - Extended Access & Multi-Subject Entry

**Files to modify:**

- `ExamResultsManager.jsx`
- `ExamResultsEntryGrid.jsx`
- Database: `exam_results`, `exam_result_entries`, `exam_schedule_slots`

**Changes:**

- **Access Control**: Allow subject teacher (assigned in `exam_schedule_slots`) to edit marks
- **Subject Selection**: Replace left nav with `MultiSelectDropdown` loaded by class, allow multiple
- **Entry Grid**: Accept array of results, render columns per subject, editable only for authorized users
- **Max Marks**: Verify configurable per subject (already in `exam_results.max_marks`)

#### 2.2 Progress Report - Generation & Template Designer

**Files to create:**

- `src/components/examinations/ProgressReportGenerator.jsx`
- `src/components/examinations/ProgressReportDesigner.jsx` (drag-drop with `dnd-kit`)
- `src/components/examinations/ProgressReportPreview.jsx`
- Database: New table `exam_progress_report_templates`

**Changes:**

- Report generation by exam/class/students
- Drag-drop template designer (Text, Image, Table, Chart, Graph, PDF)
- Charts/graphs via `recharts` (existing dependency)
- Calculations: averages, pass/fail, percentages
- Subject grouping with custom names (not auto-guessed)

---

### Phase 3: Dashboard Enhancement

#### 3.1 Weekly Book Progress Trend - MultiSelectDropdown for Books

**Files to modify:**

- `ProgressTrendChart.jsx`

**Changes:**

- Replace book `<select>` with `MultiSelectDropdown`
- Allow "All", multiple, single selection
- Update chart to show multiple books

---

### Phase 4: General System Improvements

#### 4.1 Role Hierarchy - Centralized Priority System

**Files to modify:**

- `roleUtils.js` - Add centralized hierarchy logic
- `useAuth.js` - Use new hierarchy
- `ConditionalBlock.jsx` - Update to use centralized check
- All components with role checks - Refactor

**Changes:**

- Priority order: `['admin', 'management', 'teacher', 'staff', 'custom', 'parent', 'guest']`
- `getEffectiveRole(userRoles)` - returns highest priority role
- `checkFeatureAccess(feature, userRoles)` - falls through priority levels
- Replace all inline role checks with centralized utilities

#### 4.2 Cache - Auto Update on Deployment

**Files to modify:**

- `supabase.js` or new cache utility
- `vite.config.js` - Add cache busting
- `index.html` - Add version meta tag

**Changes:**

- Version-based cache busting with build timestamp
- On load, check version vs stored version
- If different, clear all caches and force reload

#### 4.3 Network Calls - Prevent Duplicate on Page Activation

**Files to modify:**

- `supabase.js` - Request deduplication
- `useAuth.js` - Check for duplicate fetches
- Components with data fetching - Proper dependency arrays

**Changes:**

- Request deduplication in supabase wrapper
- `AbortController` for stale requests
- `stale-while-revalidate` pattern

---

### Verification Steps

| #   | Feature         | Verification                                                     |
| --- | --------------- | ---------------------------------------------------------------- |
| 1   | Teacher View    | Multi-teacher selection → multiple tables; "All" works           |
| 2   | Scheduler       | Default "All Classes"; MultiSelectDropdown for classes           |
| 3   | Notice Board    | MultiSelectDropdown, top bar layout, gear config saves & applies |
| 4   | Parent Portal   | "Ward Exam Timetable" tile visible & functional                  |
| 5   | Results Entry   | Subject teacher access; multi-subject grid; column permissions   |
| 6   | Progress Report | Generate, design (drag-drop), charts, calculations, grouping     |
| 7   | Dashboard       | Book MultiSelectDropdown; multi-book chart                       |
| 8   | Role Hierarchy  | Fallback through priority levels works                           |
| 9   | Cache           | New deployment auto-clears cache                                 |
| 10  | Network Calls   | No duplicate calls on browser focus                              |

---

### Decisions & Assumptions

1. **Progress Report Designer**: Use `dnd-kit` (lightweight, accessible)
2. **Charts**: Use existing `recharts` dependency
3. **Database Changes**: Minimal - `admin_configuration` for notice board, `exam_progress_report_templates` for reports
4. **Role Hierarchy**: Custom roles between staff and parent
5. **Cache Busting**: Vite hash-based assets + custom version check
6. **Request Deduplication**: In supabase wrapper (no React Query dependency)

---

### Further Considerations

1. **Progress Report PDF Export**: Start with print-to-PDF, add jsPDF later if needed
2. **Subject Grouping Storage**: Store in template config JSON for simplicity
3. **Real-time Updates**: Add Supabase realtime in Phase 2 if needed
4. **Notice Board Config UI**: Simple form first (color pickers, number inputs), enhance later

---

The full detailed plan is saved at `/memories/session/plan.md`. Would you like me to clarify any specific area or adjust the plan before proceeding?
