"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type Stats = {
  productsCount: number;
  keysCount: number;
  ordersPending: number;
};

type AnalyticsPeriod = "day" | "month" | "year";

type AnalyticsPoint = {
  key: string;
  label: string;
  sales: number;
  profit: number;
  orders: number;
};

type AnalyticsCategory = {
  name: string;
  sales: number;
  profit: number;
  orders: number;
};

type PeriodAnalytics = {
  points: AnalyticsPoint[];
  categories: AnalyticsCategory[];
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
};

type SalesAnalytics = {
  day: PeriodAnalytics;
  month: PeriodAnalytics;
  year: PeriodAnalytics;
  profitNote: string;
};

const shortcuts = [
  {
    href: "/admin/products",
    title: "Manage Products",
    desc: "Create, edit, and control product stock.",
  },
  {
    href: "/admin/keys",
    title: "Generate Keys",
    desc: "Create redeem codes for products or points.",
  },
  {
    href: "/admin/orders",
    title: "Check Orders",
    desc: "Review pending payments and confirm orders.",
  },
  {
    href: "/admin/points",
    title: "Add Points",
    desc: "Top up points directly by customer email.",
  },
  {
    href: "/admin/users",
    title: "User Roles",
    desc: "Promote admin/member and audit account status.",
  },
  {
    href: "/dashboard",
    title: "Open Store",
    desc: "Return to storefront as customer view.",
  },
];

const periodLabels: Record<AnalyticsPeriod, string> = {
  day: "Daily (14 days)",
  month: "Monthly (12 months)",
  year: "Yearly (6 years)",
};

const pieColors = ["#5dd4ee", "#7be495", "#f6c85f", "#f08a5d", "#c06c84", "#9ad0f5", "#8ec07c"];

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BarChart({ points }: { points: AnalyticsPoint[] }) {
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.sales, point.profit)),
  );

  return (
    <div className="admin-bar-chart">
      {points.map((point) => {
        const salesHeight = (point.sales / maxValue) * 100;
        const profitHeight = (point.profit / maxValue) * 100;
        return (
          <div className="admin-bar-chart__item" key={point.key}>
            <div className="admin-bar-chart__bars">
              <div
                className="admin-bar admin-bar--sales"
                style={{ height: `${salesHeight}%` }}
                title={`Sales ${formatMoney(point.sales)}`}
              />
              <div
                className="admin-bar admin-bar--profit"
                style={{ height: `${profitHeight}%` }}
                title={`Profit ${formatMoney(point.profit)}`}
              />
            </div>
            <span className="admin-bar-chart__label">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ categories }: { categories: AnalyticsCategory[] }) {
  const total = categories.reduce((sum, item) => sum + item.sales, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="admin-pie-wrap">
      <svg className="admin-pie-chart" viewBox="0 0 140 140" role="img" aria-label="Sales share by category">
        <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#232730" strokeWidth="24" />
        {categories.map((slice, index) => {
          const value = total > 0 ? (slice.sales / total) * circumference : 0;
          const color = pieColors[index % pieColors.length];
          const dashOffset = -offset;
          offset += value;
          return (
            <circle
              key={`${slice.name}-${index}`}
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="24"
              strokeDasharray={`${value} ${circumference}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
            />
          );
        })}
      </svg>

      <div className="admin-pie-legend">
        {categories.length === 0 ? <p className="note">No sales in selected period.</p> : null}
        {categories.map((slice, index) => {
          const percent = total > 0 ? (slice.sales / total) * 100 : 0;
          const color = pieColors[index % pieColors.length];
          return (
            <div className="admin-pie-legend__item" key={`${slice.name}-${index}`}>
              <span className="admin-pie-legend__dot" style={{ backgroundColor: color }} />
              <span className="admin-pie-legend__name">{slice.name}</span>
              <span className="admin-pie-legend__value">
                {percent.toFixed(1)}% ({formatMoney(slice.sales)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<AnalyticsPeriod>("day");
  const [stats, setStats] = useState<Stats>({
    productsCount: 0,
    keysCount: 0,
    ordersPending: 0,
  });
  const [analytics, setAnalytics] = useState<SalesAnalytics>({
    day: { points: [], categories: [], totalSales: 0, totalProfit: 0, totalOrders: 0 },
    month: { points: [], categories: [], totalSales: 0, totalProfit: 0, totalOrders: 0 },
    year: { points: [], categories: [], totalSales: 0, totalProfit: 0, totalOrders: 0 },
    profitNote: "",
  });

  const loadStats = useCallback(async () => {
    const response = await fetch("/api/admin/stats", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (response.status === 403) {
      router.replace("/dashboard");
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; stats?: Stats; analytics?: SalesAnalytics }
      | null;
    if (!response.ok || !data?.ok || !data.stats || !data.analytics) {
      setError(data?.error || "Unable to load admin stats.");
      setLoading(false);
      return;
    }
    setStats(data.stats);
    setAnalytics(data.analytics);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const active = useMemo(() => analytics[period], [analytics, period]);

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN PANEL</span>
            <h1 className="page-heading">System Overview</h1>
            <p className="note">Manage products, keys, orders, points, and member permissions.</p>
          </div>
          <div className="actions admin-page-head__actions">
            <Link className="btn" href="/dashboard">
              Open Store
            </Link>
          </div>
        </header>

        {loading ? <section className="card">Loading...</section> : null}
        {!loading && error ? <p className="alert alert-error">{error}</p> : null}

        {!loading && !error ? (
          <section className="admin-cards">
            <article className="admin-card">
              <span className="admin-card__title">Products</span>
              <span className="admin-card__count">{stats.productsCount.toLocaleString()} items</span>
              <span className="admin-card__hint">Total products in store</span>
            </article>
            <article className="admin-card">
              <span className="admin-card__title">Redeem Keys</span>
              <span className="admin-card__count">{stats.keysCount.toLocaleString()} keys</span>
              <span className="admin-card__hint">Active and used code inventory</span>
            </article>
            <article className="admin-card">
              <span className="admin-card__title">Pending Orders</span>
              <span className="admin-card__count">{stats.ordersPending.toLocaleString()} orders</span>
              <span className="admin-card__hint">Orders awaiting confirmation</span>
            </article>
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="card admin-analytics">
            <div className="admin-analytics__head">
              <div>
                <h2 className="panel-title">Sales & Profit Analytics</h2>
                <p className="note">{periodLabels[period]}</p>
              </div>
              <div className="admin-period-tabs">
                {(["day", "month", "year"] as AnalyticsPeriod[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`category-tab ${period === key ? "active" : ""}`}
                    onClick={() => setPeriod(key)}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-analytics__totals">
              <article className="admin-total">
                <span>Total Sales</span>
                <strong>{formatMoney(active.totalSales)}</strong>
              </article>
              <article className="admin-total">
                <span>Total Profit</span>
                <strong>{formatMoney(active.totalProfit)}</strong>
              </article>
              <article className="admin-total">
                <span>Paid Orders</span>
                <strong>{active.totalOrders.toLocaleString()}</strong>
              </article>
            </div>

            <div className="admin-analytics__charts">
              <article className="admin-chart-card">
                <h3>Bar Chart (Sales / Profit)</h3>
                <BarChart points={active.points} />
              </article>
              <article className="admin-chart-card">
                <h3>Pie Chart (Sales by Category)</h3>
                <PieChart categories={active.categories} />
              </article>
            </div>

            {analytics.profitNote ? <p className="note">{analytics.profitNote}</p> : null}
          </section>
        ) : null}

        <section className="admin-shortcuts">
          {shortcuts.map((shortcut) => (
            <Link className="admin-shortcut" href={shortcut.href} key={shortcut.href}>
              <span className="admin-shortcut__title">{shortcut.title}</span>
              <span className="admin-shortcut__desc">{shortcut.desc}</span>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}
