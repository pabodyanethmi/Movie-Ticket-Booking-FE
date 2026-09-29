const API_BASE_URL = 'http://localhost:8080/api/v1';

class ApiClient {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    const config = {
      ...options,
      credentials: 'include',
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = 'An unexpected error occurred';
        if (data && data.message) {
          errorMsg = data.message;
        } else if (data && data.fieldErrors && data.fieldErrors.length > 0) {
          errorMsg = data.fieldErrors.join(', ');
        }

        if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
          if (typeof Auth !== 'undefined' && Auth.setUser) {
            Auth.setUser(null);
          } else {
            localStorage.removeItem('cinex_user');
          }
          const isPagesSubdir = window.location.pathname.includes('/pages/');
          const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
          if (!isIndex) {
            window.location.href = isPagesSubdir ? '../index.html?auth=expired' : 'index.html?auth=expired';
          }
        }

        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  static async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async register(name, email, password, confirmPassword, phone) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirmPassword, phone }),
    });
  }

  static async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  static async getCurrentUser() {
    return this.request('/auth/me');
  }

  static async getMovies(search = '', genre = '', status = '') {
    let params = new URLSearchParams();
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/movies${queryString}`);
  }

  static async getFeaturedMovies() {
    return this.request('/movies/featured');
  }

  static async getNowShowingMovies() {
    return this.request('/movies/now-showing');
  }

  static async getMoviesByStatus(status) {
    return this.request(`/movies?status=${encodeURIComponent(status)}`);
  }

  static async getMovieById(id) {
    return this.request(`/movies/${id}`);
  }

  static async getRelatedMovies(id) {
    return this.request(`/movies/${id}/related`);
  }

  static async createMovie(movieData) {
    return this.request('/movies', {
      method: 'POST',
      body: JSON.stringify(movieData),
    });
  }

  static async updateMovie(id, movieData) {
    return this.request(`/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(movieData),
    });
  }

  static async toggleFeaturedMovie(id) {
    return this.request(`/movies/${id}/toggle-featured`, {
      method: 'PATCH',
    });
  }

  static async deleteMovie(id) {
    return this.request(`/movies/${id}`, {
      method: 'DELETE',
    });
  }

  static async getExperiences() {
    return this.request('/experiences');
  }

  static async createExperience(experienceData) {
    return this.request('/experiences', {
      method: 'POST',
      body: JSON.stringify(experienceData),
    });
  }

  static async updateExperience(id, experienceData) {
    return this.request(`/experiences/${id}`, {
      method: 'PUT',
      body: JSON.stringify(experienceData),
    });
  }

  static async deleteExperience(id) {
    return this.request(`/experiences/${id}`, {
      method: 'DELETE',
    });
  }

  static async getPromotions() {
    return this.request('/promotions');
  }

  static async getActivePromotions() {
    return this.request('/promotions/active');
  }

  static async createPromotion(promotionData) {
    return this.request('/promotions', {
      method: 'POST',
      body: JSON.stringify(promotionData),
    });
  }

  static async updatePromotion(id, promotionData) {
    return this.request(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(promotionData),
    });
  }

  static async deletePromotion(id) {
    return this.request(`/promotions/${id}`, {
      method: 'DELETE',
    });
  }

  static async getConcessions(category = null, includeAll = false) {
    let params = new URLSearchParams();
    if (category) params.append('category', category);
    if (includeAll) params.append('includeAll', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/concessions${queryString}`);
  }

  static async getConcessionById(id) {
    return this.request(`/concessions/${id}`);
  }

  static async createConcession(concessionData) {
    return this.request('/concessions', {
      method: 'POST',
      body: JSON.stringify(concessionData),
    });
  }

  static async updateConcession(id, concessionData) {
    return this.request(`/concessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(concessionData),
    });
  }

  static async toggleConcessionAvailability(id) {
    return this.request(`/concessions/${id}/availability`, {
      method: 'PATCH',
    });
  }

  static async deleteConcession(id) {
    return this.request(`/concessions/${id}`, {
      method: 'DELETE',
    });
  }

  static async getGenres() {
    return this.request('/genres');
  }

  static async getTheaters() {
    return this.request('/theaters');
  }

  static async getCinemas() {
    return this.request('/cinemas');
  }

  static async createTheater(theaterData) {
    return this.request('/theaters', {
      method: 'POST',
      body: JSON.stringify(theaterData),
    });
  }

  static async createCinema(cinemaData) {
    return this.request('/cinemas', {
      method: 'POST',
      body: JSON.stringify(cinemaData),
    });
  }

  static async updateTheater(id, theaterData) {
    return this.request(`/theaters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(theaterData),
    });
  }

  static async updateCinema(id, cinemaData) {
    return this.request(`/cinemas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cinemaData),
    });
  }

  static async deleteTheater(id) {
    return this.request(`/theaters/${id}`, {
      method: 'DELETE',
    });
  }

  static async deleteCinema(id) {
    return this.request(`/cinemas/${id}`, {
      method: 'DELETE',
    });
  }

  static async getScreensByTheater(theaterId) {
    return this.request(`/screens/theater/${theaterId}`);
  }

  static async createScreen(screenData) {
    return this.request('/screens', {
      method: 'POST',
      body: JSON.stringify(screenData),
    });
  }

  static async getUpcomingShowsByMovie(movieId) {
    return this.request(`/shows/movie/${movieId}/upcoming`);
  }

  static async getShowById(showId) {
    return this.request(`/shows/${showId}`);
  }

  static async getShowDetails(showId) {
    return this.request(`/shows/${showId}/details`);
  }

  static async getSeatsByShow(showId) {
    return this.request(`/seats/show/${showId}`);
  }

  static async getAllShows() {
    return this.request('/shows');
  }

  static async getShows(movieId = null, screenId = null, date = null) {
    let params = new URLSearchParams();
    if (movieId) params.append('movieId', movieId);
    if (screenId) params.append('screenId', screenId);
    if (date) params.append('date', date);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/shows${queryString}`);
  }

  static async createShow(showData) {
    return this.request('/shows', {
      method: 'POST',
      body: JSON.stringify(showData),
    });
  }

  static async createBulkShows(bulkData) {
    return this.request('/shows/bulk', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
  }

  static async updateShow(id, showData) {
    return this.request(`/shows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(showData),
    });
  }

  static async deleteShow(id) {
    return this.request(`/shows/${id}`, {
      method: 'DELETE',
    });
  }

  static async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  static async getMyBookings() {
    return this.request('/bookings/my-bookings');
  }

  static async getBookingById(id) {
    return this.request(`/bookings/${id}`);
  }

  static async getAllBookings() {
    return this.request('/bookings');
  }

  static async updateBookingStatus(id, status) {
    return this.request(`/bookings/${id}/status?status=${status}`, {
      method: 'PATCH',
    });
  }

  static async cancelBooking(id) {
    return this.request(`/bookings/${id}`, {
      method: 'DELETE',
    });
  }

  static async processPayment(paymentData) {
    return this.request('/payments/process', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  static async getReviewsByMovie(movieId) {
    return this.request(`/reviews/movie/${movieId}`);
  }

  static async addReview(reviewData) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  static async getAdminDashboardStats() {
    return this.request('/admin/dashboard');
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${icon}</span>
    <div style="flex-grow: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
