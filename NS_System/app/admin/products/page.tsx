"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type Product = {
  id: number;
  name: string;
  slug: string;
  licenseKey: string;
  description: string;
  extraInfo: string;
  changelogText: string;
  versionLabel: string;
  price: number;
  isFree: boolean;
  pointPrice: number;
  stockQuantity: number;
  category: string;
  imageUrl: string;
  reviewVideoUrl: string;
  downloadUrl: string;
  filePath: string;
  isActive: boolean;
};

type FormState = {
  name: string;
  slug: string;
  licenseKey: string;
  description: string;
  extraInfo: string;
  changelogText: string;
  versionLabel: string;
  price: string;
  isFree: boolean;
  pointPrice: string;
  stockQuantity: string;
  category: string;
  imageUrl: string;
  reviewVideoUrl: string;
  downloadUrl: string;
  filePath: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  licenseKey: "",
  description: "",
  extraInfo: "",
  changelogText: "",
  versionLabel: "",
  price: "0",
  isFree: false,
  pointPrice: "0",
  stockQuantity: "0",
  category: "all",
  imageUrl: "",
  reviewVideoUrl: "",
  downloadUrl: "",
  filePath: "",
  isActive: true,
};

function toPayload(form: FormState) {
  return {
    name: form.name,
    slug: form.slug,
    licenseKey: form.licenseKey,
    description: form.description,
    extraInfo: form.extraInfo,
    changelogText: form.changelogText,
    versionLabel: form.versionLabel,
    price: Number(form.price || 0),
    isFree: form.isFree,
    pointPrice: Number(form.pointPrice || 0),
    stockQuantity: Number(form.stockQuantity || 0),
    category: form.category || "all",
    imageUrl: form.imageUrl,
    reviewVideoUrl: form.reviewVideoUrl,
    downloadUrl: form.downloadUrl,
    filePath: form.filePath,
    isActive: form.isActive,
  };
}

function mapProductToForm(product: Product): FormState {
  return {
    name: product.name || "",
    slug: product.slug || "",
    licenseKey: product.licenseKey || "",
    description: product.description || "",
    extraInfo: product.extraInfo || "",
    changelogText: product.changelogText || "",
    versionLabel: product.versionLabel || "",
    price: String(product.price ?? 0),
    isFree: Boolean(product.isFree),
    pointPrice: String(product.pointPrice ?? 0),
    stockQuantity: String(product.stockQuantity ?? 0),
    category: product.category || "all",
    imageUrl: product.imageUrl || "",
    reviewVideoUrl: product.reviewVideoUrl || "",
    downloadUrl: product.downloadUrl || "",
    filePath: product.filePath || "",
    isActive: Boolean(product.isActive),
  };
}

function randomLicenseKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `NS-${hex}`;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (response.status === 403) {
      router.replace("/dashboard");
      return;
    }
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; products?: Product[] }
      | null;
    if (!response.ok || !data?.ok || !data.products) {
      setError(data?.error || "Unable to load products.");
      setLoading(false);
      return;
    }
    setProducts(data.products);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const isEditing = useMemo(() => editingId != null, [editingId]);
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return products;
    }
    return products.filter((product) =>
      [
        product.name,
        product.slug,
        product.category,
        product.licenseKey,
        String(product.id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [products, query]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = toPayload(form);
    const url = isEditing ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to save product.");
      setSaving(false);
      return;
    }

    setMessage(isEditing ? "Product updated." : "Product created.");
    resetForm();
    await loadProducts();
    setSaving(false);
  }

  async function deleteProduct(productId: number) {
    if (!confirm("Delete this product?")) {
      return;
    }
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to delete product.");
      return;
    }
    setMessage("Product deleted.");
    await loadProducts();
  }

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN PRODUCTS</span>
            <h1 className="page-heading">Manage Products</h1>
            <p className="note">Create, edit, activate, and delete store products.</p>
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
            <h2 className="panel-title">{isEditing ? `Edit Product #${editingId}` : "Add Product"}</h2>
            <p className="note">All data is saved to MySQL and used by the Next.js API routes.</p>
          </div>
          <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              required
            />
          </label>
          <label>
            License Key
            <input
              value={form.licenseKey}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, licenseKey: event.target.value.toUpperCase() }))
              }
              required
            />
          </label>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() => setForm((prev) => ({ ...prev, licenseKey: randomLicenseKey() }))}
            >
              Generate License Key
            </button>
          </div>

          <label>
            Description
            <input
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>
          <label>
            Extra Info
            <input
              value={form.extraInfo}
              onChange={(event) => setForm((prev) => ({ ...prev, extraInfo: event.target.value }))}
            />
          </label>
          <label>
            Changelog
            <input
              value={form.changelogText}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, changelogText: event.target.value }))
              }
            />
          </label>
          <label>
            Version
            <input
              value={form.versionLabel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, versionLabel: event.target.value }))
              }
            />
          </label>
          <label>
            Price (THB)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            />
          </label>
          <label>
            Point Price
            <input
              type="number"
              min="0"
              value={form.pointPrice}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, pointPrice: event.target.value }))
              }
            />
          </label>
          <label>
            Stock Quantity
            <input
              type="number"
              min="0"
              value={form.stockQuantity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))
              }
            />
          </label>
          <label>
            Category
            <input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            />
          </label>
          <label>
            Image URL
            <input
              value={form.imageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            />
          </label>
          <label>
            Preview Video URL
            <input
              value={form.reviewVideoUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reviewVideoUrl: event.target.value }))
              }
            />
          </label>
          <label>
            Download URL
            <input
              value={form.downloadUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, downloadUrl: event.target.value }))
              }
            />
          </label>
          <label>
            File Path (local)
            <input
              value={form.filePath}
              onChange={(event) => setForm((prev) => ({ ...prev, filePath: event.target.value }))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={(event) => setForm((prev) => ({ ...prev, isFree: event.target.checked }))}
            />{" "}
            Free
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />{" "}
            Active
          </label>

            <div className="actions">
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
              </button>
              {isEditing ? (
                <button className="btn" type="button" onClick={resetForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Product List</h2>
            <div className="admin-tools">
              <input
                className="admin-search"
                type="text"
                placeholder="Search by name, slug, license key..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {loading ? <section className="card">Loading products...</section> : null}
          {!loading ? (
            <section className="admin-list">
              {filteredProducts.map((product) => (
                <article className="admin-item" key={product.id}>
                  <div className="admin-item__top">
                    <div>
                      <h3 className="admin-item__title">{product.name}</h3>
                      <p className="admin-item__sub">Slug: {product.slug}</p>
                    </div>
                    <span className={`admin-status ${product.isActive ? "admin-status--ok" : "admin-status--off"}`}>
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="admin-item__meta">
                    <div>ID: {product.id}</div>
                    <div>License: {product.licenseKey || "Not set"}</div>
                    <div>Stock: {product.stockQuantity}</div>
                  </div>
                  <div className="admin-item__actions">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setEditingId(product.id);
                        setForm(mapProductToForm(product));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn danger" type="button" onClick={() => deleteProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
          {!loading && filteredProducts.length === 0 ? (
            <p className="empty-state">No products match this search.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
