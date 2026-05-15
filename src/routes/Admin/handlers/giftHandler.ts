import { Env } from "../../../index";
import { json, jsonError } from "./utils";

export async function handleGifts(
  req: Request,
  url: URL,
  env: Env,
  method: string,
  pathname: string,
) {
  if (pathname === "/api/admin/gifts/summary" && method === "GET") {
    try {
      const [transferRow, physicalRow, statusRow] = await env.DB.batch([
        env.DB.prepare(
          "SELECT COALESCE(SUM(amount),0) as total_amount, COUNT(*) as transfer_count FROM gifts WHERE type='bank_transfer' AND deleted_at IS NULL",
        ),
        env.DB.prepare(
          "SELECT COUNT(*) as physical_count, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as physical_confirmed FROM gifts WHERE type='physical' AND deleted_at IS NULL",
        ),
        env.DB.prepare(
          "SELECT SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed_count FROM gifts WHERE deleted_at IS NULL",
        ),
      ]);
      return json({
        ...(transferRow.results[0] as any),
        ...(physicalRow.results[0] as any),
        ...(statusRow.results[0] as any),
      });
    } catch {
      return jsonError("Failed to fetch summary", 500);
    }
  }

  if (pathname === "/api/admin/gifts") {
    if (method === "GET") {
      try {
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const type = url.searchParams.get("type") || "";
        const status = url.searchParams.get("status") || "";
        const offset = (page - 1) * limit;

        let where = "WHERE deleted_at IS NULL";
        const binds: any[] = [];
        if (type) {
          where += ` AND type = ?`;
          binds.push(type);
        }
        if (status) {
          where += ` AND status = ?`;
          binds.push(status);
        }

        const total =
          (
            (await env.DB.prepare(`SELECT COUNT(*) as c FROM gifts ${where}`)
              .bind(...binds)
              .first()) as any
          )?.c || 0;
        const rows = await env.DB.prepare(
          `SELECT * FROM gifts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        )
          .bind(...binds, limit, offset)
          .all();

        return json({ data: rows.results, total, page, limit });
      } catch {
        return jsonError("Failed to fetch gifts", 500);
      }
    }

    if (method === "POST") {
      try {
        const body = ((await req.json()) as any) ?? {};
        const {
          type,
          sender_name,
          status,
          notes,
          received_date,
          amount,
          bank_name,
          account_number,
          transfer_date,
          product_name,
          product_category,
          product_description,
          product_link,
          price_range_min,
          price_range_max,
          registry_item_id,
        } = body;

        if (!sender_name?.trim())
          return jsonError("sender_name is required", 400);
        if (!["bank_transfer", "physical"].includes(type))
          return jsonError("Invalid type", 400);
        if (type === "bank_transfer" && !amount)
          return jsonError("amount is required for bank_transfer", 400);
        if (type === "physical" && !product_name?.trim())
          return jsonError("product_name is required for physical gifts", 400);

        const id = crypto.randomUUID();
        await env.DB.prepare(
          `
          INSERT INTO gifts (
            id, type, sender_name, status, notes, received_date,
            amount, bank_name, account_number, transfer_date,
            product_name, product_category, product_description,
            product_link, price_range_min, price_range_max,
            registry_item_id,
            created_at, updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
        `,
        )
          .bind(
            id,
            type,
            sender_name.trim(),
            status || "pending",
            notes?.trim() || null,
            received_date || null,
            amount ? parseFloat(amount) : null,
            bank_name || null,
            account_number?.trim() || null,
            transfer_date || null,
            product_name?.trim() || null,
            product_category || null,
            product_description?.trim() || null,
            product_link?.trim() || null,
            price_range_min ? parseFloat(price_range_min) : null,
            price_range_max ? parseFloat(price_range_max) : null,
            registry_item_id || null,
          )
          .run();

        return json(
          await env.DB.prepare("SELECT * FROM gifts WHERE id = ?")
            .bind(id)
            .first(),
          201,
        );
      } catch {
        return jsonError("Failed to log gift", 500);
      }
    }
  }

  if (
    pathname.startsWith("/api/admin/gifts/") &&
    pathname !== "/api/admin/gifts/summary" &&
    !pathname.startsWith("/api/admin/gifts/registry")
  ) {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const body = ((await req.json()) as any) ?? {};
        const row = await env.DB.prepare(
          "SELECT id FROM gifts WHERE id = ? AND deleted_at IS NULL",
        )
          .bind(id)
          .first();
        if (!row) return jsonError("Gift not found", 404);

        const fields: string[] = [];
        const vals: any[] = [];
        const allowed = [
          "sender_name",
          "status",
          "notes",
          "received_date",
          "amount",
          "bank_name",
          "account_number",
          "transfer_date",
          "product_name",
          "product_category",
          "product_description",
          "product_link",
          "price_range_min",
          "price_range_max",
          "registry_item_id",
        ];
        for (const f of allowed) {
          if (body[f] !== undefined) {
            fields.push(`${f} = ?`);
            vals.push(body[f] === "" ? null : body[f]);
          }
        }
        if (!fields.length) return jsonError("No fields to update", 400);
        fields.push("updated_at = datetime('now')");
        vals.push(id);
        await env.DB.prepare(
          `UPDATE gifts SET ${fields.join(", ")} WHERE id = ?`,
        )
          .bind(...vals)
          .run();
        return json(
          await env.DB.prepare("SELECT * FROM gifts WHERE id = ?")
            .bind(id)
            .first(),
        );
      } catch {
        return jsonError("Failed to update gift", 500);
      }
    }
    if (method === "DELETE") {
      try {
        if (
          !(await env.DB.prepare(
            "SELECT id FROM gifts WHERE id=? AND deleted_at IS NULL",
          )
            .bind(id)
            .first())
        )
          return jsonError("Gift not found", 404);
        await env.DB.prepare(
          "UPDATE gifts SET deleted_at = datetime('now') WHERE id = ?",
        )
          .bind(id)
          .run();
        return new Response(null, { status: 204 });
      } catch {
        return jsonError("Failed to delete gift", 500);
      }
    }
  }

  // ── GIFT REGISTRY ──────────────────────────────────────────────────────────
  // Registry = wishlist items shown publicly (rice cooker, dll)
  // Separate table: gift_registry

  if (pathname === "/api/admin/gifts/registry") {
    // GET — list all registry items
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare(
          `
          SELECT * FROM gift_registry
          WHERE deleted_at IS NULL
          ORDER BY sort_order ASC, created_at DESC
        `,
        ).all();
        return json({ data: rows.results });
      } catch {
        return jsonError("Failed to fetch registry", 500);
      }
    }

    // POST — create new registry item
    if (method === "POST") {
      try {
        const body = ((await req.json()) as any) ?? {};
        const {
          name,
          brand,
          description,
          image_url,
          tag,
          quantity_needed,
          price_range,
          shop_url,
          is_active,
        } = body;

        if (!name?.trim()) return jsonError("name is required", 400);

        const id = crypto.randomUUID();
        const maxOrder = (await env.DB.prepare(
          "SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM gift_registry",
        ).first()) as any;

        await env.DB.prepare(
          `
          INSERT INTO gift_registry (
            id, name, brand, description, image_url,
            tag, quantity_needed, price_range, shop_url,
            is_active, sort_order, created_at, updated_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
        `,
        )
          .bind(
            id,
            name.trim(),
            brand?.trim() || null,
            description?.trim() || null,
            image_url?.trim() || null,
            tag?.trim() || null,
            quantity_needed ? parseInt(quantity_needed) : 1,
            price_range?.trim() || null,
            shop_url?.trim() || null,
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            maxOrder.next,
          )
          .run();

        return json(
          await env.DB.prepare("SELECT * FROM gift_registry WHERE id = ?")
            .bind(id)
            .first(),
          201,
        );
      } catch {
        return jsonError("Failed to create registry item", 500);
      }
    }
  }

  // Reorder registry items
  if (pathname === "/api/admin/gifts/registry/reorder" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids)) return jsonError("ids array required", 400);
      const stmts = ids.map((itemId, idx) =>
        env.DB.prepare(
          "UPDATE gift_registry SET sort_order = ? WHERE id = ?",
        ).bind(idx, itemId),
      );
      await env.DB.batch(stmts);
      return json({ ok: true });
    } catch {
      return jsonError("Failed to reorder registry", 500);
    }
  }

  // Single registry item: GET, PUT, DELETE
  if (
    pathname.startsWith("/api/admin/gifts/registry/") &&
    pathname !== "/api/admin/gifts/registry/reorder"
  ) {
    const registryId = pathname.split("/").pop();
    if (!registryId) return jsonError("Invalid ID", 400);

    if (method === "GET") {
      try {
        const row = (await env.DB.prepare(
          "SELECT * FROM gift_registry WHERE id = ? AND deleted_at IS NULL",
        )
          .bind(registryId)
          .first()) as any;
        if (!row) return jsonError("Registry item not found", 404);

        const claims = await env.DB.prepare(
          "SELECT id, claimer_name, message, quantity, created_at FROM gift_registry_claims WHERE registry_id = ? ORDER BY created_at DESC",
        )
          .bind(registryId)
          .all();

        row.claims = claims.results;
        return json(row);
      } catch {
        return jsonError("Failed to fetch registry item", 500);
      }
    }

    if (method === "PUT") {
      try {
        const row = await env.DB.prepare(
          "SELECT id FROM gift_registry WHERE id = ? AND deleted_at IS NULL",
        )
          .bind(registryId)
          .first();
        if (!row) return jsonError("Registry item not found", 404);

        const body = ((await req.json()) as any) ?? {};
        const allowed = [
          "name",
          "brand",
          "description",
          "image_url",
          "tag",
          "quantity_needed",
          "price_range",
          "shop_url",
          "is_active",
        ];
        const fields: string[] = [];
        const vals: any[] = [];
        for (const f of allowed) {
          if (body[f] !== undefined) {
            fields.push(`${f} = ?`);
            vals.push(body[f] === "" ? null : body[f]);
          }
        }
        if (!fields.length) return jsonError("No fields to update", 400);
        fields.push("updated_at = datetime('now')");
        vals.push(registryId);

        await env.DB.prepare(
          `UPDATE gift_registry SET ${fields.join(", ")} WHERE id = ?`,
        )
          .bind(...vals)
          .run();

        return json(
          await env.DB.prepare("SELECT * FROM gift_registry WHERE id = ?")
            .bind(registryId)
            .first(),
        );
      } catch {
        return jsonError("Failed to update registry item", 500);
      }
    }

    if (method === "DELETE") {
      try {
        const row = await env.DB.prepare(
          "SELECT id FROM gift_registry WHERE id = ? AND deleted_at IS NULL",
        )
          .bind(registryId)
          .first();
        if (!row) return jsonError("Registry item not found", 404);
        await env.DB.prepare(
          "UPDATE gift_registry SET deleted_at = datetime('now') WHERE id = ?",
        )
          .bind(registryId)
          .run();
        return new Response(null, { status: 204 });
      } catch {
        return jsonError("Failed to delete registry item", 500);
      }
    }

    // Revoke a specific claim
    if (pathname.includes("/claims/") && method === "DELETE") {
      try {
        const parts = pathname.split("/");
        const claimId = parts[parts.length - 1];
        const regId = parts[parts.indexOf("registry") + 1];

        // Get claim details before deleting (to update quantity_claimed)
        const claim = await env.DB.prepare(
          "SELECT * FROM gift_registry_claims WHERE id = ? AND registry_id = ?"
        ).bind(claimId, regId).first<any>();

        if (!claim) return jsonError("Claim not found", 404);

        // Delete the claim
        await env.DB.prepare(
          "DELETE FROM gift_registry_claims WHERE id = ?"
        ).bind(claimId).run();

        // Update quantity_claimed on registry item
        await env.DB.prepare(
          `UPDATE gift_registry
           SET quantity_claimed = MAX(0, COALESCE(quantity_claimed, 0) - ?),
               updated_at = datetime('now')
           WHERE id = ?`
        ).bind(claim.quantity || 1, regId).run();

        return new Response(null, { status: 204 });
      } catch {
        return jsonError("Failed to revoke claim", 500);
      }
    }
  }

  return jsonError("Not Found", 404);
}
