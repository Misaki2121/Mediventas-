'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Search, User } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Doctor {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
  user_id: string
}

interface DoctorsListProps {
  initialDoctors: Doctor[]
}

export function DoctorsList({ initialDoctors }: DoctorsListProps) {
  const [doctors, setDoctors] = useState(initialDoctors)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' })
  const router = useRouter()

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(search.toLowerCase()) ||
    doctor.phone?.toLowerCase().includes(search.toLowerCase()) ||
    doctor.address?.toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '' })
    setEditingDoctor(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsOpen(true)
  }

  const openEditDialog = (doctor: Doctor) => {
    setFormData({
      name: doctor.name,
      phone: doctor.phone || '',
      address: doctor.address || '',
    })
    setEditingDoctor(doctor)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      if (editingDoctor) {
        const { data, error } = await supabase
          .from('doctors')
          .update({
            name: formData.name,
            phone: formData.phone || null,
            address: formData.address || null,
          })
          .eq('id', editingDoctor.id)
          .eq('user_id', user?.id)
          .select()
          .single()

        if (error) throw error
        setDoctors(doctors.map(d => d.id === editingDoctor.id ? data : d))
      } else {
        const { data, error } = await supabase
          .from('doctors')
          .insert({
            name: formData.name,
            phone: formData.phone || null,
            address: formData.address || null,
            user_id: user?.id,
          })
          .select()
          .single()

        if (error) throw error
        setDoctors([data, ...doctors])
      }

      setIsOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error saving doctor:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este doctor?')) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error
      setDoctors(doctors.filter(d => d.id !== id))
      router.refresh()
    } catch (error) {
      console.error('Error deleting doctor:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Lista de Doctores
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Doctor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDoctor ? 'Editar Doctor' : 'Nuevo Doctor'}
                </DialogTitle>
                <DialogDescription>
                  {editingDoctor ? 'Modifica los datos del doctor' : 'Ingresa los datos del nuevo doctor'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar doctores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No se encontraron doctores' : 'No hay doctores registrados'}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="hidden md:table-cell">Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell>{doctor.phone || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{doctor.address || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(doctor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doctor.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
