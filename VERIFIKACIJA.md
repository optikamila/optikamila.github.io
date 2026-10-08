# Verifikacija lokalne dorade

**Datum:** 8–9. oktobar 2026.

**Osnova:** `optikamila/optikamila.github.io`, verzija `08b3642167063678b7674a37c248f7716c351002`.

**Status provera:** dorada je implementirana i proverena u navedenom obimu. Korisnik je potvrdio ručne provere i odobrio objavu 9. oktobra 2026. Ovaj dokument beleži provere pre objave; nije potvrda završenog deploymenta.

## Očuvane poslovne i vizuelne odluke

- Pregledi van Foče ostaju odmah posle uvoda, pre usluga.
- Nevesinje, Rogatica i Gacko i podatak „jednom mjesečno“ su sačuvani.
- Regionalna sekcija ostaje odmah posle punog uvoda. Po vraćanju originalnih kružića i vertikalnih spojnica do 480 px, donje ivice gradova na **375 × 812** su približno **859, 920 i 951 CSS px**. Ne staju svi u prvi ekran. Ranije pozicije 704/833 px odnosile su se na prethodne varijante, ne na aktuelni raspored.
- Nema fotografije u uvodu, portreta, stock slika ni novih fotografija.
- Galerija je i dalje pri dnu i koristi istih deset starih fotografija.
- Na svih 19 testiranih širina thumbnailovi su **iste širine kao u referentnoj verziji**, ne veći.
- Originalni filter `sepia(.16) saturate(.78) contrast(1.04) brightness(1.02)` je zadržan. Poređen je sa mekšom varijantom, ali ona nije donela dovoljno jasno vizuelno poboljšanje da opravda promenu.
- Uklonjeno je hover uvećavanje i skidanje filtera: arhiva ostaje diskretna i kada se pređe mišem preko nje.
- Git blob hash provera potvrđuje da je **38 originalnih resursa** — 30 WebP fajlova, četiri fonta i četiri ikonice — bajt-identično izvoru.

## Šta je dorađeno

- Logo vodi na ne-sticky početnu sekciju i zaista vraća na vrh.
- Zaglavlje prilagođeno malim ekranima; mobilni meni koristi raspoloživu visinu i sopstveno skrolovanje.
- Desktop/menu breakpoint pomeren na 980/981 px; nazivi navigacije ostaju jednoredni.
- Navigacija je dostupna i bez JavaScripta i kada se spoljna skripta ne učita.
- Po naknadnom korisnikovom zahtevu vraćen je pun izvorni uvodni paragraf. Veliki inicijal i reveal animacije nisu vraćeni. Doktorkino ime i lični pregled ostaju istaknuti.
- Adresa i sažeto radno vreme dostupni su u uvodu. Sekundarna akcija „Kako do nas“ vodi na kontakt.
- Regionalna sekcija je kompaktnija, sa jasno vidljivim gradovima i celim telefonskim brojevima.
- Usluge nemaju dekorativne brojeve ni hover koji sugeriše nepostojeću akciju.
- Sadržaj više nije sakriven iza scroll-reveal animacija i njihovih fallback timera.
- Kontakt razlikuje fiksni i mobilni telefon; ispravljene sitne tekstualne greške.
- Galerija ima loading/error stanje, ponovni pokušaj, kontrolu zastarelih zahteva i zaključavanje skrolovanja pozadine.
- Dodata grafika za deljenje 1200 × 630 px, napravljena od postojećeg logotipa i teksta, i odgovarajući OG/Twitter metapodaci.
- Jedan CSS izvor generiše inline stil obe HTML stranice. Uklonjeni su dugi istorijski komentari iz objavljenog izlaza.

## Naknadna diskretna vizuelna dorada

Posle prve diskretne dorade korisnik je zatražio vraćanje izvornog paragrafa, kratke linije ispod naslova, toplu bež umesto zelenkaste podloge i desktop meni desno uz telefon. Aktuelni izgled:

- Pun izvorni uvodni paragraf vraćen je doslovno, bez skraćivanja.
- Regionalni pregledi i arhiva koriste toplu bež `#F0EBE2`. Eksperimentalna zelenkasta `#EDF1E9` i njen CSS token su uklonjeni.
- Ispod naslova četiri glavne sekcije su kratke linije 56 × 2 px, u postojećem mesinganom tonu `#A87B39`. Nema linije preko cele širine.
- Desktop navigacija je grupisana desno uz telefonsko dugme, sa razmakom od 20 px. Mobilna navigacija nije menjana ovom korekcijom.
- Usluge ostaju bez spoljašnjeg okvira, sa unutrašnjim pregradama na desktopu i razdelnicima redova na telefonu.
- Okviri sličica koriste toplu belu `#F7F4EE` i nemaju senku. Grid, border, padding, dimenzije slika i filter nisu menjani.
- Obične stavke mobilnog menija zadržavaju razdelnike i površinu za dodir od najmanje 50 px; poziv ostaje zeleno dugme od najmanje 54 px.

Izmenjeni su izvorni CSS, HTML predlošci i generisani izlaz, uz testove/dokumentaciju. Adresa „Petra Bojovića bb“ dodata je po izričitom korisnikovom zahtevu i usklađena u uvodu, kontaktu, podnožjima, nazivu mape i JSON-LD podacima. Ostali poslovni podaci, produkciona JavaScript skripta, originalni resursi i OG grafika nisu menjani. Ponovljene su statičke provere i kompletna browser regresija, prilagođena novim zahtevima. Ranije provere prikaza gradova bez skrolovanja nisu zadržane kao kriterijum za duži paragraf; sada se proveravaju doslovan tekst, neposredan položaj regionalne sekcije i stvarna geometrija.

### Širina uvoda, praktične informacije i originalne oznake gradova

- Objavljeni CSS koristi 58ch za uvodni paragraf; lokalnih 48ch zamenjeno je istim 58ch ograničenjem. Na desktopu 1440 px stvarna širina paragrafa je približno **544 px**, prema približno **538 px** u referenci. Na svih 19 širina novi paragraf nije uži od reference.
- Radno vreme je levo/prvo, adresa desno/druga. Labela je „Adresa“, a vrednost „Petra Bojovića bb“.
- Dani i satnice su u dve grid kolone sa **16 px razmaka** i po dva reda. Na svih 19 širina, uključujući 320 px, dan i satnica ostaju u istom redu, bez horizontalnog overflowa.
- Vraćeni su originalni kružići prečnika 11 px sa zelenim okvirom, i originalne isprekidane spojnice. Do 480 px gradovi su povezani vertikalno, kao u referentnom sajtu; iznad toga koristi se horizontalni flex raspored.
- Dodato je pet browser provera i statička provera usklađenosti adrese. Sadržaj uvoda, topla bež podloga, kratke naslovne linije, desktop meni desno i mala arhiva ostaju očuvani.

## Utezanje i optimizacija koda

Dogovoreni izgled i sadržaj početne stranice nisu redizajnirani. Izmene:

- JavaScript koristi isti `max-width:980px` uslov kao CSS; zatvaranje menija i povratak fokusa imaju jednu zajedničku putanju.
- `--header-height` se upisuje samo kada se visina zaista promeni. ResizeObserver i resize fallback su zadržani.
- Lazy sličice koriste `sizes="auto, …"` uz postojeći fallback. Browser koji podržava auto-sizes može birati iz postojećeg srcset-a prema stvarnoj širini; nema garantovanog procenta uštede niti novih slika.
- U tekstu radnog vremena i telefonskih oznaka dodati su semantički razmaci. Uklonjene su dve redundantne CSS deklaracije.
- Telefon u 404 zaglavlju poravnat je desno, bez uticaja na navigaciju početne stranice.
- Build validira obe stranice pre pisanja, preskače nepromenjene fajlove, ima read-only `-Check` i čuva CSS stringove/data URI pri uklanjanju komentara. Ovo nije transakcijska garancija za prekid diska ili procesa tokom samog upisa.
- Podrazumevana statička provera radi offline prema zamrznutom manifestu; upstream API je opciona provera.
- OG generator oslobađa alocirane resurse i kada učitavanje ulaza ne uspe. Postojeći PNG nije regenerisan.

### Izolovani testovi builda — 11/11 PASS

Poslednji završeni prolaz `tools/test-build.py`: **11 testova, OK**. Fixture-i rade u privremenim folderima, ne nad izlazom sajta. Pokrivaju determinističnost, UTF-8 bez BOM-a, no-op build, čist/driftovan/nedostajući izlaz uz `-Check`, neispravan drugi predložak i duplirani placeholder bez zamene izlaza, hash skripte u obe stranice, očuvanje CSS stringova/URL-ova/razmaka, zaštitu OG slike od slučajnog prepisivanja i offline proveru bez mrežnog poziva.

### Poređenje sa stanjem pre optimizacije — PASS

Rekonstruisana referenca je potvrđena zabeleženom veličinom i SHA-256 vrednošću prethodne skripte, i veličinama prethodnih HTML izlaza. U istom browser prolazu, pri DPR **1,5**, upoređeno je **21 stanje × 59 elemenata**: 19 širina i dva otvorena mobilna menija. Nema razlika u izabranim computed stilovima niti geometrijskih odstupanja većih od 1 CSS px. Ovo je DOM/CSS poređenje, ne pixel-diff svih delova stranice. Referenca je privremeni ignorisani testni folder, ne produkcijski sadržaj.

### Status završnog ponavljanja

Nakon izričite dozvole korisnika za lokalno izvršavanje koda iz izvornog repozitorijuma, završno ponavljanje je izvršeno: build je prijavio nepromenjena oba izlaza, `-Check` je prošao bez upisa, svih **11 testova** je prošlo za **7,411 s**, a offline i opcioni upstream verifier završili su sa **PASS**. Svih **44 HTTP resursa** i duboka 404 putanja ponovo su provereni i prošli. Raniji pokušaji blokirani bezbednosnim režimom nisu uračunati u uspešne prolaze. Produkcijski CSS/HTML/JS nisu menjani zbog ograničenja testnog okruženja.

## Browser regresione provere — poslednji završeni prolaz 90/90 PASS

Browser: Chromium/Chrome 152 u lokalnom preview okruženju. Koristi se stabilan iframe viewport-harness; provereni su DOM, izračunati stilovi, snimci i stvarno učitavanje slika.

### Responsive matrica

**320, 360, 375, 390, 430, 520, 600, 768, 860, 861, 886, 900, 980, 981, 1000, 1280, 1440, 1920 i 2560 px.**

Na svakoj širini prošle su provere:

- bez horizontalnog overflowa tela stranice;
- dugme menija, kada je prikazano, nije odsečeno;
- vidljiva desktop navigacija se ne prelama;
- thumbnailovi nisu povećani u odnosu na referencu.

### Deset dodatnih vizuelnih i sadržajnih provera

- Topla bež regionalna podloga i nepromenjena bež podloga arhive.
- Kontrast naslova, gradova, objašnjenja i telefonskih linkova na regionalnoj podlozi: najmanje **6,06 : 1**.
- Samo unutrašnje pregrade usluga na desktopu.
- Kratke mesingane linije 56 × 2 px ispod naslova sekcija.
- Desktop navigacija grupisana desno uz telefon; na svih šest testiranih desktop širina razmak je **20 px**.
- Uvodni paragraf je doslovno isti kao tekst koji je korisnik zatražio.
- Toplo beli arhivski okviri bez senke.
- Samo razdelnici redova usluga na telefonu.
- Mobilne stavke bez kutija, sa površinama za dodir od najmanje 50 px.
- Poziv ostaje zasebno zeleno dugme od najmanje 54 px.

Test razdelnika proverava postojanje ivice, ne strogu jednakost izračunate debljine sa `1px`: na Windows DPI skaliranju deklarisana 1px ivica može biti zaokružena na 0,666667 CSS px. Izmena CSS-a nije bila potrebna.

Pre-optimizaciona vizuelna verzija završila je sa 80/80 PASS. **Završni prošireni prolaz: 90/90 PASS, `closeEvents: native`, deset učitanih velikih fotografija i bez povećanja sličica.** Simulacija close događaja nije korišćena u ovom završnom prolazu. Raniji prolaz uz simulaciju bio je pomoć za neaktivni preview; jedan native pokušaj završio je timeoutom na prvom close događaju. Testni driver je zatim ispravljen da vrati fokus glavnom iframe-u nakon pomoćnog breakpoint testa, a ceo native prolaz je ponovljen i prošao. Zasebno je potvrđen i trusted native close događaj sa vraćenim fokusom i otključanim skrolom.

Šest dodatnih provera oko **979,75–981 px** porede stvarni CSS i matchMedia uslov, ali povratak fokusa/breakpoint handler aktiviraju **simuliranim media-change događajem**. Skriveni preview nije pouzdano dostavio native change događaj; ove provere nisu dokaz native resize-event isporuke. Prva naknadna proba **981 → 980 px** u neaktivnom dokumentu vratila je `focusRestored: false`. Ponovljena proba sa potvrđenim `document.hasFocus() === true`, bez simuliranog media događaja, završila je sa **trusted native change, zatvorenim menijem i fokusom na dugmetu**. Prethodni neuspešan rezultat nije potvrđena greška produkcijskog koda; izmena tog koda nije bila potrebna. Browser driver sada eksplicitno vraća fokus glavnom testnom iframe-u nakon uklanjanja pomoćnog breakpoint iframe-a. Ostale nove provere obuhvataju auto-sizes/fallback, izostanak suvišnih upisa visine zaglavlja, resize fallback bez ResizeObserver-a i desno poravnanje telefona na 404. Nije menjan produkcijski kod da bi se zaobišlo ograničenje harness-a.

### Navigacija

- Otvaranje menija, zatvaranje klikom izvan i klikom na link.
- Escape handler zatvara meni i vraća fokus.
- Na **740 × 320 px** poslednja stavka menija dostupna je njegovim skrolovanjem; donja ivica linka „Kontakt“ približno je na 299 px.
- Klik na logo sa skrola 1200 px vraća `scrollY` na 0.
- Bez skriptovanja navigacija ostaje vidljiva; ne prikazuje se nefunkcionalno dugme.
- Namerno neuspešan zahtev za skriptu takođe ostavlja navigaciju dostupnom.

### Galerija

- Svih deset velikih WebP slika otvara se i dekodira: originalne širine 640, 936 ili 985 px.
- Svako zatvaranje vraća fokus na odgovarajuću sličicu i otključava pozadinu.
- Native modal sprečava fokusiranje elementa izvan dijaloga.
- Prethodna fotografija prelazi sa prve na poslednju; tastaturna desna strelica vraća na prvu.
- Horizontalni i povratni swipe handleri menjaju sliku; vertikalni i otkazani pokreti ne menjaju sliku. Gestovi su simulirani događajima, ne fizičkim telefonom.
- Native `requestClose()` putanja zatvara dijalog, vraća fokus i otključava pozadinu; u završnom prolazu nisu simulirani close događaji.
- Stvarni HTTP 404 za probnu veliku sliku prikazuje razumljivu poruku i retry dugme; ponovni pokušaj sa vraćenim ispravnim URL-om uspeva.
- Kontrolisana simulacija sporog učitavanja prikazuje status i `aria-busy`.
- Stari load/error događaji ne mogu da zamene novu fotografiju ili prikažu pogrešnu grešku.
- Simulirani istek loading timera prikazuje mogućnost oporavka.

Konzola tokom fault-testova sadrži očekivane 404 i sandbox poruke, jer se kvar namerno izaziva. U normalnom toku nisu uočeni neočekivani JavaScript exceptioni.

## Statičke i HTTP provere — PASS

Skripta `tools/verify-site.py` proverava:

- strukturu i redosled sekcija, interne ciljeve i jedinstvene ID-jeve;
- lokalne putanje, srcset fajlove, alt opise i dimenzije fotografija;
- identičan CSS u početnoj i 404 stranici;
- hash u URL-u aktuelne skripte;
- JSON-LD, kanonsku adresu, poslovne kontakte i radno vreme;
- OG PNG dimenzije, Twitter card, sitemap XML i nepromenjen CNAME;
- originalne resurse prema Git blob hash vrednostima;
- read-only usklađenost generisanog izlaza sa izvorima (`build.ps1 -Check`); ponovljivost/no-op build provereni su zasebnim izolovanim testovima.

Dodatno su proverena **44 javna lokalna resursa: svi vraćaju HTTP 200**. Nepostojeća duboka putanja vraća **HTTP 404**, odgovarajući HTML i ispravan Content-Type.

### Čitljivost i miran prikaz

- Najmanji provereni vidljivi tekst: **14 px**.
- Najniži izračunati normalni kontrast teksta prema ravnoj podlozi: približno **4,52 : 1**; nema pronađenih padova u toj proveri.
- Na sadržaju nema aktivnih ulaznih/reveal animacija. Reduced-motion pravila ostaju prisutna.

Ovo nije sertifikacija potpunog WCAG usaglašavanja; tekstura, sva moguća stanja i čitači ekrana nisu pokriveni ovim numeričkim proverama.

## Veličine fajlova

| Fajl | Izvorna verzija | Lokalna dorada |
| --- | ---: | ---: |
| `index.html` | 76.609 B | 41.893 B |
| `404.html` | 50.060 B | 23.249 B |
| `js/script.js` | 7.305 B | 7.065 B |

Aktuelni hash skripte u obe stranice: `8f1f4f4da4c1`. Veličine HTML-a uključuju završni newline.

Nova OG grafika: **28.696 B**, 1200 × 630 px. Ne prikazuje se kao hero i nije novi zahtev za fotografiju u prvom ekranu.

Početni HTML je približno **45,3% manji u nekompresovanom obliku od izvorne verzije**. To nije tvrdnja da je sajt 45,3% brži: produkcijska kompresija i mreža nisu merene ovim testom. Ova poslednja optimizacija prvenstveno poboljšava pouzdanost i uklanja nepotreban rad; nije agresivna minifikacija, pa je izlaz malo veći od prethodne lokalne iteracije.

## Reprodukcija

Iz korena repozitorijuma:

```bash
pwsh -NoProfile -File ./tools/build.ps1
```

```bash
python -I ./tools/verify-site.py
```

Read-only provera izlaza:

```bash
pwsh -NoProfile -File ./tools/build.ps1 -Check
```

Izolovani build testovi:

```bash
python -I ./tools/test-build.py
```

Podrazumevana statička provera koristi lokalni manifest i ne zahteva internet. Dodatno poređenje manifesta sa nepromenljivim javnim GitHub commitom zahteva internet:

```bash
python -I ./tools/verify-site.py --check-upstream
```

Browser driver je u `tools/browser-checks.js`; koristi lokalni server i baseline proxy. Podrazumevano čeka native close događaje; opcija `simulateCloseEvents` je eksplicitna testna pomoć za skriveni preview, a rezultat navodi režim. Poređenje pre-optimizacione reference provereno je zasebno; nije uračunato kao dodatna provera u navedenih 90.

## Ograničenja i ručne provere

- Nije pokrenut novi produkcijski Lighthouse/PageSpeed test sa kontrolisanim throttlingom. Nema izmišljenog performance skora.
- **Korisnička potvrda, 9. oktobar 2026:** korisnik je naveo da je proverio pomenuta ograničenja — fizički telefon, Safari/Firefox, stvarni browser zoom od 200% i Google mapu — i da je sve u redu. To je korisnička ručna provera, ne dodatni automatizovani rezultat ovog izveštaja.
- Ceo nativni Tab/Shift+Tab prolaz i čitač ekrana nisu zasebno potvrđeni ovim izveštajem. Fokus je proveravan programatski i native dialog metodama; reflow je proveravan na navedenim širinama.
- Google Maps endpoint je dostupan, ali spoljni embed nije pouzdano prikazan u preview okruženju. Link i podaci su očuvani; mapa nije proglašena pokvarenom. Korisnik je potvrdio ručni pregled van preview okruženja.
- Poslovni podaci poput stručnog zvanja, kartičnog plaćanja i saglasnosti za fotografije ostaju vlasnička provera. Nisu dopunjavani pretpostavkama.

**Provere iz ovog dokumenta završene su pre objave.** Korisnik je naknadno odobrio objavljivanje; rezultat deploymenta proverava se odvojeno od lokalnih testova.
