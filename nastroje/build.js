#!/usr/bin/env node
// Generátor. `npm run build` → složka dist/, kterou nasazuje Cloudflare Pages.
//
// Co dělá:
//   1. zvaliduje data (chyba = build spadne, nic se nenasadí)
//   2. zkopíruje ruční stránky ze web/ a vloží do nich generované úseky
//   3. vygeneruje /<uuid>/ pro každé zvíře s aktivní soukromou stránkou
//   4. rozkopíruje veřejná média do /media/, neveřejná do /soukrome/<token>/
//   5. vygeneruje interní přehled /interni/ + data.json (chráněno Cloudflare Access)

const fs = require('fs');
const path = require('path');
const { nacti, KOREN, MEDIA } = require('./data');
const S = require('./sablony');
const { hub } = require('./hub');
const { zipZeSouboru } = require('./zip');
const { certifikat, qrSvg } = require('./certifikat');

const WEB = path.join(KOREN, 'web');
const DIST = path.join(KOREN, 'dist');

const KONTAKT = { email: 'info@felisnoetica.cz', telefon: '604 761 154' };

// Přírůstkový build: dist/ se nemaže. Zapisuje se jen to, co se skutečně liší,
// a na konci se smaže, co v dist/ zbylo navíc. Kopírovat stovky MB fotek
// při změně jedné věty nemá důvod.
const zapsane = new Set();
let zapisu = 0, kopii = 0, preskoceno = 0;

function zapis(rel, obsah) {
  const c = path.join(DIST, rel);
  zapsane.add(path.normalize(rel));
  const novy = Buffer.from(obsah);
  if (fs.existsSync(c) && fs.readFileSync(c).equals(novy)) { preskoceno++; return; }
  fs.mkdirSync(path.dirname(c), { recursive: true });
  fs.writeFileSync(c, novy);
  zapisu++;
}

function kopiruj(zdroj, rel) {
  const c = path.join(DIST, rel);
  zapsane.add(path.normalize(rel));
  const z = fs.statSync(zdroj);
  if (fs.existsSync(c)) {
    const s = fs.statSync(c);
    if (s.size === z.size && s.mtimeMs >= z.mtimeMs) { preskoceno++; return; }
  }
  fs.mkdirSync(path.dirname(c), { recursive: true });
  fs.copyFileSync(zdroj, c);
  kopii++;
}

// smaže z dist/ všechno, co build tentokrát nevytvořil (zrušené, přejmenované)
function uklidDist(dir = '') {
  const plna = path.join(DIST, dir);
  if (!fs.existsSync(plna)) return 0;
  let smazano = 0;
  for (const f of fs.readdirSync(plna, { withFileTypes: true })) {
    const rel = path.join(dir, f.name);
    if (f.isDirectory()) {
      smazano += uklidDist(rel);
      if (!fs.readdirSync(path.join(DIST, rel)).length) fs.rmdirSync(path.join(DIST, rel));
    } else if (!zapsane.has(path.normalize(rel))) {
      fs.unlinkSync(path.join(DIST, rel));
      smazano++;
    }
  }
  return smazano;
}
function kopirujStrom(zdroj, cil, vynech = new Set()) {
  if (!fs.existsSync(zdroj)) return;
  for (const f of fs.readdirSync(zdroj, { withFileTypes: true })) {
    if (f.isDirectory()) kopirujStrom(path.join(zdroj, f.name), path.join(cil, f.name), vynech);
    else if (!vynech.has(path.join(cil, f.name))) kopiruj(path.join(zdroj, f.name), path.join(cil, f.name));
  }
}

// adresa mediálního souboru
function adresa(d) {
  const podleSouboru = Object.fromEntries(d.assety.map((a) => [a.soubor, a]));
  return (soubor) => {
    const a = podleSouboru[soubor];
    if (!a || a.verejne) {
      const bn = path.basename(soubor);
      const webVersion = bn.replace(/\.jpg$/i, '-web.jpg');
      if (fs.existsSync(path.join(WEB, 'assets', 'images', webVersion))) {
        return `/assets/images/${webVersion}`;
      }
      if (fs.existsSync(path.join(WEB, 'assets', 'images', bn))) {
        return `/assets/images/${bn}`;
      }
      return `/assets/images/${bn}`;
    }
    return `/soukrome/${a.token}/${path.basename(soubor)}`;
  };
}

// ZIP pro majitele — obsahuje přesně to, co majitel vidí na své stránce.
// Sestavuje se ze stejného filtru viditelnosti, takže se nemůže rozejít.
function vyrobZip(rel, zvire, assety, textovky) {
  const soubory = assety
    .filter((a) => a.viditelnost !== 'interni')
    .map((a) => ({ nazev: path.basename(a.soubor), cesta: path.join(MEDIA, a.soubor) }));
  zapis(rel, zipZeSouboru(soubory, textovky));
}

// vložení generovaného úseku mezi značky <!-- gen:jmeno --> ... <!-- /gen:jmeno -->
function vloz(html, jmeno, obsah) {
  const re = new RegExp(`(<!--\\s*gen:${jmeno}\\s*-->)[\\s\\S]*?(<!--\\s*/gen:${jmeno}\\s*-->)`);
  if (!re.test(html)) return html;
  return html.replace(re, `$1\n${obsah}\n$2`);
}

async function main() {
  const d = nacti();
  if (d.chyby.length) { console.error('Build zastaven — oprav data.'); process.exit(1); }

  fs.mkdirSync(DIST, { recursive: true });

  const url = adresa(d);

  // --- 1. ruční stránky + statika ---
  const RUCNI = { 'index.html': 'cs', 'chov.html': 'cs', 'en.html': 'en', 'fr.html': 'fr', '404.html': 'cs' };
  kopirujStrom(WEB, '', new Set(Object.keys(RUCNI)));
  for (const [soubor, jazyk] of Object.entries(RUCNI)) {
    const zdroj = path.join(WEB, soubor);
    if (!fs.existsSync(zdroj)) continue;
    let html = fs.readFileSync(zdroj, 'utf8');
    html = vloz(html, 'kotata', S.fragmentKotata({ vrhy: d.vrhy, zvirata: d.zvirata, assety: d.assety, jazyk, url }));
    zapis(soubor, html);
  }

  // --- 2. média ---
  let verejnych = 0, soukromych = 0;
  for (const a of d.assety) {
    const zdroj = path.join(MEDIA, a.soubor);
    if (a.verejne) {
      kopiruj(zdroj, path.join('media', a.soubor));
      kopiruj(zdroj, path.join('assets', 'images', path.basename(a.soubor)));
      verejnych++;
    }
    else { kopiruj(zdroj, path.join('soukrome', a.token, path.basename(a.soubor))); soukromych++; }
    if (a.poster) {
      const p = path.join(MEDIA, a.poster);
      if (fs.existsSync(p)) kopiruj(p, path.join('media', a.poster));
    }
  }

  // --- 3. stránky zvířat: veřejná i majitelova ze STEJNÉ šablony ---
  // Rozdíl je jen v tom, co projde filtrem viditelnosti. Veřejná stránka
  // nemá jak vypsat soukromý odkaz, protože se k položce vůbec nedostane.
  const jmenem = (id) => { const z = d.zvirata.find((x) => x.id === id); return z ? z.jmeno : id; };
  const bezDia = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slugJmena = (s) => bezDia(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let verejnychStranek = 0, soukromychStranek = 0, certifikatu = 0, zipu = 0;

  for (const z of d.zvirata) {
    const assety = d.podleZvirete[z.id] || [];
    const sp = z.soukroma_stranka;
    const maSoukromou = !!(sp && sp.aktivni && z.uuid);
    const v = d.vrhy.find((x) => x.id === z.vrh || x.__slug === z.vrh);
    const datumNar = z.narozeni || (v ? v.narozeni : '');
    const rok = (datumNar || '').slice(0, 4);
    const verejnaCesta = `/kotata/${rok}/${slugJmena(z.jmeno)}/`;

    // QR míří na majitelovu adresu, když existuje — je to adresa na certifikátu
    const adresaQr = `https://felisnoetica.cz${maSoukromou ? `/${z.uuid}/` : verejnaCesta}`;
    const qr = await qrSvg(adresaQr);

    const vykresli = (koren, jazyky, majitel) => {
      for (const [i, j] of jazyky.entries()) {
        zapis(path.join(koren, i === 0 ? '' : j, 'index.html'), hub({
          zvire: z, jazyk: j, assety, url, majitel, jazyky,
          koren: '/' + koren.split(path.sep).join('/') + '/', jmenem, kontakt: KONTAKT, zvirata: d.zvirata,
        }));
      }
      const c = z.certifikat;
      if (c && (majitel || (c.viditelnost || 'verejne') === 'verejne')) {
        for (const j of c.jazyky || ['cs']) {
          zapis(path.join(koren, `certifikat-${j}.html`),
            certifikat({ zvire: z, jazyk: j, zvirata: d.zvirata, qr, adresa: adresaQr, url }));
          certifikatu++;
        }
      }
      zapis(path.join(koren, 'qr.svg'), qr);
    };

    if (z.verejne && rok) {
      const slozka = path.join('kotata', rok, slugJmena(z.jmeno));
      const pubJazyky = (z.certifikat && z.certifikat.jazyky && z.certifikat.jazyky.length > 1)
        ? z.certifikat.jazyky
        : ((sp && sp.jazyky && sp.jazyky.length > 1) ? sp.jazyky : ['cs', 'en']);
      vykresli(slozka, pubJazyky, false);
      verejnychStranek++;

      const certVzip = [];
      if (z.certifikat && (z.certifikat.viditelnost || 'verejne') === 'verejne') {
        for (const j of z.certifikat.jazyky || ['cs']) {
          certVzip.push({
            nazev: `certifikat-${j}.html`,
            obsah: certifikat({ zvire: z, jazyk: j, zvirata: d.zvirata, qr, adresa: adresaQr, url }),
          });
        }
      }
      const verejneAssety = assety.filter((a) => a.viditelnost === 'verejne');
      vyrobZip(path.join(slozka, `${bezDia(z.jmeno)}_Felis_Noetica.zip`), z, verejneAssety, certVzip);
      zipu++;
    }

    if (maSoukromou) {
      const jazyky = sp.jazyky && sp.jazyky.length ? sp.jazyky : [sp.jazyk || 'cs'];
      vykresli(z.uuid, jazyky, true);
      soukromychStranek += jazyky.length;
      const certVzip = [];
      if (z.certifikat) for (const j of z.certifikat.jazyky || ['cs']) {
        certVzip.push({ nazev: `certifikat-${j}.html`,
          obsah: certifikat({ zvire: z, jazyk: j, zvirata: d.zvirata, qr, adresa: adresaQr, url }) });
      }
      vyrobZip(path.join(z.uuid, `${bezDia(z.jmeno)}_Felis_Noetica.zip`), z, assety, certVzip);
      zipu++;
    }
  }

  // --- 4. interní přehled ---
  const rejstrik = {
    vygenerovano: new Date().toISOString(),
    zvirata: d.zvirata.map((z) => ({
      id: z.id, uuid: z.uuid || null, jmeno: z.jmeno, pohlavi: z.pohlavi,
      generace: z.generace, narozeni: z.narozeni, stav: z.stav, vrh: z.vrh,
      matka: z.matka, otec: z.otec, verejne: z.verejne,
      stranka: z.soukroma_stranka && z.soukroma_stranka.aktivni ? `/${z.uuid}/` : null,
      pocet_assetu: (d.podleZvirete[z.id] || []).length,
    })),
    vrhy: d.vrhy.map((v) => ({ id: v.id, matka: v.matka, otec: v.otec, narozeni: v.narozeni, pocet: v.pocet, verejne: v.verejne })),
    assety: d.assety.map((a) => ({
      soubor: a.soubor, typ: a.typ, datum: a.datum || null, misto: a.misto || null,
      zvirata: a.zvirata || [], hlavni: a.hlavni || null, tagy: a.tagy || [],
      verejne: !!a.verejne, url: url(a.soubor),
      popisky: a.popisky || {}, zdroj: a.__soubor,
    })),
    tagy: d.tagy,
  };
  zapis('interni/data.json', JSON.stringify(rejstrik, null, 1));
  zapis('interni/index.html', fs.readFileSync(path.join(__dirname, 'interni.html'), 'utf8'));

  // --- 5. hlavičky ---
  const uuidCesty = d.zvirata
    .filter((z) => z.uuid && z.soukroma_stranka && z.soukroma_stranka.aktivni)
    .map((z) => `/${z.uuid}/*\n  X-Robots-Tag: noindex, nofollow`);
  zapis('_headers', [
    '/soukrome/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: private, max-age=3600',
    '/interni/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store',
    '/media/*\n  Cache-Control: public, max-age=31536000, immutable',
    ...uuidCesty,
  ].join('\n\n') + '\n');

  const smazano = uklidDist();

  // Sync built dist files into public directory for Cloudflare Pages
  const PUBLIC = path.join(KOREN, 'public');
  function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyRecursiveSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  copyRecursiveSync(DIST, PUBLIC);
  copyRecursiveSync(DIST, KOREN);
  copyRecursiveSync(DIST, WEB);

  console.log(`✓ hotovo
  ${d.zvirata.length} zvířat, ${d.vrhy.length} vrhů, ${d.assety.length} assetů (${verejnych} veřejných, ${soukromych} pro majitele)
  ${verejnychStranek} veřejných stránek, ${soukromychStranek} majitelských, ${certifikatu} certifikátů, ${zipu} ZIPů
  zapsáno ${zapisu}, zkopírováno ${kopii}, beze změny ${preskoceno}${smazano ? `, smazáno ${smazano}` : ''}
  → dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
