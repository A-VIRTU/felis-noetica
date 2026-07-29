# Felis Noetica, CZ

**Felis Noetica, CZ** je registrovaná chovná stanice evropských krátkosrstých koček (FIFe reg. č. 7944, zapsáno 11. 5. 2026). Provozuje ji Viktor Lošťák v Brně a v Runářově na Konicku; formálním zřizovatelem je společnost A VIRTÙ RESEARCH & TECHNOLOGIES s.r.o.

Tento repozitář obsahuje oficiální statickou webovou prezentaci chovné stanice a kompletní metodickou i genetickou dokumentaci.

---

## 🐈 Podstata a filosofie projektu

Felis Noetica je chovatelský projekt zaměřený **výhradně na výběr podle povahy a chování** zvířat, nikoli podle exteriérového standardu či barvy srsti. 

- **Název stanice:** Vychází z řeckého *noésis* (rozumové poznání) a *nús* (mysl) — doslova *„Kočka poznávající myslí“*.
- **Metodický přístup:** Vychází z principů usměrněného výběru (analogie k Běljajevovým experimentům s domestikací lišek), kde jediným selekčním kritériem je přátelská, vyrovnaná, zvídavá a nebojácná povaha k lidem i jiným zvířatům (např. přirozená koexistence se psy).
- **Prostředí:** Indoor prostředí v Brně a venkovský výběh s automatickým krmením, vytápěným zázemím a kamerovým sledováním v Runářově.

---

## 📁 Struktura repozitáře

```
felis-noetica/
├── index.html                  # Hlavní česká webová stránka
├── chov.html                   # Popis chovatelského přístupu, etiky a péče
├── en.html                     # Anglická verze webové prezentace
├── styl.css                    # Kaskádové styly (CSS)
├── skript.js                  # Interaktivní skript pro Lightbox obrázků a Fullscreen videa
├── README.md                   # Tento průvodce repozitářem
├── assets/                     # Multimediální podklady (obrázky a videa)
│   ├── images/                 # Grafika a loga (logo.png, logo-znacka.png)
│   └── videos/                 # Videa (liska-a-kocka-runarov.mp4)
└── docs/                       # Metodická, genetická a chovatelská dokumentace
    ├── Felis_Noetica_kontext.md # Úplný předávací kontext projektu, rodokmeny a pravidla
    ├── FIFe_pravidla_vytah.md  # Analýza a výtah z chovatelských řádů FIFe a outcrossu EUR
    └── Ocekavany_selekcni_posun.md # Kvantitativně-genetické výpočty účinnosti selekce
```

---

## 📚 Dokumentace v adresáři `/docs`

Podrobné podklady k projektu jsou uloženi ve složce [`docs/`](docs/):

1. **[`Felis_Noetica_kontext.md`](docs/Felis_Noetica_kontext.md)**
   - Souhrnný předávací dokument se stávajícím stavem projektu.
   - Popis zakladatelky Šipky, první generace (Sokrates, Sofie, Sibyla, Zen, Aténa) a druhé generace (vrhy Sibyly a Sofie).
   - Redakční a etické zásady pro komunikaci a prezentaci chovné stanice.

2. **[`FIFe_pravidla_vytah.md`](docs/FIFe_pravidla_vytah.md)**
   - Právní a chovatelský rámec FIFe (vydání 2026).
   - Způsob registrace evropské krátkosrsté kočky (EUR) přes novicovskou třídu (RIEX) a povolené outcrossy na domácí kočky (s DNA testy FGF5, TYRP1, TYR).
   - Standardy péče (odběr ve 14 týdnech, povinné mikročipování, zdravotní panely).

3. **[`Ocekavany_selekcni_posun.md`](docs/Ocekavany_selekcni_posun.md)**
   - Kvantitativní genetika selekce ($R = h^2 \cdot i \cdot \sigma$).
   - Modelování selekční intenzity ($i$) a predikce posunu průměru populace během 3, 5 a 7 generací.

---

## 💻 Spuštění webu

Webové stránky jsou vytvořeny jako čisté statické rozhraní (HTML5 / CSS3) bez vnějších závislostí či sestavovacích kroků.

Pro zobrazení stačí otevřít soubor `index.html` v libovolném webovém prohlížeči, nebo složku servírovat pomocí lokálního webového serveru (např. v VS Code rozšířením Live Server, nebo příkazem `python -m http.server 8000`).

---

## 📜 Licenční a vlastnické informace

Chov i související materiály spravuje **A VIRTÙ RESEARCH & TECHNOLOGIES s.r.o.** / Viktor Lošťák.
