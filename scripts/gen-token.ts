import { SignJWT } from "jose";

const encoder = new TextEncoder();
const secret = "your-secret-key-replace-this";

async function generateToken(userId: string, role: string) {
  const payload = { user_id: userId, role };
  const secretKey = encoder.encode(secret);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
  return token;
}

// async function run() {
//   const adminToken = await generateToken("admin-001", "admin");
//   const parentsToken = await generateToken("parents-001", "parents");
//   console.log("ADMIN_TOKEN=" + adminToken);
//   console.log("PARENTS_TOKEN=" + parentsToken);
// }

// run();
