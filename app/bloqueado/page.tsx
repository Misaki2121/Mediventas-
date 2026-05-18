'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Stethoscope, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BloqueadoPage() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 text-orange-700">
            <Stethoscope className="h-8 w-8" />
            <span className="text-2xl font-bold">MediVentas</span>
          </div>
          <Card className="border-0 shadow-xl border-orange-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-orange-100 p-4">
                  <Lock className="h-12 w-12 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-orange-800">Tu cuenta no está activada</CardTitle>
              <CardDescription className="text-base text-orange-700">
                Tu acceso al sistema está temporalmente restringido.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Pago Pendiente</span>
                </div>
                <p className="text-sm text-orange-600">
                  Realiza el pago correspondiente para habilitar el acceso completo al sistema de ventas médicas.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Si ya realizaste el pago, por favor contacta al administrador para activar tu cuenta.
              </p>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
