import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processPushQueue } from "@/core/push/send";

/**
 * Push worker (Z33): pinged by the database (pg_net) right after a notification with a matching device is created,
 * with the CRON_SECRET. The minute job worker sends whatever is left in the queue too.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await processPushQueue());
}
