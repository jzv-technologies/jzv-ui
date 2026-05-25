import React from "react";

const WhyJzv = () => {
  return (
    <div className="flex flex-col justify-center max-w-5xl mx-auto py-6">
      <p className="mb-6 lg:mb-8 text-xl text-dark-primary text-justify">
        Jamia Zaytoonah Vellore is a modern Islamic educational institution committed to nurturing students with strong faith, noble character, and academic excellence. We combine authentic Islamic learning with contemporary education to prepare students for the challenges of the modern world while remaining firmly connected to Islamic values.
      </p>

      <p className="mb-6 lg:mb-8 text-xl text-pink-primary text-justify">
        <strong>
          Our institution focuses on holistic development through:
        </strong>
      </p>
      <div className="p-6 sm:p-8 rounded-2xl shadow-sm border border-light-border bg-light-white">
        <ul className="list-none space-y-3 text-lg sm:text-lg lg:text-xl text-dark-charcoal">
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              Islamic education rooted in the Qur’an and Sunnah
            </span>
          </li>
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              Modern academic excellence and practical life skills
            </span>
          </li>
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              Multilingual literacy in <span className="font-semibold italic"> Arabic, English, Tamil, and Urdu</span>
            </span>
          </li>
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              21st-century competencies such as communication, collaboration, creativity, and critical thinking
            </span>
          </li>
        </ul>
      </div>
      <p className="mb-6 lg:mb-8 text-xl text-dark-primary text-justify mt-6">
        We believe every child possesses unique potential that can flourish through proper guidance, discipline, and a nurturing environment. Our goal is to shape confident, responsible, and compassionate individuals who contribute positively to society.
      </p>
    </div>
  );
};

export default WhyJzv;
