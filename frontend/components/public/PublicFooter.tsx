import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="w-full py-12 border-t border-outline-variant/20 bg-surface-container-low mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
        <div className="col-span-2 md:col-span-1">
          <div className="text-lg font-black tracking-tighter text-on-surface mb-4">
            Talash Insight
          </div>
          <p className="font-body text-xs text-on-surface-variant">
            © 2024 Talash Insight. Intelligent Talent Acquisition.
          </p>
        </div>
        <div className="flex flex-col space-y-3">
          <Link
            href="/privacy"
            className="font-body text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-body text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            Terms of Service
          </Link>
        </div>
        <div className="flex flex-col space-y-3">
          <Link
            href="/contact"
            className="font-body text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            Contact Us
          </Link>
          <a
            href="#"
            className="font-body text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            Newsletter
          </a>
        </div>
        <div className="flex flex-col space-y-3">
          <a
            href="#"
            className="font-body text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            Careers
          </a>
          <a
            href="#"
            className="font-body text-xs text-on-surface-variant hover:text-primary hover:underline underline-offset-4 transition-colors"
          >
            API Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
