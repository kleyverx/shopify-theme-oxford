/**
 * Script de prueba para verificar la funcionalidad del mini carrito
 * Simula agregar un producto al carrito y verifica si el mini carrito se actualiza
 */

// Función para simular agregar un producto al carrito
function testAddToCart() {
  console.log('🧪 Iniciando prueba de agregar al carrito...');
  
  // Verificar si CartAPI está disponible
  if (!window.CartAPI) {
    console.error('❌ CartAPI no está disponible');
    return;
  }
  
  // Verificar si PremiumMiniCart está disponible
  if (!window.PremiumMiniCart || !window.PremiumMiniCart.instance) {
    console.error('❌ PremiumMiniCart no está disponible');
    return;
  }
  
  const miniCart = window.PremiumMiniCart.instance;
  
  // Datos de prueba para agregar al carrito
  const testProduct = {
    id: 123456789, // ID de producto de prueba
    quantity: 1,
    properties: {
      'Test': 'true'
    }
  };
  
  console.log('📦 Agregando producto de prueba:', testProduct);
  
  // Simular evento de producto agregado
  const addEvent = new CustomEvent('cart:item-added', {
    detail: {
      product: testProduct,
      cart: {
        item_count: 1,
        total_price: 2999,
        items: [{
          id: testProduct.id,
          quantity: testProduct.quantity,
          title: 'Producto de Prueba',
          price: 2999,
          line_price: 2999,
          variant_title: 'Variante de Prueba'
        }]
      }
    }
  });
  
  // Disparar el evento
  document.dispatchEvent(addEvent);
  
  // Verificar si el mini carrito se abrió
  setTimeout(() => {
    if (miniCart.isOpen) {
      console.log('✅ Mini carrito se abrió correctamente');
    } else {
      console.log('⚠️ Mini carrito no se abrió automáticamente');
    }
    
    // Verificar contador
    const countElement = document.getElementById('mini-cart-count');
    if (countElement) {
      console.log(`🔢 Contador del carrito: ${countElement.textContent}`);
    }
  }, 500);
}

// Función para probar el toggle del mini carrito
function testMiniCartToggle() {
  console.log('🧪 Probando toggle del mini carrito...');
  
  const trigger = document.querySelector('[data-mini-cart-trigger]');
  if (!trigger) {
    console.error('❌ Trigger del mini carrito no encontrado');
    return;
  }
  
  console.log('🖱️ Simulando clic en el trigger...');
  trigger.click();
  
  setTimeout(() => {
    const dropdown = document.getElementById('mini-cart-dropdown');
    if (dropdown && dropdown.classList.contains('mini-cart__dropdown--open')) {
      console.log('✅ Mini carrito se abrió correctamente');
      
      // Cerrar después de 2 segundos
      setTimeout(() => {
        trigger.click();
        console.log('🔄 Mini carrito cerrado');
      }, 2000);
    } else {
      console.error('❌ Mini carrito no se abrió');
    }
  }, 300);
}

// Función para verificar elementos del DOM
function checkDOMElements() {
  console.log('🧪 Verificando elementos del DOM...');
  
  const elements = {
    'Mini Cart Wrapper': '.mini-cart-wrapper',
    'Mini Cart Trigger': '[data-mini-cart-trigger]',
    'Mini Cart Dropdown': '#mini-cart-dropdown',
    'Mini Cart Backdrop': '.mini-cart__backdrop',
    'Mini Cart Items': '#mini-cart-items',
    'Mini Cart Count': '#mini-cart-count',
    'Mini Cart Subtotal': '#mini-cart-subtotal'
  };
  
  let allFound = true;
  
  for (const [name, selector] of Object.entries(elements)) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✅ ${name}: Encontrado`);
    } else {
      console.error(`❌ ${name}: NO encontrado (${selector})`);
      allFound = false;
    }
  }
  
  return allFound;
}

// Función principal de diagnóstico
function runMiniCartDiagnostic() {
  console.log('🚀 Iniciando diagnóstico completo del mini carrito...');
  console.log('=' .repeat(50));
  
  // 1. Verificar elementos del DOM
  console.log('\n1️⃣ Verificando elementos del DOM:');
  const domOk = checkDOMElements();
  
  // 2. Verificar APIs
  console.log('\n2️⃣ Verificando APIs:');
  if (window.CartAPI) {
    console.log('✅ CartAPI: Disponible');
  } else {
    console.error('❌ CartAPI: NO disponible');
  }
  
  if (window.PremiumMiniCart && window.PremiumMiniCart.instance) {
    console.log('✅ PremiumMiniCart: Instancia creada');
  } else {
    console.error('❌ PremiumMiniCart: Instancia NO creada');
  }
  
  // 3. Probar toggle si todo está bien
  if (domOk) {
    console.log('\n3️⃣ Probando toggle del mini carrito:');
    setTimeout(() => testMiniCartToggle(), 1000);
    
    console.log('\n4️⃣ Probando agregar al carrito:');
    setTimeout(() => testAddToCart(), 3000);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Diagnóstico completado. Revisa los resultados arriba.');
}

// Ejecutar diagnóstico cuando la página esté lista
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runMiniCartDiagnostic, 2000);
  });
} else {
  setTimeout(runMiniCartDiagnostic, 2000);
}

// Exponer funciones globalmente para uso manual
window.testMiniCart = {
  runDiagnostic: runMiniCartDiagnostic,
  testToggle: testMiniCartToggle,
  testAddToCart: testAddToCart,
  checkDOM: checkDOMElements
};