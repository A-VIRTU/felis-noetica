#!/usr/bin/env node
// `npm run kontrola` — jen zvaliduje data, nic negeneruje.
// Tohle je to, co má AI editor spustit po každé změně dat, než něco commitne.

const { nacti } = require('./data');
const d = nacti();

if (d.chyby.length) {
  console.error(`✗ ${d.chyby.length} chyb — neopravené se nesmí commitovat.`);
  process.exit(1);
}

// varování: věci, které nejsou chyba, ale skoro jistě nedodělek
const varovani = [];
for (const a of d.assety) {
  if (!a.tagy || !a.tagy.length) varovani.push(`${a.__soubor}: žádné tagy`);
  const p = a.popisky || {};
  if (!p.cs || (!p.cs.navesti && !p.cs.text)) varovani.push(`${a.__soubor}: chybí český popisek`);
  else if (!p.en || (!p.en.navesti && !p.en.text)) varovani.push(`${a.__soubor}: chybí anglický popisek`);
  if (a.typ === 'foto' && !(a.zvirata || []).length && !(a.tagy || []).length) varovani.push(`${a.__soubor}: fotka bez zvířat i bez tagů — nikdo ji nikdy nenajde`);
}
for (const z of d.zvirata) {
  if (!(d.podleZvirete[z.id] || []).length) varovani.push(`${z.__soubor}: zvíře bez jediné fotky`);
  if (z.stav === 'prodano' && !(z.soukroma_stranka && z.soukroma_stranka.aktivni)) varovani.push(`${z.__soubor}: prodané zvíře bez soukromé stránky`);
}

console.log(`✓ data v pořádku — ${d.zvirata.length} zvířat, ${d.vrhy.length} vrhů, ${d.assety.length} assetů, ${d.tagy.length} tagů`);
if (varovani.length) {
  console.log(`\n⚠ ${varovani.length} nedodělků (nebrání buildu):`);
  for (const v of varovani) console.log('  ' + v);
}
