"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async (form: { username: string; password: string }) => {
      const res = await fetch("http://localhost:3333/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        return Promise.reject(new Error(data?.message || "Erreur de connexion"));
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('Connexion réussie !', {
        description: `Bienvenue, ${data.user?.username || "utilisateur"}!`,
      });
      //Todo: Redirection après la connexion réussie
    },
    onError: (error) => {
      toast.error('Échec de la connexion', {
        description: (error as Error)?.message || "Veuillez vérifier vos identifiants",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ username, password });
  };

  useEffect(() => {
    mutation.reset();
  }, [username, password]);

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      {/* Colonne gauche : Formulaire */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 md:px-16 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-extrabold text-[#9C6B3B] mb-3">Bienvenue sur Hen House</h1>
          <p className="text-[#704214] mb-8 text-lg">Commandez simplement, gérez facilement.</p>
          <div className="p-8 shadow-xl border border-[#E5C9B6] rounded-xl bg-white">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="username">Nom d'utilisateur</label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Entrer votre nom d'utilisateur"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
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
              <Button
                type="submit"
                className="w-full mt-2"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Connexion..." : "Se connecter"}
              </Button>
              {/* Tu peux garder ou retirer ces messages statiques */}
            </form>
          </div>
        </div>
      </div>
      {/* Colonne droite : Image */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <img
          src="/login-side.png"
          alt="Illustration Hen House"
          className="object-cover rounded-xl shadow-2xl w-full mx-6 max-w-none max-h-none"
        />
      </div>
    </div>
  );
}
