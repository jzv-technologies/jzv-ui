// src/components/forms/FormSuccessPanel.jsx
import React from 'react';

/**
 * In-page success state for a dynamic form submission.
 * Replaces the former modal so the submitted form page itself confirms the result.
 */
const FormSuccessPanel = ({ message, onReset, buttonClass = 'bg-blue-600' }) => {
  const goHome = () => {
    window.location.assign('/');
  };

  return (
    <div data-feature="dynamic-form-success">
      <div className="bg-white border border-emerald-100 rounded-[32px] shadow-2xl p-8 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 mb-6">
          <i className="fas fa-check text-3xl text-emerald-600" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">
          Submission Successful
        </h2>

        <p className="text-gray-600 leading-relaxed whitespace-pre-line max-w-2xl mx-auto">
          {message}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={goHome}
            className="px-6 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all cursor-pointer"
          >
            <i className="fas fa-house mr-2" />
            Go to Home Page
          </button>
          <button
            type="button"
            onClick={onReset}
            className={`px-6 py-3 rounded-2xl text-white font-bold text-sm hover:opacity-90 transition-all cursor-pointer shadow-lg ${buttonClass}`}
          >
            <i className="fas fa-plus mr-2" />
            Submit Another Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormSuccessPanel;
