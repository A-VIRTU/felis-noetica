const fs = require('fs');

// Set font-weight 500 on .teze in web/styl.css
let styl = fs.readFileSync('web/styl.css', 'utf8');

styl = styl.replace(/\.teze\s*\{[^}]*\}/g, `.teze{
  font-family:"Newsreader",serif;font-weight:500;font-size:1.85rem;
  line-height:1.35;text-align:center;margin:2.5rem 0 0;
}`);

fs.writeFileSync('web/styl.css', styl, 'utf8');
fs.writeFileSync('styl.css', styl, 'utf8');
fs.writeFileSync('public/styl.css', styl, 'utf8');

console.log('Set font-weight: 500 on .teze in styl.css!');
