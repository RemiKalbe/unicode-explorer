import type { Route } from "./+types/sitemap-block.$blockSlug[.]xml";
import { getBlockBySlug, getCharCodesForBlock } from "~/data/unicode-blocks";

// Base URL for the site
const BASE_URL = process.env.SITE_URL || "https://utf.lab.remi.boo";

export async function loader({ params }: Route.LoaderArgs) {
  const blockSlug = params.blockSlug;

  if (!blockSlug) {
    return new Response("Block slug is required", { status: 400 });
  }

  const block = getBlockBySlug(blockSlug);

  if (!block) {
    return new Response("Block not found", { status: 404 });
  }

  const lastMod = new Date().toISOString().split("T")[0];
  const charCodes = getCharCodesForBlock(block);

  // Generate sitemap XML for all characters in this block
  // Each character gets its own URL: /block/{blockSlug}/{hexCode}
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${charCodes
  .map((charCode) => {
    const hex = charCode.toString(16).toUpperCase().padStart(4, "0");
    return `  <url>
    <loc>${BASE_URL}/block/${block.slug}/${hex}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(sitemap.trim(), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=604800", // Cache for 1 week
    },
  });
}
