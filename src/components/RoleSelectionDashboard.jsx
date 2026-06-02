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
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {activePortals.map((portal) => (
          <button
            key={portal.id}
            onClick={() => onSelectView(portal.id)}
            className="group relative flex flex-col items-center p-8 bg-white rounded-3xl border border-light-border hover:border-orange-primary shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-95"
          >
            <div
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white text-3xl mb-6 shadow-xl ${portal.shadow} group-hover:scale-110 transition-transform`}
            >
              <i className={`fas ${portal.icon}`}></i>
            </div>
            <h3 className="text-xl font-bold text-dark-deepblue mb-3 group-hover:text-orange-primary transition-colors">
              <Translate id={portal.titleKey}>{portal.title}</Translate>
            </h3>
            <p className="text-center text-sm text-dark-muted leading-relaxed">
              <Translate id={portal.descriptionKey}>
                {portal.description}
              </Translate>
            </p>
            <div className="mt-6 flex items-center gap-2 text-orange-primary font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <Translate id="role_selection.enter_portal">
                Enter Portal
              </Translate>{" "}
              <i className="fas fa-arrow-right"></i>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelectionDashboard;
