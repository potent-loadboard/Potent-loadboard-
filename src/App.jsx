import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { scoreFor, estimateFuelCost } from './lib/loadScore'
import { resizeImage } from './lib/resizeImage'

// ── CONFIG ────────────────────────────────────────────────────────
const VEHICLES = ['Box Truck','Cargo Van','Sprinter Van','Cargo SUV / Minivan']
const CATEGORIES = ['Furniture','Appliances','Pallets','Retail Goods','Equipment','Event Equipment','Boxes / Packages','Specialty Items','Junk Removal','Moving']
const REQUIREMENTS = ['Liftgate','Dolly','Pallet Jack','No-touch freight','Two-person crew','Dock available','Blanket wrap']
const POST_FEE = 25
const UNLIMITED_FEE = 100
const DRIVER_FEE = 25
const LISTING_DAYS = 14
const ADMIN_PW = 'POTENTBOARD2026'
const MY_POSTINGS_KEY = 'potent_my_postings'
const DRIVER_EMAIL_KEY = 'potent_driver_email'
const POSTER_EMAIL_KEY = 'potent_poster_email'

// ── COLORS ───────────────────────────────────────────────────────
const C = { bg:'#080808',card:'#111',surface:'#161616',border:'#222',orange:'#F0E000',dim:'#888',faint:'#444',white:'#F2F2F2',green:'#1DB954',red:'#E53E3E',blue:'#4299E1' }
const ff = "'DM Sans','Segoe UI',Arial,sans-serif"

// ── DEMO DATA (admin toggle only — never saved to DB) ─────────────
const DEMO_LOADS = [
  {id:'demo-1',category:'Pallets',vehicle:'Box Truck',pickup_city:'Atlanta, GA',delivery_city:'Charlotte, NC',miles:245,price:1100,weight:'2,800 lbs',dimensions:'4 pallets 48x40',requirements:['Pallet Jack','Dock available'],photos:[],poster_name:'Southeast Distribution',contact_phone:'(404) 771-2200',contact_email:'loads@sedist.com',status:'active',paid:true,featured:true,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+10*864e5).toISOString()},
  {id:'demo-2',category:'Furniture',vehicle:'Box Truck',pickup_city:'Savannah, GA',delivery_city:'Jacksonville, FL',miles:140,price:620,weight:'600 lbs',dimensions:'3 pieces',requirements:['Two-person crew','Liftgate'],photos:[],poster_name:'Marcus T.',contact_phone:'(912) 445-8821',contact_email:'',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-2*3600000).toISOString(),expires_at:new Date(Date.now()+12*864e5).toISOString()},
  {id:'demo-3',category:'Appliances',vehicle:'Cargo Van',pickup_city:'Conyers, GA',delivery_city:'Decatur, GA',miles:28,price:280,weight:'350 lbs',dimensions:'Washer + dryer',requirements:['Liftgate'],photos:[],poster_name:'HomeGoods Direct',contact_phone:'(770) 334-9901',contact_email:'ops@homegoods.com',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-5*3600000).toISOString(),expires_at:new Date(Date.now()+13*864e5).toISOString()},
  {id:'demo-4',category:'Equipment',vehicle:'Box Truck',pickup_city:'Chattanooga, TN',delivery_city:'Atlanta, GA',miles:118,price:750,weight:'1,800 lbs',dimensions:'Compressor + tools',requirements:['Liftgate','Pallet Jack'],photos:[],poster_name:'BuildRight Co.',contact_phone:'(423) 556-7722',contact_email:'',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-8*3600000).toISOString(),expires_at:new Date(Date.now()+11*864e5).toISOString()},
  {id:'demo-5',category:'Boxes / Packages',vehicle:'Sprinter Van',pickup_city:'Atlanta, GA',delivery_city:'Macon, GA',miles:83,price:310,weight:'400 lbs',dimensions:'12 boxes',requirements:['No-touch freight'],photos:[],poster_name:'QuickShip LLC',contact_phone:'(404) 882-3341',contact_email:'ops@quickship.com',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-12*3600000).toISOString(),expires_at:new Date(Date.now()+10*864e5).toISOString()},
  {id:'demo-6',category:'Moving',vehicle:'Box Truck',pickup_city:'Covington, GA',delivery_city:'Nashville, TN',miles:278,price:1100,weight:'900 lbs',dimensions:'2BR apartment',requirements:['Two-person crew','No-touch freight'],photos:[],poster_name:'Heritage Movers',contact_phone:'(770) 552-3849',contact_email:'',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-18*3600000).toISOString(),expires_at:new Date(Date.now()+9*864e5).toISOString()},
  {id:'demo-7',category:'Retail Goods',vehicle:'Box Truck',pickup_city:'Atlanta, GA',delivery_city:'Memphis, TN',miles:382,price:1450,weight:'2,800 lbs',dimensions:'3 pallets',requirements:['No-touch freight','Dock available'],photos:[],poster_name:'Southeast Distribution',contact_phone:'(404) 771-2200',contact_email:'loads@sedist.com',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-24*3600000).toISOString(),expires_at:new Date(Date.now()+8*864e5).toISOString()},
  {id:'demo-8',category:'Event Equipment',vehicle:'Box Truck',pickup_city:'Atlanta, GA',delivery_city:'Columbus, GA',miles:107,price:680,weight:'1,200 lbs',dimensions:'Tables, chairs, stage',requirements:['Two-person crew','Liftgate'],photos:[],poster_name:'Atlanta Event Co.',contact_phone:'(404) 991-0044',contact_email:'events@atlantaeventco.com',status:'active',paid:true,featured:false,created_at:new Date(Date.now()-30*3600000).toISOString(),expires_at:new Date(Date.now()+7*864e5).toISOString()},
]

// ── HELPERS ──────────────────────────────────────────────────────
function timeAgo(d){if(!d)return '';const m=Math.floor((Date.now()-new Date(d).getTime())/60000);if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago';}
function daysLeft(d){if(!d)return null;const days=Math.ceil((new Date(d).getTime()-Date.now())/864e5);return days;}
function getMyPostingRefs(){try{return JSON.parse(localStorage.getItem(MY_POSTINGS_KEY)||'[]')}catch{return []}}
function saveMyPostingRef(id,token){const r=getMyPostingRefs();r.push({postingId:id,editToken:token});localStorage.setItem(MY_POSTINGS_KEY,JSON.stringify(r));}
function getDriverEmail(){try{return localStorage.getItem(DRIVER_EMAIL_KEY)||''}catch{return ''}}
function saveDriverEmail(e){try{localStorage.setItem(DRIVER_EMAIL_KEY,e)}catch{}}
function getPosterEmail(){try{return localStorage.getItem(POSTER_EMAIL_KEY)||''}catch{return ''}}
function savePosterEmail(e){try{localStorage.setItem(POSTER_EMAIL_KEY,e)}catch{}}

// ── UI ATOMS ─────────────────────────────────────────────────────
function Btn({children,onClick,disabled,variant='primary',style={}}){
  const bg=variant==='ghost'?'transparent':variant==='danger'?C.red:variant==='muted'?C.surface:C.orange
  const col=variant==='primary'?'#000':variant==='ghost'?C.orange:C.white
  const brd=variant==='ghost'?`1.5px solid ${C.orange}`:`1px solid ${variant==='danger'?C.red:variant==='muted'?C.border:'transparent'}`
  return <button onClick={onClick} disabled={disabled} style={{background:bg,color:col,border:brd,borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:disabled?'not-allowed':'pointer',fontFamily:ff,opacity:disabled?0.4:1,...style}}>{children}</button>
}
function Field({label,children}){return <div style={{marginBottom:12}}><div style={{fontSize:10,color:C.dim,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.8}}>{label}</div>{children}</div>}
function inp(extra={}){return{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.white,padding:'9px 12px',fontSize:13,width:'100%',outline:'none',fontFamily:ff,boxSizing:'border-box',...extra}}
function Card({children,style={}}){return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px',marginBottom:12,...style}}>{children}</div>}
function Badge({c=C.orange,children}){return <span style={{background:c+'22',color:c,border:`1px solid ${c}44`,borderRadius:5,padding:'2px 8px',fontSize:10,fontWeight:700}}>{children}</span>}

// ── LOAD ROW (Craigslist style) ───────────────────────────────────
function LoadRow({load,onOpen}){
  const rate=load.price/load.miles
  const s=scoreFor(rate)
  const dl=daysLeft(load.expires_at)
  return(
    <div onClick={()=>onOpen(load)} style={{borderBottom:`1px solid ${C.border}`,padding:'10px 4px',cursor:'pointer',display:'flex',gap:12,alignItems:'flex-start'}} className="load-row">
      <div style={{flexShrink:0,paddingTop:2}}>
        {load.featured&&<span style={{color:C.orange,fontSize:11,fontWeight:700}}>⭐ </span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,color:C.blue,textDecoration:'underline',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          {load.category} — {load.pickup_city} → {load.delivery_city} ({load.miles}mi, {load.vehicle})
        </div>
        <div style={{fontSize:11,color:C.dim}}>
          <span style={{color:C.orange,fontWeight:700}}>${load.price}</span>
          {' · '}<span style={{color:s.color,fontWeight:600}}>[{s.label}] ${rate.toFixed(2)}/mi</span>
          {load.weight&&` · ${load.weight}`}
          {load.photos?.length>0&&<span style={{color:C.dim}}> [{load.photos.length} pic{load.photos.length!==1?'s':''}]</span>}
          {' · '}<span>{timeAgo(load.created_at)}</span>
          {dl!==null&&dl<=3&&<span style={{color:C.red,marginLeft:6}}>[expires in {dl}d]</span>}
        </div>
      </div>
    </div>
  )
}

// ── LOAD DETAIL ───────────────────────────────────────────────────
function LoadDetail({load,onClose,driverEmail,onNeedAccess}){
  const rate=load.price/load.miles
  const fuel=estimateFuelCost(load.miles,load.vehicle)
  const s=scoreFor(rate)
  const dl=daysLeft(load.expires_at)
  const [lb,setLb]=useState(null)
  const [showMsg,setShowMsg]=useState(false)
  const [msg,setMsg]=useState({name:'',phone:'',text:''})
  const [sent,setSent]=useState(false)
  const [sending,setSending]=useState(false)
  const [flagged,setFlagged]=useState(false)
  const hasAccess=!!driverEmail

  async function sendMsg(){
    if(!msg.text.trim())return
    setSending(true)
    try{
      const res=await fetch('/api/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postingId:load.id,senderEmail:driverEmail,senderName:msg.name,senderPhone:msg.phone,message:msg.text})})
      if(!res.ok)throw new Error('Failed')
      setSent(true)
    }catch(e){alert(e.message)}finally{setSending(false)}
  }

  async function flagLoad(){
    if(flagged)return
    await fetch('/api/flag-posting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postingId:load.id,reason:'User flagged'})})
    setFlagged(true)
  }

  return(
    <div style={{maxWidth:660,margin:'0 auto',padding:'12px 16px 60px',fontFamily:ff}}>
      {lb&&<div onClick={()=>setLb(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.9)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out'}}>
        <img src={lb} alt="" style={{maxWidth:'95%',maxHeight:'95%',objectFit:'contain'}}/>
      </div>}

      <button onClick={onClose} style={{background:'none',border:'none',color:C.dim,fontSize:13,cursor:'pointer',marginBottom:12,fontFamily:ff}}>← back</button>

      <div style={{fontSize:20,fontWeight:900,color:C.white,marginBottom:2}}>
        {load.featured&&'⭐ '}{load.category}
      </div>
      <div style={{fontSize:14,color:C.dim,marginBottom:12}}>
        {load.pickup_city} → {load.delivery_city} · posted {timeAgo(load.created_at)}
        {dl!==null&&<span style={{color:dl<=3?C.red:C.dim}}> · expires in {dl} day{dl!==1?'s':''}</span>}
        {' · load #'+load.id.slice(0,8)}
      </div>

      {load.photos?.length>0&&<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {load.photos.map((u,i)=><img key={i} src={u} onClick={()=>setLb(u)} style={{width:120,height:90,objectFit:'cover',borderRadius:8,cursor:'zoom-in',border:`1px solid ${C.border}`}}/>)}
      </div>}

      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
        <tbody>
          {[['price',<b style={{color:C.orange}}>${load.price}</b>],['distance',`${load.miles} miles`],['rate/mile',<span style={{color:s.color,fontWeight:700}}>${rate.toFixed(2)} [{s.label}]</span>],['vehicle needed',load.vehicle],['weight',load.weight||'—'],['dimensions',load.dimensions||'—'],['requirements',load.requirements?.length?load.requirements.join(', '):'none listed'],['est. fuel cost','$'+fuel.toFixed(0)],['est. net profit','$'+(load.price-fuel).toFixed(0)]].map(([l,v])=>(
            <tr key={l} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:'6px 8px',color:C.dim,width:140}}>{l}</td>
              <td style={{padding:'6px 8px',color:C.white}}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{background:s.color+'12',border:`1px solid ${s.color}33`,borderRadius:8,padding:'9px 14px',marginBottom:16,fontSize:12,color:s.color}}>{s.note}</div>

      {/* Contact section */}
      {hasAccess?(
        <Card>
          <div style={{fontSize:13,fontWeight:700,color:C.white,marginBottom:10}}>Contact the Poster</div>
          <div style={{fontSize:13,color:C.white,marginBottom:4}}>{load.poster_name||'Poster'}</div>
          {load.contact_phone&&<a href={`tel:${load.contact_phone}`} style={{display:'block',fontSize:16,fontWeight:700,color:C.orange,textDecoration:'none',marginBottom:4}}>📱 {load.contact_phone}</a>}
          {load.contact_email&&<div style={{fontSize:13,color:C.dim,marginBottom:12}}>✉ {load.contact_email}</div>}
          {!sent&&(!showMsg
            ?<button onClick={()=>setShowMsg(true)} style={{background:'transparent',border:`1.5px solid ${C.orange}`,color:C.orange,borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:ff}}>Send Message</button>
            :<div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
                <Field label="Your Name"><input value={msg.name} onChange={e=>setMsg(p=>({...p,name:e.target.value}))} placeholder="Marcus Johnson" style={inp()}/></Field>
                <Field label="Your Phone"><input value={msg.phone} onChange={e=>setMsg(p=>({...p,phone:e.target.value}))} placeholder="(404) 555-0000" style={inp()}/></Field>
              </div>
              <Field label="Message"><textarea value={msg.text} onChange={e=>setMsg(p=>({...p,text:e.target.value}))} placeholder="I'm interested. I have a 26ft box truck available..." rows={3} style={inp({resize:'vertical'})}/></Field>
              <div style={{display:'flex',gap:8}}>
                <Btn onClick={sendMsg} disabled={sending||!msg.text.trim()} style={{flex:2}}>{sending?'Sending...':'Send'}</Btn>
                <Btn onClick={()=>setShowMsg(false)} variant='ghost' style={{flex:1}}>Cancel</Btn>
              </div>
            </div>
          )}
          {sent&&<div style={{background:C.green+'20',border:`1px solid ${C.green}44`,borderRadius:8,padding:'10px',fontSize:13,color:C.green,fontWeight:700}}>✅ Message sent!</div>}
        </Card>
      ):(
        <div style={{background:C.orange+'10',border:`2px solid ${C.orange}`,borderRadius:12,padding:'18px',textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:800,color:C.white,marginBottom:6}}>See Contact Info</div>
          <div style={{fontSize:12,color:C.dim,marginBottom:14,lineHeight:1.7}}>Driver access is ${DRIVER_FEE} one time. See contact info on every load forever. No monthly fees.</div>
          <Btn onClick={onNeedAccess} style={{padding:'11px 28px'}}>Get Driver Access — ${DRIVER_FEE}</Btn>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
        <div style={{fontSize:11,color:C.faint,maxWidth:440,lineHeight:1.5}}>POTENT does not vet users. Contact posters directly and use your own judgment.</div>
        <button onClick={flagLoad} style={{background:'none',border:'none',color:flagged?C.dim:C.faint,fontSize:11,cursor:'pointer',fontFamily:ff}}>{flagged?'✓ Flagged':'⚑ Flag'}</button>
      </div>
    </div>
  )
}

// ── POST FORM ────────────────────────────────────────────────────
function PostForm({onBack}){
  const [f,setF]=useState({category:CATEGORIES[0],vehicle:VEHICLES[0],pickup:'',delivery:'',miles:'',price:'',weight:'',dimensions:''})
  const [reqs,setReqs]=useState([])
  const [poster,setPoster]=useState({name:'',phone:'',email:''})
  const [files,setFiles]=useState([])
  const [uploading,setUploading]=useState(false)
  const [err,setErr]=useState('')
  const [plan,setPlan]=useState('single')
  const posterEmail=getPosterEmail()

  function set(k,v){setF(p=>({...p,[k]:v}))}
  function toggleReq(r){setReqs(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r])}
  const rate=f.miles&&f.price?Number(f.price)/Number(f.miles):null
  const s=rate?scoreFor(rate):null

  async function submit(){
    setErr('')
    if(!f.pickup||!f.delivery||!f.miles||!f.price){setErr('Pickup city, delivery city, miles, and price are required.');return}
    if(!poster.phone&&!poster.email){setErr('Add a phone or email so drivers can reach you.');return}
    if(files.length===0){setErr('At least one photo is required.');return}

    setUploading(true)
    try{
      const postingId=crypto.randomUUID()
      const editToken=crypto.randomUUID()
      const photoUrls=[]
      for(const file of files){
        const compressed=await resizeImage(file)
        const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const {error:ue}=await supabase.storage.from('load-photos').upload(path,compressed,{contentType:'image/jpeg'})
        if(ue)throw ue
        const {data:pd}=supabase.storage.from('load-photos').getPublicUrl(path)
        photoUrls.push(pd.publicUrl)
      }
      const {error:ie}=await supabase.from('postings').insert({
        id:postingId,edit_token:editToken,category:f.category,vehicle:f.vehicle,
        pickup_city:f.pickup,delivery_city:f.delivery,miles:Number(f.miles),price:Number(f.price),
        weight:f.weight,dimensions:f.dimensions,requirements:reqs,photos:photoUrls,
        poster_name:poster.name||'Anonymous',contact_phone:poster.phone,contact_email:poster.email,
        status:'active',paid:false,
      })
      if(ie)throw ie
      saveMyPostingRef(postingId,editToken)

      // Route to correct checkout based on plan
      const endpoint = plan==='unlimited' ? '/api/create-poster-subscription' : '/api/create-checkout-session'
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postingId, email:poster.email})})
      const d=await res.json()
      if(!res.ok||!d.url)throw new Error(d.error||'Could not start checkout')
      window.location.href=d.url
    }catch(e){setErr(e.message||'Something went wrong.');setUploading(false)}
  }

  return(
    <div style={{maxWidth:520,margin:'0 auto',padding:'16px 16px 60px',fontFamily:ff}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:C.dim,fontSize:13,cursor:'pointer',marginBottom:16,fontFamily:ff}}>← back</button>
      <div style={{fontSize:20,fontWeight:900,color:C.white,marginBottom:4}}>Post a Load</div>
      <div style={{fontSize:12,color:C.dim,marginBottom:16}}>Box trucks, cargo vans, sprinter vans, and cargo SUVs only. No hot shots. No semis.</div>

      {/* Plan selection */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[{key:'single',title:'Single Post',price:`$${POST_FEE}`,desc:'One post, 14 days live.'},{key:'unlimited',title:'Unlimited',price:`$${UNLIMITED_FEE}/mo`,desc:'Post as many as you want.'}].map(p=>(
          <div key={p.key} onClick={()=>setPlan(p.key)} style={{background:C.card,border:`2px solid ${plan===p.key?C.orange:C.border}`,borderRadius:10,padding:'12px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:11,color:C.dim,marginBottom:2}}>{p.title}</div>
            <div style={{fontSize:20,fontWeight:900,color:plan===p.key?C.orange:C.white}}>{p.price}</div>
            <div style={{fontSize:10,color:C.dim,marginTop:2}}>{p.desc}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
          <Field label="Category">
            <select value={f.category} onChange={e=>set('category',e.target.value)} style={inp({colorScheme:'dark'})}>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Vehicle Needed">
            <select value={f.vehicle} onChange={e=>set('vehicle',e.target.value)} style={inp({colorScheme:'dark'})}>
              {VEHICLES.map(v=><option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Pickup City, State"><input value={f.pickup} onChange={e=>set('pickup',e.target.value)} placeholder="Atlanta, GA" style={inp()}/></Field>
        <Field label="Delivery City, State"><input value={f.delivery} onChange={e=>set('delivery',e.target.value)} placeholder="Charlotte, NC" style={inp()}/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
          <Field label="Miles (estimate)"><input type="number" value={f.miles} onChange={e=>set('miles',e.target.value)} placeholder="245" style={inp()}/></Field>
          <Field label="Your Offer ($)"><input type="number" value={f.price} onChange={e=>set('price',e.target.value)} placeholder="1250" style={inp()}/></Field>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
          <Field label="Weight (optional)"><input value={f.weight} onChange={e=>set('weight',e.target.value)} placeholder="800 lbs" style={inp()}/></Field>
          <Field label="Dimensions (optional)"><input value={f.dimensions} onChange={e=>set('dimensions',e.target.value)} placeholder="4 pallets, 48x40" style={inp()}/></Field>
        </div>

        {s&&<div style={{background:s.color+'12',border:`1px solid ${s.color}33`,borderRadius:7,padding:'8px 12px',marginBottom:10,fontSize:12,color:s.color,fontWeight:700}}>[{s.label}] ${rate.toFixed(2)}/mi — {s.note}</div>}

        <Field label="Requirements">
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {REQUIREMENTS.map(r=><div key={r} onClick={()=>toggleReq(r)} style={{border:`1px solid ${reqs.includes(r)?C.orange:C.border}`,borderRadius:6,padding:'5px 10px',cursor:'pointer',background:reqs.includes(r)?C.orange+'18':'transparent',fontSize:11,color:reqs.includes(r)?C.orange:C.dim}}>{r}</div>)}
          </div>
        </Field>
      </Card>

      <Card>
        <div style={{fontSize:12,fontWeight:700,color:C.white,marginBottom:8}}>Your Contact Info</div>
        <div style={{fontSize:11,color:C.dim,marginBottom:10}}>Only drivers with paid access see this.</div>
        <Field label="Name / Company"><input value={poster.name} onChange={e=>setPoster(p=>({...p,name:e.target.value}))} placeholder="Jane at Acme Co" style={inp()}/></Field>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
          <Field label="Phone"><input value={poster.phone} onChange={e=>setPoster(p=>({...p,phone:e.target.value}))} placeholder="(555) 555-5555" style={inp()}/></Field>
          <Field label="Email"><input type="email" value={poster.email} onChange={e=>setPoster(p=>({...p,email:e.target.value}))} placeholder="jane@acme.com" style={inp()}/></Field>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:12,fontWeight:700,color:C.white,marginBottom:6}}>Photos (required)</div>
        <div style={{fontSize:11,color:C.dim,marginBottom:8}}>Show drivers what they're moving. Better photos = faster pickup.</div>
        <input type="file" accept="image/*" multiple onChange={e=>setFiles(Array.from(e.target.files))} style={{fontSize:12,color:C.dim,width:'100%'}}/>
        {files.length>0&&<div style={{fontSize:11,color:C.green,marginTop:6}}>✓ {files.length} photo{files.length!==1?'s':''} selected</div>}
      </Card>

      {err&&<div style={{background:C.red+'12',border:`1px solid ${C.red}33`,borderRadius:8,padding:'10px',marginBottom:10,fontSize:12,color:C.red}}>{err}</div>}

      <Btn onClick={submit} disabled={uploading} style={{width:'100%',padding:'13px',fontSize:14}}>
        {uploading?'Uploading...':`Post & Pay — ${plan==='unlimited'?`$${UNLIMITED_FEE}/mo`:`$${POST_FEE}`}`}
      </Btn>
      <div style={{fontSize:10,color:C.faint,textAlign:'center',marginTop:8}}>Goes live immediately after payment. Listed for {LISTING_DAYS} days.</div>
    </div>
  )
}

// ── DRIVER SIGNUP ─────────────────────────────────────────────────
function DriverSignup({onBack}){
  const [email,setEmail]=useState('')
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [company,setCompany]=useState('')
  const [loading,setLoading]=useState(false)
  const [err,setErr]=useState('')
  const [checkEmail,setCheckEmail]=useState('')
  const [checking,setChecking]=useState(false)
  const existing=getDriverEmail()

  async function subscribe(){
    if(!email||!email.includes('@')){setErr('Valid email required');return}
    setLoading(true);setErr('')
    try{
      const res=await fetch('/api/create-driver-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.toLowerCase().trim(),name,phone,company})})
      const d=await res.json()
      if(!res.ok||!d.url)throw new Error(d.error||'Could not start checkout')
      window.location.href=d.url
    }catch(e){setErr(e.message);setLoading(false)}
  }

  async function verify(){
    if(!checkEmail)return
    setChecking(true)
    try{
      const res=await fetch('/api/check-driver-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:checkEmail.toLowerCase().trim()})})
      const d=await res.json()
      if(d.access){saveDriverEmail(checkEmail.toLowerCase().trim());alert(`✅ Access confirmed! You're in as ${checkEmail}.`);window.location.reload()}
      else alert('No active access found for that email.')
    }catch{alert('Could not verify. Try again.')}finally{setChecking(false)}
  }

  return(
    <div style={{maxWidth:460,margin:'0 auto',padding:'16px 16px 60px',fontFamily:ff}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:C.dim,fontSize:13,cursor:'pointer',marginBottom:16,fontFamily:ff}}>← back</button>
      <div style={{fontSize:20,fontWeight:900,color:C.white,marginBottom:4}}>Driver Access</div>
      <div style={{fontSize:12,color:C.dim,marginBottom:20,lineHeight:1.7}}>One-time ${DRIVER_FEE}. See the phone number and email on every load posted. Contact posters directly. No monthly fees. Yours forever.</div>

      {existing&&<div style={{background:C.green+'18',border:`1px solid ${C.green}44`,borderRadius:10,padding:'12px 14px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:C.green}}>✅ Active Access</div>
        <div style={{fontSize:11,color:C.dim,marginTop:2}}>Logged in as {existing}</div>
        <button onClick={()=>{saveDriverEmail('');window.location.reload()}} style={{background:'none',border:'none',color:C.dim,fontSize:11,cursor:'pointer',marginTop:4,fontFamily:ff}}>Log out</button>
      </div>}

      <Card>
        <div style={{fontSize:12,fontWeight:700,color:C.white,marginBottom:8}}>Already have access? Verify your email</div>
        <div style={{display:'flex',gap:8}}>
          <input value={checkEmail} onChange={e=>setCheckEmail(e.target.value)} placeholder="your@email.com" type="email" style={inp({flex:1})}/>
          <Btn onClick={verify} disabled={checking}>{checking?'...':'Verify'}</Btn>
        </div>
      </Card>

      <div style={{textAlign:'center',color:C.faint,fontSize:11,margin:'4px 0 12px'}}>— or get access below —</div>

      <Card style={{background:C.orange+'08',borderColor:C.orange+'44'}}>
        <div style={{fontSize:22,fontWeight:900,color:C.orange,textAlign:'center',marginBottom:4}}>${DRIVER_FEE} one time</div>
        <div style={{fontSize:11,color:C.dim,textAlign:'center',marginBottom:12}}>Lifetime access. No subscriptions. No recurring charges.</div>
        {['Direct phone & email for every poster','Message posters through the platform','See all loads including new ones as posted','Rate scoring — know if a load is worth it','Access never expires'].map(i=><div key={i} style={{display:'flex',gap:8,fontSize:12,color:C.dim,padding:'3px 0'}}><span style={{color:C.green}}>✓</span>{i}</div>)}
      </Card>

      <Field label="Email *"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@yourcompany.com" style={inp()}/></Field>
      <Field label="Your Name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Marcus Johnson" style={inp()}/></Field>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
        <Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(404) 000-0000" style={inp()}/></Field>
        <Field label="Company (optional)"><input value={company} onChange={e=>setCompany(e.target.value)} placeholder="MJ Transport" style={inp()}/></Field>
      </div>

      {err&&<div style={{background:C.red+'12',border:`1px solid ${C.red}33`,borderRadius:8,padding:'10px',marginBottom:10,fontSize:12,color:C.red}}>{err}</div>}
      <Btn onClick={subscribe} disabled={loading||!email} style={{width:'100%',padding:'13px',fontSize:14}}>
        {loading?'Redirecting...':`Get Access — $${DRIVER_FEE}`}
      </Btn>
    </div>
  )
}

// ── MY POSTINGS ───────────────────────────────────────────────────
function MyPostings({onBack}){
  const [postings,setPostings]=useState([])
  const [loading,setLoading]=useState(true)
  const refs=useMemo(()=>getMyPostingRefs(),[])

  async function load(){
    setLoading(true)
    if(!refs.length){setPostings([]);setLoading(false);return}
    const res=await fetch('/api/my-postings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:refs})})
    const d=await res.json()
    setPostings(d.postings||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  async function act(action,postingId,updates){
    const ref=refs.find(r=>r.postingId===postingId)
    if(!ref)return
    if(action==='renew'){
      await fetch('/api/renew-posting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postingId,editToken:ref.editToken})})
    } else {
      await fetch('/api/manage-posting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postingId,editToken:ref.editToken,action,updates})})
    }
    load()
  }

  return(
    <div style={{maxWidth:560,margin:'0 auto',padding:'16px 16px 60px',fontFamily:ff}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:C.dim,fontSize:13,cursor:'pointer',marginBottom:16,fontFamily:ff}}>← back</button>
      <div style={{fontSize:18,fontWeight:900,color:C.white,marginBottom:4}}>My Postings</div>
      <div style={{fontSize:11,color:C.dim,marginBottom:16}}>Saved on this device only. No account needed.</div>
      {loading&&<div style={{color:C.dim,textAlign:'center',padding:40}}>Loading...</div>}
      {!loading&&!postings.length&&<div style={{color:C.dim,textAlign:'center',padding:40}}>No postings on this device yet.</div>}
      {postings.map(p=>{
        const dl=daysLeft(p.expires_at)
        return <Card key={p.id}>
          <div style={{fontWeight:700,color:C.white,marginBottom:4}}>{p.category} — {p.pickup_city} → {p.delivery_city}</div>
          <div style={{fontSize:11,color:C.dim,marginBottom:8,lineHeight:1.7}}>
            ${p.price} · {p.status}
            {' · '}{p.paid?<span style={{color:C.green}}>✅ paid</span>:<span style={{color:C.orange}}>⏳ payment pending</span>}
            {dl!==null&&<span style={{color:dl<=3?C.red:C.dim}}> · {dl>0?`${dl} days left`:'EXPIRED'}</span>}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {p.status==='active'&&<>
              {dl!==null&&dl<=3&&<Btn onClick={()=>act('renew',p.id)} variant='ghost' style={{fontSize:11,padding:'5px 10px'}}>🔄 Renew 14 days</Btn>}
              <Btn onClick={()=>act('mark_filled',p.id)} variant='muted' style={{fontSize:11,padding:'5px 10px'}}>Mark Filled</Btn>
              <Btn onClick={()=>{if(confirm('Delete?'))act('delete',p.id)}} variant='danger' style={{fontSize:11,padding:'5px 10px'}}>Delete</Btn>
            </>}
            {(p.status==='filled'||p.status==='expired')&&<Btn onClick={()=>act('reactivate',p.id)} variant='ghost' style={{fontSize:11,padding:'5px 10px'}}>Reactivate</Btn>}
          </div>
        </Card>
      })}
    </div>
  )
}

// ── ADMIN ─────────────────────────────────────────────────────────
function Admin({onBack}){
  const [pw,setPw]=useState('')
  const [authed,setAuthed]=useState(false)
  const [data,setData]=useState({postings:[],members:[],drivers:[],messages:[]})
  const [err,setErr]=useState('')
  const [tab,setTab]=useState('live')
  const [demoOn,setDemoOn]=useState(false)

  async function login(){
    if(pw!==ADMIN_PW){setErr('Wrong password');return}
    const res=await fetch('/api/admin-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw,action:'list_all'})})
    const d=await res.json()
    if(!res.ok){setErr(d.error||'Failed');return}
    setData(d)
    setAuthed(true)
  }

  async function act(action,id,extra){
    await fetch('/api/admin-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw,action,postingId:id,data:extra})})
    const res=await fetch('/api/admin-actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw,action:'list_all'})})
    setData(await res.json())
  }

  if(!authed) return(
    <div style={{maxWidth:300,margin:'60px auto',padding:'0 16px',fontFamily:ff}}>
      <div style={{fontSize:18,fontWeight:900,color:C.white,marginBottom:12}}>Admin</div>
      <Field label="Password"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} style={inp()}/></Field>
      {err&&<div style={{color:C.red,fontSize:12,marginBottom:8}}>{err}</div>}
      <Btn onClick={login} style={{width:'100%'}}>Log In</Btn>
    </div>
  )

  const live=data.postings?.filter(p=>p.paid&&p.status==='active')||[]
  const potentMatch=live.filter(p=>p.potent_match)
  const unread=data.messages?.filter(m=>!m.read)||[]
  const activePoster=data.members?.filter(m=>m.active)||[]
  const activeDriver=data.drivers?.filter(d=>d.active)||[]

  const tabs=[['live',`Live (${live.length})`],['potent',`🚛 POTENT (${potentMatch.length})`],['messages',`Messages (${unread.length} new)`],['posters',`Posters (${activePoster.length})`],['drivers',`Drivers (${activeDriver.length})`]]

  return(
    <div style={{maxWidth:860,margin:'0 auto',padding:'16px',fontFamily:ff}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:900,color:C.white}}>Admin Dashboard</div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:11,color:C.dim}}>Demo Mode:</span>
          <div onClick={()=>setDemoOn(!demoOn)} style={{width:44,height:24,borderRadius:12,background:demoOn?C.orange:C.border,cursor:'pointer',position:'relative',transition:'background .2s'}}>
            <div style={{position:'absolute',top:3,left:demoOn?22:3,width:18,height:18,borderRadius:'50%',background:C.white,transition:'left .2s'}}/>
          </div>
          <span style={{fontSize:11,color:demoOn?C.orange:C.dim}}>{demoOn?'ON — showing demo loads':'OFF — real board'}</span>
        </div>
      </div>

      {demoOn&&<div style={{background:C.orange+'12',border:`1px solid ${C.orange}`,borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:C.orange}}>⚡ Demo mode ON — {DEMO_LOADS.length} sample loads showing on the board. Visitors see a full board. Toggle off to hide demo loads. No data is saved to Supabase.</div>}

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {tabs.map(([key,label])=><button key={key} onClick={()=>setTab(key)} style={{border:'none',borderRadius:8,padding:'7px 14px',cursor:'pointer',background:tab===key?C.orange:'transparent',color:tab===key?'#000':C.dim,fontWeight:700,fontFamily:ff,fontSize:11}}>{label}</button>)}
      </div>

      {tab==='live'&&<div>
        {!live.length&&<div style={{color:C.dim,textAlign:'center',padding:40,fontSize:13}}>No active loads.</div>}
        {live.map(p=>(
          <div key={p.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontWeight:700,color:C.white}}>{p.featured?'⭐ ':''}{p.category} — {p.pickup_city} → {p.delivery_city}</div>
                <div style={{fontSize:11,color:C.dim}}>${p.price} · {p.miles}mi · {p.vehicle}{p.potent_match?' · 🚛 POTENT MATCH':''}</div>
                <div style={{fontSize:10,color:C.faint}}>{p.poster_name} · {p.contact_phone||p.contact_email} · {timeAgo(p.created_at)} · {daysLeft(p.expires_at)}d left</div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {!p.featured&&<Btn onClick={()=>act('feature',p.id,{featured:true})} variant='ghost' style={{fontSize:10,padding:'4px 10px'}}>⭐ Feature</Btn>}
                {p.featured&&<Btn onClick={()=>act('feature',p.id,{featured:false})} variant='muted' style={{fontSize:10,padding:'4px 10px'}}>Unfeature</Btn>}
                <Btn onClick={()=>act('remove',p.id)} variant='danger' style={{fontSize:10,padding:'4px 10px'}}>Remove</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>}

      {tab==='potent'&&<div>
        <div style={{background:C.orange+'12',border:`1px solid ${C.orange}33`,borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:C.orange}}>🚛 Loads under 4,300 lbs with pickup in the Conyers/Atlanta area — potential jobs for your box truck.</div>
        {!potentMatch.length&&<div style={{color:C.dim,textAlign:'center',padding:40,fontSize:13}}>No matching loads right now.</div>}
        {potentMatch.map(p=>(
          <Card key={p.id}>
            <div style={{fontWeight:700,color:C.white,marginBottom:4}}>{p.category} — {p.pickup_city} → {p.delivery_city}</div>
            <div style={{fontSize:12,color:C.dim}}>${p.price} · {p.miles}mi · {p.weight||'no weight'} · {p.vehicle}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:4}}>{p.contact_phone||p.contact_email}</div>
          </Card>
        ))}
      </div>}

      {tab==='messages'&&<div>
        {!data.messages?.length&&<div style={{color:C.dim,textAlign:'center',padding:40,fontSize:13}}>No messages yet.</div>}
        {data.messages?.map(m=>{
          const p=data.postings?.find(x=>x.id===m.posting_id)
          return <Card key={m.id} style={{borderColor:m.read?C.border:C.orange}}>
            {!m.read&&<div style={{fontSize:9,color:C.orange,fontWeight:700,marginBottom:4}}>NEW</div>}
            <div style={{fontWeight:700,color:C.white,marginBottom:2}}>{m.sender_name||'Anonymous'} — {m.sender_email}</div>
            {m.sender_phone&&<div style={{fontSize:11,color:C.dim,marginBottom:4}}>{m.sender_phone}</div>}
            {p&&<div style={{fontSize:11,color:C.dim,marginBottom:6}}>Re: {p.category} — {p.pickup_city} → {p.delivery_city}</div>}
            <div style={{fontSize:13,color:C.white,marginBottom:6,lineHeight:1.6}}>{m.message}</div>
            <div style={{fontSize:10,color:C.faint}}>{timeAgo(m.created_at)}</div>
            {!m.read&&<button onClick={()=>act('mark_message_read',m.id)} style={{background:'none',border:'none',color:C.dim,fontSize:11,cursor:'pointer',fontFamily:ff,marginTop:4}}>Mark read</button>}
          </Card>
        })}
      </div>}

      {tab==='posters'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
          <Card style={{padding:'12px',textAlign:'center',marginBottom:0}}><div style={{fontSize:10,color:C.dim}}>ACTIVE SUBSCRIBERS</div><div style={{fontSize:24,fontWeight:900,color:C.green}}>{activePoster.length}</div></Card>
          <Card style={{padding:'12px',textAlign:'center',marginBottom:0}}><div style={{fontSize:10,color:C.dim}}>MONTHLY REVENUE</div><div style={{fontSize:24,fontWeight:900,color:C.orange}}>${(activePoster.length*UNLIMITED_FEE).toLocaleString()}/mo</div></Card>
        </div>
        {data.members?.map(m=>(
          <div key={m.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.white}}>{m.name||'Unknown'} — {m.email}</div>
              <div style={{fontSize:10,color:C.dim}}>{m.phone||'no phone'} · {m.company||'no company'} · joined {timeAgo(m.created_at)}</div>
            </div>
            <Badge c={m.active?C.green:C.red}>{m.active?'Active':'Inactive'}</Badge>
          </div>
        ))}
      </div>}

      {tab==='drivers'&&<div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
          <Card style={{padding:'12px',textAlign:'center',marginBottom:0}}><div style={{fontSize:10,color:C.dim}}>ACTIVE DRIVERS</div><div style={{fontSize:24,fontWeight:900,color:C.blue}}>{activeDriver.length}</div></Card>
          <Card style={{padding:'12px',textAlign:'center',marginBottom:0}}><div style={{fontSize:10,color:C.dim}}>LIFETIME REVENUE</div><div style={{fontSize:24,fontWeight:900,color:C.orange}}>${(activeDriver.length*DRIVER_FEE).toLocaleString()}</div></Card>
        </div>
        {data.drivers?.map(d=>(
          <div key={d.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.white}}>{d.name||'Unknown'} — {d.email}</div>
              <div style={{fontSize:10,color:C.dim}}>{d.phone||'no phone'} · {d.company||'no company'} · joined {timeAgo(d.created_at)}</div>
            </div>
            <Badge c={d.active?C.green:C.red}>{d.active?'Active':'Inactive'}</Badge>
          </div>
        ))}
      </div>}
    </div>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App(){
  const params=new URLSearchParams(window.location.search)
  const [view,setView]=useState(params.has('admin')?'admin':'board')
  const [openLoad,setOpenLoad]=useState(null)
  const [postings,setPostings]=useState([])
  const [loading,setLoading]=useState(true)
  const [catFilter,setCatFilter]=useState('all')
  const [vehFilter,setVehFilter]=useState('all')
  const [stateFilter,setStateFilter]=useState('all')
  const [q,setQ]=useState('')
  const [banner,setBanner]=useState(null)
  const [driverEmail,setDriverEmail]=useState(getDriverEmail())
  const [demoOn]=useState(()=>{
    // Read demo toggle from sessionStorage (set by admin)
    try{return sessionStorage.getItem('potent_demo')==='1'}catch{return false}
  })

  useEffect(()=>{
    const po=params.get('poster'),dr=params.get('driver'),em=params.get('email')
    if(po==='success')setBanner({type:'success',text:'Payment confirmed! Your load is now live on the board.'})
    if(po==='cancelled')setBanner({type:'warn',text:'Checkout cancelled. Your load was not posted.'})
    if(dr==='success'&&em){
      const e=decodeURIComponent(em)
      saveDriverEmail(e);setDriverEmail(e)
      setBanner({type:'success',text:`You're in, ${e.split('@')[0]}! Browse loads and contact posters directly.`})
      setView('board')
    }
    if(dr==='cancelled')setBanner({type:'warn',text:'Checkout cancelled. No charge.'})
    if(po||dr)window.history.replaceState({},'',window.location.pathname)
  },[])

  useEffect(()=>{
    setLoading(true)
    supabase.from('postings').select('*').eq('status','active').eq('paid',true).order('featured',{ascending:false}).order('created_at',{ascending:false})
      .then(({data})=>{setPostings(data||[]);setLoading(false)})
      .catch(()=>setLoading(false))
  },[])

  // Merge demo loads if demo mode on
  const allLoads=useMemo(()=>{
    try{if(sessionStorage.getItem('potent_demo')==='1')return [...DEMO_LOADS,...postings]}catch{}
    return postings
  },[postings])

  const states=useMemo(()=>{const s=new Set();allLoads.forEach(l=>{const p=l.pickup_city?.split(',');if(p?.length>1)s.add(p[p.length-1].trim().toUpperCase())});return Array.from(s).sort()},[allLoads])

  const filtered=useMemo(()=>allLoads.filter(l=>{
    if(catFilter!=='all'&&l.category!==catFilter)return false
    if(vehFilter!=='all'&&l.vehicle!==vehFilter)return false
    if(stateFilter!=='all'){const p=l.pickup_city?.split(',');const st=p?.length>1?p[p.length-1].trim().toUpperCase():'';if(st!==stateFilter)return false}
    if(q&&!`${l.category} ${l.pickup_city} ${l.delivery_city} ${l.vehicle}`.toLowerCase().includes(q.toLowerCase()))return false
    return true
  }),[allLoads,catFilter,vehFilter,stateFilter,q])

  const featured=filtered.filter(l=>l.featured)
  const regular=filtered.filter(l=>!l.featured)

  const navBtn=(label,v,active)=><button onClick={()=>{setView(v);setOpenLoad(null)}} style={{background:'none',border:active?`1px solid ${C.orange}`:'none',color:active?C.orange:C.dim,borderRadius:6,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:ff}}>{label}</button>

  return(
    <div style={{background:C.bg,minHeight:'100vh',fontFamily:ff,color:C.white}}>
      <style>{`.load-row:hover{background:${C.card}}`}</style>

      {/* NAV */}
      <div style={{borderBottom:`1px solid ${C.border}`,padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <div style={{fontSize:16,fontWeight:900,cursor:'pointer'}} onClick={()=>{setView('board');setOpenLoad(null)}}>
          POTENT <span style={{color:C.orange}}>LOADBOARD</span>
          <span style={{fontSize:10,color:C.faint,marginLeft:8,fontWeight:400}}>box trucks · vans · cargo SUVs</span>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {driverEmail&&<span style={{fontSize:10,color:C.green,fontWeight:700}}>✅ {driverEmail.split('@')[0]}</span>}
          {navBtn('Board','board',view==='board')}
          {navBtn('Post a Load','post',view==='post')}
          {navBtn('Driver Access','driver',view==='driver')}
          {navBtn('My Posts','mine',view==='mine')}
        </div>
      </div>

      {/* BANNER */}
      {banner&&<div style={{maxWidth:860,margin:'8px auto',padding:'8px 16px',fontSize:12,background:banner.type==='success'?C.green+'18':'#F0E00018',border:`1px solid ${banner.type==='success'?C.green:C.orange}`,borderRadius:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{color:banner.type==='success'?C.green:C.orange}}>{banner.text}</span>
        <button onClick={()=>setBanner(null)} style={{background:'none',border:'none',color:C.dim,cursor:'pointer',fontFamily:ff}}>✕</button>
      </div>}

      {/* VIEWS */}
      {view==='admin'&&<Admin onBack={()=>setView('board')}/>}
      {view==='post'&&<PostForm onBack={()=>setView('board')}/>}
      {view==='mine'&&<MyPostings onBack={()=>setView('board')}/>}
      {view==='driver'&&<DriverSignup onBack={()=>setView('board')}/>}

      {view==='board'&&!openLoad&&<div style={{maxWidth:860,margin:'0 auto',padding:'12px 16px 60px'}}>
        {/* Value prop — compact */}
        <div style={{borderBottom:`1px solid ${C.border}`,paddingBottom:10,marginBottom:12}}>
          <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{fontSize:11,color:C.dim}}>
              <span style={{color:C.orange,fontWeight:700}}>No middlemen.</span> Post for $25 flat or $100/mo unlimited.
              Drivers pay $25 once to see contact info.
              <span style={{color:C.orange,fontWeight:700}}> Direct connections only.</span>
            </div>
            <div style={{display:'flex',gap:8,flexShrink:0}}>
              <Btn onClick={()=>setView('post')} style={{fontSize:11,padding:'5px 14px'}}>Post a Load</Btn>
              <Btn onClick={()=>setView('driver')} variant='ghost' style={{fontSize:11,padding:'5px 12px'}}>Driver Access</Btn>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="search loads..." style={inp({flex:1,minWidth:160,padding:'7px 10px',fontSize:12})}/>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={inp({padding:'7px 10px',fontSize:11,colorScheme:'dark',width:'auto'})}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={vehFilter} onChange={e=>setVehFilter(e.target.value)} style={inp({padding:'7px 10px',fontSize:11,colorScheme:'dark',width:'auto'})}>
            <option value="all">All Vehicles</option>
            {VEHICLES.map(v=><option key={v}>{v}</option>)}
          </select>
          {states.length>0&&<select value={stateFilter} onChange={e=>setStateFilter(e.target.value)} style={inp({padding:'7px 10px',fontSize:11,colorScheme:'dark',width:'auto'})}>
            <option value="all">All States</option>
            {states.map(s=><option key={s}>{s}</option>)}
          </select>}
        </div>

        <div style={{fontSize:11,color:C.dim,marginBottom:8}}>{loading?'loading...`':`${filtered.length} posting${filtered.length!==1?'s':''}`}</div>

        {featured.length>0&&<><div style={{fontSize:10,color:C.orange,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Featured</div>
        {featured.map(l=><LoadRow key={l.id} load={l} onOpen={setOpenLoad}/>)}
        <div style={{height:1,background:C.border,margin:'10px 0'}}/>
        <div style={{fontSize:10,color:C.dim,marginBottom:6}}>All Postings</div></>}

        {regular.map(l=><LoadRow key={l.id} load={l} onOpen={setOpenLoad}/>)}
        {!loading&&!filtered.length&&<div style={{textAlign:'center',padding:'60px 0',color:C.dim,fontSize:13}}>No loads match those filters right now. Check back soon or <button onClick={()=>setView('post')} style={{background:'none',border:'none',color:C.orange,cursor:'pointer',fontSize:13,fontFamily:ff}}>post one.</button></div>}
      </div>}

      {view==='board'&&openLoad&&<LoadDetail load={openLoad} onClose={()=>setOpenLoad(null)} driverEmail={driverEmail} onNeedAccess={()=>{setOpenLoad(null);setView('driver')}}/>}

      {/* FOOTER */}
      <div style={{textAlign:'center',fontSize:10,color:C.faint,padding:'20px 0 40px',borderTop:`1px solid ${C.border}`}}>
        POTENT LOADBOARD · A POTENT PRÄDƏKT® Product · © 2026 ANTHONY EMMANUEL FIGUEROA MENDES®
        <br/>Box trucks, cargo vans, sprinter vans, cargo SUVs only · Flat fees · No percentage cuts · Direct connections
      </div>
    </div>
  )
}
