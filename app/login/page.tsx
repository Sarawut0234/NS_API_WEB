"use client";

import { useEffect, useState } from "react";

type OauthErrorParams = {
  error?: string | null;
};

export default function LoginPage() {
  const [oauthError, setOauthError] = useState<OauthErrorParams["error"]>("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const nextError = url.searchParams.get("error") || "";
    setOauthError(nextError);
  }, []);

  return (
    <main className="main-content main-content--auth">
      <div className="auth-card">
        <div className="auth-card__icon" aria-hidden="true">
          <svg className="icon-discord" width="24" height="24" viewBox="0 0 127.14 96.36" focusable="false">
            <path
              fill="currentColor"
              d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,33.35-1.71,58-0.44,82.3A105.73,105.73,0,0,0,32.71,96.36a77.7,77.7,0,0,0,7.12-11.56,68.42,68.42,0,0,1-11.22-5.33c.94-.69,1.86-1.41,2.75-2.14a75.57,75.57,0,0,0,64.56,0c.9.73,1.82,1.45,2.75,2.14a68.68,68.68,0,0,1-11.24,5.34,77,77,0,0,0,7.13,11.55A105.25,105.25,0,0,0,127.58,82.3C129.07,54.14,125.06,29.73,107.7,8.07ZM42.45,65.69C35.89,65.69,30.5,59.67,30.5,52.25s5.31-13.44,11.95-13.44S54.4,44.83,54.39,52.25,49.06,65.69,42.45,65.69Zm42.24,0c-6.56,0-11.95-6-11.95-13.44S78,38.81,84.69,38.81,96.64,44.83,96.64,52.25,91.33,65.69,84.69,65.69Z"
            />
          </svg>
        </div>
        <h1 className="auth-card__title">เข้าสู่ระบบด้วย Discord เท่านั้น</h1>
        <p className="auth-card__subtitle">ระบบนี้รองรับเฉพาะ Discord Login</p>

        {oauthError ? <div className="alert alert-error">{oauthError}</div> : null}

        <div className="hero-buttons">
          <a className="btn btn-primary" href="/api/auth/discord/start">
            Login with Discord
          </a>
        </div>
      </div>
    </main>
  );
}
