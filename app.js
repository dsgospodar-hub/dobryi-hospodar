'use strict';

const DH = (() => {
  const API_URL =
    'https://script.google.com/macros/s/AKfycbytW-z1l2ZzhOjbgpJrknNiRb-KnwS0gE1KERnvVMux37g4YGbWgJpYuj53heuthsJi/exec';

  const CART_KEY = 'dobryi_hospodar_cart_v2';
  const STORE_CACHE_KEY = 'dobryi_hospodar_store_v2';
  const STORE_CACHE_TTL = 5 * 60 * 1000;

  const state = {
    store: null,
    cart: loadCart(),
    modalProductId: null
  };

  const qs = (sel, root = document) =>
    root.querySelector(sel);

  const qsa = (sel, root = document) =>
    Array.from(root.querySelectorAll(sel));

  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (ch) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[ch]
    );


  /* =========================================================
     ФОРМАТУВАННЯ
     ========================================================= */

  function money(value) {
    const n = Number(value || 0);

    return n.toLocaleString('uk-UA', {
      minimumFractionDigits:
        Number.isInteger(n) ? 0 : 2,

      maximumFractionDigits: 2
    });
  }


  function formatDate(iso) {
    if (!iso) return '';

    const d =
      new Date(
        `${iso}T12:00:00`
      );

    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return iso;
    }

    return d.toLocaleDateString(
      'uk-UA',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }
    );
  }


  function normalizePhone(value) {
    return String(
      value || ''
    ).replace(
      /[^\d+]/g,
      ''
    );
  }


  /* =========================================================
     КОШИК
     ========================================================= */

  function loadCart() {
    try {
      const raw =
        localStorage.getItem(
          CART_KEY
        );

      return raw
        ? JSON.parse(raw)
        : [];

    } catch (_) {
      return [];
    }
  }


  function saveCart() {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify(
        state.cart
      )
    );

    updateCartBadges();
  }


  function updateCartBadges() {
    const count =
      state.cart.length;

    qsa(
      '[data-cart-count]'
    ).forEach(
      (el) => {
        el.textContent =
          count;

        el.hidden =
          count === 0;
      }
    );
  }


  /* =========================================================
     JSONP — ЧИТАННЯ GOOGLE APPS SCRIPT
     ========================================================= */

  function jsonp(
    url,
    timeoutMs = 15000
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const callback =
          `dhCallback_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;

        const script =
          document.createElement(
            'script'
          );

        let finished =
          false;


        const cleanup = () => {
          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(
            timer
          );

          script.remove();

          try {
            delete window[
              callback
            ];
          } catch (_) {
            window[
              callback
            ] = undefined;
          }
        };


        window[
          callback
        ] = (data) => {
          cleanup();
          resolve(data);
        };


        script.onerror =
          () => {

            cleanup();

            reject(
              new Error(
                'Не вдалося зв’язатися з каталогом.'
              )
            );
          };


        const timer =
          setTimeout(
            () => {

              cleanup();

              reject(
                new Error(
                  'Каталог завантажується надто довго. Спробуйте ще раз.'
                )
              );
            },
            timeoutMs
          );


        const sep =
          url.includes('?')
            ? '&'
            : '?';


        script.src =
          `${url}${sep}callback=${encodeURIComponent(
            callback
          )}`;


        document.head.appendChild(
          script
        );
      }
    );
  }


  /* =========================================================
     ЗАВАНТАЖЕННЯ КАТАЛОГУ
     ========================================================= */

  async function loadStore(
    force = false
  ) {

    if (!force) {
      try {
        const cached =
          JSON.parse(
            localStorage.getItem(
              STORE_CACHE_KEY
            ) || 'null'
          );


        if (
          cached &&
          cached.savedAt &&
          Date.now() -
            cached.savedAt <
            STORE_CACHE_TTL &&
          cached.data
        ) {

          state.store =
            cached.data;

          return state.store;
        }

      } catch (_) {
      }
    }


    const response =
      await jsonp(
        `${API_URL}?action=store${
          force
            ? '&nocache=1'
            : ''
        }`
      );


    if (
      !response ||
      response.ok !== true ||
      !response.data
    ) {

      throw new Error(
        response?.error ||
          'Сервер не повернув каталог.'
      );
    }


    state.store =
      response.data;


    localStorage.setItem(
      STORE_CACHE_KEY,
      JSON.stringify({
        savedAt:
          Date.now(),

        data:
          state.store
      })
    );


    return state.store;
  }


  /* =========================================================
     ДОСТУП ДО ДАНИХ
     ========================================================= */

  function settings() {
    return (
      state.store
        ?.settings ||
      {}
    );
  }


  function products() {
    return Array.isArray(
      state.store
        ?.products
    )
      ? state.store
          .products
      : [];
  }


  function categories() {
    return Array.isArray(
      state.store
        ?.categories
    )
      ? state.store
          .categories
      : [];
  }


  function findProduct(
    id
  ) {
    return (
      products().find(
        (p) =>
          p.id === id
      ) ||
      null
    );
  }


  /* =========================================================
     КАТЕГОРІЇ
     ========================================================= */

  function categorySlug(
    category
  ) {
    return (
      category.designCode ||
      category.slug ||
      ''
    );
  }


  function categoryIcon(
    slug
  ) {

    return (
      {
        meat: '🥩',
        fish: '🐟',
        bakery: '🥐',
        semi: '🥟',
        feed: '🌾'
      }[slug] ||
      '🛒'
    );
  }


  /* =========================================================
     ЦІНА
     ========================================================= */

  function effectivePrice(
    product
  ) {

    const p =
      Number(
        product.effectivePrice ||
        0
      );


    if (p > 0) {
      return p;
    }


    if (
      product.siteDiscountActive &&
      Number(
        product.sitePrice
      ) > 0
    ) {

      return Number(
        product.sitePrice
      );
    }


    return Number(
      product.storePrice ||
      0
    );
  }


  function priceHtml(
    product
  ) {

    const main =
      effectivePrice(
        product
      );


    const discount =
      Boolean(
        product.siteDiscountActive
      ) &&

      Number(
        product.sitePrice
      ) > 0 &&

      Number(
        product.sitePrice
      ) <
        Number(
          product.storePrice
        );


    const unit =
      esc(
        product.unit ||
        ''
      );


    if (discount) {

      return `
        <div class="dh-price-line">

          <span class="dh-old-price">
            ${money(
              product.storePrice
            )} грн/${unit}
          </span>

          <strong class="dh-price">
            ${money(
              main
            )} грн/${unit}
          </strong>

        </div>

        <div class="dh-site-price-note">
          Ціна при замовленні на сайті
        </div>
      `;
    }


    return `
      <div class="dh-price-line">

        <strong class="dh-price">
          ${money(
            main
          )} грн/${unit}
        </strong>

      </div>
    `;
  }


  /* =========================================================
     ДАТА ОТРИМАННЯ
     ========================================================= */

  function pickupHtml(
    product
  ) {

    if (
      product.nextPickupDate
    ) {

      let html =
        `<div>
          <strong>
            Найближче отримання:
          </strong>
          ${esc(
            formatDate(
              product.nextPickupDate
            )
          )}
        </div>`;


      if (
        product.pickupWindow
      ) {

        html +=
          `<div>
            Видача:
            ${esc(
              product.pickupWindow
            )}
          </div>`;
      }


      if (
        product.orderDeadlineText
      ) {

        html +=
          `<div class="dh-muted">
            Замовити до:
            ${esc(
              product.orderDeadlineText
            )}
          </div>`;
      }


      return html;
    }


    if (
      String(
        product.status ||
        ''
      )
        .toLowerCase()
        .includes(
          'наяв'
        )
    ) {

      return `
        <div>
          <strong>
            В наявності.
          </strong>
          Дату самовивозу підтвердимо.
        </div>
      `;
    }


    return `
      <div>
        Дату отримання підтвердимо після замовлення.
      </div>
    `;
  }


  /* =========================================================
     ФОТО ТОВАРУ
     ========================================================= */

  function imageHtml(
    product
  ) {

    if (
      product.photo1
    ) {

      return `
        <img
          src="${esc(
            product.photo1
          )}"
          alt="${esc(
            product.name
          )}"
          loading="lazy"
        >
      `;
    }


    const category =
      categories().find(
        (c) =>
          c.name ===
          product.category
      );


    return `
      <span class="dh-product-placeholder">
        ${categoryIcon(
          categorySlug(
            category ||
            {}
          )
        )}
      </span>
    `;
  }


  /* =========================================================
     ВИВЕДЕННЯ КАТЕГОРІЙ
     ========================================================= */

  function renderCategories(
    target
  ) {

    if (!target) {
      return;
    }


    target.innerHTML =
      categories()
        .map(
          (category) => {

            const slug =
              categorySlug(
                category
              );


            return `
              <a
                class="dh-category-card"
                href="category.html?c=${encodeURIComponent(
                  slug
                )}"
              >

                <div class="dh-category-icon">
                  ${categoryIcon(
                    slug
                  )}
                </div>

                <div>

                  <h3>
                    ${esc(
                      category.name
                    )}
                  </h3>

                  <p>
                    ${esc(
                      category.description ||
                      ''
                    )}
                  </p>

                </div>

              </a>
            `;
          }
        )
        .join('');
  }


  /* =========================================================
     КАРТКА ТОВАРУ
     ========================================================= */

  function productCard(
    product
  ) {

    return `
      <article class="dh-product-card">

        <button
          class="dh-product-image"
          type="button"
          data-open-product="${esc(
            product.id
          )}"
        >

          ${imageHtml(
            product
          )}

        </button>


        <div class="dh-product-body">

          <div class="dh-product-status">
            ${esc(
              product.status ||
              ''
            )}
          </div>


          <h3>
            ${esc(
              product.name
            )}
          </h3>


          ${priceHtml(
            product
          )}


          <div class="dh-pickup-box">
            ${pickupHtml(
              product
            )}
          </div>


          <button
            class="dh-primary-btn"
            type="button"
            data-open-product="${esc(
              product.id
            )}"
          >
            Обрати
          </button>

        </div>

      </article>
    `;
  }


  function renderProducts(
    target,
    list
  ) {

    if (!target) {
      return;
    }


    if (!list.length) {

      target.innerHTML =
        `
          <div class="dh-empty">
            У цьому розділі поки немає доступних товарів.
          </div>
        `;

      return;
    }


    target.innerHTML =
      list
        .map(
          productCard
        )
        .join('');
  }


  function bindProductOpeners(
    root = document
  ) {

    qsa(
      '[data-open-product]',
      root
    ).forEach(
      (btn) => {

        btn.addEventListener(
          'click',
          () =>
            openProductModal(
              btn.dataset.openProduct
            )
        );
      }
    );
  }


  /* =========================================================
     ВІКНО ТОВАРУ
     ========================================================= */

  function ensureModal() {

    let modal =
      qs(
        '#dhProductModal'
      );


    if (modal) {
      return modal;
    }


    modal =
      document.createElement(
        'dialog'
      );


    modal.id =
      'dhProductModal';


    modal.className =
      'dh-modal';


    modal.innerHTML =
      `
        <div
          id="dhProductModalContent"
        ></div>
      `;


    document.body.appendChild(
      modal
    );


    modal.addEventListener(
      'click',
      (e) => {

        if (
          e.target ===
          modal
        ) {

          modal.close();
        }
      }
    );


    return modal;
  }


  function openProductModal(
    productId
  ) {

    const product =
      findProduct(
        productId
      );


    if (!product) {
      return;
    }


    state.modalProductId =
      productId;


    const modal =
      ensureModal();


    const content =
      qs(
        '#dhProductModalContent',
        modal
      );


    const weightModel =
      String(
        product.weightModel ||
        ''
      )
        .toLowerCase();


    const isWhole =
      weightModel.includes(
        'ціла'
      ) ||
      weightModel.includes(
        'тушка'
      );


    const approxUnitWeight =
      Number(
        product.approxUnitWeight ||
        0
      );


    /*
     * Якщо ми знаємо середню вагу тушки,
     * покупець обирає кількість тушок.
     *
     * Якщо вага тушки ще не внесена,
     * поки працюємо по бажаних кг.
     */
    const wholeWithKnownWeight =
      isWhole &&
      approxUnitWeight > 0;


    const initialQty =
      wholeWithKnownWeight
        ? 1
        : Number(
            product.minQty ||
            product.step ||
            1
          );


    content.innerHTML =
      `
        <div class="dh-modal-head">

          <h2>
            ${esc(
              product.name
            )}
          </h2>

          <button
            type="button"
            class="dh-modal-close"
            aria-label="Закрити"
          >
            ×
          </button>

        </div>


        <div class="dh-modal-grid">

          <div class="dh-modal-image">

            ${imageHtml(
              product
            )}

          </div>


          <div>

            <p class="dh-muted">

              ${esc(
                product.description ||
                ''
              )}

            </p>


            ${priceHtml(
              product
            )}


            <div class="dh-pickup-box">

              ${pickupHtml(
                product
              )}

            </div>


            ${
              isWhole
                ? `
                  <div class="dh-info-box">

                    Товар відпускається цілими
                    тушками/одиницями.

                    ${
                      approxUnitWeight > 0
                        ? `
                          Орієнтовна вага
                          1 одиниці:
                          ≈
                          ${money(
                            approxUnitWeight
                          )}
                          кг.
                        `
                        : `
                          Точну кількість
                          і вагу підтвердимо
                          під час комплектації.
                        `
                    }

                  </div>
                `
                : ''
            }


            ${
              weightModel.includes(
                'приблиз'
              )
                ? `
                  <div class="dh-info-box">

                    Фактична вага може
                    трохи відрізнятися.

                    Остаточна сума буде
                    відома після зважування.

                  </div>
                `
                : ''
            }


            <div class="dh-qty-row">

              <button
                type="button"
                class="dh-qty-btn"
                data-qty-minus
              >
                −
              </button>


              <strong
                data-qty-value
              ></strong>


              <button
                type="button"
                class="dh-qty-btn"
                data-qty-plus
              >
                +
              </button>


              <span
                class="dh-estimate"
                data-estimate
              ></span>

            </div>


            ${
              product.allowWeightPreference
                ? `
                  <fieldset class="dh-fieldset">

                    <legend>
                      Якщо точної ваги не буде:
                    </legend>


                    <label>

                      <input
                        type="radio"
                        name="dhWeightPreference"
                        value="Менше"
                      >

                      Краще трохи менше

                    </label>


                    <label>

                      <input
                        type="radio"
                        name="dhWeightPreference"
                        value="Більше"
                      >

                      Краще трохи більше

                    </label>


                    <label>

                      <input
                        type="radio"
                        name="dhWeightPreference"
                        value="Найближча вага"
                        checked
                      >

                      Найближча можлива вага

                    </label>

                  </fieldset>
                `
                : ''
            }


            ${
              product.allowWish
                ? `
                  <label class="dh-field">

                    <span>
                      Щось додати до побажання?
                    </span>

                    <textarea
                      data-wish
                      maxlength="500"
                      placeholder="${esc(
                        product.wishHint ||
                        'Напишіть побажання до цього товару'
                      )}"
                    ></textarea>

                  </label>
                `
                : ''
            }


            <button
              type="button"
              class="dh-primary-btn dh-wide"
              data-add-to-cart
            >
              Додати до замовлення
            </button>

          </div>

        </div>


        <div
          data-related
        ></div>
      `;


    const step =
      wholeWithKnownWeight
        ? 1
        : Number(
            product.step ||
            1
          );


    const min =
      wholeWithKnownWeight
        ? 1
        : Number(
            product.minQty ||
            step ||
            1
          );


    let qty =
      initialQty;


    const qtyValue =
      qs(
        '[data-qty-value]',
        content
      );


    const estimate =
      qs(
        '[data-estimate]',
        content
      );


    const updateQty = () => {

      if (
        wholeWithKnownWeight
      ) {

        qtyValue.textContent =
          `${qty} ${
            qty === 1
              ? 'тушка'
              : 'тушки'
          }`;


        estimate.textContent =
          `≈ ${money(
            qty *
            approxUnitWeight *
            effectivePrice(
              product
            )
          )} грн`;

      } else {

        qtyValue.textContent =
          `${money(
            qty
          )} ${
            product.unit ||
            ''
          }`;


        estimate.textContent =
          `≈ ${money(
            qty *
            effectivePrice(
              product
            )
          )} грн`;
      }
    };


    qs(
      '[data-qty-minus]',
      content
    ).addEventListener(
      'click',
      () => {

        qty =
          Math.max(
            min,
            Number(
              (
                qty -
                step
              ).toFixed(3)
            )
          );

        updateQty();
      }
    );


    qs(
      '[data-qty-plus]',
      content
    ).addEventListener(
      'click',
      () => {

        qty =
          Number(
            (
              qty +
              step
            ).toFixed(3)
          );

        updateQty();
      }
    );


    qs(
      '.dh-modal-close',
      content
    ).addEventListener(
      'click',
      () =>
        modal.close()
    );


    qs(
      '[data-add-to-cart]',
      content
    ).addEventListener(
      'click',
      () => {

        const pref =
          qs(
            'input[name="dhWeightPreference"]:checked',
            content
          )?.value ||
          '';


        const wish =
          qs(
            '[data-wish]',
            content
          )?.value.trim() ||
          '';


        addToCart(
          product,
          qty,
          pref,
          wish,
          wholeWithKnownWeight
        );


        modal.close();


        toast(
          'Додано до замовлення'
        );
      }
    );


    renderRelated(
      qs(
        '[data-related]',
        content
      ),
      product
    );


    updateQty();


    modal.showModal();
  }


  /* =========================================================
     ДОДАВАННЯ В КОШИК
     ========================================================= */

  function addToCart(
    product,
    qty,
    weightPreference,
    wish,
    qtyIsUnits
  ) {

    const key =
      [
        product.id,
        product.nextPickupDate ||
          '',
        weightPreference ||
          '',
        wish ||
          '',
        qtyIsUnits
          ? 'units'
          : 'weight'
      ].join('|');


    const existing =
      state.cart.find(
        (item) =>
          item.key ===
          key
      );


    const item = {

      key:
        key,

      productId:
        product.id,

      name:
        product.name,

      category:
        product.category,

      qty:
        qty,

      qtyIsUnits:
        Boolean(
          qtyIsUnits
        ),

      unit:
        qtyIsUnits
          ? 'тушка'
          : product.unit,

      unitPrice:
        effectivePrice(
          product
        ),

      approxUnitWeight:
        Number(
          product.approxUnitWeight ||
          0
        ),

      weightModel:
        product.weightModel ||
        '',

      weightPreference:
        weightPreference ||
        '',

      wish:
        wish ||
        '',

      pickupDate:
        product.nextPickupDate ||
        '',

      pickupWindow:
        product.pickupWindow ||
        ''
    };


    if (existing) {

      existing.qty =
        Number(
          (
            Number(
              existing.qty
            ) +
            Number(qty)
          ).toFixed(3)
        );

    } else {

      state.cart.push(
        item
      );
    }


    saveCart();
  }


  function itemEstimatedSum(
    item
  ) {

    if (
      item.qtyIsUnits &&
      item.approxUnitWeight >
        0
    ) {

      return (
        Number(
          item.qty
        ) *
        Number(
          item.approxUnitWeight
        ) *
        Number(
          item.unitPrice
        )
      );
    }


    return (
      Number(
        item.qty
      ) *
      Number(
        item.unitPrice
      )
    );
  }


  /* =========================================================
     СУПУТНІ ТОВАРИ
     ========================================================= */

  function renderRelated(
    target,
    product
  ) {

    if (!target) {
      return;
    }


    const explicitIds =
      String(
        product.relatedIds ||
        ''
      )
        .split(
          /[;,]/
        )
        .map(
          (x) =>
            x.trim()
        )
        .filter(
          Boolean
        );


    const explicit =
      explicitIds
        .map(
          findProduct
        )
        .filter(
          Boolean
        )
        .slice(
          0,
          4
        );


    const sameDay =
      product.nextPickupDate

        ? products()
            .filter(
              (p) =>
                p.id !==
                  product.id &&

                p.nextPickupDate ===
                  product.nextPickupDate
            )
            .slice(
              0,
              4
            )

        : [];


    let html = '';


    if (
      product.showRelated !==
        false &&
      explicit.length
    ) {

      html +=
        `
          <section class="dh-related">

            <h3>
              З цим товаром купують
            </h3>

            <div class="dh-related-grid">

              ${explicit
                .map(
                  relatedCard
                )
                .join('')}

            </div>

          </section>
        `;
    }


    if (
      product.showSamePickup !==
        false &&
      sameDay.length
    ) {

      html +=
        `
          <section class="dh-related">

            <h3>
              Заберіть разом свіженьким
              ${esc(
                formatDate(
                  product.nextPickupDate
                )
              )}
            </h3>

            <div class="dh-related-grid">

              ${sameDay
                .map(
                  relatedCard
                )
                .join('')}

            </div>

          </section>
        `;
    }


    target.innerHTML =
      html;


    bindProductOpeners(
      target
    );
  }


  function relatedCard(
    product
  ) {

    return `
      <button
        type="button"
        class="dh-related-card"
        data-open-product="${esc(
          product.id
        )}"
      >

        <strong>
          ${esc(
            product.name
          )}
        </strong>

        <span>
          ${money(
            effectivePrice(
              product
            )
          )}
          грн/${esc(
            product.unit ||
            ''
          )}
        </span>

      </button>
    `;
  }


  /* =========================================================
     ГОЛОВНА
     ========================================================= */

  function renderHome() {

    renderCategories(
      qs(
        '#categoryGrid'
      )
    );


    const featured =
      products()
        .slice(
          0,
          8
        );


    renderProducts(
      qs(
        '#productGrid'
      ),
      featured
    );


    bindProductOpeners();
  }


  /* =========================================================
     КАТАЛОГ
     ========================================================= */

  function renderCatalog() {

    renderCategories(
      qs(
        '#categoryGrid'
      )
    );


    renderProducts(
      qs(
        '#productGrid'
      ),
      products()
    );


    bindProductOpeners();
  }


  /* =========================================================
     СТОРІНКА КАТЕГОРІЇ
     ========================================================= */

  function renderCategoryPage() {

    const slug =
      new URLSearchParams(
        location.search
      ).get('c') ||

      document.body
        .dataset
        .category ||

      '';


    const category =
      categories().find(
        (c) =>
          categorySlug(c) ===
          slug
      );


    if (!category) {

      if (
        qs(
          '#categoryTitle'
        )
      ) {

        qs(
          '#categoryTitle'
        ).textContent =
          'Категорію не знайдено';
      }


      renderProducts(
        qs(
          '#productGrid'
        ),
        []
      );


      return;
    }


    if (
      qs(
        '#categoryTitle'
      )
    ) {

      qs(
        '#categoryTitle'
      ).textContent =
        category.name;
    }


    if (
      qs(
        '#categoryDescription'
      )
    ) {

      qs(
        '#categoryDescription'
      ).textContent =
        category.description ||
        '';
    }


    const list =
      products().filter(
        (p) =>
          p.category ===
          category.name
      );


    const subcategories =
      [
        ...new Set(
          list
            .map(
              (p) =>
                p.subcategory
            )
            .filter(
              Boolean
            )
        )
      ];


    const filters =
      qs(
        '#subcategoryFilters'
      );


    if (
      filters &&
      subcategories.length
    ) {

      filters.innerHTML =
        `
          <button
            class="dh-chip is-active"
            type="button"
            data-subcategory=""
          >
            Усі
          </button>

          ${subcategories
            .map(
              (s) =>
                `
                  <button
                    class="dh-chip"
                    type="button"
                    data-subcategory="${esc(
                      s
                    )}"
                  >
                    ${esc(
                      s
                    )}
                  </button>
                `
            )
            .join('')}
        `;


      filters.addEventListener(
        'click',
        (e) => {

          const btn =
            e.target.closest(
              '[data-subcategory]'
            );


          if (!btn) {
            return;
          }


          qsa(
            '[data-subcategory]',
            filters
          ).forEach(
            (b) =>
              b.classList.remove(
                'is-active'
              )
          );


          btn.classList.add(
            'is-active'
          );


          const sub =
            btn.dataset.subcategory;


          renderProducts(
            qs(
              '#productGrid'
            ),

            list.filter(
              (p) =>
                !sub ||
                p.subcategory ===
                  sub
            )
          );


          bindProductOpeners();
        }
      );
    }


    renderProducts(
      qs(
        '#productGrid'
      ),
      list
    );


    bindProductOpeners();
  }


  /* =========================================================
     ГРУПУВАННЯ КОШИКА ПО ДАТАХ
     ========================================================= */

  function groupCart() {

    return state.cart.reduce(
      (
        acc,
        item
      ) => {

        const key =
          item.pickupDate ||
          '__confirm__';


        if (!acc[key]) {
          acc[key] = [];
        }


        acc[key].push(
          item
        );


        return acc;

      },
      {}
    );
  }


  /* =========================================================
     СТОРІНКА КОШИКА
     ========================================================= */

  function renderCart() {

    const target =
      qs(
        '#cartItems'
      );


    if (!target) {
      return;
    }


    if (
      !state.cart.length
    ) {

      target.innerHTML =
        `
          <div class="dh-empty">

            <h2>
              Кошик порожній
            </h2>

            <p>
              Оберіть товари в каталозі.
            </p>

            <a
              class="dh-primary-btn"
              href="catalog.html"
            >
              До каталогу
            </a>

          </div>
        `;


      updateCartSummary();

      return;
    }


    const groups =
      groupCart();


    target.innerHTML =
      Object.entries(
        groups
      )
        .map(
          (
            [
              date,
              items
            ]
          ) =>
            `
              <section class="dh-cart-group">

                <h2>

                  ${
                    date ===
                    '__confirm__'

                      ? 'Дата отримання буде підтверджена'

                      : `Отримання: ${esc(
                          formatDate(
                            date
                          )
                        )}`
                  }

                </h2>


                ${items
                  .map(
                    (item) =>
                      `
                        <article class="dh-cart-item">

                          <div>

                            <h3>
                              ${esc(
                                item.name
                              )}
                            </h3>


                            <div class="dh-muted">

                              ${money(
                                item.qty
                              )}
                              ${esc(
                                item.unit ||
                                ''
                              )}

                              ${
                                item.weightPreference
                                  ? ` · ${esc(
                                      item.weightPreference
                                    )}`
                                  : ''
                              }

                            </div>


                            ${
                              item.wish
                                ? `
                                  <div>
                                    Побажання:
                                    ${esc(
                                      item.wish
                                    )}
                                  </div>
                                `
                                : ''
                            }

                          </div>


                          <div class="dh-cart-item-side">

                            <strong>
                              ≈
                              ${money(
                                itemEstimatedSum(
                                  item
                                )
                              )}
                              грн
                            </strong>


                            <button
                              type="button"
                              class="dh-link-danger"
                              data-remove-cart="${esc(
                                item.key
                              )}"
                            >
                              Видалити
                            </button>

                          </div>

                        </article>
                      `
                  )
                  .join('')}

              </section>
            `
        )
        .join('');


    qsa(
      '[data-remove-cart]',
      target
    ).forEach(
      (btn) => {

        btn.addEventListener(
          'click',
          () => {

            state.cart =
              state.cart.filter(
                (item) =>
                  item.key !==
                  btn.dataset.removeCart
              );


            saveCart();

            renderCart();
          }
        );
      }
    );


    updateCartSummary();
  }


  function updateCartSummary() {

    const total =
      state.cart.reduce(
        (
          sum,
          item
        ) =>
          sum +
          itemEstimatedSum(
            item
          ),
        0
      );


    if (
      qs(
        '#cartTotal'
      )
    ) {

      qs(
        '#cartTotal'
      ).textContent =
        `≈ ${money(
          total
        )} грн`;
    }


    const checkout =
      qs(
        '#checkoutButton'
      );


    if (checkout) {
      checkout.disabled =
        state.cart.length ===
        0;
    }
  }


  /* =========================================================
     ОФОРМЛЕННЯ
     ========================================================= */

  function renderCheckout() {

    const form =
      qs(
        '#checkoutForm'
      );


    if (!form) {
      return;
    }


    if (
      !state.cart.length
    ) {

      location.href =
        'cart.html';

      return;
    }


    const groups =
      groupCart();


    const target =
      qs(
        '#pickupGroups'
      );


    const intervals =
      String(
        settings()[
          'Часові інтервали'
        ] ||
        ''
      )
        .split(';')
        .map(
          (x) =>
            x.trim()
        )
        .filter(
          Boolean
        );


    if (target) {

      target.innerHTML =
        Object.entries(
          groups
        )
          .map(
            (
              [
                date,
                items
              ]
            ) =>
              `
                <div class="dh-pickup-group">

                  <strong>

                    ${
                      date ===
                      '__confirm__'

                        ? 'Дата самовивозу буде підтверджена'

                        : `Самовивіз ${esc(
                            formatDate(
                              date
                            )
                          )}`
                    }

                  </strong>


                  <p class="dh-muted">

                    ${items
                      .map(
                        (x) =>
                          esc(
                            x.name
                          )
                      )
                      .join(', ')}

                  </p>


                  <label class="dh-field">

                    <span>
                      Зручний час
                    </span>


                    <select
                      data-pickup-time="${esc(
                        date
                      )}"
                    >

                      <option value="">
                        Після підтвердження магазину
                      </option>


                      ${intervals
                        .map(
                          (x) =>
                            `
                              <option value="${esc(
                                x
                              )}">
                                ${esc(
                                  x
                                )}
                              </option>
                            `
                        )
                        .join('')}

                    </select>

                  </label>

                </div>
              `
          )
          .join('');
    }


    const total =
      state.cart.reduce(
        (
          sum,
          item
        ) =>
          sum +
          itemEstimatedSum(
            item
          ),
        0
      );


    if (
      qs(
        '#checkoutTotal'
      )
    ) {

      qs(
        '#checkoutTotal'
      ).textContent =
        `≈ ${money(
          total
        )} грн`;
    }


    form.addEventListener(
      'submit',
      submitOrder
    );
  }


  /* =========================================================
     ВІДПРАВКА ЗАМОВЛЕННЯ
     ========================================================= */

  async function submitOrder(
    e
  ) {

    e.preventDefault();


    const form =
      e.currentTarget;


    const submit =
      qs(
        '[type="submit"]',
        form
      );


    const fd =
      new FormData(
        form
      );


    const pickupTimes =
      {};


    qsa(
      '[data-pickup-time]'
    ).forEach(
      (select) => {

        const key =
          select.dataset.pickupTime;


        if (
          key !==
            '__confirm__' &&
          select.value
        ) {

          pickupTimes[key] =
            select.value;
        }
      }
    );


    const payload = {

      requestId:
        `web-${Date.now()}-${Math.random()
          .toString(36)
          .slice(
            2,
            10
          )}`,


      customer: {

        name:
          String(
            fd.get(
              'name'
            ) ||
            ''
          ).trim(),


        phone:
          normalizePhone(
            fd.get(
              'phone'
            )
          ),


        comment:
          String(
            fd.get(
              'comment'
            ) ||
            ''
          ).trim()
      },


      receiveMethod:
        'Самовивіз',


      pickupTimes:
        pickupTimes,


      items:
        state.cart.map(
          (item) => ({

            productId:
              item.productId,

            qty:
              Number(
                item.qty
              ),

            weightPreference:
              item.weightPreference ||
              '',

            wish:
              item.wish ||
              ''
          })
        )
    };


    if (
      !payload.customer.name ||
      !payload.customer.phone
    ) {

      toast(
        'Заповніть ім’я та телефон.'
      );

      return;
    }


    submit.disabled =
      true;


    const oldText =
      submit.textContent;


    submit.textContent =
      'Передаємо замовлення…';


    try {

      const result =
        await postOrder(
          payload
        );


      if (
        !result ||
        result.ok !== true
      ) {

        throw new Error(
          result?.error ||
          'Не вдалося створити замовлення.'
        );
      }


      sessionStorage.setItem(
        'dh_last_order_result',
        JSON.stringify(
          result
        )
      );


      state.cart = [];

      saveCart();


      location.href =
        'success.html';

    } catch (err) {

      toast(
        err.message ||
        'Помилка оформлення замовлення.'
      );


      submit.disabled =
        false;


      submit.textContent =
        oldText;
    }
  }


  /* =========================================================
     POST ЧЕРЕЗ IFRAME
     ========================================================= */

  function postOrder(
    payload
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const token =
          `dhFrame_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;


        const iframe =
          document.createElement(
            'iframe'
          );


        iframe.name =
          token;

        iframe.hidden =
          true;


        document.body.appendChild(
          iframe
        );


        const form =
          document.createElement(
            'form'
          );


        form.method =
          'POST';

        form.action =
          API_URL;

        form.target =
          token;

        form.hidden =
          true;


        const action =
          document.createElement(
            'input'
          );


        action.name =
          'action';

        action.value =
          'createOrder';


        form.appendChild(
          action
        );


        const data =
          document.createElement(
            'input'
          );


        data.name =
          'payload';

        data.value =
          JSON.stringify(
            payload
          );


        form.appendChild(
          data
        );


        document.body.appendChild(
          form
        );


        const cleanup =
          () => {

            window.removeEventListener(
              'message',
              onMessage
            );


            form.remove();

            iframe.remove();

            clearTimeout(
              timer
            );
          };


        const onMessage =
          (event) => {

            const message =
              event.data;


            if (
              !message ||
              message.source !==
                'dobryi-hospodar-api'
            ) {

              return;
            }


            cleanup();


            resolve(
              message.result
            );
          };


        window.addEventListener(
          'message',
          onMessage
        );


        const timer =
          setTimeout(
            () => {

              cleanup();


              reject(
                new Error(
                  'Сервер не підтвердив отримання замовлення.'
                )
              );

            },
            20000
          );


        form.submit();
      }
    );
  }


  /* =========================================================
     СТОРІНКА УСПІХУ
     ========================================================= */

  function renderSuccess() {

    const target =
      qs(
        '#successOrderNumbers'
      );


    if (!target) {
      return;
    }


    try {

      const result =
        JSON.parse(
          sessionStorage.getItem(
            'dh_last_order_result'
          ) ||
          'null'
        );


      const created =
        Array.isArray(
          result?.created
        )
          ? result.created
          : [];


      target.innerHTML =
        created.length

          ? created
              .map(
                (o) =>
                  `
                    <div class="dh-success-order">

                      <strong>
                        ${esc(
                          o.orderId
                        )}
                      </strong>

                      ${
                        o.pickupDate
                          ? ` · ${esc(
                              formatDate(
                                o.pickupDate
                              )
                            )}`
                          : ''
                      }

                    </div>
                  `
              )
              .join('')

          : `
              <div>
                Номер замовлення з’явиться після підтвердження.
              </div>
            `;

    } catch (_) {

      target.textContent =
        '';
    }
  }


  /* =========================================================
     КОНТАКТИ
     ========================================================= */

  function renderContacts() {

    const s =
      settings();


    setText(
      '[data-contact-address]',

      s[
        'Адреса для сайту'
      ] ||

      `${
        s[
          'Місто'
        ] ||
        ''
      }, ${
        s[
          'Адреса'
        ] ||
        ''
      }`
    );


    setText(
      '[data-contact-phone]',

      s[
        'Телефон магазину'
      ] ||
      'Номер буде додано'
    );


    setText(
      '[data-contact-email]',

      s[
        'Email магазину'
      ] ||
      'Email буде додано'
    );


    setText(
      '[data-hours-weekdays]',

      s[
        'Графік роботи Пн–Пт'
      ] ||
      'уточнюється'
    );


    setText(
      '[data-hours-weekend]',

      s[
        'Графік роботи Сб–Нд'
      ] ||
      'уточнюється'
    );


    const route =
      qs(
        '[data-google-route]'
      );


    const routeUrl =
      s[
        'Google Maps — посилання'
      ] ||

      s[
        'Google Maps'
      ] ||

      '';


    if (
      route &&
      routeUrl
    ) {

      route.href =
        routeUrl;
    }


    const social =
      qs(
        '#socialLinks'
      );


    if (social) {

      const links =
        [
          [
            'Viber',
            s[
              'Viber — посилання'
            ] ||
            s[
              'Viber / месенджер'
            ]
          ],

          [
            'Telegram',
            s[
              'Telegram'
            ]
          ],

          [
            'Facebook',
            s[
              'Facebook'
            ]
          ],

          [
            'Instagram',
            s[
              'Instagram'
            ]
          ]
        ].filter(
          (x) =>
            x[1]
        );


      social.innerHTML =
        links
          .map(
            (
              [
                name,
                url
              ]
            ) =>
              `
                <a
                  class="dh-social-link"
                  target="_blank"
                  rel="noopener"
                  href="${esc(
                    url
                  )}"
                >
                  ${esc(
                    name
                  )}
                </a>
              `
          )
          .join('');
    }


    const map =
      qs(
        '#googleMap'
      );


    const embed =
      s[
        'Google Maps Embed URL'
      ] ||
      '';


    if (map) {

      map.innerHTML =
        embed

          ? `
              <iframe
                src="${esc(
                  embed
                )}"
                loading="lazy"
                allowfullscreen
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
            `

          : `
              <div class="dh-map-placeholder">

                📍
                <br>

                Вбудовану карту додамо
                після заповнення
                Google Maps Embed URL.

              </div>
            `;
    }
  }


  /* =========================================================
     КАБІНЕТ
     ========================================================= */

  function renderAccount() {

    const target =
      qs(
        '#accountContent'
      );


    if (!target) {
      return;
    }


    target.innerHTML =
      `
        <div class="dh-info-box">

          <strong>
            Кабінет покупця підготовлений,
            але авторизацію ще не вмикаємо.
          </strong>

          <p>
            Наступним етапом підключимо
            Google/email-вхід,
            історію замовлень
            і кнопку самоскасування
            до дедлайну.
          </p>

        </div>
      `;
  }


  /* =========================================================
     НАЛАШТУВАННЯ ШАПКИ / ФУТЕРА
     ========================================================= */

  function renderHeaderFooterSettings() {

    const s =
      settings();


    setText(
      '[data-store-address]',

      s[
        'Адреса для сайту'
      ] ||

      s[
        'Адреса'
      ] ||

      ''
    );


    qsa(
      '[data-store-name]'
    ).forEach(
      (el) => {

        el.textContent =
          s[
            'Назва магазину'
          ] ||
          'Добрий господар';
      }
    );
  }


  function setText(
    selector,
    value
  ) {

    qsa(
      selector
    ).forEach(
      (el) => {

        el.textContent =
          value ||
          '';
      }
    );
  }


  /* =========================================================
     ПОВІДОМЛЕННЯ
     ========================================================= */

  function toast(
    message
  ) {

    let toastEl =
      qs(
        '#dhToast'
      );


    if (!toastEl) {

      toastEl =
        document.createElement(
          'div'
        );


      toastEl.id =
        'dhToast';


      toastEl.className =
        'dh-toast';


      document.body.appendChild(
        toastEl
      );
    }


    toastEl.textContent =
      message;


    toastEl.classList.add(
      'is-visible'
    );


    clearTimeout(
      toastEl._timer
    );


    toastEl._timer =
      setTimeout(
        () =>
          toastEl.classList.remove(
            'is-visible'
          ),
        2400
      );
  }


  /* =========================================================
     МОБІЛЬНЕ МЕНЮ
     ========================================================= */

  function bindGlobalUi() {

    const menuButton =
      qs(
        '[data-menu-toggle]'
      );


    const nav =
      qs(
        '[data-main-nav]'
      );


    if (
      menuButton &&
      nav
    ) {

      menuButton.addEventListener(
        'click',
        () =>
          nav.classList.toggle(
            'is-open'
          )
      );
    }


    updateCartBadges();
  }


  /* =========================================================
     ЗАПУСК
     ========================================================= */

  async function init() {

    bindGlobalUi();


    try {

      await loadStore(
        false
      );


      renderHeaderFooterSettings();


      const page =
        document.body
          .dataset
          .page ||
        '';


      if (
        page === 'home'
      ) {

        renderHome();
      }


      if (
        page === 'catalog'
      ) {

        renderCatalog();
      }


      if (
        page === 'category'
      ) {

        renderCategoryPage();
      }


      if (
        page === 'cart'
      ) {

        renderCart();
      }


      if (
        page === 'checkout'
      ) {

        renderCheckout();
      }


      if (
        page === 'contacts'
      ) {

        renderContacts();
      }


      if (
        page === 'success'
      ) {

        renderSuccess();
      }


      if (
        page === 'account'
      ) {

        renderAccount();
      }

    } catch (err) {

      console.error(
        err
      );


      const target =
        qs(
          '#pageError'
        ) ||
        qs(
          'main'
        );


      if (target) {

        const box =
          document.createElement(
            'div'
          );


        box.className =
          'dh-error-box';


        box.textContent =
          `Не вдалося завантажити каталог: ${err.message}`;


        target.prepend(
          box
        );
      }
    }
  }


  return {
    init,
    loadStore,
    openProductModal
  };

})();


document.addEventListener(
  'DOMContentLoaded',
  DH.init
);
