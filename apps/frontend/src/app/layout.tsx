"use client";
import React, { useState } from "react";
import Link from "next/link";
import "./globals.css";
import QueryProvider from "@/components/providers/query-provider";
import { X } from "lucide-react";
import { Toaster } from "sonner";

function MobileDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Ouvrir le menu"
        className="p-2 rounded border border-gray-200 bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
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
            onClick={e => e.stopPropagation()}
          >
            <Link href="/" className="hover:underline text-2xl font-semibold text-white" onClick={() => setOpen(false)}>Accueil</Link>
            <Link href="/menu" className="hover:underline text-2xl font-semibold text-white" onClick={() => setOpen(false)}>Menu</Link>
            <Link href="/login" className="hover:underline text-2xl font-semibold text-white" onClick={() => setOpen(false)}>Connexion</Link>
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
    <html lang="fr">
      <body className="text-foreground min-h-screen flex flex-col bg-background">
        <header className="w-full flex items-center justify-between px-4 py-3 border-b bg-white/80 sticky top-0 z-50">
          <div className="font-bold text-xl tracking-tight">
            <Link href="/"> Hen House</Link>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/">Accueil</Link>
            <Link href="/menu">Menu</Link>
            <Link href="/login">Connexion</Link>
          </nav>
          <div className="md:hidden">
            <MobileDrawer />
          </div>
        </header>
        <QueryProvider>
          <main className="flex-1 flex flex-col">
            {children}
            <Toaster 
              position="bottom-right" 
              richColors 
              theme="light"
              duration={5000}
            />
          </main> 
        </QueryProvider>
        <footer className="w-full py-4 text-center text-xs text-gray-500 border-t bg-white/80">
          &copy; {new Date().getFullYear()} Hen House. Tous droits réservés.
        </footer>
      </body>
    </html>
  );
}