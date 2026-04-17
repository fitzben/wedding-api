import type { Env } from "../index";

export type CreateRsvpInput = {
  name: string;
  attendance: "yes" | "no" | "maybe";
  pax: number;
  message?: string;
  guest_id?: string;
  event_attendance?: string | null;
};

export async function createRsvp(
  env: Env,
  input: CreateRsvpInput
): Promise<{ id: string } | null> {
  const { name, attendance, pax, message, guest_id, event_attendance } = input;

  const id = Date.now().toString();
  const created_at = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO rsvps (id, guest_id, name, attendance, pax, message, event_attendance, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      guest_id || null,
      name,
      attendance,
      pax,
      message || null,
      event_attendance ?? null,
      created_at
    )
    .run();

  return { id };
}

export async function updateRsvp(
  env: Env,
  id: string,
  input: Partial<CreateRsvpInput>
): Promise<boolean> {
  const { name, attendance, pax, message, event_attendance } = input;
  const updated_at = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (name) { fields.push("name = ?"); values.push(name); }
  if (attendance) { fields.push("attendance = ?"); values.push(attendance); }
  if (pax !== undefined) { fields.push("pax = ?"); values.push(Number(pax)); }
  if (message !== undefined) { fields.push("message = ?"); values.push(message || null); }
  if (event_attendance !== undefined) { fields.push("event_attendance = ?"); values.push(event_attendance ?? null); }

  if (fields.length === 0) return false;

  const query = `UPDATE rsvps SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`;
  const info = await env.DB.prepare(query).bind(...values, updated_at, id).run();

  return (info.meta.changes ?? 0) > 0;
}

export async function getRsvpByGuestId(env: Env, guestId: string): Promise<any | null> {
  return await env.DB.prepare("SELECT * FROM rsvps WHERE guest_id = ?").bind(guestId).first();
}

export async function getRsvpByName(env: Env, name: string): Promise<any | null> {
  return await env.DB.prepare("SELECT * FROM rsvps WHERE name = ? AND guest_id IS NULL").bind(name).first();
}

export async function getRsvps(env: Env): Promise<any[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.*, g.display_name as guest_display_name 
     FROM rsvps r 
     LEFT JOIN guests g ON r.guest_id = g.id 
     ORDER BY r.created_at DESC`
  ).all();
  return results;
}
