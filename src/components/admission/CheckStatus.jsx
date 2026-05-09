import React, { useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CheckApplicationStatus({ inModal = false }) {
  const [searchType, setSearchType] = useState("id"); // 'id', 'name', 'mobile'
  const [searchData, setSearchData] = useState({
    id: "",
    studentName: "",
    dateOfBirth: "",
    mobileNo: "",
  });
  const [results, setResults] = useState([]); // Store all results
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setResults([]);

    try {
      let query = supabase.from("applications").select("*");

      if (searchType === "id") {
        query = query.eq("application_id", searchData.id); // Changed from "id" to "application_id"
      } else if (searchType === "name") {
        query = query
          .ilike("student_name", `%${searchData.studentName}%`)
          .eq("date_of_birth", searchData.dateOfBirth);
      } else if (searchType === "mobile") {
        query = query.eq("mobile_no", searchData.mobileNo);
      }

      const { data, error } = await query;

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else if (!data || data.length === 0) {
        setMessage("No application found. Please check your search criteria.");
      } else {
        setResults(data);
        setCurrentIndex(0);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        inModal
          ? "py-4 px-4"
          : "min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4"
      }
    >
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Check Application Status
          </h1>

          {/* Search Type Selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Search By:
            </label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="id"
                  checked={searchType === "id"}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setMessage("");
                    setResults([]);
                    setCurrentIndex(0);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Application ID</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="name"
                  checked={searchType === "name"}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setMessage("");
                    setResults([]);
                    setCurrentIndex(0);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Student Name & DOB</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="mobile"
                  checked={searchType === "mobile"}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setMessage("");
                    setResults([]);
                    setCurrentIndex(0);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">Mobile Number</span>
              </label>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="space-y-4">
              {searchType === "id" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application ID *
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={searchData.id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="JZV-YYYY-XXXX"
                  />
                </div>
              )}

              {searchType === "name" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student Name *
                    </label>
                    <input
                      type="text"
                      name="studentName"
                      value={searchData.studentName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter student name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={searchData.dateOfBirth}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {searchType === "mobile" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="mobileNo"
                    value={searchData.mobileNo}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${message.includes("Error") || message.includes("No application") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {message}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              {results.length > 1 && (
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Application Details
                  </h2>
                  <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    {currentIndex + 1} of {results.length}
                  </span>
                </div>
              )}
              {results.length === 1 && (
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Application Details
                </h2>
              )}

              {(() => {
                const result = results[currentIndex];
                return (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Application ID</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {result.application_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Student Name</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {result.student_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Date of Birth</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {result.date_of_birth}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Mobile Number</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {result.mobile_no}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p
                          className={`text-lg font-semibold ${
                            result.status === "approved"
                              ? "text-green-600"
                              : result.status === "rejected"
                                ? "text-red-600"
                                : "text-yellow-600"
                          }`}
                        >
                          {result.status?.charAt(0).toUpperCase() +
                            result.status?.slice(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Entrance Exam Date
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {result.entrance_exam_date
                            ? result.entrance_exam_date
                            : "Not scheduled yet"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {result.address}, {result.area}, {result.city} -{" "}
                          {result.pincode}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">
                          Application Submitted On
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(result.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {results.length > 1 && (
                      <div className="flex gap-4 pt-4 border-t">
                        <button
                          onClick={() =>
                            setCurrentIndex(
                              currentIndex === 0
                                ? results.length - 1
                                : currentIndex - 1,
                            )
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                          ← Previous
                        </button>
                        <button
                          onClick={() =>
                            setCurrentIndex(
                              currentIndex === results.length - 1
                                ? 0
                                : currentIndex + 1,
                            )
                          }
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
