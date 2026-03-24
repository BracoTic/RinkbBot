import dotenv from "dotenv";
dotenv.config();

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const ENABLED = (process.env.WEB_SEARCH_ENABLED || "false") === "true";

/**
 * Busca en Google vía SerpAPI y devuelve hasta 5 snippets.
 * Devuelve [] silenciosamente si falla o está desactivado.
 * @param {string} query
 * @returns {Promise<{title: string, snippet: string, url: string}[]>}
 */
export async function searchWeb(query) {
  if (!ENABLED || !SERPAPI_KEY) return [];
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=5&engine=google`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️  SerpAPI error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return (data.organic_results || []).slice(0, 5).map((item) => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
    }));
  } catch (e) {
    console.warn("⚠️  Web search falló, continuando sin resultados web:", e.message);
    return [];
  }
}
