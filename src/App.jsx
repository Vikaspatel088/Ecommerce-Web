import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft,
  Camera, CirclePlay, Heart, Menu, Minus, Plus, Search, ShoppingBag,
  Sparkles, Star, Trash2, UserRound, UsersRound, X,
} from 'lucide-react'
import './storefront.css'

const API_URL = import.meta.env.VITE_PRODUCTS_API_URL?.trim()
const CURRENCY = import.meta.env.VITE_CURRENCY?.trim().toUpperCase()
const money = new Intl.NumberFormat('en-US', CURRENCY ? { style: 'currency', currency: CURRENCY } : { maximumFractionDigits: 2 })
const currentYear = new Date().getFullYear()

function priceFor(product) {
  if (product.price === null || product.price === undefined || product.price === '') return null
  const price = Number(product.price)
  return Number.isFinite(price) ? price : null
}

function inventoryFor(product) {
  if (product.inventory === null || product.inventory === undefined || product.inventory === '') return null
  const inventory = Number(product.inventory)
  return Number.isFinite(inventory) ? inventory : null
}

function readProducts(payload) {
  const candidates = [payload, payload?.products, payload?.data, payload?.results, payload?.data?.products]
  const products = candidates.find(Array.isArray)
  if (!products) throw new Error('The products endpoint returned an unsupported response.')
  return products.filter((product) => product && typeof product === 'object' && !Array.isArray(product))
}

function ratingFor(product) {
  const ratings = product.ratings
  if (typeof ratings === 'number' && Number.isFinite(ratings) && ratings > 0 && ratings <= 5) return ratings
  if (ratings && !Array.isArray(ratings) && typeof ratings === 'object') {
    const value = Number(ratings.average ?? ratings.rating ?? ratings.value ?? ratings.star)
    if (Number.isFinite(value) && value > 0 && value <= 5) return value
  }
  if (Array.isArray(ratings)) {
    const values = ratings.map((item) => Number(typeof item === 'object' ? item?.star ?? item?.rating ?? item?.value : item)).filter((value) => Number.isFinite(value) && value > 0 && value <= 5)
    if (values.length) return values.reduce((sum, value) => sum + value, 0) / values.length
  }
  const directValue = Number(product.rating)
  if (Number.isFinite(directValue) && directValue > 0 && directValue <= 5) return directValue
  const totalRating = Number(product.totalRating)
  return Number.isFinite(totalRating) && totalRating > 0 && totalRating <= 5 ? totalRating : null
}

function productId(product) {
  return String(product._id ?? product.id ?? product.name)
}

function inStock(product) {
  const inventory = inventoryFor(product)
  return product.inStock !== false && !(inventory !== null && inventory <= 0)
}

function getCategories(products) {
  return [...new Set(products.map((product) => product.category).filter((category) => typeof category === 'string' && category.trim()))]
    .sort((first, second) => first.localeCompare(second))
}

function ProductImage({ product, className = '', loading = 'lazy' }) {
  const imageUrl = typeof product.url === 'string' ? product.url : ''
  const [failedUrl, setFailedUrl] = useState('')
  if (!imageUrl || failedUrl === imageUrl) return <div className={`image-fallback ${className}`} role="img" aria-label={`${product.name || 'Product'} image unavailable`}><ShoppingBag size={27} strokeWidth={1.3} /></div>
  return <img className={className} src={imageUrl} alt={product.name || 'Product'} loading={loading} onError={() => setFailedUrl(imageUrl)} />
}

function Rating({ product, compact = false }) {
  const rating = ratingFor(product)
  const count = Array.isArray(product.ratings) ? product.ratings.length : 0
  if (rating === null) return <span className={`rating-empty${compact ? ' compact' : ''}`}>No ratings yet</span>
  return <span className="rating-value" aria-label={`Rated ${rating.toFixed(1)} out of 5${count > 0 ? ` by ${count} ratings` : ''}`}><Star size={14} fill="currentColor" /><span>{rating.toFixed(1)}</span>{count > 0 && <span className="rating-count">({count})</span>}</span>
}

function Navbar({ cartCount, onCart, onAccount, search, setSearch }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
    <div className="nav-shell">
      <a className="brand" href="#home" aria-label="Form and Field home"><span className="brand-mark"><span /></span><span>form<span className="brand-amp">&</span>field</span></a>
      <nav className={`primary-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation"><a href="#home" onClick={() => setMenuOpen(false)}>Home</a><a href="#products" onClick={() => setMenuOpen(false)}>Shop</a><a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a></nav>
      <div className="nav-actions">
        <div className={`nav-search${searchOpen ? ' is-open' : ''}`}>{searchOpen && <input autoFocus aria-label="Search products" placeholder="Find something..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && setSearchOpen(false)} />}<button className="icon-button search-trigger" type="button" aria-label={searchOpen ? 'Close search' : 'Search products'} onClick={() => setSearchOpen((open) => !open)}>{searchOpen ? <X size={19} /> : <Search size={19} />}</button></div>
        <button className="icon-button profile-button" type="button" aria-label="Account" onClick={onAccount}><UserRound size={19} /></button>
        <button className="icon-button cart-trigger" type="button" aria-label={`Open cart, ${cartCount} items`} onClick={onCart}><ShoppingBag size={19} /><span className="cart-badge">{cartCount}</span></button>
        <button className="icon-button menu-trigger" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
  </header>
}

function Hero({ products, categories }) {
  const reduceMotion = useReducedMotion()
  const featured = products.slice(0, 3)
  const introMotion = reduceMotion ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55 } }
  return <section className="hero-section" id="home">
    <motion.div className="hero-copy" {...introMotion}>
      <span className="eyebrow"><span className="eyebrow-dot" /> CURATED PRODUCTS</span>
      <h1>Everything you need.<br /><em>Beautifully simplified.</em></h1>
      <p>Discover thoughtful finds across electronics, audio, accessories, home and more. The useful things, made a little more considered.</p>
      <div className="hero-actions"><a className="button button-dark" href="#products">Explore products <ArrowRight size={16} /></a><a className="button button-light" href="#categories">View categories <ArrowDown size={15} /></a></div>
      <div className="hero-note"><Sparkles size={15} /><span>A considered collection for everyday living</span></div>
    </motion.div>
    <div className="hero-visual" aria-label="Featured products from the collection"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      {featured.length ? <>
        <motion.div className="hero-product hero-product-main" initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.65, delay: 0.12 }}><ProductImage product={featured[0]} loading="eager" /><span className="hero-image-glint" /></motion.div>
        {featured[1] && <motion.div className="hero-product hero-product-side" initial={reduceMotion ? false : { opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.28 }}><ProductImage product={featured[1]} loading="eager" /></motion.div>}
        {featured[2] && <motion.div className="hero-product hero-product-small" initial={reduceMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.38 }}><ProductImage product={featured[2]} loading="eager" /></motion.div>}
        <div className="floating-note floating-note-top"><span className="floating-star"><Star size={13} fill="currentColor" /></span><span><strong>{ratingFor(featured[0])?.toFixed(1) ?? '—'}</strong><small>{ratingFor(featured[0]) === null ? 'Not rated yet' : 'Customer rating'}</small></span></div>
        <div className="floating-note floating-note-bottom"><span className="floating-category">{featured[0].category || 'Selected find'}</span><strong>{priceFor(featured[0]) !== null ? money.format(priceFor(featured[0])) : 'Price unavailable'}</strong></div>
      </> : <div className="hero-empty-art"><div className="hero-empty-ring"><ShoppingBag size={46} strokeWidth={1} /></div><span>Thoughtful finds, coming into view</span></div>}
      <div className="hero-visual-caption"><span className="caption-line" />{categories[0] || 'THE COLLECTION'}</div>
    </div>
  </section>
}

function CategoryNav({ categories, activeCategory, setActiveCategory }) {
  return <section className="category-section" id="categories"><div className="section-kicker"><span>01</span><span className="kicker-rule" /><span>SHOP BY CATEGORY</span></div>
    <div className="category-heading"><h2>A little something for <em>every day.</em></h2><span className="category-count">{categories.length ? `${categories.length} categories` : 'Explore the collection'}</span></div>
    <div className="category-list" role="group" aria-label="Filter by category"><button type="button" className={`category-chip${activeCategory === 'All' ? ' active' : ''}`} onClick={() => setActiveCategory('All')}>All products <ArrowRight size={14} /></button>{categories.map((category) => <button type="button" key={category} className={`category-chip${activeCategory === category ? ' active' : ''}`} onClick={() => setActiveCategory(category)}>{category}<ArrowUpRight size={13} /></button>)}{!categories.length && <span className="category-placeholder">Categories will appear with your products</span>}</div>
  </section>
}

function FilterBar({ search, setSearch, categories, activeCategory, setActiveCategory, sort, setSort, availability, setAvailability, onClear, hasFilters }) {
  return <div className="filter-bar"><label className="filter-search"><Search size={17} /><input type="search" placeholder="Search the collection" aria-label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>/</kbd></label>
    <div className="filter-controls"><label className="select-wrap"><span className="sr-only">Category</span><select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}><option value="All">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
      <label className="select-wrap"><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: Low to high</option><option value="price-desc">Price: High to low</option><option value="rating">Top rated</option><option value="newest">Newest</option></select><ChevronDown size={14} /></label>
      <label className="select-wrap availability-select"><span className="sr-only">Availability</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">Any availability</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select><ChevronDown size={14} /></label>{hasFilters && <button type="button" className="clear-filters" onClick={onClear}>Clear filters <X size={13} /></button>}
    </div>
  </div>
}

function ProductCard({ product, onQuickView, onAdd, wished, onWish, index }) {
  const available = inStock(product)
  return <motion.article className="product-card" layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.22) }}>
    <div className="product-image-wrap"><button type="button" className="image-open" onClick={() => onQuickView(product)} aria-label={`View ${product.name}`}><ProductImage product={product} /></button><span className={`stock-tag${available ? '' : ' is-out'}`}>{available ? 'In stock' : 'Out of stock'}</span>
      <button type="button" className={`wish-button${wished ? ' is-wished' : ''}`} aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={wished} onClick={(event) => { event.stopPropagation(); onWish(product) }}><Heart size={17} fill={wished ? 'currentColor' : 'none'} /></button>
      <button type="button" className="quick-add" disabled={!available} onClick={(event) => { event.stopPropagation(); onAdd(product) }} aria-label={`Add ${product.name} to cart`}><Plus size={16} /></button>
    </div>
    <button type="button" className="product-info" onClick={() => onQuickView(product)}><span className="product-brand">{product.brand || 'CURATED FIND'}<span className="product-rating"><Rating product={product} compact /></span></span><span className="product-name">{product.name || 'Untitled product'}</span><span className="product-meta"><span>{product.category || 'Collection'}</span><strong>{priceFor(product) !== null ? money.format(priceFor(product)) : 'Price unavailable'}</strong></span></button>
  </motion.article>
}

function ProductGrid({ products, loading, error, onQuickView, onAdd, wishes, onWish, onClear }) {
  if (loading) return <div className="product-grid" aria-label="Loading products">{Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-image" /><div className="skeleton-line short" /><div className="skeleton-line" /><div className="skeleton-line medium" /></div>)}</div>
  if (error) return null
  if (!products.length) return <div className="empty-results"><span className="empty-icon"><Search size={22} /></span><h3>No products found</h3><p>Try a different search or clear your filters.</p><button className="button button-dark" type="button" onClick={onClear}>Clear filters <X size={15} /></button></div>
  return <motion.div className="product-grid" layout>{products.map((product, index) => <ProductCard key={productId(product)} product={product} index={index} onQuickView={onQuickView} onAdd={onAdd} wished={wishes.has(productId(product))} onWish={onWish} />)}</motion.div>
}

function FeaturedProduct({ product, onQuickView, onAdd, onBuyNow }) {
  if (!product) return null
  const available = inStock(product)
  return <section className="featured-section" id="featured"><div className="featured-image-panel"><ProductImage product={product} loading="lazy" /><span className="featured-image-mark">F<span>&</span>F</span><span className="featured-image-label">A CLOSER LOOK</span></div>
    <div className="featured-copy"><div className="section-kicker"><span>02</span><span className="kicker-rule" /><span>THE FEATURED FIND</span></div><span className="featured-label"><Sparkles size={13} /> FEATURED</span><p className="featured-brand">{product.brand || product.category || 'SELECTED FIND'}</p><h2>{product.name}</h2><div className="featured-rating"><Rating product={product} /></div><p className="featured-description">{product.description || 'No description available.'}</p><div className="featured-buy-row"><strong>{priceFor(product) !== null ? money.format(priceFor(product)) : 'Price unavailable'}</strong><span className={`featured-stock${available ? '' : ' out'}`}><span />{available ? 'Available now' : 'Out of stock'}</span></div><div className="featured-actions"><button type="button" className="button button-dark" disabled={!available} onClick={() => onAdd(product)}>Add to bag <ShoppingBag size={16} /></button><button type="button" className="button button-outline" disabled={!available} onClick={() => onBuyNow(product)}>Buy now <ArrowRight size={15} /></button><button type="button" className="button button-light" onClick={() => onQuickView(product)}>Details <ArrowUpRight size={14} /></button></div></div>
  </section>
}

function ProductDialog({ product, onClose, onAdd }) {
  const dialogRef = useRef(null)
  useEffect(() => { const dialog = dialogRef.current; if (product && dialog && !dialog.open) dialog.showModal(); if (!product && dialog?.open) dialog.close() }, [product])
  if (!product) return <dialog ref={dialogRef} />
  const available = inStock(product)
  const inventory = inventoryFor(product)
  return <dialog className="quick-dialog" ref={dialogRef} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => event.target === event.currentTarget && onClose()}><motion.div className="quick-view" initial={{ opacity: 0, y: 16, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }}><button className="dialog-close" type="button" aria-label="Close product details" onClick={onClose}><X size={19} /></button><div className="quick-image"><ProductImage product={product} loading="eager" /></div><div className="quick-details"><span className="eyebrow"><span className="eyebrow-dot" /> {product.category || 'COLLECTION'}</span><span className="quick-brand">{product.brand || 'CURATED FIND'}</span><h2>{product.name || 'Untitled product'}</h2><div className="quick-rating"><Rating product={product} /></div><p className="quick-description">{product.description || 'No description available.'}</p><div className="quick-price">{priceFor(product) !== null ? money.format(priceFor(product)) : 'Price unavailable'}</div><div className={`quick-stock${available ? '' : ' out'}`}><span />{available ? 'In stock' : 'Out of stock'}{inventory !== null && <small>{inventory} available</small>}</div><button type="button" className="button button-dark quick-add-button" disabled={!available} onClick={() => onAdd(product)}>Add to bag <ShoppingBag size={16} /></button></div></motion.div></dialog>
}

function CartDialog({ open, onClose, items, onQuantity, onRemove, onCheckout }) {
  const dialogRef = useRef(null)
  useEffect(() => { const dialog = dialogRef.current; if (open && dialog && !dialog.open) dialog.showModal(); if (!open && dialog?.open) dialog.close() }, [open])
  const subtotal = items.reduce((sum, item) => sum + (priceFor(item.product) || 0) * item.quantity, 0)
  const hasUnpricedItems = items.some((item) => priceFor(item.product) === null)
  return <dialog className="cart-dialog" ref={dialogRef} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose() } }} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => event.target === event.currentTarget && onClose()}><motion.aside className="cart-drawer" initial={{ x: 24, opacity: 0.7 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.22 }} aria-label="Shopping bag">
    <div className="drawer-header"><div><span className="eyebrow"><span className="eyebrow-dot" /> YOUR SELECTION</span><h2>Your bag <span>({items.reduce((sum, item) => sum + item.quantity, 0)})</span></h2></div><button className="icon-button" type="button" aria-label="Close cart" onClick={onClose}><X size={19} /></button></div>
    <div className="cart-items">{items.length ? items.map(({ product, quantity }) => <article className="cart-item" key={productId(product)}><div className="cart-item-image"><ProductImage product={product} /></div><div className="cart-item-details"><span className="cart-item-brand">{product.brand || product.category || 'CURATED FIND'}</span><strong>{product.name}</strong><span className="cart-item-price">{priceFor(product) !== null ? money.format(priceFor(product)) : 'Price unavailable'}</span><div className="quantity-control"><button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => onQuantity(product, quantity - 1)}><Minus size={13} /></button><span>{quantity}</span><button type="button" aria-label={`Increase ${product.name} quantity`} disabled={inventoryFor(product) !== null && quantity >= inventoryFor(product)} onClick={() => onQuantity(product, quantity + 1)}><Plus size={13} /></button></div></div><button className="remove-item" type="button" aria-label={`Remove ${product.name}`} onClick={() => onRemove(product)}><Trash2 size={16} /></button></article>) : <div className="cart-empty"><span className="empty-icon"><ShoppingBag size={22} /></span><h3>Your bag is taking a breather.</h3><p>Find something you love and it will be waiting here.</p><button type="button" className="button button-outline" onClick={onClose}>Explore the collection <ArrowRight size={15} /></button></div>}</div>
    <div className="drawer-summary"><div className="subtotal-row"><span>Subtotal</span><strong>{hasUnpricedItems ? 'Unavailable' : money.format(subtotal)}</strong></div><p>Shipping and taxes calculated at checkout.</p><button type="button" className="button button-dark checkout-button" disabled={!items.length} onClick={onCheckout}>Continue to checkout <ArrowRight size={16} /></button><span className="secure-note"><Check size={13} /> Thoughtful finds, carefully chosen</span></div>
  </motion.aside></dialog>
}

function Toast({ message }) {
  return <AnimatePresence>{message && <motion.div className="toast-message" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span><Check size={15} /></span>{message}</motion.div>}</AnimatePresence>
}

function Footer({ categories }) {
  return <footer className="site-footer" id="footer"><div className="footer-main"><div className="footer-brand-block"><a className="brand footer-brand" href="#home"><span className="brand-mark"><span /></span><span>form<span className="brand-amp">&</span>field</span></a><p>Useful things, thoughtfully found.<br />A more considered everyday starts here.</p></div><div className="footer-column"><span>EXPLORE</span><a href="#products">Shop all</a><a href="#categories">Categories</a><a href="#featured">Featured find</a></div><div className="footer-column"><span>THE COLLECTION</span>{categories.slice(0, 4).map((category) => <a href="#products" key={category}>{category}</a>)}{!categories.length && <a href="#products">Shop products</a>}</div><div className="footer-column"><span>NEED A HAND?</span><a href="#footer">Support</a><a href="#footer">Shipping & returns</a><a href="#footer">Contact</a><span className="social-links" aria-label="Social links"><button type="button" aria-label="Social account not configured" disabled><Camera size={15} /></button><button type="button" aria-label="Community account not configured" disabled><UsersRound size={15} /></button><button type="button" aria-label="Video channel not configured" disabled><CirclePlay size={16} /></button></span></div></div><div className="footer-bottom"><span>© {currentYear} Form & Field</span><span>Made for the everyday, and everything in it.</span><a href="#home">Back to top <ChevronLeft size={13} /></a></div></footer>
}

function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sort, setSort] = useState('featured')
  const [availability, setAvailability] = useState('all')
  const [cart, setCart] = useState([])
  const [wishes, setWishes] = useState(() => new Set())
  const [quickProduct, setQuickProduct] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProducts() {
      setLoading(true)
      setError('')
      if (!API_URL) { setError('Connect your product catalog to get started. Set VITE_PRODUCTS_API_URL to your products endpoint, then retry.'); setLoading(false); return }
      try {
        const response = await fetch(API_URL, { signal: controller.signal })
        if (!response.ok) throw new Error(`Products could not be loaded (${response.status}).`)
        setProducts(readProducts(await response.json()))
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') setError('Unable to load products right now. Check your connection and try again.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    loadProducts()
    return () => controller.abort()
  }, [attempt])
  useEffect(() => () => window.clearTimeout(toastTimer.current), [])
  useEffect(() => {
    function focusCatalogSearch(event) {
      const target = event.target
      const isTyping = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (event.key === '/' && !isTyping) {
        event.preventDefault()
        document.querySelector('.filter-search input')?.focus()
      }
    }
    window.addEventListener('keydown', focusCatalogSearch)
    return () => window.removeEventListener('keydown', focusCatalogSearch)
  }, [])

  const categories = useMemo(() => getCategories(products), [products])
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const filtered = products.filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory
      const matchesSearch = !query || [product.name, product.brand, product.category, product.description].some((value) => String(value || '').toLocaleLowerCase().includes(query))
      const matchesAvailability = availability === 'all' || (availability === 'in-stock' ? inStock(product) : !inStock(product))
      return matchesCategory && matchesSearch && matchesAvailability
    })
    if (sort === 'price-asc') filtered.sort((first, second) => (priceFor(first) ?? Infinity) - (priceFor(second) ?? Infinity))
    if (sort === 'price-desc') filtered.sort((first, second) => (priceFor(second) ?? -Infinity) - (priceFor(first) ?? -Infinity))
    if (sort === 'rating') filtered.sort((first, second) => (ratingFor(second) || 0) - (ratingFor(first) || 0))
    if (sort === 'newest') filtered.sort((first, second) => new Date(second.createdAt || second.updatedAt || 0) - new Date(first.createdAt || first.updatedAt || 0))
    return filtered
  }, [products, search, activeCategory, availability, sort])
  const featuredProduct = useMemo(() => [...products].sort((first, second) => (ratingFor(second) || 0) - (ratingFor(first) || 0))[0], [products])
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const hasFilters = Boolean(search || activeCategory !== 'All' || sort !== 'featured' || availability !== 'all')

  function notify(message) { setToast(message); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 2600) }
  function addToCart(product) {
    if (!inStock(product)) return
    setCart((current) => {
      const existing = current.find((item) => productId(item.product) === productId(product))
      const limit = inventoryFor(product)
      if (existing) return current.map((item) => item === existing ? { ...item, quantity: limit !== null ? Math.min(item.quantity + 1, limit) : item.quantity + 1 } : item)
      return [...current, { product, quantity: 1 }]
    })
    notify('Added to your bag')
  }
  function updateQuantity(product, quantity) {
    if (quantity < 1) return removeFromCart(product)
    const limit = inventoryFor(product)
    setCart((current) => current.map((item) => item.product === product ? { ...item, quantity: limit !== null ? Math.min(quantity, limit) : quantity } : item))
  }
  function removeFromCart(product) { setCart((current) => current.filter((item) => item.product !== product)) }
  function buyNow(product) { if (inStock(product)) { addToCart(product); setCartOpen(true) } }
  function clearFilters() { setSearch(''); setActiveCategory('All'); setSort('featured'); setAvailability('all') }
  function toggleWish(product) {
    setWishes((current) => { const next = new Set(current); if (next.has(productId(product))) next.delete(productId(product)); else next.add(productId(product)); return next })
  }

  return (
    <MotionConfig reducedMotion="user"><div className="storefront"><Navbar cartCount={cartCount} onCart={() => setCartOpen(true)} onAccount={() => notify('Account access is not configured yet')} search={search} setSearch={setSearch} /><main><div className="page-shell">
      <Hero products={products} categories={categories} /><CategoryNav categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      <section className="catalog-section" id="products"><div className="catalog-heading"><div><div className="section-kicker"><span>03</span><span className="kicker-rule" /><span>THE EDIT</span></div><h2>Discover your next <em>favorite.</em></h2><p>Quality products, thoughtfully curated.</p></div><span className="result-count">{loading ? 'Finding your next favorite...' : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'product' : 'products'}`}</span></div>
        <FilterBar search={search} setSearch={setSearch} categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} sort={sort} setSort={setSort} availability={availability} setAvailability={setAvailability} onClear={clearFilters} hasFilters={hasFilters} />
        {error && <div className="api-error" role="alert"><div className="api-error-icon"><ShoppingBag size={19} /></div><div><strong>We couldn’t bring in the collection.</strong><p>{error}</p></div><button type="button" className="button button-outline" onClick={() => setAttempt((value) => value + 1)}>Try again <ArrowRight size={14} /></button></div>}
        <ProductGrid products={visibleProducts} loading={loading} error={Boolean(error)} onQuickView={setQuickProduct} onAdd={addToCart} wishes={wishes} onWish={toggleWish} onClear={clearFilters} />
      </section><FeaturedProduct product={featuredProduct} onQuickView={setQuickProduct} onAdd={addToCart} onBuyNow={buyNow} /><section className="closing-note"><span className="closing-mark">F<span>&</span>F</span><p>Fewer, better things.<br /><em>Chosen for the way you live.</em></p><a href="#products" aria-label="Return to products"><ArrowUpRight size={19} /></a></section>
    </div></main><Footer categories={categories} /><ProductDialog product={quickProduct} onClose={() => setQuickProduct(null)} onAdd={addToCart} /><CartDialog open={cartOpen} onClose={() => setCartOpen(false)} items={cart} onQuantity={updateQuantity} onRemove={removeFromCart} onCheckout={() => notify('Checkout is not configured yet')} /><Toast message={toast} /></div></MotionConfig>
  )
}

export default App
