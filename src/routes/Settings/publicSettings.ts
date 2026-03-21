import { Env } from "../../index";
import { json, jsonError } from "../Admin/handlers/utils";

/**
 * Public settings route — no auth required.
 * Returns wedding configuration (names, dates, etc)
 */
export async function handlePublicSettings(
  req: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const method = req.method.toUpperCase();

  if (method !== "GET") {
    return jsonError("Method Not Allowed", 405);
  }

  try {
    const rows = await env.DB.prepare("SELECT key, value FROM settings").all();
    const settings: Record<string, any> = {};
    for (const row of rows.results as any[]) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return json({ settings });
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return jsonError("Failed to fetch settings", 500);
  }
}
