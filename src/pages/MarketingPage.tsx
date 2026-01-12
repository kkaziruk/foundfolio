import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MarketingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("security");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    institution: "",
    phone: "",
    message: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [securityOfficers, setSecurityOfficers] = useState(2);
  const [securityHours, setSecurityHours] = useState(12);
  const [securityHourlyRate, setSecurityHourlyRate] = useState(35);

  const [itemsPerMonth, setItemsPerMonth] = useState(500);
  const [studentHourlyRate, setStudentHourlyRate] = useState(15);
  const [numBuildings, setNumBuildings] = useState(12);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const annualSavings = Math.round(
    securityOfficers * securityHours * 52 * securityHourlyRate
  );
  const roi = (annualSavings / 6000).toFixed(1);
  const paybackMonths = ((6000 / annualSavings) * 12).toFixed(1);

  const hoursSavedPerMonth = Math.round((itemsPerMonth * 2) / 60);
  const costSavings = Math.round(hoursSavedPerMonth * studentHourlyRate);
  const hoursPerBuilding = (hoursSavedPerMonth / numBuildings).toFixed(1);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setShowContactModal(false);
      setFormSubmitted(false);
      setContactForm({
        name: "",
        email: "",
        institution: "",
        phone: "",
        message: "",
      });
    }, 2000);
  };

  const faqs = [
    {
      q: "Who has access to what?",
      a: "Campus security sees everything across all buildings. Building managers only see their own items. Students can search all items but only claim items they own.",
    },
    {
      q: "How do high-value alerts work?",
      a: "When a building logs a high-value item (phones, laptops, wallets, IDs), campus security is automatically notified. Students must pick up these items from security, not the building.",
    },
    {
      q: "How long does implementation take?",
      a: "Most campuses are up and running in 1-2 weeks. We provide training, setup support, and ongoing assistance.",
    },
    {
      q: "What training is needed?",
      a: "We provide 30-minute virtual training for campus security and building managers. The system is intuitive - most staff are comfortable after one session.",
    },
    {
      q: "Can we cancel anytime?",
      a: "Yes, no long-term contracts required. Monthly plans can be cancelled with 30 days notice. If you're not satisfied with the 2-month pilot, we offer a full refund.",
    },
    {
      q: "Is it FERPA compliant?",
      a: "Yes. We follow all data privacy regulations. Student information is protected, and we provide data processing agreements as needed.",
    },
  ];
const goToProduct = () => {
  if (authLoading) return;              
  navigate(user ? "/app" : "/login");   
};

const PrimaryNavButton = () => {
  const label = authLoading ? "Loading..." : user ? "Open FoundFolio" : "Sign in";

  return (
    <button
      onClick={goToProduct}
      disabled={authLoading}
      className={
        user
          ? "px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] font-medium disabled:opacity-60 disabled:hover:bg-[#3B82F6]"
          : "px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 font-medium disabled:opacity-60 disabled:hover:bg-transparent"
      }
    >
      {label}
    </button>
  );
};

const PrimaryMobileButton = () => {
  const label = authLoading ? "Loading..." : user ? "Open FoundFolio" : "Sign in";

  return (
    <button
      onClick={() => {
        setMobileMenuOpen(false);
        goToProduct();
      }}
      disabled={authLoading}
      className={
        user
          ? "block w-full px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] font-medium disabled:opacity-60 disabled:hover:bg-[#3B82F6]"
          : "block w-full px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 font-medium disabled:opacity-60 disabled:hover:bg-transparent"
      }
    >
      {label}
    </button>
  );
};

  return (
    <div className="min-h-screen bg-white">
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/found_folio_(6).png" alt="FoundFolio" className="h-10" />
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#how-it-works"
                className="text-black hover:text-[#3B82F6] font-medium"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-black hover:text-[#3B82F6] font-medium"
              >
                Pricing
              </a>

              <PrimaryNavButton />

              <button
                onClick={() => setShowContactModal(true)}
                className="px-4 py-2 bg-[#F59E0B] text-black rounded-lg hover:bg-[#D97706] font-medium"
              >
                Book Demo
              </button>
            </div>

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-4">
              <a
                href="#how-it-works"
                className="block text-black hover:text-[#3B82F6] font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="block text-black hover:text-[#3B82F6] font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>

              <PrimaryMobileButton />

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowContactModal(true);
                }}
                className="block w-full px-4 py-2 bg-[#F59E0B] text-black rounded-lg hover:bg-[#D97706] font-medium"
              >
                Book Demo
              </button>
            </div>
          )}
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 items-center">
            <div className="md:col-span-3">
              <div className="inline-block bg-[#DBEAFE] text-[#3B82F6] px-4 py-2 rounded-full text-sm font-bold mb-4">
                Save 15+ Hours Per Week
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight">
                Campus <span className="whitespace-nowrap">Lost & Found</span>
                <br />
                Simplified
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                AI-powered lost and found system trusted by campus security and
                building managers nationwide
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="font-bold text-black mb-3">FOR CAMPUS SECURITY:</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ See all items campus-wide</li>
                    <li>✓ Auto-alerts for valuables</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-3">
                    FOR BUILDING MANAGERS:
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>✓ Log items in seconds with AI</li>
                    <li>✓ Students search online</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center mb-8">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="px-8 py-4 bg-[#F59E0B] text-black rounded-lg hover:bg-[#D97706] font-bold text-lg shadow-lg"
                >
                  Start Free 2-Month Pilot
                </button>
                <div className="text-gray-600 text-sm">
                  <div className="font-bold">✓ No credit card required</div>
                  <div className="font-bold">✓ Money-back guarantee</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-8 items-center pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-[#374151]">
                  <svg
                    className="w-5 h-5 text-[#10B981]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    />
                  </svg>
                  <span className="font-medium">FERPA Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#374151]">
                  <svg
                    className="w-5 h-5 text-[#10B981]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    />
                  </svg>
                  <span className="font-medium">Bank-Grade Security</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#374151]">
                  <svg
                    className="w-5 h-5 text-[#10B981]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                  <span className="font-medium">24/7 Support</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <img
                src="/screenshot_2025-11-08_at_1.53.00_pm.png"
                alt="Lost and Found Illustration"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-black mb-16">
            Two Problems. One Solution.
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-[#3B82F6]">
              <h3 className="text-2xl font-bold text-black mb-4">
                Campus Security's Problem
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li>• Officers waste 10-15 hours/week on pickups</li>
                <li>• Cluttered office due to low claims and search fatigue</li>
                <li>• No/Low visibility across buildings</li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border-l-4 border-[#F59E0B]">
              <h3 className="text-2xl font-bold text-black mb-4">
                Building Manager's Problem
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li>• Hand-writing takes 2+ minutes/item</li>
                <li>• Flipping through pages to confirm missing items</li>
                <li>• Calling security for every high value item</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-black mb-4">
            Before vs. After FoundFolio
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            See the difference for yourself
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center">
                <span className="text-3xl mr-3">❌</span>
                Old Way
              </h3>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>Building managers hand-write descriptions in notebooks</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>Students call or walk to every building searching for items</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>Security officers spend hours doing routine pickups</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>No visibility into what's at other locations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>High-value items mixed with everything else</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>Flipping through pages to confirm missing items</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 mt-1">•</span>
                  <span>Low claim rates, cluttered storage spaces</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-green-900 mb-6 flex items-center">
                <span className="text-3xl mr-3">✅</span>
                With FoundFolio
              </h3>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Snap a photo, AI generates description in 3 seconds</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Students search all buildings at once from anywhere</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Security only handles high-value items automatically</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Campus-wide dashboard shows everything in real-time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Automatic alerts for phones, laptops, wallets, IDs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Instant keyword search across all descriptions and photos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span>Higher claim rates, better organized, analytics included</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-black mb-16">
            Simple 3-Step Process
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                📸
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Buildings Log Items</h3>
              <p className="text-[#374151]">
                Building staff simply snap a photo of any found item. Our AI
                instantly generates a detailed, searchable description in just 3
                seconds. No more manual data entry or time-consuming paperwork.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#DBEAFE] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                🔍
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Students Search</h3>
              <p className="text-[#374151]">
                Students can search across all campus buildings at once using
                keywords or browsing photos. No need to visit multiple locations
                or make endless phone calls to track down lost belongings.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                ✅
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">Smart Claims</h3>
              <p className="text-[#374151]">
                Students pick up regular items directly from buildings for
                convenience. High-value items like phones, laptops, wallets, and
                IDs automatically route to campus security for added protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F9FAFB] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center mb-12 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("security")}
              className={`px-8 py-4 font-bold text-lg ${
                activeTab === "security"
                  ? "text-[#3B82F6] border-b-4 border-[#3B82F6]"
                  : "text-gray-500"
              }`}
            >
              Campus Security
            </button>
            <button
              onClick={() => setActiveTab("managers")}
              className={`px-8 py-4 font-bold text-lg ${
                activeTab === "managers"
                  ? "text-[#3B82F6] border-b-4 border-[#3B82F6]"
                  : "text-gray-500"
              }`}
            >
              Building Managers
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`px-8 py-4 font-bold text-lg ${
                activeTab === "students"
                  ? "text-[#3B82F6] border-b-4 border-[#3B82F6]"
                  : "text-gray-500"
              }`}
            >
              Students
            </button>
          </div>

          {activeTab === "security" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🗺️</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Campus-wide Dashboard
                </h3>
                <p className="text-gray-600">
                  See all items across every building in one place. Real-time
                  updates as items are logged and claimed.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Automatic High-Value Alerts
                </h3>
                <p className="text-gray-600">
                  Get instant notifications when phones, laptops, wallets, or
                  IDs are logged. No more surprise pickups.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Analytics & Reporting
                </h3>
                <p className="text-gray-600">
                  Track recovery rates, response times, and trends. Data-driven
                  insights for campus operations.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Zero Routine Pickups
                </h3>
                <p className="text-gray-600">
                  Buildings keep regular items. You only handle high-value items.
                  Save 10+ hours per week.
                </p>
              </div>
            </div>
          )}

          {activeTab === "managers" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  AI-Powered Logging
                </h3>
                <p className="text-gray-600">
                  Take a photo, AI describes it in 3 seconds. No more hand-writing
                  detailed descriptions.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Simple Claims Management
                </h3>
                <p className="text-gray-600">
                  Students search online first. When they arrive, verify and mark
                  as claimed. Quick and easy.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🔔</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  One-Click Security Alerts
                </h3>
                <p className="text-gray-600">
                  High-value items automatically notify security. No phone calls,
                  no forms, completely automated.
                </p>
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Search All Buildings
                </h3>
                <p className="text-gray-600">
                  One search shows items from every building on campus. See photos
                  and details instantly.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Find Items Faster
                </h3>
                <p className="text-gray-600">
                  No more calling multiple buildings or walking around campus.
                  Search from anywhere, anytime.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#3B82F6] text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-white mb-4">
            Calculate Your Savings
          </h2>
          <p className="text-center text-blue-100 mb-12 text-lg">
            See the impact on your campus
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-white mb-6">
                Campus Security Savings
              </h3>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-white mb-2">
                    Officers: {securityOfficers}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={securityOfficers}
                    onChange={(e) => setSecurityOfficers(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    Hours/week: {securityHours}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={securityHours}
                    onChange={(e) => setSecurityHours(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    Hourly cost: ${securityHourlyRate}
                  </label>
                  <input
                    type="range"
                    min="25"
                    max="50"
                    value={securityHourlyRate}
                    onChange={(e) => setSecurityHourlyRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="bg-[#F59E0B] text-black p-6 rounded-lg">
                <div className="text-3xl font-bold mb-2">
                  ${annualSavings.toLocaleString()}
                </div>
                <div className="text-sm mb-4">Annual Savings</div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="font-bold">{roi}x</div>
                    <div>ROI</div>
                  </div>
                  <div>
                    <div className="font-bold">{paybackMonths} months</div>
                    <div>Payback</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg">
              <h3 className="text-2xl font-bold text-white mb-6">
                Building Time Saved
              </h3>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-white mb-2">
                    Items/month: {itemsPerMonth}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={itemsPerMonth}
                    onChange={(e) => setItemsPerMonth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    Student hourly rate: ${studentHourlyRate}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="25"
                    value={studentHourlyRate}
                    onChange={(e) => setStudentHourlyRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-white mb-2">
                    Buildings: {numBuildings}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={numBuildings}
                    onChange={(e) => setNumBuildings(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="bg-[#F59E0B] text-black p-6 rounded-lg">
                <div className="text-3xl font-bold mb-2">
                  ${costSavings.toLocaleString()}/month
                </div>
                <div className="text-sm mb-4">Cost Savings</div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="font-bold">{hoursSavedPerMonth} hrs</div>
                    <div>Time Saved</div>
                  </div>
                  <div>
                    <div className="font-bold">{hoursPerBuilding} hrs</div>
                    <div>Per Building</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-8 py-4 bg-[#F59E0B] text-black rounded-lg hover:bg-[#D97706] font-bold text-lg"
            >
              Book Demo
            </button>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
            <div className="inline-block bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
              🔥 Limited Spring Pilot Spots Available
            </div>
          </div>
          <h2 className="text-4xl font-bold text-center text-black mb-4">
            Simple Campus-Wide Pricing
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            One price for unlimited buildings and staff
          </p>

          <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl border-4 border-[#3B82F6] p-8 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#F59E0B] text-black px-6 py-2 rounded-full font-bold text-sm">
              MOST POPULAR
            </div>
            <h3 className="text-2xl font-bold text-black mb-6">Campus Plan</h3>

            <div className="mb-6">
              <div className="text-4xl font-bold text-black">
                $6,000<span className="text-xl text-gray-600">/year</span>
              </div>
              <div className="text-gray-600">or $500/month</div>
            </div>

            <div className="mb-8">
              <div className="font-bold text-black mb-4">Everything Included:</div>
              <ul className="space-y-3 text-gray-700">
                <li>✓ Campus security dashboard</li>
                <li>✓ Unlimited buildings</li>
                <li>✓ AI descriptions & alerts</li>
                <li>✓ Student search portal</li>
                <li>✓ Training & support</li>
              </ul>
            </div>

            <button
              onClick={() => setShowContactModal(true)}
              className="w-full px-6 py-4 bg-[#F59E0B] text-black rounded-lg hover:bg-[#D97706] font-bold text-lg mb-6"
            >
              Book Demo
            </button>

            <div className="border-t pt-6">
              <div className="bg-[#DBEAFE] p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  ⚡ Spring Launch Special:
                </div>
                <div className="font-bold text-black text-lg">
                  2-month pilot: $500 total
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Money-back guarantee • No setup fees
                </div>
                <div className="text-xs text-[#3B82F6] font-bold mt-2">
                  Only 8 spots remaining for spring semester
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-black mb-12">
            Common Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50"
                >
                  <span className="font-bold text-black">{faq.q}</span>
                  {faqOpen === index ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {faqOpen === index && (
                  <div className="px-6 pb-6 text-gray-700">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-black text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <img
                src="/found_folio_(6).png"
                alt="FoundFolio"
                className="h-10 mb-4 brightness-0 invert"
              />
              <p className="text-gray-400 text-sm mb-4">
                Modern lost & found for campus buildings
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  Twitter
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  LinkedIn
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#how-it-works" className="hover:text-white">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    For Campus Security
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    For Building Managers
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Customers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowContactModal(true);
                    }}
                    className="hover:text-white"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-wrap justify-between items-center text-sm text-gray-400">
            <div>© 2025 FoundFolio</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white">
                Privacy
              </a>
              <a href="#" className="hover:text-white">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>

      {showContactModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!formSubmitted ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-black">Book Your Demo</h3>
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="text-gray-400 hover:text-black"
                    aria-label="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="john@university.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.institution}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          institution: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="University Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (optional)
                    </label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          message: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Tell us about your campus..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] font-bold"
                  >
                    Request Demo
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-[#10B981]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">Thank You!</h3>
                <p className="text-gray-600">We'll be in touch within 24 hours.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingPage;