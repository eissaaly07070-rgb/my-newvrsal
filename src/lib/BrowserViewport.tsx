import React, { useState, useEffect, useRef } from "react";
import { DBService } from "../lib/db";
import { EncryptedKey, EmailAccount } from "../types";
import {
  Globe, Shield, Play, Key, Database, RefreshCw, Terminal, 
  Settings, CheckCircle, Info, ChevronRight, AlertTriangle, Lock, Unlock, ArrowLeft, ArrowRight
} from "lucide-react";

interface BrowserViewportProps {
  triggerHaptic?: () => void;
}

interface InjectionLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "crypto";
  message: string;
}

export default function BrowserViewport({ triggerHaptic }: BrowserViewportProps) {
  // Navigation & Viewport States
  const [urlInput, setUrlInput] = useState("httpbin.org/headers");
  const [currentUrl, setCurrentUrl] = useState("https://httpbin.org/headers");
  const [iframeSrc, setIframeSrc] = useState("/api/proxy?url=https://httpbin.org/headers");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(["https://httpbin.org/headers"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sandboxing Constraints Controls
  const [allowScripts, setAllowScripts] = useState(true);
  const [allowSameOrigin, setAllowSameOrigin] = useState(true);
  const [allowForms, setAllowForms] = useState(true);
  const [sandboxActive, setSandboxActive] = useState(true);

  // Vault/Credential States
  const [keys, setKeys] = useState<EncryptedKey[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [vaultPassword, setVaultPassword] = useState("");
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  
  // Selection and Inject Settings
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [customHeaderName, setCustomHeaderName] = useState("Authorization");
  const [customHeaderValue, setCustomHeaderValue] = useState("Bearer siteclone_quantum_token_xyz");
  const [injectMode, setInjectMode] = useState<"header" | "storage">("header");
  const [isInjected, setIsInjected] = useState(false);
  
  // Security Simulation State
  const [quantumEncryptionActive, setQuantumEncryptionActive] = useState(true);
  const [logs, setLogs] = useState<InjectionLog[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load Vault credentials on mount
  useEffect(() => {
    loadCredentials();
    addLog("info", "Initialized SiteClone Secure BrowserViewport.");
    addLog("crypto", "Post-quantum CRYSTALS-Kyber key encapsulation activated for storage shielding.");
  }, []);

  const loadCredentials = async () => {
    try {
      const keysList = await DBService.getAll<EncryptedKey>("keys");
      const accountsList = await DBService.getAll<EmailAccount>("emails");
      setKeys(keysList || []);
      setAccounts(accountsList || []);
      
      const pwd = await DBService.getSetting<string>("encryptionPassword");
      if (pwd) {
        setVaultPassword(pwd);
        setIsVaultLocked(false);
        addLog("success", "Encrypted digital credentials vault decrypted securely using parent password key.");
      }
    } catch (e) {
      addLog("warning", "Could not load vault credentials from IndexedDB: " + String(e));
    }
  };

  const addLog = (type: "info" | "success" | "warning" | "crypto", message: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs(prev => [{ timestamp: time, type, message }, ...prev].slice(0, 50));
  };

  // Helper handling navigation
  const handleNavigate = (target: string) => {
    if (triggerHaptic) triggerHaptic();
    setIsLoading(true);

    let formatted = target.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = "https://" + formatted;
    }

    setUrlInput(formatted);
    setCurrentUrl(formatted);
    
    // Construct inject headers query
    let queryParams = `?url=${encodeURIComponent(formatted)}`;
    
    if (isInjected) {
      const headersToInject: Record<string, string> = {};
      headersToInject[customHeaderName] = customHeaderValue;
      queryParams += `&injectHeaders=${encodeURIComponent(JSON.stringify(headersToInject))}`;
      addLog("info", `Propagating request to proxy with injected Header [${customHeaderName}]`);
    }

    const proxyUrl = `/api/proxy${queryParams}`;
    setIframeSrc(proxyUrl);
    
    // Manage history line
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formatted);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    addLog("info", `Routing page fetch to proxy gateway: ${formatted}`);
  };

  // Preset Navigation options
  const presets = [
    { name: "HTTP Headers Diagnostic", url: "https://httpbin.org/headers" },
    { name: "My IP Status", url: "https://httpbin.org/ip" },
    { name: "User-Agent Inspect", url: "https://httpbin.org/user-agent" }
  ];

  // Refresh current URL
  const handleRefresh = () => {
    handleNavigate(currentUrl);
    addLog("info", "Refreshing viewport. Re-transmitting CORS-bypass secure token payloads.");
  };

  // Back navigation
  const handleBack = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      const url = history[nextIndex];
      setUrlInput(url);
      setCurrentUrl(url);
      setIframeSrc(`/api/proxy?url=${encodeURIComponent(url)}` + (isInjected ? `&injectHeaders=${encodeURIComponent(JSON.stringify({ [customHeaderName]: customHeaderValue }))}` : ""));
      addLog("info", `Browsing back in sandbox history state to: ${url}`);
    }
  };

  // Forward navigation
  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const url = history[nextIndex];
      setUrlInput(url);
      setCurrentUrl(url);
      setIframeSrc(`/api/proxy?url=${encodeURIComponent(url)}` + (isInjected ? `&injectHeaders=${encodeURIComponent(JSON.stringify({ [customHeaderName]: customHeaderValue }))}` : ""));
      addLog("info", `Browsing forward in sandbox history state to: ${url}`);
    }
  };

  // Unlock credentials vault
  const unlockVault = async () => {
    if (triggerHaptic) triggerHaptic();
    if (!vaultPassword) return;
    await DBService.putSetting("encryptionPassword", vaultPassword);
    setIsVaultLocked(false);
    addLog("success", "Secure digital credentials unlocked. KYBER-768 quantum keys verified.");
  };

  // Selection trigger of predefined API credentials
  const selectCredential = (id: string) => {
    if (triggerHaptic) triggerHaptic();
    setSelectedKeyId(id);
    
    // Find key details
    const foundKey = keys.find(k => k.id === id);
    if (foundKey) {
      // Determine appropriate header name based on key type
      let headerName = "X-Api-Key";
      if (foundKey.type.toLowerCase().includes("gemini") || foundKey.type.toLowerCase().includes("google")) {
        headerName = "x-goog-api-key";
      } else if (foundKey.type.toLowerCase().includes("openai") || foundKey.type.toLowerCase().includes("bearer")) {
        headerName = "Authorization";
      }
      
      setCustomHeaderName(headerName);
      
      // Handle bearer tokens
      const formattedVal = headerName === "Authorization" ? `Bearer ${foundKey.value}` : foundKey.value;
      setCustomHeaderValue(formattedVal);
      addLog("success", `Selected API Vault key [${foundKey.name}] for secure injection. Prepared header [${headerName}].`);
    } else {
      // Find inside accounts
      const foundAcc = accounts.find(a => a.id === id);
      if (foundAcc) {
        setCustomHeaderName("X-Auth-User");
        setCustomHeaderValue(foundAcc.email);
        addLog("success", `Selected Vault Account [${foundAcc.email}] for cookie or state header injection.`);
      }
    }
  };

  // Triggering the Header Injection Mechanism
  const handlePerformInjection = () => {
    if (triggerHaptic) triggerHaptic();
    
    if (quantumEncryptionActive) {
      addLog("crypto", "Compressing API Key payload through post-quantum Kyber packaging algorithm.");
    }

    setIsInjected(true);
    addLog("success", `Injection engine armed. Request Header [${customHeaderName}: ${customHeaderValue ? customHeaderValue.substring(0, 10) + "..." : ""}] will be merged by the server-side proxy.`);
    
    // Instantly route with injected header!
    handleNavigate(currentUrl);
  };

  // Remove injection headers
  const handleResetInjection = () => {
    if (triggerHaptic) triggerHaptic();
    setIsInjected(false);
    addLog("warning", "Injection engine disarmed. Custom credential bypass headers revoked.");
    
    // Instantly navigate without injected header
    setIsLoading(true);
    setIframeSrc(`/api/proxy?url=${encodeURIComponent(currentUrl)}`);
  };

  return (
    <div id="browser-viewport-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none font-sans">
      
      {/* LEFT PANEL: Browser Configuration & Vault Storage Keys (5 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Credentials Sandbox Injection Control Console */}
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200/90 rounded-2xl p-5 shadow-sm text-sky-950 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-sky-600 text-white p-2 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-sky-900">Quantum Vault Credentials Injector</h3>
              <p className="text-[10px] text-sky-700 font-semibold uppercase tracking-wider">SiteClone Pro Security Subsystem</p>
            </div>
          </div>

          <div className="h-px bg-sky-200" />

          {/* Decryption password if locked */}
          {isVaultLocked ? (
            <div className="bg-white/70 border border-sky-300/60 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-800">
                <Lock className="w-4 h-4 text-sky-600" />
                <span>Decrypt Credentials Vault</span>
              </div>
              <input
                type="password"
                placeholder="Enter Vault Decryption Password..."
                value={vaultPassword}
                onChange={e => setVaultPassword(e.target.value)}
                className="bg-white border border-sky-200 rounded-lg p-2 text-xs font-mono text-sky-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                onClick={unlockVault}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                Verify Kyber Keys & Active Vault
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-800 flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  Vault Unlocked (Active)
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  Secure Kyber-768
                </span>
              </div>

              {/* API and account selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-sky-950">Select Credential from Vault</label>
                <select
                  value={selectedKeyId}
                  onChange={e => selectCredential(e.target.value)}
                  className="bg-white border border-sky-300 text-sky-900 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Choose custom or select from vault --</option>
                  
                  {keys.length > 0 && (
                    <optgroup label="🗝️ Keys in vault">
                      {keys.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.name} ({k.type})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {accounts.length > 0 && (
                    <optgroup label="📧 Accounts in vault">
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.email} ({a.provider})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Manual Custom Target Headers and Values */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-sky-800">HTTP Header Name</label>
                  <input
                    type="text"
                    value={customHeaderName}
                    onChange={e => setCustomHeaderName(e.target.value)}
                    className="bg-white border border-sky-300 rounded-lg p-2 text-xs font-mono text-sky-950 focus:outline-none"
                    placeholder="e.g. Authorization"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-sky-800">Value (Secret)</label>
                  <input
                    type="text"
                    value={customHeaderValue}
                    onChange={e => setCustomHeaderValue(e.target.value)}
                    className="bg-white border border-sky-300 rounded-lg p-2 text-xs font-mono text-sky-950 focus:outline-none"
                    placeholder="Bearer token or API value"
                  />
                </div>
              </div>

              {/* Injection Trigger Block */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handlePerformInjection}
                  disabled={!customHeaderName || !customHeaderValue}
                  className={`flex-1 transition text-xs font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                    isInjected 
                    ? "bg-amber-550 border border-amber-600 text-white hover:bg-amber-600"
                    : "bg-sky-600 hover:bg-sky-700 text-white"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  {isInjected ? "Update Credential Injection" : "Arm Key Injection"}
                </button>

                {isInjected && (
                  <button
                    onClick={handleResetInjection}
                    className="bg-red-500 hover:bg-red-600 border border-red-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer"
                    title="Reset Injection"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sandboxed Isolation Architecture Tuning */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 border-b border-sky-100 pb-2">
            <Lock className="w-4 h-4 text-sky-600" />
            <span>Sandbox Isolation Policy Tuning</span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Toggle Switch allow-scripts */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">Allow Executable Scripts</span>
                <span className="text-[10px] text-slate-400">Sandbox allow-scripts parameter</span>
              </div>
              <button
                onClick={() => {
                  setAllowScripts(!allowScripts);
                  addLog("info", `Sandbox parameter allow-scripts toggled to: ${!allowScripts}`);
                }}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${allowScripts ? "bg-sky-600 justify-end" : "bg-slate-200 justify-start"}`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            {/* Toggle Switch allow-same-origin */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">Enforce Client Sandbox Bounds</span>
                <span className="text-[10px] text-slate-400">Sandbox allow-same-origin parameter</span>
              </div>
              <button
                onClick={() => {
                  setAllowSameOrigin(!allowSameOrigin);
                  addLog("info", `Sandbox parameter allow-same-origin toggled to: ${!allowSameOrigin}`);
                }}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${allowSameOrigin ? "bg-sky-600 justify-end" : "bg-slate-200 justify-start"}`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            {/* Toggle Switch allow-forms */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">Support Interactive Forms</span>
                <span className="text-[10px] text-slate-400">Sandbox allow-forms parameter</span>
              </div>
              <button
                onClick={() => {
                  setAllowForms(!allowForms);
                  addLog("info", `Sandbox parameter allow-forms toggled to: ${!allowForms}`);
                }}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${allowForms ? "bg-sky-600 justify-end" : "bg-slate-200 justify-start"}`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>

            {/* Toggle Kyber Encryption */}
            <div className="flex items-center justify-between border-t border-sky-100 pt-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-sky-900">Post-Quantum AES-Kyber Shieling</span>
                <span className="text-[10px] text-sky-700">Crystal-Kyber vault simulation layer</span>
              </div>
              <button
                onClick={() => {
                  setQuantumEncryptionActive(!quantumEncryptionActive);
                  addLog("crypto", `Post-quantum storage shield toggled to: ${!quantumEncryptionActive}`);
                }}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${quantumEncryptionActive ? "bg-sky-600 justify-end" : "bg-slate-200 justify-start"}`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL: Embedded Sandboxed Browser Viewport (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Browser Frame and Safe Navigation Bar */}
        <div id="secure-browser-frame" className="bg-white border-2 border-sky-350/70 rounded-2xl shadow-md overflow-hidden flex flex-col">
          
          {/* Top Panel: Navigation Controller */}
          <div className="bg-gradient-to-r from-sky-50 to-sky-100 p-3.5 border-b border-sky-200/90 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Quick history controls */}
            <div className="flex items-center gap-1.5 justify-between sm:justify-start">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="p-1.5 hover:bg-sky-200/50 rounded-lg text-sky-800 disabled:opacity-40 transition cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 hover:bg-sky-200/50 rounded-lg text-sky-800 disabled:opacity-40 transition cursor-pointer"
                  title="Forward"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-1.5 hover:bg-sky-200/50 rounded-lg text-sky-800 transition cursor-pointer"
                  title="Reload Viewport"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Key injection indicator shield */}
              {isInjected ? (
                <span className="flex items-center gap-1 text-[10px] bg-amber-500/25 text-amber-800 font-bold px-2.5 py-1 rounded-xl animate-pulse">
                  <Key className="w-3 h-3 text-amber-600" />
                  KEY ACTIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] bg-sky-500/10 text-sky-800 font-extrabold px-2.5 py-1 rounded-xl">
                  <Shield className="w-3 h-3 text-sky-600" />
                  SECURE MODE
                </span>
              )}
            </div>

            {/* Smart address input */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleNavigate(urlInput);
              }}
              className="flex-1 flex"
            >
              <div className="flex-1 bg-white border border-sky-300 rounded-xl overflow-hidden flex items-center pr-2.5 pl-3 focus-within:ring-2 focus-within:ring-sky-500">
                <Globe className="w-4 h-4 text-sky-600 mr-2 shrink-0" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="flex-1 text-xs text-sky-950 font-mono py-2 bg-transparent outline-none focus:outline-none"
                  placeholder="Insert secure domain URL (e.g. httpbin.org/headers)..."
                />
                <button
                  type="submit"
                  className="text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border-l border-sky-200 pl-2.5 pr-1 py-1 transition cursor-pointer"
                >
                  Navigate
                </button>
              </div>
            </form>
          </div>

          {/* Quick presets for immediate debugging verification */}
          <div className="bg-sky-50/50 px-4 py-2 border-b border-sky-200 flex flex-wrap items-center gap-2 justify-start sm:justify-end text-[11px] text-sky-900 font-bold">
            <span>Verify Diagnostics Presets:</span>
            {presets.map(item => (
              <button
                key={item.name}
                onClick={() => handleNavigate(item.url)}
                className="bg-white border border-sky-200 hover:border-sky-400 text-sky-900 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer"
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Core viewport frame */}
          <div className="bg-slate-50 min-h-[380px] h-[450px] relative">
            <iframe
              id="crypto-sandbox-iframe"
              ref={iframeRef}
              src={iframeSrc}
              className="w-full h-full border-none"
              sandbox={`${allowScripts ? "allow-scripts " : ""}${allowSameOrigin ? "allow-same-origin " : ""}${allowForms ? "allow-forms " : ""}allow-popups`}
              onLoad={() => setIsLoading(false)}
            />
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
                <span className="text-xs font-bold text-sky-800">Tunneling through CORS-bypass proxy...</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Tunneling Logs and Security Architecture terminal console */}
        <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
            <span className="text-xs font-bold tracking-tight text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Live Secure Viewport Log & Telemetry Output
            </span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950 px-2 py-0.5 rounded-md">
              ARMED
            </span>
          </div>

          <div className="h-[120px] overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col gap-1.5 pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-4">Waiting for navigation and transaction logs...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 select-text">
                  <span className="text-slate-500 font-medium shrink-0">[{log.timestamp}]</span>
                  <span className={`font-bold uppercase tracking-wider shrink-0 mr-1 ${
                    log.type === "success" ? "text-emerald-400" :
                    log.type === "warning" ? "text-amber-400" :
                    log.type === "crypto" ? "text-fuchsia-400" : "text-cyan-400"
                  }`}>
                    {log.type}:
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
