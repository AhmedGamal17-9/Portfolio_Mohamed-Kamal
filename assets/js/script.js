// ===== Menu Toggle =====
const menuIcon = document.querySelector(".menu-icon");
const navLinks = document.querySelector(".nav-links");

menuIcon.addEventListener("click", () => {
  navLinks.classList.toggle("active");
  menuIcon.classList.toggle("fa-xmark");
});

// ===== Smooth Scroll =====
document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    target.scrollIntoView({ behavior: "smooth" });
    navLinks.classList.remove("active");
    menuIcon.classList.remove("fa-xmark");
  });
});

// ===== Section Fade-In Animation =====
const sections = document.querySelectorAll(".section, .hero");

const fadeInOnScroll = () => {
  const triggerBottom = window.innerHeight * 0.85;
  sections.forEach(section => {
    const sectionTop = section.getBoundingClientRect().top;
    if(sectionTop < triggerBottom) {
      section.classList.add("show");
    }
  });
};

window.addEventListener("scroll", fadeInOnScroll);
fadeInOnScroll();

// ===== Inject Animation CSS =====
const fadeStyle = document.createElement("style");
fadeStyle.innerHTML = `
  .section, .hero {
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s ease-out;
  }
  .section.show, .hero.show {
    opacity: 1;
    transform: translateY(0);
  }
`;
document.head.appendChild(fadeStyle);

// ===== Gallery JS (Desktop-only click/open) =====
document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('.gallery-grid');
  if (!gallery) return;

  const items = Array.from(document.querySelectorAll('.gallery-item'));
  const lightbox = document.querySelector('.gallery-lightbox');
  const lbImage = document.querySelector('.lb-image');
  const lbTitle = document.querySelector('.lb-title');
  const lbSub = document.querySelector('.lb-sub');
  const lbPrev = document.querySelector('.lb-prev');
  const lbNext = document.querySelector('.lb-next');
  const lbClose = document.querySelector('.lb-close');
  const lbPlay = document.querySelector('.lb-play');
  const lbCounter = document.querySelector('.lb-counter');

  let current = 0;
  let autoplay = false;
  let autoplayInterval = null;
  const AUTOPLAY_DELAY = 1500;

  let lastFocused = null;

  // Helper to check desktop (matches site CSS breakpoint)
  const desktopQuery = window.matchMedia('(min-width: 993px)');

  // Handlers references so we can add/remove them
  const handlers = [];

  function onItemClickFactory(idx) {
    return function (e) {
      openLightbox(idx);
    };
  }
  function onItemKeyFactory(idx) {
    return function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(idx);
      }
    };
  }

  // Attach click/keyboard handlers (for desktop)
  function enableItemInteractions() {
    items.forEach((it, idx) => {
      // avoid double-adding
      if (it._galleryEnabled) return;
      const cHandler = onItemClickFactory(idx);
      const kHandler = onItemKeyFactory(idx);
      it.addEventListener('click', cHandler);
      it.addEventListener('keydown', kHandler);
      it._galleryHandlers = { cHandler, kHandler };
      it._galleryEnabled = true;
      // Mark accessible
      it.setAttribute('role', 'button');
      it.setAttribute('aria-disabled', 'false');
    });
  }

  // Remove click/keyboard handlers (for mobile/tablet)
  function disableItemInteractions() {
    items.forEach((it) => {
      if (!it._galleryEnabled) return;
      const { cHandler, kHandler } = it._galleryHandlers || {};
      if (cHandler) it.removeEventListener('click', cHandler);
      if (kHandler) it.removeEventListener('keydown', kHandler);
      it._galleryEnabled = false;
      it._galleryHandlers = null;
      // indicate disabled for assistive tech
      it.setAttribute('aria-disabled', 'true');
    });
  }

  // Observe media query changes to enable/disable interactions
  function handleDesktopChange(e) {
    if (e.matches) {
      enableItemInteractions();
    } else {
      // if lightbox open, close it when switching to mobile to avoid stuck state
      if (lightbox && lightbox.getAttribute('aria-hidden') === 'false') closeLightbox();
      disableItemInteractions();
    }
  }
  // initial setup based on current viewport
  if (desktopQuery.matches) enableItemInteractions();
  else disableItemInteractions();
  desktopQuery.addEventListener('change', handleDesktopChange);

  // Lightbox functions (same behavior, but only activated on desktop because we only attach handlers on desktop)
// ===== replace openLightbox & closeLightbox with this (prevents page jump) =====
let _savedScrollY = 0;

function openLightbox(index) {
  const item = items[index];
  if (!item) return;
  lastFocused = document.activeElement;

  const src = item.dataset.src;
  const title = item.dataset.title || '';
  const sub = item.dataset.sub || '';

  // حفظ موضع التمرير الحالي
  _savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

  // قفل الصفحة بصيغة تمنع الـ jump: position fixed مع top negative
  document.body.style.position = 'fixed';
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.top = `-${_savedScrollY}px`;
  document.body.style.width = '100%';

  // إظهار اللايتبوكس
  lightbox.setAttribute('aria-hidden', 'false');

  setImage(src, title, sub);
  current = index;
  updateCounter();

  // فوكس على زر الإغلاق بدون scroll إن أمكن
  try {
    lbClose.focus({ preventScroll: true });
  } catch (err) {
    // fallback لو المتصفح مش بيدعم preventScroll
    lbClose.focus();
  }

  // start autoplay if needed
  if (autoplay) startAutoplay();

}

function closeLightbox() {
  // إخفاء اللايتبوكس
  lightbox.setAttribute('aria-hidden', 'true');

  // إيقاف الآوتوبلاي
  stopAutoplay();

  // إلغاء تثبيت body وإعادة الموضع للصفحة
  document.body.style.position = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.top = '';
  document.body.style.width = '';

  // إعادة التمرير لنفس المكان اللي كنا فيه
  window.scrollTo(0, _savedScrollY || 0);

  // استعادة الفوكس لآخر عنصر كان مركّز
  if (lastFocused && typeof lastFocused.focus === 'function') {
    try {
      lastFocused.focus({ preventScroll: true });
    } catch (err) {
      lastFocused.focus();
    }
  }
}


  function setImage(src, title, sub) {
    if (!src) return;
    lbImage.src = src;
    lbImage.alt = title + (sub ? ' - ' + sub : '');
    lbTitle.textContent = title;
    lbSub.textContent = sub;
    updateCounter();
  }

  function updateCounter() {
    lbCounter.textContent = `${current + 1} / ${items.length}`;
  }

  function showNext() {
    current = (current + 1) % items.length;
    const it = items[current];
    setImage(it.dataset.src, it.dataset.title, it.dataset.sub);
  }
  function showPrev() {
    current = (current - 1 + items.length) % items.length;
    const it = items[current];
    setImage(it.dataset.src, it.dataset.title, it.dataset.sub);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplay = true;
    lbPlay.setAttribute('aria-pressed', 'true');
    lbPlay.textContent = 'Pause';
    autoplayInterval = setInterval(showNext, AUTOPLAY_DELAY);
  }
  function stopAutoplay() {
    autoplay = false;
    lbPlay.setAttribute('aria-pressed', 'false');
    lbPlay.textContent = 'Play';
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  }
  function toggleAutoplay() {
    if (autoplay) stopAutoplay(); else startAutoplay();
  }

  // Lightbox control listeners (these exist regardless of screen size)
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbNext) lbNext.addEventListener('click', showNext);
  if (lbPrev) lbPrev.addEventListener('click', showPrev);
  if (lbPlay) lbPlay.addEventListener('click', toggleAutoplay);

  // Keyboard navigation while lightbox open
  document.addEventListener('keydown', (e) => {
    const isOpen = lightbox && lightbox.getAttribute('aria-hidden') === 'false';
    if (!isOpen) return;

    if (e.key === 'ArrowRight') { showNext(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { showPrev(); e.preventDefault(); }
    if (e.key === 'Escape') { closeLightbox(); e.preventDefault(); }
  });

  // click outside image closes
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  // simple touch swipe support (useful for desktop touch devices when interactions enabled)
  let touchStartX = 0;
  let touchEndX = 0;
  const SWIPE_THRESHOLD = 60;
  if (lightbox) {
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff < 0) showNext();
        else showPrev();
      }
    });
  }

  // focus trap (simple)
  document.addEventListener('focus', (event) => {
    if (lightbox && lightbox.getAttribute('aria-hidden') === 'false' && !lightbox.contains(event.target)) {
      event.stopPropagation();
      lbClose.focus();
    }
  }, true);

  // initialize counter (no open)
  updateCounter();
});

/* ---------- حساب ارتفاع الهيدر وتعيينه كمتغير CSS ---------- */
function setHeaderHeightVar() {
  const header = document.querySelector('.header');
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-height', `${h}px`);
}

/* debounce خفيف لتقليل عدد النداءات أثناء تغيير الحجم */
let _headerResizeTimeout = null;

window.addEventListener('load', () => {
  setHeaderHeightVar();
  // بعض المتصفحات قد تحتاج مدة قصيرة بعد تحميل الخطوط/الأيقونات
  setTimeout(setHeaderHeightVar, 300);
});

window.addEventListener('resize', () => {
  clearTimeout(_headerResizeTimeout);
  _headerResizeTimeout = setTimeout(setHeaderHeightVar, 120);
});




document.addEventListener('DOMContentLoaded', function () {
  const loader = document.getElementById('loader');
  const main = document.getElementById('main-content');

  // منع السحب
  document.body.classList.add('no-scroll');

  // نفعل الأنيميشن بعد أول رسم (paint) لضمان تشغيل الـ CSS animations
  requestAnimationFrame(() => {
    loader.classList.add('is-visible');
  });

  // مدة العرض الكاملة (بالملي): 
  // pop 800ms, title fade start .45s lasting .8s, subtitle .65s, بعدها ننتظر شويه ثم نعمل fade-out
  const totalDuration = 2800; // تقدر تعدل لو عايز تخلي اللودر أطول/أقصر

  setTimeout(() => {
    // يبدأ الفيد-آوت (CSS transition على #loader)
    loader.classList.add('hide');
    // بعد نهاية الانتقال نشيل العنصر ونعيد السلوك الطبيعي للصفحة
    loader.addEventListener('transitionend', function onEnd(e) {
      // نتأكد ان اللي انتهى هو الخاصية opacity عشان ما نكررش
      if (e.propertyName && e.propertyName.indexOf('opacity') === -1) return;
      loader.removeEventListener('transitionend', onEnd);
      if (loader.parentNode) loader.parentNode.removeChild(loader);
      document.body.classList.remove('no-scroll');
      // أظهر المحتوى الرئيسي
      main.style.display = '';
      main.setAttribute('aria-hidden','false');
    });
  }, totalDuration);
});