/**
 * Font conversion script for Unicode Explorer
 * Converts WOFF2 fonts from fontsource to TTF for use with Satori
 */

const fs = require('fs');
const path = require('path');
const wawoff2 = require('wawoff2');

const FONTS_DIR = path.join(__dirname, '../public/fonts');
const NODE_MODULES = path.join(__dirname, '../node_modules/@fontsource');

// Font packages and their main subset files
// For most fonts, we want the main script subset with weight 400
const FONT_CONFIGS = [
  // Latin/European (noto-sans covers latin, greek, cyrillic)
  { package: 'noto-sans', subsets: ['latin', 'latin-ext', 'greek', 'greek-ext', 'cyrillic', 'cyrillic-ext', 'vietnamese'], output: 'NotoSans' },

  // Middle East
  { package: 'noto-sans-arabic', subsets: ['arabic'], output: 'NotoSansArabic' },
  { package: 'noto-sans-hebrew', subsets: ['hebrew'], output: 'NotoSansHebrew' },
  { package: 'noto-sans-syriac', subsets: ['syriac'], output: 'NotoSansSyriac' },
  { package: 'noto-sans-thaana', subsets: ['thaana'], output: 'NotoSansThaana' },

  // South Asia
  { package: 'noto-sans-devanagari', subsets: ['devanagari'], output: 'NotoSansDevanagari' },
  { package: 'noto-sans-bengali', subsets: ['bengali'], output: 'NotoSansBengali' },
  { package: 'noto-sans-gurmukhi', subsets: ['gurmukhi'], output: 'NotoSansGurmukhi' },
  { package: 'noto-sans-gujarati', subsets: ['gujarati'], output: 'NotoSansGujarati' },
  { package: 'noto-sans-oriya', subsets: ['oriya'], output: 'NotoSansOriya' },
  { package: 'noto-sans-tamil', subsets: ['tamil'], output: 'NotoSansTamil' },
  { package: 'noto-sans-telugu', subsets: ['telugu'], output: 'NotoSansTelugu' },
  { package: 'noto-sans-kannada', subsets: ['kannada'], output: 'NotoSansKannada' },
  { package: 'noto-sans-malayalam', subsets: ['malayalam'], output: 'NotoSansMalayalam' },
  { package: 'noto-sans-sinhala', subsets: ['sinhala'], output: 'NotoSansSinhala' },

  // SE Asia
  { package: 'noto-sans-thai', subsets: ['thai'], output: 'NotoSansThai' },
  { package: 'noto-sans-lao', subsets: ['lao'], output: 'NotoSansLao' },
  { package: 'noto-sans-myanmar', subsets: ['myanmar'], output: 'NotoSansMyanmar' },
  { package: 'noto-sans-khmer', subsets: ['khmer'], output: 'NotoSansKhmer' },
  { package: 'noto-sans-tagalog', subsets: ['tagalog'], output: 'NotoSansTagalog' },

  // East Asia (non-CJK)
  { package: 'noto-sans-mongolian', subsets: ['mongolian'], output: 'NotoSansMongolian' },
  { package: 'noto-sans-yi', subsets: ['yi'], output: 'NotoSansYi' },

  // European
  { package: 'noto-sans-armenian', subsets: ['armenian'], output: 'NotoSansArmenian' },
  { package: 'noto-sans-georgian', subsets: ['georgian'], output: 'NotoSansGeorgian' },

  // Africa
  { package: 'noto-sans-ethiopic', subsets: ['ethiopic'], output: 'NotoSansEthiopic' },
  { package: 'noto-sans-nko', subsets: ['nko'], output: 'NotoSansNKo' },

  // Americas
  { package: 'noto-sans-cherokee', subsets: ['cherokee'], output: 'NotoSansCherokee' },
  { package: 'noto-sans-canadian-aboriginal', subsets: ['canadian-aboriginal'], output: 'NotoSansCanadianAboriginal' },

  // Historic
  { package: 'noto-sans-ogham', subsets: ['ogham'], output: 'NotoSansOgham' },
  { package: 'noto-sans-runic', subsets: ['runic'], output: 'NotoSansRunic' },
  { package: 'noto-sans-linear-b', subsets: ['linear-b'], output: 'NotoSansLinearB' },

  // Symbols
  { package: 'noto-sans-symbols', subsets: ['symbols'], output: 'NotoSansSymbols' },
  { package: 'noto-sans-symbols-2', subsets: ['symbols'], output: 'NotoSansSymbols2' },
  { package: 'noto-sans-math', subsets: ['math'], output: 'NotoSansMath' },
  { package: 'noto-emoji', subsets: ['emoji'], output: 'NotoEmoji' },
];

// CJK fonts need special handling - all numbered subsets
const CJK_FONTS = [
  { package: 'noto-sans-jp', output: 'NotoSansJP' },
  { package: 'noto-sans-sc', output: 'NotoSansSC' },
  { package: 'noto-sans-tc', output: 'NotoSansTC' },
  { package: 'noto-sans-kr', output: 'NotoSansKR' },
];

async function convertWoff2ToTtf(inputPath) {
  const input = fs.readFileSync(inputPath);
  return await wawoff2.decompress(input);
}

async function convertFont(config) {
  const packageDir = path.join(NODE_MODULES, config.package, 'files');

  if (!fs.existsSync(packageDir)) {
    console.log(`  Skipping ${config.package} - not installed`);
    return;
  }

  for (const subset of config.subsets) {
    // Try different naming patterns
    const patterns = [
      `${config.package}-${subset}-400-normal.woff2`,
      `${config.package.replace('noto-', 'noto-sans-')}-${subset}-400-normal.woff2`,
    ];

    let found = false;
    for (const pattern of patterns) {
      const inputPath = path.join(packageDir, pattern);
      if (fs.existsSync(inputPath)) {
        const outputPath = path.join(FONTS_DIR, `${config.output}-${subset}.ttf`);
        try {
          const ttf = await convertWoff2ToTtf(inputPath);
          fs.writeFileSync(outputPath, ttf);
          console.log(`  Converted: ${pattern} -> ${path.basename(outputPath)} (${(ttf.length / 1024).toFixed(1)}KB)`);
          found = true;
          break;
        } catch (err) {
          console.error(`  Error converting ${pattern}:`, err.message);
        }
      }
    }

    if (!found) {
      // List available files to help debug
      const files = fs.readdirSync(packageDir).filter(f => f.includes('400-normal.woff2')).slice(0, 3);
      console.log(`  Warning: Could not find ${subset} subset for ${config.package}`);
      console.log(`    Available files: ${files.join(', ')}...`);
    }
  }
}

async function convertCJKFont(config) {
  const packageDir = path.join(NODE_MODULES, config.package, 'files');

  if (!fs.existsSync(packageDir)) {
    console.log(`  Skipping ${config.package} - not installed`);
    return;
  }

  // Find all numbered subset files (e.g., noto-sans-jp-0-400-normal.woff2)
  const files = fs.readdirSync(packageDir)
    .filter(f => f.match(/-\d+-400-normal\.woff2$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/-(\d+)-400/)[1]);
      const numB = parseInt(b.match(/-(\d+)-400/)[1]);
      return numA - numB;
    });

  console.log(`  Found ${files.length} subsets for ${config.package}`);

  let totalSize = 0;
  for (const file of files) {
    const inputPath = path.join(packageDir, file);
    const subsetNum = file.match(/-(\d+)-400/)[1];
    const outputPath = path.join(FONTS_DIR, `${config.output}-${subsetNum}.ttf`);

    try {
      const ttf = await convertWoff2ToTtf(inputPath);
      fs.writeFileSync(outputPath, ttf);
      totalSize += ttf.length;
    } catch (err) {
      console.error(`  Error converting ${file}:`, err.message);
    }
  }

  console.log(`  Total: ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
}

async function main() {
  // Ensure fonts directory exists
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  console.log('Converting non-CJK fonts...\n');
  for (const config of FONT_CONFIGS) {
    console.log(`Processing ${config.package}...`);
    await convertFont(config);
  }

  console.log('\nConverting CJK fonts (this may take a while)...\n');
  for (const config of CJK_FONTS) {
    console.log(`Processing ${config.package}...`);
    await convertCJKFont(config);
  }

  console.log('\nDone! Fonts saved to:', FONTS_DIR);

  // List all generated fonts
  const fonts = fs.readdirSync(FONTS_DIR).filter(f => f.endsWith('.ttf'));
  console.log(`\nGenerated ${fonts.length} font files`);
}

main().catch(console.error);
