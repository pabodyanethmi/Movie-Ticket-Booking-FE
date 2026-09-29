let currentMovieId = null;
let currentMovieData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  setupGlobalEventListeners();

  if (id) {
    currentMovieId = id;
    await loadMovieDetails(id);
    await loadRelatedMovies(id);
  } else {
    showErrorState('No movie specified. Please return to the catalog.');
  }
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

  const trailerModal = document.getElementById('trailerModal');
  if (trailerModal) {
    trailerModal.addEventListener('click', (e) => {
      if (e.target === trailerModal) {
        closeTrailerModal();
      }
    });
  }
}

async function loadMovieDetails(id) {
  try {
    let movie = null;
    if (typeof ApiClient !== 'undefined' && ApiClient.getMovieById) {
      const res = await ApiClient.getMovieById(id);
      movie = res.data || res;
    } else {
      const res = await fetch(`http://localhost:8080/api/v1/movies/${id}`).then(r => r.json());
      movie = res.data || res;
    }

    if (!movie || !movie.title) {
      showErrorState('Movie details not found.');
      return;
    }

    currentMovieData = movie;
    renderMovieDetails(movie);
  } catch (err) {
    console.error('Failed to fetch movie details:', err);
    showErrorState('Could not load movie details from server.');
  }
}

function renderMovieDetails(movie) {
  document.title = `${movie.title} | CineX Cinema`;

  const bgImg = movie.backdropUrl || movie.bannerUrl || movie.posterUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80';
  const heroBg = document.getElementById('detailsHeroBg');
  if (heroBg) {
    heroBg.style.backgroundImage = `url('${bgImg}')`;
  }

  const classTag = document.getElementById('detailsClassificationTag');
  if (classTag) {
    classTag.innerText = movie.classification || 'PG-13';
  }

  const statusBadge = document.getElementById('detailsStatusBadge');
  const releaseIndicator = document.getElementById('detailsReleaseIndicator');
  const isComingSoon = movie.status === 'COMING_SOON';
  const statusText = isComingSoon ? `RELEASING ${formatDate(movie.releaseDate)}` : 'IN THEATERS NOW';

  if (statusBadge) statusBadge.innerText = statusText;
  if (releaseIndicator) releaseIndicator.innerText = statusText;

  const titleEl = document.getElementById('detailsTitle');
  if (titleEl) titleEl.innerText = movie.title;

  const genreStr = movie.genre || 'ACTION / ADVENTURE';
  const durationStr = movie.durationMins ? formatDuration(movie.durationMins) : '2H 15MIN';
  const formatStr = movie.formatTags || 'DOLBY ATMOS / IMAX 3D';
  const langStr = (movie.language || 'ENGLISH').toUpperCase();

  const genreTag = document.getElementById('metaGenre') || document.getElementById('detailsGenreTag');
  const durationTag = document.getElementById('metaDuration') || document.getElementById('detailsDurationTag');
  const formatTag = document.getElementById('metaFormat') || document.getElementById('detailsFormatTag');
  const languageTag = document.getElementById('metaLanguage') || document.getElementById('detailsLanguageTag');

  if (genreTag) genreTag.innerText = genreStr;
  if (durationTag) durationTag.innerText = durationStr;
  if (formatTag) formatTag.innerText = formatStr;
  if (languageTag) languageTag.innerText = langStr;

  const synopsisEl = document.getElementById('detailsSynopsis');
  const directorsEl = document.getElementById('detailsDirectors');
  const castEl = document.getElementById('detailsCast');

  if (synopsisEl) synopsisEl.innerText = movie.synopsis || movie.description || 'No synopsis available for this title.';
  if (directorsEl) directorsEl.innerText = movie.directors || 'Directors information pending.';
  if (castEl) castEl.innerText = movie.cast || 'Cast details pending.';

  const posterImg = document.getElementById('detailsPosterImg');
  if (posterImg) {
    posterImg.src = movie.posterUrl || movie.bannerUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
    posterImg.alt = movie.title;
  }

  const btnWatchTrailer = document.getElementById('btnWatchTrailer');
  const btnBuyTickets = document.getElementById('btnBuyTickets');

  if (btnWatchTrailer) {
    if (movie.trailerUrl) {
      btnWatchTrailer.style.display = 'inline-flex';
      btnWatchTrailer.onclick = () => openTrailer(movie.trailerUrl);
    } else {
      btnWatchTrailer.style.display = 'none';
    }
  }

  if (btnBuyTickets) {
    btnBuyTickets.href = `showtimes.html?movieId=${movie.id}`;
  }
}

async function loadRelatedMovies(currentId) {
  const track = document.getElementById('relatedMoviesTrack');
  if (!track) return;

  try {
    let related = [];
    if (typeof ApiClient !== 'undefined' && ApiClient.getRelatedMovies) {
      const res = await ApiClient.getRelatedMovies(currentId);
      if (res && res.data && res.data.length > 0) {
        related = res.data;
      }
    } else {
      const res = await fetch(`http://localhost:8080/api/v1/movies/${currentId}/related`).then(r => r.json());
      if (res && res.data && res.data.length > 0) {
        related = res.data;
      }
    }

    if (related.length === 0) {
      track.innerHTML = `<div style="padding: 20px; color: var(--text-muted);">No recommendations available right now.</div>`;
      return;
    }

    const fallbackImg = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';

    track.innerHTML = related.map(m => {
      const poster = m.posterUrl || fallbackImg;
      const lang = (m.language || 'ENGLISH').toUpperCase();
      const statusLabel = m.status === 'COMING_SOON' ? 'COMING SOON' : 'IN THEATERS NOW';

      return `
        <a href="movie-details.html?id=${m.id}" class="related-card">
          <div class="related-poster-box">
            <img src="${poster}" alt="${escapeHtml(m.title)}" class="related-poster-img" loading="lazy" onerror="this.src='${fallbackImg}'">
          </div>
          <div class="related-card-info">
            <div class="related-card-title" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</div>
            <div class="related-card-sub">${lang} • ${statusLabel}</div>
          </div>
        </a>
      `;
    }).join('');
  } catch (err) {
    console.warn('Could not load related movies:', err);
    track.innerHTML = `<div style="padding: 20px; color: var(--text-muted);">Recommendations unavailable.</div>`;
  }
}

function formatDuration(mins) {
  if (!mins) return '2H 00MIN';
  const hrs = Math.floor(mins / 60);
  const remainder = mins % 60;
  return `${hrs}H ${remainder < 10 ? '0' + remainder : remainder}MIN`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'SOON';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  } catch {
    return dateStr;
  }
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

function showErrorState(msg) {
  const titleEl = document.getElementById('detailsTitle');
  const synopsisEl = document.getElementById('detailsSynopsis');
  if (titleEl) titleEl.innerText = 'MOVIE NOT FOUND';
  if (synopsisEl) synopsisEl.innerText = msg;
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return 'dQw4w9WgXcQ';
  if (urlOrId.length === 11 && !urlOrId.includes('/')) return urlOrId;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : 'dQw4w9WgXcQ';
}

function openTrailer(urlOrId) {
  const modal = document.getElementById('trailerModal');
  const videoWrap = document.getElementById('trailerVideoWrap');
  if (!modal || !videoWrap) return;

  const videoId = extractYouTubeId(urlOrId);
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
