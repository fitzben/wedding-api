import { Env } from "../../index";
import { json, jsonError } from "../Admin/handlers/utils";

/**
 * Public gift registry routes — no auth required.
 * Register in your main router:
 *   if (pathname.startsWith("/api/gifts/registry")) return handlePublicGiftRegistry(request, url, env);
 */
export async function handlePublicGiftRegistry(
  req: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const method   = req.method.toUpperCase();
  const pathname = url.pathname;

  // ── GET /api/gifts/registry  — list all active items with live claim counts ─
  if (pathname === "/api/gifts/registry" && method === "GET") {
    try {
      const rows = await env.DB.prepare(`
        SELECT
          r.id, r.name, r.brand, r.description, r.image_url,
          r.tag, r.quantity_needed, r.price_range, r.shop_url, r.sort_order,
          COALESCE((SELECT SUM(c.quantity) FROM gift_registry_claims c WHERE c.registry_id = r.id), 0) AS quantity_claimed
        FROM gift_registry r
        WHERE r.deleted_at IS NULL AND r.is_active = 1
        ORDER BY r.sort_order ASC, r.created_at ASC
      `).all();
      return json({ items: rows.results });
    } catch { return jsonError("Failed to fetch registry", 500); }
  }

  // ── POST /api/gifts/registry/:id/claim  — submit a claim ──────────────────
  const claimMatch = pathname.match(/^\/api\/gifts\/registry\/([^/]+)\/claim$/);
  if (claimMatch && method === "POST") {
    const registryId = claimMatch[1];
    try {
      const body = (await req.json()) as any ?? {};
      const { claimer_name, message, quantity } = body;

      if (!claimer_name?.trim()) return jsonError("claimer_name is required", 400);
      const qty = parseInt(quantity) || 1;
      if (qty < 1)               return jsonError("quantity must be >= 1", 400);

      // Fetch item + current claimed total atomically
      const item = await env.DB.prepare(`
        SELECT r.quantity_needed,
          COALESCE((SELECT SUM(c.quantity) FROM gift_registry_claims c WHERE c.registry_id = r.id), 0) AS quantity_claimed
        FROM gift_registry r
        WHERE r.id = ? AND r.deleted_at IS NULL AND r.is_active = 1
      `).bind(registryId).first() as any;

      if (!item) return jsonError("Item not found", 404);

      const remaining = item.quantity_needed - item.quantity_claimed;

      if (remaining <= 0) {
        return jsonError("Sudah fully claimed, tidak bisa diambil lagi", 409);
      }
      if (qty > remaining) {
        return jsonError(`Hanya tersisa ${remaining} lagi`, 409);
      }

      // Save the claim
      const id = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO gift_registry_claims (id, registry_id, claimer_name, message, quantity, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(id, registryId, claimer_name.trim(), message?.trim() || null, qty).run();

      // Return updated counts so frontend can update UI immediately
      const updated = await env.DB.prepare(`
        SELECT
          COALESCE((SELECT SUM(c.quantity) FROM gift_registry_claims c WHERE c.registry_id = ?), 0) AS quantity_claimed
      `).bind(registryId).first() as any;

      return json({
        ok:               true,
        claim_id:         id,
        quantity_claimed: updated?.quantity_claimed ?? (item.quantity_claimed + qty),
        quantity_needed:  item.quantity_needed,
      }, 201);

    } catch (e: any) {
      if (e?.message?.includes("409")) return jsonError(e.message, 409);
      return jsonError("Failed to submit claim", 500);
    }
  }

  return jsonError("Not Found", 404);
}
