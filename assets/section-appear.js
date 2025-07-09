// Animación de aparición elegante para secciones
(function() {
  if (window.SectionAppearObserver) return; // Evita doble carga
  window.SectionAppearObserver = true;

  function showAllInEditor() {
    document.querySelectorAll('.section-appear').forEach(section => {
      section.classList.add('section-appear--visible');
    });
  }

  function onEntry(entries, observer) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-appear--visible');
        observer.unobserve(entry.target);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (window.Shopify && window.Shopify.designMode) {
      showAllInEditor();
      // Además, si editas bloques, vuelve a mostrar la animación
      document.addEventListener('shopify:section:load', showAllInEditor);
      document.addEventListener('shopify:block:select', showAllInEditor);
      document.addEventListener('shopify:block:deselect', showAllInEditor);
      return;
    }
    const observer = new window.IntersectionObserver(onEntry, {
      threshold: 0.15
    });
    document.querySelectorAll('.section-appear').forEach(section => {
      observer.observe(section);
    });
  });
})();
