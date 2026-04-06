# Hoe doe ik ...?

Concrete antwoorden op de meest gestelde vragen. Elke stap linkt waar mogelijk naar de relevante pagina.

---

## Hoe begin ik helemaal vanaf nul?

1. Ga naar [cueboard.nl](https://www.cueboard.nl) → "Registreren" → maak een account
2. In je [dashboard](https://www.cueboard.nl/dashboard) staat een **"Aan de slag"-gids** die je stap voor stap door de eerste setup leidt
3. Maak een show → maak een rundown → voeg cues toe → deel de Caller-link op showdag

Volledige hulp: [/help#rundown](https://www.cueboard.nl/help#rundown)

---

## Hoe maak ik mijn eerste show?

1. Dashboard → "Nieuwe show" → naam, datum en venue invullen
2. Open de show → "Rundown aanmaken"
3. Klik op **"+ Cue"** en voeg je eerste blok toe (bv. "Intro video", type = video, duur = 2:00)
4. Herhaal voor alle show-blokken
5. Sleep cues om de volgorde te wijzigen

---

## Hoe nodig ik iemand uit?

**Voor collega's (met account):**
- Show → "Uitnodigen" → e-mailadres → rol kiezen (Redacteur of Viewer) → ze krijgen een mail
- Meer info: [/help#uitnodigen](https://www.cueboard.nl/help#uitnodigen)

**Voor sprekers, artiesten of gasten (zonder account):**
- Show → "Green Room" → gast toevoegen → krijgt een **6-cijferige PIN** of Magic Link
- Ze gaan naar `/green-room` en voeren de PIN in. Klaar.
- Meer info: [/help#cast](https://www.cueboard.nl/help#cast)

---

## Hoe start ik een live show?

1. Open de rundown → klik "Open Caller" (of scan de QR-code in rundown-instellingen)
2. Volg de cues rechts in beeld — druk op **GO** om de volgende te starten
3. Rood = actief, grijs = wacht, groen = klaar
4. Stuur ondertussen de Crew-link, Presenter-link en Programmascherm-link naar je team

Meer info: [/help#caller](https://www.cueboard.nl/help#caller)

---

## Hoe voeg ik een presentatie/slides toe aan een cue?

1. Open de cue-editor van de gewenste cue
2. Scroll naar "Presentatie / Slides"
3. Upload een **PDF of PPTX** (max 50 MB) — PDF geeft beste kwaliteit
4. Stel in wie bedient: Caller, Presenter, of beide
5. Tijdens de show: GO bladert door de slides, pas op de laatste slide gaat GO naar de volgende cue

Meer info: [/help#presentatie](https://www.cueboard.nl/help#presentatie)

---

## Hoe krijg ik slides fullscreen op een beamer of in een videomixer?

1. In je show-dashboard → klik op "Presentatie"
2. Een **Output-pagina** opent — een fullscreen zwarte pagina met de actieve slide
3. Open die pagina op de computer die op de beamer of videomixer hangt
4. Druk F11 voor volledig scherm
5. Verbind als bron in OBS / vMix / Resolume

De slides schuiven automatisch mee zodra de Caller verder gaat. Meer info: [/help#presentatie-output](https://www.cueboard.nl/help#presentatie-output)

---

## Hoe koppel ik CueBoard aan een StreamDeck (Bitfocus Companion)?

1. Rundown Instellingen → Bitfocus Companion → **kopieer de Poll-URL**
2. In Companion: Triggers → Add trigger → Event "Time — Interval" → 1000 ms
3. Voeg actie toe: Internal → HTTP Request → GET → plak Poll-URL
4. Voeg tweede actie toe: Internal → Set custom variable → naam `cueboard_cue`
5. Gebruik `$(internal:custom_cueboard_cue)` op een knop om de actieve cue live te tonen

Beschikbare JSON-velden: `active_cue_title`, `next_cue_title`, `active_cue_type`, `cues_done`, `cues_total`.

Geen speciale hardware nodig — Companion draait op een laptop of pc. Meer info: [/help#webhook](https://www.cueboard.nl/help#webhook)

---

## Hoe upgrade ik mijn abonnement?

1. Ga naar [/upgrade](https://www.cueboard.nl/upgrade)
2. Kies Team (€9,99/mnd) of Business (€29,99/mnd)
3. Maandelijks of jaarlijks (jaarlijks is goedkoper)
4. Betaling via Mollie (iDEAL, creditcard, etc.)
5. Je plan is direct actief

---

## Hoe zeg ik mijn abonnement op?

Ga naar [/billing](https://www.cueboard.nl/billing) → "Opzeggen". Je houdt toegang tot het einde van de lopende periode, daarna val je terug naar Individual.

---

## Hoe vraag ik een trial aan?

Stuur een mailtje naar **info@artiflexx.nl**. Een trial activeert tijdelijk alle Business-limieten (onbeperkt alles + alle features) voor een beperkte periode.

---

## Ik kan niet inloggen / mijn wachtwoord kwijt

Gebruik de "Wachtwoord vergeten"-link op de loginpagina. Lukt het niet? Mail naar **info@artiflexx.nl**.

---

## Wat als mijn internet wegvalt tijdens de show?

De Caller view blijft lokaal doorwerken, maar real-time sync met andere views (Presenter, Crew, Programma) stopt tijdelijk. Zodra het internet terug is, synchroniseert alles automatisch.

**Advies:** zorg voor een backup-verbinding (mobiele hotspot) op de locatie.

---

## Werkt CueBoard op mobiel of tablet?

- **Tablet:** ja, goed bruikbaar voor Presenter view, Crew view en Programmascherm
- **Mobiel:** werkt wel maar is niet ideaal — de interface is geoptimaliseerd voor desktop
- **App:** geen native app, maar je kunt CueBoard **als PWA installeren** op je home screen

---

## Welke browsers worden ondersteund?

Alle moderne browsers: Chrome, Firefox, Safari, Edge. We raden Chrome of Edge aan voor de beste prestaties met slide-upload en video.

---

## Kan het publiek meekijken?

Ja — gebruik het **Programmascherm**. Dat is een lichtgewicht pagina zonder login die iedereen met de link kan bekijken. Het is wel bedoeld als backstage-status, niet als "verhaal voor het publiek".

Meer info: [/help#publiek](https://www.cueboard.nl/help#publiek)

---

## Hoe druk ik een rundown af?

Show-dashboard of rundown-instellingen → "Afdrukken" → een printklare versie opent → Ctrl+P (of Cmd+P).

---

## Kan ik een draaiboek kopiëren of als template gebruiken?

Ja, draaiboeken kunnen als **template** worden hergebruikt. Ideaal voor terugkerende shows.
