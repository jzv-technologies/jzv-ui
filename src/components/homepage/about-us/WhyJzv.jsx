import React from "react";

const WhyJzv = () => {
  return (
    <div className="flex flex-col justify-center max-w-5xl mx-auto py-6">
      <p className="mb-6 lg:mb-8 text-xl text-dark-primary">
        Jamia Zaytoonah Vellore represents a modern madrasa system integrated
        with 21st-century competencies. Our goal is to prepare your child to
        succeed in this Life and the Hereafter.
      </p>

      <div className="p-6 sm:p-8 rounded-2xl shadow-sm border border-light-border bg-light-white">
        <ul className="list-none space-y-6 text-lg sm:text-lg lg:text-xl text-dark-charcoal">
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              Developing literacy skills in{" "}
              <strong>Arabic, English, Tamil and Urdu.</strong>
            </span>
          </li>
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              Emphasis on 21st Century Skill Development including Critical
              Thinking, Creative Thinking, Communication, and Collaboration.
            </span>
          </li>
          <li className="flex items-start gap-4">
            <i className="fas fa-check-circle text-pink-primary mt-1  shrink-0"></i>
            <span>
              We believe that a child is an uncut diamond, and their value is
              determined by careful shaping and guidance.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WhyJzv;
