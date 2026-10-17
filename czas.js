// Pokazywanie rzeczy o określonej godzinie (według zegara w telefonie).
//
//   data-od="2026-10-18T09:00+02:00"  – element widać dopiero od tej chwili
//   data-do="2026-10-18T09:00+02:00"  – element widać tylko do tej chwili
//   <span data-licznik></span>        – odlicza gg:mm:ss do data-do swojej sekcji
//
// Test innej godziny: dopisz do adresu np. ?teraz=2026-10-18T08:59:50
// W trybie testowym (tryb.js) bez ?teraz widać wszystkie sekcje naraz – poza zasłoną odliczania przed kołem.

const udawanyCzas = new URLSearchParams(location.search).get('teraz');
const przesuniecie = udawanyCzas ? new Date(udawanyCzas) - Date.now() : 0;
const wszystko = TEST && !udawanyCzas;

function odswiezCzas() {
  const teraz = Date.now() + przesuniecie;
  document.querySelectorAll('[data-od], [data-do]').forEach(el => {
    el.hidden = wszystko
      ? el.classList.contains('odliczanie')
      : teraz < new Date(el.dataset.od || 0) || teraz >= new Date(el.dataset.do || 8.64e15);
  });
  document.querySelectorAll('[data-licznik]').forEach(el => {
    const s = Math.max(0, Math.floor((new Date(el.closest('[data-do]').dataset.do) - teraz) / 1000));
    el.textContent = [s / 3600, (s / 60) % 60, s % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':');
  });
}

odswiezCzas();
setInterval(odswiezCzas, 1000);
