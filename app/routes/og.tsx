import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Route } from "./+types/og";
import {
  getBlockByCodePoint,
  parseCodePoint,
} from "~/data/unicode-blocks";
import { loadCharacterName } from "~/data/unicode-names.server";
import { toHex } from "~/lib/utils";

// Load fonts at module initialization
// Try production path first (build/client/fonts), then fallback to dev path (public/fonts)
function loadFontFile(filename: string): Buffer {
  const prodPath = join(process.cwd(), "build/client/fonts", filename);
  const devPath = join(process.cwd(), "public/fonts", filename);

  if (existsSync(prodPath)) {
    return readFileSync(prodPath);
  }
  return readFileSync(devPath);
}

// Load all fonts for broad Unicode coverage
// Use Noto Serif to match the website's font-serif styling for characters
const jetBrainsMonoFont = loadFontFile("JetBrainsMono-Regular.ttf");
const notoSerifFont = loadFontFile("NotoSerif-Regular.ttf");
const notoSymbolsFont = loadFontFile("NotoSansSymbols2-Regular.ttf");

export async function loader({ params }: Route.LoaderArgs) {
  const codepoint = params.codepoint;

  if (!codepoint) {
    return new Response("Code point is required", { status: 400 });
  }

  const charCode = parseCodePoint(codepoint);

  if (charCode === null) {
    return new Response("Invalid code point format", { status: 400 });
  }

  const block = getBlockByCodePoint(charCode);

  if (!block) {
    return new Response("Character not found", { status: 404 });
  }

  const charName = loadCharacterName(block.slug, charCode);
  const hex = toHex(charCode);
  const char = String.fromCodePoint(charCode);

  // Design colors (dark theme)
  const bgColor = "#141516"; // darkzinc
  const cardBgColor = "#222325"; // darkzinc-6
  const borderColor = "#313235"; // darkzinc-12
  const oliveColor = "#87ad7a"; // olive-65
  const textColor = "#dbdde1"; // lightslate-8
  const mutedColor = "#767980"; // lightzinc-10

  // Generate SVG with Satori using JSX
  const svg = await satori(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: bgColor,
        padding: "48px",
        fontFamily: "JetBrains Mono",
      }}
    >
      {/* Main card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          backgroundColor: cardBgColor,
          border: `2px solid ${borderColor}`,
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: `2px solid ${borderColor}`,
            backgroundColor: "#1b1c1d",
          }}
        >
          {/* Terminal icon */}
          <div
            style={{
              width: "16px",
              height: "16px",
              backgroundColor: oliveColor,
              marginRight: "12px",
            }}
          />
          <span
            style={{
              color: oliveColor,
              fontSize: "18px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            INSPECTOR :: U+{hex}
          </span>
        </div>

        {/* Content area */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: "48px",
          }}
        >
          {/* Character display */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Character with dashed border */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "280px",
                height: "280px",
                border: `3px dashed ${borderColor}`,
                backgroundColor: "rgba(135, 173, 122, 0.05)",
              }}
            >
              <span
                style={{
                  fontSize: "180px",
                  color: textColor,
                  lineHeight: 1,
                  fontFamily: "Noto Symbols, Noto Serif, JetBrains Mono",
                }}
              >
                {char}
              </span>
            </div>

            {/* Character name */}
            {charName && (
              <div
                style={{
                  display: "flex",
                  marginTop: "24px",
                  fontSize: "20px",
                  color: mutedColor,
                  textAlign: "center",
                  maxWidth: "500px",
                }}
              >
                {charName}
              </div>
            )}
          </div>
        </div>

        {/* Footer bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: `2px solid ${borderColor}`,
            backgroundColor: "#1b1c1d",
          }}
        >
          <span
            style={{
              color: mutedColor,
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {block.name}
          </span>
          <span
            style={{
              color: oliveColor,
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            Unicode Explorer
          </span>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "JetBrains Mono",
          data: jetBrainsMonoFont,
          weight: 400,
          style: "normal",
        },
        {
          name: "Noto Serif",
          data: notoSerifFont,
          weight: 400,
          style: "normal",
        },
        {
          name: "Noto Symbols",
          data: notoSymbolsFont,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  // Convert SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
