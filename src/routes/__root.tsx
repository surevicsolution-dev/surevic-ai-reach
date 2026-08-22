import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import React, { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const localAuth = localStorage.getItem('surevic_auth');

      // Agar login nahi hai aur page /login nahi hai -> redirect to /login
      if (!session && !localAuth && currentPath !== '/login') {
        navigate({ to: '/login' });
      }
    };

    checkAuth();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && currentPath !== '/login') {
        localStorage.removeItem('surevic_auth');
        navigate({ to: '/login' });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [currentPath, navigate]);

  // Login page par extra top navigation nahi dikhana
  if (currentPath === '/login') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header with Logout */}
      <header className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2 font-bold text-base tracking-wide text-purple-400">
          <span>Surevic ERP</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem('surevic_auth');
              navigate({ to: '/login' });
            }}
            className="px-3 py-1.5 text-xs font-medium bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/50 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main ERP App */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}