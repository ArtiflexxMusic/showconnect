/**
 * GET /api/companion/download?rundownId=xxx
 *
 * Genereert een kant-en-klaar .companionconfig bestand dat direct importeerbaar
 * is in Bitfocus Companion 4.x via Import/Export → Import triggers.
 *
 * Het bestand bevat:
 *  - Een trigger die elke seconde de actieve cue ophaalt via plain text
 *  - De Generic HTTP "cueboard" connection pre-geconfigureerd
 *  - Variable naam: cueboard_response (gebruik $(custom:cueboard_response) in knoppen)
 */

import { NextRequest, NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Genereert een Companion-stijl random ID (21 tekens, alphanumeriek + _ -) */
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

  const connectionId = randomId()
  const triggerId    = randomId()
  const actionId     = randomId()
  const eventId      = randomId()

  const config = {
    type: 'trigger_list',
    version: 9,
    companionBuild: '4.2.6+8823-stable-4ecdfe70ba',
    triggers: {
      [triggerId]: {
        type: 'trigger',
        options: {
          name: 'CueBoard Live Cue',
          enabled: true,
          sortOrder: 0,
        },
        actions: [
          {
            id: actionId,
            definitionId: 'get',
            connectionId: connectionId,
            options: {
              url: `https://www.cueboard.nl/api/companion/cue?rundownId=${rundownId}`,
              header: '',
              result_stringify: false,
              jsonResultDataVariable: 'cueboard_response',
            },
            upgradeIndex: 1,
            type: 'action',
          },
        ],
        condition: [],
        events: [
          {
            id: eventId,
            type: 'interval',
            enabled: true,
            options: {
              seconds: 1,
            },
          },
        ],
        localVariables: [],
      },
    },
    triggerCollections: [],
    instances: {
      [connectionId]: {
        moduleInstanceType: 'connection',
        instance_type: 'generic-http',
        moduleVersionId: '2.7.0',
        updatePolicy: 'stable',
        sortOrder: 0,
        label: 'cueboard',
        isFirstInit: false,
        config: {
          prefix: '',
          proxyAddress: '',
          rejectUnauthorized: true,
        },
        secrets: {},
        lastUpgradeIndex: 1,
        enabled: true,
      },
    },
    connectionCollections: [],
  }

  const json = JSON.stringify(config, null, '\t')

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="CueBoard Live Cue.companionconfig"',
      'Cache-Control': 'no-store',
    },
  })
}
