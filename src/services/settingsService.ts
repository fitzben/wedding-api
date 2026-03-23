import type { Env } from "../index";

// Keys yang aman di-expose ke publik — tidak ada data sensitif
const PUBLIC_KEYS = [
  "bride_name", "bride_nickname",
  "groom_name", "groom_nickname",
  "hm_date", "hm_time_start", "hm_time_end",
  "hm_venue_name", "hm_address", "hm_maps_url",
  "resepsi_date", "resepsi_time_start", "resepsi_time_end",
  "resepsi_venue_name", "resepsi_address", "resepsi_maps_url",
  "countdown_target", "countdown_override_date",
  "rsvp_enabled", "gift_enabled", "wishes_enabled",
  "maintenance_mode",
];

export async function getPublicSettings(env: Env): Promise<Record<string, any>> {
  const placeholders = PUBLIC_KEYS.map(() => "?").join(", ");
  const rows = await env.DB.prepare(
    `SELECT key, value FROM settings WHERE key IN (${placeholders})`
  )
    .bind(...PUBLIC_KEYS)
    .all();

  const settings: Record<string, any> = {};
  for (const row of rows.results as any[]) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  return settings;
}