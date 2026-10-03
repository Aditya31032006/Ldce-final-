import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios with credentials for cookie sessions
axios.defaults.withCredentials = true;

function App() {
  const [activeTab, setActiveTab] = useState('direct-register'); // 'direct-register' | 'direct-login' | 'setup-profile' | 'dashboard'
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Direct registration state (all fields entered directly)
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });

  // Direct login state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Setup profile state (for fields not derived from Google OAuth)
  const [setupForm, setSetupForm] = useState({
    phone: '',
    fullName: '',
    avatarUrl: '',
    password: '',
  });

  // Check URL query parameters on mount (for OAuth callbacks and redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requiresSetup = params.get('requiresSetup');
    const paramToken = params.get('token');
    const paramEmail = params.get('email');
    const paramName = params.get('name');
    const paramAvatar = params.get('avatar');
    const authStatus = params.get('auth');
    const errorParam = params.get('error');

    if (errorParam) {
      setErrorMsg(decodeURIComponent(errorParam));
    }

    if (paramToken) {
      setToken(paramToken);
      localStorage.setItem('token', paramToken);
    }

    if (requiresSetup === 'true') {
      setActiveTab('setup-profile');
      setSetupForm((prev) => ({
        ...prev,
        fullName: paramName || '',
        avatarUrl: paramAvatar || '',
      }));
      setSuccessMsg('Google authentication successful! Please enter your phone number to complete profile setup.');
    } else if (authStatus === 'success') {
      fetchUserProfile(paramToken || token);
    } else if (token) {
      fetchUserProfile(token);
    }
  }, []);

  const clearAlerts = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Fetch current user details
  const fetchUserProfile = async (authToken = token) => {
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await axios.get('/api/auth/me', { headers });
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        if (!res.data.isProfileComplete) {
          setActiveTab('setup-profile');
          setSetupForm((prev) => ({
            ...prev,
            fullName: res.data.user.full_name || '',
            avatarUrl: res.data.user.avatar_url || '',
            phone: res.data.user.phone || '',
          }));
        } else {
          setActiveTab('dashboard');
        }
      }
    } catch (err) {
      console.warn('Session check:', err.response?.data?.message || err.message);
    }
  };

  // Direct Registration handler (all fields)
  const handleDirectRegister = async (e) => {
    e.preventDefault();
    clearAlerts();
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/register', regForm);
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        setSuccessMsg('Account created successfully!');
        setActiveTab('dashboard');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Login handler
  const handleDirectLogin = async (e) => {
    e.preventDefault();
    clearAlerts();
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', loginForm);
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);

        if (!res.data.isProfileComplete) {
          setActiveTab('setup-profile');
          setSuccessMsg('Please complete your profile setup to proceed.');
        } else {
          setActiveTab('dashboard');
          setSuccessMsg('Logged in successfully!');
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Setup Profile handler (submitting missing fields from Google OAuth)
  const handleSetupProfile = async (e) => {
    e.preventDefault();
    clearAlerts();
    setLoading(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post('/api/auth/setup-profile', setupForm, { headers });
      if (res.data.success) {
        setUser(res.data.user);
        setSuccessMsg('Profile setup completed successfully!');
        setActiveTab('dashboard');
        // Clear URL search params
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete profile. Ensure phone number is valid.');
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      setToken('');
      localStorage.removeItem('token');
      setActiveTab('direct-login');
      setSuccessMsg('You have been logged out.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  return (
    <div className="app-container">
      <div className="brand-badge">
        <span>🎾</span> SPORTS CLUB PLATFORM
      </div>

      <div className="auth-card">
        {/* Alerts */}
        {errorMsg && (
          <div className="alert alert-error">
            <span>⚠️</span> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success">
            <span>✅</span> {successMsg}
          </div>
        )}

        {/* ===================== DASHBOARD VIEW ===================== */}
        {activeTab === 'dashboard' && user ? (
          <div className="dashboard-view">
            <h2 className="card-title">Member Dashboard</h2>
            <p className="card-subtitle">Welcome back to the Sports Club platform.</p>

            <div className="user-profile-header">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="avatar-circle" />
              ) : (
                <div className="avatar-circle">
                  {(user.full_name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="profile-info">
                <h3>{user.full_name}</h3>
                <p>{user.email}</p>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Phone Number</div>
                <div className="info-value">{user.phone || 'Not Provided'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Account Status</div>
                <div className="info-value" style={{ color: user.is_active ? '#34d399' : '#f43f5e' }}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Email Verified</div>
                <div className="info-value">
                  {user.email_verified_at ? 'Verified' : 'Pending'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Profile Status</div>
                <div className="info-value" style={{ color: user.phone ? '#34d399' : '#fbbf24' }}>
                  {user.phone ? '100% Complete' : 'Incomplete'}
                </div>
              </div>
            </div>

            {!user.phone && (
              <button
                type="button"
                className="submit-btn"
                style={{ marginBottom: '16px' }}
                onClick={() => setActiveTab('setup-profile')}
              >
                Complete Setup Profile Now
              </button>
            )}

            <button type="button" className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        ) : activeTab === 'setup-profile' ? (
          /* ===================== SETUP PROFILE VIEW ===================== */
          <div>
            <h2 className="card-title">Complete Your Profile</h2>
            <p className="card-subtitle">
              Add your contact details to finish setting up your sports club account.
            </p>

            <div className="alert alert-warning">
              <span>ℹ️</span> Please provide your phone number to complete account registration.
            </div>

            <form onSubmit={handleSetupProfile}>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9876543210"
                  className="form-input"
                  value={setupForm.phone}
                  onChange={(e) => setSetupForm({ ...setupForm, phone: e.target.value })}
                />
                <div className="input-hint">Required for court booking SMS and emergency notifications.</div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="form-input"
                  value={setupForm.fullName}
                  onChange={(e) => setSetupForm({ ...setupForm, fullName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Optional Local Password</label>
                <input
                  type="password"
                  placeholder="Set password for direct login (min 6 chars)"
                  className="form-input"
                  value={setupForm.password}
                  onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })}
                />
                <div className="input-hint">Enables direct email/password login in addition to Google OAuth.</div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving Profile...' : 'Complete Profile Setup'}
              </button>
            </form>
          </div>
        ) : (
          /* ===================== DIRECT AUTH TABS ===================== */
          <div>
            {/* Top Navigation */}
            <div className="tab-nav">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'direct-register' ? 'active' : ''}`}
                onClick={() => {
                  clearAlerts();
                  setActiveTab('direct-register');
                }}
              >
                Register (All Fields)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'direct-login' ? 'active' : ''}`}
                onClick={() => {
                  clearAlerts();
                  setActiveTab('direct-login');
                }}
              >
                Sign In
              </button>
            </div>

            <h2 className="card-title">
              {activeTab === 'direct-register' ? 'Direct Registration' : 'Welcome Back'}
            </h2>
            <p className="card-subtitle">
              {activeTab === 'direct-register'
                ? 'Create your account by entering all required details.'
                : 'Access your sports club memberships and bookings.'}
            </p>

            {/* Google OAuth Button */}
            <a href="http://localhost:3000/api/auth/google" className="google-auth-btn">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l3.99-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.28 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              Continue with Google
            </a>

            <div className="divider">or continue with email</div>

            {/* Direct Register Form */}
            {activeTab === 'direct-register' ? (
              <form onSubmit={handleDirectRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="form-input"
                    value={regForm.fullName}
                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="form-input"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    className="form-input"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    className="form-input"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Register Account'}
                </button>
              </form>
            ) : (
              /* Direct Login Form */
              <form onSubmit={handleDirectLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="form-input"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    className="form-input"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
