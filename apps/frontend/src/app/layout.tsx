"use client";
import React, { useState } from "react";
import Link from "next/link";
import "./globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { X, Shield, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { useIsAuthenticated, useLogout } from "@/components/stores/auth-store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Supprimer les erreurs d'hydratation causées par les extensions de navigateur
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    if (
      errorMessage.includes('Hydration failed') ||
      errorMessage.includes('hydrated but some attributes') ||
      errorMessage.includes('server rendered HTML') ||
      errorMessage.includes('webcrx') ||
      errorMessage.includes('cz-shortcut-listen')
    ) {
      return; // Ignorer ces erreurs d'hydratation
    }
    originalError(...args);
  };
}

function DesktopNav() {
  const { isAuthenticated, user } = useIsAuthenticated();
  const logoutMutation = useLogout();
  const router = useRouter();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Déconnexion réussie');
        router.push('/');
      },
      onError: () => {
        toast.error('Erreur lors de la déconnexion');
      }
    });
  };
  
  return (
    <nav className="hidden md:flex gap-6 items-center">
      <Link href="/" className="hover:text-orange-600 transition-colors">
        Accueil
      </Link>
      <Link href="/menu" className="hover:text-orange-600 transition-colors">
        Menu
      </Link>
      {!isAuthenticated && (
        <Link href="/suivi-commande" className="hover:text-orange-600 transition-colors">
          Recherche commande
        </Link>
      )}
      {isAuthenticated ? (
        <>
          <Link href="/dashboard" className="hover:text-orange-600 transition-colors">
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link 
              href="/admin" 
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              <Shield size={16} />
              Dashboard Admin
            </Link>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={logoutMutation.isPending}
          >
            <LogOut size={16} />
            {logoutMutation.isPending ? 'Déconnexion...' : 'Déconnexion'}
          </Button>
        </>
      ) : (
        <Link 
          href="/login" 
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          Connexion
        </Link>
      )}
    </nav>
  );
}

function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useIsAuthenticated();
  const logoutMutation = useLogout();
  const router = useRouter();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Déconnexion réussie');
        setOpen(false);
        router.push('/');
      },
      onError: () => {
        toast.error('Erreur lors de la déconnexion');
      }
    });
  };
  
  return (
    <>
      <button
        aria-label="Ouvrir le menu"
        className="p-2 rounded border border-gray-200 bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur bg-black/40"
          onClick={() => setOpen(false)}
        >
          {/* Croix Lucide tout en haut à droite */}
          <button
            aria-label="Fermer le menu"
            className="fixed top-4 right-4 p-2 rounded-full border border-gray-200 bg-white z-50"
            onClick={() => setOpen(false)}
            tabIndex={0}
          >
            <X size={28} />
          </button>
          <nav
            className="relative flex flex-col items-center justify-center gap-10 px-8 py-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href="/"
              className="hover:underline text-2xl font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Accueil
            </Link>
            <Link
              href="/menu"
              className="hover:underline text-2xl font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Menu
            </Link>
            {!isAuthenticated && (
              <Link
                href="/suivi-commande"
                className="hover:underline text-2xl font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Recherche commande
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="hover:underline text-2xl font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="hover:underline text-2xl font-semibold text-orange-300 flex items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <Shield size={24} />
                    Dashboard Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="flex items-center gap-2 text-2xl font-semibold text-red-300 hover:underline"
                >
                  <LogOut size={24} />
                  {logoutMutation.isPending ? 'Déconnexion...' : 'Déconnexion'}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="hover:underline text-2xl font-semibold text-orange-300"
                onClick={() => setOpen(false)}
              >
                Connexion
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body 
        className="text-foreground min-h-screen flex flex-col bg-background"
        suppressHydrationWarning
      >
        <QueryClientProvider client={queryClient}>
          <header className="w-full flex items-center justify-between px-4 py-3 border-b bg-white/80 sticky top-0 z-50">
            <div className="font-bold text-xl tracking-tight text-orange-600">
              <Link href="/"> Hen House</Link>
            </div>
            <DesktopNav />
            <div className="md:hidden">
              <MobileDrawer />
            </div>
          </header>
          <main className="flex-1 flex flex-col">
            {children}
            <Toaster
              position="bottom-right"
              richColors
              theme="light"
              duration={5000}
            />
          </main>
          <footer className="w-full py-4 text-center text-xs text-gray-500 border-t bg-white/80">
            &copy; {new Date().getFullYear()} Hen House. Tous droits réservés.
          </footer>
        </QueryClientProvider>
      </body>
    </html>
  );
}