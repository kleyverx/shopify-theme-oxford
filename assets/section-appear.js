// Animación de aparición elegante para secciones
(function() {
  if (window.SectionAppearObserver) return; // Evita doble carga
  window.SectionAppearObserver = true;

  function onEntry(entries, observer) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-appear--visible');
        observer.unobserve(entry.target);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const observer = new window.IntersectionObserver(onEntry, {
      threshold: 0.15
    });
    document.querySelectorAll('.section-appear').forEach(section => {
      observer.observe(section);
    });
  });
})();
