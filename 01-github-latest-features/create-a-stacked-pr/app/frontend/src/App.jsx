import { useEffect, useState } from "react";
import {
  Coffee,
  Croissant,
  CupSoda,
  Leaf,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const API = "/api/menu";
const TODAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date()).toUpperCase();
const CATEGORIES = [
  { id: "all", label: "Everything", Icon: Sparkles },
  { id: "espresso", label: "Coffee bar", Icon: Coffee },
  { id: "tea", label: "Tea & coolers", Icon: CupSoda },
  { id: "bakery", label: "Bakery", Icon: Croissant },
];
const EMPTY_DRAFT = {
  name: "",
  note: "",
  price: "",
  category: "espresso",
  available: true,
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

function DrinkArt({ category, name }) {
  return (
    <div className={`drink-art drink-art--${category}`} aria-hidden="true">
      <div className="drink-art__sun" />
      <div className="drink-cup">
        <span className="drink-cup__liquid" />
        <span className="drink-cup__handle" />
      </div>
      <span className="drink-art__label">{name.split(" ")[0]}</span>
    </div>
  );
}

function App() {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMenu() {
    setLoading(true);
    setError("");
    try {
      setItems(await request(API));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  function openNewItem() {
    setDraft({ ...EMPTY_DRAFT });
    setEditingId(null);
    setEditorOpen(true);
    setError("");
  }

  function openEditItem(item) {
    setDraft({ ...item, price: item.price.toFixed(2) });
    setEditingId(item.id);
    setEditorOpen(true);
    setError("");
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setError("");
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = { ...draft, price: Number(draft.price) };
    const url = editingId ? `${API}/${editingId}` : API;
    try {
      const saved = await request(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? saved : item))
          : [...current, saved],
      );
      closeEditor();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    setError("");
    try {
      const updated = await request(`${API}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...item, available: !item.available }),
      });
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updated.id ? updated : currentItem,
        ),
      );
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Remove ${item.name} from the menu?`)) return;
    setError("");
    try {
      await request(`${API}/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      if (editingId === item.id) closeEditor();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const visibleItems = items.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const searchText = `${item.name} ${item.note}`.toLowerCase();
    return matchesCategory && searchText.includes(search.trim().toLowerCase());
  });
  const availableCount = items.filter((item) => item.available).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#menu" aria-label="Rill and Roast home">
          <span className="brand__mark"><Coffee size={21} strokeWidth={1.8} /></span>
          <span className="brand__name">rill <i>&</i> roast</span>
        </a>

        <div className="sidebar__section-label">YOUR COUNTER</div>
        <nav className="category-nav" aria-label="Menu categories">
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button
              className={`nav-item ${activeCategory === id ? "is-active" : ""}`}
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {id === "all" && <span className="nav-count">{items.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="sidebar-note__icon"><Leaf size={17} /></span>
          <p>Good things take time.<br /><strong>Make it a slow morning.</strong></p>
          <span className="sidebar-note__stamp">EST. 2019 · PORTLAND</span>
        </div>

        <div className="sidebar__footer">
          <span className="status-dot" /> Counter open
          <span className="sidebar__time">TODAY</span>
        </div>
      </aside>

      <main className="main-content" id="menu">
        <header className="topbar">
          <div className="breadcrumb">RILL & ROAST <span>/</span> MENU</div>
          <div className="topbar__right">
            <span className="service-status"><span className="status-dot" /> SERVICE ON</span>
            <span className="avatar" aria-label="Cafe manager">M</span>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">{TODAY} <span>·</span> A LITTLE BIT OF JOY</p>
            <h1>Today's menu<span>.</span></h1>
            <p className="page-heading__copy">A few good things, made fresh and served with care.</p>
          </div>
          <div className="heading-art" aria-hidden="true">
            <span className="heading-art__orbit" />
            <span className="heading-art__bean heading-art__bean--one" />
            <span className="heading-art__bean heading-art__bean--two" />
            <span className="heading-art__spark">✳</span>
            <span className="heading-art__words">TAKE<br />IT SLOW</span>
          </div>
        </section>

        <section className="summary-strip" aria-label="Menu summary">
          <div className="summary-stat">
            <span className="summary-stat__number">{items.length.toString().padStart(2, "0")}</span>
            <span className="summary-stat__label">MENU ITEMS</span>
          </div>
          <span className="summary-divider" />
          <div className="summary-stat">
            <span className="summary-stat__number">{availableCount.toString().padStart(2, "0")}</span>
            <span className="summary-stat__label">ON THE COUNTER</span>
          </div>
          <span className="summary-divider" />
          <div className="summary-stat summary-stat--note">
            <span className="summary-stat__label">FRESHLY UPDATED</span>
            <span className="summary-stat__message"><Sparkles size={14} /> Your little corner of the world.</span>
          </div>
          <button className="button button--primary summary-add" type="button" onClick={openNewItem}>
            <Plus size={17} /> Add a menu item
          </button>
        </section>

        <nav className="mobile-category-nav" aria-label="Filter menu category">
          {CATEGORIES.map(({ id, label }) => (
            <button
              className={`mobile-category-button ${activeCategory === id ? "is-active" : ""}`}
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && (
          <div className="notice" role="alert">
            <span>{error}</span>
            {!items.length && <button type="button" onClick={loadMenu}>Try again</button>}
            {editorOpen && <button className="icon-button" type="button" title="Dismiss" onClick={() => setError("")}><X size={16} /></button>}
          </div>
        )}

        {editorOpen && (
          <section className="editor-panel" aria-labelledby="editor-title">
            <div className="editor-panel__heading">
              <div>
                <p className="eyebrow">THE DETAILS</p>
                <h2 id="editor-title">{editingId ? "A little update" : "Something new"}</h2>
              </div>
              <button className="icon-button" type="button" title="Close editor" onClick={closeEditor}><X size={18} /></button>
            </div>
            <form className="item-form" onSubmit={saveItem}>
              <label>
                <span>Item name</span>
                <input autoFocus maxLength="40" minLength="2" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Honey oat latte" required value={draft.name} />
              </label>
              <label className="item-form__wide">
                <span>Short description</span>
                <input maxLength="100" onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="What makes it lovely?" required value={draft.note} />
              </label>
              <label>
                <span>Price</span>
                <div className="price-input"><span>$</span><input max="100" min="0.01" onChange={(event) => setDraft({ ...draft, price: event.target.value })} required step="0.01" type="number" value={draft.price} /></div>
              </label>
              <label>
                <span>Category</span>
                <select onChange={(event) => setDraft({ ...draft, category: event.target.value })} value={draft.category}>
                  <option value="espresso">Coffee bar</option>
                  <option value="tea">Tea & coolers</option>
                  <option value="bakery">Bakery</option>
                </select>
              </label>
              <label className="availability-control">
                <input checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} type="checkbox" />
                <span className="switch" />
                <span>Available today</span>
              </label>
              <div className="item-form__actions">
                <button className="button button--quiet" type="button" onClick={closeEditor}>Cancel</button>
                <button className="button button--primary" disabled={saving} type="submit">
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add to today's menu"}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="menu-toolbar">
          <div>
            <p className="eyebrow">MADE WITH A LITTLE EXTRA CARE</p>
            <h2>{activeCategory === "all" ? "On the menu" : CATEGORIES.find((category) => category.id === activeCategory)?.label}</h2>
          </div>
          <label className="search-box">
            <Search size={17} />
            <input aria-label="Search menu" onChange={(event) => setSearch(event.target.value)} placeholder="Find something…" value={search} />
            {search && <button className="search-box__clear" type="button" title="Clear search" onClick={() => setSearch("")}><X size={15} /></button>}
          </label>
        </div>

        {loading ? (
          <div className="empty-state"><span className="loader" /><p>Warming up the counter…</p></div>
        ) : visibleItems.length ? (
          <section className="menu-grid" aria-label="Menu items">
            {visibleItems.map((item, index) => (
              <article className={`menu-item ${!item.available ? "menu-item--unavailable" : ""}`} key={item.id} style={{ "--item-index": index }}>
                <DrinkArt category={item.category} name={item.name} />
                <div className="menu-item__body">
                  <div className="menu-item__topline">
                    <span className={`category-tag category-tag--${item.category}`}>{item.category === "espresso" ? "COFFEE BAR" : item.category === "tea" ? "TEA & COOLERS" : "FROM THE OVEN"}</span>
                    <button className="item-price" type="button" title="Edit item" onClick={() => openEditItem(item)}>${item.price.toFixed(2)}</button>
                  </div>
                  <h3>{item.name}</h3>
                  <p className="menu-item__note">{item.note}</p>
                  <div className="menu-item__footer">
                    <button className={`availability-pill ${item.available ? "is-available" : "is-unavailable"}`} type="button" onClick={() => toggleAvailability(item)} aria-label={`${item.available ? "Mark" : "Put"} ${item.name} ${item.available ? "unavailable" : "available"}`}>
                      <span /> {item.available ? "On the counter" : "Sold out"}
                    </button>
                    <div className="item-actions">
                      <button className="icon-button" type="button" title={`Edit ${item.name}`} onClick={() => openEditItem(item)}><span className="sr-only">Edit</span><Pencil size={15} /></button>
                      <button className="icon-button icon-button--delete" type="button" title={`Remove ${item.name}`} onClick={() => deleteItem(item)}><span className="sr-only">Remove</span><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="empty-state empty-state--empty">
            <span className="empty-state__icon"><Coffee size={22} /></span>
            <h3>{items.length ? "Nothing on this little list" : "The counter is waiting"}</h3>
            <p>{items.length ? "Try another search or add something new." : "Add the first item to today's menu."}</p>
            {items.length > 0 && search ? <button className="button button--quiet" type="button" onClick={() => setSearch("")}>Clear search</button> : <button className="button button--primary" type="button" onClick={openNewItem}><Plus size={16} /> Add a menu item</button>}
          </div>
        )}

        <footer className="page-footer">
          <span>MADE FRESH IN PORTLAND, OREGON</span>
          <span className="page-footer__center"><span className="status-dot" /> ALL GOOD AT THE COUNTER</span>
          <span>R&R <span className="footer-star">✳</span> 2019—{new Date().getFullYear()}</span>
        </footer>
      </main>
    </div>
  );
}

export default App;