/**
 * Mini Cart JavaScript - Oxford Theme
 * Sistema completo de carrito de compras con Ajax
 * Basado en Shopify Cart API
 */

class MiniCart {
  constructor() {
    this.isOpen = false;
    this.isLoading = false;
    this.cartData = null;
    
    // Elementos DOM
    this.wrapper = document.querySelector('[data-mini-cart-wrapper]');
    this.trigger = document.querySelector('[data-mini-cart-trigger]');
    this.dropdown = document.querySelector('[data-mini-cart-dropdown]');
    this.panel = document.querySelector('[data-mini-cart-panel]');
    this.content = document.querySelector('[data-mini-cart-content]');
    this.closeBtn = document.querySelector('[data-mini-cart-close]');
    this.backdrop = document.querySelector('[data-mini-cart-backdrop]');
    this.loading = document.querySelector('[data-mini-cart-loading]');
    this.errors = document.querySelector('[data-mini-cart-errors]');
    this.count = document.querySelector('[data-mini-cart-count]');
    
    this.init();
  }

  init() {
    if (!this.wrapper) return;
    
    this.bindEvents();
    this.loadCart();
    
    // Escuchar eventos personalizados
    document.addEventListener('cart:item-added', (e) => this.handleCartUpdate(e.detail));
    document.addEventListener('cart:item-updated', (e) => this.handleCartUpdate(e.detail));
    document.addEventListener('cart:item-removed', (e) => this.handleCartUpdate(e.detail));
  }

  bindEvents() {
    // Abrir/cerrar carrito
    if (this.trigger) {
      this.trigger.addEventListener('click', () => this.toggle());
    }
    
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    
    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => this.close());
    }

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Delegación de eventos para elementos dinámicos
    if (this.content) {
      this.content.addEventListener('click', (e) => this.handleContentClick(e));
      this.content.addEventListener('change', (e) => this.handleContentChange(e));
      this.content.addEventListener('input', (e) => this.handleContentInput(e));
    }

    // Escuchar eventos de actualización del carrito desde otras partes
    document.addEventListener('cart:updated', (event) => {
      if (event.detail) {
        const { cartData, source, timestamp } = event.detail;
        
        // Evitar bucles infinitos - no procesar eventos propios
        if (source === 'mini-cart') return;
        
        // Actualizar datos del carrito con información completa
        this.cartData = cartData || event.detail;
        this.updateCartDisplay();
        
        // Actualizar estados de botones con nueva información de stock
        this.updateQuantityButtonStates();
      }
    });
  }

  handleContentClick(e) {
    const target = e.target.closest('[data-mini-cart-qty-change]');
    const removeBtn = e.target.closest('[data-mini-cart-remove]');
    const checkoutBtn = e.target.closest('[data-mini-cart-checkout]');
    const closeBtn = e.target.closest('[data-mini-cart-close]');

    if (target) {
      e.preventDefault();
      
      // No hacer nada si el botón está deshabilitado
      if (target.disabled || target.classList.contains('mini-cart__qty-btn--disabled')) {
        return;
      }
      
      const change = parseInt(target.dataset.miniCartQtyChange);
      const itemKey = target.dataset.itemKey;
      this.changeQuantity(itemKey, change);
    }
    
    if (removeBtn) {
      e.preventDefault();
      const itemKey = removeBtn.dataset.itemKey;
      this.removeItem(itemKey);
    }
    
    if (checkoutBtn) {
      e.preventDefault();
      this.checkout();
    }
    
    if (closeBtn) {
      e.preventDefault();
      this.close();
    }
  }

  async handleContentChange(e) {
    // Input de cantidad deshabilitado - no procesar cambios
    return;
  }

  handleContentInput(e) {
    const qtyInput = e.target.closest('[data-mini-cart-qty-input]');
    if (qtyInput) {
      // Validar entrada en tiempo real
      let value = parseInt(qtyInput.value);
      const min = parseInt(qtyInput.min) || 1;
      const max = parseInt(qtyInput.dataset.maxStock) || 999;
      
      if (value < min) qtyInput.value = min;
      if (value > max) qtyInput.value = max;
    }
  }

  async loadCart() {
    try {
      this.setLoading(true);
      this.clearErrors();
      
      const response = await fetch('/cart.js', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'Error al cargar el carrito'}`);
      }
      
      const cartData = await response.json();
      
      // Validar estructura del cart según documentación oficial de Shopify
      if (!cartData || typeof cartData !== 'object') {
        throw new Error('Respuesta de carrito inválida');
      }
      
      this.cartData = cartData;
      this.updateCartDisplay();
      
      return this.cartData;
    } catch (error) {
      console.error('❌ Error al cargar carrito:', error);
      this.showError('Error al cargar el carrito');
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  async changeQuantity(itemKey, change) {
    if (!itemKey || this.isLoading) return;
    
    const currentItem = this.cartData?.items?.find(item => item.key === itemKey);
    if (!currentItem) return;
    
    const newQuantity = Math.max(0, currentItem.quantity + change);
    
    if (newQuantity === 0) {
      return this.removeItem(itemKey);
    }
    
    return this.updateQuantity(itemKey, newQuantity);
  }

  async updateQuantity(itemKey, quantity) {
    if (!itemKey || this.isLoading) return;
    
    try {
      this.setLoading(true);
      this.clearErrors();
      
      const formData = new FormData();
      formData.append('id', itemKey);
      formData.append('quantity', quantity.toString());
      
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || result.description || 'Error al actualizar cantidad');
      }
      
      // Actualizar datos del carrito
      this.cartData = result;
      this.updateCartDisplay();
      
      // Emitir evento de actualización
      this.emitCartUpdate('quantity-updated');
      
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      this.showError(error.message || 'Error al actualizar la cantidad');
      
      // Recargar carrito en caso de error
      await this.loadCart();
    } finally {
      this.setLoading(false);
    }
  }

  async removeItem(itemKey) {
    if (!itemKey || this.isLoading) return;
    
    try {
      this.setLoading(true);
      this.clearErrors();
      
      const formData = new FormData();
      formData.append('id', itemKey);
      formData.append('quantity', '0');
      
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || result.description || 'Error al eliminar producto');
      }
      
      // Actualizar datos del carrito
      this.cartData = result;
      this.updateCartDisplay();
      
      // Emitir evento de actualización
      this.emitCartUpdate('item-removed');
      
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      this.showError(error.message || 'Error al eliminar el producto');
      
      // Recargar carrito en caso de error
      await this.loadCart();
    } finally {
      this.setLoading(false);
    }
  }

  updateCartDisplay() {
    if (!this.cartData) return;
    
    // Actualizar contador
    this.updateCartCount();
    
    // Actualizar contenido del carrito
    this.renderCartItems();
    
    // Actualizar totales
    this.updateCartTotals();
    
    // Actualizar estados de botones
    this.updateQuantityButtonStates();
  }

  updateCartCount() {
    if (this.count) {
      const itemCount = this.cartData?.item_count || 0;
      this.count.textContent = itemCount;
      this.count.style.display = itemCount > 0 ? 'flex' : 'none';
    }
  }

  renderCartItems() {
    if (!this.content) return;
    
    const items = this.cartData?.items || [];
    
    if (items.length === 0) {
      this.content.innerHTML = `
        <div class="mini-cart__empty">
          <div class="mini-cart__empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="m1 1 4 4 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega algunos productos para comenzar</p>
          <a href="/collections/all" class="mini-cart__empty-btn">Continuar comprando</a>
        </div>
      `;
      return;
    }
    
    const itemsHTML = items.map(item => this.renderCartItem(item)).join('');
    
    this.content.innerHTML = `
      <div class="mini-cart__items">
        ${itemsHTML}
      </div>
      <div class="mini-cart__footer">
        <div class="mini-cart__subtotal">
          <span>Subtotal: </span>
          <span class="mini-cart__subtotal-amount">${this.formatMoney(this.cartData.total_price)}</span>
        </div>
        <div class="mini-cart__actions">
          <a href="/cart" class="mini-cart__view-cart-btn">Ver carrito</a>
          <button type="button" class="mini-cart__checkout-btn" data-mini-cart-checkout>Finalizar compra</button>
        </div>
      </div>
    `;
  }

  renderCartItem(item) {
    const imageUrl = item.image ? item.image.replace('.jpg', '_150x150.jpg').replace('.png', '_150x150.png') : '';
    const maxStock = item.inventory_quantity || 999;
    const canIncrement = item.quantity < maxStock;
    
    // Generar HTML para descuentos del producto si existen
    let discountsHtml = '';
    if (item.line_level_discount_allocations && item.line_level_discount_allocations.length > 0) {
      discountsHtml = `
        <div class="mini-cart__item-discounts">
          ${item.line_level_discount_allocations.map(discount => `
            <div class="mini-cart__item-discount">
              <span class="discount-title">${discount.discount_application.title}</span>
              <span class="discount-amount">-${this.formatMoney(discount.amount)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    return `
      <div class="mini-cart__item" data-key="${item.key}">
        <div class="mini-cart__item-image">
          ${imageUrl ? `<img src="${imageUrl}" alt="${item.product_title}" loading="lazy">` : '<div class="mini-cart__item-placeholder">IMG</div>'}
        </div>
        <div class="mini-cart__item-details">
          <h4 class="mini-cart__item-title">${item.product_title}</h4>
          ${item.variant_title && item.variant_title !== 'Default Title' ? `<p class="mini-cart__item-variant">${item.variant_title}</p>` : ''}
          
          <div class="mini-cart__item-pricing">
            <div class="mini-cart__item-price">
              <span class="mini-cart__price-label">Precio unitario:</span>
              ${item.original_price !== item.final_price ? 
                `<span class="mini-cart__original-price">${this.formatMoney(item.original_price)}</span>
                 <span class="mini-cart__final-price">${this.formatMoney(item.final_price)}</span>` :
                `<span class="mini-cart__price">${this.formatMoney(item.final_price)}</span>`
              }
            </div>
            
            ${discountsHtml}
            
            <div class="mini-cart__item-quantity">
              <span class="mini-cart__qty-label">Cantidad:</span>
              <div class="mini-cart__qty-controls">
                <button type="button" 
                        class="mini-cart__qty-btn mini-cart__qty-minus" 
                        data-mini-cart-qty-change="-1" 
                        data-item-key="${item.key}"
                        aria-label="Disminuir cantidad">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <input type="number" 
                       class="mini-cart__qty-input" 
                       value="${item.quantity}" 
                       min="1" 
                       max="${maxStock}"
                       data-mini-cart-qty-input
                       data-item-key="${item.key}"
                       data-max-stock="${maxStock}"
                       data-inventory-policy="${item.inventory_policy || 'deny'}"
                       aria-label="Cantidad"
                       readonly
                       tabindex="-1">
                <button type="button" 
                        class="mini-cart__qty-btn mini-cart__qty-plus${!canIncrement ? ' mini-cart__qty-btn--disabled' : ''}" 
                        data-mini-cart-qty-change="1" 
                        data-item-key="${item.key}"
                        ${!canIncrement ? 'disabled' : ''}
                        aria-label="Aumentar cantidad">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="mini-cart__item-total">
              <span class="mini-cart__total-label">Total:</span>
              <span class="mini-cart__total-price">${this.formatMoney(item.final_line_price)}</span>
            </div>
          </div>
        </div>
        
        <button type="button" 
                class="mini-cart__remove-btn" 
                data-mini-cart-remove 
                data-item-key="${item.key}"
                aria-label="Eliminar ${item.product_title}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  updateCartTotals() {
    const subtotalElements = document.querySelectorAll('.mini-cart__subtotal-amount');
    subtotalElements.forEach(element => {
      element.textContent = this.formatMoney(this.cartData?.total_price || 0);
    });
    
    // Actualizar descuentos del carrito
    this.updateCartDiscounts();
  }
  
  updateCartDiscounts() {
    const cartFooter = document.querySelector('.mini-cart__footer');
    if (!cartFooter) return;
    
    // Buscar o crear contenedor de descuentos
    let discountsContainer = cartFooter.querySelector('.mini-cart__discounts');
    if (!discountsContainer) {
      discountsContainer = document.createElement('div');
      discountsContainer.className = 'mini-cart__discounts';
      
      // Insertar antes del subtotal
      const subtotalElement = cartFooter.querySelector('.mini-cart__subtotal');
      if (subtotalElement) {
        cartFooter.insertBefore(discountsContainer, subtotalElement);
      } else {
        cartFooter.appendChild(discountsContainer);
      }
    }
    
    // Limpiar descuentos existentes
    discountsContainer.innerHTML = '';
    
    // Mostrar descuentos del carrito si existen
    if (this.cartData?.cart_level_discount_applications && this.cartData.cart_level_discount_applications.length > 0) {
      this.cartData.cart_level_discount_applications.forEach(discount => {
        const discountElement = document.createElement('div');
        discountElement.className = 'mini-cart__discount';
        discountElement.innerHTML = `
          <span class="discount-title">${discount.title}</span>
          <span class="discount-amount">-${this.formatMoney(discount.total_allocated_amount)}</span>
        `;
        discountsContainer.appendChild(discountElement);
      });
      discountsContainer.style.display = 'block';
    } else {
      discountsContainer.style.display = 'none';
    }
    
    // Actualizar ahorros totales
    this.updateCartSavings();
  }
  
  updateCartSavings() {
    const cartFooter = document.querySelector('.mini-cart__footer');
    if (!cartFooter) return;
    
    // Buscar o crear contenedor de ahorros
    let savingsContainer = cartFooter.querySelector('.mini-cart__savings');
    if (!savingsContainer && this.cartData?.total_discount > 0) {
      savingsContainer = document.createElement('div');
      savingsContainer.className = 'mini-cart__savings';
      
      // Insertar antes del subtotal
      const subtotalElement = cartFooter.querySelector('.mini-cart__subtotal');
      if (subtotalElement) {
        cartFooter.insertBefore(savingsContainer, subtotalElement);
      } else {
        cartFooter.appendChild(savingsContainer);
      }
    }
    
    if (savingsContainer) {
      if (this.cartData?.total_discount > 0) {
        savingsContainer.innerHTML = `
          <span class="mini-cart__savings-label">Ahorros totales:</span>
          <span class="mini-cart__savings-amount">-${this.formatMoney(this.cartData.total_discount)}</span>
        `;
        savingsContainer.style.display = 'flex';
      } else {
        savingsContainer.style.display = 'none';
      }
    }
  }

  updateQuantityButtonStates() {
    if (!this.cartData?.items) return;
    
    this.cartData.items.forEach(item => {
      const itemElement = this.content?.querySelector(`[data-key="${item.key}"]`);
      if (!itemElement) return;
      
      const plusBtn = itemElement.querySelector('.mini-cart__qty-plus');
      const input = itemElement.querySelector('.mini-cart__qty-input');
      
      if (plusBtn && input) {
        const maxStock = parseInt(input.dataset.maxStock) || 999;
        const canIncrement = item.quantity < maxStock;
        
        plusBtn.disabled = !canIncrement;
        plusBtn.classList.toggle('mini-cart__qty-btn--disabled', !canIncrement);
        
        if (!canIncrement) {
          plusBtn.title = `Stock máximo alcanzado (${maxStock} unidades)`;
        } else {
          plusBtn.removeAttribute('title');
        }
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    
    if (this.wrapper) {
      this.wrapper.classList.add('mini-cart--open');
    }
    
    if (this.dropdown) {
      this.dropdown.classList.add('active');
      this.dropdown.setAttribute('aria-hidden', 'false');
    }
    
    document.body.style.overflow = 'hidden';
    
    // Cargar carrito actualizado al abrir
    this.loadCart();
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    if (this.wrapper) {
      this.wrapper.classList.remove('mini-cart--open');
    }
    
    if (this.dropdown) {
      this.dropdown.classList.remove('active');
      this.dropdown.setAttribute('aria-hidden', 'true');
    }
    
    document.body.style.overflow = '';
  }

  checkout() {
    window.location.href = '/checkout';
  }

  setLoading(loading) {
    this.isLoading = loading;
    
    if (this.loading) {
      this.loading.style.display = loading ? 'flex' : 'none';
    }
    
    // Deshabilitar botones durante la carga
    const buttons = this.content?.querySelectorAll('button');
    buttons?.forEach(button => {
      button.disabled = loading;
    });
  }

  showError(message) {
    if (this.errors) {
      this.errors.textContent = message;
      this.errors.style.display = 'block';
      
      // Auto-ocultar después de 5 segundos
      setTimeout(() => {
        this.clearErrors();
      }, 5000);
    }
  }

  clearErrors() {
    if (this.errors) {
      this.errors.style.display = 'none';
      this.errors.textContent = '';
    }
  }

  emitCartUpdate(action) {
    const event = new CustomEvent('cart:updated', {
      detail: {
        cartData: this.cartData,
        action: action,
        source: 'mini-cart',
        timestamp: Date.now()
      },
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  formatMoney(cents) {
    if (typeof cents !== 'number') return '$0.00';
    
    const money = (cents / 100).toFixed(2);
    
    // Usar formato de Shopify si está disponible
    if (window.Shopify && window.Shopify.money_format) {
      return window.Shopify.money_format.replace('{{amount}}', money);
    }
    
    return `$${money}`;
  }

  async handleCartUpdate(detail) {
    // Si es un evento de agregar al carrito, recargar datos completos
    if (detail && detail.item) {
      // Recargar el carrito completo para obtener datos actualizados
      await this.loadCart();
      
      // Abrir el mini-cart automáticamente cuando se agrega un producto
      if (!this.isOpen) {
        this.open();
      }
    } else if (detail && detail.cartData) {
      // Actualización directa con datos del carrito
      this.cartData = detail.cartData;
      this.updateCartDisplay();
    } else {
      // Fallback: recargar el carrito
      await this.loadCart();
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.miniCart = new MiniCart();
  });
} else {
  window.miniCart = new MiniCart();
}

// Exportar para uso en otros scripts
window.MiniCart = MiniCart;