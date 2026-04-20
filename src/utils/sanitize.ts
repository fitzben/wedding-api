// Strip HTML tags and dangerous characters from user input
export function sanitizeText(input: string, maxLength?: number): string {
  if (!input) return "";
  let clean = input
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/javascript:/gi, "")      // strip javascript: protocol
    .replace(/on\w+\s*=/gi, "")        // strip event handlers (onclick=, etc)
    .trim();
  if (maxLength) clean = clean.slice(0, maxLength);
  return clean;
}

export function sanitizeName(name: string): string {
  return sanitizeText(name, 100);
}

export function sanitizeMessage(message: string): string {
  return sanitizeText(message, 1000);
}
