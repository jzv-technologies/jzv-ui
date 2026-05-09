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
import SportsAndAgility from "./components/homepage/SportsAndAgility";
import AdmissionProcess from "./components/homepage/AdmissionProcess";
import Policies from "./components/homepage/Policies";
import ExtraCurriculars from "./components/homepage/ExtraCurriculars";
import CampusGallery from "./components/homepage/CampusGallery";

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
      content: <ExtraCurriculars />,
    },
    {
      id: "sports",
      title: "Sports & Agility",
      icon: "fa-futbol",
      color: "bg-orange-burnt",
      textColor: "text-orange-burnt",
      bgcontent: "bg-orange-lbg",
      content: <SportsAndAgility />,
    },
    {
      id: "gallery",
      title: "Campus Gallery",
      icon: "fa-images",
      color: "bg-pink-deep",
      textColor: "text-pink-deep",
      bgcontent: "bg-pink-lbg",
      content: (
        <CampusGallery
          galleryIndex={galleryIndex}
          galleryTitle={galleryTitle}
          setGalleryIndex={setGalleryIndex}
          setGalleryTitle={setGalleryTitle}
        />
      ),
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
      content: <AdmissionProcess />,
    },
    {
      id: "policies",
      title: "Institution Policies",
      icon: "fa-file-contract",
      color: "bg-dark-primary",
      textColor: "text-dark-primary",
      bgcontent: "bg-dark-lbg",
      content: <Policies />,
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
