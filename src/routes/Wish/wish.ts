import { Env } from "../..";
import { createWish, getWishes, CreateWishInput } from "../../services/wishService";

export async function handleWishRoutes(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (pathname === "/api/wishes") {
    if (method === "GET") {
      try {
        const wishes = await getWishes(env);
        return new Response(JSON.stringify({ wishes }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to fetch wishes" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (method === "POST") {
      try {
        const body = (await request.json()) as Partial<CreateWishInput>;
        const { name, message } = body;

        if (!name || !message) {
          return new Response(
            JSON.stringify({ error: "name and message are required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // 1. Validate name length
        if (name.length > 100) {
          return new Response(JSON.stringify({ error: "Name too long (max 100)" }), { status: 400 });
        }

        // 2. Validate message length
        if (message.length > 1000) {
          return new Response(JSON.stringify({ error: "Message too long (max 1000)" }), { status: 400 });
        }

        const newWish = await createWish(env, { name, message });
        return new Response(JSON.stringify(newWish), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch {
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