"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/components/stores/auth-store';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { username, password },
      {
        onSuccess: (data) => {
          toast.success('Connexion réussie !', {
            description: `Bienvenue, ${data.user?.username || "utilisateur"}!`,
          });
          router.push('/dashboard');
        },
        onError: (error) => {
          toast.error('Échec de la connexion', {
            description: (error as Error)?.message || "Veuillez vérifier vos identifiants",
          });
        }
      }
    );
  };

  useEffect(() => {
    loginMutation.reset();
  }, [username, password]);

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      {/* Colonne gauche : Formulaire */}
      <div className="flex md:flex-[0.4] flex-col justify-center items-center px-4 py-12 md:px-16 bg-white w-full min-h-[85vh] md:min-h-0">
        <div className="w-full max-w-md mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#9C6B3B] mb-3 text-center md:text-left">Bienvenue sur Hen House</h1>
          <p className="text-[#704214] mb-8 text-lg text-center md:text-left">Commandez simplement, gérez facilement.</p>
          <div className="p-6 md:p-8 shadow-xl border border-[#E5C9B6] rounded-xl bg-white">
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
                className="w-full mt-2 bg-[#9C6B3B] hover:bg-[#704214]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      {/* Colonne droite : Image */}
      <div className="hidden md:flex md:flex-[0.6] items-center justify-center">
        <img
          src="/login-side.png"
          alt="Illustration Hen House"
          className="object-cover rounded-xl shadow-2xl w-full mr-12 max-w-none max-h-none"
        />
      </div>
    </div>
  );
}
