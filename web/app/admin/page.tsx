import { createClient } from "@/lib/supabase/server";
import {
  getRevenueSummary,
  getRevenueBySku,
  getDailyRevenueTrend,
  getPaymentMethodBreakdown,
  getOrderStatusBreakdown,
} from "@/lib/admin-data";
import { istStartOfMonth, istStartOfQuarter, istStartOfYear } from "@/lib/order-math";
import AdminCharts from "./AdminCharts";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const now = new Date();

  const [summary, skuMtd, skuQtd, skuYtd, trend, paymentBreakdown, statusBreakdown] = await Promise.all([
    getRevenueSummary(supabase),
    getRevenueBySku(supabase, istStartOfMonth(now)),
    getRevenueBySku(supabase, istStartOfQuarter(now)),
    getRevenueBySku(supabase, istStartOfYear(now)),
    getDailyRevenueTrend(supabase, 30),
    getPaymentMethodBreakdown(supabase, istStartOfMonth(now)),
    getOrderStatusBreakdown(supabase, istStartOfMonth(now)),
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
