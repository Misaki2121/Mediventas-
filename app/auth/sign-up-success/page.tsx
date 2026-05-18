import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Stethoscope } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 text-teal-700">
            <Stethoscope className="h-8 w-8" />
            <span className="text-2xl font-bold">MediVentas</span>
          </div>
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-teal-600" />
              </div>
              <CardTitle className="text-2xl">Registro Exitoso</CardTitle>
              <CardDescription className="text-base">
                Te hemos enviado un correo de confirmación. Por favor, verifica tu email para activar tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Una vez confirmado tu email, un administrador activará tu cuenta para que puedas acceder al sistema.
              </p>
              <Link
                href="/auth/login"
                className="text-teal-600 underline underline-offset-4 hover:text-teal-700"
              >
                Volver al inicio de sesión
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
