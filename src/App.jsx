import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import WhyJzv from "./components/WhyJzv";
import VisionMission from "./components/VisionMission";
import Courses from "./components/Courses";
import LoginPortal from "./components/LoginPortal";

const App = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [selectedLoginType, setSelectedLoginType] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 400 });
  }, []);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        if (activeModal) {
          setActiveModal(null);
          document.body.classList.remove("modal-open");
        }
        if (showLoginPortal) {
          setShowLoginPortal(false);
          setSelectedLoginType(null);
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [activeModal, showLoginPortal]);

  const [courseView, setCourseView] = useState("main");
  const [niosTab, setNiosTab] = useState("overview");
  const [streamView, setStreamView] = useState("main");
  const [galleryIndex, setGalleryIndex] = useState("1");
  const [galleryTitle, setGalleryTitle] = useState("Classrooms");
  const [visionLang, setVisionLang] = useState("en");

  const galleryItems = [
    { id: "1", label: "Classrooms" },
    { id: "2", label: "Dining Hall" },
    { id: "3", label: "Sports Ground" },
    { id: "4", label: "Hifz Class Room" },
    { id: "5", label: "Sleep Area" },
    { id: "6", label: "Namaz Hall" },
    { id: "7", label: "Washrooms & Ablutions" },
    { id: "8", label: "Hadith Lab" },
    { id: "9", label: "Language Lab" },
  ];

  const renderStreamsContent = () => {
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
              Study of Islamic law and legal procedure, along with the analysis
              of the Constitution of India.
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
                    <i className="fas fa-balance-scale mr-2 shrink-0"></i> 1.
                    Best Law Options
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
                        <li>
                          International Islamic University Malaysia (IIUM)
                        </li>
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
                    <i className="fas fa-balance-scale mr-2 shrink-0"></i> 1.
                    Law Courses
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
                  <p className="text-dark-almostblack font-bold mb-2">
                    Degrees:
                  </p>
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
                  <p className="text-dark-almostblack font-bold mb-2">
                    Courses:
                  </p>
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
                  <p className="text-dark-almostblack font-bold mb-2">
                    Courses:
                  </p>
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
              Study of Islamic law and legal procedure, along with the analysis
              of the Constitution of India.
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

  const renderGalleryContent = () => {
    const buttonClass = (item) =>
      item.id === galleryIndex
        ? "gallery-btn w-full text-left px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-pink-primary text-white font-bold whitespace-nowrap lg:whitespace-normal transition-all duration-200 ease-out active:scale-[0.98] shadow-sm border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-dark"
        : "gallery-btn w-full text-left px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-light-white border border-light-border hover:border-pink-primary hover:bg-pink-50 font-semibold text-dark-charcoal whitespace-nowrap lg:whitespace-normal transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary";

    return (
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 h-full">
        <div className="w-full lg:w-1/4 flex lg:flex-col gap-2 sm:gap-3 overflow-x-auto lg:overflow-y-auto pb-4 lg:pb-0 scrollbar-hide flex-shrink-0 border-b lg:border-b-0 lg:border-r border-light-border lg:pr-6">
          <h4 className="font-bold text-dark-deepblue mb-2 hidden lg:block uppercase tracking-wider">
            Campus Zones
          </h4>
          {galleryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setGalleryIndex(item.id);
                setGalleryTitle(item.label);
              }}
              className={buttonClass(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="w-full lg:w-3/4 bg-light-ui rounded-2xl sm:rounded-3xl border border-light-border overflow-hidden flex flex-col relative min-h-[300px] sm:min-h-[400px] lg:min-h-full shadow-inner flex-1 group">
          <img
            src={`https://usmaniainstitute.com/media/admissioncounselling/campus/${galleryIndex}.png`}
            className="w-full h-full object-cover absolute inset-0 transition-opacity duration-300"
            alt="Campus View"
          />
          <div className="absolute inset-0 bg-dark-charcoal opacity-10 -z-10 flex items-center justify-center">
            <i className="fas fa-image text-4xl sm:text-6xl text-dark-muted"></i>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-dark-almostblack to-transparent p-6 sm:p-8 pt-20 sm:pt-24 pointer-events-none">
            <h3 className="text-white text-xl sm:text-4xl lg:text-5xl font-bold tracking-wide drop-shadow-md">
              {galleryTitle}
            </h3>
          </div>
        </div>
      </div>
    );
  };

  const cards = [
    {
      id: "why-jzv",
      title: "Why JZV",
      icon: "fa-building-columns",
      color: "bg-brand",
      textColor: "text-brand",
      bgcontent: "bg-brand-lbg",
      content: <WhyJzv />,
    },
    {
      id: "vision",
      title: "Vision & Mission",
      icon: "fa-eye",
      color: "bg-blue-primary",
      textColor: "text-blue-primary",
      bgcontent: "bg-blue-lbg",
      content: (
        <VisionMission visionLang={visionLang} setVisionLang={setVisionLang} />
      ),
    },
    {
      id: "system-4t",
      title: "4Ts System",
      icon: "fa-leaf",
      color: "bg-teal-primary",
      textColor: "text-teal-primary",
      bgcontent: "bg-teal-lbg",
      content: (
        <div className="max-w-6xl mx-auto flex flex-col py-4">
          <p className="mb-10 lg:text-xl text-center text-dark-primary font-medium">
            The 4Ts pedagogy is based on the balanced fusion of Taleem,
            Tazkiyah, Tadeeb, and Tableegh for holistic development.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-1">
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-blue-bright shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
              <h5 className="font-bold mb-4 text-blue-dark">
                <i className="fas fa-book-open text-blue-bright mr-2"></i>{" "}
                Taleem (Knowledge)
              </h5>
              <p className="lg:text-xl text-dark-charcoal m-0">
                Imparting or receiving knowledge through instruction and
                training tailored to a child's developmental stages.
              </p>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-green-bright shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
              <h5 className="font-bold mb-4 text-green-dark">
                <i className="fas fa-heart text-green-bright mr-2"></i> Tazkiyah
                (Purification)
              </h5>
              <p className="lg:text-xl text-dark-charcoal m-0">
                The spiritual purification of the heart and soul, removing inner
                diseases to foster sincerity and the remembrance of Almighty
                Allah.
              </p>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-yellow-gold shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
              <h5 className="font-bold mb-4 text-yellow-dark">
                <i className="fas fa-user-shield text-yellow-gold mr-2"></i>{" "}
                Tadeeb (Character)
              </h5>
              <p className="lg:text-xl text-dark-charcoal m-0">
                The process of character-building strictly according to the
                Sunnah.
              </p>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-brand-bright shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
              <h5 className="font-bold mb-4 text-brand-dark">
                <i className="fas fa-bullhorn text-brand-bright mr-2"></i>{" "}
                Tableegh (Preaching)
              </h5>
              <p className="lg:text-xl text-dark-charcoal m-0">
                Training students to preach Islamic teachings with knowledge,
                wisdom, patience, and an understanding of cultures.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "courses",
      title: "Courses (PCC & GCC)",
      icon: "fa-graduation-cap",
      color: "bg-brand-bright",
      textColor: "text-brand-bright",
      bgcontent: "bg-brand-lbg",
      content: (
        <Courses courseView={courseView} setCourseView={setCourseView} />
      ),
    },
    {
      id: "streams",
      title: "Academic Streams",
      icon: "fa-code-branch",
      color: "bg-orange-primary",
      textColor: "text-orange-primary",
      bgcontent: "bg-orange-lbg",
      content: renderStreamsContent(),
    },
    {
      id: "nios",
      title: "NIOS (10th & 12th)",
      icon: "fa-certificate",
      color: "bg-red-primary",
      textColor: "text-red-primary",
      bgcontent: "bg-red-lbg",
      content: (
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
                <strong className="text-red-dark">
                  12th (Senior Secondary)
                </strong>{" "}
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
                      <strong className="text-dark-deepblue">
                        Managed by:
                      </strong>{" "}
                      National Institute of Open Schooling
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">Under:</strong>{" "}
                      Ministry of Education, Govt. of India
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">Type:</strong> Open
                      & Distance Learning Board
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">
                        Recognition:
                      </strong>{" "}
                      Equivalent to CBSE / ICSE / State Boards
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">Students:</strong>{" "}
                      3.5 lakh+ enrolled annually
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
                      <strong className="text-dark-deepblue">
                        Affordable:
                      </strong>{" "}
                      Low fees, no transportation costs
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">Quality:</strong>{" "}
                      Same syllabus as regular boards
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">
                        Accessible:
                      </strong>{" "}
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
                  NIOS is designed for students who cannot attend regular
                  schools due to various reasons, including religious education
                  commitments.
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
                    <strong className="text-dark-deepblue">
                      Future Proof:
                    </strong>{" "}
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
                    <strong className="text-dark-deepblue">10th Grade:</strong>{" "}
                    5 compulsory + 2 optional subjects
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
                    <strong className="text-dark-deepblue">12th Grade:</strong>{" "}
                    5 subjects (any combination)
                  </p>
                  <ul className="space-y-2 text-dark-charcoal">
                    <li>
                      Mathematics, Physics, Chemistry, Biology, History,
                      Geography, Political Science, Economics, Business Studies,
                      Accountancy, Home Science, Psychology, Computer Science,
                      Sociology, etc.
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
                      <strong className="text-dark-deepblue">
                        Exam Months:
                      </strong>{" "}
                      April-May & October-November
                    </li>
                    <li>
                      <strong className="text-dark-deepblue">
                        Public Exams:
                      </strong>{" "}
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
                      <strong className="text-dark-deepblue">
                        10th Grade:
                      </strong>
                    </p>
                    <ul className="space-y-2 text-dark-charcoal">
                      <li>33% in each subject</li>
                      <li>Overall pass percentage</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-dark-charcoal mb-3">
                      <strong className="text-dark-deepblue">
                        12th Grade:
                      </strong>
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
                      <li>
                        Complete formal education alongside religious studies
                      </li>
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
                    <strong className="text-dark-deepblue">
                      For 10th Grade:
                    </strong>
                  </p>
                  <ul className="space-y-2 text-dark-charcoal mb-6">
                    <li>Minimum age: 14 years (as on 31st July)</li>
                    <li>No upper age limit</li>
                    <li>No formal education requirement</li>
                  </ul>
                  <p className="text-dark-charcoal mb-4">
                    <strong className="text-dark-deepblue">
                      For 12th Grade:
                    </strong>
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
                      <strong className="text-dark-deepblue">Fee:</strong>{" "}
                      ₹1,850 for 10th, ₹2,000 for 12th (approx.)
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
                    <strong className="text-dark-deepblue">
                      Study Centers:
                    </strong>{" "}
                    Optional, but recommended for practical subjects
                  </li>
                  <li>
                    <strong className="text-dark-deepblue">Language:</strong>{" "}
                    Study materials available in multiple languages
                  </li>
                  <li>
                    <strong className="text-dark-deepblue">Support:</strong>{" "}
                    Toll-free helpline and online support available
                  </li>
                  <li>
                    <strong className="text-dark-deepblue">Validity:</strong>{" "}
                    NIOS certificate is valid for all purposes
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "hifz",
      title: "Tahfeez ul Quran",
      icon: "fa-book-quran",
      color: "bg-green-dark",
      textColor: "text-green-dark",
      bgcontent: "bg-green-lbg",
      content: (
        <div className="max-w-6xl mx-auto flex flex-col pb-6">
          <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 mb-6 sm:mb-8 bg-light-white p-6 sm:p-8 lg:p-10 rounded-2xl border-2 border-green-dark shadow-sm">
            <div className="bg-green-50 text-green-dark p-6 lg:p-8 rounded-full flex-shrink-0 mx-auto lg:mx-0">
              <i className="fas fa-book-quran text-5xl sm:text-6xl"></i>
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h4 className="font-bold text-dark-almostblack mb-3">
                Tahfeez ul Quran
              </h4>
              <p className="lg:text-xl text-dark-charcoal leading-relaxed">
                <strong className="text-green-dark">Memorization</strong> &{" "}
                <strong className="text-green-dark">Recitation</strong> of the
                Holy Quran.
              </p>
              <p className="text-dark-muted mt-3 italic">
                "Tahfeez is the preservation of the Quran in heart and
                practice."
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-brain text-green-dark mr-3 shrink-0"></i>{" "}
                What is Tahfeez?
              </h5>
              <ul className="space-y-4 text-dark-charcoal">
                <li>
                  <strong className="text-dark-deepblue">Tahfeez:</strong>{" "}
                  Memorization of the entire Quran
                </li>
                <li>
                  <strong className="text-dark-deepblue">Hifz:</strong>{" "}
                  Protection and preservation of the memorized Quran
                </li>
                <li>
                  <strong className="text-dark-deepblue">Duration:</strong> 2-3
                  years depending on dedication
                </li>
                <li>
                  <strong className="text-dark-deepblue">Age:</strong> Best
                  started between 6-10 years
                </li>
                <li>
                  <strong className="text-dark-deepblue">Outcome:</strong> Hafiz
                  ul Quran (Protector of Quran)
                </li>
              </ul>
            </div>
            <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
              <h5 className="font-bold text-dark-almostblack mb-5">
                <i className="fas fa-star text-green-dark mr-3 shrink-0"></i>{" "}
                Benefits
              </h5>
              <ul className="space-y-4 text-dark-charcoal">
                <li>
                  <strong className="text-dark-deepblue">Spiritual:</strong>{" "}
                  Direct connection with Allah's words
                </li>
                <li>
                  <strong className="text-dark-deepblue">Mental:</strong>{" "}
                  Improves memory and concentration
                </li>
                <li>
                  <strong className="text-dark-deepblue">Reward:</strong> Great
                  reward in this life and hereafter
                </li>
                <li>
                  <strong className="text-dark-deepblue">Leadership:</strong>{" "}
                  Qualifies for leading prayers and teaching
                </li>
                <li>
                  <strong className="text-dark-deepblue">Community:</strong>{" "}
                  Respected position in Muslim community
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-green-50 p-6 sm:p-8 rounded-2xl border border-green-light">
            <h5 className="font-bold text-green-dark mb-5">
              <i className="fas fa-heart text-green-dark mr-3 shrink-0"></i> Our
              Approach
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-dark-charcoal mb-3">
                  <strong className="text-dark-deepblue">Methodology:</strong>
                </p>
                <ul className="space-y-2 text-dark-charcoal">
                  <li>Repetition and revision</li>
                  <li>Daily practice sessions</li>
                  <li>Individual attention</li>
                  <li>Group recitation</li>
                </ul>
              </div>
              <div>
                <p className="text-dark-charcoal mb-3">
                  <strong className="text-dark-deepblue">Support:</strong>
                </p>
                <ul className="space-y-2 text-dark-charcoal">
                  <li>Qualified Qari teachers</li>
                  <li>Progress tracking</li>
                  <li>Motivational sessions</li>
                  <li>Parent involvement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "schedule",
      title: "Daily Schedule",
      icon: "fa-clock",
      color: "bg-yellow-gold",
      textColor: "text-yellow-gold",
      bgcontent: "bg-yellow-lbg",
      content: (
        <div className="max-w-6xl mx-auto flex flex-col pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
            <div className="lg:col-span-2 bg-light-white p-6 sm:p-10 rounded-2xl shadow-sm border border-light-border">
              <h5 className="font-bold text-brand-dark mb-8 border-b-2 border-light-ui pb-4">
                <i className="fas fa-calendar-day mr-3 text-brand shrink-0"></i>{" "}
                Monday to Friday Schedule
              </h5>
              <div className="relative border-l-4 border-brand-soft ml-4 space-y-8 pb-4">
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-brand w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-brand block mb-1">
                    06:50 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Reporting Time
                  </h6>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-brand-soft w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-brand block mb-1">
                    07:00 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Morning Assembly
                  </h6>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-pink-primary w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-pink-dark block mb-1">
                    07:15 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Classes Commence
                  </h6>
                  <p className="text-dark-muted mt-1">Quran Classes</p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-blue-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-blue-dark block mb-1">
                    08:30 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Breakfast Break
                  </h6>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-pink-dark block mb-1">
                    09:00 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Continued Classes
                  </h6>
                  <p className="text-dark-muted mt-1">
                    First session 3 Academic Classes
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-blue-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-blue-dark block mb-1">
                    11:00 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">Short Break</h6>
                  <p className="text-dark-muted mt-1">
                    Quick refreshment break, students can have a light snack or
                    use the restroom.
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-pink-dark block mb-1">
                    11:20 AM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Continued Classes
                  </h6>
                  <p className="text-dark-muted mt-1">
                    Second session 3 Academic Classes
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-green-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-green-dark block mb-1">
                    01:20 PM (Zuhr)
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Zuhr Prayer, Lunch & Nap Time
                  </h6>
                  <p className="text-dark-muted mt-1">
                    Includes Qailulah (Sunnah nap) classes.
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-pink-dark block mb-1">
                    02:50 PM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Continued Classes
                  </h6>
                  <p className="text-dark-muted mt-1">
                    Third session 2 Academic Classes
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-orange-primary w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-orange-dark block mb-1">
                    04:10 PM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Sports & Agility Period
                  </h6>
                  <p className="text-dark-muted mt-1">
                    Requires sports uniform and sports shoes.
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-green-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-green-dark block mb-1">
                    05:10 PM (Asr)
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Asr Prayer & Snacks Time
                  </h6>
                  <p className="text-dark-muted mt-1">
                    Milk and healthy snacks provided, students can also have
                    their own snacks if they prefer.
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-pink-dark block mb-1">
                    05:50 PM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Life Skills & Personal Development
                  </h6>
                  <p className="text-dark-muted mt-1">
                    Hifz-e-Surah, masnoon dua and applied sunnah.
                  </p>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-green-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-green-dark block mb-1">
                    06:45 PM (Maghrib)
                  </span>
                  <h6 className="font-bold text-dark-deepblue">
                    Maghrib Prayer
                  </h6>
                </div>
                <div className="relative pl-6 sm:pl-8">
                  <div className="absolute -left-[14px] top-1 bg-red-primary w-6 h-6 rounded-full border-4 border-light-white"></div>
                  <span className="font-bold text-red-dark block mb-1">
                    07:00 PM
                  </span>
                  <h6 className="font-bold text-dark-deepblue">Dispersal</h6>
                  <p className="text-dark-muted mt-1">
                    Students depart for home.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-t-8 border-orange-primary border-l border-r border-b border-light-border">
                <h5 className="font-bold text-dark-almostblack mb-6">
                  <i className="fas fa-calendar-week mr-2 text-orange-primary shrink-0"></i>{" "}
                  Weekend Schedule
                </h5>
                <ul className="space-y-5">
                  <li className="bg-orange-50 p-4 rounded-xl border border-orange-light">
                    <span className="font-bold text-orange-dark block mb-1">
                      Saturday
                    </span>
                    <span className="text-dark-charcoal">
                      Half Day. Dispersal immediately after Zuhr prayer.
                    </span>
                  </li>
                  <li className="bg-red-50 p-4 rounded-xl border border-red-light">
                    <span className="font-bold text-red-dark block mb-1">
                      Sunday
                    </span>
                    <span className="text-dark-charcoal">Weekly Holiday.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 p-6 sm:p-8 rounded-2xl shadow-sm border border-green-light">
                <h5 className="font-bold text-green-dark mb-4">
                  <i className="fas fa-mosque mr-2 text-green-dark shrink-0"></i>{" "}
                  Namaz Guidelines
                </h5>
                <p className="text-dark-charcoal font-semibold mb-3">
                  4 Salahs are offered on campus:
                </p>
                <ul className="list-disc ml-6 space-y-1 text-dark-charcoal mb-5">
                  <li>Zuhr</li>
                  <li>Asr</li>
                  <li>Maghrib</li>
                </ul>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-muted">
                  <p className="text-dark-deepblue m-0">
                    <strong>Note:</strong> Fajr & Isha prayers are the
                    responsibility of the parents to ensure they are offered at
                    home or the local masjid.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "extracurricular",
      title: "Extracurriculars",
      icon: "fa-palette",
      color: "bg-pink-primary",
      textColor: "text-pink-primary",
      bgcontent: "bg-pink-lbg",
      content: (
        <div className="max-w-6xl mx-auto flex flex-col justify-center pb-10">
          <div className="text-center mb-8 sm:mb-12">
            <h4 className="font-bold text-pink-deep mb-4 sm:mb-6">
              Holistic Growth
            </h4>
            <p className="text-dark-charcoal leading-relaxed max-w-4xl mx-auto">
              At JZV, we believe education extends far beyond the classroom
              walls. Our extracurricular programs are designed to build
              confidence, leadership, and practical life skills in accordance
              with our 4Ts methodology.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-question text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Quizzes
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-theater-masks text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Role Plays
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-microphone-alt text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Debates
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-palette text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Drawing
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-spell-check text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Spell Bee
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-book-open text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Qirath
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-quran text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Hifz
              </span>
            </div>
            <div className="bg-light-white p-4 sm:p-6 rounded-2xl border-2 border-pink-light shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 hover:shadow-md hover:border-pink-primary transition-all duration-200">
              <div className="bg-pink-50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-running text-pink-primary md1-regular"></i>
              </div>
              <span className="text-base sm:text-base font-bold text-dark-almostblack">
                Sports
              </span>
            </div>
          </div>
          <p className="text-center text-base sm:text-base text-dark-muted font-medium mt-8 sm:mt-10 italic">
            And much more...
          </p>
        </div>
      ),
    },
    {
      id: "sports",
      title: "Sports & Agility",
      icon: "fa-futbol",
      color: "bg-orange-burnt",
      textColor: "text-orange-burnt",
      bgcontent: "bg-orange-lbg",
      content: (
        <div className="max-w-6xl mx-auto text-center flex flex-col justify-center pb-10">
          <i className="fas fa-running text-4xl sm:text-6xl text-orange-primary mb-6 sm:mb-8"></i>
          <h4 className="font-bold text-orange-dark mb-4 sm:mb-6">
            Physical Development
          </h4>
          <p className="text-lg sm:text-xl text-dark-charcoal leading-relaxed max-w-4xl mx-auto mb-8 sm:mb-12">
            A strong believer is better than a weak believer. Our campus
            features sports playgrounds professionally designed specifically for
            agility sports.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto w-full">
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-b-4 border-orange-primary">
              <i className="fas fa-heartbeat text-3xl sm:text-4xl text-orange-burnt mb-4"></i>
              <h5 className="font-bold text-dark-almostblack">Fitness</h5>
              <p className="text-dark-muted mt-2">
                Daily routines to keep students physically strong and mentally
                alert.
              </p>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-b-4 border-orange-primary">
              <i className="fas fa-stopwatch text-3xl sm:text-4xl text-orange-burnt mb-4"></i>
              <h5 className="font-bold text-dark-almostblack">Agility</h5>
              <p className="text-dark-muted mt-2">
                Specialized training fields to improve reflexes, speed, and
                coordination.
              </p>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-b-4 border-orange-primary">
              <i className="fas fa-users text-3xl sm:text-4xl text-orange-burnt mb-4"></i>
              <h5 className="font-bold text-dark-almostblack">Teamwork</h5>
              <p className="text-dark-muted mt-2">
                Group sports fostering collaboration, leadership, and mutual
                respect.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "gallery",
      title: "Campus Gallery",
      icon: "fa-images",
      color: "bg-pink-deep",
      textColor: "text-pink-deep",
      bgcontent: "bg-pink-lbg",
      content: renderGalleryContent(),
    },
    {
      id: "fees",
      title: "Fee Structure",
      icon: "fa-indian-rupee-sign",
      color: "bg-teal-dark",
      textColor: "text-teal-dark",
      bgcontent: "bg-teal-lbg",
      content: (
        <div className="w-full flex flex-col pb-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 border-b-2 border-light-ui pb-4 text-center sm:text-left">
            <div className="flex items-center gap-3 sm:gap-4">
              <i className="fas fa-wallet text-teal-primary shrink-0"></i>
              <h4 className="font-bold text-teal-dark m-0">Fee Structure</h4>
            </div>
            <span className="bg-teal-50 text-teal-dark font-bold px-4 py-1 rounded-full text-base sm:text-base border border-teal-light sm:ml-4">
              Academic Year 2026-27
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 lg:min-h-0">
            <div className="bg-light-white rounded-2xl border border-light-border shadow-sm flex flex-col h-full overflow-hidden">
              <div className="bg-light-bg px-5 sm:px-6 py-4 border-b border-light-border">
                <h5 className="font-bold text-dark-almostblack m-0">
                  Yearly Core Fees
                </h5>
              </div>
              <div className="flex flex-col flex-1 p-5 sm:p-6 space-y-4 justify-center">
                <div className="flex justify-between items-center border-b border-light-ui pb-4">
                  <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                    <i className="fas fa-book-open text-blue-primary mr-2 shrink-0"></i>
                    Admission Fee{" "}
                    <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1">
                      This fee applies to every academic year.
                    </span>
                  </span>
                  <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                    ₹5,000
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-light-ui pb-4">
                  <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                    <i className="fas fa-graduation-cap text-brand-dark mr-2 shrink-0"></i>
                    Tuition Fee{" "}
                  </span>
                  <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                    ₹15,000
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-light-ui pb-4">
                  <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                    <i className="fas fa-person-biking text-green-dark mr-2 shrink-0"></i>
                    Miscellaneous{" "}
                    <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                      Stationery, Exam, Marks Card, Sports, App, ID
                    </span>
                  </span>
                  <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                    ₹5,000
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-light-ui pb-4">
                  <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                    <i className="fas fa-book text-pink-dark mr-2 shrink-0"></i>
                    Study Material
                    <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                      Approx.
                    </span>
                  </span>
                  <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                    ₹4,000- ₹4,500{" "}
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-light-ui pb-4">
                  <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                    <i className="fas fa-bus text-yellow-gold mr-2 shrink-0"></i>
                    Transportation Fee
                    <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                      For 11 months
                    </span>
                  </span>
                  <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                    ₹18,150 - ₹24,200{" "}
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-light-ui pb-4">
                  <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                    <i className="fas fa-utensils text-pine-900 mr-2 shrink-0"></i>
                    Food & Snacks
                    <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                      Breakfast, lunch, milk twice a day & snacks
                      <br /> for 11 months
                    </span>
                  </span>
                  <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                    ₹18,150{" "}
                  </strong>
                </div>
              </div>
              <div className="bg-light-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm bg-yellow-lbg">
                <h5 className="font-bold text-dark-almostblack mb-2">
                  <i className="fas fa-shopping-bag text-orange-primary mr-2 shrink-0"></i>
                  Additional Items Required
                </h5>
                <p className="text-sm sm:text-lg text-dark-charcoal leading-snug m-0">
                  Sports shoes, uniform black shoes, stationery, sleeping bag,
                  water bottle.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="bg-light-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm flex-1 flex flex-col justify-center">
                <h5 className="font-bold text-dark-almostblack mb-4">
                  <i className="fas fa-tshirt text-brand-soft mr-2 shrink-0"></i>
                  Uniform Details
                </h5>
                <ul className="list-disc ml-5 sm:ml-6 text-sm sm:text-lg text-dark-charcoal space-y-2 mb-4">
                  <li>2 sets purple Kurta & Pajama</li>
                  <li>1 set white Kurta & Pajama</li>
                  <li>3 sets Waistcoat & 2 Topi</li>
                  <li>2 sets of Sports Uniform</li>
                </ul>
                <div className="bg-light-bg p-3 rounded-lg border border-light-ui mt-auto">
                  <p className="text-xs sm:text-base font-semibold text-brand m-0">
                    <i className="fas fa-info-circle mr-2 shrink-0"></i>Uniform
                    cost is based on size.
                    <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                      (₹4,500 to ₹6,500)
                    </strong>
                  </p>
                </div>
              </div>

              <div className="bg-red-50 p-6 sm:p-8 rounded-2xl border-2 border-red-primary shadow-sm flex-1 flex flex-col justify-center gap-6 sm:gap-8">
                <div className="text-center">
                  <i className="fas fa-money-bill-wave text-red-primary mb-3 sm:mb-4"></i>
                  <h4 className="font-black text-red-dark mb-1 sm:mb-2 uppercase">
                    Single Payment ₹55,000
                  </h4>
                  <p className="font-bold text-red-primary uppercase tracking-wider m-0">
                    3 Installments Permitted <br />
                    3x ₹20,000 = ₹60,000
                  </p>
                </div>
                <div className="border-t-2 border-red-200 mx-4 sm:mx-8"></div>
                <div className="text-center">
                  <i className="fas fa-ban text-xl sm:text-4xl text-red-primary mb-2 sm:mb-3"></i>
                  <p className="font-bold text-red-dark m-0">
                    Fees once paid will <br />
                    not be refunded.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "admission",
      title: "Admission Process",
      icon: "fa-clipboard-list",
      color: "bg-blue-dark",
      textColor: "text-blue-dark",
      bgcontent: "bg-blue-lbg",
      content: (
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
      ),
    },
    {
      id: "policies",
      title: "Institution Policies",
      icon: "fa-file-contract",
      color: "bg-dark-primary",
      textColor: "text-dark-primary",
      bgcontent: "bg-dark-lbg",
      content: (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 py-4 pb-10">
          <div className="text-center mb-8 sm:mb-10">
            <h4 className="font-bold text-dark-deepblue mb-3">
              General Policies
            </h4>
            <p className="text-base sm:text-base text-dark-muted max-w-3xl mx-auto">
              Guidelines and code of conduct for maintaining a disciplined and
              harmonious educational environment.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-orange-dark mb-4 flex items-center">
                <i className="fas fa-clock mr-3 text-orange-primary shrink-0"></i>{" "}
                Timings
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  The institute gate will be closed at <strong>7:15 AM</strong>.
                </li>
                <li>All students must arrive before this time.</li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-blue-dark mb-4 flex items-center">
                <i className="fas fa-calendar-check mr-3 text-blue-primary shrink-0"></i>{" "}
                Attendance
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  A minimum of <strong>85% attendance</strong> is required to be
                  eligible for examinations and promotion.
                </li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-teal-dark mb-4 flex items-center">
                <i className="fas fa-tshirt mr-3 text-teal-primary shrink-0"></i>{" "}
                Uniform
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>Students must wear the prescribed uniform at all times.</li>
                <li>Uniform must be neat, clean, and properly ironed.</li>
                <li>Sports uniform and shoes must be worn during playtime.</li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-brand-dark mb-4 flex items-center">
                <i className="fas fa-id-badge mr-3 text-brand shrink-0"></i>{" "}
                Grooming & ID
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  Students must maintain a proper haircut (Level 2, equal
                  length) every month.
                </li>
                <li>
                  Nails will be checked every Friday and must be kept short and
                  well-trimmed.
                </li>
                <li>
                  Wearing an ID card daily is <strong>mandatory</strong>.
                </li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-green-dark mb-4 flex items-center">
                <i className="fas fa-utensils mr-3 text-green-dark shrink-0"></i>{" "}
                Food & Water
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>Junk food is strictly not allowed on campus.</li>
                <li>
                  Students are not permitted to leave the campus to purchase
                  food.
                </li>
                <li>All students must bring their own water bottles.</li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-blue-dark mb-4 flex items-center">
                <i className="fas fa-language mr-3 text-blue-bright shrink-0"></i>{" "}
                Language
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  Only <strong>Arabic and English</strong> are permitted to be
                  spoken within the campus.
                </li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-red-dark mb-4 flex items-center">
                <i className="fas fa-balance-scale mr-3 text-red-primary shrink-0"></i>{" "}
                Discipline
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  Any form of argument or fighting is strictly prohibited.
                </li>
                <li>
                  Use of abusive language, bad words, teasing, bullying, or any
                  form of ragging is strictly prohibited.
                </li>
                <li>Violations may lead to strict disciplinary action.</li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-red-dark mb-4 flex items-center">
                <i className="fas fa-ban mr-3 text-red-primary shrink-0"></i>{" "}
                Prohibited Items
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  Mobile phones, smart devices, smart watches, toys, and sports
                  items are not allowed unless permitted.
                </li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-pink-dark mb-4 flex items-center">
                <i className="fas fa-bed mr-3 text-pink-primary shrink-0"></i>{" "}
                Nap Time
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>Students must bring a proper sleeping bag.</li>
                <li>Students without it may be sent back home.</li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-orange-dark mb-4 flex items-center">
                <i className="fas fa-door-open mr-3 text-orange-burnt shrink-0"></i>{" "}
                Exit & Pickup
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  Students cannot leave during working hours without permission.
                </li>
                <li>
                  A parent (father or mother) must come in person for early
                  pickup.
                </li>
                <li>
                  Gate pass is mandatory for exit and must be shown at the gate.
                </li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-teal-dark mb-4 flex items-center">
                <i className="fas fa-bus-alt mr-3 text-teal-primary shrink-0"></i>{" "}
                Transport Fee
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>Transport fees are applicable for 12 months.</li>
                <li>
                  Parents using transport services must pay the full annual fee.
                </li>
              </ul>
            </div>
            <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
              <h5 className="font-bold text-dark-almostblack mb-4 flex items-center">
                <i className="fas fa-motorcycle mr-3 text-dark-muted shrink-0"></i>{" "}
                Transport & Vehicles
              </h5>
              <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
                <li>
                  Students are not allowed to bring vehicles inside the campus.
                </li>
                <li>
                  Students below 18 years are strictly prohibited from using
                  two-wheelers. Parents are requested to arrange alternative
                  transport for such students.
                </li>
                <li>
                  Students aged 18 and above with a valid license may park
                  outside the institute in designated areas.
                </li>
                <li>
                  The institute is not responsible for any violations or
                  damages.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "entrance-exam",
      title: "Apply for Entrance Exam",
      icon: "fa-pen-to-square",
      color: "bg-green-bright",
      textColor: "text-green-bright",
      bgcontent: "bg-green-lbg",
      content: <div>Content for Apply for Entrance Exam</div>,
      external: true,
      link: "https://usmaniainstitute.com/uie-admissions/",
    },
  ];

  const openModal = (id) => {
    const card = cards.find((c) => c.id === id);
    if (card.external) {
      window.open(card.link, "_blank");
      return;
    }
    if (id === "courses") {
      setCourseView("main");
    }
    if (id === "streams") {
      setStreamView("main");
    }
    if (id === "gallery") {
      setGalleryIndex("1");
      setGalleryTitle("Classrooms");
    }
    if (id === "vision") {
      setVisionLang("en");
    }
    if (id === "nios") {
      setNiosTab("overview");
    }
    setActiveModal(id);
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.classList.remove("modal-open");
  };

  const activeCard = cards.find((card) => card.id === activeModal);

  return (
    <div id="dashboard-section" className="min-h-screen pb-16">
      <header className="bg-light-white shadow-sm sticky top-0 z-40 border-b border-light-border">
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src="../src/media/jzv-rectangle-tranparent.png"
              alt="JZV Logo"
              className="h-14 sm:h-16"
            />
            <p className="border-l-8 border-pink-primary pl-5 sm:pl-6 lg:pl-8 bg-light-white shadow-sm rounded-r-xl py-1 text-sm sm:text-lg leading-relaxed text-dark-charcoal">
              <p className="text-teal-dark">
                a modern madrasa system integrated with 21st-century
                competencies
              </p>
              <p className="text-blue-dark">
                preparing your child to succeed in this Life and the Hereafter.
              </p>
            </p>
          </div>
          <button
            onClick={() => setShowLoginPortal(!showLoginPortal)}
            className="ml-auto flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-orange-primary hover:bg-orange-600 text-white font-bold rounded-lg transition-all duration-200 ease-out active:scale-95 min-h-[44px]"
            title="Portal Login"
          >
            <i className="fas fa-sign-in-alt text-lg"></i>
            <span className="hidden sm:inline text-sm sm:text-base">
              Portal Login
            </span>
          </button>
        </div>
      </header>
      <main className="w-screen mt-8 sm:mt-12 bg-contain bg-no-repeat bg-center bg-[url('../src/media/jzv-building02.png')]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6"
            id="card-container"
          >
            {cards.map((card, index) => (
              <div
                key={card.id}
                tabIndex={0}
                className="bg-light-white bg-opacity-90 rounded-2xl shadow-sm border border-light-border p-5 sm:p-6 lg:p-8 cursor-pointer  transition-all duration-200 ease-out group overflow-hidden relative select-none flex flex-col items-center justify-center text-center h-full min-h-[160px] hover:bg-olive-500"
                onClick={() => openModal(card.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal(card.id);
                  }
                }}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-2 ${card.color}`}
                ></div>
                <div
                  className={`text-3xl sm:text-4xl mb-3 sm:mb-4 mt-2 group-hover:scale-110 transition-transform origin-center ${card.textColor} group-hover:text-pine-900 duration-200 ease-out`}
                >
                  <i className={`fas ${card.icon}`}></i>
                </div>
                <h3 className="font-bold text-dark-deepblue leading-tight group-hover:text-light-white transition-colors duration-200">
                  {card.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </main>

      {activeModal && (
        <div
          id="modal-overlay"
          className="fixed inset-0 bg-dark-almostblack sm:bg-opacity-80 sm:backdrop-blur-sm z-50 flex items-center justify-center sm:p-4 transition-opacity duration-200"
        >
          <div className="bg-light-soft w-full h-full sm:w-[95vw] sm:h-[90vh] lg:h-auto lg:max-w-[calc(95vh*16/9)] lg:aspect-video flex flex-col relative sm:border sm:border-light-border overflow-hidden rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl">
            <div
              className={`flex justify-between items-start sm:items-center p-2 sm:p-3 lg:p-4 bg-${activeCard.bgcontent} border-b border-light-border shrink-0 gap-3`}
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 ${activeCard.color}`}
                >
                  <i className={`fas ${activeCard.icon}`}></i>
                </div>
                <h3 className="lg:text-xl font-bold text-dark-deepblue tracking-tight leading-tight">
                  {activeCard.title}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-light-ui hover:bg-light-muted active:scale-[0.95] text-dark-primary hover:text-red-primary transition-all duration-200 ease-out flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-primary"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div
              className={`p-2 sm:p-4 lg:p-6 overflow-y-auto flex-1 text-dark-charcoal leading-relaxed lg:text-sm ${activeCard.bgcontent}`}
            >
              {activeCard.content}
            </div>
          </div>
        </div>
      )}

      {showLoginPortal && (
        <LoginPortal
          isOpen={showLoginPortal}
          onClose={() => setShowLoginPortal(false)}
          selectedLoginType={selectedLoginType}
          setSelectedLoginType={setSelectedLoginType}
        />
      )}
    </div>
  );
};

export default App;
