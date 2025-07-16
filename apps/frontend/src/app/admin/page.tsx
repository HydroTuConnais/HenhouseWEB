"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Users, ChefHat, Package, Link2 } from "lucide-react";
import { useIsAuthenticated } from "@/components/stores/auth-store";
import { useRouter } from "next/navigation";
import EntreprisesManager from "@/components/admin/EntreprisesManager";
import UsersManager from "@/components/admin/UsersManager";
import MenusManager from "@/components/admin/MenusManager";
import ProduitsManager from "@/components/admin/ProduitsManager";
import MenuEntreprisesManager from "@/components/admin/MenuEntreprisesManager";

export default function AdminDashboard() {
  const { isAuthenticated, user } = useIsAuthenticated();
  const router = useRouter();

  // Vérifier si l'utilisateur est admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-6">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <Button 
            onClick={() => router.push('/')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrateur</h1>
                <p className="text-gray-600">Gestion complète de la plateforme Hen House</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">Administrateur</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="entreprises" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
            <TabsTrigger value="entreprises" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Entreprises
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="menus" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Menus
            </TabsTrigger>
            <TabsTrigger value="produits" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="associations" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Associations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entreprises" className="space-y-6">
            <EntreprisesManager />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersManager />
          </TabsContent>

          <TabsContent value="menus" className="space-y-6">
            <MenusManager />
          </TabsContent>

          <TabsContent value="produits" className="space-y-6">
            <ProduitsManager />
          </TabsContent>

          <TabsContent value="associations" className="space-y-6">
            <MenuEntreprisesManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
