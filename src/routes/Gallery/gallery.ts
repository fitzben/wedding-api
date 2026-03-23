import { Env } from "../../index";

export async function handleGalleryRoutes(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method !== "GET") {
    return res({ error: "Method not allowed" }, 405);
  }

  // GET /api/gallery/sections — list aktif sections + media count
  if (pathname === "/api/gallery/sections") {
    try {
      const rows = await env.DB.prepare(`
        SELECT s.id, s.name, s.key, s.accepts_video, s.sort_order, s.cover_media_id,
               COUNT(m.id) AS media_count
        FROM gallery_sections s
        LEFT JOIN gallery_media m ON m.section_id = s.id AND m.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY s.sort_order ASC
      `).all();
      return res({ sections: rows.results });
    } catch {
      return res({ error: "Failed to fetch gallery sections" }, 500);
    }
  }

  // GET /api/gallery/media?section_id=xxx — media per section
  if (pathname === "/api/gallery/media") {
    const sectionId = url.searchParams.get("section_id");
    if (!sectionId) return res({ error: "section_id required" }, 400);
    try {
      const rows = await env.DB.prepare(`
        SELECT id, section_id, public_url, filename, content_type,
               media_type, caption, sort_order
        FROM gallery_media
        WHERE section_id = ? AND deleted_at IS NULL
        ORDER BY sort_order ASC
      `).bind(sectionId).all();
      return res({ media: rows.results });
    } catch {
      return res({ error: "Failed to fetch media" }, 500);
    }
  }

  return res({ error: "Not Found" }, 404);
}

function res(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}