#!/usr/bin/env node
// `npm run prepis-odkazy jmeno|id|id+jmeno`
//
// Parser bere všechny tři tvary odkazu na zvíře, takže tenhle příkaz nic
// neopravuje — jen uklízí. Sjednotí zápis ve všech datových souborech na jeden
// tvar, aby se v repozitáři nemíchaly styly. Názvů souborů se nedotýká.

const fs = require('fs');
const path = require('path');
const { nacti, KOREN } = require('./data');

const TVARY = ['jmeno', 'id', 'id+jmeno'];
const tvar = process.argv[2];

if (!TVARY.includes(tvar)) {
  console.error(`Použití: npm run prepis-odkazy ${TVARY.join('|')}\n
  jmeno      matka: Sibyla
  id         matka: FS01-G01-F002
  id+jmeno   matka: FS01-G01-F002 Sibyla`);
  process.exit(1);
}

const d = nacti();
if (d.chyby.length) { console.error('Nejdřív oprav chyby v datech.'); process.exit(1); }

const zapis = (z) => (tvar === 'jmeno' ? z.jmeno : tvar === 'id' ? z.id : `${z.id} ${z.jmeno}`);
const podleId = new Map(d.zvirata.map((z) => [z.id, z]));

// pole, která nesou odkaz na zvíře
const POLE_JEDNO = ['matka', 'otec', 'hlavni'];
const POLE_SEZNAM = ['zvirata'];

let zmenenych = 0;

for (const p of [...d.vrhy, ...d.assety]) {
  const cesta = path.join(KOREN, p.__soubor);
  let s = fs.readFileSync(cesta, 'utf8');
  const puvodni = s;

  for (const pole of POLE_JEDNO) {
    const id = p[pole];
    if (!id || !podleId.has(id)) continue;
    s = s.replace(new RegExp(`^(${pole}:[ \\t]*).+$`, 'm'), `$1${zapis(podleId.get(id))}`);
  }
  for (const pole of POLE_SEZNAM) {
    const ids = p[pole];
    if (!Array.isArray(ids) || !ids.length) continue;
    const nove = ids.filter((i) => podleId.has(i)).map((i) => zapis(podleId.get(i)));
    s = s.replace(new RegExp(`^(${pole}:[ \\t]*)\\[.*\\]$`, 'm'), `$1[${nove.join(', ')}]`);
  }

  if (s !== puvodni) { fs.writeFileSync(cesta, s); zmenenych++; console.log(`~ ${p.__soubor}`); }
}

console.log(`\nhotovo — odkazy sjednoceny na tvar '${tvar}', upraveno ${zmenenych} souborů`);
