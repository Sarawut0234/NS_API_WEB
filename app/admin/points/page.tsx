"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type UserItem = {
  id: number;
  email: string;
  username: string;
  points: number;
  role: string;
};

export default function AdminPointsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [email, setEmail] = useState("");
  const [points, setPoints] = useState("100");
  const [query, setQuery] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (response.status === 403) {
      router.replace("/dashboard");
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; users?: UserItem[] }
      | null;
    if (!response.ok || !data?.ok || !data.users) {
      setError(data?.error || "Unable to load users.");
      setLoading(false);
      return;
    }
    setUsers(data.users);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return users;
    }
    return users.filter((user) =>
      [user.username, user.email, user.role, String(user.id)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [users, query]);

  async function addPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/points/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, points: Number(points || 0) }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; result?: { username?: string; pointsAdded?: number } }
      | null;
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to add points.");
      setSaving(false);
      return;
    }

    setMessage(
      `Added ${(data.result?.pointsAdded || 0).toLocaleString()} points to ${
        data.result?.username || "user"
      }.`,
    );
    setSaving(false);
    await loadUsers();
  }

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN POINTS</span>
            <h1 className="page-heading">Point Management</h1>
            <p className="note">Add points to member account by email.</p>
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

        <section className="panel admin-panel-compact">
          <div className="panel-header">
            <h2 className="panel-title">Add Points</h2>
          </div>
          <form className="form-grid" onSubmit={addPoints}>
          <label>
            User Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Points
            <input
              type="number"
              min="1"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              required
            />
          </label>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Points"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">User Points</h2>
            <div className="admin-tools">
              <input
                className="admin-search"
                type="text"
                placeholder="Search username or email..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          {loading ? <section className="card">Loading users...</section> : null}
          {!loading ? (
            <section className="admin-list">
              {filteredUsers.map((user) => (
                <article className="admin-item" key={user.id}>
                  <h3 className="admin-item__title">{user.username}</h3>
                  <div className="admin-item__meta">
                    <div>Email: {user.email}</div>
                    <div>Role: {user.role}</div>
                    <div>Points: {user.points.toLocaleString()}</div>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
          {!loading && filteredUsers.length === 0 ? (
            <p className="empty-state">No users match this search.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
