import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api';

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await authApi.signup({ email: data.email, password: data.password });
      if (res.data.requiresVerification) {
        toast.success('Check your email for a verification link!');
        if (res.data.token) {
          toast('Dev mode: token = ' + res.data.token, { icon: '🔑' });
        }
        navigate('/login');
      } else {
        toast.success('Account created! Please sign in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center p-4 appstore-drop">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none animate-in fade-in duration-1000"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #3da9fc 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      
      <div className="w-full max-w-sm animate-in slide-in-from-bottom fade-in duration-700">
        <div className="mb-10 text-center animate-in fade-in slide-in-from-top duration-700" style={{animationDelay: '100ms'}}>
          <div className="inline-flex items-center gap-2 mb-3 animate-in zoom-in duration-500" style={{animationDelay: '200ms'}}>
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-ink-950 font-bold text-sm" style={{ fontFamily: 'Syne' }}>A</span>
            </div>
            <span className="text-ink-100 font-bold text-lg" style={{ fontFamily: 'Syne' }}>AttendanceAnalyzer</span>
          </div>
          <p className="text-ink-500 text-sm animate-in fade-in duration-500" style={{animationDelay: '300ms'}}>Create your account</p>
        </div>

        <div className="card p-6 space-y-4 animate-in fade-in duration-700" style={{animationDelay: '200ms'}}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="animate-in fade-in slide-in-from-left duration-500" style={{animationDelay: '300ms'}}>
              <label className="label">Email</label>
              <input type="email" className={`input transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 ${errors.email ? 'border-danger' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                })} />
              {errors.email && <p className="text-danger text-xs mt-1 animate-in fade-in duration-300">{errors.email.message}</p>}
            </div>

            <div className="animate-in fade-in slide-in-from-left duration-500" style={{animationDelay: '350ms'}}>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'}
                  className={`input pr-10 transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Min. 8 characters"
                  {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors hover:scale-110 active:scale-95">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1 animate-in fade-in duration-300">{errors.password.message}</p>}
            </div>

            <div className="animate-in fade-in slide-in-from-right duration-500" style={{animationDelay: '400ms'}}>
              <label className="label">Confirm Password</label>
              <input type={showPassword ? 'text' : 'password'}
                className={`input transition-all duration-300 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 ${errors.confirmPassword ? 'border-danger' : ''}`}
                placeholder="Repeat password"
                {...register('confirmPassword', {
                  required: 'Please confirm password',
                  validate: v => v === password || 'Passwords do not match'
                })} />
              {errors.confirmPassword && <p className="text-danger text-xs mt-1 animate-in fade-in duration-300">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/40 active:scale-95 animate-in fade-in" style={{animationDuration: '500ms', animationDelay: '450ms'}}>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-ink-700 border-t-ink-950 rounded-full animate-spin" />
              ) : (
                <><UserPlus size={15} />Create Account</>
              )}
            </button>
          </form>

          <div className="border-t border-ink-800 pt-4 text-center animate-in fade-in duration-500" style={{animationDelay: '500ms'}}>
            <p className="text-ink-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-success font-bold hover:text-emerald-300 transition-colors scale-105 hover:scale-110 inline-block">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
