// Tryb testowy WYŁĄCZONY (18.10): linki z ?test działają teraz dokładnie jak produkcja
// (blokady czasowe, zapamiętane losowania, zamówienia do prawdziwej skrzynki) – na wypadek,
// gdyby Paulina dostała link testowy. Zapamiętaną wcześniej flagę testu kasujemy.
// Żeby znowu włączyć testy, przywróć poprzednią wersję tego pliku z historii gita.

const TEST = false;
try { localStorage.removeItem('test'); } catch (e) {}
