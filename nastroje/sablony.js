// Šablony. Bez závislostí, obyčejné template literals.
// Třídy odpovídají stávajícímu styl.css, aby generované stránky vypadaly
// jako zbytek webu a nemusel se psát nový styl.

const E = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// text v daném jazyce s pádem zpět na češtinu
const T = (preklad, jazyk) => {
  if (!preklad) return '';
  return preklad[jazyk] || preklad.cs || preklad.en || '';
};

const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 2026-07-14 -> "14. července 2026" / "14 July 2026"
function datum(d, jazyk = 'cs') {
  if (!d) return '';
  const [r, m, den] = String(d).split('-').map(Number);
  if (!r) return String(d);
  return jazyk === 'en' ? `${den} ${MONTHS[m - 1]} ${r}` : `${den}. ${MESICE[m - 1]} ${r}`;
}

// české počítané podstatné jméno: 1 kotě, 2–4 koťata, 5+ koťat
function kotat(n) {
  if (n === 1) return '1 kotě';
  if (n >= 2 && n <= 4) return `${n} koťata`;
  return `${n} koťat`;
}

const SLOVNIK = {
  cs: {
    dokumenty: 'Dokumenty ke stažení', fotky: 'Fotografie a videa',
    tvoje: 'Vaše zvíře', narozen: 'Narozen', narozena: 'Narozena',
    matka: 'Matka', otec: 'Otec', vrh: 'Vrh', neuvedeno: 'neuvedeno',
    soukrome: 'Tato stránka je jen pro vás. Odkaz nikam nesdílejte.',
    kontakt: 'Kdykoli se ozvěte',
  },
  en: {
    dokumenty: 'Documents', fotky: 'Photographs and video',
    tvoje: 'Your animal', narozen: 'Born', narozena: 'Born',
    matka: 'Dam', otec: 'Sire', vrh: 'Litter', neuvedeno: 'not given',
    soukrome: 'This page is yours alone. Please do not share the link.',
    kontakt: 'Get in touch any time', certifikat: 'Certificate of origin',
  },
  fr: {
    dokumenty: 'Documents', fotky: 'Photographies et vidéo',
    tvoje: 'Votre animal', narozen: 'Né le', narozena: 'Née le',
    matka: 'Mère', otec: 'Père', vrh: 'Portée', neuvedeno: 'non indiqué',
    soukrome: "Cette page vous est réservée. Merci de ne pas partager le lien.",
    kontakt: 'Écrivez-nous quand vous voulez', certifikat: "Certificat d'origine",
  },
};
SLOVNIK.cs.certifikat = 'Osvědčení o původu';

const NAZVY_JAZYKU = { cs: 'Česky', en: 'English', fr: 'Français' };

function rozvrh({ titulek, jazyk = 'cs', telo, noindex = false, korenCss = '/' }) {
  return `<!DOCTYPE html>
<html lang="${jazyk}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? '<meta name="robots" content="noindex, nofollow, noarchive">' : ''}
<title>${E(titulek)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;1,300;1,400&family=Petrona:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${korenCss}styl.css">
<link rel="icon" href="${korenCss}favicon.ico">
</head>
<body>
${telo}
<script src="${korenCss}skript.js"></script>
</body>
</html>`;
}

// ---------- figura ----------

function figura(a, jazyk, url) {
  const p = (a.popisky || {})[jazyk] || (a.popisky || {}).cs || {};
  const popis = p.navesti || p.text
    ? `<figcaption>${p.navesti ? `<span class="datum">${E(p.navesti)}</span>` : ''}${p.text ? `<em>${E(p.text)}</em>` : ''}</figcaption>`
    : '';
  const alt = E(p.text || a.soubor);

  if (a.typ === 'video') {
    return `<figure>
  <video controls preload="metadata"${a.poster ? ` poster="${E(url(a.poster))}"` : ''}>
    <source src="${E(url(a.soubor))}" type="video/mp4">
  </video>${popis}
</figure>`;
  }
  if (a.typ === 'dokument') {
    return `<div class="polozka"><span><a href="${E(url(a.soubor))}">${E(p.navesti || a.soubor.split('/').pop())}</a>${p.text ? `<br><span style="font-size:.88rem;color:var(--text-tichy)">${E(p.text)}</span>` : ''}</span><span class="cena">PDF</span></div>`;
  }
  return `<figure>
  <img src="${E(url(a.soubor))}" alt="${alt}" loading="lazy">${popis}
</figure>`;
}

// ---------- privátní stránka majitele ----------

function stranakMajitele({ zvire, jazyk, assety, zvirata, url, kontakt, jazyky = [], uuid, prvni }) {
  const j = jazyk || 'cs';
  const s = SLOVNIK[j] || SLOVNIK.cs;
  // přepínač jazyků: první jazyk sedí na /<uuid>/, další na /<uuid>/<jazyk>/
  const prepinac = jazyky.length > 1
    ? `<p class="odkaz-dal">${jazyky.map((x) => x === j
        ? `<strong>${E(NAZVY_JAZYKU[x] || x)}</strong>`
        : `<a href="/${uuid}/${x === prvni ? '' : x + '/'}">${E(NAZVY_JAZYKU[x] || x)}</a>`).join(' · ')}</p>`
    : '';
  const fotky = assety.filter((a) => a.typ === 'foto' || a.typ === 'video');
  const doks = assety.filter((a) => a.typ === 'dokument');
  const jmenem = (id) => { const z = zvirata.find((x) => x.id === id); return z ? z.jmeno : id; };

  const profily = [zvire].map((z) => `
  <div class="kocka">
    <h3>${E(z.jmeno)}</h3>
    <span class="role">${E(z.pohlavi === 'M' ? s.narozen : s.narozena)} ${E(z.narozeni ? datum(z.narozeni, j) : s.neuvedeno)}${z.matka ? ` · ${E(s.matka)} ${E(jmenem(z.matka))}` : ''}${z.otec ? ` · ${E(s.otec)} ${E(jmenem(z.otec))}` : ''}</span>
    ${T(z.pojmenovan_po, j) ? `<p class="duraz">${E(T(z.pojmenovan_po, j))}</p>` : ''}
    ${T(z.popis, j) ? `<p>${E(T(z.popis, j)).trim().replace(/\n\n+/g, '</p><p>')}</p>` : ''}
  </div>`).join('\n');

  const telo = `
<header class="hlavicka">
  <a href="/" style="text-decoration:none; color:inherit; display:inline-block;">
    <img class="znak" src="/assets/images/logo.png" alt="Felis Noetica">
    <h1 class="jmeno-stanice">Felis Noetica</h1>
  </a>
  <p class="podtitul">${E(s.tvoje)}</p>
</header>

<section class="blok obal">
  ${profily}
</section>

${doks.length ? `<section class="prouzek">
  <div class="obal">
    <span class="navesti">${E(s.dokumenty)}</span>
    <div class="cenik">
      ${doks.map((a) => figura(a, j, url)).join('\n      ')}
    </div>
  </div>
</section>` : ''}

${fotky.length ? `<section class="blok obal obal-siroky">
  <span class="navesti">${E(s.fotky)}</span>
  ${fotky.map((a) => figura(a, j, url)).join('\n  ')}
</section>` : ''}

<section class="blok obal">
  <div class="cenik">
    <div class="polozka"><span><a href="/${E(uuid)}/certifikat-${E(j)}.html">${E(s.certifikat)}</a></span><span class="cena">HTML</span></div>
  </div>
</section>

<footer class="pata obal">
  ${prepinac}
  <p class="mail"><a href="mailto:${E(kontakt.email)}">${E(kontakt.email)}</a></p>
  <p>${E(s.kontakt)} — ${E(kontakt.telefon)}</p>
  <p class="uredni">${E(s.soukrome)}</p>
</footer>`;

  return rozvrh({ titulek: `${zvire.jmeno} — Felis Noetica`, jazyk: j, telo, noindex: true });
}

// ---------- fragment aktuálních koťat pro index.html ----------

function fragmentKotata({ vrhy, zvirata, assety, jazyk, url }) {
  const podleVrhu = {};
  for (const z of zvirata) if (z.vrh) (podleVrhu[z.vrh] ||= []).push(z);

  const jm = (id) => { const z = zvirata.find((x) => x.id === id); return z ? z.jmeno : id; };

  const stavyText = {
    volne: { cs: 'volné', en: 'available' },
    prodano: { cs: 'prodáno', en: 'sold' },
    rezervovano: { cs: 'rezervováno', en: 'reserved' },
  };

  const pohlaviOrder = { M: 1, F: 2 };

  return vrhy.filter((v) => v.verejne && (podleVrhu[v.__slug] || []).some((z) => z.verejne && z.stav === 'volne')).map((v) => {
    const kotata = (podleVrhu[v.__slug] || []).filter((z) => z.verejne);
    kotata.sort((a, b) => {
      const pA = pohlaviOrder[a.pohlavi] || 9;
      const pB = pohlaviOrder[b.pohlavi] || 9;
      if (pA !== pB) return pA - pB;
      return a.id.localeCompare(b.id);
    });

    const kotataIds = kotata.map((k) => k.id);
    const fotoVrhu = assety.find((x) => (x.tagy || []).includes('skupina') && (x.zvirata || []).some((id) => kotataIds.includes(id)) && x.typ === 'foto' && x.viditelnost === 'verejne');

    let vrhFotoHtml = '';
    if (fotoVrhu) {
      const p = (fotoVrhu.popisky || {})[jazyk] || (fotoVrhu.popisky || {}).cs || {};
      const navestiText = p.navesti || datum(fotoVrhu.datum || v.narozeni, jazyk);
      const emText = p.text || '';
      vrhFotoHtml = `\n  <figure class="vrh-foto" data-full="${E(url(fotoVrhu.soubor))}" data-gallery="${E(v.__slug.toLowerCase())}-skupina" style="margin: 1.25rem 0 1.5rem 0;">
    <img src="${E(url(fotoVrhu.soubor))}" alt="${E(v.id)}" style="width:100%; height:auto; border-radius:3px; display:block; cursor:pointer;">
    <figcaption><span class="datum">${E(navestiText)}</span><em>${E(emText)}</em></figcaption>
  </figure>`;
    }

    const pocet = jazyk === 'en' ? `${kotata.length} kittens` : kotat(kotata.length);
    return `<div class="vrh">
  <p class="vrh-hlava">${jazyk === 'en' ? `${E(jm(v.matka))}'s litter` : `Vrh ${E(jm(v.matka))}`} <span class="vrh-datum">· ${E(datum(v.narozeni, jazyk))}</span></p>${vrhFotoHtml}
${kotata.map((z) => {
  // Preferovat explicitní hlavní fotku kotěte, jinak fotku obsahující 'detail', jinak jakoukoliv jeho fotku
  const a = assety.find((x) => x.hlavni === z.id && x.typ === 'foto' && x.viditelnost === 'verejne')
         || assety.find((x) => x.zvirata && x.zvirata.includes(z.id) && x.typ === 'foto' && x.viditelnost === 'verejne' && x.soubor.includes('detail'))
         || assety.find((x) => x.zvirata && x.zvirata.includes(z.id) && x.typ === 'foto' && x.viditelnost === 'verejne');

  const src = a ? url(a.soubor) : null;
  const slug = z.jmeno.toLowerCase();
  const captionText = T(z.pojmenovan_po, jazyk) || z.jmeno;
  const pohlaviText = z.pohlavi === 'M' ? (jazyk === 'en' ? 'male' : 'kocour') : (jazyk === 'en' ? 'female' : 'kočka');

  const figureHtml = src
    ? `<figure class="kote-foto" data-full="${E(src)}" data-gallery="${E(slug)}" style="margin:0;">
        <img src="${E(src)}" alt="Kotě ${E(z.jmeno)}" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:3px; cursor:pointer; display:block;">
        <figcaption><span class="datum">${E(datum(v.narozeni, jazyk))}</span><em>${E(z.jmeno)}, ${E(pohlaviText)} — ${E(captionText)}</em></figcaption>
      </figure>`
    : `<figure class="kote-foto" style="margin:0;">
        <div class="misto"><span>FOTO</span></div>
      </figure>`;

  const stavObj = stavyText[z.stav] || stavyText.volne;
  const stavLabel = T(stavObj, jazyk).toUpperCase();
  const bezDia = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slugJmena = (s) => bezDia(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const datumNar = z.narozeni || v.narozeni || '';
  const rok = (datumNar || '').slice(0, 4);
  const langSuffix = (jazyk && jazyk !== 'cs') ? `${jazyk}/` : '';
  const verejnaUrl = (z.verejne !== false && rok)
    ? `/kotata/${rok}/${slugJmena(z.jmeno)}/${langSuffix}`
    : (z.uuid ? `/${z.uuid}/${langSuffix}` : null);

  let textOdkazu = z.jmeno.toUpperCase();
  if (z.stav === 'volne') {
    const volneSlovo = jazyk === 'en'
      ? 'AVAILABLE'
      : (z.pohlavi === 'M' ? 'VOLNÝ' : 'VOLNÁ');
    textOdkazu += ` · ${volneSlovo}`;
  }

  const stavClass = z.stav === 'volne' ? 'stav-volne' : 'stav-jine';
  const stavHtml = verejnaUrl
    ? `<a href="${E(verejnaUrl)}" class="stav ${stavClass}" style="text-decoration:none !important; border-bottom:none !important;">${E(textOdkazu)} &rarr;</a>`
    : `<span class="stav ${stavClass}">${E(textOdkazu)}</span>`;

  return `  <div class="kote">
    ${figureHtml}
    <div class="kote-text">
      <p class="kote-jmeno">${E(z.jmeno)}</p>
      ${T(z.pojmenovan_po, jazyk) ? `<p class="kote-po">${E(pohlaviText)} — ${E(T(z.pojmenovan_po, jazyk))}</p>` : ''}
      ${stavHtml}
    </div>
  </div>`;
}).join('\n')}
</div>`;
  }).join('\n');
}

module.exports = { rozvrh, figura, stranakMajitele, fragmentKotata, E, T, datum, kotat, SLOVNIK };
