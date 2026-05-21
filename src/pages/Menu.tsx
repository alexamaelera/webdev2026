import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartContext'

interface Product {
  id: number
  name: string
  category: string
  price: number
  image: string
}

function normalizeImagePath(img?: string) {
  if (!img) return ''
  const value = String(img).replace(/\\\\/g, '/').replace(/\\/g, '/')
  if (value.startsWith('http') || value.startsWith('/img/') || value.startsWith('data:image/')) return value
  // If it's an absolute path but not /img/, convert to use /img/ + basename
  if (value.startsWith('/')) return '/img/' + value.split('/').pop()
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value)) return '/img/' + value.split('/').pop()
  return value
}

interface CartItem {
  id: number
  name: string
  price: number
  image: string
  category: string
  quantity: number
}

interface OrderRecord {
  id: number
  order_id: number
  user_id: number | null
  guest_name: string
  guest_address: string
  delivery_date: string
  delivery_time: string
  payment_method: string
  items: CartItem[]
  items_count: number
  total: number
  status: string
  date: string
  estimated_delivery: string
}

export default function Menu() {
  const [products, setProducts] = useState<Product[]>([])
  const [showCart, setShowCart] = useState(false)
  const [menuLoading, setMenuLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCheckout, setShowCheckout] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestAddress, setGuestAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [checkoutError, setCheckoutError] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)
  const [showTrackModal, setShowTrackModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [trackOrderId, setTrackOrderId] = useState('')
  const [trackResult, setTrackResult] = useState<any>(null)
  const [trackError, setTrackError] = useState('')

  const { items, add, remove, clear } = useCart()
  const navigate = useNavigate()

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user_v1') || 'null')
    } catch {
      return null
    }
  })()

  const logout = () => {
    localStorage.removeItem('user_v1')
  }

  const loading = false
  const uiCategories = ['all', 'coffee', 'cookies', 'pastries', 'desserts']
  const categoryNames: { [key: string]: string } = {
    all: '🌟 All Products',
    coffee: '☕ Coffee',
    cookies: '🍪 Cookies',
    pastries: '🥐 Pastries',
    desserts: '🍰 Desserts'
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Disable global noise/pattern overlay while this page is mounted
  useEffect(() => {
    document.body.classList.add('no-noise-overlay')
    return () => { document.body.classList.remove('no-noise-overlay') }
  }, [])

  const fetchProducts = async () => {
    try {
      const cached = localStorage.getItem('products_v1')
      if (cached) {
        const data = JSON.parse(cached)
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map((product) => ({ ...product, image: normalizeImagePath(product.image) })))
          setMenuLoading(false)
          return
        }
      }

      const response = await fetch('/data/products.json')
      const data = await response.json()
      setProducts(Array.isArray(data) ? data.map((product) => ({ ...product, image: normalizeImagePath(product.image) })) : [])
      setMenuLoading(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
      setMenuLoading(false)
    }
  }

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setTrackError('')
    setTrackResult(null)

    if (!trackOrderId.trim()) {
      setTrackError('Please enter an order ID')
      return
    }

    try {
      const cleanedId = trackOrderId.replace(/[^0-9]/g, '')
      if (!cleanedId) {
        setTrackError('Invalid order ID format')
        return
      }

      // Try serverless API first
      try {
        const resp = await fetch(`/api/track?id=${encodeURIComponent(cleanedId)}`)
        if (resp.ok) {
          const data = await resp.json()
          const normalized = normalizeOrderRecord(data)
          setTrackResult(normalized)
          showNotification('Order found!')
          return
        }
      } catch (apiErr) {
        // fall through to local fallback
        console.warn('API track failed, falling back to localStorage', apiErr)
      }

      // Fallback: try localStorage (legacy behavior)
      const raw = localStorage.getItem('orders_v1')
      const ordersRaw = raw ? JSON.parse(raw) : []
      const ordersNormalized: OrderRecord[] = Array.isArray(ordersRaw) ? ordersRaw.map(normalizeOrderRecord) : []
      const order = ordersNormalized.find((o) => o.order_id === Number(cleanedId) || o.id === Number(cleanedId))
      if (order) {
        setTrackResult(order)
        showNotification('Order found!')
      } else {
        setTrackError('Order not found')
      }
    } catch (error) {
      console.error('Error tracking order:', error)
      setTrackError('Failed to track order')
    }
  }

  const addToCart = (product: Product, quantity: number) => {
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity
    }, quantity)
    showNotification(`${product.name} added to cart!`)
  }

  const removeFromCart = (productId: number) => {
    remove(productId)
    showNotification('Item removed from cart')
  }

  const cartValues = Object.values(items)
  const cartTotal = cartValues.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cartValues.reduce((sum, item) => sum + item.quantity, 0)

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckoutError('')

    const errors: string[] = []
    if (!guestName.trim()) errors.push('Name is required.')
    else if (!/^[a-zA-Z\s\-\.]{2,100}$/.test(guestName)) errors.push('Name must be 2-100 letters.')

    if (!guestAddress.trim()) errors.push('Address is required.')
    else if (guestAddress.length < 5) errors.push('Address must be at least 5 characters.')

    if (!deliveryDate) errors.push('Delivery date is required.')
    if (!deliveryTime) errors.push('Delivery time is required.')
    if (cartValues.length === 0) errors.push('Your cart is empty.')

    if (errors.length > 0) {
      setCheckoutError(errors.join(' '))
      return
    }

    try {
      const existingRaw = localStorage.getItem('orders_v1')
      const existing: OrderRecord[] = existingRaw ? JSON.parse(existingRaw) : []
      const nextOrderId = existing.length > 0 ? Math.max(...existing.map((o) => o.order_id || o.id)) + 1 : 1

      const newOrder: OrderRecord = {
        id: nextOrderId,
        order_id: nextOrderId,
        user_id: user?.id || null,
        guest_name: guestName,
        guest_address: guestAddress,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        payment_method: paymentMethod,
        items: cartValues as CartItem[],
        items_count: cartValues.length,
        total: cartTotal,
        status: 'Pending',
        date: new Date().toISOString(),
        estimated_delivery: `${deliveryDate} ${deliveryTime}`
      }

      localStorage.setItem('orders_v1', JSON.stringify([...existing, newOrder]))

      setReceipt({
        order_id: newOrder.order_id,
        guest_name: guestName,
        guest_address: guestAddress,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        items: cartValues,
        total: cartTotal,
        date: newOrder.date
      })
      clear()
      setShowReceipt(true)
      setShowCheckout(false)
      setGuestName('')
      setGuestAddress('')
      setDeliveryDate('')
      setDeliveryTime('')
      showNotification('Order placed successfully!')
    } catch (error) {
      setCheckoutError('An error occurred during checkout')
      console.error(error)
    }
  }

  const getMappedCategory = (dbCat: string) => {
    const normalized = (dbCat || '').toLowerCase()
    if (['coffee', 'cookies', 'pastries', 'desserts'].includes(normalized)) return normalized
    if (['tea', 'smoothie', 'juice', 'non-coffee'].includes(normalized)) return 'coffee'
    if (['food', 'bakery'].includes(normalized)) return 'pastries'
    return 'desserts'
  }

  // Normalize legacy order objects so the tracking modal always has expected fields
  const normalizeOrderRecord = (o: any) => {
    const order = { ...o }
    // date (ISO) — prefer existing `date`, then `created_at`, else now
    if (!order.date) {
      if (order.created_at) order.date = new Date(order.created_at).toISOString()
      else order.date = new Date().toISOString()
    }
    // delivery_date fallback to date's yyyy-mm-dd
    if (!order.delivery_date) {
      try { order.delivery_date = order.date.split('T')[0] } catch { order.delivery_date = '' }
    }
    if (!order.delivery_time) order.delivery_time = order.delivery_time || ''
    if (!order.estimated_delivery) order.estimated_delivery = order.estimated_delivery || order.created_at || order.date
    if (!order.items && Array.isArray(o.items)) order.items = o.items
    order.items_count = order.items ? order.items.length : (order.items_count ?? 0)
    if (typeof order.total === 'undefined' || order.total === null) {
      order.total = order.items ? order.items.reduce((s: number, it: any) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0) : 0
    }
    if (!order.status) order.status = order.status || 'Pending'
    if (!order.order_id && order.id) order.order_id = order.id
    return order
  }

  const categoryProducts = ['coffee', 'cookies', 'pastries', 'desserts']
    .map((cat) => ({
      category: cat,
      products: products.filter((p) => getMappedCategory(p.category) === cat)
    }))
    .filter((group) => {
      if (selectedCategory === 'all') return group.products.length > 0
      return group.category === selectedCategory && group.products.length > 0
    })

  if (menuLoading) return <div className="menu-container"><p>Loading menu...</p></div>

  return (
    <div className="menu-page" style={{ background: '#2c1f18', minHeight: '100vh', color: '#e8f4da' }}>
      {notification && (
        <div style={{ position: 'fixed', top: '90px', right: '20px', background: notification.type === 'success' ? 'linear-gradient(135deg, #43A047, #66BB6A)' : 'linear-gradient(135deg, #D32F2F, #E53935)', color: '#fff', padding: '16px 22px 20px', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', fontSize: '0.95rem', fontWeight: 600, zIndex: 9999, maxWidth: '300px', animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>
          {notification.message}
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '0 0 14px 14px', animation: 'toastProgress 3s linear forwards' }} />
        </div>
      )}

      <nav className="navbar">
        <div className="nav-container">
          <h1 className="logo">Lex & Nitch Cafe</h1>
          <div className="nav-right">
            <span className="user-greeting">Welcome, {user?.username || 'customer'}!</span>
            <div style={{ position: 'relative' }}>
              <button className="cart-toggle" onClick={() => setShowCart(!showCart)}>
                🛒 Cart <span className="cart-badge">{cartCount}</span>
              </button>

              {showCart && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)', width: '320px', maxHeight: '420px', zIndex: 1000, marginTop: '8px', padding: '14px', overflow: 'auto', animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)', transformOrigin: 'top right', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0, color: '#4A5F1F', fontSize: '1.1em' }}>Your Cart</h3>
                    <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}>✕</button>
                  </div>

                  <div style={{ minHeight: '60px', marginBottom: '8px' }}>
                    {cartValues.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontStyle: 'italic' }}>Your cart is empty</p>
                    ) : (
                      cartValues.map((item) => (
                        <div key={item.id} style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9em' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95em', color: '#333' }}>{item.name}</h4>
                            <p style={{ margin: 0, color: '#4A5F1F', fontWeight: 'bold', fontSize: '0.85em' }}>${item.price.toFixed(2)} x {item.quantity}</p>
                          </div>
                          <button type="button" onClick={() => removeFromCart(item.id)} style={{ background: '#e53935', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75em', fontWeight: 'bold' }}>Remove</button>
                        </div>
                      ))
                    )}
                  </div>

                  {cartValues.length > 0 && (
                    <React.Fragment>
                      <div style={{ background: 'linear-gradient(135deg, #4A5F1F, #556B2F)', color: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1em' }}>Total: ${cartTotal.toFixed(2)}</h3>
                      </div>
                      <button type="button" onClick={() => { setShowCheckout(true); setShowCart(false) }} style={{ width: '100%', background: '#4A5F1F', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95em' }}>Place Order</button>
                    </React.Fragment>
                  )}
                </div>
              )}
            </div>

            {!loading && user ? (
              <React.Fragment>
                {user.role === 'admin' && (
                  <Link to="/admin" style={{ color: 'white', textDecoration: 'none', padding: '10px 16px', background: '#FF9800', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', display: 'inline-block' }}>
                    ⚙️ Dashboard
                  </Link>
                )}
                <button className="btn btn-secondary" onClick={() => { logout(); navigate('/') }} style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.4)', fontWeight: '600', padding: '10px 16px', borderRadius: '6px' }}>
                  Logout
                </button>
              </React.Fragment>
            ) : null}

            <Link to="/" style={{ color: 'white', textDecoration: 'none', padding: '10px 16px', fontWeight: '600', fontSize: '0.95rem' }}>Home</Link>

            <button onClick={() => setShowTrackModal(true)} style={{ color: 'white', background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.4)', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.3s' }}>
              Track Order
            </button>

            {!user && (
              <Link to="/login" style={{ color: 'white', textDecoration: 'none', padding: '10px 16px', background: '#9CCC65', borderRadius: '6px', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.3s', display: 'inline-block' }}>
                Login
              </Link>
            )}

            <button className="hamburger-btn" onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#fff' }}>
              ☰
            </button>

            {showMenu && (
              <div style={{ position: 'absolute', top: '60px', right: '20px', background: 'linear-gradient(135deg, #4A5F1F 0%, #556B2F 100%)', border: '1px solid rgba(192, 232, 156, 0.3)', borderRadius: '8px', padding: '15px', minWidth: '180px', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)', zIndex: 1000 }}>
                <Link to="/" style={{ display: 'block', color: '#E8F4DA', padding: '10px 15px', textDecoration: 'none', borderRadius: '4px' }}>Home</Link>
                <button onClick={() => { setShowTrackModal(true); setShowMenu(false) }} style={{ display: 'block', width: '100%', color: '#E8F4DA', background: 'none', border: 'none', padding: '10px 15px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}>
                  Track Order
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="menu-container" style={{ maxWidth: '1200px', margin: '40px auto', padding: '24px', display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
        <aside className="sidebar" style={{ background: '#f7f7f5', borderRadius: '14px', padding: '22px', minWidth: '260px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h2>Menu Categories</h2>
          <div className="category-links">
            {uiCategories.map((cat) => (
              <button key={cat} className={`category-btn ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>
                {categoryNames[cat]}
              </button>
            ))}
          </div>
        </aside>

        <main className="menu-content" style={{ flex: 1, background: 'transparent' }}>
          <div className="menu-header">
            <h1 className="whimsical-menu-title" style={{ color: '#d0e3b8' }}>Our Menu</h1>
            <p>Freshly made, just for you!</p>
          </div>

          <div className="products-grid">
            {categoryProducts.map((group) => (
              <div key={group.category} className="category-section">
                <h2 className="category-title">{categoryNames[group.category]}</h2>
                <div className="products-row">
                  {group.products.map((product, idx) => (
                    <div key={product.id} className="product-card" style={{ animation: `fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.08}s both` }}>
                      <div className="product-image"><img src={normalizeImagePath(product.image)} alt={product.name} /></div>
                      <h3>{product.name}</h3>
                      <p className="product-price">${product.price.toFixed(2)}</p>
                      <div className="add-to-cart-form">
                        <input type="number" defaultValue="1" min="1" max="10" className="quantity-input" id={`qty-${product.id}`} />
                        <button type="button" className="btn btn-add" onClick={(e) => {
                          const qty = parseInt((document.getElementById(`qty-${product.id}`) as HTMLInputElement).value, 10)
                          addToCart(product, Number.isNaN(qty) ? 1 : qty)
                          ;(document.getElementById(`qty-${product.id}`) as HTMLInputElement).value = '1'
                          const card = (e.target as HTMLElement).closest('.product-card') as HTMLElement | null
                          if (card) {
                            card.style.animation = 'cardPulse 0.6s ease'
                            setTimeout(() => { card.style.animation = '' }, 600)
                          }
                        }}>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {showCheckout && (
        <div className="checkout-modal" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', zIndex: 2000, justifyContent: 'center', alignItems: 'center', animation: 'backdropFadeIn 0.3s ease' }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto', animation: 'modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', borderRadius: '16px' }}>
            <div className="modal-header">
              <h2>Order Information</h2>
              <button className="close-btn" onClick={() => setShowCheckout(false)}>✕</button>
            </div>
            <form onSubmit={handleGuestCheckout} className="checkout-form-guest">
              {checkoutError && <div className="alert alert-error">{checkoutError}</div>}

              <div className="form-group">
                <label htmlFor="guest_name">Your Name *</label>
                <input type="text" id="guest_name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required placeholder="Enter your full name" />
              </div>

              <div className="form-group">
                <label htmlFor="guest_address">Delivery Address *</label>
                <textarea id="guest_address" value={guestAddress} onChange={(e) => setGuestAddress(e.target.value)} required placeholder="Enter your delivery address" rows={3} />
              </div>

              <div className="form-group">
                <label htmlFor="delivery_date">Preferred Delivery Date *</label>
                <input type="date" id="delivery_date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
              </div>

              <div className="form-group">
                <label htmlFor="delivery_time">Preferred Time *</label>
                <select id="delivery_time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} required>
                  <option value="">Select time slot</option>
                  <option value="06:00-07:00">6:00 AM - 7:00 AM</option>
                  <option value="07:00-08:00">7:00 AM - 8:00 AM</option>
                  <option value="08:00-09:00">8:00 AM - 9:00 AM</option>
                  <option value="09:00-10:00">9:00 AM - 10:00 AM</option>
                  <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                  <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                  <option value="12:00-13:00">12:00 PM - 1:00 PM</option>
                  <option value="13:00-14:00">1:00 PM - 2:00 PM</option>
                  <option value="14:00-15:00">2:00 PM - 3:00 PM</option>
                  <option value="15:00-16:00">3:00 PM - 4:00 PM</option>
                  <option value="16:00-17:00">4:00 PM - 5:00 PM</option>
                  <option value="17:00-18:00">5:00 PM - 6:00 PM</option>
                  <option value="18:00-19:00">6:00 PM - 7:00 PM</option>
                  <option value="19:00-20:00">7:00 PM - 8:00 PM</option>
                </select>
              </div>

              <div className="form-group">
                <label>Payment Method *</label>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <label><input type="radio" name="payment_method" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} /> Cash on Delivery</label>
                  <label><input type="radio" name="payment_method" value="gcash" onChange={(e) => setPaymentMethod(e.target.value)} /> GCash</label>
                </div>
                {paymentMethod === 'gcash' && <div style={{ color: '#e53935', fontWeight: 'bold', marginTop: '8px' }}>Not available at the moment</div>}
              </div>

              <div className="form-group">
                <h4>Order Summary</h4>
                <div className="order-summary">
                  {cartValues.map((item) => (
                    <div key={item.id} className="summary-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="summary-total"><strong>Total: ${cartTotal.toFixed(2)}</strong></div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckout(false)}>Cancel</button>
                <button type="submit" className="btn btn-checkout">Confirm Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceipt && receipt && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 2000, justifyContent: 'center', alignItems: 'center' }}>
          <div className="receipt-content" style={{ background: 'white', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto', padding: '30px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)', position: 'relative' }}>
            <button onClick={() => setShowReceipt(false)} style={{ position: 'absolute', top: '12px', right: '16px', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            <div className="receipt-header"><h1>Order Receipt</h1><p>Thank you for your order!</p></div>
            <div className="receipt-body">
              <div className="receipt-section"><h3>Order Details</h3><p><strong>Order ID:</strong> #{String(receipt.order_id).padStart(5, '0')}</p><p><strong>Order Date:</strong> {new Date(receipt.date).toLocaleDateString()}</p></div>
              <div className="receipt-section"><h3>Customer Information</h3><p><strong>Name:</strong> {receipt.guest_name}</p><p><strong>Delivery Address:</strong> {receipt.guest_address}</p><p><strong>Preferred Delivery Time:</strong> {receipt.delivery_time}</p></div>
              <div className="receipt-section">
                <h3>Items Ordered</h3>
                <table className="receipt-items">
                  <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {receipt.items.map((item: any) => (
                      <tr key={item.id}><td>{item.name}</td><td>{item.quantity}</td><td>${item.price.toFixed(2)}</td><td>${(item.price * item.quantity).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="receipt-section"><h3>Total Amount</h3><p className="receipt-total">${receipt.total.toFixed(2)}</p></div>
              <div className="receipt-message"><p>Your order has been received and will be prepared shortly.</p><p>Delivery tracking information will be available on the main menu page.</p></div>
            </div>
            <div className="receipt-footer"><button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>Print Receipt</button></div>
          </div>
        </div>
      )}

      {showTrackModal && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 2000, justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>Track Your Order</h2>
              <button className="close-btn" onClick={() => { setShowTrackModal(false); setTrackOrderId(''); setTrackError('') }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              {!trackResult ? (
                <form onSubmit={handleTrackOrder}>
                  {trackError && <div className="alert alert-error">{trackError}</div>}
                  <div className="form-group"><label htmlFor="track_order_id">Enter Order ID</label><input type="text" id="track_order_id" placeholder="e.g. 00001" value={trackOrderId} onChange={(e) => setTrackOrderId(e.target.value)} /></div>
                  <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => { setShowTrackModal(false); setTrackOrderId(''); setTrackError('') }}>Cancel</button><button type="submit" className="btn btn-primary">Track</button></div>
                </form>
              ) : (
                <div>
                  <div className="alert alert-success">Order found!</div>
                  <div style={{ marginBottom: '20px' }}>
                    <h3>Order #{String(trackResult.order_id).padStart(5, '0')}</h3>
                    <p><strong>Customer Name:</strong> {trackResult.guest_name || '—'}</p>
                    <p><strong>Delivery Address:</strong> {trackResult.guest_address || '—'}</p>
                    <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: trackResult.status === 'Delivered' ? '#4CAF50' : trackResult.status === 'Preparing' ? '#FF9800' : '#2196F3' }}>{trackResult.status || '—'}</span></p>
                    <p><strong>Delivery Date:</strong> {
                      (trackResult.delivery_date || trackResult.date || trackResult.created_at)
                        ? new Date(trackResult.delivery_date || trackResult.date || trackResult.created_at).toLocaleDateString()
                        : '—'
                    }</p>
                    <p><strong>Delivery Time Window:</strong> {trackResult.delivery_time || '—'}</p>
                    <p><strong>Estimated Delivery:</strong> {trackResult.estimated_delivery || (trackResult.created_at ? new Date(trackResult.created_at).toLocaleString() : '—')}</p>
                    <p><strong>Items:</strong> {trackResult.items ? trackResult.items.length : (trackResult.items_count ?? '—')}</p>
                    <p><strong>Total Amount:</strong> ${Number(trackResult.total || 0).toFixed(2)}</p>
                  </div>
                  <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => { setShowTrackModal(false); setTrackOrderId(''); setTrackResult(null); setTrackError('') }}>Close</button><button type="button" className="btn btn-primary" onClick={() => { setTrackOrderId(''); setTrackResult(null); setTrackError('') }}>Track Another Order</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
