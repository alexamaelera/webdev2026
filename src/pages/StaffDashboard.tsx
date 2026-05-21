import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ClipboardList,
  Store,
  LogOut,
  Clock,
  Bike,
  CheckCircle,
  XCircle,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  AlarmClock,
  Info,
  Save,
  CheckCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/authContext'

type OrderStatus = 'pending' | 'going' | 'ongoing' | 'delivered' | 'cancelled'
type Section = 'orders' | 'store'

interface OrderItem {
  name: string
  quantity: number
}

interface Order {
  id: number
  customer: string
  items: OrderItem[]
  total: number
  date: string
  status: OrderStatus
}

interface StoreInfo {
  name: string
  email: string
  phone: string
  address: string
  hours: string
  description: string
}

interface StaffMember {
  id: number
  name: string
  email: string
  phone?: string
  salary?: number
  position?: string
  hire_date?: string
}

const DEFAULT_ORDERS: Order[] = [
  { id: 1001, customer: 'Maria Santos', items: [{ name: 'Cafe Latte', quantity: 2 }, { name: 'Croissant', quantity: 1 }], total: 14.5, date: '2025-05-21T09:30:00', status: 'pending' },
  { id: 1002, customer: 'Juan dela Cruz', items: [{ name: 'Iced Americano', quantity: 1 }, { name: 'Blueberry Muffin', quantity: 2 }], total: 11, date: '2025-05-21T10:05:00', status: 'ongoing' },
  { id: 1003, customer: 'Ana Reyes', items: [{ name: 'Matcha Latte', quantity: 3 }], total: 18.75, date: '2025-05-21T10:45:00', status: 'delivered' },
  { id: 1004, customer: 'Carlos Mendoza', items: [{ name: 'Espresso', quantity: 2 }], total: 8, date: '2025-05-21T11:00:00', status: 'cancelled' },
  { id: 1005, customer: 'Guest', items: [{ name: 'Caramel Macchiato', quantity: 1 }, { name: 'Waffle', quantity: 1 }], total: 13.25, date: '2025-05-21T11:20:00', status: 'going' }
]

const DEFAULT_STORE: StoreInfo = {
  name: 'Lex & Nitch Cafe',
  email: 'hello@lexnitch.cafe',
  phone: '+63 917 123 4567',
  address: '42 Brew Street, Quezon City, Metro Manila',
  hours: 'Mon-Sun: 7:00 AM - 10:00 PM',
  description:
    'A cozy neighborhood cafe serving specialty coffee, artisan pastries, and warm vibes. Your third place - between home and everywhere else.'
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; color: string; dot: string }> = {
  pending: { label: 'Pending', bg: '#FFF3CD', color: '#856404', dot: '#FFC107' },
  going: { label: 'Going', bg: '#FFE5CC', color: '#7B3F00', dot: '#FF9800' },
  ongoing: { label: 'Ongoing', bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6' },
  delivered: { label: 'Delivered', bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeOrderStatus(status: unknown): OrderStatus {
  const value = String(status || '').toLowerCase()
  if (value === 'pending' || value === 'going' || value === 'ongoing' || value === 'delivered' || value === 'cancelled') {
    return value
  }
  return 'pending'
}

function loadOrders(): Order[] {
  const cached = readJson<any[]>('orders_v1', [])
  if (cached.length > 0) {
    const users = readJson<any[]>('users_v1', [])
    return cached.map((order) => {
      const id = Number(order.id ?? order.order_id)
      let customer = ''
      if (order.guest_name) customer = String(order.guest_name)
      else if (order.customer) customer = String(order.customer)
      else if (order.user_id != null) {
        const found = users.find((u) => Number(u.id) === Number(order.user_id))
        customer = found ? String(found.username) : String(order.user_id)
      } else {
        customer = 'Guest'
      }

      return {
        id,
        customer,
        items: Array.isArray(order.items) ? order.items : [],
        total: Number(order.total || 0),
        date: String(order.created_at || order.date || new Date().toISOString()),
        status: normalizeOrderStatus(order.status)
      }
    })
  }
  return DEFAULT_ORDERS
}

function loadStore(): StoreInfo {
  return readJson<StoreInfo>('store_v1', DEFAULT_STORE)
}

function loadStaffMembers(): StaffMember[] {
  const cached = readJson<StaffMember[]>('staff_v1', [])
  return Array.isArray(cached) ? cached : []
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatItems(items: OrderItem[]): string {
  return items.map((item) => `${item.name} x${item.quantity}`).join(', ')
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: '0.76rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: cfg.bg,
        color: cfg.color
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: cfg.dot,
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      {cfg.label}
    </span>
  )
}

function SummaryCard({
  label,
  value,
  bg,
  color,
  icon
}: {
  label: string
  value: string | number
  bg: string
  color: string
  icon: ReactNode
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        background: bg,
        color,
        borderRadius: 14,
        padding: '18px 22px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}
    >
      <span style={{ opacity: 0.85 }}>{icon}</span>
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          opacity: 0.75,
          textTransform: 'uppercase',
          letterSpacing: '0.07em'
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</span>
    </div>
  )
}

function OrdersSection({
  orders,
  onUpdateStatus,
  salary
}: {
  orders: Order[]
  onUpdateStatus: (id: number, status: OrderStatus) => void
  salary: number
}) {
  const [toast, setToast] = useState<string | null>(null)

  function handleChange(id: number, status: OrderStatus) {
    onUpdateStatus(id, status)
    setToast('Order status updated successfully.')
    setTimeout(() => setToast(null), 2500)
  }

  const pending = orders.filter((order) => order.status === 'pending').length
  const ongoing = orders.filter((order) => order.status === 'going' || order.status === 'ongoing').length
  const delivered = orders.filter((order) => order.status === 'delivered').length
  const cancelled = orders.filter((order) => order.status === 'cancelled').length
  const totalSales = orders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + order.total, 0)

  return (
    <div>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            background: '#2C3A10',
            color: '#C0E89C',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            fontWeight: 600,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'slideIn 0.3s ease'
          }}
        >
          <CheckCheck size={16} />
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <SummaryCard label="Pending" value={pending} bg="#FFF8E1" color="#7B5800" icon={<Clock size={20} />} />
        <SummaryCard label="Ongoing" value={ongoing} bg="#E3F2FD" color="#1565C0" icon={<Bike size={20} />} />
        <SummaryCard label="Delivered" value={delivered} bg="#E8F5E9" color="#2E7D32" icon={<CheckCircle size={20} />} />
        <SummaryCard label="Cancelled" value={cancelled} bg="#FFEBEE" color="#B71C1C" icon={<XCircle size={20} />} />
        <SummaryCard label="Total Sales" value={`P${totalSales.toFixed(2)}`} bg="#2C3A10" color="#C0E89C" icon={<DollarSign size={20} />} />
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F0F0F0' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#2C3A10' }}>Order Queue</h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#999' }}>{orders.length} total orders</p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Order ID', 'Customer', 'Items', 'Total', 'Date', 'Status', 'Action'].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: '11px 16px',
                      textAlign: 'left',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#999',
                      borderBottom: '1px solid #EBEBEB'
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#CCC' }}>
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: '1px solid #F5F5F5',
                      background: index % 2 === 0 ? 'white' : '#FDFCFA',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(event) => (event.currentTarget.style.background = '#F9F7F3')}
                    onMouseLeave={(event) => (event.currentTarget.style.background = index % 2 === 0 ? 'white' : '#FDFCFA')}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 800, color: '#4A5F1F', fontSize: '0.85rem' }}>#{order.id}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: '#333' }}>{order.customer}</td>
                    <td style={{ padding: '13px 16px', color: '#777', maxWidth: 200 }}>
                      <span style={{ fontSize: '0.81rem' }}>{formatItems(order.items)}</span>
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#2C3A10', whiteSpace: 'nowrap' }}>P{order.total.toFixed(2)}</td>
                    <td style={{ padding: '13px 16px', color: '#999', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(order.date)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <select
                        value={order.status}
                        onChange={(event) => handleChange(order.id, event.target.value as OrderStatus)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 7,
                          border: '1.5px solid #D6DCCA',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: '#FAFAFA',
                          color: '#2C3A10',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="going">Going</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StoreSection({ store, onSave }: { store: StoreInfo; onSave: (info: StoreInfo) => void }) {
  const [form, setForm] = useState<StoreInfo>(store)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  useEffect(() => {
    setForm(store)
  }, [store])

  function handleChange(field: keyof StoreInfo, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function validate(): string[] {
    const nextErrors: string[] = []
    if (!form.name.trim()) nextErrors.push('Store name is required.')
    if (!form.email.trim()) nextErrors.push('Email is required.')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.push('Invalid email format.')
    if (form.phone && !/^\+?[0-9\-\s]{7,20}$/.test(form.phone)) nextErrors.push('Invalid phone number.')
    if (!form.address.trim()) nextErrors.push('Address is required.')
    if (!form.hours.trim()) nextErrors.push('Business hours are required.')
    if (!form.description.trim()) nextErrors.push('Description is required.')
    return nextErrors
  }

  function handleSubmit() {
    const nextErrors = validate()
    if (nextErrors.length) {
      setErrors(nextErrors)
      setSuccess(null)
      return
    }

    setErrors([])
    onSave(form)
    setSuccess('Store information updated successfully.')
    setTimeout(() => setSuccess(null), 3000)
  }

  const inputStyle = (field: string): CSSProperties => ({
    width: '100%',
    padding: '10px 13px',
    border: `1.5px solid ${focused === field ? '#4A5F1F' : '#E0E0E0'}`,
    borderRadius: 8,
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    color: '#2C3A10',
    background: '#FAFAF8',
    boxShadow: focused === field ? '0 0 0 3px rgba(74,95,31,0.1)' : 'none',
    transition: 'all 0.2s'
  })

  const fields: { key: keyof StoreInfo; label: string; type?: string; multi?: boolean }[] = [
    { key: 'name', label: 'Store Name' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'hours', label: 'Business Hours' },
    { key: 'description', label: 'Description', multi: true }
  ]

  const previewItems: { icon: ReactNode; label: string; key: keyof StoreInfo }[] = [
    { icon: <MapPin size={14} />, label: 'Address', key: 'address' },
    { icon: <Phone size={14} />, label: 'Phone', key: 'phone' },
    { icon: <Mail size={14} />, label: 'Email', key: 'email' },
    { icon: <AlarmClock size={14} />, label: 'Hours', key: 'hours' },
    { icon: <Info size={14} />, label: 'About', key: 'description' }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }} className="store-grid">
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 2px 14px rgba(0,0,0,0.06)'
        }}
      >
        <h3 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '1rem', color: '#2C3A10', borderBottom: '2px solid #EEF2E8', paddingBottom: 12 }}>
          Store Details
        </h3>

        {errors.length > 0 && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontSize: '0.83rem', borderLeft: '4px solid #EF4444' }}>
            {errors.map((error, index) => (
              <div key={index}>- {error}</div>
            ))}
          </div>
        )}

        {success && (
          <div style={{ background: '#DCFCE7', color: '#166534', padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontSize: '0.83rem', fontWeight: 600, borderLeft: '4px solid #22C55E', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCheck size={15} />
            {success}
          </div>
        )}

        {fields.map(({ key, label, type, multi }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </label>
            {multi ? (
              <textarea
                value={form[key]}
                rows={4}
                onChange={(event) => handleChange(key, event.target.value)}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
                style={{ ...inputStyle(key), resize: 'vertical' }}
              />
            ) : (
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={(event) => handleChange(key, event.target.value)}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
                style={inputStyle(key)}
              />
            )}
          </div>
        ))}

        <button
          onClick={handleSubmit}
          style={{ marginTop: 8, padding: '11px 24px', background: '#2C3A10', color: '#C0E89C', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity 0.2s' }}
          onMouseEnter={(event) => (event.currentTarget.style.opacity = '0.88')}
          onMouseLeave={(event) => (event.currentTarget.style.opacity = '1')}
        >
          <Save size={15} />
          Save Store Info
        </button>
      </div>

      <div>
        <h3 style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '1rem', color: '#888' }}>Live Preview</h3>
        <div style={{ background: '#1E2A0A', borderRadius: 14, padding: 28, color: '#E8F4DA' }}>
          <div style={{ borderBottom: '1px solid rgba(192,232,156,0.2)', paddingBottom: 16, marginBottom: 20 }}>
            <h4 style={{ margin: 0, fontSize: '1.3rem', color: '#C0E89C', fontWeight: 800 }}>{form.name || 'Your Cafe Name'}</h4>
          </div>

          {previewItems.map(({ icon, label, key }) => (
            <div key={key} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <span style={{ color: 'rgba(192,232,156,0.6)', flexShrink: 0, marginTop: 2 }}>{icon}</span>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(192,232,156,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.86rem', color: '#E8F4DA', lineHeight: 1.5 }}>
                  {form[key] || <span style={{ opacity: 0.35 }}>Not set</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function StaffDashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<Section>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [store, setStore] = useState<StoreInfo>(DEFAULT_STORE)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'staff' && user.role !== 'admin') {
      navigate('/')
      return
    }

    const nextOrders = loadOrders()
    const nextStore = loadStore()
    const nextStaffMembers = loadStaffMembers()
    setOrders(nextOrders)
    setStore(nextStore)
    setStaffMembers(nextStaffMembers)
    setLoading(false)
  }, [authLoading, navigate, user])

  // Try to fetch orders from serverless API and update state (fallback to localStorage remains)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/orders')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted || !Array.isArray(data)) return
        const users = readJson<any[]>('users_v1', [])
        const mapped: Order[] = data.map((order) => {
          const id = Number(order.order_id ?? order.id)
          let customer = ''
          if (order.guest_name) customer = String(order.guest_name)
          else if (order.customer) customer = String(order.customer)
          else if (order.user_id != null) {
            const found = users.find((u) => Number(u.id) === Number(order.user_id))
            customer = found ? String(found.username) : String(order.user_id)
          } else {
            customer = 'Guest'
          }

          return {
            id,
            customer,
            items: Array.isArray(order.items) ? order.items : [],
            total: Number(order.total || 0),
            date: String(order.created_at || order.date || new Date().toISOString()),
            status: normalizeOrderStatus(order.status)
          }
        })
        setOrders(mapped)
      } catch (err) {
        console.warn('Failed to fetch /api/orders:', err)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const username = useMemo(() => user?.username || 'staff_user', [user])
  const staffRecord = useMemo(() => {
    const targetUsername = String(user?.username || '').toLowerCase()
    const targetEmail = String(user?.email || '').toLowerCase()

    return staffMembers.find((member) => {
      const memberName = String(member.name || '').toLowerCase()
      const memberEmail = String(member.email || '').toLowerCase()
      const derivedUsername = memberName.replace(/\s+/g, '_')

      return memberEmail === targetEmail || derivedUsername === targetUsername || memberName === targetUsername
    })
  }, [staffMembers, user?.email, user?.username])
  const staffSalary = staffRecord?.salary ?? 0

  function handleUpdateStatus(id: number, status: OrderStatus) {
    setOrders((current) => {
      const updated = current.map((order) => (order.id === id ? { ...order, status } : order))
      writeJson('orders_v1', updated)
      return updated
    })
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const navItems: { id: Section; label: string; icon: ReactNode }[] = [
    { id: 'orders', label: 'Orders', icon: <ClipboardList size={17} /> },
    { id: 'store', label: 'Store Info', icon: <Store size={17} /> }
  ]

  const sectionLabel = activeSection === 'orders' ? 'Order Management' : 'Store Settings'

  if (authLoading || loading) {
    return <div style={{ padding: 20 }}>Loading...</div>
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        background: '#F4F1EC'
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-content { animation: fadeUp 0.3s ease; }
        select:focus { outline: none; }
        @media (max-width: 900px) {
          .main-wrapper { margin-left: 0 !important; }
          .store-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .summary-cards { flex-direction: column; }
          .summary-cards > div { min-width: unset !important; }
        }
      `}</style>

      <aside
        style={{
          width: 240,
          background: '#1E2A0A',
          color: '#E8F4DA',
          padding: '30px 18px',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          boxShadow: '3px 0 20px rgba(0,0,0,0.18)'
        }}
      >
        <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(192,232,156,0.15)', paddingBottom: 22 }}>
          <h2 style={{ margin: '0 0 3px', fontSize: '1.1rem', fontWeight: 800, color: '#C0E89C', lineHeight: 1.3 }}>Lex & Nitch</h2>
          <p style={{ margin: 0, fontSize: '0.68rem', color: 'rgba(192,232,156,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Staff Portal
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '10px 12px', background: 'rgba(192,232,156,0.07)', borderRadius: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4A5F1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: '#C0E89C', flexShrink: 0 }}>
            {username[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#E8F4DA' }}>{username}</div>
            <div style={{ fontSize: '0.67rem', color: 'rgba(192,232,156,0.4)', fontWeight: 600 }}>Staff Member</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map(({ id, label, icon }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 13px',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 9,
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  textAlign: 'left',
                  transition: 'all 0.18s',
                  background: active ? 'rgba(192,232,156,0.18)' : 'transparent',
                  color: active ? '#C0E89C' : 'rgba(232,244,218,0.55)',
                  borderLeft: active ? '3px solid #C0E89C' : '3px solid transparent'
                }}
              >
                {icon}
                {label}
              </button>
            )
          })}
        </nav>

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '10px 13px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 9,
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '0.88rem',
            color: '#FF8A80',
            background: 'transparent',
            textAlign: 'left',
            marginTop: 12,
            transition: 'background 0.18s',
            borderLeft: '3px solid transparent'
          }}
          onClick={handleLogout}
          onMouseEnter={(event) => (event.currentTarget.style.background = 'rgba(255,107,107,0.1)')}
          onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <div
        className="main-wrapper"
        style={{
          flex: 1,
          marginLeft: 240,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >
        <header
          style={{
            background: 'white',
            borderBottom: '1px solid #EAEAE6',
            padding: '0 28px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2C3A10' }}>{sectionLabel}</h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#BBB', fontWeight: 500 }}>Lex & Nitch Cafe - Staff Dashboard</p>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A5F1F', background: '#EEF2E8', padding: '6px 14px', borderRadius: 20 }}>
            Welcome, {username}
          </div>
        </header>

        <main className="page-content" key={activeSection} style={{ padding: 28, flex: 1 }}>
          {activeSection === 'orders' ? <OrdersSection orders={orders} onUpdateStatus={handleUpdateStatus} salary={staffSalary} /> : <StoreSection store={store} onSave={(info) => { setStore(info); writeJson('store_v1', info) }} />}
        </main>
      </div>
    </div>
  )
}
