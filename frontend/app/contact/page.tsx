"use client";

import { useState } from "react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <PublicNav />

      <main className="flex-grow pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:w-2/3">
            <h1 className="font-headline text-[2.75rem] font-bold tracking-tight leading-tight mb-4 text-on-surface">
              Let&apos;s build the future of research together.
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl">
              Connect with our team to explore how intelligent talent
              acquisition can accelerate your institution&apos;s strategic
              goals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
            {/* Form */}
            <div className="lg:col-span-7">
              <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/15 shadow-tonal">
                {submitted ? (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-primary text-5xl mb-3 block">
                      mark_email_read
                    </span>
                    <h2 className="text-xl font-semibold text-on-surface mb-2">
                      Message received
                    </h2>
                    <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                      Thank you for reaching out. Our team will respond within
                      one business day.
                    </p>
                  </div>
                ) : (
                  <form
                    className="space-y-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubmitted(true);
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant mb-2"
                        >
                          Full Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="Jane Doe"
                          className="w-full bg-surface-container-low border border-outline-variant/15 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-sm text-on-surface outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant mb-2"
                        >
                          Work Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="jane@institution.edu"
                          className="w-full bg-surface-container-low border border-outline-variant/15 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-sm text-on-surface outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="institution"
                          className="block text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant mb-2"
                        >
                          Institution / Organization
                        </label>
                        <input
                          id="institution"
                          name="institution"
                          type="text"
                          placeholder="University of Sciences"
                          className="w-full bg-surface-container-low border border-outline-variant/15 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-sm text-on-surface outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="role"
                          className="block text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant mb-2"
                        >
                          Role / Title
                        </label>
                        <input
                          id="role"
                          name="role"
                          type="text"
                          placeholder="Director of Research"
                          className="w-full bg-surface-container-low border border-outline-variant/15 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-sm text-on-surface outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="interest"
                        className="block text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Interested in...
                      </label>
                      <select
                        id="interest"
                        name="interest"
                        className="w-full bg-surface-container-low border border-outline-variant/15 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-sm text-on-surface outline-none transition-all"
                      >
                        <option>Platform Demo</option>
                        <option>Enterprise Licensing</option>
                        <option>Partnership Inquiry</option>
                        <option>General Support</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        placeholder="How can we help you?"
                        className="w-full bg-surface-container-low border border-outline-variant/15 focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-3 rounded-lg text-sm text-on-surface outline-none transition-all resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-medium text-sm px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
                    >
                      Send Message
                      <span className="material-symbols-outlined text-[1.2rem]">
                        arrow_forward
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-5 space-y-10 mt-8 lg:mt-0">
              <div className="space-y-8">
                <div>
                  <h3 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[1.2rem]">
                      location_on
                    </span>
                    Global Headquarters
                  </h3>
                  <address className="not-italic text-sm text-on-surface-variant pl-7">
                    1 Innovation Way
                    <br />
                    Suite 400
                    <br />
                    Boston, MA 02110
                    <br />
                    United States
                  </address>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[1.2rem]">
                      support_agent
                    </span>
                    Specialized Support
                  </h3>
                  <div className="pl-7 space-y-4">
                    <div>
                      <p className="text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant">
                        Universities &amp; Academic
                      </p>
                      <a
                        href="mailto:academic@talashinsight.com"
                        className="text-sm text-primary hover:underline"
                      >
                        academic@talashinsight.com
                      </a>
                    </div>
                    <div>
                      <p className="text-[0.75rem] font-bold tracking-widest uppercase text-on-surface-variant">
                        Private Labs &amp; Enterprise
                      </p>
                      <a
                        href="mailto:enterprise@talashinsight.com"
                        className="text-sm text-primary hover:underline"
                      >
                        enterprise@talashinsight.com
                      </a>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[1.2rem]">
                      call
                    </span>
                    Phone Inquiries
                  </h3>
                  <p className="text-sm text-on-surface-variant pl-7">
                    +1 (800) 555-0199
                    <br />
                    <span className="text-xs">Mon-Fri, 9am - 6pm EST</span>
                  </p>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="bg-gradient-to-br from-primary-fixed via-secondary-container/40 to-surface-container-high rounded-2xl overflow-hidden h-48 relative border border-outline-variant/15">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary opacity-30"
                    style={{ fontSize: "6rem" }}
                  >
                    map
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 to-transparent flex items-end p-4">
                  <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded text-xs font-medium text-on-surface flex items-center gap-1 shadow-tonal">
                    <span className="material-symbols-outlined text-[1rem] text-primary">
                      pin_drop
                    </span>
                    Open in Maps
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
