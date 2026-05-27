import { useState } from 'react';
import { auth } from '../db';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { 
  Shield, 
  Key, 
  User, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Mail,
  CheckCircle2 
} from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset flow states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate with Firebase to get the secure cloud token
      await signInWithEmailAndPassword(auth, username.trim(), password);
      onLoginSuccess();
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid Email or Password. Please try again.');
      } else {
        setError(err.message || 'Failed to authenticate.');
      }
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    
    if (!resetEmail) {
      setResetError('Please enter your admin email address.');
      return;
    }

    setLoading(true);
    try {
      // Send secure Firebase password reset email
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(true);
      setLoading(false);
      
      setTimeout(() => {
        setIsForgotMode(false);
        setResetSuccess(false);
        setResetEmail('');
        setError('A password reset link has been sent to your email.');
      }, 3000);
    } catch (err) {
      setResetError(err.message || 'Failed to send reset email.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-app)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Blobs */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0) 70%)',
        top: '-50px',
        right: '-50px',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, rgba(6,182,212,0) 70%)',
        bottom: '-80px',
        left: '-80px',
        zIndex: 0
      }} />

      <div className="card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        
        {/* VIEW: FORGOT PASSWORD */}
        {isForgotMode ? (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={26} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                Reset Password
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Enter your admin email to receive a secure reset link.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="reset-email">Admin Email</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    id="reset-email"
                    type="email"
                    className="form-control"
                    placeholder="admin@example.com"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                    disabled={loading || resetSuccess}
                  />
              </div>
            </div>

            {resetError && (
              <div style={{ fontSize: '0.85rem', color: 'var(--danger)', textAlign: 'center', backgroundColor: 'rgba(239,68,68,0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, backgroundColor: 'rgba(16,185,129,0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.15)' }}>
                <CheckCircle2 size={18} /> Reset email sent securely!
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.7rem' }}
                onClick={() => {
                  setIsForgotMode(false);
                  setResetError('');
                }}
                disabled={loading || resetSuccess}
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '0.7rem', fontWeight: 600 }}
                disabled={loading || resetSuccess}
              >
                {loading && !resetSuccess ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        ) 
        
        /* VIEW: STANDARD ADMIN SIGN-IN SCREEN */
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={32} />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                Secure Admin Portal
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Enter your Firebase Auth email and password
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="login-username" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  Admin Email
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    id="login-username"
                    type="email"
                    className="form-control"
                    placeholder="admin@example.com"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: '36px', width: '100%' }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="login-password" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                    tabIndex="-1"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Your secure password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '36px', paddingRight: '40px', width: '100%' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  fontSize: '0.85rem',
                  color: error.includes('success') ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 600,
                  textAlign: 'center',
                  backgroundColor: error.includes('success') ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: error.includes('success') ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Secure Sign In'}
              </button>
            </form>

            <button
              type="button"
              onClick={onBackToHome}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem' }}
              disabled={loading}
            >
              <ArrowLeft size={16} /> Back to Landing Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
