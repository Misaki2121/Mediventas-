import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, AlertTriangle, Clock, ShoppingCart } from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const twoDaysFromNow = addDays(today, 2)

  // Get sales for current month
  const { data: monthlySales } = await supabase
    .from('sales')
    .select('id, total, date, status, due_date, doctor_id, invoice_number, doctors(name)')
    .eq('user_id', user?.id)
    .gte('date', format(monthStart, 'yyyy-MM-dd'))
    .lte('date', format(monthEnd, 'yyyy-MM-dd'))
    .order('date', { ascending: false })

  // Get all pending sales for payment tracking
  const { data: pendingSales } = await supabase
    .from('sales')
    .select('id, total, due_date, status, doctor_id, invoice_number, doctors(name)')
    .eq('user_id', user?.id)
    .neq('status', 'pagado')

  // Get ALL payments for current month to calculate commission (commission is based on collected payments)
  const { data: monthlyPayments } = await supabase
    .from('payments')
    .select('sale_id, amount, payment_date')
    .gte('payment_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('payment_date', format(monthEnd, 'yyyy-MM-dd'))

  // Filter to only include payments for user's sales
  const monthlySaleIds = monthlySales?.map(s => s.id) || []
  const userMonthlyPayments = monthlyPayments?.filter(p => monthlySaleIds.includes(p.sale_id)) || []

  // Get payments for pending sales
  const pendingSaleIds = pendingSales?.map(s => s.id) || []
  const { data: payments } = await supabase
    .from('payments')
    .select('sale_id, amount')
    .in('sale_id', pendingSaleIds.length > 0 ? pendingSaleIds : [''])

  // Calculate totals
  const totalSales = monthlySales?.reduce((acc, sale) => acc + Number(sale.total), 0) || 0
  
  // IMPORTANT: Commission is calculated from PAYMENTS received this month, not from sales
  const totalPaymentsThisMonth = userMonthlyPayments.reduce((acc, p) => acc + Number(p.amount), 0)
  const commission = totalPaymentsThisMonth * 0.05

  // Calculate payment status for each pending sale
  const salesWithPayments = pendingSales?.map(sale => {
    const salePayments = payments?.filter(p => p.sale_id === sale.id) || []
    const totalPaid = salePayments.reduce((acc, p) => acc + Number(p.amount), 0)
    const balance = Number(sale.total) - totalPaid
    const dueDate = new Date(sale.due_date)
    const isOverdue = isBefore(dueDate, today) && balance > 0
    const isDueSoon = !isOverdue && isBefore(dueDate, twoDaysFromNow) && isAfter(dueDate, today) && balance > 0
    
    return {
      ...sale,
      totalPaid,
      balance,
      isOverdue,
      isDueSoon
    }
  }) || []

  const overdueSales = salesWithPayments.filter(s => s.isOverdue)
  const dueSoonSales = salesWithPayments.filter(s => s.isDueSoon)
  const recentSales = monthlySales?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de {format(today, 'MMMM yyyy', { locale: es })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas del Mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {monthlySales?.length || 0} ventas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comisión (5%)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              ${commission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Basado en ${totalPaymentsThisMonth.toLocaleString('es-MX')} cobrado
            </p>
          </CardContent>
        </Card>

        <Card className={dueSoonSales.length > 0 ? 'border-amber-300 bg-amber-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos a Vencer
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{dueSoonSales.length}</div>
            <p className="text-xs text-muted-foreground">
              En los próximos 2 días
            </p>
          </CardContent>
        </Card>

        <Card className={overdueSales.length > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Vencidos
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueSales.length}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Ventas Recientes
            </CardTitle>
            <CardDescription>Últimas ventas del mes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay ventas este mes
              </p>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{(sale.doctors as { name: string } | null)?.name || 'Sin doctor'}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.invoice_number ? `#${sale.invoice_number} - ` : ''}{format(new Date(sale.date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sale.status === 'pagado' 
                          ? 'bg-green-100 text-green-700' 
                          : sale.status === 'parcialmente_pagado'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sale.status === 'parcialmente_pagado' ? 'parcial' : sale.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Pago
            </CardTitle>
            <CardDescription>Pagos que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueSales.length === 0 && dueSoonSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay alertas de pago
              </p>
            ) : (
              <div className="space-y-4">
                {overdueSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-3 last:border-0 bg-red-50 p-2 rounded-lg">
                    <div>
                      <p className="font-medium text-red-700">{(sale.doctors as { name: string } | null)?.name || 'Sin doctor'}</p>
                      <p className="text-sm text-red-600">
                        {sale.invoice_number ? `#${sale.invoice_number} - ` : ''}Vencido: {format(new Date(sale.due_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-700">
                        ${sale.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-xs text-red-600">pendiente</span>
                    </div>
                  </div>
                ))}
                {dueSoonSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-3 last:border-0 bg-amber-50 p-2 rounded-lg">
                    <div>
                      <p className="font-medium text-amber-700">{(sale.doctors as { name: string } | null)?.name || 'Sin doctor'}</p>
                      <p className="text-sm text-amber-600">
                        {sale.invoice_number ? `#${sale.invoice_number} - ` : ''}Vence: {format(new Date(sale.due_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-amber-700">
                        ${sale.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-xs text-amber-600">por cobrar</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
