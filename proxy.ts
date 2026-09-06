import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const canonicalUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
      if (request.nextUrl.host !== canonicalUrl.host) {
        const destination = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalUrl);
        return NextResponse.redirect(destination, 308);
      }
    } catch {
      console.error("[proxy] NEXT_PUBLIC_APP_URL is not a valid absolute URL");
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const isProductRoute = ["/dashboard", "/people", "/compose", "/outreach", "/settings", "/onboarding"].some((path) => request.nextUrl.pathname.startsWith(path));
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
  if (!user && isProductRoute && !demoMode) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
