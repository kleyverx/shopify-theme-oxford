/**
 * Add to Cart Functionality
 * Handles product form submissions and cart interactions
 */

class AddToCart {
  constructor() {
    this.forms = document.querySelectorAll('[data-product-form]');
    this.isSubmitting = false;
    this.init();
  }

  init() {
    if (this.forms.length === 0) {
      console.warn('No product forms found on this page');
      return;
    }

    this.forms.forEach(form => {
      this.bindFormEvents(form);
      this.initQuantityControls(form);
      this.initPriceCalculation(form);
    });

    // Initialize custom offer functionality
    this.initCustomOffers();

    console.log(`✓ Initialized ${this.forms.length} product form(s)`);
  }

  initCustomOffers() {
    const customOfferBlocks = document.querySelectorAll('.custom-offer-block');
    
    customOfferBlocks.forEach(block => {
      // Initialize countdown timers if present
      const countdownElement = block.querySelector('[data-countdown-end]');
      if (countdownElement) {
        this.initCountdown(countdownElement);
      }
      
      console.log('✓ Custom offer block initialized (display only)');
    });
  }

  initCountdown(countdownElement) {
    const targetDate = countdownElement.dataset.countdown;
    if (!targetDate) return;

    const endDate = new Date(targetDate).getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = endDate - now;

      if (distance < 0) {
        countdownElement.style.display = 'none';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const daysEl = countdownElement.querySelector('[data-days]');
      const hoursEl = countdownElement.querySelector('[data-hours]');
      const minutesEl = countdownElement.querySelector('[data-minutes]');
      const secondsEl = countdownElement.querySelector('[data-seconds]');

      if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
      if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
      if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
      if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  bindFormEvents(form) {
    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  initQuantityControls(form) {
    const quantityInput = form.querySelector('[data-quantity-input]');
    const quantityButtons = form.querySelectorAll('[data-quantity-change]');
    
    if (!quantityInput) return;

    // Bind quantity button events
    quantityButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const change = parseInt(button.dataset.quantityChange);
        this.updateQuantity(quantityInput, change);
      });
    });

    // Bind input change events
    quantityInput.addEventListener('change', () => {
      this.validateQuantity(quantityInput);
      this.updatePriceTotal(form);
    });

    quantityInput.addEventListener('input', () => {
      this.updatePriceTotal(form);
    });
  }

  initPriceCalculation(form) {
    // Get variant data from the form
    const variantIdInput = form.querySelector('input[name="id"]');
    if (!variantIdInput) return;

    // Try to get variant data from global product object or data attributes
    const productData = this.getProductData(form);
    if (productData) {
      form.dataset.productData = JSON.stringify(productData);
      this.updatePriceTotal(form);
    }
  }

  getProductData(form) {
    // Try to get product data from various sources
    if (window.product && window.product.variants) {
      return window.product;
    }

    // Try to get from data attributes
    const productSection = form.closest('[data-product-id]');
    if (productSection && productSection.dataset.productData) {
      try {
        return JSON.parse(productSection.dataset.productData);
      } catch (e) {
        console.warn('Failed to parse product data:', e);
      }
    }

    return null;
  }

  updateQuantity(input, change) {
    const currentValue = parseInt(input.value) || 1;
    const min = parseInt(input.min) || 1;
    const max = parseInt(input.max) || 999;
    
    let newValue = currentValue + change;
    newValue = Math.max(min, Math.min(max, newValue));
    
    input.value = newValue;
    input.dispatchEvent(new Event('change'));
  }

  validateQuantity(input) {
    const value = parseInt(input.value);
    const min = parseInt(input.min) || 1;
    const max = parseInt(input.max) || 999;
    
    if (isNaN(value) || value < min) {
      input.value = min;
    } else if (value > max) {
      input.value = max;
      this.showStockMessage(input.closest('form'), `Solo hay ${max} unidades disponibles`);
    }
  }

  updatePriceTotal(form) {
    const quantityInput = form.querySelector('[data-quantity-input]');
    const priceTotal = form.querySelector('[data-price-total]');
    
    if (!quantityInput || !priceTotal) return;

    const quantity = parseInt(quantityInput.value) || 1;
    const productData = form.dataset.productData ? JSON.parse(form.dataset.productData) : null;
    
    if (productData && productData.variants) {
      const variantIdInput = form.querySelector('input[name="id"]');
      const variantId = variantIdInput ? parseInt(variantIdInput.value) : null;
      
      const variant = productData.variants.find(v => v.id === variantId);
      if (variant) {
        // Use original variant price without custom offer modifications
        const total = variant.price * quantity;
        priceTotal.textContent = this.formatMoney(total);
        
        // Update discount info only for native Shopify discounts
        this.updateDiscountInfo(form, variant, quantity);
      }
    }
  }

  updateDiscountInfo(form, variant, quantity) {
    const discountInfo = form.querySelector('[data-discount-info]');
    if (!discountInfo) return;

    // Hide discount info by default
    discountInfo.style.display = 'none';

    // Only check for Shopify native discount (compare_at_price)
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      const savings = (variant.compare_at_price - variant.price) * quantity;
      const discountPercent = Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100);
      
      const discountAmount = discountInfo.querySelector('[data-discount-amount]');
      const savingsAmount = discountInfo.querySelector('[data-savings-amount]');
      
      if (discountAmount) discountAmount.textContent = `${discountPercent}%`;
      if (savingsAmount) savingsAmount.textContent = this.formatMoney(savings);
      
      discountInfo.style.display = 'block';
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('[data-add-to-cart]');
    
    try {
      this.isSubmitting = true;
      this.setLoadingState(submitButton, true);
      this.hideMessages(form);
      
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        this.handleAddSuccess(form, result);
      } else {
        this.handleAddError(form, result);
      }
      
    } catch (error) {
      console.error('Add to cart error:', error);
      this.showStockMessage(form, 'Error al agregar el producto al carrito. Inténtalo de nuevo.', 'error');
    } finally {
      this.isSubmitting = false;
      this.setLoadingState(submitButton, false);
    }
  }

  handleAddSuccess(form, result) {
    console.log('✓ Product added to cart:', result);
    
    // Show success message
    this.showStockMessage(form, '¡Producto agregado al carrito!', 'success');
    
    // Dispatch custom event for other components (like mini-cart)
    const event = new CustomEvent('cart:item-added', {
      detail: {
        item: result,
        form: form
      },
      bubbles: true
    });
    document.dispatchEvent(event);
    
    // Update cart count if element exists
    this.updateCartCount();
  }

  handleAddError(form, error) {
    console.error('Add to cart error:', error);
    
    let message = 'Error al agregar el producto al carrito.';
    
    if (error.message) {
      message = error.message;
    } else if (error.description) {
      message = error.description;
    }
    
    this.showStockMessage(form, message, 'error');
  }

  setLoadingState(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (btnText && btnLoading) {
      if (isLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        button.disabled = true;
      } else {
        btnText.style.display = 'block';
        btnLoading.style.display = 'none';
        button.disabled = false;
      }
    }
  }

  showStockMessage(form, message, type = 'error') {
    const stockMessage = form.querySelector('[data-stock-message]');
    if (!stockMessage) return;
    
    stockMessage.textContent = message;
    stockMessage.style.display = 'block';
    
    // Update styling based on type
    if (type === 'success') {
      stockMessage.style.color = '#28a745';
      stockMessage.style.backgroundColor = '#d4edda';
      stockMessage.style.borderColor = '#c3e6cb';
    } else {
      stockMessage.style.color = '#dc3545';
      stockMessage.style.backgroundColor = '#f8d7da';
      stockMessage.style.borderColor = '#f5c6cb';
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      stockMessage.style.display = 'none';
    }, 5000);
  }

  hideMessages(form) {
    const stockMessage = form.querySelector('[data-stock-message]');
    if (stockMessage) {
      stockMessage.style.display = 'none';
    }
  }

  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      // Update cart count in mini-cart
      const cartCount = document.querySelector('[data-cart-count]');
      if (cartCount) {
        cartCount.textContent = cart.item_count;
        cartCount.style.display = cart.item_count > 0 ? 'flex' : 'none';
      }
      
      // Dispatch cart update event
      const event = new CustomEvent('cart:updated', {
        detail: { cart },
        bubbles: true
      });
      document.dispatchEvent(event);
      
    } catch (error) {
      console.error('Failed to update cart count:', error);
    }
  }

  formatMoney(cents) {
    if (typeof cents !== 'number') return '$0.00';
    
    const money = (cents / 100).toFixed(2);
    
    // Use Shopify's money format if available
    if (window.Shopify && window.Shopify.money_format) {
      return window.Shopify.money_format.replace('{{amount}}', money);
    }
    
    return `$${money}`;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.AddToCart = new AddToCart();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AddToCart;
}