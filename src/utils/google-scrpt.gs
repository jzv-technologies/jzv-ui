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
    const action = e.parameter.action;

    if (action === "config") {
      const uuid = e.parameter.uuid;
      return getFormConfig(uuid);
    }

    if (action === "submit") {
      return submitFormData(e);
    }

    return jsonResponse(null, "Invalid action");
  } catch (err) {
    return jsonResponse(null, err.message);
  }
}

/**
 * Retrieves mapping for a UUID.
 * Checks ScriptProperties first (Cache). If missing, reads Sheet and saves to Cache.
 */
function getMapping(uuid) {
  const props = PropertiesService.getScriptProperties();
  const cacheKey = `MAPPING_${uuid}`; // As requested: FORM_${uuid}
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

function submitFormData(e) {
  const body = JSON.parse(e.postData.contents);
  const uuid = body.uuid;
  const formData = body.data;

  if (!uuid || !formData) return jsonResponse(null, "Missing uuid or data");

  const mapping = getMapping(uuid);
  if (!mapping) return jsonResponse(null, `UUID "${uuid}" not found`);

  const targetSheetId = mapping.dataSheetId;
  const targetSheetName = mapping.dataSheetName;

  const ss = SpreadsheetApp.openById(targetSheetId);
  const sheet = ss.getSheetByName(targetSheetName);
  if (!sheet)
    return jsonResponse(null, `Target sheet "${targetSheetName}" not found`);

  // Auto‑increment ID per target sheet
  const storageKey = `ID_${targetSheetId}_${targetSheetName}`;
  const scriptProperties = PropertiesService.getScriptProperties();
  let lastId = parseInt(scriptProperties.getProperty(storageKey)) || 0;
  const newId = lastId + 1;
  scriptProperties.setProperty(storageKey, newId.toString());

  let headers = sheet
    .getDataRange()
    .getValues()[0]
    .map((h) => String(h).trim());
  if (headers.length === 1 && headers[0] === "") {
    headers = ["id", ...Object.keys(formData)];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const rowData = headers.map((h) => {
    if (h === "id") return newId;
    return formData[h] ?? "";
  });

  sheet.appendRow(rowData);
  console.log(`Action [submit]: Row appended successfully. ID: ${newId}`);
  return jsonResponse({
    message: `Row appended to ${targetSheetName}`,
    id: newId,
  });
}

/**
 * Utility to clear the cache if you update the mapping sheet.
 * Run this manually from the editor if you change sheet IDs/Names/Config Data in the "mapping" sheet.
 */

function clearAllCache() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys();
  // Clears Mappings and Config Data
  keys.forEach((k) => {
    if (k.startsWith("FORM_") || k.startsWith("MAPPING_")) {
      props.deleteProperty(k);
    }
  });
  console.log("All caches cleared.");
}

function jsonResponse(data = null, error = null) {
  const payload = { success: !error, data: data, error: error };
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
