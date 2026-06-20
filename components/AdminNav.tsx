"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/admin",
    label: "Overview",
    hint: "Summary and quick actions",
  },
  {
    href: "/admin/products",
    label: "Products",
    hint: "Catalog, stock, and files",
  },
  {
    href: "/admin/keys",
    label: "Keys",
    hint: "Generate and manage codes",
  },
  {
    href: "/admin/licenses",
    label: "Licenses",
    hint: "Manage API keys and IP locks",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    hint: "Review and mark paid",
  },
  {
    href: "/admin/points",
    label: "Points",
    hint: "Grant points by email",
  },
  {
    href: "/admin/users",
    label: "Users",
    hint: "Roles and permissions",
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-sidebar__head">
        <span className="admin-sidebar__kicker">NS SYSTEM</span>
        <strong className="admin-sidebar__title">Admin Console</strong>
      </div>

      <nav className="admin-nav">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              className={`admin-nav__item ${active ? "active" : ""}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              <span className="admin-nav__label">{item.label}</span>
              <span className="admin-nav__hint">{item.hint}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar__foot">
        <Link className="admin-sidebar__link" href="/dashboard">
          Go to Store Dashboard
        </Link>
        <Link className="admin-sidebar__link" href="/redeem">
          Open Redeem Page
        </Link>
        <Link className="admin-sidebar__link" href="/admin/licenses">
          Manage Licenses
        </Link>
      </div>
    </aside>
  );
}
