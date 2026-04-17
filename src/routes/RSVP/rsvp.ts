import { Env } from "../..";
import { createRsvp, CreateRsvpInput, updateRsvp, getRsvpByGuestId, getRsvpByName } from "../../services/rsvpService";

export async function handleRsvpRoutes(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (pathname === "/api/rsvp") {
    if (method === "POST" || method === "PUT") {
      try {
        const body = (await request.json()) as any;
        const { name, attendance, pax, message, guest_id, event_attendance } = body ?? {};

        // 1. Required fields
        if (!name || attendance === undefined || pax === undefined) {
          return new Response(JSON.stringify({ error: "name, attendance, and pax are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 2. Name length
        if (typeof name !== "string" || name.length > 100) {
          return new Response(JSON.stringify({ error: "Name too long (max 100)" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 3. Message length
        if (message && (typeof message !== "string" || message.length > 1000)) {
          return new Response(JSON.stringify({ error: "Message too long (max 1000)" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 4. Pax range
        const numPax = Number(pax);
        if (isNaN(numPax) || numPax < 1 || numPax > 20) {
          return new Response(JSON.stringify({ error: "Invalid pax (must be 1–20)" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 5. Attendance enum
        const validAttendance = ["yes", "no", "maybe"];
        if (!validAttendance.includes(attendance)) {
          return new Response(JSON.stringify({ error: "Invalid attendance value" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 6. event_attendance — optional, validate only if provided
        const validEventAttendance = ["hm_only", "resepsi_only", "both"];
        const safeEventAttendance: string | null =
          event_attendance && validEventAttendance.includes(event_attendance)
            ? event_attendance
            : null;

        // 7. guest_id format
        if (guest_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guest_id)) {
          return new Response(JSON.stringify({ error: "Invalid guest_id format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Check existing RSVP
        let existingRsvp = null;
        if (guest_id) {
          existingRsvp = await getRsvpByGuestId(env, guest_id);
        } else if (name) {
          existingRsvp = await getRsvpByName(env, name.trim());
        }

        if (existingRsvp) {
          await updateRsvp(env, existingRsvp.id, {
            name: name.trim(),
            attendance,
            pax: numPax,
            message: message?.trim(),
            event_attendance: safeEventAttendance,
          });
          return new Response(JSON.stringify({ id: existingRsvp.id, updated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const newRsvp = await createRsvp(env, {
          name: name.trim(),
          attendance,
          pax: numPax,
          message: message?.trim(),
          guest_id: guest_id || undefined,
          event_attendance: safeEventAttendance,
        });

        return new Response(JSON.stringify(newRsvp), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("RSVP handler error:", error);
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
