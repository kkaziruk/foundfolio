import { useState, useMemo } from "react";
import { X, Printer, Type, Palette, LayoutTemplate } from "lucide-react";

interface FlyerConfig {
  headline: string;
  subheadline: string;
  theme: string;
  font: string;
  showLogo: boolean;
  showUrl: boolean;
  showCampusStrip: boolean;
}

interface Theme {
  id: string;
  label: string;
  headerBg: string;
  stripBg: string;
  accent: string;
  stripText: string;
}

const THEMES: Theme[] = [
  {
    id: "foundfolio",
    label: "FoundFolio",
    headerBg: "#0f172a",
    stripBg: "#1d4ed8",
    accent: "#fbbf24",
    stripText: "#bfdbfe",
  },
  {
    id: "notre-dame",
    label: "Notre Dame",
    headerBg: "#0c2340",
    stripBg: "#102672",
    accent: "#c99700",
    stripText: "#c8d8f0",
  },
  {
    id: "minimal",
    label: "Minimal",
    headerBg: "#1e293b",
    stripBg: "#475569",
    accent: "#94a3b8",
    stripText: "#e2e8f0",
  },
  {
    id: "warm",
    label: "Warm",
    headerBg: "#431407",
    stripBg: "#c2410c",
    accent: "#fde68a",
    stripText: "#fed7aa",
  },
];

const FONTS = [
  { id: "Inter", label: "Inter", import: "" },
  { id: "Playfair Display", label: "Playfair", import: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap" },
  { id: "Oswald", label: "Oswald", import: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap" },
  { id: "Roboto Mono", label: "Mono", import: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap" },
];

interface Props {
  buildingLine: string;
  logoUrl: string;
  onClose: () => void;
}

const FLYER_URL = "https://www.foundfolio.co/login";
const FLYER_URL_DISPLAY = "foundfolio.co/login";

function generateFlyerHtml(
  config: FlyerConfig,
  theme: Theme,
  font: typeof FONTS[0],
  buildingLine: string,
  logoUrl: string,
  preview = false,
): string {
  const qrHiRes = `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${encodeURIComponent(FLYER_URL)}&bgcolor=ffffff&color=0f172a&margin=1`;
  const fontFamily = `'${config.font}', -apple-system, BlinkMacSystemFont, sans-serif`;
  const fontImport = font.import ? `@import url('${font.import}');` : `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FoundFolio Flyer — ${buildingLine}</title>
  <style>
    ${fontImport}
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; background: ${preview ? "white" : "#e2e8f0"};
      font-family: ${fontFamily};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      display: flex; flex-direction: column;
      align-items: center; padding: ${preview ? "0" : "32px 20px 48px"};
    }
    .print-bar { display: ${preview ? "none" : "flex"}; align-items: center; justify-content: space-between;
      width: 100%; max-width: 520px; margin-bottom: 24px;
    }
    .print-bar p { font-size: 13px; color: #64748b; }
    .print-btn {
      background: #0f172a; color: white; border: none;
      padding: 10px 22px; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: opacity 0.15s;
    }
    .print-btn:hover { opacity: 0.82; }
    .flyer {
      width: 100%; max-width: ${preview ? "100%" : "520px"};
      background: white;
      border-radius: ${preview ? "0" : "20px"};
      overflow: hidden;
      box-shadow: ${preview ? "none" : "0 8px 40px rgba(0,0,0,0.18)"};
    }
    .header {
      background: ${theme.headerBg};
      padding: 28px 40px 24px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo { width: 36px; height: 36px; object-fit: contain; }
    .header-name {
      font-size: 18px; font-weight: 800;
      color: white; letter-spacing: -0.4px;
      font-family: ${fontFamily};
    }
    .header-badge {
      background: ${theme.accent}; color: #0f172a;
      font-size: 11px; font-weight: 700;
      padding: 4px 12px; border-radius: 100px;
    }
    .campus-strip {
      background: ${theme.stripBg};
      padding: 10px 40px;
      display: flex; align-items: center;
    }
    .campus-strip p {
      font-size: 13px; font-weight: 600;
      color: ${theme.stripText};
    }
    .campus-strip span { color: white; margin-left: 6px; }
    .body { padding: 44px 40px 40px; text-align: center; }
    .headline {
      font-size: 56px; font-weight: 900;
      color: #0f172a; line-height: 1.0;
      letter-spacing: -2.5px; margin-bottom: 12px;
      font-family: ${fontFamily};
    }
    .subhead {
      font-size: 16px; color: #64748b;
      font-weight: 400; line-height: 1.55;
      margin-bottom: 40px; font-family: ${fontFamily};
    }
    .qr-wrap {
      display: inline-block;
      padding: 16px;
      border: 3px solid ${theme.stripBg};
      border-radius: 20px;
      margin-bottom: 36px;
      background: white;
    }
    .qr-wrap img { display: block; width: 220px; height: 220px; }
    .or-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .or-line { flex: 1; height: 1px; background: #e2e8f0; }
    .or-text {
      font-size: 10px; color: #94a3b8;
      font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
    }
    .url-chip {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 12px; font-family: monospace;
      color: #475569;
    }
    .footer-accent { background: ${theme.accent}; height: 6px; }
    .footer {
      background: ${theme.headerBg};
      padding: 16px 40px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .footer-left { font-size: 12px; font-weight: 600; color: white; }
    .footer-right { font-size: 11px; color: #64748b; }
    @media print {
      html, body { background: white; padding: 0; }
      .print-bar { display: none; }
      .flyer { border-radius: 0; box-shadow: none; max-width: 100%; }
      .headline { font-size: 64px; }
      .qr-wrap img { width: 260px; height: 260px; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <p>Preview — print or save as PDF</p>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="flyer">
    <div class="header">
      <div class="header-brand">
        ${config.showLogo ? `<img src="${logoUrl}" alt="FoundFolio" class="header-logo" />` : ""}
        <span class="header-name">FoundFolio</span>
      </div>
      <span class="header-badge">Lost &amp; Found</span>
    </div>
    ${config.showCampusStrip ? `<div class="campus-strip"><p>Campus:<span>${buildingLine}</span></p></div>` : ""}
    <div class="body">
      <p class="headline">${config.headline}</p>
      <p class="subhead">${config.subheadline}</p>
      <div class="qr-wrap">
        <img src="${qrHiRes}" alt="Scan to visit FoundFolio" />
      </div>
      ${config.showUrl ? `
      <div class="or-row">
        <span class="or-line"></span>
        <span class="or-text">or visit</span>
        <span class="or-line"></span>
      </div>
      <span class="url-chip">${FLYER_URL_DISPLAY}</span>
      ` : ""}
    </div>
    <div class="footer-accent"></div>
    <div class="footer">
      <span class="footer-left">${buildingLine} · Lost &amp; Found</span>
      <span class="footer-right">Powered by FoundFolio</span>
    </div>
  </div>
</body>
</html>`;
}

export default function FlyerEditorModal({ buildingLine, logoUrl, onClose }: Props) {
  const [config, setConfig] = useState<FlyerConfig>({
    headline: "Lost something?",
    subheadline: "Scan to see if your item has been turned in to lost & found.",
    theme: "foundfolio",
    font: "Inter",
    showLogo: true,
    showUrl: true,
    showCampusStrip: true,
  });

  const theme = THEMES.find(t => t.id === config.theme) ?? THEMES[0];
  const font = FONTS.find(f => f.id === config.font) ?? FONTS[0];

  const previewHtml = useMemo(
    () => generateFlyerHtml(config, theme, font, buildingLine, logoUrl, true),
    [config, theme, font, buildingLine, logoUrl],
  );

  const handlePrint = () => {
    const printHtml = generateFlyerHtml(config, theme, font, buildingLine, logoUrl, false);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(printHtml);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Left sidebar */}
      <div className="w-72 bg-white flex flex-col h-full border-r border-slate-200 shadow-xl overflow-y-auto flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-bold text-slate-900">Edit Flyer</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-7 overflow-y-auto">

          {/* Text */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Text</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Headline</label>
                <input
                  value={config.headline}
                  onChange={e => setConfig(c => ({ ...c, headline: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Subheadline</label>
                <textarea
                  value={config.subheadline}
                  onChange={e => setConfig(c => ({ ...c, subheadline: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Color theme */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Color theme</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setConfig(c => ({ ...c, theme: t.id }))}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${config.theme === t.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex gap-px flex-shrink-0 rounded overflow-hidden">
                    <div className="w-4 h-6" style={{ background: t.headerBg }} />
                    <div className="w-4 h-6" style={{ background: t.stripBg }} />
                    <div className="w-4 h-6" style={{ background: t.accent }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Font */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Font</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setConfig(c => ({ ...c, font: f.id }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${config.font === f.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          {/* Show/hide toggles */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sections</p>
            </div>
            <div className="space-y-1">
              {([
                ["showLogo", "Show logo"],
                ["showCampusStrip", "Campus strip"],
                ["showUrl", "URL chip"],
              ] as [keyof FlyerConfig, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setConfig(c => ({ ...c, [key]: !c[key] }))}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-sm text-slate-700">{label}</span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${config[key] ? "bg-blue-500" : "bg-slate-200"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* Print button */}
        <div className="p-5 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-slate-800 active:bg-black transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="flex-1 bg-slate-100 flex flex-col items-center justify-start p-8 overflow-y-auto">
        <p className="text-xs text-slate-400 mb-4 font-medium tracking-wide uppercase">Live preview</p>
        <div className="w-full max-w-lg">
          <iframe
            srcDoc={previewHtml}
            title="Flyer preview"
            className="w-full bg-white"
            style={{ height: "860px", border: "none", display: "block" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
