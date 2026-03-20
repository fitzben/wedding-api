/**
 * Adds CORS headers to a Response object.
 * 
 * @param response The original Response object
 * @param request Optional Request object to extract Origin
 * @returns A new Response object with CORS headers added
 */
export function withCORS(response: Response, request?: Request): Response {
  const newResponse = new Response(response.body, response);
  
  const origin = request?.headers.get("Origin") || "*";
  
  // If origin is not *, we can allow credentials
  if (origin !== "*") {
    newResponse.headers.set("Access-Control-Allow-Origin", origin);
    newResponse.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
  }
  
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return newResponse;
}
