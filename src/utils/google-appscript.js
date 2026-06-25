// ========== CONFIGURATION (edit these) ==========
const CONFIG_SPREADSHEET_ID = "1DEAcXyineQexq3gP90hTKQvqeAOouRXpH75CKt4Nq_8";
// ================================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Standardize finding the action whether it's via query params or JSON body
    let action = e.parameter.action;
    let body = null;

    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
      if (!action && body.action) action = body.action;
    }

    switch (action) {
      case "list-configs":
        return listConfigs();

      case "config": {
        const uuid = e.parameter.uuid || (body ? body.uuid : null);
        return getFormConfig(uuid);
      }

      case "submit":
        return submitFormData(body);

      case "search":
        return searchFormData(body);

      case "update":
        return updateFormData(body);

      case "test-connection": {
        const sheetId = e.parameter.google_sheet_id || (body ? body.google_sheet_id : null);
        const sheetName = e.parameter.data_sheet_name || (body ? body.data_sheet_name : null);
        return testConnection(sheetId, sheetName);
      }

      case "create-sheet": {
        const sheetId = e.parameter.google_sheet_id || (body ? body.google_sheet_id : null);
        const sheetName = e.parameter.data_sheet_name || (body ? body.data_sheet_name : null);
        return createSheetTab(sheetId, sheetName);
      }

      case "validate-fields": {
        return validateFields(body);
      }

      case "invalidate-form-cache": {
        const uuid = e.parameter.uuid || (body ? body.uuid : null);
        return clearFormCache(uuid);
      }

      default:
        return jsonResponse(null, "Invalid action");
    }
  } catch (err) {
    return jsonResponse(null, err.message);
  }
}

/**
 * Retrieves mapping for a UUID.
 * Checks ScriptProperties first (Cache). If missing, reads Sheet and saves to Cache.
 */
function getMapping(uuid) {
  if (!uuid) return null;
  const props = PropertiesService.getScriptProperties();
  const cacheKey = `MAPPING_${uuid}`;
  const cachedData = props.getProperty(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // --- Cache Miss: Load from mapping sheet ---
  const ss = SpreadsheetApp.openById(CONFIG_SPREADSHEET_ID);
  const mappingSheet = ss.getSheetByName("mapping");
  if (!mappingSheet) return null;

  const data = mappingSheet.getDataRange().getValues();
  const headers = data[0].map((h) => String(h).trim());

  const idxUUID = headers.indexOf("UUID");
  const idxDataId = headers.indexOf("dataSheetId");
  const idxDataNm = headers.indexOf("dataSheetName");
  const idxConfNm = headers.indexOf("configSheetName");
  const idxIdPattern = headers.indexOf("idPattern");

  if (
    idxUUID === -1 ||
    idxDataId === -1 ||
    idxDataNm === -1 ||
    idxConfNm === -1
  )
    return null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxUUID]).trim() === uuid.trim()) {
      const mapping = {
        dataSheetId: String(data[i][idxDataId]).trim(),
        dataSheetName: String(data[i][idxDataNm]).trim(),
        configSheetName: String(data[i][idxConfNm]).trim(),
        idPattern:
          idxIdPattern !== -1
            ? String(data[i][idxIdPattern]).trim()
            : "ID-XXXXX",
      };

      // Persist in PropertiesService for future requests
      props.setProperty(cacheKey, JSON.stringify(mapping));
      console.log(`getMapping: Mapping found and cached for ${uuid}`);
      return mapping;
    }
  }
  return null;
}

function getFormConfig(uuid) {
  if (!uuid) return jsonResponse(null, "Missing UUID");

  const mapping = getMapping(uuid);
  if (!mapping)
    return jsonResponse(null, `UUID "${uuid}" not found in mapping`);

  const props = PropertiesService.getScriptProperties();
  const formCacheKey = `FORM_${mapping.configSheetName}`;
  const cachedConfig = props.getProperty(formCacheKey);

  if (cachedConfig) {
    return jsonResponse(JSON.parse(cachedConfig));
  }

  console.log(
    `Action [config]: Cache MISS for ${formCacheKey}. Reading from Sheet.`,
  );
  const ss = SpreadsheetApp.openById(CONFIG_SPREADSHEET_ID);
  const configSheet = ss.getSheetByName(mapping.configSheetName);
  if (!configSheet)
    return jsonResponse(
      null,
      `Config sheet "${mapping.configSheetName}" not found`,
    );

  const [headers, ...rows] = configSheet.getDataRange().getValues();
  const cleanHeaders = headers.map((h) => String(h).trim());

  const jsonData = rows
    .map((row) => {
      let obj = {};
      cleanHeaders.forEach((h, i) => (obj[h] = row[i] ?? ""));
      // Remove blank values (empty string, null, undefined)
      obj = Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== "" && v != null),
      );
      return obj;
    })
    .filter((obj) => obj["Field Name"]); // skip rows without a field name

  const stringifiedData = JSON.stringify(jsonData);
  if (stringifiedData.length < 9000) {
    props.setProperty(formCacheKey, stringifiedData);
  }

  return jsonResponse(jsonData);
}

function listConfigs() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG_SPREADSHEET_ID);
    const mappingSheet = ss.getSheetByName("mapping");
    if (!mappingSheet)
      return jsonResponse(null, "Mapping sheet 'mapping' not found");

    const data = mappingSheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse([]);

    const headers = data[0].map((h) => String(h).trim());
    const idxUUID = headers.indexOf("UUID");
    const idxDataId = headers.indexOf("dataSheetId");
    const idxDataNm = headers.indexOf("dataSheetName");
    const idxConfNm = headers.indexOf("configSheetName");
    const idxIdPattern = headers.indexOf("idPattern");

    if (
      idxUUID === -1 ||
      idxDataId === -1 ||
      idxDataNm === -1 ||
      idxConfNm === -1
    ) {
      return jsonResponse(
        null,
        "Invalid mapping sheet headers. Expected UUID, dataSheetId, dataSheetName, configSheetName.",
      );
    }

    const configs = [];
    for (let i = 1; i < data.length; i++) {
      const uuidVal = String(data[i][idxUUID]).trim();
      if (uuidVal) {
        configs.push({
          uuid: uuidVal,
          dataSheetId: String(data[i][idxDataId]).trim(),
          dataSheetName: String(data[i][idxDataNm]).trim(),
          configSheetName: String(data[i][idxConfNm]).trim(),
          idPattern:
            idxIdPattern !== -1
              ? String(data[i][idxIdPattern]).trim()
              : "ID-XXXXX",
        });
      }
    }
    return jsonResponse(configs);
  } catch (err) {
    return jsonResponse(null, err.message);
  }
}

function submitFormData(body) {
  if (!body) return jsonResponse(null, "Missing request body");
  const uuid = body.uuid;
  const formData = body.data;

  if (!formData) return jsonResponse(null, "Missing data");

  // Automatically add created/updated timestamps
  const now = new Date().toISOString();
  if (!formData.created) formData.created = now;
  formData.updated = now;

  let targetSheetId = body.google_sheet_id || body.dataSheetId;
  let targetSheetName = body.data_sheet_name || body.dataSheetName;
  let pattern = body.id_pattern || body.idPattern || "ID-XXXXX";

  if (!targetSheetId || !targetSheetName) {
    if (!uuid) return jsonResponse(null, "Missing uuid or sheet override parameters");
    const mapping = getMapping(uuid);
    if (!mapping) return jsonResponse(null, `UUID "${uuid}" not found`);

    targetSheetId = mapping.dataSheetId;
    targetSheetName = mapping.dataSheetName;
    pattern = body.id_pattern || body.idPattern || mapping.idPattern || "ID-XXXXX";
  }

  const ss = SpreadsheetApp.openById(targetSheetId);
  const sheet = ss.getSheetByName(targetSheetName);
  if (!sheet)
    return jsonResponse(null, `Target sheet "${targetSheetName}" not found`);

  // Acquire Script Lock to handle concurrency
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Wait up to 15 seconds
  } catch (err) {
    return jsonResponse(
      null,
      "Could not acquire script lock (timeout): " + err.message,
    );
  }

  try {
    // Auto‑increment ID per target sheet
    const storageKey = `ID_${targetSheetId}_${targetSheetName}`;
    const scriptProperties = PropertiesService.getScriptProperties();
    let lastId = parseInt(scriptProperties.getProperty(storageKey)) || 0;
    const nextCounter = lastId + 1;
    scriptProperties.setProperty(storageKey, nextCounter.toString());

    // Generate pattern-based ID (e.g., CMP-00001)
    const [prefix, format] = pattern.split("-");
    const padLength = (format || "XXXXX").length;
    const formattedId = `${prefix}-${nextCounter.toString().padStart(padLength, "0")}`;

    // --- Header Management (Cached) ---
    const headerKey = `HEADERS_${targetSheetId}_${targetSheetName}`;
    let cachedHeaders = scriptProperties.getProperty(headerKey);
    let headers = cachedHeaders ? JSON.parse(cachedHeaders) : null;

    if (!headers) {
      console.log(
        `Action [submit]: Header cache MISS for "${targetSheetName}". Reading sheet.`,
      );
      headers = sheet
        .getDataRange()
        .getValues()[0]
        .map((h) => String(h).trim());
      if (headers.length === 1 && headers[0] === "") {
        headers = ["id"];
      }
      scriptProperties.setProperty(headerKey, JSON.stringify(headers));
    }

    // Check for new fields
    const formKeys = Object.keys(formData);
    const newFields = formKeys.filter(
      (key) => key !== "id" && !headers.includes(key),
    );

    if (newFields.length > 0) {
      headers = [...headers, ...newFields];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      scriptProperties.setProperty(headerKey, JSON.stringify(headers));
      console.log(
        `Action [submit]: Expanded headers and updated cache for "${targetSheetName}". Added: ${newFields.join(", ")}`,
      );
    }

    const rowData = headers.map((h) => {
      if (h === "id") return formattedId;
      return formData[h] !== undefined ? formData[h] : "";
    });

    sheet.appendRow(rowData);
    console.log(
      `Action [submit]: Row appended successfully. ID: ${formattedId}`,
    );

    return jsonResponse({
      message: "Form submitted successfully",
      id: formattedId,
    });
  } catch (err) {
    return jsonResponse(null, err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Highly optimized search for large data sheets using native array filtering.
 * Expected JSON payload: { "action": "search", "uuid": "...", "criteria": { "Status": "Active", "Role": "Admin" } }
 */
function searchFormData(body) {
  if (!body) return jsonResponse(null, "Missing request body");
  const uuid = body.uuid;

  // Normalize criteria keys to lowercase for foolproof matching
  const criteria = body.criteria || {};
  const criteriaKeys = Object.keys(criteria);

  let targetSheetId = body.google_sheet_id || body.dataSheetId;
  let targetSheetName = body.data_sheet_name || body.dataSheetName;

  if (!targetSheetId || !targetSheetName) {
    if (!uuid) return jsonResponse(null, "Missing uuid or sheet override parameters");
    const mapping = getMapping(uuid);
    if (!mapping) return jsonResponse(null, `UUID "${uuid}" not found`);
    targetSheetId = mapping.dataSheetId;
    targetSheetName = mapping.dataSheetName;
  }

  const ss = SpreadsheetApp.openById(targetSheetId);
  const sheet = ss.getSheetByName(targetSheetName);
  if (!sheet)
    return jsonResponse(null, `Sheet "${targetSheetName}" not found`);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return jsonResponse([]);

  const headers = values[0].map((h) => String(h).trim());

  // Map criteria keys to their exact case-sensitive header matches and column indices
  const filterSpecs = criteriaKeys
    .map((key) => {
      const idx = headers.findIndex(
        (h) => h.toLowerCase() === key.toLowerCase(),
      );
      return {
        index: idx,
        value: String(criteria[key]).toLowerCase(),
      };
    })
    .filter((spec) => spec.index !== -1); // Ignore criteria fields that don't exist in headers

  // If none of the criteria columns exist in the sheet, return empty array early
  if (criteriaKeys.length > 0 && filterSpecs.length === 0)
    return jsonResponse([]);

  // Slice off headers and use native JS filter (highly optimized in V8 engine)
  const matchingRows = values.slice(1).filter((row) => {
    // Every single filter condition must return true
    return filterSpecs.every(
      (spec) => String(row[spec.index]).toLowerCase() === spec.value,
    );
  });

  // Construct response objects efficiently
  const results = matchingRows.map((row) => {
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx];
    });
    return record;
  });

  return jsonResponse(results);
}

/**
 * Bulk updates multiple records based on a dynamically declared identifier column.
 * Batch processes changes to minimize Sheets API read/write cycles.
 * Expected JSON payload:
 * {
 *   "action": "update",
 *   "uuid": "...",
 *   "matchColumn": "Email",
 *   "records": [
 *     { "matchValue": "alex@company.com", "data": { "Status": "Active", "Role": "Manager" } },
 *     { "matchValue": "jordan@company.com", "data": { "Status": "Suspended" } }
 *   ]
 * }
 */
function updateFormData(body) {
  if (!body) return jsonResponse(null, "Missing request body");
  const uuid = body.uuid;
  const matchColumn = body.matchColumn || "id"; // Default fallback to your standard 'id' column
  const recordsToUpdate = body.records;

  if (!Array.isArray(recordsToUpdate) || recordsToUpdate.length === 0) {
    return jsonResponse(null, "Missing or invalid 'records' array for update.");
  }

  let targetSheetId = body.google_sheet_id || body.dataSheetId;
  let targetSheetName = body.data_sheet_name || body.dataSheetName;

  if (!targetSheetId || !targetSheetName) {
    if (!uuid) return jsonResponse(null, "Missing uuid or sheet override parameters");
    const mapping = getMapping(uuid);
    if (!mapping) return jsonResponse(null, `UUID "${uuid}" not found`);
    targetSheetId = mapping.dataSheetId;
    targetSheetName = mapping.dataSheetName;
  }

  const ss = SpreadsheetApp.openById(targetSheetId);
  const sheet = ss.getSheetByName(targetSheetName);
  if (!sheet)
    return jsonResponse(null, `Sheet "${targetSheetName}" not found`);

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let headers = values[0].map((h) => String(h).trim());

  // Automatically check if update payloads contain new fields that are not in headers
  let newFields = [];
  recordsToUpdate.forEach((item) => {
    const updateData = item.data || {};
    Object.keys(updateData).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "id" &&
        !headers.some((h) => h.toLowerCase() === lowerKey)
      ) {
        if (!newFields.some((nf) => nf.toLowerCase() === lowerKey)) {
          newFields.push(key);
        }
      }
    });
  });

  if (newFields.length > 0) {
    headers = [...headers, ...newFields];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Clear and update the cached headers
    const headerKey = `HEADERS_${targetSheetId}_${targetSheetName}`;
    PropertiesService.getScriptProperties().setProperty(
      headerKey,
      JSON.stringify(headers),
    );
    console.log(
      `Action [update]: Expanded sheet headers: ${newFields.join(", ")}`,
    );
  }

  // Find the index of the user's custom identifier column
  const matchColIdx = headers.findIndex(
    (h) => h.toLowerCase() === matchColumn.toLowerCase(),
  );
  if (matchColIdx === -1) {
    return jsonResponse(
      null,
      `The lookup column '${matchColumn}' was not found in the sheet headers.`,
    );
  }

  // Create a fast map look-up of ID -> Row Index (Apps script rows are 1-indexed, headers are row 1)
  const rowMap = {};
  for (let i = 1; i < values.length; i++) {
    const lookupVal = String(values[i][matchColIdx]).trim();
    if (lookupVal) {
      rowMap[lookupVal] = i + 1;
    }
  }

  let updateCount = 0;
  let skippedCount = 0;

  // Process updates individually on the sheet range grid
  recordsToUpdate.forEach((item) => {
    const lookupKey = String(item.matchValue).trim();
    const targetRowIndex = rowMap[lookupKey];

    if (!targetRowIndex) {
      skippedCount++;
      return; // Skip if this identifier record isn't found in the sheet
    }

    const updateData = item.data || {};
    updateData.updated = new Date().toISOString(); // Automatically refresh updated timestamp

    // Write changes column by column for this targeted row
    for (const columnKey in updateData) {
      const colIdx = headers.findIndex(
        (h) => h.toLowerCase() === columnKey.toLowerCase(),
      );

      // Prevent overwriting the match identifier column itself to safeguard data integrity
      if (colIdx !== -1 && colIdx !== matchColIdx) {
        const value = String(updateData[columnKey]);
        sheet.getRange(targetRowIndex, colIdx + 1).setValue(value);
      }
    }
    updateCount++;
  });

  return jsonResponse({
    message: "Bulk update completed.",
    processed: updateCount,
    notFoundAndSkipped: skippedCount,
  });
}

function clearFormCache(uuid) {
  if (!uuid) return clearAllCache();
  
  const props = PropertiesService.getScriptProperties();
  
  // Delete mapping cache key
  props.deleteProperty(`MAPPING_${uuid}`);
  
  // Find mapping to clean up the FORM_ and HEADERS_ cache keys
  try {
    const mapping = getMapping(uuid);
    if (mapping) {
      if (mapping.configSheetName) {
        props.deleteProperty(`FORM_${mapping.configSheetName}`);
      }
      if (mapping.dataSheetId && mapping.dataSheetName) {
        props.deleteProperty(`HEADERS_${mapping.dataSheetId}_${mapping.dataSheetName}`);
      }
    }
  } catch (e) {
    console.warn("clearFormCache lookup failed:", e);
  }
  
  // Explicitly delete mapping cache key again (to make sure it's gone)
  props.deleteProperty(`MAPPING_${uuid}`);
  
  return jsonResponse({
    message: `Cache cleared for form "${uuid}"`
  });
}

function clearAllCache() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys();
  let keys_counter = 0;
  keys.forEach((k) => {
    if (
      k.startsWith("FORM_") ||
      k.startsWith("MAPPING_") ||
      k.startsWith("HEADERS_")
    ) {
      keys_counter++;
      props.deleteProperty(k);
    }
  });
  console.log("All caches cleared.");
  return jsonResponse({
    message: `Cache cleared for ${keys_counter} forms`,
  });
}

function jsonResponse(data = null, error = null) {
  const payload = { success: !error, data: data, error: error };
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function testConnection(sheetId, sheetName) {
  if (!sheetId) return jsonResponse(null, "Missing Google Sheet ID");
  if (!sheetName) return jsonResponse(null, "Missing Sheet Tab Name");
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse(null, "Sheet tab \"" + sheetName + "\" not found in spreadsheet.");
    }
    return jsonResponse({ message: "Successfully connected to sheet tab." });
  } catch (err) {
    return jsonResponse(null, "Connection failed: " + err.message);
  }
}

function createSheetTab(sheetId, sheetName) {
  if (!sheetId) return jsonResponse(null, "Missing Google Sheet ID");
  if (!sheetName) return jsonResponse(null, "Missing Sheet Tab Name");
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      return jsonResponse({ message: "Sheet tab \"" + sheetName + "\" already exists." });
    }
    sheet = ss.insertSheet(sheetName);
    // Initialize headers with 'id'
    sheet.getRange(1, 1).setValue("id");
    return jsonResponse({ message: "Successfully created sheet tab \"" + sheetName + "\"." });
  } catch (err) {
    return jsonResponse(null, "Failed to create sheet tab: " + err.message);
  }
}

function validateFields(body) {
  if (!body) return jsonResponse(null, "Missing request body");
  const sheetId = body.google_sheet_id;
  const sheetName = body.data_sheet_name;
  const fieldsToCheck = body.fields || [];

  if (!sheetId) return jsonResponse(null, "Missing Google Sheet ID");
  if (!sheetName) return jsonResponse(null, "Missing Sheet Tab Name");

  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse(null, "Sheet tab \"" + sheetName + "\" not found in spreadsheet.");
    }

    // Read current headers
    const values = sheet.getDataRange().getValues();
    let headers = [];
    if (values.length > 0) {
      headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
    }

    // Check which fields are missing (case-insensitive check)
    const missingFields = [];
    fieldsToCheck.forEach(function(f) {
      const fieldName = String(f).trim();
      if (fieldName && headers.indexOf(fieldName.toLowerCase()) === -1) {
        missingFields.push(fieldName);
      }
    });

    if (missingFields.length === 0) {
      return jsonResponse({
        message: "All fields exist in the target sheet.",
        missingCount: 0,
        createdFields: []
      });
    }

    // If there are missing fields, create them!
    let currentHeaders = [];
    if (values.length > 0) {
      currentHeaders = values[0].map(function(h) { return String(h).trim(); });
    } else {
      currentHeaders = ["id"];
    }

    // Filter out empty headers and append missing fields
    const newHeaders = currentHeaders.slice();
    missingFields.forEach(function(f) {
      newHeaders.push(f);
    });

    // Write headers back to row 1
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

    // Invalidate script properties headers cache
    const scriptProperties = PropertiesService.getScriptProperties();
    const headerKey = "HEADERS_" + sheetId + "_" + sheetName;
    scriptProperties.setProperty(headerKey, JSON.stringify(newHeaders));

    return jsonResponse({
      message: "Successfully validated sheet. Added " + missingFields.length + " missing fields: " + missingFields.join(", "),
      missingCount: missingFields.length,
      createdFields: missingFields
    });
  } catch (err) {
    return jsonResponse(null, "Validation failed: " + err.message);
  }
}
