import React from "react";

const AdmissionProcess = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 py-4">
      <div className="flex items-center gap-5 sm:gap-8 bg-light-white border border-light-border p-5 sm:p-6 lg:p-8 rounded-2xl shadow-sm hover:shadow-md transition">
        <div className="bg-blue-primary text-white w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-4xl shrink-0 shadow-inner">
          1
        </div>
        <div>
          <h5 className="font-bold mb-1 sm:mb-2 text-dark-almostblack">
            Enquiry
          </h5>
          <p className="text-dark-muted m-0">
            Initial contact and basic information gathering.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-8 bg-light-white border border-light-border p-5 sm:p-6 lg:p-8 rounded-2xl shadow-sm hover:shadow-md transition">
        <div className="bg-teal-primary text-white w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-4xl shrink-0 shadow-inner">
          2
        </div>
        <div>
          <h5 className="font-bold mb-1 sm:mb-2 text-dark-almostblack">
            Counselling
          </h5>
          <p className="text-dark-muted m-0">
            Discussing the child's needs and mapping them to our programs.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-8 bg-light-white border border-light-border p-5 sm:p-6 lg:p-8 rounded-2xl shadow-sm hover:shadow-md transition">
        <div className="bg-yellow-gold text-white w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-4xl shrink-0 shadow-inner">
          3
        </div>
        <div>
          <h5 className="font-bold mb-1 sm:mb-2 text-dark-almostblack">
            Entrance Test
          </h5>
          <p className="text-dark-muted m-0">
            Assessing the student's current baseline knowledge.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-8 bg-light-white border border-light-border p-5 sm:p-6 lg:p-8 rounded-2xl shadow-sm hover:shadow-md transition">
        <div className="bg-orange-primary text-white w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-4xl shrink-0 shadow-inner">
          4
        </div>
        <div>
          <h5 className="font-bold mb-1 sm:mb-2 text-dark-almostblack">
            Interview & Confirmation
          </h5>
          <p className="text-dark-muted m-0">
            Final discussion with parents and admission confirmation.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-8 bg-light-white border border-light-border p-5 sm:p-6 lg:p-8 rounded-2xl shadow-sm hover:shadow-md transition">
        <div className="bg-green-dark text-white w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-4xl shrink-0 shadow-inner">
          5
        </div>
        <div>
          <h5 className="font-bold mb-1 sm:mb-2 text-dark-almostblack">
            Fee Submission
          </h5>
          <p className="text-dark-muted m-0">
            Completing the enrollment process financially.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdmissionProcess;
