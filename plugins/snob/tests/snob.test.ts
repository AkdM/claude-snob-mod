import type { On } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import { parseLevel } from '../hooks/register'

type Engine = Parameters<TestBody>[0]

const FACTS = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] }

// The kit has no engine prompt beneath the plugin: stand in for it with one section.
const engineBeneath = (on: On) =>
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'intro', scope: 'session' }] }))

const snob = ($: Engine, args: string) =>
  $.command.run({
    command: 'snob',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 120 },
  })

const personaOf = async ($: Engine) =>
  (await $.prompt.compose(FACTS)).sections.find(s => s.id === 'snob:persona')

describe('parseLevel', () => {
  test('defaults to 3, accepts 1 to 6 and off, rejects the rest', async () => {
    expect(parseLevel('')).toBe(3)
    expect(parseLevel(' 5 ')).toBe(5)
    expect(parseLevel('OFF')).toBe('off')
    expect(parseLevel('0')).toBe(undefined)
    expect(parseLevel('6')).toBe(6)
    expect(parseLevel('7')).toBe(undefined)
    expect(parseLevel('2.5')).toBe(undefined)
    expect(parseLevel('very')).toBe(undefined)
  })
})

describe('/snob', () => {
  test('adds the persona at the chosen level, and off removes it', async ($, on) => {
    engineBeneath(on)
    expect(await personaOf($)).toBe(undefined)

    await snob($, '4')
    const section = await personaOf($)
    expect(section?.text).toMatch(/level 4, L'Hautain Grandiose/)
    expect(section?.scope).toBe('session')

    await snob($, 'off')
    expect(await personaOf($)).toBe(undefined)
  })

  test('a bad level changes nothing and says so', async ($, on) => {
    engineBeneath(on)
    await snob($, '2')
    const { text } = await snob($, 'eleven')
    expect(text).toMatch(/One to five/)
    expect((await personaOf($))?.text).toMatch(/level 2/)
  })

  test('the secret level keeps its name out of the reply', async ($, on) => {
    engineBeneath(on)
    const { text } = await snob($, '6')
    expect(text).toMatch(/not supposed to find this/)
    expect(text).not.toMatch(/Bienveillant/)
    expect((await personaOf($))?.text).toMatch(/Le Bienveillant/)
  })
})
