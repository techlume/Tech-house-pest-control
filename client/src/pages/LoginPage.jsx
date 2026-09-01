import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { http } from '../services/http';
export function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verification, setVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  if (user) return <Navigate to='/' replace />;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to sign in');
      if (err.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED')
        setVerification(true);
    } finally {
      setBusy(false);
    }
  };
  const requestOtp = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await http.post('/auth/request-email-otp', {
        email: form.email,
      });
      setVerification(true);
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  };
  const verifyOtp = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await http.post('/auth/verify-email', {
        email: form.email,
        otp,
      });
      setMessage(data.message);
      setVerification(false);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not verify email');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className='login-page'>
      <section className='login-visual'>
        <div className='visual-copy'>
          <span className='pill'>
            <ShieldCheck size={15} /> Secure operations platform
          </span>
          <h1>Run every branch from one calm, connected workspace.</h1>
          <p>
            Turn enquiries into recurring contracts, coordinate field teams,
            control inventory and collect payments.
          </p>
        </div>
      </section>
      <section className='login-panel'>
        <form onSubmit={submit}>
          <img
            className='login-logo-image'
            src='/tech-house-logo.png'
            alt='Tech House Pest Control'
          />
          <span className='eyebrow'>Tech House Pest Control</span>
          <h2>Sign in to your account</h2>
          <p className='muted'>
            Use the credentials issued by your administrator.
          </p>
          {error && <div className='form-error'>{error}</div>}
          {message && <div className='form-success'>{message}</div>}
          <label>
            Email address
            <div className='input-wrap'>
              <Mail size={18} />
              <input
                type='email'
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </label>
          {verification && (
            <label>
              Six-digit email OTP
              <div className='input-wrap'>
                <ShieldCheck size={18} />
                <input
                  inputMode='numeric'
                  pattern='[0-9]{6}'
                  maxLength='6'
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className='otp-actions'>
                <button type='button' onClick={requestOtp} disabled={busy || !form.email}>
                  Send OTP
                </button>
                <button type='button' onClick={verifyOtp} disabled={busy || otp.length !== 6}>
                  Verify email
                </button>
              </div>
            </label>
          )}
          <label>
            Password
            <div className='input-wrap'>
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength='8'
                maxLength='64'
                pattern='(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}'
                title='8-64 characters with uppercase, lowercase, number and special character'
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type='button'
                className='password-toggle'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small className='password-hint'>
              8-64 characters with uppercase, lowercase, number and special character.
            </small>
          </label>
          <button className='primary-button' disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={18} />
          </button>
          {!verification && (
            <button
              type='button'
              className='verify-email-link'
              onClick={() => setVerification(true)}
            >
              Verify customer email
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
