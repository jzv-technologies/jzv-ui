// Cookie helpers
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

export const setCookie = (name, value, days = 7) => {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`;
};

export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const getUserDataCookie = (userId) => {
  try {
    const raw = getCookie(`jzv_user_data_${userId}`);
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch (e) {
    console.error("[Cookie] Error parsing user data cookie:", e);
    return null;
  }
};

export const setUserDataCookie = (userId, data, days = 7) => {
  setCookie(
    `jzv_user_data_${userId}`,
    encodeURIComponent(JSON.stringify(data)),
    days,
  );
};

export const clearUserDataCookie = (userId) => {
  deleteCookie(`jzv_user_data_${userId}`);
};
