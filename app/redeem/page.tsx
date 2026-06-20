"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; message?: string }
      | null;
    if (!response.ok || !data?.ok) {
      setError(data?.error || "Unable to redeem code.");
      setLoading(false);
      return;
    }

    setMessage(data.message || "Redeemed successfully.");
    setCode("");
    setLoading(false);
  }

  return (
    <main className="main-content">
      <header className="history-header">
        <div>
          <span className="landing-section__eyebrow">REDEEM</span>
          <h1 className="page-heading">Redeem Code</h1>
          <p className="note">Enter your code to redeem product access or points.</p>
        </div>
        <Link className="btn" href="/dashboard">
          Back to Dashboard
        </Link>
      </header>

      <section className="panel admin-panel-compact">
        <div className="panel-header">
          <h2 className="panel-title">Redeem Key</h2>
          <p className="note">Example: <code>XXXX-XXXX-XXXX</code></p>
        </div>
        <form className="form-redeem" onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="redeem-code">
              Code
            </label>
            <input
              id="redeem-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={64}
              required
            />
          </div>

          {error ? <p className="alert alert-error">{error}</p> : null}
          {message ? <p className="alert alert-success">{message}</p> : null}

          <div className="actions actions--compact">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Redeeming..." : "Redeem"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
