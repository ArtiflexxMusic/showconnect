/**
 * GET /api/companion/download?rundownId=xxx&mode=page|triggers
 *
 * Genereert een universele Companion config.
 * De rundownId zit NIET hardcoded — alles gebruikt $(custom:sc_rundown_id).
 * Daardoor hoef je de config maar EENMALIG te importeren.
 *
 * Shows wisselen: gebruik de "Activeer in Companion" knop in CueBoard,
 * of update sc_rundown_id handmatig via Companion → Variables → Custom Variables.
 *
 *   mode=page     (default) — importeert ALLEEN de knoppen-pagina.
 *                             Raakt andere pagina's NIET aan. Eenmalig importeren.
 *
 *   mode=triggers           — importeert ALLEEN de polling trigger + variabelen.
 *                             Raakt pagina's NIET aan. Eenmalig importeren.
 *                             sc_rundown_id krijgt als startwaarde de meegegeven rundownId.
 *
 * Importeer via Companion: Settings → Import / Export
 */

import { NextRequest, NextResponse } from 'next/server'
import { gzipSync } from 'zlib'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function rnd(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  const bytes = new Uint8Array(21)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

function gzip(obj: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(obj), 'utf-8'))
}

function respond(data: Buffer<ArrayBufferLike>, filename: string) {
  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

// ── Knop helpers ────────────────────────────────────────────────────────────

function makeButton(
  text: string,
  bgcolor: number,
  color: number,
  size: string,
  downActions: unknown[],
) {
  return {
    type: 'button',
    style: {
      text,
      textExpression: false,
      size,
      png64: null,
      alignment: 'center:center',
      pngalignment: 'center:center',
      color,
      bgcolor,
      show_topbar: 'default',
    },
    options: {
      stepProgression: 'auto',
      stepExpression: '',
      rotaryActions: false,
    },
    feedbacks: [],
    steps: {
      '0': {
        action_sets: { down: downActions, up: [] },
        options: { runWhileHeld: [] },
      },
    },
    localVariables: [],
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rundownId = request.nextUrl.searchParams.get('rundownId')
  if (!rundownId || !UUID_RE.test(rundownId)) {
    return NextResponse.json({ error: 'Ongeldig rundownId' }, { status: 400 })
  }

  const mode   = request.nextUrl.searchParams.get('mode') ?? 'page'
  const BASE   = 'https://www.cueboard.nl'
  const connId = rnd()

  // POST-actie gebruikt $(custom:sc_rundown_id) — werkt voor elke show
  function postAction(action: 'go' | 'back' | 'skip') {
    return {
      type: 'action',
      id: rnd(),
      connectionId: connId,
      definitionId: 'post',
      options: {
        url: `${BASE}/api/companion/action`,
        // sc_rundown_id wordt door Companion ingevuld op het moment van uitvoeren
        body: `{"action":"${action}","rundownId":"$(custom:sc_rundown_id)"}`,
        header: 'Content-Type: application/json',
        result_stringify: true,
        jsonResultDataVariable: null,
      },
      upgradeIndex: 1,
    }
  }

  // Gedeelde connectie-definitie
  const connectionDef = {
    moduleInstanceType: 'connection',
    instance_type: 'generic-http',
    label: 'CueBoard',
    isFirstInit: false,
    config: {},
    lastUpgradeIndex: 1,
    enabled: true,
    moduleVersionId: '2.7.0',
    updatePolicy: 'stable',
    sortOrder: 99,
    secrets: {},
  }

  // ── MODE: page ────────────────────────────────────────────────────────────
  if (mode === 'page') {
    const pageConfig = {
      version: 9,
      type: 'page',
      companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

      page: {
        id: rnd(),
        name: 'CueBoard',
        controls: {
          '0': {
            '0': { type: 'pageup' },
            '1': makeButton('◀  BACK', 0x334466, 0xffffff, 'auto', [postAction('back')]),
            '2': makeButton('▶   GO',  0x007733, 0xffffff, 'auto', [postAction('go')]),
            '3': makeButton('SKIP ▶▶', 0x775500, 0xffffff, 'auto', [postAction('skip')]),
          },
          '1': {
            '0': { type: 'pagenum' },
            '1': makeButton('NOW\n$(custom:sc_active)', 0x001a0a, 0x00ff88, '14', []),
            '2': makeButton('NEXT\n$(custom:sc_next)',  0x111111, 0xaaaaaa, '14', []),
            '3': makeButton('$(custom:sc_show_name)',  0x0d0d0d, 0x666666, '14', []),
          },
          '2': {
            '0': { type: 'pagedown' },
          },
        },
      },

      instances: { [connId]: connectionDef },
    }

    return respond(gzip(pageConfig), 'CueBoard pagina.companionconfig')
  }

  // ── MODE: triggers ────────────────────────────────────────────────────────
  // Importeert ALLEEN triggers + variabelen. Raakt pagina's NIET aan.
  // sc_rundown_id staat standaard op de meegegeven UUID maar kan later
  // gewijzigd worden via CueBoard → "Activeer in Companion".
  if (mode === 'triggers') {
    const triggerId = rnd()

    const triggersConfig = {
      version: 9,
      type: 'triggers',
      companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

      triggers: {
        [triggerId]: {
          type: 'trigger',
          options: { name: 'CueBoard — Live cue (1s)', enabled: true, sortOrder: 0 },
          condition: [],
          events: [{ id: rnd(), type: 'interval', enabled: true, options: { seconds: 1 } }],
          actions: [
            // Actieve cue ophalen
            {
              type: 'action', id: rnd(), connectionId: connId, definitionId: 'get',
              options: {
                url: `${BASE}/api/companion/cue?rundownId=$(custom:sc_rundown_id)&field=active`,
                header: '', result_stringify: true, jsonResultDataVariable: 'sc_active',
              },
              upgradeIndex: 1,
            },
            // Volgende cue ophalen
            {
              type: 'action', id: rnd(), connectionId: connId, definitionId: 'get',
              options: {
                url: `${BASE}/api/companion/cue?rundownId=$(custom:sc_rundown_id)&field=next`,
                header: '', result_stringify: true, jsonResultDataVariable: 'sc_next',
              },
              upgradeIndex: 1,
            },
            // Shownaam ophalen
            {
              type: 'action', id: rnd(), connectionId: connId, definitionId: 'get',
              options: {
                url: `${BASE}/api/companion/cue?rundownId=$(custom:sc_rundown_id)&field=rundown`,
                header: '', result_stringify: true, jsonResultDataVariable: 'sc_show_name',
              },
              upgradeIndex: 1,
            },
          ],
          localVariables: [],
        },
      },
      triggerCollections: [],

      custom_variables: {
        // sc_rundown_id: de UUID van de actieve show. Wordt bijgewerkt via
        // CueBoard → "Activeer in Companion" of handmatig in Companion Variables.
        sc_rundown_id: {
          description: 'Actieve show (UUID) — bijwerken via CueBoard',
          defaultValue: rundownId,   // direct bruikbaar na eerste import
          persistCurrentValue: true, // onthoudt waarde na herstart Companion
          sortOrder: 0,
        },
        sc_show_name: {
          description: 'Naam van de actieve show',
          defaultValue: '—',
          persistCurrentValue: false,
          sortOrder: 1,
        },
        sc_active: {
          description: 'Actieve cue naam',
          defaultValue: '—',
          persistCurrentValue: false,
          sortOrder: 2,
        },
        sc_next: {
          description: 'Volgende cue naam',
          defaultValue: '—',
          persistCurrentValue: false,
          sortOrder: 3,
        },
      },
      customVariablesCollections: [],

      instances: { [connId]: connectionDef },
      connectionCollections: [],
    }

    return respond(gzip(triggersConfig), 'CueBoard triggers.companionconfig')
  }

  return NextResponse.json({ error: 'Ongeldige mode (gebruik page of triggers)' }, { status: 400 })
}
