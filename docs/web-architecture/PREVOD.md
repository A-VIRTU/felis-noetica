# Felis Noetica — převod statického webu na datový

Návrh a funkční kostra. Stav: build běží, ověřeno na reálných datech chovu.

---

## Co je dnes špatně

Web není pomalý ani ošklivý. Problém je, že **stejný údaj je zapsaný na mnoha místech
a žádné z nich není to hlavní.** Že se Alain narodil 14. 7. 2026 je napsané
v `index.html`, v jeho UUID složce, na certifikátu a v kontextovém dokumentu.
Když se něco změní, musí se to najít a opravit čtyřikrát.

Druhý problém: každá UUID složka je ručně postavený adresář s vlastní kopií
PDF, podpisu, QR kódu a certifikátu. U osmi koťat ročně to znamená osm složek
ročně, každou ručně, a v každé duplikované soubory. Za tři roky
dvacet čtyři adresářů, které nikdo nedokáže projít.

Třetí: fotky nemají kde být popsané. Popisek je v HTML u obrázku, takže totéž
foto na dvou stránkách má dva popisky, které se rozejdou, a anglická verze
třetí. A žádný způsob, jak najít „všechny fotky Sibyly z léta 2026".

**Není to problém technologie, je to problém uspořádání dat.** Proto návrh
nemění hosting ani vzhled — mění to, kde data bydlí.

---

## Návrh

```
data/ (YAML, jediný zdroj pravdy)  →  npm run build  →  dist/  →  Cloudflare Pages
```

Tři složky dat, jeden generátor, žádná databáze, žádný server, žádné přihlašování.
Web zůstane přesně tak rychlý jako dnes, protože výstup jsou pořád statické soubory.

### Proč ne WordPress

Zvažoval jsem ho a zamítám, ze tří důvodů. Ztratíte současnou typografii a rytmus
stránky (nebo se musí psát vlastní šablona, což je víc práce než tenhle generátor).
Přibude vám údržba a bezpečnostní starost u webu, který ji dnes nemá. A hlavně:
WordPress je nástroj na ruční editaci v prohlížeči, kdežto vy chcete data editovat
AI asistentem. AI edituje textové soubory v gitu líp a bezpečněji než klikací admin,
protože změna je vidět v diffu a dá se vrátit.

### Proč ne databáze a Workers

Až budete chtít, aby data měnil někdo jiný než vy, dává smysl. Dnes ne — přidalo by
to backend, který musí běžet, migrace schématu a přihlašování, výměnou za pohodlí,
které nepotřebujete.

---

## Datový model

```
data/
├── zvirata/FS01-G02-M001_Alain.yaml   # jedno zvíře
├── vrhy/V2026-Sibyla.yaml             # jeden vrh
└── assety/2026-07-27_sofie-vrh.yaml   # jeden mediální soubor
media/                       # skutečné soubory
web/                         # ručně psané stránky se značkami pro generované úseky
```

**Soubory se jmenují master ID a volacím jménem**, ne UUID. Výpis adresáře se
pak sám řadí po generacích a je z něj vidět, kdo je kdo. UUID je uvnitř souboru
jako hodnota, kde ho vidíte v kontextu.

### Odkazy: tolerantní parser

Uvnitř YAML se na zvíře dá odkázat třemi způsoby a všechny platí:

```yaml
matka: Sibyla                  # volací jméno — nejjednodušší, běžná volba
matka: FS01-G01-F002           # master ID
matka: FS01-G01-F002 Sibyla    # obojí
```

Jméno se páruje bez ohledu na diakritiku a velikost písmen, takže `Amálie`,
`amalie` i `AMALIE` míří na totéž zvíře.

Píšete tedy jménem, protože je to nejkratší a čte se to samo. **Na ID přejdete
jen u toho jednoho zvířete, kde jméno přestane stačit** — když se jméno v chovu
zopakuje, kontrola to najde a rovnou vypíše, mezi kým vybrat:

```
'zvirata' 'Sofie' nosí víc zvířat (FS01-G01-F001, FS01-G02-F002)
  — odkaž se master ID, např. 'FS01-G01-F001 Sofie'
```

Číslovat opakovaná jména tedy nemusíte a zvířata kvůli tomu nepřejmenováváte.

Tím odpadá i jediná skutečná nevýhoda odkazování jménem s ID: **kaskáda při
přejmenování.** Kdyby bylo jméno povinnou součástí každého odkazu, změna jména
kočky by znamenala opravit všechna místa, kde se na ni odkazuje. Takhle ne.

`npm run prepis-odkazy jmeno|id|id+jmeno` sjednotí zápis napříč daty, kdybyste
chtěl uklidit. Názvy souborů zůstávají `<ID>_<Jméno>.yaml` bez ohledu na to.

### ID se ověřuje proti realitě

Protože ID něco znamená, dá se zkontrolovat. Build ověří, že `M`/`F` sedí
s pohlavím a že `G02` sedí s generací dopočítanou z řetězu vrhů. Když si u kotěte
spletete vrh nebo v ID generaci, kontrola to najde:

```
id 'FS01-G02-M001' říká generaci 2, ale z vrhů vychází 1
  — buď je špatně 'vrh:', nebo id (zakladatelka je G00, její koťata G01)
```

Pokud vaše chovná kniha počítá generace jinak, změní se to na jednom místě
v `nastroje/data.js`. **ID v ukázkových datech jsou moje rekonstrukce** — přepište
je podle skutečné chovné knihy.

### Jediný zápis každého údaje

Tohle je nejdůležitější rozhodnutí celého návrhu. **Rodiče, datum narození
a generace jsou zapsané výhradně u vrhu.** Zvíře na vrh jen ukazuje:

```yaml
# data/vrhy/V2026-Sibyla.yaml — jediné místo, kde stojí kdo s kým a kdy
matka: Sibyla
otec: Sokrates
narozeni: 2026-07-14
```

```yaml
# data/zvirata/FS01-G02-M001_Alain.yaml — o rodičích ani datu ani slovo
jmeno: Alain
vrh: V2026-Sibyla
```

Build si dopočítá, že Alain se narodil 14. 7. 2026, matka Sibyla, otec Sokrates,
generace 2. Počet koťat ve vrhu se rovněž nikde nezapisuje — spočítá se ze zvířat,
která na vrh ukazují. Když někdo (vy nebo AI) napíše datum narození i ke zvířeti,
**validátor build zastaví** — protože právě tak vznikají dva různé údaje o téže věci.

### UUID

`uuid` je pole zvířete. **Fixní, přepsané z chovné knihy, nikdy negenerované.**
Je na rozeslaných certifikátech a v odkazech, které mají majitelé — změna by
je rozbila. `AGENTS.md` to říká AI asistentům jako železné pravidlo a validátor
hlídá, že jsou jedinečná a že prodané zvíře nějaké má.

### Assety: M:N v obou směrech

Na fotce může být pět koček, jedna, nebo žádná (liška u dřevníku, krajina).
Jedno zvíře má mnoho fotek. Proto je vazba seznam na obou stranách:

```yaml
soubor: foto/2026-07-27_sofie-vrh.jpg
typ: foto                    # foto | video | dokument
datum: 2026-07-27
zvirata: [Sofie, Alain]      # kdo je na snímku
hlavni: Sofie                # o kom snímek je → podle toho se vybírá do profilu
tagy: [vrh, porod, kotata]
verejne: true
popisky:
  cs: { navesti: 27. července 2026, text: Sofiin první vrh, ráno po porodu. }
  en: { navesti: 27 July 2026,      text: Sofie's first litter, the morning after. }
```

Build si obrácený index (zvíře → jeho assety) dopočítá sám, takže fotku zapisujete
jednou a objeví se všude, kam patří — v profilu, na soukromé stránce každého
zvířete na ní, v interním prohlížeči.

`navesti` a `text` odpovídají vaší grafice: malé verzálky barvou trávy a pod nimi
jedna kurzivní věta pozorování. Chybí-li jazyk, fotka se vykreslí bez popisku.

---

## Soukromé věci

| co | adresa | kdo se dostane |
|---|---|---|
| veřejné médium | `/media/foto/…` | kdokoli |
| soukromé médium | `/soukrome/<token>/…` | kdo má odkaz |
| stránka zvířete | `/<uuid>/` | majitel |
| interní přehled | `/interni/` | vy, za Cloudflare Access |

Klíčové: **adresa se nikdy neodvozuje z ID zvířete.** `FS01-G02-M001` je uhodnutelné,
protože je sekvenční — kdo uvidí jedno, uhodne ostatní. UUID a tokeny uhodnutelné
nejsou. Token přiděluje `npm run scan` jednou a už se nemění; je náhodný, uložený
v YAML u assetu.

Soubor sdílený víc zvířaty leží v `dist/` **jednou** a všechny stránky na něj
ukazují. Konec duplikování PDF po složkách.

`_headers` posílá `noindex` na `/soukrome/`, `/interni/` i na každou UUID stránku.

**Poznámka na rovinu:** tohle je pořád ochrana neuhodnutelnou adresou, stejný model
jako máte dnes. Na fotky koťat a genetické zprávy je přiměřená. Kdybyste chtěl
skutečné řízení přístupu, cesta je Cloudflare Pages Function + R2 — soubory nejsou
veřejné vůbec a Function je vydá až po ověření UUID. Přidá to jeden krok při
nasazení; navrhuji to nedělat teď a nechat si to jako připravenou možnost.

---

## Interní přehled

`/interni/` je jedna stránka nad `data.json`, kterou build vygeneruje. Tři pohledy:

- **Assety** — mřížka náhledů, filtr podle zvířete, typu, roku, veřejnosti a tagů,
  fulltext přes popisky, jména a tagy. U každé karty je vidět zdrojový YAML soubor,
  takže víte, co otevřít k úpravě.
- **Zvířata** — tabulka: jméno, master ID, generace, narození, stav, rodiče,
  počet assetů, odkaz na soukromou stránku i s UUID.
- **Vrhy** — kdo s kým, kdy, kolik koťat.

Chrání se **Cloudflare Access** (zdarma, přihlášení e-mailem), pravidlo na cestu
`/interni/*`. Není to součást buildu, nastavuje se jednou v Cloudflare.

---

## Práce s AI

Protože data budete editovat asistentem, je v repozitáři `AGENTS.md`
(a symlink `CLAUDE.md`). Obsahuje pravidla, která AI běžně poruší: neupravovat
`dist/`, neupravovat generované úseky v HTML, **negenerovat UUID**, nezapisovat
údaj dvakrát, a po každé změně spustit `npm run kontrola`.

Validátor je psaný přímo na chyby AI editorů:

- **neznámý klíč je chyba** — odchytí překlep i vymyšlené pole
- odkaz na neexistující zvíře nebo vrh je chyba
- jméno v odkazu, které si odporuje s uvedeným ID, je chyba
- jméno, které nosí víc zvířat, je chyba s výpisem, mezi kým vybrat
- ID, jehož pohlaví nebo generace neodpovídá datům, je chyba
- údaj zapsaný na dvou místech je chyba
- neexistující mediální soubor je chyba
- `hlavni` mimo seznam `zvirata` je chyba
- neveřejný asset bez tokenu je chyba

Navíc vypisuje **nedodělky**, které build nezastaví: asset bez tagů, chybějící
anglický popisek, zvíře bez fotky, prodané zvíře bez soukromé stránky.

---

## URL zvířete a dvě úrovně přístupu

Každé zvíře má **dvě adresy téže stránky**:

| | adresa | kdo | co uvidí |
|---|---|---|---|
| veřejná | `/kotata/2026/alain/` | kdokoli | položky s `viditelnost: verejne` |
| majitelova | `/c91a797e-…/` | kdo má odkaz | navíc všechno s `viditelnost: majitel` |

Rok ve veřejné adrese je jmenný prostor: kdyby se za pět let jméno zopakovalo,
nic se nerozbije a staré odkazy platí dál. UUID adresa zůstává přesně jak je —
je na rozdaných certifikátech.

**Obě stránky vykresluje jedna šablona.** Rozdíl je jen v tom, co projde
filtrem viditelnosti. To není úspora práce, to je bezpečnostní vlastnost:
veřejná stránka nemá jak vypsat soukromý odkaz, protože se k položce vůbec
nedostane. Nemůže se stát, že se v jedné ze dvou šablon zapomene na podmínku.

Ověřeno na vygenerovaném výstupu: veřejná stránka Alaina obsahuje 4 položky
ke stažení a řetězec `/soukrome/` se v ní nevyskytuje ani jednou. Majitelova
obsahuje 5 položek, soukromou fotku a ZIP.

### Viditelnost má tři stupně, ne dva

```yaml
viditelnost: verejne    # veřejná stránka i majitelova
viditelnost: majitel    # jen /<uuid>/, servíruje se z /soukrome/<token>/
viditelnost: interni    # nikam se nevygeneruje, jen v interním přehledu
```

Třetí stupeň je tam kvůli věcem, které existují, ale nemají jít nikomu ven —
pracovní verze, skeny, poznámky.

### ZIP se skládá ze stejného pravidla

`Alain_Felis_Noetica.zip` se vyrábí při buildu z **téhož filtru** jako stránka,
takže nemůže obsahovat něco, co majitel na stránce nevidí, ani naopak. Balí se
metodou store, protože JPEG a PDF jsou už komprimované; zapisovač je v
`nastroje/zip.js`, bez závislostí, ~100 řádků.

---

## Údaje pro certifikáty

Z vašich vzorů jsem vytáhl, co certifikát potřebuje, a doplnil to do schématu:

```yaml
formalni_jmeno: Alain of Felis Noetica
zbarveni:
  cs: Krémová / světle rezavá
  fr: Crème / roux clair
genotyp: O/Y S/s

certifikat:
  typ: kmotrovsky        # puvod | kmotrovsky
  misto: Brno
  datum: 2026-07-20
  jazyky: [cs, en, fr]
  foto: foto/2026-08-01_alain.jpg
  viditelnost: verejne

kmotr:
  jmeno: Alain Aspect
  osloveni:
    fr: M. Alain Aspect, de l'Académie française
  pracoviste: Laboratoire Charles Fabry · Institut d'Optique
  vyznam:
    fr: |
      Nommé en l'honneur d'Alain Aspect…
```

**Genotypy rodičů se neopisují.** Na certifikátu stojí „Sibyla (G1, O/o S/s)" —
jméno z jejího záznamu, `G1` z dopočítané generace, genotyp z jejího pole
`genotyp`. Když Sibyle opravíte genotyp, opraví se na certifikátech všech jejích
koťat ve všech jazycích. Dnes je ten údaj opsaný v každém certifikátu zvlášť.

Typ certifikátu rozhoduje o textu: `puvod` dá „Osvědčení o původu a jménu",
`kmotrovsky` přidá podtitul *Patrinus honorarius*, blok o významu jména
a údaje o kmotrovi.

---

## Kolik z té složky je vlastně obsah

Vaše složka `c91a797e-…/` má 12 souborů a 3,27 MB. Rozpad:

| | souborů | velikost | podíl |
|---|---|---|---|
| **generovatelné z dat** — `index.html`, `index_fr.html`, `certificate_en/fr.html`, `qr_kod.png` | 5 | 0,06 MB | 1,8 % |
| **sdílené se všemi ostatními** — `podpis.png`, `bg_certifikat.jpg`, `bg_certifikat_exact.jpg`, `official_logo.png`, `Genomia_Testy_Matka_Sipka.pdf` | 5 | 2,17 MB | 66,5 % |
| **vlastní obsah kotěte** — `alain_foto.jpg`, `dopis_Alain_Aspect.md` | 2 | 1,04 MB | 31,7 % |

Dvě třetiny každé složky jsou kopie něčeho, co je stejné pro celý chov. Zpráva
Genomie je matčina — sdílí ji celý vrh. Podpis a pozadí certifikátu jsou stejné
navždy. A `bg_certifikat.jpg` a `bg_certifikat_exact.jpg` mají na bajt stejnou
velikost, což vypadá na dvě kopie téhož souboru ve stejné složce.

Za deset let: **960 ručně spravovaných souborů a 261 MB proti 165 souborům
a 85 MB.** A z těch 165 je 160 skutečný obsah — fotky a dopisy kmotrům. Zbytek
mechaniky zmizí.

### QR kód se negeneruje ručně, protože není asset

QR kód je funkce adresy: `https://felisnoetica.cz/<uuid>/` dovnitř, obrázek ven.
Držet ho jako `qr_kod.png` v každé složce znamená držet kopii údaje, který už je
v datech. Generátor ho vyrábí při buildu jako SVG (ostrý i v tisku, ~2 kB) a nikde
se neukládá.

Totéž platí pro certifikáty. `certifikat-cs.html`, `certifikat-en.html`,
`certifikat-fr.html` vzniknou ze stejných dat — jméno, ID, datum, rodiče, QR,
podpis, pozadí. Když opravíte datum narození ve vrhu, opraví se ve všech
jazykových verzích všech certifikátů celého vrhu naráz. Dnes byste otevřel
osm složek a v každé tři soubory.

Jazyky jsou v datech, ne v souborech: `soukroma_stranka.jazyky: [cs, fr]`
vygeneruje `/<uuid>/` česky, `/<uuid>/fr/` francouzsky a certifikát v obou.

---

## Přebuildí se celý web po každé změně?

Ano, ale ne tak, jak to zní — build je přírůstkový a přepíše jen to, co se
skutečně liší. Změříte si to sám příkazem `node nastroje/bench.js`, který
vyrobí syntetická data v libovolném objemu. Naměřeno zde:

| objem | validace | build od nuly | build po změně |
|---|---|---|---|
| 10 let provozu — 81 zvířat, 1 200 assetů, 410 MB médií | 0,3 s | 2,7 s | **0,4 s** |
| 20 let provozu — 161 zvířat, 3 200 assetů, 1,1 GB médií | 0,5 s | 9,3 s | **0,7 s** |

„Od nuly" nastane jen na čerstvém klonu. Běžná změna — opravíte větu, přidáte
fotku — je pod sekundou i po dvaceti letech chovu. Cloudflare pak nasazuje jen
změněné soubory.

Pro srovnání: WordPress na sdíleném hostingu odpovídá na jeden požadavek
typicky 200–600 ms, a to pokaždé, každému návštěvníkovi. Tady se ta práce
odvede jednou při buildu a návštěvník dostane hotový soubor z edge.

---

## Takže radši CMS a databázi?

Férová otázka a odpověď není „ne". Je to „ne pro tenhle problém".

**Co by CMS skutečně přineslo:** editaci z prohlížeče a z mobilu bez gitu,
možnost pustit k datům někoho dalšího, a odpadnutí build kroku.

**Co by nepřineslo, i když to tak vypadá:** QR kódy, certifikáty ve třech
jazycích, dopočítání rodičů a generace z vrhu, vícejazyčné popisky u každé fotky
a privátní stránky na UUID — tohle všechno je vlastní kód tak jako tak, jen
by se psal jako plugin do WordPressu místo 400 řádků generátoru. Plus vlastní
šablona, aby web vypadal jako teď. Databáze navíc neřeší duplicitu, jen ji
přesune: pole `narozeni` můžete mít vyplněné u kotěte i u vrhu úplně stejně
jako dnes v HTML, a nikdo vás nezastaví. Tady vás zastaví validátor.

Tři situace, kdy má smysl to přehodnotit — a jsou konkrétní, ne mlhavé:

1. **Data má editovat někdo, kdo nechce nic instalovat.** Zákazník, veterinář,
   spolupracující chovatel. Tehdy CMS vyhraje jednoznačně.
2. **Chcete přidávat fotky z mobilu v terénu.** Git na telefonu je utrpení.
3. **Build od nuly přeleze půl minuty.** Podle měření výše to nastane někde
   kolem padesáti let provozu.

Do té doby je to výměna: přijdete o klikání, získáte kontrolu, rychlost, nulovou
údržbu, zpětný chod přes git a validátor, který nepustí rozporuplná data na web.
A pokud se rozhodnete přejít, `data/` je čitelný, dokumentovaný a strojově
zpracovatelný — import do čehokoli je pak přímočarý. Opačný směr, tedy dostat
data z WordPressu, tak snadný není.

---

## Jak to pak vypadá v běžném provozu

Ano — data do příslušných adresářů, `npm run build`, a výstupem jsou hotové
statické stránky se vším všudy. Konkrétně:

**Narodil se vrh.** Založíte `data/vrhy/V2027-Sofie.yaml` (matka, otec, datum)
a pro každé kotě jeden soubor v `data/zvirata/`. Build z toho udělá seznam koťat
na české i anglické stránce, zápis v interním přehledu a rodokmenové vazby.

**Přibyly fotky.** Nakopírujete je do `media/foto/`, spustíte `npm run scan`
a doplníte tagy a popisky. Build je rozešle všude, kam podle `zvirata:` patří.

**Kotě odešlo k majiteli.** V jeho souboru změníte `stav` na `prodano` a zapnete
`soukroma_stranka.aktivni`. Build vygeneruje `/<uuid>/` s jeho dokumenty a fotkami.

**Změnil se text nebo cena.** To je pořád obyčejná úprava `web/index.html` —
generátor sahá jen na úseky mezi značkami `<!-- gen:… -->`.

Pořadí je vždycky stejné: `npm run kontrola` → opravit, co vytkne → `npm run build`
→ `git push`. Cloudflare build spustí sám a nasadí. Když data nesedí, build spadne
a **nasadí se stará verze** — rozbité stránky se na web nedostanou.

---

## Postup převodu

**1. Založit strukturu** — nakopírovat tuhle kostru do repozitáře.
Stávající `index.html`, `chov.html`, `en.html` přesunout do `web/`.

**2. Přepsat data ze současného HTML do `data/`.** Pět zvířat první generace
a osm koťat druhé, dva vrhy. To je práce na jedno odpoledne a je to celý převod —
zbytek je automatický. Tuhle část klidně nechte AI: dostane `index.html`
a `Felis_Noetica_kontext.md` a vyplní YAML, vy zkontrolujete.

**3. Doplnit UUID** ze čtyř existujících složek ke správným koťatům.
Ověřte proti tomu, co jste komu poslal — na tom závisí platnost rozdaných odkazů.

**4. Nakopírovat média a spustit `npm run scan`.** Založí YAML pro každý soubor,
uhodne datum z názvu a zvíře podle jména v názvu. Zbytek (tagy, popisky) doplníte
nebo nechte AI.

**5. Do `web/index.html` a `web/en.html` vložit značky** `<!-- gen:kotata -->`
a `<!-- /gen:kotata -->` tam, kde je dnes ručně psaný seznam koťat. Obsah mezi
nimi bude generovaný z dat; zbytek stránky zůstane přesně jak je.

**6. Přenastavit Cloudflare Pages**: build command `npm run build`,
output directory `dist`. Nasazení pak proběhne při každém pushi.

**7. Zapnout Cloudflare Access** na `/interni/*`.

**Staré UUID složky nechte v repozitáři,** dokud nové stránky neprojdete. Až budou
v pořádku, smažou se — data v nich už budou v `data/`.

---

## Co se tím vyřeší

- Údaj o zvířeti je zapsaný jednou a nemůže se rozejít.
- Nové kotě = jeden YAML soubor. Soukromá stránka, profil na webu i zápis
  v přehledu se vygenerují.
- Fotky jdou najít podle zvířete, roku i tagu, a popisek existuje ve dvou jazycích
  na jednom místě.
- Žádné duplikované PDF po složkách.
- Web zůstane statický a rychlý, na Cloudflare, se stejným vzhledem.

## Co to nevyřeší

- Kamerový archiv přes terabajt tohle neřeší a ani nemá — je to jiná úloha
  (studené úložiště a index, ne datový model webu).
- Editace zůstává v souborech. Pohodlný klikací admin by znamenal backend.
- Ochrana soukromých věcí je neuhodnutelná adresa, ne přihlášení. Viz výše.
