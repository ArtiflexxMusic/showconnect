/**
 * GET /api/companion/download?rundownId=xxx
 *
 * Genereert een geldig, gzip-gecomprimeerd .companionconfig bestand voor
 * Bitfocus Companion 4.2.x. Importeer via Settings → Import/Export.
 *
 * Pagina bevat:
 *   Rij 0: [pageup] [◀ BACK] [▶ GO] [SKIP ▶▶] [leeg]
 *   Rij 1: [pagenum] [NOW: actieve cue] [NEXT: volgende cue] [voortgang] [leeg]
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

  const BASE       = 'https://www.cueboard.nl'
  const connId     = rnd()
  const LABEL      = 'ShowCaller'    // label van de generic-http connectie
  const ACTION_URL = `${BASE}/api/companion/action`

  // ── Hulpfuncties ─────────────────────────────────────────────────────────

  function postAction(action: 'go' | 'back' | 'skip') {
    return {
      type: 'action',
      id: rnd(),
      connectionId: connId,
      definitionId: 'post',
      options: {
        url: ACTION_URL,
        body: JSON.stringify({ action, rundownId }),
        header: 'Content-Type: application/json',
      },
      upgradeIndex: 1,
    }
  }

  function baseStyle(text: string, bgcolor: number, color = 16777215, size = 'auto') {
    return {
      text,
      textExpression: false,
      size,
      png64: null,
      alignment: 'center:center' as const,
      pngalignment: 'center:center' as const,
      color,
      bgcolor,
      show_topbar: 'default' as const,
    }
  }

  function emptyStep(down: unknown[] = []) {
    return {
      '0': {
        action_sets: { down, up: [] },
        options: { runWhileHeld: [] },
      },
    }
  }

  function actionButton(text: string, bgcolor: number, action: 'go' | 'back' | 'skip') {
    return {
      type: 'button',
      style: baseStyle(text, bgcolor),
      options: { stepProgression: 'auto', stepExpression: '', rotaryActions: false },
      feedbacks: [],
      steps: emptyStep([postAction(action)]),
      localVariables: [],
    }
  }

  function displayButton(text: string, bgcolor: number, color: number) {
    return {
      type: 'button',
      style: baseStyle(text, bgcolor, color, '14'),
      options: { stepProgression: 'auto', stepExpression: '', rotaryActions: false },
      feedbacks: [],
      steps: emptyStep(),
      localVariables: [],
    }
  }

  // ── Config object ─────────────────────────────────────────────────────────

  const config = {
    version: 9,
    type: 'full',
    companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

    // ── Pagina 1: ShowCaller layout ──────────────────────────────────────
    pages: {
      '1': {
        id: rnd(),
        name: 'ShowCaller',
        controls: {
          // Rij 0: navigatie + actieknoppen
          '0': {
            '0': { type: 'pageup' },
            '1': actionButton('◀  BACK', 0x334466, 'back'),
            '2': actionButton('▶   GO', 0x007733, 'go'),
            '3': actionButton('SKIP  ▶▶', 0x775500, 'skip'),
          },
          // Rij 1: navigatie + status displays
          '1': {
            '0': { type: 'pagenum' },
            '1': displayButton(
              `NOW\n$(${LABEL}:body_active_cue_title)`,
              0x001a0a, 0x00ff88,
            ),
            '2': displayButton(
              `NEXT\n$(${LABEL}:body_next_cue_title)`,
              0x111111, 0xaaaaaa,
            ),
            '3': displayButton(
              `$(${LABEL}:body_cues_done) / $(${LABEL}:body_cues_total)\n$(${LABEL}:body_rundown_name)`,
              0x0d0d0d, 0x666666,
            ),
          },
          '2': {
            '0': { type: 'pagedown' },
          },
        },
      },
    },

    // ── Trigger: elke seconde status pollen ──────────────────────────────
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
          {
            type: 'action',
            id: rnd(),
            connectionId: connId,
            definitionId: 'get',
            options: {
              url: `${BASE}/api/companion/status?rundownId=${rundownId}`,
              header: '',
              result_stringify: false,
              // null = automatisch JSON-velden parsen als $(ShowCaller:body_xxx)
              jsonResultDataVariable: null,
            },
            upgradeIndex: 1,
          },
        ],
        localVariables: [],
      },
    },
    triggerCollections: [],

    // ── Custom variabelen (optioneel — body_xxx vars komen van generic-http) ──
    custom_variables: {},
    customVariablesCollections: [],
    expressionVariables: {},
    expressionVariablesCollections: [],

    // ── Generic HTTP connectie ────────────────────────────────────────────
    instances: {
      [connId]: {
        moduleInstanceType: 'connection',
        instance_type: 'generic-http',
        label: LABEL,
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

  // ── Gzip comprimeren (zelfde als hoe Companion zelf exporteert) ──────────
  const json       = JSON.stringify(config)
  const compressed = gzipSync(Buffer.from(json, 'utf-8'))

  return new NextResponse(compressed, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="ShowCaller Companion.companionconfig"',
      'Cache-Control': 'no-store',
    },
  })
}
