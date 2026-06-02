import React from "react";
import useLanguage from "../hooks/useLanguage";

export default function Translate({ id, children, className = "", ...props }) {
  const { t } = useLanguage();

  // Guard against undefined or empty id
  if (!id) {
    return (
      <span className={className || undefined} {...props}>
        {children || ""}
      </span>
    );
  }

  const { text, isCustom } = t(id, children);

  const spanClass = `${className} ${isCustom ? "notranslate" : ""}`.trim();

  return (
    <span
      className={spanClass || undefined}
      translate={isCustom ? "no" : "yes"}
      {...props}
    >
      {text}
    </span>
  );
}
