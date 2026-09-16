/*
  Добрий господар
  Service Worker — тимчасово без кешування сторінок.

  Поки сайт активно допрацьовується,
  браузер має завжди отримувати актуальні
  HTML, CSS та JavaScript з GitHub Pages.
*/

const DH_SW_VERSION = '2026-09-16-1';


self.addEventListener(
  'install',
  () => {

    self.skipWaiting();
  }
);


self.addEventListener(
  'activate',
  event => {

    event.waitUntil(
      caches
        .keys()
        .then(
          keys =>
            Promise.all(
              keys.map(
                key =>
                  caches.delete(
                    key
                  )
              )
            )
        )
        .then(
          () =>
            self.clients.claim()
        )
    );
  }
);


/*
  Fetch навмисно НЕ перехоплюємо.

  Тобто:
  - index.html
  - catalog.html
  - contacts.html
  - checkout.html
  - app.js
  - styles.css

  завжди завантажуються у свіжій версії.

  Коли сайт повністю доробимо,
  нормальний PWA-кеш повернемо.
*/
