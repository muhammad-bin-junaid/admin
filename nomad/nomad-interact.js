(function() {
  'use strict';

  var isDesktop = function() { return window.innerWidth >= 1200; };

  // ==========================================
  // MOBILE HEADER (<1200px)
  // ==========================================

  // Hamburger → open mobile drawer
  var hamburger = document.querySelector('.afxyz .fIpa3');
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      var drawer = document.querySelector('.m55gK');
      var navList = document.querySelectorAll('.lrFhl')[0];
      if (drawer) drawer.classList.toggle('ilytd');
      if (navList) {
        navList.classList.add('_--D00');
        navList.style.height = '';
      }
      document.querySelector('.Zh7LI')?.classList.toggle('j407K');
    });
  }

  // Close menu button
  var closeMenu = document.querySelector('button[aria-label="Close menu"]');
  if (closeMenu) {
    closeMenu.addEventListener('click', function() {
      document.querySelector('.m55gK')?.classList.remove('ilytd');
      document.querySelector('.Zh7LI')?.classList.remove('j407K');
      var navList = document.querySelectorAll('.lrFhl')[0];
      if (navList) navList.classList.remove('_--D00');
    });
  }

  // Mobile search toggle
  var mobileSearchBtns = document.querySelectorAll('._05u3c[aria-label="Search"]');
  mobileSearchBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var searchBar = document.querySelector('.FsHjJ');
      if (searchBar) searchBar.classList.toggle('_--D00');
    });
  });

  // Mobile cart button → show cart panel
  var mobileCartBtns = document.querySelectorAll('._05u3c[aria-label="Cart drawer"]');
  mobileCartBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cartPanel = document.querySelectorAll('.lrFhl')[1];
      var navList = document.querySelectorAll('.lrFhl')[0];
      if (cartPanel) {
        cartPanel.classList.add('_--D00');
        cartPanel.style.height = '';
      }
      if (navList) navList.classList.remove('_--D00');
      // On mobile, also open the drawer if not already open
      var drawer = document.querySelector('.m55gK');
      if (drawer && !drawer.classList.contains('ilytd')) {
        drawer.classList.add('ilytd');
      }
    });
  });

  // Close cart button
  var closeCartBtns = document.querySelectorAll('.CQ7xU');
  closeCartBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cartPanel = document.querySelectorAll('.lrFhl')[1];
      if (cartPanel) cartPanel.classList.remove('_--D00');
      // Close drawer if on mobile
      if (!isDesktop()) {
        document.querySelector('.m55gK')?.classList.remove('ilytd');
        document.querySelector('.Zh7LI')?.classList.remove('j407K');
      }
    });
  });

  // ==========================================
  // MOBILE ACCORDION (inside drawer)
  // ==========================================
  var accordionTriggers = document.querySelectorAll('.u79b1');
  accordionTriggers.forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var item = trigger.closest('.xsIPa');
      var chevron = trigger.querySelector('.DSSLF');
      if (item) item.classList.toggle('C--HP');
      if (chevron) chevron.classList.toggle('ULYhf');
    });
  });

  // ==========================================
  // DESKTOP NAV HOVER DROPDOWNS (≥1200px)
  // ==========================================
  var navItems = document.querySelectorAll('.NMU-z[aria-haspopup="true"]');
  var phnke = document.querySelector('.PHNKE');
  var zh7li = document.querySelector('.Zh7LI');
  var dropdown0bn0F = document.querySelector('._0bn0F');
  var activeDropdown = null;

  navItems.forEach(function(item) {
    var dropdown = item.querySelector('.kx4GL');
    if (!dropdown) return;

    item.addEventListener('mouseenter', function() {
      if (!isDesktop()) return;
      // Close any other open dropdown
      if (activeDropdown && activeDropdown !== dropdown) {
        activeDropdown.classList.remove('-xowF');
      }
      dropdown.classList.add('-xowF');
      if (phnke) phnke.classList.add('zX-Fi');
      if (zh7li) zh7li.classList.add('j407K');
      if (dropdown0bn0F) dropdown0bn0F.classList.add('j407K');
      activeDropdown = dropdown;
    });

    item.addEventListener('mouseleave', function() {
      if (!isDesktop()) return;
      dropdown.classList.remove('-xowF');
      if (phnke) phnke.classList.remove('zX-Fi');
      if (zh7li) zh7li.classList.remove('j407K');
      if (dropdown0bn0F) dropdown0bn0F.classList.remove('j407K');
      activeDropdown = null;
    });
  });

  // ==========================================
  // DESKTOP SEARCH OVERLAY (≥1200px)
  // ==========================================
  var desktopSearchBtns = document.querySelectorAll('.OHvLY .fIpa3[aria-label="Search"], .tDxRG .fIpa3[aria-label="Search"]');
  var searchOverlay = document.querySelector('._68-cF');
  var searchBackdrop = document.querySelector('.PMZwM');
  var closeSearch = document.querySelector('.phVTq');

  desktopSearchBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (searchOverlay) searchOverlay.classList.toggle('AohQG');
    });
  });

  if (closeSearch) {
    closeSearch.addEventListener('click', function() {
      if (searchOverlay) searchOverlay.classList.remove('AohQG');
    });
  }

  if (searchBackdrop) {
    searchBackdrop.addEventListener('click', function() {
      if (searchOverlay) searchOverlay.classList.remove('AohQG');
    });
  }

  // ==========================================
  // DESKTOP CART DRAWER (≥1200px)
  // ==========================================
  var desktopCartBtns = document.querySelectorAll('.fIpa3[aria-label="Cart drawer"]');
  var cartDrawer = document.querySelector('.cCUQ1');
  var cartBackdrop = document.querySelector('.epW0s');

  desktopCartBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (isDesktop()) {
        if (cartDrawer) cartDrawer.classList.toggle('EY1hL');
      } else {
        // Mobile: open cart panel inside drawer
        var cartPanel = document.querySelectorAll('.lrFhl')[1];
        var navList = document.querySelectorAll('.lrFhl')[0];
        if (cartPanel) {
          cartPanel.classList.add('_--D00');
          cartPanel.style.height = '';
        }
        if (navList) navList.classList.remove('_--D00');
        var drawer = document.querySelector('.m55gK');
        if (drawer && !drawer.classList.contains('ilytd')) {
          drawer.classList.add('ilytd');
        }
      }
    });
  });

  // Close desktop cart
  var closeDesktopCartBtns = document.querySelectorAll('button[aria-label="Close cart drawer"]');
  closeDesktopCartBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (cartDrawer) cartDrawer.classList.remove('EY1hL');
    });
  });

  if (cartBackdrop) {
    cartBackdrop.addEventListener('click', function() {
      if (cartDrawer) cartDrawer.classList.remove('EY1hL');
    });
  }

  // ==========================================
  // ESC KEY - Close any open overlay
  // ==========================================
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (searchOverlay) searchOverlay.classList.remove('AohQG');
      if (cartDrawer) cartDrawer.classList.remove('EY1hL');
      document.querySelector('.m55gK')?.classList.remove('ilytd');
      document.querySelector('.Zh7LI')?.classList.remove('j407K');
      // Close any open desktop dropdowns
      if (activeDropdown) {
        activeDropdown.classList.remove('-xowF');
        if (phnke) phnke.classList.remove('zX-Fi');
        activeDropdown = null;
      }
    }
  });

  // ==========================================
  // BACKDROP CLICK - Close mobile drawer
  // ==========================================
  // The mobile drawer covers the full screen, so clicking outside should close it
  document.addEventListener('click', function(e) {
    var drawer = document.querySelector('.m55gK');
    if (!drawer || !drawer.classList.contains('ilytd')) return;
    // Don't close if clicking inside the drawer or the hamburger
    if (drawer.contains(e.target)) return;
    if (hamburger && hamburger.contains(e.target)) return;
    drawer.classList.remove('ilytd');
    document.querySelector('.Zh7LI')?.classList.remove('j407K');
  });

})();
