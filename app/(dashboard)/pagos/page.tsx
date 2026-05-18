import { createClient } from '@/lib/supabase/server'
import { PaymentsList } from '@/components/payments-list'

export default async function PagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all sales with pending balance
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      date,
      due_date,
      status,
      doctors(name)
    `)
    .eq('user_id', user?.id)
    .order('due_date', { ascending: true })

  // Get all payments
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      sales(
        id,
        total,
        doctors(name)
      )
    `)
    .order('payment_date', { ascending: false })

  // Filter payments by user's sales
  const userSaleIds = sales?.map(s => s.id) || []
  const userPayments = payments?.filter(p => userSaleIds.includes(p.sale_id)) || []

  // Transform sales data to match expected type
  const transformedSales = (sales || []).map(sale => ({
    ...sale,
    doctors: Array.isArray(sale.doctors) ? sale.doctors[0] || null : sale.doctors
  }))

  // Transform payments data to match expected type
  const transformedPayments = userPayments.map(payment => ({
    ...payment,
    sales: payment.sales ? {
      ...payment.sales,
      doctors: Array.isArray(payment.sales.doctors) ? payment.sales.doctors[0] || null : payment.sales.doctors
    } : null
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
        <p className="text-muted-foreground">
          Registra pagos de tus ventas
        </p>
      </div>
      <PaymentsList 
        sales={transformedSales} 
        initialPayments={transformedPayments}
      />
    </div>
  )
}
