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
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(""); // Réinitialiser l'erreur
    
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
          const errorMsg = (error as Error)?.message || "";
          
          // Messages d'erreur spécifiques selon le type d'erreur
          let displayMessage = "Une erreur est survenue. Veuillez réessayer.";
          
          if (errorMsg.toLowerCase().includes('unauthorized') || 
              errorMsg.toLowerCase().includes('invalid credentials') ||
              errorMsg.toLowerCase().includes('401')) {
            displayMessage = "Nom d'utilisateur ou mot de passe incorrect.";
          } else if (errorMsg.toLowerCase().includes('user not found') ||
                     errorMsg.toLowerCase().includes('utilisateur')) {
            displayMessage = "Nom d'utilisateur non trouvé.";
          } else if (errorMsg.toLowerCase().includes('password') ||
                     errorMsg.toLowerCase().includes('mot de passe')) {
            displayMessage = "Mot de passe incorrect.";
          } else if (errorMsg.toLowerCase().includes('network') ||
                     errorMsg.toLowerCase().includes('fetch')) {
            displayMessage = "Problème de connexion. Vérifiez votre connexion internet.";
          }
          
          setErrorMessage(displayMessage);
          toast.error('Échec de la connexion', {
            description: displayMessage,
          });
        }
      }
    );
  };

  useEffect(() => {
    loginMutation.reset();
    setErrorMessage(""); // Réinitialiser l'erreur quand l'utilisateur tape
  }, [username, password]);

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      {/* Colonne gauche : Formulaire */}
      <div className="flex md:flex-[0.4] flex-col justify-center items-center px-4 py-12 md:px-16 bg-white w-full min-h-[85vh] md:min-h-0">
        <div className="w-full max-w-md mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-orange-600 mb-3 text-center md:text-left">Connexion Hen House</h1>
          <p className="text-orange-700 mb-8 text-lg text-center md:text-left">Accédez à votre compte pour gérer vos commandes.</p>
          <div className="p-6 md:p-8 shadow-xl border border-orange-200 rounded-xl bg-white">
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
              
              {/* Affichage des erreurs */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errorMessage}
                  </div>
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full mt-2 bg-orange-600 hover:bg-orange-700"
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
