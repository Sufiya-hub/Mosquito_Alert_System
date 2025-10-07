const PANCHAYAT_EMAIL = 'panchayat.admin@example.com';
const ADMIN_SECRET_KEY = 'PanchayatAccess2025';

let app;
let auth;
let db;
let userId = null;
let userVillage = null;
let userEmail = null;
let userPhone = null;
let isPanchayat = false;

const main = document.getElementById('app-main');
const footerInfo = document.getElementById('footer-info');
const authBtn = document.getElementById('authBtn');
const profileBtn = document.getElementById('profileBtn');
const displayUid = document.getElementById('display-uid');
const CUSTOM_MODAL = document.getElementById('customModal');
const appContainer = document.getElementById('appContainer');

function showCustomModal(title, message) {
  document.getElementById('modalTitle').innerHTML = title;
  document.getElementById('modalMessage').textContent = message;
  CUSTOM_MODAL.classList.remove('hidden');
  CUSTOM_MODAL.classList.add('flex');
}
window.showCustomModal = showCustomModal;
function hideCustomModal() {
  CUSTOM_MODAL.classList.add('hidden');
  CUSTOM_MODAL.classList.remove('flex');
}
window.hideCustomModal = hideCustomModal;
function toggleLoading(submitButton, isLoading) {
  const spinner = submitButton.querySelector('#spinner');
  const submitText = submitButton.querySelector('#submitText');
  submitButton.disabled = isLoading;
  spinner.classList.toggle('hidden', !isLoading);
  submitText.textContent = isLoading
    ? 'Sending...'
    : 'Submit Report to Panchayat';
}

function setStatus(statusMessageDiv, message, isSuccess = true) {
  statusMessageDiv.textContent = message;
  statusMessageDiv.className = `mt-4 p-3 text-center rounded-xl font-semibold transition duration-150 ${
    isSuccess
      ? 'bg-green-100 text-green-700 shadow-md'
      : 'bg-red-100 text-red-700 shadow-md'
  }`;
  statusMessageDiv.style.display = 'block';

  if (isSuccess) {
    setTimeout(() => {
      statusMessageDiv.style.display = 'none';
    }, 5000);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function maskPhoneNumber(phone) {
  if (!phone || phone.length <= 5) return phone;
  const len = phone.length;

  const start = phone.substring(0, 5);
  const end = phone.substring(len - 2);

  const maskLength = len - 7 > 0 ? len - 7 : 0;
  const mask = '*'.repeat(maskLength);

  return `${start}${mask}${end}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  await initializeFirebase();
});

async function initializeFirebase() {
  try {
    const firebaseConfig = {
      apiKey: 'AIzaSyBR4mmsM9bYSonlcO8rPHcMjoOdNicZFrQ',
      authDomain: 'my-project-1431b.firebaseapp.com',
      projectId: 'my-project-1431b',
      storageBucket: 'my-project-1431b.firebasestorage.app',
      messagingSenderId: '373117839897',
      appId: '1:373117839897:web:3a0b19c1cb276b835ad888',
      measurementId: 'G-BCZ0BMMHN7',
    };

    const appId =
      typeof window.__app_id !== 'undefined'
        ? window.__app_id
        : 'default-app-id';
    const initialAuthToken =
      typeof window.__initial_auth_token !== 'undefined'
        ? window.__initial_auth_token
        : null;

    app = window.initializeApp(firebaseConfig);
    auth = window.getAuth(app);
    db = window.getFirestore(app);

    footerInfo.textContent = 'Status: Authenticating...';

    let signedIn = false;
    if (initialAuthToken) {
      try {
        await window.signInWithCustomToken(auth, initialAuthToken);
        signedIn = true;
      } catch (customTokenError) {
        console.warn(
          'Custom token sign-in failed/skipped. Proceeding to anonymous sign-in.',
          customTokenError.code
        );
      }
    }

    if (!signedIn) {
      await window.signInAnonymously(auth);
    }

    window.onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        displayUid.textContent = userId;
        userEmail = user.email;
        await loadUserProfile(userId);
      } else {
        renderView('login');
        footerInfo.textContent = 'Status: Signed out. Please Login/Register.';
        displayUid.textContent = 'N/A';
      }
    });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    main.innerHTML = `<div class="card text-red-600">
          <h2 class="text-2xl font-bold mb-2">Firebase Initialization Failed</h2>
          <p>Failed to initialize services: ${error.message}. Please check your console for details.</p>
        </div>`;
    footerInfo.textContent = 'Status: Initialization Error';
  }
}

async function loadUserProfile(uid) {
  const userDocRef = window.doc(
    db,
    `artifacts/${window.__app_id}/users/${uid}/profiles/user_data`
  );
  try {
    const docSnap = await window.getDoc(userDocRef);

    if (userEmail === PANCHAYAT_EMAIL) {
      isPanchayat = true;
      footerInfo.textContent = `Status: Logged in as Panchayat Admin: ${userEmail}`;
      renderView('panchayat');
      appContainer.classList.add('w-expanded');
      return;
    }

    isPanchayat = false;
    appContainer.classList.remove('w-expanded');

    if (docSnap.exists()) {
      const data = docSnap.data();
      userVillage = data.village;
      userEmail = data.email || userEmail;
      userPhone = data.phone || '';
      footerInfo.textContent = `Status: Logged in as ${userEmail} (${userVillage})`;
      renderView('report');
    } else if (userEmail) {
      renderView('register_profile');
    } else {
      await window.signOut(auth);
      renderView('login');
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    renderView('login');
  }
}

async function completeProfile(event) {
  event.preventDefault();
  const form = event.target;
  const village = form.village.value.trim();
  const phone = form.phone.value.trim();
  const statusDiv = document.getElementById('profileStatus');

  if (!village || !phone) {
    showCustomModal(
      'Error',
      'Please enter both your Village/Area name and Phone number.'
    );
    return;
  }

  const userDocRef = window.doc(
    db,
    `artifacts/${window.__app_id}/users/${userId}/profiles/user_data`
  );

  try {
    await window.setDoc(userDocRef, {
      village: village,
      email: userEmail,
      phone: phone,
      role: 'Villager/Citizen',
      registeredAt: new Date().toISOString(),
    });
    userVillage = village;
    userPhone = phone;
    footerInfo.textContent = `Status: Logged in as ${userEmail} (${userVillage})`;
    renderView('report');
  } catch (error) {
    console.error('Error saving user profile:', error);
    statusDiv.textContent = 'Error saving profile: ' + error.message;
  }
}
window.completeProfile = completeProfile;

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value;
  const password = form.password.value;
  const statusDiv = document.getElementById('authStatus');

  try {
    if (email === PANCHAYAT_EMAIL && password === ADMIN_SECRET_KEY) {
      const userCredential = await window.signInAnonymously(auth);
      userId = userCredential.user.uid;
      userEmail = email;
      statusDiv.textContent = 'Admin Key accepted. Loading dashboard...';
      await loadUserProfile(userId);
      return;
    }

    statusDiv.textContent = 'Logging in...';
    const userCredential = await window.signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    userId = userCredential.user.uid;
    userEmail = userCredential.user.email;
    statusDiv.textContent = 'Login successful. Loading profile...';
    await loadUserProfile(userId);
  } catch (error) {
    console.error('Login failed:', error);
    if (error.code === 'auth/operation-not-allowed') {
      statusDiv.textContent =
        'Login Failed: Authentication method not enabled. Please enable "Email/Password" in your Firebase console settings.';
    } else if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found'
    ) {
      statusDiv.textContent =
        'Login Failed: Invalid credentials. Check your email and password, or use "Forgot Password?" if you forgot.';
    } else {
      statusDiv.textContent = 'Login Failed: ' + error.message;
    }
  }
}
window.handleLogin = handleLogin;

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value;
  const password = form.password.value;
  const village = form.village.value;
  const phone = form.phone.value;
  const statusDiv = document.getElementById('authStatus');

  if (email === PANCHAYAT_EMAIL) {
    statusDiv.textContent =
      'Registration denied. This email is reserved for administration.';
    return;
  }

  try {
    statusDiv.textContent = 'Creating user...';
    const userCredential = await window.createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    userId = userCredential.user.uid;
    userEmail = email;

    const userDocRef = window.doc(
      db,
      `artifacts/${window.__app_id}/users/${userId}/profiles/user_data`
    );
    await window.setDoc(userDocRef, {
      village: village,
      phone: phone,
      email: email,
      role: 'Villager/Citizen',
      registeredAt: new Date().toISOString(),
    });

    userVillage = village;
    userPhone = phone;
    statusDiv.textContent =
      'Registration successful! Redirecting to report page...';
    footerInfo.textContent = `Status: Logged in as ${userEmail} (${userVillage})`;
    renderView('report');
  } catch (error) {
    console.error('Registration failed:', error);
    if (error.code === 'auth/operation-not-allowed') {
      statusDiv.textContent =
        'Registration Failed: Authentication method not enabled. Please enable "Email/Password" in your Firebase console settings.';
    } else {
      statusDiv.textContent = 'Registration Failed: ' + error.message;
    }
  }
}
window.handleRegister = handleRegister;

async function handleForgotPassword(event) {
  event.preventDefault();
  const email = document.getElementById('reset-email').value;
  const statusDiv = document.getElementById('resetStatus');

  if (!email) {
    statusDiv.textContent = 'Please enter your email address.';
    return;
  }

  statusDiv.textContent = 'Sending reset link...';
  try {
    await window.sendPasswordResetEmail(auth, email);
    showCustomModal(
      'Password Reset Sent',
      `A password reset link has been successfully sent to:\n\n${email}\n\nPlease check your inbox (and spam folder).`
    );
    renderView('login');
  } catch (error) {
    console.error('Password reset error:', error);
    statusDiv.textContent = `Error: ${error.message}`;
  }
}
window.handleForgotPassword = handleForgotPassword;

function handleSignOut() {
  window
    .signOut(auth)
    .then(() => {
      userId = null;
      userVillage = null;
      userEmail = null;
      userPhone = null;
      isPanchayat = false;
      appContainer.classList.remove('w-expanded');
      footerInfo.textContent = 'Status: Signed out. Please Login/Register.';
      renderView('login');
    })
    .catch((error) => {
      console.error('Sign out error:', error);
    });
}
window.handleSignOut = handleSignOut;

function handleAuthButtonClick() {
  if (authBtn.textContent === 'Logout') {
    handleSignOut();
  } else if (authBtn.textContent === 'Switch to Login') {
    renderView('login');
  } else if (authBtn.textContent === 'Switch to Register') {
    renderView('register');
  }
}
window.handleAuthButtonClick = handleAuthButtonClick;

function renderView(view) {
  let content = '';

  function hideHeaderButtons() {
    authBtn.classList.add('hidden');
    profileBtn.classList.add('hidden');
  }

  if (view !== 'panchayat' && window.unsubscribeReports) {
    window.unsubscribeReports();
  }

  hideHeaderButtons();

  if (view === 'login') {
    content = renderLoginForm();
    authBtn.textContent = 'Switch to Register';
    authBtn.onclick = () => renderView('register');
    authBtn.classList.remove('hidden');
  } else if (view === 'register') {
    content = renderRegisterForm();
    authBtn.textContent = 'Switch to Login';
    authBtn.onclick = () => renderView('login');
    authBtn.classList.remove('hidden');
  } else if (view === 'forgot_password') {
    content = renderForgotPasswordForm();
    authBtn.textContent = 'Back to Login';
    authBtn.onclick = () => renderView('login');
    authBtn.classList.remove('hidden');
  } else if (view === 'register_profile') {
    content = renderProfileForm();
  } else if (view === 'report' && userVillage) {
    content = renderReportingView();
    authBtn.textContent = 'Logout';
    authBtn.onclick = handleSignOut;
    authBtn.classList.remove('hidden');
    profileBtn.classList.remove('hidden');
    appContainer.classList.remove('w-expanded');
    checkForResolvedReports(userEmail);
  } else if (view === 'panchayat' && isPanchayat) {
    content = renderPanchayatDashboard();
    authBtn.textContent = 'Logout';
    authBtn.onclick = handleSignOut;
    authBtn.classList.remove('hidden');
    appContainer.classList.add('w-expanded');
  } else {
    content = renderLoading();
    authBtn.classList.add('hidden');
  }
  main.innerHTML = content;
}
window.renderView = renderView;

async function checkForResolvedReports(reporterEmail) {
  if (!reporterEmail || isPanchayat) return;

  const reportsCollectionRef = window.collection(
    db,
    `artifacts/${window.__app_id}/public/data/reports`
  );

  const q = window.query(
    reportsCollectionRef,
    window.where('reportedByEmail', '==', reporterEmail),
    window.where('status', '==', 'Resolved')
  );

  try {
    const snapshot = await window.getDocs(q);
    let resolvedCount = 0;
    let resolvedMessage = `✅ RESOLUTION ALERT (SMS/WhatsApp Simulation) ✅\n\nTo: ${userPhone}\n\nGreat News! The following reports you submitted have been SUCCESSFULLY RESOLVED by the Village Panchayat:\n\n`;

    snapshot.forEach(async (doc) => {
      const report = doc.data();

      if (!report.acknowledgedByReporter) {
        resolvedCount++;
        resolvedMessage += `* Site Type: ${report.siteType}\n* Location: ${
          report.location
        }\n* Resolution Date: ${new Date(
          report.lastActionTime
        ).toLocaleString()}\n\n`;

        await window.updateDoc(
          window.doc(
            db,
            `artifacts/${window.__app_id}/public/data/reports`,
            doc.id
          ),
          {
            acknowledgedByReporter: true,
          }
        );
      }
    });

    if (resolvedCount > 0) {
      showCustomModal(
        'Resolution Alert Sent!',
        resolvedMessage +
          'Thank you for your timely report and helping to keep our village safe!'
      );
    }
  } catch (error) {
    console.error('Error checking for resolved reports:', error);
  }
}

function renderLoading() {
  return `
          <div id="loading" class="text-center p-8 text-gray-500 font-medium">
            Loading...
          </div>
        `;
}

function renderLoginForm() {
  return `
          <div class="card max-w-sm mx-auto">
            <h2 class="text-2xl font-bold mb-4 text-gray-700">User Login</h2>
            <form onsubmit="window.handleLogin(event)">
              <div class="mb-4">
                <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                <input type="email" id="login-email" name="email" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]">
              </div>
              <div class="mb-4">
                <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">Password:</label>
                <input type="password" id="login-password" name="password" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]">
              </div>
              <div class="flex justify-between mb-6">
                <p class="text-xs text-gray-500 pt-1">Admin Key: ${ADMIN_SECRET_KEY}</p>
                <a href="#" onclick="event.preventDefault(); renderView('forgot_password')" class="text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition duration-150">Forgot Password?</a>
              </div>
              <button type="submit" class="w-full text-white submit-btn font-bold py-3 px-4 rounded-xl shadow-lg">Login</button>
              <div id="authStatus" class="mt-4 text-center text-sm font-medium text-red-500"></div>
            </form>
          </div>
        `;
}

function renderRegisterForm() {
  return `
          <div class="card max-w-sm mx-auto">
            <h2 class="text-2xl font-bold mb-4 text-gray-700">New User Registration</h2>
            <p class="text-sm text-red-500 mb-3">Note: The Panchayat Admin email is reserved for security.</p>
            <form onsubmit="window.handleRegister(event)">
              <div class="mb-4">
                <label for="register-email" class="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                <input type="email" id="register-email" name="email" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]">
              </div>
              <div class="mb-4">
                <label for="register-password" class="block text-sm font-medium text-gray-700 mb-1">Password (min 6 characters):</label>
                <input type="password" id="register-password" name="password" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]">
              </div>
              <div class="mb-4">
                <label for="register-village" class="block text-sm font-medium text-gray-700 mb-1">Village/Area Name:</label>
                <input type="text" id="register-village" name="village" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="e.g., Kothapally">
              </div>
              <div class="mb-6">
                <label for="register-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number (For Alerts):</label>
                <input type="tel" id="register-phone" name="phone" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="e.g., 9876543210">
              </div>
              <button type="submit" class="w-full text-white submit-btn font-bold py-3 px-4 rounded-xl shadow-lg">Register</button>
              <div id="authStatus" class="mt-4 text-center text-sm font-medium text-red-500"></div>
            </form>
          </div>
        `;
}

function renderForgotPasswordForm() {
  return `
          <div class="card max-w-sm mx-auto">
            <h2 class="text-2xl font-bold mb-4 text-gray-700">Reset Password</h2>
            <p class="text-gray-500 mb-4">Enter the email address you registered with, and we'll send you a link to reset your password.</p>
            <form onsubmit="window.handleForgotPassword(event)">
              <div class="mb-6">
                <label for="reset-email" class="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                <input type="email" id="reset-email" name="email" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="your.email@example.com">
              </div>
              <button type="submit" class="w-full text-white bg-red-600 font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-red-700">Send Reset Link</button>
              <div id="resetStatus" class="mt-4 text-center text-sm font-medium text-red-500"></div>
            </form>
          </div>
        `;
}

function renderProfileForm() {
  const currentVillage = userVillage || '';
  const currentPhone = userPhone || '';
  const isEditing = !!userVillage;

  return `
          <div class="card max-w-sm mx-auto">
            <h2 class="text-2xl font-bold mb-4 text-gray-700">${
              isEditing ? 'Update Profile' : 'Complete Profile'
            }</h2>
            <p class="text-gray-500 mb-4">Update your contact details and village location.</p>
            <form onsubmit="window.completeProfile(event)">
              <div class="mb-4">
                <label for="profile-village" class="block text-sm font-medium text-gray-700 mb-1">Village/Area Name:</label>
                <input type="text" id="profile-village" name="village" required 
                      class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" 
                      placeholder="e.g., Kothapally"
                      value="${currentVillage}">
              </div>
              <div class="mb-6">
                <label for="profile-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number (For Alerts):</label>
                <input type="tel" id="profile-phone" name="phone" required 
                      class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" 
                      placeholder="e.g., 9876543210"
                      value="${currentPhone}">
              </div>
              <button type="submit" class="w-full text-white submit-btn font-bold py-3 px-4 rounded-xl shadow-lg">Save Profile</button>
              <div id="profileStatus" class="mt-4 text-center text-sm font-medium text-red-500"></div>
            </form>
          </div>
        `;
}

function renderReportingView() {
  return `
          <div class="card">
            <h2 class="text-xl font-semibold mb-4 text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Report a Breeding Site (Village: ${userVillage})
            </h2>
            <p class="text-sm text-gray-500 mb-4">Reports are immediately forwarded to the Village Panchayat for action.</p>

            <form id="reportForm" onsubmit="window.submitReport(event)">
              
              <div class="mb-4">
                <label for="reporter_village_name" class="block text-sm font-medium text-gray-700 mb-1">Your Village (Pre-filled):</label>
                <input type="text" id="reporter_village_name" value="${userVillage}" disabled class="w-full p-3 bg-gray-100 border border-gray-300 rounded-xl">
              </div>
              
              <div class="mb-4">
                <label for="location" class="block text-sm font-medium text-gray-700 mb-1">Specific Location/Landmark:</label>
                <input type="text" id="location" name="location" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="e.g., Behind school, Near main road">
              </div>

              <div class="mb-4">
                <label for="site_type" class="block text-sm font-medium text-gray-700 mb-1">Type of Breeding Site:</label>
                <select id="site_type" name="site_type" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981] transition duration-150 ease-in-out">
                  <option value="">-- Select Type --</option>
                  <option value="Stagnant Water">Stagnant Water (Tire, Bucket, Pond)</option>
                  <option value="Uncovered Drainage">Uncovered Drainage/Sewer</option>
                  <option value="Solid Waste/Trash">Solid Waste Accumulation/Trash</option>
                  <option value="Other">Other Unhygienic Area</option>
                </select>
              </div>
              
              <div class="mb-4">
                <label for="image_file" class="block text-sm font-medium text-gray-700 mb-1">Upload Picture (Optional):</label>
                <input type="file" id="image_file" name="image_file" accept="image/*" class="w-full p-3 border border-gray-300 rounded-xl bg-white">
                <p class="text-xs text-red-500 mt-1">Image size is limited by the database (1MB per report).</p>
              </div>

              <div class="mb-6">
                <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Additional Details:</label>
                <textarea id="description" name="description" rows="3" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#10B981]" placeholder="Describe the size or urgency of the site..."></textarea>
              </div>
              
              <button type="submit" id="submitButton" class="w-full text-white submit-btn font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#10B981] focus:ring-opacity-50 flex items-center justify-center disabled:opacity-50">
                <span id="submitText">Submit Report to Panchayat</span>
                <svg id="spinner" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </button>
              
              <div id="statusMessage" class="mt-4 p-3 text-center rounded-xl font-semibold hidden" role="alert"></div>
            </form>
          </div>

          <div class="card">
            <h2 class="text-xl font-semibold mb-4 text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Prevention Tips & Awareness
            </h2>
            <ul class="space-y-3 text-gray-600">
              <li class="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500 flex items-start">
                <span class="mr-2 text-blue-600 font-bold">1.</span> Clear all **stagnant water** (tires, buckets, flower pots) at least once a week.
              </li>
              <li class="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500 flex items-start">
                <span class="mr-2 text-blue-600 font-bold">2.</span> Sleep under **mosquito nets**, especially if you are in a high-risk zone.
              </li>
              <li class="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500 flex items-start">
                <span class="mr-2 text-blue-600 font-bold">3.</span> Cover all **water storage containers** tightly to prevent mosquitoes from laying eggs.
              </li>
              <li class="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500 flex items-start">
                <span class="mr-2 text-blue-600 font-bold">4.</span> Wear **long-sleeved shirts and pants** to minimize exposed skin outdoors.
              </li>
            </ul>
          </div>
        `;
}

let unsubscribeReports = null;
window.unsubscribeReports = () => {
  if (unsubscribeReports) unsubscribeReports();
  unsubscribeReports = null;
};
function renderPanchayatDashboard() {
  if (unsubscribeReports) {
    unsubscribeReports();
  }

  const html = `
          <div class="card p-4 sm:p-6 w-full"> <h2 class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Panchayat Monitoring Dashboard
            </h2>
            <div id="reportsContainer" class="space-y-4">
              <p class="text-center text-gray-500">Loading real-time reports...</p>
            </div>
            <p class="text-xs text-gray-400 mt-6">Data is streamed live from user reports (artifacts/${window.__app_id}/public/data/reports).</p>
          </div>
        `;

  setTimeout(setupReportsListener, 100);

  return html;
}

function setupReportsListener() {
  const reportsContainer = document.getElementById('reportsContainer');
  if (!reportsContainer) return;

  const reportsCollectionRef = window.collection(
    db,
    `artifacts/${window.__app_id}/public/data/reports`
  );
  const q = window.query(reportsCollectionRef);

  unsubscribeReports = window.onSnapshot(
    q,
    (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });

      reports.sort(
        (a, b) => new Date(b.submissionTime) - new Date(a.submissionTime)
      );

      renderReportsList(reports, reportsContainer);
    },
    (error) => {
      console.error('Error fetching reports:', error);
      reportsContainer.innerHTML = `<p class="text-red-500">Error loading reports: ${error.message}</p>`;
    }
  );
}

function renderReportsList(reports, container) {
  if (reports.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 p-8">No reports submitted yet.</p>`;
    return;
  }

  const reportHtml = reports
    .map((report) => {
      const statusClass = report.status.toLowerCase().replace(' ', '-');
      const submissionDate = new Date(report.submissionTime).toLocaleString();

      return `
            <div class="p-4 rounded-xl shadow-md transition duration-200 ${
              'status-' + statusClass
            }">
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 border-b pb-2 border-opacity-30">
                <h3 class="text-lg font-bold">Report ID: ${report.id.substring(
                  0,
                  8
                )}...</h3>
                <span class="text-sm font-semibold p-1 px-3 rounded-full bg-white bg-opacity-70">${
                  report.status
                }</span>
              </div>
              
              <div class="text-sm space-y-2">
                <p><strong>Village:</strong> ${report.village}</p>
                <p><strong>Location:</strong> ${report.location}</p>
                <p><strong>Type:</strong> ${report.siteType}</p>
                <p><strong>Submitted:</strong> ${submissionDate}</p>
                <p class="text-xs text-gray-600"><strong>Reporter:</strong> ${
                  report.reportedByEmail
                }</p>
                ${
                  report.phone
                    ? `<p class="text-xs text-gray-600"><strong>Reporter Phone:</strong> ${maskPhoneNumber(
                        report.phone
                      )}</p>`
                    : ''
                }
              </div>

              <p class="mt-3 p-2 text-sm bg-gray-50 rounded-xl italic border-l-2 border-gray-300">${
                report.description
              }</p>
              
              <div class="mt-4 flex flex-wrap gap-2">
                ${
                  report.pictureBase64
                    ? `<button onclick="window.viewReportImage('${report.pictureBase64}')" class="text-sm bg-indigo-600 text-white px-3 py-1 rounded-xl hover:bg-indigo-700 transition duration-150 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        View Image
                      </button>`
                    : ''
                }
                ${
                  report.status !== 'In Progress'
                    ? `<button onclick="window.updateStatus('${report.id}', 'In Progress')" class="text-sm bg-yellow-600 text-white px-3 py-1 rounded-xl hover:bg-yellow-700 transition duration-150 shadow-md">Mark In Progress</button>`
                    : ''
                }
                ${
                  report.status !== 'Resolved'
                    ? `<button onclick="window.updateStatus('${report.id}', 'Resolved')" class="text-sm bg-green-600 text-white px-3 py-1 rounded-xl hover:bg-green-700 transition duration-150 shadow-md">Mark Resolved</button>`
                    : ''
                }
              </div>
            </div>
          `;
    })
    .join('');

  container.innerHTML = reportHtml;
}

async function updateStatus(reportId, newStatus) {
  const reportDocRef = window.doc(
    db,
    `artifacts/${window.__app_id}/public/data/reports`,
    reportId
  );
  try {
    const updatePayload = {
      status: newStatus,
      lastActionBy: userEmail,
      lastActionTime: new Date().toISOString(),
    };

    if (newStatus === 'Resolved') {
      updatePayload.acknowledgedByReporter = false;
    }

    await window.updateDoc(reportDocRef, updatePayload);

    showCustomModal(
      'Success',
      `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 inline mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>Report ${reportId.substring(
                  0,
                  8
                )}... status updated to "${newStatus}"!`
    );
  } catch (error) {
    console.error('Error updating status:', error);
    showCustomModal('Error', `Failed to update status: ${error.message}`);
  }
}
window.updateStatus = updateStatus;

function viewReportImage(base64Image) {
  showCustomModal(
    'Report Image Proof',
    `<img src="${base64Image}" alt="Reported Site Image" class="w-full h-auto rounded-xl mb-4 shadow-lg">`
  );
}
window.viewReportImage = viewReportImage;

async function submitReport(event) {
  event.preventDefault();

  const form = document.getElementById('reportForm');
  const submitButton = document.getElementById('submitButton');
  const statusMessage = document.getElementById('statusMessage');

  toggleLoading(submitButton, true);
  setStatus(statusMessage, '', false);

  const imageFile = document.getElementById('image_file').files[0];
  let imageBase64 = null;

  if (imageFile) {
    if (imageFile.size > 1000000) {
      toggleLoading(submitButton, false);
      setStatus(
        statusMessage,
        'Image too large. Max size is 1MB. Please try a smaller image.',
        false
      );
      return;
    }
    try {
      setStatus(statusMessage, 'Processing image...', false);
      imageBase64 = await fileToBase64(imageFile);
    } catch (error) {
      toggleLoading(submitButton, false);
      setStatus(statusMessage, 'Error processing image.', false);
      console.error('Image processing error:', error);
      return;
    }
  }

  const reportData = {
    reportedByUID: userId,
    reportedByEmail: userEmail,
    phone: userPhone,
    village: userVillage,
    submissionTime: new Date().toISOString(),
    status: 'Reported',
    location: form.location.value,
    siteType: form.site_type.value,
    description: form.description.value,
    pictureBase64: imageBase64,
    acknowledgedByReporter: false,
  };

  try {
    const reportsCollectionRef = window.collection(
      db,
      `artifacts/${window.__app_id}/public/data/reports`
    );
    await window.addDoc(reportsCollectionRef, reportData);

    setStatus(
      statusMessage,
      'Report submitted successfully! The Village Panchayat has been notified.',
      true
    );

    let recommendation =
      'Remember to clear any stagnant water around your home and use mosquito nets!';
    if (reportData.siteType === 'Solid Waste/Trash') {
      recommendation =
        'Great job reporting the trash! Please ensure all waste is disposed of properly to eliminate breeding grounds.';
    }

    showCustomModal(
      '✅ Submission Alert (SMS/WhatsApp Simulation) ✅',
      `To: ${reportData.phone}\n\nYour report from ${reportData.village} has been received and forwarded for action.\n\nImmediate Awareness Tip: ${recommendation}`
    );

    form.reset();
  } catch (error) {
    console.error('Report submission error:', error);
    setStatus(
      statusMessage,
      'Submission Failed: Could not send report to database. Please try again.',
      false
    );
  } finally {
    toggleLoading(submitButton, false);
  }
}
window.submitReport = submitReport;
