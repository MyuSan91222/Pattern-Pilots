import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      const { data } = await authApi.forgot(email);
      setSent(true);
      if (data.token) setDevToken(data.token); // dev mode
    } catch { toast.error('Request failed'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 appstore-drop">
      <div className="w-full max-w-sm animate-in slide-in-from-bottom fade-in duration-700">
        <Link to="/login" className="flex items-center gap-2 text-ink-500 hover:text-ink-300 text-sm mb-8 transition-colors hover:scale-105 animate-in fade-in duration-500" style={{animationDelay: '100ms'}}>
          <ArrowLeft size={14} />Back to login
        </Link>

        <div className="card p-6 animate-in fade-in duration-700" style={{animationDelay: '150ms'}}>
          <h2 className="text-xl font-bold text-ink-100 mb-1 animate-in fade-in slide-in-from-top duration-500" style={{animationDelay: '200ms', fontFamily: 'Syne'}}>Reset Password</h2>
          <p className="text-ink-500 text-sm mb-5 animate-in fade-in duration-500" style={{animationDelay: '250ms'}}>Enter your email and we'll send a reset link</p>

          {sent ? (
            <div className="text-center py-4 animate-in fade-in duration-500" style={{animationDelay: '300ms'}}>
              <div className="w-12 h-12 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-3 animate-in zoom-in duration-500" style={{animationDelay: '350ms'}}>
                <Mail className="text-success" size={20} />
              </div>
              <p className="text-ink-200 text-sm mb-1 animate-in fade-in duration-500" style={{animationDelay: '400ms'}}>Check your email!</p>
              <p className="text-ink-500 text-xs animate-in fade-in duration-500" style={{animationDelay: '450ms'}}>A reset link has been sent if that email exists.</p>
              {devToken && (
                <div className="mt-4 p-3 bg-ink-800 rounded-lg animate-in fade-in duration-500" style={{animationDelay: '500ms'}}>
                  <p className="text-xs text-ink-500 mb-1">Dev mode token:</p>
                  <code className="text-xs text-accent break-all">{devToken}</code>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="animate-in fade-in slide-in-from-left duration-500" style={{animationDelay: '300ms'}}>
                <label className="label">Email</label>
                <input type="email" className={`input transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 ${errors.email ? 'border-danger' : ''}`}
                  placeholder="you@example.com"
                  {...register('email', { required: 'Email required' })} />
                {errors.email && <p className="text-danger text-xs mt-1 animate-in fade-in duration-300">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/40 active:scale-95 animate-in fade-in" style={{animationDuration: '500ms', animationDelay: '350ms'}}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const password = watch('password');

  const onSubmit = async ({ password }) => {
    setIsLoading(true);
    try {
      await authApi.reset({ token, password });
      setDone(true);
      toast.success('Password reset! You can now sign in.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Reset failed');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 appstore-drop">
      <div className="w-full max-w-sm animate-in slide-in-from-bottom fade-in duration-700">
        <div className="card p-6 animate-in fade-in duration-700" style={{animationDelay: '150ms'}}>
            <h2 className="text-xl font-bold text-ink-100 mb-1 animate-in fade-in slide-in-from-top duration-500" style={{animationDelay: '200ms', fontFamily: 'Syne'}}>New Password</h2>
          <p className="text-ink-500 text-sm mb-5 animate-in fade-in duration-500" style={{animationDelay: '250ms'}}>Set a new secure password for your account</p>

          {done ? (
            <div className="text-center py-4 animate-in fade-in duration-500" style={{animationDelay: '300ms'}}>
              <p className="text-success mb-3 animate-in fade-in duration-500" style={{animationDelay: '350ms'}}>Password updated!</p>
              <Link to="/login" className="btn-primary inline-flex transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/40 active:scale-95 animate-in fade-in" style={{animationDuration: '500ms', animationDelay: '400ms'}}>Go to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="animate-in fade-in slide-in-from-left duration-500" style={{animationDelay: '300ms'}}>
                <label className="label">New Password</label>
                <input type="password" className={`input transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Min. 8 characters"
                  {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} />
                {errors.password && <p className="text-danger text-xs mt-1 animate-in fade-in duration-300">{errors.password.message}</p>}
              </div>
              <div className="animate-in fade-in slide-in-from-right duration-500" style={{animationDelay: '350ms'}}>
                <label className="label">Confirm Password</label>
                <input type="password" className={`input transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 ${errors.confirm ? 'border-danger' : ''}`}
                  placeholder="Repeat password"
                  {...register('confirm', {
                    required: 'Required',
                    validate: v => v === password || 'Passwords do not match'
                  })} />
                {errors.confirm && <p className="text-danger text-xs mt-1 animate-in fade-in duration-300">{errors.confirm.message}</p>}
              </div>
              <button type="submit" disabled={isLoading || !token} className="btn-primary w-full transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/40 active:scale-95 animate-in fade-in" style={{animationDuration: '500ms', animationDelay: '400ms'}}>
                {isLoading ? 'Updating...' : 'Set New Password'}
              </button>
              {!token && <p className="text-danger text-xs text-center animate-in fade-in duration-300">Invalid reset link</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const [status, setStatus] = useState('pending');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm();
  const urlToken = new URLSearchParams(window.location.search).get('token');

  const verify = async (token) => {
    setIsLoading(true);
    try {
      await authApi.verifyEmail(token);
      setStatus('success');
      toast.success('Email verified!');
    } catch {
      setStatus('error');
      toast.error('Invalid or expired token');
    } finally { setIsLoading(false); }
  };

  // Auto-verify if token in URL
  useState(() => { if (urlToken) verify(urlToken); });

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center p-4 appstore-drop">
      <div className="w-full max-w-sm animate-in slide-in-from-bottom fade-in duration-700">
        <div className="card p-6 animate-in fade-in duration-700" style={{animationDelay: '150ms'}}>
            <h2 className="text-xl font-bold text-ink-100 mb-1 animate-in fade-in slide-in-from-top duration-500" style={{animationDelay: '200ms', fontFamily: 'Syne'}}>Verify Email</h2>
          <p className="text-ink-500 text-sm mb-5 animate-in fade-in duration-500" style={{animationDelay: '250ms'}}>Enter your verification token</p>

          {status === 'success' ? (
            <div className="text-center py-4 animate-in fade-in duration-500" style={{animationDelay: '300ms'}}>
              <p className="text-success mb-3 animate-in fade-in duration-500" style={{animationDelay: '350ms'}}>✓ Email verified successfully!</p>
              <Link to="/login" className="btn-primary inline-flex transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/40 active:scale-95 animate-in fade-in" style={{animationDuration: '500ms', animationDelay: '400ms'}}>Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(({ token }) => verify(token))} className="space-y-4">
              <div className="animate-in fade-in slide-in-from-left duration-500" style={{animationDelay: '300ms'}}>
                <label className="label">Verification Token</label>
                <input className="input font-mono text-xs transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30" placeholder="Paste token here"
                  defaultValue={urlToken || ''}
                  {...register('token', { required: 'Token required' })} />
              </div>
              {status === 'error' && <p className="text-danger text-xs animate-in fade-in duration-300">Invalid or expired token. Request a new one.</p>}
              <button type="submit" disabled={isLoading} className="btn-primary w-full transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/40 active:scale-95 animate-in fade-in" style={{animationDuration: '500ms', animationDelay: '350ms'}}>
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          )}

          <div className="mt-4 text-center animate-in fade-in duration-500" style={{animationDelay: '450ms'}}>
            <Link to="/login" className="text-xs text-ink-500 hover:text-ink-300 transition-colors hover:scale-105">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
