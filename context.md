# jzv-ui Repository Context

## Overview

A React + Vite single-page application for **Jamia Zaytoonah Vellore**, an Islamic educational institution. The app serves a dual purpose:

1. **Public Website** — a rich homepage showcasing the institution's programs, admissions, campus life, careers, policies, gallery, and contact information via an interactive card-grid with tabbed modal groups.
2. **Role-Based Portals** — dedicated dashboards for **Admin**, **Management**, **Teacher**, **Parent**, **Candidate**, and **Reporter** roles, each exposing context-specific tools and data views.

Hosted at [https://jzv.mrqu.in](https://jzv.mrqu.in) via GitHub Pages.

---

## Key Technologies

| Layer                | Technology                  | Version |
| -------------------- | --------------------------- | ------- |
| UI Framework         | React                       | 18.3    |
| Build Tool           | Vite                        | 5.4     |
| CSS                  | Tailwind CSS                | 3.4     |
| Routing              | React Router DOM            | 7.15    |
| Backend-as-a-Service | Supabase (JS client)        | 2.105   |
| Animations           | AOS (Animate On Scroll)     | 2.3     |
| Spreadsheet I/O      | xlsx (SheetJS)              | 0.18    |
| Icons                | Font Awesome + Lucide React | —       |
| Deployment           | gh-pages                    | 6.3     |

---

## Architecture Summary

```
src/main.jsx → BrowserRouter → App.jsx
                                  ├── useAuth()          (auth/session/role state)
                                  ├── useGoogleTranslate() (i18n widget)
                                  ├── useModal()          (cards/modal state)
                                  ├── Header              (navigation, login, student switching)
                                  ├── AppRoutes           (route definitions + role guards)
                                  │     ├── HomeGrid      (public card grid)
                                  │     ├── RoleSelectionDashboard
                                  │     ├── AdminPortal → admin subviews
                                  │     ├── ManagementPortal → management subviews
                                  │     ├── RolePortal (teacher) → teacher subviews
                                  │     ├── RolePortal (parent) → parent subviews
                                  │     ├── CandidatePortal → take-test subview
                                  │     └── /career (standalone DynamicForm route)
                                  ├── LoginPortal         (auth modal)
                                  └── ModalContainer      (tabbed/accordion content modals)
```

---

## Entry Points

- `src/main.jsx` — application bootstrap, wraps `<App />` in `BrowserRouter`
- `src/App.jsx` — top-level container; coordinates auth, modals, routing, and header
- `src/components/AppRoutes.jsx` — route definitions, role-based guards, portal rendering

---

## Feature Documentation

### 1. Public Homepage

The homepage renders a responsive card grid (`HomeGrid`) with interactive cards that open full-screen modals or tabbed modal groups.

**Card Groups (tabbed within a modal):**
| Group | Tab Cards |
|-------|-----------|
| About Us | Why JZV, Vision & Mission, 4Ts Pedagogy |
| Academics | Courses (PCC & GCC), Aalimiyat Streams, NIOS (10th & 12th), Tahfeez ul Quran |
| Campus Life | Daily Schedule, Extra-Curriculars, Sports & Agility |
| Admissions | Admission Process, Admission Request (DynamicForm), Check Application Status, Fee Structure |
| Careers | Current Openings, Apply Online (DynamicForm) |

**Standalone Cards:** Useful Links (role-filtered), Institution Policies, Campus Gallery, Contact Us, My Portal (visible when logged in), Complaint Register (DynamicForm, portal-only).

**Key Files:**

- `src/components/homepage/CardsData.jsx` — card definitions, tab groups, and home card sequence ordering
- `src/components/layout/HomeGrid.jsx` — card grid renderer
- `src/components/layout/ModalContainer.jsx` — modal overlay with desktop tabs / mobile accordion
- `src/hooks/useModal.js` — card state, dynamic card loading, modal open/close helpers

**Homepage Content Components:**

- `src/components/homepage/about-us/` — WhyJzv, VisionMission (bilingual toggle), 4Ts
- `src/components/homepage/academic/` — Courses (PCC/GCC detail views), AlimiatStreams (stream detail views), NIOS (tabbed 10th/12th), TahfeezulQuran
- `src/components/homepage/campus-life/` — DailySchedule, ExtraCurriculars, SportsAndAgility
- `src/components/homepage/admission/` — AdmissionProcess, NewAdmission (DynamicForm), CheckApplicationStatus (Supabase search), FeeStructure
- `src/components/homepage/policy/Policies.jsx` — institutional policies display
- `src/components/homepage/CampusGallery.jsx` — image gallery with index navigation
- `src/components/homepage/ContactUs.jsx` — contact information and location
- `src/components/homepage/Openings.jsx` — current job openings display
- `src/components/homepage/UsefulLinksModal.jsx` — role-filtered links from `useful_links` table (uses bitmask role filtering)

---

### 2. Authentication & Sessions

**Login Flows (4 entry types):**

1. **Admin/Teacher/Management** — Supabase email/password auth → role lookup from `admin_users_view`
2. **Parent** — mobile number lookup → matches against `students.mobile1`/`mobile2` → creates synthetic user with `student` data attached → localStorage fallback to mock students
3. **Candidate** — mobile number → checks `admin_configruation` for enabled tests → creates synthetic candidate session
4. **Multi-role** — users with multiple roles see `RoleSelectionDashboard` to pick a portal

**Role Encoding:**

- Roles are stored as a bitmask integer in `user_roles.role`:
  - `1` = Guest, `2` = Parent, `4` = Staff, `8` = Teacher, `16` = Management, `32` = Admin
- `admin_users_view` is a Supabase view joining `auth.users` ↔ `user_roles` for role lookup
- Decoded into an array of role strings (e.g. `['admin', 'teacher']`) for routing

**Session Persistence:**

- Cookie-based via `src/utils/cookies.js` — stores `user_id`, `roles`, `student_ids` per user
- On page reload, attempts cookie restore before waiting for Supabase `onAuthStateChange`
- Parent sessions use localStorage fallback when Supabase is unavailable

**Key Files:**

- `src/hooks/useAuth.js` — auth state machine, role fetching, parent/candidate login, student switching, logout
- `src/components/LoginPortal.jsx` — login modal UI with 5 entry type cards (Parent, Teacher, Management, Admin, Candidate)

---

### 3. Admin Portal (`/portal/admin`)

The admin dashboard exposes 6 tile-based subviews:

#### 3a. User Management

- View all users from `admin_users_view` in a data table
- Assign/update role bitmasks via `user_roles` table
- Map users to teacher records (`teachers.auth_id`)
- Create new teacher records from existing users
- Toggle teacher active/inactive status
- **File:** `src/components/portals/admin/AdminUsersView.jsx`

#### 3b. Form Configurations

- CRUD for `dynamic_form_configs` table — manages dynamic form schemas (field definitions, types, validation, visibility rules)
- CRUD for `google_sheet_mappings` table — links form data to Google Sheets
- Full schema editor with field ordering, conditional visibility, role-based field access
- Test connection to Google Sheets, create sheet tabs, validate fields
- **Files:**
  - `src/components/portals/admin/AdminFormConfigsView.jsx` — config list + mapping management
  - `src/components/portals/admin/AdminFormConfigList.jsx` — list/select view for form schemas
  - `src/components/portals/admin/AdminFormSchemaEditor.jsx` — full field-level schema editor with drag-and-drop ordering, theme selection, role visibility multi-select

#### 3c. Student Database

- CRUD student records from `students` table with Supabase + localStorage fallback
- Add/edit/delete students with class assignment
- Bulk import capabilities
- Age auto-calculation from birth date
- **File:** `src/components/portals/admin/AdminStudentsView.jsx`

#### 3d. Timetable Planner

A comprehensive timetable management system with multiple sub-tabs:

- **Setup Tabs** — CRUD for Subjects (with classifications/categories), Teachers (with subject qualifications, gender, active status), Classes (with section, year, capacity), Periods (with timing, break types, season-specific configs)
- **Scheduler** — drag-and-drop grid-based timetable editor per class, with conflict detection (teacher double-booking), popover-based slot editing, column move/swap, clear operations
- **Admin View** — multi-view timetable viewer with class-view and teacher-view modes, break toggle, multi-select filters for classes/teachers/subjects/days
- **Overview** — bird's-eye view of all classes/teachers showing assigned vs unassigned slots with teacher-specific color coding
- **Tools** — teacher swap (swap all slots between two teachers across selected classes) and teacher reassign (replace one teacher with another)
- **Compare Modal** — side-by-side diff between current database timetable and an imported offline JSON, showing changes in grid, subjects, and teachers
- **Classifications Modal** — subject classification/category management (CRUD with theme colors, reordering)
- **Season System** — supports Summer, Winter, Exam, and Festival seasons with independent period configs, slot assignments, and weekday configurations per season
- **Supabase-first with localStorage fallback** — all data syncs to Supabase tables, but falls back to `jzv_timetable_data` in localStorage when offline

**Files:**

- `src/components/portals/admin/timetable/TimetableManager.jsx` — orchestrates setup tabs, admin view, data sync, seasons config
- `src/components/portals/admin/timetable/TimetableAdminView.jsx` — multi-view timetable display (class-view, teacher-view), filters, export
- `src/components/portals/admin/timetable/TimetableScheduler.jsx` — per-class grid editor with conflict detection and slot popover
- `src/components/portals/admin/timetable/TimetableSetupTabs.jsx` — CRUD tabs for subjects, teachers, classes, periods (with classification grouping)
- `src/components/portals/admin/timetable/TimetableOverview.jsx` — bird's-eye overview of teacher assignments across all classes
- `src/components/portals/admin/timetable/TimetableTools.jsx` — teacher swap and reassign utilities
- `src/components/portals/admin/timetable/TimetableCompareModal.jsx` — diff between database and imported timetable
- `src/components/portals/admin/timetable/ClassificationsModal.jsx` — subject classification CRUD with theme colors

#### 3e. Syllabus Manager

- Hierarchical curriculum management: Subjects → Books → Units → Chapters → Lessons
- Configurable hierarchy labels per book (e.g. "Unit, Chapter, Lesson" or "Module, Topic, Subtopic")
- Book-to-class mappings via `syllabus_book_classes`
- CSV/Excel import with column mapping modal for bulk lesson import
- Complexity tagging per lesson (Simple/Moderate/Complex)
- Page count tracking per lesson
- Subject filtering with classification grouping
- Dual-mode: admin (full CRUD) vs teacher (filtered to assigned subjects)
- **Files:**
  - `src/components/portals/admin/syllabus/SyllabusManager.jsx` — full syllabus CRUD (2647 lines)
  - `src/components/portals/admin/syllabus/SyllabusCsvMappingModal.jsx` — CSV column mapping for bulk import

#### 3f. Syllabus Progress Reports

- Multi-dimensional reporting on syllabus coverage across classes, subjects, and books
- Metrics: completion percentage, time spent per chapter/lesson, revision counts, class-days analysis
- Multi-select filters for classes, subjects, teachers
- Time-range filters (today, week, month, till date)
- **File:** `src/components/portals/admin/syllabus/SyllabusProgressReport.jsx` (1864 lines)

#### 3g. Useful Links Management

- CRUD for `useful_links` table
- Role-based visibility using bitmask (Guest=1, Parent=2, Staff=4, Teacher=8, Management=16, Admin=32)
- Inline editing with floating roles picker
- Link target configuration (\_blank/\_self)
- **File:** `src/components/portals/admin/AdminLinksView.jsx`

---

### 4. Management Portal (`/portal/management`)

The management portal exposes 7+ tile-based subviews:

#### 4a. Job Applications

- Fetches career form submissions from Google Apps Script
- DataGrid with sorting, filtering, column management
- DetailModal for per-record review with editable fields, status tracking, conversation thread
- Resolution days auto-calculation

#### 4b. Registered Complaints

- Same DataGrid/DetailModal pattern as job applications
- Fetches complaint submissions from Google Apps Script
- Status workflow: New → In Progress → Resolved
- Conversation thread for back-and-forth messaging

#### 4c. Student Records

- Read-only student view from `students` table (same data as admin but without CRUD)
- Class name resolution, age calculation

#### 4d. Timetable Viewer

- Read-only timetable view using `TimetableAdminView` component
- Same multi-view, filtering capabilities as admin but without editing

#### 4e. Take Test (Candidate Test Management)

- Enable/disable test access per mobile number
- Configure which tests (English, Tamil, Arabic, Urdu) are enabled
- Set expiry hours for test access
- View/revoke active test configurations
- Stored in `admin_configruation` table under key `enable_test`

#### 4f. Syllabus Progress Reports

- Same `SyllabusProgressReport` component used in admin portal

#### 4g. Syllabus Manager

- Same `SyllabusManager` component used in admin portal

#### Dynamic Form Tiles

- Additional tiles are dynamically loaded from `dynamic_form_configs` where `form_visibility` includes `management` or `all`

**Key File:** `src/components/portals/ManagementPortal.jsx` (1338 lines)

---

### 5. Teacher Portal (`/portal/teacher`)

5 tile-based subviews:

#### 5a. View Timetable

- Fetch timetable for the logged-in teacher's assigned classes
- Read-only schedule grid view
- **File:** `src/components/portals/teacher/TeacherTimetableViewer.jsx`

#### 5b. Student Records

- Browse and search students with detail viewer
- **File:** `src/components/portals/teacher/TeacherStudentsViewer.jsx`

#### 5c. Syllabus Manager

- Same `SyllabusManager` component with `role="teacher"` — filtered to teacher's assigned subjects only

#### 5d. Daily Syllabus Tracker

The most complex teacher feature (3349 lines, 140KB). Allows teachers to:

- **Submit daily syllabus reports** — select class, subject, book → mark lessons as completed or revised
- **Activity log** — chronological log of all teaching activities with items (lessons covered per entry)
- **Favorites system** — bookmark frequently used class+subject+book combinations for quick access
- **Progress view** — visual progress bars per book/unit/chapter showing completion percentage
- **Revision tracking** — separate revision markers with revision count per lesson
- **Module-level cache** — `syllabusTrackerCache` persists across component mounts for performance
- **Multi-select dropdowns** — custom dropdown components for filtering classes, subjects, etc.
- **Data tables:** `book_tracker`, `lesson_tracker_log`, `lesson_tracker_log_items`
- **File:** `src/components/portals/teacher/SyllabusTracker.jsx`

#### 5e. My Tickets

- Uses `ReporterTicketsView` — shows tickets submitted by the logged-in teacher
- Fetches from Google Apps Script filtered by user email
- Conversation thread support for ticket updates
- **File:** `src/components/portals/ReporterTicketsView.jsx`

---

### 6. Parent Portal (`/portal/parent`)

3 tile-based subviews:

#### 6a. Class Schedule

- Displays the timetable grid for the parent's child's class
- Subject color coding, break period display with icons
- Seasons-aware (shows active season schedule)
- Mobile-optimized with transposed grid for small screens
- **File:** `src/components/portals/parent/ParentTimetableViewer.jsx` (558 lines)

#### 6b. My Tickets

- Same `ReporterTicketsView` component as teacher portal
- Shows tickets submitted by the parent

#### 6c. Syllabus Progress

- Read-only syllabus progress for the parent's child's class
- Two sub-tabs: Class Progress (book/unit/chapter completion bars) and Daily Activity (chronological lesson logs)
- Time filters: today, this week, this month, till date
- Shows/hides not-started books toggle
- Subject classification grouping
- **File:** `src/components/portals/parent/ParentSyllabusView.jsx` (741 lines)

---

### 7. Candidate Portal (`/portal/candidate`)

- Single tile: "Take Test"
- Renders `DynamicForm` for the `online-teacher-test` form config
- Access gated by `admin_configruation.enable_test` per mobile number with expiry
- **File:** `src/components/portals/CandidatePortal.jsx`

---

### 8. Dynamic Forms Engine

A powerful Supabase-backed dynamic form system that can render any form schema without code changes.

**How it works:**

1. Form schemas are stored in `dynamic_form_configs` table (field definitions as JSON array)
2. Google Sheet mappings in `google_sheet_mappings` link forms to data storage sheets
3. `DynamicForm.jsx` loads the config by `uuid`, renders the form, submits via Google Apps Script
4. Supports: text, textarea, dropdown, radio, checkbox, date, phone, email, file upload, conversation threads, status fields
5. Conditional field visibility via criteria expressions (`=`, `!=`, `~`, `!~`, `>`, `<`, `^`)
6. Role-based field visibility per field
7. Required field validation
8. ID auto-generation with configurable patterns
9. Form visibility controls which roles can see the form as a portal tile

**Data Flow:** Form → Google Apps Script → Google Sheets (primary storage) with Supabase for config/schema only.

**Key Files:**

- `src/components/DynamicForm.jsx` — dynamic form renderer (1377 lines)
- `src/utils/google-appscript.js` — Apps Script source code for the backend (704 lines)

---

### 9. Ticket/Conversation System

The `ReporterTicketsView` and `DetailModal` components implement a ticket tracking system:

- Users (teachers, parents) can view their submitted tickets filtered by email
- Each ticket has a conversation thread (JSON array of `{sender, message, timestamp}`)
- Management can update ticket status, add resolution notes, and reply in conversation threads
- Conversation messages are rendered as chat bubbles (self vs other styling)
- Tickets are fetched from Google Sheets via Apps Script `search` action

**Key Files:**

- `src/components/portals/ReporterTicketsView.jsx` — ticket list with DataGrid + detail modal
- `src/components/DetailModal.jsx` — record detail modal with conversation thread (`ConversationChatLog`)

---

### 10. Reusable UI Components

#### DataGrid (`src/components/DataGrid.jsx`)

- Generic data table with: column sorting, per-column text filters, column visibility toggle, column reorder (drag-and-drop), row click handler
- Auto-derives columns from data keys, excludes specified columns
- Preserves user column preferences across data changes

#### DetailModal (`src/components/DetailModal.jsx`)

- Record detail overlay with prev/next navigation
- Editable fields support (text, dropdown, checkbox, textarea, status, conversation)
- Conversation thread integration
- Role-based field visibility and editability

#### ConfirmModal (`src/components/ConfirmModal.jsx`)

- Reusable confirmation dialog for destructive actions
- Configurable title, message, confirm text, and type (danger/warning)

#### MultiSelectDropdown (inline component, used in SyllabusTracker, SyllabusProgressReport, AdminFormSchemaEditor)

- Searchable multi-select dropdown with select all/clear all
- Checkbox-based selection with count badge

---

## Portal Navigation

| Route                | Role Required | Component                                        |
| -------------------- | ------------- | ------------------------------------------------ |
| `/`                  | None          | `HomeGrid` (public homepage)                     |
| `/portal`            | Authenticated | `RoleSelectionDashboard` (multi-role users)      |
| `/portal/admin`      | `admin`       | `AdminPortal`                                    |
| `/portal/management` | `management`  | `ManagementPortal`                               |
| `/portal/teacher`    | `teacher`     | `RolePortal` (teacher tiles)                     |
| `/portal/parent`     | `parent`      | `RolePortal` (parent tiles)                      |
| `/portal/candidate`  | `candidate`   | `CandidatePortal`                                |
| `/career`            | None          | Standalone `DynamicForm` for career applications |

---

## Database Schema

### Supabase Tables

| Table                      | Purpose                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `admin_configruation`      | Key-value config store (e.g. `enable_test` for candidate access)             |
| `admin_users_view`         | View: joins `auth.users` ↔ `user_roles` for user/role listing                |
| `applications`             | Admission application records                                                |
| `book_tracker`             | Tracks which books have been started/completed per class                     |
| `class_assignments`        | Maps teachers to classes (for timetable)                                     |
| `classes`                  | Class definitions (name, section, year, capacity)                            |
| `dynamic_form_configs`     | Dynamic form schemas (field definitions, visibility, themes)                 |
| `google_sheet_mappings`    | Maps form `data_id` to Google Sheet ID and tab name                          |
| `lesson_tracker_log`       | Daily syllabus activity logs per class/subject/book                          |
| `lesson_tracker_log_items` | Individual lesson items within a log entry                                   |
| `periods`                  | Period definitions (number, name, start/end time, is_break, season)          |
| `students`                 | Student records (name, class, parents, mobile, enrollment)                   |
| `subject_classifications`  | Subject categories/groups (e.g. "Islamic Studies", "Sciences")               |
| `subjects`                 | Subject definitions (name, classification, deactivated flag)                 |
| `syllabus_book_classes`    | Maps books to classes (which classes use which books)                        |
| `syllabus_book_lessons`    | Lesson definitions within books (unit/chapter/lesson hierarchy)              |
| `syllabus_books`           | Book definitions (name, subject, hierarchy labels)                           |
| `teacher_availability`     | Teacher availability configuration                                           |
| `teacher_cache`            | Cached teacher data                                                          |
| `teacher_subjects`         | Maps teachers to qualified subjects                                          |
| `teachers`                 | Teacher records (name, auth_id, is_male, is_active)                          |
| `timetable_slots`          | Individual timetable slot assignments (day, period, class, subject, teacher) |
| `useful_links`             | Curated links with role-based visibility (bitmask)                           |
| `user_roles`               | User role assignments (user_id, role bitmask)                                |

### Google Sheets (via Apps Script)

Form data is stored in Google Sheets, not Supabase. The Apps Script backend handles:

- `submit` — append a row to the data sheet
- `search` — find records matching criteria
- `update` — update an existing record
- `list-configs` / `config` — fetch form configuration
- `test-connection` / `create-sheet` — sheet management
- `validate-fields` — field validation
- `invalidate-form-cache` — cache clearing

---

## Data Flow Patterns

### Pattern 1: Supabase-First with localStorage Fallback

Used by: Timetable, Students, Teachers

```
Component → Supabase query
  ├── Success → setState(data)
  └── Error → localStorage.getItem('jzv_timetable_data')
                ├── Found → setState(parsed data)
                └── Not found → setState(MOCK_DATA defaults)
```

### Pattern 2: Dynamic Form Submission

Used by: Complaint, Career, New Admission, and all dynamic forms

```
DynamicForm → Load config from Supabase (dynamic_form_configs)
            → Load sheet mapping from Supabase (google_sheet_mappings)
            → Render form with conditional fields
            → Submit via Apps Script POST → Google Sheet append
```

### Pattern 3: Module-Level Cache

Used by: SyllabusTracker, ReporterTicketsView

```
Component mounts → Check cache.userId === current user
  ├── Cache valid → Initialize state from cache (no fetch)
  └── Cache invalid → Fetch from Supabase → Update state + cache
Component unmounts → Cache persists in module scope
```

### Pattern 4: Role-Based Content Filtering

Used by: Portal tiles, form visibility, useful links, field visibility

```
Config has visibility string (e.g. "admin, management, all")
  → Split by comma → Lowercase → Check if userRoles includes any
  → Show/hide tile, field, or link accordingly
```

### Pattern 5: Bitmask Role Filtering

Used by: UsefulLinksModal, AdminLinksView

```
User's roles → Map to bitmask (e.g. teacher=8, admin=32)
  → Combine with OR: userMask = 8 | 32 = 40
  → Link has roles bitmask (e.g. 26 = Parent+Teacher+Management)
  → Show if (userMask & linkMask) !== 0
```

---

## Component Inventory

### Core App Components

- `src/App.jsx` — central app wrapper; coordinates auth, modals, routing, header, subview state
- `src/components/AppRoutes.jsx` — route definitions, role guards, portal tile generation with dynamic form tiles
- `src/components/layout/Header.jsx` — site header: logo, login/logout, parent student switching, responsive navigation
- `src/components/layout/HomeGrid.jsx` — public homepage card grid
- `src/components/layout/PortalLayout.jsx` — shared portal layout with breadcrumbs and styling
- `src/components/layout/ModalContainer.jsx` — modal overlay with tabbed groups (desktop) / accordion (mobile)
- `src/components/RoleSelectionDashboard.jsx` — portal selection for multi-role users

### Authentication & Localization

- `src/hooks/useAuth.js` — auth state machine, role fetching, parent/candidate login, student switching (469 lines)
- `src/hooks/useModal.js` — card definitions, dynamic card loading, modal open/close
- `src/hooks/useLanguage.js` — translation key resolver and Google Translate language state
- `src/hooks/useGoogleTranslate.js` — injects Google Translate widget
- `src/hooks/i18n.js` — low-level translation helper
- `src/components/LoginPortal.jsx` — login modal with 5 auth entry types (572 lines)
- `src/components/Translate.jsx` — renders localized text with fallback
- `src/locales/translations.ui.json` — UI translation keys and values

### Reusable Components

- `src/components/DataGrid.jsx` — sortable, filterable data table with column management (423 lines)
- `src/components/DetailModal.jsx` — record detail modal with navigation, editable fields, conversation (354 lines)
- `src/components/DynamicForm.jsx` — dynamic form renderer for Supabase-backed schemas (1377 lines)
- `src/components/ConfirmModal.jsx` — confirmation dialog for destructive actions
- `src/components/LoadingFallback.jsx` — loading spinner UI

### Portal Components

- `src/components/portals/RolePortal.jsx` — generic portal wrapper with dashboard tiles and child content
- `src/components/portals/AdminPortal.jsx` — admin portal entry, user/config management, subview coordinator (518 lines)
- `src/components/portals/ManagementPortal.jsx` — management portal with submissions, tickets, timetable, test management (1338 lines)
- `src/components/portals/CandidatePortal.jsx` — candidate portal for taking enabled tests
- `src/components/portals/ReporterTicketsView.jsx` — ticket dashboard with conversation UI (370 lines)

### Admin Subpages

- `src/components/portals/admin/AdminUsersView.jsx` — user/role management UI
- `src/components/portals/admin/AdminFormConfigsView.jsx` — form schema management (with Google Sheet mappings)
- `src/components/portals/admin/AdminFormConfigList.jsx` — list/select view for form schemas
- `src/components/portals/admin/AdminFormSchemaEditor.jsx` — full field-level schema editor (1001 lines)
- `src/components/portals/admin/AdminStudentsView.jsx` — student CRUD (604 lines)
- `src/components/portals/admin/AdminLinksView.jsx` — useful links CRUD with role bitmask picker (515 lines)

### Timetable System (Admin)

- `src/components/portals/admin/timetable/TimetableManager.jsx` — orchestrator with data sync, seasons (2039 lines)
- `src/components/portals/admin/timetable/TimetableAdminView.jsx` — multi-view timetable display (3095 lines)
- `src/components/portals/admin/timetable/TimetableScheduler.jsx` — per-class grid editor with conflict detection (948 lines)
- `src/components/portals/admin/timetable/TimetableSetupTabs.jsx` — subject/teacher/class/period CRUD tabs (1643 lines)
- `src/components/portals/admin/timetable/TimetableOverview.jsx` — bird's-eye assignment overview (600 lines)
- `src/components/portals/admin/timetable/TimetableTools.jsx` — teacher swap/reassign tools (336 lines)
- `src/components/portals/admin/timetable/TimetableCompareModal.jsx` — database vs imported JSON diff (501 lines)
- `src/components/portals/admin/timetable/ClassificationsModal.jsx` — subject classification CRUD (604 lines)

### Syllabus System

- `src/components/portals/admin/syllabus/SyllabusManager.jsx` — full syllabus CRUD with CSV import (2647 lines)
- `src/components/portals/admin/syllabus/SyllabusCsvMappingModal.jsx` — CSV column mapping modal (229 lines)
- `src/components/portals/admin/syllabus/SyllabusProgressReport.jsx` — progress reports with filters (1864 lines)

### Teacher Portal

- `src/components/portals/teacher/SyllabusTracker.jsx` — daily syllabus tracker with favorites, progress, cache (3349 lines)
- `src/components/portals/teacher/TeacherTimetableViewer.jsx` — teacher's personal timetable
- `src/components/portals/teacher/TeacherStudentsViewer.jsx` — student list and detail viewer

### Parent Portal

- `src/components/portals/parent/ParentTimetableViewer.jsx` — child's class timetable (558 lines)
- `src/components/portals/parent/ParentSyllabusView.jsx` — child's syllabus progress (741 lines)

---

## Utilities & Data

- `src/utils/supabase.js` — Supabase client initialization via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `src/utils/cardTheme.jsx` — theme token definitions for card styles (color palettes, gradients)
- `src/utils/cookies.js` — cookie helpers for session/role persistence per user
- `src/utils/toast.js` — toast notification helpers (success/error/info)
- `src/utils/dateUtils.js` — date utilities (age calculation)
- `src/utils/google-appscript.js` — Apps Script backend source code (for reference/deployment)
- `src/data/mockStudents.js` — offline mock student data fallback
- `src/data/mockTimetable.js` — offline mock timetable data (subjects, teachers, classes, periods, slots)

---

## Localization & Translation

- `src/hooks/useLanguage.js` — translation logic and language state
- `src/components/Translate.jsx` — renders localized text with fallback
- `src/locales/translations.ui.json` — UI translation keys and values
- `scripts/migrate-i18n.js` and `scripts/test-i18n.js` — translation migration and coverage tooling
- Google Translate widget integration via `useGoogleTranslate.js`

---

## Styling

- `tailwind.config.js` — extensive custom Tailwind theme with brand colors, semantic tokens, and safelist
- `src/index.css` — base styles and Tailwind imports
- `postcss.config.js` — PostCSS configuration for Tailwind
- Custom color palette: brand (orange), blue, pink, teal, green, red, dark, charcoal, pine, olive variants

---

## Build & Deployment

| Command                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start Vite dev server                     |
| `npm run build`        | Build production bundle                   |
| `npm run preview`      | Preview production build                  |
| `npm run deploy`       | Deploy to GitHub Pages (runs build first) |
| `npm run migrate-i18n` | Translation migration utility             |
| `npm run test-i18n`    | Translation coverage testing              |

---

## Environment Variables

| Variable                 | Purpose                        |
| ------------------------ | ------------------------------ |
| `VITE_SUPABASE_URL`      | Supabase project URL           |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key  |
| `VITE_APPS_SCRIPT_URL`   | Google Apps Script web app URL |

---

## Important Runtime Patterns

1. **Role resolution** uses Supabase view `admin_users_view` and supports both bitmask and legacy role encoding
2. **Parent login** can fallback to local mock student data if Supabase lookup fails
3. **Dynamic portal cards and forms** are driven by `dynamic_form_configs` and `google_sheet_mappings`
4. **App.jsx** manages redirect logic once auth and roles are ready, including multi-role portal landing
5. **Header.jsx** renders login/logout controls, parent student switching, and responsive navigation
6. **Subview state** is lifted to `App.jsx` for all portals (adminSubView, managementSubView, etc.) and reset on navigation
7. **Modal escape** — pressing Escape closes any active modal or login portal
8. **Timetable seasons** — the system supports multiple seasonal timetable configurations with independent period and slot definitions
9. **SyllabusTracker cache** — module-level cache object persists teacher's reference data, favorites, and entries across component mounts for performance
10. **ReporterTicketsView cache** — similar module-level cache for ticket data persistence

---

## Database Context Files

- `db_context.json` — full database schema dump including columns, types, defaults, nullable, triggers, policies, and RPC functions (generated via `supabase.rpc('get_database_context')`)
- `db_context_real.json` — real/production database context variant

---

## Recommended Use

Use this document as a quick reference for:

- Codebase topology and file locations
- Feature understanding and capability mapping
- Authentication flow and role-based access rules
- Dynamic form integration patterns
- Database schema and table relationships
- Data flow patterns (Supabase-first, Apps Script, caching)
- Styling and build setup
