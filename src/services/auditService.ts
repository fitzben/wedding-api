import type { Env } from "../index";
import type { JWTPayload } from "../utils/jwt";

export type AuditAction =
  | "guest.create" | "guest.update" | "guest.delete" | "guest.restore"
  | "guest.bulk_delete" | "guest.mark_invited"
  | "user.create" | "user.update" | "user.delete"
  | "settings.update"
  | "permission.update"
  | "auth.login" | "auth.logout"
  | "group.create" | "group.update" | "group.delete";

export async function writeAuditLog(
  env: Env,
  user: JWTPayload,
  action: AuditAction,
  resource: string,
  options: {
    resource_id?: string;
    detail?: string;
    request?: Request;
  } = {}
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    const ip =
      options.request?.headers.get("CF-Connecting-IP") ||
      options.request?.headers.get("X-Forwarded-For") ||
      null;

    const userRow = await env.DB.prepare(
      "SELECT name FROM admin_users WHERE id = ?"
    ).bind(user.user_id).first<{ name: string }>();

    await env.DB.prepare(
      `INSERT INTO audit_logs (id, user_id, user_name, action, resource, resource_id, detail, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      user.user_id,
      userRow?.name || null,
      action,
      resource,
      options.resource_id || null,
      options.detail || null,
      ip
    ).run();
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
