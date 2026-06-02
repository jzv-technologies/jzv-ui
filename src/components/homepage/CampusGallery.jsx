import React from "react";
import Translate from "../Translate";

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

const CampusGallery = ({
  galleryIndex,
  galleryTitle,
  setGalleryIndex,
  setGalleryTitle,
}) => {
  const currentIndex = galleryItems.findIndex(
    (item) => item.id === galleryIndex,
  );
  const titleKey = galleryTitle
    ? `home.campus_gallery.${galleryTitle.toLowerCase().replace(/ & /g, "_").replace(/ /g, "_")}`
    : "";

  const handlePrev = () => {
    const prevIndex =
      (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    const prevItem = galleryItems[prevIndex];
    setGalleryIndex(prevItem.id);
    setGalleryTitle(prevItem.label);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % galleryItems.length;
    const nextItem = galleryItems[nextIndex];
    setGalleryIndex(nextItem.id);
    setGalleryTitle(nextItem.label);
  };

  const buttonClass = (item) =>
    item.id === galleryIndex
      ? "gallery-btn w-full text-left px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-pink-primary text-white font-bold whitespace-nowrap lg:whitespace-normal transition-all duration-200 ease-out active:scale-[0.98] shadow-sm border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-dark"
      : "gallery-btn w-full text-left px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-light-white border border-light-border hover:border-pink-primary hover:bg-pink-50 font-semibold text-dark-charcoal whitespace-nowrap lg:whitespace-normal transition-all duration-200 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-primary";

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 h-full">
      {/* Mobile Navigation Header */}
      <div className="flex lg:hidden items-center justify-between bg-white border border-light-border rounded-2xl p-3 shadow-sm select-none">
        <button
          type="button"
          onClick={handlePrev}
          className="w-10 h-10 rounded-xl bg-pink-primary/10 hover:bg-pink-primary/20 text-pink-primary flex items-center justify-center transition-colors active:scale-95 focus:outline-none"
          aria-label="Previous zone"
        >
          <i className="fas fa-chevron-left text-sm" />
        </button>

        <span className="font-bold text-dark-deepblue text-base text-center px-4 flex-1">
          <Translate id={titleKey}>{galleryTitle}</Translate>
        </span>

        <button
          type="button"
          onClick={handleNext}
          className="w-10 h-10 rounded-xl bg-pink-primary/10 hover:bg-pink-primary/20 text-pink-primary flex items-center justify-center transition-colors active:scale-95 focus:outline-none"
          aria-label="Next zone"
        >
          <i className="fas fa-chevron-right text-sm" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col gap-3 overflow-y-auto pb-4 lg:pb-0 scrollbar-hide flex-shrink-0 lg:border-r border-light-border lg:pr-6 lg:w-1/4">
        <h4 className="font-bold text-dark-deepblue mb-2 uppercase tracking-wider">
          <Translate id="home.campus_gallery.campus_zones">
            Campus Zones
          </Translate>
        </h4>
        {galleryItems.map((item) => {
          const key = `home.campus_gallery.${item.label.toLowerCase().replace(/ & /g, "_").replace(/ /g, "_")}`;
          return (
            <button
              key={item.id}
              onClick={() => {
                setGalleryIndex(item.id);
                setGalleryTitle(item.label);
              }}
              className={buttonClass(item)}
            >
              <Translate id={key}>{item.label}</Translate>
            </button>
          );
        })}
      </div>

      {/* Image container */}
      <div className="w-full lg:w-3/4 bg-light-ui rounded-2xl sm:rounded-3xl border border-light-border overflow-hidden flex flex-col relative min-h-[300px] sm:min-h-[400px] lg:min-h-full shadow-inner flex-1 group">
        <img
          src={`https://usmaniainstitute.com/media/admissioncounselling/campus/${galleryIndex}.png`}
          className="w-full h-full object-cover absolute inset-0 transition-opacity duration-300"
          alt="Campus View"
        />
        <div className="absolute inset-0 bg-dark-charcoal opacity-10 -z-10 flex items-center justify-center">
          <i className="fas fa-image text-4xl sm:text-6xl text-dark-muted"></i>
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-dark-almostblack to-transparent p-6 sm:p-8 pt-20 sm:pt-24 pointer-events-none hidden lg:block">
          <h3 className="text-white text-xl sm:text-4xl lg:text-5xl font-bold tracking-wide drop-shadow-md">
            <Translate id={titleKey}>{galleryTitle}</Translate>
          </h3>
        </div>
      </div>
    </div>
  );
};

export default CampusGallery;
