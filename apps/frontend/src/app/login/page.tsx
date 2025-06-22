"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async (form: { email: string; password: string }) => {
      const res = await fetch("http://localhost:3333/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Erreur de connexion");
      }
      return res.json();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.reset();
    mutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Colonne gauche : Formulaire */}
      <div className="flex flex-col justify-center items-center px-6 py-12 md:px-16 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-extrabold text-[#9C6B3B] mb-3">Bienvenue sur Hen House</h1>
          <p className="text-[#704214] mb-8 text-lg">Commandez simplement, gérez facilement.</p>
          <div className="p-8 shadow-xl border border-[#E5C9B6] rounded-xl bg-white">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Entrer votre email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">Mot de passe</label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>
                {mutation.isPending ? "Connexion..." : "Se connecter"}
              </Button>
              {mutation.isError && (
                <div className="mt-4 text-red-600 bg-red-50 border border-red-200 rounded p-2 text-center text-sm">
                  {(mutation.error as Error)?.message}
                </div>
              )}
              {mutation.isSuccess && (
                <div className="mt-4 text-green-700 bg-green-50 border border-green-200 rounded p-2 text-center text-sm">
                  Connexion réussie !
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      {/* Colonne droite : Image */}
      <div className="hidden md:flex items-center justify-center bg-[#E5C9B6]">
        <img
          src="/login-side.png"
          alt="Illustration Hen House"
          className="object-cover rounded-xl shadow-2xl w-4/5 h-4/5 max-h-[600px]"
        />
      </div>
    </div>
  );
}
