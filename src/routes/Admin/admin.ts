import { Env } from "../../index";
import { withAuth } from "../../middleware/auth";
import { handleDashboard } from "./handlers/dashboardHandler";
import { handleGuests } from "./handlers/guestHandler";
import { handleGroups } from "./handlers/groupHandler";
import { handleGallery } from "./handlers/galleryHandler";
import { handleGifts } from "./handlers/giftHandler";
import { handleUsers } from "./handlers/userHandler";
import { handleSettings } from "./handlers/settingsHandler";
import { handleChangePassword } from "./handlers/passwordHandler";
import { handleRsvpsAndWishes } from "./handlers/rsvpWishHandler";
import { handleJourney } from "./handlers/journeyHandler";
import { jsonError, json } from "./handlers/utils";
import { handlePermissions, getRolePermissions } from "./handlers/permissionHandler";

export const handleAdminRoutes = async (
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> => {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  return withAuth(async (req, env, user) => {
    // ══════════════════════════════════════════════════════════════════════
    // ROLE-BASED ACCESS CONTROL
    // ══════════════════════════════════════════════════════════════════════

    // admin always has full access
    if (user.role !== 'admin') {
      // Allow non-admin to fetch their own permissions (needed for sidebar rendering)
      if (pathname === '/api/admin/permissions' && method === 'GET') {
        return handlePermissions(req, env, user, method, pathname);
      }

      const perms = await getRolePermissions(env, user.role);

      // Map pathname to resource key
      const getResource = (path: string): string => {
        if (path === '/api/admin/dashboard') return 'dashboard';
        if (path.startsWith('/api/admin/guests')) return 'guests';
        if (path.startsWith('/api/admin/guest-groups')) return 'groups';
        if (path === '/api/admin/rsvp') return 'rsvp';
        if (path === '/api/admin/wishes') return 'wishes';
        if (path.startsWith('/api/admin/journey')) return 'journey';
        if (path.startsWith('/api/admin/gallery')) return 'gallery';
        if (path.startsWith('/api/admin/gifts')) return 'gifts';
        if (path.startsWith('/api/admin/settings')) return 'settings';
        if (path.startsWith('/api/admin/users')) return 'users';
        if (path === '/api/admin/change-password') return 'settings.security';
        return '';
      };

      // Endpoints needed by all authenticated roles as supporting data
      const SHARED_READONLY_PATHS = [
        '/api/admin/settings',        // needed by useAdminGuests for WA template
        '/api/admin/guest-groups',    // needed by Guests page for group dropdown
        '/api/admin/users',           // needed by Guests page for "created by" filter
        '/api/admin/guests/names',    // needed for duplicate detection
      ];

      if (
        method === 'GET' &&
        SHARED_READONLY_PATHS.some(p => pathname.startsWith(p))
      ) {
        // Allow read-only access — fall through to handler below
      } else {
        const resource = getResource(pathname);
        if (!resource || !perms[resource]) {
          return jsonError('Forbidden: Your role does not have access to this resource', 403);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ROUTING TO HANDLERS
    // ══════════════════════════════════════════════════════════════════════

    // Dashboard
    if (pathname === "/api/admin/dashboard") {
      return handleDashboard(env);
    }

    // Guests
    if (pathname.startsWith("/api/admin/guests")) {
      return handleGuests(req, url, env, user, method, pathname);
    }

    // Guest Groups
    if (pathname.startsWith("/api/admin/guest-groups")) {
      return handleGroups(req, env, method, pathname);
    }

    // Settings
    if (pathname === "/api/admin/settings") {
      return handleSettings(req, env, user, method, pathname);
    }

    // Users
    if (pathname.startsWith("/api/admin/users")) {
      return handleUsers(req, env, user, method, pathname);
    }

    // Change Password
    if (pathname === "/api/admin/change-password" && method === "POST") {
      return handleChangePassword(req, env, user);
    }

    // Gallery
    if (pathname.startsWith("/api/admin/gallery")) {
      return handleGallery(req, url, env, method, pathname);
    }

    // Gifts
    if (pathname.startsWith("/api/admin/gifts")) {
      return handleGifts(req, url, env, method, pathname);
    }

    // RSVP / Wishes (Read-only for Admin)
    if (pathname === "/api/admin/rsvp" || pathname === "/api/admin/wishes") {
      return handleRsvpsAndWishes(env, method, pathname);
    }

    // Journey
    if (pathname.startsWith("/api/admin/journey")) {
      return handleJourney(req, url, env, method, pathname);
    }

    // Permissions
    if (pathname.startsWith("/api/admin/permissions")) {
      return handlePermissions(req, env, user, method, pathname);
    }

    // Audit Logs (admin only)
    if (pathname.startsWith("/api/admin/audit-logs") && method === "GET") {
      if (user.role !== "admin") return jsonError("Forbidden", 403);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = (page - 1) * limit;
      try {
        const [rows, countRow] = await Promise.all([
          env.DB.prepare(
            "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?"
          ).bind(limit, offset).all(),
          env.DB.prepare("SELECT COUNT(*) as total FROM audit_logs").first<{ total: number }>(),
        ]);
        return json({ data: rows.results, total: countRow?.total || 0, page });
      } catch {
        return jsonError("Failed to fetch audit logs", 500);
      }
    }

    return jsonError("Not Found", 404);
  })(request, env);
};
