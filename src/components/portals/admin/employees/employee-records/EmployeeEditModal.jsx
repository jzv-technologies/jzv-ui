import React from 'react';
import ModalErrorBoundary from './ModalErrorBoundary';
import MultiSelectRolesDropdown from './MultiSelectRolesDropdown';

const DEFAULT_ORGANIZATIONS = [
  'MRQU Educational & Charitable Trust',
  'Jamia Zaytoonah',
  'Idara e Faizul Makatib',
  'Madrasa Rahmaniya Lilbanath',
  'Bunyaan Food Service',
  'Barika Transport',
  'Rahmaniya Masjid',
];

const DEFAULT_ROLES = [
  'Teacher',
  'Admin',
  'Management',
  'Accountant',
  'Staff',
  'Principal',
  'Vice Principal',
  'Librarian',
];

const DESIGNATIONS = DEFAULT_ROLES;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const EMERGENCY_RELATIONS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Cousin',
  'Friend',
  'Colleague',
  'Other',
];

const EmployeeEditModal = ({
  modalMode,
  setModalMode,
  formData,
  setFormData,
  selectedEmployee,
  currentSelfEmployee,
  filteredEmployees,
  currentIndex,
  handleNavigateRecord,
  handleSaveEmployee,
  saving,
  editableSections,
  setEditableSections,
  newIncrement,
  setNewIncrement,
  handleAddIncrementItem,
  handleRemoveIncrementItem,
  authUsers,
  mappedAuthUserMap,
  navConfirmModal,
  setNavConfirmModal,
  switchRecordDirect,
  showToast,
}) => {
  if (!modalMode || (modalMode !== 'add' && modalMode !== 'edit' && modalMode !== 'self_edit')) {
    return null;
  }

  return (
    <>
      <ModalErrorBoundary onClose={() => setModalMode(null)}>
        <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
            {/* Fixed Top Header with Title, Actions, and Close Button at Top Right */}
            <div className="px-5 py-4 bg-white border-b shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-20 relative">
              {/* Header Title + Close button on mobile */}
              <div className="flex items-center justify-between gap-2 w-full sm:w-auto min-w-0 flex-1">
                <h3 className="text-base font-black text-dark-primary flex items-center gap-2 truncate">
                  {modalMode === 'add' ? (
                    <>
                      <i className="fas fa-user-plus text-brand-primary shrink-0"></i>{' '}
                      <span>Add New Employee Record</span>
                    </>
                  ) : modalMode === 'self_edit' ? (
                    <>
                      <i className="fas fa-user-pen text-brand-primary shrink-0"></i>{' '}
                      <span className="truncate">
                        Edit Profile Details:{' '}
                        <span className="text-purple-950 font-extrabold">
                          {formData.name || selectedEmployee?.name || currentSelfEmployee?.name}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-id-card text-purple-600 shrink-0"></i>{' '}
                      <span className="truncate">
                        Edit Record:{' '}
                        <span className="text-purple-950 font-extrabold">
                          {formData.name || selectedEmployee?.name}
                        </span>
                      </span>
                    </>
                  )}
                </h3>

                {/* Close Button on mobile (top right of mobile title row) */}
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex sm:hidden items-center justify-center transition-all shrink-0"
                  title="Close (Esc)"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>

              {/* Action Buttons (Prev/Next & Save Record & Close on desktop) */}
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                {/* Prev / Next Record Navigation (Edit Mode) */}
                {modalMode === 'edit' && filteredEmployees.length > 1 && (
                  <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-200">
                    <button
                      type="button"
                      disabled={currentIndex <= 0 || saving}
                      onClick={() => handleNavigateRecord(currentIndex - 1)}
                      className="px-2 py-1 text-xs font-extrabold bg-white hover:bg-purple-100 text-purple-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-purple-300 shadow-xs flex items-center gap-1"
                      title="Previous Employee Record"
                    >
                      <i className="fas fa-chevron-left text-[10px]"></i> Prev
                    </button>
                    <span className="text-[10px] font-extrabold px-1 text-purple-950">
                      {currentIndex + 1} / {filteredEmployees.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentIndex >= filteredEmployees.length - 1 || saving}
                      onClick={() => handleNavigateRecord(currentIndex + 1)}
                      className="px-2 py-1 text-xs font-extrabold bg-white hover:bg-purple-100 text-purple-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-purple-300 shadow-xs flex items-center gap-1"
                      title="Next Employee Record"
                    >
                      Next <i className="fas fa-chevron-right text-[10px]"></i>
                    </button>
                  </div>
                )}

                {/* Save Record button */}
                <button
                  type="button"
                  onClick={handleSaveEmployee}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <i className="fas fa-floppy-disk"></i> {saving ? 'Saving...' : 'Save Record'}
                </button>

                {/* Close Button on Desktop */}
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 hidden sm:flex items-center justify-center transition-all shrink-0"
                  title="Close (Esc)"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body Container */}
            <form
              onSubmit={handleSaveEmployee}
              className="p-6 overflow-y-auto flex-1 space-y-6 text-xs font-bold"
            >
              {/* Section 1: Personal Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs uppercase tracking-wider text-brand-primary font-black">
                    Section 1: Personal Details
                  </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec1: !prev.sec1 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec1
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec1 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec1 ? 'Editing Enabled' : 'Edit Section 1'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-dark-soft mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Father / Husband Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.father_husband_name}
                      onChange={(e) =>
                        setFormData({ ...formData, father_husband_name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Gender</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.is_male ? 'Male' : 'Female'}
                      onChange={(e) =>
                        setFormData({ ...formData, is_male: e.target.value === 'Male' })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Date of Birth</label>
                    <input
                      type="date"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.date_of_birth}
                      onChange={(e) =>
                        setFormData({ ...formData, date_of_birth: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Blood Group</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Marital Status</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.marital_status}
                      onChange={(e) =>
                        setFormData({ ...formData, marital_status: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    >
                      {MARITAL_STATUSES.map((ms) => (
                        <option key={ms} value={ms}>
                          {ms}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Highest Education</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      placeholder="e.g. M.Sc, M.Ed, B.Tech"
                      value={formData.highest_education}
                      onChange={(e) =>
                        setFormData({ ...formData, highest_education: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">
                      Primary Mobile (10 digits)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.primary_mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, primary_mobile: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-dark-soft mb-1">Communication Address</label>
                    <textarea
                      rows="2"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1}
                      value={formData.communication_address}
                      onChange={(e) =>
                        setFormData({ ...formData, communication_address: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Bank Detail */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs uppercase tracking-wider text-emerald-700 font-black">
                    Section 2: Bank Detail
                  </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec2: !prev.sec2 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec2
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec2 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec2 ? 'Editing Enabled' : 'Edit Section 2'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-dark-soft mb-1">Account Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="Account Holder Name"
                      value={formData.bank_account_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Account Number</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="Bank Account Number"
                      value={formData.bank_account_number}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_account_number: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-mono font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">IFSC Code</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="e.g. SBIN0001234"
                      value={formData.bank_ifsc_code}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-mono uppercase font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Bank Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="e.g. State Bank of India"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-dark-soft mb-1">Branch Name</label>
                    <input
                      type="text"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2}
                      placeholder="Bank Branch Location"
                      value={formData.bank_branch_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_branch_name: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec2
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Emergency Contacts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs uppercase tracking-wider text-rose-700 font-black">
                    Section 3: Emergency Contacts
                  </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec3: !prev.sec3 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec3
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec3 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec3 ? 'Editing Enabled' : 'Edit Section 3'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Emergency Contact 1 */}
                  <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                    <span className="text-[11px] font-black text-rose-900 block">
                      Emergency Contact 1
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-dark-muted block">Name</label>
                        <input
                          type="text"
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                name: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Relation</label>
                        <select
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.relation || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                relation: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        >
                          <option value="">Select Relation</option>
                          {EMERGENCY_RELATIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.phone || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                phone: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Address</label>
                        <input
                          type="text"
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_1?.address || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_1: {
                                ...(formData?.emergency_contact_1 || {}),
                                address: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact 2 */}
                  <div className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                    <span className="text-[11px] font-black text-rose-900 block">
                      Emergency Contact 2
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-dark-muted block">Name</label>
                        <input
                          type="text"
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                name: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Relation</label>
                        <select
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.relation || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                relation: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        >
                          <option value="">Select Relation</option>
                          {EMERGENCY_RELATIONS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.phone || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                phone: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-dark-muted block">Address</label>
                        <input
                          type="text"
                          disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3}
                          value={formData?.emergency_contact_2?.address || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emergency_contact_2: {
                                ...(formData?.emergency_contact_2 || {}),
                                address: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold ${
                            (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec3
                              ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                              : 'bg-white text-dark-primary border-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Employee Detail */}
              {modalMode !== 'self_edit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-1">
                    <h4 className="text-xs uppercase tracking-wider text-blue-primary font-black">
                      Section 4: Employee Detail
                    </h4>
                  {modalMode !== 'add' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableSections((prev) => ({ ...prev, sec4: !prev.sec4 }))
                      }
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        editableSections.sec4
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      <i className={`fas ${editableSections.sec4 ? 'fa-check' : 'fa-pen'}`}></i>
                      {editableSections.sec4 ? 'Editing Enabled' : 'Edit Section 4'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* First Field: Is Salaried Employee Toggle */}
                  <div>
                    <label className="block text-dark-soft mb-1 font-bold">
                      Is Salaried Employee?
                    </label>
                    <div
                      className={`inline-flex p-1 rounded-xl border ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4}
                        onClick={() => setFormData({ ...formData, is_salaried_employee: true })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.is_salaried_employee
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Salaried
                      </button>
                      <button
                        type="button"
                        disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4}
                        onClick={() => setFormData({ ...formData, is_salaried_employee: false })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.is_salaried_employee
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Service
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-dark-soft mb-1">Employee ID *</label>
                    <input
                      type="text"
                      required={formData.is_salaried_employee}
                      disabled={
                        ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                        !formData.is_salaried_employee
                      }
                      value={formData.emp_id}
                      onChange={(e) => setFormData({ ...formData, emp_id: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                        !formData.is_salaried_employee
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Organization</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4}
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    >
                      <option value="">-- Select Organization --</option>
                      {DEFAULT_ORGANIZATIONS.map((org) => (
                        <option key={org} value={org}>
                          {org}
                        </option>
                      ))}
                      {formData.organization &&
                        !DEFAULT_ORGANIZATIONS.includes(formData.organization) && (
                          <option value={formData.organization}>{formData.organization}</option>
                        )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Designation</label>
                    <select
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4}
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    >
                      {DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">Joining Date</label>
                    <input
                      type="date"
                      disabled={(modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4}
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-dark-soft mb-1">
                      Current Salary (₹){' '}
                      {formData.is_salaried_employee && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      disabled={
                        ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                        !formData.is_salaried_employee
                      }
                      placeholder={
                        formData.is_salaried_employee
                          ? 'Required salary amount'
                          : 'Disabled for Service'
                      }
                      value={formData.current_salary}
                      onChange={(e) =>
                        setFormData({ ...formData, current_salary: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-bold ${
                        ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                        !formData.is_salaried_employee
                          ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white text-dark-primary border-gray-300'
                      }`}
                    />
                  </div>
                  {/* Employee Status Toggle */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-bold ${
                        (modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4
                          ? 'text-gray-400'
                          : ''
                      }`}
                    >
                      Employee Status
                    </label>
                    <div
                      className={`inline-flex p-1 rounded-xl border ${
                        ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                        !formData.is_salaried_employee
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={
                          ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                        }
                        onClick={() => setFormData({ ...formData, is_active: true })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.is_active
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        disabled={
                          ((modalMode === 'edit' || modalMode === 'self_edit') && !editableSections.sec4) ||
                          !formData.is_salaried_employee
                        }
                        onClick={() => setFormData({ ...formData, is_active: false })}
                        className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.is_active
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compensation History Builder */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 mt-2 ${
                    !formData.is_salaried_employee
                      ? 'bg-gray-100 border-gray-200 opacity-60 pointer-events-none'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-[11px] font-extrabold text-dark-primary block">
                    Compensation History (
                    {
                      (Array.isArray(formData?.compensation_history)
                        ? formData.compensation_history
                        : []
                      ).length
                    }{' '}
                    entries)
                  </span>

                  {Array.isArray(formData?.compensation_history) &&
                    formData.compensation_history.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {formData.compensation_history.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white p-2.5 rounded-xl border text-[11px]"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-dark-primary flex items-center gap-2 flex-wrap">
                                <span>{item.date ? item.date : 'N/A'}</span>
                                <span className="text-emerald-700 font-extrabold">
                                  +₹{item.amount || '0'} ({item.percentage || 0}%)
                                </span>
                                <span className="bg-emerald-100 text-emerald-950 font-black px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                                  Updated Salary: ₹
                                  {(item.updated_salary
                                    ? Number(item.updated_salary)
                                    : Number(formData.current_salary) || 0
                                  ).toLocaleString('en-IN')}
                                </span>
                              </div>
                              {item.notes && (
                                <span className="text-dark-muted block text-[10px]">
                                  {item.notes}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={!formData.is_salaried_employee}
                                onClick={() => {
                                  const revised = item.updated_salary
                                    ? Number(item.updated_salary)
                                    : Number(formData.current_salary) +
                                      (Number(item.amount) || 0);
                                  setFormData({ ...formData, current_salary: String(revised) });
                                  showToast(
                                    `Applied updated salary: ₹${revised.toLocaleString('en-IN')}`,
                                    'success'
                                  );
                                }}
                                className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md font-extrabold text-[10px] flex items-center gap-1 transition-all"
                                title="Set as Current Salary"
                              >
                                <i className="fas fa-check-circle text-xs"></i> Apply
                              </button>
                              <button
                                type="button"
                                disabled={!formData.is_salaried_employee}
                                onClick={() => handleRemoveIncrementItem(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove Increment"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  <div className="grid grid-cols-5 gap-2 pt-1 items-end">
                    <div>
                      <label className="text-[10px] text-dark-muted block font-bold">
                        Revision Date
                      </label>
                      <input
                        type="date"
                        disabled={!formData.is_salaried_employee}
                        value={newIncrement.date}
                        onChange={(e) =>
                          setNewIncrement({ ...newIncrement, date: e.target.value })
                        }
                        className="w-full px-2 py-1 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-dark-muted block font-bold">
                        Hike (₹)
                      </label>
                      <input
                        type="number"
                        disabled={!formData.is_salaried_employee}
                        placeholder="e.g. 3000"
                        value={newIncrement.amount}
                        onChange={(e) => {
                          const amtVal = e.target.value;
                          const currentSal = Number(formData.current_salary) || 0;
                          let pctVal = newIncrement.percentage;
                          let updSal = '';
                          if (amtVal !== '') {
                            const amtNum = Number(amtVal);
                            if (currentSal > 0) {
                              pctVal = ((amtNum / currentSal) * 100).toFixed(2);
                              updSal = String(currentSal + amtNum);
                            }
                          }
                          setNewIncrement({
                            ...newIncrement,
                            amount: amtVal,
                            percentage: pctVal,
                            updated_salary: updSal,
                          });
                        }}
                        className="w-full px-2 py-1 border rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-dark-muted block font-bold">
                        Hike (%)
                      </label>
                      <input
                        type="number"
                        disabled={!formData.is_salaried_employee}
                        placeholder="10%"
                        value={newIncrement.percentage}
                        onChange={(e) => {
                          const pctVal = e.target.value;
                          const currentSal = Number(formData.current_salary) || 0;
                          let amtVal = newIncrement.amount;
                          let updSal = '';
                          if (pctVal !== '') {
                            const pctNum = Number(pctVal);
                            if (currentSal > 0) {
                              amtVal = String(Math.round((currentSal * pctNum) / 100));
                              updSal = String(currentSal + Number(amtVal));
                            }
                          }
                          setNewIncrement({
                            ...newIncrement,
                            percentage: pctVal,
                            amount: amtVal,
                            updated_salary: updSal,
                          });
                        }}
                        className="w-full px-2 py-1 border rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-dark-muted block font-bold">
                        Updated Salary (₹)
                      </label>
                      <input
                        type="number"
                        disabled={!formData.is_salaried_employee}
                        placeholder="Updated Sal"
                        value={
                          newIncrement.updated_salary ||
                          Number(formData.current_salary) + Number(newIncrement.amount || 0) ||
                          ''
                        }
                        onChange={(e) => {
                          const updVal = e.target.value;
                          const currentSal = Number(formData.current_salary) || 0;
                          let amtVal = newIncrement.amount;
                          let pctVal = newIncrement.percentage;
                          if (updVal !== '' && currentSal > 0) {
                            const diff = Number(updVal) - currentSal;
                            amtVal = String(diff);
                            pctVal = ((diff / currentSal) * 100).toFixed(2);
                          }
                          setNewIncrement({
                            ...newIncrement,
                            updated_salary: updVal,
                            amount: amtVal,
                            percentage: pctVal,
                          });
                        }}
                        className="w-full px-2 py-1 border rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border-emerald-300"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={
                          !formData.is_salaried_employee ||
                          (!newIncrement.amount && !newIncrement.updated_salary)
                        }
                        onClick={() => {
                          const revised =
                            Number(newIncrement.updated_salary) ||
                            Number(formData.current_salary) + Number(newIncrement.amount || 0);
                          if (revised > 0) {
                            setFormData({ ...formData, current_salary: String(revised) });
                            showToast(
                              `Applied updated salary: ₹${revised.toLocaleString('en-IN')}`,
                              'success'
                            );
                          }
                        }}
                        className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-extrabold disabled:opacity-40 transition-all flex items-center justify-center h-8 w-8 shrink-0 shadow-xs"
                        title="Apply Updated Salary directly to Current Salary"
                      >
                        <i className="fas fa-check-double text-xs"></i>
                      </button>
                      <button
                        type="button"
                        disabled={!formData.is_salaried_employee}
                        onClick={handleAddIncrementItem}
                        className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-black disabled:opacity-40 transition-all flex items-center justify-center shadow-xs"
                        title="Add to Compensation History (+)"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>

                  {/* Revised Salary Preview */}
                  {Number(formData.current_salary) > 0 && Number(newIncrement.amount) > 0 && (
                    <div className="flex items-center justify-between bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs mt-2">
                      <div>
                        <span className="font-extrabold text-emerald-950">
                          Revised Salary Preview:{' '}
                          <span className="text-emerald-700 font-black">
                            ₹
                            {(
                              Number(formData.current_salary) + Number(newIncrement.amount)
                            ).toLocaleString('en-IN')}
                          </span>
                        </span>
                        <span className="text-[10px] text-emerald-800 font-semibold block">
                          (Current ₹{Number(formData.current_salary).toLocaleString('en-IN')} + Hike ₹
                          {Number(newIncrement.amount).toLocaleString('en-IN')})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const revised =
                            Number(formData.current_salary) + Number(newIncrement.amount);
                          setFormData({ ...formData, current_salary: String(revised) });
                          showToast(
                            `Updated Current Salary to ₹${revised.toLocaleString('en-IN')}`,
                            'success'
                          );
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <i className="fas fa-check-circle"></i> Set as Current Salary
                      </button>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Section 5: Portal Access */}
              {modalMode !== 'self_edit' && (
                <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-purple-700 font-black border-b pb-1">
                  Section 5: Portal Access
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/30 p-4 rounded-2xl border border-purple-100">
                  {/* Field 1: Portal Access */}
                  <div>
                    <label className="block text-dark-soft mb-1 font-extrabold text-purple-950">
                      Portal Access
                    </label>
                    <div className="inline-flex p-1 bg-white rounded-xl border border-purple-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, login_allowed: true })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.login_allowed
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Allowed
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, login_allowed: false })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.login_allowed
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Not Allowed
                      </button>
                    </div>
                  </div>

                  {/* Field 2: Consider As Teacher */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-extrabold ${
                        !formData.login_allowed ? 'text-gray-400' : 'text-purple-950'
                      }`}
                    >
                      Consider As Teacher
                    </label>
                    <div
                      className={`inline-flex p-1 rounded-xl border ${
                        !formData.login_allowed
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-purple-200 shadow-sm'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!formData.login_allowed}
                        onClick={() => setFormData({ ...formData, is_teacher: true })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          formData.is_teacher
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        disabled={!formData.login_allowed}
                        onClick={() => setFormData({ ...formData, is_teacher: false })}
                        className={`px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                          !formData.is_teacher
                            ? 'bg-gray-700 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Field 3: Auth User Mapping */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-extrabold ${
                        !formData.login_allowed ? 'text-gray-400' : 'text-purple-950'
                      }`}
                    >
                      Auth User Mapping
                    </label>
                    <select
                      disabled={!formData.login_allowed}
                      value={formData.auth_id}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const matched =
                          selectedId && Array.isArray(authUsers)
                            ? authUsers.find((u) => u && String(u.user_id) === String(selectedId))
                            : null;
                        setFormData({
                          ...formData,
                          auth_id: selectedId,
                          email: formData.email || (matched ? matched.email : formData.email),
                          mapped_roles_sum: matched?.role
                            ? String(matched.role)
                            : formData.mapped_roles_sum,
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-xl font-bold outline-none ${
                        !formData.login_allowed
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-purple-900 border-purple-200'
                      }`}
                    >
                      <option value="">-- Unlinked / No Auth Account --</option>
                      {(Array.isArray(authUsers) ? authUsers : []).map((u) => {
                        const mapped = mappedAuthUserMap.get(String(u.user_id));
                        const isMappedToOther =
                          mapped && String(mapped.emp_id) !== String(selectedEmployee?.id);

                        return (
                          <option key={u.user_id} value={u.user_id} disabled={isMappedToOther}>
                            {u.full_name ? u.full_name : 'User'} - {u.email}
                            {isMappedToOther
                              ? ` 🔒 [${mapped.emp_name}]`
                              : mapped && String(mapped.emp_id) === String(selectedEmployee?.id)
                                ? ' ✓ (Currently Linked)'
                                : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Status Helper Badge */}
                    {formData.auth_id && formData.login_allowed && (
                      <div className="text-[11px] font-bold mt-1">
                        {(() => {
                          const mapped = mappedAuthUserMap.get(String(formData.auth_id));
                          if (!mapped || String(mapped.emp_id) === String(selectedEmployee?.id)) {
                            return (
                              <span className="inline-flex items-center gap-1.5 text-purple-700 bg-purple-100/60 px-3 py-1 rounded-lg border border-purple-200">
                                <i className="fas fa-link text-purple-600"></i> Linked to this
                                employee account
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100/80 px-3 py-1 rounded-lg border border-amber-300">
                              <i className="fas fa-exclamation-triangle text-amber-600"></i>
                              Already mapped to employee: <strong>{mapped.emp_name}</strong> (
                              {mapped.emp_code})
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Field 4: Portal Roles */}
                  <div>
                    <label
                      className={`block text-dark-soft mb-1 font-extrabold ${
                        !formData.login_allowed || !formData.auth_id
                          ? 'text-gray-400'
                          : 'text-purple-950'
                      }`}
                    >
                      Portal Roles
                    </label>
                    <MultiSelectRolesDropdown
                      disabled={!formData.login_allowed || !formData.auth_id}
                      value={formData.mapped_roles_sum}
                      onChange={(nextSum) =>
                        setFormData({ ...formData, mapped_roles_sum: nextSum })
                      }
                    />
                    {!formData.auth_id && formData.login_allowed && (
                      <div className="text-[11px] font-medium text-amber-700 mt-1 flex items-center gap-1">
                        <i className="fas fa-lock text-amber-600"></i> Auth Mapping is required.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </form>
          </div>
        </div>
      </ModalErrorBoundary>

      {/* Unsaved Changes Confirmation Modal for Record Navigation */}
      {navConfirmModal && (
        <div className="fixed inset-0 bg-dark-almostblack/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-lg shrink-0">
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="text-base font-black text-dark-primary">Unsaved Changes</h4>
                <p className="text-xs text-dark-muted font-semibold mt-0.5">
                  You have modified fields for <strong>{selectedEmployee?.name}</strong>. Choose how
                  to proceed before switching:
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 font-bold">
              <button
                type="button"
                onClick={async () => {
                  const targetEmp = navConfirmModal.targetEmp;
                  const success = await handleSaveEmployee(null);
                  if (success) {
                    switchRecordDirect(targetEmp);
                  }
                }}
                disabled={saving}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-floppy-disk"></i> Save & Move to{' '}
                {navConfirmModal.targetEmp?.name}
              </button>
              <button
                type="button"
                onClick={() => switchRecordDirect(navConfirmModal.targetEmp)}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-trash-arrow-up"></i> Discard & Move
              </button>
              <button
                type="button"
                onClick={() => setNavConfirmModal(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeEditModal;
