import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("block/:blockSlug", "routes/block.tsx"),
  route("char/:codepoint", "routes/char.tsx"),
  route("favorites", "routes/favorites.tsx"),
  route("og/:codepoint.png", "routes/og.tsx"),
] satisfies RouteConfig;
