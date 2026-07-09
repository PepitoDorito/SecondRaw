/* ==========================================================================
   SecondRaw — App (router + vistas)
   SPA em vanilla JS. Cada RF (requisito funcional) está anotado no código.
   ========================================================================== */
(function () {
  "use strict";

  const S = window.Store;
  const appEl = document.getElementById("app");
  const navEl = document.getElementById("appNav");

  /* ---------- Helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const money = (n) =>
    "€" + Number(n || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const initials = (name) =>
    (name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const catLabel = (id) => (S.CATEGORIES.find((c) => c.id === id) || {}).label || id;
  const catSwatch = (id) => (S.CATEGORIES.find((c) => c.id === id) || {}).swatch || "stone";
  const condLabel = (id) => (S.CONDITIONS.find((c) => c.id === id) || {}).label || id;

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "agora mesmo";
    const m = Math.floor(s / 60);
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `há ${d} dia${d > 1 ? "s" : ""}`;
    return new Date(ts).toLocaleDateString("pt-PT");
  }
  const dateStr = (ts) => new Date(ts).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

  function toast(msg, kind) {
    const host = document.getElementById("toastHost");
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " toast--" + kind : "");
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .3s, transform .3s";
      t.style.opacity = "0";
      t.style.transform = "translateY(8px)";
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  function modal(html) {
    const host = document.getElementById("modalHost");
    host.innerHTML = `<div class="modal-backdrop" id="mb"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const close = () => (host.innerHTML = "");
    $("#mb").addEventListener("click", (e) => { if (e.target.id === "mb") close(); });
    $$(".modal__close, [data-close]", host).forEach((b) => b.addEventListener("click", close));
    return { close, root: $(".modal", host) };
  }

  function stars(n) {
    const full = Math.round(n);
    return `<span class="stars" aria-label="${n} de 5">${"★".repeat(full)}${"☆".repeat(5 - full)}</span>`;
  }

  function swatch(cat) {
    return `<div class="swatch swatch--${catSwatch(cat)}"></div>`;
  }

  /* ---------- Ícones (traço, coerentes com a landing) ---------- */
  const ICONS = {
    chat: '<path d="M4 5.5h16v11h-9.5L6 20v-3.5H4z"/>',
    bell: '<path d="M18 10a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 15 18 10z"/><path d="M10 19.5a2.3 2.3 0 0 0 4 0"/>',
    cart: '<path d="M3.5 4.5h2.2L8 15h10l2-7.5H6.2"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
    pin: '<path d="M12 21c-4-3.8-6-7-6-9.8A6 6 0 0 1 18 11.2C18 14 16 17.2 12 21z"/><circle cx="12" cy="11" r="2.3"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M10.8 18.5h2.4"/>',
    cardpay: '<rect x="2.5" y="5" width="19" height="14" rx="2.6"/><path d="M2.5 9.5h19M6 15h4"/>',
    ref: '<rect x="4" y="3" width="16" height="18" rx="2.4"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M15 9.3a4 4 0 1 0 0 5.4M8.2 11h4M8.2 13h4"/>',
    box: '<path d="M3.5 7.5 12 3.5l8.5 4v9l-8.5 4-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5V20.5"/>',
    swap: '<path d="M6.5 9.5h11l-3.2-3.2M17.5 14.5h-11l3.2 3.2"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9z"/>',
    check: '<path d="M5 13l4.5 4.5L19 7"/>',
    google: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 12h-8.5"/>',
    apple: '<path fill="currentColor" stroke="none" d="M16.7 12.9c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6s1.8-1 2.4-1.9c.8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.1zM14.9 6.7c.5-.7.9-1.6.8-2.6-.8 0-1.8.6-2.3 1.3-.5.6-1 1.6-.8 2.5.9.1 1.8-.5 2.3-1.2z"/>',
  };
  const icon = (n, cls) =>
    `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;

  /* ---------- Cart (RF15) ---------- */
  const CART_KEY = "secondraw:cart";
  const Cart = {
    items() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
    save(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); updateNav(); },
    add(listingId, qty = 1) {
      const items = Cart.items();
      const ex = items.find((i) => i.listingId === listingId);
      if (ex) ex.qty += qty; else items.push({ listingId, qty });
      Cart.save(items);
    },
    setQty(listingId, qty) {
      let items = Cart.items();
      const it = items.find((i) => i.listingId === listingId);
      if (it) it.qty = Math.max(1, qty);
      Cart.save(items);
    },
    remove(listingId) { Cart.save(Cart.items().filter((i) => i.listingId !== listingId)); },
    clear() { Cart.save([]); },
    count() { return Cart.items().reduce((s, i) => s + i.qty, 0); },
  };

  /* ---------- Auth guard ---------- */
  function requireAuth() {
    const u = S.currentUser();
    if (!u) { toast("Inicia sessão para continuar.", "err"); location.hash = "#/entrar"; return null; }
    return u;
  }

  /* ==========================================================================
     Navegação (header)
     ======================================================================== */
  function updateNav() {
    const u = S.currentUser();
    const cartN = Cart.count();
    const unread = u ? S.notificationsFor(u.id).filter((n) => !n.read).length : 0;

    let html = `<a href="#/" data-route="/">Mercado</a>`;
    if (u) {
      html += `<a href="#/vender" data-route="/vender">Vender</a>`;
      html += `<button class="navchip" data-go="#/mensagens" title="Mensagens" aria-label="Mensagens">${icon("chat")}</button>`;
      html += `<button class="navchip" data-go="#/notificacoes" title="Notificações" aria-label="Notificações">${icon("bell")}${unread ? `<span class="navchip__badge">${unread}</span>` : ""}</button>`;
      html += `<button class="navchip" data-go="#/carrinho" title="Carrinho" aria-label="Carrinho">${icon("cart")}${cartN ? `<span class="navchip__badge">${cartN}</span>` : ""}</button>`;
      if (u.role === "admin") html += `<a href="#/admin" data-route="/admin">Admin</a>`;
      html += `<button class="navchip" id="userMenuBtn" title="Conta"><span class="avatar">${initials(u.name)}</span></button>`;
    } else {
      html += `<button class="navchip" data-go="#/carrinho" title="Carrinho" aria-label="Carrinho">${icon("cart")}${cartN ? `<span class="navchip__badge">${cartN}</span>` : ""}</button>`;
      html += `<a href="#/entrar" data-route="/entrar">Entrar</a>`;
      html += `<a href="#/registar" class="btn btn--solid btn--sm">Criar conta</a>`;
    }
    navEl.innerHTML = html;

    $$("[data-go]", navEl).forEach((b) => b.addEventListener("click", () => (location.hash = b.dataset.go)));
    const um = $("#userMenuBtn");
    if (um) um.addEventListener("click", userMenu);

    // marca a rota ativa
    const path = (location.hash.replace(/^#/, "") || "/").split("?")[0];
    $$("a[data-route]", navEl).forEach((a) => a.classList.toggle("is-active", a.dataset.route === path));
  }

  function userMenu() {
    const u = S.currentUser();
    const r = S.ratingFor(u.id);
    const m = modal(`
      <button class="modal__close" aria-label="Fechar">×</button>
      <div class="flex" style="gap:.9rem">
        <span class="avatar avatar--lg">${initials(u.name)}</span>
        <div><h2 style="margin:0">${esc(u.name)}</h2>
        <div class="muted" style="font-size:.85rem">${esc(u.email)}</div>
        <div class="pill-row mt-1">
          <span class="badge ${u.type === "company" ? "badge--accent" : "badge--muted"}">${u.type === "company" ? "Empresa" : "Comprador"}</span>
          ${u.nifVerified ? '<span class="badge badge--ok">✓ Verificada</span>' : ""}
          ${u.premium ? '<span class="badge badge--gold">Premium</span>' : ""}
          ${r.count ? `<span class="badge badge--star">★ ${r.avg} (${r.count})</span>` : ""}
        </div></div>
      </div>
      <hr class="hr" />
      <div class="btn-row" style="flex-direction:column;align-items:stretch">
        <a class="btn btn--outline" href="#/perfil" data-close>O meu perfil</a>
        <a class="btn btn--outline" href="#/os-meus-anuncios" data-close>Os meus anúncios</a>
        <a class="btn btn--outline" href="#/compras" data-close>Compras</a>
        <a class="btn btn--outline" href="#/vendas" data-close>Vendas & propostas</a>
        <a class="btn btn--outline" href="#/premium" data-close>Premium & sustentabilidade</a>
        ${u.role === "admin" ? '<a class="btn btn--outline" href="#/admin" data-close>Backoffice</a>' : ""}
        <button class="btn btn--danger" id="logoutBtn">Terminar sessão</button>
      </div>`);
    $("#logoutBtn", m.root).addEventListener("click", () => {
      S.logout(); m.close(); toast("Sessão terminada."); location.hash = "#/"; render();
    });
  }

  /* ==========================================================================
     Router
     ======================================================================== */
  const routes = [];
  const route = (re, handler) => routes.push({ re, handler });

  function parseQuery(qs) {
    const o = {};
    new URLSearchParams(qs || "").forEach((v, k) => (o[k] = v));
    return o;
  }

  function render() {
    updateNav();
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    for (const r of routes) {
      const m = path.match(r.re);
      if (m) {
        appEl.innerHTML = "";
        window.scrollTo(0, 0);
        try {
          r.handler(m.slice(1), parseQuery(qs));
        } catch (e) {
          console.error(e);
          appEl.innerHTML = `<div class="empty"><h3>Ocorreu um erro</h3><p>${esc(e.message)}</p></div>`;
        }
        return;
      }
    }
    appEl.innerHTML = `<div class="empty"><h3>Página não encontrada</h3><a class="btn btn--solid mt-2" href="#/">Voltar ao mercado</a></div>`;
  }

  /* ==========================================================================
     VISTA: Mercado — pesquisa, filtros, ordenação (RF11–RF13)
     ======================================================================== */
  let marketState = { q: "", category: "", condition: "", minPrice: "", maxPrice: "", minQty: "", location: "", sort: "destaque" };

  function viewMarket(_, query) {
    // O mercado é reservado a utilizadores com sessão iniciada.
    // Sem sessão, mostramos a landing page institucional.
    if (!S.currentUser()) { location.replace("index.html"); return; }
    if (query.q != null) marketState.q = query.q;
    if (query.category != null) marketState.category = query.category;

    appEl.innerHTML = `
      <div class="page-head">
        <p class="eyebrow"><span class="eyebrow__dot"></span>O mercado circular</p>
        <h1>Materiais com <em>segunda vida.</em></h1>
        <p>Lotes inspecionados de empresas e particulares — madeira, metal, têxtil, plástico, construção e mais.</p>
      </div>
      <div class="grid-2">
        <aside class="filters card" id="filters"></aside>
        <div>
          <div class="toolbar">
            <span class="toolbar__count" id="resultCount"></span>
            <div class="flex">
              <label class="muted" style="font-size:.85rem" for="sortSel">Ordenar</label>
              <select class="select" id="sortSel" style="width:auto">
                <option value="destaque">Em destaque</option>
                <option value="recent">Mais recente</option>
                <option value="price-asc">Preço ↑</option>
                <option value="price-desc">Preço ↓</option>
              </select>
            </div>
          </div>
          <div class="listings-grid" id="results"></div>
        </div>
      </div>`;

    renderFilters();
    $("#sortSel").value = marketState.sort;
    $("#sortSel").addEventListener("change", (e) => { marketState.sort = e.target.value; renderResults(); });
    renderResults();
  }

  function renderFilters() {
    const f = $("#filters");
    f.innerHTML = `
      <h3>Categoria</h3>
      <div class="chips" id="catChips">
        <button class="chip ${!marketState.category ? "is-active" : ""}" data-cat="">Todas</button>
        ${S.CATEGORIES.map((c) => `<button class="chip ${marketState.category === c.id ? "is-active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("")}
      </div>
      <h3 style="margin-top:1.2rem">Estado</h3>
      <div class="chips" id="condChips">
        <button class="chip ${!marketState.condition ? "is-active" : ""}" data-cond="">Qualquer</button>
        ${S.CONDITIONS.map((c) => `<button class="chip ${marketState.condition === c.id ? "is-active" : ""}" data-cond="${c.id}">${c.label}</button>`).join("")}
      </div>
      <h3 style="margin-top:1.2rem">Preço (€)</h3>
      <div class="row">
        <input class="input" id="fMin" type="number" min="0" placeholder="mín" value="${esc(marketState.minPrice)}">
        <input class="input" id="fMax" type="number" min="0" placeholder="máx" value="${esc(marketState.maxPrice)}">
      </div>
      <h3 style="margin-top:1.2rem">Localização</h3>
      <input class="input" id="fLoc" placeholder="ex.: Porto" value="${esc(marketState.location)}">
      <h3 style="margin-top:1.2rem">Quantidade mín.</h3>
      <input class="input" id="fQty" type="number" min="0" placeholder="ex.: 100" value="${esc(marketState.minQty)}">
      <button class="btn btn--outline btn--full mt-2" id="clearFilters">Limpar filtros</button>`;

    $$("#catChips .chip", f).forEach((b) => b.addEventListener("click", () => { marketState.category = b.dataset.cat; renderFilters(); renderResults(); }));
    $$("#condChips .chip", f).forEach((b) => b.addEventListener("click", () => { marketState.condition = b.dataset.cond; renderFilters(); renderResults(); }));
    const bind = (id, key) => $(id, f).addEventListener("input", (e) => { marketState[key] = e.target.value; renderResults(); });
    bind("#fMin", "minPrice"); bind("#fMax", "maxPrice"); bind("#fLoc", "location"); bind("#fQty", "minQty");
    $("#clearFilters", f).addEventListener("click", () => {
      marketState = { ...marketState, category: "", condition: "", minPrice: "", maxPrice: "", minQty: "", location: "" };
      renderFilters(); renderResults();
    });
  }

  function renderResults() {
    const items = S.searchListings(marketState);
    $("#resultCount").textContent = `${items.length} lote${items.length !== 1 ? "s" : ""}${marketState.q ? ` para “${marketState.q}”` : ""}`;
    const grid = $("#results");
    if (!items.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Sem resultados</h3><p>Experimenta ajustar os filtros ou a pesquisa.</p></div>`;
      return;
    }
    grid.innerHTML = items.map(listingCard).join("");
    $$(".lcard", grid).forEach((c) => c.addEventListener("click", () => (location.hash = "#/anuncio/" + c.dataset.id)));
  }

  function listingCard(l) {
    const seller = S.userById(l.sellerId);
    const statusBadge =
      l.status === "vendido" ? '<span class="badge badge--sold">Vendido</span>' :
      l.status === "reservado" ? '<span class="badge badge--reserved">Reservado</span>' : "";
    return `
      <button class="lcard" data-id="${l.id}">
        <div class="lcard__media">
          ${swatch(l.category)}
          <div class="lcard__badges">
            ${l.featured ? '<span class="badge badge--gold">★ Destaque</span>' : ""}
            ${statusBadge}
          </div>
        </div>
        <div class="lcard__body">
          <div class="pill-row"><span class="badge badge--muted">${catLabel(l.category)}</span><span class="badge badge--sage">${condLabel(l.condition)}</span></div>
          <div class="lcard__title">${esc(l.title)}</div>
          <div class="lcard__meta">${icon("pin")} ${esc(l.location)} · ${seller ? esc(seller.name) : "—"}${seller && seller.nifVerified ? " ✓" : ""}</div>
          <div class="lcard__foot">
            <span class="lcard__price">${money(l.price)}<small>/${esc(l.unit)}</small></span>
            <span class="muted" style="font-size:.78rem">${l.quantity.toLocaleString("pt-PT")} ${esc(l.unit)}</span>
          </div>
        </div>
      </button>`;
  }

  /* ==========================================================================
     VISTA: Detalhe do anúncio (RF14) + comprar/carrinho/chat/proposta/denúncia
     ======================================================================== */
  function viewListing([id]) {
    const l = S.getListing(id);
    if (!l) { appEl.innerHTML = `<div class="empty"><h3>Anúncio não encontrado</h3></div>`; return; }
    const seller = S.userById(l.sellerId);
    const me = S.currentUser();
    const isOwner = me && me.id === l.sellerId;
    const sold = l.status === "vendido";

    // galeria: usa o swatch da categoria como imagem base (protótipo)
    const photos = l.photos.length ? l.photos : [l.category, l.category, l.category];

    appEl.innerHTML = `
      <div class="crumb"><a href="#/">Mercado</a> › <a href="#/?category=${l.category}">${catLabel(l.category)}</a> › <span>${esc(l.title)}</span></div>
      <div class="detail">
        <div>
          <div class="gallery__main" id="galMain">${swatch(l.category)}
            <div class="lcard__badges">${l.featured ? '<span class="badge badge--gold">★ Destaque</span>' : ""}${sold ? '<span class="badge badge--sold">Vendido</span>' : l.status === "reservado" ? '<span class="badge badge--reserved">Reservado</span>' : ""}</div>
          </div>
          <div class="gallery__thumbs">
            ${photos.map((p, i) => `<button class="gallery__thumb ${i === 0 ? "is-active" : ""}" data-i="${i}">${swatch(l.category)}</button>`).join("")}
          </div>
          <div class="card mt-3">
            <h3 class="t-card">Descrição</h3>
            <p style="white-space:pre-wrap">${esc(l.description)}</p>
          </div>
        </div>

        <div>
          <div class="pill-row"><span class="badge badge--muted">${catLabel(l.category)}</span><span class="badge badge--sage">${condLabel(l.condition)}</span></div>
          <h1 class="detail__title">${esc(l.title)}</h1>
          <div class="muted">${icon("pin")} ${esc(l.location)} · publicado ${timeAgo(l.createdAt)}</div>
          <div class="detail__price">${money(l.price)} <small>/ ${esc(l.unit)}</small></div>

          <dl class="spec-list">
            <div><dt>Quantidade disponível</dt><dd>${l.quantity.toLocaleString("pt-PT")} ${esc(l.unit)}</dd></div>
            <div><dt>Estado do material</dt><dd>${condLabel(l.condition)}</dd></div>
            <div><dt>Categoria</dt><dd>${catLabel(l.category)}</dd></div>
            <div><dt>Estado do anúncio</dt><dd>${l.status[0].toUpperCase() + l.status.slice(1)}</dd></div>
          </dl>

          <div class="detail__seller">
            <span class="avatar">${seller ? initials(seller.name) : "?"}</span>
            <div style="flex:1">
              <a href="#/perfil/${l.sellerId}"><strong>${seller ? esc(seller.name) : "—"}</strong></a>
              ${seller && seller.nifVerified ? '<span class="badge badge--ok" style="margin-left:.4rem">✓ Verificada</span>' : ""}
              <div class="muted" style="font-size:.82rem">${sellerRatingLine(l.sellerId)}</div>
            </div>
          </div>

          ${isOwner ? ownerActions(l) : buyerActions(l, sold)}
        </div>
      </div>`;

    // galeria
    $$(".gallery__thumb").forEach((t) => t.addEventListener("click", () => {
      $$(".gallery__thumb").forEach((x) => x.classList.remove("is-active"));
      t.classList.add("is-active");
    }));

    wireListingActions(l, me, isOwner, sold);
  }

  function sellerRatingLine(id) {
    const r = S.ratingFor(id);
    return r.count ? `${stars(r.avg)} ${r.avg} · ${r.count} avaliação(ões)` : "Ainda sem avaliações";
  }

  function ownerActions(l) {
    return `
      <div class="callout mb-2">Este é o teu anúncio.</div>
      <div class="detail__actions">
        <a class="btn btn--solid" href="#/editar/${l.id}">Editar</a>
        <button class="btn btn--outline" data-act="mark" data-status="reservado">Marcar reservado</button>
        <button class="btn btn--outline" data-act="mark" data-status="vendido">Marcar vendido</button>
        <button class="btn btn--outline" data-act="mark" data-status="ativo">Reativar</button>
        <button class="btn btn--danger" data-act="del">Eliminar</button>
      </div>
      <a class="linklike" href="#/vendas">Ver propostas recebidas →</a>`;
  }

  function buyerActions(l, sold) {
    if (sold) return `<div class="callout callout--gold">Este lote já foi vendido.</div>`;
    return `
      <div class="detail__actions">
        <button class="btn btn--solid btn--big" data-act="buy">Comprar agora</button>
        <button class="btn btn--outline" data-act="cart">Adicionar ao carrinho</button>
      </div>
      <div class="detail__actions">
        <button class="btn btn--outline btn--sm" data-act="propose">Fazer proposta de preço</button>
        <button class="btn btn--outline btn--sm" data-act="chat">Contactar vendedor</button>
        <button class="btn btn--outline btn--sm" data-act="report">Denunciar</button>
      </div>`;
  }

  function wireListingActions(l, me, isOwner, sold) {
    const act = (name, fn) => { const b = $(`[data-act="${name}"]`); if (b) b.addEventListener("click", fn); };

    if (isOwner) {
      $$('[data-act="mark"]').forEach((b) => b.addEventListener("click", () => {
        S.updateListing(l.id, { status: b.dataset.status }); // RF10
        toast("Estado atualizado para " + b.dataset.status + ".", "ok");
        render();
      }));
      act("del", () => {
        modalConfirm("Eliminar anúncio?", "Esta ação não pode ser revertida.", () => {
          S.deleteListing(l.id); toast("Anúncio eliminado.", "ok"); location.hash = "#/os-meus-anuncios";
        });
      });
      return;
    }

    act("cart", () => { Cart.add(l.id); toast("Adicionado ao carrinho.", "ok"); });
    act("buy", () => {
      if (!requireAuth()) return;
      Cart.add(l.id); location.hash = "#/checkout";
    });
    act("propose", () => {
      const u = requireAuth(); if (!u) return; // RF22
      const m = modal(`
        <button class="modal__close">×</button>
        <h2>Fazer proposta</h2>
        <p class="muted">Preço atual: ${money(l.price)}/${esc(l.unit)}</p>
        <div class="field mt-2"><label>A tua proposta (€/${esc(l.unit)})</label><input class="input" id="pAmt" type="number" min="0" step="0.01" value="${l.price}"></div>
        <div class="field"><label>Mensagem (opcional)</label><textarea class="textarea" id="pMsg" placeholder="ex.: Levo o lote completo."></textarea></div>
        <button class="btn btn--solid btn--full" id="pSend">Enviar proposta</button>`);
      $("#pSend", m.root).addEventListener("click", () => {
        const amount = parseFloat($("#pAmt", m.root).value);
        if (!(amount > 0)) return toast("Indica um valor válido.", "err");
        S.createProposal({ listingId: l.id, buyerId: u.id, amount, message: $("#pMsg", m.root).value });
        m.close(); toast("Proposta enviada ao vendedor.", "ok");
      });
    });
    act("chat", () => {
      const u = requireAuth(); if (!u) return; // RF20
      if (u.id === l.sellerId) return toast("És o vendedor deste anúncio.", "err");
      const t = S.openThread(u.id, l.sellerId, l.id);
      location.hash = "#/mensagens?t=" + t.id;
    });
    act("report", () => {
      const u = requireAuth(); if (!u) return; // RF25
      openReport("listing", l.id);
    });
  }

  function openReport(targetType, targetId) {
    const u = S.currentUser();
    const reasons = ["Fraude ou burla", "Conteúdo enganador", "Material proibido", "Spam", "Outro"];
    const m = modal(`
      <button class="modal__close">×</button>
      <h2>Denunciar</h2>
      <p class="muted">A tua denúncia será revista por um moderador.</p>
      <div class="field mt-2"><label>Motivo</label>
        <select class="select" id="rReason">${reasons.map((r) => `<option>${r}</option>`).join("")}</select></div>
      <div class="field"><label>Detalhes (opcional)</label><textarea class="textarea" id="rDetails"></textarea></div>
      <button class="btn btn--solid btn--full" id="rSend">Enviar denúncia</button>`);
    $("#rSend", m.root).addEventListener("click", () => {
      const reason = $("#rReason", m.root).value + (($("#rDetails", m.root).value || "").trim() ? " — " + $("#rDetails", m.root).value.trim() : "");
      S.createReport({ targetType, targetId, reason, byId: u.id });
      m.close(); toast("Denúncia enviada. Obrigado.", "ok");
    });
  }

  /* ==========================================================================
     VISTA: Autenticação — registo, login, recuperação (RF01–RF03)
     ======================================================================== */
  function viewRegister() {
    appEl.innerHTML = `
      <div class="auth"><div class="card">
        <h1>Criar conta</h1>
        <p class="muted">Junta-te ao mercado circular de materiais.</p>
        <div class="oauth mt-2">
          <button data-social="Google">${icon("google")} Continuar com Google</button>
          <button data-social="Apple">${icon("apple")} Continuar com Apple</button>
        </div>
        <div class="divider">ou com email</div>
        <div class="form-error" id="err" hidden></div>
        <div class="field"><label>Tipo de conta</label>
          <div class="seg" id="typeSeg">
            <button type="button" data-type="buyer" class="is-active">Particular / comprador</button>
            <button type="button" data-type="company">Empresa (vendedor)</button>
          </div>
        </div>
        <div class="field"><label>Nome ${'<span class="muted" id="nameHint"></span>'}</label><input class="input" id="rName" placeholder="O teu nome"></div>
        <div class="field" id="nifField" hidden><label>NIF da empresa</label><input class="input" id="rNif" placeholder="500000000"><div class="field__hint">Será validado para verificar a conta (RF05).</div></div>
        <div class="field"><label>Email</label><input class="input" id="rEmail" type="email" placeholder="voce@empresa.pt"></div>
        <div class="field"><label>Palavra-passe</label><input class="input" id="rPass" type="password" placeholder="mínimo 4 caracteres"></div>
        <button class="btn btn--solid btn--full" id="rSubmit">Criar conta</button>
        <p class="auth__alt">Já tens conta? <a href="#/entrar">Entrar</a></p>
      </div></div>`;

    let type = "buyer";
    $$("#typeSeg button").forEach((b) => b.addEventListener("click", () => {
      $$("#typeSeg button").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active"); type = b.dataset.type;
      $("#nifField").hidden = type !== "company";
    }));
    $$("[data-social]").forEach((b) => b.addEventListener("click", () => {
      S.socialLogin(b.dataset.social); toast("Sessão iniciada com " + b.dataset.social + ".", "ok"); location.hash = "#/";
    }));
    $("#rSubmit").addEventListener("click", () => {
      const err = $("#err");
      try {
        const pass = $("#rPass").value;
        if (pass.length < 4) throw new Error("A palavra-passe deve ter pelo menos 4 caracteres.");
        S.register({
          name: $("#rName").value.trim(), email: $("#rEmail").value, password: pass, type,
          nif: $("#rNif").value.trim(),
        });
        toast("Conta criada. Bem-vindo!", "ok");
        location.hash = type === "company" ? "#/perfil" : "#/";
      } catch (e) { err.hidden = false; err.textContent = e.message; }
    });
  }

  function viewLogin() {
    appEl.innerHTML = `
      <div class="auth"><div class="card">
        <h1>Entrar</h1>
        <p class="muted">Bem-vindo de volta.</p>
        <div class="oauth mt-2">
          <button data-social="Google">${icon("google")} Continuar com Google</button>
          <button data-social="Apple">${icon("apple")} Continuar com Apple</button>
        </div>
        <div class="divider">ou com email</div>
        <div class="form-error" id="err" hidden></div>
        <div class="field"><label>Email</label><input class="input" id="lEmail" type="email" placeholder="voce@empresa.pt"></div>
        <div class="field"><label>Palavra-passe</label><input class="input" id="lPass" type="password"></div>
        <button class="btn btn--solid btn--full" id="lSubmit">Entrar</button>
        <p class="auth__alt"><a href="#/recuperar">Esqueci-me da palavra-passe</a></p>
        <p class="auth__alt">Ainda não tens conta? <a href="#/registar">Criar conta</a></p>
        <div class="callout mt-2" style="font-size:.82rem">
          <strong>Contas de demonstração</strong><br>
          admin@secondraw.pt · <code>admin</code> (backoffice)<br>
          vendas@marcenariadouro.pt · <code>demo</code> (empresa)<br>
          marta@cafenorte.pt · <code>demo</code> (comprador)
        </div>
      </div></div>`;
    $$("[data-social]").forEach((b) => b.addEventListener("click", () => {
      S.socialLogin(b.dataset.social); toast("Sessão iniciada.", "ok"); location.hash = "#/";
    }));
    $("#lSubmit").addEventListener("click", () => {
      const err = $("#err");
      try {
        S.login($("#lEmail").value, $("#lPass").value);
        toast("Sessão iniciada.", "ok"); location.hash = "#/";
      } catch (e) { err.hidden = false; err.textContent = e.message; }
    });
  }

  function viewRecover() {
    appEl.innerHTML = `
      <div class="auth"><div class="card">
        <h1>Recuperar palavra-passe</h1>
        <p class="muted">Enviamos-te um link de recuperação por email.</p>
        <div class="field mt-2"><label>Email</label><input class="input" id="rcEmail" type="email"></div>
        <button class="btn btn--solid btn--full" id="rcSubmit">Enviar link</button>
        <p class="auth__alt"><a href="#/entrar">Voltar a entrar</a></p>
      </div></div>`;
    $("#rcSubmit").addEventListener("click", () => {
      const token = S.requestPasswordReset($("#rcEmail").value);
      // simulação: mostramos sempre a mesma mensagem por privacidade
      toast("Se existir uma conta, receberás um email de recuperação.", "ok");
      if (token) console.info("[demo] token de recuperação:", token);
      location.hash = "#/entrar";
    });
  }

  /* ==========================================================================
     VISTA: Perfil próprio (RF04) + verificação empresa (RF05)
     ======================================================================== */
  function viewProfile() {
    const u = requireAuth(); if (!u) return;
    appEl.innerHTML = `
      <div class="page-head"><h1>O meu perfil</h1><p>Gere os teus dados de conta.</p></div>
      <div class="grid-2">
        <div class="card" style="text-align:center">
          <span class="avatar avatar--lg" style="margin:0 auto .8rem">${initials(u.name)}</span>
          <h3 class="t-card">${esc(u.name)}</h3>
          <div class="muted">${esc(u.email)}</div>
          <div class="pill-row mt-2" style="justify-content:center">
            <span class="badge ${u.type === "company" ? "badge--accent" : "badge--muted"}">${u.type === "company" ? "Empresa" : "Comprador"}</span>
            ${u.premium ? '<span class="badge badge--gold">Premium</span>' : ""}
          </div>
          <a class="btn btn--outline btn--sm mt-2" href="#/perfil/${u.id}">Ver perfil público</a>
          ${u.type === "company" ? verificationBlock(u) : ""}
        </div>
        <div class="card">
          <h3 class="t-card">Dados</h3>
          <div class="field"><label>Nome</label><input class="input" id="pName" value="${esc(u.name)}"></div>
          <div class="field"><label>Foto (URL, opcional)</label><input class="input" id="pPhoto" value="${esc(u.photo)}" placeholder="https://…"></div>
          <div class="row">
            <div class="field"><label>Contacto</label><input class="input" id="pPhone" value="${esc(u.phone)}"></div>
            ${u.type === "company" ? `<div class="field"><label>NIF</label><input class="input" id="pNif" value="${esc(u.nif)}"></div>` : ""}
          </div>
          <div class="field"><label>Morada</label><input class="input" id="pAddr" value="${esc(u.address)}"></div>
          <button class="btn btn--solid" id="pSave">Guardar alterações</button>
        </div>
      </div>`;

    $("#pSave").addEventListener("click", () => {
      const patch = {
        name: $("#pName").value.trim(), photo: $("#pPhoto").value.trim(),
        phone: $("#pPhone").value.trim(), address: $("#pAddr").value.trim(),
      };
      if ($("#pNif")) patch.nif = $("#pNif").value.trim();
      S.updateUser(u.id, patch);
      toast("Perfil atualizado.", "ok"); render();
    });
    const vb = $("#verifyBtn");
    if (vb) vb.addEventListener("click", () => {
      if (!u.nif) return toast("Preenche o NIF primeiro.", "err");
      S.requestVerification(u.id);
      toast("Pedido de verificação submetido. Um admin irá validar.", "ok"); render();
    });
  }

  function verificationBlock(u) {
    if (u.nifVerified) return `<div class="callout mt-3" style="text-align:left"><strong>✓ Conta verificada</strong><br><span class="muted">NIF ${esc(u.nif)} validado.</span></div>`;
    if (u.verificationPending) return `<div class="callout callout--gold mt-3" style="text-align:left"><strong>Verificação pendente</strong><br><span class="muted">A aguardar validação do NIF/certidão.</span></div>`;
    return `<div class="callout mt-3" style="text-align:left"><strong>Verificar empresa</strong><br><span class="muted">Valida o teu NIF para ganhar o selo de confiança.</span><button class="btn btn--outline btn--sm mt-1" id="verifyBtn">Pedir verificação</button></div>`;
  }

  /* ==========================================================================
     VISTA: Perfil público + avaliações (RF24)
     ======================================================================== */
  function viewPublicProfile([id]) {
    const u = S.userById(id);
    if (!u) { appEl.innerHTML = `<div class="empty"><h3>Utilizador não encontrado</h3></div>`; return; }
    const r = S.ratingFor(id);
    const reviews = S.reviewsFor(id);
    const listings = S.searchListings({ includeSold: true }).filter((l) => l.sellerId === id);
    const me = S.currentUser();

    appEl.innerHTML = `
      <div class="card card--pad-lg">
        <div class="flex between wrap">
          <div class="flex" style="gap:1rem">
            <span class="avatar avatar--lg">${initials(u.name)}</span>
            <div>
              <h1 class="t-card t-card--lg">${esc(u.name)}</h1>
              <div class="pill-row">
                <span class="badge ${u.type === "company" ? "badge--accent" : "badge--muted"}">${u.type === "company" ? "Empresa" : "Comprador"}</span>
                ${u.nifVerified ? '<span class="badge badge--ok">✓ Verificada</span>' : ""}
                ${u.premium ? '<span class="badge badge--gold">Premium</span>' : ""}
                <span class="muted" style="font-size:.85rem">Membro desde ${dateStr(u.createdAt)}</span>
              </div>
              <div class="mt-1">${r.count ? `${stars(r.avg)} <strong>${r.avg}</strong> · ${r.count} avaliações` : '<span class="muted">Ainda sem avaliações</span>'}</div>
            </div>
          </div>
          ${me && me.id !== id ? `<button class="btn btn--outline btn--sm" id="reportUser">Denunciar utilizador</button>` : ""}
        </div>
      </div>

      <h2 class="t-section">Anúncios (${listings.length})</h2>
      <div class="listings-grid">${listings.length ? listings.map(listingCard).join("") : '<p class="muted">Sem anúncios ativos.</p>'}</div>

      <h2 class="t-section">Avaliações (${reviews.length})</h2>
      <div>${reviews.length ? reviews.map(reviewCard).join("") : '<p class="muted">Ainda sem avaliações.</p>'}</div>`;

    $$(".lcard").forEach((c) => c.addEventListener("click", () => (location.hash = "#/anuncio/" + c.dataset.id)));
    const ru = $("#reportUser");
    if (ru) ru.addEventListener("click", () => openReport("user", id));
  }

  function reviewCard(rv) {
    const from = S.userById(rv.fromId);
    return `<div class="panel mb-2">
      <div class="flex between"><div class="flex"><span class="avatar">${initials(from ? from.name : "?")}</span><strong>${from ? esc(from.name) : "Utilizador"}</strong></div><span class="muted" style="font-size:.8rem">${timeAgo(rv.at)}</span></div>
      <div class="mt-1">${stars(rv.stars)}</div>
      <p class="mt-1">${esc(rv.comment)}</p>
    </div>`;
  }

  /* ==========================================================================
     VISTA: Criar / editar anúncio (RF06, RF07)
     ======================================================================== */
  function viewSell([_], query, editId) {
    const u = requireAuth(); if (!u) return;
    const editing = editId ? S.getListing(editId) : null;
    if (editId && (!editing || editing.sellerId !== u.id)) { toast("Anúncio inválido.", "err"); location.hash = "#/os-meus-anuncios"; return; }
    const l = editing || { title: "", description: "", category: "madeira", condition: "excedente", quantity: 1, unit: "un", price: 0, location: u.address || "", featured: false };

    appEl.innerHTML = `
      <div class="page-head"><h1>${editing ? "Editar anúncio" : "Novo anúncio"}</h1><p>Descreve o teu material com o máximo de detalhe.</p></div>
      <div class="grid-2">
        <div class="card">
          <div class="field"><label>Título</label><input class="input" id="sTitle" value="${esc(l.title)}" placeholder="ex.: Offcuts de carvalho secados em estufa"></div>
          <div class="field"><label>Descrição</label><textarea class="textarea" id="sDesc" placeholder="Quantidade, dimensões, proveniência, estado…">${esc(l.description)}</textarea></div>
          <div class="row">
            <div class="field"><label>Categoria</label><select class="select" id="sCat">${S.CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === l.category ? "selected" : ""}>${c.label}</option>`).join("")}</select></div>
            <div class="field"><label>Estado do material</label><select class="select" id="sCond">${S.CONDITIONS.map((c) => `<option value="${c.id}" ${c.id === l.condition ? "selected" : ""}>${c.label}</option>`).join("")}</select></div>
          </div>
          <div class="row">
            <div class="field"><label>Quantidade</label><input class="input" id="sQty" type="number" min="1" value="${l.quantity}"></div>
            <div class="field"><label>Unidade</label><input class="input" id="sUnit" value="${esc(l.unit)}" placeholder="kg, m², un…"></div>
            <div class="field"><label>Preço (€ / unidade)</label><input class="input" id="sPrice" type="number" min="0" step="0.01" value="${l.price}"></div>
          </div>
          <div class="field"><label>Localização</label><input class="input" id="sLoc" value="${esc(l.location)}" placeholder="Cidade"></div>
          <div class="field"><label>Fotos (URLs separados por vírgula, opcional)</label><input class="input" id="sPhotos" value="${esc((l.photos || []).join(", "))}"></div>
          ${u.premium ? `<div class="checkline"><input type="checkbox" id="sFeatured" ${l.featured ? "checked" : ""}><label for="sFeatured" style="margin:0">Colocar em destaque (incluído no plano Premium — RF31)</label></div>` : ""}
          <div class="btn-row mt-2">
            <button class="btn btn--solid" id="sSave">${editing ? "Guardar" : "Publicar anúncio"}</button>
            <a class="btn btn--outline" href="#/${editing ? "os-meus-anuncios" : ""}">Cancelar</a>
          </div>
        </div>
        <aside class="card">
          <h3 class="muted" style="font-size:.8rem;text-transform:uppercase;letter-spacing:.08em">Pré-visualização</h3>
          <div class="listings-grid" id="preview" style="grid-template-columns:1fr;margin-top:.8rem"></div>
        </aside>
      </div>`;

    const collect = () => ({
      sellerId: u.id,
      title: $("#sTitle").value.trim() || "Sem título",
      description: $("#sDesc").value.trim(),
      category: $("#sCat").value,
      condition: $("#sCond").value,
      quantity: $("#sQty").value,
      unit: $("#sUnit").value.trim() || "un",
      price: $("#sPrice").value,
      location: $("#sLoc").value.trim() || "Portugal",
      photos: $("#sPhotos").value.split(",").map((s) => s.trim()).filter(Boolean),
      featured: $("#sFeatured") ? $("#sFeatured").checked : (l.featured || false),
    });
    const preview = () => {
      const d = collect();
      $("#preview").innerHTML = listingCard({ ...d, id: "preview", status: editing ? l.status : "ativo", quantity: Number(d.quantity) || 1, price: Number(d.price) || 0, createdAt: Date.now() });
    };
    ["#sTitle", "#sDesc", "#sCat", "#sCond", "#sQty", "#sUnit", "#sPrice", "#sLoc"].forEach((s) => $(s).addEventListener("input", preview));
    preview();

    $("#sSave").addEventListener("click", () => {
      const d = collect();
      if (!$("#sTitle").value.trim()) return toast("Indica um título.", "err");
      if (!(Number(d.price) >= 0)) return toast("Preço inválido.", "err");
      if (editing) { S.updateListing(editing.id, d); toast("Anúncio atualizado.", "ok"); location.hash = "#/anuncio/" + editing.id; }
      else { const nl = S.createListing(d); toast("Anúncio publicado!", "ok"); location.hash = "#/anuncio/" + nl.id; }
    });
  }

  /* ==========================================================================
     VISTA: Os meus anúncios (RF07, RF10)
     ======================================================================== */
  function viewMyListings() {
    const u = requireAuth(); if (!u) return;
    const mine = S.searchListings({ includeSold: true }).filter((l) => l.sellerId === u.id);
    appEl.innerHTML = `
      <div class="page-head flex between wrap"><div><h1>Os meus anúncios</h1><p>${mine.length} anúncio(s).</p></div><a class="btn btn--solid" href="#/vender">+ Novo anúncio</a></div>
      ${mine.length ? `<div class="table__wrap card"><table class="table">
        <thead><tr><th>Material</th><th>Categoria</th><th>Preço</th><th>Qtd.</th><th>Estado</th><th></th></tr></thead>
        <tbody>${mine.map((l) => `
          <tr>
            <td><a href="#/anuncio/${l.id}"><strong>${esc(l.title)}</strong></a></td>
            <td>${catLabel(l.category)}</td>
            <td>${money(l.price)}/${esc(l.unit)}</td>
            <td>${l.quantity.toLocaleString("pt-PT")}</td>
            <td>${statusBadgeFull(l.status)}</td>
            <td><div class="btn-row">
              <a class="btn btn--outline btn--sm" href="#/editar/${l.id}">Editar</a>
              <button class="btn btn--outline btn--sm" data-mark="${l.id}" data-status="${l.status === "reservado" ? "ativo" : "reservado"}">${l.status === "reservado" ? "Reativar" : "Reservar"}</button>
              <button class="btn btn--outline btn--sm" data-mark="${l.id}" data-status="vendido">Vendido</button>
              <button class="btn btn--danger btn--sm" data-del="${l.id}">Eliminar</button>
            </div></td>
          </tr>`).join("")}</tbody></table></div>` : emptyState("Ainda não tens anúncios", "Publica o teu primeiro lote de materiais.", "#/vender", "Criar anúncio")}`;

    $$("[data-mark]").forEach((b) => b.addEventListener("click", () => { S.updateListing(b.dataset.mark, { status: b.dataset.status }); toast("Estado atualizado.", "ok"); render(); }));
    $$("[data-del]").forEach((b) => b.addEventListener("click", () => modalConfirm("Eliminar anúncio?", "Ação irreversível.", () => { S.deleteListing(b.dataset.del); toast("Eliminado.", "ok"); render(); })));
  }

  function statusBadgeFull(s) {
    return s === "vendido" ? '<span class="badge badge--sold">Vendido</span>' :
      s === "reservado" ? '<span class="badge badge--reserved">Reservado</span>' : '<span class="badge badge--ok">Ativo</span>';
  }

  /* ==========================================================================
     VISTA: Carrinho (RF15)
     ======================================================================== */
  function viewCart() {
    const items = Cart.items().map((i) => ({ ...i, listing: S.getListing(i.listingId) })).filter((i) => i.listing);
    if (!items.length) { appEl.innerHTML = emptyState("O carrinho está vazio", "Explora o mercado e adiciona materiais.", "#/", "Ver mercado"); return; }
    const subtotal = items.reduce((s, i) => s + i.listing.price * i.qty, 0);

    appEl.innerHTML = `
      <div class="page-head"><h1>Carrinho</h1></div>
      <div class="grid-2" style="grid-template-columns:1fr 340px">
        <div class="card">
          ${items.map((i) => `
            <div class="cart-row" data-id="${i.listingId}">
              <div class="cart-row__media">${swatch(i.listing.category)}</div>
              <div class="cart-row__body">
                <a href="#/anuncio/${i.listingId}"><strong>${esc(i.listing.title)}</strong></a>
                <div class="muted" style="font-size:.85rem">${money(i.listing.price)}/${esc(i.listing.unit)}</div>
              </div>
              <div class="qty"><button data-dec>−</button><input type="number" value="${i.qty}" min="1" data-qty><button data-inc>+</button></div>
              <strong style="width:90px;text-align:right">${money(i.listing.price * i.qty)}</strong>
              <button class="linklike" data-rm title="Remover">✕</button>
            </div>`).join("")}
        </div>
        <aside class="card" style="align-self:start">
          <h3 class="t-card">Resumo</h3>
          <div class="summary"><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div class="summary"><span>Comissão plataforma (${(S.COMMISSION_RATE * 100)}%)</span><span>${money(S.commissionFor(subtotal))}</span></div>
          <div class="summary summary--total"><span>Total (sem envio)</span><span>${money(subtotal + S.commissionFor(subtotal))}</span></div>
          <a class="btn btn--solid btn--full mt-2" href="#/checkout">Finalizar compra</a>
          <button class="btn btn--outline btn--full mt-1" id="clearCart">Esvaziar carrinho</button>
        </aside>
      </div>`;

    $$(".cart-row").forEach((row) => {
      const id = row.dataset.id;
      const input = $("[data-qty]", row);
      $("[data-dec]", row).addEventListener("click", () => { Cart.setQty(id, +input.value - 1); render(); });
      $("[data-inc]", row).addEventListener("click", () => { Cart.setQty(id, +input.value + 1); render(); });
      input.addEventListener("change", () => { Cart.setQty(id, +input.value); render(); });
      $("[data-rm]", row).addEventListener("click", () => { Cart.remove(id); render(); });
    });
    $("#clearCart").addEventListener("click", () => { Cart.clear(); render(); });
  }

  /* ==========================================================================
     VISTA: Checkout — pagamento, envio, comissão (RF16, RF17, RF18)
     ======================================================================== */
  function viewCheckout() {
    const u = requireAuth(); if (!u) return;
    const items = Cart.items().map((i) => ({ ...i, listing: S.getListing(i.listingId) })).filter((i) => i.listing);
    if (!items.length) { location.hash = "#/carrinho"; return; }

    const subtotal = items.reduce((s, i) => s + i.listing.price * i.qty, 0);
    const commission = S.commissionFor(subtotal);
    let delivery = "pickup";
    let method = "mbway";

    const render2 = () => {
      const shipping = delivery === "courier" ? 12.5 : 0;
      $("#ckShipping").textContent = money(shipping);
      $("#ckTotal").textContent = money(subtotal + commission + shipping);
    };

    appEl.innerHTML = `
      <div class="page-head"><h1>Finalizar compra</h1></div>
      <div class="grid-2" style="grid-template-columns:1fr 340px">
        <div>
          <div class="card mb-2">
            <h3 class="t-card">Entrega (RF18)</h3>
            <div class="seg" id="delSeg">
              <button data-del="pickup" class="is-active">Recolha local (grátis)</button>
              <button data-del="courier">Envio por transportadora (€12,50)</button>
            </div>
            <div class="field mt-2" id="addrField" hidden><label>Morada de entrega</label><input class="input" id="ckAddr" value="${esc(u.address)}" placeholder="Morada completa"></div>
          </div>
          <div class="card">
            <h3 class="t-card">Pagamento (RF16)</h3>
            <div class="pay-methods" id="payMethods">
              <label class="pay-opt is-active"><input type="radio" name="pay" value="mbway" checked> ${icon("phone")} MB Way</label>
              <label class="pay-opt"><input type="radio" name="pay" value="card"> ${icon("cardpay")} Cartão</label>
              <label class="pay-opt"><input type="radio" name="pay" value="multibanco"> ${icon("ref")} Referência MB</label>
            </div>
            <div id="payDetails" class="mt-2"></div>
          </div>
        </div>
        <aside class="card" style="align-self:start">
          <h3 class="t-card">Encomenda</h3>
          ${items.map((i) => `<div class="summary"><span>${esc(i.listing.title)} ×${i.qty}</span><span>${money(i.listing.price * i.qty)}</span></div>`).join("")}
          <hr class="hr">
          <div class="summary"><span>Subtotal</span><span>${money(subtotal)}</span></div>
          <div class="summary"><span>Comissão (${S.COMMISSION_RATE * 100}%)</span><span>${money(commission)}</span></div>
          <div class="summary"><span>Envio</span><span id="ckShipping">${money(0)}</span></div>
          <div class="summary summary--total"><span>Total</span><span id="ckTotal">${money(subtotal + commission)}</span></div>
          <button class="btn btn--solid btn--full mt-2" id="payBtn">Pagar agora</button>
        </aside>
      </div>`;

    const payDetails = () => {
      const el = $("#payDetails");
      if (method === "mbway") el.innerHTML = `<div class="field"><label>Número de telemóvel</label><input class="input" id="mbwayPhone" placeholder="9XX XXX XXX" value="${esc(u.phone)}"></div><p class="muted" style="font-size:.82rem">Receberás uma notificação na app MB Way para confirmar.</p>`;
      else if (method === "card") el.innerHTML = `<div class="field"><label>Número do cartão</label><input class="input" placeholder="4000 0000 0000 0000"></div><div class="row"><div class="field"><label>Validade</label><input class="input" placeholder="MM/AA"></div><div class="field"><label>CVC</label><input class="input" placeholder="123"></div></div>`;
      else el.innerHTML = `<div class="callout">Será gerada uma <strong>referência multibanco</strong> após confirmar. Entidade e referência ficam disponíveis no histórico de compras.</div>`;
    };
    payDetails();

    $$("#delSeg button").forEach((b) => b.addEventListener("click", () => {
      $$("#delSeg button").forEach((x) => x.classList.remove("is-active")); b.classList.add("is-active");
      delivery = b.dataset.del; $("#addrField").hidden = delivery !== "courier"; render2();
    }));
    $$('#payMethods input').forEach((r) => r.addEventListener("change", () => {
      method = r.value;
      $$(".pay-opt").forEach((o) => o.classList.toggle("is-active", o.contains(r)));
      payDetails();
    }));

    $("#payBtn").addEventListener("click", () => {
      const order = S.createOrder({
        buyerId: u.id,
        items: items.map((i) => ({ listingId: i.listingId, qty: i.qty, unitPrice: i.listing.price })),
        payment: { method, ref: method === "multibanco" ? { entity: "21987", ref: String(Math.floor(100000000 + Math.random() * 899999999)) } : null },
        delivery,
      });
      Cart.clear();
      const refHtml = method === "multibanco" ? `<div class="callout mt-2 text-c"><strong>Referência Multibanco</strong><br>Entidade <b>${order.payment.ref.entity}</b> · Referência <b>${order.payment.ref.ref}</b><br>Valor ${money(order.total)}</div>` : "";
      const m = modal(`
        <div class="text-c">
          <div class="check-big">${icon("check")}</div>
          <h2>Pagamento confirmado</h2>
          <p class="muted">Encomenda ${order.id} · ${money(order.total)}</p>
          ${refHtml}
          <a class="btn btn--solid btn--full mt-2" href="#/compras" data-close>Ver as minhas compras</a>
        </div>`);
      m.root.querySelector("[data-close]").addEventListener("click", () => (location.hash = "#/compras"));
    });
  }

  /* ==========================================================================
     VISTA: Histórico de compras (RF19) + avaliar (RF23) + disputa (RF28)
     ======================================================================== */
  function viewPurchases() {
    const u = requireAuth(); if (!u) return;
    const orders = S.ordersForBuyer(u.id);
    appEl.innerHTML = `
      <div class="page-head"><h1>As minhas compras</h1><p>${orders.length} encomenda(s).</p></div>
      ${orders.length ? orders.map((o) => orderCard(o, "buyer")).join("") : emptyState("Ainda não compraste nada", "Descobre materiais no mercado.", "#/", "Explorar mercado")}`;
    wireOrderCards(u);
  }

  function viewSales() {
    const u = requireAuth(); if (!u) return;
    const orders = S.ordersForSeller(u.id);
    const proposals = S.proposalsForUser(u.id).filter((p) => p.sellerId === u.id);
    appEl.innerHTML = `
      <div class="page-head"><h1>Vendas & propostas</h1></div>
      <div class="tabs" id="salesTabs">
        <button data-tab="sales" class="is-active">Vendas (${orders.length})</button>
        <button data-tab="proposals">Propostas (${proposals.filter((p) => p.status === "pendente").length} pendentes)</button>
      </div>
      <div id="salesBody"></div>`;

    const renderTab = (tab) => {
      const body = $("#salesBody");
      if (tab === "sales") {
        body.innerHTML = orders.length ? orders.map((o) => orderCard(o, "seller")).join("") : emptyState("Ainda sem vendas", "Publica anúncios apelativos para vender mais.", "#/vender", "Criar anúncio");
        wireOrderCards(u);
      } else {
        body.innerHTML = proposals.length ? proposals.map(proposalCard).join("") : '<p class="muted">Sem propostas recebidas.</p>';
        $$("[data-prop]").forEach((b) => b.addEventListener("click", () => {
          S.respondProposal(b.dataset.prop, b.dataset.status); // RF22
          toast("Proposta " + b.dataset.status + ".", "ok"); renderTab("proposals");
        }));
      }
    };
    $$("#salesTabs button").forEach((b) => b.addEventListener("click", () => {
      $$("#salesTabs button").forEach((x) => x.classList.remove("is-active")); b.classList.add("is-active"); renderTab(b.dataset.tab);
    }));
    renderTab("sales");
  }

  function proposalCard(p) {
    const l = S.getListing(p.listingId); const buyer = S.userById(p.buyerId);
    const badge = p.status === "pendente" ? '<span class="badge badge--reserved">Pendente</span>' : p.status === "aceite" ? '<span class="badge badge--ok">Aceite</span>' : '<span class="badge badge--warn">Rejeitada</span>';
    return `<div class="card mb-2">
      <div class="flex between wrap">
        <div><a href="#/anuncio/${p.listingId}"><strong>${l ? esc(l.title) : "Anúncio"}</strong></a>
        <div class="muted" style="font-size:.85rem">de ${buyer ? esc(buyer.name) : "?"} · ${timeAgo(p.at)}</div></div>
        ${badge}
      </div>
      <div class="mt-1">Proposta: <strong>${money(p.amount)}</strong>${l ? ` <span class="muted">(anúncio a ${money(l.price)})</span>` : ""}</div>
      ${p.message ? `<p class="muted mt-1">“${esc(p.message)}”</p>` : ""}
      ${p.status === "pendente" ? `<div class="btn-row mt-2"><button class="btn btn--solid btn--sm" data-prop="${p.id}" data-status="aceite">Aceitar</button><button class="btn btn--danger btn--sm" data-prop="${p.id}" data-status="rejeitada">Rejeitar</button></div>` : ""}
    </div>`;
  }

  function orderCard(o, side) {
    const other = side === "buyer" ? S.userById(o.sellerId) : S.userById(o.buyerId);
    const items = o.items.map((i) => { const l = S.getListing(i.listingId); return `${l ? esc(l.title) : "Item"} ×${i.qty}`; }).join(", ");
    const statusMap = { pago: "badge--ok", enviado: "badge--sage", entregue: "badge--sold", cancelado: "badge--warn" };
    return `<div class="card mb-2" data-order="${o.id}">
      <div class="flex between wrap">
        <div><strong>Encomenda ${o.id}</strong><div class="muted" style="font-size:.85rem">${dateStr(o.createdAt)} · ${side === "buyer" ? "Vendedor" : "Comprador"}: ${other ? esc(other.name) : "?"}</div></div>
        <span class="badge ${statusMap[o.status] || "badge--muted"}">${o.status}</span>
      </div>
      <p class="mt-1">${items}</p>
      <div class="summary" style="border-top:1px solid var(--line);margin-top:.6rem;padding-top:.6rem">
        <span class="muted">Pagamento: ${o.payment.method} · Entrega: ${o.delivery === "courier" ? "transportadora" : "recolha local"}</span>
        <strong>${money(o.total)}</strong>
      </div>
      ${o.payment.ref ? `<div class="muted" style="font-size:.82rem">Ref. MB: ${o.payment.ref.entity} / ${o.payment.ref.ref}</div>` : ""}
      <div class="btn-row mt-2">
        ${side === "seller" ? `
          ${o.status === "pago" ? `<button class="btn btn--outline btn--sm" data-ostatus="${o.id}|enviado">Marcar enviado</button>` : ""}
          ${o.status === "enviado" ? `<button class="btn btn--outline btn--sm" data-ostatus="${o.id}|entregue">Marcar entregue</button>` : ""}
        ` : ""}
        ${side === "buyer" && !o.reviewed ? `<button class="btn btn--solid btn--sm" data-review="${o.id}">Avaliar vendedor</button>` : ""}
        ${side === "buyer" ? `<button class="btn btn--outline btn--sm" data-dispute="${o.id}">Abrir disputa</button>` : ""}
      </div>
    </div>`;
  }

  function wireOrderCards(u) {
    $$("[data-ostatus]").forEach((b) => b.addEventListener("click", () => {
      const [id, st] = b.dataset.ostatus.split("|"); S.setOrderStatus(id, st); toast("Estado atualizado.", "ok"); render();
    }));
    $$("[data-review]").forEach((b) => b.addEventListener("click", () => openReview(b.dataset.review, u)));
    $$("[data-dispute]").forEach((b) => b.addEventListener("click", () => openDispute(b.dataset.dispute, u)));
  }

  function openReview(orderId, u) {
    const o = S.getOrder(orderId); const seller = S.userById(o.sellerId);
    let picked = 5;
    const m = modal(`
      <button class="modal__close">×</button>
      <h2>Avaliar ${esc(seller ? seller.name : "vendedor")}</h2>
      <p class="muted">Como correu a transação?</p>
      <div class="stars stars--input mt-2" id="starInput">${[1,2,3,4,5].map((n) => `<button data-n="${n}" class="is-on">★</button>`).join("")}</div>
      <div class="field mt-2"><label>Comentário</label><textarea class="textarea" id="revText" placeholder="Partilha a tua experiência…"></textarea></div>
      <button class="btn btn--solid btn--full" id="revSend">Publicar avaliação</button>`);
    const paint = () => $$("#starInput button", m.root).forEach((b) => b.classList.toggle("is-on", +b.dataset.n <= picked));
    $$("#starInput button", m.root).forEach((b) => b.addEventListener("click", () => { picked = +b.dataset.n; paint(); }));
    $("#revSend", m.root).addEventListener("click", () => {
      S.createReview({ orderId, fromId: u.id, toId: o.sellerId, stars: picked, comment: $("#revText", m.root).value.trim() }); // RF23
      m.close(); toast("Avaliação publicada.", "ok"); render();
    });
  }

  function openDispute(orderId, u) {
    const m = modal(`
      <button class="modal__close">×</button>
      <h2>Abrir disputa</h2>
      <p class="muted">A equipa de mediação irá analisar o caso (RF28).</p>
      <div class="field mt-2"><label>Descreve o problema</label><textarea class="textarea" id="dText" placeholder="ex.: O material não corresponde à descrição."></textarea></div>
      <button class="btn btn--solid btn--full" id="dSend">Submeter disputa</button>`);
    $("#dSend", m.root).addEventListener("click", () => {
      const reason = $("#dText", m.root).value.trim();
      if (!reason) return toast("Descreve o problema.", "err");
      S.createDispute({ orderId, byId: u.id, reason });
      m.close(); toast("Disputa submetida.", "ok");
    });
  }

  /* ==========================================================================
     VISTA: Mensagens / chat (RF20)
     ======================================================================== */
  function viewMessages(_, query) {
    const u = requireAuth(); if (!u) return;
    const threads = S.threadsForUser(u.id);
    let activeId = query.t || (threads[0] && threads[0].id);

    appEl.innerHTML = `<div class="page-head"><h1>Mensagens</h1></div><div class="chat" id="chat"></div>`;
    const renderChat = () => {
      const chat = $("#chat");
      if (!threads.length) { chat.innerHTML = `<div class="chat__empty" style="grid-column:1/-1"><div><p>Ainda não tens conversas.</p><a class="btn btn--outline mt-2" href="#/">Contactar vendedores no mercado</a></div></div>`; return; }
      const active = threads.find((t) => t.id === activeId) || threads[0];
      activeId = active.id;

      chat.innerHTML = `
        <div class="chat__list ${active ? "has-active" : ""}">
          ${threads.map((t) => {
            const other = S.userById(t.participants.find((p) => p !== u.id));
            const last = t.messages[t.messages.length - 1];
            const l = S.getListing(t.listingId);
            return `<button class="chat__item ${t.id === activeId ? "is-active" : ""}" data-t="${t.id}">
              <span class="avatar">${initials(other ? other.name : "?")}</span>
              <div style="min-width:0;flex:1"><strong>${other ? esc(other.name) : "?"}</strong><p>${l ? esc(l.title) : ""}</p><p>${last ? esc(last.text) : ""}</p></div>
            </button>`;
          }).join("")}
        </div>
        <div class="chat__thread">${renderThread(active, u)}</div>`;

      $$(".chat__item").forEach((b) => b.addEventListener("click", () => { activeId = b.dataset.t; location.hash = "#/mensagens?t=" + activeId; }));
      wireCompose(activeId, u, renderChat);
      const body = $(".chat__body"); if (body) body.scrollTop = body.scrollHeight;
    };
    renderChat();
  }

  function renderThread(t, u) {
    const other = S.userById(t.participants.find((p) => p !== u.id));
    const l = S.getListing(t.listingId);
    return `
      <div class="chat__head">
        <span class="avatar">${initials(other ? other.name : "?")}</span>
        <div style="flex:1"><strong>${other ? esc(other.name) : "?"}</strong>${l ? `<div class="muted" style="font-size:.8rem">Sobre: <a href="#/anuncio/${l.id}">${esc(l.title)}</a></div>` : ""}</div>
      </div>
      <div class="chat__body" id="chatBody">
        ${t.messages.map((m) => `<div class="bubble ${m.senderId === u.id ? "bubble--me" : "bubble--them"}">${esc(m.text)}<span class="bubble__time">${timeAgo(m.at)}</span></div>`).join("")}
      </div>
      <form class="chat__compose" id="composeForm">
        <input class="input" id="composeInput" placeholder="Escreve uma mensagem…" autocomplete="off">
        <button class="btn btn--solid" type="submit">Enviar</button>
      </form>`;
  }

  function wireCompose(threadId, u, rerender) {
    const form = $("#composeForm");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#composeInput");
      const text = input.value.trim();
      if (!text) return;
      S.sendMessage(threadId, u.id, text);
      rerender();
    });
  }

  /* ==========================================================================
     VISTA: Notificações (RF21)
     ======================================================================== */
  function viewNotifications() {
    const u = requireAuth(); if (!u) return;
    const notifs = S.notificationsFor(u.id);
    appEl.innerHTML = `
      <div class="page-head flex between wrap"><div><h1>Notificações</h1></div>${notifs.some((n) => !n.read) ? '<button class="btn btn--outline btn--sm" id="markRead">Marcar todas como lidas</button>' : ""}</div>
      ${notifs.length ? notifs.map((n) => `
        <a class="notif ${n.read ? "" : "is-unread"}" href="${n.link || "#/"}">
          <span class="notif__dot">${notifIcon(n.type)}</span>
          <div style="flex:1"><div>${esc(n.text)}</div><time>${timeAgo(n.at)}</time></div>
        </a>`).join("") : emptyState("Sem notificações", "Aqui aparecem novas mensagens, vendas e alterações de estado.", "#/", "Ir ao mercado")}`;
    const mr = $("#markRead");
    if (mr) mr.addEventListener("click", () => { S.markNotificationsRead(u.id); toast("Notificações lidas.", "ok"); render(); });
    // ao entrar, marca como lidas passado um instante
    setTimeout(() => { S.markNotificationsRead(u.id); updateNav(); }, 1500);
  }
  const notifIcon = (t) => icon({ message: "chat", sale: "coin", order: "box", proposal: "swap", review: "star" }[t] || "bell");

  /* ==========================================================================
     VISTA: Premium (RF30), destaques (RF31), sustentabilidade (RF32)
     ======================================================================== */
  function viewPremium() {
    const u = requireAuth(); if (!u) return;
    const isCompany = u.type === "company";
    appEl.innerHTML = `
      <div class="page-head"><h1>Premium & sustentabilidade</h1><p>Ferramentas para empresas vendedoras.</p></div>
      <div class="grid-2" style="grid-template-columns:1fr 1fr">
        <div class="card card--pad-lg">
          <span class="badge badge--gold">RF30 · Subscrição Premium</span>
          <h2 class="t-card t-card--lg" style="margin:.6rem 0">SecondRaw Premium</h2>
          <div class="price-big">€29<small>/mês</small></div>
          <ul class="impact__list mt-2" style="list-style:none;padding:0">
            <li>✓ Anúncios em destaque ilimitados (RF31)</li>
            <li>✓ Selo Premium no perfil</li>
            <li>✓ Estatísticas de desempenho</li>
            <li>✓ Relatório de sustentabilidade (RF32)</li>
          </ul>
          ${!isCompany ? '<div class="callout mt-2">O plano Premium está disponível para contas de empresa.</div>' :
            u.premium ? '<div class="callout mt-2"><strong>Já és Premium ✓</strong></div><button class="btn btn--outline mt-2" id="cancelPrem">Cancelar subscrição</button>' :
            '<button class="btn btn--solid btn--full mt-2" id="subPrem">Subscrever Premium</button>'}
        </div>
        <div class="card card--pad-lg">
          <span class="badge badge--sage">RF32 · Sustentabilidade</span>
          <h2 class="t-card t-card--lg" style="margin:.6rem 0">Relatório de impacto</h2>
          ${isCompany ? sustainabilityReport(u) : '<div class="callout">Disponível para contas de empresa vendedoras.</div>'}
        </div>
      </div>`;

    const sp = $("#subPrem"); if (sp) sp.addEventListener("click", () => { S.updateUser(u.id, { premium: true }); toast("Bem-vindo ao Premium!", "ok"); render(); });
    const cp = $("#cancelPrem"); if (cp) cp.addEventListener("click", () => { S.updateUser(u.id, { premium: false }); toast("Subscrição cancelada.", "ok"); render(); });
    const dl = $("#genCert"); if (dl) dl.addEventListener("click", () => downloadCertificate(u));
  }

  function sustainabilityReport(u) {
    const sold = S.searchListings({ includeSold: true }).filter((l) => l.sellerId === u.id && l.status === "vendido");
    const orders = S.ordersForSeller(u.id);
    const revenue = orders.reduce((s, o) => s + o.subtotal, 0);
    // estimativa simples de CO2 evitado
    const co2 = Math.round(sold.reduce((s, l) => s + l.quantity, 0) * 0.9);
    return `
      <div class="stat-grid" style="margin-bottom:1rem">
        <div class="stat-card"><b>${sold.length}</b><span>Lotes revendidos</span></div>
        <div class="stat-card"><b>${co2.toLocaleString("pt-PT")}</b><span>kg CO₂e evitado (est.)</span></div>
        <div class="stat-card"><b>${money(revenue)}</b><span>Receita de excedentes</span></div>
      </div>
      <p class="muted">Cada lote revendido evita produção nova e desvia material do aterro.</p>
      ${u.premium ? '<button class="btn btn--solid mt-2" id="genCert">Gerar certificado (RF32)</button>' : '<div class="callout callout--gold mt-2">Subscreve Premium para gerar o certificado oficial.</div>'}`;
  }

  function downloadCertificate(u) {
    const sold = S.searchListings({ includeSold: true }).filter((l) => l.sellerId === u.id && l.status === "vendido");
    const co2 = Math.round(sold.reduce((s, l) => s + l.quantity, 0) * 0.9);
    const text =
`CERTIFICADO DE SUSTENTABILIDADE — SecondRaw
============================================
Empresa: ${u.name}
NIF: ${u.nif || "—"}
Data: ${new Date().toLocaleDateString("pt-PT")}

Lotes de material revendidos: ${sold.length}
CO2e evitado (estimativa): ${co2} kg

Este certificado reconhece o contributo da empresa para a
economia circular através da reintrodução de materiais
excedentes no mercado.

SecondRaw — Reclaimed materials, reborn.`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `certificado-sustentabilidade-${u.id}.txt`;
    a.click();
    toast("Certificado gerado.", "ok");
  }

  /* ==========================================================================
     VISTA: Backoffice / Admin (RF26–RF29)
     ======================================================================== */
  function viewAdmin(_, query) {
    const u = requireAuth(); if (!u) return;
    if (u.role !== "admin") { appEl.innerHTML = emptyState("Acesso restrito", "Esta área é apenas para administradores.", "#/", "Voltar"); return; }

    appEl.innerHTML = `
      <div class="page-head"><h1>Backoffice</h1><p>Gestão da plataforma.</p></div>
      <div class="tabs" id="adminTabs">
        <button data-tab="stats" class="is-active">Estatísticas</button>
        <button data-tab="users">Utilizadores</button>
        <button data-tab="listings">Anúncios</button>
        <button data-tab="reports">Denúncias</button>
        <button data-tab="disputes">Disputas</button>
      </div>
      <div id="adminBody"></div>`;

    const renderTab = (tab) => {
      const b = $("#adminBody");
      if (tab === "stats") b.innerHTML = adminStats();
      else if (tab === "users") { b.innerHTML = adminUsers(); wireAdminUsers(renderTab); }
      else if (tab === "listings") { b.innerHTML = adminListings(); wireAdminListings(renderTab); }
      else if (tab === "reports") { b.innerHTML = adminReports(); wireAdminReports(renderTab); }
      else if (tab === "disputes") { b.innerHTML = adminDisputes(); wireAdminDisputes(renderTab); }
    };
    $$("#adminTabs button").forEach((btn) => btn.addEventListener("click", () => {
      $$("#adminTabs button").forEach((x) => x.classList.remove("is-active")); btn.classList.add("is-active"); renderTab(btn.dataset.tab);
    }));
    renderTab(query.tab || "stats");
  }

  function adminStats() {
    const s = S.stats();
    const cards = [
      ["Utilizadores", s.users], ["Empresas", s.companies], ["Compradores", s.buyers],
      ["Anúncios", s.listings], ["Ativos", s.activeListings], ["Vendidos", s.sold],
      ["Encomendas", s.orders], ["Volume de vendas", money(s.sales)], ["Comissões (RF17)", money(s.commissions)],
      ["Denúncias abertas", s.openReports], ["Disputas abertas", s.openDisputes],
    ];
    return `<div class="stat-grid">${cards.map(([l, v]) => `<div class="stat-card"><b>${typeof v === "number" ? v.toLocaleString("pt-PT") : v}</b><span>${l}</span></div>`).join("")}</div>
      <div class="callout">Estatísticas em tempo real sobre vendas, utilizadores ativos e comissões geradas (RF29).</div>`;
  }

  function adminUsers() {
    const users = S.all.users();
    return `<div class="table__wrap card"><table class="table">
      <thead><tr><th>Nome</th><th>Email</th><th>Tipo</th><th>Verificada</th><th>Premium</th><th>Ações</th></tr></thead>
      <tbody>${users.map((u) => `<tr>
        <td><a href="#/perfil/${u.id}"><strong>${esc(u.name)}</strong></a></td>
        <td class="muted">${esc(u.email)}</td>
        <td>${u.type === "company" ? "Empresa" : "Comprador"}</td>
        <td>${u.type === "company" ? (u.nifVerified ? '<span class="badge badge--ok">✓</span>' : u.verificationPending ? '<span class="badge badge--reserved">pendente</span>' : "—") : "—"}</td>
        <td>${u.premium ? '<span class="badge badge--gold">Premium</span>' : "—"}</td>
        <td><div class="btn-row">
          ${u.type === "company" && !u.nifVerified ? `<button class="btn btn--solid btn--sm" data-verify="${u.id}">Verificar</button>` : ""}
          ${u.type === "company" && u.nifVerified ? `<button class="btn btn--outline btn--sm" data-unverify="${u.id}">Remover selo</button>` : ""}
          ${u.role !== "admin" ? `<button class="btn btn--danger btn--sm" data-banuser="${u.id}">Suspender</button>` : '<span class="badge badge--accent">Admin</span>'}
        </div></td>
      </tr>`).join("")}</tbody></table></div>`;
  }
  function wireAdminUsers(rt) {
    $$("[data-verify]").forEach((b) => b.addEventListener("click", () => { S.setVerified(b.dataset.verify, true); toast("Empresa verificada.", "ok"); rt("users"); })); // RF05
    $$("[data-unverify]").forEach((b) => b.addEventListener("click", () => { S.setVerified(b.dataset.unverify, false); toast("Selo removido.", "ok"); rt("users"); }));
    $$("[data-banuser]").forEach((b) => b.addEventListener("click", () => modalConfirm("Suspender utilizador?", "As sessões e anúncios ficam indisponíveis.", () => {
      S.updateUser(b.dataset.banuser, { suspended: true }); toast("Utilizador suspenso.", "ok"); rt("users");
    })));
  }

  function adminListings() {
    const listings = S.all.listings();
    return `<div class="table__wrap card"><table class="table">
      <thead><tr><th>Título</th><th>Vendedor</th><th>Categoria</th><th>Preço</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>${listings.map((l) => { const s = S.userById(l.sellerId); return `<tr>
        <td><a href="#/anuncio/${l.id}"><strong>${esc(l.title)}</strong></a>${l.featured ? ' <span class="badge badge--gold">★</span>' : ""}</td>
        <td>${s ? esc(s.name) : "—"}</td>
        <td>${catLabel(l.category)}</td>
        <td>${money(l.price)}</td>
        <td>${statusBadgeFull(l.status)}</td>
        <td><div class="btn-row">
          <button class="btn btn--outline btn--sm" data-feat="${l.id}">${l.featured ? "Retirar destaque" : "Destacar"}</button>
          <button class="btn btn--danger btn--sm" data-dellisting="${l.id}">Remover</button>
        </div></td>
      </tr>`; }).join("")}</tbody></table></div>`;
  }
  function wireAdminListings(rt) {
    $$("[data-feat]").forEach((b) => b.addEventListener("click", () => { const l = S.getListing(b.dataset.feat); S.updateListing(l.id, { featured: !l.featured }); toast("Destaque atualizado.", "ok"); rt("listings"); }));
    $$("[data-dellisting]").forEach((b) => b.addEventListener("click", () => modalConfirm("Remover anúncio?", "Ação de moderação irreversível.", () => { S.deleteListing(b.dataset.dellisting); toast("Anúncio removido.", "ok"); rt("listings"); })));
  }

  function adminReports() {
    const reports = S.all.reports();
    if (!reports.length) return '<div class="empty"><h3>Sem denúncias</h3><p>Nada para moderar.</p></div>';
    return `<div class="table__wrap card"><table class="table">
      <thead><tr><th>Alvo</th><th>Motivo</th><th>Denunciante</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>${reports.map((r) => {
        const by = S.userById(r.byId);
        const target = r.targetType === "listing" ? S.getListing(r.targetId) : S.userById(r.targetId);
        const link = r.targetType === "listing" ? "#/anuncio/" + r.targetId : "#/perfil/" + r.targetId;
        return `<tr>
          <td><a href="${link}"><strong>${target ? esc(target.title || target.name) : "(removido)"}</strong></a><div class="muted" style="font-size:.8rem">${r.targetType === "listing" ? "Anúncio" : "Utilizador"}</div></td>
          <td>${esc(r.reason)}</td>
          <td class="muted">${by ? esc(by.name) : "?"}</td>
          <td>${r.status === "aberta" ? '<span class="badge badge--warn">Aberta</span>' : '<span class="badge badge--muted">' + esc(r.status) + "</span>"}</td>
          <td><div class="btn-row">
            ${r.status === "aberta" ? `
              ${r.targetType === "listing" && target ? `<button class="btn btn--danger btn--sm" data-remtarget="${r.id}|${r.targetId}">Remover anúncio</button>` : ""}
              <button class="btn btn--outline btn--sm" data-resolve="${r.id}|descartada">Descartar</button>
              <button class="btn btn--solid btn--sm" data-resolve="${r.id}|resolvida">Resolver</button>` : "—"}
          </div></td>
        </tr>`;
      }).join("")}</tbody></table></div>`;
  }
  function wireAdminReports(rt) {
    $$("[data-resolve]").forEach((b) => b.addEventListener("click", () => { const [id, st] = b.dataset.resolve.split("|"); S.resolveReport(id, st); toast("Denúncia " + st + ".", "ok"); rt("reports"); })); // RF27
    $$("[data-remtarget]").forEach((b) => b.addEventListener("click", () => modalConfirm("Remover anúncio denunciado?", "", () => {
      const [id, target] = b.dataset.remtarget.split("|"); S.deleteListing(target); S.resolveReport(id, "resolvida"); toast("Anúncio removido.", "ok"); rt("reports");
    })));
  }

  function adminDisputes() {
    const disputes = S.all.disputes();
    if (!disputes.length) return '<div class="empty"><h3>Sem disputas</h3></div>';
    return `<div>${disputes.map((d) => {
      const o = S.getOrder(d.orderId); const by = S.userById(d.byId);
      return `<div class="card mb-2">
        <div class="flex between wrap">
          <div><strong>Disputa sobre encomenda ${d.orderId}</strong><div class="muted" style="font-size:.85rem">Aberta por ${by ? esc(by.name) : "?"} · ${timeAgo(d.at)}${o ? " · " + money(o.total) : ""}</div></div>
          ${d.status === "aberta" ? '<span class="badge badge--warn">Aberta</span>' : `<span class="badge badge--ok">${esc(d.status)}</span>`}
        </div>
        <p class="mt-1">“${esc(d.reason)}”</p>
        ${d.resolution ? `<div class="callout mt-1"><strong>Resolução:</strong> ${esc(d.resolution)}</div>` : ""}
        ${d.status === "aberta" ? `<div class="btn-row mt-2">
          <button class="btn btn--solid btn--sm" data-dispute-res="${d.id}|comprador">A favor do comprador</button>
          <button class="btn btn--outline btn--sm" data-dispute-res="${d.id}|vendedor">A favor do vendedor</button>
        </div>` : ""}
      </div>`;
    }).join("")}</div>`;
  }
  function wireAdminDisputes(rt) {
    $$("[data-dispute-res]").forEach((b) => b.addEventListener("click", () => { // RF28
      const [id, side] = b.dataset["disputeRes"].split("|");
      S.resolveDispute(id, "resolvida", "Decidida a favor do " + side + ".");
      toast("Disputa resolvida.", "ok"); rt("disputes");
    }));
  }

  /* ---------- Componentes partilhados ---------- */
  function emptyState(title, sub, link, cta) {
    return `<div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7" stroke-linejoin="round"/></svg>
      <h3>${esc(title)}</h3><p>${esc(sub)}</p>
      ${link ? `<a class="btn btn--solid mt-2" href="${link}">${esc(cta)}</a>` : ""}
    </div>`;
  }
  function modalConfirm(title, body, onYes) {
    const m = modal(`<h2>${esc(title)}</h2><p class="muted">${esc(body)}</p><div class="btn-row mt-2" style="justify-content:flex-end"><button class="btn btn--outline" data-close>Cancelar</button><button class="btn btn--danger" id="confYes">Confirmar</button></div>`);
    $("#confYes", m.root).addEventListener("click", () => { m.close(); onYes(); });
  }

  /* ==========================================================================
     Registo de rotas
     ======================================================================== */
  route(/^\/$/, viewMarket);
  route(/^\/anuncio\/([^/]+)$/, viewListing);
  route(/^\/entrar$/, viewLogin);
  route(/^\/registar$/, viewRegister);
  route(/^\/recuperar$/, viewRecover);
  route(/^\/perfil$/, viewProfile);
  route(/^\/perfil\/([^/]+)$/, viewPublicProfile);
  route(/^\/vender$/, (m, q) => viewSell(m, q, null));
  route(/^\/editar\/([^/]+)$/, (m, q) => viewSell(m, q, m[0]));
  route(/^\/os-meus-anuncios$/, viewMyListings);
  route(/^\/carrinho$/, viewCart);
  route(/^\/checkout$/, viewCheckout);
  route(/^\/compras$/, viewPurchases);
  route(/^\/vendas$/, viewSales);
  route(/^\/mensagens$/, viewMessages);
  route(/^\/notificacoes$/, viewNotifications);
  route(/^\/premium$/, viewPremium);
  route(/^\/admin$/, viewAdmin);

  /* ---------- Pesquisa no topo (RF11) ---------- */
  const topForm = document.getElementById("topSearch");
  const topInput = document.getElementById("topSearchInput");
  topForm.addEventListener("submit", (e) => {
    e.preventDefault();
    marketState.q = topInput.value.trim();
    location.hash = "#/";
    render();
  });

  /* ---------- Reset demo ---------- */
  document.getElementById("resetDemo").addEventListener("click", () => {
    modalConfirm("Repor dados de demonstração?", "Todos os dados locais serão substituídos pelos dados iniciais.", () => {
      S.reset(); Cart.clear(); toast("Dados repostos.", "ok"); location.hash = "#/"; render();
    });
  });

  /* ---------- Arranque ---------- */
  S.load();
  window.addEventListener("hashchange", render);
  render();
})();
