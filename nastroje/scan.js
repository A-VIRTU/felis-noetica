#!/usr/bin/env node
// `npm run scan` — projde media/ a pro každý soubor bez YAML záznamu založí
// kostru v data/assety/. Doplní, co se dá uhodnout z názvu souboru
// (datum na začátku, jméno zvířete kdekoli v názvu). Zbytek dopíšeš ty nebo AI.
//
// Neveřejným assetům přiřadí náhodný token, přes který se soubor servíruje
// na adrese /soukrome/<token>/<název>. Token se generuje jednou a už se nemění.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { nacti, KOREN, MEDIA } = require('./data');

const PRIPONY = { foto: ['.jpg', '.jpeg', '.png', '.webp', '.avif'], video: ['.mp4', '.webm', '.mov'], dokument: ['.pdf'] };

function typSouboru(f) {
  const e = path.extname(f).toLowerCase();
  for (const [t, seznam] of Object.entries(PRIPONY)) if (seznam.includes(e)) return t;
  return null;
}

function projdi(dir, zaklad = '') {
  const ven = [];
  for (const f of fs.readdirSync(path.join(MEDIA, dir, zaklad), { withFileTypes: true })) {
    const rel = path.join(zaklad, f.name);
    if (f.isDirectory()) ven.push(...projdi(dir, rel));
    else if (typSouboru(f.name)) ven.push(path.join(dir, rel).split(path.sep).join('/'));
  }
  return ven;
}

function main() {
  const d = nacti({ tiche: true });
  const znameSoubory = new Set(d.assety.map((a) => a.soubor));
  const bezDia = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // podle jména v názvu souboru odhadneme zvíře; do YAML se píše 'ID Jméno'
  const kandidati = d.zvirata.map((z) => ({ klic: bezDia(z.jmeno), odkaz: `${z.id} ${z.jmeno}` }));

  let vsechny = [];
  for (const dir of fs.readdirSync(MEDIA)) {
    if (fs.statSync(path.join(MEDIA, dir)).isDirectory()) vsechny.push(...projdi(dir));
  }

  let novych = 0;
  for (const soubor of vsechny) {
    if (znameSoubory.has(soubor)) continue;
    const zaklad = path.basename(soubor, path.extname(soubor));
    const typ = typSouboru(soubor);
    const datum = (zaklad.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    const nalezena = kandidati.filter((k) => bezDia(zaklad).includes(k.klic)).map((k) => k.odkaz);
    const nazev = zaklad.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cil = path.join(KOREN, 'data', 'assety', `${nazev}.yaml`);
    if (fs.existsSync(cil)) { console.log(`! přeskočeno, ${nazev}.yaml už existuje: ${soubor}`); continue; }

    fs.writeFileSync(cil, `soubor: ${soubor}
typ: ${typ}
datum: ${datum || 'null'}
misto: null
pomer: null
zvirata: [${nalezena.join(', ')}]
hlavni: ${nalezena.length === 1 ? nalezena[0] : 'null'}
tagy: []
verejne: false
popisky:
  cs:
    navesti: null
    text: null
  en:
    navesti: null
    text: null
`);
    novych++;
    console.log(`+ data/assety/${nazev}.yaml  ←  media/${soubor}`);
  }

  // tokeny pro neveřejné
  let tokenu = 0;
  for (const a of nacti({ tiche: true }).assety) {
    if (a.verejne === false && !a.token) {
      const c = path.join(KOREN, a.__soubor);
      let s = fs.readFileSync(c, 'utf8');
      const t = crypto.randomBytes(16).toString('hex');
      s = s.replace(/^verejne:.*$/m, (m) => `${m}\ntoken: ${t}`);
      fs.writeFileSync(c, s);
      tokenu++;
    }
  }

  // sirotci
  for (const a of d.assety) {
    if (!fs.existsSync(path.join(MEDIA, a.soubor))) console.log(`✗ sirotek: ${a.__soubor} ukazuje na chybějící media/${a.soubor}`);
  }

  console.log(`\nhotovo — ${novych} nových záznamů, ${tokenu} nových tokenů, celkem ${vsechny.length} souborů v media/`);
}

main();
