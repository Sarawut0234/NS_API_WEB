"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  extraInfo: string;
  changelogText: string;
  versionLabel: string;
  pointPrice: number;
  stockQuantity: number;
  category: string;
  imageUrl: string;
  reviewVideoUrl: string;
  owned: boolean;
  isOutOfStock: boolean;
  downloadHref: string;
};

type DashboardResponse = {
  ok: boolean;
  error?: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
  userPoints?: number;
  cartCount?: number;
  products?: Product[];
};

const categories = [
  { value: "all", label: "ALL" },
  { value: "script", label: "Script" },
  { value: "garage", label: "Garage" },
  { value: "economy", label: "Economy" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cat, setCat] = useState("all");
  const [userPoints, setUserPoints] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [username, setUsername] = useState("");
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [detailProductId, setDetailProductId] = useState<number | null>(null);

  const loadData = useCallback(async (nextCat: string) => {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/store/dashboard?cat=${encodeURIComponent(nextCat)}`, {
      cache: "no-store",
    });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const data = (await response.json().catch(() => null)) as DashboardResponse | null;
    if (!response.ok || !data?.ok || !data.products || !data.user) {
      setError(data?.error || "Unable to load dashboard.");
      setLoading(false);
      return;
    }

    setUsername(data.user.username || "User");
    setUserPoints(Number(data.userPoints || 0));
    setProducts(data.products);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadData(cat);
  }, [cat, loadData]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const nextCat = (url.searchParams.get("cat") || "all").toLowerCase();
    if (["all", "script", "garage", "economy"].includes(nextCat)) {
      setCat(nextCat);
    }
  }, []);

  const detailProduct = useMemo(
    () => products.find((product) => product.id === detailProductId) || null,
    [detailProductId, products],
  );

  useEffect(() => {
    if (!detailProductId) {
      return;
    }
    if (!products.some((product) => product.id === detailProductId)) {
      setDetailProductId(null);
    }
  }, [detailProductId, products]);

  useEffect(() => {
    if (!detailProductId) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailProductId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailProductId]);

  useEffect(() => {
    if (!detailProductId) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailProductId]);

  async function addToCart(productId: number) {
    setAddingProductId(productId);
    setMessage("");
    setError("");

    const response = await fetch("/api/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !data?.ok) {
      const map: Record<string, string> = {
        product: "Product not found.",
        owned: "You already own this product.",
        out_of_stock: "Product is out of stock.",
        stock_limit: "Quantity in cart exceeded stock.",
      };
      setError(map[data?.error || ""] || "Unable to add to cart.");
      setAddingProductId(null);
      return;
    }

    setMessage("Added to cart.");
    setAddingProductId(null);
  }

  const categoryLinks = useMemo(
    () =>
      categories.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`category-tab ${cat === item.value ? "active" : ""}`}
          onClick={() => setCat(item.value)}
        >
          {item.label}
        </button>
      )),
    [cat],
  );

  return (
    <main className="main-content">
      <div className="welcome-bar">
        <div className="welcome-text">
          <span className="welcome-label">ยินดีต้อนรับ</span>
          <span className="welcome-name">{username || "User"}</span>
          <span className="welcome-points">
            พ้อยของคุณ: <strong>{userPoints.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">สินค้าทั้งหมด</h2>
        <div className="category-tabs">{categoryLinks}</div>
      </section>

      {loading ? <section className="card">Loading...</section> : null}
      {!loading && error ? <p className="alert alert-error">{error}</p> : null}
      {!loading && message ? <p className="alert alert-success">{message}</p> : null}

      {!loading ? (
        <section className="product-grid">
          {products.map((product) => (
            <article className="product-card product-card--store" key={product.id}>
              <div className="product-card-body">
                <div className="product-card-media">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="product-card-media__img" />
                  ) : (
                    <div className="product-card-media__placeholder">NS SYSTEM</div>
                  )}
                </div>
                <div className="product-meta product-meta--chips">
                  <span className="badge badge-chip">{(product.category || "all").toUpperCase()}</span>
                  {product.pointPrice > 0 ? (
                    <span className="badge badge-chip badge-chip--pink">
                      {product.pointPrice.toLocaleString()} POINT
                    </span>
                  ) : (
                    <span className="badge badge-chip badge-chip--green">FREE</span>
                  )}
                  {product.owned ? <span className="badge badge-chip badge-chip--owned">OWNED</span> : null}
                  {product.isOutOfStock ? (
                    <span className="badge badge-chip badge-chip--out">OUT OF STOCK</span>
                  ) : (
                    <span className="badge badge-chip">STOCK {product.stockQuantity.toLocaleString()}</span>
                  )}
                </div>
                <h3 className="product-name">{product.name}</h3>
                {product.description ? <p className="product-desc">{product.description}</p> : null}
                <div className="product-price-row">
                  <span className="product-price-row__label">PRICE</span>
                  <span className="product-price-row__value">
                    {product.pointPrice > 0 ? product.pointPrice.toLocaleString() : "FREE"}
                  </span>
                  <span className="product-price-row__unit">{product.pointPrice > 0 ? "POINT" : ""}</span>
                </div>
              </div>
              <div className="product-actions product-actions--split">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setDetailProductId(product.id)}
                >
                  View More
                </button>
                {product.owned ? (
                  product.downloadHref ? (
                    <a
                      className="btn btn-primary"
                      href={product.downloadHref}
                      target={product.downloadHref.startsWith("http") ? "_blank" : undefined}
                      rel={product.downloadHref.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      Download
                    </a>
                  ) : (
                    <span className="btn btn-disabled">Owned</span>
                  )
                ) : product.isOutOfStock ? (
                  <span className="btn btn-disabled">สินค้าหมด</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => addToCart(product.id)}
                    disabled={addingProductId === product.id}
                  >
                    {addingProductId === product.id ? "Adding..." : "Buy Now"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {detailProduct ? (
        <section
          className="product-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Product details for ${detailProduct.name}`}
          onClick={() => setDetailProductId(null)}
        >
          <div className="product-detail-shell" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="product-detail-close"
              onClick={() => setDetailProductId(null)}
              aria-label="Close details"
            >
              ×
            </button>
            <div className="product-detail-grid">
              <aside className="product-detail-left">
                <article className="product-detail-card">
                  <header className="product-detail-head">
                    <strong>PREVIEW</strong>
                    <span>{detailProduct.reviewVideoUrl ? "Video available" : "Image preview"}</span>
                  </header>
                  <div className="product-detail-preview">
                    {detailProduct.imageUrl ? (
                      <img src={detailProduct.imageUrl} alt={detailProduct.name} />
                    ) : (
                      <div className="product-detail-preview__empty">NS SYSTEM</div>
                    )}
                  </div>
                  {detailProduct.reviewVideoUrl ? (
                    <a
                      className="btn btn-outline btn-sm"
                      href={detailProduct.reviewVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Preview Video
                    </a>
                  ) : null}
                </article>

                <article className="product-detail-card">
                  <header className="product-detail-head">
                    <strong>CHANGE LOGS</strong>
                    <span>{detailProduct.versionLabel ? `Version ${detailProduct.versionLabel}` : "Latest"}</span>
                  </header>
                  <p className="product-detail-note">
                    {detailProduct.changelogText || "- No update notes yet"}
                  </p>
                </article>

                <article className="product-detail-card">
                  <header className="product-detail-head">
                    <strong>SCREENSHOT</strong>
                    <span>Sample</span>
                  </header>
                  <div className="product-detail-thumb-row">
                    <div className="product-detail-thumb">
                      {detailProduct.imageUrl ? (
                        <img src={detailProduct.imageUrl} alt={`${detailProduct.name} screenshot`} />
                      ) : (
                        <div className="product-detail-thumb__empty">NS</div>
                      )}
                    </div>
                  </div>
                </article>
              </aside>

              <section className="product-detail-right">
                <h2 className="product-detail-title">{detailProduct.name}</h2>
                <div className="product-detail-support">✓ Lifetime support and updates</div>
                <div className="product-detail-price">
                  <div className="product-detail-price__value">
                    {detailProduct.pointPrice > 0 ? detailProduct.pointPrice.toLocaleString() : "FREE"}
                    {detailProduct.pointPrice > 0 ? <small> POINT</small> : null}
                  </div>
                  <div className="product-detail-price__actions">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => router.push("/cart")}
                    >
                      Cart
                    </button>
                    {detailProduct.owned ? (
                      detailProduct.downloadHref ? (
                        <a
                          className="btn btn-primary"
                          href={detailProduct.downloadHref}
                          target={detailProduct.downloadHref.startsWith("http") ? "_blank" : undefined}
                          rel={
                            detailProduct.downloadHref.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                        >
                          Download
                        </a>
                      ) : (
                        <span className="btn btn-disabled">Owned</span>
                      )
                    ) : detailProduct.isOutOfStock ? (
                      <span className="btn btn-disabled">Out of stock</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => addToCart(detailProduct.id)}
                        disabled={addingProductId === detailProduct.id}
                      >
                        {addingProductId === detailProduct.id ? "Adding..." : "Buy Product"}
                      </button>
                    )}
                  </div>
                </div>

                <article className="product-detail-info">
                  <h3>รายละเอียดสินค้า</h3>
                  <p>{detailProduct.description || "ยังไม่มีรายละเอียดสินค้า"}</p>
                  <h3>ข้อมูลเพิ่มเติม</h3>
                  <p>{detailProduct.extraInfo || "ยังไม่มีข้อมูลเพิ่มเติม"}</p>
                </article>

                <div className="product-detail-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setDetailProductId(null)}
                  >
                    กลับ
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => router.push("/cart")}
                  >
                    ดูสินค้าในตะกร้า
                  </button>
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && products.length === 0 ? (
        <section className="empty-state">No products found for this category.</section>
      ) : null}
    </main>
  );
}
