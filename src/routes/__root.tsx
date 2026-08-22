import {
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import appCss from "../styles.css?url";
import { ErpProvider } from "@/lib/erp/store";
import { Shell } from "@/components/erp/Shell";
import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Surevic AI ERP" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const isLoginPage = routerState.location.pathname === "/login";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const localAuth = localStorage.getItem("surevic_auth");

      if (!session && !localAuth && !isLoginPage) {
        navigate({ to: "/login" });
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isLoginPage) {
        localStorage.removeItem("surevic_auth");
        navigate({ to: "/login" });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isLoginPage, navigate]);

  return (
    <RootDocument>
      <ErpProvider>
        {isLoginPage ? (
          <Outlet />
        ) : (
          <Shell>
            <Outlet />
          </Shell>
        )}
      </ErpProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  );
}