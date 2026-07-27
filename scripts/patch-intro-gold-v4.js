const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.resolve(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const PATCH_MARKER = "Taurus intro gold balance v4";
if (html.includes(PATCH_MARKER)) {
  console.log("Balanced gold globe lighting is already patched");
  process.exit(0);
}

function replaceRequired(search, replacement, label) {
  if (!html.includes(search)) {
    throw new Error(`Could not patch ${label}: expected source block was not found`);
  }
  html = html.replace(search, replacement);
}

replaceRequired(
  `        /* Taurus intro session + adaptive HQ texture bootstrap v3 */`,
  `        /* Taurus intro session + adaptive HQ texture bootstrap v3 */\n        /* ${PATCH_MARKER} */`,
  "gold-balance marker"
);

// Bump the session key so the updated intro plays once again in an existing tab.
replaceRequired(
  `var INTRO_SESSION_KEY = "taurus-intro-seen-v3";`,
  `var INTRO_SESSION_KEY = "taurus-intro-seen-v4";`,
  "intro session version"
);

replaceRequired(
  `renderer.toneMappingExposure = 1.03;`,
  `renderer.toneMappingExposure = 1.05;`,
  "ACES exposure"
);
replaceRequired(
  `material.bumpScale = 1.35;`,
  `material.bumpScale = 1.4;`,
  "surface depth"
);
replaceRequired(
  `material.shininess = 8;`,
  `material.shininess = 10;`,
  "specular shininess"
);
replaceRequired(
  `material.specular = new THREE.Color("#64779d");`,
  `material.specular = new THREE.Color("#b88a18");`,
  "gold specular response"
);
replaceRequired(
  `light.color.set("#8ea6d0");\n        light.intensity = 1.25;`,
  `light.color.set("#7183a6");\n        light.intensity = 1.18;`,
  "balanced ambient light"
);
replaceRequired(
  `light.color.set("#ffe6a0");\n        light.intensity = 0.58;`,
  `light.color.set("#ffd36a");\n        light.intensity = 0.68;`,
  "gold directional light"
);

fs.writeFileSync(indexPath, html, "utf8");
console.log("Patched balanced gold globe lighting and intro session v4");
