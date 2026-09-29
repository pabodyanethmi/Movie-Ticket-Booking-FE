function showToast(message, type = 'info') {
  if (window.Toast && window.Toast.show) {
    window.Toast.show(message, type);
    return;
  }

  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    min-width: 280px;
    padding: 12px 18px;
    background: #1e1e1e;
    color: #ffffff;
    border-left: 4px solid ${type === 'error' ? '#ff4757' : type === 'success' ? '#10b981' : '#E50914'};
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
    animation: fadeIn 0.3s ease;
  `;
  toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:1.1rem;margin-left:12px;">&times;</button>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  modal.style.display = 'flex';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  if (tab === 'register') {
    setAuthView('register');
  } else {
    setAuthView('login');
  }
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function toggleAuthView() {
  const loginForm = document.getElementById('scopeLoginForm');
  const isLoginVisible = loginForm && loginForm.style.display !== 'none';
  setAuthView(isLoginVisible ? 'register' : 'login');
}

function setAuthView(view) {
  const title = document.getElementById('authModalTitle');
  const subtitle = document.getElementById('authModalSubtitle');
  const loginForm = document.getElementById('scopeLoginForm');
  const regForm = document.getElementById('scopeRegisterForm');
  const switcherText = document.getElementById('authSwitcherText');
  const switcherBtn = document.getElementById('authSwitcherBtn');

  if (view === 'register') {
    if (title) title.innerText = 'CREATE A CINEX ACCOUNT';
    if (subtitle) subtitle.innerText = 'New users please enter your registration details to create your account and book tickets online.';
    if (loginForm) loginForm.style.display = 'none';
    if (regForm) regForm.style.display = 'block';
    if (switcherText) switcherText.innerText = 'Already have an account?';
    if (switcherBtn) switcherBtn.innerText = 'Sign In';
  } else {
    if (title) title.innerText = 'LOGIN TO CINEX';
    if (subtitle) subtitle.innerText = 'Returning users please enter your login details to book your tickets online. New users can sign up and proceed with booking tickets.';
    if (loginForm) loginForm.style.display = 'block';
    if (regForm) regForm.style.display = 'none';
    if (switcherText) switcherText.innerText = "Don't you have an account yet?";
    if (switcherBtn) switcherBtn.innerText = 'Create New';
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btn) {
    btn.innerText = isPassword ? '🙈' : '👁';
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  }
}

async function handleAuthSubmit(event, mode) {
  event.preventDefault();

  if (mode === 'login') {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
      showToast('Please fill in both email and password.', 'error');
      return;
    }

    try {
      let data = null;
      if (typeof ApiClient !== 'undefined' && ApiClient.login) {
        const res = await ApiClient.login(email, password);
        data = res ? (res.data || res) : null;
      } else {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.message || 'Login failed. Please check credentials.');
        }
        data = await response.json();
      }

      Auth.setUser(data || { email, name: email.split('@')[0] });

      const userRole = data?.role || (data?.roles && data.roles.length > 0 ? data.roles[0] : '');
      const isAdmin = userRole === 'ROLE_ADMIN' || userRole.includes('ADMIN') || (data?.roles && data.roles.some(r => r.includes('ADMIN')));

      if (isAdmin) {
        showToast('Welcome Admin! Redirecting to dashboard...', 'success');
        closeAuthModal();
        setTimeout(() => {
          window.location.href = window.location.pathname.includes('/pages/') ? 'admin.html' : 'pages/admin.html';
        }, 800);
      } else {
        showToast('Signed in successfully!', 'success');
        closeAuthModal();
        Auth.renderNavUser();
      }
    } catch (err) {
      showToast(err.message || 'Login failed. Invalid credentials.', 'error');
    }
  } else if (mode === 'register') {
    const name = document.getElementById('regName')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;

    if (!name || !email || !password || !confirmPassword) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match! Please check and confirm your password.', 'error');
      const confirmInput = document.getElementById('regConfirmPassword');
      if (confirmInput) confirmInput.focus();
      return;
    }

    try {
      if (typeof ApiClient !== 'undefined' && ApiClient.register) {
        await ApiClient.register(name, email, password, confirmPassword, phone);
      } else {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password, confirmPassword, phone })
        });
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.message || 'Registration failed. Try again.');
        }
      }

      const regForm = document.getElementById('scopeRegisterForm');
      if (regForm) regForm.reset();

      showToast('Account created successfully! Please sign in to continue.', 'success');

      setAuthView('login');

      // 4. Pre-fill the registered email and keep password empty
      const loginEmail = document.getElementById('loginEmail');
      if (loginEmail) {
        loginEmail.value = email;
      }
      const loginPassword = document.getElementById('loginPassword');
      if (loginPassword) {
        loginPassword.value = '';
        loginPassword.focus();
      }
    } catch (err) {
      showToast(err.message || 'Registration failed. Try again.', 'error');
    }
  }
}

class Auth {
  static getUser() {
    try {
      const userStr = localStorage.getItem('cinex_user');
      if (!userStr) return null;
      const user = JSON.parse(userStr);

      if (user && user.expiresAt && Date.now() > user.expiresAt) {
        console.warn('Session expired (24 hours exceeded). Clearing session.');
        this.setUser(null);
        showToast('Your 24-hour session has expired. Please sign in again.', 'warning');
        return null;
      }

      return user;
    } catch {
      return null;
    }
  }

  static setUser(user) {
    if (user) {
      const { token, ...userMetadata } = user;
      const now = Date.now();
      const loginTime = userMetadata.loginTime || now;
      const expiresAt = userMetadata.expiresAt || (loginTime + 24 * 60 * 60 * 1000);

      const sanitizedUser = {
        ...userMetadata,
        loginTime,
        expiresAt
      };

      localStorage.setItem('cinex_user', JSON.stringify(sanitizedUser));
    } else {
      localStorage.removeItem('cinex_user');
    }
    this.renderNavUser();
  }

  static isAuthenticated() {
    return !!this.getUser();
  }

  static isAdmin() {
    const user = this.getUser();
    if (!user) return false;
    if (user.role && (user.role === 'ROLE_ADMIN' || user.role.includes('ADMIN'))) return true;
    return user.roles && user.roles.some(r => String(r).includes('ADMIN'));
  }

  static async validateSession() {
    if (!localStorage.getItem('cinex_user')) return null;

    try {
      if (typeof ApiClient !== 'undefined' && ApiClient.getCurrentUser) {
        const res = await ApiClient.getCurrentUser();
        if (res && res.data) {
          const existingUser = this.getUser() || {};
          const updatedUser = { ...existingUser, ...res.data };
          this.setUser(updatedUser);
          return updatedUser;
        }
      }
    } catch (err) {
      console.warn('Server session validation failed (cookie deleted or expired):', err);
      this.setUser(null);
      return null;
    }
    return this.getUser();
  }

  static async logout() {
    try {
      if (typeof ApiClient !== 'undefined' && ApiClient.logout) {
        await ApiClient.logout();
      }
    } catch (err) {
      console.warn('Logout API call failed:', err);
    }
    this.setUser(null);
    showToast('Logged out successfully', 'info');
    if (window.location.pathname.endsWith('admin.html')) {
      const isSubdir = window.location.pathname.includes('/pages/');
      window.location.href = isSubdir ? '../index.html' : 'index.html';
    }
  }

  static openAuthModal(mode = 'login') {
    openAuthModal(mode);
  }

  static closeAuthModal() {
    closeAuthModal();
  }

  static switchAuthTab(mode) {
    setAuthView(mode);
  }

  static renderNavUser() {
    const navUserContainer = document.getElementById('navUserActionsCenter');
    if (!navUserContainer) return;

    const user = this.getUser();

    if (user) {
      const name = user.name || user.email.split('@')[0];
      const initial = name.charAt(0).toUpperCase();

      navUserContainer.innerHTML = `
        <div class="nav-user-controls">
          <div class="user-avatar" title="${user.email}">
            ${initial}
          </div>
          <button class="btn-logout" onclick="Auth.logout()" title="Sign Out">LOGOUT</button>
        </div>
      `;
    } else {
      navUserContainer.innerHTML = `
        <div class="nav-user-controls">
          <a href="#" onclick="event.preventDefault(); openAuthModal('login');" class="user-avatar" title="Sign In / Profile">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </a>
        </div>
      `;
    }
  }
}

window.Auth = Auth;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthView = toggleAuthView;
window.setAuthView = setAuthView;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleAuthSubmit = handleAuthSubmit;

document.addEventListener('DOMContentLoaded', async () => {
  Auth.renderNavUser();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth') === 'expired') {
    showToast('Your session expired or your authentication cookie was cleared. Please sign in again.', 'warning');
  } else if (urlParams.get('auth') === 'required') {
    showToast('Please sign in to access this page.', 'info');
  }

  if (Auth.isAuthenticated()) {
    await Auth.validateSession();
  }
});
