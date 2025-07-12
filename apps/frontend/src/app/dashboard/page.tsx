"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  ShoppingBag, 
  Eye, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  Truck,
  Settings,
  Key,
  Loader2
} from "lucide-react";
import { useIsAuthenticated } from "@/components/stores/auth-store";
import { useUserCommandes, type Commande } from "@/components/hooks/commandes-hooks";
import { useChangePassword } from "@/components/hooks/user-hooks";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Fonction pour formater le prix de manière sécurisée
const formatPrice = (prix: any): string => {
  const priceNumber = typeof prix === 'string' ? parseFloat(prix) : Number(prix);
  return isNaN(priceNumber) ? '0.00' : priceNumber.toFixed(2);
};

// Types pour les statuts de commande
const getStatusInfo = (status: string) => {
  switch (status.toLowerCase()) {
    case 'en_attente':
      return { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    case 'confirmee':
      return { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
    case 'en_preparation':
      return { label: 'En préparation', color: 'bg-orange-100 text-orange-800', icon: Package };
    case 'prete':
      return { label: 'Prête', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 'livree':
      return { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: Truck };
    case 'annulee':
      return { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: XCircle };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
  }
};

// Composant pour afficher les détails d'une commande
const CommandeDetailDialog = ({ commande }: { commande: Commande }) => {
  const statusInfo = getStatusInfo(commande.statut);
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          Voir détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
            Commande #{commande.numeroCommande}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Statut et informations générales */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <Badge className={`${statusInfo.color} text-xs sm:text-sm`}>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              {new Date(commande.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {/* Produits commandés */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Produits commandés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commande.produits.map((item, index) => {
                  // Gérer le cas où pivot pourrait être undefined
                  const quantite = item.pivot?.quantite || 1;
                  const prixUnitaire = item.pivot?.prix_unitaire || item.prix || 0;
                  
                  return (
                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-3 border rounded-lg gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm sm:text-base">{item.nom}</h4>
                        {item.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Catégorie: {item.categorie}</p>
                      </div>
                      <div className="text-left sm:text-right sm:ml-4">
                        <div className="font-medium text-sm sm:text-base">x{quantite}</div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {formatPrice(prixUnitaire)}$ / unité
                        </div>
                        <div className="text-xs sm:text-sm font-semibold">
                          Total: {formatPrice(prixUnitaire * quantite)}$
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Total */}
              <div className="border-t pt-3 mt-4">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(commande.total)}$</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations de livraison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Informations de commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><strong>Numéro:</strong> {commande.numeroCommande}</p>
                <p className="text-sm"><strong>Statut:</strong> {statusInfo.label}</p>
                <p className="text-sm"><strong>Date de commande:</strong> {new Date(commande.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                {commande.entreprise && (
                  <p className="text-sm"><strong>Entreprise:</strong> {commande.entreprise.nom}</p>
                )}
                {commande.statut === 'livree' && (
                  <p className="text-sm text-green-600"><strong>✅ Livrée</strong></p>
                )}
                {commande.statut === 'en_preparation' && (
                  <p className="text-sm text-orange-600"><strong>🍳 En cours de préparation</strong></p>
                )}
                {commande.statut === 'prete' && (
                  <p className="text-sm text-blue-600"><strong>📦 Prête pour récupération</strong></p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Composant pour changer le mot de passe
const ChangePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const changePasswordMutation = useChangePassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      
      toast.success('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Key className="h-4 w-4 mr-2" />
          Changer le mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={changePasswordMutation.isPending}
            />
          </div>
          <div>
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              disabled={changePasswordMutation.isPending}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={changePasswordMutation.isPending}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Modifier
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={changePasswordMutation.isPending}
            >
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function DashboardPage() {
  const { isAuthenticated, user } = useIsAuthenticated();
  
  // Récupérer les vraies données des commandes depuis l'API
  // Tous les hooks doivent être appelés avant les retours conditionnels
  const { data: commandes = [], isLoading, error } = useUserCommandes();

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Veuillez vous connecter pour accéder au dashboard</div>
      </div>
    );
  }

  // Filtrer les commandes par statut
  const commandesEnCours = commandes.filter(c => 
    !['livree', 'annulee'].includes(c.statut)
  );

  const commandesLivrees = commandes.filter(c => c.statut === 'livree');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement de vos commandes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">
          Erreur lors du chargement des commandes: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
      {/* En-tête de bienvenue */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Bienvenue, {user?.username}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gérez votre compte et suivez vos commandes
        </p>
      </div>

      <Tabs defaultValue="commandes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="commandes" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Mes Commandes
          </TabsTrigger>
          <TabsTrigger value="compte" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Mon Compte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commandes" className="space-y-6">
          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Commandes en cours</p>
                    <p className="text-xl sm:text-2xl font-bold">{commandesEnCours.length}</p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Commandes livrées</p>
                    <p className="text-xl sm:text-2xl font-bold">{commandesLivrees.length}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total commandes</p>
                    <p className="text-xl sm:text-2xl font-bold">{commandes.length}</p>
                  </div>
                  <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commandes en cours */}
          {commandesEnCours.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Commandes en cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commandesEnCours.map((commande) => {
                    const statusInfo = getStatusInfo(commande.statut);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div key={commande.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm sm:text-base">Commande #{commande.numeroCommande}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {new Date(commande.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              <Badge className={`${statusInfo.color} text-xs`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                              <p className="font-semibold text-sm sm:text-base">{formatPrice(commande.total)}€</p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {commande.produits.length} produit(s)
                              </p>
                            </div>
                            <CommandeDetailDialog commande={commande} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historique des commandes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historique des commandes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commandes.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune commande trouvée</p>
                  <p className="text-sm text-gray-400">Vos commandes apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commandes.map((commande) => {
                    const statusInfo = getStatusInfo(commande.statut);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div key={commande.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm sm:text-base">Commande #{commande.numeroCommande}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {new Date(commande.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {commande.entreprise && (
                                <p className="text-xs text-gray-500">
                                  {commande.entreprise.nom}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              <Badge className={`${statusInfo.color} text-xs`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                              <p className="font-semibold text-sm sm:text-base">{formatPrice(commande.total)}€</p>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {commande.produits.length} produit(s)
                              </p>
                            </div>
                            <CommandeDetailDialog commande={commande} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compte" className="space-y-6">
          {/* Informations du compte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations du compte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Nom d'utilisateur</Label>
                  <Input id="username" value={user?.username || ''} disabled />
                </div>
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Input id="role" value={user?.role || ''} disabled />
                </div>
                {user?.entreprise && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="entreprise">Entreprise</Label>
                    <Input id="entreprise" value={user.entreprise.nom || ''} disabled />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions du compte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres du compte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ChangePasswordForm />
                <p className="text-sm text-gray-500 mt-4">
                  💡 Votre dashboard affiche maintenant vos vraies commandes récupérées depuis l'API backend !
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
