# CueBoard Prijzen & Plannen

CueBoard heeft drie plannen. Alles gebaseerd op de actieve limieten in de code (`lib/plans.ts`) — dit is altijd accuraat.

> **Upgraden:** [/upgrade](https://www.cueboard.nl/upgrade) · **Je eigen abonnement:** [/billing](https://www.cueboard.nl/billing)

---

## 🆓 Individual — Gratis

Voor mensen die CueBoard willen uitproberen of een kleine show runnen.

| Limiet | Waarde |
|---|---|
| Shows | **1** |
| Rundowns per show | **1** |
| Cues per rundown | **15** |
| Teamleden per show | **2** |
| Gast/cast toegang | ❌ |
| Bitfocus Companion | ❌ |
| Slide-upload (PDF/PPTX) | ❌ |
| Mic Patch | ❌ |

**Prijs:** €0

---

## 🟢 Team — €9,99/maand of €99,99/jaar  _(bespaart €20 per jaar)_

Voor semi-professionele teams met meerdere shows en samenwerking.

| Limiet | Waarde |
|---|---|
| Shows | **5** |
| Rundowns per show | **3** |
| Cues per rundown | **onbeperkt** |
| Teamleden per show | **5** |
| Gast/cast toegang | **1 cast member** |
| Bitfocus Companion | ✅ |
| Slide-upload | ✅ |
| Mic Patch | ✅ |

**Intern planname:** `pro` / **UI label:** Team

---

## 💼 Business — €29,99/maand of €299,99/jaar  _(bespaart €60 per jaar)_

Voor professionele productiebedrijven en grote teams.

| Limiet | Waarde |
|---|---|
| Shows | **onbeperkt** |
| Rundowns per show | **onbeperkt** |
| Cues per rundown | **onbeperkt** |
| Teamleden per show | **onbeperkt** |
| Gast/cast toegang | **onbeperkt** |
| Bitfocus Companion | ✅ |
| Slide-upload | ✅ |
| Mic Patch | ✅ |

**Intern planname:** `team` / **UI label:** Business

> **Let op de naming:** intern heet Business `team` en Team heet `pro`. In de UI zie je "Team" en "Business". Gebruik in antwoorden **altijd de UI-labels** (Individual, Team, Business).

---

## Trial

Gratis gebruikers kunnen een trial krijgen die tijdelijk alle **Business-limieten** activeert (dus onbeperkt alles + alle features). De trial heeft een einddatum (`trial_ends_at` in de database). Na afloop val je terug naar Individual-limieten. Contact via info@cueboard.nl om een trial aan te vragen.

## Betaling

- Via **Mollie** — iDEAL, creditcard, Bancontact, en andere Europese methoden
- Maandelijks of jaarlijks
- Jaarlijks bespaart €20 (Team) of €60 (Business)
- Opzeggen kan op elk moment via [/billing](https://www.cueboard.nl/billing) — je houdt toegang tot het einde van de periode

## Bronnen van een abonnement (intern)

- `free` — standaard gratis
- `gift` — handmatig cadeau gedaan door admin
- `paid` — betaald via Mollie
