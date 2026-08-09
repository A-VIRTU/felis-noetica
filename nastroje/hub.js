// Rozcestník ke stažení — stránka jednoho zvířete.
//
// Stejná šablona se vykreslí dvakrát:
//   /kotata/<rok>/<jmeno>/   veřejná    → jen položky s viditelnost: verejne
//   /<uuid>/                 majitelova → navíc všechno s viditelnost: majitel

const { E, T, datum } = require('./sablony');

const TEXTY = {
  cs: {
    titulek: 'Dokumentační centrum jedince', kestazeni: 'Soubory ke stažení',
    narozen: 'Narozen', narozena: 'Narozena', matka: 'Matka', otec: 'Otec',
    kocour: 'Kocour', kocka: 'Kočka',
    tisk: 'Vytisknout / Uložit PDF', tiskPopis: 'Vytisknout nebo uložit dokumentaci do PDF',
    tlacitkoTisk: 'Vytisknout', otevrit: 'Otevřít', stahnout: 'Stáhnout',
    zip: 'Stáhnout vše (ZIP)', zipPopis: 'Všechny fotky, videa a dokumenty v jednom archivu',
    certPuvod: 'Osvědčení o původu a jménu', certKmotr: 'Certifikát čestného kmotrovství',
    jenProVas: 'Tato stránka je jen pro vás. Odkaz nikam nesdílejte.',
    verejna: 'Veřejná stránka. Majitel má vlastní adresu s další dokumentací.',
    prazdno: 'Zatím tu není nic ke stažení.', fotky: 'Fotografie a videa',
  },
  en: {
    titulek: 'Documentation Centre', kestazeni: 'Files to download',
    narozen: 'Born', narozena: 'Born', matka: 'Dam', otec: 'Sire',
    kocour: 'Male', kocka: 'Female',
    tisk: 'Print / Save as PDF', tiskPopis: 'Print or save the documentation as PDF',
    tlacitkoTisk: 'Print', otevrit: 'Open', stahnout: 'Download',
    zip: 'Download all (ZIP)', zipPopis: 'All photos, videos and documents in a single archive',
    certPuvod: 'Certificate of Origin and Name', certKmotr: 'Certificate of Honorary Godparenthood',
    jenProVas: 'This page is yours alone. Please do not share the link.',
    verejna: 'Public page. The owner has a separate address with further documentation.',
    prazdno: 'Nothing to download yet.', fotky: 'Photographs and video',
  },
  fr: {
    titulek: 'Centre de documentation', kestazeni: 'Fichiers à télécharger',
    narozen: 'Né le', narozena: 'Née le', matka: 'Mère', otec: 'Père',
    kocour: 'Mâle', kocka: 'Femelle',
    tisk: 'Imprimer / Enregistrer en PDF', tiskPopis: 'Imprimer ou sauvegarder la documentation en PDF',
    tlacitkoTisk: 'Imprimer', otevrit: 'Ouvrir', stahnout: 'Télécharger',
    zip: 'Tout télécharger (ZIP)', zipPopis: 'Toutes les photos, vidéos et documents dans une archive',
    certPuvod: "Certificat d'origine et de nom", certKmotr: "Certificat de parrainage d'honneur",
    jenProVas: 'Cette page vous est réservée. Merci de ne pas partager le lien.',
    verejna: "Page publique. Le propriétaire dispose d'une adresse séparée.",
    prazdno: 'Rien à télécharger pour le moment.', fotky: 'Photographies et vidéo',
  },
};

const NAZVY_JAZYKU = { cs: 'Česky', en: 'English', fr: 'Français' };

const IKONY_SVG = {
  certifikat: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
  dokument: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
  tisk: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
  zip: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  sipka: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
};

// Jedna položka v klidném seznamu ke stažení.
function karta({ ikona, nadpis, popis, odkaz, onclick }) {
  const ikonaSvg = IKONY_SVG[ikona] || IKONY_SVG.sipka;
  const vnitrek = `
      <div class="ke-stazeni-text">
        <strong>${E(nadpis)}</strong>
        ${popis ? `<span>${E(popis)}</span>` : ''}
      </div>
      <div class="ke-stazeni-ikona">${ikonaSvg}</div>`;
  return onclick
    ? `<div class="ke-stazeni-polozka" style="cursor:pointer" onclick="${onclick}">${vnitrek}\n    </div>`
    : `<a href="${E(odkaz)}"${odkaz.endsWith('.zip') ? ' download' : ' target="_blank" rel="noopener"'} class="ke-stazeni-polozka">${vnitrek}\n    </a>`;
}

// Sestaví seznam položek ke stažení podle úrovně přístupu.
function polozky({ zvire, assety, jazyk, url, majitel }) {
  const t = TEXTY[jazyk] || TEXTY.cs;
  const ven = [];

  // 1. ZIP — Stáhnout vše
  ven.push(karta({
    ikona: 'zip', nadpis: t.zip, popis: t.zipPopis,
    odkaz: `${zvire.jmeno.normalize('NFD').replace(/[̀-ͯ]/g, '')}_Felis_Noetica.zip`,
  }));

  // 2. certifikáty
  const c = zvire.certifikat;
  if (c && (majitel || (c.viditelnost || 'verejne') === 'verejne')) {
    const certTyp = c.typ === 'kmotrovsky' ? 'kmotrovsky' : 'puvod';
    const nadpisyMap = {
      puvod: {
        cs: 'Osvědčení o původu a jménu',
        en: 'Certificate of Origin and Name',
        fr: "Certificat d'origine et de nom",
      },
      kmotrovsky: {
        cs: 'Certifikát čestného kmotrovství',
        en: 'Certificate of Honorary Godparenthood',
        fr: "Certificat de parrainage d'honneur",
      },
    };
    for (const j of c.jazyky || [jazyk]) {
      const nadpisCert = (nadpisyMap[certTyp] || {})[j] || (nadpisyMap[certTyp] || {}).cs;
      const targetUrl = c.soubor ? url(c.soubor) : `certifikat-${j}.html`;
      ven.push(karta({
        ikona: 'certifikat',
        nadpis: nadpisCert,
        popis: zvire.kmotr ? `${(zvire.kmotr.osloveni || {})[j] || zvire.kmotr.jmeno}` : null,
        odkaz: targetUrl,
      }));
    }
  }

  // 3. assety — filtr rozhoduje o všem
  const viditelne = assety.filter((a) =>
    a.viditelnost === 'verejne' || (majitel && a.viditelnost === 'majitel'));

  for (const a of viditelne.filter((x) => x.typ === 'dokument')) {
    const p = (a.popisky || {})[jazyk] || (a.popisky || {}).cs || {};
    ven.push(karta({
      ikona: (a.tagy || []).includes('genomia') ? 'dokument' : 'dokument',
      nadpis: p.navesti || a.soubor.split('/').pop(),
      popis: p.text, odkaz: url(a.soubor),
    }));
  }

  // 4. tisk do PDF
  ven.push(karta({ ikona: 'tisk', nadpis: t.tisk, popis: t.tiskPopis, onclick: 'window.print()' }));

  return { karty: ven, fotky: viditelne.filter((x) => x.typ === 'foto' || x.typ === 'video') };
}

function hub({ zvire, jazyk, assety, url, majitel, jazyky = [], koren, jmenem, kontakt, zvirata = [] }) {
  const j = jazyk || 'cs';
  const t = TEXTY[j] || TEXTY.cs;
  const { karty, fotky } = polozky({ zvire, assety, jazyk: j, url, majitel });

  const prepinac = jazyky.length > 1
    ? `<p class="prepinac" style="margin:0 0 15px 0; font-size:0.9rem; text-align:right; color:var(--text-tichy);">${jazyky.map((x) => {
        const linkRel = (x === j) ? null : (x === jazyky[0] ? '../' : (j === jazyky[0] ? `${x}/` : `../${x}/`));
        if (x === j) return `<strong>${E(NAZVY_JAZYKU[x] || x)}</strong>`;
        return `<a href="${E(linkRel)}" onclick="sessionStorage.setItem('lang-selected','${x}')" style="color:var(--akcent); text-decoration:none;">${E(NAZVY_JAZYKU[x] || x)}</a>`;
      }).join(' · ')}</p>`
    : '';

  const scriptDetekce = (jazyky.length > 1 && j === jazyky[0]) ? `<script>
  (function() {
    if (sessionStorage.getItem('lang-selected')) return;
    var urlParams = new URLSearchParams(window.location.search);
    var langParam = urlParams.get('lang');
    if (langParam) {
      sessionStorage.setItem('lang-selected', langParam);
      return;
    }
    if (document.referrer && document.referrer.indexOf(window.location.hostname) !== -1) {
      sessionStorage.setItem('lang-selected', '${j}');
      return;
    }
    var langs = navigator.languages || [navigator.language || navigator.userLanguage];
    var isCzechOrSlovakOrPolish = false;
    for (var i = 0; i < langs.length; i++) {
      var l = langs[i].toLowerCase();
      if (l.indexOf('cs') === 0 || l.indexOf('sk') === 0 || l.indexOf('pl') === 0) {
        isCzechOrSlovakOrPolish = true;
        break;
      }
    }
    if (!isCzechOrSlovakOrPolish) {
      window.location.replace('en/');
    }
  })();
</script>` : '';

  const formatRodic = (id, label) => {
    if (!id) return null;
    const r = zvirata.find((x) => x.id === id);
    const jmeno = r ? r.jmeno : jmenem(id);
    if (r && r.verejne) {
      const bezDia = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const slugJmena = (s) => bezDia(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const datumNar = r.narozeni || '';
      const rok = (datumNar || '').slice(0, 4);
      if (rok) {
        const langPath = (j && j !== 'cs') ? `${j}/` : '';
        const parentUrl = `/kotata/${rok}/${slugJmena(r.jmeno)}/${langPath}`;
        return `${E(label)}: <a href="${E(parentUrl)}" style="color:inherit; text-decoration:none;">${E(jmeno)}</a>`;
      }
    }
    return `${E(label)}: ${E(jmeno)}`;
  };

  const matkaText = formatRodic(zvire.matka, t.matka);
  const otecText = zvire.otec
    ? formatRodic(zvire.otec, t.otec)
    : (zvire.otec_neznamy ? `${E(t.otec)}: ${E(T(zvire.otec_neznamy, j))}` : null);

  const rodice = [matkaText, otecText].filter(Boolean).join(' · ');

  const zakladniUdaje = [
    E(T(zvire.zbarveni, j)),
    E(zvire.pohlavi === 'M' ? `${t.kocour} (♂)` : `${t.kocka} (♀)`),
    E(`${zvire.pohlavi === 'M' ? t.narozen : t.narozena} ${datum(zvire.narozeni, j)}`),
    rodice,
  ].filter(Boolean).join(' · ');

  const artSlug = zvire.jmeno.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const artPath = `/assets/images/${artSlug}-art.jpg`;

  const vyznamRaw = T(zvire.vyznam, j)
    || (zvire.kmotr && T(zvire.kmotr.vyznam, j))
    || T(zvire.pojmenovan_po, j);
  const vyznamText = vyznamRaw ? vyznamRaw.trim() : '';

  return `<!DOCTYPE html>
<html lang="${j}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${majitel ? '<meta name="robots" content="noindex, nofollow, noarchive">' : ''}
<title>${E(zvire.id)} ${E(zvire.jmeno)} — ${E(t.titulek)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..800;1,6..72,300..800&family=Petrona:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styl.css?v=20260809b">
<link rel="stylesheet" href="/hub.css?v=20260809b">
${scriptDetekce}
</head>
<body>
<div class="hub-container">
  ${prepinac}
  <div class="hub-header" style="border-bottom:none; margin-bottom:15px; padding-bottom:0;">
    <figure class="hub-art-figure" data-full="${E(artPath)}" style="margin:0 0 20px 0; cursor:pointer;">
      <img src="${E(artPath)}" alt="${E(zvire.jmeno)}" class="hub-art-img" style="max-width:280px; width:100%; height:auto; display:block; margin:0 auto; border-radius:6px;">
    </figure>
    <div class="hub-karta" style="margin-top:0;">
      <span class="hub-id">${E(zvire.id)}</span>
      <h1 class="hub-jmeno">${E(zvire.formalni_jmeno || zvire.jmeno)}</h1>
      ${vyznamText ? `<p class="hub-vyznam" style="margin-top:6px; margin-bottom:12px; font-style:italic; color:var(--text-tichy); font-size:1.02rem; line-height:1.5;">${E(vyznamText)}</p>` : ''}
      <p class="hub-detail">${zakladniUdaje}</p>
    </div>
  </div>

${fotky.length ? `  <h2 class="hub-sekce-nadpis">${E(t.fotky)}</h2>
  <div class="fotomriezka">
    ${fotky.map((a) => {
      const p = (a.popisky || {})[j] || (a.popisky || {}).cs || {};
      const navesti = p.navesti || (a.datum ? datum(a.datum, j) : '');
      const captionParts = [
        navesti ? `<span class="datum">${E(navesti)}</span>` : '',
        p.text ? `<em>${E(p.text)}</em>` : '',
      ].filter(Boolean).join('');
      const figcaption = captionParts ? `<figcaption>${captionParts}</figcaption>` : '';
      return a.typ === 'video'
        ? `<figure><video controls preload="metadata"><source src="${E(url(a.soubor))}" type="video/mp4"></video>${figcaption}</figure>`
        : `<figure data-full="/assets/images/${E(a.soubor.split('/').pop())}"><img src="${E(url(a.soubor))}" alt="${E(p.text || zvire.jmeno)}" loading="lazy">${figcaption}</figure>`;
    }).join('\n    ')}
  </div>` : ''}

  <h2 class="hub-sekce-nadpis">${E(t.kestazeni)}</h2>
  <div class="ke-stazeni-seznam">
    ${karty.join('\n    ')}
  </div>

  <div class="hub-dole-logo" style="text-align:center; border-top:1px solid var(--linka); margin-top:35px; padding-top:25px;">
    <a href="/" style="text-decoration:none; border-bottom:none !important; color:inherit; display:inline-block;">
      <img src="/assets/images/logo-znacka.png" alt="Felis Noetica" class="hub-logo" style="width:110px; opacity:.85; display:block; margin:0 auto 8px auto; border-bottom:none !important;">
      <p class="jmeno-stanice" style="font-size:1.6rem; margin:0 0 2px 0;">Felis Noetica</p>
    </a>
    <p class="podtitul" style="font-size:.95rem; margin:0;">INTELLIGENTIA ET CONCORDIA</p>
  </div>

  <footer class="hub-pata">
    <p><a href="mailto:${E(kontakt.email)}">${E(kontakt.email)}</a> · ${E(kontakt.telefon)}</p>
    <p class="poznamka">${E(majitel ? t.jenProVas : t.verejna)}</p>
  </footer>
</div>
<script src="/skript.js"></script>
</body>
</html>`;
}

module.exports = { hub };
