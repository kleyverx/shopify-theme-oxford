/**
 * Oxford Theme - Cart API Handler
 * Autor: Kleyver Urbina - kleyvercell2@gmail.com
 * Funcionalidades avanzadas para el carrito
 * Fecha: Enero 2025
 */

class CartAPI {
  constructor() {
    this.cache = new Map();
    this.debounceTimers = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Get current cart data
   */
  async getCart() {
    try {
      const response = await fetch('/cart.js', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cart = await response.json();
      
      // Validate cart structure
      if (!cart || typeof cart !== 'object') {
        throw new Error('Invalid cart data received');
      }
      
      // Ensure required properties exist
      if (!cart.hasOwnProperty('items')) {
        cart.items = [];
      }
      if (!cart.hasOwnProperty('item_count')) {
        cart.item_count = 0;
      }
      if (!cart.hasOwnProperty('total_price')) {
        cart.total_price = 0;
      }
      
      this.cache.set('cart', cart);
      return cart;
    } catch (error) {
      console.error('Error fetching cart:', error);
      
      // Return fallback cart structure
      const fallbackCart = {
        items: [],
        item_count: 0,
        total_price: 0,
        total_discount: 0,
        currency: 'EUR'
      };
      
      this.cache.set('cart', fallbackCart);
      return fallbackCart;
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(variantId, quantity = 1, properties = {}) {
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
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error adding to cart');
      }

      const result = await response.json();
      
      // Update cache and dispatch event
      const updatedCart = await this.getCart();
      this.dispatchCartEvent('cart:item-added', { 
        item: result, 
        cart: updatedCart 
      });
      
      return result;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity with debouncing
   */
  async updateCartItem(line, quantity, debounce = true) {
    const key = `update-${line}`;
    
    if (debounce) {
      // Clear existing timer
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }

      // Set new timer
      return new Promise((resolve, reject) => {
        const timer = setTimeout(async () => {
          try {
            const result = await this._updateCartItem(line, quantity);
            resolve(result);
          } catch (error) {
            reject(error);
          }
          this.debounceTimers.delete(key);
        }, 300);
        
        this.debounceTimers.set(key, timer);
      });
    } else {
      return this._updateCartItem(line, quantity);
    }
  }

  /**
   * Internal method to update cart item
   */
  async _updateCartItem(line, quantity, attempt = 1) {
    try {
      // Validate inputs
      const lineNumber = parseInt(line);
      const qty = parseInt(quantity);
      
      if (isNaN(lineNumber) || lineNumber < 1) {
        throw new Error('Invalid line number');
      }
      
      if (isNaN(qty) || qty < 0) {
        throw new Error('Invalid quantity');
      }
      
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: lineNumber,
          quantity: qty
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const cart = await response.json();
      
      // Validate cart response
      if (!cart || typeof cart !== 'object') {
        throw new Error('Invalid cart response');
      }
      
      this.cache.set('cart', cart);
      
      // Dispatch update event
      this.dispatchCartEvent('cart:updated', { cart, source: 'cart-api' });
      
      return cart;
    } catch (error) {
      // Retry logic for network errors only
      if (attempt < this.retryAttempts && 
          (error.message.includes('HTTP error') || error.message.includes('fetch'))) {
        console.warn(`Cart update failed, retrying... (${attempt}/${this.retryAttempts})`);
        await this.delay(this.retryDelay * attempt);
        return this._updateCartItem(line, quantity, attempt + 1);
      }
      
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(line) {
    return this.updateCartItem(line, 0, false);
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    try {
      const response = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cart = await response.json();
      this.cache.set('cart', cart);
      
      this.dispatchCartEvent('cart:cleared', { cart });
      
      return cart;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Apply discount code
   */
  async applyDiscount(discountCode) {
    try {
      // Note: Shopify doesn't have a direct API for discount codes
      // This would typically be handled on the checkout page
      // But we can store it for later use
      sessionStorage.setItem('discount_code', discountCode);
      
      this.dispatchCartEvent('cart:discount-applied', { 
        discountCode 
      });
      
      return { success: true, code: discountCode };
    } catch (error) {
      console.error('Error applying discount:', error);
      throw error;
    }
  }

  /**
   * Get shipping rates (if available)
   */
  async getShippingRates(address) {
    try {
      // This would require additional Shopify setup
      // For now, return mock data
      const rates = [
        { name: 'Envío estándar', price: 500, delivery_time: '3-5 días' },
        { name: 'Envío express', price: 1000, delivery_time: '1-2 días' }
      ];
      
      return rates;
    } catch (error) {
      console.error('Error fetching shipping rates:', error);
      throw error;
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCart() {
    try {
      const cart = await this.getCart();
      const validation = {
        valid: true,
        errors: [],
        warnings: []
      };

      // Check if cart exists and has valid structure
      if (!cart || typeof cart !== 'object') {
        validation.valid = false;
        validation.errors.push('Error al obtener información del carrito');
        return validation;
      }

      // Check if cart is empty
      if (!cart.item_count || cart.item_count === 0) {
        validation.valid = false;
        validation.errors.push('El carrito está vacío');
        return validation;
      }

      // Check if items array exists
      if (!cart.items || !Array.isArray(cart.items)) {
        validation.valid = false;
        validation.errors.push('Error al obtener los productos del carrito');
        return validation;
      }

      // Check inventory for each item
      for (const item of cart.items) {
        if (!item) continue;
        
        // Only check inventory if we have the data and inventory is managed
        if (item.variant && 
            item.variant.inventory_management && 
            typeof item.variant.inventory_quantity === 'number' &&
            item.quantity > item.variant.inventory_quantity) {
          validation.valid = false;
          validation.errors.push(`Stock insuficiente para ${item.product_title || item.title || 'producto'}`);
        }
      }

      // Check minimum order amount (example: €20)
      const minOrderAmount = 2000; // 20 EUR in cents
      if (cart.total_price && cart.total_price < minOrderAmount) {
        validation.warnings.push(`Pedido mínimo: ${this.formatMoney(minOrderAmount)}`);
      }

      return validation;
    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        valid: false,
        errors: ['Error al validar el carrito'],
        warnings: []
      };
    }
  }

  /**
   * Calculate cart totals with taxes and discounts
   */
  calculateTotals(cart) {
    const subtotal = cart.total_price;
    const discountAmount = cart.total_discount || 0;
    const taxAmount = cart.total_tax || 0;
    const shippingAmount = 0; // Would be calculated based on selected shipping
    
    return {
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      shipping: shippingAmount,
      total: subtotal - discountAmount + taxAmount + shippingAmount
    };
  }

  /**
   * Format money with currency
   */
  formatMoney(cents, currency = 'EUR') {
    return (cents / 100).toLocaleString('es-ES', {
      style: 'currency',
      currency: currency
    });
  }

  /**
   * Dispatch custom cart events
   */
  dispatchCartEvent(eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cached cart data
   */
  getCachedCart() {
    return this.cache.get('cart') || null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create global instance
window.CartAPI = new CartAPI();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CartAPI;
}