// Tryb testowy – tylko na Twoim telefonie. Włączasz go, otwierając dowolną stronę z ?test,
// wyłączasz przez ?test=0. Zapamiętuje się w tej przeglądarce, a telefon Pauliny nigdy go nie dostanie.
// W teście: losowanie się nie zapisuje (można kręcić w kółko), wszystkie sekcje z godzinami są widoczne,
// a zamówienia idą do osobnej, testowej skrzynki.

let TEST = false;
try {
  const test = new URLSearchParams(location.search).get('test');
  if (test === '0') localStorage.removeItem('test');
  else if (test !== null) localStorage.setItem('test', 'tak');
  TEST = localStorage.getItem('test') === 'tak';
} catch (e) {}
if (TEST) document.documentElement.classList.add('test');
