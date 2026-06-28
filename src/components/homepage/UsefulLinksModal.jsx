// src/components/homepage/UsefulLinksModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

const ROLES_MAP = {
  guest: 1,
  parent: 2,
  staff: 4,
  teacher: 8,
  management: 16,
  admin: 32,
};

const UsefulLinksModal = ({ user, userRoles = [] }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from("useful_links")
          .select("*")
          .order("link_name", { ascending: true });

        if (dbErr) throw dbErr;
        setLinks(data || []);
      } catch (err) {
        console.error("Error loading useful links:", err);
        setError("Could not load useful links. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  // Compute the current user's bitwise role mask
  const getUserMask = () => {
    let mask = 1; // Guest bit is always set for public access
    if (user && userRoles.length > 0) {
      userRoles.forEach((role) => {
        const val = ROLES_MAP[role.toLowerCase().trim()];
        if (val) {
          mask |= val;
        }
      });
    }
    return mask;
  };

  const userMask = getUserMask();
  const visibleLinks = links.filter((link) => (link.roles & userMask) !== 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-dark-muted">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-sm">Loading useful links...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-6 bg-red-50 border border-red-200 rounded-3xl">
        <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-3 block" />
        <p className="text-red-700 font-bold text-sm">{error}</p>
      </div>
    );
  }

  if (visibleLinks.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-gray-50 border border-dashed border-light-border rounded-3xl">
        <i className="fas fa-link-slash text-3xl text-dark-muted mb-3 block" />
        <p className="text-dark-soft font-bold text-sm">No useful links available.</p>
        <p className="text-dark-muted text-xs mt-1">There are no resources published for your access level.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
      <p className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-2">
        Resources & Important Links
      </p>
      <div className="grid grid-cols-1 gap-3">
        {visibleLinks.map((link) => (
          <a
            key={link.id}
            href={link.link}
            target={link.target || "_blank"}
            rel="noopener noreferrer"
            className="group block p-5 bg-white border border-light-border hover:border-brand-primary hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all duration-200 rounded-2xl relative shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-lbg/20 group-hover:bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 transition-colors">
                <i className="fas fa-link text-sm" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-bold text-dark-deepblue text-base mb-1 group-hover:text-brand-primary transition-colors truncate">
                  {link.link_name}
                </h4>
                <p className="text-dark-soft text-xs leading-relaxed line-clamp-2">
                  {link.link_description || "No description provided."}
                </p>
              </div>
              <div className="text-dark-muted group-hover:text-brand-primary transition-colors flex items-center self-center shrink-0">
                <i className={`fas ${link.target === "_self" ? "fa-arrow-right" : "fa-external-link-alt"} text-xs`} />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default UsefulLinksModal;
