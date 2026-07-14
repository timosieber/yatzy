// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Railway build configuration', () => {
  it('lets Railpack install dependencies exactly once', async () => {
    const config = JSON.parse(await readFile(new URL('../railway.json', import.meta.url), 'utf8'))

    expect(config.build.builder).toBe('RAILPACK')
    expect(config.build.buildCommand).toBe('npm run build')
  })
})
