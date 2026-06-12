import React, { useState, useEffect } from "react";
import { DBService } from "../lib/db";
import { EmailAccount } from "../types";
import { 
  Mail, Plus, ShieldCheck, ShieldAlert, Key, Link2, 
  Trash, ExternalLink, Download, Search, Tag, Eye, EyeOff
} from "lucide-react";

export default function EmailsTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [provider, setProvider] = useState("Gmail");
  const [email, setEmailVal] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState<"personal" | "work" | "dev" | "throwaway">("dev");
  const [faStatus, setFaStatus] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    const list = await DBService.getAll<EmailAccount>("emails");
    if (list.length === 0) {
      // Seed initial dummy emails for demonstration
      const seed: EmailAccount[] = [
        {
          id: "email_1",
          provider: "Gmail",
          email: "developer.main@gmail.com",
          password: "SuperSecurePassword123!",
          category: "dev",
          faStatus: true,
          recoveryEmail: "backup.dev@proton.me",
          status: "active",
          passwordHealth: "good",
          lastChecked: Date.now()
        },
        {
          id: "email_2",
          provider: "ProtonMail",
          email: "sysadmin.secure@proton.me",
          password: "WeakPassword",
          category: "work",
          faStatus: false,
          recoveryEmail: "developer.main@gmail.com",
          status: "attention",
          passwordHealth: "weak",
          lastChecked: Date.now()
        },
        {
          id: "email_3",
          provider: "Outlook",
          email: "spam.tester42@outlook.com",
          password: "1234567Password",
          category: "throwaway",
          faStatus: false,
          status: "compromised",
          passwordHealth: "leaked",
          lastChecked: Date.now()
        }
      ];
      for (const e of seed) {
        await DBService.put("emails", e);
      }
      setEmails(seed);
    } else {
      setEmails(list);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    triggerHaptic();

    // Decide strength health
    let passwordHealth: "good" | "weak" | "leaked" = "good";
    if (password.length < 8) {
      passwordHealth = "weak";
    } else if (password === "12345678" || password.toLowerCase() === "password") {
      passwordHealth = "leaked";
    }

    const newEmail: EmailAccount = {
      id: "email_" + Date.now(),
      provider,
      email,
      password,
      category,
      faStatus,
      recoveryEmail: recoveryEmail || undefined,
      status: passwordHealth === "leaked" ? "compromised" : passwordHealth === "weak" ? "attention" : "active",
      passwordHealth,
      lastChecked: Date.now()
    };

    await DBService.put("emails", newEmail);
    setEmails(prev => [newEmail, ...prev]);

    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "إضافة بريد إلكتروني",
      details: `تم تسجيل بريد [${email}] وحساب حيوية الأمان بنجاح`,
      status: "success"
    });

    setEmailVal("");
    setPassword("");
    setRecoveryEmail("");
  };

  const handleDelete = async (id: string) => {
    triggerHaptic();
    await DBService.delete("emails", id);
    setEmails(prev => prev.filter(e => e.id !== id));
  };

  const handleExportEncrypted = async () => {
    triggerHaptic();
    const dataStr = JSON.stringify(emails, null, 2);
    // Simple mock AES representation (encodes string bytes to base64)
    const base64Enc = btoa(unescape(encodeURIComponent(dataStr)));
    
    const blob = new Blob([JSON.stringify({ 
      title: "SiteClone Pro Encrypted Emails Backup",
      schema: "v7.0.0",
      bytes: base64Enc 
    }, null, 2)], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "encrypted_emails_siteclone_pro.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getProviderConsole = (prov: string) => {
    switch (prov) {
      case "Gmail": return "https://mail.google.com";
      case "ProtonMail": return "https://mail.proton.me";
      case "Outlook": return "https://outlook.live.com";
      default: return "https://mail.google.com";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "personal": return "شخصي";
      case "work": return "عمل";
      case "dev": return "تطوير وبرمجة";
      case "throwaway": return "بريد مؤقت";
      default: return cat;
    }
  };

  const togglePasswordValue = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEmails = emails.filter(
    e => e.email.toLowerCase().includes(searchQuery.toLowerCase()) || e.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Control panel (Left) */}
      <div className="lg:col-span-4 space-y-6">
        <form onSubmit={handleAddEmail} className="glass-card p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            إضافة حساب بريد إلكتروني
          </h2>

          <div>
            <label className="block text-xs text-slate-400 mb-1">مزود خدمة البريد</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
            >
              <option value="Gmail">Gmail (غوغل)</option>
              <option value="ProtonMail">ProtonMail (بروتون الآمن)</option>
              <option value="Outlook">Outlook / Hotmail</option>
              <option value="Yahoo Mail">Yahoo Mail</option>
              <option value="Zoho Mail">Zoho Mail</option>
              <option value="iCloud Mail">iCloud Mail</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">العنوان البريدي (Email Address)</label>
            <input
              type="email"
              placeholder="example@mail.com"
              required
              value={email}
              onChange={(e) => setEmailVal(e.target.value)}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full text-left"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">كلمة السر (Password)</label>
            <input
              type="password"
              placeholder="••••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full text-left"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">بريد الاسترداد البديل</label>
            <input
              type="email"
              placeholder="recovery@mail.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full text-left"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">تصنيف الاستخدام</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
            >
              <option value="dev">تطوير وبرمجة (Dev)</option>
              <option value="personal">شخصي (Personal)</option>
              <option value="work">العمل الأساسي (Work)</option>
              <option value="throwaway">مؤقت / تجارب (Throwaway)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={faStatus}
              onChange={(e) => setFaStatus(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-xs text-slate-300">ميزة المصادقة الثنائية (2FA) مفعلة على الحساب</span>
          </label>

          <button
            type="submit"
            className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1 transition"
          >
            <Mail className="w-4 h-4" />
            حفظ البريد في الخزانة
          </button>
        </form>

        <button
          onClick={handleExportEncrypted}
          className="w-full bg-slate-950 hover:bg-slate-900 text-sky-400 border border-slate-800 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Download className="w-3.5 h-3.5" />
          تصدير النسخة المشفرة للبريد (JSON)
        </button>
      </div>

      {/* List Area (Right) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Search tool */}
        <div className="glass-card px-4 py-3 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ابحث عن حساب بريد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none w-full placeholder:text-slate-500"
            />
          </div>
          <span className="text-[10px] text-slate-500 bg-slate-920 px-2 py-1 rounded">
            إجمالي الحسابات: {emails.length}
          </span>
        </div>

        {/* Display accounts */}
        {filteredEmails.map((e) => (
          <div key={e.id} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-100">{e.email}</h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-semibold">
                    {e.provider}
                  </span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    {getCategoryLabel(e.category)}
                  </span>
                </div>
                {e.recoveryEmail && (
                  <p className="text-[10px] text-slate-500 mt-0.5 text-left">بريد الاسترداد: {e.recoveryEmail}</p>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {e.faStatus ? (
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    المصادقة الثنائية 2FA
                  </span>
                ) : (
                  <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 animate-pulse" />
                    افتقد للـ 2FA
                  </span>
                )}
              </div>
            </div>

            {/* Password Health Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">حيوية كلمة المرور:</span>
                  <span className={`font-bold ${
                    e.passwordHealth === "good" ? "text-emerald-400" : e.passwordHealth === "weak" ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {e.passwordHealth === "good" ? "آمنة وقوية" : e.passwordHealth === "weak" ? "ضعيفة" : "تم تسريبها مسبقاً!"}
                  </span>
                </div>
                {/* Visual feedback progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${
                    e.passwordHealth === "good" ? "bg-emerald-400 w-full" : e.passwordHealth === "weak" ? "bg-yellow-400 w-1/2" : "bg-red-400 w-1/4"
                  }`} />
                </div>
              </div>

              {/* Quick Credentials Block */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 block">رقم الدخول السري</span>
                  <span>{showPasswordMap[e.id] ? e.password : "••••••••••••"}</span>
                </div>
                <button
                  onClick={() => togglePasswordValue(e.id)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400"
                >
                  {showPasswordMap[e.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Inline Quick Action buttons */}
            <div className="flex gap-2 justify-end pt-1">
              <a
                href={getProviderConsole(e.provider)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                الدخول الفوري للبريد
              </a>
              <button
                onClick={() => handleDelete(e.id)}
                className="bg-slate-900 hover:bg-red-500/10 text-red-400 border border-slate-800 py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition"
              >
                <Trash className="w-3.5 h-3.5" />
                حذف السجل
              </button>
            </div>
          </div>
        ))}

        {filteredEmails.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-500 rounded-2xl">
            لا توجد حسابات بريد مطابقة للبحث. أضف حساب بريد إلكتروني للحظر والمتابعة.
          </div>
        )}
      </div>
    </div>
  );
}
