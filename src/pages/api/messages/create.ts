import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { supabase } from "@/lib/db";
import { encrypt } from "@/lib/crypto/aesGcm";

// Master key for encryption
const MASTER_KEY = Buffer.from(process.env.MASTER_KEY!, "hex");

const PUBLIC_HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { message, mode, ttl } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Invalid message" });
  }

  if (mode !== "view" && mode !== "time") {
    return res.status(400).json({ error: "Invalid destroy mode" });
  }

  let expiresAt: string | null = null;
  if (mode === "time") {
    if (!ttl || typeof ttl !== "number") {
      return res.status(400).json({ error: "Invalid TTL" });
    }
    expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  }

  const id = randomUUID();

  // Encrypt the message
  const { ciphertext, iv, tag } = encrypt(message, MASTER_KEY);

  // Insert into Supabase
  const { error } = await supabase.from("messages").insert([
    {
      id,
      ciphertext,
      iv,
      tag,
      destroy_mode: mode,
      expires_at: expiresAt,
    },
  ]);

  if (error) {
    return res.status(500).json({ error: "Database insert failed" });
  }

  res.status(200).json({
    link: `${PUBLIC_HOST}/message/${id}`,
  });
}
