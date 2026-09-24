import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clientDownloads } from '../src/lib/clientDownloads.js'
import { deviceClients, devicePlatforms } from '../src/lib/deviceConnection.js'
import { dashboardText } from '../src/lib/dashboardText.js'

test('all client/platform combinations have HTTPS official download actions and RU/EN labels', () => {
  const repositories = { happ: '/Happ-proxy/happ-desktop/', incy: '/INCY-DEV/incy-platforms/' }
  for (const client of deviceClients) for (const platform of devicePlatforms) {
    const downloads = clientDownloads[client][platform]
    assert.ok(downloads.length > 0, `${client}/${platform}`)
    for (const download of downloads) {
      const url = new URL(download.href)
      assert.equal(url.protocol, 'https:')
      assert.equal(url.username + url.password, '')
      if (platform === 'ios' || platform === 'macos') assert.equal(url.hostname, 'apps.apple.com')
      else if (platform === 'android') assert.equal(url.hostname, 'play.google.com')
      else {
        assert.equal(url.hostname, 'github.com')
        assert.ok(url.pathname.startsWith(`${repositories[client]}releases/`))
      }
      for (const lang of ['ru', 'en']) assert.ok(dashboardText[lang].downloadLabels[download.label])
    }
  }
})

test('store IDs match the official project sources, including distinct Happ RU apps', () => {
  assert.equal(clientDownloads.happ.ios[0].href, 'https://apps.apple.com/us/app/happ-proxy-utility/id6504287215')
  assert.equal(clientDownloads.happ.ios[1].href, 'https://apps.apple.com/ru/app/happ-lite/id6799917773')
  assert.equal(clientDownloads.happ.macos[1].href, 'https://apps.apple.com/ru/app/happ-proxy-utility/id6783623643')
  assert.equal(new URL(clientDownloads.happ.android[0].href).searchParams.get('id'), 'com.happproxy')
  assert.equal(clientDownloads.incy.ios[0].href, 'https://apps.apple.com/ru/app/incy/id6756943388')
  assert.equal(clientDownloads.incy.macos[0].href, clientDownloads.incy.ios[0].href)
  assert.equal(new URL(clientDownloads.incy.android[0].href).searchParams.get('id'), 'llc.itdev.incy')
})
