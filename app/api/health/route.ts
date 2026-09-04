function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export async function GET() {
  const { url, key } = supabaseConfig();
  if (!url || !key) {
    return Response.json({ app: "ok", supabase: { configured: false, reachable: false } });
  }

  let healthUrl: URL | undefined;
  try {
    healthUrl = new URL("/auth/v1/health", url);
    const response = await fetch(healthUrl, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return Response.json({
      app: "ok",
      supabase: {
        configured: true,
        reachable: response.ok,
        status: response.status,
        host: healthUrl.hostname,
      },
    }, { status: response.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;
    console.error("[health] Supabase is unreachable", {
      host: healthUrl?.hostname,
      message,
      cause: cause?.message,
    });
    return Response.json({
      app: "ok",
      supabase: {
        configured: true,
        reachable: false,
        host: healthUrl?.hostname,
        error: message,
        cause: cause?.message,
      },
    }, { status: 503 });
  }
}
