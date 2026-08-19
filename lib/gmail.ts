import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type GmailConnection = {
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
};

export function gmailRedirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/gmail/callback`;
}

export function buildMimeMessage({ to, subject, body, from }: { to: string; subject: string; body: string; from?: string }) {
  const headers = [
    from ? `From: ${from}` : null,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean);
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`).toString("base64url");
}

export async function getValidAccessToken(connection: GmailConnection) {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return decryptSecret(connection.access_token_encrypted);
  if (!connection.refresh_token_encrypted) throw new Error("Gmail refresh token is missing. Reconnect Gmail.");

  const refreshToken = await decryptSecret(connection.refresh_token_encrypted);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to refresh Gmail access");
  const token = await response.json() as { access_token: string; expires_in: number };
  return {
    token: token.access_token,
    encryptedToken: await encryptSecret(token.access_token),
    expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  };
}
