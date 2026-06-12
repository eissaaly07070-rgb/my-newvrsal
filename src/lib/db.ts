/**
 * Offline-First IndexedDB Database Engine for SiteClone Pro v20
 */

import { 
  WebsiteClone, 
  WebsiteMonitor, 
  EncryptedKey, 
  EmailAccount, 
  BuiltSite, 
  PlatformAccount, 
  AutomationWorkflow, 
  AuditLogItem, 
  CloudPlatform,
  AppSettings
} from "../types";

const DB_NAME = "SiteCloneProDB";
const DB_VERSION = 1;

let useFallback = false;
const fallbackSettings: Record<string, any> = {};

function loadFromLocalStorage(storeName: string): any[] {
  try {
    const data = localStorage.getItem(`siteclone_fallback_${storeName}`);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("localStorage is not available:", e);
  }
  if (storeName === "platforms") {
    return [...PRE_POPULATED_PLATFORMS];
  }
  return [];
}

function saveToLocalStorage(storeName: string, data: any[]) {
  try {
    localStorage.setItem(`siteclone_fallback_${storeName}`, JSON.stringify(data));
  } catch (e) {
    console.warn("localStorage is not available for writing:", e);
  }
}

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      console.warn("IndexedDB not supported, falling back.");
      useFallback = true;
      reject("IndexedDB not supported");
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.warn("Database failed to open, falling back.", event);
        useFallback = true;
        reject(request.error || new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = (event) => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // 1. Clones Store
        if (!db.objectStoreNames.contains("clones")) {
          const store = db.createObjectStore("clones", { keyPath: "id" });
          store.createIndex("url", "url", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }

        // 2. Monitors Store
        if (!db.objectStoreNames.contains("monitors")) {
          const store = db.createObjectStore("monitors", { keyPath: "id" });
          store.createIndex("url", "url", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }

        // 3. Encrypted Keys Store
        if (!db.objectStoreNames.contains("keys")) {
          const store = db.createObjectStore("keys", { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }

        // 4. Emails Store
        if (!db.objectStoreNames.contains("emails")) {
          const store = db.createObjectStore("emails", { keyPath: "id" });
          store.createIndex("provider", "provider", { unique: false });
          store.createIndex("email", "email", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }

        // 5. Sites Store
        if (!db.objectStoreNames.contains("sites")) {
          const store = db.createObjectStore("sites", { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("platform", "platform", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }

        // 6. Platform Accounts Store
        if (!db.objectStoreNames.contains("accounts")) {
          const store = db.createObjectStore("accounts", { keyPath: "id" });
          store.createIndex("platform", "platform", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }

        // 7. Workflows Store
        if (!db.objectStoreNames.contains("workflows")) {
          const store = db.createObjectStore("workflows", { keyPath: "id" });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("status", "status", { unique: false });
        }

        // 8. Platforms Info Store
        if (!db.objectStoreNames.contains("platforms")) {
          const store = db.createObjectStore("platforms", { keyPath: "id" });
          store.createIndex("category", "category", { unique: false });
          store.createIndex("name", "name", { unique: false });
        }

        // 9. Audit Logs Store
        if (!db.objectStoreNames.contains("auditLog")) {
          const store = db.createObjectStore("auditLog", { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("action", "action", { unique: false });
        }

        // 10. Settings Store
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      };
    } catch (e) {
      console.warn("Caught IndexedDB constructor error, falling back:", e);
      useFallback = true;
      reject(e);
    }
  });
}

// Low level general operations helper
export class DBService {
  static async getDB(): Promise<IDBDatabase> {
    if (useFallback) {
      throw new Error("Using fallback storage");
    }
    return initIndexedDB();
  }

  static async getAll<T>(storeName: string): Promise<T[]> {
    if (useFallback) {
      return loadFromLocalStorage(storeName) as T[];
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(transaction.objectStoreNames[0] || storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Error in DBService.getAll for ${storeName}, falling back:`, e);
      useFallback = true;
      return loadFromLocalStorage(storeName) as T[];
    }
  }

  static async get<T>(storeName: string, id: string): Promise<T | undefined> {
    if (useFallback) {
      const list = loadFromLocalStorage(storeName);
      return list.find((item: any) => item.id === id) as T | undefined;
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Error in DBService.get for ${storeName}, falling back:`, e);
      useFallback = true;
      const list = loadFromLocalStorage(storeName);
      return list.find((item: any) => item.id === id) as T | undefined;
    }
  }

  static async put<T>(storeName: string, item: T & { id: string }): Promise<void> {
    if (useFallback) {
      const list = loadFromLocalStorage(storeName);
      const index = list.findIndex((i: any) => i.id === item.id);
      if (index >= 0) {
        list[index] = item;
      } else {
        list.push(item);
      }
      saveToLocalStorage(storeName, list);
      return;
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Error in DBService.put for ${storeName}, falling back:`, e);
      useFallback = true;
      const list = loadFromLocalStorage(storeName);
      const index = list.findIndex((i: any) => i.id === item.id);
      if (index >= 0) {
        list[index] = item;
      } else {
        list.push(item);
      }
      saveToLocalStorage(storeName, list);
    }
  }

  static async delete(storeName: string, id: string): Promise<void> {
    if (useFallback) {
      const list = loadFromLocalStorage(storeName);
      const filtered = list.filter((item: any) => item.id !== id);
      saveToLocalStorage(storeName, filtered);
      return;
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Error in DBService.delete for ${storeName}, falling back:`, e);
      useFallback = true;
      const list = loadFromLocalStorage(storeName);
      const filtered = list.filter((item: any) => item.id !== id);
      saveToLocalStorage(storeName, filtered);
    }
  }

  static async clearStore(storeName: string): Promise<void> {
    if (useFallback) {
      saveToLocalStorage(storeName, storeName === "platforms" ? [...PRE_POPULATED_PLATFORMS] : []);
      return;
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Error in DBService.clearStore for ${storeName}, falling back:`, e);
      useFallback = true;
      saveToLocalStorage(storeName, storeName === "platforms" ? [...PRE_POPULATED_PLATFORMS] : []);
    }
  }

  // Settings specific helpers
  static async getSetting<T>(key: string): Promise<T | undefined> {
    if (useFallback) {
      try {
        const val = localStorage.getItem(`siteclone_fallback_settings_${key}`);
        if (val) return JSON.parse(val) as T;
      } catch (e) {
        return fallbackSettings[key];
      }
      return undefined;
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction("settings", "readonly");
        const store = transaction.objectStore("settings");
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
      });
    } catch (e) {
      console.warn(`Error in DBService.getSetting for ${key}, falling back:`, e);
      useFallback = true;
      try {
        const val = localStorage.getItem(`siteclone_fallback_settings_${key}`);
        if (val) return JSON.parse(val) as T;
      } catch {
        return fallbackSettings[key];
      }
      return undefined;
    }
  }

  static async putSetting<T>(key: string, value: T): Promise<void> {
    if (useFallback) {
      try {
        localStorage.setItem(`siteclone_fallback_settings_${key}`, JSON.stringify(value));
      } catch (e) {
        fallbackSettings[key] = value;
      }
      return;
    }
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("settings", "readwrite");
        const store = transaction.objectStore("settings");
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`Error in DBService.putSetting for ${key}, falling back:`, e);
      useFallback = true;
      try {
        localStorage.setItem(`siteclone_fallback_settings_${key}`, JSON.stringify(value));
      } catch {
        fallbackSettings[key] = value;
      }
    }
  }
}

// Pre-populated 50+ Premium Platforms list
export const PRE_POPULATED_PLATFORMS: CloudPlatform[] = [
  // 1. AI Coding & Assist
  { id: "copilot", name: "GitHub Copilot", category: "ai", url: "https://github.com", consoleUrl: "https://github.com/settings/copilot", description: "مساعد التكويد الذكي الأكثر شهرة لكتابة وتوقع التعليمات البرمجية", freeLimit: "تجريبي مجاني 30 يوم" },
  { id: "cursor", name: "Cursor AI", category: "ai", url: "https://cursor.sh", consoleUrl: "https://cursor.sh", description: "محرر أكواد ذكي متفرع من VS Code يدعم الذكاء الاصطناعي بشكل كامل", freeLimit: "50 طلب gpt-4 مجاناً شهرياً" },
  { id: "windsurf", name: "Windsurf (Codeium)", category: "ai", url: "https://codeium.com/windsurf", consoleUrl: "https://codeium.com/windsurf", description: "أول بيئة تطوير تفاعلية تدمج الوكيل الذكي ومساعد التكويد الفوري", freeLimit: "استخدام مجاني فردي غير محدود" },
  { id: "trae", name: "Trae", category: "ai", url: "https://trae.sh", consoleUrl: "https://trae.sh", description: "منصة التكويد الذكية الصاعدة لبناء النماذج وتصميم المشاريع فورياً", freeLimit: "مستوى مجاني سخي للغاية" },
  { id: "pieces", name: "Pieces for Developers", category: "ai", url: "https://pieces.app", consoleUrl: "https://pieces.app", description: "إدارة وحفظ لقطات الأكواد وتنظيمها باستخدام الذكاء الاصطناعي التوليدي", freeLimit: "متاح مجاناً للمطورين للأبد" },
  { id: "cody", name: "Sourcegraph Cody", category: "ai", url: "https://sourcegraph.com/cody", consoleUrl: "https://sourcegraph.com/cody", description: "مساعد قراءة وفهم وتصحيح الأكواد الضخمة والمستودعات في ثوانٍ", freeLimit: "مستوى مجاني بمحددات مريحة" },
  { id: "tabnine", name: "Tabnine", category: "ai", url: "https://tabnine.com", consoleUrl: "https://tabnine.com", description: "أقدم محركات التنبؤ المبرمجة بالتعليمات البرمجية مع حماية للخصوصية", freeLimit: "مستوى برونزي مجاني للأبد" },
  { id: "codewhisperer", name: "Amazon CodeWhisperer", category: "ai", url: "https://aws.amazon.com/codewhisperer", consoleUrl: "https://console.aws.amazon.com", description: "مساعد تكويد ذكي مُدرب بالكامل داخل سحابة أمازون ويب سيرفيسز AWS", freeLimit: "مجاني بالكامل للاستخدام الفردي" },
  { id: "jetbrains_ai", name: "JetBrains AI Assistant", category: "ai", url: "https://jetbrains.com/ai", consoleUrl: "https://jetbrains.com/ai", description: "مساعد البرمجة الذكي المدمج في جميع بيئات JetBrains الشهيرة", freeLimit: "فترة تجريبية مجانية 7 أيام" },
  { id: "replit_agent", name: "Replit Agent", category: "ai", url: "https://replit.com", consoleUrl: "https://replit.com", description: "وكيل ذكي مذهل يبني تطبيقات كاملة ويشغلها لك من الصفر", freeLimit: "رصيد تجريبي شهري متاح" },
  { id: "claude_code", name: "Claude Code", category: "ai", url: "https://anthropic.com/claude", consoleUrl: "https://console.anthropic.com", description: "أداة تكويد سريعة عبر الكوماند لاين مباشرة من أنثروبيك", freeLimit: "تجريبي مجاني بمحددات مرنة" },
  { id: "aider", name: "Aider AI", category: "ai", url: "https://aider.chat", consoleUrl: "https://aider.chat", description: "مساعد تكويد يعمل في مبنى الكوماند لاين مباشرة للربط مع مستودع Git", freeLimit: "أداة مفتوحة المصدر مجانية بالكامل" },
  { id: "continue_dev", name: "Continue.dev", category: "ai", url: "https://continue.dev", consoleUrl: "https://continue.dev", description: "امتداد ذكي مفتوح المصدر لدمج أي نموذج لغوي (LLM) مع VS Code", freeLimit: "مفتوح المصدر ومجاني 100%" },
  { id: "cline", name: "Cline", category: "ai", url: "https://github.com/cline/cline", consoleUrl: "https://github.com/cline/cline", description: "الوكيل البرمجي الذكي المذهل لتنفيذ المهام الصعبة في VS Code تلقائيًا", freeLimit: "مفتوح المصدر ومتاح مجاناً كلياً" },
  { id: "roo_code", name: "Roo Code", category: "ai", url: "https://roocode.com", consoleUrl: "https://roocode.com", description: "شوكة مطورة من وكلاء التكويد تمنح تحكماً هائلاً في قراءة الملفات وبنائها", freeLimit: "مجاني بالكامل ومفتوح المصدر" },
  { id: "pear_ai", name: "PearAI", category: "ai", url: "https://trypear.ai", consoleUrl: "https://trypear.ai", description: "محرر أكواد مفتوح المصدر مصمم لإتاحة دمج الذكاء الاصطناعي بسهولة", freeLimit: "مستوى تأسيسي مجاني" },
  { id: "supermaven", name: "Supermaven", category: "ai", url: "https://supermaven.com", consoleUrl: "https://supermaven.com", description: "أسرع أداة ذكية لتوقع الأكواد بنافذة سياق عملاقة تبلغ 300 ألف توكن", freeLimit: "مجاني بالكامل للاستخدام الفردي الأساسي" },
  { id: "poolside", name: "Poolside", category: "ai", url: "https://poolside.ai", consoleUrl: "https://poolside.ai", description: "منصة ذكاء اصطناعي واعدة ومصممة خصيصاً للبرمجيات وتوليد الأكواد", freeLimit: "تجريبي للمطورين الأوائل" },
  { id: "blackbox_ai", name: "Blackbox AI", category: "ai", url: "https://blackbox.ai", consoleUrl: "https://blackbox.ai", description: "البحث الذكي الفوري وتوليد وتحويل الأكواد بمجرد الكتابة والدردشة", freeLimit: "استخدام مجاني يومي سخي جداً" },
  { id: "codeium", name: "Codeium", category: "ai", url: "https://codeium.com", consoleUrl: "https://codeium.com", description: "مساعد برمجة ذكي مجاني يغطي أكثر من 70 لغة مع ميزات هائلة", freeLimit: "مجاني بالكامل للأفراد للأبد" },

  // 2. Cloud IDEs
  { id: "idx", name: "Project IDX (Google)", category: "ide", url: "https://idx.dev", consoleUrl: "https://idx.google.com", description: "بيئة غوغل البرمجية السحابية السريعة والحديثة المدعومة بالذكاء لتطبيقات الويب والموبايل", freeLimit: "مجاني للأبد بحساب Google" },
  { id: "codespaces", name: "GitHub Codespaces", category: "ide", url: "https://github.com/features/codespaces", consoleUrl: "https://github.com/codespaces", description: "بيئة تطوير سحابية متكاملة تماماً ومهيأة للتشغيل الفوري من مستودعك", freeLimit: "60 ساعة شهرياً مجاناً" },
  { id: "codesandbox", name: "CodeSandbox", category: "ide", url: "https://codesandbox.io", consoleUrl: "https://codesandbox.io/dashboard", description: "بيئة متكاملة لفرق تطوير مشاريع الويب التفاعلية الحديثة", freeLimit: "3 مشاريع سحابية مجانية" },
  { id: "stackblitz", name: "StackBlitz", category: "ide", url: "https://stackblitz.com", consoleUrl: "https://stackblitz.com", description: "محرر سريع يدعم تقنية WebContainers لتشغيل Node.js مباشرة في متصفحك", freeLimit: "متاح مجاناً للمشاريع العامة بلا حدود" },
  { id: "replit", name: "Replit", category: "ide", url: "https://replit.com", consoleUrl: "https://replit.com/~", description: "بيئة تطوير تفاعلية متكاملة شهيرة للبرمجة والمشاركة الفورية بالتكنولوجيا", freeLimit: "مشروع سحابي نشط مجاناً" },
  { id: "glitch", name: "Glitch", category: "ide", url: "https://glitch.com", consoleUrl: "https://glitch.com/dashboard", description: "منصة ممتعة لتصميم وتعديل ونشر تطبيقات Node.js بنقرة واحدة وتشاركية", freeLimit: "استضافة وتكامل تطبيقات عامة مجاناً" },
  { id: "gitpod", name: "Gitpod", category: "ide", url: "https://gitpod.io", consoleUrl: "https://gitpod.io/workspaces", description: "تطوير مشروعاتك داخل بيئات عمل معزولة ومؤتمتة بالكامل عبر الويب", freeLimit: "50 ساعة شهرياً مجاناً" },
  { id: "bolt_new", name: "Bolt.new", category: "ide", url: "https://bolt.new", consoleUrl: "https://bolt.new", description: "محرر ويب ثوري من StackBlitz يقوم ببناء، تثبيت، وتشغيل تطبيقات الويب كاملة", freeLimit: "رصيد تجريبي سخي للتوليد" },
  { id: "lovable", name: "Lovable.dev", category: "ide", url: "https://lovable.dev", consoleUrl: "https://lovable.dev", description: "منصة ويب ذكية لتصميم واجهات تطبيقات متكاملة بلغة واضحة دون جهد", freeLimit: "توليد مجاني محدود في الاشتراك الأساسي" },
  { id: "tempo", name: "Tempo Labs", category: "ide", url: "https://tempolabs.com", consoleUrl: "https://tempolabs.com", description: "محرر أكواد مرئي يسمح بتعديل وتطوير مكونات React والواجهات بسرعة", freeLimit: "نسخة تجريبية للمطورين مجاناً" },
  { id: "same_dev", name: "Same.dev", category: "ide", url: "https://same.dev", consoleUrl: "https://same.dev", description: "بيئات تطوير سحابية مطابقة تماماً للمواصفات الحقيقية للإنتاج والتوزيع", freeLimit: "مستوى مجاني محدود" },
  { id: "base44", name: "Base44", category: "ide", url: "https://base44.com", consoleUrl: "https://base44.com", description: "بناء تطبيقات الويب والواجهات الخلفية بسرعة وكفاءة عبر أدوات سحابية متطورة", freeLimit: "تجريبي مجاناً بلا بطاقة ائتمان" },
  { id: "v0ByVercel", name: "v0 by Vercel", category: "ide", url: "https://v0.dev", consoleUrl: "https://v0.dev", description: "محرك لتصميم صفحات ومكونات واجهات الويب المبنية على ريكت و تيلوند", freeLimit: "رصيد متجدد مجاناً شهرياً" },

  // 3. AI Platforms
  { id: "openai", name: "OpenAI Developer Platform", category: "ai", url: "https://openai.com", consoleUrl: "https://platform.openai.com", description: "الحصول على مفاتيح API لنماذج الذكاء الاصطناعي GPT-4o و gpt-3.5", freeLimit: "رصيد 5 دولار مجاني" },
  { id: "gemini", name: "Google AI Studio", category: "ai", url: "https://ai.studio", consoleUrl: "https://aistudio.google.com", description: "الوصول المباشر لنماذج غوغل الحديثة Gemini 1.5 Pro & Flash مجاناً", freeLimit: "15 طلب بالدقيقة مجاني بالكامل" },
  { id: "kimi", name: "Kimi Web", category: "ai", url: "https://kimi.moonshot.cn", consoleUrl: "https://kimi.moonshot.cn", description: "مساعد ذكاء اصطناعي رائد في معالجة وفهم الملفات والنصوص الطويلة والمعقدة", freeLimit: "استخدام مجاني لخدمة الكيمي" },
  { id: "anthropic", name: "Anthropic Console", category: "ai", url: "https://anthropic.com", consoleUrl: "https://console.anthropic.com", description: "بوابة المطورين لنماذج Claude 3.5 Sonnet و Opus للمطورين", freeLimit: "مستوى برونزي تجريبي" },
  { id: "perplexity", name: "Perplexity AI", category: "ai", url: "https://perplexity.ai", consoleUrl: "https://perplexity.ai", description: "محرك البحث الذكي الهجين القائم على المعالجة اللغوية للنماذج المتقدمة", freeLimit: "عمليات بحث ذكية يومية غير محدودة" },
  { id: "grok", name: "Grok (xAI)", category: "ai", url: "https://x.ai", consoleUrl: "https://console.x.ai", description: "مساعد ذكاء متصل بالزمن الحقيقي بالبيانات على منصة X الشهيرة", freeLimit: "متاح لمشتركي المنصة والمطورين للاختبار" },
  { id: "mistral", name: "Mistral AI Console", category: "ai", url: "https://mistral.ai", consoleUrl: "https://console.mistral.ai", description: "منصة فرنسية رائدة تتيح نماذج ذكاء اصطناعي مفتوحة المصدر وفائقة السرعة", freeLimit: "مستوى استخدام تجريبي محدود" },
  { id: "cohere", name: "Cohere", category: "ai", url: "https://cohere.com", consoleUrl: "https://dashboard.cohere.com", description: "نماذج لغوية متخصصة في التصنيف والتلخيص والبحث الدلالي الفائق", freeLimit: "رصيد مجاني سخي للغاية للمشروعات الفردية" },
  { id: "huggingface", name: "Hugging Face Spaces", category: "ai", url: "https://huggingface.co", consoleUrl: "https://huggingface.co/spaces", description: "مجتمع نماذج الذكاء لرفع وتجريب واختيار آلاف النماذج المفتوحة", freeLimit: "استضافة النماذج مجاناً بالكامل" },
  { id: "replicate", name: "Replicate Platform", category: "ai", url: "https://replicate.com", consoleUrl: "https://replicate.com/explore", description: "بوابة التشغيل والاستدعاء الفوري لنماذج الذكاء عبر الـ Cloud API", freeLimit: "دفع بالثانية مع تجربة مجانية ممتازة" },
  { id: "langchain", name: "LangChain (Smith)", category: "ai", url: "https://langchain.com", consoleUrl: "https://smith.langchain.com", description: "منصة المراقبة وبناء السلاسل البرمجية لوكلاء الذكاء الاصطناعي الحديثة", freeLimit: "مستويات تتبع مجانية للأبد للمطورين" },
  { id: "llamaindex", name: "LlamaIndex Cloud", category: "ai", url: "https://llamaindex.ai", consoleUrl: "https://cloud.llamaindex.ai", description: "تنظيم وهيكلة وتوجيه قواعد البيانات الخاصة للربط مع نماذج الذكاء", freeLimit: "مجاني لمشروعاتك الفردية والتطوير" },

  // 4. Databases
  { id: "supabase", name: "Supabase", category: "database", url: "https://supabase.com", consoleUrl: "https://supabase.com/dashboard", description: "بديل فايربيس المذهل مبني على بنية PostgreSQL مرنة وقوية", freeLimit: "مشروعين مجانيين بالكامل 500MB للأبد" },
  { id: "neon", name: "Neon Postgres", category: "database", url: "https://neon.tech", consoleUrl: "https://console.neon.tech", description: "قاعدة بيانات بوستجرس سريعة في السحاب تدعم فروع الأكواد الفورية والتوسع التلقائي", freeLimit: "قادمة مع خادم مجاني 0.5 CPU" },
  { id: "planetscale", name: "PlanetScale", category: "database", url: "https://planetscale.com", consoleUrl: "https://app.planetscale.com", description: "قاعدة بيانات MySQL هائلة الأداء قائمة على تقنية توزيع البيانات Vitess", freeLimit: "تجريبي مجاناً للأعضاء الجدد" },
  { id: "turso", name: "Turso SQLite", category: "database", url: "https://turso.tech", consoleUrl: "https://turso.tech", description: "قواعد بيانات SQLite موزعة في السحاب لسرعة خيالية في التطبيقات الطرفية", freeLimit: "500 قاعدة بيانات في خطة الهواة مجاناً" },
  { id: "xata", name: "Xata database", category: "database", url: "https://xata.io", consoleUrl: "https://app.xata.io", description: "قاعدة بيانات ويب سريعة تدمج قدرات البحث النصي الكامل ونماذج الذكاء", freeLimit: "خطة تجريبية 15 جيجا مجاناً" },
  { id: "convex", name: "Convex Cloud", category: "database", url: "https://convex.dev", consoleUrl: "https://dashboard.convex.dev", description: "قاعدة بيانات ديناميكية وتفاعلية ممتازة لتطبيقات الويب النشطة بالزمن الحقيقي", freeLimit: "سخية كلياً للبدايات" },
  { id: "fauna", name: "FaunaDB", category: "database", url: "https://fauna.com", consoleUrl: "https://dashboard.fauna.com", description: "قاعدة بيانات مرنة ومأمونة جغرافياً ومرتبطة بلغة استعلام ذكية", freeLimit: "خطط تطوير مجانية للأبد مريحة" },
  { id: "surrealdb", name: "SurrealDB Cloud", category: "database", url: "https://surrealdb.com", consoleUrl: "https://surrealdb.cloud", description: "قاعدة بيانات عابرة للمواصفات والنوعية تدمج البحث الرسومي والوثائقي", freeLimit: "خطط تطوير برونزية ممتازة" },
  { id: "appwrite", name: "Appwrite", category: "database", url: "https://appwrite.io", consoleUrl: "https://cloud.appwrite.io", description: "لوحة تحكم فنية كاملة توفر لك خادم خلفي، مع قاعدة وقدرات أمان", freeLimit: "مستوى مجاني كامل للمطورين للأبد" },
  { id: "pocketbase", name: "PocketBase (SaaS)", category: "database", url: "https://pocketbase.io", consoleUrl: "https://pocketbase.io", description: "قاعدة بيانات خفيفة مفتوحة المصدر تجمع الأمان والـ Realtime كملف واحد", freeLimit: "مجاني ومفتوح المصدر في الاستضافة الذاتية" },
  { id: "mongodb_atlas", name: "MongoDB Atlas", category: "database", url: "https://mongodb.com/atlas", consoleUrl: "https://cloud.mongodb.com", description: "النسخة الرسمية السحابية المدارة لأضخم قواعد البيانات الوثائقية", freeLimit: "512MB تخزين دائم ومجاني بالكامل" },
  { id: "redis_cloud", name: "Redis Cloud", category: "database", url: "https://redis.io", consoleUrl: "https://app.redislabs.com", description: "قاعدة بيانات في الذاكرة لتسريع تخزين الجلسات والكاش وإدارة البيانات المؤقتة", freeLimit: "قاعدة بيانات واحدة 30MB مجاناً" },
  { id: "upstash", name: "Upstash Redis & Kafka", category: "database", url: "https://upstash.com", consoleUrl: "https://console.upstash.com", description: "قواعد بيانات كاش ورسائل لاسلكية بلا مخدمات تدفع بقدر استهلاكك فقط", freeLimit: "10 آلاف استعلام يومي مجاناً" },
  { id: "cockroachlabs", name: "CockroachDB Serverless", category: "database", url: "https://cockroachlabs.com", consoleUrl: "https://cockroachlabs.cloud", description: "بناء وتوسيع قواعد البيانات الموزعة عالمياً والموثوقة فائق التنظيم والأمان", freeLimit: "10 جيجا بايت تخزين دائم ومجاني" },
  { id: "yugabyte", name: "YugabyteDB Managed", category: "database", url: "https://yugabyte.com", consoleUrl: "https://yugabyte.com", description: "قاعدة بيانات SQL موزعة ومفتوحة المصدر متوافقة تماماً مع PostgreSQL", freeLimit: "مستوى سحابي مجاني للمطورين" },
  { id: "tidb", name: "TiDB Serverless", category: "database", url: "https://pingcap.com/tidb-serverless", consoleUrl: "https://tidbcloud.com", description: "قاعدة بيانات سحابية متطورة للغاية تدمج معالجة البيانات وتحليلها فوراً", freeLimit: "5 جيجابايت مساحة مجانية مستمرة" },
  { id: "clickhouse", name: "ClickHouse Cloud", category: "database", url: "https://clickhouse.com", consoleUrl: "https://clickhouse.cloud", description: "قاعدة عمودية فائقة السرعة لتحليل واستخراج ملايين السجلات بالإحصاءات", freeLimit: "فترة تجريبية برصيد 300 دولار" },
  { id: "timescale", name: "TimescaleDB Cloud", category: "database", url: "https://timescale.com", consoleUrl: "https://portal.timescale.cloud", description: "قاعدة بيانات ممتازة لتخزين وتحليل سلاسل البيانات الزمنية والتحليلات", freeLimit: "فترة تجريبية 30 يوم" },
  { id: "influxdb", name: "InfluxDB Cloud", category: "database", url: "https://influxdata.com", consoleUrl: "https://cloud2.influxdata.com", description: "أشهر قواعد البيانات لمعالجة بيانات الاستشعار، المقاييس والأتمتة الزمنية", freeLimit: "خطة تطوير مجانية مأمونة" },

  // 5. Deployment
  { id: "vercel", name: "Vercel Hosting", category: "deployment", url: "https://vercel.com", consoleUrl: "https://vercel.com/dashboard", description: "سحابة النشر الأولى لتطبيقات React و Next.js مع تكامل النطاقات فورياً", freeLimit: "مجاني تماماً للمشاريع الفردية" },
  { id: "netlify", name: "Netlify Cloud", category: "deployment", url: "https://netlify.com", consoleUrl: "https://app.netlify.com", description: "أداة النشر والابتكار السريع للمواقع والتطبيقات الثابتة والخلفية", freeLimit: "100 جيجا بايت ترافيك مجاني شهري" },
  { id: "render", name: "Render Cloud", category: "deployment", url: "https://render.com", consoleUrl: "https://dashboard.render.com", description: "بديل هيروكو الرائد لنشر ملفات الويب الثابتة والخوادم وقواعد البيانات", freeLimit: "موقع وخدمات ويب وخوادم مجانية للأبد" },
  { id: "railway", name: "Railway.app", category: "deployment", url: "https://railway.app", consoleUrl: "https://railway.app/dashboard", description: "منصة رائعة لبناء وإطلاق مشاريع البرمجيات والحاويات السحابية بنقرة واحدة", freeLimit: "رصيد شهري متجدد للاستخدام المجاني" },
  { id: "fly_io", name: "Fly.io", category: "deployment", url: "https://fly.io", consoleUrl: "https://fly.io/dashboard", description: "نشر تطبيقات الويب والخوادم على مقربة من المستخدمين بأداء مميز", freeLimit: "3 حاويات صغيرة وعرض متجدد مجاناً" },
  { id: "surge", name: "Surge Command Static", category: "deployment", url: "https://surge.sh", consoleUrl: "https://surge.sh", description: "أبسط وسيلة لنشر مواقع الويب الساكنة بالكامل عبر الكوماند لاين مباشرة", freeLimit: "استضافة مجانية للأبد بمجال مخصص" },
  { id: "githubpages", name: "GitHub Pages", category: "deployment", url: "https://pages.github.com", consoleUrl: "https://github.com", description: "نشر المواقع الاستاتيكية والواجهات فوراً من وسم المستودع الخاص بك على غيت هاب", freeLimit: "مجاني بالكامل للأبد بلا ليميت" },
  { id: "koyeb", name: "Koyeb Hosting", category: "deployment", url: "https://koyeb.com", consoleUrl: "https://app.koyeb.com", description: "منصة حديثة وسريعة جداً لتشغيل حاويات Docker والوظائف الموزعة عالمياً", freeLimit: "جهاز صغير وخطة مجانية للأبد شهرياً" },
  { id: "cyclic", name: "Cyclic.sh", category: "deployment", url: "https://cyclic.sh", consoleUrl: "https://cyclic.sh", description: "بناء ونشر تطبيقات Node.js و واجهات البرمجة بلا خوادم وبسرعة فائقة", freeLimit: "3 مشاريع وربط قواعد البيانات مجاناً" },
  { id: "digitalocean", name: "DigitalOcean App Platform", category: "deployment", url: "https://digitalocean.com", consoleUrl: "https://cloud.digitalocean.com", description: "المنصة السحابية الموثوقة لنشر وإدارة البرمجيات والتطبيقات في ثوانٍ", freeLimit: "استضافة 3 مواقع ويب مجاناً" },
  { id: "heroku", name: "Heroku App Services", category: "deployment", url: "https://heroku.com", consoleUrl: "https://dashboard.heroku.com", description: "المنصة العريقة والشهيرة في تسهيل النشر وقواعد البيانات وإضافات الخدمات", freeLimit: "يتطلب بطاقة حالياً للتسجيل" },

  // 6. Monitoring & Analytics
  { id: "uptime_robot", name: "UptimeRobot Monitor", category: "monitoring", url: "https://uptimerobot.com", consoleUrl: "https://uptimerobot.com/dashboard", description: "مراقبة سلامة واستمرارية عمل المواقع وإرسال رسائل بريد عند التعطل", freeLimit: "50 مراقبة مجانية كل 5 دقائق" },
  { id: "better_stack", name: "Better Stack Analytics", category: "monitoring", url: "https://betterstack.com", consoleUrl: "https://betterstack.com", description: "مراقبة حية، صفحات فحص عامة، وإدارة مناوبات المشرفين والمطورين", freeLimit: "10 مراقبي أداء مجاناً تماماً" },
  { id: "site24x7", name: "Site24x7 Core", category: "monitoring", url: "https://site24x7.com", consoleUrl: "https://site24x7.com", description: "توفير مراقبة شاملة لتطبيقات الموبايل والويب والبنية التحتية والمخدمات", freeLimit: "30 يوم تجربة مجانية ممتازة" },
  { id: "sentry", name: "Sentry Error Tracking", category: "monitoring", url: "https://sentry.io", consoleUrl: "https://sentry.io/welcome", description: "التقاط وتتبع الأخطاء والثغرات في تطبيقات الويب في الزمن الحقيقي وتصحيحها", freeLimit: "5000 حدث وخطأ تتبع مجاني شهرياً" },
  { id: "logrocket", name: "LogRocket Session", category: "monitoring", url: "https://logrocket.com", consoleUrl: "https://logrocket.com", description: "تسجيل جلسات المستخدمين للويب وتقفي الأثر وحل مشاكل تجربة الاستخدام", freeLimit: "1000 جلسة مجانية شهرياً للأبد" },
  { id: "posthog", name: "PostHog Analytics", category: "monitoring", url: "https://posthog.com", consoleUrl: "https://us.posthog.com", description: "صندوق أدوات متكامل للتحليلات الطليعية وحفظ الجلسات وإطلاق الميزات بذكاء", freeLimit: "مليون حدث مجاني تماماً كل شهر" },
  { id: "datadog", name: "Datadog", category: "monitoring", url: "https://datadoghq.com", consoleUrl: "https://app.datadoghq.com", description: "مراقبة على مستوى المؤسسات تجمع بيانات التسجيل والمخدمات وأداء التطبيقات", freeLimit: "فترة تجريبية 14 يوماً بكامل المزايا" },
  { id: "newrelic", name: "New Relic", category: "monitoring", url: "https://newrelic.com", consoleUrl: "https://one.newrelic.com", description: "عرض وتحليل أداء المنظومة البرمجية وقراءة السجلات من شاشة واحدة شاملة", freeLimit: "100GB شهرياً من قراءة البيانات مجاناً" },
  { id: "grafana", name: "Grafana Cloud", category: "monitoring", url: "https://grafana.com", consoleUrl: "https://grafana.com/products/cloud", description: "استعلام وعرض البيانات والمقاييس عبر لوحات تحكم ديناميكية تفاعلية مبهرة", freeLimit: "خطة سحابية مجانية تدعم 3 أعضاء" },
  { id: "prometheus", name: "Prometheus", category: "monitoring", url: "https://prometheus.io", consoleUrl: "https://prometheus.io", description: "تخزين ومسح مقاييس الأداء واستخدام الذاكرة والمعالج في قواعد زمنية متخصصة", freeLimit: "مفتوح المصدر ومجاني بالكامل ذاتياً" },

  // 7. Workflow Automation
  { id: "n8n_cloud", name: "n8n Automation", category: "workflows", url: "https://n8n.io", consoleUrl: "https://n8n.io", description: "بديل زابيير الشهير لتصميم وربط تدفقات البيانات بدون قيود وبمرونة برمجية", freeLimit: "مفتوح المصدر في الاستضافة الذاتية" },
  { id: "make", name: "Make.com (Integromat)", category: "workflows", url: "https://make.com", consoleUrl: "https://eu1.make.com", description: "أجمل منصة مرئية لتصميم وربط آلاف التطبيقات ونقل البيانات المعقفة", freeLimit: "1000 عملية تشغيل مجانية شهرياً للأبد" },
  { id: "zapier", name: "Zapier Connect", category: "workflows", url: "https://zapier.com", consoleUrl: "https://zapier.com/dashboard", description: "عملاق الاتصالات بين تطبيقات الويب لتصميم مهام ربط بريدية وإدارية نشطة", freeLimit: "100 مهمة مجانية في الشهر ومسارات مرنة" },
  { id: "pipedream", name: "Pipedream Developer", category: "workflows", url: "https://pipedream.com", consoleUrl: "https://pipedream.com", description: "منصة أتمتة موجهة للمبرمجين تمكنهم من دمج أكواد Node و Python و Go", freeLimit: "333 دقيقة تشغيل مجانية شهرياً" },
  { id: "nodered", name: "Node-RED Flow", category: "workflows", url: "https://nodered.org", consoleUrl: "https://nodered.org", description: "ماتريكس برمجة مرئي يربط الأجهزة المادية وواجهات برمجة التطبيقات وخدمات الويب", freeLimit: "مجاني ومفتوح المصدر للتثبيت المحلي والسحابي" },
  { id: "ifttt", name: "IFTTT Platforms", category: "workflows", url: "https://ifttt.com", consoleUrl: "https://ifttt.com/home", description: "مساعد الربط الفوري للأتمتة الخفيفة وخدمات المنزل الذكي والأجهزة المحمولة", freeLimit: "دعم لحد 3 اتصالات مجانية مخصصة" },
  { id: "temporal", name: "Temporal Cloud", category: "workflows", url: "https://temporal.io", consoleUrl: "https://temporal.io", description: "أتمتة الأعمال وضمان تشغيل الأكواد المعقدة ومقاومة الأخطاء وإعادة المحاولة", freeLimit: "مستويات تطوير مجانية محلياً بالكامل" },
  { id: "prefect", name: "Prefect Engine", category: "workflows", url: "https://prefect.io", consoleUrl: "https://prefect.io", description: "إدارة تشغيل، تتبع وتنفيذ تدفقات علم البيانات والأكواد السيرية الضخمة", freeLimit: "خطة هواة مجانية سخية شهرياً للأبد" },
  { id: "airflow", name: "Apache Airflow", category: "workflows", url: "https://airflow.apache.org", consoleUrl: "https://airflow.apache.org", description: "المنصة الأكثر اعتمادية لكتابة وجدولة ومراقبة مهام البيانات المعقدة وعمليات ETL", freeLimit: "أداة مفتوحة المصدر مجانية بالكامل ومستقلة" },

  // 8. Emails Providers
  { id: "gmail", name: "Google Gmail", category: "email", url: "https://gmail.com", consoleUrl: "https://mail.google.com", description: "بريد غوغل الغني بالمميزات وتخزين سحابي وافر", freeLimit: "15 جيجابايت تخزين مجاني مشتَرك" },
  { id: "proton", name: "ProtonMail", category: "email", url: "https://proton.me", consoleUrl: "https://mail.proton.me", description: "بريد سويسري مشفر بالكامل يراعي خصوصيتك أولاً", freeLimit: "500 ميجابايت مساحة بريد حرة" },
  { id: "outlook", name: "Microsoft Outlook", category: "email", url: "https://outlook.com", consoleUrl: "https://outlook.live.com", description: "بريد مايكروسوفت العملي المتكامل مع طقم أوفيس", freeLimit: "15 جيجابايت مساحة بريد تواصل مجاني" },
  { id: "zoho_mail", name: "Zoho Mail", category: "email", url: "https://zoho.com/mail", consoleUrl: "https://zoho.com/mail/login.html", description: "بريد إلكتروني فاخر مخصص للشركات والمجالات الاحترافية", freeLimit: "5 حسابات بريد مجانية تماماً بنطاقك الخاص" }
];
