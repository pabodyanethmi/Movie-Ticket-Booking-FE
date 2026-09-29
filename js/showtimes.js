const filterState = {
  movieId: null,
  date: null,
  experience: 'ALL',
  location: 'ALL'
};

const bookingState = {
  showId: null,
  ticketCount: 1
};

let currentSelectedDate = getTodayDateString();
let nowShowingMovies = [];
let selectedMovie = null;
let showtimesData = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupGlobalEventListeners();
  initDateCarousel();
  initTicketModalEvents();

  const urlParams = new URLSearchParams(window.location.search);
  const movieIdParam = urlParams.get('movieId') || urlParams.get('id');

  await loadNowShowingMovies(movieIdParam);
  setupFilterEventListeners();
});

function setupGlobalEventListeners() {
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          window.location.href = `movies.html?search=${encodeURIComponent(q)}`;
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
}

function initDateCarousel() {
  const track = document.getElementById('dateCarousel');
  if (!track) return;

  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateNum = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${dateNum}`;

    let dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    if (i === 0) dayName = 'TODAY';

    const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dateLabel = `${dateNum} ${monthName}`;

    dates.push({ isoDate, dayName, dateLabel, isToday: i === 0 });
  }

  currentSelectedDate = dates[0].isoDate;
  filterState.date = currentSelectedDate;

  track.innerHTML = dates.map((d, index) => `
    <div class="date-tab ${index === 0 ? 'active' : ''}" data-date="${d.isoDate}" onclick="onSelectDate(this, '${d.isoDate}')">
      <span class="date-tab-day">${d.dayName}</span>
      <span class="date-tab-date">${d.dateLabel}</span>
    </div>
  `).join('');
}

function onSelectDate(element, isoDate) {
  currentSelectedDate = isoDate;
  filterState.date = isoDate;

  document.querySelectorAll('.date-tab').forEach(tab => tab.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    const tabEl = document.querySelector(`.date-tab[data-date="${isoDate}"]`);
    if (tabEl) tabEl.classList.add('active');
  }

  loadAndRenderShowtimes();
}

async function loadNowShowingMovies(preferredMovieId) {
  try {
    let movies = [];
    if (typeof ApiClient !== 'undefined' && ApiClient.getNowShowingMovies) {
      const res = await ApiClient.getNowShowingMovies();
      if (res && res.data && res.data.length > 0) {
        movies = res.data;
      }
    }

    if (movies.length === 0 && typeof ApiClient !== 'undefined' && ApiClient.getMovies) {
      const res = await ApiClient.getMovies('', '', 'NOW_SHOWING');
      if (res && res.data && res.data.length > 0) {
        movies = res.data;
      }
    }

    nowShowingMovies = movies;
    populateMovieDropdown(preferredMovieId);
  } catch (err) {
    console.warn('Failed to load now showing movies from database API:', err);
    nowShowingMovies = [];
    populateMovieDropdown(preferredMovieId);
  }
}

function populateMovieDropdown(preferredMovieId) {
  const dropdown = document.getElementById('movieSelectorDropdown');
  if (!dropdown) return;

  if (nowShowingMovies.length === 0) {
    dropdown.innerHTML = `<option value="">No Movies Available</option>`;
    selectedMovie = null;
    const container = document.getElementById('cinemasShowtimesContainer');
    if (container) {
      container.innerHTML = `<div class="no-shows-alert">No screenings scheduled for this date. Please select another date or check back later.</div>`;
    }
    return;
  }

  if (preferredMovieId) {
    selectedMovie = nowShowingMovies.find(m => String(m.id) === String(preferredMovieId)) || nowShowingMovies[0];
  } else {
    selectedMovie = nowShowingMovies[0];
  }

  filterState.movieId = selectedMovie.id;

  dropdown.innerHTML = nowShowingMovies.map(m => `
    <option value="${m.id}" ${m.id === selectedMovie.id ? 'selected' : ''}>
      ${escapeHtml(m.title.toUpperCase())}
    </option>
  `).join('');

  dropdown.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      window.location.href = `showtimes.html?movieId=${val}`;
    }
  });

  updateHeaderStrip(selectedMovie);
  loadAndRenderShowtimes();
}

function updateHeaderStrip(movie) {
  if (!movie) return;
  const posterImg = document.getElementById('stripPoster');
  const subtitleEl = document.getElementById('stripSubtitle');

  if (posterImg) {
    posterImg.src = movie.posterUrl || movie.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80';
    posterImg.alt = movie.title || 'Movie Poster';
  }

  if (subtitleEl) {
    const genre = movie.genre || 'ACTION / ADVENTURE';
    const duration = movie.durationMins ? formatDuration(movie.durationMins) : '2H 30MIN';
    const format = movie.formatTags || 'DOLBY ATMOS';
    subtitleEl.innerText = `${genre}, ${duration} | ${format}`;
  }
}

function setupFilterEventListeners() {
  const expFilter = document.getElementById('experienceFilter');
  const locFilter = document.getElementById('locationFilter');

  if (expFilter) {
    expFilter.addEventListener('change', (e) => {
      filterState.experience = e.target.value;
      renderShowtimesGrid();
    });
  }

  if (locFilter) {
    locFilter.addEventListener('change', (e) => {
      filterState.location = e.target.value;
      renderShowtimesGrid();
    });
  }
}

async function loadAndRenderShowtimes() {
  const container = document.getElementById('cinemasShowtimesContainer');
  if (!container) return;

  if (!selectedMovie) {
    container.innerHTML = `<div class="no-shows-alert">No screenings scheduled for this date. Please select another date or check back later.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="padding: 60px 20px; text-align: center; color: var(--text-muted);">
      <div class="spinner-border text-danger" role="status" style="width: 2rem; height: 2rem; border-width: 0.2em; border-right-color: transparent; border-radius: 50%; animation: spin 0.75s linear infinite; margin: 0 auto 16px auto;"></div>
      <div>Loading available showtimes from database...</div>
    </div>
  `;

  try {
    let shows = [];
    const targetDate = currentSelectedDate || filterState.date;
    if (typeof ApiClient !== 'undefined' && ApiClient.getShows && selectedMovie) {
      const res = await ApiClient.getShows(selectedMovie.id, null, targetDate);
      if (res && res.data) {
        shows = Array.isArray(res.data) ? res.data : [];
      } else if (Array.isArray(res)) {
        shows = res;
      }
    }

    showtimesData = shows;
    renderShowtimesGrid();
  } catch (err) {
    console.warn('Failed to fetch showtimes from database:', err);
    showtimesData = [];
    renderShowtimesGrid();
  }
}

function renderShowtimesGrid() {
  const container = document.getElementById('cinemasShowtimesContainer');
  if (!container) return;

  if (!showtimesData || showtimesData.length === 0) {
    container.innerHTML = `<div class="no-shows-alert">No screenings scheduled for this date. Please select another date or check back later.</div>`;
    return;
  }

  const targetDate = currentSelectedDate || filterState.date;

  const activeDateShows = showtimesData.filter(show => {
    if (!show.startTime) return false;
    const showDateOnly = extractDateString(show.startTime);
    return showDateOnly === targetDate;
  });

  const filteredShows = activeDateShows.filter(show => {
    let matchExp = true;
    let matchLoc = true;

    if (filterState.experience && filterState.experience !== 'ALL') {
      const expTags = (show.experience || show.movieFormatTags || show.experienceName || show.format || '').toUpperCase();
      matchExp = expTags.includes(filterState.experience.toUpperCase());
    }

    if (filterState.location && filterState.location !== 'ALL') {
      const locStr = (show.theaterLocation || show.theaterName || '').toUpperCase();
      matchLoc = locStr.includes(filterState.location.toUpperCase());
    }

    return matchExp && matchLoc;
  });

  if (filteredShows.length === 0) {
    container.innerHTML = `<div class="no-shows-alert">No screenings scheduled for this date. Please select another date or check back later.</div>`;
    return;
  }

  const groupedByTheater = {};

  filteredShows.forEach(show => {
    const theaterKey = show.theaterName || show.theaterLocation || 'CineX Multiplex - Main Screen';
    if (!groupedByTheater[theaterKey]) {
      groupedByTheater[theaterKey] = {
        name: theaterKey,
        location: show.theaterLocation || 'Colombo',
        experiences: {}
      };
    }

    const expKey = show.experience || show.movieFormatTags || show.experienceName || 'DOLBY ATMOS';
    if (!groupedByTheater[theaterKey].experiences[expKey]) {
      groupedByTheater[theaterKey].experiences[expKey] = [];
    }

    groupedByTheater[theaterKey].experiences[expKey].push(show);
  });

  container.innerHTML = Object.values(groupedByTheater).map(theater => {
    const expStripsHtml = Object.entries(theater.experiences).map(([expTitle, showsList]) => {
      const uniqueTimes = [];
      const renderedShows = [];

      showsList.forEach(show => {
        const timeStr = formatShowTime(show.startTime);
        if (!uniqueTimes.includes(timeStr)) {
          uniqueTimes.push(timeStr);
          renderedShows.push(show);
        }
      });

      const parseTime = (t) => {
        if (!t) return 0;
        const dObj = new Date(t);
        if (!isNaN(dObj.getTime())) return dObj.getTime();
        const fallback = new Date(`1970/01/01 ${t}`);
        return !isNaN(fallback.getTime()) ? fallback.getTime() : 0;
      };

      renderedShows.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

      const now = new Date();

      const pillsHtml = renderedShows.map(show => {
        const timeStr = formatShowTime(show.startTime);
        const fmtSubtag = getFormatSubtag(expTitle);

        let showDateTime = null;
        if (show.startTime) {
          if (typeof show.startTime === 'string') {
            if (show.startTime.includes('T')) {
              showDateTime = new Date(show.startTime);
            } else if (show.startTime.includes('-')) {
              showDateTime = new Date(show.startTime.replace(' ', 'T'));
            } else if (filterState.date) {
              showDateTime = new Date(`${filterState.date}T${show.startTime}`);
            } else {
              showDateTime = new Date(show.startTime);
            }
          } else {
            showDateTime = new Date(show.startTime);
          }
        }

        const isPast = showDateTime && !isNaN(showDateTime.getTime()) ? (showDateTime < now) : false;

        if (isPast) {
          return `
            <div class="scope-time-pill disabled" title="Showtime passed (${escapeHtml(timeStr)})" aria-disabled="true">
              <span class="pill-time">${escapeHtml(timeStr)}</span>
              <span class="pill-format">PASSED</span>
            </div>
          `;
        }

        return `
          <button type="button" class="scope-time-pill" onclick="openTicketModal(${show.id})" title="Reserve seat for ${escapeHtml(timeStr)}">
            <span class="pill-time">${escapeHtml(timeStr)}</span>
            <span class="pill-format">${escapeHtml(fmtSubtag)}</span>
          </button>
        `;
      }).join('');

      return `
        <div class="scope-experience-strip">
          <div class="experience-left-banner">
            <div class="exp-title-badge">${escapeHtml(expTitle.toUpperCase())}</div>
            <div class="exp-sub-desc">${escapeHtml(getFormatSubtag(expTitle))} EXPERIENCE</div>
          </div>
          <div class="experience-right-slots">
            ${pillsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="cinema-card">
        <div class="cinema-card-header">
          <svg class="cinema-header-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <h2 class="cinema-name">${escapeHtml(theater.name.toUpperCase())}</h2>
        </div>
        <div class="cinema-experiences-list">
          ${expStripsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function initTicketModalEvents() {
  const closeBtn = document.getElementById('closeTicketModalBtn');
  const modalOverlay = document.getElementById('ticketCountModal');
  const minusBtn = document.getElementById('decreaseTicketBtn');
  const plusBtn = document.getElementById('increaseTicketBtn');
  const confirmBtn = document.getElementById('confirmTicketsBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeTicketModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeTicketModal();
      }
    });
  }

  if (minusBtn) {
    minusBtn.addEventListener('click', () => changeTicketCount(-1));
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', () => changeTicketCount(1));
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmBookingTickets);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && !modalOverlay.classList.contains('hidden')) {
      closeTicketModal();
    }
  });
}

function openTicketModal(showId) {
  bookingState.showId = showId;
  bookingState.ticketCount = 1;

  updateTicketCountUI();

  const modalOverlay = document.getElementById('ticketCountModal');
  if (modalOverlay) {
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeTicketModal() {
  const modalOverlay = document.getElementById('ticketCountModal');
  if (modalOverlay) {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function changeTicketCount(delta) {
  const newCount = bookingState.ticketCount + delta;
  if (newCount >= 1 && newCount <= 10) {
    bookingState.ticketCount = newCount;
    updateTicketCountUI();
  }
}

function updateTicketCountUI() {
  const countDisplay = document.getElementById('ticketCountDisplay');
  const minusBtn = document.getElementById('decreaseTicketBtn');
  const plusBtn = document.getElementById('increaseTicketBtn');

  if (countDisplay) {
    countDisplay.textContent = bookingState.ticketCount;
  }

  if (minusBtn) {
    minusBtn.disabled = bookingState.ticketCount <= 1;
  }

  if (plusBtn) {
    plusBtn.disabled = bookingState.ticketCount >= 10;
  }
}

function confirmBookingTickets() {
  if (!bookingState.showId) return;

  const currentShowId = bookingState.showId;
  const ticketCount = bookingState.ticketCount;

  sessionStorage.setItem('booking_show_id', currentShowId);
  sessionStorage.setItem('booking_ticket_count', ticketCount);

  window.location.href = `seats.html?showId=${currentShowId}&count=${ticketCount}`;
}

window.openTicketModal = openTicketModal;
window.closeTicketModal = closeTicketModal;

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dateNum = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
}

function extractDateString(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0].trim();
    if (val.includes(' ')) return val.split(' ')[0].trim();
    if (val.length >= 10 && val.charAt(4) === '-' && val.charAt(7) === '-') {
      return val.substring(0, 10).trim();
    }
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateNum = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateNum}`;
  }
  return String(val).trim();
}
function formatDuration(mins) {
  if (!mins) return '2H 15MIN';
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}H ${remMins}MIN`;
}

function formatShowTime(timeVal) {
  if (!timeVal) return '10:30 AM';
  if (typeof timeVal === 'string' && timeVal.includes(':') && !timeVal.includes('T') && !timeVal.includes('-')) {
    const parts = timeVal.split(':');
    let hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    const formattedHrs = String(hrs).padStart(2, '0');
    return `${formattedHrs}:${mins} ${ampm}`;
  }
  const dateObj = new Date(timeVal);
  if (isNaN(dateObj.getTime())) {
    const parts = String(timeVal).split('T');
    if (parts.length === 2) {
      const timeParts = parts[1].split(':');
      let hrs = parseInt(timeParts[0]);
      const mins = timeParts[1];
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      const formattedHrs = String(hrs).padStart(2, '0');
      return `${formattedHrs}:${mins} ${ampm}`;
    }
    return String(timeVal);
  }

  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function getFormatSubtag(expTitle) {
  const upper = (expTitle || '').toUpperCase();
  if (upper.includes('3D')) return '3D';
  if (upper.includes('4DX')) return '4DX';
  if (upper.includes('GOLD')) return 'GOLD CLASS';
  return '2D';
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
