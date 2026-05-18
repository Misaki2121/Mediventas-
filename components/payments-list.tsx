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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, CreditCard, Loader2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

interface Sale {
  id: string
  total: number
  date: string
  due_date: string
  status: string
  invoice_number: string | null
  doctors: { name: string } | null
}

interface Payment {
  id: string
  sale_id: string
  amount: number
  payment_date: string
  created_at: string
  sales: {
    id: string
    total: number
    invoice_number: string | null
    doctors: { name: string } | null
  } | null
}

interface PaymentsListProps {
  sales: Sale[]
  initialPayments: Payment[]
}

export function PaymentsList({ sales, initialPayments }: PaymentsListProps) {
  const [payments, setPayments] = useState(initialPayments)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    sale_id: '',
    amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
  })
  const router = useRouter()
  const { toast } = useToast()

  // Calculate balance for each sale
  const salesWithBalance = useMemo(() => {
    return sales.map(sale => {
      const salePayments = payments.filter(p => p.sale_id === sale.id)
      const totalPaid = salePayments.reduce((acc, p) => acc + Number(p.amount), 0)
      const balance = Number(sale.total) - totalPaid
      return {
        ...sale,
        totalPaid,
        balance,
      }
    }).filter(sale => sale.balance > 0)
  }, [sales, payments])

  const filteredPayments = payments.filter(payment =>
    payment.sales?.doctors?.name.toLowerCase().includes(search.toLowerCase()) ||
    (payment.sales?.invoice_number && payment.sales.invoice_number.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedSale = salesWithBalance.find(s => s.id === formData.sale_id)

  const resetForm = () => {
    setFormData({
      sale_id: '',
      amount: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return // Prevent double submit
    
    setIsLoading(true)

    const supabase = createClient()

    try {
      const amount = parseFloat(formData.amount)
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "El monto debe ser mayor a 0",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      // Validate amount doesn't exceed balance
      if (selectedSale && amount > selectedSale.balance) {
        toast({
          title: "Error",
          description: "El monto no puede exceder el balance pendiente",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Insert payment
      const { data, error } = await supabase
        .from('payments')
        .insert({
          sale_id: formData.sale_id,
          amount: amount,
          payment_date: formData.payment_date,
        })
        .select(`
          *,
          sales(
            id,
            total,
            invoice_number,
            doctors(name)
          )
        `)
        .single()

      if (error) throw error

      // Calculate new balance and update sale status
      if (selectedSale) {
        const newTotalPaid = selectedSale.totalPaid + amount
        const newBalance = selectedSale.balance - amount
        
        let newStatus = 'pendiente'
        if (newBalance <= 0) {
          newStatus = 'pagado'
        } else if (newTotalPaid > 0) {
          newStatus = 'parcialmente_pagado'
        }

        const { error: updateError } = await supabase
          .from('sales')
          .update({ status: newStatus })
          .eq('id', formData.sale_id)

        if (updateError) {
          console.error('Error updating sale status:', updateError)
        }
      }

      // Update local state immediately
      setPayments(prevPayments => [data, ...prevPayments])

      toast({
        title: "Pago registrado",
        description: `Pago de $${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} registrado exitosamente`,
      })

      setIsOpen(false)
      resetForm()
      
      // Refresh server data
      router.refresh()
    } catch (error) {
      console.error('Error creating payment:', error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago. Intenta de nuevo.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending Balances Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas con Balance Pendiente</CardTitle>
        </CardHeader>
        <CardContent>
          {salesWithBalance.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay ventas con balance pendiente
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Fecha Venta</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Vencimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesWithBalance.map((sale) => {
                    const isOverdue = new Date(sale.due_date) < new Date()
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium text-teal-700">
                          {sale.invoice_number || 'Sin factura'}
                        </TableCell>
                        <TableCell>{sale.doctors?.name}</TableCell>
                        <TableCell>{format(new Date(sale.date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          ${sale.totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 font-medium">
                          ${sale.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(sale.due_date + 'T00:00:00'), 'dd/MM/yyyy')}
                          {isOverdue && ' (Vencido)'}
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

      {/* Payments List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm} 
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={salesWithBalance.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Pago
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Pago</DialogTitle>
                  <DialogDescription>
                    Registra un pago para una venta pendiente
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Venta *</Label>
                    <Select
                      value={formData.sale_id}
                      onValueChange={(value) => setFormData({ ...formData, sale_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar venta" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesWithBalance.map((sale) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {sale.invoice_number || 'Sin factura'} - {sale.doctors?.name} - ${sale.balance.toLocaleString('es-MX')} pendiente
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSale && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total venta:</span>
                        <span>${Number(selectedSale.total).toLocaleString('es-MX')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ya pagado:</span>
                        <span className="text-green-600">${selectedSale.totalPaid.toLocaleString('es-MX')}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Balance pendiente:</span>
                        <span className="text-amber-600">${selectedSale.balance.toLocaleString('es-MX')}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Monto *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedSale?.balance}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Pago *</Label>
                    <Input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading || !formData.sale_id || !formData.amount} 
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Registrar Pago'
                      )}
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
                placeholder="Buscar pagos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No se encontraron pagos' : 'No hay pagos registrados'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium text-teal-700">
                        {payment.sales?.invoice_number || 'Sin factura'}
                      </TableCell>
                      <TableCell>
                        {payment.sales?.doctors?.name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date + 'T00:00:00'), 'dd MMMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
