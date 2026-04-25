import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_INDEXER = "https://indexer.api.umbraprivacy.com";

const SAFE_PATH = /^[a-zA-Z0-9._~:@!$&'()*+,;=%-/]+$/;

const FORWARDED_REQUEST_HEADERS = [
  "content-type",
  "accept",
  "x-grpc-web",
  "x-user-agent",
];

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "grpc-status",
  "grpc-message",
  "x-grpc-web",
];

type IndexerProxyRouteProps = {
  params: Promise<{ path: string[] }>;
};

async function proxyToIndexer(
  request: NextRequest,
  { params }: IndexerProxyRouteProps,
) {
  const { path } = await params;
  const safePath = path.join("/");

  if (path.some((segment) => segment === ".." || segment === ".")) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  if (!SAFE_PATH.test(safePath)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const url = new URL(request.url);
  if (url.search.length > 2048) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const upstreamUrl = `${UPSTREAM_INDEXER}/${safePath}${url.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" ? request.body : undefined,
      // @ts-expect-error — Node 18+ fetch supports duplex for streaming bodies
      duplex: "half",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Umbra indexer." },
      { status: 502 },
    );
  }

  if (!upstream.body) {
    return NextResponse.json(
      { error: "Empty response from Umbra indexer." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

// Umbra indexer uses gRPC-Web: GET for health/metadata, POST for queries
export const GET = proxyToIndexer;
export const POST = proxyToIndexer;
