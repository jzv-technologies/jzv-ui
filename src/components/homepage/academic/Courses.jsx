import React from "react";

const Courses = ({ courseView, setCourseView }) => {
  if (courseView === "pcc") {
    return (
      <div className="max-w-6xl mx-auto flex flex-col pb-10">
        <button
          onClick={() => setCourseView("main")}
          className="mb-6 text-dark-muted font-bold text-lg sm:text-xl flex items-center hover:text-brand active:scale-95 transition-all duration-200 ease-out w-fit min-h-[44px]"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back to Courses
        </button>
        <div className="bg-light-white border-t-8 border-brand-dark p-6 sm:p-8 lg:p-12 rounded-2xl shadow-sm flex-1">
          <h4 className="font-bold text-xl sm:text-2xl text-dark-deepblue mb-4 flex items-center gap-3">
            <i className="fas fa-award mr-3 text-brand-dark shrink-0"></i>{" "}
            Aalimiyat Platinum Certificate Program (PCC)
          </h4>
          <p className="text-lg sm:text-xl text-dark-charcoal mb-10 pb-8 border-b border-light-border">
            A comprehensive 12-year structured program designed to build strong
            foundations and integrate Islamic and modern education.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10">
            <div className="space-y-8">
              <div className="bg-brand-soft bg-opacity-10 p-6 sm:p-8 rounded-2xl border border-brand-soft border-opacity-30">
                <h5 className="font-bold text-xl sm:text-2xl text-brand-dark mb-4 flex items-center gap-3">
                  <i className="fas fa-cubes mr-3 text-brand shrink-0"></i>{" "}
                  Foundation Stage (First 2 Years)
                </h5>
                <p className="text-base sm:text-xl text-dark-charcoal mb-8 italic">
                  "Focus solely on skill development in literacy. No textbooks
                  are used during this stage."
                </p>
                <p className="font-bold text-lg sm:text-xl text-dark-almostblack mb-6">
                  Core Subjects:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-comments text-brand "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Arabic Speaking
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-book-open text-brand "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Arabic Reading
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-pen-nib text-brand "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Arabic Writing
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-hands-holding text-brand "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Ibaadaat
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-book-reader text-blue-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      English Reading
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-microphone text-blue-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      English Speaking
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-pen text-blue-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      English Writing
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-book-quran text-green-dark "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Quran
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-calculator text-orange-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Mathematics
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border h-full">
                <h5 className="font-bold text-xl sm:text-2xl text-dark-almostblack mb-8 flex items-center gap-3">
                  <i className="fas fa-flag text-brand mr-3 shrink-0"></i>{" "}
                  Important Milestones
                </h5>
                <div className="relative border-l-4 border-brand ml-4 space-y-10 pb-4">
                  <div className="relative pl-6 sm:pl-8">
                    <div className="absolute -left-[14px] top-1 bg-brand w-6 h-6 rounded-full border-4 border-light-bg"></div>
                    <h6 className="font-bold text-lg sm:text-xl text-dark-deepblue mb-1">
                      10th Board Exam
                    </h6>
                    <p className="text-base sm:text-lg text-dark-muted m-0">
                      Conducted in Year 10
                    </p>
                  </div>
                  <div className="relative pl-6 sm:pl-8">
                    <div className="absolute -left-[14px] top-1 bg-brand w-6 h-6 rounded-full border-4 border-light-bg"></div>
                    <h6 className="font-bold text-lg sm:text-xl text-dark-deepblue mb-1">
                      12th Board Exam
                    </h6>
                    <p className="text-base sm:text-lg text-dark-muted m-0">
                      Conducted in Year 12
                    </p>
                  </div>
                  <div className="relative pl-6 sm:pl-8">
                    <div className="absolute -left-[14px] top-1 bg-yellow-gold w-6 h-6 rounded-full border-4 border-light-bg"></div>
                    <h6 className="font-bold text-lg sm:text-xl text-brand-dark mb-1">
                      Aalimiyat Degree
                    </h6>
                    <p className="text-base sm:text-lg text-dark-muted m-0">
                      Awarded upon the successful completion of the 12 levels of
                      the Aalimiyat course.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (courseView === "gcc") {
    return (
      <div className="max-w-6xl mx-auto flex flex-col pb-10">
        <button
          onClick={() => setCourseView("main")}
          className="mb-6 text-dark-muted font-bold text-lg sm:text-xl flex items-center hover:text-yellow-dark active:scale-95 transition-all duration-200 ease-out w-fit min-h-[44px]"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back to Courses
        </button>
        <div className="bg-light-white border-t-8 border-yellow-gold p-6 sm:p-8 lg:p-12 rounded-2xl shadow-sm flex-1">
          <h4 className="font-bold text-xl sm:text-2xl text-dark-deepblue mb-4 flex items-center gap-3">
            <i className="fas fa-medal mr-3 text-yellow-gold shrink-0"></i>{" "}
            Aalimiyat Golden Certificate Program (GCC)
          </h4>
          <p className="text-xl sm:text-2xl text-dark-charcoal mb-10 pb-8 border-b border-light-border">
            An intensive 8-year structured program designed for older entrants
            to master Islamic and modern competencies.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="bg-yellow-50 bg-opacity-50 p-6 sm:p-8 rounded-2xl border border-yellow-light">
                <h5 className="font-bold text-xl sm:text-2xl text-yellow-dark mb-4 flex items-center gap-3">
                  <i className="fas fa-cubes mr-3 text-yellow-gold shrink-0"></i>{" "}
                  Foundation Stage (First 1 Year)
                </h5>
                <p className="text-base sm:text-lg text-dark-charcoal mb-8 italic">
                  "Focus solely on skill development in literacy. No textbooks
                  are used during this stage."
                </p>
                <p className="font-bold text-lg sm:text-xl text-dark-almostblack mb-6">
                  Core Subjects:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-comments text-yellow-dark "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Arabic Speaking
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-book-open text-yellow-dark "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Arabic Reading
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-pen-nib text-yellow-dark "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Arabic Writing
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-hands-holding text-yellow-dark "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Ibaadaat
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-book-reader text-blue-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      English Reading
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-microphone text-blue-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      English Speaking
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-pen text-blue-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      English Writing
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-book-quran text-green-dark "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Quran
                    </span>
                  </div>
                  <div className="bg-light-white p-3 sm:p-4 rounded-xl shadow-sm border border-light-border text-center flex flex-col items-center justify-center gap-2">
                    <i className="fas fa-calculator text-orange-primary "></i>
                    <span className="font-semibold text-sm sm:text-lg leading-tight">
                      Mathematics
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border h-full">
                <h5 className="font-bold text-xl sm:text-3xl text-dark-almostblack mb-8 flex items-center gap-3">
                  <i className="fas fa-flag text-yellow-dark mr-3 shrink-0"></i>{" "}
                  Important Milestones
                </h5>
                <div className="relative border-l-4 border-yellow-gold ml-4 space-y-10 pb-4">
                  <div className="relative pl-6 sm:pl-8">
                    <div className="absolute -left-[14px] top-1 bg-yellow-gold w-6 h-6 rounded-full border-4 border-light-bg"></div>
                    <h6 className="font-bold text-lg sm:text-xl text-dark-deepblue mb-1">
                      10th Board Exam
                    </h6>
                    <p className="text-base sm:text-lg text-dark-muted m-0">
                      Conducted in the 6th Year
                    </p>
                  </div>
                  <div className="relative pl-6 sm:pl-8">
                    <div className="absolute -left-[14px] top-1 bg-yellow-gold w-6 h-6 rounded-full border-4 border-light-bg"></div>
                    <h6 className="font-bold text-lg sm:text-xl text-dark-deepblue mb-1">
                      12th Board Exam
                    </h6>
                    <p className="text-base sm:text-lg text-dark-muted m-0">
                      Conducted in the 9th Year
                    </p>
                  </div>
                  <div className="relative pl-6 sm:pl-8">
                    <div className="absolute -left-[14px] top-1 bg-brand w-6 h-6 rounded-full border-4 border-light-bg"></div>
                    <h6 className="font-bold text-lg sm:text-xl text-yellow-dark mb-1">
                      Aalimiyat Degree
                    </h6>
                    <p className="text-base sm:text-lg text-dark-muted m-0">
                      Awarded upon the successful completion of the 10-year
                      Aalimiyat course.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col transition-all duration-300 pb-10">
      <p className="mb-10 lg:text-xl text-center text-dark-primary bg-brand text-white py-4 sm:py-6 px-4 rounded-2xl shadow-md font-medium">
        We offer two types of Aalimiyat certificate programs based on age and
        knowledge.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 flex-1">
        <div
          tabIndex={0}
          onClick={() => setCourseView("pcc")}
          className="bg-light-white border-l-8 border-brand-dark rounded-2xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer group relative overflow-hidden flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          <div className="absolute top-0 right-0 bg-brand-dark text-white px-4 sm:px-6 py-2 rounded-bl-2xl font-bold text-lg sm:text-xl">
            PCC
          </div>
          <div className="p-3 sm:p-5 lg:p-6 flex-1">
            <p className="px-10 sm:px-12 text-lg sm:text-xl text-brand-dark tracking-[0.2em]">
              AALIMIYAT
            </p>
            <h4 className="font-bold text-xl sm:text-2xl text-brand-dark mb-6 sm:mb-8 border-b-2 border-light-ui pb-4 sm:pb-6 group-hover:text-brand transition-colors duration-200 flex items-center gap-3">
              <i className="fas fa-award mr-4 text-brand shrink-0"></i> Platinum
              Certificate
            </h4>
            <ul className="list-none space-y-2 sm:space-y-4 text-lg sm:text-xl text-dark-charcoal">
              <li className="flex items-center gap-3">
                <i className="fas fa-child text-brand-soft w-8 sm:w-10 text-xl sm:text-2xl text-center shrink-0"></i>
                <strong>Entry Age:</strong>{" "}
                <span className="ml-3">6 to 8 years</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-check-circle text-brand-soft w-8 sm:w-10 text-xl sm:text-2xl text-center shrink-0"></i>
                <strong>Criteria:</strong>{" "}
                <span className="ml-3">1st Standard Pass</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-hourglass-half text-brand-soft w-8 sm:w-10 text-xl sm:text-2xl text-center shrink-0"></i>
                <strong>Duration:</strong>{" "}
                <span className="ml-3">13 years (3+3+3+4)</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-flag-checkered text-brand-soft w-8 sm:w-10 text-xl sm:text-2xl text-center shrink-0"></i>
                <strong>Completion:</strong>{" "}
                <span className="ml-3">19 or 20 years</span>
              </li>
              <li className="flex items-start gap-3">
                <i className="fas fa-graduation-cap text-brand-soft w-8 sm:w-10 text-xl sm:text-2xl mt-1 text-center shrink-0"></i>
                <strong>Outcome:</strong>{" "}
                <span className="ml-3">Aalimiyat & 10th/12th (NIOS)</span>
              </li>
            </ul>
          </div>
          <div className="bg-brand-soft bg-opacity-10 p-4 sm:p-6 text-center text-brand-dark font-bold text-lg sm:text-xl group-hover:bg-brand group-hover:text-white transition-colors duration-200">
            View Program Details{" "}
            <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform duration-200"></i>
          </div>
        </div>
        <div
          tabIndex={0}
          onClick={() => setCourseView("gcc")}
          className="bg-light-white border-l-8 border-yellow-gold rounded-2xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer group relative overflow-hidden flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-gold"
        >
          <div className="absolute top-0 right-0 bg-yellow-gold text-white px-4 sm:px-6 py-2 rounded-bl-2xl font-bold text-lg sm:text-xl">
            GCC
          </div>
          <div className="p-3 sm:p-5 lg:p-6 flex-1">
            <p className="px-12 sm:px-14 text-lg sm:text-xl text-yellow-dark tracking-[0.2em]">
              AALIMIYAT
            </p>
            <h4 className="font-bold text-xl sm:text-2xl text-yellow-dark mb-6 sm:mb-8 border-b-2 border-light-ui pb-4 sm:pb-6 group-hover:text-yellow-gold transition-colors duration-200 flex items-center gap-3">
              <i className="fas fa-medal mr-4 text-yellow-gold shrink-0"></i>{" "}
              Golden Certificate
            </h4>
            <ul className="list-none space-y-2 sm:space-y-4 text-lg sm:text-xl text-dark-charcoal">
              <li className="flex items-start gap-3">
                <i className="fas fa-child text-yellow-gold w-8 sm:w-10 text-xl sm:text-2xl mt-1 text-center shrink-0"></i>
                <span className="flex-1 ml-3">
                  <strong>Entry Age:</strong> 10 to 12 years <br />
                </span>
              </li>
              <li className="flex items-start gap-3">
                <i className="fas fa-check-circle text-yellow-gold w-8 sm:w-10 text-xl sm:text-2xl mt-1 text-center shrink-0"></i>
                <span className="flex-1 ml-3">
                  <strong>Criteria:</strong>5th Pass <br />
                </span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-hourglass-half text-yellow-gold w-8 sm:w-10 text-xl sm:text-2xl text-center shrink-0"></i>
                <strong>Duration:</strong>{" "}
                <span className="ml-3">10 Years (2+2+3+3)</span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fas fa-flag-checkered text-yellow-gold w-8 sm:w-10 text-xl sm:text-2xl text-center shrink-0"></i>
                <strong>Completion:</strong>{" "}
                <span className="ml-3">20 to 21 years</span>
              </li>
              <li className="flex items-start gap-3">
                <i className="fas fa-graduation-cap text-yellow-gold w-8 sm:w-10 text-xl sm:text-2xl mt-1 text-center shrink-0"></i>
                <span className="flex-1 ml-3">
                  <strong>Outcome:</strong> Aalimiyat & 10th/12th (NIOS)
                </span>
              </li>
            </ul>
          </div>
          <div className="bg-yellow-gold bg-opacity-10 p-4 sm:p-6 text-center text-yellow-dark font-bold text-lg sm:text-xl group-hover:bg-yellow-gold group-hover:text-white transition-colors duration-200">
            View Program Details{" "}
            <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform duration-200"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Courses;
