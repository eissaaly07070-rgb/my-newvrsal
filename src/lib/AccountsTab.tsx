import React, { useState, useEffect } from "react";
import { DBService } from "../lib/db";
import { PlatformAccount } from "../types";
import { 
  User, Plus, Key, ShieldCheck, Trash, ShieldAlert,
  Clock, RefreshCw, Eye, EyeOff, Search, Sparkles
} from "lucide-react";

export default function AccountsTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [platform, setPlatform] = useState("Vercel");
  const [username, setUsername] = useState("");
  const [email, setEmailVal] = useState("");
  const [password, setPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [totpToken, setTotpToken] = useState("142 857");
  const [totpCountdown, setTotpCountdown] = useState(30);
  const [visiblePassMap, setVisiblePassMap] = useState<Record<string, boolean>>({});

  // Multi-Email Interactive Session States for 20+ Emails SSO switcher
  const [activeEmailSession, setActiveEmailSession] = useState<string>("eissaaly07@gmail.com");
  const [sessionEmails, setSessionEmails] = useState<string[]>([
    "eissaaly07@gmail.com",
    "eissaaly0007@gmail.com"
  ]);
  const [newSessionEmail, setNewSessionEmail] = useState("");
  const [ssoSearchQuery, setSsoSearchQuery] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);

  useEffect(() => {
    loadAccounts();

    // 2FA TOTP Simulation countdown
    const timer = setInterval(() => {
      setTotpCountdown((prev) => {
        if (prev <= 1) {
          regenerateTotpTokens();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadAccounts = async () => {
    const list = await DBService.getAll<PlatformAccount>("accounts");
    let finalAccounts = list;
    if (list.length === 0) {
      const seed: PlatformAccount[] = [
        {
          id: "acc_1",
          platform: "Vercel",
          username: "developer_hero",
          email: "eissaaly07@gmail.com",
          password: "myVercelSuperPassword",
          status: "active",
          totpSecret: "JBSWY3DPEHPK3PXP",
          activeSessions: 2,
          lastLogin: Date.now() - 3600000 * 2
        },
        {
          id: "acc_2",
          platform: "GitHub",
          username: "eissa_git",
          email: "eissaaly07@gmail.com",
          password: "MyGitHubUltraSecret",
          status: "active",
          totpSecret: "HXDMVJ3XPO76ASDL",
          activeSessions: 1,
          lastLogin: Date.now() - 3600000 * 24
        },
        {
          id: "acc_3",
          platform: "Vercel",
          username: "developer_pro",
          email: "eissaaly0007@gmail.com",
          password: "MyVercelQuantumSeed",
          status: "active",
          totpSecret: "HXDMVJ3XPO76AAAA",
          activeSessions: 1,
          lastLogin: Date.now() - 3600000 * 50
        }
      ];
      for (const a of seed) {
        await DBService.put("accounts", a);
      }
      finalAccounts = seed;
    }
    setAccounts(finalAccounts);

    // Load active email session
    const activeSetting = await DBService.getSetting<string>("activeEmailSession");
    if (activeSetting) {
      setActiveEmailSession(activeSetting);
    } else {
      setActiveEmailSession("eissaaly07@gmail.com");
      await DBService.putSetting("activeEmailSession", "eissaaly07@gmail.com");
    }

    // Compile list of unique emails from registered accounts, saved custom emails & emails vault store
    const emailsSet = new Set<string>([
      "eissaaly07@gmail.com",
      "eissaaly0007@gmail.com"
    ]);

    // 1. From platform account profiles
    finalAccounts.forEach(acc => {
      if (acc.email) emailsSet.add(acc.email.trim());
    });

    // 2. From emails vault store (the EmailsTab registers here)
    try {
      const emailVaultList = await DBService.getAll<any>("emails");
      emailVaultList.forEach(e => {
        if (e.email) emailsSet.add(e.email.trim());
      });
    } catch (e) {
      console.warn("Could not retrieve emails from emails store:", e);
    }

    // 3. From session emails configuration list
    const storedList = await DBService.getSetting<string[]>("sessionEmailsList");
    if (storedList) {
      storedList.forEach(e => emailsSet.add(e.trim()));
    }
    setSessionEmails(Array.from(emailsSet));
  };

  const handleSwitchEmailSession = async (selectedEmail: string) => {
    triggerHaptic();
    setActiveEmailSession(selectedEmail);
    await DBService.putSetting("activeEmailSession", selectedEmail);

    // Save to audit trail
    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "تغيير جلسة البريد النشط",
      details: `تم تبديل البريد الموحد النشط للمواقع إلى [${selectedEmail}] لتمرير تفويض الدخول على الفور`,
      status: "success"
    });
  };

  const handleAddCustomSessionEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionEmail || !newSessionEmail.includes("@")) return;
    triggerHaptic();

    const normalized = newSessionEmail.trim();
    
    // Save to sessionEmailsList settings first
    const storedList = await DBService.getSetting<string[]>("sessionEmailsList") || [];
    const emailsSet = new Set<string>(storedList);
    emailsSet.add(normalized);
    const updatedList = Array.from(emailsSet);
    await DBService.putSetting("sessionEmailsList", updatedList);

    // Also let's save to the "emails" vault store so it is fully integrated across all tabs
    try {
      const emailVaultList = await DBService.getAll<any>("emails");
      const exists = emailVaultList.some((em: any) => em.email.toLowerCase() === normalized.toLowerCase());
      if (!exists) {
        await DBService.put("emails", {
          id: "email_" + Date.now(),
          provider: normalized.includes("gmail") ? "Gmail" : normalized.includes("proton") ? "ProtonMail" : normalized.includes("outlook") ? "Outlook" : "Gmail",
          email: normalized,
          password: "DefaultSessionPassword123!",
          category: "dev",
          faStatus: true,
          status: "active",
          passwordHealth: "good",
          lastChecked: Date.now()
        });
      }
    } catch (err) {
      console.warn("Could not put to emails store:", err);
    }
    
    // Switch to it & reload accounts (which will merge all unique session lists)
    await handleSwitchEmailSession(normalized);
    await loadAccounts();
    setNewSessionEmail("");
  };

  const handleDeleteSessionEmail = async (emailToDelete: string) => {
    triggerHaptic();
    if (emailToDelete === "eissaaly07@gmail.com" || emailToDelete === "eissaaly0007@gmail.com") {
      alert("لا يمكن حذف البريد الافتراضي المصنع للنظام.");
      return;
    }

    // 1. Remove from settings list
    const storedList = await DBService.getSetting<string[]>("sessionEmailsList") || [];
    const updatedList = storedList.filter(e => e.toLowerCase() !== emailToDelete.toLowerCase());
    await DBService.putSetting("sessionEmailsList", updatedList);

    // 2. Also, remove from 'emails' store so that it doesn't reappear
    try {
      const emailVaultList = await DBService.getAll<any>("emails");
      const targetInVault = emailVaultList.find((em: any) => em.email.toLowerCase() === emailToDelete.toLowerCase());
      if (targetInVault) {
        await DBService.delete("emails", targetInVault.id);
      }
    } catch (err) {
      console.warn("Could not delete from emails store:", err);
    }

    // Switch to default email if deleted active one
    if (activeEmailSession.toLowerCase() === emailToDelete.toLowerCase()) {
      await handleSwitchEmailSession("eissaaly07@gmail.com");
    }

    // Reload list
    await loadAccounts();
  };

  const handleAutoGeneratePlatformsForEmail = async (targetEmail: string) => {
    triggerHaptic();
    const list = await DBService.getAll<PlatformAccount>("accounts");
    
    const platformsToCreate = ["Vercel", "GitHub", "Netlify", "Render", "Railway", "Glitch", "Cloudflare", "Supabase"];
    let addedCount = 0;
    
    for (const plt of platformsToCreate) {
      const exists = list.some(a => a.email.toLowerCase() === targetEmail.toLowerCase() && a.platform === plt);
      if (!exists) {
        const usernamePrefix = targetEmail.split("@")[0] || "member";
        const newAcc: PlatformAccount = {
          id: `acc_${plt.toLowerCase()}_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          platform: plt,
          username: `${usernamePrefix}_${plt.toLowerCase()}`,
          email: targetEmail,
          password: `pass_${Math.random().toString(36).substring(4, 10)}`,
          status: "active",
          totpSecret: "HXDMVJ3XPO76" + Math.random().toString(36).substring(2, 6).toUpperCase(),
          activeSessions: 1,
          lastLogin: Date.now()
        };
        await DBService.put("accounts", newAcc);
        addedCount++;
      }
    }
    
    await loadAccounts();
    
    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "تهيئة منصات فرعية للبريد",
      details: `تم تهيئة وتوليد عدد ${addedCount} حسابات سحابية لبريد الجلسة [${targetEmail}]`,
      status: "success"
    });
    
    alert(`✓ تم ربط وتوليد البوابات وحسابات السيرفر السريع بنجاح للبريد المختار: ${targetEmail}!\nتمت تصفية وتجهيز Vercel و GitHub و Netlify و Render و Glitch و Cloudflare و Supabase للعمل معاً بضغطة واحدة.`);
  };

  const regenerateTotpTokens = () => {
    setTotpToken(() => {
      const code1 = Math.floor(Math.random() * 900) + 100;
      const code2 = Math.floor(Math.random() * 900) + 100;
      return `${code1} ${code2}`;
    });
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email) return;
    triggerHaptic();

    const newAccount: PlatformAccount = {
      id: "acc_" + Date.now(),
      platform,
      username,
      email,
      password: password || undefined,
      totpSecret: totpSecret || undefined,
      status: "active",
      activeSessions: 1,
      lastLogin: Date.now()
    };

    await DBService.put("accounts", newAccount);
    await loadAccounts();

    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "إضافة حساب منصة",
      details: `تم تسجيل حساب [${username}] على منصة [${platform}] بنجاح`,
      status: "success"
    });

    setUsername("");
    setEmailVal("");
    setPassword("");
    setTotpSecret("");
  };

  const handleDelete = async (id: string) => {
    triggerHaptic();
    await DBService.delete("accounts", id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePassMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const simulateTotpForSecret = (secret: string | undefined): string => {
    if (!secret) return "--- ---";
    let val = 0;
    for (let i = 0; i < secret.length; i++) {
        val += secret.charCodeAt(i);
    }
    const factor = Math.floor(Date.now() / 30000);
    const code = ((val * factor) % 900000) + 100000;
    const s = String(code);
    return `${s.substring(0, 3)} ${s.substring(3)}`;
  };

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = a.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.platform.toLowerCase().includes(searchQuery.toLowerCase());
    if (showActiveOnly) {
      return matchesSearch && a.email.toLowerCase() === activeEmailSession.toLowerCase();
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* 20+ Master Email SSO Switcher Panel (Arabic / English high contrast design) */}
      <div className="glass-card bg-gradient-to-br from-sky-650 via-sky-700 to-sky-800 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-sky-500/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 pr-1 text-right">
            <h2 className="text-base font-extrabold flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              بوابة الدخول الموحد وجلسات البريد المتعددة (Multi-Account SSO Gateway)
            </h2>
            <p className="text-[11px] text-sky-100 font-medium leading-relaxed">
              قم بإدارة أكثر من 20 بريد إلكتروني ومزامنتها بضغطة زر واحدة. تفعيل الجلسة يربط ويظهر حسابات المنصات التابعة للبريد المختار فوراً.
            </p>
          </div>
          
          {/* Active indicator */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl flex items-center gap-3 shrink-0 self-stretch md:self-auto justify-between">
            <div className="text-right">
              <span className="text-[9px] text-sky-200 block font-bold">البريد النشط حالياً</span>
              <span className="text-xs font-mono font-black text-yellow-300 block select-all">
                {activeEmailSession}
              </span>
            </div>
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
          </div>
        </div>

        {/* Email Pills List with local search to handle 20+ emails */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <label className="block text-xs text-sky-100 font-extrabold text-right">
              👤 اختر جلسة البريد لتفويض الدخول السريع: (إجمالي: {sessionEmails.length} إيميل)
            </label>
            {/* Real-time search inside the SSO Gateway */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث وتصفح الإيميلات المسجلة..."
                value={ssoSearchQuery}
                onChange={(e) => setSsoSearchQuery(e.target.value)}
                id="sso-email-search"
                className="bg-white/10 placeholder:text-sky-300 text-white text-[11px] px-3 py-1 rounded-xl focus:outline-none focus:bg-white focus:text-slate-900 border border-white/20 transition w-full sm:w-48 font-mono text-left"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap max-h-56 overflow-y-auto pr-1 p-1 bg-white/5 rounded-2xl border border-white/10">
            {sessionEmails
              .filter(mail => mail.toLowerCase().includes(ssoSearchQuery.toLowerCase()))
              .map((mail) => {
                const isSelected = mail.toLowerCase() === activeEmailSession.toLowerCase();
                const linkedCount = accounts.filter(a => a.email.toLowerCase() === mail.toLowerCase()).length;
                const isDefault = mail === "eissaaly07@gmail.com" || mail === "eissaaly0007@gmail.com";
                
                return (
                  <div
                    key={mail}
                    className={`flex items-center gap-1 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-white text-sky-900 border-white shadow-md shadow-sky-900/20 font-black scale-[1.02]"
                        : "bg-white/10 hover:bg-white/20 text-white border-white/15"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSwitchEmailSession(mail)}
                      className="px-3 py-1.5 rounded-r-xl transition-all flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="font-mono select-all truncate max-w-[170px] sm:max-w-[240px] block" title={mail}>
                        {mail}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ${isSelected ? "bg-sky-100 text-sky-800" : "bg-white/20 text-sky-100"}`}>
                        {linkedCount} {linkedCount === 1 ? "منصة" : "منصات"}
                      </span>
                    </button>
                    
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSessionEmail(mail)}
                        className={`pl-1 pr-2.5 py-1.5 text-xs font-extrabold cursor-pointer transition select-none ${
                          isSelected ? "text-red-500 hover:bg-red-50 hover:text-red-700 rounded-l-xl" : "text-sky-300 hover:text-red-300"
                        }`}
                        title="حذف الجلسة"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            {sessionEmails.filter(mail => mail.toLowerCase().includes(ssoSearchQuery.toLowerCase())).length === 0 && (
              <div className="text-center text-[11px] text-sky-200 py-2 w-full">
                لا توجد إيميلات مطابقة للبحث... أضف بريداً جديداً بالأسفل متاحاً لأي عدد!
              </div>
            )}
          </div>
        </div>

        {/* Quick Utilities: Add Custom Email AND Auto Seeder */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-white/10">
          
          {/* Add Email Form */}
          <form onSubmit={handleAddCustomSessionEmail} className="md:col-span-5 flex gap-2">
            <input
              type="email"
              required
              placeholder="أدخل بريداً جديداً (مثال: user@mail.com)..."
              value={newSessionEmail}
              onChange={(e) => setNewSessionEmail(e.target.value)}
              className="bg-white/10 placeholder:text-sky-200 text-white border border-white/25 rounded-2xl px-4 py-2 text-xs focus:outline-none focus:bg-white focus:text-slate-900 flex-1 transition font-mono"
            />
            <button
              type="submit"
              className="bg-white text-sky-900 hover:bg-sky-100 font-black px-4 rounded-2xl text-xs transition cursor-pointer shrink-0"
              title="إضافة بريد تبديل جديد"
            >
              + إضافة
            </button>
          </form>

          {/* Auto platforms generator for current email */}
          <div className="md:col-span-7 flex justify-end">
            <button
              type="button"
              onClick={() => handleAutoGeneratePlatformsForEmail(activeEmailSession)}
              className="w-full md:w-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-4 py-2 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-900 animate-spin-slow" />
              تهيئة وتوليد الـ 8 منصات كاملة لبريد ({activeEmailSession.split("@")[0]}) تلقائياً
            </button>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Control Panel (Left) */}
        <div className="lg:col-span-4 space-y-4">
        <form onSubmit={handleAddAccount} className="glass-card bg-white/75 border border-sky-100 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-extrabold text-sky-800 flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-sky-600" />
            كرت حساب جديد
          </h2>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">اسم المنصة الإلكترونية</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full font-bold"
            >
              <option value="Vercel">Vercel</option>
              <option value="Netlify">Netlify</option>
              <option value="GitHub">GitHub</option>
              <option value="Render">Render</option>
              <option value="Railway">Railway</option>
              <option value="Glitch">Glitch</option>
              <option value="Cloudflare">Cloudflare</option>
              <option value="Supabase">Supabase</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">اسم المستخدم (Username)</label>
            <input
              type="text"
              placeholder="مثال: janesmith"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full text-left font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">البريد الإلكتروني للحساب</label>
            <input
              type="email"
              placeholder="مثال: dev@domain.com"
              required
              value={email}
              onChange={(e) => setEmailVal(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full text-left font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">كلمة المرور (اختياري)</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full text-left"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">مفتاح السر للمصادقة الثنائية (TOTP Secret Key)</label>
            <input
              type="text"
              placeholder="JBSWY3DPEHPK3PXP..."
              value={totpSecret}
              onChange={(e) => setTotpSecret(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full text-left font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <User className="w-4 h-4" />
            حفظ معلومات الحساب
          </button>
        </form>
      </div>

      {/* Accounts List View (Right) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Search bar */}
        <div className="glass-card bg-white/75 border border-sky-100 px-4 py-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-sky-600 shrink-0" />
            <input
              type="text"
              placeholder="ابحث عن حساب منصة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between">
            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowActiveOnly(!showActiveOnly);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                showActiveOnly 
                  ? "bg-sky-100 text-sky-850 border-sky-300"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <span>{showActiveOnly ? "🗂️ عرض بريد الجلسة فقط" : "📂 عرض جميع البريد"}</span>
            </button>

            <span className="text-[10px] text-sky-800 bg-sky-100/60 px-3 py-1 rounded-lg border border-sky-200/40 font-bold shrink-0">
              ظهر: {filteredAccounts.length} من {accounts.length}
            </span>
          </div>
        </div>

        {/* List display */}
        {filteredAccounts.map((a) => (
          <div key={a.id} className="glass-card bg-white/75 border border-sky-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-stretch md:items-center relative">
            <div className="space-y-1.5 flex-1 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-sky-900">{a.platform}</h3>
                <span className="text-xs text-slate-600 font-mono font-semibold">@{a.username}</span>
                <span className="text-[9px] bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded border border-sky-200/40">
                  جلسات نشطة: {a.activeSessions}
                </span>
              </div>
              <p className="text-xs text-slate-600 text-left truncate">{a.email}</p>
              
              {a.password && (
                <div className="text-[11px] font-mono text-slate-600 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 inline-flex items-center gap-2">
                  <span>الرمز: {visiblePassMap[a.id] ? a.password : "••••••••"}</span>
                  <button
                    onClick={() => togglePasswordVisibility(a.id)}
                    className="p-1 hover:bg-sky-100 rounded text-sky-600 cursor-pointer"
                  >
                    {visiblePassMap[a.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Built-in TOTP token code widget */}
            {a.totpSecret ? (
              <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 flex items-center justify-between gap-4 md:w-52 shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-sky-700 font-extrabold block flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-yellow-500 animate-pulse" />
                    المولّد الموحّد (2FA TOTP)
                  </span>
                  <span className="text-lg font-mono font-black text-emerald-600 select-all tracking-wider">
                    {simulateTotpForSecret(a.totpSecret)}
                  </span>
                </div>

                <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                  <div className="text-[10px] font-mono font-bold text-slate-600">
                    {totpCountdown}s
                  </div>
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      fill="transparent"
                      stroke="#e0f2fe"
                      strokeWidth="2"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      fill="transparent"
                      stroke="#059669"
                      strokeWidth="2"
                      strokeDasharray="88"
                      strokeDashoffset={((30 - totpCountdown) / 30) * 88}
                      className="transition-all duration-1000"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="bg-sky-50 border border-sky-100 rounded-xl py-3 px-4 text-center md:w-52 shrink-0 text-xs text-slate-500">
                لا يوجد كود مصادقة 2FA مسجل
              </div>
            )}

            {/* Quick action buttons */}
            <div className="flex md:flex-col justify-end gap-2 shrink-0">
              <button
                onClick={() => handleDelete(a.id)}
                className="bg-white hover:bg-red-50 text-red-500 border border-sky-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                مسحالحساب
              </button>
            </div>
          </div>
        ))}

        {filteredAccounts.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl bg-white/75 border border-sky-50">
            لا توجد حسابات منصة مطابقة للبحث. يرجى تسجيل حساب لعرضه.
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
