"use strict";
/**
 * Mobile-Optimized Swiper Configuration
 * Enhanced touch interactions and mobile-specific features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMobileConfig = exports.MobileSwiper = void 0;
exports.createMobileSwiper = createMobileSwiper;
class MobileSwiper {
    constructor(container, config = {}) {
        this.swiper = null;
        this.isInitialized = false;
        this.container = container;
        this.config = this.getDefaultConfig(config);
    }
    getDefaultConfig(userConfig) {
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        return {
            // Touch settings
            touchRatio: 1,
            touchAngle: 45,
            simulateTouch: !isMobile,
            allowTouchMove: true,
            touchStartPreventDefault: false,
            touchStartForcePreventDefault: false,
            touchMoveStopPropagation: false,
            touchReleaseOnEdges: true,
            touchMoveStopPropagationThreshold: 5,
            // Swipe settings
            threshold: isMobile ? 30 : 50,
            touchStartThreshold: 5,
            touchMoveThreshold: 10,
            longSwipes: true,
            longSwipesRatio: 0.5,
            longSwipesMs: 300,
            followFinger: true,
            shortSwipes: true,
            shortSwipesRatio: 0.5,
            shortSwipesMs: 300,
            // Resistance
            resistance: true,
            resistanceRatio: 0.85,
            // Pagination
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: isMobile,
                dynamicMainBullets: 1,
                renderBullet: (index, className) => {
                    return `<span class="${className} swiper-pagination-bullet-mobile"></span>`;
                }
            },
            // Navigation
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
                hideOnClick: true
            },
            // Mobile-specific
            mobileFirst: true,
            spaceBetween: isMobile ? 16 : 24,
            slidesPerView: isMobile ? 1 : 'auto',
            centeredSlides: isMobile,
            centeredSlidesBounds: isMobile,
            // Performance
            watchSlidesProgress: true,
            watchSlidesVisibility: true,
            preloadImages: false,
            updateOnImagesReady: true,
            // Accessibility
            a11y: {
                enabled: true,
                prevSlideMessage: 'Previous slide',
                nextSlideMessage: 'Next slide',
                firstSlideMessage: 'This is the first slide',
                lastSlideMessage: 'This is the last slide',
                paginationBulletMessage: 'Go to slide {{index}}'
            },
            // Keyboard
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            // Mousewheel
            mousewheel: {
                enabled: !isMobile,
                forceToAxis: true,
                sensitivity: 1,
                releaseOnEdges: true
            },
            // Breakpoints
            breakpoints: {
                320: {
                    spaceBetween: 12,
                    slidesPerView: 1,
                    centeredSlides: true
                },
                480: {
                    spaceBetween: 16,
                    slidesPerView: 1,
                    centeredSlides: true
                },
                768: {
                    spaceBetween: 20,
                    slidesPerView: 'auto',
                    centeredSlides: false
                },
                1024: {
                    spaceBetween: 24,
                    slidesPerView: 'auto',
                    centeredSlides: false
                }
            },
            // Events
            onTouchStart: (swiper, event) => {
                this.handleTouchStart(swiper, event);
            },
            onTouchMove: (swiper, event) => {
                this.handleTouchMove(swiper, event);
            },
            onTouchEnd: (swiper, event) => {
                this.handleTouchEnd(swiper, event);
            },
            onSlideChange: (swiper) => {
                this.handleSlideChange(swiper);
            },
            onReachEnd: (swiper) => {
                this.handleReachEnd(swiper);
            },
            onReachBeginning: (swiper) => {
                this.handleReachBeginning(swiper);
            },
            ...userConfig
        };
    }
    init() {
        if (this.isInitialized) {
            this.destroy();
        }
        // Ensure Swiper is available
        if (typeof window !== 'undefined' && window.Swiper) {
            this.swiper = new window.Swiper(this.container, this.config);
            this.isInitialized = true;
            this.setupMobileEnhancements();
        }
        else {
            console.error('Swiper library not found. Please include Swiper.js before initializing MobileSwiper.');
        }
    }
    destroy() {
        if (this.swiper) {
            this.swiper.destroy(true, true);
            this.swiper = null;
            this.isInitialized = false;
        }
    }
    update() {
        if (this.swiper) {
            this.swiper.update();
        }
    }
    slideNext() {
        if (this.swiper) {
            this.swiper.slideNext();
        }
    }
    slidePrev() {
        if (this.swiper) {
            this.swiper.slidePrev();
        }
    }
    slideTo(index, speed) {
        if (this.swiper) {
            this.swiper.slideTo(index, speed);
        }
    }
    getActiveIndex() {
        return this.swiper ? this.swiper.activeIndex : 0;
    }
    getSlidesLength() {
        return this.swiper ? this.swiper.slides.length : 0;
    }
    isEnd() {
        return this.swiper ? this.swiper.isEnd : false;
    }
    isBeginning() {
        return this.swiper ? this.swiper.isBeginning : false;
    }
    setupMobileEnhancements() {
        if (!this.swiper)
            return;
        // Add mobile-specific CSS classes
        this.container.classList.add('mobile-swiper');
        // Add swipe indicators for mobile
        if (window.innerWidth < 768) {
            this.addSwipeIndicators();
        }
        // Setup haptic feedback
        this.setupHapticFeedback();
        // Setup keyboard navigation for desktop
        if (window.innerWidth >= 768) {
            this.setupKeyboardNavigation();
        }
    }
    addSwipeIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'swipe-indicators';
        indicators.innerHTML = `
      <div class="swipe-hint">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <span>Swipe to navigate</span>
      </div>
    `;
        this.container.appendChild(indicators);
        // Hide indicators after first interaction
        const hideIndicators = () => {
            indicators.style.opacity = '0';
            setTimeout(() => indicators.remove(), 300);
        };
        this.swiper.on('touchStart', hideIndicators);
        this.swiper.on('slideChange', hideIndicators);
    }
    setupHapticFeedback() {
        if (!('vibrate' in navigator))
            return;
        this.swiper.on('slideChange', () => {
            navigator.vibrate(10); // Light haptic feedback
        });
        this.swiper.on('reachEnd', () => {
            navigator.vibrate([10, 50, 10]); // Pattern for end
        });
        this.swiper.on('reachBeginning', () => {
            navigator.vibrate([10, 50, 10]); // Pattern for beginning
        });
    }
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            if (!this.swiper)
                return;
            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    this.slidePrev();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.slideNext();
                    break;
                case 'Home':
                    event.preventDefault();
                    this.slideTo(0);
                    break;
                case 'End':
                    event.preventDefault();
                    this.slideTo(this.getSlidesLength() - 1);
                    break;
            }
        });
    }
    // Event handlers
    handleTouchStart(swiper, event) {
        // Add touch feedback
        this.container.classList.add('touching');
    }
    handleTouchMove(swiper, event) {
        // Handle touch move if needed
    }
    handleTouchEnd(swiper, event) {
        // Remove touch feedback
        this.container.classList.remove('touching');
    }
    handleSlideChange(swiper) {
        // Update progress indicators
        this.updateProgress();
    }
    handleReachEnd(swiper) {
        // Handle end of slides
        this.container.classList.add('swiper-end');
    }
    handleReachBeginning(swiper) {
        // Handle beginning of slides
        this.container.classList.add('swiper-beginning');
    }
    updateProgress() {
        if (!this.swiper)
            return;
        const progress = (this.swiper.activeIndex + 1) / this.swiper.slides.length;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
        }
        // Update remaining count
        const remaining = this.swiper.slides.length - (this.swiper.activeIndex + 1);
        const remainingElement = document.getElementById('remaining');
        if (remainingElement) {
            remainingElement.textContent = `${remaining} movies remaining`;
        }
    }
}
exports.MobileSwiper = MobileSwiper;
// Utility function to create mobile-optimized swiper
function createMobileSwiper(container, config) {
    return new MobileSwiper(container, config);
}
// Export default configuration for easy use
exports.defaultMobileConfig = {
    touchRatio: 1,
    allowTouchMove: true,
    resistance: true,
    resistanceRatio: 0.85,
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: true
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev'
    },
    spaceBetween: 16,
    slidesPerView: 1,
    centeredSlides: true,
    watchSlidesProgress: true,
    a11y: {
        enabled: true
    },
    keyboard: {
        enabled: true
    }
};
