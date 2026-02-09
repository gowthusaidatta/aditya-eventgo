const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ASSET_ROOT = process.env.ASSET_ROOT || "/var/www/assets";
const LIMITS = {
  logos: { maxWidth: 400, maxBytes: 50 * 1024 },
  thumbnails: { maxWidth: 600, maxBytes: 50 * 1024 },
  banners: { maxWidth: 1600, maxBytes: 200 * 1024 },
};

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.replace(/^--/, "").split("=");
      args[key] = value === undefined ? true : value;
    }
  });
  return args;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function optimizeImage({ inputPath, type, outputDir }) {
  const config = LIMITS[type];
  if (!config) {
    throw new Error("Invalid type. Use logos, thumbnails, or banners.");
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error("Input file does not exist");
  }

  ensureDir(outputDir);

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${baseName}.webp`);

  const qualities = [85, 75, 65, 55, 45, 40];
  let finalBuffer = null;

  for (const quality of qualities) {
    const buffer = await sharp(inputPath)
      .resize({ width: config.maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    if (buffer.length <= config.maxBytes) {
      finalBuffer = buffer;
      break;
    }
  }

  if (!finalBuffer) {
    throw new Error("Optimized image exceeds size limits");
  }

  fs.writeFileSync(outputPath, finalBuffer);
  return { outputPath, size: finalBuffer.length };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input;
  const type = args.type;

  if (!inputPath || !type) {
    console.error("Usage: node optimize-asset.js --input=/path/file.png --type=logos|thumbnails|banners");
    process.exit(1);
  }

  const outputDir = args.output || path.join(ASSET_ROOT, type);

  try {
    const result = await optimizeImage({ inputPath, type, outputDir });
    console.log(JSON.stringify({
      output: result.outputPath,
      size: result.size,
      type,
    }));
  } catch (error) {
    console.error("Optimization failed:", error.message || error);
    process.exit(1);
  }
}

run();
