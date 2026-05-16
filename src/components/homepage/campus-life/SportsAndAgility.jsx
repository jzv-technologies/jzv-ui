import React from "react";

const SportsAndAgility = () => {
  return (
    <div className="max-w-6xl mx-auto text-center flex flex-col justify-center pb-10">
      <i className="fas fa-running text-4xl sm:text-6xl text-brand-primary mb-6 sm:mb-8"></i>
      <h4 className="font-bold text-brand-dark mb-4 sm:mb-6">
        Physical Development
      </h4>
      <p className="text-lg sm:text-xl text-dark-charcoal leading-relaxed max-w-4xl mx-auto mb-8 sm:mb-12">
        A strong believer is better than a weak believer. Our campus features
        sports playgrounds professionally designed specifically for agility
        sports.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto w-full">
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-b-4 border-brand-primary">
          <i className="fas fa-heartbeat text-3xl sm:text-4xl text-orange-burnt mb-4"></i>
          <h5 className="font-bold text-dark-almostblack">Fitness</h5>
          <p className="text-dark-muted mt-2">
            Daily routines to keep students physically strong and mentally
            alert.
          </p>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-b-4 border-brand-primary">
          <i className="fas fa-stopwatch text-3xl sm:text-4xl text-pink-dark mb-4"></i>
          <h5 className="font-bold text-dark-almostblack">Agility</h5>
          <p className="text-dark-muted mt-2">
            Specialized training fields to improve reflexes, speed, and
            coordination.
          </p>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-b-4 border-brand-primary">
          <i className="fas fa-users text-3xl sm:text-4xl text-brand-dark mb-4"></i>
          <h5 className="font-bold text-dark-almostblack">Teamwork</h5>
          <p className="text-dark-muted mt-2">
            Group sports fostering collaboration, leadership, and mutual
            respect.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SportsAndAgility;
