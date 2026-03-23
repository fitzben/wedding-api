import { Env } from "../../index";
import { getPublicSettings } from "../../services/settingsService";

export async function handleSettingsRoutes(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (pathname === "/api/settings" && method === "GET") {
    try {
      const settings = await getPublicSettings(env);
      return new Response(JSON.stringify({ settings }), {
        headers: {
          "Content-Type": "application/json",
          // Cache 60 detik di browser — settings jarang berubah
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch {
      return new Response(JSON.stringify({ settings: {} }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}