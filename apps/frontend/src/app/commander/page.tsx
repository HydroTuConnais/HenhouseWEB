'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Phone, 
  Clock, 
  ChefHat,
  Package,
  MessageSquare,
  CheckCircle
} from 'lucide-react'
import {
  useCreatePublicCommande,
  type CreneauLivraison
} from '@/components/hooks/public-commandes-hooks'
import { useCreateCommande } from '@/components/hooks/commandes-hooks'
import { useIsAuthenticated, useEntrepriseId } from '@/components/stores/auth-store'
import { useCart } from '@/components/hooks/use-cart'
import { useEmployeeAvailability } from '@/components/hooks/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'

const JOURS_SEMAINE = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
]

const HEURES_LIVRAISON = [
  '1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h', '23h', '00h',
]

export default function CommanderPage() {
  const [telephone, setTelephone] = useState('')
  const [notes, setNotes] = useState('')
  const [creneaux, setCreneaux] = useState<CreneauLivraison[]>([])
  const [commandeEnvoyee, setCommandeEnvoyee] = useState(false)
  const [numeroCommande, setNumeroCommande] = useState('')
  const [typeLivraison, setTypeLivraison] = useState<'livraison' | 'click_and_collect'>('livraison')

  const { isAuthenticated } = useIsAuthenticated()
  const entrepriseId = useEntrepriseId()
  const createPublicMutation = useCreatePublicCommande()
  const createAuthMutation = useCreateCommande()
  const cart = useCart()
  const employeeAvailability = useEmployeeAvailability()

  // Debug log pour voir l'état de la disponibilité
  console.log('🔍 Employee Availability Data:', employeeAvailability.data)
  console.log('🔍 Available?:', employeeAvailability.data?.available)
  console.log('🔍 Available === false?:', employeeAvailability.data?.available === false)

  // Forcer la livraison si l&apos;utilisateur est connecté
  useEffect(() => {
    if (isAuthenticated && typeLivraison === 'click_and_collect') {
      setTypeLivraison('livraison')
    }
  }, [isAuthenticated, typeLivraison])

  // Formater le numéro de téléphone
  const formatTelephone = (value: string) => {
    // Supprimer tous les caractères non numériques
    const numbers = value.replace(/\D/g, '')
    
    // Limiter à 7 chiffres (XXX-XXXX)
    const truncated = numbers.slice(0, 7)
    
    // Formater en XXX-XXXX
    if (truncated.length <= 3) {
      return truncated
    } else {
      return `${truncated.slice(0, 3)}-${truncated.slice(3)}`
    }
  }

  // Gérer le changement de numéro de téléphone
  const handleTelephoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelephone(e.target.value)
    setTelephone(formatted)
  }

  // Fonction pour formater le prix de manière sécurisée
  const formatPrice = (prix: number | string): string => {
    const priceNumber = typeof prix === 'string' ? parseFloat(prix) : Number(prix);
    return isNaN(priceNumber) ? '0.00' : priceNumber.toFixed(2);
  };

  // Ajouter un créneau de livraison
  const ajouterCreneau = () => {
    setCreneaux(prev => [...prev, { 
      jour_debut: '', 
      heure_debut: '', 
      jour_fin: '', 
      heure_fin: '' 
    }])
  }

  // Modifier un créneau
  const modifierCreneau = (index: number, champ: 'jour_debut' | 'heure_debut' | 'jour_fin' | 'heure_fin', valeur: string) => {
    setCreneaux(prev =>
      prev.map((creneau, i) =>
        i === index ? { ...creneau, [champ]: valeur } : creneau
      )
    )
  }

  // Supprimer un créneau
  const supprimerCreneau = (index: number) => {
    setCreneaux(prev => prev.filter((_, i) => i !== index))
  }

  // Valider la commande
  const validerCommande = async () => {
    // Vérifier d'abord la disponibilité des employés
    if (!employeeAvailability.data?.available) {
      toast.error(employeeAvailability.data?.message || "Service temporairement indisponible")
      return
    }

    if (!telephone.trim()) {
      toast.error('Veuillez saisir votre numéro de téléphone')
      return
    }

    // Vérifier le format du téléphone (doit être XXX-XXXX)
    const phoneRegex = /^\d{3}-\d{4}$/
    if (!phoneRegex.test(telephone)) {
      toast.error('Le numéro de téléphone doit être au format XXX-XXXX')
      return
    }

    if (cart.items.length === 0) {
      toast.error('Votre panier est vide')
      return
    }

    // Pour les utilisateurs connectés, les créneaux sont obligatoires (toujours livraison)
    // Pour les anonymes, les créneaux ne sont obligatoires que si livraison est sélectionnée
    if ((isAuthenticated || typeLivraison === 'livraison') && (creneaux.length === 0 || creneaux.some(c => !c.jour_debut || !c.heure_debut || !c.jour_fin || !c.heure_fin))) {
      toast.error('Veuillez sélectionner au moins un créneau de livraison complet (début et fin)')
      return
    }

    // Créer une commande avec les items du panier
    try {
      let result
      
      if (isAuthenticated) {
        // Utilisateur connecté - toujours livraison, vérifier s'il y a des menus
        const hasMenus = cart.items.some(item => item.type === 'menu')
        
        if (hasMenus) {
          // Si il y a des menus, utiliser l&apos;API publique qui supporte les menus
          const publicCommandeData = {
            entreprise_id: entrepriseId || null,
            items: cart.items.map(item => ({
              type: item.type,
              itemId: item.id,
              quantite: item.quantite
            })),
            telephone_livraison: telephone,
            creneaux_livraison: creneaux, // Toujours livraison pour les connectés
            notes_commande: notes || undefined,
            type_livraison: 'livraison' as const // Forcé à livraison
          }
          
          result = await createPublicMutation.mutateAsync(publicCommandeData)
        } else {
          // Seulement des produits - utiliser l&apos;API authentifiée
          const produits = cart.items.map(item => ({
            produit_id: item.id,
            quantite: item.quantite
          }))
          
          const authCommandeData = {
            produits,
            telephone_livraison: telephone,
            creneaux_livraison: creneaux, // Toujours livraison pour les connectés
            notes_commande: notes || undefined,
            entreprise_id: entrepriseId || undefined,
            type_livraison: 'livraison' as const // Forcé à livraison
          }
          
          result = await createAuthMutation.mutateAsync(authCommandeData)
        }
      } else {
        // Utilisateur anonyme - utiliser l&apos;API publique
        // Note: entrepriseId peut être null pour les commandes publiques
        
        const publicCommandeData = {
          entreprise_id: entrepriseId || null,
          items: cart.items.map(item => ({
            type: item.type, // 'menu' ou 'produit'
            itemId: item.id,
            quantite: item.quantite
          })),
          telephone_livraison: telephone,
          creneaux_livraison: typeLivraison === 'livraison' ? creneaux : [],
          notes_commande: notes || undefined,
          type_livraison: typeLivraison
        }
        
        result = await createPublicMutation.mutateAsync(publicCommandeData)
      }
      setNumeroCommande(result.numeroCommande || '')
      setCommandeEnvoyee(true)
      cart.clearCart() // Vider le panier après la commande
      toast.success('Commande envoyée avec succès!')
    } catch (error) {
      console.error('Erreur lors de la commande:', error)
      toast.error('Erreur lors de l\'envoi de la commande')
    }
  }

  // Réinitialiser pour une nouvelle commande
  const nouvelleCommande = () => {
    setTelephone('')
    setNotes('')
    setCreneaux([])
    setCommandeEnvoyee(false)
    setNumeroCommande('')
    setTypeLivraison('livraison')
  }

  if (commandeEnvoyee) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Commande confirmée !</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {numeroCommande && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Votre numéro de commande</h3>
                <p className="text-2xl font-bold text-blue-600 font-mono">#{numeroCommande}</p>
                <p className="text-sm text-blue-700 mt-2">
                  Gardez ce numéro précieusement pour suivre votre commande
                </p>
              </div>
            )}
            <p className="text-gray-600">
              Votre commande a été transmise avec succès. Vous recevrez un appel sur le numéro <strong>{telephone}</strong> pour confirmer les détails de livraison.
            </p>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-orange-800 text-sm">
                <strong>📞 Important :</strong> Assurez-vous que votre téléphone soit accessible. Notre équipe vous contactera dans les plus brefs délais.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={() => {
                  if (isAuthenticated) {
                    // Utilisateur connecté : rediriger vers le dashboard
                    window.location.href = `/dashboard`;
                  } else {
                    // Utilisateur non connecté : rediriger vers le suivi avec paramètres
                    const params = new URLSearchParams({
                      numero: numeroCommande,
                      telephone: telephone
                    });
                    window.location.href = `/suivi-commande?${params.toString()}`;
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isAuthenticated ? '📊 Voir dans mon dashboard' : '🔍 Suivre ma commande'}
              </Button>
              <Button onClick={nouvelleCommande} variant="outline">
                Nouvelle commande
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline">
                Retour à l&apos;accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Commander en ligne</h1>
          <p className="text-gray-600">Choisissez vos produits et finalisez votre commande</p>
        </div>

        {/* Statut de disponibilité des employés */}
        {employeeAvailability.isLoading ? (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse w-4 h-4 bg-gray-300 rounded-full"></div>
                <span className="text-gray-600">Vérification de la disponibilité du service...</span>
              </div>
            </CardContent>
          </Card>
        ) : employeeAvailability.data?.available === false ? (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-red-800">Service temporairement indisponible</h3>
                  <p className="text-sm text-red-700">
                    {employeeAvailability.data.message || "Aucun employé n'est actuellement en service pour traiter les commandes."}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Veuillez réessayer plus tard ou nous contacter directement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-green-800">Service disponible</h3>
                  <p className="text-sm text-green-700">
                    {employeeAvailability.data?.message || `${employeeAvailability.data?.count || 0} employé(s) en service`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="max-w-2xl mx-auto">
          {/* Commande et livraison */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Résumé de la commande</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.items.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 mb-4">Votre panier est vide</p>
                      <Link href="/menu">
                        <Button variant="outline">
                          <ChefHat className="h-4 w-4 mr-2" />
                          Voir la carte
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    cart.items?.filter(item => item && item.id && item.nom).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.nom}</h4>
                          <p className="text-sm text-gray-600">{formatPrice(item.prix || 0)}$ x {item.quantite || 1}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatPrice((item.prix || 0) * (item.quantite || 1))}$</span>
                        </div>
                      </div>
                    )) || []
                  )}
                  
                  {cart.items.length > 0 && (
                    <>
                      <Separator />
                      
                      <div className="flex justify-between items-center font-semibold text-lg">
                        <span>Total:</span>
                        <span>{formatPrice(cart.total)}$</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Type de livraison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Mode de récupération</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      typeLivraison === 'livraison' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setTypeLivraison('livraison')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={typeLivraison === 'livraison'}
                        onChange={() => setTypeLivraison('livraison')}
                        className="text-orange-600"
                      />
                      <div>
                        <h4 className="font-medium">🚚 Livraison à domicile</h4>
                        <p className="text-sm text-gray-600">Nous livrons directement chez vous</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`border rounded-lg p-4 transition-colors ${
                      isAuthenticated 
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50' 
                        : typeLivraison === 'click_and_collect' 
                          ? 'border-orange-500 bg-orange-50 cursor-pointer' 
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                    onClick={() => !isAuthenticated && setTypeLivraison('click_and_collect')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={typeLivraison === 'click_and_collect'}
                        onChange={() => !isAuthenticated && setTypeLivraison('click_and_collect')}
                        disabled={isAuthenticated}
                        className="text-orange-600"
                      />
                      <div>
                        <h4 className={`font-medium ${isAuthenticated ? 'text-gray-500' : ''}`}>
                          🏪 Click & Collect
                          {isAuthenticated && <span className="text-xs ml-2">(Non disponible pour les comptes connectés)</span>}
                        </h4>
                        <p className={`text-sm ${isAuthenticated ? 'text-gray-400' : 'text-gray-600'}`}>
                          Récupération sur place
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations de contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Numéro de téléphone</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="tel"
                  placeholder="123-4567"
                  value={telephone}
                  onChange={handleTelephoneChange}
                  className="text-lg"
                  maxLength={8}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Format: XXX-XXXX - Nous vous appellerons pour confirmer les détails {typeLivraison === 'livraison' ? 'de livraison' : 'de récupération'}
                </p>
              </CardContent>
            </Card>

            {(isAuthenticated || typeLivraison === 'livraison') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Créneaux de livraison souhaités</span>
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                {creneaux.map((creneau, index) => (
                  <div key={`creneau-${index}`} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Créneau {index + 1}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => supprimerCreneau(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Début du créneau */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Début :</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={creneau.jour_debut}
                          onChange={(e) => modifierCreneau(index, 'jour_debut', e.target.value)}
                          className="flex-1 p-2 border rounded-md"
                        >
                          <option value="">Jour</option>
                          {JOURS_SEMAINE.map((jour) => (
                            <option key={jour} value={jour}>{jour}</option>
                          ))}
                        </select>
                        <select
                          value={creneau.heure_debut}
                          onChange={(e) => modifierCreneau(index, 'heure_debut', e.target.value)}
                          className="flex-1 p-2 border rounded-md"
                        >
                          <option value="">Heure</option>
                          {HEURES_LIVRAISON.map((heure) => (
                            <option key={heure} value={heure}>{heure}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Fin du créneau */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Fin :</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={creneau.jour_fin}
                          onChange={(e) => modifierCreneau(index, 'jour_fin', e.target.value)}
                          className="flex-1 p-2 border rounded-md"
                        >
                          <option value="">Jour</option>
                          {JOURS_SEMAINE.map((jour) => (
                            <option key={jour} value={jour}>{jour}</option>
                          ))}
                        </select>
                        <select
                          value={creneau.heure_fin}
                          onChange={(e) => modifierCreneau(index, 'heure_fin', e.target.value)}
                          className="flex-1 p-2 border rounded-md"
                        >
                          <option value="">Heure</option>
                          {HEURES_LIVRAISON.map((heure) => (
                            <option key={heure} value={heure}>{heure}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Aperçu du créneau */}
                    {creneau.jour_debut && creneau.heure_debut && creneau.jour_fin && creneau.heure_fin && (
                      <div className="bg-gray-50 p-2 rounded text-sm text-gray-600">
                        <strong>Période :</strong> {creneau.jour_debut} {creneau.heure_debut} → {creneau.jour_fin} {creneau.heure_fin}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={ajouterCreneau}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un créneau de livraison
                </Button>
              </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Notes (optionnel)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Informations complémentaires pour la livraison..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            <Button 
              onClick={validerCommande} 
              disabled={
                (createPublicMutation.isPending || createAuthMutation.isPending) || 
                cart.items.length === 0 || 
                employeeAvailability.data?.available === false
              }
              size="lg"
              className={`w-full ${
                employeeAvailability.data?.available === false 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {employeeAvailability.data?.available === false 
                ? 'Service indisponible' 
                : (createPublicMutation.isPending || createAuthMutation.isPending) 
                  ? 'Commande en cours...' 
                  : `Commander (${formatPrice(cart.total)}$)`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
