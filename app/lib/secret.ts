import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const KEY_PATH = path.join(process.cwd(), "data", "secret.key");

function getOrCreateKey() {
  if (existsSync(KEY_PATH)) {
    const raw = readFileSync(KEY_PATH, "utf8").trim();
    if (raw) return Buffer.from(raw, "base64");
  }

  mkdirSync(path.dirname(KEY_PATH), { recursive: true });
  const key = crypto.randomBytes(32);
  writeFileSync(KEY_PATH, key.toString("base64"), "utf8");
  return key;
}

export function encryptSecret(value: string) {
  const key = getOrCreateKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("v1:")) {
    // Backward compatibility (plaintext).
    return trimmed;
  }

  const parts = trimmed.split(":");
  if (parts.length !== 4) return "";
  const [, ivB64, tagB64, payloadB64] = parts;

  try {
    const key = getOrCreateKey();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const payload = Buffer.from(payloadB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}
