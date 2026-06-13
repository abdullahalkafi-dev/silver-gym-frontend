const MINIO_PUBLIC_URL = process.env.NEXT_PUBLIC_MINIO_URL || "http://localhost:9000/silvergym";

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

  return `${MINIO_PUBLIC_URL}/${normalized.replace(/^\/+/, "")}`;
};
