"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";

type CurrentUser = {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  points: number;
  role: string;
};

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  async function loadSession() {
    const meRes = await fetch("/api/me", { cache: "no-store" });
    if (!meRes.ok) {
      setUser(null);
      setCartCount(0);
      return;
    }
    const meData = (await meRes.json().catch(() => null)) as
      | { ok?: boolean; user?: CurrentUser }
      | null;
    if (!meData?.ok || !meData.user) {
      setUser(null);
      setCartCount(0);
      return;
    }
    setUser(meData.user);

    const cartRes = await fetch("/api/cart", { cache: "no-store" });
    if (!cartRes.ok) {
      setCartCount(0);
      return;
    }
    const cartData = (await cartRes.json().catch(() => null)) as
      | { ok?: boolean; items?: Array<{ qty: number }> }
      | null;
    if (!cartData?.ok || !cartData.items) {
      setCartCount(0);
      return;
    }
    setCartCount(cartData.items.reduce((sum, item) => sum + (item.qty || 0), 0));
  }

  useEffect(() => {
    void loadSession();
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    router.replace("/login");
    router.refresh();
  }

  async function goHome(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const meRes = await fetch("/api/me", { cache: "no-store" });
    if (meRes.ok) {
      router.push("/dashboard");
      return;
    }
    router.push("/login");
  }

  const userName = user?.username || "User";
  const initial = userName.slice(0, 1).toUpperCase() || "U";

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={user ? "/dashboard" : "/login"} className="logo" onClick={goHome}>
          NS SYSTEM
        </Link>

        <nav className="nav-links">
          {user ? (
            <>
              <Link href="/dashboard">Home</Link>
              <Link href="/dashboard/purchase-history">Purchase / Change IP</Link>
              <Link href="/redeem">Redeem Code</Link>
            </>
          ) : (
            <>
              <Link href="/login">Home</Link>
            </>
          )}
        </nav>

        <nav className="nav nav-right">
          {user ? (
            <>
              <Link href="/dashboard/cart" className="cart-pill" title="My Cart">
                <span>Cart{cartCount > 0 ? ` (${cartCount})` : ""}</span>
              </Link>

              <div className="profile-menu">
                <button
                  type="button"
                  className="profile-trigger"
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  <span className="user-avatar" aria-hidden="true">
                    {user.avatar ? (
                      <img src={user.avatar} alt={userName} className="user-avatar__img" />
                    ) : (
                      <span className="user-avatar__fallback">{initial}</span>
                    )}
                  </span>
                </button>

                {menuOpen ? (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown__head">
                      <strong>{userName}</strong>
                      <span>{user.email}</span>
                    </div>
                    <Link href="/profile" className="profile-dropdown__item" onClick={() => setMenuOpen(false)}>
                      Profile
                    </Link>
                    {user.role === "admin" ? (
                      <Link href="/admin" className="profile-dropdown__item" onClick={() => setMenuOpen(false)}>
                        Admin
                      </Link>
                    ) : null}
                    <Link
                      href="/dashboard/purchase-history"
                      className="profile-dropdown__item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Purchase / Change IP
                    </Link>
                    <Link href="/redeem" className="profile-dropdown__item" onClick={() => setMenuOpen(false)}>
                      Redeem Code
                    </Link>
                    <button
                      type="button"
                      className="profile-dropdown__item profile-dropdown__item--danger"
                      onClick={logout}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <a href="/api/auth/discord/start" className="btn btn-primary">
              Login with Discord
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
