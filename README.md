# Optika Mila

Statički sajt [www.optikamila.com](https://www.optikamila.com/), pripremljen za GitHub Pages. Bez frameworka, npm paketa i serverskog koda. Dorada je zasnovana na verziji `08b3642167063678b7674a37c248f7716c351002` i proverena pre objave; objavu je korisnik odobrio 9. oktobra 2026.

## Odluke koje se čuvaju

- Pregledi van Foče ostaju odmah posle uvoda: Nevesinje, Rogatica i Gacko, jednom mjesečno.
- Postojećih deset starih fotografija ostaju male, prigušene sličice pri dnu. Nema novih fotografija, portreta ili hero slike.
- Ostaju postojeći logo, Source Serif 4 / Source Sans 3, topla podloga i zelena paleta.
- Pun izvorni uvodni paragraf koristi širinu 58ch. Regionalna sekcija je topla bež, naslovi imaju kratke mesingane linije, desktop navigacija je desno uz telefon.
- U praktičnim informacijama prvo je radno vrijeme, zatim adresa „Petra Bojovića bb“. Dani i satnice ostaju u istom redu, sa razmakom od 16 px.
- Gradovi koriste šuplje kružiće i isprekidane spojnice; do 480 px raspored je vertikalan. Uz pun uvod ne staju svi gradovi u prvi ekran telefona.
- Usluge imaju samo unutrašnje razdelnike. Arhivski okviri su toplo beli, bez senke, hover uvećavanja ili skidanja filtera.
- Ne uvode se forma za zakazivanje, kalendar ili neprovereni poslovni podaci.

## Izvor i izlaz

| Izvor koji se uređuje | Izlaz |
| --- | --- |
| `src/site.css` | Isti inline CSS u obe stranice |
| `src/index.template.html` | `index.html` |
| `src/404.template.html` | `404.html` |
| `src/eye.svg`, `src/phone.svg` | Inline ikonice u HTML-u |
| `src/navigation.js` | Inline inicijalizacija menija pre glavnog sadržaja |
| `js/script.js` | Deferred galerija i scroll stanje zaglavlja, bez transpajliranja |

**Ne uređivati generisane HTML fajlove direktno.** CSS je inline radi očuvanja jednostavne kritične putanje, ali se održava na jednom mestu. URL spoljašnje skripte dobija hash sadržaja radi osvežavanja keša.

Navigacija se inicijalizuje odmah posle zaglavlja, pre parsiranja `<main>`, bez dodatnog HTTP zahteva. Time visina mobilnog zaglavlja ne čeka učitavanje galerijske skripte i ne pomera glavni sadržaj. Klasa `nav-ready` i dalje se dodaje tek nakon instaliranja handlera. Bez JavaScripta ili bez inline inicijalizacije osnovna navigacija ostaje vidljiva; neuspešan zahtev za spoljašnju skriptu ne kvari meni, a fotografije ostaju obični linkovi.

Komande se pokreću iz korena ovog repozitorijuma. Potreban je PowerShell 7:

```bash
pwsh -NoProfile -File ./tools/build.ps1
```

Build najpre generiše i validira obe stranice u memoriji; greška u drugom predlošku ne zamenjuje prvi izlaz. Bajt-identični fajlovi se ne upisuju ponovo. Režim `-Check` proverava usklađenost izvora i izlaza bez pisanja:

```bash
pwsh -NoProfile -File ./tools/build.ps1 -Check
```

Generisani HTML i postojeći resursi rade na GitHub Pages bez pokretanja builda na hostingu. Objavljivanje je sa grane `master`, iz korena repozitorijuma; CNAME ostaje `www.optikamila.com`.

## Testovi

Statička provera (Python 3.9+ i PowerShell 7) radi offline. Proverava strukturu, resurse, metapodatke, poslovne podatke, script hash, source/output parity i 38 originalnih resursa prema zamrznutom manifestu:

```bash
python -I ./tools/verify-site.py
```

Opciono poređenje manifesta sa nepromenljivim javnim GitHub commitom zahteva internet:

```bash
python -I ./tools/verify-site.py --check-upstream
```

Izolovani build testovi koriste standardnu biblioteku i privremene foldere. OG testovi zahtevaju Windows:

```bash
python -I ./tools/test-build.py
```

Prvobitno objavljena verzija: 11/11 build testova i 90/90 browser provera. Naknadna lokalna CLS korekcija: **15/15 build testova**, build/`-Check`, offline verifikacija, **93/93 browser provere sa native close događajima**, 44 lokalna HTTP resursa i duboka 404 putanja. Kontrolisani pre/posle CLS na 412 px: **0,096433 → 0,000273**; pri zajedničkom odlaganju skripte i fontova na 375 px: **0,128194 → 0,000840**. To nisu novi produkcijski PSI rezultati; korisnik je odobrio objavu ove korekcije, a rezultat deploymenta proverava se odvojeno. Frakcioni breakpoint handler testovi koriste označenu simulaciju media događaja; zaseban native prelazak 981 → 980 px u aktivnom dokumentu potvrdio je vraćanje fokusa. Dogovoreni izgled je sačuvan u poređenju 21 stanja × 59 elemenata. Korisnik je potvrdio ručne provere prethodno navedenih ograničenja (telefon, Safari/Firefox, 200% zoom i Google mapa).

Detalji i granice ovih provera su u [VERIFIKACIJA.md](VERIFIKACIJA.md). Nema izmišljenog produkcijskog Lighthouse skora niti tvrdnje da je sajt određen procenat brži.

`tools/browser-checks.js` je regresioni driver za lokalni iframe harness; nije učitan u produkcijski HTML. Zahteva lokalni server sa `/__audit` i `/__baseline/` rutama. Taj server, privatni audit alati i privremene reference nisu deo ovog repozitorijuma. Bez njih se samostalno mogu pokrenuti build i Python provere navedene iznad.

## Slika za deljenje

`img/og-optika-mila.png` je grafika 1200 × 630 sa postojećim logotipom i tekstom, ne nova fotografija. Običan HTML build je ne regeneriše.

Početno generisanje zahteva Windows, PowerShell 7 i ugrađeni System.Drawing:

```bash
pwsh -NoProfile -File ./tools/make-share-image.ps1
```

Za namernu ponovnu izradu postojeće grafike koristi se `-Force`. Izvor koristi sistemske Georgia/Segoe UI fontove; fontovi sajta ostaju neizmenjeni.

## Pre svake sledeće objave

- Pokrenuti build, `-Check` i oba Python testna alata.
- Proveriti mobilni/landscape meni, navigaciju bez JS-a, svih deset fotografija, retry i povratak fokusa.
- Ručno proveriti tastaturu, zoom, telefon i Google mapu.
- Sačuvati sekcije, podatke i diskretnu arhivu; ne slati privremene testne fajlove.
- Posle push-a potvrditi deployment i javnu početnu/404 stranicu.

Poslovni podaci poput stručnog zvanja, kartičnog plaćanja, `priceRange` i saglasnosti za fotografije ostaju odgovornost vlasnika; dorada ih nije potvrđivala pretpostavkama. Istorija ranijih eksperimenata ostaje u [izvornoj verziji](https://github.com/optikamila/optikamila.github.io/tree/08b3642167063678b7674a37c248f7716c351002).
