"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type Order = {
  id: number;
  amount: number;
  status: string;
  adminNote: string;
  createdAt: string;
  username: string;
  email: string;
  productName: string;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [noteById, setNoteById] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (response.status === 403) {
      router.replace("/dashboard");
      return;
    }
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; orders?: Order[] }
      | null;
    if (!response.ok || !data?.ok || !data.orders) {
      setError(data?.error || "Unable to load orders.");
      setLoading(false);
      return;
    }
    setOrders(data.orders);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return orders;
    }
    return orders.filter((order) =>
      [
        order.productName,
        order.username,
        order.email,
        order.status,
        String(order.id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [orders, query]);

  async function markPaid(event: FormEvent<HTMLFormElement>, orderId: number) {
    event.preventDefault();
    setBusyId(orderId);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteById[orderId] || "" }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to update order.");
      setBusyId(null);
      return;
    }
    setMessage("Order marked as paid.");
    await loadOrders();
    setBusyId(null);
  }

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN ORDERS</span>
            <h1 className="page-heading">Order Management</h1>
            <p className="note">Review order status and mark payment completed.</p>
          </div>
          <div className="actions admin-page-head__actions">
            <Link className="btn" href="/admin">
              Overview
            </Link>
            <Link className="btn" href="/dashboard">
              Store
            </Link>
          </div>
        </header>

        {!loading && error ? <p className="alert alert-error">{error}</p> : null}
        {!loading && message ? <p className="alert alert-success">{message}</p> : null}

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Order List</h2>
            <div className="admin-tools">
              <input
                className="admin-search"
                type="text"
                placeholder="Search order id, product, username..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {loading ? <section className="card">Loading orders...</section> : null}
          {!loading ? (
            <section className="admin-list">
              {filteredOrders.map((order) => (
                <article className="admin-item" key={order.id}>
                  <div className="admin-item__top">
                    <h3 className="admin-item__title">
                      #{order.id} - {order.productName}
                    </h3>
                    <span
                      className={`admin-status ${
                        order.status === "paid" ? "admin-status--ok" : "admin-status--wait"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="admin-item__meta">
                    <div>
                      User: {order.username} ({order.email})
                    </div>
                    <div>Amount: {order.amount === 0 ? "Free" : `${order.amount.toLocaleString()} THB`}</div>
                    <div>Created: {new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                  {order.adminNote ? <p className="note">Note: {order.adminNote}</p> : null}

                  {order.status === "pending" ? (
                    <form className="form-grid" onSubmit={(event) => markPaid(event, order.id)}>
                      <label>
                        Admin Note
                        <input
                          value={noteById[order.id] || ""}
                          onChange={(event) =>
                            setNoteById((prev) => ({
                              ...prev,
                              [order.id]: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="admin-item__actions">
                        <button className="btn primary" type="submit" disabled={busyId === order.id}>
                          {busyId === order.id ? "Saving..." : "Mark Paid"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
          {!loading && filteredOrders.length === 0 ? (
            <p className="empty-state">No orders match this search.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
