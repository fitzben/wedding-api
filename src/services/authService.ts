import { signToken } from "../utils/jwt";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  password_hash?: string;
}

export const findUserByEmail = async (email: string, db: D1Database): Promise<User | null> => {
  const user = await db
    .prepare("SELECT * FROM admin_users WHERE email = ?")
    .bind(email)
    .first<User>();
  return user ?? null;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  // Backward compatibility with bcrypt hashes from 'users' table
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
    const bcrypt = await import("bcryptjs");
    return await bcrypt.compare(password, stored);
  }

  // New PBKDF2 Web Crypto mechanism
  try {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;
    
    // Ensure accurate length to avoid map errors
    const match = saltHex.match(/.{2}/g);
    if (!match) return false;
    
    const salt = new Uint8Array(match.map(h => parseInt(h, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
      keyMaterial, 256
    );
    const newHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
    return newHash === hashHex;
  } catch { return false; }
};

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashArray = Array.from(new Uint8Array(bits));
  const saltArray = Array.from(salt);
  return saltArray.map(b => b.toString(16).padStart(2, "0")).join("") + ":" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}


export async function blacklistToken(kv: KVNamespace, token: string, expiresIn: number = 43200): Promise<void> {
  await kv.put(`blacklist:${token}`, "1", { expirationTtl: expiresIn });
}

export async function isTokenBlacklisted(kv: KVNamespace, token: string): Promise<boolean> {
  const val = await kv.get(`blacklist:${token}`);
  return val !== null;
}

export const generateToken = async (user: User, secret: string): Promise<string> => {
  return await signToken(
    {
      user_id: user.id,
      role: user.role,
    },
    secret
  );
};
