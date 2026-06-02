import React, { useState, useEffect } from "react";
import useLanguage from "../../hooks/useLanguage";
import Translate from "../Translate";

const groupCardMap = {
  "about-us": "__about__jzv",
  academic: "__entry__academic",
  "campus-life": "__campus__life",
  admission: "__entry__admission",
  careers: "__career__openings",
};

const ModalContainer = ({
  activeModal,
  activeCard,
  activeGroup,
  activeTab,
  setActiveTab,
  isTabbed,
  getCard,
  closeModal,
  currentUser,
}) => {
  const [localExpandedTab, setLocalExpandedTab] = useState(activeTab);
  const { t } = useLanguage();

  useEffect(() => {
    if (activeTab) {
      setLocalExpandedTab(activeTab);
    }
  }, [activeTab]);

  // 1. EARLY RETURN: If there's no modal or card, don't even try to render the HTML.
  // This prevents the "cannot read bgcontent of undefined" error.
  if (!activeModal || !activeCard) return null;

  const groupCardId = groupCardMap[activeModal];
  const groupCard = groupCardId ? getCard(groupCardId) : null;

  const handleAccordionToggle = (tabId) => {
    if (localExpandedTab === tabId) {
      setLocalExpandedTab(null);
    } else {
      setLocalExpandedTab(tabId);
      setActiveTab(tabId);
    }
  };

  return (
    <div
      id="modal-overlay"
      className="fixed inset-0 bg-dark-almostblack/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-200"
    >
      <div className="bg-light-soft w-[calc(100vw-20px)] h-[calc(100vh-20px)] sm:w-[95vw] sm:h-[90vh] lg:h-auto lg:max-w-[calc(95vh*16/9)] lg:aspect-video flex flex-col relative sm:border sm:border-light-border overflow-hidden rounded-2xl sm:rounded-2xl shadow-2xl sm:shadow-2xl">
        {/* Sticky Mobile Close Button */}
        <button
          onClick={closeModal}
          className="sm:hidden absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/90 backdrop-blur-lg shadow-md border border-gray-200/80 flex items-center justify-center text-red-500 active:scale-95 transition-all"
          title={t("modal.close", "Close Modal").text}
        >
          <i className="fas fa-times text-lg" />
        </button>

        {/* ── Modal header ─────────────────────────────────────────────── */}
        <div
          className={`flex items-center justify-between p-2 sm:p-3 lg:p-4 border-b border-light-border shrink-0 gap-3 ${activeCard.bgcontent}`}
        >
          {isTabbed ? (
            <div className="flex flex-col w-full">
              {/* Desktop view: Tabs Header */}
              <div className="hidden sm:flex flex-col sm:flex-row w-full gap-2 sm:gap-0">
                {activeGroup?.ids
                  ?.filter((tabId) => {
                    // Hide the Fee Structure tab for unauthenticated users
                    if (tabId === "fees" && !currentUser) return false;
                    return true;
                  })
                  .map((tabId) => {
                    const tabCard = getCard(tabId);
                    const isActive = activeTab === tabId;
                    if (!tabCard) return null;

                    return (
                      <div key={tabId} className="w-full sm:flex-1 sm:px-0.5">
                        <button
                          onClick={() => setActiveTab(tabId)}
                          className={`
                          flex w-full items-center gap-2 px-3 sm:px-4 
                          font-semibold text-xs sm:text-sm select-none
                          transition-all duration-150 text-white
                          ${
                            isActive
                              ? `${tabCard.color} shadow-inner py-3 sm:py-4 rounded-b-lg`
                              : `${tabCard.color} opacity-50 py-2 sm:py-3`
                          }
                        `}
                        >
                          <span
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/20" : "bg-light-soft"}`}
                          >
                            <i
                              className={`fas ${tabCard.icon} text-xs ${!isActive ? tabCard.textColor : ""}`}
                            />
                          </span>
                          <span>
                            <Translate id={tabCard.titleKey || tabCard.title}>
                              {tabCard.title}
                            </Translate>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                <button
                  onClick={closeModal}
                  className="hidden sm:flex w-12 h-12 rounded-full items-center justify-center bg-light-ui text-dark-primary hover:text-red-primary"
                >
                  <i className="fas fa-times" />
                </button>
              </div>

              {/* Mobile view: Group Title Header */}
              <div className="flex sm:hidden items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-12">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${groupCard?.color || activeCard.color}`}
                  >
                    <i
                      className={`fas ${groupCard?.icon || activeCard.icon}`}
                    />
                  </div>

                  <h3 className="text-base font-bold text-dark-deepblue break-words">
                    <Translate
                      id={
                        groupCard?.titleKey ||
                        activeCard.titleKey ||
                        groupCard?.title ||
                        activeCard.title
                      }
                    >
                      {groupCard?.title || activeCard.title}
                    </Translate>
                  </h3>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-12 sm:pr-0">
                  <div
                    className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white ${activeCard.color}`}
                  >
                    <i className={`fas ${activeCard.icon}`} />
                  </div>

                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-dark-deepblue break-words">
                    <Translate id={activeCard.titleKey || activeCard.title}>
                      {activeCard.title}
                    </Translate>
                  </h3>
                </div>

                <button
                  onClick={closeModal}
                  className="
                    hidden sm:flex
                    self-end sm:self-auto
                    shrink-0
                    w-10 h-10
                    rounded-full
                    bg-light-ui
                    flex items-center justify-center
                  "
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Modal content ────────────────────────────────────────────── */}
        <div
          className={`p-2 sm:p-4 lg:p-6 overflow-y-auto flex-1 ${activeCard.bgcontent}`}
        >
          {isTabbed ? (
            <>
              {/* Desktop View: activeCard content */}
              <div className="hidden sm:block">{activeCard.content}</div>

              {/* Mobile View: Collapsible Accordions */}
              <div className="block sm:hidden space-y-4">
                {activeGroup?.ids
                  ?.filter((tabId) => {
                    if (tabId === "fees" && !currentUser) return false;
                    return true;
                  })
                  .map((tabId) => {
                    const tabCard = getCard(tabId);
                    if (!tabCard) return null;
                    const isExpanded = localExpandedTab === tabId;

                    return (
                      <div
                        key={tabId}
                        className="rounded-[24px] border border-gray-200/80 overflow-hidden shadow-sm bg-white"
                      >
                        {/* Accordion header button */}
                        <button
                          type="button"
                          onClick={() => handleAccordionToggle(tabId)}
                          className={`w-full flex items-center justify-between p-4 font-bold text-sm transition-all duration-300 select-none ${
                            isExpanded
                              ? `${tabCard.color} text-white`
                              : "bg-white text-gray-800 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                isExpanded
                                  ? "bg-white/20 text-white"
                                  : `${tabCard.color} text-white`
                              }`}
                            >
                              <i className={`fas ${tabCard.icon} text-xs`} />
                            </span>
                            <span>
                              <Translate id={tabCard.titleKey || tabCard.title}>
                                {tabCard.title}
                              </Translate>
                            </span>
                          </div>
                          <i
                            className={`fas ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"} transition-transform duration-200 text-xs opacity-80`}
                          />
                        </button>

                        {/* Accordion content */}
                        {isExpanded && (
                          <div
                            className={`p-4 border-t border-gray-150/50 ${tabCard.bgcontent || "bg-light-soft"}`}
                          >
                            {tabCard.content}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            activeCard.content
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalContainer;
