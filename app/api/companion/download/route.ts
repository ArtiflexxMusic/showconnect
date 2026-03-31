/**
 * GET /api/companion/download?rundownId=xxx
 *
 * Genereert een kant-en-klaar .companionconfig bestand dat direct importeerbaar
 * is in Bitfocus Companion 4.x via Settings → Import/Export → Import page.
 *
 * Het bestand bevat:
 *  - Pagina 1: ShowCaller controls (GO / BACK / SKIP + actieve/volgende cue display)
 *  - Trigger: pollt elke seconde status via /api/companion/status (JSON)
 *  - Variabelen: active_cue, next_cue, cues_done, cues_total
 */

import { NextRequest, NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function randomId(): string {
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

  const BASE_URL    = 'https://www.cueboard.nl'
  const connectionId = randomId()
  const triggerId    = randomId()
  const pollActionId = randomId()
  const pollEventId  = randomId()

  // Button IDs
  const btnGoId      = randomId()
  const btnBackId    = randomId()
  const btnSkipId    = randomId()
  const btnActiveCue = randomId()
  const btnNextCue   = randomId()
  const btnProgress  = randomId()

  // Action IDs per button
  const actGoId    = randomId()
  const actBackId  = randomId()
  const actSkipId  = randomId()

  const config = {
    type: 'page',
    version: 9,
    companionBuild: '4.2.6+8823-stable-4ecdfe70ba',

    // ── Custom variabelen ──────────────────────────────────────────────────
    custom_variables: {
      sc_active_cue: {
        description: 'Actieve cue naam',
        defaultValue: '',
        persistCurrentValue: false,
        sortOrder: 0,
      },
      sc_next_cue: {
        description: 'Volgende cue naam',
        defaultValue: '',
        persistCurrentValue: false,
        sortOrder: 1,
      },
      sc_cues_done: {
        description: 'Aantal cues afgerond',
        defaultValue: '0',
        persistCurrentValue: false,
        sortOrder: 2,
      },
      sc_cues_total: {
        description: 'Totaal aantal cues',
        defaultValue: '0',
        persistCurrentValue: false,
        sortOrder: 3,
      },
      sc_rundown_name: {
        description: 'Rundown naam',
        defaultValue: '',
        persistCurrentValue: false,
        sortOrder: 4,
      },
    },

    // ── HTTP Connectie ─────────────────────────────────────────────────────
    instances: {
      [connectionId]: {
        instance_type: 'generic-http',
        label: 'ShowCaller',
        lastUpgradeIndex: 1,
        moduleVersionId: '2.7.0',
        updatePolicy: 'stable',
        sortOrder: 0,
      },
    },

    // ── Trigger: elke seconde status pollen ────────────────────────────────
    triggers: {
      [triggerId]: {
        type: 'trigger',
        options: {
          name: 'ShowCaller — Status pollen',
          enabled: true,
          sortOrder: 0,
        },
        actions: [
          // Poll JSON status
          {
            id: pollActionId,
            definitionId: 'get',
            connectionId: connectionId,
            options: {
              url: `${BASE_URL}/api/companion/status?rundownId=${rundownId}`,
              header: '',
              result_stringify: false,
              jsonResultDataVariable: null,
            },
            upgradeIndex: 1,
            type: 'action',
          },
          // Zet variabelen vanuit JSON response
          {
            id: randomId(),
            definitionId: 'custom_variable_set_expression',
            connectionId: 'internal',
            options: {
              name: 'sc_active_cue',
              expression: `$(${connectionId}:body_active_cue_title)`,
            },
            type: 'action',
          },
          {
            id: randomId(),
            definitionId: 'custom_variable_set_expression',
            connectionId: 'internal',
            options: {
              name: 'sc_next_cue',
              expression: `$(${connectionId}:body_next_cue_title)`,
            },
            type: 'action',
          },
          {
            id: randomId(),
            definitionId: 'custom_variable_set_expression',
            connectionId: 'internal',
            options: {
              name: 'sc_cues_done',
              expression: `$(${connectionId}:body_cues_done)`,
            },
            type: 'action',
          },
          {
            id: randomId(),
            definitionId: 'custom_variable_set_expression',
            connectionId: 'internal',
            options: {
              name: 'sc_cues_total',
              expression: `$(${connectionId}:body_cues_total)`,
            },
            type: 'action',
          },
          {
            id: randomId(),
            definitionId: 'custom_variable_set_expression',
            connectionId: 'internal',
            options: {
              name: 'sc_rundown_name',
              expression: `$(${connectionId}:body_rundown_name)`,
            },
            type: 'action',
          },
        ],
        condition: [],
        events: [
          {
            id: pollEventId,
            type: 'interval',
            enabled: true,
            options: { seconds: 1 },
          },
        ],
        localVariables: [],
      },
    },
    triggerCollections: [],
    customVariablesCollections: [],
    connectionCollections: [],

    // ── Pagina met knoppen ─────────────────────────────────────────────────
    pages: {
      '1': {
        name: 'ShowCaller',
        controls: {

          // ── GO (groot, groen, rij 1 midden) ───────────────────────────
          'row-0-column-2': {
            type: 'button',
            options: {
              relativeDelay: false,
              stepAutoProgress: true,
            },
            style: {
              text: 'GO',
              size: '44',
              color: 16777215,
              bgcolor: 0x00aa44,
              show_topbar: false,
              alignment: 'center:center',
              pngalignment: 'center:center',
            },
            feedbacks: [
              {
                id: randomId(),
                type: 'custom_variable_value',
                options: {
                  variable: 'sc_active_cue',
                  value: '',
                  op: 'ne',
                },
                style: {
                  bgcolor: 0x00cc55,
                },
                isInverted: false,
              },
            ],
            steps: {
              '0': {
                action_sets: {
                  down: [
                    {
                      id: actGoId,
                      definitionId: 'post',
                      connectionId: connectionId,
                      options: {
                        url: `${BASE_URL}/api/companion/action`,
                        body: JSON.stringify({ action: 'go', rundownId }),
                        header: 'Content-Type: application/json',
                      },
                      type: 'action',
                    },
                  ],
                  up: [],
                },
              },
            },
            id: btnGoId,
          },

          // ── BACK (rij 1 links) ─────────────────────────────────────────
          'row-0-column-1': {
            type: 'button',
            options: {
              relativeDelay: false,
              stepAutoProgress: true,
            },
            style: {
              text: '◀ BACK',
              size: '18',
              color: 16777215,
              bgcolor: 0x444466,
              show_topbar: false,
              alignment: 'center:center',
            },
            feedbacks: [],
            steps: {
              '0': {
                action_sets: {
                  down: [
                    {
                      id: actBackId,
                      definitionId: 'post',
                      connectionId: connectionId,
                      options: {
                        url: `${BASE_URL}/api/companion/action`,
                        body: JSON.stringify({ action: 'back', rundownId }),
                        header: 'Content-Type: application/json',
                      },
                      type: 'action',
                    },
                  ],
                  up: [],
                },
              },
            },
            id: btnBackId,
          },

          // ── SKIP (rij 1 rechts) ────────────────────────────────────────
          'row-0-column-3': {
            type: 'button',
            options: {
              relativeDelay: false,
              stepAutoProgress: true,
            },
            style: {
              text: 'SKIP ▶▶',
              size: '18',
              color: 16777215,
              bgcolor: 0x886600,
              show_topbar: false,
              alignment: 'center:center',
            },
            feedbacks: [],
            steps: {
              '0': {
                action_sets: {
                  down: [
                    {
                      id: actSkipId,
                      definitionId: 'post',
                      connectionId: connectionId,
                      options: {
                        url: `${BASE_URL}/api/companion/action`,
                        body: JSON.stringify({ action: 'skip', rundownId }),
                        header: 'Content-Type: application/json',
                      },
                      type: 'action',
                    },
                  ],
                  up: [],
                },
              },
            },
            id: btnSkipId,
          },

          // ── Actieve cue display (rij 2, breed) ────────────────────────
          'row-1-column-1': {
            type: 'button',
            options: { relativeDelay: false, stepAutoProgress: true },
            style: {
              text: `NOW\n$(custom:sc_active_cue)`,
              size: '14',
              color: 0x00ff88,
              bgcolor: 0x001a0d,
              show_topbar: false,
              alignment: 'center:center',
            },
            feedbacks: [],
            steps: { '0': { action_sets: { down: [], up: [] } } },
            id: btnActiveCue,
          },

          // ── Volgende cue display (rij 2 rechts) ───────────────────────
          'row-1-column-3': {
            type: 'button',
            options: { relativeDelay: false, stepAutoProgress: true },
            style: {
              text: `NEXT\n$(custom:sc_next_cue)`,
              size: '14',
              color: 0xaaaaaa,
              bgcolor: 0x111111,
              show_topbar: false,
              alignment: 'center:center',
            },
            feedbacks: [],
            steps: { '0': { action_sets: { down: [], up: [] } } },
            id: btnNextCue,
          },

          // ── Progress display (rij 2 midden) ───────────────────────────
          'row-1-column-2': {
            type: 'button',
            options: { relativeDelay: false, stepAutoProgress: true },
            style: {
              text: `$(custom:sc_cues_done) / $(custom:sc_cues_total)\n$(custom:sc_rundown_name)`,
              size: '14',
              color: 0x888888,
              bgcolor: 0x0d0d0d,
              show_topbar: false,
              alignment: 'center:center',
            },
            feedbacks: [],
            steps: { '0': { action_sets: { down: [], up: [] } } },
            id: btnProgress,
          },
        },
      },
    },
  }

  const json = JSON.stringify(config, null, '\t')

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="ShowCaller Companion.companionconfig"',
      'Cache-Control': 'no-store',
    },
  })
}
