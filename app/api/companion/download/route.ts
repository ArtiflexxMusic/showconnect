/**
 * GET /api/companion/download?rundownId=xxx
 *
 * Genereert een kant-en-klaar .companionconfig bestand voor Bitfocus Companion 4.x.
 * Importeren via: Settings → Import/Export → Import full config (of Import page).
 *
 * Bevat:
 *  - Generic HTTP connection "ShowCaller"
 *  - Trigger: elke seconde status pollen via /api/companion/status
 *  - Pagina 1: GO / BACK / SKIP knoppen + NOW / NEXT / PROGRESS displays
 */

import { NextRequest, NextResponse } from 'next/server'

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

  const BASE = 'https://www.cueboard.nl'
  const connId = rnd()

  // Helper: maak een HTTP POST action voor go/back/skip
  function actionPost(action: 'go' | 'back' | 'skip') {
    return {
      id: rnd(),
      definitionId: 'post',
      connectionId: connId,
      options: {
        url: `${BASE}/api/companion/action`,
        body: JSON.stringify({ action, rundownId }),
        header: 'Content-Type: application/json',
      },
      delay: 0,
      type: 'action',
    }
  }

  // Helper: maak een display-only knop (geen actie)
  function displayButton(text: string, bgcolor: number, textColor: number, row: number, col: number) {
    return [`${row}/${col}`, {
      type: 'button',
      options: { relativeDelay: false, stepAutoProgress: true },
      style: {
        text,
        size: '14',
        color: textColor,
        bgcolor,
        show_topbar: false,
        alignment: 'center:center',
        pngalignment: 'center:center',
        png: null,
        latch: false,
      },
      feedbacks: [],
      steps: {
        '0': {
          action_sets: { down: [], up: [] },
          options: { runWhileHeld: [] },
        },
      },
    }]
  }

  // Helper: maak een actie-knop
  function actionButton(
    text: string, bgcolor: number, action: 'go' | 'back' | 'skip',
    row: number, col: number,
  ) {
    return [`${row}/${col}`, {
      type: 'button',
      options: { relativeDelay: false, stepAutoProgress: true },
      style: {
        text,
        size: '18',
        color: 16777215, // wit
        bgcolor,
        show_topbar: false,
        alignment: 'center:center',
        pngalignment: 'center:center',
        png: null,
        latch: false,
      },
      feedbacks: [],
      steps: {
        '0': {
          action_sets: {
            down: [actionPost(action)],
            up: [],
          },
          options: { runWhileHeld: [] },
        },
      },
    }]
  }

  const config = {
    type: 'full',
    version: 9,
    companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

    // ── HTTP Connection ────────────────────────────────────────────────────
    instances: {
      [connId]: {
        instance_type: 'generic-http',
        label: 'ShowCaller',
        lastUpgradeIndex: 1,
        moduleVersionId: '2.7.0',
        updatePolicy: 'stable',
        sortOrder: 0,
        config: {},
        enabled: true,
      },
    },
    connectionCollections: [],

    // ── Custom variabelen (gevuld door polling trigger) ────────────────────
    custom_variables: {
      sc_active: {
        description: 'Actieve cue',
        defaultValue: '—',
        persistCurrentValue: false,
        sortOrder: 0,
      },
      sc_next: {
        description: 'Volgende cue',
        defaultValue: '—',
        persistCurrentValue: false,
        sortOrder: 1,
      },
      sc_progress: {
        description: 'Cue voortgang (bijv. 3 / 12)',
        defaultValue: '0 / 0',
        persistCurrentValue: false,
        sortOrder: 2,
      },
    },
    customVariablesCollections: [],

    // ── Trigger: pollt elke seconde de status ──────────────────────────────
    triggers: {
      [rnd()]: {
        type: 'trigger',
        options: {
          name: 'ShowCaller — Status pollen (1s)',
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
          // Haal status op — response-velden zijn beschikbaar als
          // $(ShowCaller:body_active_cue_title) etc.
          {
            id: rnd(),
            definitionId: 'get',
            connectionId: connId,
            options: {
              url: `${BASE}/api/companion/status?rundownId=${rundownId}`,
              header: '',
              result_stringify: false,
              jsonResultDataVariable: null,
            },
            upgradeIndex: 1,
            delay: 0,
            type: 'action',
          },
        ],
        localVariables: [],
      },
    },
    triggerCollections: [],

    // ── Pagina 1: ShowCaller knoppen ───────────────────────────────────────
    pages: {
      '1': {
        name: 'ShowCaller',
        controls: Object.fromEntries([
          // Rij 0: BACK | GO | SKIP
          actionButton('◀ BACK', 0x334466, 'back', 0, 0),
          actionButton('▶  GO', 0x007733, 'go',   0, 1),
          actionButton('SKIP ▶▶', 0x775500, 'skip', 0, 2),

          // Rij 1: NOW display | NEXT display | PROGRESS
          displayButton(
            `NOW\n$(${connId}:body_active_cue_title)`,
            0x001a0a, 0x00ff88, 1, 0,
          ),
          displayButton(
            `NEXT\n$(${connId}:body_next_cue_title)`,
            0x111111, 0xaaaaaa, 1, 1,
          ),
          displayButton(
            `$(${connId}:body_cues_done) / $(${connId}:body_cues_total)\n$(${connId}:body_rundown_name)`,
            0x0d0d0d, 0x666666, 1, 2,
          ),
        ]),
      },
    },
  }

  return new NextResponse(JSON.stringify(config, null, '\t'), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="ShowCaller Companion.companionconfig"',
      'Cache-Control': 'no-store',
    },
  })
}
