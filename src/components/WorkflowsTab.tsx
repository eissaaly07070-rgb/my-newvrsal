import React, { useState, useEffect } from "react";
import { DBService } from "../lib/db";
import { AutomationWorkflow, WorkflowNode, WorkflowConnection } from "../types";
import { 
  Network, Plus, Play, Pause, Trash, Download, Upload, 
  Settings, CheckCircle2, RefreshCw, AlertTriangle, PlayCircle
} from "lucide-react";

export default function WorkflowsTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  
  const [runningStepIndex, setRunningStepIndex] = useState<number | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testConsoleLogs, setTestConsoleLogs] = useState<string[]>([]);

  // form state for adding node
  const [nodeType, setNodeType] = useState<any>("trigger");
  const [nodeLabel, setNodeLabel] = useState("مشغل زمني يومي");

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    const list = await DBService.getAll<AutomationWorkflow>("workflows");
    if (list.length === 0) {
      // Seed initial dummy workflow templates
      const seed: AutomationWorkflow[] = [
        {
          id: "work_1",
          name: "استنساخ يومي ونشر تلقائي",
          description: "أتمتة ذكية تقوم بسحب كود الموقع المستهدف وحك الإعلانات منه وإعادة نشره تلقائياً على Vercel.",
          status: "active",
          nodes: [
            { id: "n_1", type: "trigger", label: "مؤقت مجدول (Daily Cron)", x: 50, y: 50, config: { time: "00:00" } },
            { id: "n_2", type: "fetch", label: "جلب محتويات مثال.كوم", x: 200, y: 50, config: { url: "https://example.com" } },
            { id: "n_3", type: "parse", label: "تنظيف الأكواد والتعقبات", x: 350, y: 50, config: { strip_ads: true } },
            { id: "n_4", type: "deploy", label: "إعادة بناء Vercel السحابي", x: 500, y: 50, config: { platform: "Vercel" } }
          ],
          connections: [
            { fromId: "n_1", toId: "n_2" },
            { fromId: "n_2", toId: "n_3" },
            { fromId: "n_3", toId: "n_4" }
          ]
        },
        {
          id: "work_2",
          name: "مراقب فشل API وتحديث المفاتيح",
          description: "سير عمل ذكي يبدأ بفحص سرعات الاستجابة ويقوم بتبديل كود OpenAI تلقائياً إذا انقطع المخدم.",
          status: "paused",
          nodes: [
            { id: "n_1", type: "trigger", label: "فحص موقع مراقبة الأداء", x: 50, y: 150, config: { interval: "1m" } },
            { id: "n_2", type: "condition", label: "هل المخدم متوقف (Down)؟", x: 220, y: 150, config: { metric: "responseTime", threshold: 1000 } },
            { id: "n_3", type: "notify", label: "إرسال تقرير إيميل استنفار", x: 390, y: 100, config: { level: "urgent" } },
            { id: "n_4", type: "deploy", label: "تحويل المفتاح النشط للطوارئ", x: 390, y: 200, config: { target: "backup_key" } }
          ],
          connections: [
            { fromId: "n_1", toId: "n_2" },
            { fromId: "n_2", toId: "n_3" },
            { fromId: "n_2", toId: "n_4" }
          ]
        }
      ];
      for (const w of seed) {
        await DBService.put("workflows", w);
      }
      setWorkflows(seed);
      setSelectedWorkflow(seed[0] || null);
    } else {
      setWorkflows(list);
      setSelectedWorkflow(list[0] || null);
    }
  };

  const handleCreateWorkflow = async () => {
    triggerHaptic();
    const newW: AutomationWorkflow = {
      id: "work_" + Date.now(),
      name: "سير عمل مخصص رقم " + (workflows.length + 1),
      description: "سير عمل مؤتمت لربط الخدمات محلياً وتعديل مسارت الويب.",
      status: "active",
      nodes: [
        { id: "n_1", type: "trigger", label: "مشغل يدوي أو webhook", x: 100, y: 100, config: {} }
      ],
      connections: []
    };

    await DBService.put("workflows", newW);
    setWorkflows(prev => [...prev, newW]);
    setSelectedWorkflow(newW);

    await DBService.put("auditLog", {
      id: "log_" + Date.now(),
      timestamp: Date.now(),
      action: "إنشاء أتمتة جديدة",
      details: `تم بنجاح إنشاء سير عمل [${newW.name}] قيد التصميم المتقدم`,
      status: "success"
    });
  };

  const handleDeleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    await DBService.delete("workflows", id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
    if (selectedWorkflow?.id === id) {
      setSelectedWorkflow(null);
    }
  };

  const handleAddNodeToActive = async () => {
    if (!selectedWorkflow) return;
    triggerHaptic();

    const newNode: WorkflowNode = {
      id: "n_" + Date.now(),
      type: nodeType,
      label: nodeLabel,
      x: 100,
      y: 100,
      config: {}
    };

    // Auto connect to the last node to be visual
    const updatedNodes = [...selectedWorkflow.nodes, newNode];
    const updatedConnections = [...selectedWorkflow.connections];
    const lastNode = selectedWorkflow.nodes[selectedWorkflow.nodes.length - 1];
    if (lastNode) {
      updatedConnections.push({ fromId: lastNode.id, toId: newNode.id });
    }

    const updatedWorkflow: AutomationWorkflow = {
      ...selectedWorkflow,
      nodes: updatedNodes,
      connections: updatedConnections
    };

    await DBService.put("workflows", updatedWorkflow);
    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(prev => prev.map(w => w.id === selectedWorkflow.id ? updatedWorkflow : w));
  };

  const runLiveTestExecution = async () => {
    if (!selectedWorkflow || isRunningTest) return;
    triggerHaptic();
    setIsRunningTest(true);
    setTestConsoleLogs(["⏳ البدء في معالجة مجمع سير العمل المجدول..."]);

    const steps = selectedWorkflow.nodes;
    
    for (let i = 0; i < steps.length; i++) {
      setRunningStepIndex(i);
      const step = steps[i];
      if (step) {
          await new Promise(r => setTimeout(r, 1200));
          
          let logMsg = `🟢 [تمت المعالجة] تشغيل النود ${step.label} (${step.type.toUpperCase()})`;
          if (step.type === "trigger") logMsg = `⚡ [بدء التشغيل] إشارة تشغيل من: ${step.label}`;
          if (step.type === "deploy") logMsg = `🚀 [نشر مكمل] تم بنجاح دفع ملفات الاستنساخ للمخدم السحابي المستهدف `;
          
          setTestConsoleLogs(prev => [...prev, logMsg]);
          triggerHaptic();
      }
    }

    setTimeout(() => {
      setTestConsoleLogs(prev => [...prev, "🏁 اكتمال كافة خطوات سير العمل بنجاح ودقّة 100% 🚀"]);
      setIsRunningTest(false);
      setRunningStepIndex(null);
    }, 800);
  };

  const exportTon8nJson = () => {
    if (!selectedWorkflow) return;
    triggerHaptic();
    
    // Mapping simplified format to standard n8n style workflow json
    const n8nSchema = {
      meta: { templateId: "siteclone_pro_workflow" },
      nodes: selectedWorkflow.nodes.map(n => ({
        parameters: n.config,
        id: n.id,
        name: n.label,
        type: `n8n-nodes-base.${n.type === "trigger" ? "cron" : n.type === "fetch" ? "httpRequest" : "webhook"}`,
        typeVersion: 1,
        position: [n.x, n.y]
      })),
      connections: {}
    };

    const blob = new Blob([JSON.stringify(n8nSchema, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `n8n_export_${selectedWorkflow.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepBgColor = (type: string, active: boolean) => {
    if (active) return "border-sky-500 bg-sky-500/20 text-white shadow-lg shadow-sky-500/25";
    switch (type) {
      case "trigger": return "border-yellow-500/30 bg-yellow-500/5 text-yellow-300";
      case "deploy": return "border-purple-500/30 bg-purple-500/5 text-purple-300";
      case "condition": return "border-orange-500/30 bg-orange-500/5 text-orange-300";
      default: return "border-slate-800 bg-slate-900/80 text-slate-300";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Sidebar (Left) */}
      <div className="lg:col-span-4 space-y-4">
        {/* Workflows List */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-sky-400 flex items-center gap-1.5 animate-pulse">
              <Network className="w-5 h-5" />
              أتمتة العمليات (Workflows)
            </h2>
            <button
              onClick={handleCreateWorkflow}
              className="bg-sky-500 hover:bg-sky-600 text-slate-950 p-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 select-none">
            {workflows.map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  triggerHaptic();
                  setSelectedWorkflow(w);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  selectedWorkflow?.id === w.id
                    ? "bg-sky-500/10 border-sky-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold truncate text-left">{w.name}</h4>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {w.nodes.length} نودات نشطة
                  </span>
                </div>
                <div className="flex items-center gap-1.5 scale-90">
                  <span className={`text-[9px] px-1.5 rounded ${
                    w.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                  }`}>
                    {w.status === "active" ? "فعال" : "موقوف"}
                  </span>
                  <button
                    onClick={(e) => handleDeleteWorkflow(w.id, e)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition"
                  >
                    <Trash className="w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Node creation block if any active */}
        {selectedWorkflow && (
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">أضف خطوة (نود) جديدة للمخطط</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">نوع العملية (Type)</label>
                <select
                  value={nodeType}
                  onChange={(e) => {
                    setNodeType(e.target.value as any);
                    // Autofill label
                    if (e.target.value === "trigger") setNodeLabel("مشغل زمني يومي");
                    if (e.target.value === "fetch") setNodeLabel("جلب موقع خارجي");
                    if (e.target.value === "parse") setNodeLabel("تنظيف ملفات CSS");
                    if (e.target.value === "deploy") setNodeLabel("أمر النشر السحابي");
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 w-full"
                >
                  <option value="trigger">Trigger (مشغل زمني)</option>
                  <option value="fetch">Fetch (جلب / تحميل)</option>
                  <option value="parse">Parse (معالجة الأكوارد)</option>
                  <option value="condition">Condition (شرط منطقي)</option>
                  <option value="deploy">Deploy (عملية نشر)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">اسم معرف النود لقراءة السجل</label>
                <input
                  type="text"
                  value={nodeLabel}
                  onChange={(e) => setNodeLabel(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 w-full"
                />
              </div>

              <button
                onClick={handleAddNodeToActive}
                className="w-full bg-slate-900 text-sky-400 border border-slate-800 hover:border-sky-400/20 py-2 rounded-xl text-xs flex justify-center items-center gap-1 transition"
              >
                <Plus className="w-4 h-4" />
                أضف واربط تلقائياً
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor & Board canvas (Right) */}
      <div className="lg:col-span-8 space-y-4">
        {selectedWorkflow ? (
          <div className="glass-card p-6 rounded-2xl flex flex-col h-[550px]">
            {/* Header controls select */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4 gap-3">
              <div>
                <h3 className="font-bold text-slate-200 text-base">{selectedWorkflow.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedWorkflow.description}</p>
              </div>

              {/* Action triggers */}
              <div className="flex gap-2">
                <button
                  onClick={runLiveTestExecution}
                  disabled={isRunningTest}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  تشغيل تجريبي
                </button>
                <button
                  onClick={exportTon8nJson}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  تصدير لـ n8n
                </button>
              </div>
            </div>

            {/* Visual interactive flows representation */}
            <div className="flex-1 bg-slate-950/70 border border-slate-900/80 rounded-xl p-4 overflow-y-auto space-y-4 relative flex items-center justify-around flex-wrap gap-4 select-none">
              {selectedWorkflow.nodes.map((n, i) => (
                <React.Fragment key={n.id}>
                  <div className={`p-4 rounded-xl border-2 transition-all duration-300 w-44 text-center ${
                    getStepBgColor(n.type, runningStepIndex === i)
                  }`}>
                    <span className="text-[8px] uppercase tracking-wider block text-slate-500 mb-1">
                      {n.type}
                    </span>
                    <span className="text-xs font-bold font-sans tracking-tight block truncate">
                      {n.label}
                    </span>
                  </div>
                  
                  {/* Arrow connect simulator */}
                  {i < selectedWorkflow.nodes.length - 1 && (
                    <div className="text-slate-700 font-bold px-1 py-1 shrink-0">
                      ➔
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Simulated Live Console logs output */}
            <div className="h-40 bg-slate-950 border border-slate-900 rounded-xl mt-4 overflow-y-auto p-4 flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold border-b border-slate-900 pb-1 mb-2">
                سجل المخرجات للأتمتة (Active automation logger system)
              </span>
              <div className="font-mono text-xs text-slate-300 space-y-1.5 flex-1 select-text">
                {testConsoleLogs.map((log, lIndex) => (
                  <p key={lIndex} className="leading-snug text-left">{log}</p>
                ))}
                {testConsoleLogs.length === 0 && (
                  <p className="text-slate-600 text-center py-6">انقر على تشغيل تجريبي لرؤية نتائج الفحص المنطقي.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center rounded-2xl h-[550px] flex flex-col justify-center items-center">
            <p className="text-slate-500 text-sm">لا يوجد مسار عمل محدد للتحرير. يرجى البدء بإنشاء سير عمل.</p>
          </div>
        )}
      </div>
    </div>
  );
}
