import { Env } from "../../../index";
import { json, jsonError } from "./utils";
import { JWTPayload } from "../../../utils/jwt";
import { writeAuditLog } from "../../../services/auditService";

export async function handleSettings(
  req: Request,
  env: Env,
  user: JWTPayload,
  method: string,
  pathname: string
) {
  if (pathname === "/api/admin/settings") {
    if (method === "GET") {
      try {
        const rows = await env.DB.prepare("SELECT key, value FROM settings").all();
        const settings: Record<string, any> = {};
        for (const row of rows.results as any[]) {
          try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
        }
        return json({ settings });
      } catch { return jsonError("Failed to fetch settings", 500); }
    }
    if (method === "PUT") {
      try {
        const body = (await req.json()) as any;
        const entries = Object.entries(body);
        if (!entries.length) return jsonError("No settings provided", 400);
        const stmts = entries.map(([key, value]) =>
          env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')").bind(key, JSON.stringify(value))
        );
        await env.DB.batch(stmts);
        writeAuditLog(env, user, "settings.update", "settings", { request: req });
        return json({ ok: true });
      } catch { return jsonError("Failed to save settings", 500); }
    }
  }

  return jsonError("Not Found", 404);
}
