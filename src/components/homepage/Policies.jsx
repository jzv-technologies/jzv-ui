import React from "react";

const Policies = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 py-4 pb-10">
      <div className="text-center mb-8 sm:mb-10">
        <h4 className="font-bold text-dark-deepblue mb-3">General Policies</h4>
        <p className="text-base sm:text-base text-dark-muted max-w-3xl mx-auto">
          Guidelines and code of conduct for maintaining a disciplined and
          harmonious educational environment.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-orange-dark mb-4 flex items-center">
            <i className="fas fa-clock mr-3 text-orange-primary shrink-0"></i>{" "}
            Timings
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              The institute gate will be closed at <strong>7:15 AM</strong>.
            </li>
            <li>All students must arrive before this time.</li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-blue-dark mb-4 flex items-center">
            <i className="fas fa-calendar-check mr-3 text-blue-primary shrink-0"></i>{" "}
            Attendance
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              A minimum of <strong>85% attendance</strong> is required to be
              eligible for examinations and promotion.
            </li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-teal-dark mb-4 flex items-center">
            <i className="fas fa-tshirt mr-3 text-teal-primary shrink-0"></i>{" "}
            Uniform
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>Students must wear the prescribed uniform at all times.</li>
            <li>Uniform must be neat, clean, and properly ironed.</li>
            <li>Sports uniform and shoes must be worn during playtime.</li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-brand-dark mb-4 flex items-center">
            <i className="fas fa-id-badge mr-3 text-brand shrink-0"></i>{" "}
            Grooming & ID
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              Students must maintain a proper haircut (Level 2, equal length)
              every month.
            </li>
            <li>
              Nails will be checked every Friday and must be kept short and
              well-trimmed.
            </li>
            <li>
              Wearing an ID card daily is <strong>mandatory</strong>.
            </li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-green-dark mb-4 flex items-center">
            <i className="fas fa-utensils mr-3 text-green-dark shrink-0"></i>{" "}
            Food & Water
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>Junk food is strictly not allowed on campus.</li>
            <li>
              Students are not permitted to leave the campus to purchase food.
            </li>
            <li>All students must bring their own water bottles.</li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-blue-dark mb-4 flex items-center">
            <i className="fas fa-language mr-3 text-blue-bright shrink-0"></i>{" "}
            Language
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              Only <strong>Arabic and English</strong> are permitted to be
              spoken within the campus.
            </li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-red-dark mb-4 flex items-center">
            <i className="fas fa-balance-scale mr-3 text-red-primary shrink-0"></i>{" "}
            Discipline
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>Any form of argument or fighting is strictly prohibited.</li>
            <li>
              Use of abusive language, bad words, teasing, bullying, or any form
              of ragging is strictly prohibited.
            </li>
            <li>Violations may lead to strict disciplinary action.</li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-red-dark mb-4 flex items-center">
            <i className="fas fa-ban mr-3 text-red-primary shrink-0"></i>{" "}
            Prohibited Items
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              Mobile phones, smart devices, smart watches, toys, and sports
              items are not allowed unless permitted.
            </li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-pink-dark mb-4 flex items-center">
            <i className="fas fa-bed mr-3 text-pink-primary shrink-0"></i> Nap
            Time
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>Students must bring a proper sleeping bag.</li>
            <li>Students without it may be sent back home.</li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-orange-dark mb-4 flex items-center">
            <i className="fas fa-door-open mr-3 text-orange-burnt shrink-0"></i>{" "}
            Exit & Pickup
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              Students cannot leave during working hours without permission.
            </li>
            <li>
              A parent (father or mother) must come in person for early pickup.
            </li>
            <li>
              Gate pass is mandatory for exit and must be shown at the gate.
            </li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-teal-dark mb-4 flex items-center">
            <i className="fas fa-bus-alt mr-3 text-teal-primary shrink-0"></i>{" "}
            Transport Fee
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>Transport fees are applicable for 12 months.</li>
            <li>
              Parents using transport services must pay the full annual fee.
            </li>
          </ul>
        </div>
        <div className="bg-light-white p-6 sm:p-8 rounded-2xl border border-light-border shadow-sm hover:shadow-md transition-all duration-200">
          <h5 className="font-bold text-dark-almostblack mb-4 flex items-center">
            <i className="fas fa-motorcycle mr-3 text-dark-muted shrink-0"></i>{" "}
            Transport & Vehicles
          </h5>
          <ul className="list-disc ml-5 sm:ml-6 space-y-2 text-dark-charcoal">
            <li>
              Students are not allowed to bring vehicles inside the campus.
            </li>
            <li>
              Students below 18 years are strictly prohibited from using
              two-wheelers. Parents are requested to arrange alternative
              transport for such students.
            </li>
            <li>
              Students aged 18 and above with a valid license may park outside
              the institute in designated areas.
            </li>
            <li>
              The institute is not responsible for any violations or damages.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Policies;
