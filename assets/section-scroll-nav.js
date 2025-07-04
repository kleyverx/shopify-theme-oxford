// Scroll suave y scrollspy para .section-scroll-nav
// Sin dependencias externas

document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('.section-scroll-nav');
  if (!nav) return;
  const buttons = nav.querySelectorAll('.section-scroll-nav__item');
  const sectionIds = Array.from(buttons).map(btn => btn.getAttribute('data-target'));
  const sections = sectionIds.map(id => document.querySelector(id)).filter(Boolean);

  // Scroll suave al hacer click
  buttons.forEach((btn, i) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(btn.getAttribute('data-target'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scrollspy: resalta el botón de la sección visible
  function onScroll() {
    let activeIdx = 0;
    const scrollY = window.scrollY || window.pageYOffset;
    sections.forEach((section, i) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + scrollY;
      if (scrollY >= top - 80) {
        activeIdx = i;
      }
    });
    buttons.forEach((btn, i) => {
      if (i === activeIdx) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});
