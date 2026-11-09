// Packs the processed cutouts into sprites.js next to index.html (plain fs, no dependencies).
const fs = require("fs"), path = require("path");
const OUT = path.join(__dirname, "out"), DEST = "C:/Users/kkmov/Documents/Claude/Code/glucose-display/sprites.js";
const meta = JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8"));
const o = {};
for (const n of Object.keys(meta)) o[n] = "data:image/webp;base64," + fs.readFileSync(path.join(OUT, n + ".webp")).toString("base64");
fs.writeFileSync(DEST, "/* Millie & Winston photo cutouts for the glucose display (generated — keep next to index.html) */\nwindow.GD_SPRITES=" + JSON.stringify(o) + ";\n");
console.log(Object.keys(o).length, "sprites,", Math.round(fs.statSync(DEST).size / 1024), "kB", JSON.stringify(meta));
