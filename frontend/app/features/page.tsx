import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export default function FeaturesPage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col gap-24">
        {/* Hero */}
        <section className="flex flex-col items-start gap-8 max-w-4xl">
          <h1 className="text-[2.75rem] leading-tight font-bold tracking-tight text-on-surface">
            The Architecture of
            <br />
            <span className="text-primary">Intelligent Hiring.</span>
          </h1>
          <p className="text-base text-on-surface-variant max-w-2xl leading-relaxed">
            Discover the core technologies powering Talash Insight. From
            semantic parsing to multidimensional candidate scoring, explore how
            we transform unstructured data into actionable hiring intelligence.
          </p>
        </section>

        {/* Feature 1 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-6 order-2 md:order-1">
            <div className="flex items-center gap-3 text-primary font-semibold tracking-wide uppercase text-xs">
              <span className="material-symbols-outlined">neurology</span>
              <span>Core Technology</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-on-surface">
              AI Parsing Engine
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Our proprietary NLP models don&apos;t just read resumes; they
              understand context. We extract subtle nuances in research focus,
              accurately map grant histories, and identify domain expertise that
              standard keyword matching misses.
            </p>
            <ul className="flex flex-col gap-4 mt-4">
              {[
                "Contextual mapping of complex academic trajectories.",
                "Automated extraction of obscure grant sources and values.",
                "Reduction of manual screening time by up to 85%.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5 text-sm">
                    check_circle
                  </span>
                  <span className="text-sm text-on-surface-variant">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-8 relative overflow-hidden order-1 md:order-2 h-[400px] flex items-center justify-center border border-outline-variant/15">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary-container/30 to-transparent"></div>
            <div className="relative z-10 grid grid-cols-3 gap-4 w-full max-w-sm">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg ${
                    [0, 4, 8].includes(i)
                      ? "bg-primary/30"
                      : [1, 3, 5, 7].includes(i)
                        ? "bg-primary/10"
                        : "bg-secondary-container/40"
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature 2 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-tonal relative overflow-hidden h-[400px] flex flex-col justify-between border border-outline-variant/15">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold tracking-wider text-on-surface-variant uppercase mb-1">
                  Impact Score
                </p>
                <h3 className="text-3xl font-bold text-on-surface">94.2</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-md">
                Top 5%
              </span>
            </div>
            <div className="flex-grow flex items-end">
              <div className="w-full flex items-end justify-between gap-2 h-32 opacity-70">
                <div className="w-1/6 bg-primary-fixed rounded-t-sm h-[40%]"></div>
                <div className="w-1/6 bg-primary-fixed rounded-t-sm h-[60%]"></div>
                <div className="w-1/6 bg-primary-fixed rounded-t-sm h-[50%]"></div>
                <div className="w-1/6 bg-primary-fixed rounded-t-sm h-[80%]"></div>
                <div className="w-1/6 bg-primary rounded-t-sm h-[100%] shadow-[0_0_15px_rgba(70,72,212,0.3)]"></div>
              </div>
            </div>
            <div className="mt-6 flex justify-between text-xs text-on-surface-variant font-medium">
              <span>Citations (WoS)</span>
              <span>h-index (Scopus)</span>
              <span>Peer Review Activity</span>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 text-primary font-semibold tracking-wide uppercase text-xs">
              <span className="material-symbols-outlined">insert_chart</span>
              <span>Data Integration</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-on-surface">
              Scientific Impact Matrix
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              We synthesize raw publication data from Web of Science and Scopus
              into normalized, comparative scores. Move beyond simple
              publication counts to understand true academic influence, citation
              velocity, and collaborative network strength.
            </p>
            <button className="self-start mt-4 bg-primary-fixed text-on-primary-fixed px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-fixed-dim transition-colors">
              View Methodology
            </button>
          </div>
        </section>

        {/* Feature 3 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-6 order-2 md:order-1">
            <div className="flex items-center gap-3 text-primary font-semibold tracking-wide uppercase text-xs">
              <span className="material-symbols-outlined">people</span>
              <span>Analytical Tools</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-on-surface">
              Multidimensional Comparison
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Evaluate shortlists without bias. Our visual radar charts layer
              candidate profiles across key dimensions—Technical Fit, Research
              Impact, Leadership Potential, and Grant Acquisition—providing a
              clear, holistic view of comparative strengths.
            </p>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-8 relative overflow-hidden order-1 md:order-2 h-[400px] flex items-center justify-center border border-outline-variant/15">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full max-w-xs relative z-10"
            >
              {[80, 60, 40, 20].map((r) => (
                <polygon
                  key={r}
                  points={`100,${100 - r} ${100 + r * 0.95},${100 - r * 0.31} ${100 + r * 0.59},${100 + r * 0.81} ${100 - r * 0.59},${100 + r * 0.81} ${100 - r * 0.95},${100 - r * 0.31}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-outline-variant"
                />
              ))}
              <polygon
                points="100,40 175,73 145,168 60,165 30,75"
                fill="rgb(70 72 212 / 0.25)"
                stroke="rgb(70 72 212)"
                strokeWidth="2"
              />
              <polygon
                points="100,55 160,80 130,150 70,145 50,85"
                fill="rgb(199 195 254 / 0.4)"
                stroke="rgb(91 89 140)"
                strokeWidth="2"
              />
            </svg>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
