export async function generateUniqueSlug(
  baseSlug: string,
  doesExist: (slug: string) => Promise<boolean>
): Promise<string> {
  const normalized = baseSlug
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (!(await doesExist(normalized))) return normalized;

  let counter = 2;
  while (true) {
    const candidate = `${normalized}-${counter}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await doesExist(candidate);
    if (!exists) return candidate;
    counter += 1;
  }
}


