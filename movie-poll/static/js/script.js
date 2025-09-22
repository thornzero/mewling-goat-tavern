// Swiper.js integration for movie carousels
if (typeof window.swiperLoaded === 'undefined') {
  window.swiperLoaded = false;
}
if (typeof window.swiperLoading === 'undefined') {
  window.swiperLoading = false;
}

// Load Swiper.js from CDN
function loadSwiper() {
  if (window.swiperLoaded || window.swiperLoading) return Promise.resolve();

  window.swiperLoading = true;

  return new Promise((resolve, reject) => {
    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css';
    document.head.appendChild(cssLink);

    // Load JavaScript
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js';
    script.onload = () => {
      window.swiperLoaded = true;
      window.swiperLoading = false;
      resolve();
    };
    script.onerror = () => {
      window.swiperLoading = false;
      reject(new Error('Failed to load Swiper.js'));
    };
    document.head.appendChild(script);
  });
}

// Initialize Swiper instances
function initializeSwipers() {
  const swipers = document.querySelectorAll('.swiper:not([data-swiper-initialized])');
  if (swipers.length === 0) return;

  if (window.swiperLoaded) {
    swipers.forEach(function (swiperEl) {
      if (!swiperEl.swiper) {
        try {
          // Check if this is a search results swiper
          const isSearchSwiper = swiperEl.classList.contains('search-swiper');

          const config = isSearchSwiper ? {
            slidesPerView: 1,
            spaceBetween: 16,
            breakpoints: {
              640: { slidesPerView: 2, spaceBetween: 20 },
              1024: { slidesPerView: 3, spaceBetween: 24 },
            },
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
            pagination: {
              el: '.swiper-pagination',
              clickable: true,
            },
            loop: false,
            centeredSlides: false,
          } : {
            slidesPerView: 1,
            spaceBetween: 20,
            centeredSlides: true,
            loop: false,
            pagination: {
              el: '.swiper-pagination',
              clickable: true,
            },
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
            breakpoints: {
              640: { slidesPerView: 1, spaceBetween: 20 },
              768: { slidesPerView: 1, spaceBetween: 30 },
              1024: { slidesPerView: 1, spaceBetween: 40 },
            },
          };

          new Swiper(swiperEl, config);
          swiperEl.setAttribute('data-swiper-initialized', 'true');
        } catch (error) {
          console.error('Error initializing Swiper:', error);
        }
      }
    });
  } else {
    loadSwiper().then(initializeSwipers).catch(error => {
      console.error('Failed to load Swiper.js:', error);
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeSwipers);

// Re-initialize after HTMX updates
document.body?.addEventListener('htmx:afterSwap', initializeSwipers);