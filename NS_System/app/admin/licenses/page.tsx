"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type LicenseItem = {
  id: number;
  licenseKey: string;
  userId: number | null;
  productId: number | null;
  lockedIp: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  username: string;
  productName: string;
};

export default function AdminLicensesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editIp, setEditIp] = useState("");
  const [editActive, setEditActive] = useState(true);

  // Form untuk membuat license baru
  const [newLicenseKey, setNewLicenseKey] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newLockedIp, setNewLockedIp] = useState("");

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/licenses", { cache: "no-store" });

    if (response.status === 401 || response.status === 403) {
      router.replace("/login");
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; licenses?: LicenseItem[] }
      | null;

    if (!response.ok || !data?.ok || !data.licenses) {
      setError(data?.error || "Unable to load licenses.");
      setLoading(false);
      return;
    }

    setLicenses(data.licenses);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadLicenses();
  }, [loadLicenses]);

  const filteredLicenses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return licenses;
    }
    return licenses.filter((item) =>
      [
        item.licenseKey,
        item.username,
        item.productName,
        item.lockedIp,
        String(item.id),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [licenses, query]);

  async function createLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      licenseKey: newLicenseKey.trim(),
      userId: newUserId ? Number(newUserId) : null,
      productId: newProductId ? Number(newProductId) : null,
      lockedIp: newLockedIp.trim() || null,
    };

    if (!payload.licenseKey) {
      setError("License key is required");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; message?: string }
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to create license.");
      setSaving(false);
      return;
    }

    setMessage("License created successfully!");
    setNewLicenseKey("");
    setNewUserId("");
    setNewProductId("");
    setNewLockedIp("");
    await loadLicenses();
    setSaving(false);
  }

  async function updateLicense(id: number) {
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      lockedIp: editIp.trim() || null,
      isActive: editActive,
    };

    const response = await fetch(`/api/admin/licenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; message?: string }
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to update license.");
      setSaving(false);
      return;
    }

    setMessage("License updated successfully!");
    setEditingId(null);
    await loadLicenses();
    setSaving(false);
  }

  async function deleteLicense(id: number) {
    if (!confirm("Delete this license? This action cannot be undone.")) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/licenses/${id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; message?: string }
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to delete license.");
      setSaving(false);
      return;
    }

    setMessage("License deleted successfully!");
    await loadLicenses();
    setSaving(false);
  }

  function startEdit(license: LicenseItem) {
    setEditingId(license.id);
    setEditIp(license.lockedIp || "");
    setEditActive(license.isActive);
  }

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN LICENSES</span>
            <h1 className="page-heading">Manage Licenses</h1>
            <p className="note">Create, edit, and manage API keys with IP locking for FiveM scripts. Support multiple IPs per key.</p>
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
            <h2 className="panel-title">Create New License</h2>
          </div>
          <form className="form-grid" onSubmit={createLicense}>
            <label>
              License Key *
              <input
                type="text"
                placeholder="e.g., KEY_ABC123XYZ"
                value={newLicenseKey}
                onChange={(event) => setNewLicenseKey(event.target.value)}
                required
              />
            </label>

            <label>
              User ID (Optional)
              <input
                type="number"
                placeholder="Leave empty if not assigned yet"
                value={newUserId}
                onChange={(event) => setNewUserId(event.target.value)}
              />
            </label>

            <label>
              Product ID (Optional)
              <input
                type="number"
                placeholder="Leave empty if not assigned yet"
                value={newProductId}
                onChange={(event) => setNewProductId(event.target.value)}
              />
            </label>

            <label>
              Locked IP Address (Optional)
              <input
                type="text"
                placeholder="e.g., 192.168.1.100 or 192.168.1.100, 10.0.0.1"
                value={newLockedIp}
                onChange={(event) => setNewLockedIp(event.target.value)}
              />
              <small style={{ display: "block", marginTop: "4px", color: "#666" }}>
                Separate multiple IPs with commas (e.g., 1.1.1.1, 2.2.2.2)
              </small>
            </label>

            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create License"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">License List</h2>
            <div className="admin-tools">
              <input
                className="admin-search"
                type="text"
                placeholder="Search key, user, product, IP..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {loading ? <section className="card">Loading licenses...</section> : null}

          {!loading ? (
            <section className="admin-list">
              {filteredLicenses.map((license) => (
                <article className="admin-item" key={license.id}>
                  <div className="admin-item__top">
                    <h3 className="admin-item__title">
                      <code>{license.licenseKey}</code>
                    </h3>
                    <span className={`admin-status ${license.isActive ? "admin-status--ok" : "admin-status--off"}`}>
                      {license.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {editingId === license.id ? (
                    <div className="admin-item__edit">
                      <label>
                        Locked IP:
                        <input
                          type="text"
                          value={editIp}
                          onChange={(event) => setEditIp(event.target.value)}
                          placeholder="e.g., 192.168.1.100 or 192.168.1.100, 10.0.0.1"
                        />
                        <small style={{ display: "block", marginTop: "4px", color: "#666" }}>
                          Separate multiple IPs with commas
                        </small>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(event) => setEditActive(event.target.checked)}
                        />
                        Active
                      </label>
                      <div className="admin-item__actions">
                        <button
                          className="btn primary"
                          type="button"
                          onClick={() => updateLicense(license.id)}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-item__meta">
                        <div>User: {license.username}</div>
                        <div>Product: {license.productName}</div>
                        <div>Locked IP: {license.lockedIp || "Not set"}</div>
                        <div>Created: {new Date(license.createdAt).toLocaleString()}</div>
                        {license.updatedAt && <div>Updated: {new Date(license.updatedAt).toLocaleString()}</div>}
                      </div>
                      <div className="admin-item__actions">
                        <button
                          className="btn"
                          type="button"
                          onClick={() => startEdit(license)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          className="btn danger"
                          type="button"
                          onClick={() => deleteLicense(license.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </section>
          ) : null}

          {!loading && filteredLicenses.length === 0 ? (
            <p className="empty-state">No licenses match this search.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
