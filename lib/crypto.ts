const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey() {
  const encoded = process.env.APP_ENCRYPTION_KEY;
  if (!encoded) throw new Error("APP_ENCRYPTION_KEY is not configured");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.byteLength !== 32) throw new Error("APP_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return `${Buffer.from(iv).toString("base64url")}.${Buffer.from(ciphertext).toString("base64url")}`;
}

export async function decryptSecret(value: string) {
  const [ivPart, ciphertextPart] = value.split(".");
  if (!ivPart || !ciphertextPart) throw new Error("Invalid encrypted secret");
  const key = await getKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(ivPart, "base64url") },
    key,
    Buffer.from(ciphertextPart, "base64url"),
  );
  return decoder.decode(plaintext);
}
