const CACHE_NAME = 'contentdeck-v3.0.5'

self.addEventListener('install', () => {
  // Don't skip waiting — let the app decide when to activate
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // Always go to network for API calls; return graceful error if offline
  if (url.includes('supabase') || url.includes('openrouter.ai') || url.includes('microlink.io') || url.includes('oembed') || url.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(
        () => new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
    return
  }

  // Network-first for navigation requests (HTML pages)
  // This prevents serving stale HTML that references old JS/CSS bundles
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          )
        )
    )
    return
  }

  // Stale-while-revalidate for other assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))

      return cached || networkFetch
    })
  )
})
