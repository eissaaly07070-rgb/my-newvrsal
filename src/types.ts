/**
 * Types definition for SiteClone Pro v20.0.0
 */

export interface WebsiteClone {
  id: string;
  url: string;
  name: string;
  html: string;
  css: string;
  js: string;
  createdAt: number;
  status: "idle" | "cloning" | "success" | "error";
  size?: string;
  notes?: string;
}

export interface WebsiteMonitor {
  id: string;
  name: string;
  url: string;
  interval: "30s" | "1m" | "5m" | "15m" | "1h";
  status: "up" | "down" | "slow" | "unknown";
  lastCheck?: number;
  responseTime?: number; // in ms
  history: Array<{
    timestamp: number;
    status: "up" | "down" | "slow";
    responseTime: number;
    code: number;
  }>;
}

export interface EncryptedKey {
  id: string;
  name: string;
  type: string; // e.g. OpenAI, Stripe, Cloudflare
  value: string; // encrypted or masked
  expiry: string;
  status: "active" | "warning" | "expired" | "limited";
  group: "primary" | "backup";
  lastTested?: number;
}

export interface EmailAccount {
  id: string;
  provider: string; // Gmail, ProtonMail, Outlook, Yahoo etc.
  email: string;
  password?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  status: "active" | "attention" | "compromised";
  lastChecked?: number;
  category: "personal" | "work" | "dev" | "throwaway";
  faStatus: boolean; // 2FA enabled
  passwordHealth: "good" | "weak" | "leaked";
}

export interface BuiltSite {
  id: string;
  name: string;
  url: string;
  platform: string; // Vercel, Netlify, GitHub Pages, etc.
  status: "live" | "dev" | "staging" | "archived" | "down";
  deployUrl: string;
  repoUrl?: string;
  lastDeploy: number;
  domain?: string;
  analytics: {
    pageViews: number;
    uptimePercentage: number;
  };
  ownerEmail?: string;
}

export interface PlatformAccount {
  id: string;
  platform: string; // Vercel, Heroku, etc.
  username: string;
  email: string;
  password?: string;
  status: "active" | "inactive";
  lastLogin?: number;
  totpSecret?: string;
  activeSessions: number;
}

export interface WorkflowNode {
  id: string;
  type: "trigger" | "fetch" | "parse" | "condition" | "notify" | "deploy" | "delay";
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface WorkflowConnection {
  fromId: string;
  toId: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: "active" | "paused";
  description: string;
  lastExecuted?: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  status: "success" | "warning" | "danger";
}

export interface CloudPlatform {
  id: string;
  name: string;
  category: "ai" | "ide" | "database" | "deployment" | "monitoring" | "workflows" | "email";
  url: string;
  consoleUrl: string;
  description: string;
  freeLimit: string;
  isFavorite?: boolean;
}

export interface AppSettings {
  encryptionPassword?: string;
  vibrationEnabled: boolean;
  theme: "sky" | "dark" | "light";
  autoBackup: boolean;
  cloudSync: boolean;
}
