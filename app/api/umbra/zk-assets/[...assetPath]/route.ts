import { NextRequest, NextResponse } from "next/server";

import { UMBRA_ZK_CDN_BASE_URL } from "@/lib/umbra/zk-assets";

type UmbraZkAssetRouteProps = {
  params: Promise<{
    assetPath: string[];
  }>;
};

const ALLOWED_ZK_ASSET_PATH =
  /^(manifest\.json|v\d+\/zkey-wasm\/[a-z0-9]+(?:n\d+)?\.(?:zkey|wasm))$/;

function getContentType(path: string, fallback: string | null) {
  if (path.endsWith(".json")) {
    return "application/json";
  }

  if (path.endsWith(".wasm")) {
    return "application/wasm";
  }

  return fallback ?? "application/octet-stream";
}

export async function GET(
  _request: NextRequest,
  { params }: UmbraZkAssetRouteProps,
) {
  const { assetPath } = await params;
  const safePath = assetPath.join("/");

  if (!ALLOWED_ZK_ASSET_PATH.test(safePath)) {
    return NextResponse.json({ error: "ZK asset not found." }, { status: 404 });
  }

  let upstream: Response;

  try {
    upstream = await fetch(
      `${UMBRA_ZK_CDN_BASE_URL}/${safePath}`,
      safePath === "manifest.json"
        ? {
            cache: "no-store",
          }
        : {
            next: {
              revalidate: 86_400,
            },
          },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Umbra ZK asset host." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Unable to fetch Umbra ZK asset." },
      { status: upstream.status || 502 },
    );
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    getContentType(safePath, upstream.headers.get("content-type")),
  );
  headers.set(
    "Cache-Control",
    safePath === "manifest.json"
      ? "public, max-age=60"
      : "public, max-age=31536000, immutable",
  );

  const contentLength = upstream.headers.get("content-length");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers,
  });
}
