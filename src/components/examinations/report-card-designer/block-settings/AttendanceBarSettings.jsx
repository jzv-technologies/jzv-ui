import React from 'react';
import { ColorPicker } from '../ColorPicker';

/**
 * AttendanceBarSettings
 * Block-specific settings for the attendance graph.
 * Extracted from the original ReportCardDesigner.jsx — no behaviour change.
 */
const AttendanceBarSettings = ({ currentConfig, setCurrentConfig }) => {
  const atCfg = currentConfig.attendanceBarConfig || {};
  const updateAt = (patch) =>
    setCurrentConfig((p) => ({
      ...p,
      attendanceBarConfig: { ...p.attendanceBarConfig, ...patch },
    }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
            Section Heading
          </label>
          <input
            type="text"
            value={atCfg.title ?? 'Attendance Record & Summary'}
            onChange={(e) => updateAt({ title: e.target.value })}
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-[11px] font-bold text-dark-slate mb-1 truncate">
            Total Academic Working Days
          </label>
          <input
            type="number"
            min={1}
            value={atCfg.totalWorkingDays ?? 200}
            onChange={(e) =>
              updateAt({
                totalWorkingDays: Number(e.target.value) || 200,
              })
            }
            className="w-full min-w-0 px-2.5 py-1.5 text-xs border border-light-border rounded-xl bg-white font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Present Color */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl min-w-0">
          <ColorPicker
            label="Present Color"
            value={atCfg.presentColor || '#059669'}
            placeholder="#059669"
            allowClear={false}
            onChange={(val) => updateAt({ presentColor: val })}
            presets={['#059669', '#10b981', '#15803d', '#22c55e', '#16a34a', '#047857']}
          />
        </div>
        {/* Leave Color */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl min-w-0">
          <ColorPicker
            label="Leave Color"
            value={atCfg.leaveColor || '#f59e0b'}
            placeholder="#f59e0b"
            allowClear={false}
            onChange={(val) => updateAt({ leaveColor: val })}
            presets={['#f59e0b', '#d97706', '#b45309', '#f97316', '#ea580c', '#eab308']}
          />
        </div>
        {/* Absent Color */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl min-w-0">
          <ColorPicker
            label="Absent Color"
            value={atCfg.absentColor || '#e11d48'}
            placeholder="#e11d48"
            allowClear={false}
            onChange={(val) => updateAt({ absentColor: val })}
            presets={['#e11d48', '#dc2626', '#b91c1c', '#991b1b', '#f43f5e', '#be123c']}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Bar Height */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl">
          <div className="flex justify-between text-[10px] font-bold text-dark-slate mb-1">
            <span>Bar Height</span>
            <span className="font-mono">{atCfg.barHeight ?? 18}px</span>
          </div>
          <input
            type="range"
            min={10}
            max={36}
            step={2}
            value={atCfg.barHeight ?? 18}
            onChange={(e) => updateAt({ barHeight: Number(e.target.value) })}
            className="w-full accent-rose-600 cursor-pointer"
          />
        </div>

        {/* Feature Toggles */}
        <div className="p-2.5 bg-white border border-light-border rounded-xl flex flex-col justify-center gap-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={atCfg.showTitle !== false}
              onChange={(e) => updateAt({ showTitle: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-dark-primary">Show Section Title</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={atCfg.showStats !== false}
              onChange={(e) => updateAt({ showStats: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-dark-primary">
              Show Summary Stats Chips
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={atCfg.showPercentage !== false}
              onChange={(e) => updateAt({ showPercentage: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-400 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-dark-primary">Show Attendance % Badge</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default AttendanceBarSettings;
