import { Env } from "../../index";

export async function handleGiftsRoutes(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  // GET /api/gifts/registry — list active registry items with live claim counts
  if (pathname === "/api/gifts/registry" && method === "GET") {
    try {
      const rows = await env.DB.prepare(
        `
        SELECT
          r.id, r.name, r.brand, r.description, r.image_url,
          r.tag, r.quantity_needed, r.price_range, r.shop_url, r.sort_order,
          COALESCE(
            (SELECT SUM(c.quantity) FROM gift_registry_claims c WHERE c.registry_id = r.id),
            0
          ) AS quantity_claimed,
          COALESCE(
            (SELECT json_group_array(claimer_name) FROM gift_registry_claims WHERE registry_id = r.id),
            '[]'
          ) AS claimer_names
        FROM gift_registry r
        WHERE r.deleted_at IS NULL AND r.is_active = 1
        ORDER BY r.sort_order ASC, r.created_at ASC
      `,
      ).all();
      const items = rows.results.map((row: any) => ({
        ...row,
        claimer_names: JSON.parse(row.claimer_names || "[]"),
      }));
      return res({ items });
    } catch {
      return res({ error: "Failed to fetch registry" }, 500);
    }
  }

  // GET /api/gifts/registry/:id/address — public, return delivery address only
  if (pathname.match(/^\/api\/gifts\/registry\/([^/]+)\/address$/) && method === "GET") {
    try {
      const registryId = pathname.split("/")[4];
      const row = await env.DB.prepare(
        "SELECT delivery_address FROM gift_registry WHERE id = ? AND deleted_at IS NULL AND is_active = 1"
      ).bind(registryId).first<any>();

      if (!row) return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });

      return new Response(JSON.stringify({
        delivery_address: row.delivery_address || null,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to fetch address" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST /api/gifts/registry/:id/claim — submit a claim
  const claimMatch = pathname.match(/^\/api\/gifts\/registry\/([^/]+)\/claim$/);
  if (claimMatch && method === "POST") {
    const registryId = claimMatch[1];
    try {
      const body = ((await request.json()) as any) ?? {};
      const { claimer_name, message, quantity } = body;

      if (!claimer_name?.trim())
        return res({ error: "claimer_name is required" }, 400);
      const qty = parseInt(quantity) || 1;
      if (qty < 1) return res({ error: "quantity must be >= 1" }, 400);

      // Fetch item + current claimed total
      const item = (await env.DB.prepare(
        `
        SELECT r.quantity_needed,
          COALESCE(
            (SELECT SUM(c.quantity) FROM gift_registry_claims c WHERE c.registry_id = r.id),
            0
          ) AS quantity_claimed
        FROM gift_registry r
        WHERE r.id = ? AND r.deleted_at IS NULL AND r.is_active = 1
      `,
      )
        .bind(registryId)
        .first()) as any;

      if (!item) return res({ error: "Item not found" }, 404);

      const remaining = item.quantity_needed - item.quantity_claimed;
      if (remaining <= 0) return res({ error: "Sudah fully claimed" }, 409);
      if (qty > remaining)
        return res({ error: `Hanya tersisa ${remaining} lagi` }, 409);

      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          `
          INSERT INTO gift_registry_claims (id, registry_id, claimer_name, message, quantity, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          `,
        ).bind(
          id,
          registryId,
          claimer_name.trim(),
          message?.trim() || null,
          qty,
        ),
        env.DB.prepare(
          `UPDATE 
            gift_registry 
          SET 
            updated_at = datetime('now'),
            quantity_claimed = quantity_claimed + ?
          WHERE id = ?`,
        ).bind(qty, registryId),
      ]);

      const updated = (await env.DB.prepare(
        `
        SELECT COALESCE(SUM(quantity), 0) AS quantity_claimed
        FROM gift_registry_claims WHERE registry_id = ?
      `,
      )
        .bind(registryId)
        .first()) as any;

      const registryItem = await env.DB.prepare(
        "SELECT delivery_address FROM gift_registry WHERE id = ?"
      ).bind(registryId).first<any>();

      return res(
        {
          ok: true,
          claim_id: id,
          quantity_claimed:
            updated?.quantity_claimed ?? item.quantity_claimed + qty,
          quantity_needed: item.quantity_needed,
          delivery_address: registryItem?.delivery_address || null,
        },
        201,
      );
    } catch {
      return res({ error: "Failed to submit claim" }, 500);
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
