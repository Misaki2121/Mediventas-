'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Stethoscope } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 text-teal-700">
            <Stethoscope className="h-8 w-8" />
            <span className="text-2xl font-bold">MediVentas</span>
          </div>
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
              <CardDescription>
                Ingresa tus credenciales para acceder al sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full bg-teal-600 hover:bg-teal-700" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Ingresando...' : 'Ingresar'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  ¿No tienes cuenta?{' '}
                  <Link
                    href="/auth/sign-up"
                    className="text-teal-600 underline underline-offset-4 hover:text-teal-700"
                  >
                    Regístrate
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
