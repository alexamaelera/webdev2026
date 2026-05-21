const fs = require('fs')
const path = require('path')

module.exports = (req, res) => {
  try {
    const { id } = req.query || {}
    const dataPath = path.join(process.cwd(), 'data', 'orders.json')
    if (!fs.existsSync(dataPath)) return res.status(404).json({ error: 'orders.json not found' })
    const raw = fs.readFileSync(dataPath, 'utf8')
    const orders = JSON.parse(raw)
    const q = String(id || '').replace(/[^0-9]/g, '')
    if (!q) return res.status(400).json({ error: 'missing id query param' })
    const found = orders.find((o) => Number(o.order_id || o.id) === Number(q))
    if (!found) return res.status(404).json({ error: 'order not found' })
    return res.status(200).json(found)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'failed to track order' })
  }
}
