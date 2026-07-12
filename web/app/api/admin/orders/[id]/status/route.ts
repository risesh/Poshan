import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const VALID_STATUSES = ["pending", "shipped", "delivered", "cancelled"];

export async function PATCH(request: Request, props: RouteContext<"/api/admin/orders/[id]/status">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth alongside proxy.ts's /admin gate — this is an API
  // route, not a page, so it isn't covered by that path-prefix redirect.
  // The admin UPDATE policy in
  // supabase/migrations/0004_admin_order_status_update.sql is the actual
  // boundary if this check is ever bypassed.
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { status } = (await request.json()) as { status?: string };
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase.from("orders").update({ order_status: status }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
