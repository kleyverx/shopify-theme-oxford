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

    // Cerrar al hacer clic fuera del mini cart
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    // Delegación de eventos para elementos dinámicos
    if (this.content) {
      this.content.addEventListener('click', (e) => this.handleContentClick(e));
      this.content.addEventListener('change', (e) => this.handleContentChange(e));
      this.content.addEventListener('input', (e) => this.handleContentInput(e));
    }
  }

  handleContentClick(e) {
    const target = e.target.closest('[data-mini-cart-qty-change]');
    const removeBtn = e.target.closest('[data-mini-cart-remove]');
    const checkoutBtn = e.target.closest('[data-mini-cart-checkout]');
    const closeBtn = e.target.closest('[data-mini-cart-close]');

    if (target) {
      e.preventDefault();
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

  handleContentChange(e) {
    const qtyInput = e.target.closest('[data-mini-cart-qty-input]');
    if (qtyInput) {
      const itemKey = qtyInput.dataset.itemKey;
      const newQuantity = parseInt(qtyInput.value) || 1;
      this.updateQuantity(itemKey, newQuantity);
    }
  }

  handleContentInput(e) {
    const qtyInput = e.target.closest('[data-mini-cart-qty-input]');
    if (qtyInput) {
      // Validar entrada en tiempo real
      let value = parseInt(qtyInput.value);
      const min = parseInt(qtyInput.min) || 1;
      const max = parseInt(qtyInput.max) || 999;
      
      if (value < min) qtyInput.value = min;
      if (value > max) qtyInput.value = max;
    }
  }

  async loadCart() {
    try {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Error al cargar el carrito');
      
      this.cartData = await response.json();
      console.log('Carrito cargado:', this.cartData);
      
      // Actualizar la visualización del carrito
      this.updateCartDisplay();
      
      return this.cartData;
    } catch (error) {
      console.error('Error al cargar carrito:', error);
      this.showError('Error al cargar el carrito');
      return null;
    }
  }

  async addToCart(variantId, quantity = 1, properties = {}) {
    if (this.isLoading) return;
    
    this.setLoading(true);
    this.clearErrors();

    try {
      const formData = {
        items: [{
          id: variantId,
          quantity: quantity,
          properties: properties
        }]
      };

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.description || 'Error al agregar al carrito');
      }

      // Recargar carrito y abrir
      await this.loadCart();
      this.open();
      
      // Disparar evento personalizado
      document.dispatchEvent(new CustomEvent('cart:item-added', {
        detail: { items: result, cartData: this.cartData }
      }));

      return result;

    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showError(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async updateQuantity(itemKey, newQuantity) {
    if (this.isLoading) return;
    
    this.setLoading(true);
    this.clearErrors();

    try {
      const updates = {};
      updates[itemKey] = newQuantity;

      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ updates })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.description || 'Error al actualizar cantidad');
      }

      this.cartData = result;
      this.updateCartDisplay();
      
      // Disparar evento personalizado
      document.dispatchEvent(new CustomEvent('cart:item-updated', {
        detail: { cartData: this.cartData }
      }));

    } catch (error) {
      console.error('Error updating quantity:', error);
      this.showError(error.message);
      // Recargar carrito en caso de error
      await this.loadCart();
    } finally {
      this.setLoading(false);
    }
  }

  async changeQuantity(itemKey, change) {
    const currentItem = this.cartData?.items?.find(item => item.key === itemKey);
    if (!currentItem) return;
    
    const newQuantity = Math.max(1, currentItem.quantity + change);
    await this.updateQuantity(itemKey, newQuantity);
  }

  async removeItem(itemKey) {
    await this.updateQuantity(itemKey, 0);
    
    // Disparar evento personalizado
    document.dispatchEvent(new CustomEvent('cart:item-removed', {
      detail: { itemKey, cartData: this.cartData }
    }));
  }

  async clearCart() {
    if (this.isLoading) return;
    
    this.setLoading(true);
    this.clearErrors();

    try {
      const response = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al vaciar el carrito');
      }

      await this.loadCart();
      
      // Disparar evento personalizado
      document.dispatchEvent(new CustomEvent('cart:cleared', {
        detail: { cartData: this.cartData }
      }));

    } catch (error) {
      console.error('Error clearing cart:', error);
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  updateCartDisplay() {
    if (!this.cartData) return;

    // Actualizar contador
    if (this.count) {
      this.count.textContent = this.cartData.item_count || 0;
      this.count.style.display = this.cartData.item_count > 0 ? 'flex' : 'none';
    }

    // Mostrar/ocultar estados vacío vs con items
    const emptyState = document.querySelector('[data-mini-cart-empty]');
    const itemsContainer = document.querySelector('[data-mini-cart-items]');
    
    if (this.cartData.item_count === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (itemsContainer) itemsContainer.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (itemsContainer) itemsContainer.style.display = 'block';
      
      // Renderizar items del carrito
      this.renderCartItems();
    }

    // Actualizar subtotal
    const subtotalElement = document.querySelector('[data-mini-cart-subtotal]');
    if (subtotalElement && this.cartData.total_price !== undefined) {
      subtotalElement.textContent = this.formatMoney(this.cartData.total_price);
    }

    // Actualizar progreso de envío gratis
    this.updateFreeShippingProgress();
  }

  renderCartItems() {
    const itemsContainer = document.querySelector('[data-mini-cart-items]');
    if (!itemsContainer || !this.cartData.items) return;

    itemsContainer.innerHTML = '';

    this.cartData.items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'mini-cart__item';
      itemElement.setAttribute('data-item-key', item.key);
      
      const imageHtml = item.image 
        ? `<img src="${item.image}" alt="${this.escapeHtml(item.product_title)}" style="width: 60px; height: 60px; object-fit: cover;">`
        : `<div class="mini-cart__item-placeholder">${item.product_title.slice(0, 2).toUpperCase()}</div>`;
      
      const variantHtml = item.variant_title && item.variant_title !== 'Default Title' 
        ? `<div class="mini-cart__item-variant">${this.escapeHtml(item.variant_title)}</div>`
        : '';
      
      let propertiesHtml = '';
      if (item.properties && Object.keys(item.properties).length > 0) {
        propertiesHtml = '<div class="mini-cart__item-properties">';
        for (const [key, value] of Object.entries(item.properties)) {
          if (value && value.trim()) {
            propertiesHtml += `
              <div class="mini-cart__property">
                <span class="mini-cart__property-name">${this.escapeHtml(key)}:</span>
                <span class="mini-cart__property-value">${this.escapeHtml(value)}</span>
              </div>
            `;
          }
        }
        propertiesHtml += '</div>';
      }
      
      itemElement.innerHTML = `
        <div class="mini-cart__item-image">
          ${imageHtml}
        </div>
        <div class="mini-cart__item-details">
          <h4 class="mini-cart__item-title">${this.escapeHtml(item.product_title)}</h4>
          ${variantHtml}
          ${propertiesHtml}
          <div class="mini-cart__item-price">${this.formatMoney(item.final_price)}</div>
          <div class="mini-cart__item-quantity">
            <button class="mini-cart__qty-btn" data-mini-cart-qty-change="-1" data-item-key="${item.key}">-</button>
            <input type="number" class="mini-cart__qty-input" value="${item.quantity}" min="1" data-mini-cart-qty-input data-item-key="${item.key}">
            <button class="mini-cart__qty-btn" data-mini-cart-qty-change="1" data-item-key="${item.key}">+</button>
          </div>
        </div>
        <button class="mini-cart__remove-btn" data-mini-cart-remove data-item-key="${item.key}">×</button>
      `;
      
      itemsContainer.appendChild(itemElement);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateFreeShippingProgress() {
    const freeShippingElement = document.querySelector('.mini-cart__free-shipping');
    if (!freeShippingElement || !this.cartData) return;

    const threshold = parseFloat(freeShippingElement.dataset.threshold) || 0;
    if (threshold <= 0) return;

    const currentTotal = this.cartData.total_price || 0;
    const remaining = Math.max(0, threshold - currentTotal);
    const progress = Math.min(100, (currentTotal / threshold) * 100);

    const progressFill = freeShippingElement.querySelector('.mini-cart__progress-fill');
    const progressText = freeShippingElement.querySelector('.mini-cart__free-shipping-text');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      if (remaining > 0) {
        progressText.textContent = `Agrega ${this.formatMoney(remaining)} más para envío gratis`;
        progressText.classList.remove('mini-cart__free-shipping-achieved');
      } else {
        progressText.textContent = '¡Felicidades! Tienes envío gratis';
        progressText.classList.add('mini-cart__free-shipping-achieved');
      }
    }
  }

  handleCartUpdate(detail) {
    if (detail?.cartData) {
      this.cartData = detail.cartData;
      this.updateCartDisplay();
    }
  }

  open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.dropdown?.classList.add('active');
    
    // Focus management sin scroll
    if (this.closeBtn) {
      this.closeBtn.focus({ preventScroll: true });
    }
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.dropdown?.classList.remove('active');
    
    // Return focus to trigger sin scroll
    if (this.trigger) {
      this.trigger.focus({ preventScroll: true });
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  checkout() {
    if (this.cartData?.item_count > 0) {
      window.location.href = '/checkout';
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    
    if (this.loading) {
      this.loading.style.display = loading ? 'flex' : 'none';
    }
    
    // Deshabilitar controles durante carga
    const controls = this.content?.querySelectorAll('button, input, select');
    controls?.forEach(control => {
      control.disabled = loading;
    });
  }

  showError(message) {
    if (!this.errors) return;
    
    this.errors.textContent = message;
    this.errors.style.display = 'block';
    
    // Auto-hide después de 5 segundos
    setTimeout(() => this.clearErrors(), 5000);
  }

  clearErrors() {
    if (this.errors) {
      this.errors.textContent = '';
      this.errors.style.display = 'none';
    }
  }

  formatMoney(cents) {
    // Formato básico - puede ser personalizado según la configuración de la tienda
    const amount = cents / 100;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR' // Cambiar según la moneda de la tienda
    }).format(amount);
  }

  // Método público para agregar productos desde formularios externos
  static async addProduct(variantId, quantity = 1, properties = {}) {
    const miniCart = window.miniCartInstance;
    if (miniCart) {
      return await miniCart.addToCart(variantId, quantity, properties);
    }
    throw new Error('Mini cart no está inicializado');
  }

  // Método público para obtener datos del carrito
  static getCartData() {
    const miniCart = window.miniCartInstance;
    return miniCart?.cartData || null;
  }
}

// Integración con formularios de agregar al carrito existentes
class CartFormIntegration {
  constructor() {
    this.init();
  }

  init() {
    // Interceptar formularios de producto
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-product-form]');
      if (form) {
        e.preventDefault();
        this.handleProductForm(form);
      }
    });

    // Interceptar botones de agregar al carrito
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn && !addBtn.closest('form')) {
        e.preventDefault();
        this.handleAddToCartButton(addBtn);
      }
    });
  }

  async handleProductForm(form) {
    const formData = new FormData(form);
    const variantId = formData.get('id');
    const quantity = parseInt(formData.get('quantity')) || 1;
    
    // Recopilar propiedades
    const properties = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('properties[') && value.trim()) {
        const propName = key.replace('properties[', '').replace(']', '');
        properties[propName] = value;
      }
    }

    if (!variantId) {
      console.error('No variant ID found in form');
      return;
    }

    // Obtener el botón de submit antes del try block
    const submitBtn = form.querySelector('[data-add-to-cart]');

    try {
      // Mostrar estado de carga en el botón
      this.setButtonLoading(submitBtn, true);

      await MiniCart.addProduct(variantId, quantity, properties);
      
      // Mostrar feedback de éxito
      this.showSuccessFeedback(submitBtn);
      
    } catch (error) {
      console.error('Error adding product:', error);
      this.showErrorFeedback(submitBtn, error.message);
    } finally {
      this.setButtonLoading(submitBtn, false);
    }
  }

  async handleAddToCartButton(button) {
    const productId = button.dataset.productId || button.closest('[data-product-id]')?.dataset.productId;
    const variantId = button.dataset.variantId || button.closest('[data-variant-id]')?.dataset.variantId;
    const quantity = parseInt(button.dataset.quantity) || 1;

    if (!variantId && !productId) {
      console.error('No variant or product ID found');
      return;
    }

    try {
      this.setButtonLoading(button, true);
      
      // Si solo tenemos product ID, usar la primera variante disponible
      const finalVariantId = variantId || await this.getFirstAvailableVariant(productId);
      
      await MiniCart.addProduct(finalVariantId, quantity);
      
      this.showSuccessFeedback(button);
      
    } catch (error) {
      console.error('Error adding product:', error);
      this.showErrorFeedback(button, error.message);
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  async getFirstAvailableVariant(productId) {
    try {
      const response = await fetch(`/products/${productId}.js`);
      const product = await response.json();
      
      const availableVariant = product.variants.find(v => v.available);
      if (!availableVariant) {
        throw new Error('Producto no disponible');
      }
      
      return availableVariant.id;
    } catch (error) {
      throw new Error('Error al obtener información del producto');
    }
  }

  setButtonLoading(button, loading) {
    if (!button) return;
    
    const textSpan = button.querySelector('.btn-text');
    const loadingSpan = button.querySelector('.btn-loading');
    
    if (textSpan && loadingSpan) {
      textSpan.style.display = loading ? 'none' : 'flex';
      loadingSpan.style.display = loading ? 'flex' : 'none';
    }
    
    button.disabled = loading;
  }

  showSuccessFeedback(button) {
    if (!button) return;
    
    const originalText = button.querySelector('.btn-text')?.textContent;
    const textSpan = button.querySelector('.btn-text');
    
    if (textSpan) {
      textSpan.textContent = '¡Agregado!';
      button.classList.add('success');
      
      setTimeout(() => {
        textSpan.textContent = originalText;
        button.classList.remove('success');
      }, 2000);
    }
  }

  showErrorFeedback(button, message) {
    if (!button) return;
    
    // Mostrar mensaje de error cerca del botón
    let errorDiv = button.parentNode.querySelector('.cart-error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'cart-error-message';
      errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 14px;
        margin-top: 8px;
        padding: 8px 12px;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
      `;
      button.parentNode.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar mini cart
  window.miniCartInstance = new MiniCart();
  
  // Inicializar integración con formularios
  new CartFormIntegration();
  
  // Exponer API global
  window.MiniCart = MiniCart;
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MiniCart, CartFormIntegration };
}