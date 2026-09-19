"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type {
  RevenueSummary,
  SkuRevenue,
  DailyRevenue,
  PaymentBreakdown,
  StatusBreakdown,
} from "@/lib/admin-data";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

// Recharts takes colors as plain JS strings (SVG fill/stroke props), not
// CSS — it can't consume the var(--color-*) tokens the rest of the app
// uses. Kept as a literal, in-sync copy of tokens.css's palette rather than
// reading getComputedStyle at runtime, since this is a fixed, small set.
// If tokens.css's palette changes, update this alongside it.
const CHART_COLORS = {
  ink: "#1E3A34",
  teal: "#4A9B8E",
  turmeric: "#E4A335",
  amla: "#7A9B76",
  sindoor: "#C1502E",
  mist: "#DCE6DE",
};
const SERIES_COLORS = [CHART_COLORS.teal, CHART_COLORS.turmeric, CHART_COLORS.amla, CHART_COLORS.sindoor];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const METHOD_LABEL: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
  cod: "Cash on Delivery",
};

// orderCount is optional — QTD/YTD only ever show the revenue figure now,
// per request; MTD keeps the order-count line since that wasn't asked to
// change.
function StatCard({ label, revenueRupees, orderCount }: { label: string; revenueRupees: number; orderCount?: number }) {
  return (
    <div className="admin-card admin-stat-card">
      <div className="admin-stat-card__label">{label}</div>
      <div className="admin-stat-card__value">{formatRupees(revenueRupees)}</div>
      {orderCount !== undefined && (
        <div className="admin-stat-card__sub">
          {orderCount} order{orderCount === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

// Default recharts Tooltip only surfaces the plotted dataKey
// (revenueRupees) — quantity sold lives on the same data row but needs a
// custom renderer to show alongside it.
function SkuTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as SkuRevenue;
  return (
    <div className="admin-tooltip">
      <div className="admin-tooltip__label">{d.label}</div>
      <div className="admin-tooltip__row">{formatRupees(d.revenueRupees)}</div>
      <div className="admin-tooltip__row admin-tooltip__row--muted">
        {d.quantity} unit{d.quantity === 1 ? "" : "s"} sold
      </div>
    </div>
  );
}

type SkuPeriod = "mtd" | "qtd" | "ytd";

export default function AdminCharts({
  summary,
  skuByPeriod,
  trend,
  paymentBreakdown,
  statusBreakdown,
}: {
  summary: RevenueSummary;
  skuByPeriod: Record<SkuPeriod, SkuRevenue[]>;
  trend: DailyRevenue[];
  paymentBreakdown: PaymentBreakdown[];
  statusBreakdown: StatusBreakdown[];
}) {
  const [skuPeriod, setSkuPeriod] = useState<SkuPeriod>("mtd");
  const skuData = skuByPeriod[skuPeriod].slice(0, 8);

  const trendData = trend.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  }));

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Dashboard</h1>

      <div className="admin-stat-grid">
        <StatCard label="Revenue — MTD" revenueRupees={summary.mtd.revenueRupees} orderCount={summary.mtd.orderCount} />
        <StatCard label="Revenue — QTD" revenueRupees={summary.qtd.revenueRupees} />
        <StatCard label="Revenue — YTD" revenueRupees={summary.ytd.revenueRupees} />
      </div>

      <div className="admin-chart-grid">
        <div className="admin-card admin-chart-card admin-chart-card--wide">
          <div className="admin-card__header">
            <span className="admin-card__title">Revenue by SKU</span>
            <div className="admin-tab-group">
              {(["mtd", "qtd", "ytd"] as SkuPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`admin-tab${skuPeriod === p ? " is-active" : ""}`}
                  onClick={() => setSkuPeriod(p)}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {skuData.length === 0 ? (
            <div className="admin-chart-empty">No orders in this period yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, skuData.length * 42)}>
              <BarChart data={skuData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid stroke={CHART_COLORS.mist} horizontal={false} />
                <XAxis type="number" tickFormatter={formatRupees} stroke={CHART_COLORS.ink} fontSize={12} />
                <YAxis type="category" dataKey="label" width={170} stroke={CHART_COLORS.ink} fontSize={12} />
                <Tooltip content={SkuTooltip} />
                <Bar dataKey="revenueRupees" fill={CHART_COLORS.teal} radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="admin-card admin-chart-card admin-chart-card--wide">
          <div className="admin-card__header">
            <span className="admin-card__title">Revenue — last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke={CHART_COLORS.mist} vertical={false} />
              <XAxis dataKey="label" stroke={CHART_COLORS.ink} fontSize={11} interval={4} />
              <YAxis tickFormatter={formatRupees} stroke={CHART_COLORS.ink} fontSize={12} width={70} />
              <Tooltip formatter={(v) => formatRupees(Number(v))} />
              <Area
                type="monotone"
                dataKey="revenueRupees"
                name="Revenue"
                stroke={CHART_COLORS.teal}
                fill={CHART_COLORS.teal}
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card admin-chart-card">
          <div className="admin-card__header">
            <span className="admin-card__title">Payment methods — this month</span>
          </div>
          {paymentBreakdown.length === 0 ? (
            <div className="admin-chart-empty">No orders this month yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  dataKey="revenueRupees"
                  nameKey="method"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {paymentBreakdown.map((entry, i) => (
                    <Cell key={entry.method} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatRupees(Number(v))} />
                <Legend formatter={(value: string) => METHOD_LABEL[value] ?? value} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="admin-card admin-chart-card">
          <div className="admin-card__header">
            <span className="admin-card__title">Order status — this month</span>
          </div>
          {statusBreakdown.length === 0 ? (
            <div className="admin-chart-empty">No orders this month yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={statusBreakdown.map((s) => ({ ...s, label: STATUS_LABEL[s.status] ?? s.status }))}
                margin={{ left: 8, right: 24 }}
              >
                <CartesianGrid stroke={CHART_COLORS.mist} vertical={false} />
                <XAxis dataKey="label" stroke={CHART_COLORS.ink} fontSize={12} />
                <YAxis allowDecimals={false} stroke={CHART_COLORS.ink} fontSize={12} width={30} />
                <Tooltip />
                <Bar dataKey="orderCount" name="Orders" fill={CHART_COLORS.amla} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
