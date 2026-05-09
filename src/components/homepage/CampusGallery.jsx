import React from "react";

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

export default CampusGallery;
