import React from 'react';

const EmployeeSelfProfileCard = ({ currentSelfEmployee, user, handleOpenModal }) => {
  const emp = currentSelfEmployee || {};
  const authUserEmail = user?.email || emp.email || 'Not Available';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Profile Card Header */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-soft text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-4xl font-extrabold shadow-inner shrink-0">
            {emp.name ? emp.name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-1">
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-white/30">
                {emp.emp_id || `EMP-${String(emp.id || 1).padStart(3, '0')}`}
              </span>
              <span className="bg-amber-400 text-dark-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {emp.designation || emp.role || 'Teacher'}
              </span>
              <span className="bg-emerald-400 text-dark-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {emp.organization || 'Jamia Zaytoonah'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {emp.name || 'Teacher Profile'}
            </h1>
            <p className="text-xs text-white/80 font-medium mt-1">
              Joining Date: {emp.joining_date || 'N/A'} &bull; Status:{' '}
              {emp.is_active !== false ? 'Active Employee' : 'Inactive'}
            </p>
          </div>
          <button
            onClick={() => handleOpenModal('self_edit', emp)}
            className="bg-white text-brand-primary hover:bg-white/90 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
          >
            <i className="fas fa-user-pen"></i> Edit Profile Details
          </button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Personal Details */}
        <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4">
          <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
            <i className="fas fa-user-circle text-brand-primary"></i> Personal Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Full Name
              </span>
              <span className="text-dark-primary font-bold">{emp.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Father / Husband Name
              </span>
              <span className="text-dark-primary font-bold">
                {emp.father_husband_name || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Gender
              </span>
              <span className="text-dark-primary font-bold">
                {emp.is_male ? 'Male' : 'Female'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Date of Birth
              </span>
              <span className="text-dark-primary font-bold">
                {emp.date_of_birth || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Blood Group
              </span>
              <span className="text-dark-primary font-bold">{emp.blood_group || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Marital Status
              </span>
              <span className="text-dark-primary font-bold">
                {emp.marital_status || 'Single'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Highest Qualification
              </span>
              <span className="text-dark-primary font-bold">
                {emp.highest_education || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Email (From User Auth)
              </span>
              <span className="text-purple-700 font-extrabold">{authUserEmail}</span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Primary Mobile
              </span>
              <span className="text-dark-primary font-bold">
                {emp.primary_mobile || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Secondary Mobile
              </span>
              <span className="text-dark-primary font-bold">
                {emp.secondary_mobile || 'Unknown'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Communication Address
              </span>
              <span className="text-dark-primary font-bold">
                {emp.communication_address || 'Not Provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Bank Details */}
        <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4">
          <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
            <i className="fas fa-university text-emerald-600"></i> Bank Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Account Name
              </span>
              <span className="text-dark-primary font-bold">
                {emp.bank_account_name || 'Not Provided'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Account Number
              </span>
              <span className="text-dark-primary font-bold font-mono">
                {emp.bank_account_number || 'Not Provided'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                IFSC Code
              </span>
              <span className="text-dark-primary font-bold font-mono">
                {emp.bank_ifsc_code || 'Not Provided'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Bank Name
              </span>
              <span className="text-dark-primary font-bold">
                {emp.bank_name || 'Not Provided'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Branch Name
              </span>
              <span className="text-dark-primary font-bold">
                {emp.bank_branch_name || 'Not Provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contacts */}
        <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
            <i className="fas fa-phone-alt text-rose-600"></i> Emergency Contacts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
              <span className="font-extrabold text-rose-900 block text-xs">
                Emergency Contact 1
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-dark-muted block text-[10px]">Name:</span>{' '}
                  <strong>{emp.emergency_contact_1?.name || 'Not Provided'}</strong>
                </div>
                <div>
                  <span className="text-dark-muted block text-[10px]">Relation:</span>{' '}
                  <strong>{emp.emergency_contact_1?.relation || 'Not Provided'}</strong>
                </div>
                <div>
                  <span className="text-dark-muted block text-[10px]">Phone:</span>{' '}
                  <strong>{emp.emergency_contact_1?.phone || 'Not Provided'}</strong>
                </div>
                <div>
                  <span className="text-dark-muted block text-[10px]">Address:</span>{' '}
                  <strong>{emp.emergency_contact_1?.address || 'Not Provided'}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
              <span className="font-extrabold text-rose-900 block text-xs">
                Emergency Contact 2
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-dark-muted block text-[10px]">Name:</span>{' '}
                  <strong>{emp.emergency_contact_2?.name || 'Not Provided'}</strong>
                </div>
                <div>
                  <span className="text-dark-muted block text-[10px]">Relation:</span>{' '}
                  <strong>{emp.emergency_contact_2?.relation || 'Not Provided'}</strong>
                </div>
                <div>
                  <span className="text-dark-muted block text-[10px]">Phone:</span>{' '}
                  <strong>{emp.emergency_contact_2?.phone || 'Not Provided'}</strong>
                </div>
                <div>
                  <span className="text-dark-muted block text-[10px]">Address:</span>{' '}
                  <strong>{emp.emergency_contact_2?.address || 'Not Provided'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Employee Details (Read-Only / Display Purpose Only) */}
        <div className="bg-white p-6 rounded-3xl border border-light-border shadow-sm space-y-4 md:col-span-2">
          <h3 className="text-base font-black text-dark-primary flex items-center gap-2 border-b pb-3">
            <i className="fas fa-briefcase text-blue-primary"></i> Employee Details (Read-Only)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Employee ID
              </span>
              <span className="text-dark-primary font-bold">
                {emp.emp_id || `EMP-${String(emp.id || 1).padStart(3, '0')}`}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Organization
              </span>
              <span className="text-dark-primary font-bold">
                {emp.organization || 'Jamia Zaytoonah'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Designation
              </span>
              <span className="text-dark-primary font-bold">
                {emp.designation || emp.role || 'Teacher'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Joining Date
              </span>
              <span className="text-dark-primary font-bold">
                {emp.joining_date || 'Not Updated'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Salaried Employee
              </span>
              <span className="text-dark-primary font-bold">
                {emp.is_salaried_employee !== false ? 'Salaried' : 'Service'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Current Monthly Salary
              </span>
              <span className="text-emerald-700 font-extrabold">
                {emp.current_salary
                  ? `₹${Number(emp.current_salary).toLocaleString('en-IN')}`
                  : 'Not Updated'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Teaching Staff
              </span>
              <span className="text-dark-primary font-bold">
                {emp.is_teacher !== false ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-dark-muted block text-[10px] uppercase font-bold">
                Active Status
              </span>
              <span className="text-emerald-700 font-extrabold">
                {emp.is_active !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 text-[11px] text-blue-900 font-medium">
            <i className="fas fa-info-circle text-blue-600 mr-1.5"></i>
            Official employment classification and administrative designations are managed by HR /
            Administration.
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelfProfileCard;
