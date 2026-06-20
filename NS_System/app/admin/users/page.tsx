"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";

type UserItem = {
  id: number;
  email: string;
  username: string;
  points: number;
  role: "member" | "admin";
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
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
      [user.username, user.email, user.role, String(user.id), String(user.points)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [users, query]);

  async function setRole(userId: number, role: "member" | "admin") {
    setBusyUserId(userId);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to update role.");
      setBusyUserId(null);
      return;
    }

    setUsers((prev) =>
      prev.map((item) => (item.id === userId ? { ...item, role } : item)),
    );
    setMessage("Role updated.");
    setBusyUserId(null);
  }

  return (
    <main className="admin-workspace">
      <AdminNav />
      <section className="admin-main">
        <header className="admin-page-head">
          <div className="admin-page-head__copy">
            <span className="landing-section__eyebrow">ADMIN USERS</span>
            <h1 className="page-heading">User Roles</h1>
            <p className="note">Manage user roles and review points.</p>
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
            <h2 className="panel-title">User List</h2>
            <div className="admin-tools">
              <input
                className="admin-search"
                type="text"
                placeholder="Search user, email, role..."
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
                  <div className="admin-item__top">
                    <h3 className="admin-item__title">{user.username}</h3>
                    <span className={`admin-status ${user.role === "admin" ? "admin-status--ok" : "admin-status--wait"}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="admin-item__meta">
                    <div>Email: {user.email}</div>
                    <div>User ID: {user.id}</div>
                    <div>Points: {user.points.toLocaleString()}</div>
                  </div>
                  <div className="admin-item__actions">
                    <button
                      className={`btn ${user.role === "member" ? "primary" : ""}`}
                      type="button"
                      onClick={() => setRole(user.id, "member")}
                      disabled={busyUserId === user.id}
                    >
                      Member
                    </button>
                    <button
                      className={`btn ${user.role === "admin" ? "primary" : ""}`}
                      type="button"
                      onClick={() => setRole(user.id, "admin")}
                      disabled={busyUserId === user.id}
                    >
                      Admin
                    </button>
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
