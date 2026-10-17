// Koło losujące – wspólny skrypt dla wszystkich kół.
//
// Jak koło zaczyna hamować, ustawiasz w <body data-tryb="...">:
//   zwalnia – po przesunięciu w górę koło chwilę się kręci i samo hamuje
//   stop    – koło kręci się, dotknięcie ekranu zaczyna hamowanie
//   trzymaj – koło kręci się, przytrzymanie kciuka zaczyna hamowanie
// Samo hamowanie jest zawsze takie samo: długie, koło przejeżdża 1–3 słowa za wygraną, chwilę stoi
// i cofa się do niej (czasem o jedno za daleko i jeszcze raz do przodu) – za każdym razem trochę inaczej.
//
// Każda .karta to jedno słowo na kole. Wygraną oznaczasz klasą "wygrana" – koło zawsze na niej staje,
// a potem z boku wjeżdża karta .wynik (obrazek, pełna nazwa i przycisk – wszystko w HTML).
// Losowanie zapisuje się dopiero po zatrzymaniu koła – przerwane odbędzie się od nowa.
// Żeby przetestować jeszcze raz, dopisz do adresu ?reset (albo użyj trybu testowego z tryb.js).

const PREDKOSC = 840;  // stopni na sekundę, gdy koło kręci się w kółko
const ROZPED = 1.6;    // sekundy kręcenia przed samoczynnym hamowaniem (tryb "zwalnia")
const ROZSTAW = 1.6;   // odstęp między słowami (× wysokość słowa) – im więcej, tym koło wyższe
const ROZMYCIE = 2.5;  // rozmycie słów przy pełnej prędkości (px)

const body = document.body;
const tryb = body.dataset.tryb;
const klucz = 'kolo-' + body.dataset.dzien;
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
function jedz(droga, czas, krzywa, potem) {
  const od = obrot, t0 = performance.now();
  ruch = teraz => {
    const t = Math.min(1, (teraz - t0) / 1000 / czas);
    obrot = od + droga * krzywa(t);
    if (t === 1) { ruch = null; potem(); }
  };
}

const zwalniaj = t => 1 - (1 - t) ** 4;                                // szybko → długo się wlecze → stop
const plynnie = t => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2); // łagodnie rusza i staje
const pauza = (ms, potem) => setTimeout(potem, ms);

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

// Hamowanie: przejazd 1–3 słowa za wygraną, pauza i powrót (czasem o jedno za daleko i z powrotem).
// Czas pierwszego odcinka = 4 × droga / prędkość, żeby koło nie szarpnęło przy przejściu.
function hamuj() {
  body.dataset.stan = 'hamuje';
  const za = 1 + Math.floor(Math.random() * 3);
  const zaDaleko = Math.random() < 0.4;
  const droga = drogaDoCelu(1.5 * 360) + za * krok;
  const powrot = 0.5 + 0.3 * za;
  jedz(droga, 4 * droga / PREDKOSC, zwalniaj, () => pauza(500, () =>
    zaDaleko
      ? jedz(-(za + 1) * krok, powrot + 0.3, plynnie, () => pauza(350, () => jedz(krok, 0.7, plynnie, koniec)))
      : jedz(-za * krok, powrot, plynnie, koniec)));
}

function koniec() {
  body.dataset.stan = 'koniec';
  pamiec?.setItem(klucz, 'tak');
}

// Przesunięcie palcem w górę kręci kołem, dotknięcie (stop) lub przytrzymanie (trzymaj) hamuje.
let palecY = null;
addEventListener('pointerdown', e => {
  palecY = e.clientY;
  if (body.dataset.stan === 'kreci' && tryb !== 'zwalnia' && performance.now() - start > 700) hamuj();
});
addEventListener('pointermove', e => {
  if (document.querySelector('.odliczanie:not([hidden])')) return; // koło jeszcze zablokowane
  if (body.dataset.stan === 'czeka' && palecY !== null && palecY - e.clientY > 40) zakrec();
});
addEventListener('pointerup', () => (palecY = null));
addEventListener('pointercancel', () => (palecY = null));
addEventListener('resize', zmierz);

// Losowanie już było – od razu pokaż wynik.
if (pamiec?.getItem(klucz)) {
  obrot = cel;
  body.dataset.stan = 'koniec';
}
zmierz();
klatka();
