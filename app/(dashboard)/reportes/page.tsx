import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BarChart3, DollarSign, TrendingUp, Wallet, CreditCard } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()

  // Get sales from last 6 months
  const sixMonthsAgo = subMonths(today, 5)
  const startDate = startOfMonth(sixMonthsAgo)

  const { data: sales } = await supabase
    .from('sales')
    .select('id, total, date, status, due_date, invoice_number')
    .eq('user_id', user?.id)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .order('date', { ascending: false })

  // Get ALL payments to calculate real commissions
  const { data: allPayments } = await supabase
    .from('payments')
    .select('sale_id, amount, payment_date')

  // Filter payments by user's sales
  const userSaleIds = sales?.map(s => s.id) || []
  const payments = allPayments?.filter(p => userSaleIds.includes(p.sale_id)) || []

  // Calculate monthly stats - commission is based on PAYMENTS received, not sales
  const monthlyStats = []
  for (let i = 0; i < 6; i++) {
    const monthDate = subMonths(today, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)

    // Sales made this month
    const monthSales = sales?.filter(sale => {
      const saleDate = new Date(sale.date)
      return saleDate >= monthStart && saleDate <= monthEnd
    }) || []

    const totalSales = monthSales.reduce((acc, sale) => acc + Number(sale.total), 0)

    // Payments received this month (this is what commission is based on)
    const monthPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.payment_date)
      return paymentDate >= monthStart && paymentDate <= monthEnd
    })

    const totalPaymentsReceived = monthPayments.reduce((acc, p) => acc + Number(p.amount), 0)
    const commission = totalPaymentsReceived * 0.05

    monthlyStats.push({
      month: format(monthDate, 'MMMM yyyy', { locale: es }),
      salesCount: monthSales.length,
      totalSales,
      totalPaymentsReceived,
      commission,
    })
  }

  // Calculate pending balance per sale
  const salesWithBalance = sales?.map(sale => {
    const salePayments = payments.filter(p => p.sale_id === sale.id)
    const totalPaid = salePayments.reduce((acc, p) => acc + Number(p.amount), 0)
    const balance = Number(sale.total) - totalPaid
    return {
      ...sale,
      totalPaid,
      balance,
    }
  }).filter(sale => sale.balance > 0) || []

  // Calculate totals
  const totalPendingBalance = salesWithBalance.reduce((acc, sale) => acc + sale.balance, 0)
  const currentMonthStats = monthlyStats[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-muted-foreground">
          Análisis de ventas y comisiones basadas en cobros
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas Este Mes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonthStats.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonthStats.salesCount} ventas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cobros Este Mes
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${currentMonthStats.totalPaymentsReceived.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total cobrado este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comisión Este Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              ${currentMonthStats.commission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              5% del total cobrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance Pendiente
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${totalPendingBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {salesWithBalance.length} ventas pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas y Comisiones por Mes
          </CardTitle>
          <CardDescription>
            Resumen de los últimos 6 meses - Comisión calculada sobre cobros reales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-center">Ventas</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Cobros Recibidos</TableHead>
                  <TableHead className="text-right">Comisión (5%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyStats.map((stats, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium capitalize">{stats.month}</TableCell>
                    <TableCell className="text-center">{stats.salesCount}</TableCell>
                    <TableCell className="text-right">
                      ${stats.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ${stats.totalPaymentsReceived.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-teal-600 font-medium">
                      ${stats.commission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendido (6 meses)</p>
                <p className="text-xl font-bold">
                  ${monthlyStats.reduce((acc, s) => acc + s.totalSales, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-xl font-bold text-green-600">
                  ${monthlyStats.reduce((acc, s) => acc + s.totalPaymentsReceived, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comisión Total</p>
                <p className="text-xl font-bold text-teal-600">
                  ${monthlyStats.reduce((acc, s) => acc + s.commission, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio Mensual</p>
                <p className="text-xl font-bold">
                  ${(monthlyStats.reduce((acc, s) => acc + s.totalSales, 0) / 6).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Balance Pendiente por Venta
          </CardTitle>
          <CardDescription>Ventas con pagos pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          {salesWithBalance.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay ventas con balance pendiente
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesWithBalance.map((sale) => {
                    const isOverdue = new Date(sale.due_date) < new Date()
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm">{sale.invoice_number || '-'}</TableCell>
                        <TableCell>{format(new Date(sale.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          ${sale.totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 font-medium">
                          ${sale.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={isOverdue ? 'text-red-600' : ''}>
                          {format(new Date(sale.due_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            isOverdue
                              ? 'bg-red-100 text-red-700'
                              : sale.totalPaid > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isOverdue ? 'Vencido' : sale.totalPaid > 0 ? 'Parcial' : 'Pendiente'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
