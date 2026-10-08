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

  var dlg = document.getElementById('lightbox');
  var dlgImg = document.getElementById('lightbox-img');
  var links = document.querySelectorAll('a.gal');

  if (dlg && dlgImg && links.length && typeof dlg.showModal === 'function') {
    var count = dlg.querySelector('.lightbox-count');
    var stage = dlg.querySelector('.lightbox-stage');
    var state = dlg.querySelector('.lightbox-state');
    var message = dlg.querySelector('.lightbox-message');
    var retryBtn = dlg.querySelector('.lightbox-retry');
    var closeBtn = dlg.querySelector('.lightbox-close');
    var current = 0;
    var total = links.length;
    var requestId = 0;
    var loadTimer = null;
    var opener = null;

    var cancelLoad = function () {
      requestId++;
      clearTimeout(loadTimer);
      loadTimer = null;
    };
    var setState = function (value) {
      dlg.dataset.state = value;
      stage.setAttribute('aria-busy', value === 'loading' ? 'true' : 'false');
      state.hidden = value === 'ready';
      retryBtn.hidden = value !== 'error';
      message.textContent = value === 'loading' ? 'Učitavanje fotografije…' :
        value === 'error' ? 'Fotografija nije učitana. Provjerite vezu i pokušajte ponovo.' : '';
    };
    var show = function (i, retry) {
      cancelLoad();
      var id = requestId;
      current = ((i % total) + total) % total;
      var a = links[current];
      var thumb = a.querySelector('img');
      var image = new Image();
      var url = a.href;
      if (retry) url += (url.indexOf('?') === -1 ? '?' : '&') + 'retry=' + Date.now();

      dlgImg.alt = thumb ? thumb.alt : '';
      if (thumb) dlgImg.src = thumb.currentSrc || thumb.src;
      else dlgImg.removeAttribute('src');
      count.textContent = (current + 1) + ' / ' + total;
      setState('loading');

      /* A previous request must not replace the photo after fast navigation. */
      image.onload = function () {
        if (id !== requestId || !dlg.open) return;
        clearTimeout(loadTimer);
        dlgImg.src = image.src;
        setState('ready');
      };
      image.onerror = function () {
        if (id !== requestId || !dlg.open) return;
        clearTimeout(loadTimer);
        setState('error');
      };
      loadTimer = setTimeout(function () {
        if (id === requestId && dlg.open) setState('error');
      }, 15000);
      image.src = url;
    };

    Array.prototype.forEach.call(links, function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        opener = a;
        show(i);
        if (!dlg.open) dlg.showModal();
        document.body.classList.add('dialog-open');
      });
    });
    closeBtn.addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.lightbox-prev').addEventListener('click', function () { show(current - 1); });
    dlg.querySelector('.lightbox-next').addEventListener('click', function () { show(current + 1); });
    retryBtn.addEventListener('click', function () {
      show(current, true);
      closeBtn.focus();
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener('close', function () {
      // A queued close event can arrive after the dialog has already reopened.
      if (dlg.open) return;
      cancelLoad();
      dlgImg.removeAttribute('src');
      document.body.classList.remove('dialog-open');
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    });

    var x0 = null, y0 = null;
    dlg.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (x0 === null || !e.changedTouches.length) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0;
      var dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        show(dx < 0 ? current + 1 : current - 1);
      }
    }, { passive: true });
    dlg.addEventListener('touchcancel', function () { x0 = null; }, { passive: true });
  }

  if (header) {
    var update = function () {
      var scrolled = window.pageYOffset > 8;
      if (scrolled === header.hasAttribute('data-scrolled')) return;
      if (scrolled) header.setAttribute('data-scrolled', 'true');
      else header.removeAttribute('data-scrolled');
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
