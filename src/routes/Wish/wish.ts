import { Env } from "../..";
import { createWish, CreateWishInput } from "../../services/wishService";

export async function handleWishRoutes(
  request: Request,
  url: URL,
  env: Env
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (pathname === "/api/wishes") {
    if (method === "POST") {
      try {
        const body = (await request.json()) as Partial<CreateWishInput>;
        const { name, message } = body;

        if (!name || !message) {
          return new Response(
            JSON.stringify({
              error: "name and message are required",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const newWish = await createWish(env, {
          name,
          message,
        });

        return new Response(JSON.stringify(newWish), {
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
