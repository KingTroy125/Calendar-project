import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/+$/, "");

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "BACKEND_URL not configured" },
      { status: 500 }
    );
  }

  const { path } = await params;
  const pathString = path.join("/");
  const url = new URL(`/${pathString}`, BACKEND_URL);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  
  // Forward relevant headers
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  
  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const res = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete("content-encoding");

  const nextRes = new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });

  // Forward Set-Cookie headers explicitly to ensure cookies are set on the frontend origin
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    nextRes.headers.append("set-cookie", c);
  }

  return nextRes;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
