import React, { useState } from "react";
import NewApplication from "./NewApplication";
import CheckApplicationStatus from "./CheckStatus";

export default function Admission({ inModal = false }) {
  const [view, setView] = useState("menu"); // 'menu', 'new', 'check'
  const [successData, setSuccessData] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleApplicationSuccess = (data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
  };

  if (view === "new") {
    return (
      <NewApplication
        onBack={() => setView("menu")}
        inModal={inModal}
        onSuccess={handleApplicationSuccess}
      />
    );
  }

  if (view === "check") {
    return (
      <CheckApplicationStatus
        onBack={() => setView("menu")}
        inModal={inModal}
      />
    );
  }

  const containerClass = inModal
    ? "py-6 px-4"
    : "min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4";

  if (showSuccessModal && successData) {
    return (
      <div className={containerClass}>
        <div className="max-w-2xl mx-auto h-full flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="text-6xl mb-6 animate-pulse">✅</div>
                <h2 className="text-3xl font-bold text-green-600 mb-4">
                  Success!
                </h2>
                <p className="text-gray-700 mb-6 text-lg">
                  Your application has been submitted successfully.
                </p>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Application ID:</p>
                  <p className="text-2xl font-bold text-green-700 font-mono tracking-widest">
                    {successData.applicationId}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Keep this ID for future reference
                </p>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setView("menu");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="max-w-2xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {/* New Application Card */}
          <div
            onClick={() => setView("new")}
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                New Application
              </h2>
              <p className="text-gray-600 mb-6">
                Submit a new application for admission
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Start Application
              </button>
            </div>
          </div>

          {/* Check Status Card */}
          <div
            onClick={() => setView("check")}
            className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Check Status
              </h2>
              <p className="text-gray-600 mb-6">
                Check your application status
              </p>
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Check Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
