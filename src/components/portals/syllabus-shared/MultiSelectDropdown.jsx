import React, { useState, useEffect, useRef } from 'react';

const MultiSelectDropdown = ({ label, options, selected, onChange, placeholder = 'All' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((opt) =>
    (opt.label || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((opt) => opt.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === options.length
        ? 'All Selected'
        : `${selected.length} Selected`;

  return (
    <div className="relative inline-block text-left w-full sm:w-44 select-none" ref={dropdownRef}>
      {label && <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-250 rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50/50 flex justify-between items-center cursor-pointer min-h-[32px]"
      >
        <span className="truncate">{triggerLabel}</span>
        <i className={`fas fa-chevron-down text-[10px] text-gray-400 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-[10px]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-primary/50"
            />
          </div>

          <div className="flex justify-between text-[10px] font-black text-brand-primary px-1">
            <button type="button" onClick={handleSelectAll} className="hover:underline cursor-pointer">
              Select All
            </button>
            <button type="button" onClick={handleClearAll} className="hover:underline cursor-pointer">
              Clear All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-gray-400 font-semibold">No options found.</div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-brand-primary/5 rounded-lg cursor-pointer text-xs text-gray-750 font-bold transition-colors select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.id)}
                      className="w-3.5 h-3.5 text-brand-primary border-gray-300 rounded focus:ring-brand-primary cursor-pointer"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
