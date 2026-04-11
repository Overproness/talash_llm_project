"use client";

export default function TopBar({
  title,
  breadcrumb,
  action,
}: {
  title?: string;
  breadcrumb?: string[];
  action?: React.ReactNode;
}) {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-220px)] h-16 z-40 bg-white/80 backdrop-blur-md flex justify-between items-center px-8">
      {/* Left: Search / breadcrumb */}
      <div className="flex items-center gap-4 flex-1">
        {breadcrumb ? (
          <nav className="flex items-center gap-2 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="material-symbols-outlined text-[12px]">
                    chevron_right
                  </span>
                )}
                <span
                  className={i === breadcrumb.length - 1 ? "text-primary" : ""}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-sm">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Search candidates..."
              type="text"
            />
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-6">
        {action}
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
        </button>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="flex items-center gap-3 ml-2 border-l pl-6 border-outline-variant/30">
          <div className="text-right">
            <div className="text-xs font-semibold text-on-surface">Admin</div>
            <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">
              Recruiter
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs">
            A
          </div>
        </div>
      </div>
    </header>
  );
}
