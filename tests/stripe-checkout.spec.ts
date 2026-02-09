import { test, expect } from '@playwright/test'

test('checkout API returns a URL (bypass auth in test env)', async ({ request }) => {
  // This test calls the checkout API directly and uses the test-only
  // bypass header to avoid needing a real Firebase token.

  const resp = await request.post('/api/stripe/checkout', {
    headers: {
      'Content-Type': 'application/json',
      // The route will bypass auth when NODE_ENV=test and this header is set
      'x-bypass-auth': '1',
      Authorization: 'Bearer faketoken',
    },
    data: { plan: 'creator', interval: 'monthly' },
  })

  expect(resp.ok()).toBeTruthy()
  const body = await resp.json()
  expect(body).toHaveProperty('url')
  expect(typeof body.url).toBe('string')
})
