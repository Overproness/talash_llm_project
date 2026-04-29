import PublicFooter from "@/components/public/PublicFooter";
import PublicNav from "@/components/public/PublicNav";

export default function PrivacyPage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <PublicNav minimal />

      <main className="flex-grow pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-4">
              Legal &amp; Compliance
            </p>
            <h1 className="text-[2.75rem] font-bold leading-tight tracking-tight text-on-surface mb-6">
              Privacy &amp; Ethics at Talash
            </h1>
            <p className="text-base text-on-surface-variant leading-relaxed">
              At Talash Insight, we treat data as a profound responsibility, not
              just an asset. Our platform is built on the principles of
              transparency, intentional AI ethics, and absolute data sovereignty
              for our academic partners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-20">
            {/* Sidebar */}
            <aside className="md:col-span-3 lg:col-span-3">
              <nav className="sticky top-32 space-y-2">
                {[
                  { id: "introduction", label: "Introduction" },
                  { id: "data-collection", label: "Data Collection" },
                  {
                    id: "ai-ethics",
                    label: "AI Ethics",
                    icon: "verified_user",
                  },
                  {
                    id: "data-sovereignty",
                    label: "Data Sovereignty",
                    icon: "account_balance",
                  },
                  { id: "gdpr", label: "GDPR Compliance" },
                  { id: "contact", label: "Contact DPO" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface rounded-lg transition-colors flex items-center justify-between"
                  >
                    {item.label}
                    {item.icon && (
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {item.icon}
                      </span>
                    )}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="md:col-span-9 lg:col-span-7 space-y-16">
              <section className="scroll-mt-32" id="introduction">
                <h2 className="text-2xl font-semibold tracking-tight text-on-surface mb-6">
                  Introduction
                </h2>
                <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                  <p>
                    This Privacy Policy (&quot;Policy&quot;) describes how
                    Talash Insight (&quot;we&quot;, &quot;our&quot;, or
                    &quot;us&quot;) collects, uses, and shares personal
                    information of users of our recruitment and talent
                    acquisition platform.
                  </p>
                  <p>
                    We have engineered our systems specifically for the higher
                    education sector, recognizing that university talent pools
                    contain highly sensitive intellectual property and personal
                    data. Our architecture guarantees that your institutional
                    data remains within your controlled perimeter.
                  </p>
                </div>
              </section>

              <section className="scroll-mt-32" id="data-collection">
                <h2 className="text-2xl font-semibold tracking-tight text-on-surface mb-6">
                  Data Collection &amp; Processing
                </h2>
                <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                  <p>
                    We collect information that you provide directly to us when
                    utilizing the Talash Insight platform. This includes:
                  </p>
                  <ul className="list-none space-y-3 mt-4 mb-6">
                    {[
                      [
                        "Candidate Profiles:",
                        "Resumes, CVs, publication records, and academic credentials uploaded by administrators or candidates.",
                      ],
                      [
                        "Assessment Data:",
                        "Scoring, interview notes, and evaluation metrics generated during the hiring process.",
                      ],
                      [
                        "System Telemetry:",
                        "Log data and usage metrics to ensure platform security and optimize search algorithms.",
                      ],
                    ].map(([title, body]) => (
                      <li key={title} className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>
                          <strong>{title}</strong> {body}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="scroll-mt-32" id="ai-ethics">
                <div className="bg-surface-container-low p-8 rounded-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        psychology
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-on-surface">
                      AI Ethics &amp; Bias Mitigation
                    </h2>
                  </div>
                  <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                    <p>
                      Talash Insight utilizes machine learning to surface
                      qualified academic talent. We recognize the inherent risks
                      of algorithmic bias and have implemented strict structural
                      guardrails:
                    </p>
                    <p>
                      Our models are trained on completely anonymized datasets,
                      stripped of demographic identifiers. We employ a{" "}
                      <strong>Human-in-the-Loop (HITL)</strong> architecture;
                      our AI provides recommendations and insights, but final
                      selection decisions are always executed by university
                      committees. Regular algorithmic audits are conducted by
                      independent third-party ethicists to ensure equitable
                      evaluation across all protected classes.
                    </p>
                  </div>
                </div>
              </section>

              <section className="scroll-mt-32" id="data-sovereignty">
                <div className="bg-surface-container-highest p-8 rounded-2xl border border-outline-variant/15">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        gavel
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-on-surface">
                      Data Sovereignty for Universities
                    </h2>
                  </div>
                  <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                    <p>
                      We understand that university data is highly regulated.
                      Talash Insight guarantees absolute data sovereignty.
                    </p>
                    <p>
                      <strong>Zero Cross-Pollination:</strong> Data ingested for
                      University A is mathematically isolated and never used to
                      train global models or inform insights for University B.
                      Your institutional knowledge remains strictly your own.
                    </p>
                    <p>
                      Data is encrypted both in transit (TLS 1.3) and at rest
                      (AES-256). Institutions can request complete data purging
                      upon contract termination with a 24-hour SLA.
                    </p>
                  </div>
                </div>
              </section>

              <section className="scroll-mt-32" id="gdpr">
                <h2 className="text-2xl font-semibold tracking-tight text-on-surface mb-6">
                  GDPR &amp; Global Compliance
                </h2>
                <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                  <p>
                    Talash Insight complies with the General Data Protection
                    Regulation (GDPR), the California Consumer Privacy Act
                    (CCPA), and relevant educational data standards including
                    FERPA.
                  </p>
                  <p>Individuals possess the right to:</p>
                  <ul className="list-none space-y-3 mt-4">
                    {[
                      "Access their personal data held within our systems.",
                      "Request rectification of inaccurate data.",
                      'Exercise the "Right to be Forgotten" (data erasure).',
                      "Object to automated processing and profiling.",
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-outline"></div>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="scroll-mt-32" id="contact">
                <h2 className="text-2xl font-semibold tracking-tight text-on-surface mb-6">
                  Contact our Data Protection Officer
                </h2>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  For privacy-related inquiries or to exercise any of your data
                  rights, please contact our DPO at{" "}
                  <a
                    href="mailto:dpo@talashinsight.com"
                    className="text-primary hover:underline"
                  >
                    dpo@talashinsight.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
