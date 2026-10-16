// Koło losujące – wspólny skrypt dla wszystkich trzech dni.
//
// Tryb końcówki ustawiasz w <body data-tryb="...">:
//   zwalnia – po przesunięciu w górę koło samo zwalnia aż do zatrzymania (dzień 1)
//   stop    – koło kręci się, dotknięcie ekranu je zatrzymuje (dzień 2)
//   trzymaj – koło kręci się, przytrzymanie kciuka hamuje; koło przejeżdża
//             za wygraną kartę i cofa się do niej (dzień 3)
//
// Wygraną kartę oznaczasz klasą "wygrana". Koło zawsze na niej staje.
// Losowanie zapisuje się dopiero po zatrzymaniu koła – przerwane odbędzie się od nowa.
// Żeby przetestować jeszcze raz, dopisz do adresu ?reset

const PREDKOSC = 540;      // stopni na sekundę, gdy koło kręci się w kółko (stop, trzymaj)
const CZAS_ZWALNIANIA = 6; // sekundy hamowania w trybie "zwalnia"
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
let pamiec = null;
try { pamiec = localStorage; } catch (e) {}

if (location.search.includes('reset')) pamiec?.removeItem(klucz);

function zmierz() {
  promien = karty[0].offsetHeight * 0.6 / Math.tan(Math.PI / karty.length);
}

// Rozstawia karty na obwodzie koła. Kąt 0 = karta na wprost.
function rysuj() {
  karty.forEach((karta, i) => {
    const kat = ((i * krok + obrot) % 360 + 540) % 360 - 180;
    karta.style.transform = `translateZ(${-promien}px) rotateX(${kat}deg) translateZ(${promien}px)`;
    karta.style.opacity = Math.max(0, Math.cos(kat * Math.PI / 180));
    karta.style.zIndex = 180 - Math.round(Math.abs(kat));
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
    jedz(drogaDoCelu(3 * 360), CZAS_ZWALNIANIA, zwalniaj, koniec);
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
