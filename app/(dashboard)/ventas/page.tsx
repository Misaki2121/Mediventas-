import { createClient } from '@/lib/supabase/server'
import { SalesList } from '@/components/sales-list'

export default async function VentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sales } = await supabase
    .from('sales')
    .select(`
      *,
      doctors(name),
      sale_items(
        id,
        quantity,
        price,
        products(name)
      )
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, name')
    .eq('user_id', user?.id)
    .order('name')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('user_id', user?.id)
    .order('name')

  // Get payments for calculating balances
  const saleIds = sales?.map(s => s.id) || []
  const { data: payments } = await supabase
    .from('payments')
    .select('sale_id, amount')
    .in('sale_id', saleIds.length > 0 ? saleIds : [''])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
        <p className="text-muted-foreground">
          Registra y gestiona tus ventas
        </p>
      </div>
      <SalesList 
        initialSales={sales || []} 
        doctors={doctors || []} 
        products={products || []}
        payments={payments || []}
      />
    </div>
  )
}
