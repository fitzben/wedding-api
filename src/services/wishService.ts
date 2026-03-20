import type { Env } from "../index";

export type CreateWishInput = {
  name: string;
  message: string;
};

export async function createWish(
  env: Env,
  input: CreateWishInput
): Promise<{ id: string }> {
  const { name, message } = input;

  const id = Date.now().toString();
  const created_at = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO wishes (id, name, message, created_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(id, name, message, created_at)
    .run();

  return { id };
}

export async function getWishes(env: Env): Promise<any[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM wishes ORDER BY created_at DESC"
  ).all();
  return results;
}
