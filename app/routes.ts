import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("block/:blockSlug/:char?", "routes/block.tsx"),
  route("favorites", "routes/favorites.tsx"),
  route("og/:codepoint.png", "routes/og.tsx"),
  // SEO sitemaps
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
  route("sitemap-pages.xml", "routes/sitemap-pages[.]xml.tsx"),
  route("sitemap-block/:blockSlug.xml", "routes/sitemap-block.$blockSlug[.]xml.tsx"),
] satisfies RouteConfig;
