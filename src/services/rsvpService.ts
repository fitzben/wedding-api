import type { Env } from "../index";

export type CreateRsvpInput = {
  name: string;
  attendance: "yes" | "no" | "maybe";
  pax: number;
  message?: string;
  guest_id?: string;
};

export async function createRsvp(
  env: Env,
  input: CreateRsvpInput
): Promise<{ id: string } | null> {
  const { name, attendance, pax, message, guest_id } = input;

  const id = Date.now().toString();
  const created_at = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO rsvps (id, guest_id, name, attendance, pax, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      guest_id || null,
      name,
      attendance,
      pax,
      message || null,
      created_at
    )
    .run();

  return { id };
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
