import { useEffect } from "react";
import { useSearchParams } from "react-router";

/**
 * Generates an SVG favicon with the given character
 */
function generateFaviconSvg(char: string): string {
  // Create SVG with the character centered
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#18181b"/>
  <text x="32" y="44" font-size="36" text-anchor="middle" fill="#fafafa" font-family="system-ui, sans-serif">${escapeXml(char)}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Updates the favicon in the document head
 */
function updateFavicon(href: string): void {
  if (typeof document === "undefined") return;

  // Find existing favicon link or create new one
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.type = "image/svg+xml";
  link.href = href;
}

/**
 * Hook that updates the favicon based on the currently selected character.
 * If a character is selected (via ?char= URL param), shows that character.
 * Otherwise, shows the letter "u" for unicode.
 */
export function useDynamicFavicon(): void {
  const [searchParams] = useSearchParams();
  const charParam = searchParams.get("char");

  useEffect(() => {
    let char = "u"; // Default to "u" for unicode

    if (charParam) {
      // Parse the hex codepoint and convert to character
      const codePoint = parseInt(charParam, 16);
      if (!isNaN(codePoint) && codePoint >= 0) {
        try {
          char = String.fromCodePoint(codePoint);
        } catch {
          // Invalid codepoint, keep default "u"
        }
      }
    }

    const faviconUrl = generateFaviconSvg(char);
    updateFavicon(faviconUrl);
  }, [charParam]);
}
