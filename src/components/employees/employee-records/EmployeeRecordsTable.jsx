import React, { useMemo } from 'react';
import { SYSTEM_ROLES, normalizeRoles } from '../../../utils/roleUtils';

const formatPortalRoles = (roleData) => {
  let roles = [];
  if (Array.isArray(roleData)) {
    roles = roleData;
  } else if (roleData && typeof roleData === 'object') {
    roles = roleData.roles || [];
  } else {
    roles = normalizeRoles(roleData);
  }

  if (!roles || roles.length === 0) {
    return <span className="text-gray-400 font-normal text-xs">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r}
          className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-50 text-purple-800 border-purple-200 capitalize"
        >
          {r}
        </span>
      ))}
    </div>
  );
};

const EmployeeRecordsTable = ({
  filteredEmployees,
  loading,
  sortField,
  sortOrder,
  handleSort,
  handleOpenModal,
  handleDeleteEmployee,
  isAdmin,
  isManagement,
  authUsers = [],
}) => {
  // Map auth_id -> user roles from user_roles
  const authUserRoleMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(authUsers)) {
      authUsers.forEach((u) => {
        if (u && u.user_id) {
          map.set(String(u.user_id), u.roles || []);
        }
      });
    }
    return map;
  }, [authUsers]);

  // Group employees by Organization
  const groupedEmployees = useMemo(() => {
    const groups = {};
    filteredEmployees.forEach((emp) => {
      const org = emp.organization || 'Jamia Zaytoonah';
      if (!groups[org]) {
        groups[org] = [];
      }
      groups[org].push(emp);
    });
    return groups;
  }, [filteredEmployees]);

  if (loading) {
    return (
      <div className="bg-white p-12 text-center rounded-3xl border border-light-border">
        <i className="fas fa-circle-notch fa-spin text-3xl text-brand-primary mb-3"></i>
        <p className="text-xs font-bold text-dark-muted">Loading employee records...</p>
      </div>
    );
  }

  if (filteredEmployees.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-3xl border border-light-border border-dashed">
        <i className="fas fa-users-slash text-4xl text-gray-300 mb-3"></i>
        <h3 className="text-base font-extrabold text-dark-primary">No Employee Records Found</h3>
        <p className="text-xs text-dark-muted mt-1">
          Try adjusting search filters or add a new record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEmployees).map(([orgName, orgEmps]) => (
        <div
          key={orgName}
          className="bg-white rounded-3xl border border-light-border shadow-sm overflow-hidden"
        >
          {/* Organization Header Card Bar */}
          <div className="bg-gradient-to-r from-gray-50 via-blue-50/20 to-gray-50 px-5 py-3.5 border-b border-light-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <i className="fas fa-building text-sm"></i>
              </div>
              <div>
                <h3 className="font-black text-dark-primary text-sm tracking-tight">{orgName}</h3>
                <span className="text-[10px] text-dark-muted font-bold">
                  {orgEmps.length} {orgEmps.length === 1 ? 'Employee' : 'Employees'}
                </span>
              </div>
            </div>
            <span className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-extrabold shadow-2xs">
              {orgEmps.filter((e) => e.is_active !== false).length} Active
            </span>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold min-w-[900px]">
              <thead className="bg-gray-50/70 border-b text-[10px] uppercase tracking-wider text-dark-muted font-bold">
                <tr>
                  <th
                    onClick={() => handleSort('emp_id')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Emp ID
                      <i
                        className={`fas ${
                          sortField === 'emp_id'
                            ? sortOrder === 'asc'
                              ? 'fa-sort-up text-brand-primary'
                              : 'fa-sort-down text-brand-primary'
                            : 'fa-sort text-gray-300'
                        }`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Employee
                      <i
                        className={`fas ${
                          sortField === 'name'
                            ? sortOrder === 'asc'
                              ? 'fa-sort-up text-brand-primary'
                              : 'fa-sort-down text-brand-primary'
                            : 'fa-sort text-gray-300'
                        }`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('designation')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Designation & Org
                      <i
                        className={`fas ${
                          sortField === 'designation'
                            ? sortOrder === 'asc'
                              ? 'fa-sort-up text-brand-primary'
                              : 'fa-sort-down text-brand-primary'
                            : 'fa-sort text-gray-300'
                        }`}
                      ></i>
                    </div>
                  </th>
                  <th className="p-4">Contact</th>
                  <th
                    onClick={() => handleSort('mapped_roles')}
                    className="p-4 cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Portal Role
                      <i
                        className={`fas ${
                          sortField === 'mapped_roles'
                            ? sortOrder === 'asc'
                              ? 'fa-sort-up text-brand-primary'
                              : 'fa-sort-down text-brand-primary'
                            : 'fa-sort text-gray-300'
                        }`}
                      ></i>
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('is_active')}
                    className="p-4 text-center cursor-pointer select-none hover:bg-gray-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Status
                      <i
                        className={`fas ${
                          sortField === 'is_active'
                            ? sortOrder === 'asc'
                              ? 'fa-sort-up text-brand-primary'
                              : 'fa-sort-down text-brand-primary'
                            : 'fa-sort text-gray-300'
                        }`}
                      ></i>
                    </div>
                  </th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgEmps.map((emp) => {
                  let roleData = null;
                  if (emp.auth_id && authUserRoleMap.has(String(emp.auth_id))) {
                    roleData = authUserRoleMap.get(String(emp.auth_id));
                  }
                  if (!roleData || (typeof roleData === 'string' && (roleData.trim() === '' || roleData === '0'))) {
                    roleData = emp.mapped_roles;
                  }
                  if (!roleData || (typeof roleData === 'string' && (roleData.trim() === '' || roleData === '0'))) {
                    const desig = (emp.designation || emp.role || '').toLowerCase();
                    if (desig.includes('teacher')) roleData = ['teacher'];
                    else if (desig.includes('admin') || desig.includes('superadmin')) roleData = ['admin'];
                    else if (desig.includes('management') || desig.includes('principal')) roleData = ['management'];
                    else if (desig.includes('staff') || desig.includes('accountant') || desig.includes('librarian')) roleData = ['staff'];
                  }

                  return (
                    <tr
                      key={emp.id}
                      onDoubleClick={() => (isAdmin || isManagement) && handleOpenModal('edit', emp)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      title="Double-click record to open edit modal"
                    >
                      <td className="p-4">
                        <span className="font-extrabold text-dark-primary text-xs bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 inline-block">
                          {emp.emp_id || `EMP-${String(emp.id).padStart(3, '0')}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-extrabold text-dark-primary text-sm flex items-center gap-2">
                              {emp.is_male ? (
                                <i className="fa fa-male text-blue-600"></i>
                              ) : (
                                <i className="fa fa-female text-pink-600"></i>
                              )}
                              {emp.name}
                            </div>
                            <span className="text-[10px] text-dark-muted">
                              {emp.designation || emp.role || 'Teacher'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className="font-bold text-dark-primary block"
                          title={emp.organization}
                        >
                          {emp.organization || 'Jamia Zaytoonah'}
                        </span>
                        <span className="text-[10px] text-dark-muted font-bold block max-w-[180px] truncate">
                          Joined: {emp.joining_date || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-dark-primary font-bold">
                          {emp.primary_mobile || 'No Phone'}
                        </div>
                        <div className="text-[10px] text-dark-muted font-semibold">
                          {emp.email || 'No Email'}
                        </div>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="font-extrabold text-purple-950 text-xs">
                          {formatPortalRoles(roleData)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          {emp.auth_id ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 px-1 py-0.5 rounded-full">
                              <i className="fas fa-link text-purple-500" title="Login Linked"></i>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 px-1 py-0.5 rounded-full">
                              <i
                                className="fas fa-unlink text-amber-500"
                                title="No Login Linked"
                              ></i>
                            </span>
                          )}
                          {emp.login_allowed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 px-1 py-0.5 rounded-full">
                              <i className="fas fa-user text-emerald-500" title="Login Allowed"></i>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 px-1 py-0.5 rounded-full">
                              <i
                                className="fas fa-user-slash text-red-400"
                                title="Login Not Allowed"
                              ></i>
                            </span>
                          )}
                          {emp.is_active !== false ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              Active
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              (isAdmin || isManagement) && handleOpenModal('edit', emp);
                            }}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40"
                            disabled={!isAdmin && !isManagement}
                            title="Edit Employee Record"
                          >
                            <i className="fas fa-pen text-xs"></i>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              (isAdmin || isManagement) &&
                                handleDeleteEmployee &&
                                handleDeleteEmployee(emp);
                            }}
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40"
                            disabled={!isAdmin && !isManagement}
                            title="Delete Employee Record"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeeRecordsTable;
