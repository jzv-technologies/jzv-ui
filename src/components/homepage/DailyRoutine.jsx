import React from "react";

const DailyRoutine = () => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        <div className="lg:col-span-2 bg-light-white p-6 sm:p-10 rounded-2xl shadow-sm border border-light-border">
          <h5 className="font-bold text-brand-dark mb-8 border-b-2 border-light-ui pb-4">
            <i className="fas fa-calendar-day mr-3 text-brand shrink-0"></i>{" "}
            Monday to Friday Schedule
          </h5>
          <div className="relative border-l-4 border-brand-soft ml-4 space-y-8 pb-4">
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-brand w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-brand block mb-1">06:50 AM</span>
              <h6 className="font-bold text-dark-deepblue">Reporting Time</h6>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-brand-soft w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-brand block mb-1">07:00 AM</span>
              <h6 className="font-bold text-dark-deepblue">Morning Assembly</h6>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-pink-primary w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-pink-dark block mb-1">
                07:15 AM
              </span>
              <h6 className="font-bold text-dark-deepblue">Classes Commence</h6>
              <p className="text-dark-muted mt-1">Quran Classes</p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-blue-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-blue-dark block mb-1">
                08:30 AM
              </span>
              <h6 className="font-bold text-dark-deepblue">Breakfast Break</h6>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-pink-dark block mb-1">
                09:00 AM
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Continued Classes
              </h6>
              <p className="text-dark-muted mt-1">
                First session 3 Academic Classes
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-blue-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-blue-dark block mb-1">
                11:00 AM
              </span>
              <h6 className="font-bold text-dark-deepblue">Short Break</h6>
              <p className="text-dark-muted mt-1">
                Quick refreshment break, students can have a light snack or use
                the restroom.
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-pink-dark block mb-1">
                11:20 AM
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Continued Classes
              </h6>
              <p className="text-dark-muted mt-1">
                Second session 3 Academic Classes
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-green-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-green-dark block mb-1">
                01:20 PM (Zuhr)
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Zuhr Prayer, Lunch & Nap Time
              </h6>
              <p className="text-dark-muted mt-1">
                Includes Qailulah (Sunnah nap) classes.
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-pink-dark block mb-1">
                02:50 PM
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Continued Classes
              </h6>
              <p className="text-dark-muted mt-1">
                Third session 2 Academic Classes
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-orange-primary w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-orange-dark block mb-1">
                04:10 PM
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Sports & Agility Period
              </h6>
              <p className="text-dark-muted mt-1">
                Requires sports uniform and sports shoes.
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-green-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-green-dark block mb-1">
                05:10 PM (Asr)
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Asr Prayer & Snacks Time
              </h6>
              <p className="text-dark-muted mt-1">
                Milk and healthy snacks provided, students can also have their
                own snacks if they prefer.
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-pink-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-pink-dark block mb-1">
                05:50 PM
              </span>
              <h6 className="font-bold text-dark-deepblue">
                Life Skills & Personal Development
              </h6>
              <p className="text-dark-muted mt-1">
                Hifz-e-Surah, masnoon dua and applied sunnah.
              </p>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-green-dark w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-green-dark block mb-1">
                06:45 PM (Maghrib)
              </span>
              <h6 className="font-bold text-dark-deepblue">Maghrib Prayer</h6>
            </div>
            <div className="relative pl-6 sm:pl-8">
              <div className="absolute -left-[14px] top-1 bg-red-primary w-6 h-6 rounded-full border-4 border-light-white"></div>
              <span className="font-bold text-red-dark block mb-1">
                07:00 PM
              </span>
              <h6 className="font-bold text-dark-deepblue">Dispersal</h6>
              <p className="text-dark-muted mt-1">Students depart for home.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div className="bg-light-white p-6 sm:p-8 rounded-2xl shadow-sm border-t-8 border-orange-primary border-l border-r border-b border-light-border">
            <h5 className="font-bold text-dark-almostblack mb-6">
              <i className="fas fa-calendar-week mr-2 text-orange-primary shrink-0"></i>{" "}
              Weekend Schedule
            </h5>
            <ul className="space-y-5">
              <li className="bg-orange-50 p-4 rounded-xl border border-orange-light">
                <span className="font-bold text-orange-dark block mb-1">
                  Saturday
                </span>
                <span className="text-dark-charcoal">
                  Half Day. Dispersal immediately after Zuhr prayer.
                </span>
              </li>
              <li className="bg-red-50 p-4 rounded-xl border border-red-light">
                <span className="font-bold text-red-dark block mb-1">
                  Sunday
                </span>
                <span className="text-dark-charcoal">Weekly Holiday.</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 p-6 sm:p-8 rounded-2xl shadow-sm border border-green-light">
            <h5 className="font-bold text-green-dark mb-4">
              <i className="fas fa-mosque mr-2 text-green-dark shrink-0"></i>{" "}
              Namaz Guidelines
            </h5>
            <p className="text-dark-charcoal font-semibold mb-3">
              4 Salahs are offered on campus:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-dark-charcoal mb-5">
              <li>Zuhr</li>
              <li>Asr</li>
              <li>Maghrib</li>
            </ul>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-muted">
              <p className="text-dark-deepblue m-0">
                <strong>Note:</strong> Fajr & Isha prayers are the
                responsibility of the parents to ensure they are offered at home
                or the local masjid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyRoutine;
