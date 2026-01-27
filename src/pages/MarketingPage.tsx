// src/pages/MarketingPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Box,
  Laptop,
  Shield,
  LayoutList,
  ArrowLeftRight,
  PieChart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type RoleTab = "admin" | "manager" | "student";

const STORAGE_BASE =
  "https://auth.foundfolio.co/storage/v1/object/public/onboarding-videos/nd";

const ROLE_VIDEO: Record<RoleTab, string> = {
  admin: `${STORAGE_BASE}/admin.mp4`,
  manager: `${STORAGE_BASE}/building-manager.mp4`,
  student: `${STORAGE_BASE}/student.mp4`,
};

function RoleMedia({
  src,
  zoom,
  alt,
}: {
  src: string;
  zoom: number;
  alt: string;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-[#f7f8fa] shadow-sm">
      <div
        className="transition-transform duration-300 ease-out md:group-hover:scale-[var(--z)]"
        style={{ ["--z" as any]: zoom }}
      >
        <video
          key={src}                
          controls
          playsInline
          preload="metadata"
          className="mx-auto w-full max-w-[1100px] h-auto max-h-[520px] object-contain object-center"
          aria-label={alt}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

const MarketingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Rotating word (always on line 2)
  const words = useMemo(() => ["Unified", "Simplified", "Connected"], []);
  const [wordIndex, setWordIndex] = useState(0);

  // Tabs + FAQ (only one open at a time)
  const [activeTab, setActiveTab] = useState<"admin" | "manager" | "student">("admin");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % words.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [words.length]);

  const rotatingWord = words[wordIndex];

  const goToProduct = () => {
    if (authLoading) return;
    navigate(user ? "/app" : "/login");
  };

  const PrimaryNavButton = () => {
    const label = authLoading ? "Loading..." : user ? "Open FoundFolio" : "Log in";
    return (
      <button
        onClick={goToProduct}
        disabled={authLoading}
        className="px-4 py-2 rounded-lg font-semibold border border-gray-300 text-[#212529] hover:bg-gray-50 disabled:opacity-60 disabled:hover:bg-transparent"
      >
        {label}
      </button>
    );
  };

  const PrimaryMobileButton = () => {
    const label = authLoading ? "Loading..." : user ? "Open FoundFolio" : "Log in";
    return (
      <button
        onClick={() => {
          setMobileMenuOpen(false);
          goToProduct();
        }}
        disabled={authLoading}
        className="w-full px-4 py-2 rounded-lg font-semibold border border-gray-300 text-[#212529] hover:bg-gray-50 disabled:opacity-60 disabled:hover:bg-transparent"
      >
        {label}
      </button>
    );
  };

  const faqs = [
    {
      q: "How does FoundFolio work?",
      a: "FoundFolio replaces paper logs and spreadsheets with a simple digital system. Staff can log items in seconds (with photos, details, and locations), and students can check online to see if their item has been found before visiting the desk.",
    },
    {
      q: "Who is FoundFolio for?",
      a: "FoundFolio is built for student centers and campus recreation facilities or any location that manages lost items. Each building can use its own dashboard, or campuses can connect multiple locations under one central hub.",
    },
    {
      q: "Is student or item data secure?",
      a: "Yes — FoundFolio stores all data securely in the cloud using encrypted infrastructure that meets industry security standards. Each campus has its own private dashboard accessible only to approved staff, while student-facing pages display only general item details — never personal information.",
    },
    {
      q: "Where is the data stored?",
      a: "All FoundFolio data is stored securely in the cloud on enterprise-grade servers located in the United States. Our infrastructure providers use encryption in transit and at rest, continuous monitoring, and rigorous data protection standards — the same level of security trusted by universities and enterprise software platforms.",
    },
    {
      q: "How do students access the system?",
      a: "Each campus gets a unique web link (e.g., foundfolio.co/youruniversity). Students can search items anytime from their phone or laptop — no login or app download needed.",
    },
    {
      q: "What does the pilot include?",
      a: "1. Free access for 30 days\n2. Setup and onboarding for your team\n3. Staff training and feedback sessions\n4. Dedicated support during the trial",
    },
    {
      q: "How long does it take to get started?",
      a: "Once we confirm your pilot, your dashboard can be live the next day.",
    },
    {
      q: "How does this help sustainability goals?",
      a: "FoundFolio helps reduce the number of unclaimed items that end up discarded. We provide reports on recovered items and reuse rates — great for campus sustainability metrics.",
    },
    {
      q: "Can multiple departments use FoundFolio?",
      a: "Yes — campuses can link multiple buildings under one central system. Each department manages its own items, but administrators can view overall data across all locations.",
    },
    {
      q: "What kind of support is included?",
      a: "During the pilot, we offer personalized onboarding, email support, and live check-ins. After the pilot, premium tiers include ongoing customer success and quarterly reviews.",
    },
    {
      q: "What happens after the pilot?",
      a: "At the end of the pilot, we’ll share a summary of your center’s performance (items logged, recovery rates, etc.) and a short feedback session to decide if you’d like to continue as a FoundFolio partner.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* NAV */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/found_folio_(6).png" alt="FoundFolio" className="h-10 w-auto" />
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-[#212529] hover:text-[#2D3748] font-semibold">
                Features
              </a>
              <a href="#faq" className="text-[#212529] hover:text-[#2D3748] font-semibold">
                FAQ
              </a>
              <PrimaryNavButton />
            </div>

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3">
              <a
                href="#features"
                className="block text-[#212529] font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#roles"
                className="block text-[#212529] font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Roles
              </a>
              <a
                href="#faq"
                className="block text-[#212529] font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </a>
              <PrimaryMobileButton />
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
<section className="pt-24 pb-10" style={{ backgroundColor: "#FAFAFA" }}>
  <div className="max-w-6xl mx-auto px-4 sm:px-6">
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <div className="text-center md:text-left">
        <h1
          className="font-semibold leading-tight"
          style={{
            fontFamily:
              "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            color: "#2D3748",
          }}
        >
          {/* FIRST LINE — locked to one line */}
          <span className="block text-4xl md:text-5xl whitespace-normal md:whitespace-nowrap break-words">
            Campus Lost and Found
          </span>

          {/* SECOND LINE — rotating word */}
          <span className="block mt-2 min-h-[1.2em] text-4xl md:text-5xl text-[#3B82F6]">
            <span
              key={rotatingWord}
              className="inline-block animate-fade"
            >
              {rotatingWord}
            </span>
          </span>
        </h1>

              <p className="mt-4 text-[16px] leading-[24px] text-[#212529] md:max-w-xl">
                 Transform lost and found into a unified searchable digital system that your students and staff will love.
              </p>

              <div className="mt-6 flex justify-center md:justify-start">
                <button
                  onClick={goToProduct}
                  disabled={authLoading}
                  className="px-5 py-3 rounded-lg font-semibold border border-gray-300 text-[#212529] hover:bg-white disabled:opacity-60"
                >
                  {authLoading ? "Loading..." : user ? "Open FoundFolio" : "Log in"}
                </button>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <img
                src="/screenshot_2025-11-08_at_1.53.00_pm.png"
                alt="FoundFolio illustration"
                className="w-full max-w-md h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <h2
              style={{ fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", fontWeight: 600, color: "#000" }}
              className="text-[34px] leading-tight"
            >
              Managing Lost Items Just Got Easier
            </h2>
            <p className="mt-3 text-[18px] leading-[28px] text-[#2D3748] max-w-2xl mx-auto">
              FoundFolio helps universities save time, reduce waste, and create a better student
              experience — all in one simple platform.
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="flex gap-4 items-start">
              <div className="mt-1">
                <Box className="w-10 h-10 text-[#2F6B7C]" />
              </div>
              <div>
                <div style={{ fontFamily: "Poppins, system-ui", fontWeight: 600, color: "#2D3748" }} className="text-[22px]">
                  Log and Track with AI
                </div>
                <p className="mt-2 text-[16px] leading-[24px] text-[#212529]">
                  Use AI to log lost item in seconds while keeping everything organized in one searchable system.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="mt-1">
                <Laptop className="w-10 h-10 text-[#E3B15A]" />
              </div>
              <div>
                <div style={{ fontFamily: "Poppins, system-ui", fontWeight: 600, color: "#2D3748" }} className="text-[22px]">
                  Students Search From Anywhere
                </div>
                <p className="mt-2 text-[16px] leading-[24px] text-[#212529]">
                  Make it easy for students to see what&apos;s lost before going to the desk.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="mt-1">
                <Shield className="w-10 h-10 text-[#2E6AA8]" />
              </div>
              <div>
                <div style={{ fontFamily: "Poppins, system-ui", fontWeight: 600, color: "#2D3748" }} className="text-[22px]">
                  Automatic High Value Item Alerts
                </div>
                <p className="mt-2 text-[16px] leading-[24px] text-[#212529]">
                  Built-in alerts to help staff meet safety requirements for high value items.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="mt-1">
                <LayoutList className="w-10 h-10 text-[#2F6B7C]" />
              </div>
              <div>
                <div style={{ fontFamily: "Poppins, system-ui", fontWeight: 600, color: "#2D3748" }} className="text-[22px]">
                  Campus-Wide Dashboard
                </div>
                <p className="mt-2 text-[16px] leading-[24px] text-[#212529]">
                  Admins can view all logged items across campus buildings in one place.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="mt-1">
                <ArrowLeftRight className="w-10 h-10 text-[#E3B15A]" />
              </div>
              <div>
                <div style={{ fontFamily: "Poppins, system-ui", fontWeight: 600, color: "#2D3748" }} className="text-[22px]">
                  Transfer Logged Items
                </div>
                <p className="mt-2 text-[16px] leading-[24px] text-[#212529]">
                  Move logged items to another location&apos;s portal without creating duplicate entries.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="mt-1">
                <PieChart className="w-10 h-10 text-[#2E6AA8]" />
              </div>
              <div>
                <div style={{ fontFamily: "Poppins, system-ui", fontWeight: 600, color: "#2D3748" }} className="text-[22px]">
                  Live Analytics & Reports
                </div>
                <p className="mt-2 text-[16px] leading-[24px] text-[#212529]">
                  View live statistics and create custom reports on item recovery rates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center border-b border-gray-200">
            {(
              [
                { key: "admin", label: "Admin View" },
                { key: "manager", label: "Building Manager View" },
                { key: "student", label: "Student View" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-3 font-semibold ${
                  activeTab === t.key
                    ? "text-[#2D3748] border-b-4 border-[#2E6AA8]"
                    : "text-gray-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "admin" && (
  <>
    {/* Headline copy (NOT redundant h3) */}
    <p
      className="mt-2 max-w-lg mx-auto text-center text-[18px] sm:text-[20px] leading-[28px] font-medium text-[#1f3a5f]"
      style={{ fontFamily: "Poppins, system-ui" }}
    >
      Centralized dashboards, analytics, and cross-building controls.
    </p>

    {/* Screenshot with hover zoom */}
    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-[#f7f8fa] shadow-sm">
      <div className="transition-transform duration-300 ease-out md:group-hover:scale-[1.40]">
        <RoleMedia
  src={ROLE_VIDEO.admin}
  zoom={1.2}
  alt="FoundFolio admin onboarding video"
/>
      </div>
    </div>
  </>
)}

{activeTab === "manager" && (
  <>
    <p
      className="mt-2 max-w-xl mx-auto text-center text-[18px] sm:text-[20px] leading-[28px] font-medium text-[#1f3a5f]"
      style={{ fontFamily: "Poppins, system-ui" }}
    >
      Log items in seconds, keep your location organized, and route high-value items safely.
    </p>

    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-[#f7f8fa] shadow-sm">
      <div className="transition-transform duration-300 ease-out md:group-hover:scale-[1.20]">
        <RoleMedia
  src={ROLE_VIDEO.manager}
  zoom={1.0}
  alt="FoundFolio building manager onboarding video"
/>
      </div>
    </div>
  </>
)}

{activeTab === "student" && (
  <>
    <p
      className="mt-2 max-w-xl mx-auto text-center text-[18px] sm:text-[20px] leading-[28px] font-medium text-[#1f3a5f]"
      style={{ fontFamily: "Poppins, system-ui" }}
    >
      Search campus items from anywhere and avoid unnecessary trips.
    </p>

    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-[#f7f8fa] shadow-sm">
      <RoleMedia
        src={ROLE_VIDEO.student}
        zoom={1.0}
        alt="FoundFolio student onboarding video"
      />
    </div>
  </>
)}


        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2
            style={{ fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", fontWeight: 600, color: "#2D3748" }}
            className="text-[28px] mb-6"
          >
            Frequently Asked Questions
          </h2>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {faqs.map((faq, idx) => {
              const open = faqOpen === idx;
              return (
                <div key={idx} className="border-b border-gray-200 last:border-b-0">
                  <button
                    onClick={() => setFaqOpen(open ? null : idx)}
                    className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left hover:bg-gray-50"
                  >
                    <span className="text-[18px] font-semibold text-[#2D3748]">{faq.q}</span>
                    {open ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  {open && (
                    <div className="px-6 pb-6 text-[16px] leading-[24px] text-[#212529] whitespace-pre-line">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">© {new Date().getFullYear()} FoundFolio</div>
          <div className="text-sm text-gray-500">
            <button onClick={goToProduct} className="underline hover:text-gray-700">
              {user ? "Open FoundFolio" : "Log in"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingPage;
