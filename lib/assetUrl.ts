const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const getBackendOrigin = () => {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
};

export const resolveUploadAssetUrl = (rawPath?: string | null) => {
  if (!rawPath) {
    return undefined;
  }

  const normalized = rawPath.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/")) {
    return `${getBackendOrigin()}${normalized}`;
  }

  if (normalized.startsWith("uploads/")) {
    return `${getBackendOrigin()}/${normalized}`;
  }

  return `${getBackendOrigin()}/uploads/${normalized.replace(/^\/+/, "")}`;
};
