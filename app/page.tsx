const landingStats = [
  {
    label: "IP FLEX",
    value: "เปลี่ยน IP ได้ทุกเมื่อ",
    note: "ลูกค้าสามารถเปลี่ยน allowed_ip ได้เองจากแดชบอร์ดทันที",
  },
  {
    label: "SECURITY",
    value: "License + Protection",
    note: "ระบบคีย์และไลเซนส์ช่วยป้องกันการใช้งานนอกสิทธิ์",
  },
  {
    label: "PERFORMANCE",
    value: "กินทรัพยากรน้อย",
    note: "ออกแบบให้ทำงานเบาและเสถียรกับเซิร์ฟเวอร์ FiveM",
  },
];

const landingCredits = [
  {
    label: "IP MANAGEMENT",
    value: "เปลี่ยน IP ได้ตลอดเวลา",
    note: "จัดการ allowed_ip สำหรับสคริปต์ที่ซื้อได้ด้วยตัวเอง",
  },
  {
    label: "SECURITY SYSTEM",
    value: "ปลอดภัยทุกขั้นตอน",
    note: "รองรับการยืนยันตัวตนและระบบสิทธิ์แยกตามผู้ใช้",
  },
  {
    label: "LIGHTWEIGHT",
    value: "สคริปต์เบา ไม่หน่วงเซิร์ฟ",
    note: "เน้นประสิทธิภาพสูงเพื่อลดภาระเซิร์ฟเวอร์",
  },
  {
    label: "STORE QUALITY",
    value: "พร้อมใช้งานจริง",
    note: "ระบบร้านและหลังบ้านครบสำหรับสคริปต์ FiveM",
  },
];

const teamMembers = [
  {
    name: "NS SYSTEM (เจมส์)",
    role: "System Script Developer",
    socials: [
      { label: "Facebook", url: "#" },
      { label: "Instagram", url: "#" },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="main-content landing">
      <section className="hero hero--landing">
        <div className="hero-layout">
          <div className="hero-content">
            <span className="hero-kicker">NS SYSTEM STORE</span>
            <h1 className="hero-title">NS SYSTEM</h1>
            <p className="hero-subtitle">
              สคริปต์ระบบสำหรับเซิร์ฟเวอร์ FiveM เน้นความปลอดภัย ปรับ IP ได้ทุกเมื่อ
              และออกแบบให้กินทรัพยากรน้อย
            </p>

            <div className="hero-buttons">
              <a href="/api/auth/discord/start" className="btn btn-primary btn-lg">
                เข้าสู่ระบบด้วย Discord
              </a>
              <a href="#credits" className="btn btn-outline btn-lg">
                ดูจุดเด่นสคริปต์
              </a>
            </div>

            <div className="hero-highlights" role="list" aria-label="System highlights">
              <span className="hero-highlight" role="listitem">
                Change IP Anytime
              </span>
              <span className="hero-highlight" role="listitem">
                Secure License System
              </span>
              <span className="hero-highlight" role="listitem">
                Low Resource Usage
              </span>
            </div>
          </div>

          <aside className="hero-panel">
            <p className="hero-panel__kicker">SCRIPT STORE SNAPSHOT</p>
            <h2 className="hero-panel__title">จุดเด่นของระบบในร้าน</h2>
            <p className="hero-panel__subtitle">สรุปความสามารถหลักที่ลูกค้าใช้งานได้จริง</p>

            <div className="hero-stats">
              {landingStats.map((stat) => (
                <article className="hero-stat" key={stat.label}>
                  <p className="hero-stat__label">{stat.label}</p>
                  <p className="hero-stat__value">{stat.value}</p>
                  <p className="hero-stat__note">{stat.note}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section" id="credits">
        <div className="section-head section-head--landing">
          <div>
            <span className="landing-section__eyebrow">SCRIPT STORE HIGHLIGHTS</span>
            <h2 className="section-title landing-section__title">จุดเด่นสคริปต์ในร้าน</h2>
            <p className="landing-section__subtitle">
              เน้นความสามารถที่ลูกค้าใช้งานได้จริง เปลี่ยน IP ได้ทันทีและปลอดภัย
            </p>
          </div>
        </div>

        <div className="credit-grid">
          {landingCredits.map((credit, index) => (
            <article className="credit-card" key={credit.label}>
              <span className="credit-card__number">{String(index + 1).padStart(2, "0")}</span>
              <p className="credit-card__label">{credit.label}</p>
              <p className="credit-card__value">{credit.value}</p>
              <p className="credit-card__note">{credit.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--team" id="team">
        <div className="team-showcase">
          <div className="team-showcase__grid">
            {teamMembers.map((member) => (
              <article className="team-member-card" key={member.name}>
                <div className="team-member-card__media">
                  <span className="team-member-card__fallback" aria-hidden="true">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                </div>

                <div className="team-member-card__body">
                  <h3 className="team-member-card__name">{member.name}</h3>
                  <p className="team-member-card__role">{member.role}</p>

                  <div className="team-member-card__socials">
                    {member.socials.map((social) => (
                      <a href={social.url} className="team-social-btn" key={social.label}>
                        <span>{social.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
