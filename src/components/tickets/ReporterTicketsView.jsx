import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../utils/supabase";
import { showToast } from "../../utils/toast";
import DataGrid from "../DataGrid";
import DetailModal from "../DetailModal";

const getLocalMappingFallback = (uuid) => {
  const mappings = {
    complaint: {
      google_sheet_id: "1E97QNg6HM6ZJlTGdYUlK5FiD-WwhNYl3vTDRixRgA9A",
      data_sheet_name: "complaint_data",
    },
    career: {
      google_sheet_id: "1rtxVBXFij9ZxwQhjRhzB8X6Phb0oxOKgxWgBYpSQ6xI",
      data_sheet_name: "career_data",
    }
  };
  return mappings[uuid] || null;
};

let reporterTicketsCache = {
  userId: null,
  configs: [],
  mappings: [],
  tickets: [],
  selectedConfig: null,
};

const ReporterTicketsView = ({ user, fullName }) => {
  const isCacheValid = user?.id && reporterTicketsCache.userId === user.id;

  const [loading, setLoading] = useState(() => !isCacheValid);
  const [configs, setConfigs] = useState(() => (isCacheValid ? reporterTicketsCache.configs : []));
  const [mappings, setMappings] = useState(() => (isCacheValid ? reporterTicketsCache.mappings : []));
  const [tickets, setTickets] = useState(() => (isCacheValid ? reporterTicketsCache.tickets : []));
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedConfig, setSelectedConfig] = useState(() => (isCacheValid ? reporterTicketsCache.selectedConfig : null));
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");

  const fetchUserTickets = async (config, allMappings) => {
    if (!config.data_id) {
      setTickets([]);
      if (user?.id) {
        reporterTicketsCache.tickets = [];
      }
      return;
    }
    const mapping = (allMappings && allMappings.find((m) => m.data_id === config.data_id)) || getLocalMappingFallback(config.form_name || config.data_id);

    try {
      const searchParams = {
        action: "search",
        uuid: config.form_name || config.data_id,
        criteria: {
          email: user?.email || "",
        },
      };

      if (mapping) {
        searchParams.google_sheet_id = mapping.google_sheet_id;
        searchParams.data_sheet_name = mapping.data_sheet_name;
      }

      const res = await fetch(
        `${import.meta.env.VITE_APPS_SCRIPT_URL}?action=search`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(searchParams),
        }
      );
      const data = await res.json();
      if (data.success) {
        setTickets(data.data || []);
        if (user?.id) {
          reporterTicketsCache.tickets = data.data || [];
        }
      } else {
        throw new Error(data.error || "Failed to search tickets");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tickets: " + err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [configsRes, mappingsRes] = await Promise.all([
        supabase.from("dynamic_form_configs").select("*"),
        supabase.from("google_sheet_mappings").select("*"),
      ]);

      if (configsRes.error) throw configsRes.error;
      if (mappingsRes.error) throw mappingsRes.error;

      const activeConfigs = configsRes.data || [];
      const activeMappings = mappingsRes.data || [];

      setConfigs(activeConfigs);
      setMappings(activeMappings);
      if (user?.id) {
        reporterTicketsCache.configs = activeConfigs;
        reporterTicketsCache.mappings = activeMappings;
      }

      const defaultForm =
        activeConfigs.find((c) => c.form_name === "complaint") ||
        activeConfigs.find((c) => c.data_id) ||
        activeConfigs[0];

      if (defaultForm) {
        setSelectedConfig(defaultForm);
        if (user?.id) {
          reporterTicketsCache.selectedConfig = defaultForm;
        }
        await fetchUserTickets(defaultForm, activeMappings);
      }
      if (user?.id) {
        reporterTicketsCache.userId = user.id;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && reporterTicketsCache.userId === user.id) {
      return;
    }
    loadData();
  }, [user]);

  const handleSendConversationMessage = async (fieldName, messageText) => {
    if (!selectedTicket || !selectedConfig) return;

    let existing = [];
    try {
      existing = JSON.parse(selectedTicket[fieldName] || "[]");
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const senderName = user?.full_name || fullName || "Reporter";
    const newMsgObj = {
      sender: senderName,
      "time-stamp": new Date().toLocaleString(),
      message: messageText,
    };
    const nextVal = JSON.stringify([...existing, newMsgObj]);

    setSendingMessage(true);
    try {
      const selectedMapping = (mappings && mappings.find(
        (m) => m.data_id === selectedConfig.data_id
      )) || getLocalMappingFallback(selectedConfig.form_name || selectedConfig.data_id);

      const updatePayload = {
        action: "update",
        uuid: selectedConfig.form_name || selectedConfig.data_id,
        matchColumn: "id",
        records: [
          {
            matchValue: selectedTicket.id,
            data: {
              [fieldName]: nextVal,
            },
          },
        ],
      };

      if (selectedMapping) {
        updatePayload.google_sheet_id = selectedMapping.google_sheet_id;
        updatePayload.data_sheet_name = selectedMapping.data_sheet_name;
      }

      const res = await fetch(import.meta.env.VITE_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(updatePayload),
      });

      const result = await res.json();
      if (result.success) {
        const updatedTicket = { ...selectedTicket, [fieldName]: nextVal };
        setSelectedTicket(updatedTicket);
        setTickets((prev) =>
          prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
        );
        showToast("Message sent successfully!", "success");
      } else {
        throw new Error(result.error || "Failed to update conversation");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to send message: " + err.message, "error");
    } finally {
      setSendingMessage(false);
    }
  };

  const columnConfig = useMemo(() => {
    if (!selectedConfig || !selectedConfig.fields) return {};
    const config = {};
    const fieldsList = Array.isArray(selectedConfig.fields) ? selectedConfig.fields : [];
    fieldsList.forEach((field) => {
      const name = field["Field Name"]?.trim();
      if (name) {
        config[name] = {
          label: field.Label || name
        };
        config[name.toLowerCase()] = {
          label: field.Label || name
        };
      }
    });
    return config;
  }, [selectedConfig]);

  const fieldLabels = useMemo(() => {
    const map = {};
    if (selectedConfig && selectedConfig.fields) {
      const fieldsList = Array.isArray(selectedConfig.fields) ? selectedConfig.fields : [];
      fieldsList.forEach((field) => {
        const name = field["Field Name"]?.trim();
        if (name) {
          map[name.toLowerCase()] = field.Label || name;
        }
      });
    }
    return map;
  }, [selectedConfig]);

  const detailExcludeFields = useMemo(() => {
    const base = ["uuid", "email"];
    if (selectedConfig && selectedConfig.fields) {
      const fieldsList = Array.isArray(selectedConfig.fields) ? selectedConfig.fields : [];
      fieldsList.forEach((field) => {
        const name = field["Field Name"]?.trim();
        const type = field["Field Type"]?.trim().toLowerCase();
        if (name && (type === "conversation" || name.toLowerCase() === "conversation")) {
          base.push(name);
        }
      });
    }
    return base;
  }, [selectedConfig]);

  const conversationFieldsData = [];
  if (selectedTicket && selectedConfig) {
    const fieldsList = Array.isArray(selectedConfig.fields)
      ? selectedConfig.fields
      : [];
    fieldsList.forEach((field) => {
      const key = field["Field Name"]?.trim();
      const type = field["Field Type"]?.trim().toLowerCase();
      if (key && (type === "conversation" || key.toLowerCase() === "conversation")) {
        conversationFieldsData.push({
          key: key,
          label: field.Label || key,
          value: selectedTicket[key] || "[]",
          onSendMessage: handleSendConversationMessage,
          isSending: sendingMessage,
        });
      }
    });
  }

  const handlePrevRecord = () => {
    const idx = tickets.indexOf(selectedTicket);
    if (idx > 0) setSelectedTicket(tickets[idx - 1]);
  };

  const handleNextRecord = () => {
    const idx = tickets.indexOf(selectedTicket);
    if (idx < tickets.length - 1) setSelectedTicket(tickets[idx + 1]);
  };

  return (
    <div className="bg-white border border-light-border shadow-xl overflow-hidden rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-dark-deepblue">
            My Submitted Tickets
          </h3>
          <p className="text-sm text-dark-muted">
            Track the status of your requests and participate in conversation threads.
          </p>
        </div>
        {configs.filter((c) => c.data_id).length > 0 && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-dark-deepblue uppercase shrink-0">
              Form Category:
            </label>
            <select
              value={selectedConfig?.form_name || ""}
              onChange={(e) => {
                const config = configs.find(
                  (c) => c.form_name === e.target.value
                );
                if (config) {
                  setSelectedConfig(config);
                  setTickets([]);
                  fetchUserTickets(config, mappings);
                }
              }}
              className="px-4 py-2 border border-light-border bg-white rounded-xl text-xs font-bold text-dark-deepblue outline-none focus:border-indigo-500 transition-all cursor-pointer w-full sm:w-auto"
            >
              {configs
                .filter((c) => c.data_id)
                .map((c) => (
                  <option key={c.form_name} value={c.form_name}>
                    {c.display_name || c.form_name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-dark-muted border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50/20">
          <i className="fas fa-ticket-alt text-4xl mb-4 text-gray-300"></i>
          <p className="font-semibold text-sm">No tickets found for your email.</p>
        </div>
      ) : (
        <DataGrid
          data={tickets}
          onRowClick={(ticket) => setSelectedTicket(ticket)}
          excludeColumns={["uuid", "email"]}
          columnConfig={columnConfig}
        />
      )}

      {selectedTicket && (
        <DetailModal
          record={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={`${selectedConfig?.display_name || "Ticket"} Details`}
          conversationFields={conversationFieldsData}
          excludeFields={detailExcludeFields}
          onPrevRecord={handlePrevRecord}
          onNextRecord={handleNextRecord}
          hasPrevRecord={tickets.indexOf(selectedTicket) > 0}
          hasNextRecord={tickets.indexOf(selectedTicket) < tickets.length - 1}
          currentRecordIndex={tickets.indexOf(selectedTicket)}
          totalRecords={tickets.length}
          fieldLabels={fieldLabels}
        />
      )}
    </div>
  );
};

export default ReporterTicketsView;
