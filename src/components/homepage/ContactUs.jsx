import React from "react";

const ContactUs = () => {
  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Helpline Numbers */}
        <div className="bg-teal-50 p-6 rounded-xl border border-teal-light shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-teal-dark mb-4 text-lg flex items-center gap-2 border-b border-teal-200 pb-2">
            <i className="fas fa-phone-alt"></i> Helpline Numbers
          </h3>
          <div className="space-y-4 text-dark-charcoal">
            <p className="flex items-center gap-3">
              <i className="fas fa-user-tie text-teal-primary text-xl w-6 text-center"></i>
              <span className="flex flex-col">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Principal Office</span>
                <a href="tel:+918884148931" className="font-medium hover:text-teal-dark transition-colors">+91 88841 48931</a>
              </span>
            </p>
            <p className="flex items-center gap-3">
              <i className="fas fa-user-shield text-teal-primary text-xl w-6 text-center"></i>
              <span className="flex flex-col">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Admin Office</span>
                <a href="tel:+918884148935" className="font-medium hover:text-teal-dark transition-colors">+91 88841 48935</a>
              </span>
            </p>
          </div>
        </div>

        {/* Email Address */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-light shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-blue-dark mb-4 text-lg flex items-center gap-2 border-b border-blue-200 pb-2">
            <i className="fas fa-envelope"></i> Email Address
          </h3>
          <div className="text-dark-charcoal mt-2">
            <p className="flex items-center gap-3">
              <i className="fas fa-at text-blue-primary text-xl w-6 text-center"></i>
              <a href="mailto:jamia.zaytoonah@gmail.com" className="font-medium hover:text-blue-dark transition-colors break-all">
                jamia.zaytoonah@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Office Hours */}
        <div className="bg-orange-50 p-6 rounded-xl border border-orange-light shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-orange-dark mb-4 text-lg flex items-center gap-2 border-b border-orange-200 pb-2">
            <i className="fas fa-clock"></i> Office Hours
          </h3>
          <ul className="space-y-3 text-dark-charcoal">
            <li className="flex items-center gap-3">
              <i className="fas fa-calendar-day text-orange-primary text-lg w-6 text-center"></i>
              <span className="flex flex-col">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Mon - Fri</span>
                <span className="font-medium">7:00 AM - 7:00 PM</span>
              </span>
            </li>
            <li className="flex items-center gap-3">
              <i className="fas fa-calendar-alt text-orange-primary text-lg w-6 text-center"></i>
              <span className="flex flex-col">
                <span className="text-xs text-dark-muted font-bold uppercase tracking-wider">Sat</span>
                <span className="font-medium">7:00 AM - 2:00 PM</span>
              </span>
            </li>
            <li className="flex items-center gap-3 mt-4 bg-white/60 p-2 rounded-lg">
              <i className="fas fa-calendar-times text-red-primary text-lg w-6 text-center"></i>
              <span className="text-red-primary font-bold">Sunday Closed</span>
            </li>
          </ul>
        </div>

        {/* Campus Address */}
        <div className="bg-pink-50 p-6 rounded-xl border border-pink-light shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-pink-dark mb-4 text-lg flex items-center gap-2 border-b border-pink-200 pb-2">
            <i className="fas fa-map-marker-alt"></i> Campus Address
          </h3>
          <div className="text-dark-charcoal leading-relaxed mb-5 flex items-start gap-3">
            <i className="fas fa-building text-pink-primary text-xl mt-1 w-6 text-center shrink-0"></i>
            <address className="not-italic">
              <strong className="text-lg block mb-1">Jamia Zaytoonah</strong>
              Ussoor to Anaicut Main Road,<br />
              Habib Nagar, Budur Village,<br />
              Vellore District, Tamil Nadu - 632 105
            </address>
          </div>
          <a
            href="https://maps.app.goo.gl/iRhNLpETdSq4icCv8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full justify-center items-center gap-2 px-4 py-3 bg-pink-primary text-white font-bold rounded-xl hover:bg-pink-dark transition-colors shadow-sm active:scale-[0.98]"
          >
            <i className="fas fa-map-marked-alt"></i> View on Google Maps
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
