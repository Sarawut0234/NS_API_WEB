"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CurrentUser = {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  points: number;
  role: string;
};

type PurchaseItem = {
  id: number;
  name: string;
  purchasedAt: string;
  scriptName: string;
  licenseKey: string;
  allowedIp: string;
};

type MeResponse = {
  ok?: boolean;
  error?: string;
  user?: CurrentUser;
};

type PurchaseHistoryResponse = {
  ok?: boolean;
  error?: string;
  products?: PurchaseItem[];
};

function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleString();
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<"topup" | "orders">("topup");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    const meRes = await fetch("/api/me", { cache: "no-store" });
    if (meRes.status === 401) {
      router.replace("/login");
      return;
    }

    const meData = (await meRes.json().catch(() => null)) as MeResponse | null;
    if (!meRes.ok || !meData?.ok || !meData.user) {
      setError(meData?.error || "Unable to load profile.");
      setLoading(false);
      return;
    }

    setUser(meData.user);

    const purchaseRes = await fetch("/api/purchase-history", { cache: "no-store" });
    if (purchaseRes.status === 401) {
      router.replace("/login");
      return;
    }

    const purchaseData = (await purchaseRes.json().catch(() => null)) as
      | PurchaseHistoryResponse
      | null;
    if (purchaseRes.ok && purchaseData?.ok && purchaseData.products) {
      setPurchases(purchaseData.products);
    } else {
      setPurchases([]);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const purchaseCount = purchases.length;
  const latestPurchase = useMemo(() => {
    if (!purchases.length) {
      return "";
    }
    return formatDate(purchases[0].purchasedAt);
  }, [purchases]);

  const avatarInitial = (user?.username || "U").slice(0, 1).toUpperCase();
  const roleLabel = user?.role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิกทั่วไป";
  const emailLabel =
    user?.email && !user.email.endsWith("@discord.local")
      ? user.email
      : "ไม่มีอีเมล";

  return (
    <main className="main-content profile-scene">
      {loading ? <section className="card">Loading profile...</section> : null}
      {!loading && error ? <p className="alert alert-error">{error}</p> : null}

      {!loading && user ? (
        <div className="profile-layout">
          <section className="profile-banner">
            <span className="profile-banner__dot" aria-hidden="true" />
            <div className="profile-banner__avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </div>
            <div className="profile-banner__body">
              <h1 className="profile-banner__name">{user.username}</h1>
              <div className="profile-banner__chips">
                <span className="profile-banner__chip">{roleLabel}</span>
                <span className="profile-banner__chip">{emailLabel}</span>
              </div>
            </div>
          </section>

          <aside className="profile-wallet">
            <div className="profile-wallet__head">
              <span>ยอดเงินคงเหลือ</span>
              <Link href="/redeem" className="profile-wallet__plus" title="Redeem code">
                +
              </Link>
            </div>
            <p className="profile-wallet__value">
              {Number(user.points || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <small>Point</small>
            </p>
            <div className="profile-wallet__stats">
              <div>
                <span>ยอดเติมเงิน</span>
                <strong>฿0.00</strong>
              </div>
              <div>
                <span>ยอดซื้อรวม</span>
                <strong>{purchaseCount.toLocaleString()} รายการ</strong>
              </div>
            </div>
          </aside>

          <aside className="profile-side">
            <section className="profile-side__card">
              <p className="profile-side__title">ข้อมูลสมาชิก</p>
              <button type="button" className="profile-side__item active">
                ประวัติบริการ
              </button>
            </section>
            <button
              type="button"
              className="profile-side__logout"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </button>
          </aside>

          <section className="profile-history">
            <div className="profile-history__tabs">
              <button
                type="button"
                className={`profile-history__tab ${activeTab === "topup" ? "active" : ""}`}
                onClick={() => setActiveTab("topup")}
              >
                ประวัติการเติมเงิน
              </button>
              <button
                type="button"
                className={`profile-history__tab ${activeTab === "orders" ? "active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                ประวัติการสั่งซื้อ
              </button>
            </div>

            {activeTab === "topup" ? (
              <div className="profile-history__panel">
                <h2>ประวัติการเติมเงินล่าสุด</h2>
                <div className="profile-history__empty">ไม่พบรายการเติมเงิน</div>
              </div>
            ) : (
              <div className="profile-history__panel">
                <h2>ประวัติการสั่งซื้อล่าสุด</h2>
                {purchases.length === 0 ? (
                  <div className="profile-history__empty">ไม่พบรายการสั่งซื้อ</div>
                ) : (
                  <div className="profile-order-list">
                    {purchases.map((item) => (
                      <article className="profile-order-item" key={item.id}>
                        <div className="profile-order-item__top">
                          <strong>{item.name}</strong>
                          <span>{formatDate(item.purchasedAt)}</span>
                        </div>
                        <div className="profile-order-item__meta">
                          <span>Script: {item.scriptName || "-"}</span>
                          <span>License: {item.licenseKey || "ยังไม่กำหนด"}</span>
                          <span>IP: {item.allowedIp || "ยังไม่กำหนด"}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="profile-history__links">
              <Link className="btn" href="/dashboard">
                ไปที่ร้านค้า
              </Link>
              <Link className="btn" href="/dashboard/purchase-history">
                จัดการ Purchase / IP
              </Link>
              <Link className="btn" href="/dashboard/cart">
                ตะกร้าสินค้า
              </Link>
            </div>

            {latestPurchase ? (
              <p className="note">รายการซื้อล่าสุด: {latestPurchase}</p>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
