let currentShowId = null;
let targetTicketCount = 1;
let requiredCount = 1;
let showDetails = null;
let seatsData = [];
let selectedSeats = [];
let sameDayShows = [];

const ticketTypeState = {
  adultCount: 1,
  childCount: 0,
  adultPrice: 1500,
  childPrice: 1000
};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentShowId = urlParams.get('showId') || sessionStorage.getItem('booking_show_id');
  
  const parsedCount = parseInt(urlParams.get('count') || sessionStorage.getItem('booking_ticket_count') || '1', 10);
  targetTicketCount = (!isNaN(parsedCount) && parsedCount >= 1 && parsedCount <= 10) ? parsedCount : 1;
  requiredCount = targetTicketCount;

  updateTicketCountBadge();
  initTicketTypeModalEvents();

  if (!currentShowId) {
    if (typeof showToast === 'function') {
      showToast('No showtime selected. Redirecting to showtimes...', 'warning');
    }
    setTimeout(() => {
      window.location.href = 'showtimes.html';
    }, 1200);
    return;
  }

  const proceedBtn = document.getElementById('proceedToTypeBtn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Proceed clicked! Selected seats:', selectedSeats);
      openTicketTypeModal();
    });
  }

  const ticketBadge = document.getElementById('ticketCountBadge');
  if (ticketBadge) {
    ticketBadge.addEventListener('click', promptChangeTicketCount);
  }

  await loadSeatSelectionPage(currentShowId);
});

async function loadSeatSelectionPage(showId) {
  currentShowId = showId;
  sessionStorage.setItem('booking_show_id', showId);

  selectedSeats = [];

  const matrixContainer = document.getElementById('seatMatrixContainer');
  if (matrixContainer) {
    matrixContainer.innerHTML = `
      <div class="seats-spinner-box">
        <div class="spinner-border" role="status"></div>
        <div style="margin-top: 12px; font-weight: 700; color: #94a3b8;">Loading interactive seat map...</div>
      </div>
    `;
  }

  try {
    let showRes = null;
    if (typeof ApiClient !== 'undefined') {
      if (ApiClient.getShowById) {
        showRes = await ApiClient.getShowById(showId).catch(() => null);
      }
      if ((!showRes || !showRes.data) && ApiClient.getShowDetails) {
        showRes = await ApiClient.getShowDetails(showId).catch(() => null);
      }
    }

    if (showRes && showRes.data) {
      showDetails = showRes.data.show || showRes.data;
    }

    let seatsRes = null;
    if (typeof ApiClient !== 'undefined' && ApiClient.getSeatsByShow) {
      seatsRes = await ApiClient.getSeatsByShow(showId).catch(() => null);
    }

    if (seatsRes && seatsRes.data && Array.isArray(seatsRes.data) && seatsRes.data.length > 0) {
      seatsData = seatsRes.data;
    } else if (showRes && showRes.data && showRes.data.seats && Array.isArray(showRes.data.seats) && showRes.data.seats.length > 0) {
      seatsData = showRes.data.seats;
    } else {
      seatsData = generateDefaultSeatLayout();
    }

    renderHeaderMeta();
    renderSeatGrid();
    fetchOtherShowtimesForToday();
    updateSeatSelectionUI();
  } catch (err) {
    console.warn('Error fetching seat layout from API:', err);
    if (!showDetails) {
      showDetails = {
        movieTitle: 'CINEX SCREENING',
        theaterName: 'CineX Multiplex - Main Screen',
        startTime: new Date().toISOString(),
        ticketPrice: 1500
      };
    }
    seatsData = generateDefaultSeatLayout();
    renderHeaderMeta();
    renderSeatGrid();
    updateSeatSelectionUI();
  }
}

function renderHeaderMeta() {
  const titleEl = document.getElementById('metaMovieTitle');
  const subtitleEl = document.getElementById('metaMovieSubtitle');
  const posterEl = document.getElementById('metaMoviePoster');
  const priceInfoEl = document.getElementById('priceTierInfo');

  if (!showDetails) return;

  const title = (showDetails.movieTitle || showDetails.title || 'CINEX SHOWTIME').toUpperCase();
  const poster = showDetails.moviePosterUrl || showDetails.posterUrl || showDetails.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=100&auto=format&fit=crop&q=80';
  const genre = showDetails.genre || 'ACTION / ADVENTURE';
  const duration = showDetails.durationMins ? `${Math.floor(showDetails.durationMins / 60)}H ${showDetails.durationMins % 60}MIN` : '2H 30MIN';
  const format = showDetails.experience || showDetails.movieFormatTags || 'DOLBY ATMOS';
  const theater = (showDetails.theaterName || showDetails.theaterLocation || 'CineX Multiplex - Colombo City Centre').toUpperCase();
  const formattedDateTime = formatShowDateTime(showDetails.startTime);
  const basePrice = getUnitPrice();

  if (titleEl) titleEl.textContent = title;
  if (posterEl) posterEl.src = poster;
  if (subtitleEl) {
    subtitleEl.textContent = `${genre}, ${duration} | ${format} | ${theater}, ${formattedDateTime}`;
  }

  if (priceInfoEl) {
    priceInfoEl.textContent = `Odc : Adult: LKR ${basePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Child: LKR ${(basePrice * 0.7).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}

function generateDefaultSeatLayout() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seatsPerRow = 12;
  const basePrice = getUnitPrice();
  const generated = [];

  let idCounter = 1;
  rows.forEach(row => {
    for (let num = 1; num <= seatsPerRow; num++) {
      // Simulate some occupied seats on rows C and E for realism
      const isOccupiedSim = (row === 'C' && (num === 5 || num === 6)) || (row === 'E' && (num === 8 || num === 9));
      generated.push({
        id: idCounter++,
        seatRow: row,
        seatNumber: num,
        seatCode: `${row}${num}`,
        isBooked: isOccupiedSim,
        price: basePrice
      });
    }
  });

  return generated;
}

function renderSeatGrid() {
  const container = document.getElementById('seatMatrixContainer');
  if (!container) return;

  if (!seatsData || seatsData.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">No seat layout available for this show.</div>`;
    return;
  }

  const rowsMap = new Map();
  seatsData.forEach(seat => {
    const rowKey = seat.seatRow || 'A';
    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, []);
    }
    rowsMap.get(rowKey).push(seat);
  });

  const sortedRowKeys = Array.from(rowsMap.keys()).sort();

  let gridHtml = '';

  sortedRowKeys.forEach(rowLetter => {
    const rowSeats = rowsMap.get(rowLetter);
    rowSeats.sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

    const leftBlock = rowSeats.filter(s => s.seatNumber <= 3);
    const centerBlock = rowSeats.filter(s => s.seatNumber >= 4 && s.seatNumber <= 9);
    const rightBlock = rowSeats.filter(s => s.seatNumber >= 10);

    const renderBlock = (blockSeats) => {
      return blockSeats.map(seat => {
        const code = seat.seatCode || `${seat.seatRow}${seat.seatNumber}`;
        const isOccupied = seat.isBooked || seat.status === 'OCCUPIED' || seat.status === 'BOOKED';
        const isUnavailable = seat.status === 'UNAVAILABLE';
        const isSelected = selectedSeats.some(s => s.id === seat.id);

        let statusClass = 'available';
        if (isOccupied) statusClass = 'occupied';
        else if (isUnavailable) statusClass = 'unavailable';
        else if (isSelected) statusClass = 'selected';

        return `
          <div class="seat-box ${statusClass}"
               data-seat-id="${seat.id}"
               data-seat-code="${code}"
               title="${code} - ${isOccupied ? 'Occupied' : 'Available (LKR ' + (seat.price || getUnitPrice()) + ')'}"
               onclick="handleSeatClick(${seat.id})">
            ${seat.seatNumber}
          </div>
        `;
      }).join('');
    };

    gridHtml += `
      <div class="seat-row-line">
        <div class="row-letter">${rowLetter}</div>
        <div class="seat-block-group">${renderBlock(leftBlock)}</div>
        <div class="aisle-gap"></div>
        <div class="seat-block-group">${renderBlock(centerBlock)}</div>
        <div class="aisle-gap"></div>
        <div class="seat-block-group">${renderBlock(rightBlock)}</div>
        <div class="row-letter">${rowLetter}</div>
      </div>
    `;
  });

  container.innerHTML = gridHtml;
}

function handleSeatClick(seatId) {
  const seatObj = seatsData.find(s => s.id === seatId);
  if (!seatObj) return;

  const isOccupied = seatObj.isBooked || seatObj.status === 'OCCUPIED' || seatObj.status === 'BOOKED';
  const isUnavailable = seatObj.status === 'UNAVAILABLE';

  if (isOccupied || isUnavailable) {
    if (typeof showToast === 'function') {
      showToast(`Seat ${seatObj.seatCode || seatObj.seatRow + seatObj.seatNumber} is already occupied.`, 'warning');
    }
    return;
  }

  const code = seatObj.seatCode || `${seatObj.seatRow}${seatObj.seatNumber}`;
  const existingIdx = selectedSeats.findIndex(s => s.id === seatObj.id);

  if (existingIdx !== -1) {
    selectedSeats.splice(existingIdx, 1);
  } else {
    if (selectedSeats.length < targetTicketCount) {
      selectedSeats.push({
        id: seatObj.id,
        code: code,
        row: seatObj.seatRow,
        number: seatObj.seatNumber,
        price: seatObj.price || getUnitPrice()
      });
    } else {
      if (targetTicketCount === 1) {
        selectedSeats = [{
          id: seatObj.id,
          code: code,
          row: seatObj.seatRow,
          number: seatObj.seatNumber,
          price: seatObj.price || getUnitPrice()
        }];
      } else {
        const removed = selectedSeats.shift();
        selectedSeats.push({
          id: seatObj.id,
          code: code,
          row: seatObj.seatRow,
          number: seatObj.seatNumber,
          price: seatObj.price || getUnitPrice()
        });
        if (typeof showToast === 'function') {
          showToast(`Replaced seat ${removed.code} with ${code}`, 'info');
        }
      }
    }
  }

  renderSeatGrid();
  updateSeatSelectionUI();
}

function updateProceedButtonState() {
  const proceedBtn = document.getElementById('proceedToTypeBtn');
  if (!proceedBtn) return;
  
  if (selectedSeats.length === targetTicketCount) {
    proceedBtn.disabled = false;
    proceedBtn.classList.remove('disabled');
    proceedBtn.classList.add('active');
    proceedBtn.style.pointerEvents = 'auto';
    proceedBtn.style.cursor = 'pointer';
    proceedBtn.style.opacity = '1';
  } else {
    proceedBtn.disabled = true;
    proceedBtn.classList.add('disabled');
    proceedBtn.classList.remove('active');
    proceedBtn.style.pointerEvents = 'none';
    proceedBtn.style.cursor = 'not-allowed';
    proceedBtn.style.opacity = '0.5';
  }
}

function updateSeatSelectionUI() {
  const summaryEl = document.getElementById('selectedSeatsList');
  const totalPriceEl = document.getElementById('totalPriceText');

  const count = selectedSeats.length;
  const unitPrice = getUnitPrice();
  const totalPrice = count * unitPrice;

  if (summaryEl) {
    if (count === 0) {
      summaryEl.textContent = `NO SEATS SELECTED (SELECT ${targetTicketCount} TICKET${targetTicketCount > 1 ? 'S' : ''})`;
    } else {
      const codesStr = selectedSeats.map(s => s.code).join(', ');
      summaryEl.textContent = `SELECTED: ${codesStr} (${count}/${targetTicketCount} TICKETS)`;
    }
  }

  if (totalPriceEl) {
    totalPriceEl.textContent = `LKR ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  updateProceedButtonState();
}

function filterAvailableShowtimes(shows, currentShow) {
  if (!shows || !currentShow) return [];

  const now = new Date();
  const targetDateStr = extractDateString(currentShow.startTime);
  const todayDateStr = extractDateString(now);
  const isToday = targetDateStr === todayDateStr;

  const targetMovieId = currentShow.movieId || (currentShow.movie ? currentShow.movie.id : null) || currentShow.id;
  const targetTheaterId = currentShow.theaterId ||
                          (currentShow.screen && currentShow.screen.theater ? currentShow.screen.theater.id : null) ||
                          (currentShow.screen ? currentShow.screen.theaterId : null);
  const targetTheaterName = (currentShow.theaterName || currentShow.theaterLocation || '').toUpperCase();

  return shows
    .filter(show => {
      if (!show.startTime) return false;

      const showDateStr = extractDateString(show.startTime);
      if (targetDateStr && showDateStr !== targetDateStr) return false;

      const showMovieId = show.movieId || (show.movie ? show.movie.id : null);
      if (targetMovieId && showMovieId && String(showMovieId) !== String(targetMovieId)) {
        return false;
      }

      const showTheaterId = show.theaterId ||
                            (show.screen && show.screen.theater ? show.screen.theater.id : null) ||
                            (show.screen ? show.screen.theaterId : null);
      const showTheaterName = (show.theaterName || show.theaterLocation || '').toUpperCase();

      if (targetTheaterId && showTheaterId) {
        if (String(showTheaterId) !== String(targetTheaterId)) return false;
      } else if (targetTheaterName && showTheaterName) {
        if (showTheaterName !== targetTheaterName) return false;
      }

      if (isToday) {
        let slotDateTime = null;
        if (typeof show.startTime === 'string') {
          if (show.startTime.includes('T')) {
            slotDateTime = new Date(show.startTime);
          } else if (show.startTime.includes('-')) {
            slotDateTime = new Date(show.startTime.replace(' ', 'T'));
          } else {
            slotDateTime = new Date(`${targetDateStr}T${show.startTime}`);
          }
        } else {
          slotDateTime = new Date(show.startTime);
        }

        if (slotDateTime && !isNaN(slotDateTime.getTime())) {
          if (slotDateTime <= now && String(show.id) !== String(currentShow.id)) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.startTime).getTime() || 0;
      const timeB = new Date(b.startTime).getTime() || 0;
      return timeA - timeB;
    });
}

async function fetchOtherShowtimesForToday() {
  const rowEl = document.getElementById('showtimePillsRow');
  if (!rowEl) return;

  if (!showDetails || (!showDetails.movieId && !showDetails.id)) {
    rowEl.innerHTML = `<span class="switcher-loading">Loading showtimes...</span>`;
    return;
  }

  const targetDate = extractDateString(showDetails.startTime);
  const targetMovieId = showDetails.movieId || (showDetails.movie ? showDetails.movie.id : null) || showDetails.id;

  try {
    let shows = [];
    if (typeof ApiClient !== 'undefined' && ApiClient.getShows && targetMovieId) {
      const res = await ApiClient.getShows(targetMovieId, null, targetDate).catch(() => null);
      if (res && res.data) {
        shows = Array.isArray(res.data) ? res.data : [];
      } else if (Array.isArray(res)) {
        shows = res;
      }
    }

    if (showDetails && !shows.some(s => String(s.id) === String(currentShowId))) {
      shows.push(showDetails);
    }

    const availableShows = filterAvailableShowtimes(shows, showDetails);

    const uniqueMap = new Map();
    availableShows.forEach(show => {
      const timeStr = formatTimeOnly(show.startTime);
      if (!uniqueMap.has(timeStr) || String(show.id) === String(currentShowId)) {
        uniqueMap.set(timeStr, show);
      }
    });

    const uniqueShows = Array.from(uniqueMap.values());
    sameDayShows = uniqueShows;

    if (uniqueShows.length === 0) {
      const timeStr = formatTimeOnly(showDetails.startTime);
      rowEl.innerHTML = `<span class="switcher-time-pill active">${timeStr}</span>`;
      return;
    }

    rowEl.innerHTML = uniqueShows.map(s => {
      const timeStr = formatTimeOnly(s.startTime);
      const isActive = String(s.id) === String(currentShowId);

      return `
        <button type="button" class="switcher-time-pill ${isActive ? 'active' : ''}"
                onclick="switchShowtime(${s.id})"
                title="${isActive ? 'Currently viewing ' + timeStr : 'Switch to ' + timeStr}">
          ${timeStr}
        </button>
      `;
    }).join('');
  } catch (err) {
    console.warn('Failed to load available showtimes:', err);
    const timeStr = formatTimeOnly(showDetails ? showDetails.startTime : null);
    rowEl.innerHTML = `<span class="switcher-time-pill active">${timeStr}</span>`;
  }
}

function switchShowtime(newShowId) {
  if (String(newShowId) === String(currentShowId)) return;

  window.location.href = `seats.html?showId=${newShowId}&count=${requiredCount}`;
}

function promptChangeTicketCount() {
  const input = prompt('Enter number of tickets (1 - 10):', targetTicketCount);
  if (input === null) return;

  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= 10) {
    targetTicketCount = num;
    requiredCount = num;
    sessionStorage.setItem('booking_ticket_count', targetTicketCount);
    updateTicketCountBadge();

    if (selectedSeats.length > targetTicketCount) {
      selectedSeats = selectedSeats.slice(0, targetTicketCount);
    }

    renderSeatGrid();
    updateSeatSelectionUI();
  } else {
    if (typeof showToast === 'function') {
      showToast('Please enter a valid ticket count between 1 and 10.', 'warning');
    }
  }
}

function updateTicketCountBadge() {
  const labelEl = document.getElementById('displayCountLabel');
  if (labelEl) {
    labelEl.textContent = `${targetTicketCount} TICKET${targetTicketCount > 1 ? 'S' : ''}`;
  }
}

function onProceedToCheckout() {
  if (selectedSeats.length !== targetTicketCount) {
    if (typeof showToast === 'function') {
      showToast(`Please select exactly ${targetTicketCount} seat(s) to proceed.`, 'warning');
    }
    return;
  }

  openTicketTypeModal();
}

function initTicketTypeModalEvents() {
  const closeBtn = document.getElementById('closeTypeModalBtn');
  const modalOverlay = document.getElementById('ticketTypeModal');
  const minusAdultBtn = document.getElementById('minusAdultBtn');
  const plusAdultBtn = document.getElementById('plusAdultBtn');
  const minusChildBtn = document.getElementById('minusChildBtn');
  const plusChildBtn = document.getElementById('plusChildBtn');
  const finalBtn = document.getElementById('finalCheckoutBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeTicketTypeModal();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeTicketTypeModal();
    });
  }

  if (minusAdultBtn) minusAdultBtn.addEventListener('click', () => changeTicketTypeCounts(-1, 0));
  if (plusAdultBtn) plusAdultBtn.addEventListener('click', () => changeTicketTypeCounts(1, 0));
  if (minusChildBtn) minusChildBtn.addEventListener('click', () => changeTicketTypeCounts(0, -1));
  if (plusChildBtn) plusChildBtn.addEventListener('click', () => changeTicketTypeCounts(0, 1));

  if (finalBtn) finalBtn.addEventListener('click', confirmFinalCheckout);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && !modalOverlay.classList.contains('hidden')) {
      closeTicketTypeModal();
    }
  });
}

function openTicketTypeModal() {
  const modal = document.getElementById('ticketTypeModal');
  if (!modal) {
    console.error('Modal element #ticketTypeModal not found in DOM!');
    return;
  }
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  initTicketTypeCounts();
}

function initTicketTypeCounts() {
  const totalTickets = selectedSeats.length || targetTicketCount;

  const basePrice = getUnitPrice();
  ticketTypeState.adultPrice = basePrice;
  ticketTypeState.childPrice = Math.round(basePrice * 0.7);

  ticketTypeState.adultCount = totalTickets;
  ticketTypeState.childCount = 0;

  const summaryEl = document.getElementById('selectedSeatsSummary');
  const adultPriceEl = document.getElementById('adultPriceDisplay');
  const childPriceEl = document.getElementById('childPriceDisplay');

  if (summaryEl) {
    summaryEl.textContent = `${totalTickets} ticket(s) selected | Area: ODC`;
  }
  if (adultPriceEl) {
    adultPriceEl.textContent = `LKR ${ticketTypeState.adultPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (childPriceEl) {
    childPriceEl.textContent = `LKR ${ticketTypeState.childPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  updateTicketTypeModalUI();
}

function closeTicketTypeModal() {
  const modal = document.getElementById('ticketTypeModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function changeTicketTypeCounts(adultDelta, childDelta) {
  const totalTickets = selectedSeats.length || targetTicketCount;

  if (childDelta !== 0) {
    const newChild = ticketTypeState.childCount + childDelta;
    if (newChild >= 0 && newChild <= totalTickets) {
      ticketTypeState.childCount = newChild;
      ticketTypeState.adultCount = totalTickets - newChild;
    }
  } else if (adultDelta !== 0) {
    const newAdult = ticketTypeState.adultCount + adultDelta;
    if (newAdult >= 0 && newAdult <= totalTickets) {
      ticketTypeState.adultCount = newAdult;
      ticketTypeState.childCount = totalTickets - newAdult;
    }
  }

  updateTicketTypeModalUI();
}

function updateTicketTypeModalUI() {
  const totalTickets = selectedSeats.length || targetTicketCount;

  const adultDisplay = document.getElementById('adultCountDisplay');
  const childDisplay = document.getElementById('childCountDisplay');
  const totalPriceEl = document.getElementById('modalTotalPrice');

  const minusAdultBtn = document.getElementById('minusAdultBtn');
  const plusAdultBtn = document.getElementById('plusAdultBtn');
  const minusChildBtn = document.getElementById('minusChildBtn');
  const plusChildBtn = document.getElementById('plusChildBtn');

  if (adultDisplay) adultDisplay.textContent = ticketTypeState.adultCount;
  if (childDisplay) childDisplay.textContent = ticketTypeState.childCount;

  const totalAmount = (ticketTypeState.adultCount * ticketTypeState.adultPrice) +
                      (ticketTypeState.childCount * ticketTypeState.childPrice);

  if (totalPriceEl) {
    totalPriceEl.textContent = `LKR ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  if (minusAdultBtn) minusAdultBtn.disabled = ticketTypeState.adultCount <= 0;
  if (plusAdultBtn) plusAdultBtn.disabled = ticketTypeState.adultCount >= totalTickets;
  if (minusChildBtn) minusChildBtn.disabled = ticketTypeState.childCount <= 0;
  if (plusChildBtn) plusChildBtn.disabled = ticketTypeState.childCount >= totalTickets;
}

function confirmFinalCheckout() {
  const totalAmount = (ticketTypeState.adultCount * ticketTypeState.adultPrice) +
                      (ticketTypeState.childCount * ticketTypeState.childPrice);

  const bookingStateObj = {
    showId: currentShowId,
    movieTitle: showDetails ? (showDetails.movieTitle || showDetails.title || 'CINEX SHOWTIME') : 'CINEX SHOWTIME',
    moviePosterUrl: showDetails ? (showDetails.moviePosterUrl || showDetails.posterUrl || showDetails.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=100&auto=format&fit=crop&q=80') : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=100&auto=format&fit=crop&q=80',
    theaterName: showDetails ? (showDetails.theaterName || showDetails.theaterLocation || 'CineX Multiplex - Colombo City Centre') : 'CineX Multiplex - Colombo City Centre',
    screenName: showDetails ? (showDetails.screenName || 'Hall 01') : 'Hall 01',
    classification: showDetails ? (showDetails.classification || 'U') : 'U',
    startTime: showDetails ? showDetails.startTime : new Date().toISOString(),
    seats: selectedSeats.map(s => s.code),
    seatIds: selectedSeats.map(s => s.id),
    ticketCount: selectedSeats.length,
    adultTickets: ticketTypeState.adultCount,
    childTickets: ticketTypeState.childCount,
    adultPrice: ticketTypeState.adultPrice,
    childPrice: ticketTypeState.childPrice,
    pricePerTicket: getUnitPrice(),
    ticketSubtotal: totalAmount,
    totalAmount: totalAmount,
    grandTotal: totalAmount
  };

  sessionStorage.setItem('bookingState', JSON.stringify(bookingStateObj));
  sessionStorage.setItem('booking_payload', JSON.stringify(bookingStateObj));
  window.location.href = 'concessions.html';
}

window.openTicketTypeModal = openTicketTypeModal;
window.closeTicketTypeModal = closeTicketTypeModal;
window.initTicketTypeCounts = initTicketTypeCounts;
window.updateProceedButtonState = updateProceedButtonState;

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

function getUnitPrice() {
  if (!showDetails) return 1500;
  return showDetails.ticketPrice || showDetails.basePrice || showDetails.price || 1500;
}

function formatShowDateTime(timeVal) {
  if (!timeVal) return 'MON, 07 SEP, 10:00 AM';
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return String(timeVal);

  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateNum = String(d.getDate()).padStart(2, '0');
  const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${dayStr}, ${dateNum} ${monthStr}, ${timeStr}`;
}

function formatTimeOnly(timeVal) {
  if (!timeVal) return '10:00 AM';
  if (typeof timeVal === 'string' && timeVal.includes(':') && !timeVal.includes('T')) {
    const parts = timeVal.split(':');
    let hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
  }

  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return String(timeVal);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

window.switchShowtime = switchShowtime;
window.handleSeatClick = handleSeatClick;
