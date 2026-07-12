import { createClient } from "@/lib/supabase/server";
import {
  getRevenueSummary,
  getRevenueBySku,
  getDailyRevenueTrend,
  getPaymentMethodBreakdown,
  getOrderStatusBreakdown,
} from "@/lib/admin-data";
import AdminCharts from "./AdminCharts";

export const metadata = { title: "Dashboard — Admin — Poषण" };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const now = new Date();

  const [summary, skuMtd, skuQtd, skuYtd, trend, paymentBreakdown, statusBreakdown] = await Promise.all([
    getRevenueSummary(supabase),
    getRevenueBySku(supabase, startOfMonth(now)),
    getRevenueBySku(supabase, startOfQuarter(now)),
    getRevenueBySku(supabase, startOfYear(now)),
    getDailyRevenueTrend(supabase, 30),
    getPaymentMethodBreakdown(supabase, startOfMonth(now)),
    getOrderStatusBreakdown(supabase, startOfMonth(now)),
  ]);

  return (
    <AdminCharts
      summary={summary}
      skuByPeriod={{ mtd: skuMtd, qtd: skuQtd, ytd: skuYtd }}
      trend={trend}
      paymentBreakdown={paymentBreakdown}
      statusBreakdown={statusBreakdown}
    />
  );
}
