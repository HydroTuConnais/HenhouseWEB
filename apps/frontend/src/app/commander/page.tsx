'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  MapPin, 
  Phone, 
  Clock, 
  ChefHat,
  Package,
  Euro,
  Calendar,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import {
  useCreatePublicCommande,
  type CreneauLivraison
} from '@/components/hooks/public-commandes-hooks'
import { useCart } from '@/components/hooks/use-cart'
import { getImageUrl } from '@/lib/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const JOURS_SEMAINE = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
]

const HEURES_LIVRAISON = [
  '8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h'
]

export default function CommanderPage() {
  const [telephone, setTelephone] = useState('')
  const [notes, setNotes] = useState('')
  const [creneaux, setCreneaux] = useState<CreneauLivraison[]>([])
  const [commandeEnvoyee, setCommandeEnvoyee] = useState(false)

  const createMutation = useCreatePublicCommande()
  const cart = useCart()

  // Formater le numéro de téléphone
  const formatTelephone = (value: string) => {
    // Supprimer tous les caractères non numériques
    const numbers = value.replace(/\D/g, '')
    
    // Limiter à 7 chiffres (555-XXXX)
    const truncated = numbers.slice(0, 7)
    
    // Formater en 555-XXXX
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
  const formatPrice = (prix: any): string => {
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
    if (!telephone.trim()) {
      toast.error('Veuillez saisir votre numéro de téléphone')
      return
    }

    // Vérifier le format du téléphone (doit être 555-XXXX)
    const phoneRegex = /^\d{3}-\d{4}$/
    if (!phoneRegex.test(telephone)) {
      toast.error('Le numéro de téléphone doit être au format 555-XXXX')
      return
    }

    if (cart.items.length === 0) {
      toast.error('Votre panier est vide')
      return
    }

    if (creneaux.length === 0 || creneaux.some(c => !c.jour_debut || !c.heure_debut || !c.jour_fin || !c.heure_fin)) {
      toast.error('Veuillez sélectionner au moins un créneau de livraison complet (début et fin)')
      return
    }

    // Créer une commande avec les items du panier
    try {
      const commandeData = {
        entreprise_id: 1, // ID par défaut - sera confirmé par téléphone
        produits: cart.items.map(item => ({
          produit_id: item.id,
          quantite: item.quantite
        })),
        telephone_livraison: telephone,
        creneaux_livraison: creneaux,
        notes_commande: notes || undefined
      }
      
      console.log('Envoi de la commande:', commandeData)
      await createMutation.mutateAsync(commandeData)
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
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Votre commande a été transmise avec succès. Vous recevrez un appel sur le numéro {telephone} pour confirmer les détails de livraison.
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={nouvelleCommande} variant="outline">
                Nouvelle commande
              </Button>
              <Button onClick={() => window.location.href = '/'}>
                Retour à l'accueil
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
                    cart.items.map((item, index) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.nom}</h4>
                          <p className="text-sm text-gray-600">{formatPrice(item.prix)}$ x {item.quantite}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatPrice(item.prix * item.quantite)}$</span>
                        </div>
                      </div>
                    ))
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

            {/* Informations de livraison */}
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
                  placeholder="555-1234"
                  value={telephone}
                  onChange={handleTelephoneChange}
                  className="text-lg"
                  maxLength={8}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Format: 555-XXXX - Nous vous appellerons pour confirmer les détails de livraison
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Créneaux de livraison souhaités</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {creneaux.map((creneau, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
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
              disabled={createMutation.isPending || cart.items.length === 0}
              size="lg"
              className="w-full"
            >
              {createMutation.isPending ? 'Commande en cours...' : `Commander (${formatPrice(cart.total)}$)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
