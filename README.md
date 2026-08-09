# Felis Noetica — datová kostra webu

Statický web generovaný z YAML dat. Viz `PREVOD.md` (návrh a postup převodu)
a `AGENTS.md` (pravidla pro AI asistenty).

## Rychlý start

```
npm install
npm run kontrola   # zvaliduje data
npm run scan       # založí YAML pro nové soubory v media/
npm run build      # vygeneruje dist/
```

## Struktura

```
data/zvirata/   jedno zvíře = jeden soubor (alain.yaml), uvnitř id a fixní uuid
data/vrhy/      jediné místo, kde jsou rodiče a datum narození
data/assety/    jeden mediální soubor; vazba na zvířata je M:N; popisky cs + en
media/          skutečné soubory
web/            ručně psané stránky se značkami <!-- gen:… --> pro generované úseky
nastroje/       generátor, validátor, skener, interní prohlížeč
dist/           výstup pro Cloudflare Pages (negitovat)
```

## Cloudflare Pages

- build command: `npm run build`
- output directory: `dist`
- Cloudflare Access na `/interni/*`
