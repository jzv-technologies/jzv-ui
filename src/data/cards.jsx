import WhyJzv from "../components/homepage/about-us/WhyJzv";
import VisionMission from "../components/homepage/about-us/VisionMission";
import _4Ts from "../components/homepage/about-us/4Ts";
import TahfeezulQuran from "../components/homepage/academic/TahfeezulQuran";
import DailySchedule from "../components/homepage/campus-life/DailySchedule";
import ExtraCurriculars from "../components/homepage/campus-life/ExtraCurriculars";
import SportsAndAgility from "../components/homepage/campus-life/SportsAndAgility";
import Courses from "../components/homepage/academic/Courses";
import AlimiatStreams from "../components/homepage/academic/AlimiatStreams";
import NIOS from "../components/homepage/academic/NIOS";
import Policies from "../components/homepage/policy/Policies";
import FeeStructure from "../components/homepage/admission/FeeStructure";
import AdmissionProcess from "../components/homepage/admission/AdmissionProcess";
import NewAdmission from "../components/homepage/admission/NewAdmission";
import CheckApplicationStatus from "../components/homepage/admission/CheckApplicationStatus";
import CampusGallery from "../components/homepage/CampusGallery";
import DynamicForm from "../components/DynamicForm";
import { CARD_THEMES } from "../utils/cardTheme";

export const getCards = ({
  courseView,
  setCourseView,
  streamView,
  setStreamView,
  niosTab,
  setNiosTab,
  galleryIndex,
  galleryTitle,
  setGalleryIndex,
  setGalleryTitle,
  visionLang,
  setVisionLang,
}) => [
  // ── Standalone ──────────────────────────────────────────────────────────
  {
    id: "why-jzv",
    title: "Why JZV",
    icon: "fa-building-columns",
    ...CARD_THEMES.pink,
    showAtHome: false,
    content: <WhyJzv />,
  },
  {
    id: "vision",
    title: "Vision & Mission",
    icon: "fa-eye",
    ...CARD_THEMES.blue,
    showAtHome: false,
    content: (
      <VisionMission visionLang={visionLang} setVisionLang={setVisionLang} />
    ),
  },
  {
    id: "system-4t",
    title: "4Ts Pedagogy",
    icon: "fa-leaf",
    ...CARD_THEMES.teal,
    showAtHome: false,
    content: <_4Ts />,
  },
  {
    id: "hifz",
    title: "Tahfeez ul Quran",
    icon: "fa-book-quran",
    ...CARD_THEMES.green,
    showAtHome: false,
    content: <TahfeezulQuran />,
  },
  {
    id: "schedule",
    title: "Daily Schedule",
    icon: "fa-clock",
    ...CARD_THEMES.orange,
    showAtHome: false,
    content: <DailySchedule />,
  },
  {
    id: "extracurricular",
    title: "Extra-Curriculars",
    icon: "fa-palette",
    ...CARD_THEMES.pink,
    showAtHome: false,
    content: <ExtraCurriculars />,
  },
  {
    id: "sports",
    title: "Sports & Agility",
    icon: "fa-futbol",
    ...CARD_THEMES.brand,
    showAtHome: false,
    content: <SportsAndAgility />,
  },

  // ── Group entry-point cards ───────────────────────────────────────────
  {
    id: "my-portal",
    title: "My Portal",
    icon: "fa-user-circle",
    ...CARD_THEMES.brand,
    showAtHome: false, // We dynamically enable this in App.jsx when logged in
  },
  {
    id: "__about__jzv",
    title: "About Us",
    icon: "fa-compass",
    ...CARD_THEMES.pink,
    isGroupEntry: true,
    groupName: "about-us",
  },
  {
    id: "__entry__academic",
    title: "Academics",
    icon: "fa-graduation-cap",
    ...CARD_THEMES.brand,
    isGroupEntry: true,
    groupName: "academic",
  },
  {
    id: "__campus__life",
    title: "Life at JZV",
    icon: "fa-school-flag",
    ...CARD_THEMES.green,
    isGroupEntry: true,
    groupName: "campus-life",
  },
  {
    id: "__entry__policy",
    title: "Policies",
    icon: "fa-scale-balanced",
    ...CARD_THEMES.dark,
    isGroupEntry: true,
    groupName: "policy",
  },
  {
    id: "__entry__admission",
    title: "Admissions",
    icon: "fa-user-graduate",
    ...CARD_THEMES.brand,
    isGroupEntry: true,
    groupName: "admission",
  },
  {
    id: "gallery",
    title: "Campus Gallery",
    icon: "fa-images",
    ...CARD_THEMES.pink,
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

  // ── Grouped detail cards ───────────────────────────────────────────────
  {
    id: "courses",
    title: "Courses (PCC & GCC)",
    icon: "fa-graduation-cap",
    ...CARD_THEMES.brand,
    content: <Courses courseView={courseView} setCourseView={setCourseView} />,
  },
  {
    id: "streams",
    title: "Aalimiyat Streams",
    icon: "fa-code-branch",
    ...CARD_THEMES.blue,
    content: (
      <AlimiatStreams streamView={streamView} setStreamView={setStreamView} />
    ),
  },
  {
    id: "nios",
    title: "NIOS (10th & 12th)",
    icon: "fa-certificate",
    ...CARD_THEMES.red,
    content: <NIOS niosTab={niosTab} setNiosTab={setNiosTab} />,
  },
  {
    id: "policies",
    title: "Institution Policies",
    icon: "fa-file-contract",
    ...CARD_THEMES.dark,
    content: <Policies />,
  },
  {
    id: "fees",
    title: "Fee Structure",
    icon: "fa-indian-rupee-sign",
    ...CARD_THEMES.tealDark,
    content: <FeeStructure />,
  },
  {
    id: "admission-process",
    title: "Admission Process",
    icon: "fa-clipboard-list",
    ...CARD_THEMES.blueDark,
    content: <AdmissionProcess />,
  },
  {
    id: "new-admission",
    title: "Admission Request",
    icon: "fa-pen-to-square",
    ...CARD_THEMES.charcoal,
    content: <NewAdmission inModal={true} />,
  },
  {
    id: "check-admission-status",
    title: "Check Admission Status",
    icon: "fa-search",
    ...CARD_THEMES.orange,
    content: <CheckApplicationStatus inModal={true} />,
  },
  // ── New dynamic form cards ─────────────────────────────────────────────
  {
    id: "complaint-register",
    title: "Complaint Register",
    icon: "fa-clipboard-list",
    ...CARD_THEMES.orange,
    showAtHome: true,
    content: (
      <DynamicForm uuid="complaint" textColor={CARD_THEMES.orange.textColor} />
    ),
  },
  {
    id: "career",
    title: "Career",
    icon: "fa-briefcase",
    ...CARD_THEMES.blueDark,
    showAtHome: true,
    content: (
      <DynamicForm uuid="career" textColor={CARD_THEMES.blueDark.textColor} />
    ),
  },
];
