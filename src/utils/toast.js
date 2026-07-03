let toastTimeout = null;

export const showToast = (message, type = "error") => {
  const existingToast = document.querySelector(".custom-toast");
  if (existingToast) existingToast.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement("div");
  toast.className = `custom-toast fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
    type === "error" ? "bg-red-600" : type === "warning" ? "bg-amber-500" : "bg-green-600"
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  toastTimeout = setTimeout(() => toast.remove(), 5000);
};
