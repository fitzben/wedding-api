/**
 * Adds CORS headers to a Response object.
 * 
 * @param response The original Response object
 * @param request Optional Request object to extract Origin
 * @returns A new Response object with CORS headers added
 */
const ALLOWED_ORIGINS = [
  "https://benelin.my.id",
  "https://www.benelin.my.id",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function withCORS(response: Response, request?: Request): Response {
  const newResponse = new Response(response.body, response);
  
  const origin = request?.headers.get("Origin");
  
  // 1. Check if origin is allowed
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith(".benelin.my.id")
  );

  if (isAllowed) {
    newResponse.headers.set("Access-Control-Allow-Origin", origin!);
    newResponse.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    // If not allowed, we still allow GET/OPTIONS for general access but restrictive origin
    newResponse.headers.set("Access-Control-Allow-Origin", "https://benelin.my.id");
  }
  
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return newResponse;
}
