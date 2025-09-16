const originAllowList = (process.env.ORIGIN_ALLOWLIST || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  return originAllowList.includes(origin);
}

export { originAllowList };

