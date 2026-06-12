import React, { useState, useEffect } from "react";
import { DBService, PRE_POPULATED_PLATFORMS } from "../lib/db";
import { CloudPlatform } from "../types";
import { 
  Terminal, Search, Star, ExternalLink, Compass, Code, 
  Database, Network, HelpCircle, LayoutGrid, Sparkles,
  Activity, Mail
} from "lucide-react";

export default function StudioTab({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [platforms, setPlatforms] = useState<CloudPlatform[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    // Attempt load platforms or load from seed
    const list = await DBService.getAll<CloudPlatform>("platforms");
    if (list.length === 0) {
      for (const p of PRE_POPULATED_PLATFORMS) {
        await DBService.put("platforms", p);
      }
      setPlatforms(PRE_POPULATED_PLATFORMS);
    } else {
      setPlatforms(list);
    }

    // Try loads favorite flags
    const favs = await DBService.getSetting<Record<string, boolean>>("favorite_platforms");
    if (favs) {
      setFavorites(favs);
    }
  };

  const toggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const updated = { ...favorites, [id]: !favorites[id] };
    setFavorites(updated);
    await DBService.putSetting("favorite_platforms", updated);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "ai": return <Sparkles className="w-3.5 h-3.5 text-amber-600" />;
      case "ide": return <Code className="w-3.5 h-3.5 text-sky-600" />;
      case "database": return <Database className="w-3.5 h-3.5 text-emerald-600" />;
      case "deployment": return <Compass className="w-3.5 h-3.5 text-blue-600" />;
      case "workflows": return <Network className="w-3.5 h-3.5 text-fuchsia-600" />;
      case "monitoring": return <Activity className="w-3.5 h-3.5 text-indigo-600" />;
      case "email": return <Mail className="w-3.5 h-3.5 text-violet-600" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "ai": return "ذكاء اصطناعي وتوليد";
      case "ide": return "بيئات تطوير سحابية";
      case "database": return "قواعد بيانات سحابية";
      case "deployment": return "منصات نشر واستضافة";
      case "workflows": return "أتمتة وسير العمل";
      case "monitoring": return "مراقبة الأداء والتحليل";
      case "email": return "مزودي البريد الإلكتروني";
      default: return cat;
    }
  };

  // filter
  let displayList = platforms.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.description.includes(searchQuery) ||
                        item.freeLimit.includes(searchQuery);
    
    if (selectedCategory === "all") return matchSearch;
    if (selectedCategory === "favorites") return matchSearch && favorites[item.id];
    return matchSearch && item.category === selectedCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search tool & category selectors */}
      <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white/90 border border-sky-500/20 rounded-xl px-4 py-2 flex-1 max-w-md shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ابحث بين 50+ منصة في البينتو..."
            className="bg-transparent text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories filters scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "all" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            الكل 🌐
          </button>
          <button
            onClick={() => setSelectedCategory("favorites")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              selectedCategory === "favorites" ? "bg-amber-500 text-white shadow-md shadow-amber-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            المفضلة ⭐
          </button>
          <button
            onClick={() => setSelectedCategory("ai")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "ai" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            الذكاء الاصطناعي 🧠
          </button>
          <button
            onClick={() => setSelectedCategory("ide")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "ide" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            محررات سحابية 💻
          </button>
          <button
            onClick={() => setSelectedCategory("deployment")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "deployment" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            استضافة ونشر 🚀
          </button>
          <button
            onClick={() => setSelectedCategory("database")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "database" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            قواعد بيانات 🗄️
          </button>
          <button
            onClick={() => setSelectedCategory("workflows")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "workflows" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            أتمتة العمليات ⚙️
          </button>
          <button
            onClick={() => setSelectedCategory("monitoring")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "monitoring" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            المراقبة والتحليل 📡
          </button>
          <button
            onClick={() => setSelectedCategory("email")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedCategory === "email" ? "bg-sky-600 text-white shadow-md shadow-sky-500/10" : "bg-white border border-sky-500/10 hover:bg-sky-500/5 text-slate-600"
            }`}
          >
            صناديق البريد 📧
          </button>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayList.map((platform) => (
          <div
            key={platform.id}
            className="glass-card p-5 rounded-2xl relative group overflow-hidden flex flex-col justify-between"
          >
            {/* Background absolute ambient glow on active/hover */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-sky-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

            <div>
              {/* Header category indicator & Star favorite */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] bg-sky-500/10 p-1.5 rounded-lg text-sky-850 flex items-center gap-1 font-bold border border-sky-500/10">
                  {getCategoryIcon(platform.category)}
                  {getCategoryLabel(platform.category)}
                </span>
                <button
                  onClick={(e) => toggleFavorite(platform.id, e)}
                  className="text-slate-400 hover:text-amber-500 transition cursor-pointer"
                >
                  <Star className={`w-4 h-4 ${favorites[platform.id] ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>
              </div>

              {/* Title & Description of platform */}
              <h3 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-sky-700 transition">
                {platform.name}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {platform.description}
              </p>
            </div>

            {/* Bottom details / link and free tier limit statement */}
            <div className="border-t border-sky-500/10 pt-3 flex items-center justify-between mt-auto">
              <div>
                <span className="text-[9px] text-slate-500 block font-semibold">العرض المجاني للمطورين</span>
                <span className="text-[11px] font-bold text-emerald-600">{platform.freeLimit}</span>
              </div>

              <a
                href={platform.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic()}
                className="bg-white border border-sky-500/20 p-2 rounded-xl text-sky-700 hover:bg-sky-600 hover:text-white transition flex items-center justify-center shrink-0 shadow-sm"
                title="فتح وحدة تحكم المنصة المباشرة"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {displayList.length === 0 && (
        <div className="glass-card p-12 text-center text-slate-500 rounded-2xl font-bold">
          لا توجد منصات ضمن هذا الفهرس تطابق تفاصيل البحث.
        </div>
      )}
    </div>
  );
}
