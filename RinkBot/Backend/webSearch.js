import dotenv from "dotenv";
import logger from "./logger.js";
dotenv.config();

// IMPORTANTE: ENABLED y SERPAPI_KEY se leen dentro de la función, no al cargar
// el módulo. En ESM los módulos se evalúan antes de que dotenv.config() corra
// en server.js, por lo que las constantes top-level quedarían congeladas como
// undefined/false. Leer desde process.env en cada llamada resuelve el problema.

/**
 * Busca en Google vía SerpAPI y devuelve hasta 5 snippets.
 * Devuelve [] silenciosamente si falla o está desactivado.
 * @param {string} query
 * @returns {Promise<{title: string, snippet: string, url: string}[]>}
 */
export async function searchWeb(query) {
  const ENABLED = (process.env.WEB_SEARCH_ENABLED || "false") === "true";
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!ENABLED || !SERPAPI_KEY) return [];
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=5&engine=google`;
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn({ status: res.status }, "serpapi error");
      return [];
    }
    const data = await res.json();
    return (data.organic_results || []).slice(0, 5).map((item) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
    }));
  } catch (e) {
    logger.warn({ err: e.message }, "web search failed, continuing without results");
    return [];
  }
}
