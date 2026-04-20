import { Env } from "../index";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { isTokenBlacklisted } from "../services/authService";

export type AuthenticatedHandler = (
  request: Request,
  env: Env,
  user: JWTPayload
) => Promise<Response>;

export const withAuth = (handler: AuthenticatedHandler) => {
  return async (request: Request, env: Env): Promise<Response> => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];

    if (await isTokenBlacklisted(env.KV, token)) {
      return new Response(JSON.stringify({ error: "Unauthorized: Token has been revoked" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(token, env.JWT_SECRET);

    if (!payload) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return await handler(request, env, payload);
  };
};
