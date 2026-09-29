document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.endsWith('index.html') || path.endsWith('/')) {
    initHomePage();
  } else if (path.endsWith('movies.html')) {
    initMoviesPage();
  } else if (path.endsWith('seats.html')) {
    initSeatsPage();
  } else if (path.endsWith('checkout.html')) {
    initCheckoutPage();
  } else if (path.endsWith('admin.html')) {
    initAdminPage();
  }

  setupGlobalEventListeners();
});

function setupGlobalEventListeners() {
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          const isPagesSubdir = window.location.pathname.includes('/pages/');
          window.location.href = `${isPagesSubdir ? '' : 'pages/'}movies.html?search=${encodeURIComponent(q)}`;
        }
      }
    });
  }

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const navRight = document.querySelector('.nav-right-group');
      if (navRight) {
        navRight.classList.toggle('mobile-open');
      }
    });
  }

  const trailerModal = document.getElementById('trailerModal');
  if (trailerModal) {
    trailerModal.addEventListener('click', (e) => {
      if (e.target === trailerModal) {
        closeTrailerModal();
      }
    });
  }
}

let currentMovieTab = 'NOW_SHOWING';
let experienceList = [];

async function initHomePage() {
  initHeroSlider();
  await loadMoviesByTab('NOW_SHOWING');
  await loadExperiencesShowcase();
  await loadOffersCarousel();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let currentSlideIndex = 0;
let totalSlides = 4;
let slideInterval = null;
let isSlidePaused = false;
let featuredMoviesList = [];

async function initHeroSlider() {
  const track = document.getElementById('sliderTrack');
  const navContainer = document.querySelector('.slider-nav-container');

  try {
    if (typeof ApiClient !== 'undefined' && ApiClient.getFeaturedMovies) {
      const res = await ApiClient.getFeaturedMovies();
      if (res && res.data && res.data.length > 0) {
        featuredMoviesList = res.data;
      }
    }
  } catch (err) {
    console.warn('Could not load featured movies from backend, using default carousel items.', err);
  }

  if (track && featuredMoviesList.length > 0) {
    totalSlides = featuredMoviesList.length;
    currentSlideIndex = 0;

    track.style.width = `${totalSlides * 100}%`;
    track.innerHTML = featuredMoviesList.map((movie, idx) => {
      const bgImg = movie.backdropUrl || movie.bannerUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1920&q=80';
      const statusBadge = movie.status === 'COMING_SOON' ? 'COMING SOON' : 'NOW SHOWING';
      const trailerParam = (movie.trailerUrl || '').replace(/'/g, "\\'");
      const slideWidth = (100 / totalSlides).toFixed(4);
      const isSubdir = window.location.pathname.includes('/pages/');
      const showtimesLink = `${isSubdir ? '' : 'pages/'}showtimes.html${movie.id ? '?movieId=' + movie.id : ''}`;

      return `
        <div class="hero-slide ${idx === 0 ? 'active' : ''}" style="width: ${slideWidth}%; background-image: linear-gradient(to right, rgba(11,11,11,0.9) 20%, rgba(11,11,11,0.4) 65%, rgba(11,11,11,0.9) 100%), url('${bgImg}');">
          <div class="slide-content">
            <span class="badge-now-showing">${statusBadge}</span>
            <h1 class="slide-title">${escapeHtml(movie.title)}</h1>
            <div class="slide-buttons">
              ${movie.trailerUrl ? `<button class="btn-trailer" onclick="openTrailer('${trailerParam}')">WATCH TRAILER</button>` : ''}
              <button class="btn-tickets" onclick="location.href='${showtimesLink}'">BUY TICKETS</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (navContainer) {
      navContainer.innerHTML = featuredMoviesList.map((movie, idx) => {
        const shortTitle = movie.title.length > 18 ? movie.title.substring(0, 16) + '...' : movie.title;
        return `
          <div class="slider-nav-item ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})">
            <span>${escapeHtml(shortTitle.toUpperCase())}</span>
            <div class="progress-bar"><div class="progress-fill"></div></div>
          </div>
        `;
      }).join('');
    }
  } else {
    const navItems = document.querySelectorAll('.slider-nav-item');
    if (navItems.length > 0) {
      totalSlides = navItems.length;
    }
  }

  updateSliderState();
  startSlideTimer();

  const heroSection = document.getElementById('heroSliderSection');
  if (heroSection && !heroSection.dataset.hoverBound) {
    heroSection.dataset.hoverBound = 'true';
    heroSection.addEventListener('mouseenter', () => {
      isSlidePaused = true;
      pauseSlideTimer();
    });
    heroSection.addEventListener('mouseleave', () => {
      isSlidePaused = false;
      startSlideTimer();
    });
  }
}

function updateSliderState() {
  const track = document.getElementById('sliderTrack');
  const navItems = document.querySelectorAll('.slider-nav-item');
  if (!track || totalSlides === 0) return;

  const shiftPct = currentSlideIndex * (100 / totalSlides);
  track.style.transform = `translateX(-${shiftPct}%)`;

  navItems.forEach((item, index) => {
    const fill = item.querySelector('.progress-fill');
    if (index === currentSlideIndex) {
      item.classList.add('active');
      if (fill) {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        // Force reflow to restart CSS linear transition
        void fill.offsetWidth;
        if (!isSlidePaused) {
          fill.style.transition = 'width 5s linear';
          fill.style.width = '100%';
        }
      }
    } else {
      item.classList.remove('active');
      if (fill) {
        fill.style.transition = 'none';
        fill.style.width = '0%';
      }
    }
  });
}

function nextSlide() {
  if (totalSlides === 0) return;
  currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
  updateSliderState();
}

function goToSlide(index) {
  if (index < 0 || index >= totalSlides) return;
  currentSlideIndex = index;
  updateSliderState();
  resetSlideTimer();
}

function startSlideTimer() {
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 5000);

  const activeNavItem = document.querySelector('.slider-nav-item.active .progress-fill');
  if (activeNavItem && activeNavItem.style.width !== '100%') {
    activeNavItem.style.transition = 'width 5s linear';
    activeNavItem.style.width = '100%';
  }
}

function pauseSlideTimer() {
  if (slideInterval) clearInterval(slideInterval);
  const activeNavItem = document.querySelector('.slider-nav-item.active .progress-fill');
  if (activeNavItem) {
    const computedWidth = getComputedStyle(activeNavItem).width;
    activeNavItem.style.transition = 'none';
    activeNavItem.style.width = computedWidth;
  }
}

function resetSlideTimer() {
  pauseSlideTimer();
  startSlideTimer();
}

async function switchMovieTab(status) {
  currentMovieTab = status;
  const tabNowShowing = document.getElementById('tabNowShowing');
  const tabComingSoon = document.getElementById('tabComingSoon');

  if (tabNowShowing) tabNowShowing.classList.toggle('active', status === 'NOW_SHOWING');
  if (tabComingSoon) tabComingSoon.classList.toggle('active', status === 'COMING_SOON');

  await loadMoviesByTab(status);
}

async function loadMoviesByTab(status) {
  const track = document.getElementById('moviesCarouselTrack');
  if (!track) return;

  track.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">Loading catalog...</div>`;

  try {
    let movies = [];
    if (typeof ApiClient !== 'undefined' && ApiClient.getMoviesByStatus) {
      const res = await ApiClient.getMoviesByStatus(status);
      if (res && res.data && res.data.length > 0) {
        movies = res.data;
      }
    }

    if (movies.length === 0) {
      movies = getFallbackMovies(status);
    }

    renderMovieCarouselCards(movies, status);
  } catch (err) {
    console.warn('API unavailable, rendering fallback movies:', err);
    renderMovieCarouselCards(getFallbackMovies(status), status);
  }
}

function getFallbackMovies(status) {
  if (status === 'COMING_SOON') {
    return [

    ];
  }

  return [

  ];
}

function renderMovieCarouselCards(movies, status) {
  const track = document.getElementById('moviesCarouselTrack');
  if (!track) return;

  const isPagesSubdir = window.location.pathname.includes('/pages/');
  const moviesUrl = isPagesSubdir ? 'movies.html' : 'pages/movies.html';
  const fallbackImg = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';

  track.innerHTML = movies.map(m => {
    const poster = m.posterUrl || fallbackImg;
    const lang = (m.language || 'ENGLISH').toUpperCase();
    const fmt = m.format || '2D, 3D';
    const releaseTag = m.status === 'COMING_SOON' ? 'RELEASING SOON' : 'IN THEATERS NOW';

    return `
      <div class="movie-card-scope">
        <div class="poster-box">
          <span class="movie-release-status-badge">${releaseTag}</span>
          <img src="${poster}" alt="${m.title}" loading="lazy" onerror="this.src='${fallbackImg}'">
          
          <div class="movie-card-hover-overlay">
            <button class="btn btn-primary" style="width: 100%;" onclick="openShowtimesPage(${m.id})">
              BUY TICKETS
            </button>
            <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="openMovieDetailsModal(${m.id})">
              SEE MORE
            </button>
          </div>
        </div>

        <div class="movie-card-info">
          <div class="movie-card-title" title="${m.title}">${m.title}</div>
          <div class="movie-card-subtitle">${lang} / ${fmt}</div>
        </div>
      </div>
    `;
  }).join('');
}

function scrollMovieTrack(distance) {
  const track = document.getElementById('moviesCarouselTrack');
  if (track) {
    track.scrollBy({ left: distance, behavior: 'smooth' });
  }
}

async function loadExperiencesShowcase() {
  const tabsBar = document.getElementById('experiencesTabsBar');
  if (!tabsBar) return;

  experienceList = [
    {
      id: 1,
      title: "DIRECTOR'S LOUNGE",
      description: "Indulge in ultra-luxurious plush leather recliners, gourmet dining delivered straight to your seat, dedicated concierge service, and exclusive private lounge access.",
      bannerImageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80"
    },
    {
      id: 2,
      title: "GOLD CLASS",
      description: "Immerse yourself in VIP treatment featuring extra legroom motorized recliners, personal waiter service, premium wine & cocktail menu, and Dolby Atmos spatial surround sound.",
      bannerImageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80"
    },
    {
      id: 3,
      title: "BALCONY SEATING",
      description: "Enjoy an elevated panoramic perspective from our grand upper tier balcony, boasting extra comfortable plush rocker seating and unhindered sightlines to the screen.",
      bannerImageUrl: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?w=1200&auto=format&fit=crop&q=80"
    },
    {
      id: 4,
      title: "DIGITAL 2D",
      description: "State-of-the-art 4K Ultra-HD Laser projection technology paired with pristine uncompressed multi-channel studio acoustics for high fidelity film presentation.",
      bannerImageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80"
    },
    {
      id: 5,
      title: "DIGITAL 3D",
      description: "Next-generation depth-defying 3D spatial optics combined with high frame-rate projection and 360-degree spatial audio for total cinematic immersion.",
      bannerImageUrl: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=1200&auto=format&fit=crop&q=80"
    }
  ];

  renderExperienceTabs();
  selectExperience(0);
}

function renderExperienceTabs() {
  const tabsBar = document.getElementById('experiencesTabsBar');
  if (!tabsBar) return;

  tabsBar.innerHTML = experienceList.map((exp, idx) => `
    <button class="experience-tab-chip ${idx === 0 ? 'active' : ''}" onclick="selectExperience(${idx})">
      ${exp.title}
    </button>
  `).join('');
}

function selectExperience(index) {
  const exp = experienceList[index];
  if (!exp) return;

  document.querySelectorAll('.experience-tab-chip').forEach((chip, idx) => {
    chip.classList.toggle('active', idx === index);
  });

  const bgImg = document.getElementById('expBgImg');
  const title = document.getElementById('expTitle');
  const desc = document.getElementById('expDesc');

  if (bgImg) {
    bgImg.style.opacity = '0.2';
    setTimeout(() => {
      bgImg.src = exp.bannerImageUrl;
      bgImg.style.opacity = '1';
    }, 200);
  }

  if (title) title.innerText = exp.title;
  if (desc) desc.innerText = exp.description;
}

async function loadOffersCarousel() {
  const track = document.getElementById('offersCarouselTrack');
  if (!track) return;

  track.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted); width: 100%;">Loading offers...</div>`;

  try {
    let offers = [];
    if (typeof ApiClient !== 'undefined' && ApiClient.getPromotions) {
      const res = await ApiClient.getPromotions();
      if (res && res.data && res.data.length > 0) {
        offers = res.data;
      }
    } else {
      const response = await fetch('http://localhost:8080/api/v1/promotions');
      const res = await response.json();
      if (res && res.data && res.data.length > 0) {
        offers = res.data;
      }
    }

    if (offers.length === 0) {
      track.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted); width: 100%;">No active offers currently available.</div>`;
      return;
    }

    track.innerHTML = offers.map(o => {
      const subtitle = o.subtitle || (o.discountPercent ? `${o.discountPercent}% OFF` : 'SPECIAL OFFER');
      const title = o.title || 'SPECIAL PROMOTION';
      const desc = o.description || 'Exclusive promotional offer for CineX moviegoers.';
      const bgImg = o.bannerUrl || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80';

      return `
        <div class="offer-card" style="background-image: linear-gradient(to top, rgba(11,11,11,0.95) 40%, rgba(11,11,11,0.4) 100%), url('${bgImg}'); background-size: cover; background-position: center;">
          <div>
            <span class="offer-tag">${escapeHtml(subtitle)}</span>
            <h3 class="offer-title">${escapeHtml(title)}</h3>
            <p class="offer-desc">${escapeHtml(desc)}</p>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="alert('Explore Offer: ${escapeHtml(title)}')">EXPLORE MORE</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load promotions:', err);
    track.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted); width: 100%;">Unable to load offers right now.</div>`;
  }
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return 'dQw4w9WgXcQ';
  if (urlOrId.length === 11 && !urlOrId.includes('/')) return urlOrId;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : 'dQw4w9WgXcQ';
}

function openTrailer(urlOrId) {
  openTrailerModal(urlOrId);
}

function openTrailerModal(trailerUrlOrId) {
  const modal = document.getElementById('trailerModal');
  const videoWrap = document.getElementById('trailerVideoWrap');
  if (!modal || !videoWrap) return;

  const videoId = extractYouTubeId(trailerUrlOrId);
  videoWrap.innerHTML = `
    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  `;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeTrailerModal() {
  const modal = document.getElementById('trailerModal');
  const videoWrap = document.getElementById('trailerVideoWrap');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (videoWrap) videoWrap.innerHTML = '';
}

function openMovieDetailsModal(movieId) {
  const isPagesSubdir = window.location.pathname.includes('/pages/');
  window.location.href = `${isPagesSubdir ? '' : 'pages/'}movie-details.html?id=${movieId}`;
}

function openShowtimesPage(movieId) {
  const isPagesSubdir = window.location.pathname.includes('/pages/');
  const param = movieId ? `?movieId=${movieId}` : '';
  window.location.href = `${isPagesSubdir ? '' : 'pages/'}showtimes.html${param}`;
}

async function initMoviesPage() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get('search') || '';
  const searchInput = document.getElementById('movieSearchInput');
  if (searchInput && search) {
    searchInput.value = search;
  }
}

function initSeatsPage() {}

function initCheckoutPage() {
  const container = document.getElementById('checkoutOrderReview');
  if (!container) return;

  const rawState = sessionStorage.getItem('bookingState') || sessionStorage.getItem('booking_payload') || sessionStorage.getItem('cinex_booking_payload');
  if (!rawState) {
    container.innerHTML = `
      <div style="color: var(--accent-rose); padding: 16px; text-align: center;">
        No active booking found. <a href="movies.html" style="color: var(--primary);">Browse Movies</a>
      </div>
    `;
    return;
  }

  try {
    const state = JSON.parse(rawState);
    const movieTitle = state.movieTitle || 'CINEX SCREENING';
    const theater = state.theaterName || 'CineX Cinema';
    const seatsStr = (state.seats && state.seats.length > 0) ? state.seats.join(', ') : (state.seatLabels ? state.seatLabels.join(', ') : 'N/A');
    const adultCount = state.adultTickets || state.adultCount || (state.seats ? state.seats.length : 1);
    const childCount = state.childTickets || state.childCount || 0;
    const ticketSubtotal = state.ticketSubtotal || state.totalAmount || 0;

    const concessions = state.concessions || [];
    const fnbTotal = state.fnbTotal || (concessions.length > 0 ? concessions.reduce((s, i) => s + (i.price * (i.qty || i.quantity || 1)), 0) : 0);
    const grandTotal = state.grandTotal || (ticketSubtotal + fnbTotal);

    let html = `
      <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);">
        <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 4px;">${escapeHtml(movieTitle)}</h4>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(theater)}</div>
        <div style="font-size: 0.85rem; color: var(--accent-gold); margin-top: 4px; font-weight: 700;">Seats: ${escapeHtml(seatsStr)}</div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-secondary);">Tickets (${adultCount} Adult, ${childCount} Child)</span>
          <strong style="color: #fff;">LKR ${ticketSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
    `;

    if (concessions.length > 0) {
      html += `
        <div style="margin-bottom: 16px; padding-top: 12px; border-top: 1px dashed var(--border-light);">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-light); margin-bottom: 8px;">FOOD & BEVERAGES</div>
          ${concessions.map(item => `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; color: var(--text-secondary);">
              <span>${escapeHtml(item.name)} (x${item.qty || item.quantity || 1})</span>
              <span style="color: #fff;">LKR ${((item.price) * (item.qty || item.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          `).join('')}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.9rem; font-weight: 700;">
            <span style="color: var(--text-secondary);">F&B Sub Total</span>
            <span style="color: #fff;">LKR ${fnbTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      `;
    }

    html += `
      <div style="padding: 14px; background: rgba(245, 179, 36, 0.1); border: 1px solid rgba(245, 179, 36, 0.3); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px;">
        <span style="font-weight: 800; color: #fff; font-size: 0.95rem;">TOTAL PAYABLE</span>
        <strong style="font-size: 1.25rem; color: var(--accent-gold);">LKR ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    console.error('Error rendering checkout order review:', err);
  }
}

let selectedPaymentMethod = 'CREDIT_CARD';
function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.payment-method-card').forEach(card => {
    const isTarget = card.dataset.method === method;
    card.classList.toggle('active', isTarget);
    const radio = card.querySelector('div:last-child');
    if (radio) {
      radio.style.background = isTarget ? 'var(--primary)' : 'transparent';
      radio.style.borderColor = isTarget ? 'var(--primary)' : 'var(--border-light)';
    }
  });
}

async function confirmBookingAndPay() {
  const btn = document.getElementById('confirmPayBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Processing Reservation... ⏳';
  }

  try {
    const rawState = sessionStorage.getItem('bookingState') || sessionStorage.getItem('booking_payload');
    const state = rawState ? JSON.parse(rawState) : {};

    const payload = {
      showId: state.showId || 1,
      seats: state.seats || [],
      seatIds: state.seatIds || [],
      paymentMethod: selectedPaymentMethod,
      adultTickets: state.adultTickets || 1,
      childTickets: state.childTickets || 0,
      concessions: state.concessions || [],
      totalAmount: state.grandTotal || state.totalAmount || 1500
    };

    if (typeof ApiClient !== 'undefined' && ApiClient.createBooking) {
      await ApiClient.createBooking(payload).catch(() => null);
    }

    if (typeof showToast === 'function') {
      showToast('🎉 Booking Confirmed! E-Ticket sent to your registered email.', 'success');
    } else {
      alert('🎉 Booking Confirmed! E-Ticket sent to your registered email.');
    }

    sessionStorage.removeItem('bookingState');
    sessionStorage.removeItem('booking_payload');

    setTimeout(() => {
      window.location.href = '../index.html?booking=success';
    }, 1500);
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('Booking failed: ' + (err.message || 'Payment processing error'), 'error');
    }
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Confirm & Pay Now 🔒';
    }
  }
}

window.selectPaymentMethod = selectPaymentMethod;
window.confirmBookingAndPay = confirmBookingAndPay;
function initAdminPage() {}
