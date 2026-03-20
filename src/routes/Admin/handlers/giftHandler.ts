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

  return jsonError("Not Found", 404);
}
