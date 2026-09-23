# Reaktioaikalaskuri – pesäpallon etenijän lähtöjen mittaus videolta

Työkalulla mitataan kuvatarkasti etenijän reaktio- ja lähtöajat videolta. Video käsitellään vain omassa laitteessasi, eikä mitään lähetetä minnekään.

Työkalusta on kaksi versiota, jotka käyttävät samaa tallennusmuotoa:

| Versio | Tiedosto | Käyttö |
|---|---|---|
| **Mobiili** | `index.html` | Puhelimella treeneissä: valitse pelaaja, pesä ja ärsyke, napauta T0/T1/T2 ja tallenna. Asennetaan kotinäytölle GitHub Pagesista. |
| **Läppäri** | `reaktioaika.html` | Tarkka merkintä näppäimistöllä, tulokset, kaaviot ja CSV-vienti Power BI:hin. Toimii myös suoraan tiedostosta ilman nettiä. |

## Mobiiliversio (puhelin)

### Asennus (kerran per puhelin)
1. Avaa puhelimen selaimessa sovelluksen osoite, esim. `https://<käyttäjä>.github.io/reaktioaikalaskuri/`.
2. **Android (Chrome):** napauta *Asenna* tai valikosta *Lisää aloitusnäyttöön*. **iPhone (Safari):** *Jaa → Lisää Koti-valikkoon*.
3. Avaa sovellus jatkossa **aina kotinäytön kuvakkeesta**. Sen jälkeen se toimii myös ilman nettiä.

### Käyttö treeneissä
1. Kuvaa toisto puhelimen omalla kamerasovelluksella (slow-mo 120–240 fps, lyhyt pätkä: 1–3 toistoa per video).
2. Avaa sovellus → **＋ Video** → valitse video.
3. Tarkista **fps-merkki**. Keltainen merkki tarkoittaa, että kuvataajuus pitää kuitata. Napauta sitä ja valitse *Ei hidastusta* tai kuvaushetken slow-mo-fps (120/240/480). Aito 120/240 fps -tiedosto kuitataan automaattisesti (vihreä).
4. Napauta ylärivin valintaa ja valitse **pelaaja, tilanne (pesä) ja ärsyke**. Valinnat muistetaan seuraavaan toistoon.
5. Etsi kohta: **vedä jog-nauhaa** (16 px = 1 kuva) tai käytä nappeja −10/−1/+1/+10. Nipistä videota zoomataksesi.
6. Napauta **T0**, **T1** (valinnainen) ja **T2** → **Tallenna**.
7. Tuloskortti näyttää lähtö- ja reaktioajan. *Kumoa tallennus* on käytettävissä 6 sekuntia, ja *Seuraava pelaaja* -napeilla vaihdat pelaajan yhdellä napautuksella.

**Tänään-näkymä** näyttää päivän toistot pelaajittain mediaaneineen. Toiston napautus avaa valikon: muokkaa, hylkää/palauta, kommentoi tai poista.

### Tietojen siirto läppärille
- Puhelimessa: **Jaa varmuuskopio** → valitse Drive (tai sähköposti). Sovellus muistuttaa, kun varmuuskopio on vanha.
- Läppärillä: `reaktioaika.html` → **Asetukset → Tuo / yhdistä JSON**. Duplikaatteja ei synny (UUID), joten saman tiedoston voi tuoda uudelleen.
- CSV:n voi jakaa myös suoraan puhelimesta (*Jaa CSV*).

> **Tietojen säilyvyys:** tiedot ovat puhelimen selaimen tallennustilassa. Jos sovellus poistetaan tai selaimen tiedot tyhjennetään, tiedot katoavat. Jaa varmuuskopio säännöllisesti. iPhonella kotinäytön sovelluksella ja Safarin välilehdellä on eri tallennustilat, joten käytä aina kuvaketta.

### Julkaisu GitHub Pagesiin
1. Luo GitHubissa uusi **public**-repositorio, esim. `reaktioaikalaskuri`. GitHub Pages on ilmainen julkisille repositorioille. Julkiseksi tulee vain ohjelmakoodi, ei videoita eikä mittausdataa.
2. Lähetä tämä kansio sinne:
   ```bash
   git remote add origin https://github.com/<käyttäjä>/reaktioaikalaskuri.git
   git push -u origin main
   ```
3. GitHubissa: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**. Sivu on hetken kuluttua osoitteessa `https://<käyttäjä>.github.io/reaktioaikalaskuri/`.
4. Päivitykset: `git commit` + `git push`. Sovellus hakee uuden version automaattisesti, kun puhelimessa on verkko.

Samasta osoitteesta toimii myös läppäriversio: `…/reaktioaikalaskuri/reaktioaika.html`. Samalla laitteella ja samasta osoitteesta avattuna molemmat versiot näkevät samat tiedot.

### Tarkista puhelimesi kerran (kalibrointi)
- Avaa puhelimella `…/test/mobiili-testi.html` ja paina **Aja testit**. Testi tarkistaa, osuuko kuvaselaus juuri oikeaan kuvaan tämän puhelimen selaimessa.
- Kuvaa slow-mona sekuntikelloa ja merkitse kaksi kuvaa, joiden välillä kello on edennyt tasan 1,000 s. Sovelluksen pitää näyttää noin 1000 ms. Jos näyttää 8000 ms, kuvattu fps on asettamatta.

## Läppäriversion käyttöönotto

1. Avaa `reaktioaika.html` Chromessa tai Edgessä (tuplaklikkaa tai raahaa selaimeen).
2. Kirjoita **Asetukset**-välilehdellä nimesi kohtaan *Merkitsijä*.
3. Avaa video painikkeesta **Avaa video…** tai raahaa tiedosto ikkunaan.

Tiedot tallentuvat selaimen IndexedDB-tietokantaan juuri tälle koneelle ja tälle selaimelle. **Ota säännöllisesti JSON-varmuuskopio** (Asetukset → Vie JSON-varmuuskopio).

## Merkintä askel askeleelta

1. Valitse **pelaaja** (tai lisää uusi painikkeella *+ Uusi*), **ärsyke** (syöttö / osuma / signaali), **pesä**, **päivämäärä** ja **harjoitus**.
2. Tarkista kuvataajuus:
   - **Videon fps** tunnistetaan automaattisesti, mutta voit aina korjata sen käsin.
   - **Kuvattu fps**: jos video on slow-mo, valitse kuvaushetken todellinen fps (esim. 240). Muuten valitse *Sama kuin video*.
3. Selaa kuva kerrallaan ja merkitse:
   - <kbd>Q</kbd> = **T0 ärsyke**
   - <kbd>W</kbd> = **T1 ensimmäinen liike** (valinnainen)
   - <kbd>E</kbd> = **T2 jalka irtoaa pesältä**
4. <kbd>Enter</kbd> tallentaa toiston ja tyhjentää merkinnät seuraavaa toistoa varten. Samassa videossa voi olla useita toistoja ja useita pelaajia.
5. Epävarman toiston voi merkitä hylätyksi näppäimellä <kbd>H</kbd>, ja sille voi kirjoittaa kommentin.

Lasketut arvot:

| Mittari | Kaava |
|---|---|
| Reaktioaika | T1 − T0 |
| Lähtöaika | T2 − T0 |
| Lähtötekniikka | T2 − T1 |

**Negatiiviset arvot sallitaan.** Ne tarkoittavat ennakointia tai syötössä mahdollista varaslähtöä. Ne tallennetaan normaalisti ja korostetaan punaisella.

### Näppäinoikotiet (<kbd>?</kbd> näyttää ne myös sovelluksessa)

| Näppäin | Toiminto |
|---|---|
| ← / → | 1 kuva taakse / eteen |
| Shift + ← / → | 10 kuvaa |
| Välilyönti | toisto / tauko |
| [ / ] | toistonopeus 0,1× … 1× |
| Q / W / E | T0 / T1 / T2 |
| 1 / 2 / 3 | siirry merkkiin T0 / T1 / T2 |
| Enter | tallenna toisto |
| Ctrl + Z | kumoa viimeisin merkintä |
| H | hylätty / epävarma |
| A | ehdota T0 äänestä (toinen painallus hyväksyy) |
| + / − / 0 | zoomaa videota / palauta |
| Esc | peru muokkaus tai ehdotus |

**Hiiri:** Videon päällä rulla zoomaa ja raahaus siirtää kuvaa. Aikajanalla klikkaus siirtyy kohtaan ja merkkiä voi raahata. Oikea klikkaus merkkiin poistaa sen, ja rulla zoomaa aikajanaa.

### Lyönnin osuma äänestä

Kun videossa on ääni, aikajanan alle piirtyy aaltomuoto. Siirry osuman lähelle ja paina <kbd>A</kbd>. Työkalu etsii voimakkaimman äänipiikin ±0,5 s:n alueelta ja ehdottaa sen alkukohtaa T0:ksi. Hyväksy painamalla <kbd>A</kbd> uudelleen tai korjaa kuvan perusteella (<kbd>Q</kbd>).

- Ääni kulkee noin 343 m/s, joten 10 metrin päästä kuvattuna viive on noin 29 ms. Anna kameran etäisyys lyöjästä Asetuksissa, niin ehdotus korjataan viiveellä.
- Puhelimen ääni ja kuva voivat olla muutaman millisekunnin eri tahdissa. **Tarkista ehdotus aina kuvasta.**
- Slow-mo-videoissa ääni on usein vääristynyt tai puuttuu kokonaan. Käytä niissä kuvaa.

## Slow-mo – tärkeää

Puhelimen slow-mo-video tallennetaan usein niin, että esimerkiksi 240 fps:n materiaali toistetaan 30 fps:llä, eli video on 8× hidastettu. Jos *Kuvattu fps* jätetään asetukseen *Sama kuin video*, **kaikki ajat ovat 8× liian suuria**. Kun kuvattu fps on asetettu, työkalu muuntaa ajat todelliseksi ajaksi ja näyttää hidastuskertoimen.

Miten tunnistat tilanteen: video näyttää hidastetulta, ja *Videon fps* on 30, vaikka kuvasit 240 fps:llä. Jos taas videotiedosto on aidosti 240 fps (Videon fps = 240), hidastusta ei tarvitse asettaa. Työkalu muistaa asetuksen videokohtaisesti.

## Mittaustarkkuus

Tarkkuus riippuu **kuvaushetken** kuvataajuudesta:

| Kuvattu fps | Yksi merkintä | Aikaväli (kaksi merkintää) |
|---|---|---|
| 30 | ±33 ms | ±67 ms |
| 60 | ±17 ms | ±33 ms |
| 120 | ±8 ms | ±17 ms |
| 240 | ±4 ms | ±8 ms |

30 fps ei riitä reaktioaikojen vertailuun, koska pelaajien väliset erot ovat usein 20–50 ms. **Kuvaa vähintään 120 fps, mieluiten 240 fps.**

## Kuvausohjeet

- **Jalusta.** Kameran on oltava täysin paikallaan. Käsivarainen kuvaus vaikeuttaa jalan irtoamisen näkemistä.
- **120–240 fps slow-mo**, hyvä valaistus (sisähallissa slow-mo tarvitsee paljon valoa, muuten kuva on rakeinen ja liike-epäterävä).
- **Ärsyke ja etenijän jalka samaan kuvaan.** Syötössä näkyvät lukkarin käsi ja etenijä. Lyönnissä näkyvät maila/pallo ja etenijä. Signaalissa näkyvät kaarella oleva mailamies ja 3-pesän etenijä.
- **Kuvaa sivulta** jalan korkeudelta, jolloin irtoaminen pesästä näkyy selvästi.
- **Kaksi kameraa?** Jos ärsyke ja etenijä eivät mahdu samaan kuvaan, käytä **yhteistä taputusta**. Taputa selvästi molempien kameroiden nähden ennen toistoja ja synkronoi videot taputuksen kuvaan. (Työkalu mittaa yhdeltä videolta kerrallaan, joten tee aikaerolaskenta synkronoinnin avulla tai yhdistä videot ennen merkintää.)
- **Koodekki:** iPhone: *Asetukset → Kamera → Formaatit → Yhteensopivin* (H.264). Android: poista HEVC/H.265 käytöstä. Windowsin Chrome ei aina toista HEVC-videoita.

### HEVC-videon muunnos ffmpegillä

```bash
ffmpeg -i "video.mov" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -fps_mode passthrough -c:a aac -b:a 160k "video_h264.mp4"
```

`-fps_mode passthrough` säilyttää jokaisen kuvan ja aikaleiman (vanhemmissa ffmpeg-versioissa `-vsync passthrough`).

## Merkintäsäännöt (sovi yhteiset säännöt kaikille merkitsijöille)

| Merkki | Sääntö |
|---|---|
| **T0 syöttö** | Ensimmäinen kuva, jossa pallo ei enää koske lukkarin sormiin. |
| **T0 lyönnin osuma** | Ensimmäinen kuva, jossa maila ja pallo koskettavat (tai ääniehdotus tarkistettuna). |
| **T0 mailamiehen signaali** | Ensimmäinen kuva, jossa mailan alasvienti on selvästi alkanut. |
| **T1 ensimmäinen liike** | Ensimmäinen kuva, jossa painonsiirto, lantio tai jalka selvästi liikahtaa lähtösuuntaan. Jätä merkitsemättä, jos et ole varma. |
| **T2 jalka irtoaa** | Ensimmäinen kuva, jossa pesällä ollut jalka ei enää koske pesään tai maahan. |

- Merkitse aina **ensimmäinen kuva, jossa tapahtuma on näkyvissä**, älä viimeistä kuvaa ennen sitä.
- Jos kuva on epäselvä (liike-epäterävyys, peittävä pelaaja), merkitse toisto **hylätyksi / epävarmaksi** (<kbd>H</kbd>) ja kirjoita syy kommenttiin.
- Merkitkää sama video kahden valmentajan kesken ajoittain ja verratkaa tuloksia. Yli 1–2 kuvan erot kertovat, että sääntöjä pitää tarkentaa.

## Tulokset ja vienti

- **Tulokset**-välilehti näyttää pelaajittain, ärsykkeittäin ja pesittäin toistojen määrän, **mediaanin** (pääluku), keskiarvon, keskihajonnan, parhaan tuloksen ja hylättyjen määrän. Alle 5 toiston otoksista näytetään varoitus.
- Kaaviot: pelaajavertailu (mediaanipalkki ja yksittäiset toistot), kehitys ajan yli sekä reaktioaika vs. lähtötekniikka.
- **CSV Power BI:tä varten** (Asetukset → Vie kaikki CSV, tai Tulokset/Toistot → Vie suodatetut):
  - erotin `;`, desimaalierotin `,`, UTF-8 BOM
  - yksi rivi per toisto: `toisto_id; pvm; harjoitus; pelaaja; tilanne; video; fps_kuvattu; t0_ms; t1_ms; t2_ms; reaktioaika_ms; lahtoaika_ms; tekniikka_ms; tarkkuus_ms; hylatty; merkitsija; kommentti; pesa`
  - `tilanne` = ärsyke (Syöttö / Lyönnin osuma / Mailamiehen signaali), `pesa` = Kotipesä / 1-pesä / 2-pesä / 3-pesä. `pesa` on viimeisenä, jotta aiemmin tehdyt Power BI -tuonnit eivät rikkoudu.
  - `t0_ms`–`t2_ms` ovat merkintöjen kohtia videossa todellisena aikana
  - `tarkkuus_ms` on aikavälin epävarmuus (±2 kuvaa jaettuna kuvatulla fps:llä, esim. 8,3 ms @ 240 fps)
  - `hylatty` on 1 tai 0
  - Power BI:ssä: *Nouda tiedot → Teksti/CSV*, erotin puolipiste, alue suomi.
- **JSON-varmuuskopio** siirtää kaikki tiedot koneelta toiselle. Tuonti **yhdistää** tiedot: saman `toisto_id`:n (UUID) toistoja ei monisteta, uudempi muokkaus voittaa, ja samanniminen pelaaja yhdistetään. Näin usean valmentajan merkinnät saa samaan kantaan.

## Tekniset huomiot

- Kuva-aika luetaan `requestVideoFrameCallback`-rajapinnasta (`mediaTime`), ja merkinnät tallennetaan todellisena kuva-aikana. Kuvanumero on näyttöä varten.
- Kuvataajuus tunnistetaan siirtymällä videon alussa pienin askelin ja mittaamalla peräkkäisten kuvien aikaerot.
- Videoita ei tallenneta. Tallennetaan vain metatiedot: tiedostonimi, koko, kesto ja fps-asetukset.

## Testaus

Kansiossa `test/` on automaattinen testi, joka luo selaimessa (WebCodecs, ilman ffmpegiä) testivideot. Videoissa T0/T1/T2 ovat tunnetuissa kuvissa, ja jokaisen kuvan numero on koodattu kuvaan binäärinauhana:

- 30 fps normaali video, jossa myös negatiivinen reaktioaika ja ääninapsahdus T0:ssa
- slow-mo: 240 fps kuvattu, 30 fps toisto
- aito 240 fps -video

Testi painaa oikeita näppäimiä sovelluksessa, tarkistaa videosta, että näkyvä kuva on juuri oikea, ja vertaa laskettuja aikoja odotettuihin (±1 kuva). Lisäksi se tarkistaa CSV:n muodon ja JSON-tuonnin duplikaattien käsittelyn.

Testit vaativat paikallisen palvelimen, koska `file://`-osoitteessa iframe-yhteys estyy:

```bash
python -m http.server 8765
```

Avaa sitten `http://localhost:8765/test/testi.html` (läppäriversio) tai `http://localhost:8765/test/mobiili-testi.html` (mobiiliversio) ja paina **Aja testit**. Pidä välilehti näkyvissä, koska piilotettu välilehti ei piirrä videokuvia. Sivulta voi myös ladata testivideot `.webm`-tiedostoina.

**Testidata pysyy erillään.** Testisivu avaa sovelluksen osoitteella `reaktioaika.html?db=testi`, jolloin se käyttää omaa tietokantaansa (`reaktioaikalaskuri-testi`, otsikossa lukee *TESTITIETOKANTA*). Tietokanta tyhjennetään jokaisen testiajon alussa, joten testitoistot eivät kasaannu. Painike **Tyhjennä testitietokanta** tyhjentää sen käsin. Oikeisiin merkintöihin testit eivät koske.
