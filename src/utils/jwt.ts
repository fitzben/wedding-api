import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  user_id: string;
  role: string;
  [key: string]: any;
}

const encoder = new TextEncoder();

export const signToken = async (payload: JWTPayload, secret: string): Promise<string> => {
  const secretKey = encoder.encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
};

export const verifyToken = async (token: string, secret: string): Promise<JWTPayload | null> => {
  try {
    const secretKey = encoder.encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
};
