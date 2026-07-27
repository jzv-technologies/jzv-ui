import React, { useState, useEffect } from 'react';

const SyllabusCsvMappingModal = ({ isOpen, headers, previewRows, onClose, onImport, hierarchy }) => {
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [idCol, setIdCol] = useState('');
  const [unitCol, setUnitCol] = useState('');
  const [chapterCol, setChapterCol] = useState('');
  const [lessonCol, setLessonCol] = useState('');
  const [complexityCol, setComplexityCol] = useState('');
  const [pageCol, setPageCol] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const levels = (hierarchy || 'Unit, Chapter, Lesson').split(',').map(s => s.trim());
  const hasLevel1 = !!levels[0];
  const hasLevel2 = !!levels[1];
  const hasLevel3 = !!levels[2];

  useEffect(() => {
    if (!isOpen) return;

    // Helper to find best match
    const findBestMatch = (possibleNames) => {
      const lowerNames = possibleNames.map(n => n.toLowerCase());
      return headers.find(h => {
        const lh = h.toLowerCase().trim();
        return lowerNames.some(p => lh === p || lh.replace(/[^a-z0-9]/g, '') === p.replace(/[^a-z0-9]/g, ''));
      }) || '';
    };

    const l1NameStr = levels[0] || 'level1';
    const l2NameStr = levels[1] || 'level2';
    const l3NameStr = levels[2] || 'level3';

    const matchedId = findBestMatch(['id', 'primary_id', 'primary id', 'lesson_id', 'lesson id', 'ID']);
    if (matchedId) {
      setIdCol(matchedId);
      setIsUpdateMode(true);
    } else {
      setIdCol('');
      setIsUpdateMode(false);
    }

    setUnitCol(findBestMatch([l1NameStr, 'level1', 'level 1', 'unit', 'section', 'module', 'heading']));
    setChapterCol(findBestMatch([l2NameStr, 'level2', 'level 2', 'chapter', 'topic', 'subheading', 'sub heading']));
    setLessonCol(findBestMatch([l3NameStr, 'level3', 'level 3', 'lesson', 'title', 'subtopic', 'sub topic']));
    setComplexityCol(findBestMatch(['complexity', 'difficulty', 'level']));
    setPageCol(findBestMatch(['page_count', 'page count', 'pagecount', 'pages', 'page_col', 'page']));
  }, [isOpen, headers, hierarchy]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check for duplicate mappings
    const mapped = [];
    if (isUpdateMode && idCol) mapped.push(idCol);
    if (hasLevel1 && unitCol) mapped.push(unitCol);
    if (hasLevel2 && chapterCol) mapped.push(chapterCol);
    if (hasLevel3 && lessonCol) mapped.push(lessonCol);
    if (complexityCol) mapped.push(complexityCol);
    if (pageCol) mapped.push(pageCol);

    const uniqueMapped = new Set(mapped);
    if (uniqueMapped.size !== mapped.length) {
      setErrorMsg("Duplicate column mappings detected. Each target field must map to a unique column.");
      return;
    }

    setErrorMsg("");
    onImport({ isUpdateMode, idCol: isUpdateMode ? idCol : '', unitCol, chapterCol, lessonCol, complexityCol, pageCol });
  };

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] border border-light-border shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-brand-primary p-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <i className="fas fa-file-import"></i>
              File Column Mapping & Preview
            </h3>
            <p className="text-[10px] text-brand-lbg/80 mt-0.5 flex items-center flex-wrap gap-1">
              Confirm which columns map to the active book hierarchy: <span className="font-bold text-white bg-white/20 px-1.5 py-0.5 rounded text-[9px]">{hierarchy}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-all text-xl outline-none p-1">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5 min-h-0 flex flex-col">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-xs font-bold flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-sm shrink-0"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mappings Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            {/* Mandatory */}
            <div className="space-y-4 border-r border-light-border/40 pr-0 md:pr-4">
              <h4 className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Mandatory Columns</h4>
              
              {hasLevel1 && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">{levels[0]} (Level 1) Column *</label>
                  <select
                    value={unitCol}
                    onChange={(e) => setUnitCol(e.target.value)}
                    required
                    className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {hasLevel2 && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">{levels[1]} (Level 2) Column *</label>
                  <select
                    value={chapterCol}
                    onChange={(e) => setChapterCol(e.target.value)}
                    required
                    className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {hasLevel3 && (
                <div>
                  <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">{levels[2]} (Level 3) Column *</label>
                  <select
                    value={lessonCol}
                    onChange={(e) => setLessonCol(e.target.value)}
                    required
                    className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Optional */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider">Optional & Update Settings</h4>

              <div className="p-3 bg-light-bg/30 border border-light-border/60 rounded-xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUpdateMode}
                    onChange={(e) => {
                      setIsUpdateMode(e.target.checked);
                      if (!e.target.checked) setIdCol('');
                    }}
                    className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary border-light-border"
                  />
                  <span className="text-xs font-bold text-dark-primary">
                    UPDATE? (Check to update existing records by Primary ID)
                  </span>
                </label>

                {isUpdateMode && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200 pl-6">
                    <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">
                      PRIMARY ID COLUMN (for update) *
                    </label>
                    <select
                      value={idCol}
                      onChange={(e) => setIdCol(e.target.value)}
                      required={isUpdateMode}
                      className="w-full bg-white border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="">-- Select Primary ID Column --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {hasLevel3 && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Complexity (complexity) Column</label>
                    <select
                      value={complexityCol}
                      onChange={(e) => setComplexityCol(e.target.value)}
                      className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="">-- None (Defaults to 'Easy') --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-dark-soft uppercase mb-1">Page Count (page_count) Column</label>
                    <select
                      value={pageCol}
                      onChange={(e) => setPageCol(e.target.value)}
                      className="w-full bg-light-bg/25 border border-light-border rounded-xl px-3 py-2 text-xs font-semibold text-dark-primary outline-none focus:ring-2 focus:ring-brand-soft"
                    >
                      <option value="">-- None (Defaults to 0) --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="flex-1 flex flex-col min-h-[150px]">
            <h4 className="text-[10px] font-bold text-dark-deepblue uppercase tracking-wider mb-2 shrink-0">Data Preview (First 5 rows)</h4>
            <div className="flex-1 overflow-auto border border-light-border/40 rounded-2xl bg-light-lbg/10 p-2 text-[10px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-light-border/60 text-dark-soft">
                    {headers.map((h, i) => (
                      <th key={i} className="py-2 px-3 text-left font-bold truncate max-w-[120px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border/30 text-dark-primary font-semibold">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-3 truncate max-w-[120px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-light-border/40 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-light-bg hover:bg-light-lbg text-dark-secondary transition-all outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md shadow-brand-primary/20 transition-all outline-none"
            >
              <i className="fas fa-check mr-1.5"></i> Confirm & Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SyllabusCsvMappingModal;
