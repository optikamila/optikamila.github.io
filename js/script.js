/* =========================================================
   Optika Mila Foča — v17
   Bez jQuery-ja i bez lightbox biblioteka.
   v13: zaglavlje dobija sjenu pri skrolu (V7)
   v15: bez izmjena u skripti — sve P30–P34 je CSS
   v16: sekcija 3 — scroll reveal (P37). Skripta samo dodaje `.is-visible`;
        sav izgled je u CSS-u. Skrivanje važi samo uz klasu `js`, koju stavlja
        inline skripta u <head> — bez nje je sav sadrzaj vidljiv.
   v17: sekcija 2 — `show()` postavlja odnos stranica na osnovu ucitane
        slicice, jer je okvir pregleda sada fiksna pozornica (P44).
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. Mobilna navigacija ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav    = document.getElementById('glavna-navigacija');

  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    var isOpen = function () { return nav.classList.contains('is-open'); };

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

    /* P18 — klik van menija ga zatvara. Prije je ostajao otvoren preko sadržaja. */
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (e.target.closest('#glavna-navigacija') || e.target.closest('.nav-toggle')) return;
      setOpen(false);
    });

    var mq = window.matchMedia('(min-width: 861px)');
    var onWide = function (e) { if (e.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onWide);
    else if (mq.addListener) mq.addListener(onWide);
  }

  /* ---------- 2. Arhiva (pregled fotografija) ---------- */
  var dlg      = document.getElementById('lightbox');
  var dlgImg   = document.getElementById('lightbox-img');
  var dlgCount = dlg ? dlg.querySelector('.lightbox-count') : null;
  var links    = document.querySelectorAll('a.gal');
  var current  = 0;

  /* P51 — detekcija WebP-a je bila potrebna dok su postojale i JPEG
     varijante (`data-webp` na <a>). Sada su sve slike WebP, pa se bira
     `a.href` direktno. */

  if (dlg && dlgImg && links.length && typeof dlg.showModal === 'function') {
    var total = links.length;

    /* P17 — prikazuje fotografiju pod rednim brojem `i`, kružno */
    var show = function (i) {
      current = ((i % total) + total) % total;
      var a     = links[current];
      var thumb = a.querySelector('img');

      /* P44 (v17) — okvir je fiksna pozornica, a odnos stranica se cita sa
         SLICICE koja je vec ucitana. Tako se nigdje ne prepisuje rucno i ne
         moze da zastari ako se fotografija zamijeni. Ako slicica jos nije
         ucitana (`loading="lazy"`), ostaje odnos 4:3 iz CSS-a. */
      if (thumb && thumb.naturalWidth) {
        dlgImg.style.aspectRatio = thumb.naturalWidth + ' / ' + thumb.naturalHeight;
      }

      dlgImg.src = a.href;
      dlgImg.alt = thumb ? thumb.alt : '';
      if (dlgCount) dlgCount.textContent = (current + 1) + ' / ' + total;
    };

    Array.prototype.forEach.call(links, function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        show(i);
        dlg.showModal();
      });
    });

    var closeBtn = dlg.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });

    var prevBtn = dlg.querySelector('.lightbox-prev');
    var nextBtn = dlg.querySelector('.lightbox-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { show(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(current + 1); });

    /* klik na tamnu podlogu zatvara */
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });

    dlg.addEventListener('close', function () {
      dlgImg.removeAttribute('src');
    });

    /* P17 — lista strelicama na tastaturi */
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')       { e.preventDefault(); show(current - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    });

    /* P17 — prevlačenje prstom; samo izrazito horizontalan pokret, da ne smeta skrolu */
    var x0 = null, y0 = null;
    dlg.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }, { passive: true });

    dlg.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var t  = e.changedTouches[0];
      var dx = t.clientX - x0;
      var dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        show(dx < 0 ? current + 1 : current - 1);
      }
    }, { passive: true });
  }

  /* ---------- 3. Scroll reveal — elementi se pojavljuju pri skrolovanju ---------- */
  /* Zastavica za mrezu u <head>: cim se ova skripta izvrsi, iskljucuje se
     vremenski fallback koji inace otkriva sve posle 3 s. */
  window.__omReveal = true;
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    Array.prototype.forEach.call(reveals, function (el) {
      revealObserver.observe(el);
    });
  } else {
    /* Fallback: ako IntersectionObserver nije podržan, pokaži sve odmah */
    Array.prototype.forEach.call(reveals, function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------- 4. Zaglavlje dobija sjenu kad strana krene nadole (V7) ---------- */
  /* Na samom vrhu nema šta da se zamuti, pa je zaglavlje izgledalo kao obična
     traka. Skripta samo piše data-scrolled; sav izgled je u CSS-u.
     Svjesno bez requestAnimationFrame: window.pageYOffset je keširana vrednost,
     a hasAttribute ne pokreće raspored — dva jeftina čitanja po događaju, a
     upis u DOM samo kad se stanje promijeni (dakle najviše dvaput po strani).
     Tako nema raspoređivanja po frejmu, a radi i tamo gdje rAF ne ide. */
  var header = document.querySelector('.site-header');

  if (header) {
    var update = function () {
      var scrolled = window.pageYOffset > 8;
      if (scrolled === header.hasAttribute('data-scrolled')) return;
      if (scrolled) header.setAttribute('data-scrolled', 'true');
      else          header.removeAttribute('data-scrolled');
    };

    window.addEventListener('scroll', update, { passive: true });
    update();   /* ako se strana otvori već skrolovana (osvježavanje, #kontakt) */
  }
})();
