import { Env } from "../../../index";
import { json, jsonError } from "./utils";

export async function handleGroups(
  req: Request,
  env: Env,
  method: string,
  pathname: string,
) {
  if (pathname === "/api/admin/guest-groups") {
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare(
          "SELECT * FROM guest_groups WHERE deleted_at IS NULL ORDER BY name ASC",
        ).all();
        return json({ groups: rows.results });
      } catch {
        return jsonError("Failed to fetch guest groups", 500);
      }
    }
    if (method === "POST") {
      try {
        const { name, description, default_event_access } =
          ((await req.json()) as any) ?? {};
        if (!name?.trim()) return jsonError("name is required", 400);
        const validAccess = ["both", "hm_only", "resepsi_only"];
        const access = validAccess.includes(default_event_access)
          ? default_event_access
          : "both";
        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO guest_groups (id, name, description, default_event_access, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
        )
          .bind(id, name.trim(), description?.trim() || null, access)
          .run();
        return json(
          await env.DB.prepare("SELECT * FROM guest_groups WHERE id = ?")
            .bind(id)
            .first(),
          201,
        );
      } catch {
        return jsonError("Failed to create guest group", 500);
      }
    }
  }

  if (pathname.startsWith("/api/admin/guest-groups/")) {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const { name, description, default_event_access } =
          ((await req.json()) as any) ?? {};
        if (!name?.trim()) return jsonError("name is required", 400);
        const validAccess = ["both", "hm_only", "resepsi_only"];
        const fields: string[] = [
          "name=?",
          "description=?",
          "updated_at=datetime('now')",
        ];
        const vals: any[] = [name.trim(), description?.trim() || null];
        if (
          default_event_access !== undefined &&
          validAccess.includes(default_event_access)
        ) {
          fields.splice(2, 0, "default_event_access=?");
          vals.splice(2, 0, default_event_access);
        }
        vals.push(id);
        const res = await env.DB.prepare(
          `UPDATE guest_groups SET ${fields.join(", ")} WHERE id=? AND deleted_at IS NULL`,
        )
          .bind(...vals)
          .run();
        if (!res.meta.changes) return jsonError("Group not found", 404);
        return json(
          await env.DB.prepare("SELECT * FROM guest_groups WHERE id=?")
            .bind(id)
            .first(),
        );
      } catch {
        return jsonError("Failed to update guest group", 500);
      }
    }
    if (method === "DELETE") {
      try {
        const res = await env.DB.prepare(
          "UPDATE guest_groups SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL",
        )
          .bind(id)
          .run();
        if (!res.meta.changes) return jsonError("Group not found", 404);
        return new Response(null, { status: 204 });
      } catch {
        return jsonError("Failed to delete guest group", 500);
      }
    }
  }

  return jsonError("Not Found", 404);
}
