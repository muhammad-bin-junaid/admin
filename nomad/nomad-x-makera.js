/* ========================================
   NOMAD x MAKERS ERA - Interactions
   ======================================== */

// --- Mobile Menu Toggle ---
var menuToggle = document.getElementById('menuToggle');
var mobileMenu = document.getElementById('mobileMenu');

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', function() {
    var isOpen = mobileMenu.classList.toggle('active');
    menuToggle.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      mobileMenu.classList.remove('active');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

// --- Footer Accordion (mobile) ---
document.querySelectorAll('.footer-col h3').forEach(function(header) {
  header.addEventListener('click', function() {
    var col = this.parentElement;
    // Close others
    document.querySelectorAll('.footer-col').forEach(function(c) {
      if (c !== col) c.classList.remove('active');
    });
    col.classList.toggle('active');
  });
});

// --- Carousel Drag Scroll ---
function enableDragScroll(element) {
  var isDown = false;
  var startX;
  var scrollLeft;

  element.addEventListener('mousedown', function(e) {
    isDown = true;
    element.style.cursor = 'grabbing';
    startX = e.pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  });

  element.addEventListener('mouseleave', function() {
    isDown = false;
    element.style.cursor = 'grab';
  });

  element.addEventListener('mouseup', function() {
    isDown = false;
    element.style.cursor = 'grab';
  });

  element.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    e.preventDefault();
    var x = e.pageX - element.offsetLeft;
    var walk = (x - startX) * 1.5;
    element.scrollLeft = scrollLeft - walk;
  });

  element.style.cursor = 'grab';
}

document.querySelectorAll('.carousel-track').forEach(function(carousel) {
  enableDragScroll(carousel);
});

// --- Scroll Fade-In Animation ---
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(function(el) {
  observer.observe(el);
});
