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

function hardlinkStrom(zdroj, cil, vynech = new Set()) {
  if (!fs.existsSync(zdroj)) return;
  for (const f of fs.readdirSync(zdroj, { withFileTypes: true })) {
    const sCesta = path.join(zdroj, f.name);
    const cCesta = path.join(cil, f.name);
    if (f.isDirectory()) {
      hardlinkStrom(sCesta, cCesta, vynech);
    } else {
      const rel = path.relative(DIST, cCesta);
      zapsane.add(path.normalize(rel));
      if (!fs.existsSync(cCesta)) {
        fs.mkdirSync(path.dirname(cCesta), { recursive: true });
        try {
          fs.linkSync(sCesta, cCesta);
        } catch (e) {
          fs.copyFileSync(sCesta, cCesta);
        }
      }
    }
  }
}

// adresa mediálního souboru — v rámci dist/ směřuje do /assets/
function adresa(d) {
  const podleSouboru = Object.fromEntries(d.assety.map((a) => [a.soubor, a]));
  return (soubor, relKoren = '') => {
    const prefix = !relKoren ? '' : (relKoren.endsWith('/') ? relKoren : relKoren + '/');
    const cleanPath = soubor.replace(/^assets\//, '').replace(/^foto\//, 'images/').replace(/^video\//, 'videos/');
    const bn = path.basename(cleanPath);

    const webVersion = bn.replace(/\.jpg$/i, '-web.jpg');
    if (fs.existsSync(path.join(KOREN, 'assets', 'images', webVersion))) {
      return `${prefix}assets/images/${webVersion}`;
    }
    return `${prefix}assets/${cleanPath}`;
  };
}

// ZIP pro majitele — obsahuje certifikáty a dokumenty
function vyrobZip(rel, zvire, assety, textovky) {
  const soubory = assety
    .filter((a) => a.viditelnost !== 'interni' && (a.typ === 'dokument' || a.typ === 'pdf'))
    .map((a) => ({ nazev: path.basename(a.soubor), cesta: path.join(KOREN, 'assets', 'dokumenty', path.basename(a.soubor)) }));
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

  // --- 2. 0-bajtem neobsazující hardlinky pro dist/assets ---
  let verejnych = 0, soukromych = 0;
  for (const a of d.assety) {
    if (a.verejne) verejnych++;
    else soukromych++;
  }
  const rootAssets = path.join(KOREN, 'assets');
  hardlinkStrom(rootAssets, path.join(DIST, 'assets'));

  // --- 3. stránky zvířat: veřejná i majitelova ze STEJNÉ šablony ---
  // Rozdíl je jen v tom, co projde filtrem viditelnosti. Veřejná stránka
  // nemá jak vypsat soukromý odkaz, protože se k položce vůbec nedostane.
  const jmenem = (id) => { const z = d.zvirata.find((x) => x.id === id); return z ? z.jmeno : id; };
  const bezDia = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slugJmena = (s) => bezDia(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let verejnychStranek = 0, soukromychStranek = 0, certifikatu = 0, zipu = 0;

  for (const z of d.zvirata) {
    const rodicovskeAssety = [];
    if (z.matka && d.podleZvirete[z.matka]) {
      const matkaObj = d.zvirata.find((x) => x.id === z.matka);
      const mJmeno = matkaObj ? matkaObj.jmeno : 'matka';
      for (const a of d.podleZvirete[z.matka].filter((a) => a.typ === 'dokument' || a.typ === 'pdf')) {
        const aKopie = JSON.parse(JSON.stringify(a));
        aKopie.popisky = {
          cs: { navesti: `Genetický test matky — ${mJmeno} (Genomia)`, text: a.popisky?.cs?.text || 'Kompletní genetický panel a zdravotní profil z laboratoře Genomia.' },
          en: { navesti: `Dam's genetic test — ${mJmeno} (Genomia)`, text: a.popisky?.en?.text || 'Full genetic panel and health profile from Genomia laboratory.' },
          fr: { navesti: `Test génétique de la mère — ${mJmeno} (Genomia)`, text: a.popisky?.fr?.text || 'Panneau génétique complet de Genomia.' },
        };
        rodicovskeAssety.push(aKopie);
      }
    }
    if (z.otec && d.podleZvirete[z.otec]) {
      const otecObj = d.zvirata.find((x) => x.id === z.otec);
      const oJmeno = otecObj ? otecObj.jmeno : 'otec';
      for (const a of d.podleZvirete[z.otec].filter((a) => a.typ === 'dokument' || a.typ === 'pdf')) {
        const aKopie = JSON.parse(JSON.stringify(a));
        aKopie.popisky = {
          cs: { navesti: `Genetický test otce — ${oJmeno} (Genomia)`, text: a.popisky?.cs?.text || 'Kompletní genetický panel a zdravotní profil z laboratoře Genomia.' },
          en: { navesti: `Sire's genetic test — ${oJmeno} (Genomia)`, text: a.popisky?.en?.text || 'Full genetic panel and health profile from Genomia laboratory.' },
          fr: { navesti: `Test génétique du père — ${oJmeno} (Genomia)`, text: a.popisky?.fr?.text || 'Panneau génétique complet de Genomia.' },
        };
        rodicovskeAssety.push(aKopie);
      }
    }
    const vsestkyAssety = [...(d.podleZvirete[z.id] || []), ...rodicovskeAssety];
    const videne = new Set();
    const assety = vsestkyAssety.filter((a) => {
      if (videne.has(a.soubor)) return false;
      videne.add(a.soubor);
      return true;
    });
    const sp = z.soukroma_stranka;
    const maSoukromou = !!(sp && sp.aktivni && z.uuid);
    const v = d.vrhy.find((x) => x.id === z.vrh || x.__slug === z.vrh);
    const datumNar = z.narozeni || (v ? v.narozeni : '');
    const rok = (datumNar || '').slice(0, 4);
    const verejnaCesta = `/kotata/${rok}/${slugJmena(z.jmeno)}/`;

    // QR míří na majitelovu adresu, když existuje — je to adresa na certifikátu
    const adresaQr = `https://felisnoetica.cz${maSoukromou ? `/${z.uuid}/` : verejnaCesta}`;
    const qr = await qrSvg(adresaQr);

function hardlinkSoubor(relZdroj, relCil) {
  const src = path.join(DIST, relZdroj);
  const dst = path.join(DIST, relCil);
  zapsane.add(path.normalize(relCil));
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (fs.existsSync(dst)) fs.unlinkSync(dst);
    try { fs.linkSync(src, dst); } catch(e) { fs.copyFileSync(src, dst); }
  }
}

    const vykresli = (koren, jazyky, majitel) => {
      for (const [i, j] of jazyky.entries()) {
        const podSlozka = path.join(koren, i === 0 ? '' : j);
        const depth = podSlozka.split(path.sep).filter(Boolean).length;
        const relKoren = '../'.repeat(depth);
        zapis(path.join(podSlozka, 'index.html'), hub({
          zvire: z, jazyk: j, assety, url, majitel, jazyky,
          koren: '/' + koren.split(path.sep).join('/') + '/', jmenem, kontakt: KONTAKT, zvirata: d.zvirata, relKoren,
        }));

        if (i > 0) {
          const zipNazev = `${bezDia(z.jmeno)}_Felis_Noetica.zip`;
          hardlinkSoubor(path.join(koren, zipNazev), path.join(podSlozka, zipNazev));
        }
      }
      const c = z.certifikat;
      if (c && (majitel || (c.viditelnost || 'verejne') === 'verejne')) {
        const certDepth = koren.split(path.sep).filter(Boolean).length;
        const relKorenCert = '../'.repeat(certDepth);
        for (const j of c.jazyky || ['cs']) {
          zapis(path.join(koren, `certifikat-${j}.html`),
            certifikat({ zvire: z, jazyk: j, zvirata: d.zvirata, qr, adresa: adresaQr, url, relKoren: relKorenCert }));
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

      vykresli(slozka, pubJazyky, false);
      verejnychStranek++;
    }

    if (maSoukromou) {
      const jazyky = sp.jazyky && sp.jazyky.length ? sp.jazyky : [sp.jazyk || 'cs'];
      const certVzip = [];
      if (z.certifikat) for (const j of z.certifikat.jazyky || ['cs']) {
        certVzip.push({ nazev: `certifikat-${j}.html`,
          obsah: certifikat({ zvire: z, jazyk: j, zvirata: d.zvirata, qr, adresa: adresaQr, url }) });
      }
      vyrobZip(path.join(z.uuid, `${bezDia(z.jmeno)}_Felis_Noetica.zip`), z, assety, certVzip);
      zipu++;

      vykresli(z.uuid, jazyky, true);
      soukromychStranek += jazyky.length;
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
    '/kotata/*\n  Cache-Control: no-cache, no-store, must-revalidate',
    ...uuidCesty,
  ].join('\n\n') + '\n');

  // Clean empty _redirects file if needed or omit
  zapis('_redirects', '# No redirects active\n');

  const smazano = uklidDist();


  console.log(`✓ hotovo
  ${d.zvirata.length} zvířat, ${d.vrhy.length} vrhů, ${d.assety.length} assetů (${verejnych} veřejných, ${soukromych} pro majitele)
  ${verejnychStranek} veřejných stránek, ${soukromychStranek} majitelských, ${certifikatu} certifikátů, ${zipu} ZIPů
  zapsáno ${zapisu}, zkopírováno ${kopii}, beze změny ${preskoceno}${smazano ? `, smazáno ${smazano}` : ''}
  → dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
