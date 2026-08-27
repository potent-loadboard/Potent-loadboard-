import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { scoreFor, estimateFuelCost } from './lib/loadScore'
import { resizeImage } from './lib/resizeImage'

const VEHICLES = ['Cargo Van', 'Sprinter Van', 'Box Truck']
const CATEGORIES = [
  'Furniture',
  'Appliances',
  'Pallets',
  'Retail Goods',
  'Equipment',
  'Event Equipment',
  'Boxes',
  'Specialty Items',
]
const REQUIREMENTS = ['Liftgate', 'Dolly', 'Pallet Jack', 'No-touch freight', 'Two-person crew', 'Dock available']
const POST_FEE = 25
const linkBlue = '#0000cc'
const MY_POSTINGS_KEY = 'potent_my_postings'

// ---------- localStorage helpers (this is what lets someone edit/delete
// their own listing without an account — see README for how this works) ----------

function getMyPostingRefs() {
  try {
    return JSON.parse(localStorage.getItem(MY_POSTINGS_KEY) || '[]')
  } catch {
    return []
  }
}
function saveMyPostingRef(postingId, editToken) {
  const refs = getMyPostingRefs()
  refs.push({ postingId, editToken })
  localStorage.setItem(MY_POSTINGS_KEY, JSON.stringify(refs))
}

// ---------- helpers ----------

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function stateFromCity(cityStr) {
  if (!cityStr) return null
  const parts = cityStr.split(',')
  if (parts.length < 2) return null
  return parts[parts.length - 1].trim().toUpperCase()
}

// ---------- board row ----------

function Row({ load, onOpen }) {
  const rate = load.price / load.miles
  const score = scoreFor(rate)
  return (
    <tr style={{ borderBottom: '1px solid #ddd' }}>
      <td style={{ padding: '6px 8px', fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>
        {timeAgo(load.created_at)}
      </td>
      <td style={{ padding: '6px 8px' }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onOpen(load)
          }}
          style={{ color: linkBlue, textDecoration: 'underline', fontSize: 14 }}
        >
          {load.category} — {load.pickup_city} to {load.delivery_city} ({load.miles} mi, {load.vehicle})
        </a>
        {load.photos?.length > 0 && (
          <span style={{ color: '#888', fontSize: 12 }}> [{load.photos.length} photos]</span>
        )}
      </td>
      <td style={{ padding: '6px 8px', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        ${load.price}
      </td>
      <td style={{ padding: '6px 8px', fontSize: 12, fontWeight: 'bold', color: score.color, whiteSpace: 'nowrap' }}>
        [{score.label}] ${rate.toFixed(2)}/mi
      </td>
    </tr>
  )
}

// ---------- photo lightbox ----------

function Lightbox({ url, onClose }) {
  if (!url) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20,
      }}
    >
      <img src={url} alt="load photo enlarged" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </div>
  )
}

// ---------- listing detail ----------

function LoadDetail({ load, onClose }) {
  const rate = load.price / load.miles
  const score = scoreFor(rate)
  const fuelCost = estimateFuelCost(load.miles, load.vehicle)
  const [reviews, setReviews] = useState([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewName, setReviewName] = useState('')
  const [reviewRole, setReviewRole] = useState('customer')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  useEffect(() => {
    supabase
      .from('reviews')
      .select('*')
      .eq('posting_id', load.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReviews(data || []))
  }, [load.id])

  async function submitReview() {
    if (!reviewComment.trim()) return
    setSubmittingReview(true)
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        posting_id: load.id,
        reviewer_name: reviewName || 'Anonymous',
        reviewee_role: reviewRole,
        rating: reviewRating,
        comment: reviewComment,
      })
      .select()
    setSubmittingReview(false)
    if (!error && data) {
      setReviews([data[0], ...reviews])
      setShowReviewForm(false)
      setReviewComment('')
      setReviewName('')
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '20px auto', fontFamily: 'Arial, Helvetica, sans-serif', padding: '0 16px' }}>
      <a href="#" onClick={(e) => { e.preventDefault(); onClose() }} style={{ color: linkBlue, fontSize: 13 }}>
        &laquo; back to board
      </a>
      <h2 style={{ fontSize: 20, margin: '10px 0 4px', color: '#222' }}>
        {load.category} — {load.pickup_city} to {load.delivery_city}
      </h2>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
        posted {timeAgo(load.created_at)} — load #{load.id.slice(0, 8)}
      </div>

      {load.photos?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {load.photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`load photo ${i + 1}`}
              onClick={() => setLightboxUrl(url)}
              style={{ width: 130, height: 100, objectFit: 'cover', border: '1px solid #ccc', cursor: 'zoom-in' }}
            />
          ))}
        </div>
      )}
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={cellLabel}>price</td>
            <td style={cellVal}><b>${load.price}</b></td>
          </tr>
          <tr style={{ background: '#f5f5f5' }}>
            <td style={cellLabel}>distance</td>
            <td style={cellVal}>{load.miles} miles</td>
          </tr>
          <tr>
            <td style={cellLabel}>rate / mile</td>
            <td style={{ ...cellVal, color: score.color, fontWeight: 'bold' }}>
              ${rate.toFixed(2)} — [{score.label}]
            </td>
          </tr>
          <tr style={{ background: '#f5f5f5' }}>
            <td style={cellLabel}>vehicle needed</td>
            <td style={cellVal}>{load.vehicle}</td>
          </tr>
          <tr>
            <td style={cellLabel}>weight / dims</td>
            <td style={cellVal}>{load.weight || '—'} {load.dimensions ? `/ ${load.dimensions}` : ''}</td>
          </tr>
          <tr style={{ background: '#f5f5f5' }}>
            <td style={cellLabel}>requirements</td>
            <td style={cellVal}>{load.requirements?.length ? load.requirements.join(', ') : 'none listed'}</td>
          </tr>
          <tr>
            <td style={cellLabel}>est. fuel cost</td>
            <td style={cellVal}>${fuelCost.toFixed(0)}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 13, color: '#444', background: '#fffbdd', border: '1px solid #e5d98a', padding: '8px 10px', marginBottom: 16 }}>
        {score.note}
      </p>

      <div style={{ border: '1px solid #ccc', padding: '10px 12px', marginBottom: 16 }}>
        <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>contact the poster directly</div>
        <div style={{ fontSize: 13 }}>{load.poster_name || 'Poster'}</div>
        {load.contact_phone && <div style={{ fontSize: 13 }}>phone: {load.contact_phone}</div>}
        {load.contact_email && <div style={{ fontSize: 13 }}>email: {load.contact_email}</div>}
      </div>

      <p style={{ fontSize: 12, color: '#777', border: '1px solid #ddd', padding: '8px 10px', marginBottom: 20 }}>
        POTENT does not vet, verify, or background-check users. Contact the poster directly and use your own judgment before agreeing to terms.
      </p>

      <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>
          reviews {reviews.length > 0 && `(${reviews.length})`}
        </div>
        {reviews.length === 0 && <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>no reviews yet</div>}
        {reviews.map((r) => (
          <div key={r.id} style={{ fontSize: 13, marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
            <b>{r.reviewer_name}</b> ({r.reviewee_role}) — {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
            <div style={{ color: '#555' }}>{r.comment}</div>
          </div>
        ))}

        {!showReviewForm ? (
          <a href="#" onClick={(e) => { e.preventDefault(); setShowReviewForm(true) }} style={{ color: linkBlue, fontSize: 13 }}>
            + leave a review
          </a>
        ) : (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <input placeholder="your name" value={reviewName} onChange={(e) => setReviewName(e.target.value)} style={{ ...fieldStyle, marginBottom: 6 }} />
            <select value={reviewRole} onChange={(e) => setReviewRole(e.target.value)} style={{ ...fieldStyle, marginBottom: 6 }}>
              <option value="customer">I was the customer</option>
              <option value="operator">I was the operator</option>
            </select>
            <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} style={{ ...fieldStyle, marginBottom: 6 }}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
            <textarea placeholder="how did it go?" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} style={{ ...fieldStyle, marginBottom: 6, minHeight: 60 }} />
            <button onClick={submitReview} disabled={submittingReview} style={btnStyle}>
              {submittingReview ? 'submitting...' : 'submit review'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const cellLabel = { padding: '5px 8px', color: '#666', width: 140, borderBottom: '1px solid #eee' }
const cellVal = { padding: '5px 8px', borderBottom: '1px solid #eee' }
const fieldStyle = { width: '100%', padding: '5px 6px', fontSize: 13, border: '1px solid #999', boxSizing: 'border-box' }
const btnStyle = { padding: '7px 16px', fontSize: 13, background: '#e8e8e8', border: '1px solid #999', cursor: 'pointer' }

// ---------- post form ----------

function PostForm() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [vehicle, setVehicle] = useState(VEHICLES[2])
  const [pickup, setPickup] = useState('')
  const [delivery, setDelivery] = useState('')
  const [miles, setMiles] = useState('')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [reqs, setReqs] = useState([])
  const [posterName, setPosterName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const rate = miles && price ? Number(price) / Number(miles) : null
  const score = rate ? scoreFor(rate) : null

  function toggleReq(r) {
    setReqs((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
  }

  async function handleSubmit() {
    setError('')
    if (!pickup || !delivery || !miles || !price) {
      setError('Pickup, delivery, miles, and price are required.')
      return
    }
    if (files.length === 0) {
      setError('At least one photo is required. No pictures, no guessing.')
      return
    }
    if (!phone && !email) {
      setError('Add a phone number or email so operators can reach you.')
      return
    }

    setUploading(true)
    try {
      // Generate id + edit token ourselves — the posting stays hidden
      // (paid = false) until Stripe confirms payment, so we can't rely on
      // reading anything back after insert under the public RLS policy.
      const postingId = crypto.randomUUID()
      const editToken = crypto.randomUUID()

      const photoUrls = []
      for (const file of files) {
        const compressed = await resizeImage(file)
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('load-photos')
          .upload(path, compressed, { contentType: 'image/jpeg' })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('load-photos').getPublicUrl(path)
        photoUrls.push(publicUrlData.publicUrl)
      }

      const { error: insertError } = await supabase.from('postings').insert({
        id: postingId,
        edit_token: editToken,
        category,
        vehicle,
        pickup_city: pickup,
        delivery_city: delivery,
        miles: Number(miles),
        price: Number(price),
        weight,
        dimensions,
        requirements: reqs,
        photos: photoUrls,
        poster_name: posterName || 'Anonymous',
        contact_phone: phone,
        contact_email: email,
        status: 'active',
        paid: false, // flips to true via Stripe webhook once payment confirms
      })
      if (insertError) throw insertError

      // Remember this posting is "mine" before leaving for Stripe —
      // localStorage survives the redirect, React state does not.
      saveMyPostingRef(postingId, editToken)

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postingId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.')

      window.location.href = data.url
    } catch (e) {
      setError(e.message || 'Something went wrong posting your load.')
      setUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '20px auto', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, padding: '0 16px' }}>
      <h2 style={{ fontSize: 18, color: '#222', marginBottom: 2 }}>post to POTENT freight board</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>flat ${POST_FEE} fee. not a percentage of your shipment.</p>

      <FormRow label="freight category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </FormRow>
      <FormRow label="vehicle needed">
        <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} style={fieldStyle}>
          {VEHICLES.map((v) => <option key={v}>{v}</option>)}
        </select>
      </FormRow>
      <FormRow label="pickup city, state">
        <input value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Charlotte, NC" style={fieldStyle} />
      </FormRow>
      <FormRow label="delivery city, state">
        <input value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="Savannah, GA" style={fieldStyle} />
      </FormRow>
      <FormRow label="estimated miles">
        <input type="number" value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="245" style={fieldStyle} />
      </FormRow>
      <FormRow label="your offer ($)">
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1250" style={fieldStyle} />
      </FormRow>
      <FormRow label="weight (optional)">
        <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="800 lbs" style={fieldStyle} />
      </FormRow>
      <FormRow label="dimensions (optional)">
        <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="4 pallets, 48x40" style={fieldStyle} />
      </FormRow>

      <FormRow label="requirements">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
          {REQUIREMENTS.map((r) => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <input type="checkbox" checked={reqs.includes(r)} onChange={() => toggleReq(r)} />
              {r}
            </label>
          ))}
        </div>
      </FormRow>

      <FormRow label="your name">
        <input value={posterName} onChange={(e) => setPosterName(e.target.value)} placeholder="Jane at Acme Co" style={fieldStyle} />
      </FormRow>
      <FormRow label="phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" style={fieldStyle} />
      </FormRow>
      <FormRow label="email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" style={fieldStyle} />
      </FormRow>
      <FormRow label="photos (required)">
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} style={fieldStyle} />
        {files.length > 0 && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{files.length} photo(s) selected — will be compressed on upload</div>}
      </FormRow>

      {score && (
        <p style={{ fontSize: 12, fontWeight: 'bold', color: score.color, margin: '10px 0' }}>
          [{score.label}] ${rate.toFixed(2)}/mi — {score.note}
        </p>
      )}

      {error && <p style={{ fontSize: 12, color: '#a30000', marginBottom: 8 }}>{error}</p>}

      <button onClick={handleSubmit} disabled={uploading} style={{ ...btnStyle, marginTop: 10, padding: '8px 18px', fontSize: 14 }}>
        {uploading ? 'uploading & sending you to payment...' : `post & pay $${POST_FEE}`}
      </button>
    </div>
  )
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: '#333', marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  )
}

// ---------- my postings ----------

function MyPostingRow({ refInfo, posting, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(posting.price)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function call(action, updates) {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/manage-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postingId: refInfo.postingId, editToken: refInfo.editToken, action, updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      onChanged()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: 10, marginBottom: 10, fontSize: 13 }}>
      <div style={{ fontWeight: 'bold' }}>
        {posting.category} — {posting.pickup_city} to {posting.delivery_city}
      </div>
      <div style={{ color: '#666', margin: '3px 0' }}>
        status: <b>{posting.status}</b> {posting.paid ? '(paid)' : '(payment not confirmed yet)'}
      </div>

      {editing ? (
        <div style={{ marginTop: 6 }}>
          <div style={{ marginBottom: 4 }}>price ($)</div>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...fieldStyle, marginBottom: 6, width: 120 }} />
          <div>
            <button disabled={busy} onClick={() => call('update', { price: Number(price) }).then(() => setEditing(false))} style={{ ...btnStyle, marginRight: 6 }}>
              save
            </button>
            <button disabled={busy} onClick={() => setEditing(false)} style={btnStyle}>cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>${posting.price}</span>
          {posting.status === 'active' && (
            <>
              <a href="#" onClick={(e) => { e.preventDefault(); setEditing(true) }} style={{ color: linkBlue }}>edit price</a>
              <a href="#" onClick={(e) => { e.preventDefault(); call('mark_filled') }} style={{ color: linkBlue }}>mark filled</a>
              <a href="#" onClick={(e) => { e.preventDefault(); if (confirm('Remove this posting?')) call('delete') }} style={{ color: '#a30000' }}>delete</a>
            </>
          )}
          {posting.status === 'filled' && (
            <a href="#" onClick={(e) => { e.preventDefault(); call('reactivate') }} style={{ color: linkBlue }}>reactivate</a>
          )}
        </div>
      )}
      {msg && <div style={{ color: '#a30000', marginTop: 4 }}>{msg}</div>}
    </div>
  )
}

function MyPostings() {
  const [postings, setPostings] = useState([])
  const [loading, setLoading] = useState(true)
  const refs = useMemo(() => getMyPostingRefs(), [])

  async function load() {
    setLoading(true)
    if (refs.length === 0) {
      setPostings([])
      setLoading(false)
      return
    }
    const res = await fetch('/api/my-postings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: refs }),
    })
    const data = await res.json()
    setPostings(data.postings || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ maxWidth: 600, margin: '20px auto', fontFamily: 'Arial, Helvetica, sans-serif', padding: '0 16px' }}>
      <h2 style={{ fontSize: 18, color: '#222', marginBottom: 4 }}>my postings</h2>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        remembered on this device/browser only — no account needed
      </p>
      {loading && <p style={{ fontSize: 13, color: '#888' }}>loading...</p>}
      {!loading && postings.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>no postings found on this device yet.</p>}
      {postings.map((p) => (
        <MyPostingRow key={p.id} refInfo={refs.find((r) => r.postingId === p.id)} posting={p} onChanged={load} />
      ))}
    </div>
  )
}

// ---------- admin ----------

function Admin() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [postings, setPostings] = useState([])
  const [error, setError] = useState('')

  async function login() {
    setError('')
    const res = await fetch('/api/admin-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'list_all' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Login failed')
      return
    }
    setPostings(data.postings || [])
    setAuthed(true)
  }

  async function remove(postingId) {
    if (!confirm('Remove this posting?')) return
    await fetch('/api/admin-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'remove', postingId }),
    })
    setPostings((prev) => prev.map((p) => (p.id === postingId ? { ...p, status: 'removed' } : p)))
  }

  if (!authed) {
    return (
      <div style={{ maxWidth: 320, margin: '60px auto', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13 }}>
        <div style={{ marginBottom: 6 }}>admin password</div>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...fieldStyle, marginBottom: 8 }} />
        <button onClick={login} style={btnStyle}>log in</button>
        {error && <div style={{ color: '#a30000', marginTop: 8 }}>{error}</div>}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 13, padding: '0 16px' }}>
      <h2 style={{ fontSize: 18, color: '#222', marginBottom: 12 }}>admin — all postings ({postings.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: 4 }}>load</th>
            <th style={{ padding: 4 }}>price</th>
            <th style={{ padding: 4 }}>status</th>
            <th style={{ padding: 4 }}>paid</th>
            <th style={{ padding: 4 }}>contact</th>
            <th style={{ padding: 4 }}></th>
          </tr>
        </thead>
        <tbody>
          {postings.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 4 }}>{p.category} — {p.pickup_city} to {p.delivery_city}</td>
              <td style={{ padding: 4 }}>${p.price}</td>
              <td style={{ padding: 4 }}>{p.status}</td>
              <td style={{ padding: 4 }}>{p.paid ? 'yes' : 'no'}</td>
              <td style={{ padding: 4 }}>{p.contact_phone || p.contact_email}</td>
              <td style={{ padding: 4 }}>
                {p.status !== 'removed' && (
                  <a href="#" onClick={(e) => { e.preventDefault(); remove(p.id) }} style={{ color: '#a30000' }}>remove</a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- main app ----------

export default function App() {
  const initialView = window.location.search.includes('admin') ? 'admin' : 'board'
  const [view, setView] = useState(initialView)
  const [openLoad, setOpenLoad] = useState(null)
  const [postings, setPostings] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all categories')
  const [vehFilter, setVehFilter] = useState('all vehicles')
  const [stateFilter, setStateFilter] = useState('all states')
  const [q, setQ] = useState('')
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const posted = params.get('posted')
    if (posted === 'success') {
      setBanner({ type: 'success', text: "Payment received — your load is live on the board. (If it doesn't show up within a few seconds, refresh.)" })
    } else if (posted === 'cancelled') {
      setBanner({ type: 'cancelled', text: 'Checkout was cancelled — your load was not posted. You can try again anytime.' })
    }
    if (posted) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  async function loadPostings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('postings')
      .select('*')
      .eq('status', 'active')
      .eq('paid', true)
      .order('created_at', { ascending: false })
    if (!error) setPostings(data || [])
    setLoading(false)
  }

  useEffect(() => { loadPostings() }, [])

  const states = useMemo(() => {
    const set = new Set()
    postings.forEach((l) => {
      const s = stateFromCity(l.pickup_city)
      if (s) set.add(s)
    })
    return Array.from(set).sort()
  }, [postings])

  const filtered = useMemo(() => {
    return postings.filter((l) => {
      if (catFilter !== 'all categories' && l.category !== catFilter) return false
      if (vehFilter !== 'all vehicles' && l.vehicle !== vehFilter) return false
      if (stateFilter !== 'all states' && stateFromCity(l.pickup_city) !== stateFilter) return false
      if (q && !`${l.category} ${l.pickup_city} ${l.delivery_city}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [postings, catFilter, vehFilter, stateFilter, q])

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000' }}>
      <div style={{ background: '#f7f7f7', borderBottom: '1px solid #ccc', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>potent</span>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>freight &amp; delivery classifieds</span>
        </div>
        <div style={{ fontSize: 12 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('board'); setOpenLoad(null); loadPostings() }} style={{ color: linkBlue, marginRight: 12, textDecoration: view === 'board' ? 'underline' : 'none' }}>board</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('post') }} style={{ color: linkBlue, marginRight: 12, textDecoration: view === 'post' ? 'underline' : 'none' }}>post a load</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setView('mine') }} style={{ color: linkBlue, textDecoration: view === 'mine' ? 'underline' : 'none' }}>my postings</a>
        </div>
      </div>

      {banner && (
        <div style={{ maxWidth: 900, margin: '10px auto 0', padding: '8px 14px', fontSize: 13, background: banner.type === 'success' ? '#eaffea' : '#fff3e0', border: `1px solid ${banner.type === 'success' ? '#a3d9a3' : '#e0c088'}`, color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{banner.text}</span>
          <a href="#" onClick={(e) => { e.preventDefault(); setBanner(null) }} style={{ color: linkBlue, marginLeft: 12 }}>dismiss</a>
        </div>
      )}

      {view === 'post' ? (
        <PostForm />
      ) : view === 'mine' ? (
        <MyPostings />
      ) : view === 'admin' ? (
        <Admin />
      ) : openLoad ? (
        <LoadDetail load={openLoad} onClose={() => setOpenLoad(null)} />
      ) : (
        <div style={{ display: 'flex', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ width: 170, padding: '16px 10px', borderRight: '1px solid #eee', fontSize: 13 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#333' }}>categories</div>
            <div>
              <a href="#" onClick={(e) => { e.preventDefault(); setCatFilter('all categories') }} style={{ display: 'block', color: catFilter === 'all categories' ? '#000' : linkBlue, fontWeight: catFilter === 'all categories' ? 'bold' : 'normal', marginBottom: 3, textDecoration: catFilter === 'all categories' ? 'none' : 'underline' }}>
                all categories
              </a>
              {CATEGORIES.map((c) => (
                <a key={c} href="#" onClick={(e) => { e.preventDefault(); setCatFilter(c) }} style={{ display: 'block', color: catFilter === c ? '#000' : linkBlue, fontWeight: catFilter === c ? 'bold' : 'normal', marginBottom: 3, textDecoration: catFilter === c ? 'none' : 'underline' }}>
                  {c.toLowerCase()}
                </a>
              ))}
            </div>

            <div style={{ fontWeight: 'bold', margin: '16px 0 6px', color: '#333' }}>vehicle</div>
            <div>
              <a href="#" onClick={(e) => { e.preventDefault(); setVehFilter('all vehicles') }} style={{ display: 'block', color: vehFilter === 'all vehicles' ? '#000' : linkBlue, fontWeight: vehFilter === 'all vehicles' ? 'bold' : 'normal', marginBottom: 3, textDecoration: vehFilter === 'all vehicles' ? 'none' : 'underline' }}>
                all vehicles
              </a>
              {VEHICLES.map((v) => (
                <a key={v} href="#" onClick={(e) => { e.preventDefault(); setVehFilter(v) }} style={{ display: 'block', color: vehFilter === v ? '#000' : linkBlue, fontWeight: vehFilter === v ? 'bold' : 'normal', marginBottom: 3, textDecoration: vehFilter === v ? 'none' : 'underline' }}>
                  {v.toLowerCase()}
                </a>
              ))}
            </div>

            {states.length > 0 && (
              <>
                <div style={{ fontWeight: 'bold', margin: '16px 0 6px', color: '#333' }}>pickup state</div>
                <div>
                  <a href="#" onClick={(e) => { e.preventDefault(); setStateFilter('all states') }} style={{ display: 'block', color: stateFilter === 'all states' ? '#000' : linkBlue, fontWeight: stateFilter === 'all states' ? 'bold' : 'normal', marginBottom: 3, textDecoration: stateFilter === 'all states' ? 'none' : 'underline' }}>
                    all states
                  </a>
                  {states.map((s) => (
                    <a key={s} href="#" onClick={(e) => { e.preventDefault(); setStateFilter(s) }} style={{ display: 'block', color: stateFilter === s ? '#000' : linkBlue, fontWeight: stateFilter === s ? 'bold' : 'normal', marginBottom: 3, textDecoration: stateFilter === s ? 'none' : 'underline' }}>
                      {s}
                    </a>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: 16, fontSize: 11, color: '#888', lineHeight: 1.5 }}>
              no vetting or background checks. deal directly, use your own judgment.
            </div>
          </div>

          <div style={{ flex: 1, padding: '16px' }}>
            <div style={{ marginBottom: 10 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search loads" style={{ padding: '5px 8px', fontSize: 13, border: '1px solid #999', width: 220 }} />
              <span style={{ fontSize: 12, color: '#666', marginLeft: 10 }}>{loading ? 'loading...' : `${filtered.length} loads posted`}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '4px 8px', color: '#666', fontSize: 12 }}>posted</th>
                  <th style={{ padding: '4px 8px', color: '#666', fontSize: 12 }}>load</th>
                  <th style={{ padding: '4px 8px', color: '#666', fontSize: 12 }}>price</th>
                  <th style={{ padding: '4px 8px', color: '#666', fontSize: 12 }}>rating</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => <Row key={l.id} load={l} onOpen={setOpenLoad} />)}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <p style={{ color: '#888', fontSize: 13, marginTop: 20 }}>no loads match those filters.</p>
            )}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: '#999', padding: '20px 0', borderTop: '1px solid #eee', marginTop: 20 }}>
        potent — no guessing. no surprises. &nbsp;|&nbsp; flat fees only, never a % of your shipment
      </div>
    </div>
  )
}
export default App
