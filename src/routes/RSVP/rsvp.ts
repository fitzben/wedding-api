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
        const body = (await request.json()) as Partial<CreateRsvpInput>;
        const { name, attendance, pax, message, guest_id } = body;

        if (!name || !attendance || pax === undefined) {
          return new Response(
            JSON.stringify({
              error: "name, attendance, and pax are required",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const validAttendance = ["yes", "no", "maybe"];
        if (!validAttendance.includes(attendance)) {
          return new Response(
            JSON.stringify({
              error: "Invalid attendance value",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        let existingRsvp = null;
        if (guest_id) {
          existingRsvp = await getRsvpByGuestId(env, guest_id);
        } else if (name) {
          // Fallback: search by name if guest_id is null/missing
          existingRsvp = await getRsvpByName(env, name.trim());
        }

        if (existingRsvp) {
          await updateRsvp(env, existingRsvp.id, {
            name: name.trim(),
            attendance,
            pax: Number(pax),
            message: message?.trim(),
          });
          return new Response(JSON.stringify({ id: existingRsvp.id, updated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const newRsvp = await createRsvp(env, {
          name: name.trim(),
          attendance,
          pax: Number(pax),
          message: message?.trim(),
          guest_id,
        });

        return new Response(JSON.stringify(newRsvp), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
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
