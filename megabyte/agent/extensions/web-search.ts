/**
 * megabyte extension: web_search
 * Search DuckDuckGo (no API key) and return real results (title, URL, snippet).
 * Ported from the Python megabyte tool; tries the HTML endpoint, falls back to lite.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const PARAMS = Type.Object({
  query: Type.String({ description: "What to search" }),
  n: Type.Optional(Type.Number({ description: "How many results (default 5)" })),
});

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function clean(t: string): string {
  return t
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function realUrl(u: string): string {
  const m = u.match(/uddg=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : u;
}

function parseHtml(html: string, n: number): string[] {
  const re = /<a rel="nofollow" class="result__a" href="(.*?)".*?>(.*?)<\/a>/gs;
  const snips = [...html.matchAll(/class="result__snippet".*?>(.*?)<\/a>/gs)].map((m) => clean(m[1]));
  const out: string[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html)) && i < n) {
    out.push(`${i + 1}. ${clean(m[2])}\n   ${realUrl(m[1])}\n   ${snips[i] ?? ""}`);
    i++;
  }
  return out;
}

function parseLite(html: string, n: number): string[] {
  let links = [...html.matchAll(/<a[^>]*class="result-link"[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gs)];
  if (links.length === 0) {
    links = [...html.matchAll(/<a[^>]*href="(http[^"]+)"[^>]*>(.*?)<\/a>/gs)];
  }
  const out: string[] = [];
  for (const m of links.slice(0, n)) {
    const title = clean(m[2]);
    if (title) out.push(`${out.length + 1}. ${title}\n   ${realUrl(m[1])}`);
  }
  return out;
}

export default function webSearch(pi: ExtensionAPI) {
  pi.on("session_start", () => {
    pi.registerTool({
      name: "web_search",
      label: "Web search",
      description:
        "Search the web and return real results (title, URL, snippet). Use it to " +
        "research current facts before opening a page.",
      parameters: PARAMS,
      async execute(_id: string, params: { query: string; n?: number }) {
        const n = params.n ?? 5;
        // 1) HTML endpoint.
        try {
          const r = await fetch("https://html.duckduckgo.com/html/", {
            method: "POST",
            headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ q: params.query }),
          });
          const results = parseHtml(await r.text(), n);
          if (results.length) return { content: [{ type: "text", text: results.join("\n") }] };
        } catch {
          // fall through to the lite endpoint
        }
        // 2) Fallback: lite endpoint (different markup, often not blocked).
        try {
          const r = await fetch("https://lite.duckduckgo.com/lite/?" + new URLSearchParams({ q: params.query }), {
            headers: { "User-Agent": UA },
          });
          const results = parseLite(await r.text(), n);
          if (results.length) return { content: [{ type: "text", text: results.join("\n") }] };
        } catch (e) {
          return { content: [{ type: "text", text: `ERROR while searching: ${String(e)}` }] };
        }
        return {
          content: [
            { type: "text", text: "(no results; the engine may have blocked the request — retry or open a source)" },
          ],
        };
      },
    });
  });
}
