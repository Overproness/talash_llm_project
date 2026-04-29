import PublicFooter from "@/components/public/PublicFooter";
import PublicNav from "@/components/public/PublicNav";
import Link from "next/link";

export default function PublicHomePage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center space-x-2 bg-surface-container-high px-3 py-1.5 rounded-full mb-8">
                <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Talash AI v2.0 Live
                </span>
              </div>
              <h1 className="font-headline text-[2.75rem] leading-[1.1] font-bold tracking-tight text-on-surface mb-6">
                The Future of Research Recruitment is Here.
              </h1>
              <p className="text-on-surface-variant text-lg mb-10 leading-relaxed max-w-xl">
                Identify world-class academic talent before your competitors.
                Our intelligent atelier utilizes advanced AI to parse candidate
                CVs, analyze publication impact, and surface the smartest hiring
                decisions for modern universities.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  href="/contact"
                  className="inline-flex justify-center items-center bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-lg font-headline font-semibold text-sm shadow-[0_8px_32px_rgba(70,72,212,0.2)] hover:shadow-[0_8px_32px_rgba(70,72,212,0.3)] transition-all"
                >
                  Request a Demo
                </Link>
                <Link
                  href="/features"
                  className="inline-flex justify-center items-center bg-primary-fixed text-on-primary-fixed px-8 py-4 rounded-lg font-headline font-semibold text-sm hover:bg-inverse-primary transition-colors"
                >
                  Explore Platform
                </Link>
              </div>
            </div>
            {/* Hero Visual */}
            <div className="relative hidden lg:block h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary-container/40 to-surface-tint/10 rounded-[3rem] -rotate-6 transform scale-105"></div>
              <div className="absolute inset-0 bg-surface-container-lowest rounded-2xl shadow-[0_32px_64px_rgba(70,69,84,0.06)] border border-outline-variant/15 overflow-hidden flex flex-col">
                <div className="h-12 bg-surface-container-low border-b border-outline-variant/15 flex items-center px-4 space-x-2">
                  <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
                  <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
                  <div className="w-3 h-3 rounded-full bg-surface-variant"></div>
                </div>
                <div className="p-6 flex-1 bg-gradient-to-br from-primary-fixed/40 via-surface-container-low to-secondary-container/30">
                  <div className="w-full h-full backdrop-blur-sm bg-surface/80 rounded-xl p-6 border border-outline-variant/20 flex flex-col gap-4">
                    <div className="bg-surface-container-lowest rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                          Top Match
                        </span>
                        <span className="bg-surface-container-high px-2 py-1 rounded text-xs font-semibold text-emerald-600">
                          98 Impact Score
                        </span>
                      </div>
                      <div className="h-2 bg-surface-container-low rounded-full w-3/4 mb-2"></div>
                      <div className="h-2 bg-surface-container-low rounded-full w-1/2"></div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-lg p-4 shadow-sm opacity-70">
                      <div className="h-2 bg-surface-container-low rounded-full w-5/6 mb-2"></div>
                      <div className="h-2 bg-surface-container-low rounded-full w-1/3"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating Glass Insight */}
              <div className="absolute -right-8 top-1/4 bg-surface/80 backdrop-blur-[16px] border border-outline-variant/20 p-5 rounded-xl shadow-[0_24px_48px_rgba(70,69,84,0.08)] w-64 transform rotate-2">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="material-symbols-outlined text-primary">
                    auto_awesome
                  </span>
                  <span className="font-headline font-semibold text-sm text-on-surface">
                    Insight Generated
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Candidate&apos;s recent nature publication creates a 94%
                  alignment with your quantum computing lab&apos;s current
                  focus.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 bg-surface-container-low/50 border-y border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-8">
            Trusted by elite research institutions worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            <div className="font-headline font-bold text-xl text-on-surface">
              Stanford Lab
            </div>
            <div className="font-headline font-bold text-xl text-on-surface">
              MIT Research
            </div>
            <div className="font-headline font-bold text-xl text-on-surface">
              Oxford Inst.
            </div>
            <div className="font-headline font-bold text-xl text-on-surface">
              Max Planck
            </div>
            <div className="font-headline font-bold text-xl text-on-surface">
              CERN
            </div>
          </div>
        </div>
      </section>

      {/* Bento Value Props */}
      <section id="solutions" className="py-24 bg-surface relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-on-surface mb-4">
              Intelligent Infrastructure for Talent
            </h2>
            <p className="text-on-surface-variant">
              We move beyond simple keyword matching. Talash understands the
              semantic weight of academic achievements.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/15 shadow-tonal flex flex-col h-full hover:bg-surface-container-low transition-colors duration-300">
              <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  document_scanner
                </span>
              </div>
              <h3 className="font-headline font-semibold text-lg text-on-surface mb-3">
                Precision AI Parsing
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-grow">
                Instantly extract and structure complex academic CVs. Our models
                understand citation formats, grant histories, and complex
                academic lineage with 99.8% accuracy.
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/15 shadow-tonal flex flex-col h-full hover:bg-surface-container-low transition-colors duration-300 md:col-span-2 bg-gradient-to-br from-surface-container-lowest to-surface-container-low">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-secondary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    public
                  </span>
                </div>
                <div className="bg-surface-container-lowest px-3 py-1 rounded-full border border-outline-variant/20 text-xs font-semibold text-primary uppercase tracking-wider">
                  Global Reach
                </div>
              </div>
              <h3 className="font-headline font-semibold text-lg text-on-surface mb-3">
                Global Publication Analysis
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-6 max-w-xl">
                Cross-reference candidate claims against a live database of over
                200 million global publications. Automatically detect citation
                velocity, h-index trajectories, and collaboration networks.
              </p>
              <div className="mt-auto pt-6 border-t border-outline-variant/10 flex items-center space-x-2">
                <div className="h-1.5 w-1/4 bg-primary/20 rounded-full"></div>
                <div className="h-1.5 w-1/2 bg-primary/40 rounded-full"></div>
                <div className="h-1.5 w-1/4 bg-primary rounded-full"></div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/15 shadow-tonal flex flex-col h-full hover:bg-surface-container-low transition-colors duration-300 md:col-span-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-xl">
                  <div className="w-12 h-12 bg-tertiary-fixed rounded-xl flex items-center justify-center mb-6">
                    <span
                      className="material-symbols-outlined text-tertiary-container"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      troubleshoot
                    </span>
                  </div>
                  <h3 className="font-headline font-semibold text-lg text-on-surface mb-3">
                    Scientific Impact Scoring
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Go beyond traditional metrics. Talash assigns an
                    &apos;Impact Score&apos; based on the contextual relevance
                    of a researcher&apos;s work to your specific
                    department&apos;s active grants and focus areas.
                  </p>
                </div>
                <div className="shrink-0 bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center min-w-[200px]">
                  <span className="text-[0.75rem] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                    Impact Score
                  </span>
                  <span className="font-headline text-[2.75rem] font-bold text-on-surface leading-none mb-1">
                    94
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center">
                    <span className="material-symbols-outlined text-sm mr-1">
                      trending_up
                    </span>{" "}
                    Top 5%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section
        id="resources"
        className="py-24 bg-surface-container-low relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-1/2 h-full bg-surface"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(70,69,84,0.08)] bg-gradient-to-br from-primary-fixed to-secondary-container flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{
                    fontSize: "8rem",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  account_circle
                </span>
              </div>
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-lg border border-outline-variant/10 text-primary">
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  format_quote
                </span>
              </div>
            </div>
            <div className="md:col-span-7 md:pl-12">
              <h4 className="text-xs uppercase tracking-widest font-bold text-primary mb-6">
                Perspective
              </h4>
              <blockquote className="font-headline text-2xl md:text-3xl font-medium leading-tight text-on-surface mb-8">
                &quot;Talash Insight hasn&apos;t just sped up our hiring
                process; it has fundamentally changed who we discover. We are
                now identifying rising stars in bioinformatics months before
                they appear on traditional academic radars.&quot;
              </blockquote>
              <div>
                <div className="font-headline font-semibold text-on-surface">
                  Dr. Elena Rostova
                </div>
                <div className="text-sm text-on-surface-variant">
                  Dean of Life Sciences, Meridian Institute of Technology
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-surface text-center px-6">
        <div className="max-w-3xl mx-auto bg-surface-container-lowest rounded-[1.5rem] p-12 md:p-16 border border-outline-variant/15 shadow-[0_24px_48px_rgba(70,69,84,0.04)]">
          <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-6">
            Ready to transform your hiring?
          </h2>
          <p className="text-on-surface-variant mb-10 max-w-xl mx-auto">
            Join the leading research institutions using Talash to build the
            laboratories of tomorrow. Request access to our platform today.
          </p>
          <Link
            href="/contact"
            className="inline-flex justify-center items-center bg-gradient-to-br from-primary to-primary-container text-on-primary px-10 py-4 rounded-lg font-headline font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            Request a Demo
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
