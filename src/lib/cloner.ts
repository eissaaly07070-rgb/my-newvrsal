import JSZip from "jszip";

export interface ClonedPageAsset {
  rawUrl: string;
  localPath: string;
  type: "css" | "js" | "image";
  content?: string;
}

/**
 * Clean HTML: Strip analytics, comments, tracking pixels, ads
 */
export function cleanHtmlString(html: string): string {
  let cleaned = html;

  // 1. Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // 2. Locate and remove tracking script blocks
  // e.g. Google Analytics, Facebook Pixel, doubleclick, hotjar
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?(googletagmanager|google-analytics|connect\.facebook\.net|hotjar|analytics\.js)[\s\S]*?<\/script>/gi, "");

  // 3. Remove inline tracking pixels
  cleaned = cleaned.replace(/<img[^>]*src="[^"]*(pixel|track|doubleclick|googleads)[^"]*"[^>]*>/gi, "");

  return cleaned;
}

/**
 * Resolve relative URLs with respect to base URL
 */
export function resolveRelativeUrl(baseUrl: string, relativePath: string): string {
  try {
    const base = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
    const resolved = new URL(relativePath, base);
    return resolved.toString();
  } catch (e) {
    return relativePath;
  }
}

/**
 * Extract styles, scripts and images from clean HTML to build localized project files
 */
export async function performWebsiteClone(targetUrl: string): Promise<{
  success: boolean;
  html: string;
  css: string;
  js: string;
  size: string;
  error?: string;
}> {
  try {
    // 1. Fetch main HTML via our Express proxy
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
    if (!response.ok) {
      throw new Error(`تعذر تحميل الموقع. رمز الخطأ: ${response.status}`);
    }

    const rawHtml = await response.text();
    const cleanedHtml = cleanHtmlString(rawHtml);

    // Parse the HTML using native DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanedHtml, "text/html");

    // 2. Discover stylesheets & inline CSS
    const stylesheetLinks = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
    let consolidatedColorsText = "/* SiteClone Pro Bundled CSS */\n";
    
    // Attempt to pull external stylesheets (first 3 for performance)
    for (let i = 0; i < Math.min(stylesheetLinks.length, 3); i++) {
      const link = stylesheetLinks[i];
      const href = link?.getAttribute("href");
      if (href) {
        const fullCssUrl = resolveRelativeUrl(targetUrl, href);
        try {
          const cssRes = await fetch(`/api/proxy?url=${encodeURIComponent(fullCssUrl)}`);
          if (cssRes.ok) {
            const cssText = await cssRes.text();
            consolidatedColorsText += `\n/* Source: ${href} */\n${cssText}\n`;
            // Modify link to point locally
            link.setAttribute("href", "styles.css");
          }
        } catch {
          // Fallback if resource fetch fails due to any reason
        }
      }
    }

    // 3. Discover script blocks (first 3 for performance)
    const scriptTags = Array.from(doc.querySelectorAll("script[src]"));
    let consolidatedJsText = "/* SiteClone Pro Bundled JS */\nconsole.log('SiteClone Pro V20 initialized.');\n";

    for (let i = 0; i < Math.min(scriptTags.length, 3); i++) {
      const script = scriptTags[i];
      const src = script?.getAttribute("src");
      if (src && !src.includes("analytics") && !src.includes("pixel")) {
        const fullJsUrl = resolveRelativeUrl(targetUrl, src);
        try {
          const jsRes = await fetch(`/api/proxy?url=${encodeURIComponent(fullJsUrl)}`);
          if (jsRes.ok) {
            const jsText = await jsRes.text();
            consolidatedJsText += `\n/* Source: ${src} */\n${jsText}\n`;
            // Modify script tag to point locally
            script.setAttribute("src", "app.js");
          }
        } catch {
          // Fail gracefully
        }
      }
    }

    // Ensure we reference a local stylesheet/script if we harvested any
    if (stylesheetLinks.length > 0 && !doc.querySelector("link[href='styles.css']")) {
      const cssLink = doc.createElement("link");
      cssLink.setAttribute("rel", "stylesheet");
      cssLink.setAttribute("href", "styles.css");
      doc.head.appendChild(cssLink);
    }
    if (scriptTags.length > 0 && !doc.querySelector("script[src='app.js']")) {
      const jsScript = doc.createElement("script");
      jsScript.setAttribute("src", "app.js");
      doc.body.appendChild(jsScript);
    }

    const modifiedHtml = doc.documentElement.outerHTML;

    // Estimate file size
    const totalBytes = new Blob([modifiedHtml, consolidatedColorsText, consolidatedJsText]).size;
    const sizeKb = (totalBytes / 1024).toFixed(1);

    return {
      success: true,
      html: modifiedHtml,
      css: consolidatedColorsText,
      js: consolidatedJsText,
      size: `${sizeKb} KB`
    };
  } catch (err: any) {
    console.error("Cloning error:", err);
    return {
      success: false,
      html: "",
      css: "",
      js: "",
      size: "0 KB",
      error: err?.message || String(err)
    };
  }
}

/**
 * Trigger browser zip download using JSZip
 */
export async function downloadCloneAsZip(clone: { name: string; html: string; css: string; js: string }) {
  const zip = new JSZip();

  // Add files to the archive
  zip.file("index.html", clone.html);
  zip.file("styles.css", clone.css);
  zip.file("app.js", clone.js);

  // Generate ZIP file
  const content = await zip.generateAsync({ type: "blob" });
  
  // Custom anchor download trigger
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clone.name.replace(/\s+/g, "_")}_siteclone_pro.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
