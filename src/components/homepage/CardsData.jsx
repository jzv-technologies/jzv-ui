import WhyJzv from "./about-us/WhyJzv";
import VisionMission from "./about-us/VisionMission";
import _4Ts from "./about-us/4Ts";
import TahfeezulQuran from "./academic/TahfeezulQuran";
import DailySchedule from "./campus-life/DailySchedule";
import ExtraCurriculars from "./campus-life/ExtraCurriculars";
import SportsAndAgility from "./campus-life/SportsAndAgility";
import Courses from "./academic/Courses";
import AlimiatStreams from "./academic/AlimiatStreams";
import NIOS from "./academic/NIOS";
import Policies from "./policy/Policies";
import FeeStructure from "./admission/FeeStructure";
import AdmissionProcess from "./admission/AdmissionProcess";
import NewAdmission from "./admission/NewAdmission";
import CheckApplicationStatus from "./admission/CheckApplicationStatus";
import CampusGallery from "./CampusGallery";
import ContactUs from "./ContactUs";
import DynamicForm from "../DynamicForm";
import OpeningsModal from "./Openings";
import { CARD_THEMES } from "../../utils/cardTheme";

// ─── Tab groups ────────────────────────────────────────────────────────────────
export const TAB_GROUPS = [
  { name: "about-us", ids: ["why-jzv", "vision", "system-4t"] },
  { name: "academic", ids: ["courses", "streams", "nios", "hifz"] },
  { name: "campus-life", ids: ["schedule", "extracurricular", "sports"] },
  {
    name: "admission",
    ids: [
      "admission-process",
      "new-admission",
      "check-admission-status",
      "fees",
    ],
  },
  { name: "careers", ids: ["openings", "career"] },
];

export const GROUPED_IDS = new Set(TAB_GROUPS.flatMap((g) => g.ids));

export const getGroupByName = (name) =>
  TAB_GROUPS.find((g) => g.name === name) ?? null;
export const getGroupById = (id) =>
  TAB_GROUPS.find((g) => g.ids.includes(id)) ?? null;

// ─── Home card sequence ────────────────────────────────────────────────────────
// Use this array to easily reorder the cards on the main home page.
// The IDs must exactly match the `id` property of the cards defined below.
export const HOME_CARD_SEQUENCE = [
  "__about__jzv",
  "__entry__academic",
  "__campus__life",
  "policies",
  "__entry__admission",
  "gallery",
  "careers",
  "my-portal",
  "complaint-register",
  "contact-us",
];

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
  currentUser,
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
    showAtHome: true,
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
    showAtHome: false,
    content: (
      <DynamicForm
        uuid="complaint"
        textColor={CARD_THEMES.orange.textColor}
        additionalData={{ email: currentUser?.email }}
      />
    ),
  },
  {
    id: "__career__openings",
    title: "Career Openings",
    icon: "fa-briefcase",
    ...CARD_THEMES.brand,
    isGroupEntry: true,
    groupName: "careers",
  },

  {
    id: "career",
    title: "Career",
    icon: "fa-briefcase",
    ...CARD_THEMES.blueDark,
    showAtHome: false,
    content: (
      <DynamicForm uuid="career" textColor={CARD_THEMES.blueDark.textColor} />
    ),
  },
  {
    id: "openings",
    title: "Openings",
    icon: "fa-briefcase",
    ...CARD_THEMES.tealDark,
    content: <OpeningsModal inModal={true} />,
  },
  {
    id: "contact-us",
    title: "Contact Us",
    icon: "fa-phone-alt",
    ...CARD_THEMES.teal,
    showAtHome: true,
    content: <ContactUs />,
  },
  {
    id: "my-portal",
    title: "My Portal",
    icon: "fa-user-circle",
    ...CARD_THEMES.brand,
    showAtHome: false, // We dynamically enable this in App.jsx when logged in
  },
];
