import type { Env } from "../index";
import { Guest } from "../routes/Guests/type";
import { generateSlug } from "../utils/slug";

export async function getGuests(env: Env): Promise<Guest[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM guests WHERE deleted_at IS NULL ORDER BY created_at DESC",
  ).all<Guest>();
  return results;
}

export async function getGuestsPaginated(
  env: Env,
  page: number,
  limit: number,
  search: string = "",
  show_deleted: boolean = false,
  filters: {
    category?: string;
    priority?: string;
    importance?: string;
    guest_group_id?: string;
    invitation_type?: string;
    invite_status?: string;
    created_by?: string;
  } = {},
): Promise<{ data: Guest[]; total: number; page: number }> {
  const offset = (page - 1) * limit;

  // Build the WHERE clause dynamically
  let whereClause = show_deleted
    ? "WHERE deleted_at IS NOT NULL"
    : "WHERE deleted_at IS NULL";
  const bindParams: any[] = [];

  if (search) {
    whereClause += " AND (display_name LIKE ? OR phone_number LIKE ?)";
    bindParams.push(`%${search}%`, `%${search}%`);
  }

  if (filters.category) {
    whereClause += " AND category = ?";
    bindParams.push(filters.category);
  }
  if (filters.priority) {
    whereClause += " AND priority = ?";
    bindParams.push(filters.priority);
  }
  if (filters.importance) {
    whereClause += " AND importance = ?";
    bindParams.push(filters.importance);
  }
  if (filters.guest_group_id) {
    whereClause += " AND guest_group_id = ?";
    bindParams.push(filters.guest_group_id);
  }
  if (filters.invitation_type) {
    whereClause += " AND invitation_type = ?";
    bindParams.push(filters.invitation_type);
  }
  if (filters.invite_status) {
    whereClause += " AND invite_status = ?";
    bindParams.push(filters.invite_status);
  }
  if (filters.created_by) {
    whereClause += " AND created_by = ?";
    bindParams.push(filters.created_by);
  }

  // Count total
  // Re-alias whereClause for aliased query (g.column)
  const aliasedWhere = whereClause
    .replace(/deleted_at/g, "g.deleted_at")
    .replace(/display_name/g, "g.display_name")
    .replace(/phone_number/g, "g.phone_number")
    .replace(/category/g, "g.category")
    .replace(/priority/g, "g.priority")
    .replace(/importance/g, "g.importance")
    .replace(/guest_group_id/g, "g.guest_group_id")
    .replace(/invitation_type/g, "g.invitation_type")
    .replace(/invite_status/g, "g.invite_status")
    .replace(/\bcreated_by\b/g, "g.created_by");

  const totalResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM guests g LEFT JOIN guest_groups gg ON gg.id = g.guest_group_id AND gg.deleted_at IS NULL ${aliasedWhere}`,
  )
    .bind(...bindParams)
    .first<{ total: number }>();

  const total = totalResult?.total ?? 0;

  // Fetch with group join to resolve event_access
  // resolved_event_access = guest override ?? group default ?? 'both'
  const { results } = await env.DB.prepare(
    `SELECT g.*,
       gg.name AS guest_group_name,
       gg.default_event_access AS group_event_access,
       COALESCE(g.event_access_override, gg.default_event_access, 'both') AS resolved_event_access
     FROM guests g
     LEFT JOIN guest_groups gg ON gg.id = g.guest_group_id AND gg.deleted_at IS NULL
     ${aliasedWhere}
     ORDER BY g.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...bindParams, limit, offset)
    .all<Guest>();

  return { data: results, total, page };
}

type CreateGuestInput = {
  first_name: string;
  last_name: string;
  phone_number: string;
  category?: string;
  pax_allowed?: number;
  notes?: string | null;
  priority?: string;
  importance?: string;
  guest_group_id?: string | null;
  invitation_type?: string;
  event_access_override?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  display_name?: string | null;
  enable_display_name?: boolean;
  is_verified?: boolean;
};

async function ensureUniqueSlug(db: D1Database, slug: string): Promise<string> {
  const result = await db
    .prepare("SELECT id FROM guests WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first();
  if (!result) return slug;

  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  const newSlug = `${slug}-${random4}`;
  return ensureUniqueSlug(db, newSlug);
}

export async function createGuest(
  env: Env,
  input: CreateGuestInput,
): Promise<Guest> {
  const {
    first_name,
    last_name,
    phone_number,
    category = "friend",
    pax_allowed = 1,
    priority = "medium",
    importance = "normal",
    notes = null,
    guest_group_id = null,
    invitation_type = "digital",
    event_access_override = null,
    created_by = null,
    updated_by = null,
    enable_display_name = false,
    is_verified = false,
  } = input;

  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const display_name = `${first_name} ${last_name}`.trim();

  const baseSlug = generateSlug(display_name);
  const slug = await ensureUniqueSlug(env.DB, baseSlug);

  const invite_status = "pending";
  const rsvp_status = "pending";

  await env.DB.prepare(
    `INSERT INTO guests (
      id, first_name, last_name, phone_number, display_name, slug,
      category, priority, importance, pax_allowed, invite_status,
      rsvp_status, notes, guest_group_id, invitation_type,
      event_access_override, created_by, updated_by, created_at,
      enable_display_name, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      first_name,
      last_name,
      phone_number,
      input?.display_name || display_name,
      slug,
      category,
      priority,
      importance,
      pax_allowed,
      invite_status,
      rsvp_status,
      notes,
      guest_group_id,
      invitation_type,
      event_access_override,
      created_by,
      updated_by,
      created_at,
      enable_display_name ? 1 : 0,
      is_verified ? 1 : 0,
    )
    .run();

  const result = await env.DB.prepare("SELECT * FROM guests WHERE id = ?")
    .bind(id)
    .first<Guest>();
  return result!;
}

export async function deleteGuest(
  env: Env,
  id: string,
  userId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const info = await env.DB.prepare(
    "UPDATE guests SET deleted_at = ?, deleted_by = ? WHERE id = ? AND deleted_at IS NULL",
  )
    .bind(now, userId, id)
    .run();
  return (info.meta.changes ?? 0) > 0;
}

export async function editGuest(
  env: Env,
  id: string,
  updates: Partial<Guest>,
): Promise<Guest | null> {
  const allowedFields = [
    "first_name",
    "last_name",
    "display_name",
    "phone_number",
    "category",
    "priority",
    "importance",
    "pax_allowed",
    "invite_status",
    "rsvp_status",
    "notes",
    "guest_group_id",
    "invitation_type",
    "event_access_override",
    "updated_by",
    "enable_display_name",
    "is_verified",
    "slug",
  ];

  const updated_at = new Date().toISOString();
  const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));

  if (keys.length === 0 && !updates.updated_at) {
    // Nothing to update
  }

  const fields = [...keys, "updated_at"];
  const setClause = fields.map((k) => `${k} = ?`).join(", ");
  const values = [
    ...keys.map((k) => {
      const val = (updates as any)[k];
      if (typeof val === "boolean") return val ? 1 : 0;
      return val;
    }),
    updated_at,
  ];

  await env.DB.prepare(
    `UPDATE guests SET ${setClause} WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(...values, id)
    .run();

  const result = await env.DB.prepare(
    "SELECT * FROM guests WHERE id = ? AND deleted_at IS NULL",
  )
    .bind(id)
    .first<Guest>();
  return result;
}

export async function getGuestByPhone(
  env: Env,
  phone: string,
): Promise<{ id: string } | null> {
  return await env.DB.prepare(
    "SELECT id FROM guests WHERE phone_number = ? AND deleted_at IS NULL LIMIT 1",
  )
    .bind(phone)
    .first<{ id: string }>();
}

export async function getGuestBySlug(
  env: Env,
  slug: string,
): Promise<Guest | null> {
  const result = await env.DB.prepare(
    `SELECT g.*,
       gg.name AS guest_group_name,
       gg.default_event_access AS group_event_access,
       COALESCE(g.event_access_override, gg.default_event_access, 'both') AS resolved_event_access,
       r.attendance AS rsvp_attendance,
       r.pax AS rsvp_pax,
       r.message AS rsvp_message,
       r.id AS rsvp_id
     FROM guests g
     LEFT JOIN guest_groups gg ON gg.id = g.guest_group_id AND gg.deleted_at IS NULL
     LEFT JOIN rsvps r ON r.guest_id = g.id
     WHERE g.slug = ? AND g.deleted_at IS NULL LIMIT 1`,
  )
    .bind(slug)
    .first<any>();

  if (!result) return null;

  // Add invite_url
  result.invite_url = `https://benelin.my.id/invite/${slug}`;

  // Update visit analytics
  const now = new Date().toISOString();
  if (!result.visited_at) {
    // First visit
    await env.DB.prepare(
      "UPDATE guests SET visited_at = ?, last_visited_at = ?, visit_count = 1 WHERE id = ?",
    )
      .bind(now, now, result.id)
      .run();
    result.visited_at = now;
  } else {
    // Subsequent visits
    await env.DB.prepare(
      "UPDATE guests SET last_visited_at = ?, visit_count = COALESCE(visit_count, 0) + 1 WHERE id = ?",
    )
      .bind(now, result.id)
      .run();
  }
  result.visit_count = (result.visit_count || 0) + 1;
  result.last_visited_at = now;

  return result;
}
