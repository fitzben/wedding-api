import { handleGuestRoutes } from "./routes/Guests/guests";
import { handleHealthRoute } from "./routes/health";
import { handleAuthRoutes } from "./routes/Auth/auth";
import { handleAdminRoutes } from "./routes/Admin/admin";
import { handleRsvpRoutes } from "./routes/RSVP/rsvp";
import { handleWishRoutes } from "./routes/Wish/wish";
import { handleSettingsRoutes } from "./routes/Settings/settings";
import { handleGalleryRoutes } from "./routes/Gallery/gallery";
import { handleGiftsRoutes } from "./routes/Gift/gift";
import { handleJourneyRoutes } from "./routes/Journey/journey";
import { withCORS } from "./utils/cors";
import { withSecurityHeaders } from "./utils/security";

export interface Env {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  KV: KVNamespace;
  JWT_SECRET: string;
  R2_PUBLIC_URL: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  ALLOWED_ORIGINS?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Handle OPTIONS request (preflight)
    if (request.method === "OPTIONS") {
      return withCORS(
        withSecurityHeaders(new Response(null, { status: 200 })),
        request,
        env.ALLOWED_ORIGINS,
      );
    }

    let response: Response;

    if (pathname.startsWith("/api/guests")) {
      response = await handleGuestRoutes(request, url, env);
    } else if (pathname.startsWith("/api/settings")) {
      response = await handleSettingsRoutes(request, url, env);
    } else if (pathname.startsWith("/api/gallery")) {
      response = await handleGalleryRoutes(request, url, env);
    } else if (pathname.startsWith("/api/gifts")) {
      response = await handleGiftsRoutes(request, url, env);
    } else if (pathname.startsWith("/api/journey")) {
      response = await handleJourneyRoutes(request, url, env);
    } else if (pathname.startsWith("/api/admin")) {
      response = await handleAdminRoutes(request, url, env);
    } else if (pathname.startsWith("/api/auth")) {
      response = await handleAuthRoutes(request, url, env);
    } else if (pathname.startsWith("/api/rsvp")) {
      response = await handleRsvpRoutes(request, url, env);
    } else if (pathname.startsWith("/api/wishes")) {
      response = await handleWishRoutes(request, url, env);
    } else if (pathname === "/api/health") {
      response = await handleHealthRoute(request);
    } else if (pathname.startsWith("/api/")) {
      response = new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      response = new Response("Not Found", { status: 404 });
    }

    return withCORS(withSecurityHeaders(response), request, env.ALLOWED_ORIGINS);
  },
};