import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/api-guards";
import { resolveDownloadFile } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireUser(request);
  if ("response" in auth) {
    return auth.response;
  }

  const productId = Number.parseInt(request.nextUrl.searchParams.get("product") || "", 10);
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid product." }, { status: 400 });
  }

  try {
    const download = await resolveDownloadFile(auth.user.id, productId);
    const fileStat = await stat(download.filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }

    const stream = createReadStream(download.filePath);
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${download.downloadName}"`,
        "Content-Length": String(fileStat.size),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
  }
}
