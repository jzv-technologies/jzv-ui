import React from "react";

const OpeningsModal = () => {
  const openings = [
    {
      title: "اللغة العربية",
      subtitle: "Arabic Language & Hadees Teacher",
      description:
        "نبحث عن مُعلّم لغة عربية وحديث متحمس وذو خبرة، قادر على تعليم الطلاب بطريقة طبيعية تشبه تعلّم اللغة الأم، مع التركيز على تنمية مهارات التحدث والقراءة والكتابة، وغرس حب اللغة العربية والسنة النبوية في نفوس الطلاب.",
      badge: "Arabic",
      color: "pink-primary",
    },
    {
      title: "ENGLISH TEACHER",
      subtitle: "Female Preferred",
      description:
        "We are looking for a passionate and fluent English Language Instructor who can help students learn English like native speakers. The ideal candidate should create an engaging, interactive, and confidence-building classroom environment using modern teaching methodologies. Science or Engineering background is a plus, but not mandatory.",
      badge: "English",
      color: "blue-primary",
    },
    {
      title: "தமிழ் ஆசிரியர்",
      subtitle: "Female Preferred",
      description:
        "மாணவர்கள் தமிழை  இயல்பாக பேச, எழுத மற்றும் வாசிக்கக் கற்றுக் கொடுகிக்க திறமையான மற்றும் அர்ப்பணிப்புள்ள தமிழ் ஆசிரியர் தேவை. மாணவர்களின் மொழித்திறனை வளர்க்கும் உற்சாகமான கற்றல் சூழலை உருவாக்கும் திறன் அவசியம்.",
      badge: "Tamil",
      color: "brand-primary",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-primary/10 text-pink-primary text-sm font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-pink-primary"></span>
          WE ARE HIRING
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-dark-primary mb-4">
          Join Our Mission
        </h2>

        <p className="max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-dark-charcoal leading-relaxed">
          Become part of a modern madrasa dedicated to nurturing faith,
          character, language excellence, and 21st-century skills in students.
        </p>
      </div>

      {/* Opening Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {openings.map((job, index) => (
          <div
            key={index}
            className="
              group relative overflow-hidden
              rounded-3xl border border-light-border
              bg-light-white
              p-6 sm:p-7
              shadow-sm hover:shadow-xl
              transition-all duration-300
              hover:-translate-y-1
            "
          >
            {/* Top Accent */}
            <div
              className={`absolute top-0 left-0 w-full h-1 bg-${job.color}`}
            ></div>

            {/* Badge */}
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full bg-${job.color}/10 text-${job.color} text-xs font-semibold mb-5`}
            >
              {job.badge}
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-bold  mb-2 leading-snug">
              {job.title}
            </h3>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-medium text-pink-primary mb-5">
              {job.subtitle}
            </p>

            {/* Description */}
            <p className="text-base sm:text-lg leading-relaxed text-dark-charcoal text-justify">
              {job.description}
            </p>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-dark-primary font-medium">
                <i className="fas fa-briefcase text-pink-primary"></i>
                Full Time
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Note */}
      <div
        className="
          mt-8 sm:mt-10
          rounded-2xl border border-light-border
          bg-light-white
          p-5 sm:p-6
          text-center
        "
      >
        <p className="text-base sm:text-lg text-dark-charcoal leading-relaxed">
          We welcome educators who are passionate about inspiring students with
          strong values, language excellence, and meaningful learning
          experiences.
        </p>
      </div>
    </div>
  );
};

export default OpeningsModal;
