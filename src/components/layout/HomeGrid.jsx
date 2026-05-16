import React from "react";

const HomeGrid = ({ gridCards, openModal }) => {
  return (
    <main className="w-screen mt-8 sm:mt-12 min-h-[70vh] bg-cover bg-no-repeat bg-center bg-[url('/media/jzv-building01.png')]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-6 sm:pb-8">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          id="card-container"
        >
          {gridCards.map((card) => (
            <div
              key={card.id}
              tabIndex={0}
              className="bg-light-white bg-opacity-90 rounded-2xl shadow-sm border border-light-border p-5 sm:p-6 lg:p-8 cursor-pointer transition-all duration-200 ease-out group overflow-hidden relative select-none flex flex-col items-center justify-center text-center h-full min-h-[160px] hover:bg-olive-500"
              onClick={() => openModal(card.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openModal(card.id);
                }
              }}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-2 ${card.color}`}
              />
              <div
                className={`text-3xl sm:text-4xl mb-3 sm:mb-4 mt-2 group-hover:scale-110 transition-transform origin-center ${card.textColor} group-hover:text-pine-900 duration-200 ease-out`}
              >
                <i className={`fas ${card.icon}`} />
              </div>
              <h3 className="font-bold text-dark-deepblue leading-tight group-hover:text-light-white transition-colors duration-200">
                {card.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default HomeGrid;
