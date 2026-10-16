/* Split the radio songs and the launch video into small script pieces.

   GitHub's contents API returns nothing for a file of 1 MB or more, and
   Google AI Studio's Sync with GitHub fails when it cannot load a file.
   Each piece stays under 950 KB. The game joins the pieces back into the
   original bytes (see mediaURL in public/game.js). Run this again only
   when those source files are present:

     node tools/pack-media.cjs
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'media');
const MAX = 950000;
const sources = [
  ['public/audio/radio-golden-brown.mp3', 'audio/radio-golden-brown.mp3', 'radio-golden-brown'],
  ['public/audio/radio-pain.mp3', 'audio/radio-pain.mp3', 'radio-pain'],
  ['public/video/launch-backdrop.mp4', 'video/launch-backdrop.mp4', 'launch-backdrop']
];

function encodePart(key, raw) {
  const b64 = raw.toString('base64');
  const lines = [];
  for (let i = 0; i < b64.length; i += 120) lines.push(JSON.stringify(b64.slice(i, i + 120)));
  return `window.LUNA_PARTS=window.LUNA_PARTS||{};\n(window.LUNA_PARTS[${JSON.stringify(key)}]=window.LUNA_PARTS[${JSON.stringify(key)}]||[]).push(\n${lines.join('+\n')}\n);\n`;
}

function chunk(buf) {
  const parts = [];
  let off = 0;
  while (off < buf.length) {
    let size = Math.min(buf.length - off, 639999);
    size -= size % 3;
    if (size < 3) size = buf.length - off;
    let slice = buf.subarray(off, off + size);
    let text = encodePart('k', slice);
    while (Buffer.byteLength(text) > MAX && slice.length > 3) {
      size = Math.floor(slice.length * 0.9);
      size -= size % 3;
      if (off + size >= buf.length) size = buf.length - off;
      slice = buf.subarray(off, off + size);
      text = encodePart('k', slice);
    }
    if (Buffer.byteLength(text) > MAX) throw new Error('part still over the limit');
    parts.push(slice);
    off += slice.length;
  }
  return parts;
}

function writeParts(stem, key, buf) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const old of fs.readdirSync(outDir)) {
    if (old.startsWith(stem + '.') && old.endsWith('.js')) fs.unlinkSync(path.join(outDir, old));
  }
  const names = [];
  chunk(buf).forEach((slice, i) => {
    const name = `${stem}.${String(i + 1).padStart(2, '0')}.js`;
    const text = encodePart(key, slice);
    if (Buffer.byteLength(text) >= 1000000) throw new Error(name + ' is over 1 MB');
    fs.writeFileSync(path.join(outDir, name), text);
    names.push(name);
  });
  return names;
}

function roundTrip(key, names, original) {
  const parts = [];
  for (const name of names) {
    const text = fs.readFileSync(path.join(outDir, name), 'utf8');
    const m = text.match(/\.push\(\n([\s\S]*)\n\);/);
    if (!m) throw new Error('could not read ' + name);
    const b64 = m[1].split('\n').map(line => JSON.parse(line.replace(/\+$/, ''))).join('');
    parts.push(Buffer.from(b64, 'base64'));
  }
  const joined = Buffer.concat(parts);
  const a = crypto.createHash('sha256').update(original).digest('hex');
  const b = crypto.createHash('sha256').update(joined).digest('hex');
  if (a !== b) throw new Error('round trip mismatch for ' + key);
}

const tags = { index: [], play: [] };
let packed = 0;
for (const [rel, key, stem] of sources) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    const existing = fs.readdirSync(outDir).filter(n => n.startsWith(stem + '.') && n.endsWith('.js')).sort();
    if (!existing.length) throw new Error('missing ' + rel);
    console.log('keep', stem, existing.length, 'parts');
    for (const name of existing) {
      tags.index.push(`<script src="/media/${name}"></script>`);
      tags.play.push(`<script src="../public/media/${name}"></script>`);
    }
    continue;
  }
  const buf = fs.readFileSync(abs);
  const names = writeParts(stem, key, buf);
  roundTrip(key, names, buf);
  fs.unlinkSync(abs);
  packed++;
  console.log('packed', rel, buf.length, '->', names.length, 'parts');
  for (const name of names) {
    tags.index.push(`<script src="/media/${name}"></script>`);
    tags.play.push(`<script src="../public/media/${name}"></script>`);
  }
}

function fill(file, lines) {
  const abs = path.join(root, file);
  const text = fs.readFileSync(abs, 'utf8');
  const start = '<!-- github-media-start -->';
  const end = '<!-- github-media-end -->';
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error('markers missing in ' + file);
  const next = text.slice(0, a + start.length) + '\n' + lines.join('\n') + '\n' + text.slice(b);
  fs.writeFileSync(abs, next);
}
fill('index.html', tags.index);
fill("play/Luna's Cozy Pets Island.html", tags.play);
console.log('updated script tags;', packed, 'source files packed');
