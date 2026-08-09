// Certifikát. Všechno na něm je odvozené z dat — jméno, ID, datum, rodiče
// i jejich genotypy (ty se berou z jejich vlastních záznamů, neopisují se).
// QR kód je funkce adresy stránky, ne uložený obrázek.

const fs = require('fs');
const path = require('path');
const QR = require('qrcode');
const { E, T, datum } = require('./sablony');

// SVG, ne PNG: ostrý v tisku i na displeji a bez dalšího souboru v repozitáři.
async function qrSvg(adresa) {
  return QR.toString(adresa, {
    type: 'svg', margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#2E2B27', light: '#00000000' },
  });
}

const TEXTY = {
  cs: {
    stanice: 'Chovná stanice evropských krátkosrstých koček (FIFe reg. č. 7944)',
    titulPuvod: 'Osvědčení o původu a jménu',
    titulKmotr: 'Certifikát čestného kmotrovství',
    osvedcujeSePuvod: 'Tímto se oficiálně osvědčuje původ a jméno jedince',
    osvedcujeSeKmotr: 'Tímto se oficiálně osvědčuje původ, jméno a čestné kmotrovství jedince',
    id: 'ID', pohlavi: 'Pohlaví', kocour: 'Kocour (♂)', kocka: 'Kočka (♀)',
    narozeni: 'Datum narození', zbarveni: 'Zbarvení', matka: 'Matka', otec: 'Otec',
    vyznamNadpis: 'Význam a inspirace jména', vDne: (m, d) => `V ${m === 'Brno' ? 'Brně' : m} dne ${d}`,
    chovatel: 'Chovatel / Felis Noetica', qrPopis: 'Digitální rodokmen a ověření původu',
    registrace: 'FIFe reg. č. 7944 · ČSCH reg. č. 30214',
  },
  en: {
    stanice: 'Cattery of European Shorthair Cats (FIFe reg. no. 7944)',
    titulPuvod: 'Certificate of Origin and Name',
    titulKmotr: 'Certificate of Honorary Godparenthood',
    osvedcujeSePuvod: 'This officially certifies the origin and name of',
    osvedcujeSeKmotr: 'This officially certifies the origin, name, and honorary godparenthood of',
    id: 'ID', pohlavi: 'Sex', kocour: 'Male (♂)', kocka: 'Female (♀)',
    narozeni: 'Date of Birth', zbarveni: 'Coat', matka: 'Dam', otec: 'Sire',
    vyznamNadpis: 'Meaning & Dedication', vDne: (m, d) => `Given at ${m}, ${d}`,
    chovatel: 'Breeder / Felis Noetica', qrPopis: 'Digital pedigree and verification',
    registrace: 'FIFe reg. no. 7944 · ČSCH reg. no. 30214 · A VIRTÙ RESEARCH & TECHNOLOGIES s.r.o.',
  },
  fr: {
    stanice: 'Élevage de chats de race Européen (European Shorthair) — FIFe n° 7944',
    titulPuvod: "Certificat d'origine et de nom",
    titulKmotr: "Certificat de parrainage d'honneur",
    osvedcujeSePuvod: "Le présent document atteste officiellement l'origine et le nom de",
    osvedcujeSeKmotr: "Le présent document atteste officiellement l'origine, le nom et le parrainage d'honneur de",
    id: 'Identifiant', pohlavi: 'Sexe', kocour: 'mâle (♂)', kocka: 'femelle (♀)',
    narozeni: 'Date de naissance', zbarveni: 'Robe', matka: 'Mère', otec: 'Père',
    vyznamNadpis: 'Signification et dédicace', vDne: (m, d) => `Fait à ${m}, le ${d}`,
    chovatel: 'Éleveur / Felis Noetica', qrPopis: 'Généalogie numérique et vérification',
    registrace: 'FIFe n° 7944 · ČSCH n° 30214 · A VIRTÙ RESEARCH & TECHNOLOGIES s.r.o.',
  },
};

// "Sibyla (G1, O/o S/s)" — jméno z jeho záznamu, generace dopočítaná, genotyp jeho.
function rodic(zvirata, id) {
  const z = zvirata.find((x) => x.id === id);
  if (!z) return null;
  const casti = [`G${z.generace}`, z.genotyp].filter(Boolean).join(', ');
  return casti ? `${z.jmeno} (${casti})` : z.jmeno;
}

function certifikat({ zvire, jazyk, zvirata, qr, adresa, url, relKoren = '' }) {
  const prefixDist = !relKoren ? '' : (relKoren.endsWith('/') ? relKoren : relKoren + '/');
  const prefixAssets = !relKoren ? '../assets/' : (relKoren.endsWith('/') ? relKoren + '../assets/' : relKoren + '/../assets/');

  const t = TEXTY[jazyk] || TEXTY.cs;
  const c = zvire.certifikat || {};
  const kmotrovsky = c.typ === 'kmotrovsky' && zvire.kmotr;
  const k = zvire.kmotr || {};

  const udaje = [
    [t.id, zvire.id],
    [t.pohlavi, zvire.pohlavi === 'M' ? t.kocour : t.kocka],
    [t.narozeni, datum(zvire.narozeni, jazyk)],
    [t.zbarveni, [T(zvire.zbarveni, jazyk), zvire.genotyp ? `(${zvire.genotyp})` : ''].filter(Boolean).join(' ')],
    [t.matka, rodic(zvirata, zvire.matka)],
    [t.otec, zvire.otec ? rodic(zvirata, zvire.otec) : T(zvire.otec_neznamy, jazyk)],
  ].filter(([, v]) => v);

  const vyznamRaw = T(zvire.vyznam, jazyk)
    || (zvire.kmotr && T(zvire.kmotr.vyznam, jazyk))
    || T(zvire.pojmenovan_po, jazyk);
  const vyznamNadpisText = (zvire.kmotr && (T(zvire.kmotr.osloveni, jazyk) || zvire.kmotr.jmeno))
    ? E(T(zvire.kmotr.osloveni, jazyk) || zvire.kmotr.jmeno)
    : (T(zvire.pojmenovan_po, jazyk) ? E(T(zvire.pojmenovan_po, jazyk)) : '');

  const bezDia = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slugJmena = (s) => bezDia(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = slugJmena(zvire.jmeno);

  const artUrl = c.art ? url(c.art, relKoren) : `${prefixDist}assets/images/c.art`;

  return `<!DOCTYPE html>
<html lang="${jazyk}" class="notranslate" translate="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google" content="notranslate">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${E(zvire.id)} ${E(zvire.jmeno)} — ${E(kmotrovsky ? t.titulKmotr : t.titulPuvod)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..800;1,6..72,300..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefixDist}hub.css">
</head>
<body class="notranslate" translate="no">

<div class="strana strana-titulni-grafika" style="background-image: url('${artUrl}')"></div>

<div id="strana-certifikat" class="strana notranslate" translate="no">
  <img src="${artUrl}" alt="" class="certifikat-overlay-img" onerror="this.style.display='none'">
  <div class="certifikat-vnitrni-ram">
    <div>
      <p class="jmeno-stanice">Felis Noetica</p>
      <p class="podtitul">INTELLIGENTIA ET CONCORDIA</p>
      <p style="font-size:8.5pt;color:var(--text-tichy);margin-top:2px">${E(t.stanice)}</p>
    </div>

${c.foto ? `    <div style="text-align:center;margin:4px 0">
      <div class="foto-kolecko"><img src="${E(url(c.foto, relKoren))}" alt="${E(zvire.jmeno)}"></div>
    </div>` : ''}

    <div>
      <div class="certifikat-titul">${E(kmotrovsky ? t.titulKmotr : t.titulPuvod)}</div>
${kmotrovsky ? '      <div class="certifikat-podtitul">Patrinus honorarius</div>' : ''}
      <div class="certifikujese">${E(kmotrovsky ? t.osvedcujeSeKmotr : t.osvedcujeSePuvod)}</div>
      <div class="jmeno-zviratko">${E(zvire.jmeno)}</div>
${zvire.formalni_jmeno ? `      <div class="formalni-jmeno">${E(zvire.formalni_jmeno)}</div>` : ''}
    </div>

    <div class="udaje-mriezk">
      ${udaje.map(([n, v]) => `<div class="udaj-polozka"><strong>${E(n)}:</strong> ${E(v)}</div>`).join('\n      ')}
    </div>

${vyznamRaw ? `    <div class="vyznam-box">
      <div class="vyznam-nadpis">${vyznamNadpisText}</div>
      ${E(vyznamRaw.trim())}
    </div>` : ''}

    <div class="certifikat-dole-obal">
      <div class="certifikat-datum">${E(t.vDne(c.misto || 'Brno', datum(c.datum, jazyk)))}</div>
      <div class="podpisy-mriezka">
        <div class="podpis-line">
          <img src="${prefixDist}assets/images/podpis.png" alt="" class="podpis-grafika-img" onerror="this.style.display='none'">
          <strong>Viktor Lošťák</strong><br>${E(t.chovatel)}
        </div>
        <div class="qr-blok-pravo">
          <span class="qr-img">${qr}</span>
          <span>${E(t.qrPopis)}<br>${E(adresa)}</span>
        </div>
      </div>
      <div class="certifikat-registrace">${E(t.registrace)}</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

module.exports = { certifikat, qrSvg, JAZYKY_CERTIFIKATU: Object.keys(TEXTY) };
