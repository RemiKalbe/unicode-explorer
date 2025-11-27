import type { Route } from "./+types/sitemap-pages[.]xml";
import { UNICODE_BLOCKS } from "~/data/unicode-blocks";

// Base URL for the site
const BASE_URL = process.env.SITE_URL || "https://unicode-explorer.com";

export async function loader({}: Route.LoaderArgs) {
  const lastMod = new Date().toISOString().split("T")[0];

  // Generate sitemap for main pages (blocks and favorites)
  const urls = [
    // Home page (redirects to first block, but good to have)
    { loc: "/", priority: "1.0", changefreq: "monthly" },
    // Favorites page
    { loc: "/favorites", priority: "0.5", changefreq: "monthly" },
    // All block pages (high priority as main navigation)
    ...UNICODE_BLOCKS.map((block) => ({
      loc: `/block/${block.slug}`,
      priority: "0.8",
      changefreq: "monthly",
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${BASE_URL}${url.loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap.trim(), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400", // Cache for 1 day
    },
  });
}
