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
import UsefulLinksModal from "./UsefulLinksModal";

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
  "my-portal",
  "__about__jzv",
  "__entry__academic",
  "__campus__life",
  "policies",
  "__entry__admission",
  "useful-links",
  "gallery",
  "careers",
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
  userRoles = [],
}) => [
  // ── Standalone ──────────────────────────────────────────────────────────
  {
    id: "useful-links",
    title: "Useful Links",
    titleKey: "cards.useful_links",
    icon: "fa-link",
    ...CARD_THEMES.blue,
    showAtHome: true,
    content: <UsefulLinksModal user={currentUser} userRoles={userRoles} />,
  },
  {
    id: "why-jzv",
    title: "Why JZV",
    titleKey: "cards.why_jzv",
    icon: "fa-building-columns",
    ...CARD_THEMES.pink,
    showAtHome: false,
    content: <WhyJzv />,
  },
  {
    id: "vision",
    title: "Vision & Mission",
    titleKey: "cards.vision_mission",
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
    titleKey: "cards.system_4t",
    icon: "fa-leaf",
    ...CARD_THEMES.teal,
    showAtHome: false,
    content: <_4Ts />,
  },
  {
    id: "hifz",
    title: "Tahfeez ul Quran",
    titleKey: "cards.tahfeezulquran",
    icon: "fa-book-quran",
    ...CARD_THEMES.green,
    showAtHome: false,
    content: <TahfeezulQuran />,
  },
  {
    id: "schedule",
    title: "Daily Schedule",
    titleKey: "cards.daily_schedule",
    icon: "fa-clock",
    ...CARD_THEMES.orange,
    showAtHome: false,
    content: <DailySchedule />,
  },
  {
    id: "extracurricular",
    title: "Extra-Curriculars",
    titleKey: "cards.extra_curriculars",
    icon: "fa-palette",
    ...CARD_THEMES.pink,
    showAtHome: false,
    content: <ExtraCurriculars />,
  },
  {
    id: "sports",
    title: "Sports & Agility",
    titleKey: "cards.sports_agility",
    icon: "fa-futbol",
    ...CARD_THEMES.brand,
    showAtHome: false,
    content: <SportsAndAgility />,
  },

  // ── Group entry-point cards ───────────────────────────────────────────
  {
    id: "__about__jzv",
    title: "About Us",
    titleKey: "cards.about_us",
    icon: "fa-compass",
    ...CARD_THEMES.pink,
    isGroupEntry: true,
    groupName: "about-us",
  },
  {
    id: "__entry__academic",
    title: "Academics",
    titleKey: "cards.academics",
    icon: "fa-graduation-cap",
    ...CARD_THEMES.brand,
    isGroupEntry: true,
    groupName: "academic",
  },
  {
    id: "__campus__life",
    title: "Life at JZV",
    titleKey: "cards.campus_life",
    icon: "fa-school-flag",
    ...CARD_THEMES.green,
    isGroupEntry: true,
    groupName: "campus-life",
  },
  {
    id: "__entry__admission",
    title: "Admissions",
    titleKey: "cards.admissions",
    icon: "fa-user-graduate",
    ...CARD_THEMES.blueDark,
    isGroupEntry: true,
    groupName: "admission",
  },
  {
    id: "gallery",
    title: "Campus Gallery",
    titleKey: "cards.campus_gallery",
    icon: "fa-images",
    ...CARD_THEMES.red,
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
    titleKey: "cards.courses",
    icon: "fa-graduation-cap",
    ...CARD_THEMES.brand,
    content: <Courses courseView={courseView} setCourseView={setCourseView} />,
  },
  {
    id: "streams",
    title: "Aalimiyat Streams",
    titleKey: "cards.alimiat_streams",
    icon: "fa-code-branch",
    ...CARD_THEMES.blue,
    content: (
      <AlimiatStreams streamView={streamView} setStreamView={setStreamView} />
    ),
  },
  {
    id: "nios",
    title: "NIOS (10th & 12th)",
    titleKey: "cards.nios",
    icon: "fa-certificate",
    ...CARD_THEMES.red,
    content: <NIOS niosTab={niosTab} setNiosTab={setNiosTab} />,
  },
  {
    id: "policies",
    title: "Institution Policies",
    titleKey: "cards.policies",
    icon: "fa-file-contract",
    ...CARD_THEMES.dark,
    showAtHome: true,
    content: <Policies />,
  },
  {
    id: "fees",
    title: "Fee Structure",
    titleKey: "cards.fees",
    icon: "fa-indian-rupee-sign",
    ...CARD_THEMES.tealDark,
    content: <FeeStructure />,
  },
  {
    id: "admission-process",
    title: "Admission Process",
    titleKey: "cards.admission_process",
    icon: "fa-clipboard-list",
    ...CARD_THEMES.blueDark,
    content: <AdmissionProcess />,
  },
  {
    id: "new-admission",
    title: "Admission Request",
    titleKey: "cards.new_admission",
    icon: "fa-pen-to-square",
    ...CARD_THEMES.charcoal,
    content: <NewAdmission inModal={true} />,
  },
  {
    id: "check-admission-status",
    title: "Check Admission Status",
    titleKey: "cards.check_admission_status",
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
        textColor={`text-${CARD_THEMES.orange.color}`}
        additionalData={{ email: currentUser?.email }}
        userRoles={userRoles}
      />
    ),
  },
  {
    id: "__career__openings",
    title: "Job Openings",
    titleKey: "cards.job_openings",
    icon: "fa-briefcase",
    ...CARD_THEMES.tealDark,
    isGroupEntry: true,
    groupName: "careers",
  },

  {
    id: "career",
    title: "Apply Online",
    titleKey: "cards.apply_online",
    icon: "fa-briefcase",
    ...CARD_THEMES.blueDark,
    showAtHome: false,
    content: (
      <DynamicForm uuid="career" textColor={`text-${CARD_THEMES.blueDark.color}`} userRoles={userRoles} />
    ),
  },
  {
    id: "openings",
    title: "Current Openings",
    titleKey: "cards.current_openings",
    icon: "fa-briefcase",
    ...CARD_THEMES.tealDark,
    content: <OpeningsModal inModal={true} />,
  },
  {
    id: "contact-us",
    title: "Contact Us",
    titleKey: "cards.contact_us",
    icon: "fa-phone-alt",
    ...CARD_THEMES.blue,
    showAtHome: true,
    content: <ContactUs />,
  },
  {
    id: "my-portal",
    title: "My Portal",
    titleKey: "cards.my_portal",
    icon: "fa-user-circle",
    ...CARD_THEMES.pinkDeep,
    showAtHome: false, // We dynamically enable this in App.jsx when logged in
  },
];
