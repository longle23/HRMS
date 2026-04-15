import { NextRequest, NextResponse } from "next/server";
import { getAccountsFromNocoDB } from "@/lib/nocodb";
import type { AccountUser } from "@/types/hr";

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = normalize(body.username).toLowerCase();
    const password = normalize(body.password);

    if (!username || !password) {
      return NextResponse.json({ error: "Thiếu tài khoản hoặc mật khẩu." }, { status: 400 });
    }

    const accounts = await getAccountsFromNocoDB();
    const matched = accounts.find((record) => {
      const accountUsername = normalize(record.username ?? record.Username ?? record.email).toLowerCase();
      const accountPassword = normalize(record.password ?? record.Password);
      return accountUsername === username && accountPassword === password;
    });

    if (!matched) {
      return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu." }, { status: 401 });
    }

    const user: AccountUser = {
      id: String(matched.Id ?? matched.id ?? ""),
      username: normalize(matched.username ?? matched.Username ?? matched.email),
      fullName: normalize(matched.full_name ?? matched.FullName ?? matched.name),
      email: normalize(matched.email ?? matched.Email),
    };

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

