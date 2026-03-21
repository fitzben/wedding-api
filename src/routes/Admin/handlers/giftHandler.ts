import { Env } from "../../../index";
import { json, jsonError } from "./utils";

export async function handleGifts(
  req: Request,
  url: URL,
  env: Env,
  method: string,
  pathname: string
) {
  if (pathname === "/api/admin/gifts/summary" && method === "GET") {
    try {
      const [transferRow, physicalRow, statusRow] = await env.DB.batch([
        env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total_amount, COUNT(*) as transfer_count FROM gifts WHERE type='bank_transfer' AND deleted_at IS NULL"),
        env.DB.prepare("SELECT COUNT(*) as physical_count, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as physical_confirmed FROM gifts WHERE type='physical' AND deleted_at IS NULL"),
        env.DB.prepare("SELECT SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed_count FROM gifts WHERE deleted_at IS NULL"),
      ]);
      return json({
        ...(transferRow.results[0] as any),
        ...(physicalRow.results[0] as any),
        ...(statusRow.results[0] as any),
      });
    } catch { return jsonError("Failed to fetch summary", 500); }
  }

  if (pathname === "/api/admin/gifts") {
    if (method === "GET") {
      try {
        const page   = parseInt(url.searchParams.get("page")   || "1");
        const limit  = parseInt(url.searchParams.get("limit")  || "20");
        const type   = url.searchParams.get("type")   || "";
        const status = url.searchParams.get("status") || "";
        const offset = (page - 1) * limit;

        let where = "WHERE deleted_at IS NULL";
        const binds: any[] = [];
        if (type)   { where += ` AND type = ?`;   binds.push(type); }
        if (status) { where += ` AND status = ?`; binds.push(status); }

        const total = (await env.DB.prepare(`SELECT COUNT(*) as c FROM gifts ${where}`)
          .bind(...binds).first() as any)?.c || 0;
        const rows  = await env.DB.prepare(`SELECT * FROM gifts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
          .bind(...binds, limit, offset).all();

        return json({ data: rows.results, total, page, limit });
      } catch { return jsonError("Failed to fetch gifts", 500); }
    }

    if (method === "POST") {
      try {
        const body = (await req.json()) as any ?? {};
        const { type, sender_name, status, notes, received_date,
                amount, bank_name, account_number, transfer_date,
                product_name, product_category, product_description,
                product_link, price_range_min, price_range_max } = body;

        if (!sender_name?.trim()) return jsonError("sender_name is required", 400);
        if (!['bank_transfer','physical'].includes(type)) return jsonError("Invalid type", 400);
        if (type === 'bank_transfer' && !amount) return jsonError("amount is required for bank_transfer", 400);
        if (type === 'physical' && !product_name?.trim()) return jsonError("product_name is required for physical gifts", 400);

        const id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO gifts (
            id, type, sender_name, status, notes, received_date,
            amount, bank_name, account_number, transfer_date,
            product_name, product_category, product_description,
            product_link, price_range_min, price_range_max,
            created_at, updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
        `).bind(
          id, type, sender_name.trim(),
          status || 'pending', notes?.trim() || null,
          received_date || null,
          amount ? parseFloat(amount) : null,
          bank_name || null, account_number?.trim() || null, transfer_date || null,
          product_name?.trim() || null, product_category || null,
          product_description?.trim() || null, product_link?.trim() || null,
          price_range_min ? parseFloat(price_range_min) : null,
          price_range_max ? parseFloat(price_range_max) : null,
        ).run();

        return json(await env.DB.prepare("SELECT * FROM gifts WHERE id = ?").bind(id).first(), 201);
      } catch { return jsonError("Failed to log gift", 500); }
    }
  }

  if (pathname.startsWith("/api/admin/gifts/") && pathname !== "/api/admin/gifts/summary") {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const body = (await req.json()) as any ?? {};
        const row = await env.DB.prepare("SELECT id FROM gifts WHERE id = ? AND deleted_at IS NULL").bind(id).first();
        if (!row) return jsonError("Gift not found", 404);

        const fields: string[] = [];
        const vals: any[] = [];
        const allowed = ['sender_name','status','notes','received_date','amount','bank_name','account_number',
                         'transfer_date','product_name','product_category','product_description',
                         'product_link','price_range_min','price_range_max'];
        for (const f of allowed) {
          if (body[f] !== undefined) { fields.push(`${f} = ?`); vals.push(body[f] === '' ? null : body[f]); }
        }
        if (!fields.length) return jsonError("No fields to update", 400);
        fields.push("updated_at = datetime('now')");
        vals.push(id);
        await env.DB.prepare(`UPDATE gifts SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
        return json(await env.DB.prepare("SELECT * FROM gifts WHERE id = ?").bind(id).first());
      } catch { return jsonError("Failed to update gift", 500); }
    }
    if (method === "DELETE") {
      try {
        if (!await env.DB.prepare("SELECT id FROM gifts WHERE id=? AND deleted_at IS NULL").bind(id).first())
          return jsonError("Gift not found", 404);
        await env.DB.prepare("UPDATE gifts SET deleted_at = datetime('now') WHERE id = ?").bind(id).run();
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete gift", 500); }
    }
  }

  // ── GIFT REGISTRY (admin manage) ─────────────────────────────────────────

  if (pathname === "/api/admin/gifts/registry") {
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare(`
          SELECT r.*,
            COALESCE((SELECT SUM(c.quantity) FROM gift_registry_claims c WHERE c.registry_id = r.id), 0) AS quantity_claimed
          FROM gift_registry r
          WHERE r.deleted_at IS NULL
          ORDER BY r.sort_order ASC, r.created_at ASC
        `).all();
        return json({ items: rows.results });
      } catch { return jsonError("Failed to fetch registry", 500); }
    }
    if (method === "POST") {
      try {
        const body = (await req.json()) as any ?? {};
        const { name, brand, description, image_url, tag, quantity_needed, price_range, shop_url, is_active } = body;
        if (!name?.trim()) return jsonError("name is required", 400);
        if (!quantity_needed || parseInt(quantity_needed) < 1) return jsonError("quantity_needed must be >= 1", 400);
        const id = crypto.randomUUID();
        const maxOrder = await env.DB.prepare("SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM gift_registry WHERE deleted_at IS NULL").first() as any;
        await env.DB.prepare(`
          INSERT INTO gift_registry (id, name, brand, description, image_url, tag, quantity_needed, price_range, shop_url, sort_order, is_active, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
        `).bind(
          id, name.trim(), brand?.trim()||null, description?.trim()||null,
          image_url?.trim()||null, tag?.trim()||null,
          parseInt(quantity_needed)||1, price_range?.trim()||null,
          shop_url?.trim()||null, maxOrder?.next||0,
          is_active !== false ? 1 : 0,
        ).run();
        return json(await env.DB.prepare("SELECT * FROM gift_registry WHERE id = ?").bind(id).first(), 201);
      } catch { return jsonError("Failed to create registry item", 500); }
    }
  }

  if (pathname === "/api/admin/gifts/registry/reorder" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids)) return jsonError("ids required", 400);
      const stmts = (ids as string[]).map((id, idx) =>
        env.DB.prepare("UPDATE gift_registry SET sort_order = ? WHERE id = ?").bind(idx, id)
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    } catch { return jsonError("Failed to reorder", 500); }
  }

  if (pathname.startsWith("/api/admin/gifts/registry/")) {
    const regId = pathname.split("/").pop();
    if (!regId) return jsonError("Invalid ID", 400);
    if (method === "GET") {
      try {
        const claims = await env.DB.prepare(
          "SELECT * FROM gift_registry_claims WHERE registry_id = ? ORDER BY created_at DESC"
        ).bind(regId).all();
        return json({ claims: claims.results });
      } catch { return jsonError("Failed to fetch claims", 500); }
    }
    if (method === "PUT") {
      try {
        const body = (await req.json()) as any ?? {};
        const allowed = ["name","brand","description","image_url","tag","quantity_needed","price_range","shop_url","is_active","sort_order"];
        const fields: string[] = [];
        const vals: any[] = [];
        for (const f of allowed) {
          if (body[f] !== undefined) { fields.push(`${f} = ?`); vals.push(body[f] === "" ? null : body[f]); }
        }
        if (!fields.length) return jsonError("No fields to update", 400);
        fields.push("updated_at = datetime(\'now\')");
        vals.push(regId);
        await env.DB.prepare(`UPDATE gift_registry SET ${fields.join(", ")} WHERE id = ? AND deleted_at IS NULL`).bind(...vals).run();
        return json(await env.DB.prepare("SELECT * FROM gift_registry WHERE id = ?").bind(regId).first());
      } catch { return jsonError("Failed to update registry item", 500); }
    }
    if (method === "DELETE") {
      try {
        const res = await env.DB.prepare("UPDATE gift_registry SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL").bind(regId).run();
        if (!res.meta.changes) return jsonError("Item not found", 404);
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete registry item", 500); }
    }
  }


  return jsonError("Not Found", 404);
}