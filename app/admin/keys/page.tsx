"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type KeyItem = {
  id: number;
  code: string;
  keyType: "product" | "points";
  pointAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  productName: string;
};

type ProductOption = {
  id: number;
  name: string;
  isActive: boolean;
};

export default function AdminKeysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [keyType, setKeyType] = useState<"product" | "points">("product");
  const [productId, setProductId] = useState("");
  const [pointAmount, setPointAmount] = useState("100");
  const [maxUses, setMaxUses] = useState("1");
  const [count, setCount] = useState("5");
  const [query, setQuery] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    const [keysRes, productsRes] = await Promise.all([
      fetch("/api/admin/keys", { cache: "no-store" }),
      fetch("/api/admin/products", { cache: "no-store" }),
    ]);

    if (keysRes.status === 401 || productsRes.status === 401) {
      router.replace("/login");
      return;
    }
    if (keysRes.status === 403 || productsRes.status === 403) {
      router.replace("/dashboard");
      return;
    }

    const keysData = (await keysRes.json().catch(() => null)) as
      | { ok?: boolean; error?: string; keys?: KeyItem[] }
      | null;
    const productsData = (await productsRes.json().catch(() => null)) as
      | { ok?: boolean; error?: string; products?: ProductOption[] }
      | null;

    if (!keysRes.ok || !keysData?.ok || !keysData.keys) {
      setError(keysData?.error || "Unable to load keys.");
      setLoading(false);
      return;
    }
    if (!productsRes.ok || !productsData?.ok || !productsData.products) {
      setError(productsData?.error || "Unable to load products.");
      setLoading(false);
      return;
    }

    setKeys(keysData.keys);
    setProducts(productsData.products.filter((item) => item.isActive));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredKeys = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return keys;
    }
    return keys.filter((item) =>
      [
        item.code,
        item.keyType,
        item.productName,
        String(item.pointAmount),
        String(item.id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [keys, query]);

  async function createKeys(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setCreatedCodes([]);

    const payload = {
      keyType,
      productId: keyType === "product" ? Number(productId || 0) || null : null,
      pointAmount: Number(pointAmount || 0),
      maxUses: Number(maxUses || 1),
      count: Number(count || 1),
    };

    const response = await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; created?: string[] }
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to create keys.");
      setSaving(false);
      return;
    }

    setMessage("Keys created.");
    setCreatedCodes(data.created || []);
    await loadAll();
    setSaving(false);
  }

  async function deleteKey(id: number) {
    if (!confirm("Delete this key?")) {
      return;
    }
    const response = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to delete key.");
      return;
    }
    setMessage("Key deleted.");
    await loadAll();
  }

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN KEYS</span>
            <h1 className="page-heading">Redeem Keys</h1>
            <p className="note">Create and manage product/point redeem keys.</p>
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

        {error ? <p className="alert alert-error">{error}</p> : null}
        {message ? <p className="alert alert-success">{message}</p> : null}

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Create Keys</h2>
          </div>
          <form className="form-grid" onSubmit={createKeys}>
          <label>
            Key Type
            <select
              value={keyType}
              onChange={(event) => setKeyType(event.target.value === "points" ? "points" : "product")}
            >
              <option value="product">Product</option>
              <option value="points">Points</option>
            </select>
          </label>

          {keyType === "product" ? (
            <label>
              Product
              <select value={productId} onChange={(event) => setProductId(event.target.value)} required>
                <option value="">-- Select product --</option>
                {products.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Points Amount
              <input
                type="number"
                min="1"
                value={pointAmount}
                onChange={(event) => setPointAmount(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Max Uses Per Key
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              required
            />
          </label>
          <label>
            Number of Keys (1-100)
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              required
            />
          </label>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Keys"}
            </button>
          </form>

          {createdCodes.length ? (
            <div className="card">
              <strong>Created Codes ({createdCodes.length}):</strong>
              <pre>{createdCodes.join("\n")}</pre>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Key List</h2>
            <div className="admin-tools">
              <input
                className="admin-search"
                type="text"
                placeholder="Search code, product, key type..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          {loading ? <section className="card">Loading keys...</section> : null}
          {!loading ? (
            <section className="admin-list">
              {filteredKeys.map((item) => (
                <article className="admin-item" key={item.id}>
                  <div className="admin-item__top">
                    <h3 className="admin-item__title">
                      <code>{item.code}</code>
                    </h3>
                    <span className={`admin-status ${item.isActive ? "admin-status--ok" : "admin-status--off"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="admin-item__meta">
                    <div>Type: {item.keyType === "points" ? "Points" : "Product"}</div>
                    <div>
                      Target:{" "}
                      {item.keyType === "points"
                        ? `${item.pointAmount.toLocaleString()} points`
                        : item.productName || "Unknown product"}
                    </div>
                    <div>
                      Usage: {item.usedCount} / {item.maxUses}
                    </div>
                    <div>Created: {new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="admin-item__actions">
                    <button className="btn danger" type="button" onClick={() => deleteKey(item.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
          {!loading && filteredKeys.length === 0 ? (
            <p className="empty-state">No keys match this search.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
