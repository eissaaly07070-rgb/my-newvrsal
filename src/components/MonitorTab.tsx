import React, { useState, useEffect } from "react";
import { DBService } from "../lib/db";
import { WebsiteMonitor } from "../types";
import { 
  Activity, Plus, Trash, Play, AlertTriangle, 
  CheckCircle, ArrowUpRight, TrendingUp, Clock, Shuffle
} from "lucide-react";

export default function MonitorTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [monitors, setMonitors] = useState<WebsiteMonitor[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setIntervalVal] = useState<"30s" | "1m" | "5m" | "15m" | "1h">("1m");
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadMonitors();
    
    // Auto-ping cron simulation every 15 seconds
    const intervalId = window.setInterval(() => {
      runAutoPingSimulation();
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const loadMonitors = async () => {
    const list = await DBService.getAll<WebsiteMonitor>("monitors");
    
    // Self-healing migration to replace unreliable httpstat.us connections
    const migratedList = list.map(m => {
      if (m.url && m.url.includes("httpstat.us")) {
        return {
          ...m,
          url: m.url.replace("httpstat.us/404", "httpbin.org/status/404").replace("httpstat.us", "httpbin.org")
        };
      }
      return m;
    });

    // Save changes back to local store if any were migrated
    let wasMigrated = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].url !== migratedList[i].url) {
        await DBService.put("monitors", migratedList[i]);
        wasMigrated = true;
      }
    }

    if (migratedList.length === 0) {
      // Seed some dynamic monitors representing standard platforms for first look demo
      const seed: WebsiteMonitor[] = [
        {
          id: "mon_1",
          name: "Vercel Build Edge",
          url: "https://vercel.com",
          interval: "1m",
          status: "up",
          lastCheck: Date.now() - 60000,
          responseTime: 182,
          history: [
            { timestamp: Date.now() - 300000, status: "up", responseTime: 190, code: 200 },
            { timestamp: Date.now() - 240000, status: "up", responseTime: 212, code: 200 },
            { timestamp: Date.now() - 180000, status: "up", responseTime: 180, code: 200 },
            { timestamp: Date.now() - 120000, status: "up", responseTime: 185, code: 200 },
            { timestamp: Date.now() - 60000, status: "up", responseTime: 182, code: 200 }
          ]
        },
        {
          id: "mon_2",
          name: "قاعدة بيانات Supabase API",
          url: "https://supabase.com",
          interval: "5m",
          status: "up",
          lastCheck: Date.now() - 120000,
          responseTime: 295,
          history: [
            { timestamp: Date.now() - 600000, status: "up", responseTime: 310, code: 200 },
            { timestamp: Date.now() - 480000, status: "up", responseTime: 302, code: 200 },
            { timestamp: Date.now() - 360000, status: "up", responseTime: 298, code: 200 },
            { timestamp: Date.now() - 240000, status: "up", responseTime: 290, code: 200 },
            { timestamp: Date.now() - 120000, status: "up", responseTime: 295, code: 200 }
          ]
        },
        {
          id: "mon_3",
          name: "API الخادم الاحتياطي",
          url: "https://httpbin.org/status/404",
          interval: "15m",
          status: "down",
          lastCheck: Date.now() - 300000,
          responseTime: 1540,
          history: [
            { timestamp: Date.now() - 1200000, status: "down", responseTime: 1200, code: 404 },
            { timestamp: Date.now() - 900000, status: "up", responseTime: 420, code: 200 },
            { timestamp: Date.now() - 600000, status: "down", responseTime: 1500, code: 504 },
            { timestamp: Date.now() - 300000, status: "down", responseTime: 1540, code: 404 }
          ]
        }
      ];
      for (const m of seed) {
        await DBService.put("monitors", m);
      }
      setMonitors(seed);
    } else {
      setMonitors(migratedList);
    }
  };

  const runAutoPingSimulation = async () => {
    const list = await DBService.getAll<WebsiteMonitor>("monitors");
    if (list.length === 0) return;

    const randomIndex = Math.floor(Math.random() * list.length);
    const monitor = list[randomIndex];
    if (monitor) {
      await executeSinglePing(monitor);
    }
  };

  const executeSinglePing = async (m: WebsiteMonitor) => {
    setTestingId(m.id);
    const start = performance.now();
    let status: "up" | "down" | "slow" = "up";
    let code = 200;
    let respTime = 0;

    try {
      const formatUrl = m.url.startsWith("http") ? m.url : `https://${m.url}`;
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(formatUrl)}`, {
        method: "GET"
      });
      const end = performance.now();
      respTime = Math.round(end - start);
      code = res.status;

      if (!res.ok) {
        status = "down";
      } else if (respTime > 800) {
        status = "slow";
      }
    } catch {
      status = "down";
      code = 500;
      respTime = 2000;
    }

    const updatedHistoryItem = {
      timestamp: Date.now(),
      status,
      responseTime: respTime,
      code
    };

    const newHistory = [updatedHistoryItem, ...m.history].slice(0, 100);
    const updated: WebsiteMonitor = {
      ...m,
      status,
      lastCheck: Date.now(),
      responseTime: respTime,
      history: newHistory
    };

    await DBService.put("monitors", updated);
    
    if (m.status !== status) {
      await DBService.put("auditLog", {
        id: "log_" + Date.now(),
        timestamp: Date.now(),
        action: "تنبيه مراقبة المواقع",
        details: `مراقب المواقع [${m.name}] تغيرت حالته من [${m.status}] إلى [${status}]`,
        status: status === "up" ? "success" : "danger"
      });
    }

    setMonitors(prev => prev.map(item => item.id === m.id ? updated : item));
    setTestingId(null);
  };

  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    triggerHaptic();

    const newMonitor: WebsiteMonitor = {
      id: "mon_" + Date.now(),
      name,
      url,
      interval,
      status: "unknown",
      history: []
    };

    await DBService.put("monitors", newMonitor);
    setMonitors(prev => [newMonitor, ...prev]);
    
    setName("");
    setUrl("");
    
    executeSinglePing(newMonitor);
  };

  const handleDelete = async (id: string) => {
    triggerHaptic();
    await DBService.delete("monitors", id);
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-slate-800">
      {/* Sidebar Add (Left) */}
      <div className="lg:col-span-4 space-y-6">
        <form onSubmit={handleAddMonitor} className="glass-card bg-white/75 border border-sky-100 p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-extrabold text-sky-800 flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-sky-600" />
            إضافة مراقب تفاعلي جديد
          </h2>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">اسم المراقب أو الخدمة</label>
            <input
              type="text"
              placeholder="مثال: الخادم الرئيسي"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full font-bold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">الرابط أو عنوان الـ API</label>
            <input
              type="text"
              placeholder="api.example.com"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full text-left font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1 font-semibold">معدل الفحص الدوري</label>
            <select
              value={interval}
              onChange={(e) => setIntervalVal(e.target.value as any)}
              className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 w-full font-bold"
            >
              <option value="30s">كل 30 ثانية</option>
              <option value="1m">كل دقيقة واحدة</option>
              <option value="5m">كل 5 دقائق</option>
              <option value="15m">كل 15 دقيقة</option>
              <option value="1h">كل ساعة</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            بدء المراقبة النشطة
          </button>
        </form>

        {/* Global Stats */}
        <div className="glass-card bg-white/75 border border-sky-100 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-2xl rounded-full" />
          <h3 className="text-xs font-extrabold text-sky-800 mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            ملخص الأداء والحيّوية
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">العدد الكلي للمراقبين:</span>
              <span className="font-extrabold text-sky-900 font-mono">{monitors.length} قنوات</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">الخوادم النشطة (Up):</span>
              <span className="font-black text-emerald-600 font-mono">
                {monitors.filter(m => m.status === "up").length}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">الخوادم المتوقفة (Down):</span>
              <span className="font-black text-red-500 font-mono">
                {monitors.filter(m => m.status === "down").length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monitors Dashboard View (Right) */}
      <div className="lg:col-span-8 space-y-4">
        {monitors.map((m) => (
          <div key={m.id} className="glass-card bg-white/75 border border-sky-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-1.5 h-full ${
              m.status === "up" ? "bg-emerald-500" : m.status === "down" ? "bg-red-500" : "bg-yellow-500"
            }`} />

            {/* Title Block */}
            <div className="flex-1 space-y-2 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-sky-900">{m.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  m.status === "up" 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                    : m.status === "down" 
                    ? "bg-red-100 text-red-700 border border-red-200" 
                    : "bg-sky-100 text-sky-700"
                }`}>
                  {m.status === "up" ? "متصل (UP)" : m.status === "down" ? "غير متصل (DOWN)" : "قيد الاختبار"}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <Clock className="w-3 h-3 text-sky-600" />
                  {m.interval}
                </span>
              </div>
              <p className="text-xs text-slate-600 text-left font-mono truncate">{m.url}</p>
              
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-bold">سجل الأحداث المباشر:</span>
                <div className="flex gap-1">
                  {m.history.length === 0 ? (
                    <span className="text-[10px] text-slate-500">لا يوجد سجل تاريخي</span>
                  ) : (
                    m.history.map((h, index) => (
                      <div
                        key={index}
                        title={`تاريخ الفحص: ${new Date(h.timestamp).toLocaleTimeString("ar-EG")} - الاستجابة: ${h.responseTime}ms - الحالة: ${h.status}`}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold border ${
                          h.status === "up" 
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300" 
                            : h.status === "down" 
                            ? "bg-red-100 text-red-700 border-red-300" 
                            : "bg-yellow-100 text-yellow-700 border-yellow-300"
                        }`}
                      >
                        •
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Telemetry Actions Block */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-3 shrink-0">
              <div className="bg-sky-50 border border-sky-150 rounded-xl p-3 text-center sm:text-right min-w-[120px]">
                <span className="text-[10px] text-slate-500 block mb-0.5">سرعة الاستجابة</span>
                {m.responseTime ? (
                  <span className="text-sm font-black text-sky-850 font-mono">
                    {m.responseTime} <span className="text-[10px]">ms</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-bold">--</span>
                )}
              </div>

              {/* Run Test & Delete */}
              <div className="flex gap-2">
                <button
                  onClick={() => executeSinglePing(m)}
                  disabled={testingId === m.id}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-sky-100 hover:bg-sky-200 disabled:opacity-50 text-sky-800 border border-sky-200 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                >
                  {testingId === m.id ? (
                    <Shuffle className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  فحص الآن
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2.5 bg-white hover:bg-red-50 text-red-500 border border-sky-250/20 rounded-xl transition cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {monitors.length === 0 && (
          <div className="glass-card p-12 text-center text-slate-400 rounded-2xl bg-white/75 border border-sky-50">
            لا توجد مخدمات مراقبة نشطة مضافة بعد، أضف عنوان خدمة للبدء.
          </div>
        )}
      </div>
    </div>
  );
}
