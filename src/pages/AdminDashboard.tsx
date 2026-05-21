import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Product = { id: number; name: string; category: string; price: number; image: string }
type Staff = { id: number; name: string; username?: string; position?: string; email: string; phone?: string; salary?: number; hire_date?: string }
type AppUser = { id: number; username: string; password?: string; role?: string; email?: string }
type DeletedStaff = { id?: number; username?: string; email?: string }
type Order = { order_id: number; user_id?: number; created_at?: string; total: number; items: any[]; status: string; guest_name?: string }
type StoreInfo = { name: string; email: string; phone: string; address: string; hours: string; description: string }

const DEFAULT_STORE: StoreInfo = {
  name: 'Lex & Nitch Cafe',
  email: 'hello@lexnitchcafe.com',
  phone: '+63 912 345 6789',
  address: '123 Coffee Lane, Brew City',
  hours: '6:00 AM - 10:00 PM',
  description: 'A whimsical cafe experience with matcha and nature vibes'
}

const productCategoryLabels: Record<string, string> = {
  coffee: '☕ Coffee',
  cookies: '🍪 Cookies',
  pastries: '🥐 Pastries',
  desserts: '🍰 Desserts'
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getInitialProducts(): Product[] {
  const cached = readJson<Product[]>('products_v1', [])
  return cached.length > 0 ? cached : []
}

function getInitialStaff(): Staff[] {
  const cached = readJson<Staff[]>('staff_v1', [])
  return cached.length > 0 ? cached : []
}

function getInitialOrders(): Order[] {
  return readJson<Order[]>('orders_v1', [])
}

function getInitialStore(): StoreInfo {
  return readJson<StoreInfo>('store_v1', DEFAULT_STORE)
}

function getInitialUsers(): AppUser[] {
  const cached = readJson<AppUser[]>('users_v1', [])
  return Array.isArray(cached) ? cached : []
}

function getDeletedStaffKeys(): DeletedStaff[] {
  return readJson<DeletedStaff[]>('deleted_staff_v1', [])
}

// Fetch helper with timeout to avoid hanging requests during dev server issues
async function fetchJsonWithTimeout(url: string, timeout = 7000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(id)
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(id)
  }
}

async function loadSeedProducts(): Promise<Product[]> {
  try {
    const data = await fetchJsonWithTimeout('/data/products.json')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function normalizeImagePath(img?: string) {
  if (!img) return ''
  const s = String(img).replace(/\\\\/g, '/').replace(/\\/g, '/')
  // if already a URL or absolute path, keep
  if (s.startsWith('http') || s.startsWith('/')) return s
  // if it looks like an image filename, ensure leading slash
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(s)) return '/' + s
  // otherwise return as-is (likely emoji)
  return s
}

async function loadSeedStaff(): Promise<Staff[]> {
  try {
    const data = await fetchJsonWithTimeout('/data/staff.json')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function loadSeedUsers(): Promise<AppUser[]> {
  try {
    const data = await fetchJsonWithTimeout('/data/users.json')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function mergeStaffRecords(primary: Staff[], secondary: Staff[]) {
  const merged = new Map<string, Staff>()

  primary.forEach((member) => {
    const key = (member.email || member.username || member.name || String(member.id)).toLowerCase()
    if (!key) return
    merged.set(key, member)
  })

  secondary.forEach((member) => {
    const key = (member.email || member.username || member.name || String(member.id)).toLowerCase()
    if (!key) return
    const existing = merged.get(key)
    merged.set(key, existing ? { ...existing, ...member, name: member.name || existing.name } : member)
  })

  return Array.from(merged.values())
}

function isDeletedStaff(member: Staff, deletedStaff: DeletedStaff[]) {
  const memberUsername = String(member.username || member.name || '').toLowerCase().replace(/\s+/g, '_')
  const memberEmail = String(member.email || '').toLowerCase()
  return deletedStaff.some((deleted) => {
    const deletedUsername = String(deleted.username || '').toLowerCase().replace(/\s+/g, '_')
    const deletedEmail = String(deleted.email || '').toLowerCase()
    return (deleted.id != null && deleted.id === member.id) || (deletedUsername && deletedUsername === memberUsername) || (deletedEmail && deletedEmail === memberEmail)
  })
}

async function loadSeedOrders(): Promise<Order[]> {
  try {
    // Prefer serverless API if available
    try {
      const apiData = await fetchJsonWithTimeout('/api/orders')
      if (Array.isArray(apiData)) return apiData
    } catch (e) {
      // ignore and fallback
    }
    const data = await fetchJsonWithTimeout('/data/orders.json')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function loadSeedStore(): Promise<StoreInfo> {
  try {
    const data = await fetchJsonWithTimeout('/data/store.json')
    return data || DEFAULT_STORE
  } catch {
    return DEFAULT_STORE
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'products' | 'staff' | 'store' | 'orders'>('dashboard')
  const [products, setProducts] = useState<Product[]>(getInitialProducts())
  const [orders, setOrders] = useState<Order[]>(getInitialOrders())
  const [staff, setStaff] = useState<Staff[]>(getInitialStaff())
  const [users, setUsers] = useState<AppUser[]>(getInitialUsers())
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(getInitialStore())
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editStaff, setEditStaff] = useState<Staff | null>(null)

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_v1') || 'null')
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    document.body.style.background = '#f8f9fa'
    document.body.style.backgroundColor = '#f8f9fa'
    document.body.style.backgroundAttachment = 'unset'
    document.documentElement.style.backgroundColor = '#f8f9fa'

    return () => {
      document.body.style.background = '#2b1f15'
      document.body.style.backgroundAttachment = 'fixed'
    }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }

    const bootstrap = async () => {
      setLoading(true)

      try {
        const [seedProducts, seedOrders, seedStaff, seedStore, seedUsers] = await Promise.all([
          loadSeedProducts(),
          loadSeedOrders(),
          loadSeedStaff(),
          loadSeedStore(),
          loadSeedUsers()
        ])

        const storedProducts = readJson<Product[]>('products_v1', [])
        const storedOrders = readJson<Order[]>('orders_v1', [])
        const storedStaff = readJson<Staff[]>('staff_v1', [])
        const storedUsers = readJson<AppUser[]>('users_v1', [])
        const storedStore = readJson<StoreInfo>('store_v1', DEFAULT_STORE)
        const deletedStaff = getDeletedStaffKeys()

        const nextProducts = storedProducts.length ? storedProducts : seedProducts
        // normalize image paths for consistency (convert backslashes and ensure leading slash for files)
        const normalizedProducts = nextProducts.map((p) => ({ ...p, image: normalizeImagePath(p.image) }))
        const nextOrders = storedOrders.length ? storedOrders : seedOrders
        // Combine users so storedUsers override seedUsers to avoid reintroducing deleted staff
        const combinedUsers = [
          ...storedUsers,
          ...seedUsers.filter((su) => !storedUsers.some((u) => Number(u.id) === Number(su.id) || String(u.username) === String(su.username) || String(u.email) === String(su.email)))
        ]
        // Exclude users that have been marked deleted to prevent reintroduction from seed data
        const filteredCombinedUsers = combinedUsers.filter((user) => {
          const uName = String(user.username || '').toLowerCase().replace(/\s+/g, '_')
          const uEmail = String(user.email || '').toLowerCase()
          return !deletedStaff.some((d) => {
            const dName = String(d.username || '').toLowerCase().replace(/\s+/g, '_')
            const dEmail = String(d.email || '').toLowerCase()
            return (d.id != null && Number(d.id) === Number(user.id)) || (dName && dName === uName) || (dEmail && dEmail === uEmail)
          })
        })

        const staffFromUsers = filteredCombinedUsers.filter((user) => String(user.role || '').toLowerCase() === 'staff').map((user) => ({
          id: user.id,
          name: user.username,
          username: user.username,
          email: user.email || `${user.username}@lexnitch.local`,
          salary: 0
        }))
        const mergedStaff = staffFromUsers.length > 0 ? mergeStaffRecords(staffFromUsers, storedStaff) : (storedStaff.length ? storedStaff : seedStaff)
        const nextStaff = mergedStaff.filter((member) => !isDeletedStaff(member, deletedStaff))
        const nextStore = storedStore?.name ? storedStore : seedStore || DEFAULT_STORE

        setProducts(normalizedProducts)
        setOrders(nextOrders)
        setStaff(nextStaff)
        setUsers(filteredCombinedUsers)
        setStoreInfo(nextStore)

        writeJson('products_v1', normalizedProducts)
        writeJson('orders_v1', nextOrders)
        writeJson('staff_v1', nextStaff)
        writeJson('store_v1', nextStore)
        writeJson('users_v1', filteredCombinedUsers)
      } catch (bootstrapError: any) {
        setError(bootstrapError?.message || 'Failed to load admin data')
      }

      setLoading(false)
    }

    void bootstrap()
  }, [navigate, user])

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
  const pendingOrders = orders.filter((order) => String(order.status).toLowerCase() === 'pending').length
  const totalStaff = staff.length
  const totalInventoryValue = products.reduce((sum, product) => sum + (product.price || 0), 0)

  const categoriesCount = useMemo(() => {
    return products.reduce((acc: Record<string, number>, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1
      return acc
    }, {})
  }, [products])

  const handleLogout = () => {
    localStorage.removeItem('user_v1')
    navigate('/')
  }

  const handleSaveProduct = async (form: Partial<Product> & { image_upload?: string }) => {
    setLoading(true)
    try {
      const normalized: Product = editProduct
        ? { ...editProduct, ...form, price: Number(form.price ?? editProduct.price) }
        : {
            id: products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1,
            name: String(form.name || '').trim(),
            category: String(form.category || '').trim(),
            price: Number(form.price || 0),
            image: String(form.image || '🍰')
          }

      const nextProducts = editProduct
        ? products.map((product) => (product.id === editProduct.id ? normalized : product))
        : [normalized, ...products]

      setProducts(nextProducts)
      writeJson('products_v1', nextProducts)
      setSuccess(editProduct ? 'Product updated successfully!' : 'Product added successfully!')
      setEditProduct(null)
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save product')
    }
    setLoading(false)
  }

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Delete this product?')) return
    setLoading(true)
    try {
      const nextProducts = products.filter((product) => product.id !== id)
      setProducts(nextProducts)
      writeJson('products_v1', nextProducts)
      setSuccess('Product deleted successfully!')
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Failed to delete product')
    }
    setLoading(false)
  }

  const handleSaveStaff = async (form: Partial<Staff> & { password?: string }) => {
    setLoading(true)
    try {
      const normalized: Staff = editStaff
        ? { ...editStaff, ...form, salary: Number(form.salary ?? editStaff.salary ?? 0) }
        : {
            id: staff.length ? Math.max(...staff.map((member) => member.id)) + 1 : 1,
            name: String(form.name || '').trim(),
            email: String(form.email || '').trim(),
            phone: String(form.phone || '').trim(),
            salary: Number(form.salary || 0),
            position: form.position || 'Staff',
            hire_date: new Date().toISOString().slice(0, 10)
          }

      const nextStaff = editStaff
        ? staff.map((member) => (member.id === editStaff.id ? normalized : member))
        : [normalized, ...staff]

      setStaff(nextStaff)
      writeJson('staff_v1', nextStaff)
      setSuccess(editStaff ? 'Staff member updated successfully!' : 'Staff member added successfully!')
      setEditStaff(null)

      if (form.password) {
        const existingUsers = readJson<any[]>('users_v1', [])
        const username = normalized.name.toLowerCase().replace(/\s+/g, '_')
        const nextUsers = [
          ...existingUsers.filter((userEntry) => userEntry.email !== normalized.email),
          {
            id: editStaff ? editStaff.id : (existingUsers.length ? Math.max(...existingUsers.map((u) => u.id || 0)) + 1 : 1000),
            username,
            password: form.password,
            role: 'staff',
            email: normalized.email
          }
        ]
        writeJson('users_v1', nextUsers)
      }
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save staff member')
    }
    setLoading(false)
  }

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('Remove this staff member?')) return
    setLoading(true)
    try {
      const target = staff.find((member) => member.id === id)
      const nextStaff = staff.filter((member) => member.id !== id)
      const deletedStaff = getDeletedStaffKeys()
      const nextDeletedStaff = [
        ...deletedStaff.filter((entry) => entry.id !== id),
        {
          id,
          username: target?.username || target?.name,
          email: target?.email
        }
      ]
      const existingUsers = readJson<AppUser[]>('users_v1', [])
      const nextUsers = existingUsers.filter((userEntry) => {
        const userKey = String(userEntry.username || '').toLowerCase()
        const emailKey = String(userEntry.email || '').toLowerCase()
        const targetUserKey = String(target?.username || target?.name || '').toLowerCase().replace(/\s+/g, '_')
        const targetEmailKey = String(target?.email || '').toLowerCase()

        return userEntry.id !== id && userKey !== targetUserKey && emailKey !== targetEmailKey
      })

      setStaff(nextStaff)
      writeJson('staff_v1', nextStaff)
      writeJson('deleted_staff_v1', nextDeletedStaff)
      writeJson('users_v1', nextUsers)
      if (editStaff?.id === id) setEditStaff(null)
      setSuccess('Staff member removed successfully!')
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Failed to remove staff member')
    }
    setLoading(false)
  }

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    setLoading(true)
    try {
      const nextOrders = orders.map((order) => (order.order_id === orderId ? { ...order, status } : order))
      setOrders(nextOrders)
      writeJson('orders_v1', nextOrders)
      setSuccess('Order status updated successfully!')
    } catch (statusError: any) {
      setError(statusError?.message || 'Failed to update order status')
    }
    setLoading(false)
  }

  const handleUpdateStore = async (form: StoreInfo) => {
    setLoading(true)
    try {
      setStoreInfo(form)
      writeJson('store_v1', form)
      setSuccess('Store information updated successfully!')
    } catch (storeError: any) {
      setError(storeError?.message || 'Failed to update store info')
    }
    setLoading(false)
  }

  if (!user || user.role !== 'admin') return <div style={{ padding: 20 }}>Redirecting...</div>
  if (loading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div className="admin-layout-modern">
      <aside className="admin-sidebar-modern">
        <div className="sidebar-brand">
          <h2>Lex &amp; Nitch</h2>
          <span>Admin Portal</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>
            <span className="nav-icon">📊</span> Dashboard
          </button>
          <button className={`nav-item ${currentTab === 'products' ? 'active' : ''}`} onClick={() => setCurrentTab('products')}>
            <span className="nav-icon">📦</span> Products
          </button>
          <button className={`nav-item ${currentTab === 'staff' ? 'active' : ''}`} onClick={() => setCurrentTab('staff')}>
            <span className="nav-icon">👔</span> Staff
          </button>
          <button className={`nav-item ${currentTab === 'store' ? 'active' : ''}`} onClick={() => setCurrentTab('store')}>
            <span className="nav-icon">🏪</span> Store Settings
          </button>
          <button className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`} onClick={() => setCurrentTab('orders')}>
            <span className="nav-icon">📋</span> Orders
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{String(user.username || 'A').charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <strong>{user.username}</strong>
              <span>Administrator</span>
            </div>
          </div>
          <button className="btn-logout-modern" onClick={handleLogout}>Log Out</button>
          <div style={{ marginTop: 12 }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none', opacity: 0.8 }}>Back to site</Link>
          </div>
        </div>
      </aside>

      <main className="admin-main-modern">
        <header className="main-header">
          <h1 className="page-title">
            {currentTab === 'dashboard' && 'Overview'}
            {currentTab === 'products' && 'Inventory Management'}
            {currentTab === 'staff' && 'Team Members'}
            {currentTab === 'store' && 'Store Configuration'}
            {currentTab === 'orders' && 'Order Fulfillment'}
          </h1>
        </header>

        <div className="content-area">
          {success && <div className="alert alert-success">✓ {success}</div>}
          {error && <div className="alert alert-error">✗ {error}</div>}

          {currentTab === 'dashboard' && (
            <section className="animate-fade-in">
              <div className="stats-grid-modern">
                <StatCard icon="💰" label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} />
                <StatCard icon="🛍️" label="Total Orders" value={String(totalOrders)} />
                <StatCard icon="⏳" label="Pending Orders" value={String(pendingOrders)} />
                <StatCard icon="👥" label="Active Staff" value={String(totalStaff)} />
                <StatCard icon="📦" label="Inventory Items" value={String(products.length)} />
                <StatCard icon="💵" label="Inventory Value" value={`$${totalInventoryValue.toFixed(2)}`} />
              </div>

              <div className="dashboard-widgets">
                <div className="widget-card">
                  <h3 className="widget-title">Categories Distribution</h3>
                  <div className="category-pills">
                    {Object.keys(categoriesCount).length === 0 ? (
                      <span className="empty-text">No categories yet</span>
                    ) : (
                      Object.entries(categoriesCount).map(([cat, count]) => (
                        <div key={cat} className="cat-pill">
                          <span className="cat-name">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                          <span className="cat-count">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentTab === 'products' && (
            <section className="animate-fade-in">
              <ProductForm editProduct={editProduct} onSave={handleSaveProduct} onCancel={() => setEditProduct(null)} />
              <div className="table-card">
                <table className="admin-table-modern">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>#{product.id}</td>
                        <td>
                          <div className="td-image">
                            {product.image && (product.image.startsWith('http') || product.image.startsWith('/') || product.image.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(product.image)) ? (
                              <img src={
                                product.image && (product.image.startsWith('http') || product.image.startsWith('/img/') || product.image.startsWith('data:image/'))
                                  ? product.image
                                  : product.image && product.image.startsWith('/')
                                  ? '/img/' + product.image.split('/').pop()
                                  : product.image
                                  ? '/img/' + product.image.split('/').pop()
                                  : '/img/placeholder.jpg'
                              } alt={product.name} />
                            ) : (
                              <span className="emoji-img">{product.image}</span>
                            )}
                          </div>
                        </td>
                        <td className="font-medium">{product.name}</td>
                        <td><span className="badge-category">{productCategoryLabels[product.category] || product.category}</span></td>
                        <td className="font-semibold text-green">${product.price.toFixed(2)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action edit" onClick={() => setEditProduct(product)}>Edit</button>
                            <button className="btn-action delete" onClick={() => handleDeleteProduct(product.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentTab === 'staff' && (
            <section className="animate-fade-in">
              <StaffForm editStaff={editStaff} onSave={handleSaveStaff} onCancel={() => setEditStaff(null)} />
              <div className="table-card">
                <table className="admin-table-modern">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Salary</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr><td colSpan={5} className="center-text empty-text">No staff members found.</td></tr>
                    ) : staff.map((member) => (
                      <tr key={member.id}>
                        <td>#{member.id}</td>
                        <td className="font-medium">{member.name}</td>
                        <td>
                          <div className="contact-info">
                            <span>{member.email}</span>
                            <span className="text-muted">{member.phone}</span>
                          </div>
                        </td>
                        <td className="font-semibold">${(member.salary || 0).toFixed(2)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action edit" onClick={() => setEditStaff(member)}>Edit</button>
                            <button className="btn-action delete" onClick={() => handleDeleteStaff(member.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentTab === 'store' && (
            <section className="animate-fade-in">
              <StoreForm data={storeInfo} onSave={handleUpdateStore} />
            </section>
          )}

          {currentTab === 'orders' && (
            <section className="animate-fade-in">
              <div className="table-card">
                {orders.length === 0 ? (
                  <p className="empty-text center-text" style={{ padding: '40px' }}>No orders yet!</p>
                ) : (
                  <table className="admin-table-modern">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.order_id}>
                          <td className="font-medium">#{order.order_id}</td>
                          <td>{(() => {
                            if (order.guest_name) return order.guest_name
                            if (order.user_id != null) {
                              const found = users.find((u) => Number(u.id) === Number(order.user_id))
                              return found ? found.username : String(order.user_id)
                            }
                            return 'Guest'
                          })()}</td>
                          <td className="text-muted">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                          <td className="font-semibold text-green">${(order.total || 0).toFixed(2)}</td>
                          <td>{Array.isArray(order.items) ? order.items.length : 0} items</td>
                          <td>
                            <span className={`status-pill status-${String(order.status).toLowerCase()}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <select defaultValue={order.status} onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)} className="status-select-modern">
                              <option value="Pending">Pending</option>
                              <option value="Ongoing">Ongoing</option>
                              <option value="Going">Going</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="stat-card-modern">
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
      </div>
    </div>
  )
}

function ProductForm({ editProduct, onSave, onCancel }: { editProduct: Product | null; onSave: (form: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(editProduct?.name || '')
  const [category, setCategory] = useState(editProduct?.category || '')
  const [price, setPrice] = useState(editProduct ? String(editProduct.price) : '')
  const [image, setImage] = useState(editProduct?.image || '🍰')
  const [uploading, setUploading] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const resetForm = () => {
    setName('')
    setCategory('')
    setPrice('')
    setImage('🍰')
    setFileInputKey((current) => current + 1)
  }

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name)
      setCategory(editProduct.category)
      setPrice(String(editProduct.price))
      setImage(editProduct.image || '🍰')
    } else {
      resetForm()
    }
  }, [editProduct])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    await onSave({ name, category, price: Number(price || 0), image })
    if (!editProduct) {
      resetForm()
    }
  }

  return (
    <div className="admin-form">
      <h3>{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group">
            <label>Product Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} required>
              <option value="">Select Category</option>
              <option value="coffee">☕ Coffee</option>
              <option value="cookies">🍪 Cookies</option>
              <option value="pastries">🥐 Pastries</option>
              <option value="desserts">🍰 Desserts</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Price ($)</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(event) => setPrice(event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Image (Emoji or URL or Upload)</label>
            <input value={image} onChange={(event) => setImage(event.target.value)} placeholder="emoji or URL" />
            <div style={{ marginTop: 8 }}>
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return

                  setUploading(true)
                  try {
                    const base64 = await fileToDataUrl(file)
                    setImage(base64)
                  } catch (uploadError) {
                    alert('Upload failed: ' + (uploadError instanceof Error ? uploadError.message : String(uploadError)))
                  } finally {
                    setUploading(false)
                  }
                }}
              />
              {uploading && <div style={{ marginTop: 6 }}>Uploading...</div>}
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">{editProduct ? 'Update Product' : 'Add Product'}</button>
          {editProduct && <button type="button" className="btn" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>}
        </div>
      </form>
    </div>
  )
}

function StaffForm({ editStaff, onSave, onCancel }: { editStaff: Staff | null; onSave: (form: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(editStaff?.name || '')
  const [email, setEmail] = useState(editStaff?.email || '')
  const [phone, setPhone] = useState(editStaff?.phone || '')
  const [salary, setSalary] = useState(editStaff ? String(editStaff.salary ?? '') : '')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (editStaff) {
      setName(editStaff.name)
      setEmail(editStaff.email)
      setPhone(editStaff.phone || '')
      setSalary(String(editStaff.salary ?? ''))
    }
  }, [editStaff])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onSave({ name, email, phone, salary: Number(salary || 0), password })
  }

  return (
    <div className="admin-form">
      <h3>{editStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group">
            <label>Full Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password {editStaff ? '(leave blank to keep)' : '*'}</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={editStaff ? 'Leave blank to keep current password' : 'Enter password'}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Salary</label>
            <input type="number" step="0.01" min="0" value={salary} onChange={(event) => setSalary(event.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">{editStaff ? 'Update Staff' : 'Add Staff'}</button>
          {editStaff && <button type="button" className="btn" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>}
        </div>
      </form>
    </div>
  )
}

function StoreForm({ data, onSave }: { data: StoreInfo; onSave: (form: StoreInfo) => void }) {
  const [name, setName] = useState(data?.name || '')
  const [email, setEmail] = useState(data?.email || '')
  const [phone, setPhone] = useState(data?.phone || '')
  const [address, setAddress] = useState(data?.address || '')
  const [hours, setHours] = useState(data?.hours || '')
  const [description, setDescription] = useState(data?.description || '')

  useEffect(() => {
    setName(data?.name || '')
    setEmail(data?.email || '')
    setPhone(data?.phone || '')
    setAddress(data?.address || '')
    setHours(data?.hours || '')
    setDescription(data?.description || '')
  }, [data])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onSave({ name, email, phone, address, hours, description })
  }

  return (
    <div className="admin-form">
      <h3>Store Information</h3>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group"><label>Store Name</label><input value={name} onChange={(event) => setName(event.target.value)} required /></div>
          <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Phone</label><input value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
          <div className="form-group"><label>Address</label><input value={address} onChange={(event) => setAddress(event.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Business Hours</label><input value={hours} onChange={(event) => setHours(event.target.value)} /></div>
        </div>
        <div className="form-group"><label>Description</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4}></textarea></div>
        <div className="form-actions"><button className="btn btn-primary" type="submit">Save Store Information</button></div>
      </form>
    </div>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}