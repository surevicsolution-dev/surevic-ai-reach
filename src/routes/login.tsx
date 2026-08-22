import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        // Sign Up with Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { company_name: companyName },
          },
        });
        if (error) throw error;
        alert('Account ban gaya hai! Ab login karein.');
        setIsSignUp(false);
      } else {
        // Sign In with Supabase
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        localStorage.setItem('surevic_auth', 'true');
        navigate({ to: '/' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 mb-3">
            <span className="text-xl font-bold">S</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Surevic AI ERP</h2>
          <p className="text-sm text-slate-400 mt-1">
            {isSignUp ? 'Apni company ka naya ERP account banayein' : 'Apne ERP account mein login karein'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Surevic Solutions Pvt Ltd"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email ID
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@surevic.com"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-sm shadow-md transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create New Company Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Nayi Company register karni hai? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}