import { Env } from "../../../index";
import { json, jsonError } from "./utils";
import { verifyPassword, hashPassword } from "../../../services/authService";
import { JWTPayload } from "../../../utils/jwt";

export async function handleChangePassword(
  req: Request,
  env: Env,
  user: JWTPayload
) {
  try {
    const { current_password, new_password } = (await req.json()) as any ?? {};
    if (!current_password || !new_password) return jsonError("current_password and new_password are required", 400);
    if (new_password.length < 8) return jsonError("new_password must be at least 8 characters", 400);
    const userId = user.user_id;
    const row = await env.DB.prepare("SELECT password_hash FROM admin_users WHERE id = ?").bind(userId).first() as any;
    if (!row) return jsonError("User not found", 404);
    if (!await verifyPassword(current_password, row.password_hash)) return jsonError("Current password is incorrect", 401);
    await env.DB.prepare("UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(await hashPassword(new_password), userId).run();
    return json({ ok: true });
  } catch { return jsonError("Failed to change password", 500); }
}
