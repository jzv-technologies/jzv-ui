import React from "react";
import Translate from "./Translate";

const RoleSelectionDashboard = ({ userRoles, onSelectView }) => {
  const portalTypes = [
    {
      id: "parent",
      title: "Parent Portal",
      titleKey: "role_selection.parent.title",
      icon: "fa-home",
      description: "Manage your child's education and progress.",
      descriptionKey: "role_selection.parent.description",
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-200",
    },
    {
      id: "teacher",
      title: "Teacher Portal",
      titleKey: "role_selection.teacher.title",
      icon: "fa-chalkboard-user",
      description: "Access class records and student management.",
      descriptionKey: "role_selection.teacher.description",
      color: "from-green-500 to-green-600",
      shadow: "shadow-green-200",
    },
    {
      id: "management",
      title: "Management Portal",
      titleKey: "role_selection.management.title",
      icon: "fa-users-gear",
      description: "Institute operations and financial oversight.",
      descriptionKey: "role_selection.management.description",
      color: "from-purple-500 to-purple-600",
      shadow: "shadow-purple-200",
    },
    {
      id: "admin",
      title: "Admin Portal",
      titleKey: "role_selection.admin.title",
      icon: "fa-shield-alt",
      description: "System administration and role management.",
      descriptionKey: "role_selection.admin.description",
      color: "from-orange-500 to-orange-600",
      shadow: "shadow-orange-200",
    },
  ];

  const activePortals = portalTypes.filter((p) => userRoles.includes(p.id));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12 lg:py-16">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
        {activePortals.map((portal) => (
          <button
            key={portal.id}
            onClick={() => onSelectView(portal.id)}
            className="group relative flex items-center p-5 sm:p-8 lg:p-10 bg-white rounded-3xl border border-light-border hover:border-orange-primary shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-98 text-left cursor-pointer w-full gap-5 sm:gap-8"
          >
            <div
              className={`w-14 h-14 sm:w-20 lg:w-24 sm:h-20 lg:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white text-2xl sm:text-3xl lg:text-4xl shadow-lg sm:shadow-xl ${portal.shadow} group-hover:scale-110 transition-transform shrink-0`}
            >
              <i className={`fas ${portal.icon}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-2xl lg:text-3xl font-extrabold text-dark-deepblue mb-1 sm:mb-2 group-hover:text-orange-primary transition-colors leading-tight">
                <Translate id={portal.titleKey}>{portal.title}</Translate>
              </h3>
              <p className="text-xs sm:text-base lg:text-lg text-dark-muted leading-relaxed">
                <Translate id={portal.descriptionKey}>
                  {portal.description}
                </Translate>
              </p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-light-lbg group-hover:bg-orange-primary group-hover:text-white text-dark-soft transition-all shrink-0 ml-auto">
              <i className="fas fa-arrow-right text-xs sm:text-base group-hover:translate-x-0.5 transition-transform"></i>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelectionDashboard;
