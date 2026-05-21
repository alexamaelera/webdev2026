import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

type CartItem = { id:number; name:string; price:number; image:string; quantity:number }

type CartContextType = {
  items: Record<number,CartItem>
  add: (p: CartItem, qty?:number)=>void
  remove: (id:number)=>void
  clear: ()=>void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }){
  const [items, setItems] = useState<Record<number,CartItem>>(()=>{
    try{ const raw = localStorage.getItem('cart_v1'); return raw? JSON.parse(raw): {} }catch(e){ return {} }
  })

  useEffect(()=>{ localStorage.setItem('cart_v1', JSON.stringify(items)) },[items])

  const add = (p:CartItem, qty=1)=>{
    setItems(prev=>{
      const copy = {...prev}
      if(copy[p.id]) copy[p.id].quantity += qty
      else copy[p.id] = {...p, quantity: qty}
      return copy
    })
  }
  const remove = (id:number)=> setItems(prev=>{ const c={...prev}; delete c[id]; return c })
  const clear = ()=> setItems({})

  return <CartContext.Provider value={{items, add, remove, clear}}>{children}</CartContext.Provider>
}

export function useCart(){
  const ctx = useContext(CartContext)
  if(!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
