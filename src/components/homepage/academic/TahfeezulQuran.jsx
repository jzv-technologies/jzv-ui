import React from "react";

const TahfeezulQuran = () => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col pb-6">
      <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 mb-6 sm:mb-8 bg-light-white p-6 sm:p-8 lg:p-10 rounded-2xl border-2 border-green-dark shadow-sm">
        <div className="bg-green-50 text-green-dark p-6 lg:p-8 rounded-full flex-shrink-0 mx-auto lg:mx-0">
          <i className="fas fa-book-quran text-5xl sm:text-6xl"></i>
        </div>
        <div className="flex-1 text-center lg:text-left">
          <h4 className="font-bold text-dark-almostblack mb-3">
            Tahfeez ul Quran
          </h4>
          <p className="lg:text-xl text-dark-charcoal leading-relaxed">
            <strong className="text-green-dark">Memorization</strong> &{" "}
            <strong className="text-green-dark">Recitation</strong> of the Holy
            Quran.
          </p>
          <p className="text-dark-muted mt-3 italic">
            "Tahfeez is the preservation of the Quran in heart and practice."
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
          <h5 className="font-bold text-dark-almostblack mb-5">
            <i className="fas fa-brain text-green-dark mr-3 shrink-0"></i> What
            is Tahfeez?
          </h5>
          <ul className="space-y-4 text-dark-charcoal">
            <li>
              <strong className="text-dark-deepblue">Tahfeez:</strong>{" "}
              Memorization of the entire Quran
            </li>
            <li>
              <strong className="text-dark-deepblue">Hifz:</strong> Protection
              and preservation of the memorized Quran
            </li>
            <li>
              <strong className="text-dark-deepblue">Duration:</strong> 2-3
              years depending on dedication
            </li>
            <li>
              <strong className="text-dark-deepblue">Age:</strong> Best started
              between 6-10 years
            </li>
            <li>
              <strong className="text-dark-deepblue">Outcome:</strong> Hafiz ul
              Quran (Protector of Quran)
            </li>
          </ul>
        </div>
        <div className="bg-light-bg p-6 sm:p-8 rounded-2xl border border-light-border">
          <h5 className="font-bold text-dark-almostblack mb-5">
            <i className="fas fa-star text-green-dark mr-3 shrink-0"></i>{" "}
            Benefits
          </h5>
          <ul className="space-y-4 text-dark-charcoal">
            <li>
              <strong className="text-dark-deepblue">Spiritual:</strong> Direct
              connection with Allah's words
            </li>
            <li>
              <strong className="text-dark-deepblue">Mental:</strong> Improves
              memory and concentration
            </li>
            <li>
              <strong className="text-dark-deepblue">Reward:</strong> Great
              reward in this life and hereafter
            </li>
            <li>
              <strong className="text-dark-deepblue">Leadership:</strong>{" "}
              Qualifies for leading prayers and teaching
            </li>
            <li>
              <strong className="text-dark-deepblue">Community:</strong>{" "}
              Respected position in Muslim community
            </li>
          </ul>
        </div>
      </div>
      <div className="bg-green-50 p-6 sm:p-8 rounded-2xl border border-green-light">
        <h5 className="font-bold text-green-dark mb-5">
          <i className="fas fa-heart text-green-dark mr-3 shrink-0"></i> Our
          Approach
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-dark-charcoal mb-3">
              <strong className="text-dark-deepblue">Methodology:</strong>
            </p>
            <ul className="space-y-2 text-dark-charcoal">
              <li>Repetition and revision</li>
              <li>Daily practice sessions</li>
              <li>Individual attention</li>
              <li>Group recitation</li>
            </ul>
          </div>
          <div>
            <p className="text-dark-charcoal mb-3">
              <strong className="text-dark-deepblue">Support:</strong>
            </p>
            <ul className="space-y-2 text-dark-charcoal">
              <li>Qualified Qari teachers</li>
              <li>Progress tracking</li>
              <li>Motivational sessions</li>
              <li>Parent involvement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TahfeezulQuran;
