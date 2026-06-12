import React, { useState, useRef, useEffect } from "react";
import { DBService } from "../lib/db";
import { MessageSquare, Send, Bot, RefreshCw, Sparkles, X, ChevronUp } from "lucide-react";

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export default function AiAssistant({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: "أهلاً بك في تطبيق SiteClone Pro v20! أنا مستشار التكويد الذكي الخاص بك. لقد تم تنشيطي وتهيئة نظام الكشف والتبديل التلقائي لمفاتيح API والبروكسيات. اختر المزود المفضل لديك من الأعلى للاتصال الفوري والحي بـ Gemini أو OpenAI أو Groq!"
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Switcher states
  const [availableKeys, setAvailableKeys] = useState<any[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("default");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadAiKeys();
    }
  }, [isOpen]);

  const loadAiKeys = async () => {
    try {
      const allKeys = await DBService.getAll<any>("keys");
      const filtered = allKeys.filter((k: any) => 
        k.type === "Google Gemini API" || 
        k.type === "OpenAI API" || 
        k.type === "Groq API (جروك)" || 
        k.type === "Custom AI Proxy (بروكسي ذكاء مخصص)"
      );
      setAvailableKeys(filtered);

      const cachedActive = localStorage.getItem("active_system_key");
      if (cachedActive && filtered.some(k => k.id === cachedActive)) {
        setSelectedKeyId(cachedActive);
      } else if (filtered.length > 0) {
        setSelectedKeyId(filtered[0].id);
      } else {
        setSelectedKeyId("default");
      }
    } catch (e) {
      console.warn("Could not load AI keys:", e);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    triggerHaptic();

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setLoading(true);

    // DYNAMIC KEY EXTRACTION: Try loading working API Key from IndexedDB
    let customApiKey = "";
    let provider = "Google Gemini API";
    let customEndpoint = "";
    let providerName = "المحاكي المدمج";

    try {
      const allKeys = await DBService.getAll<any>("keys");
      const targetKey = allKeys.find((k: any) => k.id === selectedKeyId);
      
      if (targetKey) {
        customApiKey = targetKey.value;
        provider = targetKey.type;
        customEndpoint = targetKey.proxyAgentIp || "";
        providerName = `${targetKey.name} (${targetKey.type === "Google Gemini API" ? "Gemini" : targetKey.type === "OpenAI API" ? "OpenAI" : targetKey.type === "Groq API (جروك)" ? "Groq" : "Proxy"})`;
      } else {
        // Fallback to active system key in localStorage
        const cachedActive = localStorage.getItem("active_system_key");
        const activeKey = allKeys.find((k: any) => k.id === cachedActive);
        if (activeKey) {
          customApiKey = activeKey.value;
          provider = activeKey.type;
          customEndpoint = activeKey.proxyAgentIp || "";
          providerName = `${activeKey.name} (أساسي)`;
        }
      }
    } catch (err) {
      console.warn("Could not load credentials:", err);
    }

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          customApiKey,
          provider,
          customEndpoint
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل توجيه السيرفر مع البوّابة");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "model", content: data.text || "لم أستطع تحليل هذا الرمز بشكل كافٍ." }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: "model", 
        content: `عذرًا، حدث خطأ أثناء الاتصال بمحرك الذكاء [${providerName}]: ${err?.message || String(err)}`
      }]);
    } finally {
      setLoading(false);
      triggerHaptic();
    }
  };

  const quickSuggestions = [
    "كيف أفحص كفاءة عنوان IP الوكيل؟",
    "Gemini لا يعمل، كيف أفعل المحرك الفعلي؟",
    "كيف أدمج المتصفح لتسجيل مفاتيح API؟",
    "اقترح بدائل استضافة مجانية لـ Vercel"
  ];

  return (
    <div className="fixed bottom-14 left-6 z-50 text-slate-800 select-none">
      {/* 1. Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            triggerHaptic();
            setIsOpen(true);
          }}
          className="bg-sky-600 hover:bg-sky-700 text-white p-4 rounded-full shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 transition-all flex items-center gap-2 scale-100 active:scale-95 cursor-pointer font-bold border border-sky-400"
        >
          <Bot className="w-5 h-5 text-white animate-pulse" />
          <span className="text-xs font-extrabold leading-none hidden sm:inline">مستشار التكويد الذكي (AI Assistant)</span>
        </button>
      )}

      {/* 2. Chat Floating Panel styled with Eye-comfort sky/white scheme */}
      {isOpen && (
        <div className="bg-white/95 border border-sky-500/20 rounded-2xl w-80 sm:w-96 h-[480px] shadow-2xl shadow-sky-500/10 flex flex-col overflow-hidden animate-fade-in backdrop-blur-md">
          {/* Header */}
          <div className="bg-sky-50 px-4 py-3 border-b border-sky-500/15 flex items-center justify-between text-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-sky-600 animate-bounce" />
              <div>
                <span className="text-xs font-extrabold block text-sky-900 font-sans">مستشار التكويد والأتمتة الذكي</span>
                <span className="text-[10px] text-emerald-600 block font-bold">
                  ⚡ مدعوم بـ Gemini 3.5 Flash الفعلي
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic AI Key Switcher Header Panel */}
          <div className="bg-sky-500/10 px-3 py-1.5 border-b border-sky-500/10 flex items-center justify-between gap-2 text-[10px] select-none">
            <span className="text-sky-950 font-extrabold shrink-0">🎯 تبديل المحرك السريع:</span>
            <select
              value={selectedKeyId}
              onChange={(e) => {
                triggerHaptic();
                setSelectedKeyId(e.target.value);
              }}
              className="bg-white border border-sky-250 text-slate-800 rounded-lg px-2 py-0.5 text-[10px] focus:outline-none flex-1 font-sans cursor-pointer font-extrabold"
            >
              <option value="default">💡 الذكاء المحاكي المدمج</option>
              {availableKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  🔑 {k.name} ({k.type.includes("Gemini") ? "Gemini" : k.type.includes("OpenAI") ? "OpenAI" : k.type.includes("Groq") ? "Groq" : "Proxy"})
                </option>
              ))}
            </select>
          </div>

          {/* Conversations display panel */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none bg-sky-50/20 select-text">
            {messages.map((m, index) => (
              <div
                key={index}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-sky-600 text-white font-bold rounded-br-none shadow-sm"
                    : "bg-white border border-sky-500/10 text-slate-700 rounded-bl-none text-right shadow-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-center gap-2 py-2">
                <Bot className="w-4 h-4 text-sky-600 animate-pulse" />
                <span className="text-[10px] text-slate-500 animate-pulse">يتم الآن الاتصال بمحرك Gemini...</span>
              </div>
            )}
          </div>

          {/* Quick suggestions sliders */}
          <div className="px-4 py-1.5 bg-sky-50/50 border-t border-sky-500/10 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickSuggestions.map((s, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(s)}
                disabled={loading}
                className="bg-white hover:bg-sky-50 text-slate-700 border border-sky-200 text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer font-bold"
              >
                {s}
              </button>
            ))}
          </div>

          {/* User inputs */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(userInput);
            }}
            className="p-3 bg-white border-t border-sky-500/10 flex gap-2"
          >
            <input
              type="text"
              placeholder="تبادل أية فكرة أو مسألة فنية هنا..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="bg-sky-50/50 border border-sky-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 flex-1 font-semibold"
            />
            <button
              type="submit"
              disabled={loading || !userInput.trim()}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white p-2 rounded-xl transition cursor-pointer"
            >
              <Send className="w-4 h-4 transform rotate-180" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
