import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck, Camera, Check, ChevronDown, Heart, ImagePlus, Loader2,
  MessageCircle, MoreHorizontal, Pencil, Send, ShieldCheck, Trash2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { communityApi } from '../lib/communityApi.js'
import { useAuthStore } from '../stores/authStore.js'

const REPORT_REASONS = [
  ['sensitive', 'Contenido sensible'], ['sexual', 'Contenido sexual'],
  ['violence', 'Violencia gráfica'], ['exploitation', 'Explotación'],
  ['harassment', 'Acoso'], ['spam', 'Spam'], ['misinformation', 'Información engañosa'], ['other', 'Otro'],
]

function initials(name = 'Faro') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function relativeDate(value) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'ahora'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function Composer({ editing, onCancel, onSaved }) {
  const inputRef = useRef(null)
  const [body, setBody] = useState(editing?.body || '')
  const [files, setFiles] = useState([])
  const [existingMedia, setExistingMedia] = useState(editing?.media || [])
  const [busy, setBusy] = useState(false)

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files])
  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews])

  const chooseFiles = useCallback((event) => {
    const selected = Array.from(event.target.files || [])
    const available = Math.max(0, 4 - existingMedia.length)
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error('Usa imágenes JPG, PNG o WebP de máximo 5 MB.')
    }
    const valid = selected.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024)
    setFiles((current) => [...current, ...valid].slice(0, available))
    event.target.value = ''
  }, [existingMedia.length])

  const submit = async () => {
    if (!body.trim() && !files.length && !existingMedia.length) return toast.error('Escribe algo o agrega una fotografía.')
    setBusy(true)
    try {
      const uploaded = []
      for (const file of files) uploaded.push(await communityApi.uploadImage(file))
      const paths = [...existingMedia.map((item) => item.storagePath).filter(Boolean), ...uploaded]
      const result = editing
        ? await communityApi.update(editing.id, body, paths)
        : await communityApi.create(body, paths)
      toast.success(result.message)
      setBody(''); setFiles([]); setExistingMedia([])
      onSaved()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_44px_rgba(8,31,44,.07)] sm:p-6" aria-label={editing ? 'Editar publicación' : 'Crear publicación'}>
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d4f4b] text-xs font-black text-white">FP</div>
      <div className="min-w-0 flex-1">
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={editing ? 4 : 3}
          placeholder="Comparte una experiencia, pregunta u oportunidad con la comunidad portuaria…"
          className="w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-slate-800 outline-none placeholder:text-slate-400" />
        {(existingMedia.length > 0 || previews.length > 0) && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {existingMedia.map((item) => <div key={item.id} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={item.url} alt={item.altText || 'Fotografía de la publicación'} className="h-full w-full object-cover" /><button onClick={() => setExistingMedia((all) => all.filter((media) => media.id !== item.id))} className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-1.5 text-white" aria-label="Quitar fotografía"><X size={14}/></button></div>)}
          {previews.map((item, index) => <div key={item.url} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={item.url} alt="Vista previa" className="h-full w-full object-cover" /><button onClick={() => setFiles((all) => all.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-1.5 text-white" aria-label="Quitar fotografía"><X size={14}/></button></div>)}
        </div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={chooseFiles} className="sr-only" />
            <button type="button" disabled={files.length + existingMedia.length >= 4 || busy} onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold text-teal-800 hover:bg-teal-50 disabled:opacity-40"><ImagePlus size={18}/> Fotos <span className="text-slate-400">{files.length + existingMedia.length}/4</span></button>
            <span className="hidden text-[11px] font-semibold text-slate-400 sm:inline">JPG, PNG o WebP · 5 MB</span>
          </div>
          <div className="flex items-center gap-2">
            {editing && <button onClick={onCancel} disabled={busy} className="rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-600">Cancelar</button>}
            <button onClick={submit} disabled={busy || (!body.trim() && !files.length && !existingMedia.length)} className="inline-flex items-center gap-2 rounded-xl bg-[#0d4f4b] px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#0a413e] disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>} {editing ? 'Guardar' : 'Publicar'}</button>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[10px] leading-4 text-slate-400"><ShieldCheck size={13} className="text-teal-700"/> Las fotos se mantienen privadas hasta terminar la revisión de seguridad.</p>
      </div>
    </div>
  </section>
}

function PhotoGrid({ media }) {
  if (!media?.length) return null
  return <div className={`mt-4 grid overflow-hidden rounded-2xl border border-slate-100 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5 bg-slate-100`}>
    {media.map((item, index) => <button key={item.id} type="button" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} className={`${media.length === 3 && index === 0 ? 'row-span-2' : ''} min-h-44 bg-slate-100 sm:min-h-52`}><img src={item.url} alt={item.altText || `Fotografía ${index + 1}`} loading="lazy" className="h-full max-h-[520px] w-full object-cover" /></button>)}
  </div>
}

function Comments({ post, user }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    const next = !open; setOpen(next)
    if (next) {
      try { setItems((await communityApi.comments(post.id)).items) } catch (error) { toast.error(error.message) }
    }
  }
  const send = async () => {
    if (!user) return toast.error('Inicia sesión para comentar.')
    setBusy(true)
    try { const result = await communityApi.comment(post.id, body); toast.success(result.message); setBody(''); setItems((await communityApi.comments(post.id)).items) }
    catch (error) { toast.error(error.message) } finally { setBusy(false) }
  }
  return <><button onClick={toggle} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><MessageCircle size={18}/>{post.comments || ''} Comentar</button>
    {open && <div className="mt-3 border-t border-slate-100 pt-4">
      {items.length > 0 && <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{initials(item.author.name)}</div><div className="rounded-2xl bg-slate-50 px-3 py-2"><div className="flex items-center gap-1 text-[11px] font-black text-slate-700">{item.author.name}{item.author.verified && <BadgeCheck size={13} className="fill-teal-700 text-white"/>}</div><p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-slate-600">{item.body}</p></div></div>)}</div>}
      {user ? <div className="mt-3 flex gap-2"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder="Escribe un comentario…" className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-teal-700"/><button onClick={send} disabled={busy || !body.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d4f4b] text-white disabled:opacity-40" aria-label="Enviar comentario">{busy ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}</button></div> : <Link to="/login?returnTo=/comunidad" className="mt-3 block text-xs font-extrabold text-teal-800">Inicia sesión para comentar</Link>}
    </div>}</>
}

function PostCard({ post, user, onEdit, onRefresh }) {
  const [menu, setMenu] = useState(false)
  const toggleLike = async () => {
    if (!user) return toast.error('Inicia sesión para reaccionar.')
    try { await communityApi.toggleLike(post.id); onRefresh() } catch (error) { toast.error(error.message) }
  }
  const remove = async () => {
    if (!window.confirm('¿Eliminar esta publicación?')) return
    try { await communityApi.remove(post.id); toast.success('Publicación eliminada.'); onRefresh() } catch (error) { toast.error(error.message) }
  }
  const report = async (reason) => {
    try { await communityApi.report(post.id, reason); toast.success('Reporte enviado para revisión.'); setMenu(false) } catch (error) { toast.error(error.message) }
  }
  return <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_38px_rgba(8,31,44,.055)] sm:p-6">
    <header className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0d4f4b] to-teal-500 text-xs font-black text-white">{initials(post.author.name)}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h2 className="truncate text-sm font-black text-[#081f2c]">{post.author.name}</h2>{post.author.verified && <span title="Cuenta verificada"><BadgeCheck size={16} className="fill-teal-700 text-white"/></span>}<span className="text-xs text-slate-400">· {relativeDate(post.createdAt)}</span></div><p className="mt-0.5 text-[11px] font-semibold text-slate-400">{post.author.accountKind === 'company' ? 'Empresa' : 'Profesional'}{post.isEdited ? ' · Editada' : ''}</p></div>
      <div className="relative"><button onClick={() => setMenu((value) => !value)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Opciones"><MoreHorizontal size={18}/></button>{menu && <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
        {post.isMine ? <><button onClick={() => { onEdit(post); setMenu(false) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><Pencil size={14}/> Editar publicación</button><button onClick={remove} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={14}/> Eliminar</button></> : <div><p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Reportar</p>{REPORT_REASONS.map(([value, label]) => <button key={value} onClick={() => report(value)} className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">{label}</button>)}</div>}
      </div>}</div>
    </header>
    {post.status !== 'approved' && <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${post.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{post.status === 'rejected' ? 'No se publicó: ' : 'En revisión privada: '}{post.moderationReason || 'validando el contenido antes de mostrarlo.'}</div>}
    {post.body && <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-700">{post.body}</p>}
    <PhotoGrid media={post.media}/>
    {post.status === 'approved' && <footer className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
      <button onClick={toggleLike} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${post.likedByMe ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'}`}><Heart size={18} className={post.likedByMe ? 'fill-current' : ''}/>{post.likes || ''} Me gusta</button>
      <Comments post={post} user={user}/>
    </footer>}
  </article>
}

export default function Community() {
  const { user, profile } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const load = useCallback(async () => {
    try { setPosts((await communityApi.list()).items) } catch (error) { toast.error(error.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { document.title = 'Comunidad | Faro Portuario'; load() }, [load])

  return <div className="min-h-screen bg-[#f5f8f8] text-slate-950">
    <header className="overflow-hidden border-b border-slate-200 bg-[#082f35] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_360px] lg:items-center">
        <div><p className="text-[11px] font-black uppercase tracking-[.22em] text-teal-300">Comunidad Faro Portuario</p><h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.045em] sm:text-5xl">El sector logístico conversa aquí.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50/75 sm:text-base">Comparte experiencias, preguntas y oportunidades con empresas y profesionales del ecosistema portuario.</p></div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"><div className="flex items-center gap-3"><ShieldCheck className="text-teal-300"/><h2 className="font-black">Una comunidad profesional</h2></div><ul className="mt-4 space-y-2 text-xs leading-5 text-teal-50/70"><li className="flex gap-2"><Check size={15} className="mt-0.5 text-teal-300"/> Publican únicamente cuentas registradas.</li><li className="flex gap-2"><Check size={15} className="mt-0.5 text-teal-300"/> Fotos privadas mientras se revisan.</li><li className="flex gap-2"><Check size={15} className="mt-0.5 text-teal-300"/> Sin contenido sexual, gore, explotación o datos sensibles.</li></ul></div>
      </div>
    </header>
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,700px)_300px] lg:items-start">
      <div className="space-y-5">
        {user ? <Composer key={editing?.id || 'new'} editing={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }}/> : <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Camera className="text-teal-700"/><div><h2 className="font-black text-[#081f2c]">Participa en la conversación</h2><p className="mt-1 text-xs leading-5 text-slate-500">Regístrate gratis como empresa o persona para publicar, comentar y compartir fotografías.</p></div></div><div className="mt-5 flex gap-2"><Link to="/register?returnTo=/comunidad" className="rounded-xl bg-[#0d4f4b] px-4 py-2.5 text-xs font-black text-white">Crear cuenta</Link><Link to="/login?returnTo=/comunidad" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700">Iniciar sesión</Link></div></section>}
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-teal-700"/></div> : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} user={user} onEdit={setEditing} onRefresh={load}/>) : <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><MessageCircle className="mx-auto text-teal-700"/><h2 className="mt-4 text-lg font-black text-[#081f2c]">Abre la primera conversación</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Comparte una pregunta, experiencia o recomendación útil para la comunidad.</p></div>}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Tu cuenta</p>{user ? <div className="mt-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d4f4b] text-xs font-black text-white">{initials(profile?.full_name)}</div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">{profile?.full_name || 'Miembro de Faro'}</p><p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">{profile?.is_verified ? <><BadgeCheck size={13} className="fill-teal-700 text-white"/> Cuenta verificada</> : 'Cuenta registrada'}</p></div></div> : <p className="mt-3 text-xs leading-5 text-slate-500">Inicia sesión para acceder a todas las funciones.</p>}</div>
        <div className="rounded-[22px] border border-slate-200 bg-white p-5"><h2 className="text-sm font-black text-[#081f2c]">Reglas claras</h2><p className="mt-2 text-xs leading-5 text-slate-500">Publica información útil, respeta la privacidad y reporta contenido que ponga en riesgo a la comunidad.</p><Link to="/legal" className="mt-4 inline-flex items-center gap-1 text-xs font-black text-teal-800">Normas de comunidad <ChevronDown size={13} className="-rotate-90"/></Link></div>
      </aside>
    </main>
  </div>
}
