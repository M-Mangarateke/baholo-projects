(() => {
  document.documentElement.classList.add('js');
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const menu = document.querySelector('#mobile-menu');
  const menuOpen = document.querySelector('.menu-toggle');
  const menuClose = document.querySelector('.menu-close');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroVideo = document.querySelector('.hero-stage video');

  if (heroVideo) {
    heroVideo.defaultMuted = true;
    heroVideo.muted = true;

    if (prefersReducedMotion) {
      heroVideo.pause();
      heroVideo.removeAttribute('autoplay');
    } else {
      let heroIsVisible = true;

      const ensureHeroPlayback = () => {
        if (heroIsVisible && document.visibilityState === 'visible' && heroVideo.paused) {
          heroVideo.play().catch(() => {});
        }
      };

      heroVideo.addEventListener('canplay', ensureHeroPlayback);
      heroVideo.addEventListener('loadeddata', ensureHeroPlayback, { once: true });
      heroVideo.addEventListener('pause', () => {
        if (heroIsVisible && document.visibilityState === 'visible') {
          window.setTimeout(ensureHeroPlayback, 350);
        }
      });

      window.addEventListener('pageshow', ensureHeroPlayback);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') ensureHeroPlayback();
      });
      document.addEventListener('pointerdown', ensureHeroPlayback, { once: true, passive: true });
      document.addEventListener('touchstart', ensureHeroPlayback, { once: true, passive: true });

      if ('IntersectionObserver' in window) {
        const heroVideoObserver = new IntersectionObserver(([entry]) => {
          heroIsVisible = entry.isIntersecting;
          if (heroIsVisible) ensureHeroPlayback();
          else heroVideo.pause();
        }, { threshold: .08 });
        heroVideoObserver.observe(heroVideo);
      }
    }
  }

  window.dataLayer = window.dataLayer || [];
  const GA_MEASUREMENT_ID = '';

  function trackEvent(name, parameters = {}) {
    window.dataLayer.push({ event: name, ...parameters });
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, parameters);
    }
  }

  if (GA_MEASUREMENT_ID) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  document.querySelectorAll('[data-track]').forEach((element) => {
    element.addEventListener('click', () => {
      trackEvent(element.dataset.track, {
        link_text: element.textContent.trim(),
        link_url: element.href || ''
      });
    });
  });

  function updateHeader() {
    header?.classList.toggle('is-scrolled', window.scrollY > 48);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  function setMenu(open) {
    menu?.classList.toggle('is-open', open);
    menu?.setAttribute('aria-hidden', String(!open));
    menuOpen?.setAttribute('aria-expanded', String(open));
    menuOpen?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    body.classList.toggle('menu-open', open);
    if (open) {
      menu?.querySelector('a')?.focus();
    } else {
      menuOpen?.focus();
    }
  }

  menuOpen?.addEventListener('click', () => setMenu(true));
  menuClose?.addEventListener('click', () => setMenu(false));
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.classList.contains('is-open')) setMenu(false);
  });

  const heroStage = document.querySelector('.hero-stage');
  if (!prefersReducedMotion && heroStage) {
    window.addEventListener('scroll', () => {
      const offset = Math.min(window.scrollY * .08, 65);
      heroStage.style.transform = `translate3d(0, ${offset}px, 0) scale(1.03)`;
    }, { passive: true });
  }

  const world = document.querySelector('.world');
  const worldTrack = document.querySelector('.world-track');
  const worldSequence = document.querySelector('.world-sequence');

  if (world && worldTrack && worldSequence) {
    let worldLoadPromise;
    let worldInRange = false;

    const loadWorld = (duplicate) => {
      if (worldLoadPromise) return worldLoadPromise;

      worldLoadPromise = (async () => {
        const images = [...worldSequence.querySelectorAll('img')];
        images.forEach((image) => {
          if (image.dataset.src) {
            image.src = image.dataset.src;
            image.removeAttribute('data-src');
          }
        });

        await Promise.allSettled(images.map((image) => {
          if (typeof image.decode === 'function') return image.decode();
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          });
        }));

        if (duplicate && worldTrack.querySelectorAll('.world-sequence').length === 1) {
          const clone = worldSequence.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.querySelectorAll('img').forEach((image) => { image.alt = ''; });
          worldTrack.appendChild(clone);
        }
        world.classList.add('is-ready');
      })();

      return worldLoadPromise;
    };

    if (prefersReducedMotion) {
      loadWorld(false);
    } else if ('IntersectionObserver' in window) {
      const worldObserver = new IntersectionObserver(([entry]) => {
        worldInRange = entry.isIntersecting;
        if (worldInRange) {
          loadWorld(true).then(() => world.classList.toggle('is-moving', worldInRange));
        } else {
          world.classList.remove('is-moving');
        }
      }, { threshold: 0, rootMargin: '700px 0px' });
      worldObserver.observe(world);
    } else {
      worldInRange = true;
      loadWorld(true).then(() => world.classList.add('is-moving'));
    }
  }

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const serviceButtons = [...document.querySelectorAll('.service-item')];
  const serviceSummary = document.querySelector('[data-service-summary]');
  const serviceNumber = document.querySelector('[data-service-number]');
  const serviceMark = document.querySelector('[data-service-mark]');

  serviceButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      serviceButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
        item.setAttribute('aria-expanded', String(isActive));
      });
      if (serviceSummary) serviceSummary.textContent = button.dataset.summary;
      if (serviceNumber) serviceNumber.textContent = String(index + 1).padStart(2, '0');
      if (serviceMark) serviceMark.style.transform = `rotate(${index * 45}deg) scale(${1 + index * .04})`;
      trackEvent('service_select', { service_name: button.dataset.service });
    });
  });

  const form = document.querySelector('[data-demo-form]');
  let formStarted = false;

  form?.addEventListener('input', () => {
    if (!formStarted) {
      formStarted = true;
      trackEvent('lead_form_start', { form_name: 'quote_enquiry_demo' });
    }
  }, { once: true });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const invalidFields = [...form.querySelectorAll(':invalid')];

    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));

    if (invalidFields.length) {
      invalidFields.forEach((field) => field.setAttribute('aria-invalid', 'true'));
      status.textContent = 'Please complete the required fields before validating the enquiry.';
      status.className = 'form-status is-error';
      invalidFields[0].focus();
      trackEvent('lead_form_error', {
        form_name: 'quote_enquiry_demo',
        error_count: invalidFields.length
      });
      return;
    }

    status.textContent = 'Demo validation complete. No personal information was sent or stored.';
    status.className = 'form-status is-success';
    trackEvent('lead_form_submit', { form_name: 'quote_enquiry_demo', mode: 'presentation' });
    trackEvent('thank_you_view', { form_name: 'quote_enquiry_demo', mode: 'inline_confirmation' });
  });

  document.querySelector('[data-year]').textContent = new Date().getFullYear();
})();
