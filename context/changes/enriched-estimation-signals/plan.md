# Enriched Estimation Signals Implementation Plan

## Overview

Rozszerzamy flow estymacji o realne wejścia sygnałów zewnętrznych i ich widoczność w wyniku: użytkownik podaje ITRA w profilu oraz datetime startu biegu przy uploadzie trasy, a wynik pokazuje średnie tempo i kontekst użytych sygnałów. Pogoda pozostaje sygnałem opcjonalnym: brak danych pogodowych nie blokuje estymacji.

## Current State Analysis

Kontrakty F-01 są już wdrożone po stronie domeny estymacji, ale wejścia użytkownika i prezentacja enrichment nie są jeszcze podłączone. Profil ma dziś tylko `experienceLevel/weightKg/weeklyDistanceKm`, upload GPX nie przyjmuje czasu biegu, a karta wyniku i historia nie pokazują średniego tempa ani statusów sygnałów.

## Desired End State

Po zakończeniu planu użytkownik może:
1. zapisać opcjonalny indeks ITRA w profilu,
2. podać datetime planowanego startu biegu przy uploadzie trasy,
3. otrzymać estymację wzbogaconą o ITRA i pogodę (z neutralnym fallbackiem i warningiem przy braku pogody),
4. zobaczyć średnie tempo i kontekst sygnałów w latest wyniku oraz w historii.

Dodatkowo deduplikacja historii rozróżnia scenariusze różniące się czasem biegu, a migracja czyści historyczne rekordy zgodnie z przyjętą polityką resetu.

### Key Discoveries:

- Profil i API profilu nie mają pola ITRA, ani mapowania do tabeli `profiles` (`src/components/profile/ProfileForm.tsx`, `src/pages/api/profile.ts`, `src/lib/profile/service.ts`).
- Upload przyjmuje tylko `gpxFile`; brak wejścia datetime i brak ścieżki przekazania go do orchestration (`src/components/routes/RouteUploadForm.tsx`, `src/pages/api/routes/upload.ts`).
- Silnik estymacji już obsługuje bounded global multiplier i neutral weather fallback (`src/lib/estimation/engine.ts`, `src/lib/estimation/orchestration.ts`).
- Historia jest deduplikowana po `(user_id, route_hash, profile_signature)`, więc bez rozszerzenia signature nie odróżni dwóch startów czasowych tej samej trasy (`src/lib/estimation/service.ts`, `src/lib/estimation/history-signature.ts`, `supabase/migrations/20260913224500_create_route_estimation_history.sql`).

## What We're NOT Doing

- Nie implementujemy pełnej semantyki continuity/recompute historii z S-06 poza zakresem potrzebnym do S-05.
- Nie wprowadzamy nowych providerów poza Open-Meteo.
- Nie wdrażamy zaawansowanej analityki pogodowej (np. wielopunktowe prognozy po segmentach trasy).
- Nie utrzymujemy kompatybilności starych wpisów historii — zgodnie z decyzją zakresu wykonujemy reset historii.

## Implementation Approach

Podejście jest kontraktowe i inkrementalne: najpierw rozszerzamy model danych (profil + planned run datetime + signature), następnie łączymy wejścia z flow recompute i fallbackami, a na końcu domykamy prezentację danych oraz testy. Zachowujemy istniejące wzorce: walidacja po stronie formularza i API, neutralne degradowanie sygnałów opcjonalnych oraz persystencja przez istniejący RPC bundle.

## Critical Implementation Details

### Timing & lifecycle

`planned_run_at` musi być traktowane jako wejście użytkownika dla konkretnego uruchomienia estymacji i przekładane na jednoznaczny ISO timestamp, aby weather lookup i deduplikacja historii były deterministyczne.

### State sequencing

Reset historii musi wykonać się w migracji przed nowymi zapisami opartymi o rozszerzony signature, aby uniknąć mieszania rekordów o różnych regułach dedupe.

## Phase 1: Data Contract and Persistence Baseline

### Overview

Rozszerzamy kontrakty danych i warstwę persystencji o ITRA oraz planned run datetime, wraz z aktualizacją deduplikacji historii.

### Changes Required:

#### 1. Profile schema and service contract extension

**File**: `supabase/migrations/<new>_add_itra_to_profiles.sql`, `src/lib/profile/service.ts`, `src/pages/api/profile.ts`

**Intent**: Dodać opcjonalne pole ITRA do profilu i przeprowadzić je przez API + service mapping.

**Contract**: `profiles` dostaje nullable kolumnę ITRA (liczba całkowita), a `ProfileDraftInput`/`SportProfile` oraz parser form-data obsługują pole `itraIndex` z walidacją zakresu domenowego.

#### 2. Route snapshot planned-run datetime contract

**File**: `supabase/migrations/<new>_add_planned_run_at_to_route_snapshots.sql`, `src/lib/route/types.ts`, `src/lib/route/service.ts`

**Intent**: Ustanowić canonical miejsce przechowywania czasu biegu podawanego przez użytkownika.

**Contract**: `route_snapshots` dostaje nullable `planned_run_at timestamptz`; kontrakty `RouteSnapshotInput/RouteSnapshot` i mapowania row<->domain przenoszą to pole.

#### 3. Estimation signature and persistence alignment

**File**: `src/lib/estimation/history-signature.ts`, `src/lib/estimation/types.ts`, `src/lib/estimation/service.ts`, `supabase/migrations/<new>_persist_bundle_accepts_planned_run_at.sql`

**Intent**: Rozszerzyć identity historii tak, by różne czasy startu tej samej trasy/profilu nie nadpisywały się.

**Contract**: Profile/estimation signature używa `planned_run_at` jako elementu różnicującego; kontrakty input snapshot i RPC payload przenoszą planned run datetime bez zmiany zasad atomowego zapisu latest/history.

#### 4. History reset migration

**File**: `supabase/migrations/<new>_reset_estimation_history_for_s05.sql`

**Intent**: Wykonać zaakceptowaną decyzję o resecie historii przed uruchomieniem nowego modelu.

**Contract**: Migracja usuwa rekordy z `route_estimation_history` i `saved_route_history` w sposób jawny i odtwarzalny; `route_estimations` (latest) pozostaje zachowane.

### Success Criteria:

#### Automated Verification:

- Migracje SQL dla ITRA/planned_run_at/reset historii aplikują się bez błędów: `npx supabase migration up`
- Build przechodzi po rozszerzeniu typów i kontraktów: `npm run build`
- Lint przechodzi dla zmian schema/service: `npm run lint`
- Kontrakty historii i dedupe przechodzą po zmianie signature: `node --test tests/estimation-history-contracts.test.js`

#### Manual Verification:

- W bazie istnieją nowe kolumny (`profiles.itra_index`, `route_snapshots.planned_run_at`) i są nullable.
- Po migracji historia estymacji i zapisana historia tras są puste, a latest estimation pozostaje dostępne.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Input Capture and Recompute Enrichment

### Overview

Podłączamy nowe pola wejściowe użytkownika do flow recompute i weather resolution, zachowując neutralny fallback i warningi.

### Changes Required:

#### 1. Profile form and API for ITRA input

**File**: `src/components/profile/ProfileForm.tsx`, `src/pages/profile.astro`, `src/pages/api/profile.ts`

**Intent**: Umożliwić edycję ITRA w profilu z walidacją po stronie UI i API.

**Contract**: Formularz wysyła `itraIndex`; dla statusu complete API odrzuca wartości spoza ustalonego zakresu, dla draft dopuszcza brak wartości.

#### 2. Upload form and API for planned run datetime

**File**: `src/components/routes/RouteUploadForm.tsx`, `src/pages/api/routes/upload.ts`

**Intent**: Dodać wejście datetime startu biegu do upload flow.

**Contract**: Formularz wysyła `plannedRunAt`; API parsuje lokalny datetime do ISO UTC i przekazuje do zapisu snapshotu oraz do recompute contextu.

#### 3. External signal resolver wiring with optional weather

**File**: `src/lib/estimation/orchestration.ts`, `src/lib/estimation/types.ts`

**Intent**: Użyć realnego ITRA/planned run datetime w resolve sygnałów zamiast wyłącznie neutralnych placeholderów.

**Contract**: Brak ITRA lub brak planned run datetime pozostaje nieblokujący (neutralne mnożniki); niedostępność providera pogody zwraca warning i neutralny weather multiplier.

#### 4. Weather provider adapter integration

**File**: `src/lib/estimation/weather-provider.ts` (new), `src/lib/config-status.ts`, `astro.config.mjs` (only if additional env is required)

**Intent**: Ustandaryzować pobranie pogody dla datetime i lokalizacji trasy.

**Contract**: Adapter zwraca kontrakt weather resolution (`available | provider_error | not_applicable`) z `asOf`, `meanTemperatureC`, `globalTimeMultiplier`; timeout/błędy mapują się do `provider_error`.

### Success Criteria:

#### Automated Verification:

- Build przechodzi dla flow profile/upload/recompute po dodaniu nowych pól: `npm run build`
- Lint przechodzi dla formularzy i API: `npm run lint`
- Testy warning-flow pozostają zielone po rozszerzeniu ścieżek: `node --test tests/api-recompute-feedback.test.js`
- Testy silnika przechodzą dla ITRA/weather z nowym input wiring: `node --test tests/estimation-engine.test.js`

#### Manual Verification:

- Użytkownik może zapisać profil z ITRA i bez ITRA (draft/complete zgodnie z walidacją).
- Użytkownik może podać datetime startu biegu przy uploadzie i otrzymuje estymację.
- Przy braku danych z Open-Meteo estymacja nadal jest zwracana, a dashboard pokazuje warning.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Result Presentation and Regression Net

### Overview

Eksponujemy enrichment w latest + historii i domykamy stabilność przez testy kontraktowe oraz widokowe.

### Changes Required:

#### 1. Latest estimation card with pace and signal context

**File**: `src/components/routes/RouteEstimationCard.tsx`, `src/lib/estimation/engine.ts`

**Intent**: Pokazać przewidywane średnie tempo i podstawowy kontekst sygnałów użytych do wyliczenia.

**Contract**: `derivedMetrics` zawiera `averagePaceMinPerKm` oraz dane sygnałów potrzebne do renderu; karta latest renderuje je z fallbackiem `n/a`.

#### 2. Saved history view enrichment

**File**: `src/lib/estimation/history-view.ts`, `src/components/routes/SavedEstimationHistory.astro`, `src/pages/dashboard.astro`

**Intent**: Umożliwić użytkownikowi porównywanie wzbogaconych wyników w historii.

**Contract**: Elementy historii mapują i renderują co najmniej: średnie tempo i statusy sygnałów, bez łamania istniejącego warning precedence.

#### 3. Regression tests for enriched signals flow

**File**: `tests/estimation-engine.test.js`, `tests/estimation-history-contracts.test.js`, `tests/api-recompute-feedback.test.js`, `tests/dashboard-history-view.test.js`

**Intent**: Zabezpieczyć zachowanie końcowe dla nowego kontraktu wejść i renderingu.

**Contract**: Testy obejmują walidację ITRA, datetime wpływający na dedupe, neutralny weather fallback z warningiem oraz render enrichment dla latest/history.

### Success Criteria:

#### Automated Verification:

- Karta latest i historia przechodzą testy widokowe oraz mapowanie danych: `node --test tests/dashboard-history-view.test.js`
- Kontrakty historii i RPC payload przechodzą po zmianach enrichment: `node --test tests/estimation-history-contracts.test.js`
- Silnik estymacji przechodzi testy dla nowych metryk i fallbacków: `node --test tests/estimation-engine.test.js`
- Build + lint przechodzą dla całego zakresu: `npm run build && npm run lint`

#### Manual Verification:

- Dashboard latest pokazuje estimated time, average pace i kontekst sygnałów zgodny z wykonanym wyliczeniem.
- Historia pokazuje wzbogacone rekordy po nowych estymacjach.
- UX komunikatów ostrzegawczych jest spójny między upload i profile flow.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

## Testing Strategy

### Unit Tests:

- Walidacja ITRA (zakres, wartości puste, niepoprawne typy).
- Normalizacja datetime wejściowego do ISO UTC.
- Wyliczenie `averagePaceMinPerKm` i neutralne fallbacki sygnałów.

### Integration Tests:

- Flow: profile save z ITRA -> upload z datetime -> recompute -> persist latest/history.
- Flow: weather provider error -> success z warningiem i neutralnym weather multiplier.
- Flow: dwa wyliczenia tej samej trasy/profilu z różnym datetime tworzą odrębne wpisy historii.

### Manual Testing Steps:

1. Uzupełnij profil z ITRA, prześlij GPX z datetime startu i sprawdź enriched latest wynik.
2. Powtórz estymację dla tej samej trasy z innym datetime i potwierdź osobny wpis historii.
3. Zasymuluj brak danych pogodowych i potwierdź neutralny fallback + warning na dashboardzie.

## Performance Considerations

Wywołanie pogodowe musi mieć krótki timeout i nie może wydłużać ścieżki upload/recompute ponad akceptowalny UX; przy timeoutach i błędach providerowych flow ma degradować się do neutralnego weather multiplier bez retry-loopów w request lifecycle.

## Migration Notes

- W tej zmianie celowo wykonywany jest reset `route_estimation_history` i `saved_route_history`.
- Migracje dodające nowe kolumny powinny być additive (`nullable`) dla kompatybilności odczytu latest snapshotów.
- Kolejność: dodać kolumny i kontrakty -> wykonać reset historii -> wdrożyć nowy write path.

## References

- Roadmap item: `context/foundation/roadmap.md` (S-05, Change ID: `enriched-estimation-signals`)
- Existing profile flow: `src/pages/api/profile.ts`
- Existing upload flow: `src/pages/api/routes/upload.ts`
- Estimation contracts and engine: `src/lib/estimation/types.ts`, `src/lib/estimation/engine.ts`
- History dedupe and persistence: `src/lib/estimation/history-signature.ts`, `src/lib/estimation/service.ts`
- Progress contract: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data Contract and Persistence Baseline

#### Automated

- [x] 1.1 Migracje SQL dla ITRA/planned_run_at/reset historii aplikują się bez błędów — ceaa2a4
- [x] 1.2 Build przechodzi po rozszerzeniu typów i kontraktów — ceaa2a4
- [x] 1.3 Lint przechodzi dla zmian schema/service — ceaa2a4
- [x] 1.4 Kontrakty historii i dedupe przechodzą po zmianie signature — ceaa2a4

#### Manual

- [x] 1.5 Nowe kolumny są dostępne i nullable w docelowych tabelach — ceaa2a4
- [x] 1.6 Historia estymacji i zapisanych tras jest pusta po migracji, latest estimation pozostaje — ceaa2a4

### Phase 2: Input Capture and Recompute Enrichment

#### Automated

- [x] 2.1 Build przechodzi dla flow profile/upload/recompute po dodaniu nowych pól
- [x] 2.2 Lint przechodzi dla formularzy i API
- [x] 2.3 Testy warning-flow pozostają zielone po rozszerzeniu ścieżek
- [x] 2.4 Testy silnika przechodzą dla ITRA/weather z nowym input wiring

#### Manual

- [x] 2.5 Profil obsługuje zapis z ITRA i bez ITRA zgodnie z regułami draft/complete
- [x] 2.6 Upload z datetime startu biegu wyzwala poprawną estymację
- [x] 2.7 Brak danych pogodowych nie blokuje estymacji i pokazuje warning

### Phase 3: Result Presentation and Regression Net

#### Automated

- [ ] 3.1 Testy widoku historii przechodzą po rozszerzeniu mapped fields
- [ ] 3.2 Kontrakty historii i RPC payload przechodzą po zmianach enrichment
- [ ] 3.3 Testy silnika przechodzą dla average pace i fallbacków
- [ ] 3.4 Build i lint przechodzą dla całego zakresu

#### Manual

- [ ] 3.5 Latest wynik pokazuje time + average pace + kontekst sygnałów
- [ ] 3.6 Historia pokazuje wzbogacone rekordy po nowych estymacjach
- [ ] 3.7 Komunikaty ostrzegawcze są spójne między upload i profile flow
