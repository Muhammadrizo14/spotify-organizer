import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.headers.get("Authorization");

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: token },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json(data);
}
