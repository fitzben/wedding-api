import { Env } from "../../../index";
import { json, jsonError } from "./utils";
import { getRsvps } from "../../../services/rsvpService";
import { getWishes } from "../../../services/wishService";

export async function handleRsvpsAndWishes(
  env: Env,
  method: string,
  pathname: string
) {
  if (pathname === "/api/admin/rsvp" && method === "GET") {
    try { return json(await getRsvps(env)); }
    catch { return jsonError("Failed to fetch RSVPs", 500); }
  }
  if (pathname === "/api/admin/wishes" && method === "GET") {
    try { return json(await getWishes(env)); }
    catch { return jsonError("Failed to fetch wishes", 500); }
  }

  return jsonError("Not Found", 404);
}
