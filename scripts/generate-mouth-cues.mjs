// Makes a mouth-shape cue file for every recording: <name>.wav -> <name>.lip.json
// Run from the repository root: node scripts/generate-mouth-cues.mjs [--force] [--jobs 6]
// Uses Rhubarb Lip Sync from tools/rhubarb. Existing cue files are kept unless --force is given.
// Cue file format: {"d": duration, "c": [[startSeconds, "shape"], ...]} with Rhubarb shapes A-H and X.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir, cpus } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const audioRoot = path.join(root, "frontend/public/audio");
const rhubarbDir = readdirSync(path.join(root, "tools/rhubarb")).find(d => d.startsWith("Rhubarb"));
const rhubarb = path.join(root, "tools/rhubarb", rhubarbDir, process.platform === "win32" ? "rhubarb.exe" : "rhubarb");
const force = process.argv.includes("--force");
const jobsArg = process.argv.indexOf("--jobs");
const jobs = jobsArg > 0 ? Number(process.argv[jobsArg + 1]) : Math.max(2, Math.min(8, cpus().length - 1));

// Spoken text for the new-voice lines improves the timing; other files use the phonetic recognizer.
const lineText = new Map();
const data = readFileSync(path.join(root, "frontend/src/hooks/recordedLineData.ts"), "utf8");
for (const m of data.matchAll(/^\s*"([^"]+)": "([^"]+)"/gm)) lineText.set(path.join(root, "frontend/public", m[2]).toLowerCase(), m[1]);

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.wav$/i.test(e.name)) files.push(p);
  }
})(audioRoot);

const todo = files.filter(f => force || !existsSync(f.replace(/\.wav$/i, ".lip.json")));
console.log(`${files.length} recordings, ${todo.length} to process with ${jobs} jobs`);
const work = mkdtempSync(path.join(tmpdir(), "readlr-lip-"));

function run(file, index) {
  return new Promise(resolve => {
    const out = path.join(work, `${index}.json`);
    const args = ["-f", "json", "--extendedShapes", "GHX", "-q", "-o", out];
    const text = lineText.get(file.toLowerCase());
    if (text) { const d = path.join(work, `${index}.txt`); writeFileSync(d, text); args.push("-d", d); }
    else args.push("-r", "phonetic");
    args.push(file);
    execFile(rhubarb, args, { windowsHide: true }, error => {
      if (error) return resolve({ file, error: error.message.split("\n")[0] });
      const json = JSON.parse(readFileSync(out, "utf8"));
      const cues = json.mouthCues.map(c => [Number(c.start.toFixed(2)), c.value]);
      writeFileSync(file.replace(/\.wav$/i, ".lip.json"), JSON.stringify({ d: json.metadata.duration, c: cues }));
      resolve({ file });
    });
  });
}

let next = 0, done = 0;
const failures = [];
async function worker() {
  while (next < todo.length) {
    const i = next++;
    const result = await run(todo[i], i);
    if (result.error) failures.push(result);
    if (++done % 50 === 0 || done === todo.length) console.log(`${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: jobs }, worker));
rmSync(work, { recursive: true, force: true });
console.log(`Done. ${todo.length - failures.length} cue files written, ${failures.length} failed.`);
for (const f of failures) console.log(`  ${path.relative(root, f.file)}: ${f.error}`);
