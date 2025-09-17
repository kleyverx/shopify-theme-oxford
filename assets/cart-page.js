/**
 * Cart Page JavaScript - Oxford Theme
 * Sistema completo de página de carrito con Ajax
 * Basado en Shopify Cart API
 */

class CartPage {
  constructor() {
    this.isLoading = false;
    this.cartData = null;
    this.updateTimeout = null;
    
    // Elementos DOM
    this.cartForm = document.querySelector('#cart-form') || document.querySelector('.cart-form');
    this.cartItems = document.querySelector('.cart-items');
    this.cartEmpty = document.querySelector('.cart-empty');
    this.cartTotal = document.querySelector('.cart-total');
    this.cartSubtotal = document.querySelector('.cart-subtotal');
    this.cartCount = document.querySelector('.cart-count');
    this.checkoutBtn = document.querySelector('.cart-checkout') || document.querySelector('[name="checkout"]');
    this.updateBtn = document.querySelector('.cart-update') || document.querySelector('[type="submit"]');
    this.clearBtn = document.querySelector('.cart-clear');
    this.loadingOverlay = document.querySelector('.cart-loading');
    this.errorContainer = document.querySelector('.cart-errors');
    
    this.init();
  }

  init() {
    if (!this.cartForm) return;
    
    this.bindEvents();
    this.loadCart();
    
    // Escuchar eventos personalizados del mini-cart
    document.addEventListener('cart:updated', (event) => {
      if (event.detail && event.detail.source !== 'cart-page') {
        const { cartData, source, timestamp } = event.detail;
        
        // Actualizar datos del carrito con información completa
        this.cartData = cartData || event.detail;
        this.updateCartDisplay();
        
        console.log('Cart page sincronizado desde:', source, 'a las', new Date(timestamp));
      }
    });
  }

  bindEvents() {
    // Delegación de eventos para elementos dinámicos
    if (this.cartItems) {
      this.cartItems.addEventListener('click', (e) => this.handleItemClick(e));
      this.cartItems.addEventListener('change', (e) => this.handleItemChange(e));
      this.cartItems.addEventListener('input', (e) => this.handleItemInput(e));
    }

    // Botones de acción del carrito
    if (this.updateBtn) {
      this.updateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.updateCart();
      });
    }

    if (this.checkoutBtn) {
      this.checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.checkout();
      });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearCart();
      });
    }
  }

  // Método mejorado para actualizar descuentos de artículos
  updateItemDiscounts(itemRow, item) {
    if (!itemRow || !item) return;

    const pricingContainer = itemRow.querySelector('.cart-item__pricing');
    if (!pricingContainer) return;

    // Buscar o crear contenedor de descuentos
    let discountsContainer = pricingContainer.querySelector('.cart-item__discounts');
    if (!discountsContainer) {
      discountsContainer = document.createElement('div');
      discountsContainer.className = 'cart-item__discounts';
      discountsContainer.style.cssText = 'margin-top: 0.5rem; display: block;';
      
      const linePriceContainer = pricingContainer.querySelector('.cart-item__line-price');
      if (linePriceContainer) {
        linePriceContainer.appendChild(discountsContainer);
      } else {
        pricingContainer.appendChild(discountsContainer);
      }
    }

    // Limpiar descuentos existentes
    discountsContainer.innerHTML = '';

    // Mostrar descuentos si existen
    if (item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0) {
      item.line_level_discount_allocations.forEach(discount => {
        const discountElement = document.createElement('div');
        discountElement.className = 'cart-item__discount';
        discountElement.style.cssText = `
          display: flex !important;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          color: #28a745;
          font-size: 0.85rem;
          font-weight: 500;
        `;
        
        discountElement.innerHTML = `
          <span class="discount-title" style="font-weight: 500;">${discount.discount_application.title}</span>
          <span class="discount-amount" style="color: #059669; font-weight: 600;">-${this.formatMoney(discount.amount)}</span>
        `;
        
        discountsContainer.appendChild(discountElement);
      });
      discountsContainer.style.display = 'block';
    } else {
      discountsContainer.style.display = 'none';
    }
  }

  // Método mejorado para actualizar descuentos del carrito
  updateCartDiscounts() {
    const cartFooter = document.querySelector('.cart-footer');
    if (!cartFooter || !this.cartData) return;

    // Buscar o crear contenedor de descuentos
    let discountsContainer = cartFooter.querySelector('.cart-discounts');
    if (!discountsContainer) {
      discountsContainer = document.createElement('div');
      discountsContainer.className = 'cart-discounts';
      discountsContainer.style.cssText = 'margin-bottom: 1.5rem; display: block;';
      
      const cartTotals = cartFooter.querySelector('.cart-totals');
      if (cartTotals) {
        cartFooter.insertBefore(discountsContainer, cartTotals);
      } else {
        cartFooter.insertBefore(discountsContainer, cartFooter.firstChild);
      }
    }

    // Limpiar descuentos existentes
    discountsContainer.innerHTML = '';

    // Mostrar descuentos si existen
    if (this.cartData.cart_level_discount_applications && this.cartData.cart_level_discount_applications.length > 0) {
      const title = document.createElement('h3');
      title.textContent = 'Descuentos';
      title.style.cssText = 'margin: 0 0 1rem 0; font-size: 1.2rem; color: #333;';
      discountsContainer.appendChild(title);

      this.cartData.cart_level_discount_applications.forEach(discount => {
        const discountElement = document.createElement('div');
        discountElement.className = 'cart-discount';
        discountElement.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e5e5e5;
        `;
        
        discountElement.innerHTML = `
          <span class="discount-title" style="font-weight: 500;">${discount.title}</span>
          <span class="discount-amount" style="color: #28a745; font-weight: 600;">-${this.formatMoney(discount.total_allocated_amount)}</span>
        `;
        
        discountsContainer.appendChild(discountElement);
      });
      discountsContainer.style.display = 'block';
    } else {
      discountsContainer.style.display = 'none';
    }
  }

  // Método mejorado para actualizar ahorros totales
  updateCartSavings() {
    if (!this.cartData) return;

    const cartTotals = document.querySelector('.cart-totals');
    if (!cartTotals) return;

    // Buscar o crear contenedor de ahorros
    let cartSavingsContainer = cartTotals.querySelector('.cart-savings');
    if (!cartSavingsContainer && this.cartData.total_discount > 0) {
      cartSavingsContainer = document.createElement('div');
      cartSavingsContainer.className = 'cart-savings';
      cartSavingsContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e5e5e5;
        font-size: 1.2rem;
        font-weight: 600;
      `;
      
      const taxesNote = cartTotals.querySelector('.cart-taxes-note');
      if (taxesNote) {
        cartTotals.insertBefore(cartSavingsContainer, taxesNote);
      } else {
        cartTotals.appendChild(cartSavingsContainer);
      }
    }

    // Actualizar o ocultar ahorros
    if (cartSavingsContainer) {
      if (this.cartData.total_discount > 0) {
        cartSavingsContainer.innerHTML = `
          <span class="cart-savings__label" style="color: #28a745; font-weight: 500;">Ahorros totales</span>
          <span class="cart-savings__amount" style="color: #28a745; font-weight: 500;">-${this.formatMoney(this.cartData.total_discount)}</span>
        `;
        cartSavingsContainer.style.display = 'flex';
      } else {
        cartSavingsContainer.style.display = 'none';
      }
    }
  }

  handleItemClick(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const itemKey = target.dataset.key;
    if (!itemKey) return;

    if (target.classList.contains('quantity-btn--increase')) {
      e.preventDefault();
      this.changeItemQuantity(itemKey, 1);
    } else if (target.classList.contains('quantity-btn--decrease')) {
      e.preventDefault();
      this.changeItemQuantity(itemKey, -1);
    } else if (target.classList.contains('cart-item__remove-btn')) {
      e.preventDefault();
      this.removeItem(itemKey);
    }
  }

  async handleItemChange(e) {
    if (e.target.classList.contains('quantity-input')) {
      const itemKey = e.target.dataset.key;
      const newQuantity = parseInt(e.target.value) || 0;
      
      if (newQuantity < 0) {
        e.target.value = 0;
        return;
      }
      
      // Debounce para evitar múltiples llamadas
      clearTimeout(this.updateTimeout);
      this.updateTimeout = setTimeout(() => {
        this.updateItemQuantity(itemKey, newQuantity);
      }, 500);
    }
  }

  handleItemInput(e) {
    if (e.target.classList.contains('quantity-input')) {
      const value = parseInt(e.target.value) || 0;
      if (value < 0) {
        e.target.value = 0;
      }
    }
  }

  async loadCart() {
    try {
      this.setLoading(true);
      
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Error al cargar el carrito');
      
      this.cartData = await response.json();
      this.updateCartDisplay();
      
    } catch (error) {
      console.error('Error cargando carrito:', error);
      this.showError('Error al cargar el carrito. Por favor, recarga la página.');
    } finally {
      this.setLoading(false);
    }
  }

  async changeItemQuantity(itemKey, change) {
    try {
      const currentItem = this.cartData?.items?.find(item => item.key === itemKey);
      if (!currentItem) return;
      
      const newQuantity = Math.max(0, currentItem.quantity + change);
      await this.updateItemQuantity(itemKey, newQuantity);
      
    } catch (error) {
      console.error('Error cambiando cantidad:', error);
      this.showError('Error al actualizar la cantidad');
    }
  }

  async updateItemQuantity(itemKey, newQuantity) {
    try {
      // Validar cantidad mínima
      if (newQuantity < 0) {
        console.warn('Cantidad no puede ser negativa');
        return false;
      }
      
      // Obtener información del producto para validar stock
      const item = this.cartData?.items?.find(item => item.key === itemKey);
      if (!item) {
        console.error('Producto no encontrado en el carrito');
        return false;
      }
      
      // Validación robusta de stock para productos inexistentes o sin stock
      const inventoryPolicy = item.variant?.inventory_policy || 'continue';
      const inventoryTracked = item.variant?.inventory_management === 'shopify';
      const inventoryQuantity = item.variant?.inventory_quantity;
      
      // Verificar si el producto existe y tiene stock válido
      if (inventoryTracked && inventoryPolicy !== 'continue') {
        // Si el inventario está siendo rastreado y la política no es 'continue'
        if (inventoryQuantity === null || inventoryQuantity === undefined) {
          console.warn('Producto sin información de stock');
          this.showStockError(0, 'Producto sin stock disponible');
          return false;
        }
        
        if (inventoryQuantity <= 0) {
          console.warn('Producto sin stock');
          this.showStockError(0, 'Producto agotado');
          return false;
        }
        
        if (newQuantity > inventoryQuantity) {
          console.warn(`Stock insuficiente. Máximo disponible: ${inventoryQuantity}`);
          this.showStockError(inventoryQuantity, `Stock insuficiente. Máximo disponible: ${inventoryQuantity} unidades`);
          return false;
        }
      }
      
      // Verificación adicional: no permitir incrementar si no hay stock
      if (newQuantity > (item.quantity || 0)) {
        // Es un incremento, verificar disponibilidad
        if (inventoryTracked && inventoryPolicy !== 'continue') {
          const availableStock = inventoryQuantity || 0;
          if (availableStock <= 0) {
            this.showStockError(0, 'No se puede agregar más, producto agotado');
            return false;
          }
          if (newQuantity > availableStock) {
            this.showStockError(availableStock, `No se puede agregar más. Stock máximo: ${availableStock} unidades`);
            return false;
          }
        }
      }
      
      this.showLoading(itemKey);
      
      const formData = new FormData();
      formData.append('id', itemKey);
      formData.append('quantity', newQuantity);
      
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Manejar errores específicos de stock de Shopify
        if (errorData.message && errorData.message.includes('stock')) {
          this.showStockError(0, 'Stock insuficiente según Shopify');
          return false;
        }
        
        if (errorData.description && errorData.description.includes('inventory')) {
          this.showStockError(0, 'Producto no disponible en inventario');
          return false;
        }
        
        throw new Error(errorData.message || errorData.description || 'Error al actualizar');
      }
      
      this.cartData = await response.json();
      this.updateCartDisplay();
      
      // Emitir evento para sincronizar con otros componentes
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: {
          cartData: this.cartData,
          source: 'cart-page',
          timestamp: Date.now()
        }
      }));
      
      return true;
      
    } catch (error) {
      console.error('Error actualizando cantidad:', error);
      
      if (error.message.includes('stock') || error.message.includes('inventory')) {
        this.showStockError(0, 'No hay suficiente stock disponible');
      } else {
        this.showError('Error al actualizar la cantidad');
      }
      
      // Recargar carrito para restaurar estado correcto
      await this.loadCart();
      return false;
      
    } finally {
      this.hideLoading(itemKey);
    }
  }
  
  showStockError(maxStock, customMessage = null) {
    // Crear o actualizar mensaje de error de stock
    let errorMsg = document.querySelector('.stock-error-message');
    if (!errorMsg) {
      errorMsg = document.createElement('div');
      errorMsg.className = 'stock-error-message';
      errorMsg.style.cssText = `
        background: #fee;
        color: #c33;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
        border: 1px solid #fcc;
        font-weight: bold;
        text-align: center;
      `;
      if (this.cartItems) {
        this.cartItems.insertBefore(errorMsg, this.cartItems.firstChild);
      }
    }
    
    // Usar mensaje personalizado o generar uno basado en el stock
    if (customMessage) {
      errorMsg.textContent = customMessage;
    } else if (maxStock <= 0) {
      errorMsg.textContent = 'Producto agotado - No se puede agregar más';
    } else {
      errorMsg.textContent = `Stock insuficiente. Máximo disponible: ${maxStock} unidades`;
    }
    
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
      if (errorMsg && errorMsg.parentNode) {
        errorMsg.remove();
      }
    }, 5000);
  }

  async fetchUpdatedCart() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Error al obtener carrito actualizado');
      
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo carrito:', error);
      throw error;
    }
  }

  async removeItem(itemKey) {
    await this.updateItemQuantity(itemKey, 0);
  }

  async updateCart() {
    try {
      this.setLoading(true);
      
      const formData = new FormData(this.cartForm);
      
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.description || 'Error al actualizar carrito');
      }
      
      this.cartData = await response.json();
      this.updateCartDisplay();
      this.showSuccess('Carrito actualizado correctamente');
      
      // Emitir evento para sincronizar
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: {
          cartData: this.cartData,
          source: 'cart-page',
          timestamp: Date.now()
        }
      }));
      
    } catch (error) {
      console.error('Error actualizando carrito:', error);
      this.showError(error.message || 'Error al actualizar el carrito');
      
      // Recargar para restaurar estado
      await this.loadCart();
      
    } finally {
      this.setLoading(false);
    }
  }

  async clearCart() {
    if (!confirm('¿Estás seguro de que quieres vaciar el carrito?')) return;
    
    try {
      this.setLoading(true);
      
      const response = await fetch('/cart/clear.js', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Error al vaciar el carrito');
      
      this.cartData = await response.json();
      this.updateCartDisplay();
      this.showSuccess('Carrito vaciado correctamente');
      
      // Emitir evento
      document.dispatchEvent(new CustomEvent('cart:updated', {
        detail: {
          cartData: this.cartData,
          source: 'cart-page',
          timestamp: Date.now()
        }
      }));
      
    } catch (error) {
      console.error('Error vaciando carrito:', error);
      this.showError('Error al vaciar el carrito');
    } finally {
      this.setLoading(false);
    }
  }

  updateCartDisplay() {
    if (!this.cartData) return;
    
    // Actualizar contador
    if (this.cartCount) {
      const itemCount = this.cartData.item_count || 0;
      this.cartCount.textContent = itemCount === 1 ? '1 artículo' : `${itemCount} artículos`;
    }
    
    // Mostrar/ocultar carrito vacío
    if (this.cartData.items && this.cartData.items.length === 0) {
      if (this.cartItems) this.cartItems.style.display = 'none';
      if (this.cartEmpty) this.cartEmpty.style.display = 'block';
      return;
    } else {
      if (this.cartItems) this.cartItems.style.display = 'block';
      if (this.cartEmpty) this.cartEmpty.style.display = 'none';
    }
    
    // Renderizar artículos
    this.renderCartItems();
    
    // Actualizar totales
    const subtotalElements = document.querySelectorAll('.cart-subtotal__amount');
    subtotalElements.forEach(element => {
      element.textContent = this.formatMoney(this.cartData.total_price);
    });
    
    // Actualizar descuentos y ahorros
    this.updateCartDiscounts();
    this.updateCartSavings();
    
    // Actualizar estados de botones
    this.updateQuantityButtonStates();
  }

  renderCartItems() {
    if (!this.cartItems || !this.cartData?.items) return;
    
    this.cartItems.innerHTML = '';
    
    this.cartData.items.forEach(item => {
      const itemRow = this.createItemRow(item);
      this.cartItems.appendChild(itemRow);
      
      // Actualizar descuentos del artículo después de renderizar
      this.updateItemDiscounts(itemRow, item);
    });
  }

  createItemRow(item) {
    const itemRow = document.createElement('div');
    itemRow.className = 'cart-item';
    itemRow.dataset.key = item.key;
    
    // Validación robusta de stock para productos inexistentes o sin stock
    const inventoryPolicy = item.variant?.inventory_policy || 'continue';
    const inventoryTracked = item.variant?.inventory_management === 'shopify';
    const inventoryQuantity = item.variant?.inventory_quantity;
    
    // Determinar si se puede incrementar basado en stock real
    let canIncrement = true;
    let maxStock = 999;
    
    if (inventoryTracked && inventoryPolicy !== 'continue') {
      if (inventoryQuantity === null || inventoryQuantity === undefined || inventoryQuantity <= 0) {
        canIncrement = false;
        maxStock = 0;
      } else {
        maxStock = inventoryQuantity;
        canIncrement = item.quantity < maxStock;
      }
    }
    
    itemRow.innerHTML = `
      <div class="cart-item__header">
        <div class="cart-item__image">
          ${item.image ? 
            `<img src="${item.image}" alt="${item.product_title}" loading="lazy">` :
            `<div class="cart-item__no-image">Sin imagen</div>`
          }
        </div>
        <div class="cart-item__details">
          <h3 class="cart-item__title">
            <a href="${item.url}">${item.product_title}</a>
          </h3>
          ${item.variant_title ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
          ${item.properties ? Object.entries(item.properties).map(([key, value]) => 
            value ? `<div class="cart-item__property"><span class="property-name">${key}:</span> ${value}</div>` : ''
          ).join('') : ''}
          ${item.selling_plan_allocation ? 
            `<p class="cart-item__subscription">${item.selling_plan_allocation.selling_plan.name}</p>` : ''
          }
        </div>
      </div>
      
      <div class="cart-item__footer">
        <div class="cart-item__quantity">
          <div class="quantity-selector">
            <button type="button" 
                    class="quantity-btn quantity-btn--decrease ${item.quantity <= 1 ? 'quantity-btn--disabled' : ''}" 
                    data-key="${item.key}" 
                    ${item.quantity <= 1 ? 'disabled' : ''}
                    aria-label="Disminuir cantidad">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <input type="number" 
                   class="quantity-input" 
                   value="${item.quantity}" 
                   min="0" 
                   max="${maxStock}"
                   data-key="${item.key}" 
                   aria-label="Cantidad">
            <button type="button" 
                    class="quantity-btn quantity-btn--increase ${!canIncrement ? 'quantity-btn--disabled' : ''}" 
                    data-key="${item.key}" 
                    ${!canIncrement ? 'disabled' : ''}
                    ${!canIncrement ? `title="Stock máximo alcanzado (${maxStock} unidades)"` : ''}
                    aria-label="Aumentar cantidad">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="cart-item__pricing">
          ${item.original_price !== item.final_price ? `
            <span class="cart-item__original-price">${this.formatMoney(item.original_price)}</span>
            <span class="cart-item__final-price">${this.formatMoney(item.final_price)}</span>
            ${item.variant?.compare_at_price ? 
              `<span class="cart-item__save">Ahorras ${this.formatMoney(item.variant.compare_at_price - item.final_price)}</span>` : ''
            }
          ` : `
            <span class="cart-item__price">${this.formatMoney(item.final_price)}</span>
          `}
          
          <div class="cart-item__line-price">
            <span class="cart-item__line-total">${this.formatMoney(item.final_line_price)}</span>
          </div>
        </div>
      </div>
      
      <div class="cart-item__remove">
        <button type="button" class="cart-item__remove-btn" data-key="${item.key}" aria-label="Eliminar ${item.product_title}">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    
    return itemRow;
  }

  updateQuantityButtonStates() {
    const quantityInputs = this.cartItems?.querySelectorAll('.quantity-input') || [];
    
    quantityInputs.forEach(input => {
      const itemKey = input.dataset.key;
      const currentQuantity = parseInt(input.value) || 0;
      const item = this.cartData?.items?.find(item => item.key === itemKey);
      
      if (!item) return;
      
      // Validación robusta de stock para productos inexistentes o sin stock
      const inventoryPolicy = item.variant?.inventory_policy || 'continue';
      const inventoryTracked = item.variant?.inventory_management === 'shopify';
      const inventoryQuantity = item.variant?.inventory_quantity;
      
      const decreaseBtn = input.parentElement.querySelector('.quantity-btn--decrease');
      const increaseBtn = input.parentElement.querySelector('.quantity-btn--increase');
      
      // Botón de disminuir
      if (decreaseBtn) {
        if (currentQuantity <= 1) {
          decreaseBtn.classList.add('quantity-btn--disabled');
          decreaseBtn.disabled = true;
        } else {
          decreaseBtn.classList.remove('quantity-btn--disabled');
          decreaseBtn.disabled = false;
        }
      }
      
      // Botón de aumentar con validación robusta de stock
      if (increaseBtn) {
        let canIncrement = true;
        let disabledReason = '';
        
        if (inventoryTracked && inventoryPolicy !== 'continue') {
          // Verificar si el producto tiene información de stock válida
          if (inventoryQuantity === null || inventoryQuantity === undefined) {
            canIncrement = false;
            disabledReason = 'Producto sin información de stock';
          } else if (inventoryQuantity <= 0) {
            canIncrement = false;
            disabledReason = 'Producto agotado';
          } else if (currentQuantity >= inventoryQuantity) {
            canIncrement = false;
            disabledReason = `Stock máximo alcanzado (${inventoryQuantity} unidades)`;
          }
        }
        
        if (!canIncrement) {
          increaseBtn.classList.add('quantity-btn--disabled');
          increaseBtn.disabled = true;
          increaseBtn.title = disabledReason;
          increaseBtn.style.opacity = '0.5';
          increaseBtn.style.cursor = 'not-allowed';
        } else {
          increaseBtn.classList.remove('quantity-btn--disabled');
          increaseBtn.disabled = false;
          increaseBtn.removeAttribute('title');
          increaseBtn.style.opacity = '1';
          increaseBtn.style.cursor = 'pointer';
        }
      }
    });
  }

  checkout() {
    window.location.href = '/checkout';
  }

  setLoading(loading) {
    this.isLoading = loading;
    
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = loading ? 'flex' : 'none';
    }
    
    // Deshabilitar botones durante carga
    const buttons = document.querySelectorAll('.quantity-btn, .cart-update-btn, .cart-checkout-btn');
    buttons.forEach(btn => {
      btn.disabled = loading;
    });
  }

  showLoading(key) {
    const itemRow = document.querySelector(`[data-key="${key}"]`);
    if (itemRow) {
      itemRow.style.opacity = '0.6';
      itemRow.style.pointerEvents = 'none';
    }
  }

  hideLoading(key) {
    const itemRow = document.querySelector(`[data-key="${key}"]`);
    if (itemRow) {
      itemRow.style.opacity = '1';
      itemRow.style.pointerEvents = 'auto';
    }
  }

  showError(message) {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = `
        <div class="cart-error" style="background-color: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          ${message}
        </div>
      `;
      this.errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Auto-ocultar después de 5 segundos
      setTimeout(() => {
        this.clearErrors();
      }, 5000);
    } else {
      alert(message);
    }
  }

  showSuccess(message) {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = `
        <div class="cart-success" style="background-color: #d4edda; color: #155724; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          ${message}
        </div>
      `;
      
      // Auto-ocultar después de 3 segundos
      setTimeout(() => {
        this.clearErrors();
      }, 3000);
    }
  }

  clearErrors() {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
    }
  }

  formatMoney(cents) {
    if (typeof cents !== 'number') {
      cents = parseInt(cents) || 0;
    }
    
    const amount = (cents / 100).toFixed(2);
    
    // Usar la configuración de moneda de Shopify si está disponible
    if (window.Shopify && window.Shopify.money_format) {
      return window.Shopify.money_format.replace('{{amount}}', amount);
    }
    
    // Usar configuración del tema como fallback
    if (window.theme && window.theme.moneyFormat) {
      return window.theme.moneyFormat.replace('{{amount}}', amount);
    }
    
    // Fallback final usando la moneda de la tienda
    const currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'EUR';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}

// Inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cartPage = new CartPage();
  });
} else {
  window.cartPage = new CartPage();
}

// Exportar para uso global
window.CartPage = CartPage;