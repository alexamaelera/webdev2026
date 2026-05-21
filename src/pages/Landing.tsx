import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

interface StoreInfo { description?: string; address?: string; phone?: string; email?: string; hours?: string }
interface Product { id:number; name:string; category:string; price:number; image:string }

function ensureImgPath(img?: string){
  if(!img) return '/img/placeholder.jpg'
  const s = String(img)
  if(s.startsWith('http') ) return s
  if(s.startsWith('/img/')) return s
  if(s.startsWith('/')) return '/img/' + s.split('/').pop()
  return '/img/' + s.split('/').pop()
}

function useScrollReveal(){
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(()=>{
    const obs = new IntersectionObserver(([entry])=>{ if(entry.isIntersecting) setIsVisible(true) },{ threshold: 0.15 })
    if(ref.current) obs.observe(ref.current)
    return ()=> obs.disconnect()
  },[])
  return { ref, isVisible }
}

export default function Landing(){
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({})
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuickLoginMenu, setShowQuickLoginMenu] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)

  const aboutSection = useScrollReveal()
  const menuSection = useScrollReveal()
  const contactSection = useScrollReveal()

  useEffect(()=>{ document.title = 'Lex & Nitch Cafe — Freshly Brewed, Made With Love' },[])

  useEffect(()=>{ fetchStoreInfo(); fetchFeatured() },[])

  async function fetchStoreInfo(){
    try{
      const r = await fetch('/data/store.json')
      const data = await r.json()
      setStoreInfo(data)
      setLoading(false)
    }catch(e){ console.error(e); setLoading(false) }
  }

  async function fetchFeatured(){
    try{
      const r = await fetch('/data/products.json')
      const data = await r.json()
      const all = Array.isArray(data) ? data as Product[] : []
      setFeaturedProducts(all.slice(0,4))
    }catch(e){ console.error(e) }
  }

  return (
    <div>
      <div className="landing-page">
        {/* Sticky Header */}
        <header className="landing-header">
          <div className="header-content">
            <div className="cafe-name"><h2>🌿 Lex & Nitch Cafe 🌿</h2></div>
            <div className="hamburger-menu">
              <div className="header-links">
                <a href="#about-section" className="header-link">About</a>
                <a href="#menu-section" className="header-link">Menu</a>
                <a href="#contact-section" className="header-link">Contact</a>
                <Link to="/login" className="header-link header-link-cta">Login</Link>
              </div>
              <button className="hamburger-btn" onClick={()=>setShowQuickLoginMenu(s=>!s)}>&#9776;</button>
              {showQuickLoginMenu && (
                <div className="quick-login-menu">
                  <a href="#about-section" className="quick-login-link">About</a>
                  <Link to="/menu"><a className="quick-login-link">Menu</a></Link>
                  <Link to="/login" className="quick-login-link">Login</Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="landing-hero">
          <div className="hero-decor decor-leaf-1">🍃</div>
          <div className="hero-decor decor-leaf-2">🌿</div>
          <div className="hero-decor decor-sparkle-1">✨</div>
          <div className="hero-decor decor-sparkle-2">✨</div>
          <div className="hero-noise-overlay"></div>

          <div className="hero-left-circle">
            <div className="circle-frame-wrapper">
              <div className="circle-frame"><img src="/img/c1.jpg" alt="Coffee" className="circle-image"/></div>
              <div className="circle-dashed-border"></div>
            </div>
          </div>

          <div className="hero-center">
            <h1 className="hero-title">The Best<br/><span className="coffee-text">Coffee</span><br/>For You</h1>
            <p className="hero-subtitle">Welcome to Lex & Nitch Cafe, where whimsical enchantment meets the calm of nature. Savor perfectly brewed coffee, delightful pastries, and treats crafted with love.</p>
            <Link to="/menu"><a className="btn btn-order"><span className="btn-order-text">ORDER NOW</span><div className="btn-shine"></div></a></Link>
          </div>

          <div className="hero-right-circle">
            <div className="circle-frame-wrapper">
              <div className="circle-frame"><img src="/img/c1.jpg" alt="Coffee" className="circle-image"/></div>
              <div className="circle-dashed-border reverse-spin"></div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about-section" className={`scroll-section about-section ${aboutSection.isVisible ? 'visible' : ''}`} ref={aboutSection.ref as any}>
          <div className="story-split">
            <div className="story-left">
              <div className="story-illustration"><img src="/img/k2.jpg" alt="Coffee" className="story-image"/></div>
              <div className="community-badge"><span className="badge-rating">5★</span><span className="badge-text">COMMUNITY RATING</span></div>
            </div>
            <div className="story-right">
              <div className="story-label">— OUR STORY</div>
              <h2 className="story-heading">A cafe grown<br/>from <em>love</em> &amp;<br/>good soil.</h2>
              <p className="story-text">{storeInfo.description || 'Lex & Nitch Cafe was born from a simple dream: to build a cozy corner where nature and coffee culture meet.'}</p>
              <ul className="story-list"><li>Ethically sourced, single-origin beans</li><li>Baked goods made fresh every morning</li><li>Plant-forward milk alternatives always available</li><li>Dog-friendly patio and nature-inspired interiors</li></ul>
            </div>
          </div>
        </section>

        {/* FEATURED */}
        <section id="menu-section" className={`scroll-section menu-preview-section ${menuSection.isVisible ? 'visible' : ''}`} ref={menuSection.ref as any}>
          <div className="section-inner">
            <div className="section-badge">Our Menu</div>
            <h2 className="section-title" style={{color:'#E8F4DA'}}>Featured Favorites</h2>
            <p className="section-description" style={{color:'rgba(255,255,255,0.75)'}}>A taste of what awaits you — handcrafted with passion.</p>
            <div className="featured-grid">{featuredProducts.map((product, idx)=> (
              <div key={product.id} className="featured-card" style={{animationDelay:`${idx*0.1}s`}}>
                <div className="featured-image"><img src={ensureImgPath(product.image)} alt={product.name}/></div>
                <div className="featured-info"><h3>{product.name}</h3><span className="featured-price">${product.price.toFixed(2)}</span></div>
              </div>
            ))}</div>
            <Link to="/menu"><a className="btn btn-order" style={{marginTop:'36px'}}>VIEW FULL MENU →</a></Link>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact-section" className={`scroll-section find-us-section ${contactSection.isVisible ? 'visible' : ''}`} ref={contactSection.ref as any}>
          <div className="find-us-split">
            <div className="find-us-left">
              <div className="find-us-label">— FIND US</div>
              <h2 className="find-us-heading">Come as you are.<br/>Stay as long<br/>as you <em>like</em>.</h2>
              <p className="find-us-desc">Tucked in a quiet corner with sunlit windows and the smell of fresh coffee. We're here whenever you need a pause from the day.</p>
              <div className="hours-container">
                <div className="hours-row"><span className="day">Mon — Fri</span><span className="time">7:00 AM — 9:00 PM</span><span className="badge-open">OPEN</span></div>
                <div className="hours-row"><span className="day">Saturday</span><span className="time">7:30 AM — 10:00 PM</span><span className="badge-open">OPEN</span></div>
                <div className="hours-row"><span className="day">Sunday</span><span className="time">8:00 AM — 7:00 PM</span><span className="badge-open">OPEN</span></div>
              </div>
            </div>
            <div className="find-us-right"><div className="map-graphic"><div className="map-grid-overlay"></div><div className="map-pin-container"><div className="map-pin"><div className="map-pin-inner"></div></div><div className="map-pin-label">LEX &amp; NITCH CAFE</div></div></div></div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="site-footer">
          <div className="footer-top">
            <div className="footer-col-brand"><h3 className="footer-brand-name"><em>Lex</em> &amp; Nitch Cafe</h3><p className="footer-brand-desc">Where whimsical enchantment meets the calm of nature. Every sip is a moment of magic.</p><div className="social-links"><a href="#" className="social-circle">ig</a><a href="#" className="social-circle">fb</a><a href="#" className="social-circle">tk</a></div></div>
            <div className="footer-col"><h4 className="footer-heading">EXPLORE</h4><ul className="footer-list"><li><Link to="/menu"><a>Menu</a></Link></li><li><a href="#about-section">About Us</a></li><li><a href="#contact-section">Visit</a></li><li><a href="#">Reservations</a></li></ul></div>
            <div className="footer-col"><h4 className="footer-heading">CONNECT</h4><ul className="footer-list"><li><a href="mailto:hello@lexnitch.ph">hello@lexnitch.ph</a></li><li><a href="tel:+639123456789">+63 912 345 6789</a></li><li><a href="#">Instagram</a></li></ul></div>
            <div className="footer-col"><h4 className="footer-heading">OFFERINGS</h4><ul className="footer-list"><li><a href="#">Gift Cards</a></li><li><a href="#">Bean Bags</a></li><li><a href="#">Private Events</a></li><li><a href="#">Merch</a></li></ul></div>
          </div>
          <div className="footer-bottom"><p>© 2026 Lex &amp; Nitch Cafe. All rights reserved.</p><p>Made with love 🌿</p></div>
        </footer>
      </div>

      {/* About Us Modal */}
      {showAboutModal && (
        <div className="about-modal-overlay" style={{display:'flex',position:'fixed',zIndex:9999,top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.5)',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)'}} onClick={()=>setShowAboutModal(false)}>
          <div className="about-modal-content" style={{background:'#fff',borderRadius:'20px',maxWidth:'420px',width:'90vw',padding:'36px 28px',boxShadow:'0 25px 80px rgba(0,0,0,0.25)'}} onClick={(e)=>e.stopPropagation()}>
            <button onClick={()=>setShowAboutModal(false)} style={{position:'absolute',top:'14px',right:'18px',fontSize:'1.2rem',background:'#f5f5f5',border:'none',cursor:'pointer',width:'32px',height:'32px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#666'}}>✕</button>
            <h2 style={{marginBottom:'12px',color:'#4A5F1F',fontSize:'1.4em'}}>About Lex &amp; Nitch Cafe</h2>
            <p style={{color:'#666',lineHeight:'1.7',fontSize:'0.95em'}}>{storeInfo.description || 'Welcome to Lex & Nitch Cafe!'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
