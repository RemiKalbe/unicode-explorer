/**
 * Build script to download and process Unicode Character Database (UCD) XML
 * Outputs JSON files per Unicode block with character name mappings
 *
 * Usage: npx tsx scripts/build-unicode-data.ts
 *
 * Reference: https://www.unicode.org/reports/tr42/
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(PROJECT_ROOT, "public", "unicode-data");
const CACHE_DIR = join(PROJECT_ROOT, ".unicode-cache");

// UCD XML download URL (flat version without Unihan - smaller and easier to parse)
const UCD_URL = "https://www.unicode.org/Public/UCD/latest/ucdxml/ucd.nounihan.flat.zip";

// Import block definitions to match slugs
const UNICODE_BLOCKS_RAW = [
  // --- LATIN & WESTERN ---
  { name: "Basic Latin (ASCII)", start: 0x0000, end: 0x007f, cat: "Latin" },
  { name: "Latin-1 Supplement", start: 0x0080, end: 0x00ff, cat: "Latin" },
  { name: "Latin Extended-A", start: 0x0100, end: 0x017f, cat: "Latin" },
  { name: "Latin Extended-B", start: 0x0180, end: 0x024f, cat: "Latin" },
  { name: "IPA Extensions", start: 0x0250, end: 0x02af, cat: "Latin" },
  { name: "Spacing Modifier Letters", start: 0x02b0, end: 0x02ff, cat: "Latin" },
  { name: "Combining Diacritical Marks", start: 0x0300, end: 0x036f, cat: "Latin" },
  // --- EUROPEAN & MIDDLE EASTERN ---
  { name: "Greek and Coptic", start: 0x0370, end: 0x03ff, cat: "European" },
  { name: "Cyrillic", start: 0x0400, end: 0x04ff, cat: "European" },
  { name: "Cyrillic Supplement", start: 0x0500, end: 0x052f, cat: "European" },
  { name: "Armenian", start: 0x0530, end: 0x058f, cat: "European" },
  { name: "Hebrew", start: 0x0590, end: 0x05ff, cat: "Middle East" },
  { name: "Arabic", start: 0x0600, end: 0x06ff, cat: "Middle East" },
  { name: "Syriac", start: 0x0700, end: 0x074f, cat: "Middle East" },
  { name: "Arabic Supplement", start: 0x0750, end: 0x077f, cat: "Middle East" },
  { name: "Thaana", start: 0x0780, end: 0x07bf, cat: "Middle East" },
  { name: "NKo", start: 0x07c0, end: 0x07ff, cat: "Africa" },
  // --- ASIAN ---
  { name: "Devanagari", start: 0x0900, end: 0x097f, cat: "South Asia" },
  { name: "Bengali", start: 0x0980, end: 0x09ff, cat: "South Asia" },
  { name: "Gurmukhi", start: 0x0a00, end: 0x0a7f, cat: "South Asia" },
  { name: "Gujarati", start: 0x0a80, end: 0x0aff, cat: "South Asia" },
  { name: "Oriya", start: 0x0b00, end: 0x0b7f, cat: "South Asia" },
  { name: "Tamil", start: 0x0b80, end: 0x0bff, cat: "South Asia" },
  { name: "Telugu", start: 0x0c00, end: 0x0c7f, cat: "South Asia" },
  { name: "Kannada", start: 0x0c80, end: 0x0cff, cat: "South Asia" },
  { name: "Malayalam", start: 0x0d00, end: 0x0d7f, cat: "South Asia" },
  { name: "Sinhala", start: 0x0d80, end: 0x0dff, cat: "South Asia" },
  { name: "Thai", start: 0x0e00, end: 0x0e7f, cat: "SE Asia" },
  { name: "Lao", start: 0x0e80, end: 0x0eff, cat: "SE Asia" },
  { name: "Tibetan", start: 0x0f00, end: 0x0fff, cat: "SE Asia" },
  { name: "Myanmar", start: 0x1000, end: 0x109f, cat: "SE Asia" },
  { name: "Georgian", start: 0x10a0, end: 0x10ff, cat: "European" },
  { name: "Hangul Jamo", start: 0x1100, end: 0x11ff, cat: "East Asia" },
  { name: "Ethiopic", start: 0x1200, end: 0x137f, cat: "Africa" },
  { name: "Cherokee", start: 0x13a0, end: 0x13ff, cat: "American" },
  { name: "Unified Canadian Aboriginal", start: 0x1400, end: 0x167f, cat: "American" },
  { name: "Ogham", start: 0x1680, end: 0x169f, cat: "Historic" },
  { name: "Runic", start: 0x16a0, end: 0x16ff, cat: "Historic" },
  { name: "Tagalog", start: 0x1700, end: 0x171f, cat: "SE Asia" },
  { name: "Khmer", start: 0x1780, end: 0x17ff, cat: "SE Asia" },
  { name: "Mongolian", start: 0x1800, end: 0x18af, cat: "East Asia" },
  { name: "Phonetic Extensions", start: 0x1d00, end: 0x1d7f, cat: "Language" },
  { name: "Latin Extended Additional", start: 0x1e00, end: 0x1eff, cat: "Latin" },
  { name: "Greek Extended", start: 0x1f00, end: 0x1fff, cat: "European" },
  // --- SYMBOLS & PUNCTUATION ---
  { name: "General Punctuation", start: 0x2000, end: 0x206f, cat: "Symbols" },
  { name: "Superscripts and Subscripts", start: 0x2070, end: 0x209f, cat: "Symbols" },
  { name: "Currency Symbols", start: 0x20a0, end: 0x20cf, cat: "Symbols" },
  { name: "Combining Diacritical Marks for Symbols", start: 0x20d0, end: 0x20ff, cat: "Symbols" },
  { name: "Letterlike Symbols", start: 0x2100, end: 0x214f, cat: "Symbols" },
  { name: "Number Forms", start: 0x2150, end: 0x218f, cat: "Symbols" },
  { name: "Arrows", start: 0x2190, end: 0x21ff, cat: "Arrows" },
  { name: "Mathematical Operators", start: 0x2200, end: 0x22ff, cat: "Math" },
  { name: "Miscellaneous Technical", start: 0x2300, end: 0x23ff, cat: "Tech" },
  { name: "Control Pictures", start: 0x2400, end: 0x243f, cat: "Tech" },
  { name: "OCR", start: 0x2440, end: 0x245f, cat: "Tech" },
  { name: "Enclosed Alphanumerics", start: 0x2460, end: 0x24ff, cat: "Symbols" },
  { name: "Box Drawing", start: 0x2500, end: 0x257f, cat: "Shapes" },
  { name: "Block Elements", start: 0x2580, end: 0x259f, cat: "Shapes" },
  { name: "Geometric Shapes", start: 0x25a0, end: 0x25ff, cat: "Shapes" },
  { name: "Miscellaneous Symbols", start: 0x2600, end: 0x26ff, cat: "Symbols" },
  { name: "Dingbats", start: 0x2700, end: 0x27bf, cat: "Symbols" },
  { name: "Misc Mathematical Symbols-A", start: 0x27c0, end: 0x27ef, cat: "Math" },
  { name: "Supplemental Arrows-A", start: 0x27f0, end: 0x27ff, cat: "Arrows" },
  { name: "Braille Patterns", start: 0x2800, end: 0x28ff, cat: "Language" },
  { name: "Supplemental Arrows-B", start: 0x2900, end: 0x297f, cat: "Arrows" },
  { name: "Misc Mathematical Symbols-B", start: 0x2980, end: 0x29ff, cat: "Math" },
  { name: "Supplemental Math Operators", start: 0x2a00, end: 0x2aff, cat: "Math" },
  { name: "Misc Symbols and Arrows", start: 0x2b00, end: 0x2bff, cat: "Arrows" },
  // --- CJK (MASSIVE BLOCKS) ---
  { name: "CJK Radicals Supplement", start: 0x2e80, end: 0x2eff, cat: "East Asia" },
  { name: "Kangxi Radicals", start: 0x2f00, end: 0x2fdf, cat: "East Asia" },
  { name: "Ideographic Description", start: 0x2ff0, end: 0x2fff, cat: "East Asia" },
  { name: "CJK Symbols and Punctuation", start: 0x3000, end: 0x303f, cat: "East Asia" },
  { name: "Hiragana", start: 0x3040, end: 0x309f, cat: "East Asia" },
  { name: "Katakana", start: 0x30a0, end: 0x30ff, cat: "East Asia" },
  { name: "Bopomofo", start: 0x3100, end: 0x312f, cat: "East Asia" },
  { name: "Hangul Compatibility Jamo", start: 0x3130, end: 0x318f, cat: "East Asia" },
  { name: "Kanbun", start: 0x3190, end: 0x319f, cat: "East Asia" },
  { name: "Bopomofo Extended", start: 0x31a0, end: 0x31bf, cat: "East Asia" },
  { name: "CJK Strokes", start: 0x31c0, end: 0x31ef, cat: "East Asia" },
  { name: "Katakana Phonetic Ext", start: 0x31f0, end: 0x31ff, cat: "East Asia" },
  { name: "Enclosed CJK Letters", start: 0x3200, end: 0x32ff, cat: "East Asia" },
  { name: "CJK Compatibility", start: 0x3300, end: 0x33ff, cat: "East Asia" },
  { name: "CJK Unified Ideographs Ext-A", start: 0x3400, end: 0x4dbf, cat: "East Asia" },
  { name: "Hexagram Symbols", start: 0x4dc0, end: 0x4dff, cat: "Symbols" },
  { name: "CJK Unified Ideographs", start: 0x4e00, end: 0x9fff, cat: "East Asia" },
  { name: "Yi Syllables", start: 0xa000, end: 0xa48f, cat: "East Asia" },
  { name: "Yi Radicals", start: 0xa490, end: 0xa4cf, cat: "East Asia" },
  // --- MODERN & SPECIAL ---
  { name: "Hangul Syllables", start: 0xac00, end: 0xd7af, cat: "East Asia" },
  { name: "Private Use Area", start: 0xe000, end: 0xf8ff, cat: "Other" },
  { name: "CJK Compatibility Ideographs", start: 0xf900, end: 0xfaff, cat: "East Asia" },
  { name: "Alphabetic Presentation Forms", start: 0xfb00, end: 0xfb4f, cat: "Symbols" },
  { name: "Arabic Presentation Forms-A", start: 0xfb50, end: 0xfdff, cat: "Middle East" },
  { name: "Variation Selectors", start: 0xfe00, end: 0xfe0f, cat: "Tech" },
  { name: "Vertical Forms", start: 0xfe10, end: 0xfe1f, cat: "Tech" },
  { name: "Combining Half Marks", start: 0xfe20, end: 0xfe2f, cat: "Symbols" },
  { name: "CJK Compatibility Forms", start: 0xfe30, end: 0xfe4f, cat: "East Asia" },
  { name: "Small Form Variants", start: 0xfe50, end: 0xfe6f, cat: "Symbols" },
  { name: "Arabic Presentation Forms-B", start: 0xfe70, end: 0xfeff, cat: "Middle East" },
  { name: "Halfwidth and Fullwidth Forms", start: 0xff00, end: 0xffef, cat: "East Asia" },
  { name: "Specials", start: 0xfff0, end: 0xffff, cat: "Tech" },
  // --- SUPPLEMENTARY PLANES (EMOJI, MATH, HISTORIC) ---
  { name: "Linear B Syllabary", start: 0x10000, end: 0x1007f, cat: "Historic" },
  { name: "Ancient Greek Numbers", start: 0x10140, end: 0x1018f, cat: "Historic" },
  { name: "Phaistos Disc", start: 0x101d0, end: 0x101ff, cat: "Historic" },
  { name: "Mahjong Tiles", start: 0x1f000, end: 0x1f02f, cat: "Game" },
  { name: "Domino Tiles", start: 0x1f030, end: 0x1f09f, cat: "Game" },
  { name: "Playing Cards", start: 0x1f0a0, end: 0x1f0ff, cat: "Game" },
  { name: "Enclosed Alphanumeric Suppl", start: 0x1f100, end: 0x1f1ff, cat: "Symbols" },
  { name: "Enclosed Ideographic Suppl", start: 0x1f200, end: 0x1f2ff, cat: "East Asia" },
  { name: "Misc Symbols and Pictographs", start: 0x1f300, end: 0x1f5ff, cat: "Emoji" },
  { name: "Emoticons (Emoji)", start: 0x1f600, end: 0x1f64f, cat: "Emoji" },
  { name: "Ornamental Dingbats", start: 0x1f650, end: 0x1f67f, cat: "Symbols" },
  { name: "Transport and Map Symbols", start: 0x1f680, end: 0x1f6ff, cat: "Emoji" },
  { name: "Alchemical Symbols", start: 0x1f700, end: 0x1f77f, cat: "Symbols" },
  { name: "Geometric Shapes Extended", start: 0x1f780, end: 0x1f7ff, cat: "Shapes" },
  { name: "Supplemental Arrows-C", start: 0x1f800, end: 0x1f8ff, cat: "Arrows" },
  { name: "Supplemental Symbols and Pictographs", start: 0x1f900, end: 0x1f9ff, cat: "Emoji" },
  { name: "Chess Symbols", start: 0x1fa00, end: 0x1fa6f, cat: "Game" },
  { name: "Symbols and Pictographs Extended-A", start: 0x1fa70, end: 0x1faff, cat: "Emoji" },
] as const;

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const UNICODE_BLOCKS = UNICODE_BLOCKS_RAW.map((block) => ({
  ...block,
  slug: createSlug(block.name),
}));

// Map to find which block a code point belongs to
function findBlockForCodePoint(cp: number): (typeof UNICODE_BLOCKS)[number] | undefined {
  return UNICODE_BLOCKS.find((block) => cp >= block.start && cp <= block.end);
}

// Hangul syllable name generation (algorithmic)
// Reference: https://www.unicode.org/versions/Unicode15.0.0/ch03.pdf (section 3.12)
const HANGUL_SYLLABLE_BASE = 0xac00;
const HANGUL_LEAD_BASE = 0x1100;
const HANGUL_VOWEL_BASE = 0x1161;
const HANGUL_TRAIL_BASE = 0x11a7;
const HANGUL_LEAD_COUNT = 19;
const HANGUL_VOWEL_COUNT = 21;
const HANGUL_TRAIL_COUNT = 28;
const HANGUL_N_COUNT = HANGUL_VOWEL_COUNT * HANGUL_TRAIL_COUNT; // 588
const HANGUL_S_COUNT = HANGUL_LEAD_COUNT * HANGUL_N_COUNT; // 11172

const JAMO_L_TABLE = [
  "G", "GG", "N", "D", "DD", "R", "M", "B", "BB",
  "S", "SS", "", "J", "JJ", "C", "K", "T", "P", "H",
];
const JAMO_V_TABLE = [
  "A", "AE", "YA", "YAE", "EO", "E", "YEO", "YE", "O",
  "WA", "WAE", "OE", "YO", "U", "WEO", "WE", "WI",
  "YU", "EU", "YI", "I",
];
const JAMO_T_TABLE = [
  "", "G", "GG", "GS", "N", "NJ", "NH", "D", "L", "LG", "LM",
  "LB", "LS", "LT", "LP", "LH", "M", "B", "BS",
  "S", "SS", "NG", "J", "C", "K", "T", "P", "H",
];

function getHangulSyllableName(cp: number): string {
  const syllableIndex = cp - HANGUL_SYLLABLE_BASE;
  const leadIndex = Math.floor(syllableIndex / HANGUL_N_COUNT);
  const vowelIndex = Math.floor((syllableIndex % HANGUL_N_COUNT) / HANGUL_TRAIL_COUNT);
  const trailIndex = syllableIndex % HANGUL_TRAIL_COUNT;

  return `HANGUL SYLLABLE ${JAMO_L_TABLE[leadIndex]}${JAMO_V_TABLE[vowelIndex]}${JAMO_T_TABLE[trailIndex]}`;
}

// Check if a code point is a Hangul syllable
function isHangulSyllable(cp: number): boolean {
  return cp >= HANGUL_SYLLABLE_BASE && cp < HANGUL_SYLLABLE_BASE + HANGUL_S_COUNT;
}

// Check if a code point is a CJK Unified Ideograph (names are algorithmic)
function isCJKUnifiedIdeograph(cp: number): boolean {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Unified Ideographs Extension A
    (cp >= 0x20000 && cp <= 0x2a6df) || // Extension B
    (cp >= 0x2a700 && cp <= 0x2b73f) || // Extension C
    (cp >= 0x2b740 && cp <= 0x2b81f) || // Extension D
    (cp >= 0x2b820 && cp <= 0x2ceaf) || // Extension E
    (cp >= 0x2ceb0 && cp <= 0x2ebef) || // Extension F
    (cp >= 0x30000 && cp <= 0x3134f) || // Extension G
    (cp >= 0x31350 && cp <= 0x323af)    // Extension H
  );
}

function getCJKUnifiedIdeographName(cp: number): string {
  return `CJK UNIFIED IDEOGRAPH-${cp.toString(16).toUpperCase()}`;
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`Downloading ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(destPath, Buffer.from(arrayBuffer));
  console.log(`Downloaded to ${destPath}`);
}

async function unzipFile(zipPath: string, destDir: string): Promise<string> {
  console.log(`Extracting ${zipPath}...`);

  // Use unzip command (available on most systems)
  const { execSync } = await import("node:child_process");

  try {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: "pipe" });
  } catch {
    // Try with jar if unzip not available
    execSync(`jar xf "${zipPath}"`, { cwd: destDir, stdio: "pipe" });
  }

  // Find the XML file
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(destDir);
  const xmlFile = files.find((f) => f.endsWith(".xml"));

  if (!xmlFile) {
    throw new Error("No XML file found in archive");
  }

  const xmlPath = join(destDir, xmlFile);
  console.log(`Extracted ${xmlFile}`);
  return xmlPath;
}

interface CharacterData {
  [codePoint: string]: string; // hex code point -> character name
}

async function parseUCDXml(xmlPath: string): Promise<Map<string, CharacterData>> {
  console.log("Parsing UCD XML (this may take a moment)...");

  const xml = readFileSync(xmlPath, "utf-8");

  // Use regex-based parsing for better performance with large XML
  // The flat XML format has <char> elements with cp and na attributes
  const charRegex = /<char[^>]+>/g;
  const cpRegex = /\bcp="([0-9A-Fa-f]+)"/;
  const naRegex = /\bna="([^"]*)"/;
  const na1Regex = /\bna1="([^"]*)"/; // Unicode 1.0 name (fallback)

  // Initialize block data maps
  const blockDataMap = new Map<string, CharacterData>();
  for (const block of UNICODE_BLOCKS) {
    blockDataMap.set(block.slug, {});
  }

  let charCount = 0;
  let match: RegExpExecArray | null;

  while ((match = charRegex.exec(xml)) !== null) {
    const charElement = match[0];

    const cpMatch = cpRegex.exec(charElement);
    if (!cpMatch) continue;

    const cp = parseInt(cpMatch[1], 16);
    let name = "";

    // Get character name
    const naMatch = naRegex.exec(charElement);
    const na1Match = na1Regex.exec(charElement);

    if (naMatch && naMatch[1]) {
      name = naMatch[1];
      // Handle algorithmic names (contain #)
      if (name.includes("#")) {
        name = name.replace(/#/g, cpMatch[1].toUpperCase());
      }
    } else if (na1Match && na1Match[1]) {
      // Fallback to Unicode 1.0 name
      name = na1Match[1];
    }

    // Generate algorithmic names for special ranges
    if (!name) {
      if (isHangulSyllable(cp)) {
        name = getHangulSyllableName(cp);
      } else if (isCJKUnifiedIdeograph(cp)) {
        name = getCJKUnifiedIdeographName(cp);
      }
    }

    // Skip if no name (control characters, etc.)
    if (!name) continue;

    // Find the block this character belongs to
    const block = findBlockForCodePoint(cp);
    if (block) {
      const blockData = blockDataMap.get(block.slug);
      if (blockData) {
        blockData[cpMatch[1].toUpperCase()] = name;
        charCount++;
      }
    }
  }

  console.log(`Parsed ${charCount.toLocaleString()} characters`);
  return blockDataMap;
}

async function generateAlgorithmicNames(blockDataMap: Map<string, CharacterData>): Promise<void> {
  console.log("Generating algorithmic names for special blocks...");

  // Generate Hangul syllable names
  const hangulBlock = UNICODE_BLOCKS.find((b) => b.slug === "hangul-syllables");
  if (hangulBlock) {
    const hangulData = blockDataMap.get(hangulBlock.slug) || {};
    for (let cp = hangulBlock.start; cp <= hangulBlock.end; cp++) {
      if (isHangulSyllable(cp)) {
        const hex = cp.toString(16).toUpperCase();
        if (!hangulData[hex]) {
          hangulData[hex] = getHangulSyllableName(cp);
        }
      }
    }
    blockDataMap.set(hangulBlock.slug, hangulData);
    console.log(`Generated ${Object.keys(hangulData).length.toLocaleString()} Hangul syllable names`);
  }

  // Generate CJK Unified Ideograph names
  for (const block of UNICODE_BLOCKS) {
    if (block.name.includes("CJK Unified Ideograph")) {
      const cjkData = blockDataMap.get(block.slug) || {};
      let generated = 0;
      for (let cp = block.start; cp <= block.end; cp++) {
        if (isCJKUnifiedIdeograph(cp)) {
          const hex = cp.toString(16).toUpperCase();
          if (!cjkData[hex]) {
            cjkData[hex] = getCJKUnifiedIdeographName(cp);
            generated++;
          }
        }
      }
      blockDataMap.set(block.slug, cjkData);
      if (generated > 0) {
        console.log(`Generated ${generated.toLocaleString()} names for ${block.name}`);
      }
    }
  }
}

async function writeBlockFiles(blockDataMap: Map<string, CharacterData>): Promise<void> {
  console.log(`Writing JSON files to ${OUTPUT_DIR}...`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalChars = 0;
  let filesWritten = 0;

  for (const [slug, data] of blockDataMap) {
    const charCount = Object.keys(data).length;
    if (charCount === 0) continue;

    const filePath = join(OUTPUT_DIR, `${slug}.json`);
    writeFileSync(filePath, JSON.stringify(data));

    totalChars += charCount;
    filesWritten++;
  }

  console.log(`Wrote ${filesWritten} files with ${totalChars.toLocaleString()} total character names`);
}

async function main(): Promise<void> {
  console.log("=== Unicode Character Data Build Script ===\n");

  // Create cache directory
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  const zipPath = join(CACHE_DIR, "ucd.nounihan.flat.zip");

  // Download if not cached
  if (!existsSync(zipPath)) {
    await downloadFile(UCD_URL, zipPath);
  } else {
    console.log("Using cached UCD XML archive");
  }

  // Extract
  const xmlPath = await unzipFile(zipPath, CACHE_DIR);

  // Parse XML
  const blockDataMap = await parseUCDXml(xmlPath);

  // Generate algorithmic names for blocks that need them
  await generateAlgorithmicNames(blockDataMap);

  // Write output files
  await writeBlockFiles(blockDataMap);

  console.log("\n=== Build complete! ===");
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
