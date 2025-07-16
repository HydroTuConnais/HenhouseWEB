"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Users, ShoppingBag, AlertCircle } from "lucide-react";
import { useEntreprises, useEntrepriseMenus, useEntrepriseProduits } from "@/components/hooks/api-hooks";

interface Entreprise {
  id: number;
  nom: string;
  createdAt: string;
  updatedAt: string;
}

const EntrepriseCard = ({ entreprise }: { entreprise: Entreprise }) => {
  const { data: menus = [], isLoading: menusLoading } = useEntrepriseMenus(entreprise.id);
  const { data: produits = [], isLoading: produitsLoading } = useEntrepriseProduits(entreprise.id);

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <div className="p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Building2 className="h-5 w-5" />
          {entreprise.nom}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">
                {menusLoading ? "..." : `${menus.length} menus`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {produitsLoading ? "..." : `${produits.length} produits`}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            Créé le {new Date(entreprise.createdAt).toLocaleDateString()}
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              Voir détails
            </Button>
            <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600">
              Gérer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EntreprisesPage() {
  const { data: entreprises = [], isLoading, error } = useEntreprises();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Accès refusé</h2>
          <p className="text-gray-600 mb-4">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Gestion des entreprises</h1>
        <p className="text-gray-600">Administrez les entreprises et leurs ressources</p>
      </div>

      {entreprises.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune entreprise</h3>
          <p className="text-gray-500 mb-4">
            Aucune entreprise n'est encore enregistrée dans le système.
          </p>
          <Button className="bg-orange-500 hover:bg-orange-600">
            Créer une entreprise
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              {entreprises.length} entreprise{entreprises.length > 1 ? 's' : ''} trouvée{entreprises.length > 1 ? 's' : ''}
            </p>
            <Button className="bg-orange-500 hover:bg-orange-600">
              Nouvelle entreprise
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entreprises.map((entreprise: Entreprise) => (
              <EntrepriseCard key={entreprise.id} entreprise={entreprise} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
