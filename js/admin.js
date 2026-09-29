function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Auth !== 'undefined' && Auth.validateSession) {
    await Auth.validateSession();
  }
  const user = Auth.getUser();
  if (!user || !Auth.isAdmin()) {
    showToast('Access denied. Admin credentials required.', 'error');
    setTimeout(() => {
      const isSubdir = window.location.pathname.includes('/pages/');
      window.location.href = isSubdir ? '../index.html' : 'index.html';
    }, 1000);
    return;
  }

  const adminNameEl = document.getElementById('adminUserName');
  if (adminNameEl) {
    adminNameEl.innerText = user.name || user.email;
  }

  loadMovies();
});

// Helper to switch tabs
function switchTab(tabName) {
  const tabs = ['movies', 'carousel', 'experiences', 'offers', 'shows_locations', 'concessions'];
  tabs.forEach(tab => {
    const section = document.getElementById(`tab_${tab}`);
    const btn = document.getElementById(`tabBtn_${tab}`);
    if (section) section.style.display = tab === tabName ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', tab === tabName);
  });

  if (tabName === 'movies') loadMovies();
  if (tabName === 'carousel') loadHeroCarousel();
  if (tabName === 'experiences') loadExperiences();
  if (tabName === 'offers') loadOffers();
  if (tabName === 'shows_locations') {
    loadCinemas();
    loadShowtimes();
  }
  if (tabName === 'concessions') loadAdminConcessions();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

async function loadMovies() {
  const tableBody = document.getElementById('moviesTableBody');
  if (!tableBody) return;

  try {
    const res = await ApiClient.getMovies();
    const movies = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

    if (movies.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color:#888;">No movies available in catalog.</td></tr>`;
      return;
    }

    tableBody.innerHTML = movies.map(m => {
      const isNowShowing = m.status === 'NOW_SHOWING';
      const statusBadge = isNowShowing 
        ? `<span class="badge-status now-showing">NOW SHOWING</span>` 
        : `<span class="badge-status coming-soon">COMING SOON</span>`;

      const heroBadge = m.isFeatured 
        ? `<button class="badge-status now-showing" style="cursor:pointer;" onclick="toggleHeroFeatured(${m.id})" title="Click to remove from Hero Slider">★ Active (#${m.featuredOrder || 1})</button>`
        : `<button class="badge-status" style="cursor:pointer; background:#252525; color:#888; border:1px solid #444;" onclick="toggleHeroFeatured(${m.id})" title="Click to feature in Hero Slider">☆ Inactive</button>`;

      return `
        <tr>
          <td>
            <img src="${m.posterUrl || 'https://via.placeholder.com/150'}" alt="${m.title}" class="tbl-thumb">
          </td>
          <td style="font-weight: 700; color: #fff;">${m.title}</td>
          <td>${m.language || 'English'}</td>
          <td>${m.durationMins || 120} mins</td>
          <td>${statusBadge}</td>
          <td>${heroBadge}</td>
          <td>${m.releaseDate || 'N/A'}</td>
          <td>
            <div class="action-btns-wrap">
              <button class="btn-icon-action btn-edit" onclick="editMovie(${m.id})">Edit</button>
              <button class="btn-icon-action btn-delete" onclick="confirmDeleteMovie(${m.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" style="color: #ff4757; text-align: center; padding: 20px;">Failed to load movies: ${err.message}</td></tr>`;
  }
}

async function toggleHeroFeatured(id) {
  try {
    await ApiClient.toggleFeaturedMovie(id);
    showToast('Hero featured status updated!', 'success');
    loadMovies();
    if (document.getElementById('tab_carousel').style.display !== 'none') {
      loadHeroCarousel();
    }
  } catch (err) {
    showToast('Failed to update hero status: ' + err.message, 'error');
  }
}

function openMovieFormModal(movie = null) {
  const form = document.getElementById('movieForm');
  const title = document.getElementById('movieModalTitle');
  if (form) form.reset();

  const genreInput = document.getElementById('movieGenre');
  const formatsInput = document.getElementById('movieFormats');

  if (movie) {
    title.innerText = 'Edit Movie';
    document.getElementById('movieId').value = movie.id;
    document.getElementById('mTitle').value = movie.title || '';
    document.getElementById('mDescription').value = movie.synopsis || movie.description || '';
    document.getElementById('mDirectors').value = movie.directors || '';
    document.getElementById('mCast').value = movie.cast || '';
    document.getElementById('mClassification').value = movie.classification || 'U';
    if (genreInput) genreInput.value = movie.genre || 'ACTION / ADVENTURE';
    if (formatsInput) formatsInput.value = movie.formatTags || 'DOLBY ATMOS / IMAX 3D';
    document.getElementById('mDuration').value = movie.durationMins || 120;
    document.getElementById('mLanguage').value = movie.language || 'English';
    document.getElementById('mStatus').value = movie.status || 'NOW_SHOWING';
    document.getElementById('mReleaseDate').value = movie.releaseDate || '';
    document.getElementById('mIsFeatured').checked = !!movie.isFeatured;
    document.getElementById('mFeaturedOrder').value = movie.featuredOrder || 1;
    document.getElementById('mBackdropUrl').value = movie.backdropUrl || '';
    document.getElementById('mPosterUrl').value = movie.posterUrl || '';
    document.getElementById('mBannerUrl').value = movie.bannerUrl || '';
    document.getElementById('mTrailerUrl').value = movie.trailerUrl || '';
  } else {
    title.innerText = 'Add New Movie';
    document.getElementById('movieId').value = '';
    document.getElementById('mDirectors').value = '';
    document.getElementById('mCast').value = '';
    document.getElementById('mClassification').value = 'U';
    if (genreInput) genreInput.value = 'ACTION / ADVENTURE';
    if (formatsInput) formatsInput.value = 'DOLBY ATMOS / IMAX 3D';
    document.getElementById('mIsFeatured').checked = false;
    document.getElementById('mFeaturedOrder').value = 1;
  }

  openModal('movieModal');
}

async function editMovie(id) {
  try {
    const res = await ApiClient.getMovieById(id);
    const movie = res.data || res;
    openMovieFormModal(movie);
  } catch (err) {
    showToast('Failed to fetch movie details: ' + err.message, 'error');
  }
}

async function handleSaveMovie(event) {
  event.preventDefault();
  const id = document.getElementById('movieId').value;
  const synopsisText = document.getElementById('mDescription').value.trim();

  const genreVal = document.getElementById('movieGenre') ? document.getElementById('movieGenre').value : 'ACTION / ADVENTURE';
  const formatsVal = document.getElementById('movieFormats') ? document.getElementById('movieFormats').value : 'DOLBY ATMOS / IMAX 3D';

  const payload = {
    title: document.getElementById('mTitle').value.trim(),
    description: synopsisText,
    synopsis: synopsisText,
    directors: document.getElementById('mDirectors').value.trim(),
    cast: document.getElementById('mCast').value.trim(),
    classification: document.getElementById('mClassification').value,
    genre: genreVal,
    formatTags: formatsVal,
    durationMins: parseInt(document.getElementById('mDuration').value, 10),
    language: document.getElementById('mLanguage').value.trim(),
    status: document.getElementById('mStatus').value,
    releaseDate: document.getElementById('mReleaseDate').value,
    isFeatured: document.getElementById('mIsFeatured').checked,
    featuredOrder: parseInt(document.getElementById('mFeaturedOrder').value || 1, 10),
    backdropUrl: document.getElementById('mBackdropUrl').value.trim(),
    posterUrl: document.getElementById('mPosterUrl').value.trim(),
    bannerUrl: document.getElementById('mBannerUrl').value.trim(),
    trailerUrl: document.getElementById('mTrailerUrl').value.trim()
  };

  try {
    if (id) {
      await ApiClient.updateMovie(id, payload);
      showToast('Movie updated successfully!', 'success');
    } else {
      await ApiClient.createMovie(payload);
      showToast('Movie created successfully!', 'success');
    }
    closeModal('movieModal');
    loadMovies();
    if (document.getElementById('tab_carousel') && document.getElementById('tab_carousel').style.display !== 'none') {
      loadHeroCarousel();
    }
  } catch (err) {
    showToast((id ? 'Update' : 'Creation') + ' failed: ' + err.message, 'error');
  }
}

async function confirmDeleteMovie(id) {
  if (!confirm('Are you sure you want to delete this movie?')) return;

  try {
    await ApiClient.deleteMovie(id);
    showToast('Movie deleted successfully.', 'info');
    loadMovies();
  } catch (err) {
    showToast('Failed to delete movie: ' + err.message, 'error');
  }
}

async function loadHeroCarousel() {
  const tableBody = document.getElementById('carouselTableBody');
  if (!tableBody) return;

  try {
    const res = await ApiClient.getFeaturedMovies();
    const movies = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

    if (movies.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#888;">No featured movies currently in the Hero Slider. Toggle 'Hero Slide' on any movie in the Movies tab.</td></tr>`;
      return;
    }

    tableBody.innerHTML = movies.map((m, index) => {
      const bannerImg = m.backdropUrl || m.bannerUrl || m.posterUrl;
      return `
        <tr>
          <td style="font-weight: 800; color: #E50914; font-size: 1.1rem;">#${m.featuredOrder || (index + 1)}</td>
          <td>
            <img src="${bannerImg}" alt="${m.title}" style="width: 140px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
          </td>
          <td style="font-weight: 700; color: #fff;">${m.title}</td>
          <td><span class="badge-status now-showing">FEATURED SLIDE</span></td>
          <td>
            <div class="action-btns-wrap">
              <button class="btn-icon-action btn-edit" onclick="editMovie(${m.id})">Edit Slide</button>
              <button class="btn-icon-action btn-delete" onclick="toggleHeroFeatured(${m.id})">Remove Slide</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" style="color: #ff4757; text-align: center; padding: 20px;">Failed to load featured carousel: ${err.message}</td></tr>`;
  }
}

async function loadExperiences() {
  const tableBody = document.getElementById('experiencesTableBody');
  if (!tableBody) return;

  try {
    const res = await ApiClient.getExperiences();
    const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color:#888;">No experiences found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map(e => `
      <tr>
        <td>
          ${e.bannerImageUrl 
            ? `<img src="${e.bannerImageUrl}" alt="${e.title}" class="tbl-thumb">` 
            : `<div class="tbl-icon-thumb">${e.iconUrl || '🛋️'}</div>`}
        </td>
        <td style="font-weight: 700; color: #fff;">${e.title}</td>
        <td style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.description}</td>
        <td>
          <div class="action-btns-wrap">
            <button class="btn-icon-action btn-edit" onclick="editExperience(${e.id})">Edit</button>
            <button class="btn-icon-action btn-delete" onclick="confirmDeleteExperience(${e.id})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="4" style="color: #ff4757; text-align: center; padding: 20px;">Failed to load experiences: ${err.message}</td></tr>`;
  }
}

function openExperienceFormModal(exp = null) {
  const form = document.getElementById('experienceForm');
  const title = document.getElementById('expModalTitle');
  if (form) form.reset();

  if (exp) {
    title.innerText = 'Edit Experience';
    document.getElementById('expId').value = exp.id;
    document.getElementById('eTitle').value = exp.title || '';
    document.getElementById('eDescription').value = exp.description || '';
    document.getElementById('eIconUrl').value = exp.iconUrl || '';
    document.getElementById('eBannerUrl').value = exp.bannerImageUrl || '';
  } else {
    title.innerText = 'Add New Experience';
    document.getElementById('expId').value = '';
  }

  openModal('experienceModal');
}

async function editExperience(id) {
  try {
    const res = await ApiClient.getExperiences();
    const list = res.data || res;
    const exp = list.find(item => item.id === id);
    if (exp) openExperienceFormModal(exp);
  } catch (err) {
    showToast('Failed to fetch experience details: ' + err.message, 'error');
  }
}

async function handleSaveExperience(event) {
  event.preventDefault();
  const id = document.getElementById('expId').value;

  const payload = {
    title: document.getElementById('eTitle').value.trim(),
    description: document.getElementById('eDescription').value.trim(),
    iconUrl: document.getElementById('eIconUrl').value.trim() || '🛋️',
    bannerImageUrl: document.getElementById('eBannerUrl').value.trim()
  };

  try {
    if (id) {
      await ApiClient.updateExperience(id, payload);
      showToast('Experience updated successfully!', 'success');
    } else {
      await ApiClient.createExperience(payload);
      showToast('Experience created successfully!', 'success');
    }
    closeModal('experienceModal');
    loadExperiences();
  } catch (err) {
    showToast((id ? 'Update' : 'Creation') + ' failed: ' + err.message, 'error');
  }
}

async function confirmDeleteExperience(id) {
  if (!confirm('Are you sure you want to delete this experience?')) return;

  try {
    await ApiClient.deleteExperience(id);
    showToast('Experience deleted successfully.', 'info');
    loadExperiences();
  } catch (err) {
    showToast('Failed to delete experience: ' + err.message, 'error');
  }
}

async function loadOffers() {
  const container = document.getElementById('offersGridContainer');
  if (!container) return;

  try {
    const res = await ApiClient.getPromotions();
    const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

    if (list.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#888;">No active offers or giveaways.</div>`;
      return;
    }

    container.innerHTML = list.map(o => `
      <div class="admin-offer-card">
        <img src="${o.bannerUrl || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80'}" alt="${o.title}" class="admin-offer-banner">
        <div class="admin-offer-body">
          <div>
            <span class="offer-discount-tag">${o.discountPercent || 20}% OFF</span>
            <h4 class="admin-offer-title">${o.title}</h4>
            <div class="admin-offer-subtitle">${o.subtitle || ''}</div>
            <p style="font-size: 0.85rem; color: #aaa; line-height: 1.4; margin-bottom: 16px;">${o.description || ''}</p>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
            <span style="font-size: 0.75rem; color: #888;">Until: ${o.validUntil || 'Ongoing'}</span>
            <div class="action-btns-wrap">
              <button class="btn-icon-action btn-edit" onclick="editOffer(${o.id})">Edit</button>
              <button class="btn-icon-action btn-delete" onclick="confirmDeleteOffer(${o.id})">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: #ff4757; text-align: center; padding: 30px;">Failed to load offers: ${err.message}</div>`;
  }
}

function openOfferFormModal(offer = null) {
  const form = document.getElementById('offerForm');
  const title = document.getElementById('offerModalTitle');
  if (form) form.reset();

  if (offer) {
    title.innerText = 'Edit Offer';
    document.getElementById('oId').value = offer.id;
    document.getElementById('oTitle').value = offer.title || '';
    document.getElementById('oSubtitle').value = offer.subtitle || '';
    document.getElementById('oDiscount').value = offer.discountPercent || 20.0;
    document.getElementById('oDescription').value = offer.description || '';
    document.getElementById('oBannerUrl').value = offer.bannerUrl || '';
    document.getElementById('oValidUntil').value = offer.validUntil || '';
  } else {
    title.innerText = 'Add New Offer';
    document.getElementById('oId').value = '';
  }

  openModal('offerModal');
}

async function editOffer(id) {
  try {
    const res = await ApiClient.getPromotions();
    const list = res.data || res;
    const offer = list.find(item => item.id === id);
    if (offer) openOfferFormModal(offer);
  } catch (err) {
    showToast('Failed to fetch offer details: ' + err.message, 'error');
  }
}

async function handleSaveOffer(event) {
  event.preventDefault();
  const id = document.getElementById('oId').value;

  const payload = {
    title: document.getElementById('oTitle').value.trim(),
    subtitle: document.getElementById('oSubtitle').value.trim(),
    discountPercent: parseFloat(document.getElementById('oDiscount').value),
    description: document.getElementById('oDescription').value.trim(),
    bannerUrl: document.getElementById('oBannerUrl').value.trim(),
    validUntil: document.getElementById('oValidUntil').value || null
  };

  try {
    if (id) {
      await ApiClient.updatePromotion(id, payload);
      showToast('Offer updated successfully!', 'success');
    } else {
      await ApiClient.createPromotion(payload);
      showToast('Offer created successfully!', 'success');
    }
    closeModal('offerModal');
    loadOffers();
  } catch (err) {
    showToast((id ? 'Update' : 'Creation') + ' failed: ' + err.message, 'error');
  }
}

async function confirmDeleteOffer(id) {
  if (!confirm('Are you sure you want to delete this offer?')) return;

  try {
    await ApiClient.deletePromotion(id);
    showToast('Offer deleted successfully.', 'info');
    loadOffers();
  } catch (err) {
    showToast('Failed to delete offer: ' + err.message, 'error');
  }
}

let cinemasList = [];

async function loadCinemas() {
  const tableBody = document.getElementById('cinemasTableBody');
  if (!tableBody) return;

  try {
    let res = null;
    if (typeof ApiClient !== 'undefined' && ApiClient.getCinemas) {
      res = await ApiClient.getCinemas();
    } else if (typeof ApiClient !== 'undefined' && ApiClient.getTheaters) {
      res = await ApiClient.getTheaters();
    }
    const cinemas = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    cinemasList = cinemas;

    if (cinemas.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#888;">No cinema locations configured.</td></tr>`;
      return;
    }

    tableBody.innerHTML = cinemas.map(c => `
      <tr>
        <td><strong>#${c.id}</strong></td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.location || 'N/A')}</td>
        <td>${c.totalScreens || 4} Halls</td>
        <td>
          <div class="action-btn-group">
            <button class="btn-action edit" onclick="editCinema(${c.id})">Edit</button>
            <button class="btn-action delete" onclick="confirmDeleteCinema(${c.id})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.warn('Could not load cinemas:', err);
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#e50914;">Failed to load cinema locations.</td></tr>`;
  }
}

function openCinemaFormModal(cinemaData = null) {
  const form = document.getElementById('cinemaForm');
  const title = document.getElementById('cinemaModalTitle');
  if (form) form.reset();

  if (cinemaData) {
    if (title) title.innerText = 'Edit Cinema Location';
    document.getElementById('cinemaId').value = cinemaData.id;
    document.getElementById('cName').value = cinemaData.name || '';
    document.getElementById('cLocation').value = cinemaData.location || '';
    document.getElementById('cTotalScreens').value = cinemaData.totalScreens || 4;
  } else {
    if (title) title.innerText = 'Add New Cinema Location';
    document.getElementById('cinemaId').value = '';
  }

  openModal('cinemaModal');
}

function editCinema(id) {
  const cinema = cinemasList.find(c => String(c.id) === String(id));
  if (cinema) openCinemaFormModal(cinema);
}

async function handleSaveCinema(event) {
  event.preventDefault();
  const id = document.getElementById('cinemaId').value;

  const payload = {
    name: document.getElementById('cName').value.trim(),
    location: document.getElementById('cLocation').value.trim(),
    totalScreens: parseInt(document.getElementById('cTotalScreens').value) || 4
  };

  try {
    if (id) {
      if (ApiClient.updateCinema) await ApiClient.updateCinema(id, payload);
      else await ApiClient.updateTheater(id, payload);
      showToast('Cinema updated successfully!', 'success');
    } else {
      if (ApiClient.createCinema) await ApiClient.createCinema(payload);
      else await ApiClient.createTheater(payload);
      showToast('Cinema created successfully!', 'success');
    }
    closeModal('cinemaModal');
    loadCinemas();
  } catch (err) {
    showToast((id ? 'Update' : 'Creation') + ' failed: ' + err.message, 'error');
  }
}

async function confirmDeleteCinema(id) {
  if (!confirm('Are you sure you want to delete this cinema location?')) return;

  try {
    if (ApiClient.deleteCinema) await ApiClient.deleteCinema(id);
    else await ApiClient.deleteTheater(id);
    showToast('Cinema deleted successfully.', 'info');
    loadCinemas();
  } catch (err) {
    showToast('Failed to delete cinema: ' + err.message, 'error');
  }
}

let showtimesList = [];
let bulkCatalogMovies = [];
let bulkCatalogCinemas = [];
let bulkSelectedCinemaIds = [];
let bulkSelectedExperiences = ["DOLBY ATMOS"];
let bulkSelectedTimes = ["10:30", "13:45", "17:15", "20:30"];
let bulkDateSelectionMode = "RANGE";
let bulkSpecificDates = [];

async function loadShowtimes() {
  const tableBody = document.getElementById('showsTableBody');
  if (!tableBody) return;

  try {
    const res = await ApiClient.getAllShows();
    const shows = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    showtimesList = shows;

    await populateShowFilters();
    renderShowtimesTable();
  } catch (err) {
    console.warn('Could not load showtimes:', err);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:#e50914;">Failed to load showtimes schedule.</td></tr>`;
  }
}

async function populateShowFilters() {
  const movieFilterSelect = document.getElementById('adminShowMovieFilter');
  const cinemaFilterSelect = document.getElementById('adminShowCinemaFilter');

  if (movieFilterSelect && movieFilterSelect.options.length <= 1) {
    try {
      const res = await ApiClient.getMovies();
      const movies = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (movies.length > 0) {
        movies.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.title.toUpperCase();
          movieFilterSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Could not populate movie filter:', e);
    }
  }

  if (cinemaFilterSelect && cinemaFilterSelect.options.length <= 1) {
    try {
      let res = null;
      if (ApiClient.getCinemas) res = await ApiClient.getCinemas();
      else if (ApiClient.getTheaters) res = await ApiClient.getTheaters();
      const cinemas = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (cinemas.length > 0) {
        cinemas.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          cinemaFilterSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Could not populate cinema filter:', e);
    }
  }
}

function resetAdminShowFilters() {
  const dateInput = document.getElementById('adminShowDateFilter');
  const movieSelect = document.getElementById('adminShowMovieFilter');
  const cinemaSelect = document.getElementById('adminShowCinemaFilter');

  if (dateInput) dateInput.value = '';
  if (movieSelect) movieSelect.value = 'ALL';
  if (cinemaSelect) cinemaSelect.value = 'ALL';

  renderShowtimesTable();
}


function groupShows(showsList) {
  const groups = {};
  showsList.forEach(show => {
    const startTimeStr = show.startTime ? String(show.startTime) : '';
    const dateOnly = startTimeStr.split('T')[0] || 'N/A';

    const movieId = show.movie ? show.movie.id : (show.movieId || '0');
    const movieTitle = show.movie ? show.movie.title : (show.movieTitle || 'Movie #' + movieId);
    const posterUrl = show.movie ? show.movie.posterUrl : (show.moviePosterUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80');

    const theaterId = show.screen && show.screen.theater ? show.screen.theater.id : (show.theaterId || '0');
    const theaterName = show.screen && show.screen.theater ? show.screen.theater.name : (show.theaterName || show.theaterLocation || 'CineX Multiplex');
    const screenId = show.screen ? show.screen.id : (show.screenId || 1);

    const exp = show.experience || show.movieFormatTags || 'DOLBY ATMOS';
    const price = show.ticketPrice !== undefined ? show.ticketPrice : 1500.0;

    const key = `${dateOnly}_${movieId}_${theaterId}_${exp}`;
    if (!groups[key]) {
      groups[key] = {
        key: key,
        date: dateOnly,
        movie: { id: movieId, title: movieTitle, posterUrl: posterUrl },
        theater: { id: theaterId, name: theaterName },
        screenId: screenId,
        experience: exp,
        price: price,
        slots: []
      };
    }
    groups[key].slots.push({
      id: show.id,
      time: formatTo12Hr(startTimeStr),
      rawStartTime: startTimeStr
    });
  });
  return Object.values(groups);
}

function formatTo12Hr(isoStr) {
  if (!isoStr) return 'N/A';
  if (typeof isoStr === 'string' && isoStr.includes(':') && !isoStr.includes('T') && !isoStr.includes('-')) {
    return formatTimeDisplay(isoStr);
  }
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) {
    const parts = String(isoStr).split('T');
    if (parts.length === 2) {
      return formatTimeDisplay(parts[1].substring(0, 5));
    }
    return String(isoStr);
  }
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateDisplay(dateStr) {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    }
  }
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
}

function renderShowtimesTable() {
  const tableBody = document.getElementById('showsTableBody');
  if (!tableBody) return;

  const dateFilter = document.getElementById('adminShowDateFilter')?.value;
  const movieFilter = document.getElementById('adminShowMovieFilter')?.value;
  const cinemaFilter = document.getElementById('adminShowCinemaFilter')?.value;

  let shows = showtimesList || [];

  if (dateFilter) {
    shows = shows.filter(s => {
      const sDate = s.startTime ? String(s.startTime).split('T')[0] : '';
      return sDate === dateFilter;
    });
  }

  if (movieFilter && movieFilter !== 'ALL') {
    shows = shows.filter(s => String(s.movieId) === String(movieFilter) || String(s.movieTitle).toUpperCase() === String(movieFilter).toUpperCase());
  }

  if (cinemaFilter && cinemaFilter !== 'ALL') {
    shows = shows.filter(s => String(s.theaterId) === String(cinemaFilter) || String(s.theaterName).toUpperCase() === String(cinemaFilter).toUpperCase());
  }

  if (shows.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:#888;">No scheduled showtimes found for the selected criteria.</td></tr>`;
    return;
  }

  const groupedShows = groupShows(shows);

  tableBody.innerHTML = groupedShows.map(g => {
    // Sort slots chronologically by rawStartTime
    g.slots.sort((a, b) => {
      const parseT = (t) => {
        if (!t) return 0;
        const d = new Date(t);
        return !isNaN(d.getTime()) ? d.getTime() : 0;
      };
      return parseT(a.rawStartTime) - parseT(b.rawStartTime);
    });

    const slotPillsHtml = g.slots.map(s => `
      <span class="slot-pill">
        <span>${escapeHtml(s.time)}</span>
        <button type="button" class="btn-slot-remove" onclick="deleteSingleSlot(${s.id})" title="Remove time slot ${escapeHtml(s.time)}">&times;</button>
      </span>
    `).join('');

    const addSlotBtnHtml = `
      <button type="button" class="btn-add-single-slot" onclick="openAddSingleSlotModal('${g.date}', ${g.movie.id}, ${g.theater.id}, ${g.screenId}, '${escapeHtml(g.experience)}', ${g.price})" title="Add an extra time slot for this date">+ Slot</button>
    `;

    const formattedDateStr = formatDateDisplay(g.date);
    const priceDisplay = `LKR ${parseFloat(g.price).toFixed(2)}`;

    return `
      <tr>
        <td>
          <div class="admin-date-cell">
            <span style="font-weight: 700; color: #fff;">${escapeHtml(formattedDateStr)}</span>
          </div>
        </td>
        <td>
          <div class="admin-tbl-movie-cell">
            <img src="${g.movie.posterUrl}" alt="${escapeHtml(g.movie.title)}" class="tbl-thumb-sm">
            <span style="font-weight: 700; color: #fff;">${escapeHtml(g.movie.title)}</span>
          </div>
        </td>
        <td>${escapeHtml(g.theater.name)}</td>
        <td><span class="badge-status now-showing">${escapeHtml(g.experience.toUpperCase())}</span></td>
        <td>
          <div class="admin-slots-container">
            ${slotPillsHtml}
            ${addSlotBtnHtml}
          </div>
        </td>
        <td><strong>${priceDisplay}</strong></td>
        <td>
          <button class="btn-icon-action btn-delete" onclick="deleteGroupedShowSlots('${escapeHtml(g.key)}')">Delete All Slots</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteSingleSlot(showId) {
  if (!confirm('Are you sure you want to delete this specific time slot?')) return;

  try {
    await ApiClient.deleteShow(showId);
    showToast('Showtime slot deleted successfully.', 'info');
    loadShowtimes();
  } catch (err) {
    showToast('Failed to delete time slot: ' + err.message, 'error');
  }
}

function deleteIndividualShowSlot(showId) {
  deleteSingleSlot(showId);
}

async function deleteGroupedShowSlots(groupKey) {
  const parts = groupKey.split('_');
  const dateOnly = parts[0];
  const movieId = parts[1];
  const theaterId = parts[2];
  const expFormat = parts.slice(3).join('_');

  const slotsToDelete = (showtimesList || []).filter(s => {
    const sDate = s.startTime ? String(s.startTime).split('T')[0] : '';
    const sMovieId = s.movie ? s.movie.id : s.movieId;
    const sTheaterId = s.screen && s.screen.theater ? s.screen.theater.id : s.theaterId;
    const sExp = s.experience || s.movieFormatTags || 'DOLBY ATMOS';
    return String(sDate) === String(dateOnly) && 
           String(sMovieId) === String(movieId) && 
           String(sTheaterId) === String(theaterId) && 
           String(sExp) === String(expFormat);
  });

  if (slotsToDelete.length === 0) return;

  if (!confirm(`Are you sure you want to delete ALL ${slotsToDelete.length} time slot(s) for this screening schedule?`)) return;

  try {
    for (const s of slotsToDelete) {
      await ApiClient.deleteShow(s.id);
    }
    showToast(`Deleted ${slotsToDelete.length} showtime slot(s) successfully.`, 'info');
    loadShowtimes();
  } catch (err) {
    showToast('Failed to delete showtime group: ' + err.message, 'error');
  }
}

function openAddSingleSlotModal(dateStr, movieId, theaterId, screenId, experience, price) {
  document.getElementById('addSlotDate').value = dateStr;
  document.getElementById('addSlotMovieId').value = movieId;
  document.getElementById('addSlotTheaterId').value = theaterId;
  document.getElementById('addSlotScreenId').value = screenId || 1;
  document.getElementById('addSlotExperience').value = experience || 'DOLBY ATMOS';
  document.getElementById('addSlotPrice').value = price || 1500.0;

  const movie = (bulkCatalogMovies || []).find(m => String(m.id) === String(movieId));
  const movieTitle = movie ? movie.title : ('Movie #' + movieId);

  const infoEl = document.getElementById('addSlotInfoText');
  if (infoEl) {
    infoEl.innerHTML = `<strong>${escapeHtml(movieTitle.toUpperCase())}</strong><br>` +
                       `📅 Date: ${escapeHtml(formatDateDisplay(dateStr))}<br>` +
                       `🛋️ Format: ${escapeHtml(experience)} | Price: LKR ${parseFloat(price).toFixed(2)}`;
  }

  openModal('addSlotModal');
}

async function handleSaveSingleSlot(event) {
  event.preventDefault();
  const dateStr = document.getElementById('addSlotDate').value;
  const movieId = parseInt(document.getElementById('addSlotMovieId').value);
  const screenId = parseInt(document.getElementById('addSlotScreenId').value) || 1;
  const experience = document.getElementById('addSlotExperience').value;
  const price = parseFloat(document.getElementById('addSlotPrice').value) || 1500.0;
  const timeVal = document.getElementById('addSlotTimeInput').value;

  if (!timeVal) {
    showToast('Please specify a time slot.', 'warning');
    return;
  }

  const startTimeIso = `${dateStr}T${timeVal}:00`;

  const payload = {
    movieId: movieId,
    screenId: screenId,
    startTime: startTimeIso,
    endTime: startTimeIso,
    ticketPrice: price,
    experience: experience,
    movieFormatTags: experience
  };

  try {
    await ApiClient.createShow(payload);
    showToast(`Added showtime slot (${formatTimeDisplay(timeVal)}) successfully!`, 'success');
    closeModal('addSlotModal');
    loadShowtimes();
  } catch (err) {
    showToast('Failed to add time slot: ' + err.message, 'error');
  }
}

async function openShowtimeFormModal(showData = null) {
  openBulkShowSchedulerModal();
}

async function openBulkShowSchedulerModal() {
  const form = document.getElementById('bulkShowForm');
  if (form) form.reset();

  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const startDateInput = document.getElementById('bStartDate');
  const endDateInput = document.getElementById('bEndDate');
  if (startDateInput) startDateInput.value = today.toISOString().split('T')[0];
  if (endDateInput) endDateInput.value = nextWeek.toISOString().split('T')[0];

  bulkSelectedTimes = ["10:30", "13:45", "17:15", "20:30"];
  bulkSelectedExperiences = ["DOLBY ATMOS"];
  bulkDateSelectionMode = "RANGE";
  bulkSpecificDates = [];

  toggleBulkDateMode('RANGE');

  try {
    const movieRes = await ApiClient.getMovies();
    const movies = (movieRes && movieRes.data) ? movieRes.data : (Array.isArray(movieRes) ? movieRes : []);
    bulkCatalogMovies = movies;

    const movieSelect = document.getElementById('bMovieSelect');
    if (movieSelect) {
      movieSelect.innerHTML = movies.map(m => `
        <option value="${m.id}">${escapeHtml(m.title.toUpperCase())}</option>
      `).join('');
    }
    onBulkMovieChange();
  } catch (err) {
    console.warn('Could not fetch movies for bulk scheduler:', err);
  }

  try {
    let cinemaRes = null;
    if (ApiClient.getCinemas) cinemaRes = await ApiClient.getCinemas();
    else cinemaRes = await ApiClient.getTheaters();
    const cinemas = (cinemaRes && cinemaRes.data) ? cinemaRes.data : (Array.isArray(cinemaRes) ? cinemaRes : []);

    if (cinemas.length === 0) {
      bulkCatalogCinemas = [
        { id: 1, name: "CineX Multiplex - Colombo City Centre", location: "Colombo 02" },
        { id: 2, name: "CineX - Havelock City Mall", location: "Colombo 05" },
        { id: 3, name: "CineX - Liberty Plaza", location: "Colombo 03" },
        { id: 4, name: "CineX - Kiribathgoda", location: "Kiribathgoda" }
      ];
    } else {
      bulkCatalogCinemas = cinemas;
    }

    bulkSelectedCinemaIds = bulkCatalogCinemas.map(c => c.id);
    renderBulkCinemaChips();
  } catch (err) {
    console.warn('Could not fetch cinemas for bulk scheduler:', err);
  }

  renderBulkExperiencePills();
  renderTimeTagChips();
  renderSpecificDateChips();
  updateBulkSummary();

  openModal('showtimeModal');
}

function toggleBulkDateMode(mode) {
  bulkDateSelectionMode = mode;
  const rangeContainer = document.getElementById('bDateRangeContainer');
  const specificContainer = document.getElementById('bSpecificDatesContainer');

  const rangeRadio = document.querySelector('input[name="bDateMode"][value="RANGE"]');
  const specificRadio = document.querySelector('input[name="bDateMode"][value="SPECIFIC"]');
  if (rangeRadio && mode === 'RANGE') rangeRadio.checked = true;
  if (specificRadio && mode === 'SPECIFIC') specificRadio.checked = true;

  if (mode === 'SPECIFIC') {
    if (rangeContainer) rangeContainer.style.display = 'none';
    if (specificContainer) specificContainer.style.display = 'block';
  } else {
    if (rangeContainer) rangeContainer.style.display = 'flex';
    if (specificContainer) specificContainer.style.display = 'none';
  }
  updateBulkSummary();
}

function addSpecificDateFromInput() {
  const dateInput = document.getElementById('bSpecificDateInput');
  if (!dateInput || !dateInput.value) return;

  const dVal = dateInput.value;
  if (!bulkSpecificDates.includes(dVal)) {
    bulkSpecificDates.push(dVal);
    bulkSpecificDates.sort();
    renderSpecificDateChips();
    updateBulkSummary();
  } else {
    showToast('Date already added to list.', 'warning');
  }
}

function removeSpecificDate(index) {
  if (index >= 0 && index < bulkSpecificDates.length) {
    bulkSpecificDates.splice(index, 1);
    renderSpecificDateChips();
    updateBulkSummary();
  }
}

function renderSpecificDateChips() {
  const container = document.getElementById('bSpecificDatesTagsContainer');
  if (!container) return;

  if (bulkSpecificDates.length === 0) {
    container.innerHTML = `<span style="font-size: 0.8rem; color: #888;">No specific dates added. Select a date above and click "+ Add Date".</span>`;
    return;
  }

  container.innerHTML = bulkSpecificDates.map((dVal, index) => `
    <div class="time-tag-chip" style="background: rgba(229, 9, 20, 0.15); border-color: rgba(229, 9, 20, 0.4);">
      <span>📅 ${escapeHtml(formatDateDisplay(dVal))}</span>
      <span class="remove-icon" onclick="removeSpecificDate(${index})" title="Remove date">&times;</span>
    </div>
  `).join('');
}

function onBulkMovieChange() {
  const movieSelect = document.getElementById('bMovieSelect');
  if (!movieSelect || bulkCatalogMovies.length === 0) return;

  const selectedId = movieSelect.value;
  const movie = bulkCatalogMovies.find(m => String(m.id) === String(selectedId)) || bulkCatalogMovies[0];

  const posterImg = document.getElementById('bMoviePoster');
  const titleEl = document.getElementById('bMovieTitle');
  const metaEl = document.getElementById('bMovieMeta');

  if (posterImg) {
    posterImg.src = movie.posterUrl || movie.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80';
    posterImg.alt = movie.title || 'Movie Poster';
  }
  if (titleEl) titleEl.innerText = (movie.title || 'UNKNOWN MOVIE').toUpperCase();
  if (metaEl) {
    const genre = movie.genre || 'ACTION / ADVENTURE';
    const duration = movie.durationMins ? `${movie.durationMins} MINS` : '140 MINS';
    const format = movie.formatTags || 'DOLBY ATMOS';
    metaEl.innerText = `${genre} • ${duration} • ${format}`;
  }
}

function setBulkDatePreset(days) {
  toggleBulkDateMode('RANGE');
  const startDateInput = document.getElementById('bStartDate');
  const endDateInput = document.getElementById('bEndDate');
  if (!startDateInput || !endDateInput) return;

  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + days);

  startDateInput.value = start.toISOString().split('T')[0];
  endDateInput.value = end.toISOString().split('T')[0];
  updateBulkSummary();
}

function renderBulkCinemaChips() {
  const container = document.getElementById('bCinemasContainer');
  if (!container) return;

  container.innerHTML = bulkCatalogCinemas.map(c => {
    const isSelected = bulkSelectedCinemaIds.includes(c.id);
    return `
      <div class="cinema-checkbox-chip ${isSelected ? 'active' : ''}" onclick="toggleCinemaChip(${c.id})">
        <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleCinemaChip(${c.id});">
        <span>${escapeHtml(c.name)}</span>
      </div>
    `;
  }).join('');
}

function toggleCinemaChip(cinemaId) {
  const index = bulkSelectedCinemaIds.indexOf(cinemaId);
  if (index > -1) {
    bulkSelectedCinemaIds.splice(index, 1);
  } else {
    bulkSelectedCinemaIds.push(cinemaId);
  }
  renderBulkCinemaChips();
  updateBulkSummary();
}

function renderBulkExperiencePills() {
  const container = document.getElementById('bExperiencesContainer');
  if (!container) return;

  const allExperiences = ["DOLBY ATMOS", "GOLD CLASS", "DIGITAL 3D", "DIGITAL 2D", "IMAX 3D"];
  container.innerHTML = allExperiences.map(exp => {
    const isSelected = bulkSelectedExperiences.includes(exp);
    return `
      <div class="exp-pill-chip ${isSelected ? 'active' : ''}" onclick="toggleExperiencePill('${exp}')">
        ${escapeHtml(exp)}
      </div>
    `;
  }).join('');
}

function toggleExperiencePill(expName) {
  const index = bulkSelectedExperiences.indexOf(expName);
  if (index > -1) {
    if (bulkSelectedExperiences.length > 1) {
      bulkSelectedExperiences.splice(index, 1);
    } else {
      showToast('At least one experience format must remain selected.', 'warning');
      return;
    }
  } else {
    bulkSelectedExperiences.push(expName);
  }
  renderBulkExperiencePills();
  updateBulkSummary();
}

function renderTimeTagChips() {
  const container = document.getElementById('bTimeTagsContainer');
  if (!container) return;

  if (bulkSelectedTimes.length === 0) {
    container.innerHTML = `<span style="font-size: 0.8rem; color: #888;">No time slots added. Use "+ Add Time" above to add slots.</span>`;
    return;
  }

  container.innerHTML = bulkSelectedTimes.map((timeVal, index) => {
    const formatted = formatTimeDisplay(timeVal);
    return `
      <div class="time-tag-chip">
        <span>${escapeHtml(formatted)}</span>
        <span class="remove-icon" onclick="removeBulkTimeSlot(${index})" title="Delete slot">&times;</span>
      </div>
    `;
  }).join('');
}

function addBulkTimeSlotFromInput() {
  const input = document.getElementById('bTimeInput');
  if (!input || !input.value) return;

  const timeVal = input.value;
  if (!bulkSelectedTimes.includes(timeVal)) {
    bulkSelectedTimes.push(timeVal);
    bulkSelectedTimes.sort();
    renderTimeTagChips();
    updateBulkSummary();
  } else {
    showToast('Time slot already exists.', 'warning');
  }
}

function removeBulkTimeSlot(index) {
  if (index >= 0 && index < bulkSelectedTimes.length) {
    bulkSelectedTimes.splice(index, 1);
    renderTimeTagChips();
    updateBulkSummary();
  }
}

function applyStandardTimeSlotsPreset() {
  bulkSelectedTimes = ["10:30", "13:45", "17:15", "20:30"];
  renderTimeTagChips();
  updateBulkSummary();
  showToast('Applied standard 4-show daily schedule.', 'info');
}

function formatTimeDisplay(timeVal) {
  if (!timeVal) return '';
  if (timeVal.includes(':') && !timeVal.includes('M')) {
    const parts = timeVal.split(':');
    let hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    const formattedHrs = String(hrs).padStart(2, '0');
    return `${formattedHrs}:${mins} ${ampm}`;
  }
  return timeVal;
}

function updateBulkSummary() {
  const summaryBox = document.getElementById('bulkSummaryBox');
  if (!summaryBox) return;

  let days = 0;
  if (bulkDateSelectionMode === 'SPECIFIC') {
    days = bulkSpecificDates.length;
  } else {
    const startVal = document.getElementById('bStartDate')?.value;
    const endVal = document.getElementById('bEndDate')?.value;
    if (startVal && endVal) {
      const d1 = new Date(startVal);
      const d2 = new Date(endVal);
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      days = diff > 0 ? diff : 0;
    }
  }

  const cinemasCount = bulkSelectedCinemaIds.length;
  const experiencesCount = bulkSelectedExperiences.length;
  const timesCount = bulkSelectedTimes.length;
  const totalSessions = days * cinemasCount * experiencesCount * timesCount;

  if (days <= 0) {
    summaryBox.innerHTML = `⚠️ Please select target dates (${bulkDateSelectionMode === 'SPECIFIC' ? 'add at least 1 date' : 'set Start & End date'}).`;
    summaryBox.style.background = 'rgba(255, 165, 0, 0.15)';
    summaryBox.style.borderColor = 'rgba(255, 165, 0, 0.4)';
  } else if (cinemasCount === 0 || timesCount === 0) {
    summaryBox.innerHTML = `⚠️ Please select at least 1 Cinema location and 1 Time slot tag.`;
    summaryBox.style.background = 'rgba(255, 165, 0, 0.15)';
    summaryBox.style.borderColor = 'rgba(255, 165, 0, 0.4)';
  } else {
    summaryBox.innerHTML = `⚡ Ready to Generate &amp; Publish <strong>${totalSessions}</strong> Showtime Sessions (${days} ${bulkDateSelectionMode === 'SPECIFIC' ? 'Specific' : ''} Days × ${cinemasCount} Cinemas × ${experiencesCount} Formats × ${timesCount} Time Slots)`;
    summaryBox.style.background = 'linear-gradient(135deg, rgba(229, 9, 20, 0.2) 0%, rgba(20, 20, 20, 0.9) 100%)';
    summaryBox.style.borderColor = 'rgba(229, 9, 20, 0.4)';
  }
}

async function handleGenerateAndPublishShows(event) {
  event.preventDefault();

  if (bulkSelectedCinemaIds.length === 0) {
    showToast('Please select at least one Cinema Location.', 'warning');
    return;
  }

  if (bulkSelectedTimes.length === 0) {
    showToast('Please add at least one Showtime slot tag.', 'warning');
    return;
  }

  const movieId = parseInt(document.getElementById('bMovieSelect').value);
  const startDate = document.getElementById('bStartDate')?.value;
  const endDate = document.getElementById('bEndDate')?.value;
  const ticketPrice = parseFloat(document.getElementById('bTicketPrice').value) || 1500.00;

  if (bulkDateSelectionMode === 'RANGE' && (!startDate || !endDate)) {
    showToast('Please specify both Start Date and End Date for Date Range mode.', 'warning');
    return;
  }

  if (bulkDateSelectionMode === 'SPECIFIC' && bulkSpecificDates.length === 0) {
    showToast('Please add at least one specific date.', 'warning');
    return;
  }

  const payload = {
    movieId: movieId,
    dateSelectionMode: bulkDateSelectionMode,
    startDate: startDate,
    endDate: endDate,
    specificDates: bulkSpecificDates,
    cinemaIds: bulkSelectedCinemaIds,
    experiences: bulkSelectedExperiences,
    times: bulkSelectedTimes,
    ticketPrice: ticketPrice
  };

  const btn = document.getElementById('btnGenerateBulkShows');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Publishing Showtimes...';
  }

  try {
    let count = 0;
    if (typeof ApiClient !== 'undefined' && ApiClient.createBulkShows) {
      const res = await ApiClient.createBulkShows(payload);
      count = (res && res.data) ? res.data.length : 1;
    }

    showToast(`🎉 Generated & Published ${count} showtimes successfully!`, 'success');
    closeModal('showtimeModal');
    loadShowtimes();
  } catch (err) {
    console.warn('Bulk endpoint error, attempting fallback dispatcher:', err);
    try {
      let createdCount = 0;
      const targetDates = bulkDateSelectionMode === 'SPECIFIC' ? bulkSpecificDates : [startDate];
      for (const dVal of targetDates) {
        for (const cinemaId of bulkSelectedCinemaIds) {
          for (const exp of bulkSelectedExperiences) {
            for (const timeStr of bulkSelectedTimes) {
              const singlePayload = {
                movieId: movieId,
                screenId: cinemaId,
                startTime: `${dVal}T${timeStr}:00`,
                endTime: `${dVal}T${timeStr}:00`,
                ticketPrice: ticketPrice,
                experience: exp,
                movieFormatTags: exp
              };
              await ApiClient.createShow(singlePayload);
              createdCount++;
            }
          }
        }
      }
      showToast(`🎉 Generated & Published ${createdCount} showtimes successfully!`, 'success');
      closeModal('showtimeModal');
      loadShowtimes();
    } catch (batchErr) {
      showToast('Bulk show scheduling failed: ' + batchErr.message, 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Generate & Publish Shows';
    }
  }
}

function editShowtime(id) {
  openBulkShowSchedulerModal();
}

async function confirmDeleteShowtime(id) {
  if (!confirm('Are you sure you want to delete this scheduled showtime?')) return;

  try {
    await ApiClient.deleteShow(id);
    showToast('Showtime deleted successfully.', 'info');
    loadShowtimes();
  } catch (err) {
    showToast('Failed to delete showtime: ' + err.message, 'error');
  }
}

window.escapeHtml = escapeHtml;
window.switchTab = switchTab;
window.closeModal = closeModal;
window.openModal = openModal;

window.openMovieFormModal = openMovieFormModal;
window.editMovie = editMovie;
window.handleSaveMovie = handleSaveMovie;
window.toggleHeroFeatured = toggleHeroFeatured;
window.confirmDeleteMovie = confirmDeleteMovie;

window.openExperienceFormModal = openExperienceFormModal;
window.editExperience = editExperience;
window.handleSaveExperience = handleSaveExperience;
window.confirmDeleteExperience = confirmDeleteExperience;

window.openOfferFormModal = openOfferFormModal;
window.editOffer = editOffer;
window.handleSaveOffer = handleSaveOffer;
window.confirmDeleteOffer = confirmDeleteOffer;

window.openCinemaFormModal = openCinemaFormModal;
window.editCinema = editCinema;
window.handleSaveCinema = handleSaveCinema;
window.confirmDeleteCinema = confirmDeleteCinema;

window.openShowtimeFormModal = openShowtimeFormModal;
window.openBulkShowSchedulerModal = openBulkShowSchedulerModal;
window.onBulkMovieChange = onBulkMovieChange;
window.setBulkDatePreset = setBulkDatePreset;
window.toggleCinemaChip = toggleCinemaChip;
window.toggleExperiencePill = toggleExperiencePill;
window.addBulkTimeSlotFromInput = addBulkTimeSlotFromInput;
window.removeBulkTimeSlot = removeBulkTimeSlot;
window.applyStandardTimeSlotsPreset = applyStandardTimeSlotsPreset;
window.updateBulkSummary = updateBulkSummary;
window.handleGenerateAndPublishShows = handleGenerateAndPublishShows;
window.editShowtime = editShowtime;
window.confirmDeleteShowtime = confirmDeleteShowtime;
window.renderShowtimesTable = renderShowtimesTable;
window.resetAdminShowFilters = resetAdminShowFilters;
window.deleteSingleSlot = deleteSingleSlot;
window.deleteIndividualShowSlot = deleteIndividualShowSlot;
window.deleteGroupedShowSlots = deleteGroupedShowSlots;
window.groupShows = groupShows;
window.toggleBulkDateMode = toggleBulkDateMode;
window.addSpecificDateFromInput = addSpecificDateFromInput;
window.removeSpecificDate = removeSpecificDate;
window.openAddSingleSlotModal = openAddSingleSlotModal;
window.handleSaveSingleSlot = handleSaveSingleSlot;

let currentConcessionFilter = 'ALL';
let allConcessionsData = [];

async function loadAdminConcessions() {
  const tableBody = document.getElementById('concessionsTableBody');
  if (!tableBody) return;

  try {
    const res = await ApiClient.getConcessions(null, true);
    allConcessionsData = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    renderAdminConcessionsTable();
  } catch (err) {
    showToast(err.message || 'Failed to load concessions catalog.', 'error');
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:#ef4444;">Error loading concessions: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function filterAdminConcessions(category, btnElement) {
  currentConcessionFilter = category;
  if (btnElement && btnElement.parentElement) {
    const pills = btnElement.parentElement.querySelectorAll('.filter-pill');
    pills.forEach(p => p.classList.remove('active'));
    btnElement.classList.add('active');
  }
  renderAdminConcessionsTable();
}

function renderAdminConcessionsTable() {
  const tableBody = document.getElementById('concessionsTableBody');
  if (!tableBody) return;

  let filtered = allConcessionsData;
  if (currentConcessionFilter !== 'ALL') {
    filtered = allConcessionsData.filter(c => 
      (c.category || '').toUpperCase() === currentConcessionFilter.toUpperCase()
    );
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color:#888;">No concessions items found for selected filter.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(c => {
    const categoryClass = (c.category || '').toLowerCase().replace('_', '-');
    const priceFormatted = typeof c.price === 'number' ? c.price.toFixed(2) : '0.00';
    const isAvailable = c.isAvailable !== false;

    return `
      <tr>
        <td>
          <img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.name)}" class="table-img-thumb" onerror="this.src='https://placehold.co/80x80/1e293b/64748b?text=F%26B'">
        </td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><span class="category-badge cat-${categoryClass}">${escapeHtml(c.category)}</span></td>
        <td><strong>LKR ${priceFormatted}</strong></td>
        <td><span class="desc-truncate" title="${escapeHtml(c.description || '')}">${escapeHtml(c.description || '-')}</span></td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label class="toggle-switch">
              <input type="checkbox" ${isAvailable ? 'checked' : ''} onchange="toggleConcessionAvailability(${c.id})">
              <span class="toggle-slider"></span>
            </label>
            <span class="stock-status-text ${isAvailable ? 'in-stock' : 'out-of-stock'}">
              ${isAvailable ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-secondary" onclick="openConcessionFormModal(${c.id})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteConcession(${c.id}, '${escapeHtml(c.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateConcessionImagePreview(url) {
  const imgEl = document.getElementById('cImagePreview');
  const placeholderEl = document.getElementById('cImagePlaceholder');
  if (!imgEl || !placeholderEl) return;

  if (url && url.trim().length > 5) {
    imgEl.src = url.trim();
    imgEl.style.display = 'block';
    placeholderEl.style.display = 'none';
    imgEl.onerror = () => {
      imgEl.style.display = 'none';
      placeholderEl.style.display = 'inline';
      placeholderEl.innerText = 'Failed to load image preview';
    };
  } else {
    imgEl.style.display = 'none';
    placeholderEl.style.display = 'inline';
    placeholderEl.innerText = 'Enter image URL to view preview';
  }
}

function openConcessionFormModal(id = null) {
  const form = document.getElementById('concessionForm');
  const modalTitle = document.getElementById('concessionModalTitle');
  if (!form) return;

  form.reset();

  if (id) {
    const item = allConcessionsData.find(c => c.id === id);
    if (item) {
      if (modalTitle) modalTitle.innerText = 'Edit Concession Item';
      document.getElementById('cId').value = item.id;
      document.getElementById('cName').value = item.name || '';
      document.getElementById('cCategory').value = item.category || 'POPCORN';
      document.getElementById('cPrice').value = item.price || '';
      document.getElementById('cImageUrl').value = item.imageUrl || '';
      document.getElementById('cDescription').value = item.description || '';
      document.getElementById('cIsAvailable').checked = item.isAvailable !== false;
      updateConcessionImagePreview(item.imageUrl || '');
    }
  } else {
    if (modalTitle) modalTitle.innerText = '+ Add Concession Item';
    document.getElementById('cId').value = '';
    document.getElementById('cIsAvailable').checked = true;
    updateConcessionImagePreview('');
  }

  openModal('concessionModal');
}

async function handleSaveConcession(event) {
  event.preventDefault();
  const btnSave = document.getElementById('btnSaveConcession');
  if (btnSave) btnSave.disabled = true;

  const id = document.getElementById('cId').value;
  const concessionData = {
    name: document.getElementById('cName').value.trim(),
    category: document.getElementById('cCategory').value,
    price: parseFloat(document.getElementById('cPrice').value),
    imageUrl: document.getElementById('cImageUrl').value.trim(),
    description: document.getElementById('cDescription').value.trim(),
    isAvailable: document.getElementById('cIsAvailable').checked
  };

  try {
    if (id) {
      await ApiClient.updateConcession(id, concessionData);
      showToast('Concession item updated successfully!', 'success');
    } else {
      await ApiClient.createConcession(concessionData);
      showToast('Concession item added successfully!', 'success');
    }
    closeModal('concessionModal');
    loadAdminConcessions();
  } catch (err) {
    showToast(err.message || 'Failed to save concession item.', 'error');
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

async function toggleConcessionAvailability(id) {
  try {
    await ApiClient.toggleConcessionAvailability(id);
    showToast('Stock availability updated!', 'success');
    loadAdminConcessions();
  } catch (err) {
    showToast(err.message || 'Failed to toggle availability status.', 'error');
    loadAdminConcessions();
  }
}

async function confirmDeleteConcession(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}" from concessions?`)) {
    return;
  }

  try {
    await ApiClient.deleteConcession(id);
    showToast(`"${name}" deleted successfully.`, 'success');
    loadAdminConcessions();
  } catch (err) {
    showToast(err.message || 'Failed to delete concession item.', 'error');
  }
}

window.loadAdminConcessions = loadAdminConcessions;
window.filterAdminConcessions = filterAdminConcessions;
window.renderAdminConcessionsTable = renderAdminConcessionsTable;
window.updateConcessionImagePreview = updateConcessionImagePreview;
window.openConcessionFormModal = openConcessionFormModal;
window.handleSaveConcession = handleSaveConcession;
window.toggleConcessionAvailability = toggleConcessionAvailability;
window.confirmDeleteConcession = confirmDeleteConcession;


