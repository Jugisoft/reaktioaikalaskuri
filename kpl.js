/* =====================================================================
   KPL Keskus -yhteys (30.10.2026)
   - Kirjautuminen: sama Keskuksen tunnus. Laskuri ja Keskus ovat samassa osoitteessa (jugisoft.github.io),
     joten selaimessa Keskukseen kirjautuminen näkyy myös täällä. iPhonen kotinäytön sovelluksella on oma
     tallennustilansa: siellä kirjaudutaan sähköpostiin tulevalla koodilla.
   - Pelaajat: Keskuksen aktiiviset pelaajat joukkueittain. Samanniminen paikallinen pelaaja yhdistetään
     Keskuksen pelaajaan automaattisesti (toistot siirtyvät).
   - Toistot: Keskuksen pelaajien toistot siirtyvät tauluun reaktiot, kun verkko on käytössä. Keskus laskee
     niistä päivän mediaanin testituloksiksi (testi per ärsyke × pesä). Videot eivät koskaan lähde laitteelta.
   Käyttää pääsivun yhteisiä: DB, data, setSetting, toast, esc, typeById.
   ===================================================================== */
(function () {
  'use strict';
  const SB_URL = 'https://xytpwmzcghixulnzdakv.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dHB3bXpjZ2hpeHVsbnpkYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjMyNTgsImV4cCI6MjEwNzAzOTI1OH0.d3eiBFma8eT3nq-NhPmH2lurROo7XC0MXMkqDXVm3rs'; // julkinen anon-avain, oikeudet hoitaa RLS
  const KESKUS = 'https://jugisoft.github.io/kpl-testit/';
  const JOUKKUEJARJ = ['Miehet Superpesis', 'Vanhat'];   // muut (juniorit) näiden jälkeen
  const iosApp = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    && (matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);

  let sb = null, kayttaja = '', ajossa = false, ajastin = null, opts = {}, viesti = '', koodiEmail = '';
  const K = window.KPL = { tila: 'alku', pelaajat: [], init, synkronoi: () => synkronoi(), ryhmat, onKpl: (id) => kplIdt().has(id) };

  const kplIdt = () => new Set(K.pelaajat.map((p) => p.id));
  const avain = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

  /* ---- pääsivun tallennuksen seuranta: muutokset ja poistot käynnistävät synkronoinnin ---- */
  let omaKirjoitus = false;
  function kytke() {
    const put = DB.put.bind(DB), putMany = DB.putMany.bind(DB), del = DB.del.bind(DB);
    DB.put = (s, o) => { const r = put(s, o); if (s === 'reps' && !omaKirjoitus) ajasta(); return r; };
    DB.putMany = (s, a) => { const r = putMany(s, a); if (s === 'reps' && !omaKirjoitus) ajasta(); return r; };
    DB.del = (s, k) => {
      if (s === 'reps') { const r = data.reps.find((x) => x.id === k); if (r?.kplSynk) { setSetting('kplPoistot', [...new Set([...(data.settings.kplPoistot || []), k])]); ajasta(); } }
      return del(s, k);
    };
  }
  function ajasta(ms = 1500) { clearTimeout(ajastin); ajastin = setTimeout(synkronoi, ms); }

  /* ---- käynnistys ---- */
  async function init(o = {}) {
    opts = o; kytke();
    // Edellisellä kerralla haettu pelaajalista: valittavissa myös ilman verkkoa
    K.pelaajat = data.settings.kplPelaajat || [];
    piirra();
    window.addEventListener('online', () => yhdista());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') yhdista(); });
    await yhdista();
  }
  async function yhdista() {
    if (!navigator.onLine) { K.tila = 'offline'; piirra(); return; }
    try {
      if (!sb) {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
        sb = createClient(SB_URL, SB_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, lock: async (_n, _t, fn) => await fn() } });
        sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(yhdista, 0); });
      }
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { K.tila = 'kirjaudu'; kayttaja = ''; piirra(); return; }
      kayttaja = session.user.email || '';
      const { data: ok } = await sb.rpc('on_valmentaja');
      if (!ok) { K.tila = 'eioikeuksia'; piirra(); return; }
      await haePelaajat();
      K.tila = 'ok'; piirra();
      await synkronoi();
    } catch (e) { K.tila = 'virhe'; viesti = String(e?.message || e); piirra(); }
  }

  /* ---- pelaajat Keskuksesta ---- */
  async function haePelaajat() {
    const [{ data: pel, error }, { data: jj }] = await Promise.all([
      sb.from('pelaajat').select('id,etunimi,sukunimi,syntymavuosi,joukkue_id,aktiivinen,poistettu'),
      sb.from('joukkueet').select('id,nimi'),
    ]);
    if (error) throw error;
    const jn = Object.fromEntries((jj || []).map((j) => [j.id, j.nimi]));
    const lista = (pel || []).filter((p) => p.aktiivinen && !p.poistettu)
      .map((p) => ({ id: p.id, nimi: `${p.etunimi || ''} ${p.sukunimi || ''}`.trim(), joukkue: jn[p.joukkue_id] || 'Muut', syntymavuosi: p.syntymavuosi || null }));
    K.pelaajat = lista; setSetting('kplPelaajat', lista);
    await yhdistaPelaajat(lista);
    opts.pelaajatPaivittyi?.();
  }
  async function yhdistaPelaajat(lista) {
    const now = new Date().toISOString(), kpl = new Map(lista.map((k) => [k.id, k])), nimet = new Map(lista.map((k) => [avain(k.nimi), k]));
    const tallenna = [], poista = [], reps = [];
    for (const k of lista) {
      let p = data.players.find((x) => x.id === k.id);
      if (!p) { p = { id: k.id, nimi: k.nimi, luotu: now }; data.players.push(p); }
      if (p.nimi !== k.nimi || p.kpl?.joukkue !== k.joukkue) { p.nimi = k.nimi; p.kpl = { joukkue: k.joukkue, syntymavuosi: k.syntymavuosi }; tallenna.push(p); }
    }
    // Paikallinen samanniminen pelaaja → Keskuksen pelaaja (toistot siirretään)
    for (const p of [...data.players]) {
      if (kpl.has(p.id)) continue;
      const k = nimet.get(avain(p.nimi)); if (!k) continue;
      for (const r of data.reps.filter((x) => x.pelaajaId === p.id)) { r.pelaajaId = k.id; r.pelaaja = k.nimi; r.muokattu = now; reps.push(r); }
      for (const s of ['lastPlayer']) if (data.settings[s] === p.id) setSetting(s, k.id);
      if (data.settings.recentPlayers) setSetting('recentPlayers', [...new Set(data.settings.recentPlayers.map((x) => (x === p.id ? k.id : x)))]);
      poista.push(p.id);
    }
    // Keskuksesta poistuneet / passivoidut: pidetään listalla, mutta ei enää Keskus-pelaajana
    for (const p of data.players) if (p.kpl && !kpl.has(p.id)) { delete p.kpl; tallenna.push(p); }
    if (poista.length) data.players = data.players.filter((p) => !poista.includes(p.id));
    omaKirjoitus = true;
    try {
      if (tallenna.length) await DB.putMany('players', tallenna);
      for (const id of poista) await DB.del('players', id);
      if (reps.length) await DB.putMany('reps', reps);
    } finally { omaKirjoitus = false; }
    if (poista.length) toast(`${poista.length} pelaajaa yhdistetty Keskuksen pelaajiin`, 'ok');
  }

  /* Pelaajat ryhmittäin valintalistoihin: [[otsikko, pelaajat]] */
  function ryhmat(pelaajat) {
    const ids = kplIdt(), r = new Map();
    for (const p of pelaajat) {
      const k = ids.has(p.id) ? (K.pelaajat.find((x) => x.id === p.id)?.joukkue || 'Muut') : 'Ei Keskuksessa';
      (r.get(k) || r.set(k, []).get(k)).push(p);
    }
    const jarj = (k) => (k === 'Ei Keskuksessa' ? 99 : JOUKKUEJARJ.includes(k) ? JOUKKUEJARJ.indexOf(k) : 10);
    return [...r.entries()].sort((a, b) => jarj(a[0]) - jarj(b[0]) || a[0].localeCompare(b[0], 'fi'))
      .map(([k, ps]) => [k, ps.sort((a, b) => a.nimi.localeCompare(b.nimi, 'fi'))]);
  }

  /* ---- toistojen siirto Keskukseen ---- */
  const avainOf = (r) => r.muokattu || r.luotu || '';
  function rivi(r) {
    const n = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10);
    return {
      id: r.id, pelaaja_id: r.pelaajaId, pvm: r.pvm, arsyke_id: r.tilanneId, arsyke: typeById(r.tilanneId)?.nimi ?? r.tilanne ?? '', pesa: r.pesa || '',
      t0_ms: n(r.t0_ms), t1_ms: n(r.t1_ms), t2_ms: n(r.t2_ms), reaktio_ms: n(r.reaktioaika_ms), lahto_ms: n(r.lahtoaika_ms), tekniikka_ms: n(r.tekniikka_ms),
      fps_kuvattu: n(r.fps_kuvattu), tarkkuus_ms: n(r.tarkkuus_ms), hylatty: !!r.hylatty, kommentti: r.kommentti || null, merkitsija: r.merkitsija || null,
      harjoitus: r.harjoitus || null, video: r.video || null, laite: r.laite || 'laptop', luotu: r.luotu || null, muokattu: r.muokattu || null,
    };
  }
  async function synkronoi() {
    if (K.tila !== 'ok' || ajossa || !navigator.onLine) return;
    ajossa = true; piirra();
    try {
      const ids = kplIdt();
      // Poistetut ja Keskuksen ulkopuoliselle pelaajalle siirretyt toistot pois Keskuksesta
      const pois = [...(data.settings.kplPoistot || [])];
      const irrotetut = data.reps.filter((r) => r.kplSynk && !ids.has(r.pelaajaId));
      const poistettavat = [...new Set([...pois, ...irrotetut.map((r) => r.id)])];
      for (let i = 0; i < poistettavat.length; i += 100) {
        const { error } = await sb.from('reaktiot').delete().in('id', poistettavat.slice(i, i + 100)); if (error) throw error;
      }
      if (poistettavat.length) {
        setSetting('kplPoistot', (data.settings.kplPoistot || []).filter((x) => !pois.includes(x)));
        irrotetut.forEach((r) => delete r.kplSynk);
        omaKirjoitus = true; try { await DB.putMany('reps', irrotetut); } finally { omaKirjoitus = false; }
      }
      const odottaa = data.reps.filter((r) => ids.has(r.pelaajaId) && r.pvm && r.tilanneId && r.kplSynk !== avainOf(r));
      for (let i = 0; i < odottaa.length; i += 100) {
        const osa = odottaa.slice(i, i + 100);
        const { error } = await sb.from('reaktiot').upsert(osa.map(rivi)); if (error) throw error;
        osa.forEach((r) => { r.kplSynk = avainOf(r); });
        omaKirjoitus = true; try { await DB.putMany('reps', osa); } finally { omaKirjoitus = false; }
      }
      viesti = ''; setSetting('kplSynkattu', new Date().toISOString());
    } catch (e) { viesti = 'Siirto ei onnistunut: ' + String(e?.message || e) + ' – yritetään uudelleen.'; ajasta(60000); }
    finally { ajossa = false; piirra(); }
  }

  K._testi = { yhdistaPelaajat, rivi, aseta: (t, p) => { K.tila = t; K.pelaajat = p; piirra(); } };   // automaattitestit

  /* ---- kirjautuminen ---- */
  async function lahetaKoodi(email) {
    koodiEmail = email.trim().toLowerCase();
    const { error } = await sb.auth.signInWithOtp({ email: koodiEmail, options: { shouldCreateUser: false } });
    if (error) { toast('Koodin lähetys ei onnistunut: ' + error.message, 'err', 6000); koodiEmail = ''; } else toast('Koodi lähetetty sähköpostiin.', 'ok');
    piirra();
  }
  async function vahvistaKoodi(koodi) {
    const { error } = await sb.auth.verifyOtp({ email: koodiEmail, token: koodi.trim(), type: 'email' });
    if (error) toast('Koodi ei kelpaa: ' + error.message, 'err', 6000); else { koodiEmail = ''; await yhdista(); }
  }

  /* ---- tilaruutu ---- */
  function piirra() {
    const el = opts.mount && document.querySelector(opts.mount); if (!el) return;
    const ids = kplIdt();
    const kpl = data.reps.filter((r) => ids.has(r.pelaajaId));
    const odottaa = kpl.filter((r) => r.kplSynk !== avainOf(r)).length;
    const ulkop = data.reps.filter((r) => !ids.has(r.pelaajaId)).length;
    let h = '';
    if (K.tila === 'ok') {
      h = `<div class="kpl-rivi"><span class="kpl-piste ok"></span><b>Yhdistetty KPL Keskukseen</b><span class="kpl-pieni">${esc(kayttaja.split('@')[0])}</span></div>
        <p class="kpl-teksti">${K.pelaajat.length} pelaajaa Keskuksesta · ${ajossa ? 'siirretään…' : odottaa ? `<b>${odottaa} ${odottaa === 1 ? 'toisto odottaa' : 'toistoa odottaa'} siirtoa</b>` : (kpl.length ? `kaikki ${kpl.length} toistoa siirretty` : 'ei vielä toistoja')}</p>
        ${ulkop ? `<p class="kpl-teksti kpl-huom">${ulkop} ${ulkop === 1 ? 'toisto pelaajalla, jota' : 'toistoa pelaajilla, joita'} ei ole Keskuksessa – ${ulkop === 1 ? 'se ei näy' : 'ne eivät näy'} Keskuksen testeissä. Valitse toistolle Keskuksen pelaaja tai lisää pelaaja Keskukseen samalla nimellä.</p>` : ''}
        <p class="kpl-teksti">Tulokset: <a href="${KESKUS}#/testit/superpesis/nopeus" target="_blank" rel="noopener">Keskus → Testit → Nopeus</a></p>`;
    } else if (K.tila === 'kirjaudu') {
      h = `<div class="kpl-rivi"><span class="kpl-piste"></span><b>KPL Keskus</b></div>
        <p class="kpl-teksti">Kirjaudu Keskuksen tunnuksella, niin KPL:n pelaajat tulevat valittaviksi ja mittaukset siirtyvät Keskuksen testeihin.</p>
        ${iosApp ? (koodiEmail
          ? `<p class="kpl-teksti">Syötä sähköpostiin (${esc(koodiEmail)}) tullut koodi:</p><div class="kpl-lomake"><input id="kplKoodi" inputmode="numeric" autocomplete="one-time-code" placeholder="123456"><button id="kplVahvista" class="primary">Kirjaudu</button></div><p class="kpl-teksti"><a href="#" id="kplPeru">Vaihda sähköposti</a></p>`
          : `<div class="kpl-lomake"><input id="kplEmail" type="email" autocomplete="email" placeholder="sähköposti"><button id="kplLaheta" class="primary">Lähetä koodi</button></div>`)
          : `<a class="kpl-nappi" href="${KESKUS}#/kirjaudu">Kirjaudu Keskuksessa</a><p class="kpl-teksti kpl-pieni">Kirjautumisen jälkeen palaa tähän sovellukseen.</p>`}`;
    } else if (K.tila === 'eioikeuksia') {
      h = `<div class="kpl-rivi"><span class="kpl-piste virhe"></span><b>KPL Keskus</b></div><p class="kpl-teksti">Tunnuksella ${esc(kayttaja)} ei ole Keskuksen oikeuksia. Pyydä ylläpitäjää lisäämään sinut.</p>`;
    } else if (K.tila === 'offline') {
      h = `<div class="kpl-rivi"><span class="kpl-piste"></span><b>KPL Keskus</b><span class="kpl-pieni">ei verkkoa</span></div><p class="kpl-teksti">Mittaa normaalisti – toistot siirtyvät Keskukseen, kun verkko palaa${odottaa ? ` (${odottaa} odottaa)` : ''}.</p>`;
    } else if (K.tila === 'virhe') {
      h = `<div class="kpl-rivi"><span class="kpl-piste virhe"></span><b>KPL Keskus</b></div><p class="kpl-teksti">Yhteys ei onnistunut (${esc(viesti)}). Toistot ovat tallessa laitteella.</p>`;
    } else h = `<div class="kpl-rivi"><span class="kpl-piste"></span><b>KPL Keskus</b><span class="kpl-pieni">yhdistetään…</span></div>`;
    if (viesti && K.tila === 'ok') h += `<p class="kpl-teksti kpl-huom">${esc(viesti)}</p>`;
    el.innerHTML = h;
    el.querySelector('#kplLaheta')?.addEventListener('click', () => { const v = el.querySelector('#kplEmail').value; if (v.includes('@')) lahetaKoodi(v); });
    el.querySelector('#kplVahvista')?.addEventListener('click', () => vahvistaKoodi(el.querySelector('#kplKoodi').value));
    el.querySelector('#kplPeru')?.addEventListener('click', (e) => { e.preventDefault(); koodiEmail = ''; piirra(); });
  }
})();
