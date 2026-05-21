const fs = require('fs')
const path = require('path')

module.exports = (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'orders.json')
    if (!fs.existsSync(dataPath)) return res.status(404).json({ error: 'orders.json not found' })
    const raw = fs.readFileSync(dataPath, 'utf8')
    const orders = JSON.parse(raw)
    // simple normalization to keep API consistent
    const normalized = orders.map((o) => ({
      order_id: o.order_id || o.id,
      user_id: o.user_id || null,
      guest_name: o.guest_name || '',
      guest_address: o.guest_address || '',
      created_at: o.created_at || o.date || null,
      total: o.total || 0,
      status: o.status || 'Pending',
      items: o.items || []
    }))
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json(normalized)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'failed to read orders' })
  }
}
