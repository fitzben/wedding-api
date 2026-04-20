import { Env } from "../../index";
import { findUserByEmail, verifyPassword, generateToken, blacklistToken } from "../../services/authService";
import { withAuth } from "../../middleware/auth";

export const handleAuthRoutes = async (request: Request, url: URL, env: Env): Promise<Response> => {
  const { pathname } = url;

  if (pathname === "/api/auth/login" && request.method === "POST") {
    // ... existing login logic ...
    try {
      const { email, password } = await request.json() as any;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const user = await findUserByEmail(email, env.DB);

      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isValid = await verifyPassword(password, user.password_hash || user.password || "");

      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const token = await generateToken(user, env.JWT_SECRET);

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (pathname === "/api/auth/logout" && request.method === "POST") {
    return withAuth(async (req, env) => {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader!.split(" ")[1];
      await blacklistToken(env.KV, token, 43200);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })(request, env);
  }

  if (pathname === "/api/auth/me" && request.method === "GET") {
    return withAuth(async (req, env, user) => {
      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })(request, env);
  }

  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};
