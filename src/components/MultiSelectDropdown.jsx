import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';

const GENDER_OPTIONS = [
  { id: 'all', label: 'All', icon: 'fa-users' },
  { id: 'male', label: 'Male', icon: 'fa-male' },
  { id: 'female', label: 'Female', icon: 'fa-female' },
];

const useDropdownPortal = () => {
  const triggerRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const naturalWidth = Math.max(Math.floor(rect.width), 320);
    const desiredWidth = Math.max(240, Math.min(460, naturalWidth));
    const panelWidth = Math.min(desiredWidth, viewportW - 20);

    // Calculate left: align with trigger left if possible, but clamp safely
    let left = rect.left;
    if (left + panelWidth > viewportW - 10) {
      left = viewportW - panelWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    // Auto flip upward if too close to bottom of screen
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const minHeight = 280;
    const isCloseToBottom = spaceBelow < minHeight && spaceAbove > spaceBelow;

    setPanelStyle({
      position: 'fixed',
      top: isCloseToBottom ? 'auto' : `${rect.bottom + 6}px`,
      bottom: isCloseToBottom ? `${viewportH - rect.top + 6}px` : 'auto',
      left: `${left}px`,
      width: `${panelWidth}px`,
      maxWidth: 'calc(100vw - 20px)',
      maxHeight: isCloseToBottom
        ? `${Math.max(160, spaceAbove - 16)}px`
        : `${Math.max(160, spaceBelow - 16)}px`,
      zIndex: 99999,
    });
  }, []);

  return { triggerRef, panelStyle, updatePosition };
};

const MultiSelectDropdown = ({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select...',
  genderFilter,
  onGenderChange,
  fullWidth = false,
  className = '',
  singleSelect = false,
  icon = null,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [internalGenderFilter, setInternalGenderFilter] = useState('all');

  const { triggerRef, panelStyle, updatePosition } = useDropdownPortal();

  // Normalize selected value(s)
  const selectedArray = useMemo(() => {
    if (selected === null || selected === undefined) return [];
    if (Array.isArray(selected)) return selected.map(String);
    if (String(selected).trim() === '') return [];
    return [String(selected)];
  }, [selected]);

  const selectedCount = selectedArray.length;

  const getOptValue = (opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    if (opt.value !== undefined && opt.value !== null) return String(opt.value);
    if (opt.id !== undefined && opt.id !== null) return String(opt.id);
    return String(opt);
  };

  const getOptLabel = (opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    return String(opt.label || opt.name || opt.title || opt.value || opt.id || '');
  };

  const selectedSingleOption = useMemo(() => {
    if (!singleSelect || selectedArray.length === 0) return null;
    return options.find((opt) => getOptValue(opt) === selectedArray[0]) || null;
  }, [singleSelect, selectedArray, options]);

  // Active gender filter state
  const activeGenderFilter = onGenderChange ? genderFilter || 'all' : internalGenderFilter;
  const handleGenderChange = onGenderChange || setInternalGenderFilter;

  // Automatically detect if options contain gender information or if explicitly passed
  const hasGenderOptions = useMemo(() => {
    if (genderFilter !== undefined || onGenderChange !== undefined) return true;
    return options.some(
      (opt) =>
        opt.is_male !== undefined ||
        opt.is_female !== undefined ||
        opt.gender !== undefined ||
        opt.prefix === 'fa-male' ||
        opt.prefix === 'fa-female'
    );
  }, [genderFilter, onGenderChange, options]);

  const hasGender = hasGenderOptions;
  const genderBadge = hasGender && activeGenderFilter !== 'all' ? activeGenderFilter : null;

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        !e.target.closest('[data-dropdown-panel]')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayedOptions = options.filter((opt) => {
    // 1. Gender filtering if active
    if (hasGender && activeGenderFilter && activeGenderFilter !== 'all') {
      const isFemale =
        opt.is_female === true ||
        opt.is_male === false ||
        opt.prefix === 'fa-female' ||
        opt.gender === 'female';
      if (activeGenderFilter === 'male' && isFemale) return false;
      if (activeGenderFilter === 'female' && !isFemale) return false;
    }
    // 2. Search filtering
    const labelText = getOptLabel(opt);
    return labelText.toLowerCase().includes(search.toLowerCase());
  });

  const getOptRawValue = (opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') return opt;
    if (opt.value !== undefined && opt.value !== null) return opt.value;
    if (opt.id !== undefined && opt.id !== null) return opt.id;
    return opt;
  };

  const toggle = (val, opt) => {
    const rawVal = getOptRawValue(opt);
    const stringVal = String(val);

    if (singleSelect) {
      onChange(rawVal);
      setOpen(false);
      return;
    }

    const exists = selectedArray.includes(stringVal);
    if (exists) {
      if (Array.isArray(selected)) {
        onChange(selected.filter((s) => String(s) !== stringVal));
      } else {
        onChange(selectedArray.filter((s) => s !== stringVal));
      }
    } else {
      if (Array.isArray(selected)) {
        onChange([...selected, rawVal]);
      } else {
        onChange([...selectedArray, rawVal]);
      }
    }
  };

  const handleSelectAll = (e) => {
    e?.stopPropagation();
    const currentSelected = Array.isArray(selected) ? selected : [];
    const currentStringMap = new Set(currentSelected.map(String));
    const toAdd = [];
    displayedOptions.forEach((opt) => {
      const v = getOptValue(opt);
      if (!currentStringMap.has(v)) {
        currentStringMap.add(v);
        toAdd.push(getOptRawValue(opt));
      }
    });
    onChange([...currentSelected, ...toAdd]);
  };

  const handleClearAll = (e) => {
    e?.stopPropagation();
    onChange(singleSelect ? '' : []);
  };

  const panel =
    open &&
    ReactDOM.createPortal(
      <div
        data-dropdown-panel
        className="bg-white border border-light-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ ...panelStyle, maxWidth: 300 }}
      >
        {/* Search Input */}
        <div className="p-2 border-b border-light-border bg-gray-50/50">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-[10px]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
          </div>
        </div>

        {/* Gender Sub-Filter Header (for Teacher filters) */}
        {hasGender && (
          <div className="px-2 py-1.5 bg-gray-50/80 border-b border-light-border">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
                Gender Filter
              </span>
            </div>
            <div className="flex gap-1">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenderChange(g.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeGenderFilter === g.id
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <i className={`fas ${g.icon} text-[9px]`} />
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group Header & Bulk Actions */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/50 border-b border-light-border text-[10px] font-extrabold text-gray-500">
          <span className="uppercase tracking-wider">{label || placeholder || 'Options'}</span>
          <div className="flex gap-2">
            {!singleSelect && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[9px] font-black text-brand-primary hover:underline cursor-pointer"
              >
                Select all
              </button>
            )}
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[9px] font-black text-rose-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List Options */}
        <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
          {displayedOptions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center font-semibold">
              No matching options
            </div>
          ) : (
            displayedOptions.map((opt) => {
              const val = getOptValue(opt);
              const isChecked = selectedArray.includes(val);
              const isFemale =
                opt.is_female === true ||
                opt.is_male === false ||
                opt.prefix === 'fa-female' ||
                opt.gender === 'female';
              const hasGenderInfo =
                opt.is_male !== undefined ||
                opt.is_female !== undefined ||
                opt.gender !== undefined ||
                opt.prefix;
              const prefixIcon =
                opt.prefix || (hasGenderInfo ? (isFemale ? 'fa-female' : 'fa-male') : null);
              const prefixColor = opt.prefixStyle?.color || (isFemale ? '#F472B6' : '#3B82F6');

              return (
                <div
                  key={val}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(val, opt);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggle(val, opt);
                    }
                  }}
                  title={getOptLabel(opt)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-all text-xs font-bold select-none hover:bg-brand-primary/5 ${
                    isChecked ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-750'
                  }`}
                >
                  {singleSelect ? (
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors pointer-events-none ${
                        isChecked ? 'border-brand-primary bg-brand-primary' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <i className="fas fa-check text-[7px] text-white" />}
                    </div>
                  ) : (
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors pointer-events-none ${
                        isChecked ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <i className="fas fa-check text-[8px]" />}
                    </div>
                  )}
                  {prefixIcon && (
                    <i
                      className={`fas ${prefixIcon} text-[9px] mt-1 shrink-0 pointer-events-none`}
                      style={{ color: prefixColor }}
                    />
                  )}
                  <span className="break-words leading-tight flex-1 text-left pointer-events-none">
                    {getOptLabel(opt)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Status */}
        {selectedCount > 0 && !singleSelect && (
          <div className="px-3 py-1.5 border-t border-light-border bg-gray-50/50 text-[9px] text-gray-500 font-semibold flex justify-between">
            <span>{selectedCount} selected</span>
            <span>{displayedOptions.length} total</span>
          </div>
        )}
      </div>,
      document.body
    );

  const displayTitle = label || placeholder;

  return (
    <div className={`${fullWidth ? 'w-full' : 'relative inline-block w-full sm:w-auto'} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex items-center justify-between gap-1.5 px-3 py-1.5 sm:py-2 h-9 sm:h-8 rounded-xl border text-xs font-bold transition-all ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            : selectedCount > 0 || genderBadge
              ? 'bg-white border-brand-primary text-brand-primary shadow-xs hover:bg-brand-primary/5 cursor-pointer'
              : 'bg-white border-gray-250 text-gray-700 hover:border-brand-primary/50 hover:bg-gray-50/50 cursor-pointer'
        } ${fullWidth ? 'w-full' : 'w-full sm:w-auto whitespace-nowrap min-w-0 sm:min-w-[120px]'}`}
      >
        <span className="flex items-center gap-1.5 truncate min-w-0">
          <i
            className={`fas ${
              icon || (singleSelect ? 'fa-chevron-circle-down' : 'fa-filter')
            } text-[9px] shrink-0 opacity-80`}
          />
          <span className="truncate">
            {singleSelect ? (
              selectedSingleOption ? (
                <span>
                  {label && <span className="text-gray-400 font-semibold mr-1">{label}:</span>}
                  <span className="text-dark-primary font-black">{getOptLabel(selectedSingleOption)}</span>
                </span>
              ) : (
                <span className="text-gray-500 font-semibold">{placeholder || label || 'Select...'}</span>
              )
            ) : selectedCount === 0 ? (
              displayTitle
            ) : selectedCount === options.length && options.length > 0 ? (
              `All ${displayTitle}`
            ) : (
              `${selectedCount} ${displayTitle}`
            )}
          </span>
          {!singleSelect && selectedCount > 0 && (
            <span className="bg-brand-primary/15 text-brand-primary text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-0.5 shrink-0">
              {selectedCount}
            </span>
          )}
          {genderBadge && selectedCount === 0 && (
            <span className="bg-brand-primary/15 text-brand-primary text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-0.5 capitalize shrink-0">
              {genderBadge}
            </span>
          )}
        </span>
        <i
          className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] ml-1 shrink-0 opacity-70`}
        />
      </button>
      {panel}
    </div>
  );
};

export default MultiSelectDropdown;
