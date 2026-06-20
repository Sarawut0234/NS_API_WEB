"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CartItem = {
  productId: number;
  name: string;
  qty: number;
  pointPrice: number;
  linePoints: number;
  stockQuantity: number;
};

type CartResponse = {
  ok: boolean;
  error?: string;
  userPoints?: number;
  totalPoints?: number;
  items?: CartItem[];
};

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [userPoints, setUserPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [items, setItems] = useState<CartItem[]>([]);
  const [busy, setBusy] = useState(false);

  const loadCart = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/cart", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const data = (await response.json().catch(() => null)) as CartResponse | null;
    if (!response.ok || !data?.ok || !data.items) {
      setError(data?.error || "Unable to load cart.");
      setLoading(false);
      return;
    }

    setUserPoints(Number(data.userPoints || 0));
    setTotalPoints(Number(data.totalPoints || 0));
    setItems(data.items);
    setError("");
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  async function removeItem(productId: number) {
    setBusy(true);
    const response = await fetch("/api/cart/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!response.ok) {
      setError("Unable to remove item.");
      setBusy(false);
      return;
    }
    await loadCart();
    setBusy(false);
  }

  async function checkout() {
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/cart/checkout", { method: "POST" });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; productNames?: string[] }
      | null;

    if (!response.ok || !data?.ok) {
      const map: Record<string, string> = {
        points: "Not enough points.",
        stock: "Some items are out of stock.",
        cart_empty: "Cart is empty.",
        owned: "Some products are already owned.",
        checkout_busy: "Checkout is already running. Please wait and try again.",
        checkout_failed: "Checkout failed.",
      };
      setError(map[data?.error || ""] || "Checkout failed.");
      setBusy(false);
      await loadCart();
      return;
    }

    const names = (data.productNames || []).join(", ");
    setMessage(names ? `Checkout successful: ${names}` : "Checkout successful.");
    await loadCart();
    setBusy(false);
  }

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <main className="main-content">
      <header className="history-header">
        <div>
          <span className="landing-section__eyebrow">MY CART</span>
          <h1 className="page-heading">Cart</h1>
          <p className="note">
            Your points: {userPoints.toLocaleString()} | Cart total: {totalPoints.toLocaleString()} POINT
          </p>
        </div>
        <div className="actions actions--compact">
          <Link className="btn" href="/dashboard">
            Back to Store
          </Link>
        </div>
      </header>

      {loading ? <section className="card">Loading...</section> : null}
      {!loading && error ? <p className="alert alert-error">{error}</p> : null}
      {!loading && message ? <p className="alert alert-success">{message}</p> : null}

      {!loading && !hasItems ? (
        <section className="empty-state">
          Cart is empty.
          <p className="empty-hint">Select scripts from the dashboard and return here to checkout.</p>
        </section>
      ) : null}

      {!loading && hasItems ? (
        <section className="history-grid">
          {items.map((item) => (
            <article className="product-card" key={item.productId}>
              <h3 className="product-name">{item.name}</h3>
              <div className="product-meta product-meta--chips">
                <span className="badge-chip">QTY {item.qty}</span>
                <span className="badge-chip badge-chip--pink">{item.pointPrice.toLocaleString()} POINT</span>
                <span className="badge-chip">STOCK {item.stockQuantity.toLocaleString()}</span>
              </div>
              <p className="product-desc">Line total: {item.linePoints.toLocaleString()} POINT</p>
              <div className="product-actions">
                <button
                  className="btn danger btn-sm"
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {!loading && hasItems ? (
        <section className="panel admin-panel-compact">
          <div className="panel-header">
            <h2 className="panel-title">Checkout</h2>
            <p className="note">Total to pay: {totalPoints.toLocaleString()} POINT</p>
          </div>
          <div className="actions actions--compact">
            <button className="btn primary" type="button" onClick={checkout} disabled={busy}>
              {busy ? "Processing..." : `Checkout (${totalPoints.toLocaleString()} POINT)`}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
