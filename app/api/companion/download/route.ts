/**
 * GET /api/companion/download?rundownId=xxx
 *
 * Gzip-gecomprimeerd .companionconfig voor Bitfocus Companion 4.2.x.
 * Importeer via Settings → Import/Export → Import config.
 *
 * Layout pagina 1:
 *   Rij 0: [pageup] [◀ BACK] [▶ GO] [SKIP ▶▶]
 *   Rij 1: [pagenum] [NOW: actieve cue] [NEXT: volgende cue] [voortgang]
 *
 * Variabelen (gevuld door trigger elke seconde):
 *   $(custom:sc_active)   — naam van de actieve cue
 *   $(custom:sc_next)     — naam van de volgende cue
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

export async function GET(request: NextRequest) {
  const rundownId = request.nextUrl.searchParams.get('rundownId')
  if (!rundownId || !UUID_RE.test(rundownId)) {
    return NextResponse.json({ error: 'Ongeldig rundownId' }, { status: 400 })
  }

  const BASE   = 'https://www.cueboard.nl'
  const connId = rnd()

  // ── Knop helpers ──────────────────────────────────────────────────────────

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

  // ── Config ────────────────────────────────────────────────────────────────

  const config = {
    version: 9,
    type: 'full',
    companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

    // ── Pagina 1 ─────────────────────────────────────────────────────────
    pages: {
      '1': {
        id: rnd(),
        name: 'ShowCaller',
        controls: {
          '0': {
            '0': { type: 'pageup' },
            '1': makeButton('◀  BACK', 0x334466, 0xffffff, 'auto', [postAction('back')]),
            '2': makeButton('▶   GO',  0x007733, 0xffffff, 'auto', [postAction('go')]),
            '3': makeButton('SKIP ▶▶', 0x775500, 0xffffff, 'auto', [postAction('skip')]),
          },
          '1': {
            '0': { type: 'pagenum' },
            // NOW: toont de naam van de actieve cue via custom variabele
            '1': makeButton('NOW\n$(custom:sc_active)', 0x001a0a, 0x00ff88, '14', []),
            // NEXT: toont de naam van de volgende cue
            '2': makeButton('NEXT\n$(custom:sc_next)',  0x111111, 0xaaaaaa, '14', []),
            // Voortgang: aantal gedaan / totaal
            '3': makeButton('$(custom:sc_done) / $(custom:sc_total)', 0x0d0d0d, 0x666666, '18', []),
          },
          '2': {
            '0': { type: 'pagedown' },
          },
        },
      },
    },

    // ── Trigger: elke seconde 3x pollen (actief, next, progress) ─────────
    triggers: {
      [rnd()]: {
        type: 'trigger',
        options: {
          name: 'ShowCaller — Live status (1s)',
          enabled: true,
          sortOrder: 0,
        },
        condition: [],
        events: [
          {
            id: rnd(),
            type: 'interval',
            enabled: true,
            options: { seconds: 1 },
          },
        ],
        actions: [
          // Actieve cue (plain text → opslaan in custom:sc_active)
          {
            type: 'action',
            id: rnd(),
            connectionId: connId,
            definitionId: 'get',
            options: {
              url: `${BASE}/api/companion/cue?rundownId=${rundownId}&field=active`,
              header: '',
              result_stringify: false,
              jsonResultDataVariable: 'sc_active',
            },
            upgradeIndex: 1,
          },
          // Volgende cue (plain text → opslaan in custom:sc_next)
          {
            type: 'action',
            id: rnd(),
            connectionId: connId,
            definitionId: 'get',
            options: {
              url: `${BASE}/api/companion/cue?rundownId=${rundownId}&field=next`,
              header: '',
              result_stringify: false,
              jsonResultDataVariable: 'sc_next',
            },
            upgradeIndex: 1,
          },
          // Progress: actieve cue positie ophalen via status endpoint
          {
            type: 'action',
            id: rnd(),
            connectionId: connId,
            definitionId: 'get',
            options: {
              url: `${BASE}/api/companion/status?rundownId=${rundownId}`,
              header: '',
              result_stringify: false,
              jsonResultDataVariable: 'sc_status_raw',
            },
            upgradeIndex: 1,
          },
        ],
        localVariables: [],
      },
    },
    triggerCollections: [],

    // ── Custom variabelen (gevuld door trigger) ───────────────────────────
    custom_variables: {
      sc_active: {
        description: 'Actieve cue naam',
        defaultValue: '—',
        persistCurrentValue: false,
        sortOrder: 0,
      },
      sc_next: {
        description: 'Volgende cue naam',
        defaultValue: '—',
        persistCurrentValue: false,
        sortOrder: 1,
      },
      sc_done: {
        description: 'Cues afgerond',
        defaultValue: '0',
        persistCurrentValue: false,
        sortOrder: 2,
      },
      sc_total: {
        description: 'Totaal aantal cues',
        defaultValue: '0',
        persistCurrentValue: false,
        sortOrder: 3,
      },
      sc_status_raw: {
        description: 'Ruwe JSON status (intern)',
        defaultValue: '',
        persistCurrentValue: false,
        sortOrder: 4,
      },
    },
    customVariablesCollections: [],
    expressionVariables: {},
    expressionVariablesCollections: [],

    // ── Generic HTTP connectie ────────────────────────────────────────────
    instances: {
      [connId]: {
        moduleInstanceType: 'connection',
        instance_type: 'generic-http',
        label: 'ShowCaller',
        isFirstInit: false,
        config: {},
        lastUpgradeIndex: 1,
        enabled: true,
        moduleVersionId: '2.7.0',
        updatePolicy: 'stable',
        sortOrder: 0,
        secrets: {},
      },
    },
    connectionCollections: [],
    surfaces: {},
    surfaceGroups: {},
  }

  const compressed = gzipSync(Buffer.from(JSON.stringify(config), 'utf-8'))

  return new NextResponse(compressed, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="ShowCaller Companion.companionconfig"',
      'Cache-Control': 'no-store',
    },
  })
}
