async function loadBrowserFrame(frame, action) {
  await new Promise((resolve, reject) => {
    const loaded = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(() => {
      frame.removeEventListener('load', loaded);
      reject(new Error('Timeout: frame load'));
    }, 10000);
    frame.addEventListener('load', loaded, { once: true });
    try { action(); } catch (error) {
      clearTimeout(timer);
      frame.removeEventListener('load', loaded);
      reject(error);
    }
  });
  await frame.contentDocument.fonts.ready;
}

async function captureVisualBaseline(frame) {
  const widths = [320,360,375,390,430,520,600,768,860,861,886,900,980,981,1000,1280,1440,1920,2560];
  const selectors = ['.site-header', '.header-inner', '.brand', '.site-nav', '.header-call', '.nav-toggle', '#o-nama', '.uvod-lead', '.uvod-actions', '.uvod-karta', '.hero-practical', '.hero-practical > div', '.hero-hours span', '#van-foce', '.regional h2', '.route', '.route li', '.dot', '.route-note', '#usluge', '.services', '.services li', '#arhiva', '.gallery', '.gal', '.gal img', '#kontakt', '.facts', '.contact-map', '.site-footer'];
  const properties = ['display', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'borderWidth', 'borderColor', 'borderRadius', 'padding', 'margin', 'gap', 'gridTemplateColumns', 'filter'];
  const states = [];
  const w = frame.contentWindow;
  const d = frame.contentDocument;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const snapshot = (width, height, mode) => {
    const elements = [];
    for (const selector of selectors) {
      [...d.querySelectorAll(selector)].forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const css = w.getComputedStyle(element);
        elements.push({ selector, index, rect: [rect.x, rect.y, rect.width, rect.height], styles: Object.fromEntries(properties.map(property => [property, css[property]])) });
      });
    }
    states.push({ width, height, mode, dpr: w.devicePixelRatio, bodyHeight: d.body.scrollHeight, elements });
  };
  await d.fonts.ready;
  try {
    for (const width of widths) {
      frame.style.width = width + 'px';
      frame.style.height = '812px';
      w.scrollTo({ top: 0, behavior: 'instant' });
      await sleep(100);
      snapshot(width, 812, 'closed');
    }
    for (const [width, height] of [[375, 812], [740, 320]]) {
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      await sleep(100);
      d.querySelector('.nav-toggle').click();
      await sleep(100);
      snapshot(width, height, 'menu');
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
    return states;
  } finally {
    frame.style.width = '375px';
    frame.style.height = '812px';
  }
}

function compareVisualBaselines(before, after) {
  const differences = [];
  if (before.length !== after.length) return [{ reason: 'different state count' }];
  before.forEach((state, stateIndex) => {
    const current = after[stateIndex];
    const context = { width: state.width, height: state.height, mode: state.mode };
    if (state.dpr !== current.dpr) {
      differences.push({ ...context, reason: 'device pixel ratio changed', before: state.dpr, after: current.dpr });
      return;
    }
    if (Math.abs(state.bodyHeight - current.bodyHeight) > 1 || state.elements.length !== current.elements.length) {
      differences.push({ ...context, reason: 'document geometry or element count changed' });
    }
    state.elements.forEach((element, index) => {
      const next = current.elements[index];
      if (!next || element.selector !== next.selector || element.index !== next.index) {
        differences.push({ ...context, selector: element.selector, reason: 'element order changed' });
      } else if (element.rect.some((value, part) => Math.abs(value - next.rect[part]) > 1) || JSON.stringify(element.styles) !== JSON.stringify(next.styles)) {
        differences.push({ ...context, selector: element.selector, index: element.index, before: element, after: next });
      }
    });
  });
  return differences;
}

async function runBrowserChecks(frame, visualBaseline, options = {}) {
  const results = [];
  window.browserCheckProgress = {};
  const check = (condition, name, details) => {
    results.push({ name, pass: Boolean(condition), ...(details ? { details } : {}) });
    window.browserCheckProgress = { last: name, checks: results.length };
    if (!condition) throw new Error(name + ': ' + JSON.stringify(details));
  };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitFor = async (predicate, label) => {
    const end = Date.now() + 15000;
    window.browserCheckProgress.waiting = label;
    try {
      while (!predicate()) {
        if (Date.now() > end) throw new Error('Timeout: ' + label);
        await sleep(25);
      }
    } finally {
      delete window.browserCheckProgress.waiting;
    }
  };
  const load = action => loadBrowserFrame(frame, action);
  let w = frame.contentWindow;
  let d = frame.contentDocument;
  let baseline;
  try {
    await d.fonts.ready;
    baseline = document.createElement('iframe');
    baseline.setAttribute('sandbox', 'allow-same-origin');
    baseline.style.cssText = 'position:absolute;left:-4000px;top:0;width:375px;height:812px;border:0';
    await loadBrowserFrame(baseline, () => {
      baseline.src = '/__baseline/';
      document.body.append(baseline);
    });
    const widths = [320,360,375,390,430,520,600,768,860,861,886,900,980,981,1000,1280,1440,1920,2560];
    const matrix = [];
    for (const width of widths) {
      frame.style.width = baseline.style.width = width + 'px';
      frame.style.height = '812px';
      await sleep(50);
      const viewport = d.documentElement.clientWidth;
      const menu = d.querySelector('.nav-toggle');
      const menuRect = menu.getBoundingClientRect();
      const nav = [...d.querySelectorAll('.site-nav ul a')].filter(a => a.getBoundingClientRect().width);
      const wrapped = nav.filter(a => {
        const range = d.createRange();
        range.selectNodeContents(a);
        return range.getClientRects().length > 1;
      });
      const thumb = d.querySelector('.gallery img').getBoundingClientRect().width;
      const oldThumb = baseline.contentDocument.querySelector('.gallery img').getBoundingClientRect().width;
      const navPhoneGap = width >= 981 ? d.querySelector('.header-call').getBoundingClientRect().left - d.querySelector('.site-nav').getBoundingClientRect().right : null;
      const leadWidth = d.querySelector('.uvod-lead').getBoundingClientRect().width;
      const oldLeadWidth = baseline.contentDocument.querySelector('.uvod-lead').getBoundingClientRect().width;
      const hourSpans = [...d.querySelectorAll('.hero-hours span')];
      const hoursInline = hourSpans.length === 4 && [0, 2].every(index => {
        const day = hourSpans[index].getBoundingClientRect();
        const time = hourSpans[index + 1].getBoundingClientRect();
        return Math.abs(day.top - time.top) <= 1 && time.left - day.right >= 15 && time.right <= viewport;
      });
      const row = { width, bodyWidth: d.body.scrollWidth, menuRight: menuRect.right, wrapped: wrapped.map(a => a.textContent), navPhoneGap, leadWidth: +leadWidth.toFixed(2), oldLeadWidth: +oldLeadWidth.toFixed(2), hoursInline, thumb: +thumb.toFixed(2), oldThumb: +oldThumb.toFixed(2) };
      matrix.push(row);
      check(d.body.scrollWidth <= viewport + 1 && (!menuRect.width || menuRect.right <= viewport + 1) && !wrapped.length && thumb <= oldThumb + 1 && (navPhoneGap === null || Math.abs(navPhoneGap - 20) <= 1) && leadWidth >= oldLeadWidth - 1 && hoursInline, 'responsive ' + width + 'px', row);
    }
    const style = element => w.getComputedStyle(element);
    const noOuterBorder = css => ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'].every(side => css[side] === '0px');
    const region = d.querySelector('.regional');
    const regionStyle = style(region);
    check(regionStyle.backgroundColor === 'rgb(240, 235, 226)' && style(d.querySelector('#arhiva')).backgroundColor === 'rgb(240, 235, 226)', 'warm beige regional and archival backgrounds');
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(value => {
        const channel = Number(value) / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const background = luminance(regionStyle.backgroundColor);
    const regionalContrast = [...region.querySelectorAll('h2, .lead, .route li, .route-note, a')].map(element => {
      const foreground = luminance(style(element).color);
      return (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
    });
    check(regionalContrast.every(ratio => ratio >= 4.5), 'regional text contrast at least 4.5:1', { minimum: Math.min(...regionalContrast) });
    const serviceItems = [...d.querySelectorAll('.services li')];
    const desktopEdges = serviceItems.map(element => [parseFloat(style(element).borderRightWidth) > 0, parseFloat(style(element).borderBottomWidth) > 0]);
    check(noOuterBorder(style(d.querySelector('.services'))) && JSON.stringify(desktopEdges) === JSON.stringify([[true, true], [false, true], [true, false], [false, false]]), 'desktop services retain only internal dividers', desktopEdges);
    check([...d.querySelectorAll('.band h2')].every(element => {
      const rule = w.getComputedStyle(element, '::after');
      return noOuterBorder(style(element)) && rule.content === '\"\"' && rule.display === 'block' && rule.width === '56px' && rule.height === '2px' && rule.backgroundColor === 'rgb(168, 123, 57)';
    }), 'section headings have short warm dividers');
    const headerRect = d.querySelector('.header-inner').getBoundingClientRect();
    const callRect = d.querySelector('.header-call').getBoundingClientRect();
    check(Math.abs(headerRect.right - parseFloat(style(d.querySelector('.header-inner')).paddingRight) - callRect.right) <= 1 && Math.abs(callRect.left - d.querySelector('.site-nav').getBoundingClientRect().right - 20) <= 1, 'desktop navigation grouped with right-aligned phone');
    check([...d.querySelectorAll('.gal')].every(element => style(element).backgroundColor === 'rgb(247, 244, 238)' && style(element).boxShadow === 'none'), 'warm archival frames without shadows');
    check(style(d.querySelector('.uvod-lead')).maxWidth === baseline.contentWindow.getComputedStyle(baseline.contentDocument.querySelector('.uvod-lead')).maxWidth, 'introduction restores original 58ch measure');
    const practical = [...d.querySelectorAll('.hero-practical > div')];
    check(practical[0].querySelector('dt').textContent === 'Radno vrijeme' && practical[1].querySelector('dt').textContent === 'Adresa' && practical[1].querySelector('dd').textContent === 'Petra Bojovića bb', 'opening hours precede user-specified address');
    const route = d.querySelector('.route');
    check([...route.querySelectorAll('.dot')].every(element => {
      const css = style(element);
      return css.width === '11px' && css.height === '11px' && css.borderRadius === '50%' && parseFloat(css.borderTopWidth) > 0 && css.borderTopColor === 'rgb(63, 195, 128)' && css.backgroundColor === 'rgba(0, 0, 0, 0)';
    }) && [...route.querySelectorAll('li:not(:last-child)')].every(element => {
      const connector = w.getComputedStyle(element, '::after');
      return connector.display !== 'none' && parseFloat(connector.width) >= 32 && connector.backgroundImage.includes('repeating-linear-gradient');
    }), 'original hollow circles and horizontal city connectors');
    baseline.remove();
    baseline = null;
    frame.style.width = '375px';
    await sleep(100);
    w.scrollTo({ top: 0, behavior: 'instant' });
    const towns = [...d.querySelectorAll('.route li')].map(e => ({ name: e.textContent.trim(), bottom: e.getBoundingClientRect().bottom }));
    check(towns.length === 3 && d.querySelector('#o-nama').nextElementSibling === region, 'regional visits immediately follow full introduction', towns);
    check(d.querySelector('.uvod-lead').textContent === 'Savremena i stručno osposobljena očna kuća u Foči, koja uz najviši stepen stručnosti, iskustva i pažnje prema pacijentu, profesionalno i povoljno pruža usluge po pitanju zdravstvene zaštite iz domena oftalmoloških potreba.', 'requested original introduction restored exactly');
    check(style(route).display === 'block' && style(route).backgroundImage.includes('repeating-linear-gradient') && [...route.querySelectorAll('li:not(:last-child)')].every(element => w.getComputedStyle(element, '::after').display === 'none'), 'original vertical city connectors on narrow phones');
    const mobileHours = [...d.querySelectorAll('.hero-hours span')].map(element => element.getBoundingClientRect());
    check([0, 2].every(index => Math.abs(mobileHours[index].top - mobileHours[index + 1].top) <= 1 && mobileHours[index + 1].left - mobileHours[index].right >= 15), 'mobile hours keep day and time on one line with spacing');
    check(!d.querySelector('#o-nama img'), 'no hero photo');
    check([...d.querySelectorAll('.gallery img')].every(image => image.loading === 'lazy' && image.sizes === 'auto, (max-width:520px) 40vw, (max-width:980px) 180px, 190px'), 'lazy thumbnails use auto sizes with legacy fallback');
    check(serviceItems.every((element, index) => style(element).borderRightWidth === '0px' && (parseFloat(style(element).borderBottomWidth) > 0) === (index !== serviceItems.length - 1)), 'mobile services retain only row dividers');

    const nav = d.querySelector('.site-nav');
    const toggle = d.querySelector('.nav-toggle');
    toggle.click();
    check(toggle.getAttribute('aria-expanded') === 'true' && w.getComputedStyle(nav).display !== 'none', 'menu opens');
    check([...nav.querySelectorAll('ul a')].every(element => {
      const css = style(element);
      return css.borderTopWidth === '0px' && css.borderRightWidth === '0px' && css.borderLeftWidth === '0px' && parseFloat(css.borderBottomWidth) > 0 && css.borderRadius === '0px' && element.getBoundingClientRect().height >= 50;
    }), 'mobile menu uses accessible unboxed rows');
    const phoneStyle = style(nav.querySelector('.nav-phone'));
    check(phoneStyle.backgroundColor === 'rgb(28, 63, 51)' && phoneStyle.color === 'rgb(247, 244, 238)' && phoneStyle.borderRadius === '3px' && nav.querySelector('.nav-phone').getBoundingClientRect().height >= 54, 'mobile call remains distinct solid button');
    d.querySelector('h1').click();
    check(toggle.getAttribute('aria-expanded') === 'false', 'outside click closes menu');
    toggle.click();
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check(toggle.getAttribute('aria-expanded') === 'false' && d.activeElement === toggle, 'menu Escape returns focus');
    toggle.click();
    nav.querySelector('a[href="#usluge"]').click();
    check(toggle.getAttribute('aria-expanded') === 'false', 'menu link closes menu');

    const boundaryFrame = document.createElement('iframe');
    boundaryFrame.style.cssText = 'position:absolute;left:-4000px;top:0;width:375px;height:812px;border:0';
    try {
      const boundarySource = await (await fetch('/')).text();
      const instrument = '<script>window.testMediaQueries=[];var nativeMatchMedia=window.matchMedia.bind(window);window.matchMedia=function(query){var media=nativeMatchMedia(query);window.testMediaQueries.push(media);return media;};</script>';
      await loadBrowserFrame(boundaryFrame, () => { boundaryFrame.srcdoc = boundarySource.replace('<head>', '<head>' + instrument); document.body.append(boundaryFrame); });
      const bw = boundaryFrame.contentWindow;
      const bd = boundaryFrame.contentDocument;
      const bt = bd.querySelector('.nav-toggle');
      const bn = bd.querySelector('.site-nav');
      const firstLink = bn.querySelector('ul a');
      // Explicit events keep this deterministic when the preview pauses native rendering.
      const emitMediaChange = () => bw.testMediaQueries.forEach(media => media.dispatchEvent(new bw.MediaQueryListEvent('change', { matches: media.matches, media: media.media })));
      for (const width of [979.75, 980, 980.25, 980.5, 980.75, 981]) {
        boundaryFrame.style.width = width + 'px';
        await sleep(50);
        emitMediaChange();
        const mobile = bw.testMediaQueries[0].matches;
        const cssMobile = bw.getComputedStyle(bt).display !== 'none';
        bw.focus();
        // Keep the link visible until the simulated handler closes the menu.
        // Otherwise a hidden iframe may blur it before delivering media events.
        bt.click();
        firstLink.focus({ preventScroll: true });
        boundaryFrame.style.width = cssMobile ? '981px' : '980px';
        await sleep(50);
        emitMediaChange();
        check(cssMobile === mobile && bt.getAttribute('aria-expanded') === 'false' && bd.activeElement === (cssMobile ? firstLink : bt), 'fractional breakpoint and focus with simulated media event ' + width + 'px', { mobile, cssMobile, events: 'simulated media change' });
      }
    } finally {
      boundaryFrame.remove();
    }
    // Focus assertions need an active document after testing a separate frame.
    w.focus();
    const declaration = w.CSSStyleDeclaration.prototype;
    const nativeSetProperty = declaration.setProperty;
    let heightWrites = 0;
    try {
      declaration.setProperty = function (name, value, priority) {
        if (name === '--header-height') heightWrites++;
        return nativeSetProperty.call(this, name, value, priority);
      };
      for (let i = 0; i < 4; i++) toggle.click();
      await sleep(50);
    } finally {
      declaration.setProperty = nativeSetProperty;
    }
    check(heightWrites === 0, 'unchanged header height is not rewritten', { heightWrites });

    frame.style.width = '740px';
    frame.style.height = '320px';
    await sleep(100);
    toggle.click();
    nav.scrollTop = nav.scrollHeight;
    const last = nav.querySelector('a[href="#kontakt"]').getBoundingClientRect();
    check(nav.getBoundingClientRect().bottom <= 321 && last.top >= 0 && last.bottom <= 321, 'last menu item accessible at 740x320', { top: last.top, bottom: last.bottom, scrollTop: nav.scrollTop });
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    frame.style.width = '375px';
    frame.style.height = '812px';
    await sleep(100);

    const scrollBehavior = d.documentElement.style.scrollBehavior;
    d.documentElement.style.scrollBehavior = 'auto';
    w.scrollTo({ top: 1200, behavior: 'instant' });
    d.querySelector('.brand').click();
    check(w.scrollY === 0, 'logo returns to top');
    d.documentElement.style.scrollBehavior = scrollBehavior;

    const links = [...d.querySelectorAll('a.gal')];
    const dlg = d.querySelector('dialog');
    const img = d.querySelector('#lightbox-img');
    const close = dlg.querySelector('.lightbox-close');
    const flushClose = () => {
      // Opt-in only: a hidden preview can pause the queued native close event.
      if (options.simulateCloseEvents && !dlg.open) dlg.dispatchEvent(new w.Event('close'));
    };
    const closePhoto = () => { close.click(); flushClose(); };
    const photos = [];
    for (let i = 0; i < links.length; i++) {
      links[i].click();
      await waitFor(() => dlg.dataset.state === 'ready', 'photo ' + i);
      await img.decode();
      photos.push({ count: dlg.querySelector('.lightbox-count').textContent, width: img.naturalWidth, height: img.naturalHeight });
      check(dlg.open && img.naturalWidth >= 640 && img.src === links[i].href, 'full photo ' + (i + 1));
      if (i === 0) {
        d.querySelector('.brand').focus();
        check(dlg.contains(d.activeElement), 'modal prevents outside focus');
        check(d.body.classList.contains('dialog-open') && w.getComputedStyle(d.body).overflowY === 'hidden', 'modal locks background scroll');
      }
      closePhoto();
      await waitFor(() => !dlg.open && d.activeElement === links[i] && !d.body.classList.contains('dialog-open'), 'close event ' + i);
      check(!dlg.open && d.activeElement === links[i] && !d.body.classList.contains('dialog-open'), 'close restores focus ' + (i + 1));
    }
    links[0].click();
    dlg.querySelector('.lightbox-prev').click();
    check(dlg.querySelector('.lightbox-count').textContent === '10 / 10', 'previous wraps from first to last');
    dlg.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    check(dlg.querySelector('.lightbox-count').textContent === '1 / 10', 'keyboard right wraps to first');
    const touch = (type, points) => {
      const event = new w.Event(type, { bubbles: true });
      Object.defineProperty(event, type === 'touchstart' ? 'touches' : 'changedTouches', { value: points });
      dlg.dispatchEvent(event);
    };
    touch('touchstart', [{ clientX: 200, clientY: 100 }]);
    touch('touchend', [{ clientX: 100, clientY: 105 }]);
    check(dlg.querySelector('.lightbox-count').textContent === '2 / 10', 'horizontal swipe advances photo');
    touch('touchstart', [{ clientX: 100, clientY: 100 }]);
    touch('touchend', [{ clientX: 200, clientY: 105 }]);
    check(dlg.querySelector('.lightbox-count').textContent === '1 / 10', 'reverse swipe returns photo');
    touch('touchstart', [{ clientX: 100, clientY: 100 }]);
    touch('touchend', [{ clientX: 105, clientY: 200 }]);
    check(dlg.querySelector('.lightbox-count').textContent === '1 / 10', 'vertical gesture does not navigate');
    touch('touchstart', [{ clientX: 100, clientY: 100 }]);
    dlg.dispatchEvent(new w.Event('touchcancel'));
    touch('touchend', [{ clientX: 200, clientY: 100 }]);
    check(dlg.querySelector('.lightbox-count').textContent === '1 / 10', 'cancelled gesture does not navigate');
    dlg.requestClose();
    flushClose();
    await waitFor(() => !dlg.open && d.activeElement === links[0] && !d.body.classList.contains('dialog-open'), 'native close event');
    check(!dlg.open && d.activeElement === links[0] && !d.body.classList.contains('dialog-open'), options.simulateCloseEvents ? 'close request restores focus with simulated close event' : 'native close request restores focus');

    const originalHref = links[0].getAttribute('href');
    links[0].setAttribute('href', '/img/galerija/__missing-photo.webp');
    try {
      links[0].click();
      await waitFor(() => dlg.dataset.state === 'error', 'real failed image');
      check(!dlg.querySelector('.lightbox-retry').hidden && dlg.querySelector('.lightbox-message').textContent.includes('Provjerite vezu'), 'network error provides retry');
      links[0].setAttribute('href', originalHref);
      dlg.querySelector('.lightbox-retry').click();
      await waitFor(() => dlg.dataset.state === 'ready', 'successful retry');
      check(img.src.includes('retry=') && d.activeElement === close, 'retry succeeds and retains visible focus');
    } finally {
      links[0].setAttribute('href', originalHref);
      closePhoto();
      await sleep(30);
    }

    const NativeImage = w.Image;
    const nativeTimeout = w.setTimeout;
    const requests = [];
    try {
      w.Image = class {
        set src(value) { this.url = value; requests.push(this); }
        get src() { return this.url; }
      };
      links[0].click();
      const first = requests.at(-1);
      check(dlg.dataset.state === 'loading' && !dlg.querySelector('.lightbox-state').hidden && dlg.querySelector('.lightbox-stage').getAttribute('aria-busy') === 'true', 'slow load has visible status');
      dlg.querySelector('.lightbox-next').click();
      const second = requests.at(-1);
      first.onerror();
      check(dlg.dataset.state === 'loading', 'stale failure ignored');
      second.onload();
      first.onload();
      check(dlg.dataset.state === 'ready' && img.src === links[1].href && dlg.querySelector('.lightbox-count').textContent === '2 / 10', 'stale success cannot replace current photo');
      w.setTimeout = (callback, delay, ...args) => nativeTimeout.call(w, callback, delay === 15000 ? 0 : delay, ...args);
      dlg.querySelector('.lightbox-next').click();
      await sleep(30);
      check(dlg.dataset.state === 'error', 'timeout provides recovery');
    } finally {
      w.Image = NativeImage;
      w.setTimeout = nativeTimeout;
      closePhoto();
      await sleep(30);
    }

    const source = await (await fetch('/')).text();
    await load(() => { frame.srcdoc = source.replace('<main id="main"', '<script>window.navigationBeforeMain = { ready:document.querySelector(".site-header").classList.contains("nav-ready"), hasMain:!!document.querySelector("main"), height:document.querySelector(".site-header").getBoundingClientRect().height };</script><main id="main"'); });
    d = frame.contentDocument;
    w = frame.contentWindow;
    check(w.navigationBeforeMain.ready && !w.navigationBeforeMain.hasMain && Math.abs(w.navigationBeforeMain.height - d.querySelector('.site-header').getBoundingClientRect().height) <= 1, 'navigation reaches stable height before main is parsed');
    await load(() => {
      frame.setAttribute('sandbox', 'allow-same-origin');
      frame.srcdoc = source;
    });
    d = frame.contentDocument;
    w = frame.contentWindow;
    check(!d.querySelector('.site-header').classList.contains('nav-ready') && d.querySelector('.nav-toggle').hidden && w.getComputedStyle(d.querySelector('.site-nav')).display !== 'none' && [...d.querySelectorAll('.site-nav ul a')].every(e => e.getBoundingClientRect().height >= 44), 'navigation works without JavaScript');
    await load(() => {
      frame.removeAttribute('sandbox');
      frame.srcdoc = source.replace(/src="\/js\/script\.js[^\"]*"/, 'src="/__missing-script.js"');
    });
    d = frame.contentDocument;
    w = frame.contentWindow;
    const failedToggle = d.querySelector('.nav-toggle');
    failedToggle.click();
    check(d.querySelector('.site-header').classList.contains('nav-ready') && failedToggle.getAttribute('aria-expanded') === 'true' && w.getComputedStyle(d.querySelector('.site-nav')).display !== 'none', 'failed deferred script keeps inline navigation functional');
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check(failedToggle.getAttribute('aria-expanded') === 'false' && d.activeElement === failedToggle && [...d.querySelectorAll('a.gal')].every(a => /-full\.webp$/.test(a.href)), 'failed deferred script retains menu focus and direct photo links');
    await load(() => { frame.srcdoc = source.replace(/<script id="navigation-init">[\s\S]*?<\/script>/, ''); });
    d = frame.contentDocument;
    w = frame.contentWindow;
    check(!d.querySelector('.site-header').classList.contains('nav-ready') && d.querySelector('.nav-toggle').hidden && w.getComputedStyle(d.querySelector('.site-nav')).display !== 'none', 'missing inline initializer keeps basic navigation visible');
    await load(() => { frame.srcdoc = source.replace('<head>', '<head><script>window.ResizeObserver = undefined;</script>'); });
    d = frame.contentDocument;
    w = frame.contentWindow;
    frame.style.width = '740px';
    frame.style.height = '320px';
    await sleep(100);
    w.dispatchEvent(new w.Event('resize'));
    d.querySelector('.nav-toggle').click();
    const fallbackHeight = d.querySelector('.site-header').getBoundingClientRect().height;
    check(!w.ResizeObserver && Math.abs(parseFloat(d.documentElement.style.getPropertyValue('--header-height')) - fallbackHeight) < .1 && d.querySelector('.site-nav').getBoundingClientRect().bottom <= 321, 'header resize fallback works without ResizeObserver');
    await load(() => { frame.removeAttribute('srcdoc'); frame.src = '/'; });
    check(frame.contentDocument.querySelector('.site-header.nav-ready'), 'normal initialization restored');

    const errorFrame = document.createElement('iframe');
    errorFrame.style.cssText = 'position:absolute;left:-4000px;top:0;width:1440px;height:1000px;border:0';
    try {
      await loadBrowserFrame(errorFrame, () => { errorFrame.src = '/404.html'; document.body.append(errorFrame); });
      const errorDoc = errorFrame.contentDocument;
      const errorHeader = errorDoc.querySelector('.header-inner');
      const errorCall = errorDoc.querySelector('.header-call');
      check(!errorDoc.querySelector('.site-nav') && Math.abs(errorHeader.getBoundingClientRect().right - parseFloat(errorFrame.contentWindow.getComputedStyle(errorHeader).paddingRight) - errorCall.getBoundingClientRect().right) <= 1, '404 phone remains aligned to the right');
    } finally {
      errorFrame.remove();
    }
    let comparedStates = 0;
    if (visualBaseline || options.referenceUrl) {
      const currentGeometry = await captureVisualBaseline(frame);
      if (options.referenceUrl) {
        await load(() => { frame.src = options.referenceUrl; });
        visualBaseline = await captureVisualBaseline(frame);
        await load(() => { frame.src = '/'; });
      }
      const differences = compareVisualBaselines(visualBaseline, currentGeometry);
      check(differences.length === 0, 'home geometry and styles preserved across 21 reference states', differences.slice(0, 3));
      comparedStates = visualBaseline.length;
    }
    return { result: 'PASS', checks: results.length, closeEvents: options.simulateCloseEvents ? 'simulated' : 'native', visualStatesCompared: comparedStates, matrix, photos, tests: results };
  } finally {
    if (baseline) baseline.remove();
    frame.removeAttribute('sandbox');
    frame.style.width = '375px';
    frame.style.height = '812px';
  }
}
