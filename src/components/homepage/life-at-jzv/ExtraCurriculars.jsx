import React from "react";

const ExtraCurriculars = () => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col justify-center pb-10">
      <div className="text-center mb-8 sm:mb-12">
        <h4 className="font-bold text-pink-deep mb-4 sm:mb-6">
          Holistic Growth
        </h4>
        <p className="text-dark-charcoal leading-relaxed max-w-4xl mx-auto">
          At JZV, we believe education extends far beyond the classroom walls.
          Our extracurricular programs are designed to build confidence,
          leadership, and practical life skills in accordance with our 4Ts
          methodology.
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
  );
};

export default ExtraCurriculars;
