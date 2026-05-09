import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import WhyJzv from "./components/homepage/WhyJzv";
import VisionMission from "./components/homepage/VisionMission";
import Courses from "./components/homepage/Courses";
import LoginPortal from "./components/LoginPortal";
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
import NewAdmission from "./components/admission/NewAdmission";
import CheckApplicationStatus from "./components/admission/CheckStatus";

// ─── Tab groups ────────────────────────────────────────────────────────────────
// ids[0] is always the default tab when the group entry card is clicked
const TAB_GROUPS = [
  { name: "about-us", ids: ["why-jzv", "vision", "system-4t"] },
  { name: "academic", ids: ["courses", "streams", "nios", "hifz"] },
  { name: "campus-life", ids: ["schedule", "extracurricular", "sports"] },
  { name: "policy", ids: ["admission-process", "policies"] },
  {
    name: "admission",
    ids: ["new-admission", "check-admission-status", "fees"],
  },
];

// All ids that belong to a group — these are hidden from the main grid
const GROUPED_IDS = new Set(TAB_GROUPS.flatMap((g) => g.ids));

const getGroupByName = (name) =>
  TAB_GROUPS.find((g) => g.name === name) ?? null;
const getGroupById = (id) => TAB_GROUPS.find((g) => g.ids.includes(id)) ?? null;

const App = () => {
  // activeModal is either a group name ("academic") or a solo card id ("why-jzv")
  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState(null); // only used for group modals

  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [selectedLoginType, setSelectedLoginType] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 400 });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (activeModal) closeModal();
        if (showLoginPortal) {
          setShowLoginPortal(false);
          setSelectedLoginType(null);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeModal, showLoginPortal]);

  // Per-card sub-states
  const [courseView, setCourseView] = useState("main");
  const [niosTab, setNiosTab] = useState("overview");
  const [streamView, setStreamView] = useState("main");
  const [galleryIndex, setGalleryIndex] = useState("1");
  const [galleryTitle, setGalleryTitle] = useState("Classrooms");
  const [visionLang, setVisionLang] = useState("en");

  const resetCardState = (id) => {
    if (id === "courses") setCourseView("main");
    if (id === "streams") setStreamView("main");
    if (id === "gallery") {
      setGalleryIndex("1");
      setGalleryTitle("Classrooms");
    }
    if (id === "vision") setVisionLang("en");
    if (id === "nios") setNiosTab("overview");
  };

  // ─── Card definitions ───────────────────────────────────────────────────────
  const cards = [
    // ── Standalone ──────────────────────────────────────────────────────────
    {
      id: "why-jzv",
      title: "Why JZV",
      icon: "fa-building-columns",
      color: "bg-pink-primary",
      textColor: "text-pink-primary",
      bgcontent: "bg-pink-lbg",
      bgSoft: "bg-pink-soft",
      showAtHome: false,
      content: <WhyJzv />,
    },
    {
      id: "vision",
      title: "Vision & Mission",
      icon: "fa-eye",
      color: "bg-blue-primary",
      textColor: "text-blue-primary",
      bgcontent: "bg-blue-lbg",
      bgSoft: "bg-blue-soft",
      showAtHome: false,
      content: (
        <VisionMission visionLang={visionLang} setVisionLang={setVisionLang} />
      ),
    },
    {
      id: "system-4t",
      title: "4Ts Pedagogy",
      icon: "fa-leaf",
      color: "bg-teal-primary",
      textColor: "text-teal-primary",
      bgcontent: "bg-teal-lbg",
      bgSoft: "bg-teal-soft",
      showAtHome: false,
      content: <_4Ts />,
    },
    {
      id: "hifz",
      title: "Tahfeez ul Quran",
      icon: "fa-book-quran",
      color: "bg-green-dark",
      textColor: "text-green-dark",
      bgcontent: "bg-green-lbg",
      bgSoft: "bg-green-soft",
      showAtHome: false,
      content: <TahfeezulQuran />,
    },
    {
      id: "schedule",
      title: "Daily Schedule",
      icon: "fa-clock",
      color: "bg-yellow-gold",
      textColor: "text-yellow-gold",
      bgcontent: "bg-yellow-lbg",
      bgSoft: "bg-yellow-soft",
      showAtHome: false,
      content: <DailyRoutine />,
    },
    {
      id: "extracurricular",
      title: "Extra-Curriculars",
      icon: "fa-palette",
      color: "bg-pink-primary",
      textColor: "text-pink-primary",
      bgcontent: "bg-pink-lbg",
      bgSoft: "bg-pink-soft",
      showAtHome: false,
      content: <ExtraCurriculars />,
    },
    {
      id: "sports",
      title: "Sports & Agility",
      icon: "fa-futbol",
      color: "bg-brand-bright",
      textColor: "text-brand-bright",
      bgcontent: "bg-brand-lbg",
      bgSoft: "bg-brand-soft",
      showAtHome: false,
      content: <SportsAndAgility />,
    },

    // ── Group entry-point cards (shown on grid, open tabbed modal) ───────────
    {
      id: "__about__jzv",
      title: "About Us",
      icon: "fa-compass",
      color: "bg-pink-primary",
      textColor: "text-pink-primary",
      bgcontent: "bg-pink-lbg",
      bgSoft: "bg-pink-soft",
      isGroupEntry: true,
      groupName: "about-us",
    },
    {
      id: "__entry__academic",
      title: "Our Academics",
      icon: "fa-graduation-cap",
      color: "bg-brand-bright",
      textColor: "text-brand-bright",
      bgcontent: "bg-brand-lbg",
      bgSoft: "bg-brand-soft",
      isGroupEntry: true,
      groupName: "academic",
    },
    {
      id: "__campus__life",
      title: "Life at JZV",
      icon: "fa-school-flag",
      color: "bg-green-dark",
      textColor: "text-green-dark",
      bgcontent: "bg-green-lbg",
      bgSoft: "bg-green-soft",
      isGroupEntry: true,
      groupName: "campus-life",
    },
    {
      id: "__entry__policy",
      title: "Policies",
      icon: "fa-scale-balanced",
      color: "bg-dark-primary",
      textColor: "text-dark-primary",
      bgcontent: "bg-dark-lbg",
      bgSoft: "bg-dark-soft",
      isGroupEntry: true,
      groupName: "policy",
    },
    {
      id: "__entry__admission",
      title: "Admissions",
      icon: "fa-user-graduate",
      color: "bg-blue-dark",
      textColor: "text-blue-dark",
      bgcontent: "bg-blue-lbg",
      bgSoft: "bg-blue-soft",
      isGroupEntry: true,
      groupName: "admission",
    },
    {
      id: "gallery",
      title: "Campus Gallery",
      icon: "fa-images",
      color: "bg-pink-deep",
      textColor: "text-pink-deep",
      bgcontent: "bg-pink-lbg",
      bgSoft: "bg-pink-soft",
      showAtHome: true,
      content: (
        <CampusGallery
          galleryIndex={galleryIndex}
          galleryTitle={galleryTitle}
          setGalleryIndex={setGalleryIndex}
          setGalleryTitle={setGalleryTitle}
        />
      ),
    },

    // ── Grouped detail cards (hidden from grid, rendered inside tabbed modal) ─
    {
      id: "courses",
      title: "Courses (PCC & GCC)",
      icon: "fa-graduation-cap",
      color: "bg-brand-bright",
      textColor: "text-brand-bright",
      bgcontent: "bg-brand-lbg",
      bgSoft: "bg-brand-soft",
      content: (
        <Courses courseView={courseView} setCourseView={setCourseView} />
      ),
    },
    {
      id: "streams",
      title: "Aalimiyat Streams",
      icon: "fa-code-branch",
      color: "bg-blue-primary",
      textColor: "text-blue-primary",
      bgcontent: "bg-blue-lbg",
      bgSoft: "bg-blue-soft",
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
      bgSoft: "bg-red-soft",
      content: <NIOS niosTab={niosTab} setNiosTab={setNiosTab} />,
    },
    {
      id: "policies",
      title: "Institution Policies",
      icon: "fa-file-contract",
      color: "bg-dark-primary",
      textColor: "text-dark-primary",
      bgcontent: "bg-dark-lbg",
      bgSoft: "bg-dark-soft",
      content: <Policies />,
    },
    {
      id: "fees",
      title: "Fee Structure",
      icon: "fa-indian-rupee-sign",
      color: "bg-teal-dark",
      textColor: "text-teal-dark",
      bgcontent: "bg-teal-lbg",
      bgSoft: "bg-teal-soft",
      content: <FeeStructure />,
    },
    {
      id: "admission-process",
      title: "Admission Process",
      icon: "fa-clipboard-list",
      color: "bg-blue-dark",
      textColor: "text-blue-dark",
      bgcontent: "bg-blue-lbg",
      bgSoft: "bg-blue-soft",
      content: <AdmissionProcess />,
    },
    {
      id: "new-admission",
      title: "Admission Enquiry",
      icon: "fa-pen-to-square",
      color: "bg-dark-charcoal",
      textColor: "text-dark-charcoal",
      bgcontent: "bg-dark-lbg",
      bgSoft: "bg-dark-soft",
      content: <NewAdmission inModal={true} />,
    },
    {
      id: "check-admission-status",
      title: "Check Admission Status",
      icon: "fa-search",
      color: "bg-orange-dark",
      textColor: "text-orange-dark",
      bgcontent: "bg-orange-lbg",
      bgSoft: "bg-orange-soft",
      content: <CheckApplicationStatus inModal={true} />,
    },
  ];

  const getCard = (id) => cards.find((c) => c.id === id);

  // ─── Open modal ─────────────────────────────────────────────────────────────
  const openModal = (id) => {
    const card = getCard(id);
    if (!card) return;
    if (card.external) {
      window.open(card.link, "_blank");
      return;
    }

    if (card.isGroupEntry) {
      // Group entry: open first tab of that group
      const grp = getGroupByName(card.groupName);
      const firstTab = grp?.ids[0];
      if (!grp || !firstTab) return;
      resetCardState(firstTab);
      setActiveModal(card.groupName);
      setActiveTab(firstTab);
    } else {
      // Solo card
      resetCardState(id);
      setActiveModal(id);
      setActiveTab(null);
    }

    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveTab(null);
    document.body.classList.remove("modal-open");
  };

  // ─── Derive render props ─────────────────────────────────────────────────────
  const activeGroup = activeModal ? getGroupByName(activeModal) : null;
  const isTabbed = !!activeGroup;
  const activeCard = isTabbed ? getCard(activeTab) : getCard(activeModal);

  // Grid: cards with showAtHome:true  +  group entry-point cards
  const gridCards = cards.filter(
    (c) => c.showAtHome === true || c.isGroupEntry === true,
  );

  return (
    <div id="dashboard-section" className="min-h-screen pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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

      {/* ── Card grid ──────────────────────────────────────────────────────── */}
      <main className="w-screen mt-8 sm:mt-12 bg-cover bg-no-repeat bg-center bg-[url('../src/media/jzv-building01.png')]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
            id="card-container"
          >
            {gridCards.map((card) => (
              <div
                key={card.id}
                tabIndex={0}
                className="bg-light-white bg-opacity-90 rounded-2xl shadow-sm border border-light-border p-5 sm:p-6 lg:p-8 cursor-pointer transition-all duration-200 ease-out group overflow-hidden relative select-none flex flex-col items-center justify-center text-center h-full min-h-[160px] hover:bg-olive-500"
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
                />
                <div
                  className={`text-3xl sm:text-4xl mb-3 sm:mb-4 mt-2 group-hover:scale-110 transition-transform origin-center ${card.textColor} group-hover:text-pine-900 duration-200 ease-out`}
                >
                  <i className={`fas ${card.icon}`} />
                </div>
                <h3 className="font-bold text-dark-deepblue leading-tight group-hover:text-light-white transition-colors duration-200">
                  {card.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {activeModal && activeCard && (
        <div
          id="modal-overlay"
          className="fixed inset-0 bg-dark-almostblack sm:bg-opacity-80 sm:backdrop-blur-sm z-50 flex items-center justify-center sm:p-4 transition-opacity duration-200"
        >
          <div className="bg-light-soft w-full h-full sm:w-[95vw] sm:h-[90vh] lg:h-auto lg:max-w-[calc(95vh*16/9)] lg:aspect-video flex flex-col relative sm:border sm:border-light-border overflow-hidden rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl">
            {/* ── Modal header ─────────────────────────────────────────────── */}
            <div
              className={`flex items-center justify-between p-2 sm:p-3 lg:p-4 border-b border-light-border shrink-0 gap-3 ${activeCard.bgcontent}`}
            >
              {isTabbed ? (
                /* ── TABBED header ─────────────────────────────────────────── */
                <>
                  {/* Flex grid of tab tiles */}
                  <div className="flex w-full">
                    {activeGroup.ids.map((tabId) => {
                      const tabCard = getCard(tabId);
                      const isActive = activeTab === tabId;
                      if (!tabCard) return null;

                      return (
                        <div key={tabId} className="flex-1 px-0.5">
                          <button
                            key={tabId}
                            onClick={() => setActiveTab(tabId)}
                            className={`
                            flex w-full items-center gap-2
                            px-3 sm:px-4 
                            font-semibold text-xs sm:text-sm
                            select-none transition-all duration-150 ease-out
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                            whitespace-nowrap
                            text-white
                            ${
                              isActive
                                ? `${tabCard.color}
                                 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.35),inset_-1px_-1px_3px_rgba(255,255,255,0.1)]
                                  ring-1 ring-black/10 py-3 sm:py-4 rounded-b-lg`
                                : `${tabCard.color}/50
                                 shadow-[2px_2px_5px_rgba(0,0,0,0.18),-1px_-1px_3px_rgba(255,255,255,0.85)]
                                 hover:shadow-[3px_3px_7px_rgba(0,0,0,0.22),-1px_-1px_4px_rgba(255,255,255,0.9)]
                                 py-2 sm:py-3
                                 `
                            }
                          `}
                          >
                            {/* Icon badge */}
                            <span
                              className={`
                              w-6 h-6 sm:w-7 sm:h-7 rounded-lg
                              flex items-center justify-center shrink-0
                              transition-colors duration-150
                              ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : `bg-light-soft ${tabCard.textColor}`
                              }
                            `}
                            >
                              <i className={`fas ${tabCard.icon} text-xs`} />
                            </span>
                            <span>{tabCard.title}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Single close button */}
                  <button
                    onClick={closeModal}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-light-ui hover:bg-light-muted active:scale-[0.95] text-dark-primary hover:text-red-primary transition-all duration-200 ease-out flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-primary shadow-[2px_2px_5px_rgba(0,0,0,0.18),-1px_-1px_3px_rgba(255,255,255,0.85)]"
                  >
                    <i className="fas fa-times" />
                  </button>
                </>
              ) : (
                /* ── SOLO header ───────────────────────────────────────────── */
                <>
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-inner shrink-0 ${activeCard.color}`}
                    >
                      <i className={`fas ${activeCard.icon}`} />
                    </div>
                    <h3 className="lg:text-xl font-bold text-dark-deepblue tracking-tight leading-tight">
                      {activeCard.title}
                    </h3>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-light-ui hover:bg-light-muted active:scale-[0.95] text-dark-primary hover:text-red-primary transition-all duration-200 ease-out flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-primary"
                  >
                    <i className="fas fa-times" />
                  </button>
                </>
              )}
            </div>

            {/* ── Modal content ────────────────────────────────────────────── */}
            <div
              className={`p-2 sm:p-4 lg:p-6 overflow-y-auto flex-1 text-dark-charcoal leading-relaxed lg:text-sm ${activeCard.bgcontent}`}
            >
              {activeCard.content}
            </div>
          </div>
        </div>
      )}

      {/* ── Login portal ───────────────────────────────────────────────────── */}
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
