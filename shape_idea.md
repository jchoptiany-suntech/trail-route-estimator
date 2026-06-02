## Aplikacja do estymacji czasu przechodzenia lub przebiegania tras górskich na podstawie GPX

### Główny problem

Osoby planujące wędrówki górskie lub biegi trailowe często mają problem z realną oceną trudności trasy i czasu potrzebnego na jej ukończenie.

Na pierwszy rzut oka wiele tras wygląda podobnie - podobny dystans, podobna długość pętli czy zbliżony czas sugerowany przez mapy. W praktyce jednak różnice w przewyższeniach, nachyleniu, profilu terenu czy doświadczeniu użytkownika sprawiają, że ta sama trasa może być przyjemnym treningiem dla jednej osoby,
a dla innej zbyt wymagającym lub wręcz niebezpiecznym wyzwaniem.

Podczas planowania aktywności użytkownicy często muszą samodzielnie interpretować dystans, sumę podejść, profil wysokościowy, rodzaj aktywności, własną kondycję i doświadczenie.

Wymaga to doświadczenia, którego początkującym lub średniozaawansowanym użytkownikom często brakuje.

Obecne aplikacje najczęściej prezentują jedynie surowe dane lub bardzo ogólne estymacje czasu, które nie uwzględniają indywidualnych możliwości użytkownika. Użytkownik nadal sam musi odpowiedzieć sobie na pytania:

„Czy dam radę zrobić tę trasę?”
„Ile realnie zajmie mi przejście lub przebiegnięcie?”
„Czy przewyższenia nie są zbyt duże jak na mój poziom?”
„Czy powinienem traktować tę trasę jako lekki trening czy duże obciążenie?”

Problem staje się szczególnie widoczny w górach, gdzie błędna ocena czasu i trudności może prowadzić do przemęczenia, złego planowania dnia, problemów z powrotem przed zmrokiem, niewystarczającej ilości jedzenia lub wody, przeciążenia organizmu.

### Najmniejszy zestaw funkcjonalności (MVP)

- rejestracja i logowanie użytkownika,
- możliwość zapisania podstawowego profilu sportowego użytkownika.
- upload pliku GPX,
- zapis trasy w systemie,
- podgląd zapisanych tras,
- analiza trasy na podstawie dystansu, sumy podejść, sumy zejść, profilu wysokościowego, średniego nachylenia.
- estymacja czasu
- wizualizacja trasy (mapa)

### Co NIE wchodzi w zakres MVP
- integracje z zewnętrznymi platformami (np. Strava, Garmin),
- zaawansowane funkcje społecznościowe,
- analiza tętna lub innych parametrów użytkownika w czasie rzeczywistym,
- aplikacja mobilna (na początek tylko web)
- plany treningowe

### Kryteria sukcesu
- 80% estymacji czasu mieści się w granicy ±20% rzeczywistego czasu przejścia
- 70% wygenerowanych estymacji czasu zostaje zapisanych w profilu użytkownika