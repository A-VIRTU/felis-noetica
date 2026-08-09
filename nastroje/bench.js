#!/usr/bin/env node
// Vygeneruje syntetická data v realistickém objemu a změří, jak dlouho běží build.
// Odpověď na otázku "přebuildí se celý web po každé sebemenší změně?" má být číslo.
//
//   node nastroje/bench.js <generací> <koťat na vrh> <assetů na zvíře>

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KOREN = path.resolve(__dirname, '..');
const [GEN = 10, NA_VRH = 8, ASSETU = 15] = process.argv.slice(2).map(Number);

const ZALOHA = path.join('/tmp', 'fn-bench-zaloha');
const DATA = path.join(KOREN, 'data');
const MEDIA = path.join(KOREN, 'media');

fs.rmSync(ZALOHA, { recursive: true, force: true });
fs.cpSync(DATA, path.join(ZALOHA, 'data'), { recursive: true });
fs.cpSync(MEDIA, path.join(ZALOHA, 'media'), { recursive: true });

function uklid() {
  fs.rmSync(DATA, { recursive: true, force: true });
  fs.rmSync(MEDIA, { recursive: true, force: true });
  fs.cpSync(path.join(ZALOHA, 'data'), DATA, { recursive: true });
  fs.cpSync(path.join(ZALOHA, 'media'), MEDIA, { recursive: true });
}

try {
  fs.rmSync(DATA, { recursive: true, force: true });
  for (const d of ['zvirata', 'vrhy', 'assety']) fs.mkdirSync(path.join(DATA, d), { recursive: true });
  fs.rmSync(MEDIA, { recursive: true, force: true });
  for (const d of ['foto', 'video', 'dokumenty']) fs.mkdirSync(path.join(MEDIA, d), { recursive: true });

  // realistická fotka ~350 kB, ať kopírování něco stojí
  const FOTO = Buffer.alloc(350 * 1024, 0x42);

  let zvirat = 0, assetu = 0;
  const uuid = (n) => {
    const h = n.toString(16).padStart(12, '0');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4d50-a65a-${h.padStart(12, '0')}`;
  };

  // zakladatelka
  fs.writeFileSync(path.join(DATA, 'zvirata', 'FS01-G00-F001_Zakladatelka.yaml'),
    `id: FS01-G00-F001\nuuid: null\njmeno: Zakladatelka\npohlavi: F\nvrh: null\nrodice_neznami: true\nnarozeni: 2024-01-01\nstav: nezvestna\nverejne: true\n`);
  zvirat++;
  let matka = 'Zakladatelka', otec = null;

  for (let g = 1; g <= GEN; g++) {
    const vrhId = `V20${24 + g}-G${g}`;
    fs.writeFileSync(path.join(DATA, 'vrhy', `${vrhId}.yaml`),
      `id: ${vrhId}\nmatka: ${matka}\notec: ${otec || 'null'}\nnarozeni: 20${24 + g}-07-14\nverejne: true\n`);

    let novaMatka = null, novyOtec = null;
    for (let k = 1; k <= NA_VRH; k++) {
      const pohl = k % 2 === 0 ? 'F' : 'M';
      const poradi = String(Math.ceil(k / 2)).padStart(3, '0');
      const id = `FS01-G${String(g).padStart(2, '0')}-${pohl}${poradi}`;
      const jm = `Kote${g}x${k}`;
      fs.writeFileSync(path.join(DATA, 'zvirata', `${id}_${jm}.yaml`),
        `id: ${id}\nuuid: ${uuid(zvirat)}\njmeno: ${jm}\npohlavi: ${pohl}\nvrh: ${vrhId}\nstav: prodano\nverejne: true\n` +
        `soukroma_stranka:\n  aktivni: true\n  jazyk: cs\npopis:\n  cs: |\n    Popis kotěte ${jm}.\n  en: |\n    Description of ${jm}.\n`);
      zvirat++;
      if (pohl === 'F' && !novaMatka) novaMatka = jm;
      if (pohl === 'M' && !novyOtec) novyOtec = jm;

      for (let a = 1; a <= ASSETU; a++) {
        const soubor = `foto/g${g}_k${k}_${a}.jpg`;
        fs.writeFileSync(path.join(MEDIA, soubor), FOTO);
        fs.writeFileSync(path.join(DATA, 'assety', `g${g}-k${k}-${a}.yaml`),
          `soubor: ${soubor}\ntyp: foto\ndatum: 20${24 + g}-08-${String((a % 28) + 1).padStart(2, '0')}\n` +
          `zvirata: [${jm}]\nhlavni: ${jm}\ntagy: [rok20${24 + g}, vrh${g}]\nverejne: ${a % 3 === 0 ? 'false' : 'true'}\n` +
          (a % 3 === 0 ? `token: ${'a'.repeat(32 - String(assetu).length) + assetu}\n` : '') +
          `popisky:\n  cs:\n    navesti: Poznámka ${a}\n    text: Pozorování číslo ${a}.\n  en:\n    navesti: Note ${a}\n    text: Observation number ${a}.\n`);
        assetu++;
      }
    }
    matka = novaMatka; otec = novyOtec;
  }

  console.log(`Syntetická data: ${zvirat} zvířat, ${GEN} vrhů, ${assetu} assetů (${(assetu * 350 / 1024).toFixed(0)} MB médií)\n`);

  const mer = (popis, fn) => {
    const t = process.hrtime.bigint();
    fn();
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    console.log(`  ${popis.padEnd(34)} ${ms.toFixed(0).padStart(6)} ms`);
    return ms;
  };

  mer('kontrola (validace dat)', () => execFileSync('node', ['nastroje/kontrola.js'], { cwd: KOREN }));
  mer('build od nuly', () => execFileSync('node', ['nastroje/build.js'], { cwd: KOREN }));
  mer('build znovu (beze změn)', () => execFileSync('node', ['nastroje/build.js'], { cwd: KOREN }));
} finally {
  uklid();
  fs.rmSync(path.join(KOREN, 'dist'), { recursive: true, force: true });
}
