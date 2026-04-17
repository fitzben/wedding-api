import { Env } from "../../../index";
import { json, jsonError } from "./utils";
import { JWTPayload } from "../../../utils/jwt";

const VALID_RESOURCES = [
  'dashboard', 'guests', 'groups', 'rsvp', 'wishes',
  'journey', 'gallery', 'gifts', 'settings',
  'settings.wedding', 'settings.features', 'settings.users',
  'settings.whatsapp', 'settings.livestream', 'settings.dresscode',
  'settings.security',
];

const VALID_ROLES = ['partner', 'parents'];

export async function handlePermissions(
  req: Request,
  env: Env,
  user: JWTPayload,
  method: string,
  pathname: string,
) {
  // GET /api/admin/permissions
  if (pathname === '/api/admin/permissions' && method === 'GET') {
    // Non-admin: hanya boleh lihat permissions role mereka sendiri
    if (user.role !== 'admin') {
      try {
        const perms = await getRolePermissions(env, user.role);
        return json({ permissions: { [user.role]: perms } });
      } catch {
        return jsonError('Failed to fetch permissions', 500);
      }
    }

    // Admin: return semua permissions semua role
    try {
      const { results } = await env.DB.prepare(
        'SELECT role, resource, allowed FROM role_permissions ORDER BY role, resource'
      ).all<{ role: string; resource: string; allowed: number }>();

      const grouped: Record<string, Record<string, boolean>> = {
        partner: {},
        parents: {},
      };
      for (const row of results) {
        if (grouped[row.role]) {
          grouped[row.role][row.resource] = row.allowed === 1;
        }
      }
      return json({ permissions: grouped });
    } catch {
      return jsonError('Failed to fetch permissions', 500);
    }
  }

  // PUT /api/admin/permissions — only admin can update
  if (pathname === '/api/admin/permissions' && method === 'PUT') {
    if (user.role !== 'admin') return jsonError('Forbidden', 403);

    try {
      const body = (await req.json()) as any;
      const { role, permissions } = body ?? {};

      if (!VALID_ROLES.includes(role)) return jsonError('Invalid role', 400);
      if (!permissions || typeof permissions !== 'object') return jsonError('permissions object required', 400);

      const stmts = Object.entries(permissions)
        .filter(([resource]) => VALID_RESOURCES.includes(resource))
        .map(([resource, allowed]) =>
          env.DB.prepare(
            `INSERT INTO role_permissions (id, role, resource, allowed, updated_at)
             VALUES (lower(hex(randomblob(16))), ?, ?, ?, datetime('now'))
             ON CONFLICT(role, resource) DO UPDATE SET allowed = excluded.allowed, updated_at = excluded.updated_at`
          ).bind(role, resource, allowed ? 1 : 0)
        );

      if (stmts.length > 0) await env.DB.batch(stmts);
      return json({ ok: true, updated: stmts.length });
    } catch {
      return jsonError('Failed to update permissions', 500);
    }
  }

  return jsonError('Not Found', 404);
}

// Helper: load permissions for a specific role from DB
export async function getRolePermissions(
  env: Env,
  role: string,
): Promise<Record<string, boolean>> {
  if (role === 'admin') {
    // admin always has full access
    return Object.fromEntries(VALID_RESOURCES.map(r => [r, true]));
  }
  const { results } = await env.DB.prepare(
    'SELECT resource, allowed FROM role_permissions WHERE role = ?'
  ).bind(role).all<{ resource: string; allowed: number }>();

  return Object.fromEntries(results.map(r => [r.resource, r.allowed === 1]));
}
