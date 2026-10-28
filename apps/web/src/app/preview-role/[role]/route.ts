import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ role: string }> }) {
  const { role } = await context.params;
  if (role !== "employee" && role !== "manager") {
    return NextResponse.json({ error: "Use employee or manager" }, { status: 404 });
  }
  const response = NextResponse.redirect(new URL("/desktop?syntheticPreview=1", request.url));
  response.cookies.set("ckace-preview-role", role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
