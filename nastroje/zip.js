// Minimální zapisovač ZIP, bez závislostí.
//
// Ukládá metodou "store" (bez komprese). Není to lenost: fotky JPEG a PDF
// jsou už komprimované, deflate by na nich ušetřil jednotky procent a stál
// by čas při každém buildu. Textové soubory v balíčku nejsou.
//
// Formát: PKZIP APPNOTE 6.3.2, bez Zip64 (jeden balíček koťete se do 4 GB vejde).

const fs = require('fs');
const zlib = require('zlib');

// MS-DOS čas a datum
function dosCas(d) {
  return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xffff;
}
function dosDatum(d) {
  return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
}

function vytvorZip(polozky, kdy = new Date(2026, 0, 1, 12, 0, 0)) {
  const casti = [];
  const rejstrik = [];
  let posun = 0;

  for (const { nazev, data } of polozky) {
    const jmenoBuf = Buffer.from(nazev, 'utf8');
    const crc = zlib.crc32 ? zlib.crc32(data) : crc32(data);
    const cas = dosCas(kdy), dat = dosDatum(kdy);

    const hlavicka = Buffer.alloc(30);
    hlavicka.writeUInt32LE(0x04034b50, 0);   // podpis
    hlavicka.writeUInt16LE(20, 4);           // verze
    hlavicka.writeUInt16LE(0x0800, 6);       // příznak: názvy v UTF-8
    hlavicka.writeUInt16LE(0, 8);            // metoda: store
    hlavicka.writeUInt16LE(cas, 10);
    hlavicka.writeUInt16LE(dat, 12);
    hlavicka.writeUInt32LE(crc, 14);
    hlavicka.writeUInt32LE(data.length, 18);
    hlavicka.writeUInt32LE(data.length, 22);
    hlavicka.writeUInt16LE(jmenoBuf.length, 26);
    hlavicka.writeUInt16LE(0, 28);

    casti.push(hlavicka, jmenoBuf, data);
    rejstrik.push({ nazev: jmenoBuf, crc, velikost: data.length, posun, cas, dat });
    posun += hlavicka.length + jmenoBuf.length + data.length;
  }

  const zaznamy = [];
  for (const r of rejstrik) {
    const z = Buffer.alloc(46);
    z.writeUInt32LE(0x02014b50, 0);
    z.writeUInt16LE(20, 4);
    z.writeUInt16LE(20, 6);
    z.writeUInt16LE(0x0800, 8);
    z.writeUInt16LE(0, 10);
    z.writeUInt16LE(r.cas, 12);
    z.writeUInt16LE(r.dat, 14);
    z.writeUInt32LE(r.crc, 16);
    z.writeUInt32LE(r.velikost, 20);
    z.writeUInt32LE(r.velikost, 24);
    z.writeUInt16LE(r.nazev.length, 28);
    z.writeUInt32LE(r.posun, 42);
    zaznamy.push(z, r.nazev);
  }

  const rejstrikBuf = Buffer.concat(zaznamy);
  const konec = Buffer.alloc(22);
  konec.writeUInt32LE(0x06054b50, 0);
  konec.writeUInt16LE(rejstrik.length, 8);
  konec.writeUInt16LE(rejstrik.length, 10);
  konec.writeUInt32LE(rejstrikBuf.length, 12);
  konec.writeUInt32LE(posun, 16);

  return Buffer.concat([...casti, rejstrikBuf, konec]);
}

// Záloha pro Node bez zlib.crc32
let tabulka = null;
function crc32(buf) {
  if (!tabulka) {
    tabulka = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabulka[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = tabulka[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Poskládá ZIP ze souborů na disku a z textů vyrobených při buildu.
function zipZeSouboru(soubory, textovky = []) {
  const polozky = [];
  const pouzita = new Set();
  const jedinecny = (n) => {
    if (!pouzita.has(n)) { pouzita.add(n); return n; }
    const tecka = n.lastIndexOf('.');
    const zaklad = tecka > 0 ? n.slice(0, tecka) : n;
    const pripona = tecka > 0 ? n.slice(tecka) : '';
    let i = 2;
    while (pouzita.has(`${zaklad}-${i}${pripona}`)) i++;
    const novy = `${zaklad}-${i}${pripona}`;
    pouzita.add(novy);
    return novy;
  };
  for (const { nazev, cesta } of soubory) {
    if (!fs.existsSync(cesta)) continue;
    polozky.push({ nazev: jedinecny(nazev), data: fs.readFileSync(cesta) });
  }
  for (const { nazev, obsah } of textovky) {
    polozky.push({ nazev: jedinecny(nazev), data: Buffer.from(obsah, 'utf8') });
  }
  return vytvorZip(polozky);
}

module.exports = { vytvorZip, zipZeSouboru };
