/**
 * Adds security headers to a Response object to protect against common web attacks.
 * 
 * @param response The original Response object
 * @returns A new Response object with security headers added
 */
export function withSecurityHeaders(response: Response): Response {
  // We must create a new Response as headers are immutable in existing Responses
  const newResponse = new Response(response.body, response);
  
  // 1. Prevent MIME type sniffing
  newResponse.headers.set("X-Content-Type-Options", "nosniff");
  
  // 2. Prevent Clickjacking (disallow embedding in frames)
  newResponse.headers.set("X-Frame-Options", "DENY");
  
  // 3. Referrer Policy
  newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // 4. Force HTTPS (HSTS) - 1 year
  newResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  // 5. Basic Content Security Policy (Optional - tighten as needed)
  // newResponse.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");

  return newResponse;
}
