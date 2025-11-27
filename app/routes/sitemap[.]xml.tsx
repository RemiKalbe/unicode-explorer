import type { Route } from "./+types/sitemap[.]xml";
import { UNICODE_BLOCKS } from "~/data/unicode-blocks";

// Base URL for the site - should be configured via environment variable in production
const BASE_URL = process.env.SITE_URL || "https://unicode-explorer.com";

export async function loader({}: Route.LoaderArgs) {
  const lastMod = new Date().toISOString().split("T")[0];

  // Generate sitemap index XML
  // Each Unicode block gets its own sitemap file
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main pages sitemap -->
  <sitemap>
    <loc>${BASE_URL}/sitemap-pages.xml</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>
  ${UNICODE_BLOCKS.map(
    (block) => `
  <sitemap>
    <loc>${BASE_URL}/sitemap-block/${block.slug}.xml</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>`
  ).join("")}
</sitemapindex>`;

  return new Response(sitemapIndex.trim(), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400", // Cache for 1 day
    },
  });
}
