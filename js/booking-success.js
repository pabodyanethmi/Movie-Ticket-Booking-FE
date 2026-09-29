document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId') || urlParams.get('bookingRef');

  if (!orderId) {
    console.error("No orderId provided in query parameters.");
    return;
  }

  await loadBookingConfirmation(orderId);
});

async function loadBookingConfirmation(orderId) {
  let bookingData = null;

  const lastBookingStr = sessionStorage.getItem('lastBooking');
  if (lastBookingStr) {
    try {
      const parsed = JSON.parse(lastBookingStr);
      if (parsed && (parsed.bookingReference === orderId || parsed.orderId === orderId)) {
        bookingData = parsed;
      }
    } catch (e) {}
  }

  if (typeof ApiClient !== 'undefined' && ApiClient.request) {
    try {
      const response = await ApiClient.request(`/bookings/reference/${encodeURIComponent(orderId)}`);
      if (response && response.data) {
        bookingData = response.data;
      } else if (response && response.bookingReference) {
        bookingData = response;
      }
    } catch (err) {
      console.warn(`Could not fetch booking details for reference ${orderId} via API:`, err);
    }
  }

  if (!bookingData) {
    const apiBase = window.API_BASE || 'http://localhost:8080/api/v1';
    try {
      const res = await fetch(`${apiBase}/bookings/reference/${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const json = await res.json();
        bookingData = json && json.data ? json.data : json;
      }
    } catch (e) {
      console.warn("Direct fetch fallback error:", e);
    }
  }

  if (bookingData) {
    renderTicketConfirmation(bookingData);
  } else {
    console.error(`Booking not found for reference: ${orderId}`);
  }
}

function renderTicketConfirmation(data) {
  const refCodeEl = document.getElementById('successRefCode');
  const movieTitleEl = document.getElementById('successMovieTitle');
  const metaDetailsEl = document.getElementById('successMetaDetails');
  const seatsEl = document.getElementById('successSeats');
  const totalAmountEl = document.getElementById('successTotalAmount');
  const customerNameEl = document.getElementById('successCustomerName');
  const customerEmailEl = document.getElementById('successCustomerEmail');
  const qrImgEl = document.getElementById('successQrCodeImg');

  const ref = data.bookingReference || 'CX-982341';
  const movie = (data.movieTitle || 'SPIDER-MAN: BRAND NEW DAY').toUpperCase();
  const theater = data.theaterName || 'Scope Cinemas Multiplex';
  const screen = data.screenNumber ? `Hall 0${data.screenNumber}` : 'Hall 01';
  const seats = (data.seatNumbers && data.seatNumbers.length > 0) ? data.seatNumbers.join(', ') : 'G13';
  const timeStr = formatShowDateTime(data.showStartTime);
  const amount = data.totalAmount || 1900.0;
  const name = data.userName || 'Valued Customer';
  const email = data.userEmail || 'customer@scopecinemas.lk';

  if (refCodeEl) refCodeEl.textContent = ref;
  if (movieTitleEl) movieTitleEl.textContent = movie;
  if (metaDetailsEl) metaDetailsEl.textContent = `${theater} | ${screen} | ${timeStr}`;
  if (seatsEl) seatsEl.textContent = seats;
  if (totalAmountEl) totalAmountEl.textContent = `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (customerNameEl) customerNameEl.textContent = name;
  if (customerEmailEl) customerEmailEl.textContent = email;

  if (qrImgEl) {
    const qrContent = encodeURIComponent(data.qrCodePayload || `https://scopecinemas.lk/ticket/${ref}`);
    qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrContent}`;
  }
}

function printTicket() {
  window.print();
}

function formatShowDateTime(timeVal) {
  if (!timeVal) return 'MON, 08 SEP, 10:00 AM';
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return String(timeVal);

  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateNum = String(d.getDate()).padStart(2, '0');
  const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${dayStr}, ${dateNum} ${monthStr}, ${timeStr}`;
}

window.printTicket = printTicket;
