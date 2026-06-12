import React, { useState, useEffect } from "react";
import { DBService } from "../lib/db";
import { BuiltSite } from "../types";
import { 
  Globe, Plus, Trash, ExternalLink, RefreshCw, BarChart2, 
  GitBranch, RefreshCcw, FolderOpen, AlertCircle, Sparkles, User, Shield
} from "lucide-react";

export default function SitesTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [sites, setSites] = useState<BuiltSite[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("Vercel");
  const [status, setStatus] = useState<any>("live");
  const [repoUrl, setRepoUrl] = useState("");
  const [isBuildingId, setIsBuildingId] = useState<string | null>(null);

  // Multi-Email Interactive Filter and Association States
  const [activeEmail, setActiveEmail] = useState("eissaaly07@gmail.com");
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);
  const [ownerEmail, setOwnerEmail] = useState("eissaaly07@gmail.com");

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    // 1. Get current active session email
    const activeSetting = await DBService.getSetting<string>("activeEmailSession") || "eissaaly07@gmail.com";
    setActiveEmail(activeSetting);
    setOwnerEmail(activeSetting);

    // 2. Compile list of emails from registered sessions + account profiles + emails store
    const accountsList = await DBService.getAll<any>("accounts");
    const emailsSet = new Set<string>([
      "eissaaly07@gmail.com",
      "eissaaly0007@gmail.com"
    ]);
    accountsList.forEach(a => {
      if (a.email) emailsSet.add(a.email.trim());
    });

    // Fetch from dedicated emails store (EmailsTab)
    try {
      const emailVaultList = await DBService.getAll<any>("emails");
      emailVaultList.forEach(e => {
        if (e.email) emailsSet.add(e.email.trim());
      });
    } catch (e) {
      console.warn("Could not retrieve emails from emails store:", e);
    }

    const storedList = await DBService.getSetting<string[]>("sessionEmailsList");
    if (storedList) {
      storedList.forEach(e => emailsSet.add(e.trim()));
    }
    const emailsArray = Array.from(emailsSet);
    setAvailableEmails(emailsArray);

    // 3. Load Sites from store
    const list = await DBService.getAll<BuiltSite>("sites");
    if (list.length === 0) {
      // Seed initial dummy sites for project visual presentation
      const seed: BuiltSite[] = [
        {
          id: "site_1",
          name: "مدونة المطور الشخصية",
          url: "https://my-blog-preview.vercel.app",
          platform: "Vercel",
          status: "live",
          deployUrl: "https://vercel.com/dashboard",
          repoUrl: "https://github.com/developer/blog",
          lastDeploy: Date.now() - 3600000 * 24,
          domain: "myblog.dev",
          analytics: { pageViews: 1420, uptimePercentage: 99.9 },
          ownerEmail: "eissaaly07@gmail.com"
        },
        {
          id: "site_2",
          name: "متجر الهدايا الرقمي",
          url: "https://gift-store.netlify.app",
          platform: "Netlify",
          status: "staging",
          deployUrl: "https://app.netlify.com",
          repoUrl: "https://github.com/developer/gift-store",
          lastDeploy: Date.now() - 3600000 * 5,
          analytics: { pageViews: 480, uptimePercentage: 98.7 },
          ownerEmail: "eissaaly07@gmail.com"
        },
        {
          id: "site_3",
          name: "موقع التوثيق السريع",
          url: "https://doc-wizard.github.io",
          platform: "GitHub Pages",
          status: "live",
          deployUrl: "https://github.com",
          repoUrl: "https://github.com/developer/doc-wizard",
          lastDeploy: Date.now() - 3600000 * 12,
          analytics: { pageViews: 240, uptimePercentage: 100.0 },
          ownerEmail: "eissaaly0007@gmail.com"
        }
      ];
      for (const s of seed) {
        await DBService.put("sites", s);
      }
      setSites(seed);
    } else {
      setSites(list);
    }
  };

  const handleSwitchActiveEmail = async (email: string) => {
    triggerHaptic();
    setActiveEmail(email);
    setOwnerEmail(email);
    await DBService.putSetting("activeEmailSession", email);

    // Save to audit trail
    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "تغيير جلسة بريد المواقع",
      details: `تم تبديل تصفية المواقع النشطة لعرض المشاريع المملوكة لـ [${email}]`,
      status: "success"
    });
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    triggerHaptic();

    const targetOwner = ownerEmail || activeEmail;
    const newSite: BuiltSite = {
      id: "site_" + Date.now(),
      name,
      url,
      platform,
      status,
      deployUrl: platform === "Vercel" ? "https://vercel.com" : "https://netlify.com",
      repoUrl: repoUrl || undefined,
      lastDeploy: Date.now(),
      analytics: {
        pageViews: Math.floor(Math.random() * 200) + 10,
        uptimePercentage: 100.0
      },
      ownerEmail: targetOwner
    };

    await DBService.put("sites", newSite);
    setSites(prev => [newSite, ...prev]);

    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "أرشفة وتتبع مشروع",
      details: `تم بنجاح ربط وتتبع المشروع [${name}] وتخصيص المالك [${targetOwner}]`,
      status: "success"
    });

    setName("");
    setUrl("");
    setRepoUrl("");
  };

  const handleDelete = async (id: string) => {
    triggerHaptic();
    await DBService.delete("sites", id);
    setSites(prev => prev.filter(s => s.id !== id));
  };

  const triggerMockRedeploy = async (id: string) => {
    triggerHaptic();
    setIsBuildingId(id);
    
    setTimeout(async () => {
      setIsBuildingId(null);
      // Update build timestamp
      const s = sites.find(item => item.id === id);
      if (s) {
        s.lastDeploy = Date.now();
        await DBService.put("sites", s);
        setSites(prev => prev.map(item => item.id === id ? s : item));

        await DBService.put("auditLog", {
          id: "log_" + Date.now(),
          timestamp: Date.now(),
          action: "إعادة بناء ونشر مجاني",
          details: `تم إعادة إطلاق وبناء مشروع [${s.name}] عن بعد في دقيقتين`,
          status: "success"
        });
      }
    }, 2500);
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case "live": return "منشور فعال (Live)";
      case "dev": return "تحت التطوير (Dev)";
      case "staging": return "تجريبي (Staging)";
      case "archived": return "مؤرشف (Archived)";
      case "down": return "معطل";
      default: return st;
    }
  };

  const filteredSites = sites.filter(s => {
    const siteEmail = s.ownerEmail || "eissaaly07@gmail.com";
    return siteEmail.toLowerCase() === activeEmail.toLowerCase();
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 20+ Master Email SSO Filter & Status Bar (Bilingual, high contrast) */}
      <div className="glass-card bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 p-5 rounded-2xl border border-sky-800/40 text-white flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-xl">
        <div className="space-y-1 text-right">
          <h2 className="text-sm font-extrabold text-sky-300 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-yellow-300 animate-pulse" />
            تصفية مواقع ومشاريع الحساب المالك النشط (Active Owner Site Filter)
          </h2>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            يتم عرض تتبع الاستضافات وحسابات السيرفر الفعالة للبريد النشط المختار أدناه. ينعكس هذا التغيير على بوابة الدخول الموحد SSO فوراً.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
          <span className="text-[11px] font-bold text-sky-200 block shrink-0">اختر البريد النشط:</span>
          <select
            value={activeEmail}
            onChange={(e) => handleSwitchActiveEmail(e.target.value)}
            className="bg-white/10 text-white hover:bg-white/15 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-mono font-extrabold focus:outline-none cursor-pointer"
          >
            {availableEmails.map((email) => (
              <option key={email} value={email} className="bg-slate-900 text-white font-mono font-bold">{email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Add Project Form */}
        <div className="lg:col-span-4 space-y-4">
          <form onSubmit={handleCreateSite} className="glass-card p-6 rounded-2xl space-y-4 border border-slate-800">
            <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-500" />
              تتبع مشروع/موقع جديد
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">اسم المشروع</label>
              <input
                type="text"
                placeholder="مثال: لوحة التحكم لموظفي المبيعات"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">رابط الإنتاج المباشر (Production URL)</label>
              <input
                type="text"
                placeholder="mysite.vercel.app"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full text-left font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">منصة الاستضافة المجانية</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
              >
                <option value="Vercel">Vercel (فيرسيل)</option>
                <option value="Netlify">Netlify (نتليفاي)</option>
                <option value="GitHub Pages">GitHub Pages</option>
                <option value="Render">Render</option>
                <option value="Railway">Railway</option>
                <option value="Cloudflare Pages">Cloudflare Pages</option>
              </select>
            </div>

            {/* Owner Email ID selector input field */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">الحساب المالك لهذه الاستضافة (Owner Account)</label>
              <select
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500 w-full"
              >
                {availableEmails.map((email) => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
              <span className="text-[9px] text-slate-400 mt-1 block leading-relaxed">
                سيظهر هذا الموقع فقط عند تحديد وتنشيط هذا البريد في تصفية الجلسات.
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">مستودع الكواد (Repository URL) - اختياري</label>
              <input
                type="text"
                placeholder="github.com/user/project"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full text-left font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">حالة الموقع الافتراضية</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
              >
                <option value="live">نشط وفعال</option>
                <option value="staging">بيئة الفحص (Staging)</option>
                <option value="dev">قيد البرمجة والتطوير</option>
                <option value="archived">مؤرشف ومحفوظ</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Globe className="w-4 h-4 text-slate-900" />
              حفظ وربط المشروع
            </button>
          </form>
        </div>

        {/* Projects List Dashboard */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-450">
              مشاريع تابعة للحساب: <span className="text-sky-400 font-mono font-black">{activeEmail}</span>
            </span>
            <span className="text-[10px] bg-sky-950/40 text-sky-305 border border-sky-800/60 px-2 py-0.5 rounded-lg font-bold">
              مجموع المشاريع المصفاة: {filteredSites.length}
            </span>
          </div>

          {filteredSites.map((s) => (
            <div key={s.id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden">
              {/* Platform indicator sidebar color code */}
              <div className={`absolute top-0 right-0 w-1.5 h-full ${
                s.platform === "Vercel" ? "bg-white" : s.platform === "Netlify" ? "bg-teal-400" : "bg-purple-500"
              }`} />

              {/* Top header block */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-200">{s.name}</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-semibold">
                      {s.platform}
                    </span>
                    <span className="text-[10px] bg-sky-950/40 text-sky-300 border border-sky-800/40 px-2 py-0.5 rounded font-mono">
                      👤 {s.ownerEmail || "eissaaly07@gmail.com"}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      s.status === "live" 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : s.status === "staging" 
                        ? "bg-amber-500/10 text-amber-400" 
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {getStatusLabel(s.status)}
                    </span>
                  </div>
                  <a
                    href={s.url.startsWith("http") ? s.url : `https://${s.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 mt-1 text-left font-mono"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {s.url}
                  </a>
                </div>

                {/* Analytics metrics badge widget */}
                <div className="flex gap-4 bg-slate-950/30 px-4 py-2 rounded-xl border border-slate-900 text-center shrink-0">
                  <div>
                    <span className="text-[9px] text-slate-500 block">مشاهدات الصفحة</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      <BarChart2 className="w-3.5 h-3.5 inline ml-0.5" />
                      {s.analytics.pageViews}
                    </span>
                  </div>
                  <div className="border-r border-slate-800 h-6 my-auto" />
                  <div>
                    <span className="text-[9px] text-slate-500 block">نسبة الاستقرار</span>
                    <span className="text-xs font-bold font-mono text-cyan-400">
                      {s.analytics.uptimePercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Git Integration Block if any */}
              {s.repoUrl && (
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-900 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 truncate">
                    <GitBranch className="w-4 h-4 text-slate-500 shrink-0" />
                    {s.repoUrl.replace("https://", "")}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    آخر نشر: {new Date(s.lastDeploy).toLocaleTimeString("ar-EG")}
                  </span>
                </div>
              )}

              {/* Action linkages */}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => triggerMockRedeploy(s.id)}
                  disabled={isBuildingId === s.id}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-400 border border-slate-700 py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition select-none cursor-pointer"
                >
                  {isBuildingId === s.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-3.5 h-3.5" />
                  )}
                  إعادة بناء فوري (Redeploy)
                </button>
                <a
                  href={s.deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  افتح لوحة تحكم المنصة
                </a>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="bg-slate-900 hover:bg-red-500/10 text-red-400 border border-slate-800 py-1.5 px-2 rounded-lg text-xs transition cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredSites.length === 0 && (
            <div className="glass-card p-12 text-center text-slate-500 rounded-2xl border border-slate-800">
              لا توجد مواقع أو مشاريع مضافة تحت حساب البريد الإلكتروني <span className="font-mono text-sky-400 font-bold">{activeEmail}</span> حتى الآن. يمكنك إضافة مشروع جديد وتخصيص هذا البريد له من قائمة اليمين.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
