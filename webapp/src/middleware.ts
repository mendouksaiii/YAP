import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Protects /dashboard/* at the edge. If the session cookie is missing or invalid,
// redirect to /login. We do not pass through the bare /api/auth/* routes here.

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("yap_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.kind !== "session" || !payload.email) throw new Error("not a session token");
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "expired-or-invalid");
    const res = NextResponse.redirect(url);
    res.cookies.delete("yap_session");
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
