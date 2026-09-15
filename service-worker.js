const CACHE_NAME = 'dobryi-hospodar-v2-2026-09-15';

const APP_SHELL = [
  './',
  './index.html',
  './catalog.html',
  './category.html',
  './cart.html',
  './checkout.html',
  './success.html',
  './how-to-order.html',
  './about.html',
  './contacts.html',
  './account.html',
  './styles.css',
  './app.js',
  './manifest.json'
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  'install',
  (event) => {

    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(
          (cache) =>
            cache.addAll(APP_SHELL)
        )
        .then(
          () =>
            self.skipWaiting()
        )
    );

  }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  'activate',
  (event) => {

    event.waitUntil(
      Promise.all([
        caches
          .keys()
          .then(
            (keys) =>
              Promise.all(
                keys
                  .filter(
                    (key) =>
                      key !== CACHE_NAME
                  )
                  .map(
                    (key) =>
                      caches.delete(key)
                  )
              )
          ),

        self.clients.claim()
      ])
    );

  }
);


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
  'fetch',
  (event) => {

    const request =
      event.request;


    /*
     * Не кешуємо POST.
     */
    if (
      request.method !== 'GET'
    ) {
      return;
    }


    const url =
      new URL(
        request.url
      );


    /*
     * Google Apps Script API
     * завжди беремо з мережі,
     * щоб каталог не застарівав
     * через Service Worker.
     */
    if (
      url.hostname ===
        'script.google.com' ||

      url.hostname ===
        'script.googleusercontent.com'
    ) {
      event.respondWith(
        fetch(request)
      );

      return;
    }


    /*
     * HTML:
     * спочатку мережа,
     * потім кеш.
     *
     * Так користувач швидше
     * отримує нову версію сторінок.
     */
    if (
      request.mode === 'navigate'
    ) {

      event.respondWith(
        networkFirst(
          request
        )
      );

      return;
    }


    /*
     * JS / CSS / manifest:
     * також network-first,
     * щоб оновлення сайту
     * не зависали у старому кеші.
     */
    if (
      request.destination ===
        'script' ||

      request.destination ===
        'style' ||

      request.destination ===
        'manifest'
    ) {

      event.respondWith(
        networkFirst(
          request
        )
      );

      return;
    }


    /*
     * Інші статичні файли:
     * cache-first.
     */
    event.respondWith(
      cacheFirst(
        request
      )
    );

  }
);


/* =========================================================
   NETWORK FIRST
   ========================================================= */

async function networkFirst(
  request
) {

  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok &&
      response.type !==
        'opaque'
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      cache.put(
        request,
        response.clone()
      );
    }


    return response;

  } catch (_) {

    const cached =
      await caches.match(
        request
      );


    if (cached) {
      return cached;
    }


    /*
     * Якщо відкривалась сторінка,
     * а точного кешу немає —
     * пробуємо головну.
     */
    if (
      request.mode ===
      'navigate'
    ) {

      const fallback =
        await caches.match(
          './index.html'
        );


      if (fallback) {
        return fallback;
      }
    }


    throw _;
  }
}


/* =========================================================
   CACHE FIRST
   ========================================================= */

async function cacheFirst(
  request
) {

  const cached =
    await caches.match(
      request
    );


  if (cached) {
    return cached;
  }


  const response =
    await fetch(
      request
    );


  if (
    response &&
    response.ok &&
    response.type !==
      'opaque'
  ) {

    const cache =
      await caches.open(
        CACHE_NAME
      );


    cache.put(
      request,
      response.clone()
    );
  }


  return response;
}
