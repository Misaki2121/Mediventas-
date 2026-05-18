import { createClient } from '@/lib/supabase/server'
import { DoctorsList } from '@/components/doctors-list'

export default async function DoctoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: doctors } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Doctores</h1>
        <p className="text-muted-foreground">
          Gestiona tu cartera de doctores
        </p>
      </div>
      <DoctorsList initialDoctors={doctors || []} />
    </div>
  )
}
