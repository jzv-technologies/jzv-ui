import React from "react";

const FeeStructure = () => {
  return (
    <div className="w-full flex flex-col pb-6">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6 border-b-2 border-light-ui pb-4 text-center sm:text-left">
        <div className="flex items-center gap-3 sm:gap-4">
          <i className="fas fa-wallet text-teal-primary shrink-0"></i>
          <h4 className="font-bold text-teal-dark m-0">Fee Structure</h4>
        </div>
        <span className="bg-teal-50 text-teal-dark font-bold px-4 py-1 rounded-full text-base sm:text-base border border-teal-light sm:ml-4">
          Academic Year 2026-27
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 lg:min-h-0">
        <div className="bg-light-white rounded-2xl border border-light-border shadow-sm flex flex-col h-full overflow-hidden">
          <div className="bg-light-bg px-5 sm:px-6 py-4 border-b border-light-border">
            <h5 className="font-bold text-dark-almostblack m-0">
              Yearly Core Fees
            </h5>
          </div>
          <div className="flex flex-col flex-1 p-5 sm:p-6 space-y-4 justify-center">
            <div className="flex justify-between items-center border-b border-light-ui pb-4">
              <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                <i className="fas fa-book-open text-blue-primary mr-2 shrink-0"></i>
                Admission Fee{" "}
                <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1">
                  This fee applies to every academic year.
                </span>
              </span>
              <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                ₹5,000
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-light-ui pb-4">
              <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                <i className="fas fa-graduation-cap text-brand-dark mr-2 shrink-0"></i>
                Tuition Fee{" "}
              </span>
              <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                ₹15,000
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-light-ui pb-4">
              <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                <i className="fas fa-person-biking text-green-dark mr-2 shrink-0"></i>
                Miscellaneous{" "}
                <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                  Stationery, Exam, Marks Card, Sports, App, ID
                </span>
              </span>
              <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                ₹5,000
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-light-ui pb-4">
              <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                <i className="fas fa-book text-pink-dark mr-2 shrink-0"></i>
                Study Material
                <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                  Approx.
                </span>
              </span>
              <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                ₹4,000- ₹4,500{" "}
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-light-ui pb-4">
              <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                <i className="fas fa-bus text-yellow-gold mr-2 shrink-0"></i>
                Transportation Fee
                <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                  For 11 months
                </span>
              </span>
              <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                ₹18,150 - ₹24,200{" "}
              </strong>
            </div>
            <div className="flex justify-between items-center border-b border-light-ui pb-4">
              <span className="text-dark-primary font-bold text-lg sm:text-xl pr-2">
                <i className="fas fa-utensils text-pine-900 mr-2 shrink-0"></i>
                Food & Snacks
                <span className="block text-xs sm:text-base text-dark-muted font-normal mt-1 leading-tight">
                  Breakfast, lunch, milk twice a day & snacks
                  <br /> for 11 months
                </span>
              </span>
              <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                ₹18,150{" "}
              </strong>
            </div>
          </div>
          <div className="bg-light-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm bg-yellow-lbg">
            <h5 className="font-bold text-dark-almostblack mb-2">
              <i className="fas fa-shopping-bag text-orange-primary mr-2 shrink-0"></i>
              Additional Items Required
            </h5>
            <p className="text-sm sm:text-lg text-dark-charcoal leading-snug m-0">
              Sports shoes, uniform black shoes, stationery, sleeping bag, water
              bottle.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-light-white p-5 sm:p-6 rounded-2xl border border-light-border shadow-sm flex-1 flex flex-col justify-center">
            <h5 className="font-bold text-dark-almostblack mb-4">
              <i className="fas fa-tshirt text-brand-soft mr-2 shrink-0"></i>
              Uniform Details
            </h5>
            <ul className="list-disc ml-5 sm:ml-6 text-sm sm:text-lg text-dark-charcoal space-y-2 mb-4">
              <li>2 sets purple Kurta & Pajama</li>
              <li>1 set white Kurta & Pajama</li>
              <li>3 sets Waistcoat & 2 Topi</li>
              <li>2 sets of Sports Uniform</li>
            </ul>
            <div className="bg-light-bg p-3 rounded-lg border border-light-ui mt-auto">
              <p className="text-xs sm:text-base font-semibold text-brand m-0">
                <i className="fas fa-info-circle mr-2 shrink-0"></i>Uniform cost
                is based on size.
                <strong className="text-dark-charcoal text-base sm:text-lg italic text-right">
                  (₹4,500 to ₹6,500)
                </strong>
              </p>
            </div>
          </div>

          <div className="bg-red-50 p-6 sm:p-8 rounded-2xl border-2 border-red-primary shadow-sm flex-1 flex flex-col justify-center gap-6 sm:gap-8">
            <div className="text-center">
              <i className="fas fa-money-bill-wave text-red-primary mb-3 sm:mb-4"></i>
              <h4 className="font-black text-red-dark mb-1 sm:mb-2 uppercase">
                Single Payment ₹55,000
              </h4>
              <p className="font-bold text-red-primary uppercase tracking-wider m-0">
                3 Installments Permitted <br />
                3x ₹20,000 = ₹60,000
              </p>
            </div>
            <div className="border-t-2 border-red-200 mx-4 sm:mx-8"></div>
            <div className="text-center">
              <i className="fas fa-ban text-xl sm:text-4xl text-red-primary mb-2 sm:mb-3"></i>
              <p className="font-bold text-red-dark m-0">
                Fees once paid will <br />
                not be refunded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeStructure;
