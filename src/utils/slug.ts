export function generateSlug(name: string): string {
  if (!name || !name.trim()) return "guest";

  const lower = name.toLowerCase();
  // Replace spaces with "-"
  const withDashes = lower.replace(/\s+/g, "-");
  // Remove all non-alphanumeric characters except "-"
  const cleaned = withDashes.replace(/[^a-z0-9-]/g, "");
  // Replace multiple "-" with single "-"
  const singleDash = cleaned.replace(/-+/g, "-");
  // Trim "-" from start and end
  const trimmed = singleDash.replace(/^-+|-+$/g, "");

  return trimmed || "guest";
}

