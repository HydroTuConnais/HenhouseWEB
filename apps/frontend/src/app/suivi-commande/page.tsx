'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Calendar,
  ShoppingBag,
  Loader2,
  AlertCircle,
  RefreshCw,
  Truck,
  Store
} from 'lucide-react';
import { toast } from 'sonner';
import { useCommandeStatutWithPhone } from '@/components/hooks/public-commandes-hooks';

interface Produit {
  id: number;
  nom: string;
  prix: number;
  description?: string | null;
  categorie?: string;
  pivot?: {
    quantite: number;
    prix_unitaire?: number;
    ordre?: number | null;
    disponible?: boolean;
  };
}

interface MenuWithPivot {
  id: number;
  nom: string;
  description?: string;
  prix: number;
  produits?: Array<{
    id: number;
    nom: string;
    description?: string;
    prix: number;
  }>;
  pivot?: {
    quantite?: number;
    prix_unitaire?: number;
  };
}

const statusInfo = {
  en_attente: {
    label: 'En attente de confirmation',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    description: 'Votre commande a été reçue et est en attente de confirmation.'
  },
  confirmee: {
    label: 'Confirmée',
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle,
    description: 'Votre commande a été confirmée et va bientôt être préparée.'
  },
  en_preparation: {
    label: 'En préparation',
    color: 'bg-orange-100 text-orange-800',
    icon: Package,
    description: 'Votre commande est actuellement en cours de préparation.'
  },
  prete: {
    label: 'Prête pour récupération',
    color: 'bg-purple-100 text-purple-800',
    icon: ShoppingBag,
    description: 'Votre commande est prête ! Vous pouvez venir la récupérer.'
  },
  livree: {
    label: 'Livrée',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    description: 'Votre commande a été livrée avec succès.'
  },
  annulee: {
    label: 'Annulée',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Cette commande a été annulée.'
  }
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatDate = (dateString: string) => {
  try {
    let date;
    if (!isNaN(Number(dateString))) {
      date = new Date(Number(dateString));
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) {
      return 'Date non disponible';
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Erreur de formatage de date:', error);
    return 'Date non disponible';
  }
};

const formatCreneaux = (creneaux: Array<{
  jour_debut?: string;
  jour_fin?: string;
  heure_debut?: string;
  heure_fin?: string;
}>) => {
  if (!creneaux || creneaux.length === 0) return 'Non spécifié';
  try {
    const formatted = creneaux.filter(creneau => creneau && typeof creneau === 'object').map(creneau => {
      const jourDebut = creneau.jour_debut || '';
      const jourFin = creneau.jour_fin || '';
      const heureDebut = creneau.heure_debut || '';
      const heureFin = creneau.heure_fin || '';
      if (jourDebut === jourFin && jourDebut) {
        return `${jourDebut} de ${heureDebut} à ${heureFin}`;
      } else if (jourDebut && jourFin) {
        return `Du ${jourDebut} ${heureDebut} au ${jourFin} ${heureFin}`;
      } else if (heureDebut && heureFin) {
        return `De ${heureDebut} à ${heureFin}`;
      } else {
        return 'Créneau non spécifié';
      }
    }).join(', ');
    return formatted || 'Non spécifié';
  } catch (error) {
    console.error('Erreur dans formatCreneaux:', error);
    return 'Non spécifié';
  }
};

function SuiviCommandeContent() {
  const searchParams = useSearchParams();
  const [numeroCommande, setNumeroCommande] = useState('');
  const [telephone, setTelephone] = useState('');
  const [shouldSearch, setShouldSearch] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: commande, isLoading, error, refetch } = useCommandeStatutWithPhone(
    shouldSearch ? numeroCommande : '',
    shouldSearch ? telephone : ''
  );

  useEffect(() => {
    const numeroParam = searchParams?.get('numero');
    const telephoneParam = searchParams?.get('telephone');
    if (numeroParam && telephoneParam) {
      setNumeroCommande(numeroParam);
      setTelephone(telephoneParam);
      setTimeout(() => {
        setShouldSearch(true);
      }, 500);
    }
  }, [searchParams]);

  useEffect(() => {
    if (commande && autoRefresh && commande.statut !== 'livree' && commande.statut !== 'annulee') {
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [commande, autoRefresh, refetch]);

  const formatTelephone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const truncated = numbers.slice(0, 7)
    if (truncated.length <= 3) {
      return truncated
    } else {
      return `${truncated.slice(0, 3)}-${truncated.slice(3)}`
    }
  }

  const handleTelephoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelephone(e.target.value)
    setTelephone(formatted)
  }

  const rechercherCommande = () => {
    const numeroActuel = numeroCommande.trim();
    const telephoneActuel = telephone.trim();
    if (!numeroActuel) {
      toast.error('Veuillez saisir un numéro de commande');
      return;
    }
    if (!telephoneActuel) {
      toast.error('Veuillez saisir votre numéro de téléphone');
      return;
    }
    const phoneRegex = /^\d{3}-\d{4}$/
    if (!phoneRegex.test(telephoneActuel)) {
      toast.error('Le numéro de téléphone doit être au format XXX-XXXX')
      return
    }
    setShouldSearch(true);
  };

  useEffect(() => {
    if (commande && shouldSearch) {
      if (commande.statut !== 'livree' && commande.statut !== 'annulee') {
        setAutoRefresh(true);
      } else {
        setAutoRefresh(false);
      }
      toast.success('Commande trouvée !');
    }
  }, [commande, shouldSearch]);

  useEffect(() => {
    if (error && shouldSearch) {
      toast.error(error.message || 'Erreur lors de la recherche de la commande');
    }
  }, [error, shouldSearch]);

  const resetRecherche = () => {
    setNumeroCommande('');
    setTelephone('');
    setShouldSearch(false);
    setAutoRefresh(false);
  };

  const status = commande ? statusInfo[commande.statut as keyof typeof statusInfo] : null;
  const StatusIcon = status?.icon;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recherche de commande
          </h1>
          <p className="text-gray-600">
            Entrez votre numéro de commande (format: CMD-xxxxxxxxxx) et votre téléphone (format: XXX-XXXX) pour rechercher votre commande
          </p>
        </div>

        {/* Formulaire de recherche */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Rechercher votre commande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="numeroCommande" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de commande
                </label>
                <Input
                  id="numeroCommande"
                  type="text"
                  placeholder="CMD-1752359735513"
                  value={numeroCommande}
                  onChange={(e) => setNumeroCommande(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone
                </label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="123-4567"
                  value={telephone}
                  onChange={handleTelephoneChange}
                  disabled={isLoading}
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: XXX-XXXX (utilisé lors de la commande)
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => rechercherCommande()}
                  disabled={isLoading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Rechercher
                </Button>

                {(commande || error) && (
                  <Button
                    variant="outline"
                    onClick={resetRecherche}
                    disabled={isLoading}
                  >
                    Nouvelle recherche
                  </Button>
                )}

                {commande && (
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erreur */}
        {error && (
          <Card className="mb-6 border-red-200">
            <CardContent>
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error.message || 'Erreur lors de la recherche de la commande'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Résultat de la commande */}
        {commande && status && StatusIcon && (
          <div className="space-y-6">
            {/* Indicateur d'auto-refresh */}
            {autoRefresh && commande.statut !== 'livree' && commande.statut !== 'annulee' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-orange-700 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Actualisation automatique activée (toutes les 30 secondes)</span>
                </div>
              </div>
            )}

            {/* Statut de la commande */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <StatusIcon className="h-6 w-6" />
                  Commande #{commande.numeroCommande}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge className={`${status.color} text-sm`}>
                      {status.label}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {formatDate(commande.createdAt)}
                    </span>
                  </div>

                  <p className="text-gray-700">{status.description}</p>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Informations de livraison</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{commande.telephoneLivraison}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span>{
                          (() => {
                            try {
                              if (commande.creneauxLivraison && Array.isArray(commande.creneauxLivraison)) {
                                return formatCreneaux(commande.creneauxLivraison);
                              }
                              if (typeof commande.creneauxLivraison === 'string') {
                                const parsed = JSON.parse(commande.creneauxLivraison);
                                const result = formatCreneaux(Array.isArray(parsed) ? parsed : [parsed]);
                                return typeof result === 'string' ? result : 'Non spécifié';
                              }
                              return 'Non spécifié';
                            } catch (error) {
                              console.error('Erreur lors du parsing des créneaux:', error);
                              return 'Non spécifié';
                            }
                          })()
                        }</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {commande.type_livraison === 'livraison' ? (
                          <Truck className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Store className="h-4 w-4 text-gray-500" />
                        )}
                        <span>
                          {commande.type_livraison === 'livraison' ? 'Livraison' : 'Click & Collect'}
                        </span>
                      </div>
                      {commande.entreprise && (
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-gray-500" />
                          <span>{commande.entreprise.nom}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {commande.notesCommande && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Notes de commande</h4>
                      <p className="text-sm text-gray-700">{commande.notesCommande}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Détails des produits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Articles commandés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Afficher les menus */}
                  {commande.menus && commande.menus.length > 0 && (
                    commande.menus.map((menu: MenuWithPivot, index: number) => {
                      const quantite = menu.pivot?.quantite || 1;
                      const prixUnitaire = menu.pivot?.prix_unitaire || menu.prix || 0;
                      return (
                        <div key={`menu-${index}`} className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-3 border rounded-lg gap-3 sm:gap-4 bg-orange-50 border-orange-200">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm sm:text-base">🍽️ {menu.nom}</h4>
                            {menu.description && (
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">{menu.description}</p>
                            )}
                            {menu.produits && menu.produits.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">Inclut:</p>
                                <ul className="text-xs text-gray-600 ml-2">
                                  {menu.produits.map((produit: { id: number; nom: string }, idx: number) => (
                                    <li key={produit.id || `produit-${idx}`}>• {produit.nom}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="text-left sm:text-right sm:ml-4">
                            <div className="font-medium text-sm sm:text-base">x{quantite}</div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {formatPrice(prixUnitaire)}$ / menu
                            </div>
                            <div className="text-xs sm:text-sm font-semibold">
                              Total: {formatPrice(prixUnitaire * quantite)}$
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Afficher les produits individuels */}
                  {commande.produits && commande.produits.map((item: Produit, index: number) => {
                    const quantite = item.pivot?.quantite || 1;
                    const prixUnitaire = item.pivot?.prix_unitaire || item.prix || 0;
                    return (
                      <div key={`produit-${item.id || index}`} className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-3 border rounded-lg gap-3 sm:gap-4 bg-blue-50 border-blue-200">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm sm:text-base">🛍️ {item.nom}</h4>
                          {item.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          {item.categorie && (
                            <p className="text-xs text-gray-500 mt-1">Catégorie: {item.categorie}</p>
                          )}
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

                  {/* Message si aucun article */}
                  {(!commande.produits || commande.produits.length === 0) &&
                    (!commande.menus || commande.menus.length === 0) && (
                      <div className="text-center py-4 text-gray-500">
                        Aucun article dans cette commande
                      </div>
                    )}
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

            {/* Informations de commande */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Informations de commande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Numéro:</strong> {commande.numeroCommande}</p>
                  <p className="text-sm"><strong>Statut:</strong> {status.label}</p>
                  <p className="text-sm"><strong>Date de commande:</strong> {formatDate(commande.createdAt)}</p>
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

            {/* Informations supplémentaires */}
            <Card className="bg-blue-50">
              <CardContent>
                <div className="text-center text-sm text-blue-800">
                  <p className="font-medium mb-2">Besoin d&apos;aide avec votre commande ?</p>
                  <p>
                    Contactez-nous au <strong>+362</strong> ou gardez votre numéro de commande <strong>#{commande.numeroCommande}</strong> à portée de main.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SuiviCommandePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement...</div>}>
      <SuiviCommandeContent />
    </Suspense>
  );
}
