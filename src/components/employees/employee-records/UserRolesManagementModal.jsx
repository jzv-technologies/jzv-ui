import React from 'react';
import MultiSelectRolesDropdown from './MultiSelectRolesDropdown';

const SYSTEM_ROLES = [
  { id: 1, name: 'Guest' },
  { id: 2, name: 'Parents' },
  { id: 4, name: 'Staff' },
  { id: 8, name: 'Teacher' },
  { id: 16, name: 'Management' },
  { id: 32, name: 'Administrator' },
];

const formatPortalRoles = (sum) => {
  const num = parseInt(sum, 10) || 0;
  if (!num) return <span className="text-gray-400 font-normal">None</span>;
  const roles = SYSTEM_ROLES.filter((r) => (num & r.id) !== 0).map(
    (r) => `${r.name.slice(0, 2).toUpperCase()}(${r.id})`
  );
  if (roles.length === 0) return <span className="text-gray-400 font-normal">None</span>;
  return roles.join(', ');
};

const UserRolesManagementModal = ({
  isUserRolesModalOpen,
  setIsUserRolesModalOpen,
  handleAutoLinkAuthAccounts,
  userRolesSearch,
  setUserRolesSearch,
  authUsers,
  mappedAuthUserMap,
  editingAuthUser,
  setEditingAuthUser,
  editingRoleSum,
  setEditingRoleSum,
  editingEmpId,
  setEditingEmpId,
  employees,
  handleSaveUserRoleDirect,
  saving,
}) => {
  if (!isUserRolesModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark-almostblack/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-light-border shadow-2xl max-w-3xl w-full p-6 space-y-5 my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-black text-dark-primary flex items-center gap-2">
              <i className="fas fa-user-shield text-purple-600"></i> Manage Portal User Roles
              (Auth Users)
            </h3>
            <p className="text-xs text-dark-muted font-semibold mt-0.5">
              Update role bitmask permissions for any registered Auth User (including
              non-employees).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoLinkAuthAccounts}
              disabled={saving}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              title="Automatically link employees to auth users by email/name"
            >
              <i className="fas fa-link"></i> {saving ? 'Linking...' : 'Auto-Link Auth Accounts'}
            </button>
            <button
              onClick={() => {
                setIsUserRolesModalOpen(false);
                setEditingAuthUser(null);
              }}
              className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-all"
            >
              <i className="fas fa-times text-base"></i>
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="relative">
          <i className="fas fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search Auth Users by Name or Email..."
            value={userRolesSearch}
            onChange={(e) => setUserRolesSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-200 outline-none"
          />
        </div>

        {/* User Roles Table / List */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-purple-50/60 border-b text-[10px] uppercase tracking-wider text-purple-950 font-bold">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Employee Link</th>
                <th className="p-3">Current Portal Roles</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const list = (Array.isArray(authUsers) ? authUsers : []).filter((u) => {
                  if (!userRolesSearch.trim()) return true;
                  const q = userRolesSearch.toLowerCase();
                  return (
                    (u.full_name || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q)
                  );
                });

                if (list.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-xs font-semibold text-gray-500">
                        <i className="fas fa-user-shield text-2xl text-purple-300 block mb-2"></i>
                        No registered Auth Users found.{' '}
                        <button
                          type="button"
                          onClick={handleAutoLinkAuthAccounts}
                          className="text-purple-700 font-extrabold underline hover:text-purple-900 cursor-pointer"
                        >
                          Auto-Link Employee Auth Accounts
                        </button>
                      </td>
                    </tr>
                  );
                }

                return list.map((u) => {
                  const mappedEmp = mappedAuthUserMap.get(String(u.user_id));
                  const isEditingThis = editingAuthUser === u.user_id;

                  return (
                    <tr key={u.user_id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-3">
                        <div className="font-extrabold text-dark-primary text-xs flex items-center gap-1.5">
                          <i className="fas fa-user-circle text-purple-600"></i>
                          {u.full_name || 'User'}
                        </div>
                        <div className="text-[10px] text-purple-700 font-semibold">{u.email}</div>
                      </td>
                      <td className="p-3">
                        {isEditingThis ? (
                          <select
                            value={editingEmpId}
                            onChange={(e) => setEditingEmpId(e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-xs bg-white font-bold outline-none border-purple-300"
                          >
                            <option value="">-- External User --</option>
                            {employees.map((emp) => {
                              const isOtherLinked =
                                emp.auth_id && String(emp.auth_id) !== String(u.user_id);
                              return (
                                <option key={emp.id} value={emp.id} disabled={isOtherLinked}>
                                  {emp.name} ({emp.emp_id || `EMP-${emp.id}`})
                                  {isOtherLinked ? ' 🔒 [Mapped]' : ''}
                                </option>
                              );
                            })}
                          </select>
                        ) : mappedEmp ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-200 shadow-xs">
                            <i className="fas fa-id-badge text-emerald-600"></i> {mappedEmp.emp_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 shadow-xs">
                            <i className="fas fa-user-tag text-amber-600"></i> External User
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditingThis ? (
                          <div className="w-56">
                            <MultiSelectRolesDropdown
                              value={editingRoleSum}
                              onChange={(nextSum) => setEditingRoleSum(nextSum)}
                            />
                          </div>
                        ) : (
                          <div className="font-extrabold text-purple-950 text-xs">
                            {formatPortalRoles(u.role)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveUserRoleDirect(
                                  u.user_id,
                                  editingRoleSum,
                                  editingEmpId
                                )
                              }
                              disabled={saving}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAuthUser(null)}
                              className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAuthUser(u.user_id);
                              setEditingRoleSum(String(u.role || '8'));
                              setEditingEmpId(mappedEmp ? String(mappedEmp.emp_id) : '');
                            }}
                            className="px-3 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg text-xs font-bold transition-all"
                          >
                            <i className="fas fa-edit mr-1"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t pt-3">
          <button
            type="button"
            onClick={() => {
              setIsUserRolesModalOpen(false);
              setEditingAuthUser(null);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-dark-primary rounded-xl font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserRolesManagementModal;
