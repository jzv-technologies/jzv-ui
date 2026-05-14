import React from "react";

const _4Ts = () => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col py-4">
      <p className="mb-10 lg:text-xl text-center text-dark-primary font-medium">
        The 4Ts pedagogy is based on the balanced fusion of Taleem, Tazkiyah,
        Tadeeb, and Tableegh for holistic development.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-1">
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-blue-bright shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
          <h5 className="font-bold mb-4 text-blue-dark">
            <i className="fas fa-book-open text-blue-bright mr-2"></i> Taleem
            (Knowledge)
          </h5>
          <p className="lg:text-xl text-dark-charcoal m-0">
            Imparting or receiving knowledge through instruction and training
            tailored to a child's developmental stages.
          </p>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-green-bright shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
          <h5 className="font-bold mb-4 text-green-dark">
            <i className="fas fa-heart text-green-bright mr-2"></i> Tazkiyah
            (Purification)
          </h5>
          <p className="lg:text-xl text-dark-charcoal m-0">
            The spiritual purification of the heart and soul, removing inner
            diseases to foster sincerity and the remembrance of Almighty Allah.
          </p>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-yellow-gold shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
          <h5 className="font-bold mb-4 text-yellow-dark">
            <i className="fas fa-user-shield text-yellow-gold mr-2"></i> Tadeeb
            (Character)
          </h5>
          <p className="lg:text-xl text-dark-charcoal m-0">
            The process of character-building strictly according to the Sunnah.
          </p>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border-t-8 border-brand-bright shadow-sm transition-all duration-200 ease-out flex flex-col justify-center">
          <h5 className="font-bold mb-4 text-brand-dark">
            <i className="fas fa-bullhorn text-brand-bright mr-2"></i> Tableegh
            (Preaching)
          </h5>
          <p className="lg:text-xl text-dark-charcoal m-0">
            Training students to preach Islamic teachings with knowledge,
            wisdom, patience, and an understanding of cultures.
          </p>
        </div>
      </div>
    </div>
  );
};

export default _4Ts;
