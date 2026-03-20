import { Env } from "../../../index";
import { json, jsonError } from "./utils";

export async function handleGroups(
  req: Request,
  env: Env,
  method: string,
  pathname: string
) {
  if (pathname === "/api/admin/guest-groups") {
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare(
          "SELECT * FROM guest_groups WHERE deleted_at IS NULL ORDER BY name ASC"
        ).all();
        return json({ groups: rows.results });
      } catch { return jsonError("Failed to fetch guest groups", 500); }
    }
    if (method === "POST") {
      try {
        const { name, description } = (await req.json()) as any ?? {};
        if (!name?.trim()) return jsonError("name is required", 400);
        const id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO guest_groups (id, name, description, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
        ).bind(id, name.trim(), description?.trim() || null).run();
        return json({ id, name: name.trim(), description: description?.trim() || null }, 201);
      } catch { return jsonError("Failed to create guest group", 500); }
    }
  }

  if (pathname.startsWith("/api/admin/guest-groups/")) {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const { name, description } = (await req.json()) as any ?? {};
        if (!name?.trim()) return jsonError("name is required", 400);
        const res = await env.DB.prepare(
          "UPDATE guest_groups SET name=?, description=?, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL"
        ).bind(name.trim(), description?.trim() || null, id).run();
        if (!res.meta.changes) return jsonError("Group not found", 404);
        return json(await env.DB.prepare("SELECT * FROM guest_groups WHERE id=?").bind(id).first());
      } catch { return jsonError("Failed to update guest group", 500); }
    }
    if (method === "DELETE") {
      try {
        const res = await env.DB.prepare(
          "UPDATE guest_groups SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL"
        ).bind(id).run();
        if (!res.meta.changes) return jsonError("Group not found", 404);
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete guest group", 500); }
    }
  }

  return jsonError("Not Found", 404);
}
