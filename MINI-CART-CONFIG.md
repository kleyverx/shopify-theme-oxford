# Configuración del Mini Carrito - Oxford Theme

## Descripción
El mini carrito del tema Oxford ahora incluye configuraciones avanzadas que permiten personalizar completamente su comportamiento y apariencia desde el panel de administración de Shopify.

## Configuraciones Disponibles

### Configuraciones Básicas
- **Habilitar Mini Carrito**: Activa/desactiva completamente el mini carrito
- **Auto-apertura**: Abre automáticamente el mini carrito al agregar productos
- **Posición**: Controla dónde aparece el mini carrito (izquierda, derecha, centro)

### Configuraciones de Diseño
- **Ancho del Mini Carrito**: Controla el ancho en píxeles (300-600px)
- **Altura Máxima**: Establece la altura máxima del contenido (400-800px)
- **Colores Personalizables**:
  - Color de fondo
  - Color del texto
  - Color de acento (botones principales)
  - Color del borde

### Configuraciones de Funcionalidad
- **Mostrar Imágenes de Productos**: Controla si se muestran las imágenes
- **Mostrar Controles de Cantidad**: Habilita/deshabilita los botones +/-
- **Mostrar Botón Eliminar**: Controla la visibilidad del botón de eliminar
- **Mostrar Subtotal**: Muestra/oculta el subtotal del carrito
- **Mostrar Botones de Acción**: Controla los botones de checkout y ver carrito

### Configuraciones de Texto
- **Texto del Botón Checkout**: Personaliza el texto del botón principal
- **Texto del Botón Ver Carrito**: Personaliza el texto del botón secundario
- **Textos de Carrito Vacío**: Personaliza título, subtítulo y botón

### Configuraciones Avanzadas
- **Umbral de Envío Gratis**: Establece el monto para envío gratis
- **Mensaje de Envío Gratis**: Personaliza el mensaje mostrado
- **Cerrar al Agregar**: Cierra automáticamente después de agregar productos
- **Mostrar Barra de Progreso**: Muestra progreso hacia envío gratis
- **Velocidad de Animación**: Controla la velocidad de las transiciones

## Cómo Configurar

1. Ve a **Tienda Online > Temas**
2. Haz clic en **Personalizar** en tu tema Oxford
3. En el panel izquierdo, busca la sección **"Configuración del tema"**
4. Encuentra la subsección **"Mini Carrito"**
5. Ajusta las configuraciones según tus necesidades
6. Haz clic en **Guardar** para aplicar los cambios

## Configuraciones Recomendadas

### Para E-commerce Básico
- Auto-apertura: Activada
- Posición: Derecha
- Mostrar todos los elementos: Activado
- Velocidad de animación: Normal (300ms)

### Para E-commerce Premium
- Umbral de envío gratis: Configurado
- Barra de progreso: Activada
- Colores personalizados que coincidan con la marca
- Textos personalizados

### Para Móviles
- El mini carrito se adapta automáticamente a pantallas pequeñas
- En móviles, siempre ocupa el ancho completo
- La altura se ajusta automáticamente

## Archivos Modificados

- `config/settings_schema.json`: Configuraciones del tema
- `snippets/mini-cart.liquid`: Componente principal del mini carrito
- `assets/mini-cart-config.css`: Estilos de configuración
- `assets/cart-api.js`: API del carrito (previamente mejorada)

## Compatibilidad

- ✅ Shopify 2.0
- ✅ Responsive Design
- ✅ Accesibilidad (WCAG 2.1)
- ✅ Navegadores modernos
- ✅ Modo de alto contraste
- ✅ Preferencias de movimiento reducido

## Soporte

Para soporte técnico o consultas sobre la configuración del mini carrito, contacta al desarrollador del tema.

---

**Desarrollado por**: Kleyver Urbina  
**Email**: kleyvercell2@gmail.com  
**Fecha**: Enero 2025  
**Versión**: 1.0.0