import { Env } from "../../index";

export async function handleJourneyRoutes(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method !== "GET") {
    return res({ error: "Method not allowed" }, 405);
  }

  // GET /api/journey — list all items for public view
  if (pathname === "/api/journey") {
    try {
      const rows = await env.DB.prepare(
        "SELECT id, date, title, \"desc\", photo_url, bg, sort_order FROM journey ORDER BY sort_order ASC",
      ).all();
      return res({ items: rows.results });
    } catch {
      return res({ error: "Failed to fetch journey data" }, 500);
    }
  }

  return res({ error: "Not Found" }, 404);
}

function res(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
