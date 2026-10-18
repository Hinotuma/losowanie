// Koło losujące – wspólny skrypt dla wszystkich kół.
//
// Jak koło zaczyna hamować, ustawiasz w <body data-tryb="...">:
//   zwalnia – po przesunięciu w górę koło chwilę się kręci i samo hamuje
//   stop    – koło kręci się, dotknięcie ekranu zaczyna hamowanie
//   trzymaj – koło kręci się, przytrzymanie kciuka zaczyna hamowanie
// Samo hamowanie jest zawsze takie samo: długie, koło przejeżdża 1–3 słowa za wygraną i wraca do niej
// jak na sprężynie – lekko ją mija, odbija się coraz słabiej i staje. Za każdym razem trochę inaczej.
//
// Każda .karta to jedno słowo na kole. Wygraną oznaczasz klasą "wygrana" – koło zawsze na niej staje,
// a potem z boku wjeżdża karta .wynik (obrazek, pełna nazwa i przycisk – wszystko w HTML).
// Losowanie zapisuje się dopiero po zatrzymaniu koła – przerwane odbędzie się od nowa.
// Żeby przetestować jeszcze raz, dopisz do adresu ?reset (albo użyj trybu testowego z tryb.js).

const PREDKOSC = 840;  // stopni na sekundę, gdy koło kręci się w kółko
const ROZPED = 1.6;    // sekundy kręcenia przed samoczynnym hamowaniem (tryb "zwalnia")
const ROZSTAW = 1.6;   // odstęp między słowami (× wysokość słowa) – im więcej, tym koło wyższe
const ROZMYCIE = 2.5;  // rozmycie słów przy pełnej prędkości (px)
const UCIECIE = 0.8;   // przy 80% hamowania koło przechodzi w sprężynę, zanim prawie stanie (bez martwej pauzy)

const body = document.body;
const tryb = body.dataset.tryb;
const klucz = 'kolo-v2-' + body.dataset.dzien; // v2: wcześniejsze losowania (np. testowe) już się nie liczą
const scena = document.querySelector('.scena');
const karty = [...document.querySelectorAll('.karta')];
const krok = 360 / karty.length;
const cel = -karty.findIndex(k => k.classList.contains('wygrana')) * krok; // obrót, przy którym wygrana stoi na wprost

let promien;      // promień koła w px, liczony z wysokości słowa
let obrot = 0;    // aktualny obrót koła w stopniach
let ruch = null;  // co koło robi w danej klatce
let start = 0;    // kiedy koło ruszyło

// Pamięć przeglądarki. Gdy jest zablokowana, losowanie po prostu nie zostanie zapamiętane.
// W trybie testowym (tryb.js) też nic nie zapamiętujemy, żeby można było kręcić w kółko.
let pamiec = null;
if (!TEST) try { pamiec = localStorage; } catch (e) {}

if (location.search.includes('reset')) pamiec?.removeItem(klucz);

function zmierz() {
  promien = karty[0].offsetHeight * ROZSTAW / Math.sin(Math.PI / karty.length);
}

// Rozstawia słowa na kole. Kąt 0 = na wprost. Koło jest „spłaszczone” (kąt / 2),
// więc widać 7 słów naraz, a jedno z tyłu znika i przeskakuje z góry na dół.
function rysuj() {
  karty.forEach((karta, i) => {
    const kat = ((i * krok + obrot) % 360 + 540) % 360 - 180;
    karta.style.transform = `translateZ(${-promien}px) rotateX(${kat / 2}deg) translateZ(${promien}px)`;
    karta.style.opacity = Math.min(1, (180 - Math.abs(kat)) / 90);
    karta.style.zIndex = 180 - Math.round(Math.abs(kat));
    karta.classList.toggle('na-wprost', Math.abs(kat) < krok / 2);
  });
}

let poprzednia = performance.now();
function klatka() {
  const teraz = performance.now();
  const dt = (teraz - poprzednia) / 1000;
  const przed = obrot;
  if (ruch) ruch(teraz, dt);
  poprzednia = teraz;
  // Lekkie rozmycie rośnie z prędkością koła
  const predkosc = dt > 0 ? Math.abs(obrot - przed) / dt : 0;
  scena.style.filter = predkosc > 60 ? `blur(${Math.min(ROZMYCIE, predkosc / PREDKOSC * ROZMYCIE).toFixed(1)}px)` : '';
  rysuj();
  requestAnimationFrame(klatka);
}

// Ile stopni do przodu, żeby wygrana stanęła na wprost (co najmniej `min`).
function drogaDoCelu(min) {
  let droga = ((cel - obrot) % 360 + 360) % 360;
  while (droga < min) droga += 360;
  return droga;
}

// Płynny przejazd o `droga` stopni w `czas` sekund, a potem `potem()`.
// `koniecT` < 1 kończy przejazd wcześniej (na tej części czasu).
function jedz(droga, czas, krzywa, potem, koniecT = 1) {
  const od = obrot, t0 = performance.now();
  ruch = teraz => {
    const t = Math.min(koniecT, (teraz - t0) / 1000 / czas);
    obrot = od + droga * krzywa(t);
    if (t === koniecT) { ruch = null; potem(); }
  };
}

const zwalniaj = t => 1 - (1 - t) ** 4; // szybko → długo się wlecze → stop

// Powrót jak na sprężynie: koło startuje z `wychylenie` stopni za wygraną (z zerową prędkością),
// mija ją, odbija się coraz słabiej i staje. tlumienie 0–1 (mniej = więcej odbić), okres w sekundach.
function sprezyna(wychylenie, tlumienie, okres, potem) {
  const wygrana = obrot - wychylenie;
  const w = 2 * Math.PI / okres, wd = w * Math.sqrt(1 - tlumienie ** 2), t0 = performance.now();
  let gotowe = false;
  ruch = teraz => {
    const t = (teraz - t0) / 1000;
    const obwiednia = wychylenie * Math.exp(-tlumienie * w * t);
    obrot = wygrana + obwiednia * (Math.cos(wd * t) + (tlumienie * w / wd) * Math.sin(wd * t));
    if (!gotowe && obwiednia < 3) { gotowe = true; potem(); }   // wynik już może wjeżdżać
    if (obwiednia < 0.2) { obrot = wygrana; ruch = null; }       // resztka drgań niewidoczna
  };
}

function zakrec() {
  start = performance.now();
  body.dataset.stan = 'kreci';
  ruch = (teraz, dt) => {
    obrot += PREDKOSC * dt;
    if (tryb === 'zwalnia' && teraz - start > ROZPED * 1000) hamuj();
    // trzymaj: kciuk, który został na ekranie po przesunięciu, też hamuje
    if (tryb === 'trzymaj' && palecY !== null && teraz - start > 700) hamuj();
  };
}

// Hamowanie: przejazd 1–3 słowa za wygraną, a potem sprężysty powrót do niej.
// Czas pierwszego odcinka = 4 × droga / prędkość, żeby koło nie szarpnęło przy przejściu.
function hamuj() {
  body.dataset.stan = 'hamuje';
  const za = (1 + Math.random() * 2) * krok;
  const droga = drogaDoCelu(360) + za;
  const niedojechane = droga * (1 - zwalniaj(UCIECIE)); // ostatnie ~1,5° hamowania, których już nie jedziemy
  jedz(droga, 4 * droga / PREDKOSC, zwalniaj, () =>
    sprezyna(za - niedojechane, 0.3 + Math.random() * 0.15, 1.1 + Math.random() * 0.4, koniec), UCIECIE);
}

function koniec() {
  body.dataset.stan = 'koniec';
  pamiec?.setItem(klucz, 'tak');
}

// Przesunięcie palcem w górę kręci kołem, dotknięcie (stop) lub przytrzymanie (trzymaj) hamuje.
let palecY = null;
addEventListener('pointerdown', e => {
  palecY = e.clientY;
  if (body.dataset.stan === 'kreci' && tryb !== 'zwalnia' && performance.now() - start > 700) {
    obrot += PREDKOSC * (performance.now() - poprzednia) / 1000; // dojedź do chwili dotknięcia – bez szarpnięcia
    hamuj();
  }
});
addEventListener('pointermove', e => {
  if (document.querySelector('.odliczanie:not([hidden])')) return; // koło jeszcze zablokowane
  if (body.dataset.stan === 'czeka' && palecY !== null && palecY - e.clientY > 40) zakrec();
});
addEventListener('pointerup', () => (palecY = null));
addEventListener('pointercancel', () => (palecY = null));
addEventListener('resize', zmierz);

// Losowanie już było (zapamiętane albo oznaczone w HTML przez data-wylosowane) – od razu pokaż wynik.
if (body.hasAttribute('data-wylosowane') || pamiec?.getItem(klucz)) {
  obrot = cel;
  body.dataset.stan = 'koniec';
}
zmierz();
klatka();
