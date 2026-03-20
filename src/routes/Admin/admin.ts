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
import { jsonError } from "./handlers/utils";

export const handleAdminRoutes = async (
  request: Request,
  url: URL,
  env: Env
): Promise<Response> => {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  return withAuth(async (req, env, user) => {
    // ══════════════════════════════════════════════════════════════════════
    // ROLE-BASED ACCESS CONTROL
    // ══════════════════════════════════════════════════════════════════════
    
    // Admin has full access. Parents can only access Guest-related routes.
    if (user.role === "parents") {
      if (!pathname.startsWith("/api/admin/guests")) {
        return jsonError("Forbidden: Your role does not have access to this resource", 403);
      }
    } else if (user.role !== "admin") {
      return jsonError("Forbidden: Access denied", 403);
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
      return handleSettings(req, env, method, pathname);
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

    return jsonError("Not Found", 404);
  })(request, env);
};