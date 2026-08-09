# Pokyny pro AI asistenty, kteří upravují tenhle repozitář

Tenhle soubor si přečti dřív, než sáhneš na cokoli v `data/`. Čte ho i Claude Code
(symlink `CLAUDE.md`), Cursor i Copilot.

## Co tenhle repozitář je

Web chovné stanice Felis Noetica. **Data jsou v `data/`, ne v HTML.** Stránky se
z dat generují příkazem `npm run build`. Ručně psané stránky jsou v `web/` a mají
v sobě značky `<!-- gen:něco --> … <!-- /gen:něco -->`; obsah mezi značkami generuje
build a ruční úprava se při dalším buildu ztratí.

## Železná pravidla

1. **Nikdy neupravuj `dist/`.** Je to výstup, přepisuje se.
2. **Nikdy neupravuj obsah mezi `<!-- gen:… -->` značkami** v `web/*.html`.
3. **Nikdy neměň a nikdy negeneruj `uuid` zvířete.** UUID je fixní identifikátor
   z chovné knihy, je vytištěné na rozeslaných certifikátech a je v odkazech,
   které už mají majitelé koček. Změna UUID = rozbité odkazy u zákazníků.
   Když zvíře UUID nemá a má mít, **zeptej se Viktora**, negeneruj ho sám.
4. **Jeden údaj má být zapsán právě jednou.** Rodiče, datum narození a generace
   se zapisují **jen u vrhu** (`data/vrhy/`). Zvíře na vrh jen ukazuje polem `vrh:`
   a build si zbytek dopočítá. Když ten samý údaj napíšeš i ke zvířeti,
   validátor tě zastaví — a má pravdu.
5. **Po každé změně dat spusť `npm run kontrola`.** Když skončí chybou, oprav to.
   Necommituj data, která neprojdou.

## Struktura dat

```
data/
├── zvirata/FS01-G02-M001_Alain.yaml   # jedno zvíře
├── vrhy/V2026-Sibyla.yaml             # jeden vrh; tady a jen tady jsou rodiče a datum
└── assety/2026-07-27_sofie-vrh.yaml   # jeden mediální soubor: foto, video, dokument
media/                    # skutečné soubory, na které assety ukazují
```

### Jak se odkazuje na zvíře

Parser je tolerantní. Všechny tři tvary jsou platné a můžou se i míchat:

```yaml
matka: Sibyla                  # volací jméno — běžná volba, piš takhle
matka: FS01-G01-F002           # master ID
matka: FS01-G01-F002 Sibyla    # obojí
```

Jméno se páruje **bez ohledu na diakritiku a velikost písmen** — `Amálie`,
`amalie` i `AMALIE` míří na totéž zvíře.

**Piš jménem, dokud ti kontrola neřekne, ať přejdeš na ID.** Řekne to jen tehdy,
když jméno nosí víc zvířat, a rovnou vypíše, mezi kterými se má vybrat.
Nepřejmenovávej kvůli tomu zvířata a nepřidávej číslovky — od toho je ID.

Když v odkazu uvedeš ID i jméno a ta dvě si odporují, je to chyba: znamená to,
že jeden z údajů je špatně.

Soubor se jmenuje `<ID>_<Jméno bez diakritiky>.yaml`, např.
`FS01-G02-M001_Alain.yaml`. Výpis adresáře je pak seřazený po generacích.
S tvarem odkazů to nesouvisí — názvy souborů neměň kvůli odkazům.

### Master ID něco znamená a kontroluje se

```
FS01 - G02 - M 001
 |      |    |   └ pořadí v generaci
 |      |    └ pohlaví: M kocour, F kočka
 |      └ generace: zakladatelka G00, její koťata G01, jejich koťata G02
 └ stanice
```

Validátor ověřuje, že `M`/`F` sedí s polem `pohlavi` a že `G02` sedí s generací
dopočítanou z řetězu vrhů. Když to zahlásí, **neopravuj to změnou ID naslepo** —
spíš je špatně `vrh:` u toho zvířete. ID je z chovné knihy.

## Assety

Vazba asset ↔ zvíře je **M:N**. Na jedné fotce může být pět koček, žádná kočka
(liška u dřevníku, krajina), nebo jedna. Jedno zvíře má mnoho assetů.

```yaml
zvirata: [Sofie, Alain, Amálie]   # všechna zvířata na snímku
hlavni: Sofie                     # o kom snímek je; podle toho se vybírá do profilu
```

`hlavni` musí být i v `zvirata`. Když snímek není o nikom konkrétním, `hlavni: null`.

### Popisky jsou vícejazyčné

Každý asset má popisky zvlášť pro každý jazyk, a popisek má dvě části podle
grafiky webu: `navesti` (malé verzálky barvou trávy — datum nebo místo) a
`text` (jedna kurzivní věta pozorování).

```yaml
popisky:
  cs:
    navesti: 27. července 2026
    text: Sofiin první vrh, ráno po porodu.
  en:
    navesti: 27 July 2026
    text: Sofie's first litter, the morning after.
```

Chybí-li jazyk, fotka se vykreslí bez popisku — nic se nerozbije.

### Nový soubor

Nakopíruj ho do `media/` a spusť `npm run scan`. Ten založí kostru YAML,
uhodne datum z názvu a zvíře podle jména v názvu. Zbytek dopiš.

## Co se NEUKLÁDÁ, protože se počítá

Nezakládej pro tyhle věci soubory ani assety — build je vyrobí z dat:

- **QR kód** — funkce adresy `/<uuid>/`, generuje se jako SVG
- **certifikát** — `certifikat-<jazyk>.html` z jména, ID, data a rodičů
- **stránka majitele** — `/<uuid>/`, další jazyky na `/<uuid>/<jazyk>/`
- **generace, rodiče, datum narození, počet koťat ve vrhu** — z vrhu

Sdílené soubory (podpis, pozadí certifikátu, logo) patří **jednou** do
`web/assets/images/`, ne do složky každého zvířete. Zpráva Genomie od matky je
jeden asset s `zvirata: [matka]`; na stránkách koťat se objeví přes vrh.

Jazyky se řídí daty: `soukroma_stranka.jazyky: [cs, fr]`.

## Soukromé věci

Každé zvíře má dvě adresy téže stránky:

- `/kotata/<rok>/<jmeno>/` — veřejná, vzniká když má zvíře `verejne: true`
- `/<uuid>/` — majitelova, vzniká když má `soukroma_stranka.aktivni: true`

Obě vykresluje **jedna** šablona (`nastroje/hub.js`). Nikdy nepiš druhou
šablonu pro veřejnou verzi — rozdíl dělá výhradně filtr viditelnosti:

```yaml
viditelnost: verejne    # veřejná stránka i majitelova
viditelnost: majitel    # jen /<uuid>/, servíruje se z /soukrome/<token>/
viditelnost: interni    # nikam se nevygeneruje, jen interní přehled
```

- Token pro `majitel` přiděluje `npm run scan` jednou a už se nemění.
- **Nikdy nedávej asset s `majitel` nebo `interni` do `web/`** ani do veřejného
  odkazu — obejdeš tím jedinou věc, která soukromí drží.
- Adresa se nikdy neodvozuje z `id` zvířete. `id` je uhodnutelné
  (FS01-G02-M001 → M002), UUID a token ne. To je záměr.
- ZIP pro majitele se skládá ze stejného filtru jako stránka. Neupravuj jeho
  obsah ručně; když má něco přibýt, změň viditelnost assetu.

## Tón textů

Než napíšeš jakýkoli text pro veřejný web, přečti si `docs/Felis_Noetica_kontext.md`,
část III (Redakční zásady). Krátce: ukazovat, ne přesvědčovat; žádné superlativy;
žádná kategorická tvrzení; konkrétní situace místo vlastností; žádné vymezování
se proti jiným chovatelům. A nikdy nezmiňuj akrostich ve jménech vrhů — je důvěrný.

## Příkazy

```
npm run kontrola          # zvaliduje data (spouštěj po každé změně)
npm run scan              # založí YAML pro nové soubory v media/
npm run build             # vygeneruje dist/
npm run prepis-odkazy X   # sjednotí tvar odkazů: jmeno | id | id+jmeno
```
