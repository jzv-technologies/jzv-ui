---
name: component-blueprint
description: >
  Use this skill EVERY TIME you are creating a new component, view, or feature tile
  in this React project. It defines the mandatory structural layout, responsive design
  rules, role-based access wiring, data attribute conventions, table requirements,
  and the SQL/registry entries that must accompany every new component. Follow these
  rules strictly — do NOT improvise structure, role checks, or table behavior.
---

# Component Blueprint Skill

This skill prescribes the standard architecture, patterns, and conventions for building
new views, feature components, and tabbed managers in the jzv-ui portal. Every new
component or view **MUST** follow these rules.

---

## Rule 1 — Two-Section Layout: Header + Main Content

Every feature component must be structured as exactly **two visual sections**:

### 1A. Header Section

- Contains the **heading**, **tab navigation**, and **filters relevant to the active tab**.
- Rendered inside a single sticky/top container.
- Hidden during print (`print:hidden`).

### 1B. Main Content Section

- Contains the **data table, cards, or details** loaded based on the selected tab.
- Rendered below the header in a flex-1 scrollable area.

### Structural Template

```jsx
return (
  <div className="w-full flex flex-col min-h-[500px]" data-feature="feature-name">
    {/* ── HEADER SECTION ── */}
    <div className="w-full bg-white border-b border-light-border px-4 sm:px-6 py-3 print:hidden shadow-2xs space-y-3">
      {/* Row 1: Title + Global Actions (e.g., selector, refresh) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base shadow-2xs shrink-0">
            <i className="fas fa-icon" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-dark-primary tracking-tight">
              Feature Title
            </h1>
            <p className="text-[11px] font-semibold text-dark-muted hidden sm:block">
              Short description of the feature
            </p>
          </div>
        </div>
        {/* Global selectors and refresh button on the right */}
      </div>

      {/* Row 2: Tab Navigation (LEFT) + Active Tab Filters (RIGHT) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Tabs */}
        <div data-feature-tab="feature-name">{/* Tab buttons — see Rule 2 */}</div>
        {/* Active tab filters */}
        <div data-feature-filter={activeTab}>{/* Contextual filters — see Rule 2.2 */}</div>
      </div>
    </div>

    {/* ── MAIN CONTENT SECTION ── */}
    <div
      className="w-full p-4 sm:p-6 flex-1 animate-in fade-in duration-200"
      data-feature={`${featureName}-content`}
    >
      {activeTab === 'tab-id' && (
        <ConditionalBlock name="feature-tab-name" roles={userRoles}>
          {/* Tab content component */}
        </ConditionalBlock>
      )}
    </div>
  </div>
);
```

---

## Rule 2 — Tab Navigation Driven by User Roles

### 2.1 Tab Definition

Tabs **MUST** be defined as a static array with `componentName` referencing the
`app_view_controller` entry. Tabs are filtered at runtime by `canAccess()`:

```jsx
import { ConditionalBlock, useCanAccess } from '../portal-shared/ConditionalBlock';

const MyManager = ({ userRoles = [] }) => {
  const canAccess = useCanAccess(userRoles);

  const TABS = useMemo(() => [
    { id: 'overview',  componentName: 'feature-tab-overview',  label: 'Overview',  icon: 'fa-chart-line' },
    { id: 'settings',  componentName: 'feature-tab-settings',  label: 'Settings',  icon: 'fa-gear' },
    { id: 'reports',   componentName: 'feature-tab-reports',   label: 'Reports',   icon: 'fa-file-alt' },
  ], []);

  const availableTabs = useMemo(() => {
    return TABS.filter((tab) => canAccess(tab.componentName));
  }, [TABS, canAccess]);
```

### 2.2 Responsive Tab Rendering (> 3 tabs → mobile dropdown)

When there are **more than 3 tabs**, render a `<select>` dropdown on mobile and tab
buttons on desktop. This is mandatory for responsive compliance.

```jsx
{
  /* Mobile: Dropdown (shown only on small screens) */
}
<div className="sm:hidden relative w-full" data-feature-tab="feature-name-mobile">
  <select
    value={activeTab}
    onChange={(e) => setActiveTab(e.target.value)}
    className="w-full appearance-none bg-white border border-light-border rounded-xl px-3.5 py-2 pr-8 text-xs font-extrabold text-dark-primary outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
  >
    {availableTabs.map((tab) => (
      <option key={tab.id} value={tab.id}>
        {tab.label}
      </option>
    ))}
  </select>
  <i className="fas fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-dark-soft pointer-events-none" />
</div>;

{
  /* Desktop: Pill tabs (hidden on small screens) */
}
<div
  className="hidden sm:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar shrink-0"
  data-feature-tab="feature-name"
>
  {availableTabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
        activeTab === tab.id
          ? 'bg-white text-rose-700 shadow-xs'
          : 'text-dark-muted hover:text-dark-primary'
      }`}
    >
      <i className={`fas ${tab.icon} text-[10px]`} />
      <span>{tab.label}</span>
    </button>
  ))}
</div>;
```

When tab count is **3 or fewer**, you may use the pill tabs on all screen sizes
(with `overflow-x-auto no-scrollbar`).

### 2.3 Filter Layout Rule

When a tab has **multiple filters**, display them in a responsive grid that shows
**only 2 filters per row** on mobile:

```jsx
<div
  className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 w-full"
  data-feature-filter={activeTab}
>
  {/* Filter 1 */}
  <MultiSelectDropdown label="" placeholder="Class" ... />
  {/* Filter 2 */}
  <MultiSelectDropdown label="" placeholder="Subject" ... />
  {/* Filter 3 */}
  <select className="w-full sm:w-auto border ..." />
</div>
```

Filters that are specific to a tab **MUST** only render when that tab is active.
Wrap role-gated filters with `<ConditionalBlock>`:

```jsx
<ConditionalBlock name="feature-teacher-filter" roles={userRoles}>
  <MultiSelectDropdown ... />
</ConditionalBlock>
```

---

## Rule 3 — Subview Loading with ConditionalBlock

Every tab's content **MUST** be wrapped in a `ConditionalBlock` using the tab's
`componentName`. This enforces server-managed role access at the render level:

```jsx
{activeTab === 'overview' && (
  <ConditionalBlock name="feature-tab-overview" roles={userRoles}>
    <OverviewContent ... />
  </ConditionalBlock>
)}
```

**NEVER** use explicit role checks like `isAdmin`, `isCoordinator`, `roles.includes('admin')`.
Access is strictly driven by `canAccess(componentName)` or `<ConditionalBlock name="..." />`.

---

## Rule 4 — Responsive Header Design

The header **MUST** follow these responsive rules:

| Breakpoint               | Behavior                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Mobile** (`< sm`)      | Title and actions stack vertically (`flex-col`). Tab bar uses dropdown if > 3 tabs. Filters use `grid-cols-2`.   |
| **Tablet** (`sm` – `lg`) | Title and actions side-by-side (`sm:flex-row`). Tab bar is horizontal pills with `overflow-x-auto no-scrollbar`. |
| **Desktop** (`lg+`)      | Full inline layout. Tabs on left, filters on right (`lg:flex-row lg:items-center justify-between`).              |

---

## Rule 5 — app_view_controller Registration

Every new **tile**, **tab**, **component**, or **variable** MUST be registered in the
`app_view_controller` table. Write the SQL insert to `/debug-files/execute-query.sql`.

### 5.1 Entry Types

| `type` Value | Purpose                              | Example `component_name`                      |
| ------------ | ------------------------------------ | --------------------------------------------- |
| `tile`       | Top-level portal tile / feature card | `exam-schedule`, `timetable-planner`          |
| `tab`        | Tab within a feature view            | `exam-sched-tab-setup`, `syl-tab-my-activity` |
| `variable`   | Feature flag or mutation permission  | `exam-sched-slot-edit`, `exam-sched-publish`  |
| `subview`    | Embedded UI section or filter        | `syl-teacher-filter`                          |

### 5.2 Naming Convention

All component names use **kebab-case** and follow this hierarchy:

```
{feature}-{scope}-{element}
```

Examples:

- `attendance-tab-daily` (tab inside attendance feature)
- `attendance-mark-edit` (edit permission variable for attendance marking)
- `attendance-teacher-filter` (subview: teacher filter inside attendance)

### 5.3 SQL Insert Template

```sql
-- Task: Register new feature [FeatureName] in app_view_controller
-- Date: YYYY-MM-DD
-- Tables affected: app_view_controller

BEGIN;

-- Tile entry (top-level feature card)
INSERT INTO public.app_view_controller
  (component_name, type, display_name, parent_name, valid_access_roles, description, is_active, default_access, display_order, icon)
VALUES
  ('feature-name', 'tile', 'Feature Title', 'Category Group', ARRAY['admin','management','coordinator','teacher'], 'Short description', true, 'none', 50, 'fa-icon');

-- Tab entries
INSERT INTO public.app_view_controller
  (component_name, type, display_name, parent_name, valid_access_roles, description, is_active, default_access, display_order)
VALUES
  ('feature-tab-overview',  'tab', 'Overview',  'feature-name', ARRAY['admin','management','coordinator','teacher'], 'Overview tab', true, 'none', 1),
  ('feature-tab-settings',  'tab', 'Settings',  'feature-name', ARRAY['admin','management'],                        'Settings tab', true, 'none', 2);

-- Variable entries (edit/action permissions)
INSERT INTO public.app_view_controller
  (component_name, type, display_name, parent_name, valid_access_roles, description, is_active, default_access, display_order)
VALUES
  ('feature-data-edit', 'variable', 'Edit Data', 'feature-name', ARRAY['admin','management','coordinator'], 'Permission to edit data', true, 'none', 10);

COMMIT;
```

### 5.4 Tile Registry Entry

Add a corresponding entry in [`src/utils/tileRegistry.js`](file:///c:/Projects/jzv-ui/src/utils/tileRegistry.js)
in the `TILE_METADATA_REGISTRY` object:

```javascript
'feature-name': {
  title: 'Feature Title',
  description: 'What this feature does.',
  icon: 'fa-icon',
  buttonColor: 'bg-brand-primary text-white',
  shadow: 'shadow-brand-lbg',
  group: 'Category Group',
  action: 'subview',
},
```

### 5.5 RLS Policies with `can_access_component`

If the feature reads or writes to a Supabase table, add RLS policies that reference
`can_access_component(...)` to bind PostgreSQL access to the same component permissions:

```sql
CREATE POLICY feature_data_read ON public.feature_data
  FOR SELECT TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text, 'teacher'::text])
    OR can_access_component('feature-tab-overview'::text)
  );

CREATE POLICY feature_data_write ON public.feature_data
  FOR ALL TO authenticated
  USING (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('feature-data-edit'::text)
  )
  WITH CHECK (
    has_any_role(VARIADIC ARRAY['admin'::text, 'management'::text, 'coordinator'::text])
    OR can_access_component('feature-data-edit'::text)
  );
```

---

## Rule 6 — No Hardcoded Role Checks

**Explicit role checks are FORBIDDEN.** Do NOT write:

```jsx
// ❌ FORBIDDEN
if (isAdmin) { ... }
if (roles.includes('coordinator')) { ... }
const canEdit = isAdmin || isCoordinator;
```

Instead, drive everything through component names:

```jsx
// ✅ CORRECT
const canEdit = canAccess('feature-data-edit');
const showSetup = canAccess('feature-tab-settings');
```

The role-to-component mapping lives exclusively in `app_view_controller`.

---

## Rule 7 — Data Tables Must Have Full Interactive Features

Whenever a data table is added, it **MUST** include all of the following capabilities.
Use the existing [`DataGrid`](file:///c:/Projects/jzv-ui/src/components/DataGrid.jsx)
component or implement these features inline:

| Feature              | Implementation                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Column Sorting**   | `sortConfig = { key, direction }` state. Clicking header toggles asc/desc. Sort icon (`fa-sort-up` / `fa-sort-down`) displayed in header. |
| **Column Filtering** | Per-column filter inputs or dropdown selectors for columns with ≤ 8 unique values.                                                        |
| **Column Show/Hide** | `visibleColumns` state object. Toggle via a column manager popover (gear icon).                                                           |
| **Movable Columns**  | `columnOrder` state array. Drag & drop on header cells (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).                              |

### DataGrid Usage (Preferred)

```jsx
import DataGrid from '../DataGrid';

<DataGrid
  data={tableData}
  loading={loading}
  error={error}
  onRetry={handleRefresh}
  onRowClick={handleRowClick}
  excludeColumns={['uuid', 'internal_id']}
  columnConfig={{
    status: { filterable: true },
    name: { filterable: false },
  }}
/>;
```

### Custom Table (When DataGrid doesn't fit)

If you need a custom table layout, you MUST still implement sorting, filtering,
show/hide, and column reordering. Follow the patterns in
[`DataGrid.jsx`](file:///c:/Projects/jzv-ui/src/components/DataGrid.jsx):

```jsx
const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
const [columnFilters, setColumnFilters] = useState({});
const [visibleColumns, setVisibleColumns] = useState({});
const [columnOrder, setColumnOrder] = useState([]);
```

---

## Rule 8 — Responsive Design Requirements

All components **MUST** be responsive. Follow these mandatory patterns:

### 8.1 Header

- `flex-col sm:flex-row` for title + actions.
- `flex-col lg:flex-row` for tabs + filters.

### 8.2 Tables

- Wrap tables in `<div className="overflow-x-auto">`.
- Pin anchor columns (e.g., Name, Date) with `sticky left-0 bg-white z-10 border-r border-light-border shadow-xs`.

### 8.3 Modals

- Max height: `max-h-[90vh] overflow-y-auto`.
- Responsive padding: `p-4 sm:p-6`.
- Touch-friendly buttons: minimum `py-2 px-4`, `cursor-pointer`.

### 8.4 Filters

- Use `grid-cols-2 gap-2 sm:flex sm:flex-wrap` for mobile filter grids.
- Use [`MultiSelectDropdown`](file:///c:/Projects/jzv-ui/src/components/MultiSelectDropdown.jsx) for multi-value selectors.

---

## Rule 9 — Data Attribute Conventions

Every significant container element **MUST** include semantic `data-*` attributes
for testability, analytics, and CSS print targeting:

| Attribute                         | Where to Apply                                       | Example                              |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| `data-feature="name"`             | Outermost wrapper of the entire feature view         | `data-feature="attendance-manager"`  |
| `data-feature-tab="name"`         | The tab navigation container                         | `data-feature-tab="attendance-tabs"` |
| `data-feature-filter={activeTab}` | The filter bar container, value = current active tab | `data-feature-filter="daily"`        |
| `data-feature-sort="name"`        | Sortable column header or sort dropdown container    | `data-feature-sort="teacher-sort"`   |

### Example

```jsx
<div data-feature="attendance-manager">
  <div data-feature-tab="attendance-tabs">{/* tab buttons */}</div>
  <div data-feature-filter={activeTab}>{/* active tab filters */}</div>
  <div data-feature="attendance-content">{/* table / cards content */}</div>
</div>
```

---

## Rule 10 — Edit Permissions

Edit/write capabilities **MUST** be gated by a dedicated `variable`-type entry
in `app_view_controller`, not by checking the tab access:

```jsx
// ✅ Separate edit permission variable
const canEdit = canAccess('feature-data-edit');

// Pass down to child components
<ChildComponent readOnly={!canEdit} />;
```

This allows granting "view" access to a tab without granting "edit" permission.

---

## Quick Reference Checklist

When building a new component, verify each item:

- [ ] Two-section layout: Header + Main Content
- [ ] Heading with icon, title, and subtitle in header
- [ ] Tabs defined with `componentName` referencing `app_view_controller`
- [ ] `availableTabs` filtered by `canAccess(tab.componentName)`
- [ ] Mobile dropdown for tabs when count > 3
- [ ] Filters in `grid-cols-2` on mobile, flex on desktop
- [ ] Each tab content wrapped in `<ConditionalBlock name="..." roles={userRoles}>`
- [ ] No hardcoded role checks anywhere
- [ ] SQL entries written to `/debug-files/execute-query.sql` for all new AVC rows
- [ ] Tile entry added to `TILE_METADATA_REGISTRY` in `tileRegistry.js`
- [ ] RLS policies use `can_access_component(...)` for relevant tables
- [ ] Tables include sorting, filtering, column show/hide, and movable columns
- [ ] `data-feature`, `data-feature-tab`, `data-feature-filter` attributes applied
- [ ] Responsive design verified (`flex-col sm:flex-row`, `overflow-x-auto`, sticky columns)
- [ ] Edit permissions use a separate `variable`-type AVC entry

---

## File References

| Resource                               | Path                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ConditionalBlock + useCanAccess        | [`src/components/portal-shared/ConditionalBlock.jsx`](file:///c:/Projects/jzv-ui/src/components/portal-shared/ConditionalBlock.jsx)     |
| useViewConfig hook                     | [`src/hooks/useViewConfig.js`](file:///c:/Projects/jzv-ui/src/hooks/useViewConfig.js)                                                   |
| MultiSelectDropdown                    | [`src/components/MultiSelectDropdown.jsx`](file:///c:/Projects/jzv-ui/src/components/MultiSelectDropdown.jsx)                           |
| DataGrid (sorting, filtering, columns) | [`src/components/DataGrid.jsx`](file:///c:/Projects/jzv-ui/src/components/DataGrid.jsx)                                                 |
| Tile Metadata Registry                 | [`src/utils/tileRegistry.js`](file:///c:/Projects/jzv-ui/src/utils/tileRegistry.js)                                                     |
| Example: ExamScheduleManager           | [`src/components/examinations/ExamScheduleManager.jsx`](file:///c:/Projects/jzv-ui/src/components/examinations/ExamScheduleManager.jsx) |
| Example: SyllabusTrackerPortal         | [`src/components/syllabus/SyllabusTrackerPortal.jsx`](file:///c:/Projects/jzv-ui/src/components/syllabus/SyllabusTrackerPortal.jsx)     |
| SQL output file                        | [`debug-files/execute-query.sql`](file:///c:/Projects/jzv-ui/debug-files/execute-query.sql)                                             |
