import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartContext'

export default function Header(){
  const { items } = useCart()
  const count = Object.keys(items).length
  const navigate = useNavigate()

  function logout(){
    localStorage.removeItem('user_v1')
    navigate('/')
  }

  const user = (()=>{ try{ return JSON.parse(localStorage.getItem('user_v1')||'null') }catch(e){ return null } })()

  return (
    <header className="app-header">
      <div className="nav">
        <Link to="/" className="logo">☕ Lex & Nitch Cafe</Link>
        <nav className="nav-links">
          <Link to="/menu">Menu</Link>
          <Link to="#" onClick={(e)=>{e.preventDefault(); document.getElementById('aboutModal')?.classList.add('show')}}>About Us</Link>
          <Link to="/menu">🛒 Cart <span className="cart-badge">{count}</span></Link>
          {!user ? <Link to="/login">Login</Link> : <button className="btn-logout" onClick={logout}>Logout</button>}
        </nav>
      </div>
    </header>
  )
}
