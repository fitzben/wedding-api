import { Env } from "../../../index";
import { json, jsonError, normalisePhone } from "./utils";
import {
  createGuest, editGuest, deleteGuest, getGuestsPaginated,
} from "../../../services/guestService";
import { JWTPayload } from "../../../utils/jwt";

export async function handleGuests(
  req: Request,
  url: URL,
  env: Env,
  user: JWTPayload,
  method: string,
  pathname: string,
) {
  if (pathname === "/api/admin/guests") {
    if (method === "GET") {
      try {
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const search = url.searchParams.get("search") || "";
        const show_deleted = url.searchParams.get("show_deleted") === "true";
        const filter_category = url.searchParams.get("category") || "";
        const filter_priority = url.searchParams.get("priority") || "";
        const filter_importance = url.searchParams.get("importance") || "";
        const filter_guest_group_id = url.searchParams.get("guest_group_id") || "";
        const filter_invitation_type = url.searchParams.get("invitation_type") || "";
        return json(await getGuestsPaginated(env, page, limit, search, show_deleted, {
          category: filter_category,
          priority: filter_priority,
          importance: filter_importance,
          guest_group_id: filter_guest_group_id,
          invitation_type: filter_invitation_type,
        }));
      } catch { return jsonError("Failed to fetch guests", 500); }
    }
    if (method === "POST") {
      try {
        const body = (await req.json()) as any;
        const {
          first_name, last_name, phone_number,
          category, pax_allowed, priority, importance, notes,
          guest_group_id, invitation_type, event_access_override,
        } = body ?? {};
        if (!first_name || !last_name || !phone_number)
          return jsonError("first_name, last_name and phone_number are required", 400);
        const validInviteTypes = ["digital", "physical", "both"];
        const validAccess = ["both", "hm_only", "resepsi_only"];
        return json(await createGuest(env, {
          first_name, last_name,
          phone_number: normalisePhone(phone_number),
          category: category || "friend",
          pax_allowed: parseInt(pax_allowed) || 1,
          priority: priority || "medium",
          importance: importance || "normal",
          notes: notes || null,
          guest_group_id: guest_group_id || null,
          invitation_type: validInviteTypes.includes(invitation_type) ? invitation_type : "digital",
          event_access_override: validAccess.includes(event_access_override) ? event_access_override : null,
          created_by: user.user_id,
          updated_by: user.user_id,
        }), 201);
      } catch { return jsonError("Invalid JSON body", 400); }
    }
  }

  if (pathname === "/api/admin/guests/bulk-delete" && method === "POST") {
    try {
      const { ids } = (await req.json()) as any;
      if (!Array.isArray(ids) || !ids.length) return jsonError("ids required", 400);
      const results = await Promise.allSettled(ids.map(id => deleteGuest(env, id, user.user_id)));
      const deleted = results.filter(r => r.status === "fulfilled" && (r as any).value).length;
      return json({ deleted, total: ids.length });
    } catch { return jsonError("Failed to bulk delete guests", 500); }
  }

  if (pathname.startsWith("/api/admin/guests/") && pathname !== "/api/admin/guests/bulk-delete") {
    const id = pathname.split("/").pop();
    if (!id) return jsonError("Invalid ID", 400);
    if (method === "PUT") {
      try {
        const body = (await req.json()) as any;
        if (body.pax_allowed !== undefined) body.pax_allowed = parseInt(body.pax_allowed) || 1;
        if (body.notes !== undefined) body.notes = body.notes?.trim() || null;
        if (body.phone_number !== undefined) body.phone_number = normalisePhone(body.phone_number);
        if (body.guest_group_id !== undefined) body.guest_group_id = body.guest_group_id || null;
        if (body.invitation_type !== undefined && !['digital', 'physical', 'both'].includes(body.invitation_type)) body.invitation_type = 'digital';
        if (body.priority !== undefined && !['low', 'medium', 'high'].includes(body.priority)) body.priority = 'medium';
        if (body.importance !== undefined && !['normal', 'vip', 'vvip'].includes(body.importance)) body.importance = 'normal';
        if (body.event_access_override !== undefined) {
          const validAccess = ["both", "hm_only", "resepsi_only"];
          body.event_access_override = validAccess.includes(body.event_access_override)
            ? body.event_access_override
            : null; // null = reset to inherit from group
        }
        body.updated_by = user.user_id;
        const updated = await editGuest(env, id, body);
        if (!updated) return jsonError("Guest not found", 404);
        return json(updated);
      } catch { return jsonError("Failed to update guest", 500); }
    }
    if (method === "DELETE") {
      try {
        if (!await deleteGuest(env, id, user.user_id)) return jsonError("Guest not found", 404);
        return new Response(null, { status: 204 });
      } catch { return jsonError("Failed to delete guest", 500); }
    }
  }

  return jsonError("Not Found", 404);
}
