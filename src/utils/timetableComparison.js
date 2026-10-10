// src/utils/timetableComparison.js
/**
 * Timetable Comparison Utility
 * Produces a semantic, human-readable difference between a draft and the live timetable.
 *
 * Rows are matched by MEANING rather than array position or raw id, so removing one slot
 * reports exactly one change instead of renumbering every remaining row (which is what
 * produced misleading counts like "-21 periods"). Each row is described with resolved names
 * (class, subject, teacher, period) so the UI never has to show raw keys such as
 * slots[1442].teacher_id.
 */

export const ENTITY_META = {
  slots: { label: 'Timetable Slots', icon: 'fa-th-large' },
  assignments: { label: 'Class Assignments', icon: 'fa-link' },
  periods: { label: 'Periods', icon: 'fa-clock' },
  teachers: { label: 'Teachers', icon: 'fa-users' },
  classes: { label: 'Classes', icon: 'fa-building' },
  subjects: { label: 'Subjects', icon: 'fa-book' },
  classifications: { label: 'Classifications', icon: 'fa-layer-group' },
  seasonsConfig: { label: 'Seasons & Timings', icon: 'fa-calendar-alt' },
};

const ENTITY_ORDER = [
  'slots',
  'assignments',
  'periods',
  'teachers',
  'classes',
  'subjects',
  'classifications',
  'seasonsConfig',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Which fields are worth reporting per entity. Anything not listed is identity or noise.
const FIELD_MAPS = {
  slots: [
    { key: 'subject_id', label: 'Subject', resolve: 'subject' },
    { key: 'teacher_id', label: 'Teacher', resolve: 'teacher' },
  ],
  periods: [
    { key: 'name', label: 'Name' },
    { key: 'start_time', label: 'Start' },
    { key: 'end_time', label: 'End' },
    { key: 'is_break', label: 'Is Break', type: 'boolean' },
  ],
  teachers: [
    { key: 'name', label: 'Name' },
    { key: 'is_active', label: 'Active', type: 'boolean' },
    { key: 'is_male', label: 'Male', type: 'boolean' },
  ],
  classes: [{ key: 'name', label: 'Name' }],
  subjects: [
    { key: 'name', label: 'Name' },
    { key: 'classification_id', label: 'Classification', resolve: 'classification' },
  ],
  classifications: [
    { key: 'name', label: 'Name' },
    { key: 'seq', label: 'Order' },
  ],
  assignments: [],
};

const SEASON_PERIOD_FIELDS = [
  { key: 'icon', label: 'Icon' },
  { key: 'applicable_on_weekends', label: 'Applies at Weekend', type: 'boolean' },
];

const formatValue = (value, field, lookups) => {
  if (value === null || value === undefined || value === '') return '-';
  if (field?.type === 'boolean') return value ? 'Yes' : 'No';
  if (field?.resolve && lookups[field.resolve]) {
    const name = lookups[field.resolve].get(String(value));
    return name || `#${value}`;
  }
  return String(value);
};

const buildLookups = (draftData, liveData) => {
  const collect = (entity) => [
    ...(liveData?.[entity] || []),
    ...(draftData?.[entity] || []),
  ];

  const toNameMap = (arr, nameKeys = ['name']) => {
    const map = new Map();
    arr.forEach((item) => {
      if (!item || item.id === null || item.id === undefined) return;
      const name = nameKeys.map((k) => item[k]).find((v) => v !== null && v !== undefined && v !== '');
      map.set(String(item.id), name ? String(name) : null);
    });
    return map;
  };

  const periods = collect('periods');

  return {
    class: toNameMap(collect('classes')),
    teacher: toNameMap(collect('teachers')),
    subject: toNameMap(collect('subjects')),
    classification: toNameMap(collect('classifications')),
    periodsById: new Map(
      periods
        .filter((p) => p && p.id !== null && p.id !== undefined)
        .map((p) => [String(p.id), p])
    ),
  };
};

const periodLabel = (periodId, lookups) => {
  const p = lookups.periodsById.get(String(periodId));
  if (!p) return `Period #${periodId}`;
  return p.name || `Period ${p.period_number}`;
};

const keyFor = (entity, item) => {
  switch (entity) {
    case 'slots':
      return `${item.class_id}|${item.day}|${item.period_id}`;
    case 'assignments':
      return `${item.class_id}|${item.teacher_id}|${item.subject_id}`;
    case 'periods':
      return `pn:${item.period_number}`;
    default:
      return `id:${item.id}`;
  }
};

const labelFor = (entity, item, lookups) => {
  const lookup = (map, id) => (id === null || id === undefined ? 'Unknown' : map.get(String(id)) || `#${id}`);

  switch (entity) {
    case 'slots':
      return `${lookup(lookups.class, item.class_id)} | ${item.day} | ${periodLabel(
        item.period_id,
        lookups
      )}`;
    case 'assignments':
      return `${lookup(lookups.class, item.class_id)} | ${lookup(
        lookups.subject,
        item.subject_id
      )} | ${lookup(lookups.teacher, item.teacher_id)}`;
    case 'periods':
      return item.name ? `Period ${item.period_number} - ${item.name}` : `Period ${item.period_number}`;
    case 'teachers':
      return item.name || `Teacher #${item.id}`;
    case 'classes':
      return item.name || `Class #${item.id}`;
    case 'subjects':
      return item.name || `Subject #${item.id}`;
    case 'classifications':
      return item.name || `Classification #${item.id}`;
    default:
      return `#${item.id}`;
  }
};

const buildRows = (entity, oldItems, newItems, lookups) => {
  const rows = [];
  const fields = FIELD_MAPS[entity] || [];

  const oldMap = new Map();
  const newMap = new Map();
  oldItems.forEach((item) => item && oldMap.set(keyFor(entity, item), item));
  newItems.forEach((item) => item && newMap.set(keyFor(entity, item), item));

  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

  allKeys.forEach((key) => {
    const before = oldMap.get(key);
    const after = newMap.get(key);

    if (before && !after) {
      rows.push({
        entity,
        type: 'removed',
        itemLabel: labelFor(entity, before, lookups),
        fields: fields
          .filter((f) => before[f.key] !== null && before[f.key] !== undefined)
          .map((f) => ({ label: f.label, from: formatValue(before[f.key], f, lookups), to: '-' })),
      });
      return;
    }

    if (!before && after) {
      rows.push({
        entity,
        type: 'added',
        itemLabel: labelFor(entity, after, lookups),
        fields: fields
          .filter((f) => after[f.key] !== null && after[f.key] !== undefined)
          .map((f) => ({ label: f.label, from: '-', to: formatValue(after[f.key], f, lookups) })),
      });
      return;
    }

    const changed = fields.filter((f) => {
      const a = before[f.key] === undefined ? null : before[f.key];
      const b = after[f.key] === undefined ? null : after[f.key];
      return String(a ?? '') !== String(b ?? '');
    });

    if (changed.length > 0) {
      rows.push({
        entity,
        type: 'modified',
        itemLabel: labelFor(entity, after, lookups),
        fields: changed.map((f) => ({
          label: f.label,
          from: formatValue(before[f.key], f, lookups),
          to: formatValue(after[f.key], f, lookups),
        })),
      });
    }
  });

  return rows;
};

const seasonName = (config, seasonId) =>
  config?.seasons?.[seasonId]?.name || String(seasonId);

const buildSeasonRows = (draftConfig, liveConfig) => {
  const rows = [];
  const draft = draftConfig || {};
  const live = liveConfig || {};

  if (String(live.active_season_id || '') !== String(draft.active_season_id || '')) {
    rows.push({
      entity: 'seasonsConfig',
      type: 'modified',
      itemLabel: 'Active season',
      fields: [
        {
          label: 'Active Season',
          from: live.active_season_id ? seasonName(live, live.active_season_id) : '-',
          to: draft.active_season_id ? seasonName(draft, draft.active_season_id) : '-',
        },
      ],
    });
  }

  const seasonIds = new Set([
    ...Object.keys(live.seasons || {}),
    ...Object.keys(draft.seasons || {}),
  ]);

  seasonIds.forEach((seasonId) => {
    const liveSeason = live.seasons?.[seasonId];
    const draftSeason = draft.seasons?.[seasonId];
    const label = seasonName(draft.seasons?.[seasonId] ? draft : live, seasonId);

    if (liveSeason && !draftSeason) {
      rows.push({
        entity: 'seasonsConfig',
        type: 'removed',
        itemLabel: `Season ${label}`,
        fields: [{ label: 'Season', from: label, to: '-' }],
      });
      return;
    }
    if (!liveSeason && draftSeason) {
      rows.push({
        entity: 'seasonsConfig',
        type: 'added',
        itemLabel: `Season ${label}`,
        fields: [{ label: 'Season', from: '-', to: label }],
      });
      return;
    }

    if (String(liveSeason?.name || '') !== String(draftSeason?.name || '')) {
      rows.push({
        entity: 'seasonsConfig',
        type: 'modified',
        itemLabel: `Season ${label}`,
        fields: [
          {
            label: 'Season Name',
            from: liveSeason?.name || '-',
            to: draftSeason?.name || '-',
          },
        ],
      });
    }

    const livePeriods = new Map(
      (liveSeason?.periods || [])
        .filter((p) => p && p.period_number !== undefined)
        .map((p) => [String(p.period_number), p])
    );
    const draftPeriods = new Map(
      (draftSeason?.periods || [])
        .filter((p) => p && p.period_number !== undefined)
        .map((p) => [String(p.period_number), p])
    );

    const periodNumbers = new Set([...livePeriods.keys(), ...draftPeriods.keys()]);
    periodNumbers.forEach((pn) => {
      const before = livePeriods.get(pn);
      const after = draftPeriods.get(pn);
      const itemLabel = `Season ${label} | Period ${pn}`;

      if (before && !after) {
        rows.push({
          entity: 'seasonsConfig',
          type: 'removed',
          itemLabel,
          fields: [{ label: 'Period', from: `Period ${pn}`, to: 'not in season' }],
        });
        return;
      }
      if (!before && after) {
        rows.push({
          entity: 'seasonsConfig',
          type: 'added',
          itemLabel,
          fields: [{ label: 'Period', from: 'not in season', to: `Period ${pn}` }],
        });
        return;
      }

      const changed = SEASON_PERIOD_FIELDS.filter(
        (f) => String(before?.[f.key] ?? '') !== String(after?.[f.key] ?? '')
      );
      if (changed.length > 0) {
        rows.push({
          entity: 'seasonsConfig',
          type: 'modified',
          itemLabel,
          fields: changed.map((f) => ({
            label: f.label,
            from: formatValue(before?.[f.key], f),
            to: formatValue(after?.[f.key], f),
          })),
        });
      }
    });
  });

  return rows;
};

/**
 * Compare draft data with live data
 * @param {Object} draftData - Draft timetable data
 * @param {Object} liveData - Live timetable data
 * @returns {Object} { changes, groups, summary, totalChanges }
 */
export const compareTimetableData = (draftData, liveData) => {
  if (!draftData || !liveData) {
    return { changes: [], groups: [], summary: { added: 0, removed: 0, modified: 0 }, totalChanges: 0 };
  }

  const lookups = buildLookups(draftData, liveData);
  const allRows = [];

  ENTITY_ORDER.forEach((entity) => {
    if (entity === 'seasonsConfig') {
      allRows.push(...buildSeasonRows(draftData.seasonsConfig, liveData.seasonsConfig));
      return;
    }
    allRows.push(...buildRows(entity, liveData[entity] || [], draftData[entity] || [], lookups));
  });

  const groups = ENTITY_ORDER.map((entity) => {
    const rows = allRows.filter((r) => r.entity === entity);
    return {
      entity,
      ...ENTITY_META[entity],
      rows,
      added: rows.filter((r) => r.type === 'added').length,
      removed: rows.filter((r) => r.type === 'removed').length,
      modified: rows.filter((r) => r.type === 'modified').length,
      total: rows.length,
    };
  }).filter((g) => g.total > 0);

  const summary = {
    added: allRows.filter((r) => r.type === 'added').length,
    removed: allRows.filter((r) => r.type === 'removed').length,
    modified: allRows.filter((r) => r.type === 'modified').length,
  };

  return {
    changes: allRows,
    diffs: allRows, // retained for callers that still read `diffs`
    groups,
    summary,
    totalChanges: allRows.length,
  };
};

/**
 * Get a specific entity's data from draft or live for side-by-side display
 */
export const getEntityData = (data, entity) => {
  if (!data) return entity === 'seasonsConfig' ? {} : [];
  return data[entity] || (entity === 'seasonsConfig' ? {} : []);
};

/**
 * Format value for display in comparison
 */
export const formatValueForDisplay = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

/**
 * Get color class for a diff type
 */
export const getDiffColorClass = (type) => {
  switch (type) {
    case 'added':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'removed':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'modified':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

/**
 * Get icon for a diff type
 */
export const getDiffIcon = (type) => {
  switch (type) {
    case 'added':
      return 'fa-plus-circle text-green-600';
    case 'removed':
      return 'fa-minus-circle text-red-600';
    case 'modified':
      return 'fa-pen text-amber-600';
    default:
      return 'fa-circle text-gray-400';
  }
};

/**
 * Human label for a change type
 */
export const getDiffLabel = (type) => {
  switch (type) {
    case 'added':
      return 'Added';
    case 'removed':
      return 'Removed';
    case 'modified':
      return 'Changed';
    default:
      return 'Changed';
  }
};

export default {
  compareTimetableData,
  getEntityData,
  formatValueForDisplay,
  getDiffColorClass,
  getDiffIcon,
  getDiffLabel,
  ENTITY_META,
  DAYS,
};
