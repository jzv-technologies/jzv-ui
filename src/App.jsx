import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import WhyJzv from "./components/homepage/WhyJzv";
import VisionMission from "./components/homepage/VisionMission";
import Courses from "./components/homepage/Courses";
import LoginPortal from "./components/LoginPortal";
import Admission from "./components/admission/SuccessModal";
import _4Ts from "./components/homepage/4Ts";
import NIOS from "./components/homepage/NIOS";
import Streams from "./components/homepage/Steams";
import FeeStructure from "./components/homepage/FeeStructure";
import DailyRoutine from "./components/homepage/DailyRoutine";
import TahfeezulQuran from "./components/homepage/TahfeezulQuran";

const App = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [selectedLoginType, setSelectedLoginType] = useState(null);
  const [user, setUser] = useState(null);
  const [showAdmission, setShowAdmission] = useState(false);

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
      content: <_4Ts />,
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
      content: (
        <Streams streamView={streamView} setStreamView={setStreamView} />
      ),
    },
    {
      id: "nios",
      title: "NIOS (10th & 12th)",
      icon: "fa-certificate",
      color: "bg-red-primary",
      textColor: "text-red-primary",
      bgcontent: "bg-red-lbg",
      content: <NIOS niosTab={niosTab} setNiosTab={setNiosTab} />,
    },
    {
      id: "hifz",
      title: "Tahfeez ul Quran",
      icon: "fa-book-quran",
      color: "bg-green-dark",
      textColor: "text-green-dark",
      bgcontent: "bg-green-lbg",
      content: <TahfeezulQuran />,
    },
    {
      id: "schedule",
      title: "Daily Schedule",
      icon: "fa-clock",
      color: "bg-yellow-gold",
      textColor: "text-yellow-gold",
      bgcontent: "bg-yellow-lbg",
      content: <DailyRoutine />,
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
      content: <FeeStructure />,
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
      title: "Student Admission Portal",
      icon: "fa-pen-to-square",
      color: "bg-green-bright",
      textColor: "text-green-bright",
      bgcontent: "bg-green-lbg",
      content: <Admission inModal={true} />,
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
      <main className="w-screen mt-8 sm:mt-12 bg-cover bg-no-repeat bg-center bg-[url('../src/media/jzv-building01.png')]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6"
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
