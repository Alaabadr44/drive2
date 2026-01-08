export const getAccessibleImageUrl = (url?: string | File | null) => {
  if (!url) return "https://via.placeholder.com/150";

  // If it's a File object, we can't really "display" it easily without creating an object URL
  // which has side effects. For now, return a placeholder if it's not a string.
  if (typeof url !== "string") {
    return "https://via.placeholder.com/150";
  }

  try {
    // If it's a data URL or blob, return as is
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;

    // If it starts with http, check if it matches backend port and simplify to relative path to use proxy
    if (url.startsWith("http")) {
      const urlObj = new URL(url);

      // Check if it's the backend port OR if it's an IP/localhost trying to serve uploads
      // This allows us to handle both port 3010 (dev) and other ports (prod/ssl)
      // as long as the path is /uploads/ and it's looking like an internal request
      const isBackend =
        urlObj.port === "3010" ||
        (urlObj.pathname.startsWith("/uploads/") &&
          (urlObj.hostname === "localhost" ||
            /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname)));

      if (isBackend) {
        return urlObj.pathname; // Return just the path (e.g. /uploads/...) to let proxy handle it
      }
    }

    // Ensure relative paths to uploads start with / to avoid nested route issues
    if (url.startsWith("uploads/")) {
      return `/${url}`;
    }

    return url;
  } catch (e) {
    return url;
  }
};
