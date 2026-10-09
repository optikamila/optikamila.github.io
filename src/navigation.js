(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('glavna-navigacija');

  if (header && toggle && nav) {
    var mq = window.matchMedia('(max-width: 980px)');
    var headerHeight = null;
    var setOpen = function (open) {
      if (open) measureHeader();
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open && mq.matches && nav.contains(document.activeElement)) {
        toggle.focus({ preventScroll: true });
      }
    };
    var isOpen = function () { return nav.classList.contains('is-open'); };
    var measureHeader = function () {
      var height = header.getBoundingClientRect().height;
      if (height === headerHeight) return;
      headerHeight = height;
      document.documentElement.style.setProperty('--header-height', height + 'px');
    };

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!isOpen() || e.target.closest('#glavna-navigacija') || e.target.closest('.nav-toggle')) return;
      setOpen(false);
    });
    var onBreakpointChange = function () {
      setOpen(false);
      measureHeader();
    };
    if (mq.addEventListener) mq.addEventListener('change', onBreakpointChange);
    else if (mq.addListener) mq.addListener(onBreakpointChange);

    toggle.hidden = false;
    header.classList.add('nav-ready');
    measureHeader();
    if ('ResizeObserver' in window) {
      new ResizeObserver(measureHeader).observe(header);
    } else {
      window.addEventListener('resize', measureHeader, { passive: true });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHeader);
  }
})();
