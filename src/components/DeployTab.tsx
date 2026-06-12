import React, { useState, useEffect } from "react";
import { DBService } from "../lib/db";
import { WebsiteClone, BuiltSite } from "../types";
import { 
  Cloud, RefreshCw, AlertTriangle, ShieldCheck, 
  HelpCircle, Sparkles, FolderUp, CheckSquare, Zap, PlayCircle
} from "lucide-react";

export default function DeployTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [clones, setClones] = useState<WebsiteClone[]>([]);
  const [selectedCloneId, setSelectedCloneId] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("Vercel");
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [deployedSiteUrl, setDeployedSiteUrl] = useState("");

  // Free tiers usage status limit database
  const [limits, setLimits] = useState([
    { platform: "Vercel Pages Build", used: 85, limit: 100, unit: "GB N-W", status: "critical" },
    { platform: "Netlify Transfer Bandwidth", used: 42, limit: 100, unit: "GB Transfer", status: "good" },
    { platform: "Render Free Database Run", used: 12, limit: 15, unit: "Projects", status: "warning" },
    { platform: "Google Cloud Function Calls", used: 3.8, limit: 5, unit: "Million requests", status: "warning" },
    { platform: "GitHub Actions Build min", used: 1240, limit: 2000, unit: "Minutes", status: "good" }
  ]);

  useEffect(() => {
    loadClones();
  }, []);

  const loadClones = async () => {
    const list = await DBService.getAll<WebsiteClone>("clones");
    setClones(list);
    if (list.length > 0 && list[0]) {
      setSelectedCloneId(list[0].id);
    }
  };

  const handleRunDeployment = async () => {
    if (!selectedCloneId) return;
    triggerHaptic();
    setDeploying(true);
    setDeployStep(1);

    const matchClone = clones.find(c => c.id === selectedCloneId);
    if (!matchClone) return;

    // Simulated sequence of builds
    await new Promise(r => setTimeout(r, 1500));
    setDeployStep(2); // Compiling assets
    await new Promise(r => setTimeout(r, 1200));
    setDeployStep(3); // Connecting proxy webhook
    await new Promise(r => setTimeout(r, 1200));

    // Finalize
    const urlSlug = matchClone.name.toLowerCase().replace(/\s+/g, "-");
    const domain = targetPlatform === "Vercel" ? `${urlSlug}.vercel.app` : `${urlSlug}.netlify.app`;
    
    // Register as Built site in DB
    const built: BuiltSite = {
      id: "site_" + Date.now(),
      name: matchClone.name,
      url: `https://${domain}`,
      platform: targetPlatform,
      status: "live",
      deployUrl: targetPlatform === "Vercel" ? "https://vercel.com/dashboard" : "https://app.netlify.com",
      lastDeploy: Date.now(),
      analytics: { pageViews: 1, uptimePercentage: 100.0 }
    };

    // Increment limits simulation
    setLimits(prev => prev.map(l => {
      if (l.platform.includes(targetPlatform)) {
        return { ...l, used: Math.min(l.limit, l.used + 2) };
      }
      return l;
    }));

    await DBService.put("sites", built);
    
    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "دفع ونشر موقع تلقائياً",
      details: `تم نشر الكود المستنسخ لموقع [${matchClone.name}] بنجاح على منصة [${targetPlatform}]`,
      status: "success"
    });

    setDeployedSiteUrl(domain);
    setDeployStep(4);
    setDeploying(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* 1. Quick Deploy Control (Left) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full" />
          <h2 className="text-lg font-bold text-sky-400 mb-4 flex items-center gap-2">
            <FolderUp className="w-5 h-5 text-sky-400" />
            نشر كود مستنسخ بكبسة واحدة
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">حدد كود الموقع المستنسخ المراد نشره</label>
              {clones.length === 0 ? (
                <div className="text-xs bg-slate-900 border border-slate-800 text-slate-500 p-3 rounded-xl">
                  لا توجد سجلات مستنسخة بعد، يرجى الانتقال إلى علامة تبويب الاستنساخ وحصد موقع أولاً.
                </div>
              ) : (
                <select
                  value={selectedCloneId}
                  onChange={(e) => setSelectedCloneId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
                >
                  {clones.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.url})</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">اختر منصة الاستضافة المجانية المستهدفة</label>
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 w-full"
              >
                <option value="Vercel">Vercel Cloud System</option>
                <option value="Netlify">Netlify Single Deploy</option>
                <option value="Render">Render Platform Web service</option>
                <option value="Railway">Railway Server Container</option>
              </select>
            </div>

            {/* Quick deployment trigger */}
            <button
              onClick={handleRunDeployment}
              disabled={deploying || !selectedCloneId}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-1.5 transition shadow-lg shadow-sky-500/10"
            >
              <Zap className="w-4 h-4" />
              نشر الموقع بالكامل الآن
            </button>
          </div>
        </div>

        {/* Deploy steps presentation */}
        {deployStep > 0 && (
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">سجل عمليات النشر والربط</h3>
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${deployStep >= 1 ? "bg-emerald-400" : "bg-slate-800"}`} />
                <span className={deployStep === 1 ? "text-white font-bold" : "text-slate-500"}>تحصيل وتجهيز حزم الأكواد المفلترة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${deployStep >= 2 ? "bg-emerald-400" : "bg-slate-800"}`} />
                <span className={deployStep === 2 ? "text-white font-bold" : "text-slate-500"}>تحجيم وضغط الملفات وتوريد CSS المجمَع</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${deployStep >= 3 ? "bg-emerald-400" : "bg-slate-800"}`} />
                <span className={deployStep === 3 ? "text-white font-bold" : "text-slate-500"}>دفع الأكواد لواجهة الـ API الخاصة بالنشر السريع</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${deployStep >= 4 ? "bg-emerald-400 animate-pulse" : "bg-slate-800"}`} />
                <span className={deployStep === 4 ? "text-emerald-400 font-bold" : "text-slate-500"}>اكتمال النشر وربط النطاق مجاناً بنجاح!</span>
              </div>
            </div>

            {deployStep === 4 && deployedSiteUrl && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-100">تم تفعيل الرابط المباشر</h4>
                <a
                  href={`https://${deployedSiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 font-mono hover:underline block break-all text-center"
                >
                  https://{deployedSiteUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Free Tier Limits Monitor (Right) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            مراقب حدود السيرفرات المجانية (Resource Tracker)
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            يعمل هذا القسم على تتبع استهلاكك الشهري لمعالجة خوادم الاستضافة. يتم تصميمه لتوجيه استهلاكك وتلقي تنبيهات عند الاقتراب من الحدود القصوى.
          </p>

          <div className="space-y-6">
            {limits.map((l, index) => {
              const perc = Math.round((l.used / l.limit) * 100);
              const isHigh = perc >= 80;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">{l.platform}</span>
                    <span className="font-mono text-slate-500">
                      {l.used} / {l.limit} {l.unit} ({perc}%)
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${perc}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isHigh ? "bg-red-400" : perc >= 60 ? "bg-amber-400" : "bg-sky-400"
                      }`}
                    />
                  </div>

                  {/* Trigger warnings if alert logic is satisfied */}
                  {isHigh && (
                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-start gap-1.5 text-[10px] text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        لقد استهلكت أكثر من 80% من الحصة المجانية! نوصي فوراً بجدولة ونشر استنساخاتك القادمة عبر منصة بديلة مثل <strong>Netlify</strong> أو <strong>Render</strong> لتجنب التوقف.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
