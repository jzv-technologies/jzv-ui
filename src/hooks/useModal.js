// src/hooks/useModal.js
import { useState } from "react";
import { getCards, getGroupByName } from "../components/homepage/CardsData";

export const useModal = (user) => {
  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

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

  const cards = getCards({
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
    currentUser: user,
  });

  const getCard = (id) => cards.find((c) => c.id === id);

  const openModal = (id) => {
    const card = getCard(id);
    if (!card) return;
    if (card.external) {
      window.open(card.link, "_blank");
      return;
    }
    if (card.isGroupEntry) {
      const grp = getGroupByName(card.groupName);
      const firstTab = grp?.ids[0];
      if (!grp || !firstTab) return;
      resetCardState(firstTab);
      setActiveModal(card.groupName);
      setActiveTab(firstTab);
    } else {
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

  const activeGroup = activeModal ? getGroupByName(activeModal) : null;
  const isTabbed = !!activeGroup;
  const activeCard = isTabbed ? getCard(activeTab) : getCard(activeModal);

  // ✅ Return `cards` so App can use it
  return {
    cards, // <-- ADD THIS
    activeModal,
    activeTab,
    setActiveTab,
    activeCard,
    activeGroup,
    isTabbed,
    openModal,
    closeModal,
    getCard,
  };
};
