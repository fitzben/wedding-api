import { Env } from "../../../index";
import { json, jsonError } from "./utils";

export async function handleJourney(
  req: Request,
  url: URL,
  env: Env,
  method: string,
  pathname: string,
) {
  // GET /api/admin/journey — list all items
  if (pathname === "/api/admin/journey" && method === "GET") {
    try {
      const rows = await env.DB.prepare(
        "SELECT * FROM journey ORDER BY sort_order ASC",
      ).all();
      return json({ items: rows.results });
    } catch {
      return jsonError("Failed to fetch journey items", 500);
    }
  }

  // POST /api/admin/journey — create new item
  if (pathname === "/api/admin/journey" && method === "POST") {
    try {
      const body = (await req.json()) as any;
      const { date, title, desc, photo_url, bg } = body;

      if (!date || !title) {
        return jsonError("Date and title are required", 400);
      }

      const id = crypto.randomUUID();
      const maxOrder = (await env.DB.prepare(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM journey",
      ).first()) as any;

      await env.DB.prepare(
        `INSERT INTO journey (id, date, title, "desc", photo_url, bg, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, date, title, desc || null, photo_url || null, bg || null, maxOrder.next)
        .run();

      const newItem = await env.DB.prepare("SELECT * FROM journey WHERE id = ?")
        .bind(id)
        .first();

      return json(newItem, 201);
    } catch (err) {
      console.error(err);
      return jsonError("Failed to create journey item", 500);
    }
  }

  // POST /api/admin/journey/reorder — reorder items
  if (pathname === "/api/admin/journey/reorder" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids)) return jsonError("ids array required", 400);

      const stmts = ids.map((id, idx) =>
        env.DB.prepare("UPDATE journey SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").bind(
          idx,
          id,
        ),
      );

      await env.DB.batch(stmts);
      return json({ ok: true });
    } catch {
      return jsonError("Failed to reorder journey items", 500);
    }
  }

  // Handle item specific routes: /api/admin/journey/:id
  const match = pathname.match(/^\/api\/admin\/journey\/([^/]+)$/);
  if (match) {
    const id = match[1];

    if (method === "PUT") {
      try {
        const body = (await req.json()) as any;
        const { date, title, desc, photo_url, bg } = body;

        await env.DB.prepare(
          `UPDATE journey 
           SET date = COALESCE(?, date), 
               title = COALESCE(?, title), 
               "desc" = COALESCE(?, "desc"), 
               photo_url = COALESCE(?, photo_url), 
               bg = COALESCE(?, bg), 
               updated_at = datetime('now') 
           WHERE id = ?`,
        )
          .bind(date || null, title || null, desc || null, photo_url || null, bg || null, id)
          .run();

        const updated = await env.DB.prepare("SELECT * FROM journey WHERE id = ?")
          .bind(id)
          .first();

        return json(updated);
      } catch {
        return jsonError("Failed to update journey item", 500);
      }
    }

    if (method === "DELETE") {
      try {
        await env.DB.prepare("DELETE FROM journey WHERE id = ?").bind(id).run();
        return new Response(null, { status: 204 });
      } catch {
        return jsonError("Failed to delete journey item", 500);
      }
    }
  }

  return jsonError("Not Found", 404);
}
