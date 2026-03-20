import { Env } from "../..";
import { getGuestBySlug } from "../../services/guestService";

export async function handleGuestRoutes(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  // Public route: /api/guests/slug/:slug
  if (pathname.startsWith("/api/guests/slug/")) {
    const slug = pathname.split("/").pop();
    if (slug && method === "GET") {
      try {
        const guest = await getGuestBySlug(env, slug);
        if (!guest) {
          return new Response(JSON.stringify({ error: "Guest not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(guest), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch guest" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }
  }

  // Not Found for public guest routes
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
