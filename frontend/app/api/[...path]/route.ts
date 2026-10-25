import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/+$/, "");

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie,X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  try {
    if (!BACKEND_URL) {
      console.error("BACKEND_URL not configured");
      return NextResponse.json(
        { error: "BACKEND_URL not configured" },
        { status: 500 }
      );
    }

    const { path } = await params;
    const pathString = path.join("/");
    const url = new URL(`/${pathString}`, BACKEND_URL);
    url.search = req.nextUrl.search;

    console.log(`[API Proxy] ${req.method} ${pathString} -> ${url.toString()}`);

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host") {
        headers.set(key, value);
      }
    });

    const cookie = req.headers.get("cookie");
    if (cookie) {
      headers.set("cookie", cookie);
    }

    let body: BodyInit | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.arrayBuffer();
    }

    const res = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseData = await res.arrayBuffer();
    const nextRes = new NextResponse(responseData, {
      status: res.status,
      statusText: res.statusText,
    });

    // Copy other headers
    res.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "content-encoding" && lowerKey !== "set-cookie") {
        nextRes.headers.set(key, value);
      }
    });

    console.log(`[API Proxy] Response: ${res.status} for ${pathString}`);
    
    // Handle Set-Cookie headers
    const setCookieHeaders = (res.headers as any).getSetCookie?.();
    if (Array.isArray(setCookieHeaders) && setCookieHeaders.length > 0) {
      console.log(`[API Proxy] Forwarding ${setCookieHeaders.length} Set-Cookie headers`);
      for (const cookie of setCookieHeaders) {
        // Parse and set cookie using Next.js cookies API for better compatibility
        const cookieParts = cookie.split(';');
        const [nameValue] = cookieParts;
        const [name, value] = nameValue.split('=');
        
        const cookieOptions: any = { path: '/' };
        for (let i = 1; i < cookieParts.length; i++) {
          const part = cookieParts[i].trim();
          if (part.toLowerCase().startsWith('httponly')) cookieOptions.httpOnly = true;
          else if (part.toLowerCase().startsWith('secure')) cookieOptions.secure = true;
          else if (part.toLowerCase().startsWith('samesite=')) {
            cookieOptions.sameSite = part.split('=')[1].toLowerCase();
          } else if (part.toLowerCase().startsWith('max-age=')) {
            cookieOptions.maxAge = parseInt(part.split('=')[1]);
          } else if (part.toLowerCase().startsWith('expires=')) {
            // skip expires
          } else if (part.toLowerCase().startsWith('path=')) {
            cookieOptions.path = part.split('=')[1];
          }
        }
        
        try {
          nextRes.cookies.set(name.trim(), value.trim(), cookieOptions);
        } catch (e) {
          // Fallback to header
          nextRes.headers.append("Set-Cookie", cookie);
        }
      }
    } else {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        console.log(`[API Proxy] Forwarding Set-Cookie header`);
        nextRes.headers.append("Set-Cookie", setCookie);
      }
    }

    return nextRes;
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
