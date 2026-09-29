const STATIC_CONCESSIONS_CATALOG = [
  {
    id: 1,
    name: 'Popcorn Jumbo - Cheese',
    category: 'Popcorn',
    price: 2200,
    image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80',
    description: 'Freshly popped jumbo popcorn tossed in rich cheddar cheese seasoning.'
  },
  {
    id: 2,
    name: 'Popcorn Regular - Salted',
    category: 'Popcorn',
    price: 1150,
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&auto=format&fit=crop&q=80',
    description: 'Classic buttery salted popcorn in a regular tub.'
  },
  {
    id: 3,
    name: 'Popcorn Large - Caramel',
    category: 'Popcorn',
    price: 1850,
    image: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80',
    description: 'Sweet crunchy caramel glazed popcorn.'
  },
  {
    id: 4,
    name: 'Hot Dog Jumbo - Chicken',
    category: 'Hot Kitchen',
    price: 1450,
    image: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80',
    description: 'Grilled jumbo chicken sausage in a soft toasted bun with mustard and ketchup.'
  },
  {
    id: 5,
    name: 'Nachos Deluxe with Cheese',
    category: 'Hot Kitchen',
    price: 1600,
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80',
    description: 'Crispy tortilla chips served with warm jalapeno cheese dip.'
  },
  {
    id: 6,
    name: 'Family Movie Combo',
    category: 'Combo',
    price: 4950,
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
    description: '2 Large Popcorn + 2 Drinks (750ml) + 1 Nachos Deluxe.'
  },
  {
    id: 7,
    name: 'Couple Snack Combo',
    category: 'Combo',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    description: '1 Jumbo Popcorn + 2 Soft Drinks (750ml).'
  },
  {
    id: 8,
    name: 'Chocolate Sundae Ice Cream',
    category: 'Desserts',
    price: 950,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80',
    description: 'Creamy vanilla soft-serve topped with rich chocolate fudge.'
  },
  {
    id: 9,
    name: 'Churros with Chocolate Dip',
    category: 'Desserts',
    price: 1250,
    image: 'https://images.unsplash.com/photo-1624371414361-e670edf4898d?w=600&auto=format&fit=crop&q=80',
    description: 'Crispy cinnamon sugar churros with warm melted chocolate sauce.'
  },
  {
    id: 10,
    name: 'Coca-Cola Large 750ml',
    category: 'Beverage',
    price: 750,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    description: 'Ice-cold fountain Coca-Cola.'
  },
  {
    id: 11,
    name: 'Iced Lemon Tea 750ml',
    category: 'Beverage',
    price: 850,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    description: 'Refreshing brewed iced tea with fresh lemon slices.'
  },
  {
    id: 12,
    name: 'Mineral Water 500ml',
    category: 'Beverage',
    price: 350,
    image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=600&auto=format&fit=crop&q=80',
    description: 'Pure natural spring water bottle.'
  }
];

let bookingState = null;
let concessionsCatalog = [...STATIC_CONCESSIONS_CATALOG];
let currentCategory = 'All';
let cart = {};
let timerInterval = null;
let timerSeconds = 300;

document.addEventListener('DOMContentLoaded', async () => {
  if (!initBookingState()) return;

  renderMetaHeader();
  renderTicketSummary();

  startReservationTimer();

  await loadConcessionsCatalog();

  renderCategoryPills();
  renderConcessionsGrid();
  updatePurchaseSummary();
});

function initBookingState() {
  const rawState = sessionStorage.getItem('bookingState') || sessionStorage.getItem('booking_payload');
  if (!rawState) {
    if (typeof showToast === 'function') {
      showToast('No active booking session found. Redirecting to movies...', 'warning');
    }
    setTimeout(() => {
      window.location.href = 'movies.html';
    }, 1200);
    return false;
  }

  try {
    bookingState = JSON.parse(rawState);
    if (!bookingState || (!bookingState.showId && !bookingState.seats)) {
      throw new Error('Invalid booking state');
    }
    return true;
  } catch (err) {
    console.error('Failed to parse bookingState:', err);
    window.location.href = 'movies.html';
    return false;
  }
}

function renderMetaHeader() {
  if (!bookingState) return;

  const posterEl = document.getElementById('metaMoviePoster');
  const titleEl = document.getElementById('metaMovieTitle');
  const classBadgeEl = document.getElementById('metaClassificationBadge');
  const detailsEl = document.getElementById('metaMovieDetails');

  const title = (bookingState.movieTitle || 'CINEX SCREENING').toUpperCase();
  const poster = bookingState.moviePosterUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=100&auto=format&fit=crop&q=80';
  const classification = bookingState.classification || 'U';
  const theater = bookingState.theaterName || 'CineX Multiplex';
  const hall = bookingState.screenName || 'Hall 01';
  const formattedTime = formatShowDateTime(bookingState.startTime);
  const seatsStr = (bookingState.seats && bookingState.seats.length > 0) ? bookingState.seats.join(', ') : 'N/A';

  if (posterEl) posterEl.src = poster;
  if (titleEl) {
    titleEl.innerHTML = `
      <span>${title}</span>
      <span class="classification-badge">${classification}</span>
    `;
  }
  if (detailsEl) {
    detailsEl.textContent = `${theater} | ${hall} | ${formattedTime} | Seats: ${seatsStr}`;
  }
}

function renderTicketSummary() {
  if (!bookingState) return;

  const ticketPriceEl = document.getElementById('summaryTicketPrice');
  const ticketDetailsEl = document.getElementById('summaryTicketDetails');

  const subtotal = bookingState.ticketSubtotal || bookingState.totalAmount || 0;
  const adultCount = bookingState.adultTickets || bookingState.adultCount || 1;
  const childCount = bookingState.childTickets || bookingState.childCount || 0;
  const seatsStr = (bookingState.seats && bookingState.seats.length > 0) ? bookingState.seats.join(', ') : 'N/A';

  if (ticketPriceEl) {
    ticketPriceEl.textContent = `LKR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (ticketDetailsEl) {
    ticketDetailsEl.textContent = `${adultCount} Adult(s), ${childCount} Child(ren) | Seats: ${seatsStr}`;
  }
}

function startReservationTimer() {
  const timerDisplay = document.getElementById('concessionsTimer');
  if (!timerDisplay) return;

  timerSeconds = 300;
  updateTimerDisplay();

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      if (typeof showToast === 'function') {
        showToast('Your 5-minute reservation timer has expired. Returning to showtimes...', 'error');
      } else {
        alert('Your 5-minute reservation timer has expired. Returning to showtimes...');
      }
      setTimeout(() => {
        window.location.href = 'showtimes.html';
      }, 1500);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('concessionsTimer');
  if (!timerDisplay) return;

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function loadConcessionsCatalog() {
  try {
    if (typeof ApiClient !== 'undefined' && ApiClient.request) {
      const res = await ApiClient.request('/concessions').catch(() => null);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        concessionsCatalog = res.data;
      }
    }
  } catch (err) {
    console.warn('Backend concessions API unavailable, using default catalog.', err);
    concessionsCatalog = [...STATIC_CONCESSIONS_CATALOG];
  }
}

function filterCategory(categoryName) {
  currentCategory = categoryName;
  renderCategoryPills();
  renderConcessionsGrid();
}

function renderCategoryPills() {
  const container = document.getElementById('categoryPillsBar');
  if (!container) return;

  const categories = ['All', 'Popcorn', 'Hot Kitchen', 'Combo', 'Desserts', 'Beverage'];
  container.innerHTML = categories.map(cat => `
    <button type="button" class="category-pill ${cat === currentCategory ? 'active' : ''}" onclick="filterCategory('${cat}')">
      ${cat}
    </button>
  `).join('');
}

function renderConcessionsGrid() {
  const grid = document.getElementById('concessionsGrid');
  if (!grid) return;

  const filtered = currentCategory === 'All'
    ? concessionsCatalog
    : concessionsCatalog.filter(item => item.category && item.category.toLowerCase() === currentCategory.toLowerCase());

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="concessions-loading-spinner">No items found in category "${currentCategory}".</div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const cartItem = cart[item.id];
    const qty = cartItem ? cartItem.qty : 0;
    const priceFormatted = `LKR ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const actionControlHtml = qty > 0 ? `
      <div class="stepper-wrap">
        <button type="button" class="btn-stepper" onclick="updateItemQty(${item.id}, -1)">-</button>
        <span class="stepper-val">${qty}</span>
        <button type="button" class="btn-stepper" onclick="updateItemQty(${item.id}, 1)">+</button>
      </div>
    ` : `
      <button type="button" class="btn-add-item" onclick="addItemToCart(${item.id})">Add</button>
    `;

    return `
      <div class="concession-card">
        <div class="card-img-wrap">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy">
          <span class="card-category-badge">${escapeHtml(item.category)}</span>
        </div>
        <div class="card-content-body">
          <div>
            <div class="card-item-title">${escapeHtml(item.name)}</div>
            <div class="card-item-desc">${escapeHtml(item.description || '')}</div>
          </div>
          <div class="card-footer-action">
            <div class="card-item-price">${priceFormatted}</div>
            ${actionControlHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function addItemToCart(itemId) {
  const item = concessionsCatalog.find(i => i.id === itemId);
  if (!item) return;

  cart[itemId] = {
    id: item.id,
    name: item.name,
    price: item.price,
    qty: 1,
    category: item.category
  };

  renderConcessionsGrid();
  updatePurchaseSummary();
}

function updateItemQty(itemId, delta) {
  if (!cart[itemId]) return;

  cart[itemId].qty += delta;

  if (cart[itemId].qty <= 0) {
    delete cart[itemId];
  }

  renderConcessionsGrid();
  updatePurchaseSummary();
}

function clearCart() {
  cart = {};
  renderConcessionsGrid();
  updatePurchaseSummary();
  if (typeof showToast === 'function') {
    showToast('Food & Beverage cart cleared.', 'info');
  }
}

function updatePurchaseSummary() {
  const cartListEl = document.getElementById('cartItemsList');
  const fnbSubtotalEl = document.getElementById('summaryFnbSubtotal');
  const grandTotalEl = document.getElementById('summaryGrandTotal');
  const bottomCountEl = document.getElementById('bottomSelectionCount');

  const cartItems = Object.values(cart);
  const totalItemCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const fnbSubtotal = cartItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const ticketSubtotal = bookingState ? (bookingState.ticketSubtotal || bookingState.totalAmount || 0) : 0;
  const grandTotal = ticketSubtotal + fnbSubtotal;

  if (cartListEl) {
    if (cartItems.length === 0) {
      cartListEl.innerHTML = `<div class="empty-cart-msg">No food items added yet.</div>`;
    } else {
      cartListEl.innerHTML = cartItems.map(item => `
        <div class="cart-item-row">
          <div>
            <span class="cart-item-title">${escapeHtml(item.name)}</span>
            <span class="cart-item-qty">(x${item.qty})</span>
          </div>
          <div class="cart-item-price">LKR ${(item.price * item.qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      `).join('');
    }
  }

  if (fnbSubtotalEl) {
    fnbSubtotalEl.textContent = `LKR ${fnbSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (grandTotalEl) {
    grandTotalEl.textContent = `LKR ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (bottomCountEl) {
    bottomCountEl.textContent = `${totalItemCount} item(s) selected`;
  }
}

function goBackToSeats(event) {
  if (event) event.preventDefault();
  const showId = bookingState ? bookingState.showId : null;
  const count = bookingState ? (bookingState.ticketCount || 1) : 1;
  const query = showId ? `?showId=${showId}&count=${count}` : '';
  window.location.href = `seats.html${query}`;
}

function skipConcessions() {
  if (!bookingState) return;

  const ticketSubtotal = bookingState.ticketSubtotal || bookingState.totalAmount || 0;

  bookingState.concessions = [];
  bookingState.fnbTotal = 0;
  bookingState.grandTotal = ticketSubtotal;
  bookingState.totalAmount = ticketSubtotal;

  sessionStorage.setItem('bookingState', JSON.stringify(bookingState));
  sessionStorage.setItem('booking_payload', JSON.stringify(bookingState));

  if (typeof showToast === 'function') {
    showToast('Skipped concessions. Proceeding to checkout...', 'info');
  }

  setTimeout(() => {
    window.location.href = 'checkout.html';
  }, 400);
}

function proceedToCheckout() {
  if (!bookingState) return;

  const cartItems = Object.values(cart);
  const fnbSubtotal = cartItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const ticketSubtotal = bookingState.ticketSubtotal || bookingState.totalAmount || 0;
  const grandTotal = ticketSubtotal + fnbSubtotal;

  bookingState.concessions = cartItems.map(i => ({
    id: i.id,
    name: i.name,
    price: i.price,
    qty: i.qty,
    itemTotal: i.price * i.qty
  }));

  bookingState.fnbTotal = fnbSubtotal;
  bookingState.grandTotal = grandTotal;
  bookingState.totalAmount = grandTotal;

  sessionStorage.setItem('bookingState', JSON.stringify(bookingState));
  sessionStorage.setItem('booking_payload', JSON.stringify(bookingState));

  if (typeof showToast === 'function') {
    showToast('Proceeding to checkout...', 'success');
  }

  setTimeout(() => {
    window.location.href = 'checkout.html';
  }, 400);
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

function formatShowDateTime(timeVal) {
  if (!timeVal) return 'Mon, 08 Sep, 10:00 AM';
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return String(timeVal);

  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dateNum = String(d.getDate()).padStart(2, '0');
  const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${dayStr}, ${dateNum} ${monthStr}, ${timeStr}`;
}

window.filterCategory = filterCategory;
window.addItemToCart = addItemToCart;
window.updateItemQty = updateItemQty;
window.clearCart = clearCart;
window.goBackToSeats = goBackToSeats;
window.skipConcessions = skipConcessions;
window.proceedToCheckout = proceedToCheckout;
