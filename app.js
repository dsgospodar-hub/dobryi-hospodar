(() => {
  'use strict';

  const API_URL =
    'https://script.google.com/macros/s/AKfycbytW-z1l2ZzhOjbgpJrknNiRb-KnwS0gE1KERnvVMux37g4YGbWgJpYuj53heuthsJi/exec';

  const STORAGE = Object.freeze({
    CART: 'dh_cart_v2',
    CUSTOMER: 'dh_customer_v2',
    LAST_ORDER: 'dh_last_order_v2'
  });

  const CATEGORY_ICONS = Object.freeze({
    meat: '🥩',
    fish: '🐟',
    bakery: '🥐',
    semi: '🥟',
    feed: '🌾'
  });

  const state = {
    store: null,
    products: [],
    categories: [],
    settings: {},
    cart: loadJson_(
      STORAGE.CART,
      []
    ),
    activeProduct: null,
    submitting: false
  };


  document.addEventListener(
    'DOMContentLoaded',
    boot_
  );


  /* ======================================================
     START
     ====================================================== */

  async function boot_() {

    bindGlobalUi_();

    updateCartBadge_();


    try {

      const response =
        await jsonp_(
          {
            action: 'store',
            nocache: '1'
          },
          15000
        );


      if (
        !response ||
        response.ok !== true ||
        !response.data
      ) {

        throw new Error(
          response &&
          response.error
            ? response.error
            : 'Не вдалося завантажити дані магазину.'
        );
      }


      state.store =
        response.data;

      state.settings =
        response.data.settings ||
        {};

      state.categories =
        Array.isArray(
          response.data.categories
        )
          ? response.data.categories
          : [];

      state.products =
        Array.isArray(
          response.data.products
        )
          ? response.data.products
          : [];


      normalizeCart_();

      applySettings_();

      initAnalytics_();

      renderCurrentPage_();

    } catch (error) {

      console.error(
        error
      );


      showPageError_(
        error.message ||
        'Не вдалося завантажити сайт. Оновіть сторінку.'
      );
    }
  }


  /* ======================================================
     GLOBAL UI
     ====================================================== */

  function bindGlobalUi_() {

    const toggle =
      document.querySelector(
        '[data-menu-toggle]'
      );

    const nav =
      document.querySelector(
        '[data-main-nav]'
      );


    if (
      toggle &&
      nav
    ) {

      toggle.addEventListener(
        'click',
        () => {

          nav.classList.toggle(
            'is-open'
          );
        }
      );


      nav.addEventListener(
        'click',
        event => {

          if (
            event.target.closest(
              'a'
            )
          ) {

            nav.classList.remove(
              'is-open'
            );
          }
        }
      );
    }
  }


  function renderCurrentPage_() {

    renderCategoryGrids_();

    renderProductGrids_();

    renderCategoryPage_();

    renderCartPage_();

    renderCheckoutPage_();

    renderSuccessPage_();

    renderContactsPage_();

    renderAccountPage_();
  }


  /* ======================================================
     SETTINGS
     ====================================================== */

  function applySettings_() {

    const storeName =
      setting_(
        'Назва магазину'
      ) ||
      'Добрий господар';


    const address =
      setting_(
        'Сайт адреса',
        'Адреса',
        'Адреса магазину'
      ) ||
      'м. Снігурівка, вул. В. Бойченка, 95';


    document
      .querySelectorAll(
        '[data-store-name]'
      )
      .forEach(
        el => {

          el.textContent =
            storeName;
        }
      );


    document
      .querySelectorAll(
        '[data-store-address], [data-contact-address]'
      )
      .forEach(
        el => {

          el.textContent =
            address;
        }
      );


    const phone =
      setting_(
        'Телефон',
        'Телефон магазину'
      );


    const email =
      setting_(
        'Email',
        'E-mail',
        'Електронна пошта'
      );


    const weekdays =
      setting_(
        'Графік Пн–Пт',
        'Пн–Пт',
        'Пн-Пт'
      );


    const weekend =
      setting_(
        'Графік Сб–Нд',
        'Сб–Нд',
        'Сб-Нд'
      );


    document
      .querySelectorAll(
        '[data-contact-phone]'
      )
      .forEach(
        el => {

          if (!phone) {
            return;
          }


          const a =
            document.createElement(
              'a'
            );


          a.href =
            'tel:' +
            phone.replace(
              /[^+\d]/g,
              ''
            );


          a.textContent =
            phone;


          el.replaceChildren(
            a
          );
        }
      );


    document
      .querySelectorAll(
        '[data-contact-email]'
      )
      .forEach(
        el => {

          if (!email) {
            return;
          }


          const a =
            document.createElement(
              'a'
            );


          a.href =
            'mailto:' +
            email;


          a.textContent =
            email;


          el.replaceChildren(
            a
          );
        }
      );


    document
      .querySelectorAll(
        '[data-hours-weekdays]'
      )
      .forEach(
        el => {

          if (weekdays) {
            el.textContent =
              weekdays;
          }
        }
      );


    document
      .querySelectorAll(
        '[data-hours-weekend]'
      )
      .forEach(
        el => {

          if (weekend) {
            el.textContent =
              weekend;
          }
        }
      );


    const route =
      setting_(
        'Google Maps',
        'Google Maps share link',
        'Посилання Google Maps'
      );


    document
      .querySelectorAll(
        '[data-google-route]'
      )
      .forEach(
        el => {

          if (route) {

            el.href =
              route;

          } else {

            el.removeAttribute(
              'target'
            );


            el.addEventListener(
              'click',
              event => {

                event.preventDefault();
              }
            );
          }
        }
      );
  }


  function setting_(
    ...keys
  ) {

    for (
      const key of keys
    ) {

      if (
        Object.prototype
          .hasOwnProperty
          .call(
            state.settings,
            key
          )
      ) {

        return state.settings[
          key
        ];
      }
    }


    const wanted =
      keys.map(
        normalizeKey_
      );


    for (
      const [
        key,
        value
      ] of Object.entries(
        state.settings
      )
    ) {

      if (
        wanted.includes(
          normalizeKey_(
            key
          )
        )
      ) {

        return value;
      }
    }


    return '';
  }


  function normalizeKey_(
    value
  ) {

    return String(
      value ||
      ''
    )
      .toLowerCase()
      .replace(
        /[’`]/g,
        "'"
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();
  }


  /* ======================================================
     CATEGORIES
     ====================================================== */

  function renderCategoryGrids_() {

    const grids =
      document.querySelectorAll(
        '#categoryGrid, #homeCategoryGrid, [data-category-grid]'
      );


    if (!grids.length) {
      return;
    }


    grids.forEach(
      grid => {

        if (
          !state.categories.length
        ) {

          grid.innerHTML =
            '<div class="dh-empty">Категорії поки не налаштовані.</div>';

          return;
        }


        grid.innerHTML =
          state.categories
            .map(
              categoryCardHtml_
            )
            .join('');
      }
    );
  }


  function categoryCardHtml_(
    category
  ) {

    const code =
      categoryCode_(
        category
      );


    const icon =
      CATEGORY_ICONS[
        code
      ] ||
      '🛍️';


    return `
      <a
        class="dh-category-card"
        href="category.html?c=${encodeURIComponent(
          code ||
          category.id
        )}"
      >

        <span class="dh-category-icon">
          ${icon}
        </span>

        <div>

          <h3>
            ${escapeHtml_(
              category.name
            )}
          </h3>

          <p>
            ${escapeHtml_(
              category.description ||
              'Переглянути товари'
            )}
          </p>

        </div>

      </a>
    `;
  }


  function categoryCode_(
    category
  ) {

    const code =
      String(
        category.designCode ||
        ''
      )
        .trim()
        .toLowerCase();


    if (code) {
      return code;
    }


    const name =
      String(
        category.name ||
        ''
      )
        .toLowerCase();


    if (
      name.includes(
        "м'яс"
      ) ||
      name.includes(
        'м’яс'
      )
    ) {
      return 'meat';
    }


    if (
      name.includes(
        'риб'
      )
    ) {
      return 'fish';
    }


    if (
      name.includes(
        'випіч'
      )
    ) {
      return 'bakery';
    }


    if (
      name.includes(
        'напівфаб'
      )
    ) {
      return 'semi';
    }


    if (
      name.includes(
        'корм'
      ) ||
      name.includes(
        'зерн'
      )
    ) {
      return 'feed';
    }


    return String(
      category.id ||
      ''
    )
      .trim()
      .toLowerCase();
  }


  /* ======================================================
     PRODUCTS
     ====================================================== */

  function renderProductGrids_() {

    const grids =
      document.querySelectorAll(
        '#productGrid, #homeProductGrid, #featuredProductGrid, #featuredProducts, [data-product-grid]'
      );


    if (!grids.length) {
      return;
    }


    if (
      document.body.dataset.page ===
      'category'
    ) {
      return;
    }


    let products =
      state.products.slice();


    if (
      document.body.dataset.page ===
        'home' ||
      document.body.dataset.page ===
        'index'
    ) {

      products =
        products.slice(
          0,
          8
        );
    }


    grids.forEach(
      grid => {

        renderProductsInto_(
          grid,
          products
        );
      }
    );
  }


  function renderProductsInto_(
    grid,
    products
  ) {

    if (
      !products.length
    ) {

      grid.innerHTML =
        '<div class="dh-empty">У цьому розділі поки немає товарів для замовлення.</div>';

      return;
    }


    grid.innerHTML =
      products
        .map(
          productCardHtml_
        )
        .join('');


    grid
      .querySelectorAll(
        '[data-open-product]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              const product =
                productById_(
                  button.dataset
                    .openProduct
                );


              if (product) {

                openProduct_(
                  product
                );
              }
            }
          );
        }
      );
  }


  function productCardHtml_(
    product
  ) {

    const icon =
      productIcon_(
        product
      );


    const photo =
      product.photo1

        ? `
          <img
            src="${escapeAttr_(
              product.photo1
            )}"
            alt="${escapeAttr_(
              product.name
            )}"
            loading="lazy"
          >
        `

        : `
          <span class="dh-product-placeholder">
            ${icon}
          </span>
        `;


    const disabled =
      !productCanOrder_(
        product
      );


    return `
      <article class="dh-product-card">

        <button
          class="dh-product-image"
          type="button"
          data-open-product="${escapeAttr_(
            product.id
          )}"
          aria-label="Відкрити ${escapeAttr_(
            product.name
          )}"
        >
          ${photo}
        </button>


        <div class="dh-product-body">

          <span class="dh-product-status">
            ${escapeHtml_(
              productStatus_(
                product
              )
            )}
          </span>


          <h3>
            ${escapeHtml_(
              product.name
            )}
          </h3>


          ${priceHtml_(
            product
          )}


          ${pickupHtml_(
            product
          )}


          <button
            type="button"
            class="dh-primary-btn"
            data-open-product="${escapeAttr_(
              product.id
            )}"
            ${disabled
              ? 'disabled'
              : ''
            }
          >
            ${
              disabled
                ? 'Тимчасово недоступно'
                : 'Обрати'
            }
          </button>

        </div>

      </article>
    `;
  }


  function productStatus_(
    product
  ) {

    if (
      product.preorder
    ) {
      return 'Під замовлення';
    }


    if (
      product.status
    ) {
      return product.status;
    }


    return product.inStock
      ? 'В наявності'
      : 'Уточнюйте';
  }


  function productCanOrder_(
    product
  ) {

    return (
      Number(
        product.effectivePrice ||
        0
      ) > 0 &&

      (
        product.inStock ||
        product.preorder
      )
    );
  }


  function priceHtml_(
    product
  ) {

    const unit =
      product.unit
        ? ` / ${escapeHtml_(
            product.unit
          )}`
        : '';


    if (
      product.siteDiscountActive &&
      Number(
        product.sitePrice
      ) > 0
    ) {

      return `
        <div class="dh-price-line">

          <span class="dh-old-price">
            ${money_(
              product.storePrice
            )} грн
          </span>

          <span class="dh-price">
            ${money_(
              product.effectivePrice
            )} грн${unit}
          </span>

        </div>

        <span class="dh-site-price-note">
          Ціна при замовленні на сайті
        </span>
      `;
    }


    return `
      <div class="dh-price-line">

        <span class="dh-price">
          ${money_(
            product.effectivePrice
          )} грн${unit}
        </span>

      </div>
    `;
  }


  function pickupHtml_(
    product
  ) {

    if (
      product.nextPickupDate
    ) {

      return `
        <div class="dh-pickup-box">

          <strong>
            Отримання:
          </strong>

          ${escapeHtml_(
            formatDate_(
              product.nextPickupDate
            )
          )}

          ${
            product.pickupWindow
              ? `<br>${escapeHtml_(
                  product.pickupWindow
                )}`
              : ''
          }

          ${
            product.orderDeadlineText
              ? `
                <br>
                <small>
                  Замовити до:
                  ${escapeHtml_(
                    product.orderDeadlineText
                  )}
                </small>
              `
              : ''
          }

        </div>
      `;
    }


    if (
      product.preorder
    ) {

      return `
        <div class="dh-pickup-box">

          <strong>
            Дата отримання:
          </strong>

          після підтвердження магазину

        </div>
      `;
    }


    return '';
  }


  function productIcon_(
    product
  ) {

    const category =
      state.categories.find(
        c =>
          c.name ===
          product.category
      );


    return (
      CATEGORY_ICONS[
        category
          ? categoryCode_(
              category
            )
          : ''
      ] ||
      '🛍️'
    );
  }


  /* ======================================================
     CATEGORY PAGE
     ====================================================== */

  function renderCategoryPage_() {

    if (
      document.body.dataset.page !==
      'category'
    ) {
      return;
    }


    const params =
      new URLSearchParams(
        location.search
      );


    const requested =
      String(
        params.get('c') ||
        ''
      )
        .trim()
        .toLowerCase();


    const category =
      state.categories.find(
        c => {

          return (
            categoryCode_(c) ===
              requested ||

            String(
              c.id ||
              ''
            )
              .toLowerCase() ===
              requested
          );
        }
      );


    const title =
      document.getElementById(
        'categoryTitle'
      );


    const description =
      document.getElementById(
        'categoryDescription'
      );


    const grid =
      document.getElementById(
        'productGrid'
      );


    const filters =
      document.getElementById(
        'subcategoryFilters'
      );


    if (!category) {

      if (title) {

        title.textContent =
          'Категорію не знайдено';
      }


      if (description) {

        description.textContent =
          'Поверніться до каталогу та оберіть потрібний розділ.';
      }


      if (grid) {

        grid.innerHTML =
          '<div class="dh-empty">Категорію не знайдено.</div>';
      }


      return;
    }


    if (title) {

      title.textContent =
        category.name;
    }


    if (description) {

      description.textContent =
        category.description ||
        'Оберіть потрібний товар.';
    }


    const all =
      state.products.filter(
        p =>
          p.category ===
          category.name
      );


    const subcategories =
      [
        ...new Set(
          all
            .map(
              p =>
                String(
                  p.subcategory ||
                  ''
                )
                  .trim()
            )
            .filter(
              Boolean
            )
        )
      ];


    if (
      filters &&
      subcategories.length
    ) {

      filters.innerHTML =
        [
          `
            <button
              type="button"
              class="dh-chip is-active"
              data-subcategory=""
            >
              Усі
            </button>
          `,

          ...subcategories.map(
            s => `
              <button
                type="button"
                class="dh-chip"
                data-subcategory="${escapeAttr_(
                  s
                )}"
              >
                ${escapeHtml_(
                  s
                )}
              </button>
            `
          )
        ]
          .join('');


      filters.addEventListener(
        'click',
        event => {

          const button =
            event.target.closest(
              '[data-subcategory]'
            );


          if (!button) {
            return;
          }


          filters
            .querySelectorAll(
              '.dh-chip'
            )
            .forEach(
              x =>
                x.classList.remove(
                  'is-active'
                )
            );


          button.classList.add(
            'is-active'
          );


          const sub =
            button.dataset
              .subcategory;


          renderProductsInto_(
            grid,

            sub
              ? all.filter(
                  p =>
                    p.subcategory ===
                    sub
                )
              : all
          );
        }
      );
    }


    if (grid) {

      renderProductsInto_(
        grid,
        all
      );
    }
  }


  /* ======================================================
     PRODUCT MODAL
     ====================================================== */

  function ensureProductDialog_() {

    let dialog =
      document.getElementById(
        'dhProductDialog'
      );


    if (dialog) {
      return dialog;
    }


    dialog =
      document.createElement(
        'dialog'
      );


    dialog.id =
      'dhProductDialog';


    dialog.className =
      'dh-modal';


    document.body.appendChild(
      dialog
    );


    dialog.addEventListener(
      'close',
      () => {

        document.body
          .classList
          .remove(
            'dialog-open'
          );


        state.activeProduct =
          null;
      }
    );


    dialog.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          dialog
        ) {

          dialog.close();
        }
      }
    );


    return dialog;
  }


  function openProduct_(
    product
  ) {

    state.activeProduct =
      product;


    const dialog =
      ensureProductDialog_();


    const whole =
      isWholeProduct_(
        product
      );


    const min =
      whole
        ? 1
        : positiveNumber_(
            product.minQty,
            1
          );


    const step =
      whole
        ? 1
        : positiveNumber_(
            product.step,
            1
          );


    const unitLabel =
      whole
        ? 'шт.'
        : (
            product.unit ||
            'шт.'
          );


    const initialTotal =
      estimateLine_(
        product,
        min
      );


    const photo =
      product.photo1

        ? `
          <img
            src="${escapeAttr_(
              product.photo1
            )}"
            alt="${escapeAttr_(
              product.name
            )}"
          >
        `

        : `
          <span class="dh-product-placeholder">
            ${productIcon_(
              product
            )}
          </span>
        `;


    const weightBlock =
      product.allowWeightPreference

        ? `
          <fieldset class="dh-fieldset">

            <legend>
              Якщо точної ваги не буде
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

              Найближча вага

            </label>

          </fieldset>
        `

        : '';


    const wishBlock =
      product.allowWish

        ? `
          <label class="dh-field">

            <span>
              Щось додати до побажання?
            </span>

            <textarea
              id="dhProductWish"
              maxlength="500"
              placeholder="${escapeAttr_(
                product.wishHint ||
                'Напишіть побажання до товару'
              )}"
            ></textarea>

          </label>
        `

        : '';


    const wholeInfo =
      whole &&
      Number(
        product.approxUnitWeight
      ) > 0

        ? `
          <div class="dh-info-box">

            Орієнтовна вага
            1 одиниці:

            ${formatQty_(
              product.approxUnitWeight
            )} кг.

            Остаточна сума
            залежатиме
            від фактичної ваги.

          </div>
        `

        : '';


    dialog.innerHTML = `
      <div class="dh-modal-head">

        <h2>
          ${escapeHtml_(
            product.name
          )}
        </h2>


        <button
          class="dh-modal-close"
          type="button"
          data-close-product
          aria-label="Закрити"
        >
          ×
        </button>

      </div>


      <div class="dh-modal-grid">

        <div class="dh-modal-image">
          ${photo}
        </div>


        <div>

          <span class="dh-product-status">
            ${escapeHtml_(
              productStatus_(
                product
              )
            )}
          </span>


          <div style="margin-top:10px;">
            ${priceHtml_(
              product
            )}
          </div>


          ${
            product.description
              ? `
                <p
                  class="dh-muted"
                  style="margin-top:14px;"
                >
                  ${escapeHtml_(
                    product.description
                  )}
                </p>
              `
              : ''
          }


          ${pickupHtml_(
            product
          )}


          ${wholeInfo}


          <div class="dh-qty-row">

            <button
              class="dh-qty-btn"
              type="button"
              data-qty-minus
            >
              −
            </button>


            <strong data-qty-value>
              ${formatQty_(
                min
              )}
              ${escapeHtml_(
                unitLabel
              )}
            </strong>


            <button
              class="dh-qty-btn"
              type="button"
              data-qty-plus
            >
              +
            </button>


            <span
              class="dh-estimate"
              data-estimate
            >
              ≈
              ${money_(
                initialTotal
              )}
              грн
            </span>

          </div>


          ${weightBlock}


          ${wishBlock}


          <button
            type="button"
            class="dh-primary-btn dh-wide"
            data-add-product
          >
            Додати в кошик
          </button>

        </div>

      </div>


      <div
        class="dh-related"
        id="dhRelatedProducts"
      ></div>
    `;


    let qty =
      min;


    const qtyValue =
      dialog.querySelector(
        '[data-qty-value]'
      );


    const estimate =
      dialog.querySelector(
        '[data-estimate]'
      );


    const renderQty =
      () => {

        qtyValue.textContent =
          `${formatQty_(
            qty
          )} ${unitLabel}`;


        estimate.textContent =
          `≈ ${money_(
            estimateLine_(
              product,
              qty
            )
          )} грн`;
      };


    dialog
      .querySelector(
        '[data-qty-minus]'
      )
      .addEventListener(
        'click',
        () => {

          qty =
            Math.max(
              min,

              roundQty_(
                qty -
                step,
                step
              )
            );


          renderQty();
        }
      );


    dialog
      .querySelector(
        '[data-qty-plus]'
      )
      .addEventListener(
        'click',
        () => {

          qty =
            roundQty_(
              qty +
              step,
              step
            );


          renderQty();
        }
      );


    dialog
      .querySelector(
        '[data-close-product]'
      )
      .addEventListener(
        'click',
        () => {

          dialog.close();
        }
      );


    dialog
      .querySelector(
        '[data-add-product]'
      )
      .addEventListener(
        'click',
        () => {

          const selectedWeight =
            dialog.querySelector(
              'input[name="dhWeightPreference"]:checked'
            );


          const wish =
            dialog.querySelector(
              '#dhProductWish'
            );


          addToCart_({
            productId:
              product.id,

            qty:
              qty,

            weightPreference:
              selectedWeight
                ? selectedWeight.value
                : '',

            wish:
              wish
                ? wish.value.trim()
                : ''
          });


          track_(
            'add_to_cart',
            {
              item_id:
                product.id,

              item_name:
                product.name,

              value:
                estimateLine_(
                  product,
                  qty
                )
            }
          );


          dialog.close();


          toast_(
            'Товар додано в кошик.'
          );
        }
      );


    renderRelated_(
      dialog.querySelector(
        '#dhRelatedProducts'
      ),
      product
    );


    document.body
      .classList
      .add(
        'dialog-open'
      );


    dialog.showModal();


    track_(
      'view_item',
      {
        item_id:
          product.id,

        item_name:
          product.name
      }
    );
  }


  function renderRelated_(
    container,
    product
  ) {

    if (!container) {
      return;
    }


    const ids =
      String(
        product.relatedIds ||
        ''
      )
        .split(
          /[;,\s]+/
        )
        .map(
          x =>
            x.trim()
        )
        .filter(
          Boolean
        );


    let related =
      ids
        .map(
          productById_
        )
        .filter(
          Boolean
        );


    if (
      !related.length &&
      product.showSamePickup &&
      product.nextPickupDate
    ) {

      related =
        state.products
          .filter(
            p => {

              return (
                p.id !==
                  product.id &&

                p.nextPickupDate ===
                  product.nextPickupDate
              );
            }
          )
          .slice(
            0,
            4
          );
    }


    if (
      !related.length
    ) {

      container.innerHTML =
        '';

      return;
    }


    container.innerHTML = `
      <h3>

        ${
          product.showSamePickup &&
          product.nextPickupDate
            ? 'Заберіть разом свіженьким'
            : 'З цим купують'
        }

      </h3>


      <div class="dh-related-grid">

        ${related
          .slice(
            0,
            4
          )
          .map(
            p => `
              <button
                type="button"
                class="dh-related-card"
                data-related-id="${escapeAttr_(
                  p.id
                )}"
              >

                <strong>
                  ${escapeHtml_(
                    p.name
                  )}
                </strong>

                <span>
                  ${money_(
                    p.effectivePrice
                  )}
                  грн
                  ${
                    p.unit
                      ? ' / ' +
                        escapeHtml_(
                          p.unit
                        )
                      : ''
                  }
                </span>

              </button>
            `
          )
          .join('')}

      </div>
    `;


    container
      .querySelectorAll(
        '[data-related-id]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              const next =
                productById_(
                  button.dataset
                    .relatedId
                );


              if (!next) {
                return;
              }


              track_(
                'cross_sell_click',
                {
                  item_id:
                    next.id,

                  source_item_id:
                    product.id
                }
              );


              const dialog =
                document.getElementById(
                  'dhProductDialog'
                );


              if (
                dialog &&
                dialog.open
              ) {

                dialog.close();
              }


              setTimeout(
                () => {

                  openProduct_(
                    next
                  );
                },
                20
              );
            }
          );
        }
      );
  }


  function isWholeProduct_(
    product
  ) {

    const value =
      String(
        product.weightModel ||
        ''
      )
        .toLowerCase();


    return (
      value.includes(
        'ціла'
      ) ||
      value.includes(
        'тушка'
      )
    );
  }


  function estimateLine_(
    product,
    qty
  ) {

    let pricingQty =
      Number(
        qty
      ) ||
      0;


    if (
      isWholeProduct_(
        product
      ) &&
      Number(
        product.approxUnitWeight
      ) > 0
    ) {

      pricingQty *=
        Number(
          product.approxUnitWeight
        );
    }


    return roundMoney_(
      pricingQty *
      Number(
        product.effectivePrice ||
        0
      )
    );
  }


  /* ======================================================
     CART
     ====================================================== */

  function addToCart_(
    item
  ) {

    const same =
      state.cart.find(
        x => {

          return (
            x.productId ===
              item.productId &&

            String(
              x.weightPreference ||
              ''
            ) ===
            String(
              item.weightPreference ||
              ''
            ) &&

            String(
              x.wish ||
              ''
            ) ===
            String(
              item.wish ||
              ''
            )
          );
        }
      );


    if (same) {

      same.qty =
        roundQty_(
          Number(
            same.qty ||
            0
          ) +
          Number(
            item.qty ||
            0
          ),
          0.001
        );

    } else {

      state.cart.push({
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
      });
    }


    saveCart_();

    updateCartBadge_();
  }


  function saveCart_() {

    localStorage.setItem(
      STORAGE.CART,
      JSON.stringify(
        state.cart
      )
    );
  }


  function normalizeCart_() {

    state.cart =
      state.cart.filter(
        item => {

          return (
            item &&
            item.productId &&
            productById_(
              item.productId
            )
          );
        }
      );


    saveCart_();

    updateCartBadge_();
  }


  function updateCartBadge_() {

    document
      .querySelectorAll(
        '[data-cart-count]'
      )
      .forEach(
        el => {

          el.textContent =
            String(
              state.cart.length
            );


          el.hidden =
            state.cart.length ===
            0;
        }
      );
  }


  function renderCartPage_() {

    const container =
      document.getElementById(
        'cartItems'
      );


    if (
      !container ||
      document.body.dataset.page !==
        'cart'
    ) {
      return;
    }


    if (
      !state.cart.length
    ) {

      container.innerHTML = `
        <div class="dh-empty">

          <h2>
            Кошик порожній
          </h2>

          <p>
            Оберіть потрібні товари
            в каталозі.
          </p>

          <a
            class="dh-primary-btn"
            href="catalog.html"
          >
            Перейти до каталогу
          </a>

        </div>
      `;


      updateCartTotals_();


      const checkout =
        document.getElementById(
          'checkoutButton'
        );


      if (checkout) {
        checkout.disabled =
          true;
      }


      return;
    }


    const groups =
      groupCartByPickup_();


    container.innerHTML =
      [
        ...groups.entries()
      ]
        .map(
          (
            [
              key,
              items
            ]
          ) => {

            const heading =
              key ===
              '__TO_CONFIRM__'

                ? 'Дата самовивозу буде підтверджена'

                : `Отримання: ${formatDate_(
                    key
                  )}`;


            return `
              <section class="dh-cart-group">

                <h2>
                  ${escapeHtml_(
                    heading
                  )}
                </h2>

                ${items
                  .map(
                    cartItemHtml_
                  )
                  .join('')}

              </section>
            `;
          }
        )
        .join('');


    container
      .querySelectorAll(
        '[data-cart-remove]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              state.cart.splice(
                Number(
                  button.dataset
                    .cartRemove
                ),
                1
              );


              saveCart_();

              updateCartBadge_();

              renderCartPage_();
            }
          );
        }
      );


    container
      .querySelectorAll(
        '[data-cart-minus], [data-cart-plus]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              const index =
                Number(
                  button.dataset
                    .cartMinus ??
                  button.dataset
                    .cartPlus
                );


              const item =
                state.cart[
                  index
                ];


              const product =
                productById_(
                  item.productId
                );


              if (!product) {
                return;
              }


              const whole =
                isWholeProduct_(
                  product
                );


              const min =
                whole
                  ? 1
                  : positiveNumber_(
                      product.minQty,
                      1
                    );


              const step =
                whole
                  ? 1
                  : positiveNumber_(
                      product.step,
                      1
                    );


              const direction =
                button.hasAttribute(
                  'data-cart-minus'
                )
                  ? -1
                  : 1;


              item.qty =
                Math.max(
                  min,

                  roundQty_(
                    Number(
                      item.qty
                    ) +
                    direction *
                    step,
                    step
                  )
                );


              saveCart_();

              renderCartPage_();
            }
          );
        }
      );


    updateCartTotals_();
  }


  function cartItemHtml_(
    entry
  ) {

    const item =
      entry.item;


    const product =
      entry.product;


    const index =
      entry.index;


    const whole =
      isWholeProduct_(
        product
      );


    const unit =
      whole
        ? 'шт.'
        : (
            product.unit ||
            'шт.'
          );


    const sum =
      estimateLine_(
        product,
        item.qty
      );


    return `
      <article class="dh-cart-item">

        <div>

          <h3>
            ${escapeHtml_(
              product.name
            )}
          </h3>


          <div class="dh-muted">

            ${money_(
              product.effectivePrice
            )}
            грн

            ${
              product.unit
                ? ' / ' +
                  escapeHtml_(
                    product.unit
                  )
                : ''
            }

          </div>


          ${
            item.weightPreference
              ? `
                <div class="dh-muted">
                  По вазі:
                  ${escapeHtml_(
                    item.weightPreference
                  )}
                </div>
              `
              : ''
          }


          ${
            item.wish
              ? `
                <div class="dh-muted">
                  Побажання:
                  ${escapeHtml_(
                    item.wish
                  )}
                </div>
              `
              : ''
          }


          <div
            class="dh-qty-row"
            style="margin-bottom:0;"
          >

            <button
              type="button"
              class="dh-qty-btn"
              data-cart-minus="${index}"
            >
              −
            </button>


            <strong>
              ${formatQty_(
                item.qty
              )}
              ${escapeHtml_(
                unit
              )}
            </strong>


            <button
              type="button"
              class="dh-qty-btn"
              data-cart-plus="${index}"
            >
              +
            </button>

          </div>

        </div>


        <div class="dh-cart-item-side">

          <strong>
            ≈
            ${money_(
              sum
            )}
            грн
          </strong>


          <button
            type="button"
            class="dh-link-danger"
            data-cart-remove="${index}"
          >
            Видалити
          </button>

        </div>

      </article>
    `;
  }


  function groupCartByPickup_() {

    const groups =
      new Map();


    state.cart.forEach(
      (
        item,
        index
      ) => {

        const product =
          productById_(
            item.productId
          );


        if (!product) {
          return;
        }


        const key =
          product.nextPickupDate ||
          '__TO_CONFIRM__';


        if (
          !groups.has(
            key
          )
        ) {

          groups.set(
            key,
            []
          );
        }


        groups
          .get(
            key
          )
          .push({
            item:
              item,

            product:
              product,

            index:
              index
          });
      }
    );


    return groups;
  }


  function cartTotal_() {

    return roundMoney_(
      state.cart.reduce(
        (
          sum,
          item
        ) => {

          const product =
            productById_(
              item.productId
            );


          return product
            ? sum +
              estimateLine_(
                product,
                item.qty
              )
            : sum;
        },
        0
      )
    );
  }


  function updateCartTotals_() {

    const total =
      `≈ ${money_(
        cartTotal_()
      )} грн`;


    const cartTotal =
      document.getElementById(
        'cartTotal'
      );


    const checkoutTotal =
      document.getElementById(
        'checkoutTotal'
      );


    if (cartTotal) {

      cartTotal.textContent =
        total;
    }


    if (checkoutTotal) {

      checkoutTotal.textContent =
        total;
    }


    const checkout =
      document.getElementById(
        'checkoutButton'
      );


    if (checkout) {

      checkout.disabled =
        !state.cart.length;
    }
  }


  /* ======================================================
     CHECKOUT
     ====================================================== */

  function renderCheckoutPage_() {

    const form =
      document.getElementById(
        'checkoutForm'
      );


    if (
      !form ||
      document.body.dataset.page !==
        'checkout'
    ) {
      return;
    }


    if (
      !state.cart.length
    ) {

      location.replace(
        'cart.html'
      );

      return;
    }


    updateCartTotals_();

    renderPickupGroups_();

    restoreCustomer_(
      form
    );


    form.addEventListener(
      'submit',
      submitCheckout_
    );


    track_(
      'begin_checkout',
      {
        value:
          cartTotal_()
      }
    );
  }


  function renderPickupGroups_() {

    const container =
      document.getElementById(
        'pickupGroups'
      );


    if (!container) {
      return;
    }


    const groups =
      groupCartByPickup_();


    const intervals =
      String(
        setting_(
          'Часові інтервали'
        ) ||
        ''
      )
        .split(';')
        .map(
          x =>
            x.trim()
        )
        .filter(
          Boolean
        );


    container.innerHTML =
      [
        ...groups.entries()
      ]
        .map(
          (
            [
              key,
              entries
            ]
          ) => {

            const products =
              entries
                .map(
                  x =>
                    x.product.name
                )
                .join(', ');


            if (
              key ===
              '__TO_CONFIRM__'
            ) {

              return `
                <div
                  class="dh-pickup-group"
                  data-pickup-group=""
                >

                  <strong>
                    Дата самовивозу буде підтверджена
                  </strong>

                  <p>
                    ${escapeHtml_(
                      products
                    )}
                  </p>


                  <label class="dh-field">

                    <span>
                      Зручний час
                    </span>

                    <select
                      data-pickup-select
                      disabled
                    >
                      <option>
                        Після підтвердження магазину
                      </option>
                    </select>

                  </label>

                </div>
              `;
            }


            const options =
              intervals.length

                ? intervals
                    .map(
                      x => `
                        <option
                          value="${escapeAttr_(
                            x
                          )}"
                        >
                          ${escapeHtml_(
                            x
                          )}
                        </option>
                      `
                    )
                    .join('')

                : `
                  <option value="">
                    Після підтвердження магазину
                  </option>
                `;


            return `
              <div
                class="dh-pickup-group"
                data-pickup-group="${escapeAttr_(
                  key
                )}"
              >

                <strong>
                  ${escapeHtml_(
                    formatDate_(
                      key
                    )
                  )}
                </strong>


                <p>
                  ${escapeHtml_(
                    products
                  )}
                </p>


                <label class="dh-field">

                  <span>
                    Зручний час
                  </span>

                  <select data-pickup-select>
                    ${options}
                  </select>

                </label>

              </div>
            `;
          }
        )
        .join('');
  }


  function restoreCustomer_(
    form
  ) {

    const saved =
      loadJson_(
        STORAGE.CUSTOMER,
        {}
      );


    if (
      saved.name &&
      form.elements.name
    ) {

      form.elements.name.value =
        saved.name;
    }


    if (
      saved.phone &&
      form.elements.phone
    ) {

      form.elements.phone.value =
        saved.phone;
    }
  }


  async function submitCheckout_(
    event
  ) {

    event.preventDefault();


    if (
      state.submitting
    ) {
      return;
    }


    const form =
      event.currentTarget;


    const data =
      new FormData(
        form
      );


    const name =
      String(
        data.get('name') ||
        ''
      )
        .trim();


    const phone =
      String(
        data.get('phone') ||
        ''
      )
        .trim();


    const comment =
      String(
        data.get('comment') ||
        ''
      )
        .trim();


    if (!name) {

      toast_(
        'Вкажіть ім’я та прізвище.'
      );

      return;
    }


    const digits =
      phone.replace(
        /\D/g,
        ''
      );


    if (
      digits.length <
        9 ||
      digits.length >
        15
    ) {

      toast_(
        'Перевірте номер телефону.'
      );

      return;
    }


    const pickupTimes =
      {};


    document
      .querySelectorAll(
        '[data-pickup-group]'
      )
      .forEach(
        group => {

          const date =
            group.dataset
              .pickupGroup;


          const select =
            group.querySelector(
              '[data-pickup-select]'
            );


          if (
            date &&
            select &&
            select.value
          ) {

            pickupTimes[
              date
            ] =
              select.value;
          }
        }
      );


    const requestId =
      createRequestId_();


    const payload = {
      requestId:
        requestId,

      customer: {
        name:
          name,

        phone:
          phone,

        comment:
          comment
      },

      receiveMethod:
        'Самовивіз',

      pickupTimes:
        pickupTimes,

      items:
        state.cart.map(
          item => {

            return {
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
            };
          }
        )
    };


    localStorage.setItem(
      STORAGE.CUSTOMER,

      JSON.stringify({
        name:
          name,

        phone:
          phone
      })
    );


    const submit =
      form.querySelector(
        '[type="submit"]'
      );


    const originalText =
      submit
        ? submit.textContent
        : '';


    state.submitting =
      true;


    if (submit) {

      submit.disabled =
        true;


      submit.textContent =
        'Надсилаємо замовлення…';
    }


    try {

      const orderValue =
        cartTotal_();


      const result =
        await sendOrderAndConfirm_(
          payload
        );


      sessionStorage.setItem(
        STORAGE.LAST_ORDER,
        JSON.stringify(
          result
        )
      );


      state.cart =
        [];


      saveCart_();

      updateCartBadge_();


      track_(
        'order_submitted',
        {
          value:
            orderValue,

          order_count:
            Array.isArray(
              result.created
            )
              ? result.created.length
              : 1
        }
      );


      location.href =
        'success.html';

    } catch (error) {

      console.error(
        error
      );


      toast_(
        error.message ||
        'Не вдалося оформити замовлення.'
      );


      if (submit) {

        submit.disabled =
          false;


        submit.textContent =
          originalText ||
          'Підтвердити замовлення';
      }

    } finally {

      state.submitting =
        false;
    }
  }


  /* ======================================================
     НОВИЙ МЕХАНІЗМ ПІДТВЕРДЖЕННЯ
     ====================================================== */

  async function sendOrderAndConfirm_(
    payload
  ) {

    /*
     * 1. Відправляємо POST
     * через прихований iframe.
     *
     * Відповідь iframe
     * нам більше НЕ потрібна.
     */
    postOrderViaIframe_(
      payload
    );


    /*
     * 2. Питаємо сервер
     * за requestId,
     * чи замовлення вже записане.
     */
    const started =
      Date.now();


    const maxWait =
      45000;


    let lastNetworkError =
      null;


    await delay_(
      900
    );


    while (
      Date.now() -
      started <
      maxWait
    ) {

      try {

        const status =
          await jsonp_(
            {
              action:
                'orderStatus',

              requestId:
                payload.requestId,

              _:
                Date.now()
            },
            10000
          );


        /*
         * Сервер уже знайшов
         * результат саме цього
         * requestId.
         */
        if (
          status &&
          status.ok === true &&
          status.found === true
        ) {

          const result =
            status.result ||
            {};


          if (
            result.ok === true
          ) {

            return result;
          }


          throw new Error(
            result.error ||
            'Сервер не прийняв замовлення.'
          );
        }


        if (
          status &&
          status.ok === false &&
          status.error
        ) {

          lastNetworkError =
            new Error(
              status.error
            );
        }

      } catch (error) {

        lastNetworkError =
          error;
      }


      await delay_(
        1300
      );
    }


    if (
      lastNetworkError
    ) {

      console.warn(
        lastNetworkError
      );
    }


    /*
     * ВАЖЛИВО:
     * тут НЕ пишемо,
     * що замовлення втрачено.
     *
     * Воно могло вже
     * записатися в таблицю.
     */
    throw new Error(
      'Замовлення передано на сервер, але підтвердження затрималося. Не натискайте кнопку повторно. Перевірте замовлення в магазині або спробуйте оновити сторінку через кілька хвилин.'
    );
  }


  function postOrderViaIframe_(
    payload
  ) {

    const frameName =
      'dh_order_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2);


    const iframe =
      document.createElement(
        'iframe'
      );


    iframe.name =
      frameName;


    iframe.title =
      'Відправлення замовлення';


    iframe.hidden =
      true;


    iframe.style.display =
      'none';


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
      frameName;


    form.acceptCharset =
      'UTF-8';


    form.style.display =
      'none';


    const action =
      document.createElement(
        'input'
      );


    action.type =
      'hidden';


    action.name =
      'action';


    action.value =
      'createOrder';


    const body =
      document.createElement(
        'input'
      );


    body.type =
      'hidden';


    body.name =
      'payload';


    body.value =
      JSON.stringify(
        payload
      );


    form.append(
      action,
      body
    );


    document.body.appendChild(
      form
    );


    form.submit();


    form.remove();


    /*
     * iframe залишаємо
     * достатньо довго,
     * щоб Google завершив POST.
     */
    setTimeout(
      () => {

        iframe.remove();
      },
      60000
    );
  }


  /* ======================================================
     SUCCESS
     ====================================================== */

  function renderSuccessPage_() {

    const container =
      document.getElementById(
        'successOrderNumbers'
      );


    if (
      !container ||
      document.body.dataset.page !==
        'success'
    ) {
      return;
    }


    const result =
      loadJsonFromSession_(
        STORAGE.LAST_ORDER,
        null
      );


    if (
      !result ||
      !Array.isArray(
        result.created
      ) ||
      !result.created.length
    ) {

      container.innerHTML = `
        <p class="dh-muted">

          Замовлення передано магазину.

          Номер можна уточнити
          за телефоном магазину.

        </p>
      `;

      return;
    }


    container.innerHTML =
      result.created
        .map(
          order => `
            <div class="dh-success-order">

              <strong>
                №
                ${escapeHtml_(
                  order.orderId ||
                  ''
                )}
              </strong>

              ${
                order.pickupDate

                  ? `
                    <br>
                    Отримання:
                    ${escapeHtml_(
                      formatDate_(
                        order.pickupDate
                      )
                    )}

                    ${
                      order.pickupTime
                        ? ', ' +
                          escapeHtml_(
                            order.pickupTime
                          )
                        : ''
                    }
                  `

                  : `
                    <br>
                    Дата отримання —
                    після підтвердження
                    магазину
                  `
              }

              ${
                Number(
                  order.estimatedTotal
                ) > 0

                  ? `
                    <br>
                    Орієнтовна сума:
                    ${money_(
                      order.estimatedTotal
                    )}
                    грн
                  `

                  : ''
              }

            </div>
          `
        )
        .join('');
  }


  /* ======================================================
     CONTACTS
     ====================================================== */

  function renderContactsPage_() {

    if (
      document.body.dataset.page !==
      'contacts'
    ) {
      return;
    }


    const social =
      document.getElementById(
        'socialLinks'
      );


    if (social) {

      const links =
        [
          [
            'Telegram',
            setting_(
              'Telegram'
            )
          ],

          [
            'Facebook',
            setting_(
              'Facebook'
            )
          ],

          [
            'Instagram',
            setting_(
              'Instagram'
            )
          ],

          [
            'Viber',
            setting_(
              'Viber',
              'Viber / messenger',
              'Viber/messenger'
            )
          ]
        ]
          .filter(
            (
              [
                ,
                url
              ]
            ) =>
              Boolean(
                url
              )
          );


      social.innerHTML =
        links
          .map(
            (
              [
                name,
                url
              ]
            ) => `
              <a
                class="dh-social-link"
                href="${escapeAttr_(
                  url
                )}"
                target="_blank"
                rel="noopener"
              >
                ${escapeHtml_(
                  name
                )}
              </a>
            `
          )
          .join('');
    }


    const map =
      document.getElementById(
        'googleMap'
      );


    const embed =
      setting_(
        'Google Maps Embed URL',
        'Google Maps embed URL'
      );


    if (
      map &&
      embed
    ) {

      map.innerHTML = `
        <iframe
          src="${escapeAttr_(
            embed
          )}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          title="Магазин Господар на карті"
        ></iframe>
      `;
    }
  }


  /* ======================================================
     ACCOUNT
     ====================================================== */

  function renderAccountPage_() {

    const container =
      document.getElementById(
        'accountContent'
      );


    if (
      !container ||
      document.body.dataset.page !==
        'account'
    ) {
      return;
    }


    container.innerHTML = `
      <div class="dh-form-card">

        <span class="dh-section-label">
          Скоро
        </span>

        <h2>
          Кабінет покупця готується
        </h2>

        <p class="dh-muted">

          Зараз замовлення
          можна оформляти
          без реєстрації.

          Історію замовлень
          та самоскасування
          підключимо окремим етапом.

        </p>

        <a
          href="catalog.html"
          class="dh-primary-btn"
        >
          Перейти до каталогу
        </a>

      </div>
    `;
  }


  /* ======================================================
     JSONP
     ====================================================== */

  function jsonp_(
    params,
    timeoutMs =
      12000
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const callbackName =
          '__dh_jsonp_' +
          Date.now() +
          '_' +
          Math.random()
            .toString(36)
            .slice(2);


        const script =
          document.createElement(
            'script'
          );


        let finished =
          false;


        let timer;


        const cleanup =
          () => {

            if (
              finished
            ) {
              return;
            }


            finished =
              true;


            clearTimeout(
              timer
            );


            script.remove();


            try {

              delete window[
                callbackName
              ];

            } catch (_) {

              window[
                callbackName
              ] =
                undefined;
            }
          };


        window[
          callbackName
        ] =
          data => {

            cleanup();

            resolve(
              data
            );
          };


        const query =
          new URLSearchParams();


        Object
          .entries(
            params
          )
          .forEach(
            (
              [
                key,
                value
              ]
            ) => {

              query.set(
                key,
                String(
                  value
                )
              );
            }
          );


        query.set(
          'callback',
          callbackName
        );


        script.src =
          API_URL +
          '?' +
          query.toString();


        script.async =
          true;


        script.onerror =
          () => {

            cleanup();


            reject(
              new Error(
                'Не вдалося зв’язатися із сервером.'
              )
            );
          };


        timer =
          setTimeout(
            () => {

              cleanup();


              reject(
                new Error(
                  'Сервер відповідає надто довго.'
                )
              );
            },
            timeoutMs
          );


        document.head.appendChild(
          script
        );
      }
    );
  }


  /* ======================================================
     ANALYTICS
     ====================================================== */

  function initAnalytics_() {

    const id =
      String(
        setting_(
          'GA4 Measurement ID',
          'GA4',
          'Google Analytics 4'
        ) ||
        ''
      )
        .trim();


    if (
      !/^G-[A-Z0-9]+$/i.test(
        id
      ) ||
      window.gtag
    ) {
      return;
    }


    const script =
      document.createElement(
        'script'
      );


    script.async =
      true;


    script.src =
      'https://www.googletagmanager.com/gtag/js?id=' +
      encodeURIComponent(
        id
      );


    document.head.appendChild(
      script
    );


    window.dataLayer =
      window.dataLayer ||
      [];


    window.gtag =
      function() {

        window.dataLayer.push(
          arguments
        );
      };


    window.gtag(
      'js',
      new Date()
    );


    window.gtag(
      'config',
      id
    );
  }


  function track_(
    name,
    params =
      {}
  ) {

    if (
      typeof window.gtag ===
      'function'
    ) {

      window.gtag(
        'event',
        name,
        params
      );
    }
  }


  /* ======================================================
     HELPERS
     ====================================================== */

  function productById_(
    id
  ) {

    return state.products.find(
      p =>
        String(
          p.id
        ) ===
        String(
          id
        )
    );
  }


  function formatDate_(
    iso
  ) {

    if (!iso) {
      return '';
    }


    const match =
      String(
        iso
      )
        .match(
          /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (!match) {

      return String(
        iso
      );
    }


    const date =
      new Date(
        Date.UTC(
          Number(
            match[1]
          ),
          Number(
            match[2]
          ) - 1,
          Number(
            match[3]
          ),
          12
        )
      );


    return new Intl
      .DateTimeFormat(
        'uk-UA',
        {
          weekday:
            'long',

          day:
            'numeric',

          month:
            'long'
        }
      )
      .format(
        date
      );
  }


  function money_(
    value
  ) {

    const number =
      Number(
        value ||
        0
      );


    return new Intl
      .NumberFormat(
        'uk-UA',
        {
          minimumFractionDigits:
            Number.isInteger(
              number
            )
              ? 0
              : 2,

          maximumFractionDigits:
            2
        }
      )
      .format(
        number
      );
  }


  function formatQty_(
    value
  ) {

    const n =
      Number(
        value ||
        0
      );


    return new Intl
      .NumberFormat(
        'uk-UA',
        {
          maximumFractionDigits:
            3
        }
      )
      .format(
        n
      );
  }


  function positiveNumber_(
    value,
    fallback
  ) {

    const n =
      Number(
        value
      );


    return (
      Number.isFinite(
        n
      ) &&
      n > 0
    )
      ? n
      : fallback;
  }


  function roundQty_(
    value,
    step
  ) {

    const decimals =
      String(
        step
      )
        .includes('.')

        ? String(
            step
          )
            .split('.')[1]
            .length

        : 0;


    return Number(
      Number(
        value
      )
        .toFixed(
          Math.max(
            decimals,
            3
          )
        )
    );
  }


  function roundMoney_(
    value
  ) {

    return (
      Math.round(
        Number(
          value ||
          0
        ) *
        100
      ) /
      100
    );
  }


  function createRequestId_() {

    if (
      window.crypto &&
      typeof window.crypto
        .randomUUID ===
        'function'
    ) {

      return window.crypto
        .randomUUID()
        .replace(
          /-/g,
          ''
        );
    }


    return (
      'req_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(
          2,
          12
        )
    );
  }


  function delay_(
    ms
  ) {

    return new Promise(
      resolve => {

        setTimeout(
          resolve,
          ms
        );
      }
    );
  }


  function loadJson_(
    key,
    fallback
  ) {

    try {

      const raw =
        localStorage.getItem(
          key
        );


      return raw
        ? JSON.parse(
            raw
          )
        : fallback;

    } catch (_) {

      return fallback;
    }
  }


  function loadJsonFromSession_(
    key,
    fallback
  ) {

    try {

      const raw =
        sessionStorage.getItem(
          key
        );


      return raw
        ? JSON.parse(
            raw
          )
        : fallback;

    } catch (_) {

      return fallback;
    }
  }


  function escapeHtml_(
    value
  ) {

    return String(
      value == null
        ? ''
        : value
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );
  }


  function escapeAttr_(
    value
  ) {

    return escapeHtml_(
      value
    );
  }


  function showPageError_(
    message
  ) {

    const main =
      document.getElementById(
        'pageError'
      ) ||
      document.querySelector(
        'main'
      ) ||
      document.body;


    const box =
      document.createElement(
        'div'
      );


    box.className =
      'dh-error-box';


    box.textContent =
      message;


    main.prepend(
      box
    );
  }


  function toast_(
    message
  ) {

    let toast =
      document.getElementById(
        'dhToast'
      );


    if (!toast) {

      toast =
        document.createElement(
          'div'
        );


      toast.id =
        'dhToast';


      toast.className =
        'dh-toast';


      document.body.appendChild(
        toast
      );
    }


    toast.textContent =
      message;


    toast.classList.add(
      'is-visible'
    );


    clearTimeout(
      toast._timer
    );


    toast._timer =
      setTimeout(
        () => {

          toast.classList.remove(
            'is-visible'
          );
        },
        4500
      );
  }

})();
