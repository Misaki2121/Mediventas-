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
import { Plus, Search, ShoppingCart, Trash2, Eye } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface SaleItem {
  id: string
  quantity: number
  price: number
  products: { name: string } | null
}

interface Sale {
  id: string
  doctor_id: string
  invoice_number: string
  date: string
  total: number
  payment_term: number
  due_date: string
  status: string
  created_at: string
  user_id: string
  doctors: { name: string } | null
  sale_items: SaleItem[]
}

interface Doctor {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: number
}

interface Payment {
  sale_id: string
  amount: number
}

interface SalesListProps {
  initialSales: Sale[]
  doctors: Doctor[]
  products: Product[]
  payments: Payment[]
}

interface CartItem {
  product_id: string
  name: string
  quantity: number
  price: number
}

export function SalesList({ initialSales, doctors, products, payments: initialPayments }: SalesListProps) {
  const [sales, setSales] = useState(initialSales)
  const [payments] = useState(initialPayments)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    doctor_id: '',
    invoice_number: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_term: '30',
  })
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('1')
  const router = useRouter()

  const filteredSales = sales.filter(sale =>
    sale.doctors?.name.toLowerCase().includes(search.toLowerCase()) ||
    sale.status.toLowerCase().includes(search.toLowerCase()) ||
    sale.invoice_number?.toLowerCase().includes(search.toLowerCase())
  )

  const getBalance = (saleId: string, total: number) => {
    const salePayments = payments.filter(p => p.sale_id === saleId)
    const totalPaid = salePayments.reduce((acc, p) => acc + Number(p.amount), 0)
    return total - totalPaid
  }

  const resetForm = () => {
    setFormData({
      doctor_id: '',
      invoice_number: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      payment_term: '30',
    })
    setCart([])
    setSelectedProduct('')
    setQuantity('1')
  }

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const existingItem = cart.find(item => item.product_id === selectedProduct)
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === selectedProduct
          ? { ...item, quantity: item.quantity + parseInt(quantity) }
          : item
      ))
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        quantity: parseInt(quantity),
        price: product.price,
      }])
    }

    setSelectedProduct('')
    setQuantity('1')
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }
    if (!formData.invoice_number.trim()) {
      toast.error('El número de factura es obligatorio')
      return
    }
    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const saleDate = new Date(formData.date)
      const dueDate = addDays(saleDate, parseInt(formData.payment_term))

      // Create sale with invoice_number
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          doctor_id: formData.doctor_id,
          invoice_number: formData.invoice_number.trim(),
          date: formData.date,
          total: cartTotal,
          payment_term: parseInt(formData.payment_term),
          due_date: format(dueDate, 'yyyy-MM-dd'),
          status: 'pendiente',
          user_id: user?.id,
        })
        .select(`
          *,
          doctors(name)
        `)
        .single()

      if (saleError) {
        if (saleError.code === '23505') {
          toast.error('Ya existe una venta con ese número de factura')
        } else {
          toast.error('Error al crear la venta')
        }
        throw saleError
      }

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Fetch the complete sale with items
      const { data: completeSale } = await supabase
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
        .eq('id', sale.id)
        .single()

      if (completeSale) {
        setSales([completeSale, ...sales])
      }

      setIsOpen(false)
      resetForm()
      toast.success(`Venta #${formData.invoice_number} registrada correctamente`)
      router.refresh()
    } catch (error) {
      console.error('Error creating sale:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Lista de Ventas
            </CardTitle>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Venta</DialogTitle>
                  <DialogDescription>
                    Registra una nueva venta
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Número de Factura *</Label>
                      <Input
                        type="text"
                        placeholder="Ej: F001-00123"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Doctor *</Label>
                      <Select
                        value={formData.doctor_id}
                        onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha *</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plazo de pago *</Label>
                      <Select
                        value={formData.payment_term}
                        onValueChange={(value) => setFormData({ ...formData, payment_term: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="60">60 días</SelectItem>
                          <SelectItem value="90">90 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Agregar Productos</h4>
                    <div className="flex gap-2 flex-wrap">
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger className="flex-1 min-w-[200px]">
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ${Number(product.price).toLocaleString('es-MX')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-20"
                        placeholder="Cant."
                      />
                      <Button type="button" onClick={addToCart} disabled={!selectedProduct}>
                        Agregar
                      </Button>
                    </div>

                    {cart.length > 0 && (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-center">Cant.</TableHead>
                              <TableHead className="text-right">Precio</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cart.map((item) => (
                              <TableRow key={item.product_id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  ${Number(item.price).toLocaleString('es-MX')}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${(item.price * item.quantity).toLocaleString('es-MX')}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFromCart(item.product_id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="text-right text-lg font-bold">
                      Total: ${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading || cart.length === 0 || !formData.doctor_id || !formData.invoice_number.trim()} 
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isLoading ? 'Guardando...' : 'Guardar Venta'}
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
                placeholder="Buscar por doctor, factura o estado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No se encontraron ventas' : 'No hay ventas registradas'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => {
                    const balance = getBalance(sale.id, Number(sale.total))
                    const isOverdue = new Date(sale.due_date) < new Date() && balance > 0
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm">
                          {sale.invoice_number || '-'}
                        </TableCell>
                        <TableCell className="font-medium">{sale.doctors?.name}</TableCell>
                        <TableCell>{format(new Date(sale.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={`text-right ${balance > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}`}>
                          ${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(sale.due_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            sale.status === 'pagado'
                              ? 'bg-green-100 text-green-700'
                              : sale.status === 'parcialmente_pagado'
                              ? 'bg-blue-100 text-blue-700'
                              : isOverdue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isOverdue && sale.status !== 'pagado' ? 'vencido' : sale.status === 'parcialmente_pagado' ? 'parcial' : sale.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingSale(sale)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Sale Detail Dialog */}
      <Dialog open={!!viewingSale} onOpenChange={() => setViewingSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Venta {viewingSale?.invoice_number ? `#${viewingSale.invoice_number}` : ''}</DialogTitle>
            <DialogDescription>
              {viewingSale?.doctors?.name} - {viewingSale && format(new Date(viewingSale.date), 'dd MMMM yyyy', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-4">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingSale.sale_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          ${Number(item.price).toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell className="text-right">
                          ${(Number(item.price) * item.quantity).toLocaleString('es-MX')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>Total:</span>
                <span>${Number(viewingSale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance pendiente:</span>
                <span className={getBalance(viewingSale.id, Number(viewingSale.total)) > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                  ${getBalance(viewingSale.id, Number(viewingSale.total)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimiento:</span>
                <span>{format(new Date(viewingSale.due_date), 'dd MMMM yyyy', { locale: es })}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
