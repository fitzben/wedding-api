import { Env } from "../../index";
import { json, jsonError } from "../Admin/handlers/utils";

/**
 * Public gallery routes — no auth required.
 */
export async function handlePublicGallery(
  req: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const method = req.method.toUpperCase();
  const { pathname } = url;

  if (method !== "GET") {
    return jsonError("Method Not Allowed", 405);
  }

  // GET /api/gallery/sections
  if (pathname === "/api/gallery/sections") {
    try {
      const rows = await env.DB.prepare(`
        SELECT s.*, COUNT(m.id) as media_count
        FROM gallery_sections s
        LEFT JOIN gallery_media m ON m.section_id = s.id AND m.deleted_at IS NULL
        GROUP BY s.id ORDER BY s.sort_order ASC
      `).all();
      return json({ sections: rows.results });
    } catch {
      return jsonError("Failed to fetch sections", 500);
    }
  }

  // GET /api/gallery/media?section_id=...
  if (pathname === "/api/gallery/media") {
    const sectionId = url.searchParams.get("section_id");
    if (!sectionId) return jsonError("section_id required", 400);
    try {
      const rows = await env.DB.prepare(
        "SELECT * FROM gallery_media WHERE section_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC"
      ).bind(sectionId).all();
      return json({ media: rows.results });
    } catch {
      return jsonError("Failed to fetch media", 500);
    }
  }

  return jsonError("Not Found", 404);
}
