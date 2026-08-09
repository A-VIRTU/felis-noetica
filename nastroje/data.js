// Načtení a validace všech dat.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { JAZYKY, certifikat: SCH_CERT, kmotr: SCH_KMOTR, schemata } = require('./schema');

const KOREN = path.resolve(__dirname, '..');
const DATA = path.join(KOREN, 'data');
const MEDIA = path.join(KOREN, 'media');

function nactiSlozku(jmeno) {
  const dir = path.join(DATA, jmeno);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => {
      const cesta = path.join(dir, f);
      let o;
      try { o = yaml.load(fs.readFileSync(cesta, 'utf8')) || {}; }
      catch (e) { o = { __chyba: `nečitelný YAML: ${e.message}` }; }
      o.__slug = f.replace(/\.ya?ml$/, '');
      o.__soubor = path.relative(KOREN, cesta);
      return o;
    });
}

const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Master ID zvířete: FS01-G02-M001 — stanice, generace, pohlaví, pořadí.
const ID_RE = /^(FS\d{2})-G(\d{2})-([MF])(\d{3})$/;
// Odkaz na zvíře. Tolerantní: "Sibyla" | "FS01-G01-F002" | "FS01-G01-F002 Sibyla".
const ODKAZ_RE = /^(FS\d{2}-G\d{2}-[MF]\d{3})(?:\s+(\S.*?))?\s*$/;

function rozeberOdkaz(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  const m = t.match(ODKAZ_RE);
  if (m) return { id: m[1], jmeno: m[2] || null };
  return { id: null, jmeno: t };   // jen volací jméno
}

// Najde zvíře podle rozebraného odkazu. Vrací { zvire } nebo { chyba }.
function najdiZvire(o, rejstrik) {
  if (o.id) {
    const z = rejstrik.podleId.get(o.id);
    if (!z) return { chyba: `odkazuje na neexistující zvíře '${o.id}'` };
    if (o.jmeno && !stejneJmeno(o.jmeno, z.jmeno)) {
      return { chyba: `říká '${o.id} ${o.jmeno}', ale ${o.id} je '${z.jmeno}'` };
    }
    return { zvire: z };
  }
  const shody = rejstrik.podleJmena.get(klicJmena(o.jmeno)) || [];
  if (!shody.length) return { chyba: `odkazuje na neznámé zvíře '${o.jmeno}'` };
  if (shody.length > 1) {
    return {
      chyba: `'${o.jmeno}' nosí víc zvířat (${shody.map((z) => z.id).join(', ')})` +
        ` — odkaž se master ID, např. '${shody[0].id} ${shody[0].jmeno}'`,
    };
  }
  return { zvire: shody[0] };
}

const jeDatum = (v) => v instanceof Date || (typeof v === 'string' && DATUM_RE.test(v));
const bezDiakritiky = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// klíč pro párování jmen: bez diakritiky, bez velikosti písmen
const klicJmena = (s) => bezDiakritiky(String(s || '')).toLowerCase().trim();
const stejneJmeno = (a, b) => klicJmena(a) === klicJmena(b);
const naText = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? null : String(v));

function overMapu(v, kde, chyby, klic, povolene) {
  if (typeof v !== 'object' || Array.isArray(v) || v === null) {
    chyby.push(`${kde}: '${klic}' musí být mapa`); return false;
  }
  if (povolene) for (const k of Object.keys(v)) {
    if (!povolene.includes(k)) chyby.push(`${kde}: '${klic}.${k}' — neznámý klíč (povoleno: ${povolene.join(', ')})`);
  }
  return true;
}

// Ověří jeden odkaz. U zvířete bere jméno, ID i obojí dohromady.
function overOdkaz(v, cil, kde, k, rejstriky, chyby) {
  if (cil !== 'zvire') {
    if (!rejstriky[cil].has(v)) chyby.push(`${kde}: '${k}' odkazuje na neexistující ${cil} '${v}'`);
    return;
  }
  const o = rozeberOdkaz(v);
  if (!o) { chyby.push(`${kde}: '${k}' není platný odkaz na zvíře`); return; }
  const vysledek = najdiZvire(o, rejstriky.zvire);
  if (vysledek.chyba) chyby.push(`${kde}: '${k}' ${vysledek.chyba}`);
}

function validuj(polozky, schema, rejstriky, chyby) {
  for (const p of polozky) {
    const kde = p.__soubor;
    if (p.__chyba) { chyby.push(`${kde}: ${p.__chyba}`); continue; }

    for (const k of schema.povinne) if (p[k] === undefined) chyby.push(`${kde}: chybí povinný klíč '${k}'`);

    for (const [k, v] of Object.entries(p)) {
      if (k.startsWith('__')) continue;
      const typ = schema.klice[k];
      if (!typ) { chyby.push(`${kde}: neznámý klíč '${k}' (překlep? povolené: ${Object.keys(schema.klice).join(', ')})`); continue; }
      if (v === null || v === undefined) continue;

      if (typeof typ === 'object' && typ.enum) {
        if (!typ.enum.includes(v)) chyby.push(`${kde}: '${k}' = '${v}' není povolená hodnota (${typ.enum.join(' | ')})`);
        continue;
      }
      const z = typ.replace(/\?$/, '');
      if (z === 'text' && typeof v !== 'string') chyby.push(`${kde}: '${k}' musí být text`);
      else if (z === 'cislo' && typeof v !== 'number') chyby.push(`${kde}: '${k}' musí být číslo`);
      else if (z === 'bool' && typeof v !== 'boolean') chyby.push(`${kde}: '${k}' musí být true/false`);
      else if (z === 'datum' && !jeDatum(v)) chyby.push(`${kde}: '${k}' musí být datum RRRR-MM-DD`);
      else if (z === 'uuid' && !UUID_RE.test(String(v))) chyby.push(`${kde}: '${k}' není platné UUID`);
      else if (z === 'seznam' && !Array.isArray(v)) chyby.push(`${kde}: '${k}' musí být seznam`);
      else if (z === 'preklad') { if (overMapu(v, kde, chyby, k, JAZYKY)) {} }
      else if (z === 'popisky') {
        if (overMapu(v, kde, chyby, k, JAZYKY)) {
          for (const [j, pp] of Object.entries(v)) overMapu(pp, kde, chyby, `popisky.${j}`, ['navesti', 'text']);
        }
      }
      else if (z === 'soukroma') overMapu(v, kde, chyby, k, ['aktivni', 'jazyk', 'jazyky', 'majitel', 'email', 'predano']);
      else if (z === 'certifikat') {
        if (overMapu(v, kde, chyby, k, SCH_CERT.povolene)) {
          if (v.typ && !SCH_CERT.typy.includes(v.typ)) chyby.push(`${kde}: certifikat.typ = '${v.typ}' není povolený (${SCH_CERT.typy.join(' | ')})`);
          if (v.jazyky && !Array.isArray(v.jazyky)) chyby.push(`${kde}: certifikat.jazyky musí být seznam`);
          for (const j of v.jazyky || []) if (!JAZYKY.includes(j)) chyby.push(`${kde}: certifikat.jazyky — neznámý jazyk '${j}'`);
        }
      }
      else if (z === 'kmotr') {
        if (overMapu(v, kde, chyby, k, SCH_KMOTR.povolene)) {
          for (const pole of ['osloveni', 'vyznam', 'dopis']) {
            if (v[pole] && typeof v[pole] === 'object') overMapu(v[pole], kde, chyby, `kmotr.${pole}`, JAZYKY);
          }
        }
      }
      else if (z.startsWith('ref:')) overOdkaz(v, z.slice(4), kde, k, rejstriky, chyby);
      else if (z.startsWith('ref-seznam:')) {
        const cil = z.slice(11);
        if (!Array.isArray(v)) { chyby.push(`${kde}: '${k}' musí být seznam`); continue; }
        for (const polozka of v) overOdkaz(polozka, cil, kde, k, rejstriky, chyby);
      }
    }
  }
}

function nacti({ tiche = false } = {}) {
  const zvirata = nactiSlozku('zvirata');
  const vrhy = nactiSlozku('vrhy');
  const assety = nactiSlozku('assety');
  const chyby = [];

  for (const s of [zvirata, vrhy, assety])
    for (const p of s)
      for (const k of ['narozeni', 'datum'])
        if (p[k] instanceof Date) p[k] = naText(p[k]);

  // Rejstřík zvířat dvojí: podle master ID a podle volacího jména.
  // Jméno může nést víc zvířat, proto seznam.
  const podleJmena = new Map();
  for (const z of zvirata) {
    if (!z.jmeno) continue;
    const k = klicJmena(z.jmeno);
    if (!podleJmena.has(k)) podleJmena.set(k, []);
    podleJmena.get(k).push(z);
  }
  const rejstriky = {
    zvire: { podleId: new Map(zvirata.filter((z) => z.id).map((z) => [z.id, z])), podleJmena },
    vrh: new Set(vrhy.map((v) => v.__slug)),
  };

  // ID: tvar, jedinečnost, shoda s názvem souboru
  const videnaId = new Map();
  for (const z of zvirata) {
    if (!z.id) continue;
    if (!ID_RE.test(z.id)) {
      chyby.push(`${z.__soubor}: 'id' = '${z.id}' nemá tvar FS01-G02-M001 (stanice, generace, pohlaví, pořadí)`);
      continue;
    }
    if (videnaId.has(z.id)) chyby.push(`${z.__soubor}: id '${z.id}' už používá ${videnaId.get(z.id)}`);
    videnaId.set(z.id, z.__soubor);

    const ocekavany = `${z.id}_${bezDiakritiky(z.jmeno || '')}.yaml`;
    if (path.basename(z.__soubor) !== ocekavany) {
      chyby.push(`${z.__soubor}: název souboru má být '${ocekavany}' (id + podtržítko + jméno bez diakritiky)`);
    }
  }

  validuj(zvirata, schemata.zvire, rejstriky, chyby);
  validuj(vrhy, schemata.vrh, rejstriky, chyby);
  validuj(assety, schemata.asset, rejstriky, chyby);

  // --- single source of truth: co patří vrhu, nesmí být u zvířete ---
  const vrhPodleId = Object.fromEntries(vrhy.map((v) => [v.__slug, v]));
  for (const z of zvirata) {
    if (z.vrh) {
      for (const k of ['narozeni', 'rodice_neznami']) {
        if (z[k] !== undefined && z[k] !== null) {
          chyby.push(`${z.__soubor}: '${k}' patří vrhu '${z.vrh}', ne zvířeti — smaž to, dopočítá se`);
        }
      }
    } else if (!z.rodice_neznami) {
      chyby.push(`${z.__soubor}: chybí 'vrh'. Když rodiče nejsou známi, napiš 'rodice_neznami: true'`);
    }
  }

  // dopočítané údaje — jediný zdroj je vrh
  // odkazy zredukujeme na holé master ID — ať byly zapsané jakkoli
  const naId = (v) => {
    const o = rozeberOdkaz(v);
    if (!o) return null;
    const r = najdiZvire(o, rejstriky.zvire);
    return r.zvire ? r.zvire.id : null;
  };
  for (const v of vrhy) { v.matka = naId(v.matka); v.otec = naId(v.otec); }
  for (const a of assety) {
    a.zvirata = (a.zvirata || []).map(naId).filter(Boolean);
    a.hlavni = naId(a.hlavni);
  }

  const generaceZ = (z, hloubka = 0) => {
    if (hloubka > 20) return 0;
    const v = z.vrh ? vrhPodleId[z.vrh] : null;
    if (!v) return 0;
    const m = rejstriky.zvire.podleId.get(v.matka);
    return m ? generaceZ(m, hloubka + 1) + 1 : 1;
  };
  for (const z of zvirata) {
    const v = z.vrh ? vrhPodleId[z.vrh] : null;
    z.matka = v ? v.matka : null;
    z.otec = v ? v.otec || null : null;
    z.otec_neznamy = v ? v.otec_neznamy || null : null;
    z.narozeni = v ? v.narozeni : z.narozeni || null;
    z.generace = generaceZ(z);
  }
  for (const v of vrhy) v.pocet = zvirata.filter((z) => z.vrh === v.__slug).length;

  // ID musí sedět s realitou — to je celý smysl toho, že v něm něco je vidět.
  // Zakladatelka = G00, její koťata G01, jejich koťata G02.
  for (const z of zvirata) {
    const m = z.id && z.id.match(ID_RE);
    if (!m) continue;
    const [, , gen, pohl] = m;
    if (pohl !== z.pohlavi) {
      chyby.push(`${z.__soubor}: id '${z.id}' říká ${pohl === 'M' ? 'kocour' : 'kočka'}, ale 'pohlavi' je '${z.pohlavi}'`);
    }
    if (Number(gen) !== z.generace) {
      chyby.push(`${z.__soubor}: id '${z.id}' říká generaci ${Number(gen)}, ale z vrhů vychází ${z.generace}` +
        ` — buď je špatně 'vrh:', nebo id (zakladatelka je G00, její koťata G01)`);
    }
  }

  // UUID: jedinečné, a když je zvíře prodané, musí existovat
  const videnaUuid = new Map();
  for (const z of zvirata) {
    if (!z.uuid) continue;
    if (videnaUuid.has(z.uuid)) chyby.push(`${z.__soubor}: uuid '${z.uuid}' už používá ${videnaUuid.get(z.uuid)}`);
    videnaUuid.set(z.uuid, z.__soubor);
  }
  for (const z of zvirata) {
    const s = z.soukroma_stranka;
    if (s && s.aktivni && !z.uuid) chyby.push(`${z.__soubor}: má aktivní soukromou stránku, ale chybí uuid`);
  }

  // vrh musí sedět: id vrhu je slug souboru
  for (const v of vrhy) if (v.id && v.id !== v.__slug) chyby.push(`${v.__soubor}: 'id' (${v.id}) se liší od názvu souboru (${v.__slug})`);

  // média a hlavní zvíře + povinné popisky
  for (const a of assety) {
    if (a.soubor) {
      const cleanPath = a.soubor.replace(/^assets\//, '').replace(/^foto\//, 'images/').replace(/^video\//, 'videos/');
      const existujeVAssets = fs.existsSync(path.join(KOREN, 'assets', cleanPath)) ||
        fs.existsSync(path.join(KOREN, 'assets', 'images', path.basename(cleanPath)));
      if (!existujeVAssets) chyby.push(`${a.__soubor}: soubor '${a.soubor}' neexistuje v assets/`);
    }
    if (a.hlavni && Array.isArray(a.zvirata) && !a.zvirata.includes(a.hlavni)) chyby.push(`${a.__soubor}: 'hlavni' (${a.hlavni}) musí být i v 'zvirata'`);
    if (a.viditelnost === 'majitel' && !a.token) chyby.push(`${a.__soubor}: asset pro majitele potřebuje 'token' — spusť 'npm run scan'`);

    if (a.viditelnost === 'verejne' && (a.typ === 'foto' || a.typ === 'video')) {
      const p = a.popisky || {};
      const dateVal = a.datum || (p.cs && p.cs.navesti);
      if (!dateVal) chyby.push(`${a.__soubor}: chybí datum pořízení ('datum:' nebo 'popisky.cs.navesti:')`);
      if (!p.cs || !p.cs.text) chyby.push(`${a.__soubor}: chybí český popisek ('popisky.cs.text:')`);
      if (!p.en || !p.en.text) chyby.push(`${a.__soubor}: chybí anglický popisek ('popisky.en.text:')`);
    }

    a.verejne = a.viditelnost === 'verejne';   // zkratka pro šablony
  }

  // obrácený index zvíře -> assety (M:N), klíčem je master ID
  const podleZvirete = {};
  for (const z of zvirata) podleZvirete[z.id] = [];
  for (const a of assety) for (const s of a.zvirata || []) if (podleZvirete[s]) podleZvirete[s].push(a);
  for (const v of Object.values(podleZvirete)) v.sort((x, y) => String(x.datum || '').localeCompare(String(y.datum || '')));

  const tagy = [...new Set(assety.flatMap((a) => a.tagy || []))].sort();

  if (!tiche && chyby.length) {
    console.error(`\n✗ ${chyby.length} chyb v datech:\n`);
    for (const ch of chyby) console.error('  ' + ch);
    console.error('');
  }
  return { zvirata, vrhy, assety, podleZvirete, tagy, chyby, KOREN, DATA, MEDIA };
}

module.exports = { nacti, KOREN, DATA, MEDIA, JAZYKY };
