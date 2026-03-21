import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(__dirname, "..");
const SVG_INPUT = path.join(ROOT, "assets", "icon.svg");
const PNG_OUTPUT = path.join(ROOT, "assets", "icon.png");
const TEMP_OUTPUT = path.join(ROOT, "assets", ".icons-tmp");

async function generateIcons() {
  // Step 1: SVG → PNG
  console.log("Converting SVG to PNG…");
  await sharp(SVG_INPUT).resize(1024, 1024).png().toFile(PNG_OUTPUT);
  console.log("  → assets/icon.png");

  // Step 2: PNG → ICO + ICNS
  console.log("Generating platform icons…");
  if (fs.existsSync(TEMP_OUTPUT)) {
    fs.rmSync(TEMP_OUTPUT, { recursive: true });
  }
  execSync(
    `npx electron-icon-builder --input="${PNG_OUTPUT}" --output="${TEMP_OUTPUT}"`,
    { stdio: "inherit" },
  );

  // Step 3: Copy to assets/
  fs.copyFileSync(
    path.join(TEMP_OUTPUT, "icons", "win", "icon.ico"),
    path.join(ROOT, "assets", "icon.ico"),
  );
  console.log("  → assets/icon.ico");

  const icnsSrc = path.join(TEMP_OUTPUT, "icons", "mac", "icon.icns");
  if (fs.existsSync(icnsSrc)) {
    fs.copyFileSync(icnsSrc, path.join(ROOT, "assets", "icon.icns"));
    console.log("  → assets/icon.icns");
  } else {
    console.warn("  ⚠ icon.icns not generated (may require macOS)");
  }

  // Cleanup temp dir
  fs.rmSync(TEMP_OUTPUT, { recursive: true });
  console.log("Done.");
}

generateIcons().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
