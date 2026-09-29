let bookingSummary = null;
let timerSeconds = 300;
let timerInterval = null;
let selectedPaymentMethod = 'CREDIT_CARD';
let appliedPromo = null;
let discountAmount = 0.0;
let payableAmount = 0.0;

document.addEventListener('DOMContentLoaded', () => {
  initBookingSummary();
  initReservationTimer();
  initUserForm();
  initEventListeners();
});

function initBookingSummary() {
  try {
    const rawSummary = sessionStorage.getItem('bookingSummary') 
                    || sessionStorage.getItem('bookingState') 
                    || sessionStorage.getItem('booking_payload');

    if (!rawSummary) {
      console.warn('No active booking summary found in sessionStorage.');
      alert('No active reservation found. Returning to showtimes.');
      window.location.href = 'showtimes.html';
      return;
    }

    bookingSummary = JSON.parse(rawSummary);
    console.log('Checkout loaded booking summary:', bookingSummary);

    const ticketSubtotal = bookingSummary.ticketSubtotal || bookingSummary.ticketTotal || bookingSummary.totalAmount || 1900.0;
    const fnbTotal = bookingSummary.fnbTotal || bookingSummary.fnbSubtotal || 0.0;
    const initialGrandTotal = ticketSubtotal + fnbTotal;

    bookingSummary.ticketSubtotal = ticketSubtotal;
    bookingSummary.fnbTotal = fnbTotal;
    bookingSummary.grandTotal = initialGrandTotal;

    payableAmount = initialGrandTotal;

    renderOrderSummaryCard();
  } catch (err) {
    console.error('Failed to parse bookingSummary:', err);
    window.location.href = 'showtimes.html';
  }
}

function initReservationTimer() {
  const timerDisplay = document.getElementById('checkoutTimer');
  if (!timerDisplay) return;

  updateTimerDisplay();

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();

    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      if (typeof showToast === 'function') {
        showToast('Your reservation session has expired.', 'error');
      } else {
        alert('Session expired. Your seat reservation has timed out.');
      }
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1500);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('checkoutTimer');
  if (!timerDisplay) return;

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function initUserForm() {
  let currentUser = null;

  try {
    if (typeof Auth !== 'undefined' && Auth.getCurrentUser) {
      currentUser = Auth.getCurrentUser();
    } else {
      const stored = localStorage.getItem('cinex_user');
      if (stored) currentUser = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Could not read user profile:', e);
  }

  const nameInput = document.getElementById('customerFullName');
  const emailInput = document.getElementById('customerEmail');
  const phoneDigitsInput = document.getElementById('customerPhoneDigits');

  if (currentUser) {
    if (nameInput && !nameInput.value) nameInput.value = currentUser.name || currentUser.fullName || '';
    if (emailInput && !emailInput.value) emailInput.value = currentUser.email || '';
    if (phoneDigitsInput && !phoneDigitsInput.value && currentUser.phone) {
      let rawPhone = String(currentUser.phone).replace(/\D/g, '');
      if (rawPhone.startsWith('94')) rawPhone = rawPhone.substring(2);
      if (rawPhone.startsWith('07')) rawPhone = rawPhone.substring(2);
      if (rawPhone.length >= 8) {
        phoneDigitsInput.value = rawPhone.slice(-8);
      }
    }
  }

  [nameInput, emailInput, phoneDigitsInput].forEach(input => {
    if (input) {
      input.addEventListener('input', validateFormState);
    }
  });

  const termsCheckbox = document.getElementById('termsCheckbox');
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', validateFormState);
  }

  validateFormState();
}

function validateFormState() {
  const nameInput = document.getElementById('customerFullName');
  const emailInput = document.getElementById('customerEmail');
  const phoneDigitsInput = document.getElementById('customerPhoneDigits');
  const termsCheckbox = document.getElementById('termsCheckbox');
  const payBtn = document.getElementById('payNowBtn');

  if (!payBtn) return false;

  const isNameValid = nameInput && nameInput.value.trim().length > 0;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailInput && emailRegex.test(emailInput.value.trim());

  const phoneDigits = phoneDigitsInput ? phoneDigitsInput.value.trim().replace(/\D/g, '') : '';
  const isPhoneValid = phoneDigits.length === 8;

  const isTermsChecked = termsCheckbox && termsCheckbox.checked;
  const isValid = isNameValid && isEmailValid && isPhoneValid && isTermsChecked;

  payBtn.disabled = !isValid;
  return isValid;
}

function renderOrderSummaryCard() {
  if (!bookingSummary) return;

  const titleEl = document.getElementById('summaryMovieTitle');
  const ticketBadgeEl = document.getElementById('summaryTicketBadge');
  const metaEl = document.getElementById('summaryMetaDetails');
  const ticketPriceEl = document.getElementById('summaryTicketPriceVal');
  const fnbRowEl = document.getElementById('summaryFnbRow');
  const fnbPriceEl = document.getElementById('summaryFnbPriceVal');
  const discountRowEl = document.getElementById('summaryDiscountRow');
  const discountPriceEl = document.getElementById('summaryDiscountPriceVal');
  const subtotalPriceEl = document.getElementById('summarySubtotalVal');
  const payableBannerEl = document.getElementById('summaryPayableBannerVal');
  const payBtnAmountEl = document.getElementById('payBtnAmountVal');

  const movieTitle = (bookingSummary.movieTitle || 'SPIDER-MAN: BRAND NEW DAY').toUpperCase();
  const format = bookingSummary.format || 'DOLBY ATMOS';
  const showTimeStr = formatShowDateTime(bookingSummary.startTime || bookingSummary.showTime);
  const theater = (bookingSummary.theaterName || 'SCOPE CINEMAS MULTIPLEX').toUpperCase();
  const seatsStr = (bookingSummary.seats && bookingSummary.seats.length > 0) ? bookingSummary.seats.join(', ') : 'G13';
  const seatCount = bookingSummary.seats ? bookingSummary.seats.length : 1;
  const adultCount = bookingSummary.adultTickets || bookingSummary.adultCount || seatCount;
  const childCount = bookingSummary.childTickets || bookingSummary.childCount || 0;

  if (titleEl) titleEl.textContent = movieTitle;
  if (ticketBadgeEl) ticketBadgeEl.textContent = `${seatCount} TICKET${seatCount > 1 ? 'S' : ''}`;

  if (metaEl) {
    metaEl.textContent = `${format}, ${showTimeStr} | ${theater} | SEATS: ${seatsStr} | TICKETS: ODC ADULT ×${adultCount}${childCount > 0 ? `, CHILD ×${childCount}` : ''}`;
  }

  if (ticketPriceEl) {
    ticketPriceEl.textContent = `LKR ${bookingSummary.ticketSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  if (fnbRowEl && fnbPriceEl) {
    if (bookingSummary.fnbTotal > 0) {
      fnbRowEl.style.display = 'flex';
      fnbPriceEl.textContent = `LKR ${bookingSummary.fnbTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    } else {
      fnbRowEl.style.display = 'none';
    }
  }

  if (appliedPromo) {
    if (appliedPromo.type === 'PERCENT') {
      discountAmount = (bookingSummary.grandTotal * appliedPromo.value) / 100;
    } else if (appliedPromo.type === 'FLAT') {
      discountAmount = appliedPromo.value;
    }
  } else {
    discountAmount = 0.0;
  }

  payableAmount = Math.max(0, bookingSummary.grandTotal - discountAmount);

  if (discountRowEl && discountPriceEl) {
    if (discountAmount > 0) {
      discountRowEl.style.display = 'flex';
      discountPriceEl.textContent = `-LKR ${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    } else {
      discountRowEl.style.display = 'none';
    }
  }

  const formattedPayableStr = `LKR ${payableAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (subtotalPriceEl) subtotalPriceEl.textContent = formattedPayableStr;
  if (payableBannerEl) payableBannerEl.textContent = formattedPayableStr;
  if (payBtnAmountEl) payBtnAmountEl.textContent = formattedPayableStr;
}

function selectPaymentMethod(methodKey) {
  selectedPaymentMethod = methodKey;

  const card1 = document.getElementById('payMethodVisa');
  const card2 = document.getElementById('payMethodAmex');

  if (card1) card1.classList.toggle('active', methodKey === 'CREDIT_CARD');
  if (card2) card2.classList.toggle('active', methodKey === 'AMEX');
}

function openPromoModal() {
  const modal = document.getElementById('promoModal');
  if (modal) modal.classList.add('active');
}

function closePromoModal() {
  const modal = document.getElementById('promoModal');
  if (modal) modal.classList.remove('active');
}

function applyPromoCode() {
  const input = document.getElementById('promoCodeInput');
  const code = input ? input.value.trim().toUpperCase() : '';
  const msgEl = document.getElementById('promoModalMsg');

  if (!code) {
    if (msgEl) {
      msgEl.style.color = '#ef4444';
      msgEl.textContent = 'Please enter a voucher or promo code.';
    }
    return;
  }

  if (code === 'SCOPE20') {
    appliedPromo = { code: 'SCOPE20', type: 'PERCENT', value: 20 };
  } else if (code === 'DISCOUNT10') {
    appliedPromo = { code: 'DISCOUNT10', type: 'PERCENT', value: 10 };
  } else if (code === 'CINEX100') {
    appliedPromo = { code: 'CINEX100', type: 'FLAT', value: 100 };
  } else {
    if (msgEl) {
      msgEl.style.color = '#ef4444';
      msgEl.textContent = 'Invalid promo code. Try SCOPE20 for 20% off!';
    }
    return;
  }

  if (msgEl) {
    msgEl.style.color = '#10b981';
    msgEl.textContent = `Promo code "${code}" applied successfully!`;
  }

  const promoBannerText = document.getElementById('promoBannerText');
  if (promoBannerText) {
    promoBannerText.innerHTML = `🏷️ PROMO APPLIED: <strong>${code}</strong> <span class="promo-applied-tag">SAVED</span>`;
  }

  renderOrderSummaryCard();

  setTimeout(() => {
    closePromoModal();
  }, 1000);
}

async function handlePayNowClick() {
  if (!validateFormState()) return;

  const nameVal = document.getElementById('customerFullName').value.trim();
  const emailVal = document.getElementById('customerEmail').value.trim();
  const phoneDigitsVal = document.getElementById('customerPhoneDigits').value.trim();
  const fullPhone = `07${phoneDigitsVal}`;

  const payBtn = document.getElementById('payNowBtn');
  if (payBtn) payBtn.disabled = true;

  const initiatePayload = {
    showId: bookingSummary.showId || 1,
    seatIds: bookingSummary.seatIds || [1],
    amount: payableAmount,
    currency: 'LKR',
    customerName: nameVal,
    customerEmail: emailVal,
    customerPhone: fullPhone,
    items: `${bookingSummary.movieTitle || 'Movie Tickets'} - Scope Cinemas`,
    concessions: bookingSummary.concessions || []
  };

  let payhereConfig = null;
  let apiError = null;

  if (typeof ApiClient !== 'undefined' && ApiClient.request) {
    try {
      const response = await ApiClient.request('/payments/payhere/initiate', {
        method: 'POST',
        body: JSON.stringify(initiatePayload)
      });

      if (response && response.data) {
        payhereConfig = response.data;
      }
    } catch (err) {
      apiError = err;
    }
  }

  if (apiError) {
    const errorMsg = apiError.message || 'One or more selected seats are already booked. Please choose available seats.';
    console.error('Payment initiation error:', errorMsg);

    if (payBtn) payBtn.disabled = false;

    if (typeof showToast === 'function') {
      showToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }

    if (errorMsg.toLowerCase().includes('seat') || errorMsg.toLowerCase().includes('booked')) {
      setTimeout(() => {
        window.location.href = 'seats.html';
      }, 1800);
    }
    return;
  }

  if (payhereConfig && typeof payhere !== 'undefined' && payhere.startPayment) {
    const confirmedReference = payhereConfig.orderId || payhereConfig.bookingReference || payhereConfig.order_id;
    payhereConfig.orderId = confirmedReference;
    payhereConfig.bookingReference = confirmedReference;

    payhere.onCompleted = async function onCompleted(orderId) {
      console.log("PayHere Payment completed. Confirmed Reference:", confirmedReference);
      try {
        let confirmedBooking = null;
        if (typeof ApiClient !== 'undefined' && ApiClient.request) {
          const res = await ApiClient.request(`/payments/payhere/confirm/${encodeURIComponent(confirmedReference)}`, {
            method: 'POST'
          });
          confirmedBooking = res && res.data ? res.data : res;
        } else {
          const apiBase = window.API_BASE || 'http://localhost:8080/api/v1';
          const res = await fetch(`${apiBase}/payments/payhere/confirm/${encodeURIComponent(confirmedReference)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const json = await res.json();
          confirmedBooking = json && json.data ? json.data : json;
        }
        if (confirmedBooking) {
          sessionStorage.setItem('lastBooking', JSON.stringify(confirmedBooking));
        }
      } catch (err) {
        console.warn("Error confirming PayHere order in backend:", err);
      }

      sessionStorage.removeItem('bookingSummary');
      sessionStorage.removeItem('bookingState');
      sessionStorage.removeItem('booking_payload');
      window.location.href = `booking-success.html?orderId=${confirmedReference}`;
    };

    payhere.onDismissed = function onDismissed() {
      console.log("PayHere Payment dismissed");
      if (payBtn) payBtn.disabled = false;
      if (typeof showToast === 'function') {
        showToast('Payment window was closed. You can retry when ready.', 'warning');
      }
    };

    payhere.onError = function onError(error) {
      console.error("PayHere Error:", error);
      if (payBtn) payBtn.disabled = false;
      if (typeof showToast === 'function') {
        showToast('PayHere Gateway Notice: ' + error, 'error');
      }
    };

    const formattedAmountStr = payhereConfig.formattedAmount 
      ? String(payhereConfig.formattedAmount) 
      : Number(payhereConfig.amount).toFixed(2);

    const cleanPayload = {
      sandbox: payhereConfig.sandbox !== undefined ? payhereConfig.sandbox : true,
      merchant_id: payhereConfig.merchantId,
      return_url: window.location.origin + '/pages/booking-success.html?orderId=' + confirmedReference,
      cancel_url: window.location.origin + '/pages/checkout.html',
      notify_url: payhereConfig.notifyUrl || (window.location.origin + '/api/v1/payments/payhere/notify'),
      order_id: confirmedReference,
      items: payhereConfig.items,
      amount: formattedAmountStr,
      currency: payhereConfig.currency || 'LKR',
      hash: payhereConfig.hash,
      first_name: payhereConfig.firstName,
      last_name: payhereConfig.lastName,
      email: payhereConfig.email,
      phone: payhereConfig.phone,
      address: payhereConfig.address || 'Scope Cinemas Multiplex',
      city: payhereConfig.city || 'Colombo',
      country: payhereConfig.country || 'Sri Lanka'
    };

    delete cleanPayload.iframe;
    console.log('Invoking payhere.startPayment with cleanPayload:', cleanPayload);
    payhere.startPayment(cleanPayload);
    return;
  }

  if (payBtn) payBtn.disabled = false;
  openFallbackModal(nameVal);
}

function openFallbackModal(customerName) {
  const cardNameInput = document.getElementById('simCardName');
  if (cardNameInput) cardNameInput.value = customerName.toUpperCase();

  const previewName = document.getElementById('cardPreviewName');
  if (previewName) previewName.textContent = customerName.toUpperCase();

  const modal = document.getElementById('fallbackCardModal');
  if (modal) modal.classList.add('active');
}

function closeFallbackModal() {
  const modal = document.getElementById('fallbackCardModal');
  if (modal) modal.classList.remove('active');
}

function updateCardPreviewNumber(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  let formatted = val.replace(/(.{4})/g, '$1 ').trim();
  input.value = formatted;

  const display = document.getElementById('cardPreviewNumber');
  if (display) {
    display.textContent = formatted || '•••• •••• •••• ••••';
  }
}

function updateCardPreviewExp(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 3) {
    val = val.substring(0, 2) + '/' + val.substring(2);
  }
  input.value = val;

  const display = document.getElementById('cardPreviewExp');
  if (display) {
    display.textContent = val || 'MM/YY';
  }
}

function showOtpStep() {
  const cardStep = document.getElementById('cardInputStep');
  const otpStep = document.getElementById('otpVerifyStep');

  if (cardStep) cardStep.style.display = 'none';
  if (otpStep) otpStep.style.display = 'block';
}

async function verifyOtpAndPay() {
  const otpInput = document.getElementById('otpInput');
  const otp = otpInput ? otpInput.value.trim() : '';

  if (otp.length !== 6) {
    alert('Please enter the 6-digit OTP sent to your phone (e.g., 123456).');
    return;
  }

  const nameVal = document.getElementById('customerFullName').value.trim();
  const emailVal = document.getElementById('customerEmail').value.trim();
  const phoneDigitsVal = document.getElementById('customerPhoneDigits').value.trim();
  const fullPhone = `07${phoneDigitsVal}`;

  await confirmBookingInBackend(nameVal, emailVal, fullPhone, selectedPaymentMethod);
}

async function confirmBookingInBackend(customerName, customerEmail, customerPhone, paymentMethod) {
  try {
    const payBtn = document.getElementById('payNowBtn');
    if (payBtn) payBtn.disabled = true;

    const payload = {
      showId: bookingSummary.showId || 1,
      seatIds: bookingSummary.seatIds || [1],
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      paymentMethod: paymentMethod === 'AMEX' ? 'CREDIT_CARD' : paymentMethod,
      totalAmount: payableAmount,
      discountAmount: discountAmount,
      promoCode: appliedPromo ? appliedPromo.code : null,
      concessions: bookingSummary.concessions || []
    };

    let responseData = null;

    if (typeof ApiClient !== 'undefined' && ApiClient.request) {
      const result = await ApiClient.request('/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify(payload)
      }).catch(async () => {
        return await ApiClient.request('/bookings', {
          method: 'POST',
          body: JSON.stringify(payload)
        }).catch(() => null);
      });

      if (result && result.data) {
        responseData = result.data;
      }
    }

    const orderId = responseData && responseData.bookingReference 
      ? responseData.bookingReference 
      : `CX-${Math.floor(100000 + Math.random() * 900000)}`;

    sessionStorage.removeItem('bookingSummary');
    sessionStorage.removeItem('bookingState');
    sessionStorage.removeItem('booking_payload');

    window.location.href = `booking-success.html?orderId=${orderId}`;

  } catch (err) {
    console.error('Failed to confirm booking:', err);
    alert('Failed to process payment. Please check your card details and try again.');
  }
}

function formatShowDateTime(timeVal) {
  if (!timeVal) return 'WED, 09 SEP, 01:00 PM';
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return String(timeVal);

  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateNum = String(d.getDate()).padStart(2, '0');
  const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `${dayStr}, ${dateNum} ${monthStr}, ${timeStr}`;
}

function initEventListeners() {
  const phoneInput = document.getElementById('customerPhoneDigits');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 8);
    });
  }
}

window.selectPaymentMethod = selectPaymentMethod;
window.openPromoModal = openPromoModal;
window.closePromoModal = closePromoModal;
window.applyPromoCode = applyPromoCode;
window.handlePayNowClick = handlePayNowClick;
window.closeFallbackModal = closeFallbackModal;
window.updateCardPreviewNumber = updateCardPreviewNumber;
window.updateCardPreviewExp = updateCardPreviewExp;
window.showOtpStep = showOtpStep;
window.verifyOtpAndPay = verifyOtpAndPay;
