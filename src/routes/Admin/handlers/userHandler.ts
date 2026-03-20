import { Env } from "../../../index";
import { json, jsonError } from "./utils";
import { hashPassword } from "../../../services/authService";
import { JWTPayload } from "../../../utils/jwt";

export async function handleUsers(
  req: Request,
  env: Env,
  user: JWTPayload,
  method: string,
  pathname: string
) {
  if (pathname === "/api/admin/users") {
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare("SELECT id, name, email, role, created_at FROM admin_users ORDER BY created_at ASC").all();
        return json({ users: rows.results });
      } catch { return jsonError("Failed to fetch users", 500); }
    }
    if (method === "POST") {
      try {
        const { name, email, password, role } = (await req.json()) as any ?? {};
        if (!name || !email || !password) return jsonError("name, email and password are required", 400);
        if (!['admin', 'partner', 'parents'].includes(role)) return jsonError("Invalid role", 400);
        if (await env.DB.prepare("SELECT id FROM admin_users WHERE email = ?").bind(email).first()) return jsonError("Email already in use", 409);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO admin_users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))")
          .bind(id, name, email, await hashPassword(password), role).run();
        return json({ id, name, email, role }, 201);
      } catch (e: any) {
        if (e?.message?.includes("UNIQUE")) return jsonError("Email already in use", 409);
        return jsonError("Failed to create user", 500);
      }
    }
  }

  if (pathname.startsWith("/api/admin/users/")) {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const { name, email, password, role } = (await req.json()) as any ?? {};
        if (role && !['admin','partner','parents'].includes(role)) return jsonError("Invalid role", 400);
        if (!await env.DB.prepare("SELECT id FROM admin_users WHERE id = ?").bind(id).first()) return jsonError("User not found", 404);
        if (password) {
          await env.DB.prepare("UPDATE admin_users SET name=COALESCE(?1,name), email=COALESCE(?2,email), role=COALESCE(?3,role), password_hash=?4, updated_at=datetime('now') WHERE id=?5")
            .bind(name||null, email||null, role||null, await hashPassword(password), id).run();
        } else {
          await env.DB.prepare("UPDATE admin_users SET name=COALESCE(?1,name), email=COALESCE(?2,email), role=COALESCE(?3,role), updated_at=datetime('now') WHERE id=?4")
            .bind(name||null, email||null, role||null, id).run();
        }
        return json(await env.DB.prepare("SELECT id, name, email, role FROM admin_users WHERE id = ?").bind(id).first());
      } catch { return jsonError("Failed to update user", 500); }
    }
    if (method === "DELETE") {
      try {
        if (id === user.user_id) return jsonError("Cannot delete your own account", 400);
        if (!await env.DB.prepare("SELECT id FROM admin_users WHERE id = ?").bind(id).first()) return jsonError("User not found", 404);
        await env.DB.prepare("DELETE FROM admin_users WHERE id = ?").bind(id).run();
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete user", 500); }
    }
  }

  return jsonError("Not Found", 404);
}
