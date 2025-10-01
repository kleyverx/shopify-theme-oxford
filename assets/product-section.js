/*
  Oxford Theme - Product Section JS (Reescrito)
  - Manejo robusto de variantes (selects, radios, chips)
  - Sincronización de precio, imagen principal y disponibilidad
  - Actualización del input name="id" y URL (?variant=)
  - Interacciones de miniaturas y zoom opcional
*/

(function () {
  'use strict';

  /** Utilidades **/
  const qs = (root, sel) => (root || document).querySelector(sel);
  const qsa = (root, sel) => Array.from((root || document).querySelectorAll(sel));

  function decodeHtmlEntities(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
  }

  function formatMoney(cents) {
    try {
      if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        return window.Shopify.formatMoney(cents, window.Shopify.money_format || '${{amount}}');
      }
    } catch (e) {}
    const amount = (Number(cents || 0) / 100).toFixed(2);
    return `$${amount}`;
  }

  function applyCssVarsFromData(section) {
    if (!section) return;
    const map = {
      primaryColor: '--primary-color',
      secondaryColor: '--secondary-color',
      accentColor: '--accent-color',
      borderColor: '--border-color',
      borderRadius: '--border-radius',
      spacingSm: '--spacing-sm',
      spacingMd: '--spacing-md',
      spacingLg: '--spacing-lg',
      containerMaxWidth: '--container-max-width',
      columnsGap: '--columns-gap',
      imageRatio: '--image-ratio',
      imageShadow: '--image-shadow',
      imageFit: '--image-fit',
      titleSize: '--title-size',
      titleWeight: '--title-weight',
      transition: '--transition'
    };
    // Algunas variables requieren unidades para que el CSS sea válido
    const unitVars = {
      '--border-radius': 'px',
      '--container-max-width': 'px',
      '--columns-gap': 'px',
      '--title-size': 'rem'
    };
    const needsUnit = (val) => /^-?\d+(?:\.\d+)?$/.test(String(val || ''));
    Object.entries(map).forEach(([dataKey, cssVar]) => {
      const attr = 'data-' + dataKey.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      const val = section.getAttribute(attr);
      if (val != null && val !== '') {
        const unit = unitVars[cssVar];
        if (unit && needsUnit(val)) {
          section.style.setProperty(cssVar, `${val}${unit}`);
        } else {
          section.style.setProperty(cssVar, val);
        }
      }
    });
    // Aplicar fondo directamente si se configuró
    const bgColor = section.getAttribute('data-bg-color');
    if (bgColor) {
      section.style.backgroundColor = bgColor;
      section.style.setProperty('--bg-color', bgColor);
    }
    // Asegurar paddings con unidades
    const padTop = section.getAttribute('data-padding-top');
    const padBottom = section.getAttribute('data-padding-bottom');
    if (padTop != null && padTop !== '') {
      section.style.paddingTop = needsUnit(padTop) ? `${padTop}px` : padTop;
    }
    if (padBottom != null && padBottom !== '') {
      section.style.paddingBottom = needsUnit(padBottom) ? `${padBottom}px` : padBottom;
    }
    if (section.getAttribute('data-enable-zoom') === 'true') {
      section.classList.add('enable-zoom');
    } else {
      section.classList.remove('enable-zoom');
    }
  }

  function getProductData(section) {
    // Prioridad: bloque add-to-cart con data-product-json, luego window.product
    const addToCartBlock = qs(section, '.add-to-cart-block');
    if (addToCartBlock) {
      const raw = addToCartBlock.getAttribute('data-product-json');
      if (raw) {
        try {
          const parsed = JSON.parse(decodeHtmlEntities(raw));
          return parsed;
        } catch (e) {
          console.warn('[product-section] Error al parsear data-product-json:', e);
        }
      }
    }
    if (window.product) return window.product;
    return null;
  }

  function getSelectedOptions(section) {
    const container = section;
    // Ampliar compatibilidad: option1/option2..., options[Name], y data-variant-select
    const selects = qsa(container, '[data-variant-select], select[name^="option"], select[name^="options"]');
    const radiosGroups = new Map();
    qsa(container, 'input[type="radio"][name^="option"], input[type="radio"][name^="options"]').forEach(el => {
      const name = el.name;
      if (!radiosGroups.has(name)) radiosGroups.set(name, []);
      radiosGroups.get(name).push(el);
    });
    const genericButtons = qsa(container, '[data-option-selector]');

    const options = [];

    // Primero: selects
    selects.forEach((sel) => {
      const val = sel.value;
      if (val) options.push(val);
    });

    // Segundo: radios
    radiosGroups.forEach((group) => {
      const checked = group.find(r => r.checked);
      if (checked) options.push(checked.value);
    });

    // Tercero: botones genéricos con data-option-selector (de ser necesarios)
    if (genericButtons.length) {
      // Consideramos activos los que tengan aria-pressed="true" o clase .active
      genericButtons.forEach(btn => {
        const pressed = btn.getAttribute('aria-pressed') === 'true' || btn.classList.contains('active');
        if (pressed && btn.dataset.optionValue) options.push(btn.dataset.optionValue);
      });
    }

    return options;
  }

  function findVariantByOptions(product, selectedOptions) {
    if (!product || !product.variants) return null;
    if (!Array.isArray(selectedOptions) || !selectedOptions.length) return null;
    const normalized = selectedOptions.map(v => (v || '').toString().trim().toLowerCase());
    return product.variants.find(v => {
      const opts = (v.options || []).map(o => (o || '').toString().trim().toLowerCase());
      if (opts.length !== normalized.length) return false;
      for (let i = 0; i < opts.length; i++) {
        if (opts[i] !== normalized[i]) return false;
      }
      return true;
    }) || null;
  }

  function findVariantById(product, id) {
    if (!product || !product.variants) return null;
    const numId = Number(id);
    return product.variants.find(v => Number(v.id) === numId) || null;
  }

  function updateVariantId(section, variant) {
    if (!variant) return;
    const form = qs(section, 'form[action^="/cart/add"], form[action*="/cart/add"]') || qs(section, 'form');
    const input = form ? qs(form, 'input[name="id"]') : null;
    if (input) input.value = variant.id;
    // Persistir variante actual en el contenedor de sección para uso sin formulario
    try { section.dataset.currentVariantId = String(variant.id); } catch (e) {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', String(variant.id));
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
    const currentVariantNameEl = qs(section, '[data-current-variant-name]');
    if (currentVariantNameEl) currentVariantNameEl.textContent = variant.title || '';
  }

  function updatePrice(section, variant, product) {
    const priceWrap = qs(section, '[data-product-price]');
    if (!priceWrap) return;
    const saleEl = qs(priceWrap, '[data-sale-price]');
    const compareEl = qs(priceWrap, '[data-compare-price]');
    const regularEl = qs(priceWrap, '[data-regular-price]');

    const priceCents = variant ? variant.price : (product && product.price);
    const compareCents = variant ? variant.compare_at_price : (product && product.compare_at_price);

    if (compareEl && compareCents && Number(compareCents) > Number(priceCents)) {
      if (saleEl) saleEl.textContent = formatMoney(priceCents);
      compareEl.textContent = formatMoney(compareCents);
      if (regularEl) regularEl.textContent = '';
    } else {
      if (regularEl) regularEl.textContent = formatMoney(priceCents);
      if (saleEl) saleEl.textContent = '';
      if (compareEl) compareEl.textContent = '';
    }
  }

  // Actualiza el total mostrado multiplicando precio por cantidad
  function updatePriceTotal(section, variant, product) {
    const totalEl = qs(section, '[data-price-total]');
    if (!totalEl) return;
    const qtyInput = qs(section, '[data-quantity-input], input[name="quantity"]');
    const qty = qtyInput && qtyInput.value ? Math.max(1, Number(qtyInput.value)) : 1;
    const priceCents = variant ? variant.price : (product && product.price);
    const totalCents = Number(priceCents || 0) * qty;
    totalEl.textContent = formatMoney(totalCents);
  }

  function swapMainImage(section, newSrc, mediaId, altText) {
    const mainImage = qs(section, '#mainImage') || qs(section, '[data-main-image]') || qs(section, '.main-image');
    if (!mainImage || !newSrc) return;
    const img = new Image();
    mainImage.classList.add('fading');
    img.onload = function () {
      // Actualiza src y también limpia/ajusta srcset para evitar conflicto del navegador
      mainImage.src = newSrc;
      mainImage.removeAttribute('srcset');
      if (altText) mainImage.alt = altText;
      mainImage.classList.remove('fading');
      // actualizar miniatura activa
      if (mediaId) {
        qsa(section, '.product-thumbnail-item').forEach(t => {
          const isActive = String(t.getAttribute('data-media-id')) === String(mediaId);
          t.classList.toggle('active', isActive);
        });
      }
    };
    img.src = newSrc;
  }

  function updateVariantImage(section, variant) {
    if (!variant) return;
    const media = variant.featured_media || variant.featured_image || null;
    let src = null;
    let mediaId = null;
    let altText = variant && variant.title ? variant.title : '';
    if (media) {
      mediaId = media.id || null;
      // Preferir la miniatura existente para obtener un src consistente con el ancho usado en la sección
      const thumbEl = mediaId ? qs(section, `.product-thumbnail-item[data-media-id="${mediaId}"]`) : null;
      if (thumbEl) {
        src = thumbEl.getAttribute('data-image-src');
        const thumbImg = qs(thumbEl, 'img');
        if (thumbImg && thumbImg.alt) altText = thumbImg.alt;
      }
      // Fallback al src de media del objeto variant
      if (!src) {
        if (media.preview_image && media.preview_image.src) {
          src = media.preview_image.src;
        } else if (media.src) {
          src = media.src;
        }
      }
    }

    if (src) {
      swapMainImage(section, src, mediaId, altText);
    }
  }

  function updateAvailability(section, variant) {
    const stockEl = qs(section, '[data-stock-message], .stock-message');
    if (!stockEl) return;
    const block = qs(section, '.add-to-cart-block');
    const maxAttr = block ? Number(block.getAttribute('data-max-stock')) : NaN;

    const tracked = variant && variant.inventory_management === 'shopify';
    const policyContinue = variant && variant.inventory_policy === 'continue';
    const invQty = variant && typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : null;

    let available = variant ? !!variant.available : true;
    let effectiveMax = null;

    if (tracked && !policyContinue) {
      effectiveMax = invQty;
      if (typeof invQty === 'number' && invQty <= 0) available = false;
    } else if (!Number.isNaN(maxAttr)) {
      effectiveMax = maxAttr;
      if (typeof maxAttr === 'number' && maxAttr <= 0) available = false;
    }

    if (available) {
      if (typeof effectiveMax === 'number') {
        stockEl.textContent = `Stock disponible: ${effectiveMax}`;
        stockEl.classList.remove('is-hidden');
      } else {
        stockEl.textContent = '';
        stockEl.classList.add('is-hidden');
      }
    } else {
      stockEl.textContent = 'Sin stock para la variante seleccionada.';
      stockEl.classList.remove('is-hidden');
    }
  }

  // Sincroniza selects, radios y chips con la variante actual
  function syncVariantInputs(section, product, variant) {
    if (!section || !product || !variant) return;
    const optionNames = Array.isArray(product.options) ? product.options.map(o => o && o.name) : [];
    const values = Array.isArray(variant.options) ? variant.options.slice() : [];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const optName = optionNames[i];
      const nameByIndex = `option${i + 1}`;

      // Select por índice: name="option{n}"
      const selByIndex = qs(section, `select[name="${nameByIndex}"]`);
      if (selByIndex) {
        const hasOption = Array.from(selByIndex.options).some(o => (o.value || o.textContent) === value);
        if (hasOption) selByIndex.value = value;
      }

      // Select por nombre: name="options[Nombre]"
      if (optName) {
        const selects = qsa(section, 'select[name^="options[" ]');
        const selByName = selects.find(s => s.name === `options[${optName}]`);
        if (selByName) {
          const hasOption = Array.from(selByName.options).some(o => (o.value || o.textContent) === value);
          if (hasOption) selByName.value = value;
        }
      }

      // Radios por índice
      qsa(section, `input[type="radio"][name="${nameByIndex}"]`).forEach(r => {
        r.checked = (r.value === value);
      });

      // Radios por nombre
      if (optName) {
        qsa(section, `input[type="radio"][name="options[${optName}]" ]`).forEach(r => {
          r.checked = (r.value === value);
        });
      }

      // Botones genéricos (si existen y están agrupados por índice)
      qsa(section, `[data-option-selector][data-option-index="${i + 1}"]`).forEach(btn => {
        const v = btn.dataset.optionValue || btn.getAttribute('data-option-value');
        const active = v === value;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('active', !!active);
      });
    }
  }

  // Obtener el ID de la variante actual de forma robusta
  function getCurrentVariantId(section, product) {
    // 1) Intentar desde input[name="id"] si hay formulario
    const form = qs(section, 'form[action*="/cart/add"], form');
    const idInput = form ? qs(form, 'input[name="id"]') : null;
    if (idInput && idInput.value) return Number(idInput.value);

    // 2) Intentar desde dataset de la sección (actualizado en updateVariantId)
    if (section && section.dataset && section.dataset.currentVariantId) {
      const v = Number(section.dataset.currentVariantId);
      if (!Number.isNaN(v)) return v;
    }

    // 3) Intentar desde la URL (?variant=)
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get('variant');
      if (v) {
        const num = Number(v);
        if (!Number.isNaN(num)) return num;
      }
    } catch (_) {}

    // 4) Resolver por opciones seleccionadas
    const opts = getSelectedOptions(section);
    const variantObj = findVariantByOptions(product, opts);
    if (variantObj && variantObj.id) return Number(variantObj.id);

    // 5) Fallback a la primera disponible
    const fallback = product && (product.selected_or_first_available_variant || (product.variants && product.variants[0]));
    return fallback && fallback.id ? Number(fallback.id) : null;
  }

  function handleVariantChange(section, product, source) {
    if (!product) return;
    let variant = null;

    if (source === 'variantId') {
      const form = qs(section, 'form');
      const idInput = form ? qs(form, 'input[name="id"]') : null;
      if (idInput && idInput.value) variant = findVariantById(product, idInput.value);
    } else {
      const selectedOptions = getSelectedOptions(section);
      variant = findVariantByOptions(product, selectedOptions);
    }

    if (!variant) {
      variant = product.selected_or_first_available_variant || product.variants && product.variants[0] || null;
    }

    if (!variant) return;
    updateVariantId(section, variant);
    updateVariantImage(section, variant);
    updatePrice(section, variant, product);
    updateAvailability(section, variant);

    section.dispatchEvent(new CustomEvent('variant:changed', { detail: { variant } }));
  }

  function bindVariantSelectors(section, product) {
    const onChange = () => handleVariantChange(section, product, 'options');
    qsa(section, '[data-variant-select], select[name^="option"], select[name^="options"]').forEach(el => el.addEventListener('change', () => {
      // Limpiar errores de validación si los hubiera
      try { el.setCustomValidity(''); } catch (_) {}
      onChange();
    }));
    qsa(section, 'input[type="radio"][name^="option"], input[type="radio"][name^="options"]').forEach(el => el.addEventListener('change', onChange));
    qsa(section, '[data-option-selector]').forEach(el => el.addEventListener('click', function () {
      const pressed = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      this.classList.toggle('active');
      onChange();
    }));
  }

  function bindThumbnails(section) {
    qsa(section, '.product-thumbnail-item').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const src = thumb.getAttribute('data-image-src');
        const mediaId = thumb.getAttribute('data-media-id');
        swapMainImage(section, src, mediaId);
        // Si la miniatura corresponde a una variante, sincronizar variante/precio/stock
        const product = getProductData(section);
        if (product && product.variants) {
          const matched = product.variants.find(v => {
            const m = v.featured_media || v.featured_image;
            return m && String(m.id) === String(mediaId);
          });
          if (matched) {
            updateVariantId(section, matched);
            updatePrice(section, matched, product);
            updateAvailability(section, matched);
            syncVariantInputs(section, product, matched);
            section.dispatchEvent(new CustomEvent('variant:changed', { detail: { variant: matched } }));
          }
        }
      });
    });

    // Navegación simple del carrusel (si existe)
    const track = qs(section, '[data-thumbnails-track]');
    const prev = qs(section, '[data-thumbnails-prev]');
    const next = qs(section, '[data-thumbnails-next]');
    if (track && prev) prev.addEventListener('click', () => track.scrollBy({ left: -200, behavior: 'smooth' }));
    if (track && next) next.addEventListener('click', () => track.scrollBy({ left: 200, behavior: 'smooth' }));
  }

  function bindAddToCart(section, product) {
    // Solo considerar formularios de add-to-cart explícitos
    const form = qs(section, 'form[action*="/cart/add"]');
    // Incluir el selector usado en product.liquid: [data-add-to-cart]
    const btn = qs(section, '.add-to-cart-btn, [data-add-to-cart], [data-add-to-cart-btn]');
    // Permitir buscar cantidad sin depender del formulario
    const qtyInput = qs(section, '[data-quantity-input], input[name="quantity"]');

    function ensureVariantAndSubmit(e) {
      // Evitar acciones por defecto en cualquier caso
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      // Asegura que el id de variante esté actualizado con las opciones actuales
      handleVariantChange(section, product, 'options');
      const variantId = getCurrentVariantId(section, product);
      const quantity = qtyInput && qtyInput.value ? Number(qtyInput.value) : 1;

      // Recopilar propiedades personalizadas y selling_plan si existen
      const collectProps = (root) => {
        const params = new URLSearchParams();
        qsa(root || section, '[name^="properties"]').forEach(el => {
          const name = el.name; // e.g., properties[Grind]
          const val = (el.type === 'checkbox') ? (el.checked ? (el.value || 'on') : '') : (el.value || '');
          if (name && val !== '') params.append(name, val);
        });
        const plan = qs(root || section, '[name="selling_plan"]');
        if (plan && plan.value) params.append('selling_plan', plan.value);
        return params;
      };

      if (form) {
        // Deja que Shopify maneje el submit tradicional
        try {
          form.requestSubmit ? form.requestSubmit() : form.submit();
        } catch (_) {
          form.submit();
        }
      } else if (variantId) {
        // Fallback sin formulario: usa AJAX API de Shopify
        const base = new URLSearchParams();
        base.append('id', String(Number(variantId)));
        base.append('quantity', String(quantity));
        const extra = collectProps(section);
        extra.forEach((v, k) => base.append(k, v));
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: base.toString()
        })
        .then(r => r.json())
        .then((item) => {
          // Emitir evento esperado por mini-cart para recargar y abrir
          document.dispatchEvent(new CustomEvent('cart:item-added', { detail: { item } }));
        })
        .catch(() => {});
      }
    }

    if (btn) btn.addEventListener('click', (e) => {
      // Evita doble submit si el botón está dentro del formulario
      if (form && btn.closest('form') === form) {
        e.preventDefault();
      }
      ensureVariantAndSubmit(e);
    });

    if (form) {
      form.addEventListener('submit', () => {
        // Asegurar variante antes de enviar
        handleVariantChange(section, product, 'options');
      });
    }
  }

  // Aplicar estilos del bloque Add to Cart desde data-* como variables CSS
  function applyAddToCartStyles(section) {
    const block = qs(section, '.add-to-cart-block');
    if (!block) return;

    // Utilidad: no sobrescribir si la variable ya está definida inline
    const setVarIfNotInline = (el, varName, value) => {
      if (!value) return;
      const existing = el.style.getPropertyValue(varName);
      if (existing && existing.trim() !== '') return; // respetar override inline
      el.style.setProperty(varName, value);
    };

    // Normalización de valores de color provenientes del editor (p.ej. "Transparente")
    const normalizeColor = (v) => {
      const s = (v || '').trim().toLowerCase();
      if (!s) return '';
      if (s === 'transparente') return 'transparent';
      return v;
    };

    // Variables para botones de cantidad e input
    const ds = block.dataset || {};
    setVarIfNotInline(block, '--quantity-btn-color', normalizeColor(ds.quantityBtnColor));
    setVarIfNotInline(block, '--quantity-btn-bg', normalizeColor(ds.quantityBtnBg));
    setVarIfNotInline(block, '--quantity-input-bg', normalizeColor(ds.quantityInputBg));
    setVarIfNotInline(block, '--quantity-input-color', normalizeColor(ds.quantityInputColor));
    setVarIfNotInline(block, '--quantity-label-color', normalizeColor(ds.quantityLabelColor));
    setVarIfNotInline(block, '--price-total-label-color', normalizeColor(ds.priceTotalLabelColor));
    setVarIfNotInline(block, '--price-total-value-color', normalizeColor(ds.priceTotalValueColor));

    // Botón principal
    const btn = qs(block, '[data-add-to-cart], .add-to-cart-btn');
    if (btn) {
      const bg = normalizeColor(
        btn.getAttribute('data-button-bg') || btn.dataset.buttonBg || (block.dataset ? block.dataset.buttonBg : '')
      );
      const text = normalizeColor(
        btn.getAttribute('data-button-text') || btn.dataset.buttonText || (block.dataset ? block.dataset.buttonText : '')
      );
      setVarIfNotInline(btn, '--btn-bg', bg);
      setVarIfNotInline(btn, '--btn-text', text);
      // Alinear posibles reglas que dependan de --nav-link-color
      setVarIfNotInline(btn, '--nav-link-color', bg);
    }
  }

  // Vincular controles de cantidad y mantener actualizado el total
  function bindQuantityControls(section, product) {
    const qtyInput = qs(section, '[data-quantity-input], input[name="quantity"]');
    const minusBtn = qs(section, '[data-quantity-change="minus"], [data-quantity-change="-1"], .quantity-btn--decrease');
    const plusBtn = qs(section, '[data-quantity-change="plus"], [data-quantity-change="1"], .quantity-btn--increase');
    // Evitar doble enlace de listeners si esta función se invoca más de una vez
    const alreadyBound = section && section.dataset && section.dataset.qtyBound === 'true';

    const clampByStock = (val) => {
      const currentId = getCurrentVariantId(section, product);
      const v = findVariantById(product, currentId);
      let next = Math.max(1, Number(val) || 1);
      if (v && v.inventory_management === 'shopify' && v.inventory_policy !== 'continue') {
        const max = v.inventory_quantity;
        if (typeof max === 'number') next = Math.min(next, Math.max(1, max));
      } else {
        const block = qs(section, '.add-to-cart-block');
        const maxAttr = block ? Number(block.getAttribute('data-max-stock')) : NaN;
        if (!Number.isNaN(maxAttr)) next = Math.min(next, Math.max(1, maxAttr));
      }
      return next;
    };

    const getMaxStock = () => {
      const currentId = getCurrentVariantId(section, product);
      const v = findVariantById(product, currentId);
      if (v && v.inventory_management === 'shopify' && v.inventory_policy !== 'continue') {
        if (typeof v.inventory_quantity === 'number') return v.inventory_quantity;
      }
      const block = qs(section, '.add-to-cart-block');
      const maxAttr = block ? Number(block.getAttribute('data-max-stock')) : NaN;
      return Number.isNaN(maxAttr) ? null : maxAttr;
    };

    const setInputMaxByStock = () => {
      const max = getMaxStock();
      if (qtyInput) {
        if (typeof max === 'number') {
          qtyInput.setAttribute('max', String(Math.max(1, max)));
        } else {
          qtyInput.removeAttribute('max');
        }
      }
    };

    const updateButtonsState = () => {
      const max = getMaxStock();
      if (plusBtn && qtyInput) {
        const currentQty = Math.max(1, Number(qtyInput.value) || 1);
        const disabled = typeof max === 'number' && currentQty >= max;
        plusBtn.disabled = !!disabled;
        plusBtn.classList.toggle('quantity-btn--disabled', !!disabled);
        if (disabled) {
          plusBtn.title = `Stock máximo alcanzado (${max} unidades)`;
        } else {
          plusBtn.removeAttribute('title');
        }
      }
    };

    // Asegurar un valor inicial coherente
    if (qtyInput && (!qtyInput.value || Number(qtyInput.value) < 1)) {
      qtyInput.value = '1';
    }
    setInputMaxByStock();
    if (qtyInput) {
      qtyInput.value = clampByStock(qtyInput.value);
    }

    // Si ya estaba enlazado previamente, solo refrescamos estado y salimos
    if (alreadyBound) {
      const currentId = getCurrentVariantId(section, product);
      const v = findVariantById(product, currentId);
      updatePriceTotal(section, v, product);
      updateButtonsState();
      return;
    }

    // Marcar como enlazado para futuras invocaciones idempotentes
    if (section && section.dataset) {
      section.dataset.qtyBound = 'true';
    }

    const refreshTotal = () => {
      const currentId = getCurrentVariantId(section, product);
      const v = findVariantById(product, currentId);
      updatePriceTotal(section, v, product);
      updateButtonsState();
    };

    if (qtyInput) {
      qtyInput.addEventListener('input', () => {
        qtyInput.value = clampByStock(qtyInput.value);
        refreshTotal();
      });
      qtyInput.addEventListener('change', () => {
        qtyInput.value = clampByStock(qtyInput.value);
        refreshTotal();
      });
    }

    if (minusBtn && qtyInput) {
      let adjusting = false;
      minusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (adjusting) return;
        adjusting = true;
        const change = minusBtn.dataset.quantityChange ? Number(minusBtn.dataset.quantityChange) : -1;
        const val = clampByStock((Number(qtyInput.value) || 1) + (Number.isNaN(change) ? -1 : change));
        qtyInput.value = val;
        refreshTotal();
        setTimeout(() => { adjusting = false; }, 0);
      }, { capture: true });
    }

    if (plusBtn && qtyInput) {
      let adjusting = false;
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (adjusting) return;
        adjusting = true;
        const change = plusBtn.dataset.quantityChange ? Number(plusBtn.dataset.quantityChange) : 1;
        const val = clampByStock((Number(qtyInput.value) || 1) + (Number.isNaN(change) ? 1 : change));
        qtyInput.value = val;
        refreshTotal();
        setTimeout(() => { adjusting = false; }, 0);
      }, { capture: true });
    }

    // Mantener total cuando cambie la variante
    section.addEventListener('variant:changed', (ev) => {
      setInputMaxByStock();
      if (qtyInput) {
        qtyInput.value = clampByStock(qtyInput.value);
      }
      updatePriceTotal(section, ev.detail && ev.detail.variant, product);
      updateButtonsState();
    });

    // Inicial
    refreshTotal();
  }

  function bindZoom(section) {
    const mainImage = qs(section, '#mainImage') || qs(section, '[data-main-image]') || qs(section, '.main-image');
    if (!mainImage) return;
    const enable = section.classList.contains('enable-zoom');
    if (!enable) return;
    mainImage.addEventListener('click', () => {
      mainImage.classList.toggle('zoomed');
    });
  }

  function initSection(section) {
    applyCssVarsFromData(section);
    applyAddToCartStyles(section);
    const product = getProductData(section);
    if (!product) {
      console.warn('[product-section] No se encontraron datos del producto.');
      return;
    }

    // Estado inicial
    handleVariantChange(section, product, 'options');

    // Eventos
    bindVariantSelectors(section, product);
    bindThumbnails(section);
    bindAddToCart(section, product);
    bindQuantityControls(section, product);
    bindZoom(section);

    // Asegurar que el total esté en sincronía al inicio
    const currentId = getCurrentVariantId(section, product);
    const v = findVariantById(product, currentId);
    updatePriceTotal(section, v, product);
    syncVariantInputs(section, product, v);
    section.addEventListener('variant:changed', (ev) => {
      const variant = ev && ev.detail && ev.detail.variant;
      syncVariantInputs(section, product, variant);
    });
  }

  function initAll() {
    const sections = qsa(document, '.product-gallery-section');
    sections.forEach(initSection);
  }

  document.addEventListener('DOMContentLoaded', initAll);
})();