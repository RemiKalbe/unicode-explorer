import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { UNICODE_BLOCKS } from "~/data/unicode-blocks";

export function loader({}: Route.LoaderArgs) {
  // Redirect to the first unicode block
  const firstBlock = UNICODE_BLOCKS[0];
  return redirect(`/block/${firstBlock.slug}`);
}

export default function Home() {
  // This won't render due to redirect, but TypeScript requires it
  return null;
}
