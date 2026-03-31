/**
 * GET /api/companion/download?rundownId=xxx
 *
 * Genereert twee configs via querystring ?mode=:
 *
 *   mode=page     (default) — importeert ALLEEN pagina 1, raakt andere pagina's NIET aan.
 *                             Gebruik dit normaal.
 *
 *   mode=triggers           — importeert de polling triggers + CueBoard HTTP connectie.
 *                             LET OP: dit is een FULL import en vervangt je hele config.
 *                             Maak eerst een backup via Settings → Import/Export → Export.
 *
 * Importeer via Companion: Settings → Import/Export
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

  function postAction(action: 'go' | 'back' | 'skip') {
    return {
      type: 'action',
      id: rnd(),
      connectionId: connId,
      definitionId: 'post',
      options: {
        url: `${BASE}/api/companion/action`,
        body: JSON.stringify({ action, rundownId }),
        header: 'Content-Type: application/json',
        result_stringify: false,
        jsonResultDataVariable: null,
      },
      upgradeIndex: 1,
    }
  }

  // ── MODE: page ──────────────────────────────────────────────────────────
  // Importeert alleen de knoppen. Raakt andere pagina's / triggers NIET aan.
  // De variabelen $(custom:sc_active) en $(custom:sc_next) worden gevuld
  // door de polling trigger (triggers-config, of de bestaande CueBoard trigger).
  if (mode === 'page') {
    const pageConfig = {
      version: 9,
      type: 'page',
      companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

      // Alleen de pagina — geen triggers, geen custom_variables
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
            '3': makeButton('$(custom:sc_done) / $(custom:sc_total)', 0x0d0d0d, 0x666666, '18', []),
          },
          '2': {
            '0': { type: 'pagedown' },
          },
        },
      },

      // De CueBoard HTTP connectie meesturen zodat de POST-acties werken
      instances: {
        [connId]: {
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
        },
      },
    }

    return respond(gzip(pageConfig), 'CueBoard pagina.companionconfig')
  }

  // ── MODE: triggers ──────────────────────────────────────────────────────
  // Importeert ALLEEN triggers + custom variables. Raakt pagina's NIET aan.
  // Veilig om te importeren; eventuele bestaande triggers worden vervangen.
  if (mode === 'triggers') {
    const triggersConfig = {
      version: 9,
      type: 'triggers',   // importeert alleen triggers, geen pagina's
      companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

      triggers: {
        [rnd()]: {
          type: 'trigger',
          options: { name: 'CueBoard — Actieve cue (1s)', enabled: true, sortOrder: 0 },
          condition: [],
          events: [{ id: rnd(), type: 'interval', enabled: true, options: { seconds: 1 } }],
          actions: [
            {
              type: 'action', id: rnd(), connectionId: connId, definitionId: 'get',
              options: {
                url: `${BASE}/api/companion/cue?rundownId=${rundownId}&field=active`,
                header: '', result_stringify: true, jsonResultDataVariable: 'sc_active',
              },
              upgradeIndex: 1,
            },
            {
              type: 'action', id: rnd(), connectionId: connId, definitionId: 'get',
              options: {
                url: `${BASE}/api/companion/cue?rundownId=${rundownId}&field=next`,
                header: '', result_stringify: true, jsonResultDataVariable: 'sc_next',
              },
              upgradeIndex: 1,
            },
          ],
          localVariables: [],
        },
      },
      triggerCollections: [],
      custom_variables: {
        sc_active: { description: 'Actieve cue', defaultValue: '—', persistCurrentValue: false, sortOrder: 0 },
        sc_next:   { description: 'Volgende cue', defaultValue: '—', persistCurrentValue: false, sortOrder: 1 },
        sc_done:   { description: 'Gedaan', defaultValue: '0', persistCurrentValue: false, sortOrder: 2 },
        sc_total:  { description: 'Totaal', defaultValue: '0', persistCurrentValue: false, sortOrder: 3 },
      },
      customVariablesCollections: [],
      instances: {
        [connId]: {
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
        },
      },
      connectionCollections: [],
    }

    return respond(gzip(triggersConfig), 'CueBoard triggers.companionconfig')
  }

  return NextResponse.json({ error: 'Ongeldige mode (gebruik page of triggers)' }, { status: 400 })
}
