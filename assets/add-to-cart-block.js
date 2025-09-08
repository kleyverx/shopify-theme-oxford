class AddToCartBlock {
  constructor(element) {
    this.element = element;
    this.productId = element.dataset.productId;
    this.maxThreshold = parseInt(element.dataset.maxThreshold) || 10;
    this.productPrice = parseInt(element.dataset.productPrice) || 0;
    this.form = element.querySelector('[data-product-form]');
    this.quantityInput = element.querySelector('[data-quantity-input]');
    this.addToCartBtn = element.querySelector('[data-add-to-cart]');
    this.wholesaleBtn = element.querySelector('[data-wholesale-contact]');
    this.thresholdWarning = element.querySelector('[data-threshold-warning]');
    this.priceTotal = element.querySelector('[data-price-total]');
    
    // Validar que los elementos existen
    if (!this.element) {
      console.error('Add to cart block: elemento principal no encontrado');
      return;
    }
    
    if (!this.form) {
      console.error('Add to cart block: formulario no encontrado');
      return;
    }
    
    if (!this.quantityInput) {
      console.error('Add to cart block: input de cantidad no encontrado');
      return;
    }
    
    if (!this.addToCartBtn) {
      console.error('Add to cart block: botón agregar al carrito no encontrado');
      return;
    }
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateThresholdDisplay();
    this.updatePriceTotal();
  }
  
  // Format price in cents to currency
  formatMoney(cents) {
    if (typeof cents !== 'number') {
      cents = parseInt(cents) || 0;
    }
    
    // Convert cents to dollars
    const dollars = cents / 100;
    
    // Format with currency symbol
    return dollars.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  }
  
  // Update price total display
  updatePriceTotal() {
    if (!this.priceTotal) return;
    
    const quantity = parseInt(this.quantityInput.value) || 1;
    const totalPrice = this.productPrice * quantity;
    
    this.priceTotal.textContent = this.formatMoney(totalPrice);
  }

  bindEvents() {
    // Quantity change buttons
    const quantityBtns = this.element.querySelectorAll('[data-quantity-change]');
    quantityBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const change = parseInt(btn.dataset.quantityChange);
        this.updateQuantity(change);
      });
    });

    // Quantity input direct change
    if (this.quantityInput) {
      this.quantityInput.addEventListener('input', () => {
        this.validateQuantity();
      });

      this.quantityInput.addEventListener('change', () => {
        this.validateQuantity();
      });
    }

    // Form submission
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddToCart();
      });
    }
  }

  updateQuantity(change) {
    const currentValue = parseInt(this.quantityInput.value) || 1;
    const newValue = Math.max(1, currentValue + change);
    
    this.quantityInput.value = newValue;
    this.validateQuantity();
    this.updatePriceTotal();
  }

  validateQuantity() {
    const quantity = parseInt(this.quantityInput.value) || 1;
    
    // Ensure minimum value
    if (quantity < 1) {
      this.quantityInput.value = 1;
      this.updatePriceTotal();
      return;
    }

    // Check threshold
    if (quantity > this.maxThreshold) {
      this.showWholesaleOption();
    } else {
      this.hideWholesaleOption();
    }

    this.updateThresholdDisplay();
    this.updatePriceTotal();
  }

  showWholesaleOption() {
    this.addToCartBtn.style.display = 'none';
    this.wholesaleBtn.style.display = 'block';
    this.thresholdWarning.style.display = 'flex';
    
    // Update warning text with actual threshold
    const warningText = this.thresholdWarning.querySelector('span');
    if (warningText) {
      const originalText = warningText.textContent;
      warningText.textContent = originalText.replace('[THRESHOLD]', this.maxThreshold);
    }
  }

  hideWholesaleOption() {
    this.addToCartBtn.style.display = 'block';
    this.wholesaleBtn.style.display = 'none';
    this.thresholdWarning.style.display = 'none';
  }

  updateThresholdDisplay() {
    const quantity = parseInt(this.quantityInput.value) || 1;
    
    // Update quantity buttons state
    const minusBtn = this.element.querySelector('[data-quantity-change="-1"]');
    const plusBtn = this.element.querySelector('[data-quantity-change="1"]');
    
    if (minusBtn) {
      minusBtn.disabled = quantity <= 1;
      minusBtn.style.opacity = quantity <= 1 ? '0.5' : '1';
    }
    
    if (plusBtn) {
      plusBtn.disabled = false; // Allow going over threshold to show wholesale option
      plusBtn.style.opacity = '1';
    }
  }

  async handleAddToCart() {
    const quantity = parseInt(this.quantityInput.value) || 1;
    
    // Don't allow adding to cart if over threshold
    if (quantity > this.maxThreshold) {
      this.showWholesaleOption();
      return;
    }

    const formData = new FormData(this.form);
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        this.handleAddToCartSuccess(result);
      } else {
        throw new Error('Error al agregar al carrito');
      }
    } catch (error) {
      this.handleAddToCartError(error);
    } finally {
      this.setLoadingState(false);
    }
  }

  setLoadingState(isLoading) {
    if (!this.addToCartBtn) return;
    
    const btnText = this.addToCartBtn.querySelector('.btn-text');
    const btnLoading = this.addToCartBtn.querySelector('.btn-loading');
    
    this.addToCartBtn.disabled = isLoading;
    
    if (btnText) {
      btnText.style.display = isLoading ? 'none' : 'inline-flex';
    } else {
      // Si no hay elemento .btn-text, cambiar el texto del botón directamente
      if (!isLoading) {
        this.addToCartBtn.innerHTML = this.addToCartBtn.dataset.originalText || 'Agregar al carrito';
      }
    }
    
    if (btnLoading) {
      btnLoading.style.display = isLoading ? 'inline-flex' : 'none';
    } else {
      // Si no hay elemento .btn-loading, cambiar el texto del botón directamente
      if (isLoading) {
        if (!this.addToCartBtn.dataset.originalText) {
          this.addToCartBtn.dataset.originalText = this.addToCartBtn.textContent;
        }
        this.addToCartBtn.innerHTML = '<span class="spinner">⏳</span> Agregando...';
      }
    }
  }

  async handleAddToCartSuccess(result) {
    try {
      // Dispatch immediate success event
      document.dispatchEvent(new CustomEvent('cart:item-added', {
        detail: { item: result, success: true }
      }));
      
      // Show success feedback
      this.showFeedback('¡Producto agregado al carrito!', 'success');
      
      // Open mini cart immediately with multiple attempts
      this.openMiniCartWithRetry();
      
      // Fetch complete cart data in background
      const cartResponse = await fetch('/cart.js');
      
      if (cartResponse.ok) {
        const cartData = await cartResponse.json();
        
        // Dispatch cart update event with complete cart data
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { cart: cartData, source: 'add-to-cart' }
        }));
      }
      
    } catch (error) {
      console.error('Error in handleAddToCartSuccess:', error);
      
      // Still dispatch success event and open cart
      document.dispatchEvent(new CustomEvent('cart:item-added', {
        detail: { item: result, success: true }
      }));
      
      this.showFeedback('¡Producto agregado al carrito!', 'success');
      this.openMiniCartWithRetry();
    }
    
    // Reset quantity to 1
    if (this.quantityInput) {
      this.quantityInput.value = 1;
      this.validateQuantity();
    }
  }
  
  openMiniCartWithRetry() {
    // Try to open immediately
    if (this.openMiniCart()) {
      return;
    }
    
    // Retry after 100ms
    setTimeout(() => {
      if (this.openMiniCart()) {
        return;
      }
      
      // Final retry after 300ms
      setTimeout(() => {
        this.openMiniCart();
      }, 300);
    }, 100);
  }
  
  openMiniCart() {
    console.log('Attempting to open mini cart...');
    
    // Method 1: Direct DOM manipulation (most reliable)
    const miniCartPanel = document.querySelector('.mini-cart__panel');
    const miniCartOverlay = document.querySelector('.mini-cart__overlay');
    if (miniCartPanel && miniCartOverlay) {
      try {
        miniCartPanel.classList.add('active');
        miniCartOverlay.classList.add('active');
        document.body.classList.add('mini-cart-open');
        console.log('✓ Mini cart opened via DOM manipulation');
        return true;
      } catch (error) {
        console.warn('Failed to open mini cart via DOM manipulation:', error);
      }
    }
    
    // Method 2: Use global PremiumMiniCart instance
    if (window.PremiumMiniCart && typeof window.PremiumMiniCart.open === 'function') {
      try {
        window.PremiumMiniCart.open();
        console.log('✓ Mini cart opened via global instance');
        return true;
      } catch (error) {
        console.warn('Failed to open mini cart via global instance:', error);
      }
    }
    
    // Method 3: Find mini cart wrapper and call its open method
    const miniCartWrapper = document.querySelector('.mini-cart-wrapper');
    if (miniCartWrapper && miniCartWrapper.miniCartInstance) {
      try {
        miniCartWrapper.miniCartInstance.open();
        console.log('✓ Mini cart opened via wrapper instance');
        return true;
      } catch (error) {
        console.warn('Failed to open mini cart via wrapper instance:', error);
      }
    }
    
    // Method 4: Trigger click on mini cart button
    const miniCartTrigger = document.querySelector('[data-mini-cart-trigger], .mini-cart__trigger, .cart-icon');
    if (miniCartTrigger) {
      try {
        miniCartTrigger.click();
        console.log('Mini cart opened via trigger click');
        return true;
      } catch (error) {
        console.warn('Failed to trigger mini cart via click:', error);
      }
    }
    
    // Method 5: Dispatch custom event as last resort
    document.dispatchEvent(new CustomEvent('mini-cart:open'));
    console.log('Mini cart open event dispatched');
    return false;
  }

  handleAddToCartError(error) {
    console.error('Error adding to cart:', error);
    this.showFeedback('Error al agregar el producto al carrito', 'error');
  }

  showFeedback(message, type) {
    // Create or update feedback element
    let feedback = this.element.querySelector('.cart-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'cart-feedback';
      this.element.appendChild(feedback);
    }
    
    feedback.textContent = message;
    feedback.className = `cart-feedback ${type}`;
    feedback.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      feedback.style.display = 'none';
    }, 3000);
  }
}

// Initialize all add-to-cart blocks when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const addToCartBlocks = document.querySelectorAll('.add-to-cart-block');
  addToCartBlocks.forEach(block => {
    new AddToCartBlock(block);
  });
  
  // Store reference to PremiumMiniCart instance when it's created
  const originalMiniCart = window.PremiumMiniCart;
  if (originalMiniCart) {
    const miniCartObserver = new MutationObserver(() => {
      const miniCartInstance = document.querySelector('.mini-cart-wrapper');
      if (miniCartInstance && !window.PremiumMiniCart.instance) {
        // Wait for mini cart to initialize
        setTimeout(() => {
          const miniCart = document.querySelector('.mini-cart-wrapper');
          if (miniCart && miniCart.miniCartInstance) {
            window.PremiumMiniCart.instance = miniCart.miniCartInstance;
          }
        }, 500);
      }
    });
    miniCartObserver.observe(document.body, { childList: true, subtree: true });
  }
});

// Re-initialize if new blocks are added dynamically
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        const newBlocks = node.querySelectorAll ? node.querySelectorAll('.add-to-cart-block') : [];
        newBlocks.forEach(block => {
          if (!block.dataset.initialized) {
            new AddToCartBlock(block);
            block.dataset.initialized = 'true';
          }
        });
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});