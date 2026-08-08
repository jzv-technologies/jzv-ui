import React, { useMemo, useRef } from 'react';

const MonthSwatches = ({ selectedMonthStr, onChangeMonth }) => {
  const inputRef = useRef(null);

  // Compute 4 swatches centered around the selected month (or current date if unselected)
  const swatches = useMemo(() => {
    let baseYear = new Date().getFullYear();
    let baseMonth = new Date().getMonth(); // 0-indexed

    if (selectedMonthStr && typeof selectedMonthStr === 'string') {
      const parts = selectedMonthStr.split('-');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          baseYear = y;
          baseMonth = m - 1;
        }
      }
    }

    const currentYear = new Date().getFullYear();

    return [-2, -1, 0, 1].map((offset) => {
      const d = new Date(baseYear, baseMonth + offset, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthStr = `${yyyy}-${mm}`;
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      // Include year suffix if not current year
      const label = yyyy === currentYear ? monthShort : `${monthShort} '${String(yyyy).slice(-2)}`;
      return { monthStr, label, isSelected: monthStr === selectedMonthStr };
    });
  }, [selectedMonthStr]);

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        try {
          inputRef.current.showPicker();
        } catch (err) {
          inputRef.current.click();
        }
      } else {
        inputRef.current.click();
      }
    }
  };

  return (
    <div className="w-full md:w-auto grid grid-cols-5 md:flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200 text-center shrink-0">
      {swatches.map((s) => (
        <button
          key={s.monthStr}
          type="button"
          onClick={() => onChangeMonth(s.monthStr)}
          className={`w-full md:w-auto px-2 md:px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center text-center ${
            s.isSelected
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-dark-soft hover:bg-white/60 hover:text-dark-primary'
          }`}
        >
          {s.label}
        </button>
      ))}

      {/* 5th Swatch: Select / Custom Month Picker */}
      <div className="relative w-full md:w-auto">
        <button
          type="button"
          onClick={handleOpenPicker}
          className="w-full md:w-auto px-2 md:px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 text-center text-dark-soft hover:bg-white/60 hover:text-dark-primary active:scale-95"
          title="Select Custom Month & Year"
        >
          <i className="fas fa-calendar-alt text-[10px]"></i>
          <span>Select</span>
        </button>
        <input
          ref={inputRef}
          type="month"
          value={selectedMonthStr || ''}
          onChange={(e) => {
            if (e.target.value) {
              onChangeMonth(e.target.value);
            }
          }}
          className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
          tabIndex={-1}
        />
      </div>
    </div>
  );
};

export default MonthSwatches;
