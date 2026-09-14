# External Signal Contracts Implementation Plan

## Overview

Wprowadzamy fundament F-01 dla sygnałów zewnętrznych (Open-Meteo + ITRA), tak aby estymacja działała deterministycznie i bezpiecznie także przy brakach danych zewnętrznych. Zakres obejmuje kontrakty danych, fallback policy, bounded wpływ ITRA oraz zapis resolved snapshotu sygnałów w istniejącej ścieżce persistencji.

## Current State Analysis

Aktualna estymacja działa w pipeline: API (`upload/profile`) -> `recomputeLatestEstimation` -> `computeRouteEstimation` -> atomowy zapis RPC. System ma już wzorzec ostrzeżeń częściowych i nie blokuje flow przy brakach prerekwizytów (np. brak snapshotu/profilu), ale nie ma jeszcze kontraktów ani semantyki dla sygnałów zewnętrznych.

## Desired End State

Po zakończeniu planu silnik estymacji przyjmuje jawny kontrakt sygnałów zewnętrznych z neutralnymi wartościami domyślnymi. ITRA działa jako globalny mnożnik czasu z zakresem **0.95-1.05**, a pogoda jest sygnałem opcjonalnym (nieobecna, gdy brak daty biegu). Persistencja zapisuje pełny resolved snapshot (statusy, zastosowane mnożniki, as-of/source), dzięki czemu wynik jest transparentny i odtwarzalny.

### Key Discoveries:

- Główny seam obliczeń czasu jest scentralizowany w `src/lib/estimation/engine.ts:120`, więc wpływ ITRA/pogody należy dodać jako wejście kontraktowe, nie fetch w silniku.
- Orkiestracja recompute (`src/lib/estimation/orchestration.ts:36`) jest naturalnym miejscem na resolve/fallback sygnałów i ochronę zasady "estymacja nie może się wywrócić przez opcjonalną pogodę".
- Persistencja działa atomowo przez RPC `persist_route_estimation_bundle` (`src/lib/estimation/service.ts:169`, `supabase/migrations/20260913233000_persist_route_estimation_bundle_rpc.sql:1`) i już zapisuje `derived_metrics` jako JSON.
- Warstwa warningów jest gotowa do reuse (`src/lib/estimation/recompute-feedback.ts:3`, `:11`), a API ją już konsumuje (`src/pages/api/routes/upload.ts:78`, `src/pages/api/profile.ts:111`).

## What We're NOT Doing

- Nie wdrażamy jeszcze pełnego user-facing enrichment UI (to zakres S-05).
- Nie dodajemy nowych top-level kolumn tabel dla weather/ITRA, o ile `derived_metrics` pokrywa kontrakt.
- Nie rozwiązujemy semantyki freeze vs rehydrate historii dla S-06.
- Nie blokujemy estymacji przy braku ITRA lub braku danych pogodowych.

## Implementation Approach

Podejście: kontrakty-first i fallback-first. Najpierw definiujemy typy i reguły neutralne, potem wpinamy resolve sygnałów do orkiestracji, następnie aplikujemy bounded wpływ w silniku i zapisujemy resolved snapshot przez istniejący RPC payload (`derived_metrics`). Na końcu utrwalamy zachowanie testami kontraktowymi i regresyjnymi.

## Critical Implementation Details

### Timing & lifecycle

Pogoda ma status `not_applicable` gdy brak daty biegu podanej przez użytkownika; w takim przypadku system nie próbuje fetchu pogodowego i używa neutralnego wpływu. To zapobiega niejawnej semantyce "pogoda na teraz" i utrzymuje jasny kontrakt jakości.

### State sequencing

Resolve sygnałów musi nastąpić przed wywołaniem `computeRouteEstimation`, ale po walidacji snapshotu/profilu. Dzięki temu skipy `missing_snapshot`/`incomplete_profile` pozostają bez zmian, a sygnały zewnętrzne nie rozszerzają warunków blokujących.

## Phase 1: External Signal Contract Definition

### Overview

Definiujemy spójny model danych i reguły fallback dla ITRA i pogody, bez zmiany zachowania user-facing.

### Changes Required:

#### 1. Estimation contracts and derived metrics schema

**File**: `src/lib/estimation/types.ts`

**Intent**: Rozszerzyć domenowe typy estymacji o kontrakty sygnałów zewnętrznych oraz pola resolved snapshotu zapisywanego w `derivedMetrics`.

**Contract**: Dodać typy statusów sygnałów (np. `available`, `missing`, `not_applicable`, `provider_error`), kontrakt ITRA global multiplier i kontrakt weather influence; rozszerzyć `EstimationDerivedMetrics`, by przechowywał zastosowane mnożniki i metadane as-of/source.

#### 2. Runtime configuration guardrails

**File**: `src/lib/config-status.ts`

**Intent**: Uzupełnić sygnalizację konfiguracji dla warstwy weather-provider zgodnie z aktualnym patternem status bannerów.

**Contract**: Dodać pozycję statusową konfiguracji sygnału pogodowego tylko jeśli integracja wymaga nowej konfiguracji środowiskowej.

#### 3. Server env contract for external signal integration

**File**: `astro.config.mjs`

**Intent**: Dodać jawny kontrakt env dla parametrów integracji pogodowej, jeśli potrzebne do stabilnej pracy adaptera.

**Contract**: Rozszerzyć `env.schema` o opcjonalne pola server-side dla weather integration (np. timeout/base URL), bez naruszania istniejącego kontraktu Supabase.

### Success Criteria:

#### Automated Verification:

- Type-level contract rozszerza `RouteEstimationInput`/`EstimationDerivedMetrics` bez błędów budowania: `npm run build`
- Lint przechodzi po zmianach kontraktowych: `npm run lint`

#### Manual Verification:

- Kontrakty są czytelne i jednoznacznie opisują neutralne/fallbackowe stany dla ITRA i pogody.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Orchestration, Engine, and Persistence Wiring

### Overview

Wpinamy resolve sygnałów do orkiestracji, aplikujemy bounded wpływ w silniku i utrwalamy resolved snapshot przez istniejący RPC/persist path.

### Changes Required:

#### 1. External signal resolver in recompute orchestration

**File**: `src/lib/estimation/orchestration.ts`

**Intent**: Rozszerzyć `recomputeLatestEstimation` o przygotowanie external signal payload z fallbackami, bez nowych ścieżek hard-fail dla opcjonalnych danych.

**Contract**: Brak ITRA -> mnożnik 1.0 + warning info; brak daty biegu -> pogoda `not_applicable` i neutralny wpływ; błędy providera -> neutralny wpływ + warning.

#### 2. Bounded multiplier and optional-weather influence in estimation engine

**File**: `src/lib/estimation/engine.ts`

**Intent**: Zastosować ITRA jako globalny mnożnik końcowego czasu i lekki wpływ pogody zgodnie z kontraktem wejściowym.

**Contract**: ITRA musi być clampowany do zakresu **0.95-1.05**; weather wpływa lekko i tylko gdy status `available`; finalny wynik pozostaje >= 1 min i deterministyczny dla tych samych wejść.

#### 3. Persist resolved external-signal snapshot via existing bundle RPC path

**File**: `src/lib/estimation/service.ts`

**Intent**: Zapewnić, że pełny resolved snapshot sygnałów ląduje w `derived_metrics` zarówno dla rekordu latest, jak i history.

**Contract**: `persistRouteEstimationBundle` utrzymuje atomowy zapis przez istniejące RPC i przekazuje rozszerzony `derivedMetrics` bez zmiany kontraktu onConflict/dedupe.

#### 4. Transactional SQL contract remains compatible

**File**: `supabase/migrations/20260913233000_persist_route_estimation_bundle_rpc.sql`

**Intent**: Potwierdzić lub dostosować kontrakt SQL tak, aby przyjmował rozszerzony `derived_metrics` bez regresji.

**Contract**: Brak nowych obowiązkowych kolumn dla weather/ITRA; zgodność z obecnym `jsonb` payload i istniejącymi upsert keys.

#### 5. Recompute warning surfacing for optional external failures

**File**: `src/lib/estimation/recompute-feedback.ts`

**Intent**: Utrzymać spójną ekspozycję warningów dla braków/błędów opcjonalnych sygnałów zewnętrznych.

**Contract**: Warningi muszą przechodzić przez istniejące `resolveUploadRecomputeWarning` i `resolveProfileRecomputeWarning` bez zmiany semantyki pełnych błędów storage/auth.

### Success Criteria:

#### Automated Verification:

- Recompute flow kompiluje się i działa z nowym payloadem sygnałów: `npm run build`
- Lint przechodzi dla zmian orkiestracji/silnika/service: `npm run lint`
- Kontrakt RPC persist bundle pozostaje zgodny z service payloadem: `node --test tests/estimation-history-contracts.test.js`

#### Manual Verification:

- Scenariusz bez daty biegu nie uwzględnia pogody i nadal zwraca estymację.
- Scenariusz braku ITRA zwraca estymację z neutralnym wpływem i warningiem informacyjnym.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Regression Safety Net and Contract Validation

### Overview

Domykamy zmianę testami regresyjnymi i kontraktowymi tak, aby F-01 nie destabilizował wcześniejszych slice'ów.

### Changes Required:

#### 1. Engine regression tests for bounded multipliers and deterministic behavior

**File**: `tests/estimation-engine.test.js`

**Intent**: Rozszerzyć testy o bounded ITRA multiplier, neutral fallback i niezmiennik determinism.

**Contract**: Testy pokrywają clamp 0.95-1.05, brak ITRA = 1.0, brak pogody (not applicable) = neutral weather influence.

#### 2. API recompute feedback tests for optional-signal warnings

**File**: `tests/api-recompute-feedback.test.js`

**Intent**: Zweryfikować, że warningi przy opcjonalnych sygnałach idą istniejącą ścieżką feedback i nie zamieniają sukcesu recompute w hard-fail.

**Contract**: Upload/profile warning contracts pozostają stabilne dla full failure i partial/optional degradation.

#### 3. History contract tests for persistence compatibility

**File**: `tests/estimation-history-contracts.test.js`

**Intent**: Potwierdzić brak regresji w dedupe/order/upsert przy rozszerzonym `derived_metrics`.

**Contract**: Zachowane: ordering history, conflict keys, RPC `persist_route_estimation_bundle`; nowe pola sygnałów są kompatybilne w JSON payload.

### Success Criteria:

#### Automated Verification:

- Silnik estymacji przechodzi rozszerzone testy kontraktowe: `node --test tests/estimation-engine.test.js`
- Warning flow przechodzi testy API feedback: `node --test tests/api-recompute-feedback.test.js`
- Persist/dedupe contracts przechodzą testy historii: `node --test tests/estimation-history-contracts.test.js`
- Build i lint całej zmiany przechodzą: `npm run build && npm run lint`

#### Manual Verification:

- Review test coverage potwierdza, że każdy fallback path (missing ITRA, brak daty biegu, provider error) ma odpowiadający przypadek.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

## Testing Strategy

### Unit Tests:

- Bounded ITRA multiplier (min/max clamp + neutral fallback)
- Weather optionality (`not_applicable` bez daty biegu, neutral influence)
- Determinism dla tego samego zestawu wejść i resolved signals

### Integration Tests:

- Recompute po uploadzie trasy i po zapisie profilu z różnymi statusami sygnałów
- Persist latest + history przez RPC z rozszerzonym `derived_metrics`

### Manual Testing Steps:

1. Użytkownik bez daty biegu uruchamia recompute i otrzymuje estymację bez uwzględnienia pogody.
2. Użytkownik bez ITRA otrzymuje estymację z neutralnym mnożnikiem i warningiem.
3. Użytkownik z dostępnym ITRA i pogodą otrzymuje stabilny wynik z zapisanym snapshotem sygnałów.

## Performance Considerations

External signal resolution nie może znacząco opóźniać istniejącego recompute flow; weather provider calls powinny mieć defensywny timeout i zawsze degradację do neutralnych wartości zamiast retry-loopów blokujących odpowiedź.

## Migration Notes

Preferowany brak nowej migracji schematu: sygnały external pozostają w `derived_metrics` (`jsonb`). Modyfikacja SQL dotyczy tylko zgodności kontraktu RPC, jeśli wymagana przez strukturę payloadu.

## References

- Roadmap item: `context/foundation/roadmap.md` (F-01, Change ID: `external-signal-contracts`)
- Similar implementation seam: `src/lib/estimation/orchestration.ts:36`
- Estimation core contract: `src/lib/estimation/engine.ts:120`
- Atomic persistence boundary: `src/lib/estimation/service.ts:169`
- Warning surfacing pattern: `src/lib/estimation/recompute-feedback.ts:3`
- Progress contract reference: `.github/skills/10x-plan/references/progress-format.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: External Signal Contract Definition

#### Automated

- [x] 1.1 Type-level contract rozszerza RouteEstimationInput/EstimationDerivedMetrics bez błędów budowania — 928eb50
- [x] 1.2 Lint przechodzi po zmianach kontraktowych — 928eb50

#### Manual

- [x] 1.3 Kontrakty są czytelne i jednoznacznie opisują neutralne/fallbackowe stany dla ITRA i pogody — 928eb50

### Phase 2: Orchestration, Engine, and Persistence Wiring

#### Automated

- [x] 2.1 Recompute flow kompiluje się i działa z nowym payloadem sygnałów — a6641b9
- [x] 2.2 Lint przechodzi dla zmian orkiestracji/silnika/service — a6641b9
- [x] 2.3 Kontrakt RPC persist bundle pozostaje zgodny z service payloadem — a6641b9

#### Manual

- [x] 2.4 Scenariusz bez daty biegu nie uwzględnia pogody i nadal zwraca estymację — a6641b9
- [x] 2.5 Scenariusz braku ITRA zwraca estymację z neutralnym wpływem i warningiem informacyjnym — a6641b9

### Phase 3: Regression Safety Net and Contract Validation

#### Automated

- [x] 3.1 Silnik estymacji przechodzi rozszerzone testy kontraktowe — 8f184ae
- [x] 3.2 Warning flow przechodzi testy API feedback — 8f184ae
- [x] 3.3 Persist/dedupe contracts przechodzą testy historii — 8f184ae
- [x] 3.4 Build i lint całej zmiany przechodzą — 8f184ae

#### Manual

- [x] 3.5 Review test coverage potwierdza, że każdy fallback path ma odpowiadający przypadek — 8f184ae
