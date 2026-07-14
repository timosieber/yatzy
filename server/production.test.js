// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { MemoryGameRepository } from './repositories/memoryRepository.js'

describe('production client serving', () => {
  let staticDirectory

  afterEach(async () => {
    if (staticDirectory) await rm(staticDirectory, { recursive: true, force: true })
  })

  it('serves the built client and preserves JSON errors below /api', async () => {
    staticDirectory = await mkdtemp(join(tmpdir(), 'wuerfelblock-'))
    await writeFile(join(staticDirectory, 'index.html'), '<main>Würfelblock</main>')
    const app = createApp({
      repository: new MemoryGameRepository(),
      serveClient: true,
      staticDirectory,
    })

    const page = await request(app).get('/verlauf').set('Accept', 'text/html')
    const missingApi = await request(app).get('/api/unbekannt')

    expect(page.status).toBe(200)
    expect(page.text).toContain('Würfelblock')
    expect(missingApi.status).toBe(404)
    expect(missingApi.body.error.code).toBe('NOT_FOUND')
  })
})
