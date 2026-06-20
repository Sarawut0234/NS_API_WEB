"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProductItem = {
  id: number;
  name: string;
  slug: string;
  description: string;
  downloadUrl: string;
  filePath: string;
  purchasedAt: string;
  scriptName: string;
  licenseKey: string;
  allowedIp: string;
  hasLicenseRecord: boolean;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  licenseDbLabel?: string | null;
  products?: ProductItem[];
};

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleString();
}

export default function PurchaseHistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [ipDraft, setIpDraft] = useState<Record<number, string>>({});
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [licenseDb, setLicenseDb] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/purchase-history", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const data = (await response.json().catch(() => null)) as ApiResponse | null;
    if (!response.ok || !data?.ok || !data.products) {
      setError(data?.error || "Unable to load purchase history.");
      setLoading(false);
      return;
    }

    setProducts(data.products);
    const draft: Record<number, string> = {};
    for (const item of data.products) {
      draft[item.id] = item.allowedIp || "";
    }
    setIpDraft(draft);
    setLicenseDb(data.licenseDbLabel ?? null);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasProducts = useMemo(() => products.length > 0, [products]);

  async function submitIp(productId: number) {
    setBusyProductId(productId);
    setError("");
    setMessage("");

    const ip = (ipDraft[productId] || "").trim();
    if (!ip) {
      setError("Please provide an IP address.");
      setBusyProductId(null);
      return;
    }

    const response = await fetch("/api/license/update-ip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, ip }),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; data?: { allowedIp?: string } }
      | null;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to update IP.");
      setBusyProductId(null);
      return;
    }

    const finalIp = data.data?.allowedIp || ip;
    setProducts((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              allowedIp: finalIp,
              hasLicenseRecord: true,
            }
          : item,
      ),
    );

    setIpDraft((prev) => ({ ...prev, [productId]: finalIp }));
    setMessage("IP updated successfully.");
    setBusyProductId(null);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <main className="main-content">
      <header className="history-header">
        <div>
          <span className="landing-section__eyebrow">PURCHASE HISTORY</span>
          <h1 className="page-heading">Purchase History / Change IP</h1>
          <p className="note">Manage IP lock and download scripts you already own.</p>
          {licenseDb ? <p className="note">License DB: {licenseDb}</p> : null}
        </div>
        <div className="actions actions--compact">
          <Link className="btn" href="/dashboard">
            Back to Store
          </Link>
          <Link className="btn" href="/redeem">
            Redeem Code
          </Link>
          <button className="btn danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {loading ? <section className="card">Loading...</section> : null}
      {!loading && error ? <p className="alert alert-error">{error}</p> : null}
      {!loading && message ? <p className="alert alert-success">{message}</p> : null}

      {!loading && !hasProducts ? (
        <section className="empty-state">You do not own any scripts yet.</section>
      ) : null}

      {!loading && hasProducts ? (
        <section className="history-grid">
          {products.map((item) => {
            const canUpdateIp = item.licenseKey && item.hasLicenseRecord;
            const downloadHref = item.downloadUrl || (item.filePath ? `/api/download?product=${item.id}` : "");
            return (
              <article className="product-card" key={item.id}>
                <h3 className="product-name">{item.name}</h3>
                <div className="product-meta product-meta--chips">
                  <span className="badge-chip">{item.scriptName || "Script"}</span>
                  <span className="badge-chip badge-chip--owned">
                    Purchased: {formatDate(item.purchasedAt)}
                  </span>
                </div>
                <div className="product-meta">
                  <div>
                    License Key:{" "}
                    {item.licenseKey ? <code>{item.licenseKey}</code> : "Admin has not set this key yet."}
                  </div>
                  <div>Allowed IP: {item.allowedIp || "Not set (Shared Key)"}</div>
                </div>

                {item.description ? <p className="note">{item.description}</p> : null}

                {canUpdateIp ? (
                  <div className="inline-form">
                    <input
                      type="text"
                      placeholder="e.g., 192.168.1.100 or 1.1.1.1, 2.2.2.2"
                      value={ipDraft[item.id] || ""}
                      onChange={(event) =>
                        setIpDraft((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      maxLength={45}
                    />
                    <button
                      className="btn primary btn-sm"
                      type="button"
                      onClick={() => submitIp(item.id)}
                      disabled={busyProductId === item.id}
                    >
                      {busyProductId === item.id ? "Updating..." : "Update IP"}
                    </button>
                  </div>
                ) : item.licenseKey ? (
                  <p className="note">
                    License record is not found in DB yet. It is created at purchase time.
                  </p>
                ) : (
                  <p className="note">
                    Admin must set product license key before IP update is available.
                  </p>
                )}

                {downloadHref ? (
                  <div className="product-actions">
                    <a
                      className="btn btn-outline btn-sm"
                      href={downloadHref}
                      target={downloadHref.startsWith("http") ? "_blank" : undefined}
                      rel={downloadHref.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      Download
                    </a>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
