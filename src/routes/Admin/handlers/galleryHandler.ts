import { Env } from "../../../index";
import { json, jsonError } from "./utils";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function handleGallery(
  req: Request,
  url: URL,
  env: Env,
  method: string,
  pathname: string
) {
  // ── GALLERY — SECTIONS ──────────────────────────────────────────────────

  if (pathname === "/api/admin/gallery/sections") {
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare(`
          SELECT s.*, COUNT(m.id) as media_count
          FROM gallery_sections s
          LEFT JOIN gallery_media m ON m.section_id = s.id AND m.deleted_at IS NULL
          GROUP BY s.id ORDER BY s.sort_order ASC
        `).all();
        return json({ sections: rows.results });
      } catch { return jsonError("Failed to fetch sections", 500); }
    }
    if (method === "POST") {
      try {
        const { name, key, accepts_video } = (await req.json()) as any ?? {};
        if (!name?.trim()) return jsonError("name is required", 400);
        const id = crypto.randomUUID();
        const maxOrder = await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0)+1 as next FROM gallery_sections").first() as any;
        await env.DB.prepare("INSERT INTO gallery_sections (id, name, key, accepts_video, sort_order, created_at) VALUES (?,?,?,?,?,datetime('now'))")
          .bind(id, name.trim(), key || 'gallery', accepts_video ? 1 : 0, maxOrder.next).run();
        return json(await env.DB.prepare("SELECT * FROM gallery_sections WHERE id = ?").bind(id).first(), 201);
      } catch { return jsonError("Failed to create section", 500); }
    }
  }

  if (pathname === "/api/admin/gallery/sections/reorder" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids)) return jsonError("ids required", 400);
      const stmts = ids.map((id, idx) =>
        env.DB.prepare("UPDATE gallery_sections SET sort_order = ? WHERE id = ?").bind(idx, id)
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    } catch { return jsonError("Failed to reorder sections", 500); }
  }

  if (pathname.match(/^\/api\/admin\/gallery\/sections\/([^/]+)\/cover$/) && method === "PUT") {
    try {
      const sectionId = pathname.split("/")[5];
      const { media_id } = (await req.json()) as any;
      await env.DB.prepare("UPDATE gallery_sections SET cover_media_id = ? WHERE id = ?").bind(media_id, sectionId).run();
      return json({ ok: true });
    } catch { return jsonError("Failed to set cover", 500); }
  }

  if (pathname.startsWith("/api/admin/gallery/sections/") && !pathname.includes("/cover")) {
    const sectionId = pathname.split("/")[5];
    if (!sectionId) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const { name, key, accepts_video } = (await req.json()) as any ?? {};
        await env.DB.prepare("UPDATE gallery_sections SET name=COALESCE(?,name), key=COALESCE(?,key), accepts_video=COALESCE(?,accepts_video), updated_at=datetime('now') WHERE id=?")
          .bind(name||null, key||null, accepts_video !== undefined ? (accepts_video ? 1 : 0) : null, sectionId).run();
        return json(await env.DB.prepare("SELECT * FROM gallery_sections WHERE id = ?").bind(sectionId).first());
      } catch { return jsonError("Failed to update section", 500); }
    }
    if (method === "DELETE") {
      try {
        await env.DB.prepare("UPDATE gallery_media SET deleted_at = datetime('now') WHERE section_id = ?").bind(sectionId).run();
        await env.DB.prepare("DELETE FROM gallery_sections WHERE id = ?").bind(sectionId).run();
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete section", 500); }
    }
  }

  // ── GALLERY — UPLOAD URL (R2 presigned PUT) ──────────────────────────────

  if (pathname === "/api/admin/gallery/upload-url" && method === "POST") {
    try {
      const { filename, content_type, section_id } = (await req.json()) as any ?? {};
      if (!filename || !content_type || !section_id) return jsonError("filename, content_type, section_id required", 400);

      const ext   = filename.split('.').pop();
      const key   = `gallery/${section_id}/${crypto.randomUUID()}.${ext}`;

      const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });

      const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
          Bucket: "wedding-bucket",
          Key: key,
          ContentType: content_type,
        }),
        { expiresIn: 3600 }
      );

      const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
      return json({ upload_url: uploadUrl, public_url: publicUrl, key });
    } catch { return jsonError("Failed to generate upload URL", 500); }
  }

  // ── GALLERY — MEDIA ────────────────────────────────────────────────────

  if (pathname === "/api/admin/gallery/media") {
    if (method === "GET") {
      try {
        const sectionId = url.searchParams.get("section_id");
        if (!sectionId) return jsonError("section_id required", 400);
        const rows = await env.DB.prepare(
          "SELECT * FROM gallery_media WHERE section_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC"
        ).bind(sectionId).all();
        return json({ media: rows.results });
      } catch { return jsonError("Failed to fetch media", 500); }
    }
    if (method === "POST") {
      try {
        const { section_id, key, public_url, filename, content_type, size, media_type } = (await req.json()) as any ?? {};
        if (!section_id || !key || !public_url) return jsonError("section_id, key, public_url required", 400);
        const id = crypto.randomUUID();
        const maxOrder = await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0)+1 as next FROM gallery_media WHERE section_id=?").bind(section_id).first() as any;
        await env.DB.prepare("INSERT INTO gallery_media (id, section_id, key, public_url, filename, content_type, size, media_type, sort_order, created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))")
          .bind(id, section_id, key, public_url, filename, content_type, size||0, media_type||'image', maxOrder.next).run();
        return json(await env.DB.prepare("SELECT * FROM gallery_media WHERE id = ?").bind(id).first(), 201);
      } catch { return jsonError("Failed to confirm upload", 500); }
    }
  }

  if (pathname === "/api/admin/gallery/media/reorder" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids)) return jsonError("ids required", 400);
      const stmts = ids.map((id, idx) =>
        env.DB.prepare("UPDATE gallery_media SET sort_order = ? WHERE id = ?").bind(idx, id)
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    } catch { return jsonError("Failed to reorder media", 500); }
  }

  if (pathname.startsWith("/api/admin/gallery/media/") && pathname !== "/api/admin/gallery/media/reorder") {
    const mediaId = pathname.split("/").pop();
    if (!mediaId) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const { caption } = (await req.json()) as any ?? {};
        await env.DB.prepare("UPDATE gallery_media SET caption=?, updated_at=datetime('now') WHERE id=?").bind(caption||null, mediaId).run();
        return json(await env.DB.prepare("SELECT * FROM gallery_media WHERE id = ?").bind(mediaId).first());
      } catch { return jsonError("Failed to update media", 500); }
    }
    if (method === "DELETE") {
      try {
        const row = await env.DB.prepare("SELECT key FROM gallery_media WHERE id = ?").bind(mediaId).first() as any;
        if (!row) return jsonError("Media not found", 404);
        await env.MEDIA_BUCKET.delete(row.key);
        await env.DB.prepare("UPDATE gallery_media SET deleted_at=datetime('now') WHERE id=?").bind(mediaId).run();
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete media", 500); }
    }
  }

  return jsonError("Not Found", 404);
}
