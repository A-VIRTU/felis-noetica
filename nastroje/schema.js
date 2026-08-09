// Deklarativní schéma datových souborů.
// Slouží k validaci — hlavně proto, aby chyba AI editoru spadla při buildu,
// ne až na webu. Neznámé klíče jsou chyba (odchytí překlepy).
//
// Odkazy mezi záznamy se dělají SLUGEM = názvem souboru bez .yaml
// (matka: sipka), protože je čitelný. Interní id (FS01-…) a uuid jsou
// zapsané hodnoty, ne klíče k odkazování.

const JAZYKY = ['cs', 'en', 'fr'];

// Na zvíře se dá odkázat třemi způsoby a parser bere všechny:
//
//   matka: Sibyla                  ← volací jméno; nejjednodušší, píše se samo
//   matka: FS01-G01-F002           ← master ID; vidět generace a pohlaví
//   matka: FS01-G01-F002 Sibyla    ← obojí; nejvíc vidět, ale při přejmenování
//                                    zvířete je nutné opravit i odkazy
//
// Jméno se páruje bez ohledu na velikost písmen a diakritiku (sibyla = Sibyla).
// Když jméno nosí víc zvířat, odkaz jménem je odmítnut s výpisem, mezi kterými
// zvířaty se má vybrat — tehdy (a jen tehdy) musíte sáhnout po ID.
//
// Názvy souborů zůstávají vždy <ID>_<Jméno>.yaml, aby se výpis adresáře řadil
// po generacích. To s tvarem odkazů nesouvisí.
//
// `npm run prepis-odkazy jmeno|id|id+jmeno` sjednotí všechny odkazy v datech
// na jeden tvar, kdybyste chtěl uklidit.
const ODKAZY_PREDVOLBA = 'jmeno';

// SINGLE SOURCE OF TRUTH
// Rodiče, datum narození a generace se u zvířete NEZAPISUJÍ. Zapisuje je vrh,
// zvíře na vrh jen ukazuje (vrh: V2026-Sibyla) a build je dopočítá.
// Zapsat je i u zvířete je chyba — validátor ji odmítne, aby se údaje
// nemohly rozejít. Výjimka: zvíře bez vrhu (Šipka, kočka zvenčí) smí mít
// 'narozeni' a 'rodice_neznami: true'.
const zvire = {
  povinne: ['id', 'jmeno', 'pohlavi', 'stav', 'verejne'],
  klice: {
    id: 'text',
    uuid: 'uuid?',            // FIXNÍ, z chovné knihy. Nikdy negenerovat.
    jmeno: 'text',
    pohlavi: { enum: ['M', 'F'] },
    vrh: 'ref:vrh?',          // odkud pochází — odtud plynou rodiče i narození
    narozeni: 'datum?',       // JEN u zvířete bez vrhu
    rodice_neznami: 'bool?',
    stav: { enum: ['doma', 'chovna', 'chovny', 'kastrovano', 'prodano', 'rezervovano', 'volne', 'odesla', 'nezvestna'] },
    role: 'text?',
    krevni_skupina: 'text?',
    cip: 'text?',
    verejne: 'bool',                // má veřejnou stránku /kotata/<rok>/<jmeno>/
    soukroma_stranka: 'soukroma?',
    pojmenovan_po: 'preklad?',
    vyznam: 'preklad?',
    popis: 'preklad?',

    // --- údaje, které jdou na certifikát ---
    formalni_jmeno: 'text?',        // "Alain of Felis Noetica"
    zbarveni: 'preklad?',           // "Krémová / světle rezavá"
    genotyp: 'text?',               // "O/Y S/s" — bere se i pro rodiče z jejich záznamů
    certifikat: 'certifikat?',
    kmotr: 'kmotr?',                // čestné kmotrovství, jen u koťat pojmenovaných po žijících
  },
};

// Vrh je jediné místo, kde je zapsáno kdo je matka, kdo otec a kdy se narodili.
// 'pocet' se nezapisuje — spočítá se ze zvířat, která na vrh ukazují.
const vrh = {
  povinne: ['id', 'matka', 'narozeni', 'verejne'],
  klice: {
    id: 'text',
    matka: 'ref:zvire',
    otec: 'ref:zvire?',
    otec_neznamy: 'preklad?',   // když kryl netestovaný kocour zvenčí
    narozeni: 'datum',
    verejne: 'bool',
    poznamka: 'preklad?',
  },
};

const asset = {
  povinne: ['soubor', 'typ', 'zvirata', 'tagy', 'viditelnost'],
  klice: {
    soubor: 'text',
    typ: { enum: ['foto', 'video', 'dokument'] },
    datum: 'datum?',
    misto: 'text?',
    pomer: 'text?',
    zvirata: 'ref-seznam:zvire',   // M:N — klidně prázdné, klidně pět
    hlavni: 'ref:zvire?',
    tagy: 'seznam',
    // Tři úrovně, ne ano/ne:
    //   verejne  — na veřejné stránce koťete i na webu
    //   majitel  — jen na /<uuid>/, servíruje se z /soukrome/<token>/
    //   interni  — nikam se nevygeneruje, jen v interním přehledu
    viditelnost: { enum: ['verejne', 'majitel', 'interni'] },
    token: 'text?',                // doplní `npm run scan` u neveřejných
    poster: 'text?',
    popisky: 'popisky?',
  },
};

// Certifikát: co se na něj tiskne. Jazyky určují, kolik verzí se vygeneruje.
const certifikat = {
  povolene: ['typ', 'misto', 'datum', 'jazyky', 'foto', 'viditelnost'],
  typy: ['puvod', 'kmotrovsky'],
};

// Čestné kmotrovství — jen u koťat pojmenovaných po žijícím vědci.
const kmotr = {
  povolene: ['jmeno', 'osloveni', 'pracoviste', 'adresa', 'vyznam', 'dopis', 'odeslano'],
};

module.exports = { JAZYKY, ODKAZY_PREDVOLBA, certifikat, kmotr, schemata: { zvire, vrh, asset } };
