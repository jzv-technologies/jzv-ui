import React from "react";

const AlimiatStreams = (streamView, setStreamView) => {
  if (streamView === "law") {
    return (
      <div className="max-w-6xl mx-auto flex flex-col pb-10">
        <button
          onClick={() => setStreamView("main")}
          className="mb-6 text-dark-muted font-bold text-base sm:text-lg flex items-center hover:text-orange-primary active:scale-95 transition-all duration-200 ease-out w-fit min-h-[44px]"
        >
          <i className="fas fa-arrow-left mr-2 shrink-0"></i> Back to Streams
        </button>
        <div className="bg-light-white border-t-8 border-orange-primary p-6 sm:p-8 lg:p-12 rounded-2xl shadow-sm flex-1">
          <h4 className="font-bold text-dark-deepblue mb-4 flex items-center gap-3">
            <i className="fas fa-scale-balanced mr-3 text-orange-primary shrink-0"></i>{" "}
            Aalimiyat in Law
          </h4>
          <p className="text-base sm:text-lg text-dark-charcoal mb-10 pb-8 border-b border-light-border">
            Study of Islamic law and legal procedure, along with the analysis of
            the Constitution of India.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="bg-orange-50 p-6 sm:p-8 rounded-2xl border border-orange-soft">
                <h5 className="font-bold text-orange-dark mb-6">
                  <i className="fas fa-flag-in mr-2"></i> 1. Law Courses After
                  12th (India)
                </h5>
                <p className="text-dark-almostblack font-bold mb-3">
                  <i className="fas fa-graduation-cap text-orange-primary mr-2 shrink-0"></i>{" "}
                  Integrated Law Courses (5 Years)
                </p>
                <p className="text-dark-muted mb-4">
                  These are the main professional routes to become a lawyer in
                  India.
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal mb-6">
                  <li>BA LL.B</li>
                  <li>BBA LL.B</li>
                  <li>B.Com LL.B</li>
                  <li>B.Sc LL.B</li>
                </ul>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-light-white p-5 rounded-xl">
                  <div>
                    <p className="font-bold text-dark-deepblue mb-2">
                      <i className="fas fa-book-open text-orange-primary mr-2 shrink-0"></i>{" "}
                      Subjects:
                    </p>
                    <ul className="list-disc ml-6 text-dark-charcoal">
                      <li>Constitution</li>
                      <li>Criminal Law</li>
                      <li>Family Law</li>
                      <li>International Law</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-dark-deepblue mb-2">
                      <i className="fas fa-pen-alt text-orange-primary mr-2 shrink-0"></i>{" "}
                      Entrance Exams:
                    </p>
                    <ul className="list-disc ml-6 text-dark-charcoal">
                      <li>CLAT</li>
                      <li>AILET</li>
                      <li>LSAT India</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-brand-soft bg-opacity-10 p-6 sm:p-8 rounded-2xl border border-brand-soft border-opacity-30">
                <h5 className="font-bold text-brand-dark mb-4">
                  <i className="fas fa-star text-brand-bright mr-2 shrink-0"></i>{" "}
                  Special Advantage (After Aalimiyat)
                </h5>
                <p className="text-dark-charcoal mb-4">
                  Since you have studied Islamic texts, you are perfectly
                  positioned to specialize in:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal">
                  <li>Muslim Personal Law</li>
                  <li>Family Law (Nikah, Talaq, Inheritance)</li>
                  <li>Legal consultancy for Muslim institutions</li>
                  <li>Shariah advisory roles</li>
                </ul>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-layer-group text-dark-muted mr-2 shrink-0"></i>{" "}
                  Other Related Courses (India)
                </h5>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal">
                  <li>BA Political Science + LLB later</li>
                  <li>BA Islamic Studies + Law</li>
                  <li>Diploma in Shariah Law / Islamic Finance</li>
                  <li>Arbitration & Mediation courses</li>
                </ul>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-blue-50 p-6 sm:p-8 rounded-2xl border border-blue-light">
                <div className="bg-blue-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Highly Recommended
                </div>
                <h5 className="font-bold text-blue-dark mb-6">
                  <i className="fas fa-globe-americas mr-2 shrink-0"></i> 2.
                  Abroad Options
                </h5>
                <h6 className="text-dark-almostblack font-bold mb-4 mt-6">
                  <i className="fas fa-mosque text-blue-primary mr-2 shrink-0"></i>{" "}
                  Islamic Law / Shariah Path
                </h6>
                <p className="text-dark-charcoal mb-2">
                  <strong className="text-dark-deepblue">Countries:</strong>
                </p>
                <p className="text-dark-muted mb-4 ml-4">
                  Saudi Arabia, Qatar, UAE, Egypt, Malaysia, Turkey
                </p>
                <p className="text-dark-charcoal mb-2">
                  <strong className="text-dark-deepblue">Courses:</strong>
                </p>
                <ul className="list-disc ml-8 sm:ml-10 space-y-1 text-dark-charcoal mb-6">
                  <li>Shariah Law (Fiqh) + Civil Law</li>
                  <li>Islamic Jurisprudence (Usul al-Fiqh)</li>
                  <li>Islamic Finance & Banking Law</li>
                </ul>
                <p className="text-dark-charcoal font-bold mb-3">
                  <i className="fas fa-university text-blue-primary mr-2 shrink-0"></i>{" "}
                  Universities (Examples):
                </p>
                <ul className="list-disc ml-8 sm:ml-10 space-y-2 text-dark-charcoal mb-4">
                  <li>Islamic University of Madinah</li>
                  <li>Al-Azhar University</li>
                  <li>International Islamic University Malaysia</li>
                </ul>
                <p className="text-blue-dark italic ml-4 bg-light-white p-3 rounded-lg">
                  These universities offer combined Shariah + Law degrees in
                  Arabic or English mediums.
                </p>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-balance-scale-left text-dark-muted mr-2 shrink-0"></i>{" "}
                  Western Countries (UK / USA)
                </h5>
                <p className="text-dark-charcoal mb-4">You can pursue:</p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal mb-6">
                  <li>
                    <strong>LLB</strong> (Bachelor of Law)
                  </li>
                  <li>
                    <strong>LLM</strong> (Master of Law - after graduation)
                  </li>
                </ul>
                <p className="text-dark-charcoal font-bold mb-2">
                  Specializations:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal">
                  <li>International Law</li>
                  <li>Human Rights Law</li>
                  <li>Comparative Law (Islamic + Western)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (streamView === "commerce") {
    return (
      <div className="max-w-6xl mx-auto flex flex-col pb-10">
        <button
          onClick={() => setStreamView("main")}
          className="mb-6 text-dark-muted font-bold flex items-center hover:text-blue-primary active:scale-95 transition-all duration-200 ease-out w-fit min-h-[44px]"
        >
          <i className="fas fa-arrow-left mr-2 shrink-0"></i> Back to Streams
        </button>
        <div className="bg-light-white border-t-8 border-blue-primary p-6 sm:p-8 lg:p-12 rounded-2xl shadow-sm flex-1">
          <h4 className="font-bold text-dark-deepblue mb-4 flex items-center gap-3">
            <i className="fas fa-chart-line mr-3 text-blue-primary shrink-0"></i>{" "}
            Aalimiyat in Commerce
          </h4>
          <p className="text-dark-charcoal mb-10 pb-8 border-b border-light-border">
            Study of Islamic economic systems alongside requisite knowledge of
            modern economic systems.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="bg-blue-50 p-6 sm:p-8 rounded-2xl border border-blue-light">
                <div className="bg-blue-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Highly Recommended
                </div>
                <h5 className="font-bold text-blue-dark mb-6">
                  <i className="fas fa-balance-scale mr-2 shrink-0"></i> 1. Best
                  Law Options
                </h5>
                <p className="text-dark-almostblack font-bold mb-3">
                  Integrated Law (Top Choice)
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal mb-6">
                  <li>BA LL.B (5 years)</li>
                  <li>
                    <strong>BBA LL.B (5 years)</strong> ⭐{" "}
                    <span className="text-dark-muted">
                      (best for commerce background)
                    </span>
                  </li>
                  <li>
                    <strong>B.Com LL.B (5 years)</strong> ⭐⭐{" "}
                    <span className="text-dark-muted">
                      (perfect match for you)
                    </span>
                  </li>
                </ul>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-light-white p-5 rounded-xl">
                  <div>
                    <p className="font-bold text-dark-deepblue mb-2">
                      <i className="fas fa-thumbs-up text-blue-primary mr-2 shrink-0"></i>{" "}
                      Why this suits you:
                    </p>
                    <p className="text-dark-charcoal mb-2">
                      You already understand commerce + Islamic principles.
                    </p>
                    <p className="text-dark-charcoal font-semibold">
                      Specialize in:
                    </p>
                    <ul className="list-disc ml-6 text-dark-charcoal">
                      <li>Business Law</li>
                      <li>Tax Law</li>
                      <li>Muslim Personal Law</li>
                      <li>Corporate Law</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold text-dark-deepblue mb-2">
                      <i className="fas fa-briefcase text-blue-primary mr-2 shrink-0"></i>{" "}
                      Career:
                    </p>
                    <ul className="list-disc ml-6 text-dark-charcoal">
                      <li>Advocate</li>
                      <li>Legal advisor for businesses</li>
                      <li>Shariah-compliant finance advisor</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-6">
                  <i className="fas fa-chart-pie text-dark-muted mr-2 shrink-0"></i>{" "}
                  2. Commerce & Business Courses
                </h5>
                <div className="space-y-6">
                  <div>
                    <p className="text-dark-almostblack font-bold mb-2">
                      Core Degrees:
                    </p>
                    <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal">
                      <li>B.Com (General / Honors)</li>
                      <li>BBA (Bachelor of Business Administration)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-dark-almostblack font-bold mb-2">
                      After that:
                    </p>
                    <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal">
                      <li>MBA</li>
                      <li>CA (Chartered Accountant)</li>
                      <li>CMA / CS</li>
                    </ul>
                  </div>
                  <div className="bg-light-white p-4 rounded-lg border border-light-ui flex items-center">
                    <p className="font-bold text-dark-deepblue mb-0 shrink-0">
                      <i className="fas fa-bullseye text-blue-primary mr-2"></i>{" "}
                      Best for:
                    </p>
                    <p className="text-dark-charcoal ml-3 mb-0">
                      Business, Accounting, Corporate jobs
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-teal-50 p-6 sm:p-8 rounded-2xl border border-teal-light">
                <div className="bg-teal-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Very Powerful For You
                </div>
                <h5 className="font-bold text-teal-dark mb-4">
                  <i className="fas fa-mosque mr-2 shrink-0"></i> 3. Islamic
                  Finance
                </h5>
                <p className="text-dark-charcoal italic mb-8 border-l-4 border-teal-primary pl-4">
                  "This is where your Aalimiyat + Commerce becomes rare and
                  valuable."
                </p>
                <div className="space-y-6">
                  <div>
                    <p className="text-dark-almostblack font-bold mb-2">
                      <i className="fas fa-book text-teal-primary mr-2 shrink-0"></i>{" "}
                      Courses:
                    </p>
                    <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal">
                      <li>Diploma / Degree in Islamic Finance</li>
                      <li>MBA in Islamic Banking</li>
                      <li>Shariah Advisory Certification</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-dark-almostblack font-bold mb-2">
                      <i className="fas fa-map-marker-alt text-teal-primary mr-2 shrink-0"></i>{" "}
                      Study Destinations:
                    </p>
                    <p className="text-dark-charcoal ml-6 sm:ml-8">
                      Malaysia, UAE, Saudi Arabia
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-almostblack font-bold mb-2">
                      <i className="fas fa-university text-teal-primary mr-2 shrink-0"></i>{" "}
                      Universities:
                    </p>
                    <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal">
                      <li>International Islamic University Malaysia (IIUM)</li>
                      <li>Islamic University of Madinah</li>
                      <li>Al-Azhar University</li>
                    </ul>
                  </div>
                  <div className="bg-light-white p-5 sm:p-6 rounded-xl border border-teal-muted mt-6 shadow-sm">
                    <p className="font-bold text-dark-deepblue mb-3">
                      <i className="fas fa-briefcase text-teal-primary mr-2 shrink-0"></i>{" "}
                      Career Paths:
                    </p>
                    <ul className="list-disc ml-6 space-y-2 text-dark-charcoal">
                      <li>Islamic bank advisor</li>
                      <li>Halal investment consultant</li>
                      <li>Zakat / Waqf management</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (streamView === "religion") {
    return (
      <div className="max-w-6xl mx-auto flex flex-col pb-10">
        <button
          onClick={() => setStreamView("main")}
          className="mb-6 text-dark-muted font-bold flex items-center hover:text-pink-primary active:scale-95 transition-all duration-200 ease-out w-fit min-h-[44px]"
        >
          <i className="fas fa-arrow-left mr-2 shrink-0"></i> Back to Streams
        </button>
        <div className="bg-light-white border-t-8 border-pink-primary p-6 sm:p-8 lg:p-12 rounded-2xl shadow-sm flex-1">
          <h4 className="font-bold text-dark-deepblue mb-4 flex items-center gap-3">
            <i className="fas fa-globe mr-3 text-pink-primary shrink-0"></i>{" "}
            Comparative Religion
          </h4>
          <p className="text-dark-charcoal mb-10 pb-8 border-b border-light-border">
            Study of Islamic theology integrated with the comparative study of
            other religions.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="bg-pink-50 p-6 sm:p-8 rounded-2xl border border-pink-light">
                <div className="bg-pink-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Strong + Practical Option
                </div>
                <h5 className="font-bold text-pink-dark mb-6">
                  <i className="fas fa-balance-scale mr-2 shrink-0"></i> 1. Law
                  Courses
                </h5>
                <p className="text-dark-almostblack font-bold mb-3">
                  Best Courses:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal mb-6">
                  <li>
                    <strong>BA LL.B (5 years)</strong> ⭐{" "}
                    <span className="text-dark-muted">(most suitable)</span>
                  </li>
                  <li>BBA LL.B (5 years)</li>
                </ul>
                <div className="bg-light-white p-5 rounded-xl mb-4 shadow-sm border border-pink-light border-opacity-30">
                  <p className="font-bold text-dark-deepblue mb-2">
                    <i className="fas fa-thumbs-up text-pink-primary mr-2 shrink-0"></i>{" "}
                    Why this fits you:
                  </p>
                  <p className="text-dark-charcoal mb-2">
                    You understand different religions → useful in
                    constitutional law & minority rights.
                  </p>
                  <p className="font-bold text-dark-deepblue mt-3 mb-1">
                    Specialize in:
                  </p>
                  <ul className="list-disc ml-6 text-dark-charcoal">
                    <li>Muslim Personal Law</li>
                    <li>Human Rights Law</li>
                    <li>Constitutional Law</li>
                    <li>Interfaith legal issues</li>
                  </ul>
                </div>
                <div className="bg-light-white p-5 rounded-xl shadow-sm border border-pink-light border-opacity-30">
                  <p className="font-bold text-dark-deepblue mb-2">
                    <i className="fas fa-briefcase text-pink-primary mr-2 shrink-0"></i>{" "}
                    Career:
                  </p>
                  <ul className="list-disc ml-6 text-dark-charcoal">
                    <li>Advocate</li>
                    <li>Legal advisor (Waqf, NGOs, institutions)</li>
                    <li>Policy / legal research</li>
                  </ul>
                </div>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <div className="bg-blue-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  High Impact Path
                </div>
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-landmark text-dark-muted mr-2 shrink-0"></i>{" "}
                  2. Civil Services
                </h5>
                <p className="text-dark-charcoal mb-4">
                  Your background is excellent for UPSC / State PCS.
                </p>
                <p className="text-dark-almostblack font-bold mb-2">
                  Subjects Advantage:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-6">
                  <li>Ethics & Society</li>
                  <li>Religion-related topics</li>
                  <li>Essay writing</li>
                </ul>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-dark-deepblue mb-0 shrink-0">
                    <i className="fas fa-user-tie text-blue-primary mr-2"></i>{" "}
                    Roles:
                  </p>
                  <p className="text-dark-charcoal mb-0">
                    IAS / IPS / Administrative services
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-brand-soft bg-opacity-10 p-6 sm:p-8 rounded-2xl border border-brand-soft border-opacity-30">
                <div className="bg-brand text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Your Core Strength
                </div>
                <h5 className="font-bold text-brand-dark mb-4">
                  <i className="fas fa-mosque mr-2 shrink-0"></i> 3. Islamic
                  Studies & Comp. Religion
                </h5>
                <p className="text-dark-almostblack font-bold mb-2">Degrees:</p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-5">
                  <li>BA Islamic Studies</li>
                  <li>BA Comparative Religion</li>
                  <li>BA Theology</li>
                </ul>
                <p className="text-dark-almostblack font-bold mb-2">
                  Top Institutions:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-5">
                  <li>Al-Azhar University</li>
                  <li>Islamic University of Madinah</li>
                  <li>International Islamic University Malaysia</li>
                </ul>
                <p className="font-bold text-dark-deepblue mb-2">
                  <i className="fas fa-briefcase text-brand mr-2 shrink-0"></i>{" "}
                  Career:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal">
                  <li>Scholar / researcher</li>
                  <li>Teacher / lecturer</li>
                  <li>Da’wah & interfaith dialogue expert</li>
                </ul>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-globe-americas text-dark-muted mr-2 shrink-0"></i>{" "}
                  4. Int'l Relations / Human Rights
                </h5>
                <p className="text-dark-almostblack font-bold mb-2">Courses:</p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-4">
                  <li>BA Political Science</li>
                  <li>BA International Relations</li>
                  <li>BA Sociology</li>
                </ul>
                <p className="text-dark-charcoal italic mb-5 border-l-4 border-dark-muted pl-4">
                  "Comparative religion + global issues = strong combination"
                </p>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-dark-deepblue mb-0 shrink-0">
                    <i className="fas fa-building text-dark-muted mr-2"></i>{" "}
                    Career:
                  </p>
                  <p className="text-dark-charcoal mb-0">
                    NGOs, Policy research, Int'l orgs
                  </p>
                </div>
              </div>
              <div className="bg-orange-50 p-6 sm:p-8 rounded-2xl border border-orange-light">
                <h5 className="font-bold text-orange-dark mb-4">
                  <i className="fas fa-microphone-alt text-orange-primary mr-2 shrink-0"></i>{" "}
                  5. Da’wah, Media & Speaking
                </h5>
                <p className="text-dark-charcoal mb-4">
                  Since you studied comparative religion, you can go into:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal">
                  <li>Islamic speaker / debater</li>
                  <li>YouTube / educational content creator</li>
                  <li>Interfaith dialogue platforms</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (streamView === "revealed") {
    return (
      <div className="max-w-6xl mx-auto flex flex-col pb-10">
        <button
          onClick={() => setStreamView("main")}
          className="mb-6 text-dark-muted font-bold flex items-center hover:text-teal-primary active:scale-95 transition-all duration-200 ease-out w-fit min-h-[44px]"
        >
          <i className="fas fa-arrow-left mr-2 shrink-0"></i> Back to Streams
        </button>
        <div className="bg-light-white border-t-8 border-teal-primary p-6 sm:p-8 lg:p-12 rounded-2xl shadow-sm flex-1">
          <h4 className="font-bold text-dark-deepblue mb-4 flex items-center gap-3">
            <i className="fas fa-book-quran mr-3 text-teal-primary shrink-0"></i>
            Aalimiyat in Revealed Sciences (Uloom e Wahi)
          </h4>
          <p className="text-dark-charcoal mb-10 pb-8 border-b border-light-border">
            An in-depth study of Tafseer, Fiqh, Usul-e-Fiqh, Hadith, and
            Usul-e-Hadith.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="bg-teal-50 p-6 sm:p-8 rounded-2xl border border-teal-light">
                <div className="bg-teal-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Very Important
                </div>
                <h5 className="font-bold text-teal-dark mb-6">
                  <i className="fas fa-brain mr-2 shrink-0"></i> 1. Your Core
                  Strength
                </h5>
                <p className="text-dark-almostblack font-bold mb-3">
                  You already have:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal mb-6">
                  <li>Deep knowledge of Qur’an & Tafsir</li>
                  <li>Understanding of Hadith sciences</li>
                  <li>Strong base in Fiqh & Usul</li>
                </ul>
                <div className="bg-light-white p-5 rounded-xl shadow-sm border border-teal-light border-opacity-30">
                  <p className="font-bold text-dark-deepblue mb-2">
                    <i className="fas fa-arrow-up text-teal-primary mr-2 shrink-0"></i>{" "}
                    Puts you ahead in:
                  </p>
                  <ul className="list-disc ml-6 text-dark-charcoal">
                    <li>Islamic scholarship</li>
                    <li>Fatwa / research</li>
                    <li>Teaching</li>
                    <li>Shariah advisory</li>
                  </ul>
                </div>
              </div>
              <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-l-8 border-blue-primary shadow-sm hover:shadow-md transition-all duration-200 ease-out">
                <div className="bg-blue-primary text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  Top Recommendation
                </div>
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-balance-scale text-blue-primary mr-2 shrink-0"></i>{" "}
                  2. Best Professional Course
                </h5>
                <p className="text-dark-almostblack font-bold mb-2">
                  BA LL.B (5 years) ⭐
                </p>
                <p className="text-dark-muted mb-4 italic">
                  "This is the strongest modern + Islamic combination."
                </p>
                <p className="font-bold text-dark-deepblue mb-2">
                  Why it fits you:
                </p>
                <ul className="list-disc ml-6 text-dark-charcoal mb-4">
                  <li>Fiqh → directly connects with law</li>
                  <li>Usul al-Fiqh → similar to legal reasoning</li>
                </ul>
                <p className="font-bold text-dark-deepblue mb-2">
                  Specialize in:
                </p>
                <ul className="list-disc ml-6 text-dark-charcoal mb-4">
                  <li>Muslim Personal Law</li>
                  <li>Family Law</li>
                  <li>Constitutional Law</li>
                </ul>
                <p className="font-bold text-dark-deepblue mb-2">
                  <i className="fas fa-briefcase text-blue-primary mr-2 shrink-0"></i>{" "}
                  Career:
                </p>
                <ul className="list-disc ml-6 text-dark-charcoal">
                  <li>Advocate</li>
                  <li>Legal advisor for madrasas / trusts</li>
                  <li>Waqf board / Islamic institutions</li>
                </ul>
              </div>
              <div className="bg-orange-50 p-6 sm:p-8 rounded-2xl border border-orange-light">
                <h5 className="font-bold text-orange-dark mb-4">
                  <i className="fas fa-fire text-orange-primary mr-2 shrink-0"></i>{" "}
                  6. Combination Path (Most Powerful)
                </h5>
                <p className="text-dark-almostblack font-bold mb-4">
                  🔥 Best Strategy (Recommended)
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-orange-primary text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <p className="text-dark-charcoal font-semibold m-0">
                    BA LL.B (India)
                  </p>
                </div>
                <div className="flex justify-center w-8 sm:w-10 mb-2">
                  <i className="fas fa-arrow-down text-orange-primary text-base"></i>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-orange-primary text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <p className="text-dark-charcoal font-semibold m-0">
                    LLM in Islamic Law / Shariah (Abroad)
                  </p>
                </div>
                <div className="bg-light-white p-5 rounded-xl shadow-sm border border-orange-light border-opacity-30">
                  <p className="font-bold text-dark-deepblue mb-2">
                    <i className="fas fa-gem text-orange-primary mr-2 shrink-0"></i>{" "}
                    Creates a rare profile:
                  </p>
                  <ul className="list-disc ml-6 text-dark-charcoal">
                    <li>Court lawyer + Islamic scholar</li>
                    <li>Very high respect + income potential</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-brand-soft bg-opacity-10 p-6 sm:p-8 rounded-2xl border border-brand-soft border-opacity-30">
                <div className="bg-brand text-white text-xs sm:text-sm font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                  High-Level Path
                </div>
                <h5 className="font-bold text-brand-dark mb-4">
                  <i className="fas fa-mosque mr-2 shrink-0"></i> 3. Advanced
                  Islamic Studies
                </h5>
                <p className="text-dark-almostblack font-bold mb-2">
                  🎓 Abroad Options:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-5">
                  <li>Islamic University of Madinah</li>
                  <li>Al-Azhar University</li>
                  <li>International Islamic University Malaysia</li>
                </ul>
                <p className="text-dark-almostblack font-bold mb-2">
                  You can study:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-5">
                  <li>تخصص في الفقه (Specialization in Fiqh)</li>
                  <li>Hadith specialization</li>
                  <li>Tafsir</li>
                </ul>
                <p className="font-bold text-dark-deepblue mb-2">
                  <i className="fas fa-briefcase text-brand mr-2 shrink-0"></i>{" "}
                  Career:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal">
                  <li>Mufti / scholar</li>
                  <li>Researcher</li>
                  <li>International Islamic institutions</li>
                </ul>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-coins text-dark-muted mr-2 shrink-0"></i>{" "}
                  4. Islamic Finance (Very High Demand)
                </h5>
                <p className="text-dark-charcoal mb-4">
                  You already know Fiqh → perfect for:
                </p>
                <p className="text-dark-almostblack font-bold mb-2">Courses:</p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal mb-5">
                  <li>Islamic Banking & Finance</li>
                  <li>Shariah Compliance</li>
                </ul>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-dark-deepblue mb-0 shrink-0">
                    <i className="fas fa-building text-dark-muted mr-2 shrink-0"></i>{" "}
                    Career:
                  </p>
                  <p className="text-dark-charcoal mb-0">
                    Islamic finance advisor, Halal cert. expert, Banking roles
                  </p>
                </div>
              </div>
              <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-chalkboard-teacher text-dark-muted mr-2 shrink-0"></i>{" "}
                  5. Teaching & Academics
                </h5>
                <ul className="list-disc ml-6 sm:ml-8 space-y-2 text-dark-charcoal mb-5">
                  <li>BA + MA + B.Ed</li>
                  <li>Madrasa + school hybrid teaching</li>
                </ul>
                <p className="text-dark-almostblack font-bold mb-2">
                  You can teach:
                </p>
                <ul className="list-disc ml-6 sm:ml-8 space-y-1 text-dark-charcoal">
                  <li>Arabic</li>
                  <li>Islamic Studies</li>
                  <li>Religion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col transition-all duration-300 pb-10">
      <p className="mb-6 lg:text-3xl text-center text-dark-primary">
        After foundational levels, students select from specialized academic
        streams:
      </p>
      <p className="mb-10 lg:text-base text-center text-dark-muted italic">
        "Students may choose a specialization based on their interest at later
        stages."
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 flex-1">
        <div
          tabIndex={0}
          onClick={() => setStreamView("law")}
          className="bg-light-white border-l-8 border-orange-primary p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-200 ease-out flex flex-col justify-center cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-soft"
        >
          <h5 className="font-bold text-dark-deepblue mb-4 group-hover:text-orange-primary transition-colors duration-200">
            <i className="fas fa-scale-balanced mr-3 text-orange-primary shrink-0"></i>
            Aalimiyat in Law
          </h5>
          <p className="lg:text-xl text-dark-charcoal mb-6 flex-1">
            Study of Islamic law and legal procedure, along with the analysis of
            the Constitution of India.
          </p>
          <div className="text-orange-primary font-bold text-lg flex items-center">
            View Pathways{" "}
            <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform duration-200"></i>
          </div>
        </div>
        <div
          tabIndex={0}
          onClick={() => setStreamView("commerce")}
          className="bg-light-white border-l-8 border-blue-primary p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-200 ease-out flex flex-col justify-center cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-light"
        >
          <h5 className="font-bold text-dark-deepblue mb-4 group-hover:text-blue-primary transition-colors duration-200">
            <i className="fas fa-chart-line mr-3 text-blue-primary shrink-0"></i>
            Aalimiyat in Commerce
          </h5>
          <p className="lg:text-xl text-dark-charcoal mb-6 flex-1">
            Study of Islamic economic systems alongside requisite knowledge of
            modern economic systems.
          </p>
          <div className="text-blue-primary font-bold text-lg flex items-center">
            View Pathways{" "}
            <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform duration-200"></i>
          </div>
        </div>
        <div
          tabIndex={0}
          onClick={() => setStreamView("religion")}
          className="bg-light-white border-l-8 border-pink-primary p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-200 ease-out flex flex-col justify-center cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-light"
        >
          <h5 className="font-bold text-dark-deepblue mb-4 group-hover:text-pink-primary transition-colors duration-200">
            <i className="fas fa-globe mr-3 text-pink-primary shrink-0"></i>
            Comparative Religion
          </h5>
          <p className="lg:text-xl text-dark-charcoal mb-6 flex-1">
            Study of Islamic theology integrated with the comparative study of
            other religions.
          </p>
          <div className="text-pink-primary font-bold text-lg flex items-center">
            View Pathways{" "}
            <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform duration-200"></i>
          </div>
        </div>
        <div
          tabIndex={0}
          onClick={() => setStreamView("revealed")}
          className="bg-light-white border-l-8 border-teal-primary p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-xl active:scale-[0.98] transition-all duration-200 ease-out flex flex-col justify-center cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-light"
        >
          <h5 className="font-bold text-dark-deepblue mb-4 group-hover:text-teal-primary transition-colors duration-200">
            <i className="fas fa-book-quran mr-3 text-teal-primary shrink-0"></i>
            Revealed Sciences (Uloom e Wahi)
          </h5>
          <p className="lg:text-xl text-dark-charcoal mb-6 flex-1">
            An in-depth study of Tafseer, Fiqh, Usul-e-Fiqh, Hadith, and
            Usul-e-Hadith.
          </p>
          <div className="text-teal-primary font-bold text-lg flex items-center">
            View Pathways{" "}
            <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform duration-200"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlimiatStreams;
