import React, { useState } from "react";
import { supabase } from "../../../../src/utils/supabase";

export default function NewAdmission({ inModal = false }) {
  const [formData, setFormData] = useState({
    studentName: "",
    dateOfBirth: "",
    parentName: "",
    mobileNo: "",
    address: "",
    area: "",
    city: "",
    pincode: "",
    lastSchoolAttended: "",
    lastClassAttended: "",
    fathersEducation: "",
    mothersEducation: "",
    fathersOccupation: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () =>
    setFormData({
      studentName: "",
      dateOfBirth: "",
      parentName: "",
      mobileNo: "",
      address: "",
      area: "",
      city: "",
      pincode: "",
      lastSchoolAttended: "",
      lastClassAttended: "",
      fathersEducation: "",
      mothersEducation: "",
      fathersOccupation: "",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const currentYear = new Date().getFullYear();
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${currentYear}-01-01`)
        .lt("created_at", `${currentYear + 1}-01-01`);

      const applicationId = `JZV-${currentYear}-${(count + 1).toString().padStart(3, "0")}`;

      const { data, error } = await supabase
        .from("applications")
        .insert([
          {
            application_id: applicationId,
            student_name: formData.studentName,
            date_of_birth: formData.dateOfBirth,
            parent_name: formData.parentName,
            mobile_no: formData.mobileNo,
            address: formData.address,
            area: formData.area,
            city: formData.city,
            pincode: formData.pincode,
            last_school_attended: formData.lastSchoolAttended,
            last_class_attended: formData.lastClassAttended,
            fathers_education: formData.fathersEducation,
            mothers_education: formData.mothersEducation,
            fathers_occupation: formData.fathersOccupation,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        resetForm();
        setSuccessData({
          applicationId: data[0].application_id,
          studentName: data[0].student_name,
        });
        setShowOverlay(true);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const containerClass = inModal
    ? "py-4 px-4"
    : "min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4";
  const cardClass = inModal
    ? "bg-white rounded-lg p-6"
    : "bg-white rounded-lg shadow-lg p-8";

  return (
    <>
      {/* ── Success overlay ─────────────────────────────────────────────── */}
      {showOverlay && successData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full text-center">
            <div className="text-6xl mb-6 animate-pulse">✅</div>
            <h2 className="text-3xl font-bold text-green-600 mb-4">Success!</h2>
            <p className="text-gray-700 mb-6 text-lg">
              Application submitted successfully.
            </p>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Application ID</p>
              <p className="text-2xl font-bold text-green-700 font-mono tracking-widest">
                {successData.applicationId}
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Keep this ID safe for future reference.
            </p>
            <button
              onClick={() => {
                setShowOverlay(false);
                setSuccessData(null);
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <div className={containerClass}>
        <div className="max-w-3xl mx-auto">
          <div className={cardClass}>
            <h1
              className={`font-bold text-gray-900 mb-8 ${inModal ? "text-2xl" : "text-3xl"}`}
            >
              Admission Enquiry Form
            </h1>

            {message && (
              <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Section title="Student Details">
                <InputField
                  label="Student Name *"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
                <InputField
                  label="Date of Birth *"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  type="date"
                />
                <InputField
                  label="Last School Attended *"
                  name="lastSchoolAttended"
                  value={formData.lastSchoolAttended}
                  onChange={handleChange}
                  placeholder="School name"
                />
                <InputField
                  label="Last Class Attended *"
                  name="lastClassAttended"
                  value={formData.lastClassAttended}
                  onChange={handleChange}
                  placeholder="e.g., Class 10"
                />
              </Section>

              <Section title="Parent Details">
                <InputField
                  label="Parent's Name *"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  placeholder="Enter parent's name"
                />
                <InputField
                  label="Father's Education *"
                  name="fathersEducation"
                  value={formData.fathersEducation}
                  onChange={handleChange}
                  placeholder="e.g., B.A., B.Tech"
                />
                <InputField
                  label="Mother's Education *"
                  name="mothersEducation"
                  value={formData.mothersEducation}
                  onChange={handleChange}
                  placeholder="e.g., B.A., B.Tech"
                />
                <InputField
                  label="Father's Occupation *"
                  name="fathersOccupation"
                  value={formData.fathersOccupation}
                  onChange={handleChange}
                  placeholder="e.g., Engineer, Doctor"
                />
              </Section>

              <Section title="Contact Details">
                <InputField
                  label="Mobile No *"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleChange}
                  type="tel"
                  placeholder="10-digit mobile number"
                  pattern="[0-9]{10}"
                />
                <InputField
                  label="Address *"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                />
                <InputField
                  label="Area *"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Area/Locality"
                />
                <InputField
                  label="City *"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
                <InputField
                  label="Pincode *"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  pattern="[0-9]{6}"
                />
              </Section>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
  pattern,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        pattern={pattern}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
    </div>
  );
}
