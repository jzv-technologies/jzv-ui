import React from "react";

const NIOS = ({ niosTab, setNiosTab }) => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col pb-6">
      <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 mb-6 sm:mb-8 bg-light-white p-6 sm:p-8 lg:p-10 rounded-2xl border-2 border-red-primary shadow-sm">
        <div className="bg-red-50 text-red-primary p-6 lg:p-8 rounded-full flex-shrink-0 mx-auto lg:mx-0">
          <i className="fas fa-certificate text-5xl sm:text-6xl"></i>
        </div>
        <div className="flex-1 text-center lg:text-left">
          <h4 className="font-bold text-dark-almostblack mb-3">
            National Institute of Open Schooling
          </h4>
          <p className="lg:text-xl text-dark-charcoal leading-relaxed">
            <strong className="text-red-dark">10th (Secondary)</strong> &{" "}
            <strong className="text-red-dark">12th (Senior Secondary)</strong>{" "}
            Board Certifications.
          </p>
          <p className="text-dark-muted mt-3 italic">
            "NIOS allows students to complete formal education without
            compromising their Aalimiyat journey."
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-6 sm:mb-8 bg-light-white p-2 rounded-xl border border-light-border shadow-sm">
        <button
          onClick={() => setNiosTab("overview")}
          className={`nios-tab-btn flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold transition-all duration-200 ease-out active:scale-[0.98] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${niosTab === "overview" ? "bg-red-primary text-white shadow-sm" : "bg-light-bg text-dark-muted hover:text-red-primary hover:bg-red-50"}`}
        >
          Authority & Value
        </button>
        <button
          onClick={() => setNiosTab("academics")}
          className={`nios-tab-btn flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold transition-all duration-200 ease-out active:scale-[0.98] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${niosTab === "academics" ? "bg-red-primary text-white shadow-sm" : "bg-light-bg text-dark-muted hover:text-red-primary hover:bg-red-50"}`}
        >
          Academics & Exams
        </button>
        <button
          onClick={() => setNiosTab("career")}
          className={`nios-tab-btn flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold transition-all duration-200 ease-out active:scale-[0.98] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${niosTab === "career" ? "bg-red-primary text-white shadow-sm" : "bg-light-bg text-dark-muted hover:text-red-primary hover:bg-red-50"}`}
        >
          Why NIOS & Careers
        </button>
        <button
          onClick={() => setNiosTab("admission")}
          className={`nios-tab-btn flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold transition-all duration-200 ease-out active:scale-[0.98] min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-primary ${niosTab === "admission" ? "bg-red-primary text-white shadow-sm" : "bg-light-bg text-dark-muted hover:text-red-primary hover:bg-red-50"}`}
        >
          Eligibility & Admission
        </button>
      </div>

      {niosTab === "overview" && (
        <div className="nios-tab-content space-y-6 sm:space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-landmark text-red-primary mr-3 shrink-0"></i>{" "}
                What is NIOS?
              </h5>
              <ul className="space-y-4 text-dark-charcoal">
                <li>
                  <strong className="text-dark-deepblue">Managed by:</strong>{" "}
                  National Institute of Open Schooling
                </li>
                <li>
                  <strong className="text-dark-deepblue">Under:</strong>{" "}
                  Ministry of Education, Govt. of India
                </li>
                <li>
                  <strong className="text-dark-deepblue">Type:</strong> Open &
                  Distance Learning Board
                </li>
                <li>
                  <strong className="text-dark-deepblue">Recognition:</strong>{" "}
                  Equivalent to CBSE / ICSE / State Boards
                </li>
                <li>
                  <strong className="text-dark-deepblue">Students:</strong> 3.5
                  lakh+ enrolled annually
                </li>
              </ul>
            </div>
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-check-circle text-red-primary mr-3 shrink-0"></i>{" "}
                Why Choose NIOS?
              </h5>
              <ul className="space-y-4 text-dark-charcoal">
                <li>
                  <strong className="text-dark-deepblue">Flexible:</strong>{" "}
                  Study at your own pace, no attendance required
                </li>
                <li>
                  <strong className="text-dark-deepblue">Affordable:</strong>{" "}
                  Low fees, no transportation costs
                </li>
                <li>
                  <strong className="text-dark-deepblue">Quality:</strong> Same
                  syllabus as regular boards
                </li>
                <li>
                  <strong className="text-dark-deepblue">Accessible:</strong>{" "}
                  Study materials in multiple languages
                </li>
                <li>
                  <strong className="text-dark-deepblue">Valid:</strong>{" "}
                  Accepted by all universities & competitive exams
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-red-50 p-6 sm:p-8 rounded-2xl border border-red-light">
            <h5 className="font-bold text-red-dark mb-5">
              <i className="fas fa-star text-red-primary mr-3 shrink-0"></i>{" "}
              Special Advantage for Madrasa Students
            </h5>
            <p className="text-dark-charcoal mb-4">
              NIOS is designed for students who cannot attend regular schools
              due to various reasons, including religious education commitments.
            </p>
            <ul className="space-y-3 text-dark-charcoal">
              <li>
                <strong className="text-dark-deepblue">No Conflict:</strong>{" "}
                Complete Aalimiyat without missing formal education
              </li>
              <li>
                <strong className="text-dark-deepblue">Recognition:</strong>{" "}
                Your Aalimiyat degree + NIOS certificate = complete profile
              </li>
              <li>
                <strong className="text-dark-deepblue">Future Proof:</strong>{" "}
                Opens doors to higher education & professional courses
              </li>
            </ul>
          </div>
        </div>
      )}

      {niosTab === "academics" && (
        <div className="nios-tab-content space-y-6 sm:space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-book-open text-red-primary mr-3 shrink-0"></i>{" "}
                Subjects Offered
              </h5>
              <p className="text-dark-charcoal mb-4">
                <strong className="text-dark-deepblue">10th Grade:</strong> 5
                compulsory + 2 optional subjects
              </p>
              <ul className="space-y-2 text-dark-charcoal mb-6">
                <li>
                  <strong>Compulsory:</strong> Hindi, English, Mathematics,
                  Science & Technology, Social Science
                </li>
                <li>
                  <strong>Optional:</strong> Sanskrit, Urdu, Arabic, etc.
                </li>
              </ul>
              <p className="text-dark-charcoal mb-4">
                <strong className="text-dark-deepblue">12th Grade:</strong> 5
                subjects (any combination)
              </p>
              <ul className="space-y-2 text-dark-charcoal">
                <li>
                  Mathematics, Physics, Chemistry, Biology, History, Geography,
                  Political Science, Economics, Business Studies, Accountancy,
                  Home Science, Psychology, Computer Science, Sociology, etc.
                </li>
              </ul>
            </div>
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-calendar-alt text-red-primary mr-3 shrink-0"></i>{" "}
                Exam Schedule
              </h5>
              <ul className="space-y-4 text-dark-charcoal">
                <li>
                  <strong className="text-dark-deepblue">Exam Months:</strong>{" "}
                  April-May & October-November
                </li>
                <li>
                  <strong className="text-dark-deepblue">Public Exams:</strong>{" "}
                  Twice a year
                </li>
                <li>
                  <strong className="text-dark-deepblue">
                    On-Demand Exams:
                  </strong>{" "}
                  Available for failed subjects
                </li>
                <li>
                  <strong className="text-dark-deepblue">
                    Practical Exams:
                  </strong>{" "}
                  Separate for science subjects
                </li>
                <li>
                  <strong className="text-dark-deepblue">
                    Result Declaration:
                  </strong>{" "}
                  Within 45 days
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-red-50 p-6 sm:p-8 rounded-2xl border border-red-light">
            <h5 className="font-bold text-red-dark mb-5">
              <i className="fas fa-graduation-cap text-red-primary mr-3 shrink-0"></i>{" "}
              Passing Criteria
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-dark-charcoal mb-3">
                  <strong className="text-dark-deepblue">10th Grade:</strong>
                </p>
                <ul className="space-y-2 text-dark-charcoal">
                  <li>33% in each subject</li>
                  <li>Overall pass percentage</li>
                </ul>
              </div>
              <div>
                <p className="text-dark-charcoal mb-3">
                  <strong className="text-dark-deepblue">12th Grade:</strong>
                </p>
                <ul className="space-y-2 text-dark-charcoal">
                  <li>33% in each subject</li>
                  <li>Theory + Practical (where applicable)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {niosTab === "career" && (
        <div className="nios-tab-content space-y-6 sm:space-y-8 animate-fade-in">
          <div className="bg-red-50 p-6 sm:p-8 rounded-2xl border border-red-light">
            <h5 className="font-bold text-red-dark mb-5">
              <i className="fas fa-rocket text-red-primary mr-3 shrink-0"></i>{" "}
              Why NIOS is Perfect for You
            </h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-dark-charcoal mb-3">
                  <strong className="text-dark-deepblue">
                    For Aalimiyat Students:
                  </strong>
                </p>
                <ul className="space-y-2 text-dark-charcoal">
                  <li>Complete formal education alongside religious studies</li>
                  <li>No need to leave madrasa for regular school</li>
                  <li>Flexible timing fits madrasa schedule</li>
                  <li>Low cost compared to private schools</li>
                </ul>
              </div>
              <div>
                <p className="text-dark-charcoal mb-3">
                  <strong className="text-dark-deepblue">
                    Career Benefits:
                  </strong>
                </p>
                <ul className="space-y-2 text-dark-charcoal">
                  <li>Opens doors to universities & colleges</li>
                  <li>Eligible for government jobs & scholarships</li>
                  <li>Valid for competitive exams (UPSC, etc.)</li>
                  <li>International recognition</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border text-center">
              <div className="text-3xl sm:text-4xl text-red-primary mb-4">
                <i className="fas fa-university"></i>
              </div>
              <h6 className="font-bold text-dark-almostblack mb-2">
                Higher Education
              </h6>
              <p className="text-dark-charcoal">
                BA, B.Com, B.Sc, Engineering, Medical, etc.
              </p>
            </div>
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border text-center">
              <div className="text-3xl sm:text-4xl text-red-primary mb-4">
                <i className="fas fa-briefcase"></i>
              </div>
              <h6 className="font-bold text-dark-almostblack mb-2">
                Government Jobs
              </h6>
              <p className="text-dark-charcoal">
                Banking, Railways, Defense, Police, etc.
              </p>
            </div>
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border text-center">
              <div className="text-3xl sm:text-4xl text-red-primary mb-4">
                <i className="fas fa-globe"></i>
              </div>
              <h6 className="font-bold text-dark-almostblack mb-2">
                Competitive Exams
              </h6>
              <p className="text-dark-charcoal">
                UPSC, SSC, Banking, Railway, etc.
              </p>
            </div>
          </div>
        </div>
      )}

      {niosTab === "admission" && (
        <div className="nios-tab-content space-y-6 sm:space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-user-check text-red-primary mr-3 shrink-0"></i>{" "}
                Eligibility
              </h5>
              <p className="text-dark-charcoal mb-4">
                <strong className="text-dark-deepblue">For 10th Grade:</strong>
              </p>
              <ul className="space-y-2 text-dark-charcoal mb-6">
                <li>Minimum age: 14 years (as on 31st July)</li>
                <li>No upper age limit</li>
                <li>No formal education requirement</li>
              </ul>
              <p className="text-dark-charcoal mb-4">
                <strong className="text-dark-deepblue">For 12th Grade:</strong>
              </p>
              <ul className="space-y-2 text-dark-charcoal">
                <li>10th pass or equivalent</li>
                <li>Minimum age: 15 years (as on 31st July)</li>
                <li>No upper age limit</li>
              </ul>
            </div>
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-calendar-plus text-red-primary mr-3 shrink-0"></i>{" "}
                Admission Process
              </h5>
              <ul className="space-y-4 text-dark-charcoal">
                <li>
                  <strong className="text-dark-deepblue">
                    Online Registration:
                  </strong>{" "}
                  Through NIOS website
                </li>
                <li>
                  <strong className="text-dark-deepblue">
                    Application Period:
                  </strong>{" "}
                  Throughout the year
                </li>
                <li>
                  <strong className="text-dark-deepblue">
                    Documents Required:
                  </strong>{" "}
                  ID proof, address proof, age proof
                </li>
                <li>
                  <strong className="text-dark-deepblue">Fee:</strong> ₹1,850
                  for 10th, ₹2,000 for 12th (approx.)
                </li>
                <li>
                  <strong className="text-dark-deepblue">
                    Study Materials:
                  </strong>{" "}
                  Provided by NIOS
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-red-50 p-6 sm:p-8 rounded-2xl border border-red-light">
            <h5 className="font-bold text-red-dark mb-5">
              <i className="fas fa-info-circle text-red-primary mr-3 shrink-0"></i>{" "}
              Important Notes
            </h5>
            <ul className="space-y-3 text-dark-charcoal">
              <li>
                <strong className="text-dark-deepblue">Study Centers:</strong>{" "}
                Optional, but recommended for practical subjects
              </li>
              <li>
                <strong className="text-dark-deepblue">Language:</strong> Study
                materials available in multiple languages
              </li>
              <li>
                <strong className="text-dark-deepblue">Support:</strong>{" "}
                Toll-free helpline and online support available
              </li>
              <li>
                <strong className="text-dark-deepblue">Validity:</strong> NIOS
                certificate is valid for all purposes
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NIOS;
