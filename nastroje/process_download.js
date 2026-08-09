const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\vikto\\Downloads\\IMG_20250808_171250.jpg';
const date = '2025-08-08';
const desc = 'Šipka kojí, zleva Sokrates, Zen, Sibyla, Aténa, Sofie';

const filenameFormatted = date + ' ' + desc + '.jpg';
const filenameSafe = '2025-08-08_sipka_koji_sokrates_zen_sibyla_atena_sofie.jpg';
const assetYamlName = '2025-08-08-sipka-koji-sokrates-zen-sibyla-atena-sofie.yaml';

if (fs.existsSync(src)) {
  const buf = fs.readFileSync(src);

  const dests = [
    'media/foto/' + filenameFormatted,
    'media/foto/' + filenameSafe,
    'web/media/foto/' + filenameSafe,
    'public/media/foto/' + filenameSafe,
    'dist/media/foto/' + filenameSafe,
  ];

  for (const d of dests) {
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.writeFileSync(d, buf);
    console.log('Saved image to:', d);
  }

  const yamlContent = `soubor: foto/${filenameSafe}
typ: foto
datum: '${date}'
misto: Runářov
pomer: null
zvirata:
  - FS01-G00-F001 Šipka
  - FS01-G01-M002 Sokrates
  - FS01-G01-M001 Zen
  - FS01-G01-F005 Sibyla
  - FS01-G01-F004 Aténa
  - FS01-G01-F003 Sofie
hlavni: FS01-G00-F001 Šipka
tagy:
  - sipka
  - sokrates
  - zen
  - sibyla
  - atena
  - sofie
  - kojeni
viditelnost: verejne
token: photo-sipka-koji-2025-08-08
popisky:
  cs:
    navesti: 8. srpna 2025
    text: ${desc}
  en:
    navesti: 8 August 2025
    text: Šipka nursing, from left Sokrates, Zen, Sibyla, Aténa, Sofie
`;

  fs.writeFileSync('data/assety/' + assetYamlName, yamlContent);
  console.log('Created asset YAML:', assetYamlName);

  fs.unlinkSync(src);
  console.log('Removed original file from Downloads:', src);
} else {
  console.error('Source file not found:', src);
}
