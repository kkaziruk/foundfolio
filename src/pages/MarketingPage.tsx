import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Camera,
  BarChart3,
  Shield,
  ArrowLeftRight,
  Bell,
  Menu,
  X,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const MarketingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const pilotRef = useRef<HTMLElement>(null);

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"admin" | "manager" | "student">("manager");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const [form, setForm] = useState({ name: "", email: "", university: "", locations: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (window.location.hash === "#pilot") {
      setTimeout(() => pilotRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  const goToApp = () => navigate(user ? "/app" : "/login");

  const scrollToPilot = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    pilotRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.university) {
      setFormError("Please fill in your name, email, and university.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const { error } = await supabase.from("campus_requests").insert({
        contact_name: form.name.trim(),
        contact_email: form.email.trim().toLowerCase(),
        university_name: form.university.trim(),
        location_count: form.locations.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      setFormError("Something went wrong. Please email us directly at hello@foundfolio.co");
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: "How does FoundFolio work?",
      a: "Staff log found items in seconds — with a photo, description, and location. Students search the live database from their phone or laptop to see if their item has been turned in, without needing to walk over and ask.",
    },
    {
      q: "Who is FoundFolio for?",
      a: "Any campus location that manages lost items: student centers, recreation facilities, libraries, residence halls. Buildings each have their own dashboard, and a campus admin can see everything across all locations.",
    },
    {
      q: "How do students access it?",
      a: "Students sign in with their campus Google account at foundfolio.co/login and can immediately search what's been found across all buildings. No app download needed.",
    },
    {
      q: "Is student data secure?",
      a: "Yes. All data is stored on encrypted, enterprise-grade infrastructure in the United States. Student-facing pages show only general item details — never personal information.",
    },
    {
      q: "What does the pilot include?",
      a: "Free 30-day access, full setup and onboarding for your team, staff training, and dedicated support throughout the trial.",
    },
    {
      q: "How quickly can we get started?",
      a: "Submit a request today and your dashboard can be live the next business day.",
    },
  ];

  const steps = [
    {
      num: "1",
      icon: <Camera className="w-6 h-6 text-blue-500" />,
      title: "Log it in seconds",
      desc: "Staff photograph and describe found items right from their phone. AI assists with categorization and descriptions.",
    },
    {
      num: "2",
      icon: <Search className="w-6 h-6 text-blue-500" />,
      title: "Students search anywhere",
      desc: "Students check what's been found before making a trip to the desk. Search by color, type, location, or description.",
    },
    {
      num: "3",
      icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
      title: "Admins track everything",
      desc: "Campus-wide dashboards, recovery analytics, hold-period alerts, and cross-building item transfers — all in one place.",
    },
  ];

  const features = [
    { icon: <Camera className="w-5 h-5" />, title: "Photo logging with AI", desc: "Log items with a photo in seconds. AI suggests descriptions to keep your records consistent." },
    { icon: <Search className="w-5 h-5" />, title: "Student-facing search", desc: "A clean, searchable page students can check from anywhere — no staff time required to answer calls." },
    { icon: <Shield className="w-5 h-5" />, title: "High-value item alerts", desc: "Automatic alerts for electronics, wallets, IDs, and keys to help staff meet safety requirements." },
    { icon: <BarChart3 className="w-5 h-5" />, title: "Live analytics", desc: "Track recovery rates, hold periods, and campus-wide trends. Generate reports in one click." },
    { icon: <ArrowLeftRight className="w-5 h-5" />, title: "Inter-building transfers", desc: "Move items between locations without duplicate entries. The full chain of custody stays intact." },
    { icon: <Bell className="w-5 h-5" />, title: "\"Found it\" reports", desc: "Students submit potential matches directly. Staff review and confirm from their dashboard." },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── NAV ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 bg-white transition-shadow ${scrolled ? "shadow-sm border-b border-slate-100" : ""}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/about" className="flex items-center gap-2.5">
              <img src="/found_folio_(6).png" alt="FoundFolio" className="h-9 w-auto" />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
              <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#faq" onClick={(e) => { e.preventDefault(); document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }); }} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
              <button onClick={goToApp} disabled={authLoading} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50">
                {authLoading ? "..." : user ? "Open app" : "Log in"}
              </button>
              <button onClick={scrollToPilot} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                Request a pilot
              </button>
            </div>

            <button className="md:hidden p-2 -mr-2" onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
            <a href="#how" className="block text-sm font-medium text-slate-700" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }); }}>How it works</a>
            <a href="#features" className="block text-sm font-medium text-slate-700" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>Features</a>
            <a href="#faq" className="block text-sm font-medium text-slate-700" onClick={e => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }); }}>FAQ</a>
            <button onClick={goToApp} disabled={authLoading} className="block w-full text-left text-sm font-medium text-slate-700 disabled:opacity-50">
              {authLoading ? "..." : user ? "Open app" : "Log in"}
            </button>
            <button onClick={scrollToPilot} className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg">
              Request a pilot
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
            Campus lost & found,<br />
            <span className="text-blue-600">finally digital.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            FoundFolio replaces paper logs and spreadsheets with a searchable, trackable system your students and staff will actually use.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={scrollToPilot}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors inline-flex items-center justify-center gap-2"
            >
              Request a free pilot <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToApp}
              disabled={authLoading}
              className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {user ? "Open FoundFolio" : "Log in"}
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">How it works</h2>
            <p className="mt-3 text-slate-500 text-lg">Three steps. No training required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-black text-slate-100 select-none">{step.num}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE DEMOS ── */}
      <section id="demo" className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">See it in action</h2>
            <p className="mt-3 text-slate-500 text-lg">Different views for every role on campus.</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
              {([ { key: "manager", label: "Building Manager" }, { key: "admin", label: "Campus Admin" }, { key: "student", label: "Student" } ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "manager" && (
            <div>
              <p className="text-center text-slate-600 text-base mb-5 max-w-xl mx-auto">Log items in seconds, keep your location organized, and route high-value items safely.</p>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img src="/manager.png" alt="Building Manager dashboard" className="w-full h-auto object-contain max-h-[520px] object-center" loading="lazy" />
              </div>
            </div>
          )}
          {activeTab === "admin" && (
            <div>
              <p className="text-center text-slate-600 text-base mb-5 max-w-xl mx-auto">Centralized dashboards, analytics, and cross-building controls across your whole campus.</p>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img src="/admin.png" alt="Campus Admin dashboard" className="w-full h-auto object-contain max-h-[520px] object-center" loading="lazy" />
              </div>
            </div>
          )}
          {activeTab === "student" && (
            <div>
              <p className="text-center text-slate-600 text-base mb-5 max-w-xl mx-auto">Students search what's been found before making an unnecessary trip to the desk.</p>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img src="/student.png" alt="Student search experience" className="w-full h-auto object-contain max-h-[520px] object-center" loading="lazy" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Everything you need. Nothing you don't.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-5 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PILOT REQUEST FORM ── */}
      <section ref={pilotRef} id="pilot" className="py-20 px-4 bg-slate-900">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Ready to modernize your lost & found?</h2>
            <p className="mt-3 text-slate-400 text-lg">Start a free 30-day pilot — setup takes one business day.</p>
          </div>

          {submitted ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Request received!</h3>
              <p className="text-slate-400 text-sm">We'll be in touch within one business day to get your campus set up.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@university.edu"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">University / institution <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.university}
                  onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
                  placeholder="University of Notre Dame"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Number of buildings / locations</label>
                <input
                  type="text"
                  value={form.locations}
                  onChange={e => setForm(f => ({ ...f, locations: e.target.value }))}
                  placeholder="e.g. 3 buildings, 1 main desk"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Anything else? (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Tell us about your current process, timeline, or any questions..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting ? "Sending..." : <>Request pilot <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-xs text-slate-400 text-center">No credit card. No commitment. We'll reach out within one business day.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center tracking-tight">Common questions</h2>
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
            {faqs.map((faq, idx) => {
              const open = faqOpen === idx;
              return (
                <div key={idx}>
                  <button
                    onClick={() => setFaqOpen(open ? null : idx)}
                    className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 text-sm leading-snug">{faq.q}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </button>
                  {open && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 border-t border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/found_folio_(6).png" alt="FoundFolio" className="h-7 w-auto opacity-70" />
            <span className="text-sm text-slate-400">© {new Date().getFullYear()} FoundFolio</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <button onClick={scrollToPilot} className="hover:text-slate-700 transition-colors">Request a pilot</button>
            <button onClick={goToApp} className="hover:text-slate-700 transition-colors">{user ? "Open app" : "Log in"}</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingPage;
