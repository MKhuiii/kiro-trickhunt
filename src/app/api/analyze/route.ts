import { createDefaultAnalyzeHandler } from "../../../server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Upper bound for the function; the hosting plan may cap it lower.
export const maxDuration = 15;

export const POST = createDefaultAnalyzeHandler();
