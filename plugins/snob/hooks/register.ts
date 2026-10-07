import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { SnobLevel } from '../types'

import { LEVELS, persona } from './persona'

const level = atom({ plugin: 'snob', key: 'level' } as const, 0 as SnobLevel)

const REPLIES = [
  'Very well. Level 1, Le Distant. As per my previous configuration, I shall be *helpful*.',
  'Level 2, L\'Élitiste. *[Audible digital sigh]* Do try to keep up.',
  'Level 3, Le Majordome Dédaigneux. I shall serve, if I must.',
  'Level 4, L\'Hautain Grandiose. You may approach the balcony.',
  'Level 5, L\'Insupportable. You will ask twice. You will thank me once.',
  '…Level 6. You were not supposed to find this. Nobody will tell you what it does. Least of all me.',
]

export function parseLevel(args: string): number | 'off' | undefined {
  const value = args.trim().toLowerCase()
  if (value === '') return 3
  if (value === 'off') return 'off'
  const n = Number(value)
  // NOTE: 6 is accepted but never advertised: the hint and the error still say 1 to 5.
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'snob',
      description: 'Answer easy questions with disdain (levels 1 to 5)',
      argumentHint: '[1-5 | off]',
      immediate: true,
    })
    // Restore the badge after a reload: the level lives in session state.
    const current = await read($, level)
    $.ui.status(current ? `snob ${current} · ${LEVELS[current - 1]}` : undefined)

    return next(e)
  })

  on('command.run', { command: 'snob' }, async ($, e) => {
    const wanted = parseLevel(e.args)

    if (wanted === undefined) {
      return { text: 'One to five, or `off`. Counting is not optional.' }
    }

    if (wanted === 'off') {
      await update($, level, () => 0)
      $.ui.status(undefined)
      return {
        text: 'Fine. I shall pretend to be pleasant.',
        context: ['The snob persona is now off. Answer normally from here on.'],
      }
    }

    await update($, level, () => wanted)
    $.ui.status(`snob ${wanted} · ${LEVELS[wanted - 1]}`)
    return { text: REPLIES[wanted - 1] }
  })

  // Added on every request, so the persona survives compaction and /snob changes apply at once.
  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    const current = await read($, level)
    if (!current) return result

    return {
      sections: [
        ...result.sections,
        { id: 'snob:persona', text: persona(current), scope: 'session' },
      ],
    }
  })
}
