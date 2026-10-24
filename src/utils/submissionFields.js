/**
 * Shared semantics for `dynamic_form_configs.fields` entries.
 *
 * Every dynamic form stores its columns as an array of objects with these keys:
 *
 *   "Field Name"        sheet column name (the record key)
 *   "Label"             human readable label
 *   "Field Type"        text | dropdown | conversation | status | ...
 *   "Screen"            which ENTRY screens render the field: New, Update, Data Grid
 *   "Field Visibility"  role allow-list for READERS: All | None | Role, Role, ...
 *
 * IMPORTANT: "Screen" only describes the data-entry UI. It must never be used to
 * decide whether a value is visible when reviewing a submission — otherwise every
 * form whose screens are not called exactly "Detail View" silently loses columns.
 * Read visibility comes from "Field Visibility" only.
 *
 * Keep these helpers as the single source of truth; do not re-implement the rules
 * inside individual components, so newly created dynamic forms work automatically.
 */

const STATUS_VALUES = ['open', 'in-progress', 'in progress', 'resolved', 'rejected', 'closed'];

const normalize = (value) => String(value ?? '').trim();

export const toTokenList = (value) =>
  normalize(value)
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

/** Fields with a name, in config order. Tolerates null/malformed config arrays. */
export const normalizeFormFields = (fields) =>
  (Array.isArray(fields) ? fields : []).filter((field) => normalize(field?.['Field Name']));

export const getFieldName = (field) => normalize(field?.['Field Name']);

/** Conversation threads are rendered separately from the regular field grid. */
export const isConversationField = (field) => {
  const type = normalize(field?.['Field Type']).toLowerCase();
  const name = getFieldName(field).toLowerCase();
  return type === 'conversation' || name === 'conversation';
};

export const isStatusValue = (value) => STATUS_VALUES.includes(normalize(value).toLowerCase());

/**
 * Role based read visibility.
 * Unset/blank visibility => visible. "All" => visible. "None" => hidden.
 * Otherwise the field is visible when one of the user's roles is listed
 * (the legacy "Reviewer" token always grants access, as before).
 */
export const isFieldVisibleToRoles = (field, userRoles = []) => {
  const tokens = toTokenList(field?.['Field Visibility']);
  if (tokens.length === 0) return true;
  if (tokens.includes('all')) return true;
  if (tokens.includes('none')) return false;

  const roles = (Array.isArray(userRoles) ? userRoles : []).map((role) =>
    normalize(role).toLowerCase()
  );
  return roles.some((role) => tokens.includes(role)) || tokens.includes('reviewer');
};

/** The entry-screen list, lowercased. Blank means "not configured" (allow). */
export const getEntryScreens = (field) =>
  toTokenList(field?.['Screen']).filter((screen) => screen !== 'all');

/**
 * Columns excluded from the data grid. A field is hidden only when the form
 * explicitly restricts it to other entry screens (Screen is set and does not
 * include "Data Grid") or when the role is not allowed to read it.
 *
 * Note: conversation threads stay in the grid (raw value) as before — dropping a
 * column would hide data from reviewers who never open the split/detail view.
 */
export const getExcludedGridColumns = (fields, userRoles = [], baseExcludes = ['uuid']) => {
  const excluded = new Set(baseExcludes);
  normalizeFormFields(fields).forEach((field) => {
    const name = getFieldName(field);
    const screens = getEntryScreens(field);
    if (screens.length > 0 && !screens.includes('data grid')) excluded.add(name);
    if (!isFieldVisibleToRoles(field, userRoles)) excluded.add(name);
  });
  return Array.from(excluded);
};

/**
 * Columns excluded from the detail / review view: only internal keys, conversation
 * threads (shown on their own) and fields the current role may not read.
 * "Screen" is intentionally ignored here — reviewers must see the full record.
 */
export const getExcludedDetailColumns = (fields, userRoles = [], baseExcludes = ['uuid']) => {
  const excluded = new Set(baseExcludes);
  normalizeFormFields(fields).forEach((field) => {
    if (isConversationField(field)) {
      excluded.add(getFieldName(field));
      return;
    }
    if (!isFieldVisibleToRoles(field, userRoles)) excluded.add(getFieldName(field));
  });
  return Array.from(excluded);
};

/** Lowercased field name -> human readable label. */
export const buildFieldLabelMap = (fields) => {
  const labels = {};
  normalizeFormFields(fields).forEach((field) => {
    const name = getFieldName(field);
    labels[name.toLowerCase()] = normalize(field['Label']) || name;
  });
  return labels;
};

export const getFieldLabel = (labelMap, key) => labelMap?.[normalize(key).toLowerCase()] || key;

/**
 * Record keys in a stable, form-friendly order: configured fields first (in the
 * order the form defines them), then any remaining sheet columns (id, timestamps,
 * or columns added directly in the sheet).
 */
export const orderRecordKeys = (record, fields, excludedColumns = []) => {
  if (!record) return [];
  const excluded = new Set((excludedColumns || []).map((column) => column.toLowerCase()));
  const recordKeys = Object.keys(record).filter((key) => !excluded.has(key.toLowerCase()));

  const ordered = [];
  normalizeFormFields(fields).forEach((field) => {
    const name = getFieldName(field).toLowerCase();
    const match = recordKeys.find((key) => key.toLowerCase() === name);
    if (match && !ordered.includes(match)) ordered.push(match);
  });
  recordKeys.forEach((key) => {
    if (!ordered.includes(key)) ordered.push(key);
  });
  return ordered;
};

/** Conversation fields declared by the form (their values are JSON message arrays). */
export const getConversationColumns = (fields) =>
  normalizeFormFields(fields).filter(isConversationField).map(getFieldName);

export const parseConversation = (value) => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Friendly column config for DataGrid headers (keyed by the exact record key). */
export const buildColumnConfig = (records, labelMap) => {
  const config = {};
  (Array.isArray(records) ? records : []).forEach((record) => {
    Object.keys(record || {}).forEach((key) => {
      if (!config[key]) config[key] = { label: getFieldLabel(labelMap, key) };
    });
  });
  return config;
};

/** Types that can never be edited from a review screen. */
const SYSTEM_READONLY_TYPES = ['currenttimestamp', 'currentuser'];

/**
 * Whether the current user may update this field, based on "Update Allowed"
 * (legacy alias "Read Only For"), the field type and the record identity.
 * Mirrors the long-standing reviewer rules, but lives here so every dynamic form
 * (current and future) behaves the same.
 */
export const isFieldEditableByUser = (
  field,
  { userRoles = [], user = null, fullName = '', record = null, fields = [] } = {}
) => {
  const type = normalize(field?.['Field Type']).toLowerCase();
  const roles = (Array.isArray(userRoles) ? userRoles : []).map((role) =>
    normalize(role).toLowerCase()
  );
  const effectiveRoles = roles.length > 0 ? roles : ['management'];

  if (SYSTEM_READONLY_TYPES.includes(type)) return false;

  const allowed = toTokenList(field?.['Update Allowed'] ?? field?.['Read Only For']);

  if (allowed.includes('none')) return false;
  if (effectiveRoles.includes('admin')) return true;

  if (
    type === 'status' &&
    !effectiveRoles.some((role) => ['teacher', 'management'].includes(role))
  ) {
    return false;
  }

  if (allowed.length === 0) return true;
  if (allowed.includes('all')) return true;
  if (effectiveRoles.some((role) => allowed.includes(role))) return true;

  const identities = [user?.email, user?.id, fullName]
    .map((value) => normalize(value).toLowerCase())
    .filter(Boolean);
  if (identities.length === 0) return false;

  const fieldList = Array.isArray(fields) ? fields : [];
  const recordValue = (typeFilters, keyCandidates) => {
    const fieldName = normalize(
      fieldList.find((item) =>
        typeFilters.includes(normalize(item?.['Field Type']).toLowerCase())
      )?.['Field Name']
    );
    const key = Object.keys(record || {}).find((item) =>
      keyCandidates.includes(item.toLowerCase())
    );
    return normalize(record?.[fieldName] ?? record?.[key]).toLowerCase();
  };

  if (allowed.includes('reporter') && record) {
    const reporter = recordValue(
      ['currentuser'],
      ['reporter', 'reported by', 'reported_by', 'email']
    );
    if (reporter && identities.includes(reporter)) return true;
  }

  if (allowed.includes('reviewer') && record) {
    const assignee = recordValue(
      ['currentassignee', 'person'],
      ['assigned', 'assignee', 'assignedto', 'assigned to']
    );
    if (assignee && identities.includes(assignee)) return true;
  }

  return false;
};

/** Names of the fields the current user may update (conversation excluded). */
export const getEditableFieldNames = (fields, context) =>
  normalizeFormFields(fields)
    .filter((field) => !isConversationField(field))
    .filter((field) => isFieldEditableByUser(field, context))
    .map(getFieldName);

/**
 * Resolves the Apps Script data source for a dynamic form.
 *
 * The Apps Script addresses data by sheet, not by form name, so a review UI must
 * send the sheet override (`google_sheet_id` + `data_sheet_name`) whenever a
 * mapping exists. `uuid` stays as a fallback for sheets that are registered in the
 * Apps Script mapping tab itself.
 */
export const resolveSubmissionSource = ({ formName, dataId, mappings = [], fallbacks = {} }) => {
  const mappingRows = Array.isArray(mappings) ? mappings : [];
  const mapping =
    (dataId && mappingRows.find((item) => item?.data_id === dataId)) ||
    (fallbacks || {})[formName] ||
    null;

  return {
    uuid: dataId || formName,
    mapping,
    googleSheetId: mapping?.google_sheet_id || null,
    dataSheetName: mapping?.data_sheet_name || null,
  };
};

/** Adds sheet overrides to an Apps Script payload when a mapping is resolved. */
export const applySheetMapping = (payload, source) => {
  const googleSheetId = source?.googleSheetId || source?.google_sheet_id || null;
  const dataSheetName = source?.dataSheetName || source?.data_sheet_name || null;
  if (!googleSheetId || !dataSheetName) return payload;
  return {
    ...payload,
    google_sheet_id: googleSheetId,
    data_sheet_name: dataSheetName,
  };
};
