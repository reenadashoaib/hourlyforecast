// Ad slot rendering: AdSense units, placeholders, the floating video and the popup.
(function () {
  const cfg = window.SITE_CONFIG || {};
  const adsense = cfg.adsense || {};
  const direct = cfg.directAds || {};
  let adsenseRequested = false;

  const session = {
    get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* storage blocked */ } }
  };

  // Empty slots show striped placeholders only while setting up: before a
  // publisher ID is set, on a local copy, or with ?adpreview in the URL.
  // On the live site an empty slot is hidden so the page never looks unfinished.
  const preview = !adsense.client ||
    /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ||
    new URLSearchParams(location.search).has('adpreview');

  function hideEmpty(slot) {
    // Hide the outermost wrapper so no empty column or table row is left behind.
    (slot.closest('.rail') || slot.closest('.ad-row') || slot.closest('.ad')).hidden = true;
    const group = slot.closest('.ad-tiles');
    if (group && !group.querySelector('.ad:not([hidden])')) group.hidden = true;
  }

  function loadAdsense() {
    if (adsenseRequested) return;
    adsenseRequested = true;
    // The pages already include the AdSense script in <head>; don't load it twice.
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
      encodeURIComponent(adsense.client);
    document.head.appendChild(s);
  }

  function sizeOf(slot) {
    const [w, h] = (slot.dataset.size || '300x250').split('x').map(Number);
    return { w, h };
  }

  function placeholderHtml(title, detail) {
    return '<span class="ad-ph"><strong>' + title + '</strong><span>' + detail + '</span></span>';
  }

  function render(slot) {
    if (slot.dataset.rendered) return;
    // Skip slots hidden by the layout (e.g. the rail on narrow screens);
    // AdSense cannot size a unit inside a hidden container.
    if (slot.offsetParent === null) return;
    slot.dataset.rendered = 'true';

    const unitId = (adsense.slots || {})[slot.dataset.ad];
    if (!(adsense.client && unitId) && !preview) {
      hideEmpty(slot);
      return;
    }

    const { w, h } = sizeOf(slot);
    const responsive = Boolean(slot.dataset.format);
    slot.style.maxWidth = w + 'px';
    slot.style.minHeight = h + 'px';
    slot.style.width = responsive ? '100%' : w + 'px';
    if (!responsive) slot.style.height = h + 'px';

    if (adsense.client && unitId) {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      if (!responsive) { ins.style.width = w + 'px'; ins.style.height = h + 'px'; }
      ins.dataset.adClient = adsense.client;
      ins.dataset.adSlot = unitId;
      if (responsive) {
        ins.dataset.adFormat = slot.dataset.format;
        ins.dataset.fullWidthResponsive = 'true';
      }
      slot.appendChild(ins);
      loadAdsense();
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } else {
      slot.classList.add('is-placeholder');
      slot.innerHTML = placeholderHtml('Ad space', w + ' × ' + h);
    }
  }

  function renderAll(root) {
    (root || document).querySelectorAll('.ad-slot[data-ad]').forEach(render);
  }

  // Floating video, bottom right.
  function setupVideo() {
    const box = document.getElementById('video-ad');
    const opts = cfg.video || {};
    if (!box || opts.enabled === false || session.get('videoAdClosed')) return;
    const frame = box.querySelector('.video-ad__frame');
    const v = direct.video || {};
    if (!v.src && !preview) return;

    if (v.src) {
      const video = document.createElement('video');
      Object.assign(video, { src: v.src, muted: true, autoplay: true, loop: true, playsInline: true });
      if (v.poster) video.poster = v.poster;
      if (v.clickUrl) {
        const link = document.createElement('a');
        link.href = v.clickUrl;
        link.target = '_blank';
        link.rel = 'sponsored noopener';
        link.appendChild(video);
        frame.appendChild(link);
      } else {
        frame.appendChild(video);
      }
    } else {
      frame.classList.add('is-placeholder');
      frame.innerHTML = placeholderHtml('Video ad space', '16:9, muted autoplay');
    }

    box.querySelector('[data-video-close]').addEventListener('click', () => {
      box.hidden = true;
      const video = frame.querySelector('video');
      if (video) video.pause();
      session.set('videoAdClosed', '1');
    });
    setTimeout(() => { box.hidden = false; }, (opts.delaySeconds || 0) * 1000);
  }

  // Full-screen popup, once per session.
  function setupPopup() {
    const dialog = document.getElementById('popup-ad');
    const opts = cfg.popup || {};
    if (!dialog || opts.enabled === false) return;
    if (opts.oncePerSession !== false && session.get('popupAdShown')) return;

    const body = dialog.querySelector('.popup__creative');
    const p = direct.popup || {};
    if (!p.image && !preview) return;
    if (p.image) {
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = p.alt || 'Advertisement';
      if (p.clickUrl) {
        const link = document.createElement('a');
        link.href = p.clickUrl;
        link.target = '_blank';
        link.rel = 'sponsored noopener';
        link.appendChild(img);
        body.appendChild(link);
      } else {
        body.appendChild(img);
      }
    } else {
      body.classList.add('is-placeholder');
      body.innerHTML = placeholderHtml('Full-screen ad space', 'Up to 800 × 600');
    }

    let lastFocus = null;
    function close() {
      dialog.hidden = true;
      document.documentElement.classList.remove('has-popup');
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        // Keep focus inside the dialog while it is open.
        const items = dialog.querySelectorAll('button, a[href]');
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    dialog.querySelectorAll('[data-popup-close]').forEach(b => b.addEventListener('click', close));
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });

    setTimeout(() => {
      lastFocus = document.activeElement;
      dialog.hidden = false;
      document.documentElement.classList.add('has-popup');
      document.addEventListener('keydown', onKey);
      dialog.querySelector('.popup__close').focus();
      session.set('popupAdShown', '1');
    }, (opts.delaySeconds || 0) * 1000);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderAll(document), 300);
  });

  document.addEventListener('DOMContentLoaded', () => {
    renderAll(document);
    setupVideo();
    setupPopup();
  });

  window.Ads = { render, renderAll };
})();
