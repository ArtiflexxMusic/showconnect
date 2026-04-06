# CueBoard Features

CueBoard is een Show OS voor live evenementen: rundown, cues, caller, crew, presenter, output, green room, slides en mic patch — alles realtime gesynchroniseerd.

> **Help-pagina met alle details:** [/help](https://www.cueboard.nl/help). Je kunt direct naar een sectie linken, bv. `/help#caller`, `/help#cast`, `/help#webhook`.

---

## Rundown & Cues  _(anker: /help#rundown)_

De rundown is de agenda van een show — één per event of per dag. Binnen een rundown voeg je **cues** toe: de individuele blokken van je show (speech, filmpje, muzikale act, pauze, slides).

**Cue-types:** video, audio, lighting, speech, break, custom, intro, outro, presentation.

**Wat kan per cue:**
- Titel, type, duur
- Drag-and-drop herordenen
- Timer met countdown en auto-advance
- Kleurcodes
- Technische notities (alleen zichtbaar voor crew)
- Spreker/presentator toewijzen
- Media toevoegen (audio/video upload)
- Slides koppelen (PDF/PPTX)

**Hoe begin je:** in je show → "Rundown aanmaken" → "+ Cue" knop → geef elke cue titel/type/duur.

**Tip:** de totale showduur wordt automatisch uitgerekend uit alle cues.

---

## Caller View — showcontrol  _(anker: /help#caller)_

De Caller is het hart van de show. Vanuit deze view druk je op **GO** om cues te starten. Alle andere views (Presenter, Crew, Programmascherm, Output) worden realtime bijgewerkt zodra de Caller op GO drukt.

- Volgende cue staat altijd rechts in beeld
- Kleuren: rood = actief, grijs = wacht, groen = klaar
- Alleen de Caller heeft een GO-knop, de rest kijkt mee
- Scan de QR-code in rundown-instellingen om de Caller link te openen

---

## Presenter View — voor de spreker  _(anker: /help#presenter)_

Grote, leesbare weergave van huidige + volgende cue. Ideaal als prompter of afkijkscherm op een tweede monitor of tablet. Werkt automatisch mee met GO van de Caller. Geen knoppen, alleen de essentie.

**Tip:** zet de Presenter view op een tablet of monitor naast het podium.

---

## Crew View — voor het technische team  _(anker: /help#crew)_

Overzicht van de hele rundown, inclusief **technische notities** per cue. Voor geluid, licht en video-techniek. De actieve cue is duidelijk gemarkeerd. Stuur de Crew link naar je team.

**Tip:** vul tech_notes per cue in de cue-editor — die zien alleen crew-leden.

---

## Programmascherm  _(anker: /help#publiek)_

Lichtgewicht pagina voor backstage. Wachtende sprekers zien welke cue er live is en wanneer ze aan de beurt zijn. **Geen login nodig** — iedereen met de link kan kijken. Ververst automatisch bij elke GO.

**Tip:** hang het op een tv of tablet backstage — dan weten alle sprekers precies wanneer zij aan de beurt zijn, zonder dat je ze hoeft te informeren.

---

## Slides per cue  _(anker: /help#presentatie)_

Upload een **PDF of PPTX** direct bij een cue (max 50 MB). Caller en Presenter bladeren er handmatig doorheen. Pas op de laatste slide gaat GO door naar de volgende cue.

**Hoe:** cue-editor → scroll naar "Presentatie / Slides" → upload → kies wie bedient (Caller, Presenter, of beide).

**Tip:** voor beste kwaliteit → exporteer PPTX vanuit PowerPoint als PDF. PPTX heeft beperkte slide-controle.

---

## Presentatie Output  _(anker: /help#presentatie-output)_

Fullscreen slide op zwarte achtergrond — als bron voor een **videomixer** (OBS, vMix, Resolume) of **beamer**. Realtime gesynchroniseerd met de Caller.

**Tip:** open schermvullend (F11). De paginateller is bijna onzichtbaar en wordt niet opgepikt door chroma-key.

---

## Green Room — gasten zonder account  _(anker: /help#cast)_

Voeg sprekers, artiesten of gasten toe. Elke gast krijgt een **6-cijferige PIN** en een persoonlijke Green Room view — geen account nodig.

**Hoe:** show-dashboard → "Green Room" → gast toevoegen (naam, rol, kleur) → PIN delen → gast gaat naar `/green-room` en voert code in.

**Alternatief:** genereer een Magic Link en stuur die rechtstreeks, dan hoeven ze geen PIN te typen.

---

## Mic Patch — audiotoewijzing  _(anker: /help#mic)_

Koppel **microfoons, DI-boxes en playback** aan cues. Zo weet je geluidsteam precies welk kanaal open moet. Per cue kun je apparaten aan of uit zetten (before/during/after). Zichtbaar in Caller en Crew view.

**Tip:** combineer met de Companion-webhook om microfoon-routing automatisch te laten verlopen bij elke GO.

---

## QR-codes & links  _(anker: /help#qr)_

Elke view (Caller, Presenter, Crew, Programmascherm, Output) heeft een eigen link én een QR-code. Klik op het QR-icoontje naast een link in je show-dashboard, of kopieer de link en stuur 'm via WhatsApp.

**Tip:** print QR-codes van Caller en Crew en plak ze op je technische tafel.

---

## Tijdplanning & showstart  _(anker: /help#tijdplanning)_

Stel een **aanvangstijd** in voor de show. CueBoard berekent automatisch de verwachte starttijd per cue op basis van alle voorgaande duurtijden. Zie direct of je uitloopt.

**Hoe:** Rundown Instellingen → "Showstart" tijd invullen.

---

## Team uitnodigen  _(anker: /help#uitnodigen)_

Nodig collega's uit voor een show. Elke persoon heeft een eigen account nodig.

**Hoe:** show → "Uitnodigen" → e-mailadres → rol kiezen (Redacteur = alles bewerken, Viewer = alleen meekijken) → ze krijgen een uitnodigingsmail.

**Belangrijk:** sprekers en gasten hoeven NIET uitgenodigd — gebruik daarvoor de Green Room met PIN (geen account nodig).

---

## Afdrukken  _(anker: /help#afdrukken)_

Volledige rundown als printklaar document. Handig als backup of voor de productieleider. Klik op "Afdrukken" → nieuwe tab → Ctrl+P (Cmd+P op Mac).

---

## Bitfocus Companion integratie  _(anker: /help#webhook)_

Koppel CueBoard aan **Bitfocus Companion** voor StreamDeck-bediening. Companion haalt zelf de actieve cue op via een poll-URL — werkt altijd, ook als CueBoard in de cloud draait.

**Setup:**
1. CueBoard → Rundown Instellingen → Bitfocus Companion → kopieer Poll-URL
2. Companion → Triggers → Add trigger → Event: "Time — Interval" → 1000 ms
3. Actie: Internal → HTTP Request → GET → plak Poll-URL
4. Tweede actie: Internal → Set custom variable → naam: `cueboard_cue`
5. In knoppen: gebruik `$(internal:custom_cueboard_cue)` om de actieve cue live te tonen

**JSON-velden:** `active_cue_title`, `next_cue_title`, `active_cue_type`, `cues_done`, `cues_total`.

**Tip:** geen speciale hardware nodig — Companion draait op een laptop of pc, mits die cueboard.nl kan bereiken.

---

## Rollen binnen een show

- **Owner** — eigenaar, volle rechten
- **Editor** (Redacteur) — rundowns maken/bewerken
- **Caller** — bedient de show live
- **Crew** — alleen lezen + technische notities zien
- **Presenter** — alleen de presenter view
- **Viewer** — alleen meekijken

Gasten (sprekers, artiesten) krijgen geen rol maar toegang via **Green Room PIN** of Magic Link.
