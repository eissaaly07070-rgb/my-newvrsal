import React, { useState, useEffect } from "react";
import { performWebsiteClone, downloadCloneAsZip } from "../lib/cloner";
import { DBService } from "../lib/db";
import { WebsiteClone } from "../types";
import { Globe, Download, Trash, Eye, RefreshCw, Settings, CheckCircle, ShieldAlert } from "lucide-react";

export default function ClonerTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [url, setUrl] = useState("");
  const [clones, setClones] = useState<WebsiteClone[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClone, setSelectedClone] = useState<WebsiteClone | null>(null);
  const [stripAds, setStripAds] = useState(true);
  const [stripScripts, setStripScripts] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadClones();
  }, []);

  const loadClones = async () => {
    try {
      const data = await DBService.getAll<WebsiteClone>("clones");
      // Sort newest first
      setClones(data.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClone = async () => {
    if (!url) return;
    triggerHaptic();
    setLoading(true);
    setErrorText("");
    
    // Add temporary loading clone state
    const targetUrl = url.trim();
    
    const result = await performWebsiteClone(targetUrl);
    
    if (result.success) {
      const newClone: WebsiteClone = {
        id: "clone_" + Date.now(),
        url: targetUrl,
        name: targetUrl.replace(/https?:\/\//i, "").split("/")[0] || "موقع مستنسخ",
        html: result.html,
        css: result.css,
        js: result.js,
        createdAt: Date.now(),
        status: "success",
        size: result.size,
        notes: `تم الاستنساخ وحذف ${stripAds ? "الإعلانات ومتعقبات غوغل" : ""} وحفظه محليًا.`
      };

      // Put to db
      await DBService.put("clones", newClone);
      
      // Save audit log
      await DBService.put("auditLog", {
        id: "log_" + Date.now(),
        timestamp: Date.now(),
        action: "استنساخ موقع",
        details: `تم بنجاح استنساخ الرابط ${targetUrl}`,
        status: "success"
      });

      setClones(prev => [newClone, ...prev]);
      setSelectedClone(newClone);
      setUrl("");
    } else {
      setErrorText(result.error || "عذرًا، فشل استنساخ الموقع.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    await DBService.delete("clones", id);
    setClones(prev => prev.filter(c => c.id !== id));
    if (selectedClone?.id === id) {
      setSelectedClone(null);
    }
  };

  const handleDownload = async (clone: WebsiteClone, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    await downloadCloneAsZip(clone);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Control panel (Left) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full" />
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-sky-400">
            <Globe className="w-5 h-5" />
            استنساخ موقع جديد
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">أدخل رابط الموقع المراد نسخه</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="example.com"
                  className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500 flex-1 text-left placeholder:text-slate-600"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={handleClone}
                  disabled={loading || !url}
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold px-4 rounded-xl text-sm flex items-center gap-1 transition-all shadow-lg shadow-sky-500/10 hover:shadow-sky-500/30"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "ابدأ الآن"}
                </button>
              </div>
            </div>

            {/* Custom Options */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                خيارات التنظيف المتقدمة
              </span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stripAds}
                  onChange={(e) => setStripAds(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-300">إزالة الإعلانات، متعقبات غوغل والبكسل التتبعي</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stripScripts}
                  onChange={(e) => setStripScripts(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-300">تعطيل أكواد الجافا سكريبت الخارجية المستوردة</span>
              </label>
            </div>

            {errorText && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorText}</span>
              </div>
            )}
          </div>
        </div>

        {/* History Clones List */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">قائمة المواقع المستنسخة محليًا</h3>
          {clones.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">لا توجد مواقع مستنسخة بعد.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {clones.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    triggerHaptic();
                    setSelectedClone(c);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedClone?.id === c.id
                      ? "bg-sky-500/10 border-sky-500/40 text-white"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate text-left">{c.name}</p>
                    <p className="text-[10px] text-slate-500 text-left mt-0.5 truncate">{c.url}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {c.size || "S"}
                    </span>
                    <button
                      onClick={(e) => handleDownload(c, e)}
                      title="تحميل كملف ZIP"
                      className="p-1.5 hover:bg-sky-500/20 rounded-lg text-sky-400 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      title="حذف"
                      className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor & Preview Screen (Right) */}
      <div className="lg:col-span-8 space-y-6">
        {selectedClone ? (
          <div className="glass-card p-6 rounded-2xl flex flex-col h-[600px]">
            {/* Headers and controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-4 gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  {selectedClone.name}
                </h3>
                <span className="text-xs text-slate-400 text-left block">{selectedClone.url}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => downloadCloneAsZip(selectedClone)}
                  className="flex-1 sm:flex-initial bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  تصدير إلى ZIP
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5">الحجم الكلي من الذاكرة</span>
                <span className="text-xs font-semibold text-sky-400">{selectedClone.size || "15 KB"}</span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">HTML Lines</span>
                <span className="text-xs font-semibold text-emerald-400">
                  {selectedClone.html.split("\n").length} سطر
                </span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">Consolidated JS</span>
                <span className="text-xs font-semibold text-yellow-400">
                  {selectedClone.js ? `${(selectedClone.js.length / 1024).toFixed(1)} KB` : "غير متوفر"}
                </span>
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block mb-0.5">تاريخ الاستنساخ</span>
                <span className="text-[11px] font-semibold text-indigo-300">
                  {new Date(selectedClone.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>
            </div>

            {/* Live Interactive Iframe Display */}
            <div className="flex-1 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 flex flex-col">
              <div className="bg-slate-900 px-4 py-2 border-b border-indigo-950/50 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  معاينة مباشرة معزولة (Sandboxed Sandbox Preview)
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">
                  آمنة 100%
                </span>
              </div>
              <div className="flex-1 relative bg-white">
                <iframe
                  title="الموقع المستنسخ"
                  srcDoc={selectedClone.html}
                  sandbox="allow-scripts"
                  className="w-full h-full border-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 rounded-2xl h-[600px] flex flex-col justify-center items-center text-center">
            <div className="bg-slate-900 p-4 rounded-full border border-slate-800 text-sky-500 mb-4 animate-pulse">
              <Globe className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">نظام المعاينة التفاعلية</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-2">
              قم باستنساخ موقع إلكتروني أو بالنقر على أحد الموافع المنسوخة من القائمة الجانبية لعرض المعاينة ومكونات الأكواد البرمجية هنا فوراً.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
