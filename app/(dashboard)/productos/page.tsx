import { createClient } from '@/lib/supabase/server'
import { ProductsList } from '@/components/products-list'

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
        <p className="text-muted-foreground">
          Gestiona tu catálogo de productos médicos
        </p>
      </div>
      <ProductsList initialProducts={products || []} />
    </div>
  )
}
