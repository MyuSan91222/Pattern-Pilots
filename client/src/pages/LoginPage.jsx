import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { staggerIn, springIn } from '../utils/animations';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef(null);
  const formRef = useRef(null);
  const logoRef = useRef(null);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const rememberMe = watch('rememberMe');

  // Anime.js entrance: logo springs in, then form fields stagger
  useEffect(() => {
    springIn(logoRef.current, { duration: 600, distance: 20 });

    springIn(cardRef.current, { delay: 120, duration: 700, distance: 28 });

    if (formRef.current) {
      const fields = formRef.current.querySelectorAll('[data-stagger]');
      staggerIn(fields, { delay: 70, duration: 520, distance: 14 });
    }
  }, []);

  // Load saved credentials when Remember Me checkbox is toggled
  useEffect(() => {
    if (rememberMe) {
      const saved = localStorage.getItem('loginCredentials');
      if (saved) {
        try {
          const { email, password } = JSON.parse(saved);
          setValue('email', email);
          setValue('password', password);
        } catch (err) {
          console.error('Failed to parse saved credentials');
        }
      }
    } else {
      const saved = localStorage.getItem('loginCredentials');
      if (!saved) {
        setValue('email', '');
        setValue('password', '');
      }
    }
  }, [rememberMe, setValue]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      if (data.rememberMe) {
        localStorage.setItem('loginCredentials', JSON.stringify({
          email: data.email,
          password: data.password
        }));
      } else {
        localStorage.removeItem('loginCredentials');
      }
      navigate('/dashboard', { state: { justLoggedIn: true } });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center p-4">
      {/* Dot-grid background — anime.js aesthetic */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none anime-grid-bg" />

      <div className="w-full max-w-sm">
        {/* Logo — springs in */}
        <div ref={logoRef} className="mb-10 text-center" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 0 20px rgb(var(--accent) / 0.3)' }}>
              <span className="text-ink-950 font-bold text-sm" style={{ fontFamily: 'Syne' }}>PP</span>
            </div>
            <span className="text-ink-100 font-bold text-lg" style={{ fontFamily: 'Syne' }}>Pattern Pilots</span>
          </div>
          <p className="text-ink-500 text-sm">Sign in to your account</p>
        </div>

        {/* Card — spring entrance */}
        <div ref={cardRef} className="card p-6 space-y-5 card-spring" style={{ opacity: 0, willChange: 'transform, opacity' }}>
          <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email field */}
            <div data-stagger style={{ opacity: 0, willChange: 'transform, opacity' }}>
              <label className="label">Email</label>
              <input
                type="email"
                className={`input glow-on-focus ${errors.email ? 'border-danger' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
              />
              {errors.email && <p className="text-danger text-xs mt-1 animate-spring-in">{errors.email.message}</p>}
            </div>

            {/* Password field */}
            <div data-stagger style={{ opacity: 0, willChange: 'transform, opacity' }}>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input pr-10 glow-on-focus ${errors.password ? 'border-danger' : ''}`}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password required' })}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-all duration-200 hover:scale-110 active:scale-95">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1 animate-spring-in">{errors.password.message}</p>}
            </div>

            {/* Remember me + Forgot */}
            <div data-stagger className="flex items-center justify-between" style={{ opacity: 0, willChange: 'transform, opacity' }}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" {...register('rememberMe')}
                  className="w-4 h-4 rounded accent-accent bg-ink-800 border-ink-600 cursor-pointer transition-transform hover:scale-110" />
                <span className="text-ink-400 text-sm group-hover:text-ink-300 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-ink-500 hover:text-accent transition-colors link-underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <div data-stagger style={{ opacity: 0, willChange: 'transform, opacity' }}>
              <button type="submit" disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2 hover:scale-[1.03] hover:shadow-lg hover:shadow-accent/40 active:scale-[0.97] transition-all duration-300">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-ink-700 border-t-ink-950 rounded-full animate-spin" />
                ) : (
                  <><LogIn size={15} />Sign in</>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-ink-800 pt-4 text-center">
            <p className="text-ink-400 text-sm">
              No account?{'  '}
              <Link to="/signup" className="text-blue-900 font-bold hover:text-blue-800 transition-colors link-underline scale-105 hover:scale-90 inline-block">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
