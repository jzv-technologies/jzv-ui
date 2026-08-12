import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { showToast } from '../../../utils/toast';

const MapBookModal = ({
  onClose,
  classId,
  subjectId,
  classes,
  subjects,
  allBooks,
  bookClasses,
  setBookClasses
}) => {
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const className = classes.find(c => String(c.id) === String(classId))?.name || 'Selected Class';
  const subjectName = subjects.find(s => String(s.id) === String(subjectId))?.name || 'Selected Subject';

  // Filter books that match the subject
  const subjectBooks = React.useMemo(() => {
    return allBooks.filter(b => String(b.subject_id) === String(subjectId));
  }, [allBooks, subjectId]);

  useEffect(() => {
    // Pre-select books that are already mapped to this class
    const mappedBookIds = bookClasses
      .filter(bc => String(bc.class_id) === String(classId))
      .map(bc => String(bc.book_id));
    
    // Only pre-select from books that belong to the current subject
    const subjectMapped = subjectBooks
      .filter(b => mappedBookIds.includes(String(b.id)))
      .map(b => String(b.id));

    setSelectedBookIds(subjectMapped);
  }, [classId, subjectId, bookClasses, subjectBooks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleBook = (bookId) => {
    const strId = String(bookId);
    setSelectedBookIds(prev => 
      prev.includes(strId) ? prev.filter(id => id !== strId) : [...prev, strId]
    );
  };

  const handleMap = async () => {
    setSaving(true);
    try {
      // 1. We need to replace the mappings for this subject and class
      // First, find all books for this subject
      const subjectBookIds = subjectBooks.map(b => String(b.id));
      
      // Delete existing mappings for this class AND this subject's books
      const { error: delErr } = await supabase
        .from('map_class_books')
        .delete()
        .eq('class_id', classId)
        .in('book_id', subjectBookIds);
        
      if (delErr) throw delErr;

      // Insert new mappings
      if (selectedBookIds.length > 0) {
        const insertData = selectedBookIds.map(bid => ({
          class_id: Number(classId),
          book_id: Number(bid)
        }));
        
        const { error: insErr } = await supabase
          .from('map_class_books')
          .insert(insertData);
          
        if (insErr) throw insErr;
      }

      // Update local state
      const filteredBC = bookClasses.filter(bc => 
        !(String(bc.class_id) === String(classId) && subjectBookIds.includes(String(bc.book_id)))
      );
      
      const newBC = [
        ...filteredBC,
        ...selectedBookIds.map(bid => ({
          class_id: Number(classId),
          book_id: Number(bid)
        }))
      ];
      
      setBookClasses(newBC);
      localStorage.setItem('jzv_map_class_books', JSON.stringify(newBC));
      
      showToast('Books mapped successfully', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to map books: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-primary/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-dark-primary">Map Books to Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-4 text-sm text-indigo-800">
            Mapping books for <strong>{className}</strong> in <strong>{subjectName}</strong>.
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 hide-scrollbar">
            {subjectBooks.length === 0 ? (
              <div className="text-center py-6 text-gray-500 italic text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No books found for this subject.
              </div>
            ) : (
              subjectBooks.map(book => (
                <label 
                  key={book.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedBookIds.includes(String(book.id)) 
                    ? 'border-indigo-600 bg-indigo-50/50' 
                    : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={selectedBookIds.includes(String(book.id))}
                    onChange={() => toggleBook(book.id)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-600 cursor-pointer"
                  />
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{book.name}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMap}
            disabled={saving}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200 disabled:opacity-50"
          >
            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
            Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapBookModal;
