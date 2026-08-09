const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { nacti, KOREN } = require('./data.js');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DIST = path.join(KOREN, 'dist');
const ASSETS_DOKUMENTY = path.join(KOREN, 'assets', 'dokumenty');

fs.mkdirSync(ASSETS_DOKUMENTY, { recursive: true });

function bezDia(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function slugJmena(s) {
  return bezDia(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ziskejNazevPdf(zvire, j) {
  const cleanId = zvire.id.split(' ')[0];
  const cleanJmeno = bezDia(zvire.jmeno);
  const kmotr = (zvire.certifikat && zvire.certifikat.typ === 'kmotrovsky') || !!zvire.kmotr;

  if (kmotr) {
    if (j === 'cs') return `${cleanId}_${cleanJmeno}_Certifikat_cestneho_kmotrovstvi_CS.pdf`;
    if (j === 'en') return `${cleanId}_${cleanJmeno}_Certificate_of_Honorary_Godparenthood_EN.pdf`;
    if (j === 'fr') return `${cleanId}_${cleanJmeno}_Certificat_de_parrainage_d_honneur_FR.pdf`;
  } else {
    if (j === 'cs') return `${cleanId}_${cleanJmeno}_Osvedceni_o_puvodu_a_jmenu_CS.pdf`;
    if (j === 'en') return `${cleanId}_${cleanJmeno}_Certificate_of_Origin_and_Name_EN.pdf`;
  }
  return `${cleanId}_${cleanJmeno}_Certifikat_${j.toUpperCase()}.pdf`;
}

function vytvorNeboAktualizujAssetYaml(zvire, j, pdfNazev) {
  const slug = slugJmena(zvire.jmeno);
  const yamlNazev = `${slug}-certifikat-${j}-pdf.yaml`;
  const yamlCesta = path.join(KOREN, 'data', 'assety', yamlNazev);

  const kmotr = (zvire.certifikat && zvire.certifikat.typ === 'kmotrovsky') || !!zvire.kmotr;

  const titles = {
    cs: {
      navesti: kmotr ? 'Certifikát kmotrovství (PDF)' : 'Osvědčení o původu (PDF)',
      text: kmotr ? 'Oficiální tiskový certifikát čestného kmotrovství.' : 'Oficiální tiskové osvědčení o původu a jménu.',
    },
    en: {
      navesti: kmotr ? 'Godparenthood Certificate (PDF)' : 'Certificate of Origin (PDF)',
      text: kmotr ? 'Official printable certificate of honorary godparenthood.' : 'Official printable certificate of origin and name.',
    },
    fr: {
      navesti: kmotr ? "Certificat de parrainage (PDF)" : "Certificat d'origine (PDF)",
      text: kmotr ? "Certificat officiel de parrainage d'honneur à imprimer." : "Certificat officiel d'origine et de nom à imprimer.",
    },
  };

  const native = titles[j] || titles.cs;

  const obsah = {
    soubor: `dokumenty/${pdfNazev}`,
    typ: 'dokument',
    datum: zvire.certifikat ? zvire.certifikat.datum || '2026-07-20' : '2026-07-20',
    misto: zvire.certifikat ? zvire.certifikat.misto || 'Brno' : 'Brno',
    zvirata: [zvire.id],
    hlavni: zvire.id,
    tagy: ['certifikat', j],
    viditelnost: 'verejne',
    popisky: {
      cs: native,
      en: native,
      fr: native,
    },
  };

  fs.writeFileSync(yamlCesta, yaml.dump(obsah, { lineWidth: -1 }), 'utf8');
}

async function generuj() {
  const d = nacti();
  console.log('Generuji PDF certifikáty z HTML...');

  let pocet = 0;
  for (const z of d.zvirata) {
    // VYJMA PENROSEHO podle výslovného pokynu uživatele!
    if (z.id.includes('Penrose') || z.jmeno.toLowerCase() === 'penrose') {
      console.log(`[PŘESKOČENO] ${z.jmeno} (${z.id}) — vynecháno na pokyn uživatele.`);
      continue;
    }

    if (!z.certifikat) continue;

    const languages = z.certifikat.jazyky || ['cs'];
    const subfolder = z.uuid || `kotata/2026/${slugJmena(z.jmeno)}`;

    for (const j of languages) {
      const htmlRel = path.join(subfolder, `certifikat-${j}.html`);
      const htmlAbs = path.join(DIST, htmlRel);

      if (!fs.existsSync(htmlAbs)) {
        console.warn(`HTML certifikát neexistuje: ${htmlAbs}`);
        continue;
      }

      const pdfNazev = ziskejNazevPdf(z, j);
      const pdfAbs = path.join(ASSETS_DOKUMENTY, pdfNazev);

      console.log(`Renderuji ${z.jmeno} [${j}] -> ${pdfNazev}`);

      const htmlUrl = `file:///${htmlAbs.replace(/\\/g, '/')}`;
      const cmd = `"${EDGE}" --headless=new --print-to-pdf="${pdfAbs}" --no-margins --print-to-pdf-no-header "${htmlUrl}"`;

      execSync(cmd, { stdio: 'ignore' });

      if (fs.existsSync(pdfAbs)) {
        console.log(`  ✓ Vytvořeno PDF: ${(fs.statSync(pdfAbs).size / 1024).toFixed(0)} kB`);
        vytvorNeboAktualizujAssetYaml(z, j, pdfNazev);
        pocet++;
      } else {
        console.error(`  ✕ Chyba při generování PDF pro ${z.jmeno} [${j}]`);
      }
    }
  }

  console.log(`\nDokončeno! Vygenerováno ${pocet} PDF certifikátů.`);
}

generuj();
