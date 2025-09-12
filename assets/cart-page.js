/**
 * Funcionalidad avanzada para la página del carrito
 * Sincronizado con mini-cart para mejor experiencia de usuario
 */

class CartPage {
  constructor() {
    this.form = document.getElementById('cart-form');
    this.cartItems = document.querySelector('.cart-items');
    this.cartTotals = document.querySelector('.cart-totals');
    this.cartCount = document.querySelector('.cart-count');
    this.isUpdating = false;
    
    if (this.form) {
      this.init();
    }
  }

  init() {
    this.bindEvents();
    this.setupQuantityControls();
    this.setupRemoveButtons();
  }

  bindEvents() {
    // Prevenir envío tradicional del formulario
    this.form.addEventListener('submit', (e) => {
      if (e.submitter && e.submitter.name === 'checkout') {
        // Permitir checkout normal
        return;
      }
      e.preventDefault();
      this.updateCart();
    });

    // Escuchar cambios en inputs de cantidad
    this.cartItems.addEventListener('input', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        this.debounceUpdate(e.target);
      }
    });

    // Escuchar eventos del mini carrito para sincronización
    document.addEventListener('cart:updated', (e) => {
      this.syncWithMiniCart(e.detail);
    });
  }

  setupQuantityControls() {
    const quantityButtons = this.cartItems.querySelectorAll('.quantity-btn');
    
    quantityButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const key = button.dataset.key;
        const input = this.cartItems.querySelector(`input[data-key="${key}"]`);
        const isPlus = button.classList.contains('quantity-plus');
        const isMinus = button.classList.contains('quantity-minus');
        
        let currentValue = parseInt(input.value) || 0;
        
        if (isPlus) {
          input.value = currentValue + 1;
        } else if (isMinus && currentValue > 0) {
          input.value = Math.max(0, currentValue - 1);
        }
        
        this.updateItemQuantity(key, input.value);
      });
    });
  }

  setupRemoveButtons() {
    const removeButtons = this.cartItems.querySelectorAll('.cart-item__remove-btn');
    
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const key = button.dataset.key;
        this.removeItem(key);
      });
    });
  }

  debounceUpdate(input) {
    clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
      const key = input.dataset.key;
      const quantity = parseInt(input.value) || 0;
      this.updateItemQuantity(key, quantity);
    }, 500);
  }

  async updateItemQuantity(key, quantity) {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    this.showLoading(key);
    
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          id: key,
          quantity: quantity
        })
      });
      
      if (response.ok) {
        const cart = await response.json();
        this.updateCartDisplay(cart);
        this.notifyMiniCart(cart);
        
        if (quantity === 0) {
          this.removeItemFromDOM(key);
        }
      } else {
        throw new Error('Error al actualizar el carrito');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al actualizar el carrito');
    } finally {
      this.isUpdating = false;
      this.hideLoading(key);
    }
  }

  async removeItem(key) {
    if (this.isUpdating) return;
    
    // Confirmar eliminación
    if (!confirm('¿Estás seguro de que quieres eliminar este producto del carrito?')) {
      return;
    }
    
    this.updateItemQuantity(key, 0);
  }

  async updateCart() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    this.showGlobalLoading();
    
    try {
      const formData = new FormData(this.form);
      const updates = {};
      
      // Recopilar todas las cantidades
      const inputs = this.form.querySelectorAll('input[name="updates[]"]');
      inputs.forEach((input, index) => {
        const key = input.dataset.key;
        updates[key] = parseInt(input.value) || 0;
      });
      
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ updates })
      });
      
      if (response.ok) {
        const cart = await response.json();
        this.updateCartDisplay(cart);
        this.notifyMiniCart(cart);
        this.showSuccess('Carrito actualizado correctamente');
      } else {
        throw new Error('Error al actualizar el carrito');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al actualizar el carrito');
    } finally {
      this.isUpdating = false;
      this.hideGlobalLoading();
    }
  }

  updateCartDisplay(cart) {
    // Actualizar contador de items
    if (this.cartCount) {
      const itemText = cart.item_count === 1 ? 'producto' : 'productos';
      this.cartCount.textContent = `${cart.item_count} ${itemText}`;
    }
    
    // Actualizar totales
    this.updateTotals(cart);
    
    // Si el carrito está vacío, recargar la página para mostrar el estado vacío
    if (cart.item_count === 0) {
      window.location.reload();
    }
  }

  updateTotals(cart) {
    const subtotalAmount = this.cartTotals?.querySelector('.cart-subtotal__amount');
    if (subtotalAmount) {
      subtotalAmount.textContent = this.formatMoney(cart.total_price);
    }
    
    const savingsElement = this.cartTotals?.querySelector('.cart-savings__amount');
    if (savingsElement && cart.total_discount > 0) {
      savingsElement.textContent = `-${this.formatMoney(cart.total_discount)}`;
    }
  }

  removeItemFromDOM(key) {
    const item = this.cartItems.querySelector(`[data-key="${key}"]`);
    if (item) {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        item.remove();
      }, 300);
    }
  }

  notifyMiniCart(cart) {
    // Notificar al mini carrito sobre la actualización
    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: cart
    }));
  }

  syncWithMiniCart(cartData) {
    // Sincronizar con cambios del mini carrito
    if (cartData && this.cartItems) {
      this.updateCartDisplay(cartData);
    }
  }

  showLoading(key) {
    const item = this.cartItems.querySelector(`[data-key="${key}"]`);
    if (item) {
      item.style.opacity = '0.6';
      item.style.pointerEvents = 'none';
    }
  }

  hideLoading(key) {
    const item = this.cartItems.querySelector(`[data-key="${key}"]`);
    if (item) {
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';
    }
  }

  showGlobalLoading() {
    if (this.cartItems) {
      this.cartItems.style.opacity = '0.6';
      this.cartItems.style.pointerEvents = 'none';
    }
  }

  hideGlobalLoading() {
    if (this.cartItems) {
      this.cartItems.style.opacity = '1';
      this.cartItems.style.pointerEvents = 'auto';
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification--${type}`;
    notification.textContent = message;
    
    // Estilos inline para la notificación
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '9999',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      backgroundColor: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'
    });
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  formatMoney(cents) {
    // Formato básico de dinero - ajustar según la configuración de la tienda
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR' // Cambiar según la moneda de la tienda
    }).format(cents / 100);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CartPage();
  });
} else {
  new CartPage();
}

// Exportar para uso en otros scripts si es necesario
window.CartPage = CartPage;