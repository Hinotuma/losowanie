// Koło losujące – wspólny skrypt dla wszystkich trzech dni.
//
// Tryb końcówki ustawiasz w <body data-tryb="...">:
//   zwalnia – po przesunięciu w górę koło samo zwalnia aż do zatrzymania (dzień 1)
//   stop    – koło kręci się, dotknięcie ekranu je zatrzymuje (dzień 2)
//   trzymaj – koło kręci się, przytrzymanie kciuka hamuje; koło przejeżdża
//             za wygraną kartę i cofa się do niej (dzień 3)
//
// Każda .karta to jedno słowo na kole. Wygraną oznaczasz klasą "wygrana" – koło zawsze na niej staje,
// a potem z boku wjeżdża karta .wynik (obrazek, pełna nazwa i przycisk – wszystko w HTML).
// Losowanie zapisuje się dopiero po zatrzymaniu koła – przerwane odbędzie się od nowa.
// Żeby przetestować jeszcze raz, dopisz do adresu ?reset

const PREDKOSC = 840;      // stopni na sekundę, gdy koło kręci się w kółko (stop, trzymaj)
const CZAS_ZWALNIANIA = 5; // sekundy hamowania w trybie "zwalnia"
const PRZEJAZD = 0.6;      // o jaką część karty koło przejedzie za wygraną (trzymaj)

const body = document.body;
const tryb = body.dataset.tryb;
const klucz = 'kolo-' + body.dataset.dzien;
const karty = [...document.querySelectorAll('.karta')];
const krok = 360 / karty.length;
const cel = -karty.findIndex(k => k.classList.contains('wygrana')) * krok; // obrót, przy którym wygrana stoi na wprost

let promien;      // promień koła w px, liczony z wysokości karty
let obrot = 0;    // aktualny obrót koła w stopniach
let ruch = null;  // co koło robi w danej klatce
let start = 0;    // kiedy koło ruszyło

// Pamięć przeglądarki. Gdy jest zablokowana, losowanie po prostu nie zostanie zapamiętane.
// W trybie testowym (tryb.js) też nic nie zapamiętujemy, żeby można było kręcić w kółko.
let pamiec = null;
if (!TEST) try { pamiec = localStorage; } catch (e) {}

if (location.search.includes('reset')) pamiec?.removeItem(klucz);

// Promień tak dobrany, żeby sąsiednie słowa na wprost miały odstęp jednej wysokości karty.
function zmierz() {
  promien = karty[0].offsetHeight / Math.sin(Math.PI / karty.length);
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
  if (ruch) ruch(teraz, (teraz - poprzednia) / 1000);
  poprzednia = teraz;
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

const zwalniaj = t => 1 - (1 - t) ** 3;                                // szybko → stop
const plynnie = t => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2); // łagodnie rusza i staje

function zakrec() {
  start = performance.now();
  if (tryb === 'zwalnia') {
    body.dataset.stan = 'hamuje';
    jedz(drogaDoCelu(4 * 360), CZAS_ZWALNIANIA, zwalniaj, koniec);
  } else {
    body.dataset.stan = 'kreci';
    ruch = (teraz, dt) => {
      obrot += PREDKOSC * dt;
      // trzymaj: kciuk, który został na ekranie po przesunięciu, też hamuje
      if (tryb === 'trzymaj' && palecY !== null && teraz - start > 700) hamuj();
    };
  }
}

// Czas hamowania = 3 × droga / prędkość, żeby koło nie szarpnęło przy przejściu.
function hamuj() {
  body.dataset.stan = 'hamuje';
  if (tryb === 'stop') {
    const droga = drogaDoCelu(krok / 2);
    jedz(droga, 3 * droga / PREDKOSC, zwalniaj, koniec);
  } else {
    const zaCel = PRZEJAZD * krok;
    const droga = drogaDoCelu(1.5 * 360) + zaCel;
    jedz(droga, 3 * droga / PREDKOSC, zwalniaj, () =>
      setTimeout(() => jedz(-zaCel, 1, plynnie, koniec), 400));
  }
}

function koniec() {
  body.dataset.stan = 'koniec';
  pamiec?.setItem(klucz, 'tak');
}

// Przesunięcie palcem w górę kręci kołem, dotknięcie w trakcie kręcenia hamuje.
let palecY = null;
addEventListener('pointerdown', e => {
  palecY = e.clientY;
  if (body.dataset.stan === 'kreci' && performance.now() - start > 700) hamuj();
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
