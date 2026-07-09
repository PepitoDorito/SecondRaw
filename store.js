/* ==========================================================================
   SecondRaw — Store (camada de dados)
   Backend simulado sobre localStorage. Cobre utilizadores, anúncios,
   transações, mensagens, propostas, avaliações, denúncias, disputas e
   notificações. Semeado com dados de demonstração no primeiro arranque.
   ========================================================================== */
(function (global) {
  "use strict";

  const KEY = "secondraw:v1";
  const COMMISSION_RATE = 0.08; // RF17 — comissão da plataforma (8%)

  /* ---------- Categorias e estados (RF08 / RF09) ---------- */
  const CATEGORIES = [
    { id: "madeira", label: "Madeira", swatch: "wood" },
    { id: "textil", label: "Têxtil", swatch: "textile" },
    { id: "plastico", label: "Plástico", swatch: "plastic" },
    { id: "metal", label: "Metal", swatch: "metal" },
    { id: "construcao", label: "Construção", swatch: "stone" },
    { id: "vidro", label: "Vidro", swatch: "glass" },
    { id: "pedra", label: "Pedra & Cerâmica", swatch: "stone" },
  ];

  const CONDITIONS = [
    { id: "novo", label: "Novo" },
    { id: "excedente", label: "Excedente" },
    { id: "reciclado", label: "Reciclado" },
    { id: "usado", label: "Usado" },
  ];

  const STATUSES = [
    { id: "ativo", label: "Ativo" },
    { id: "reservado", label: "Reservado" },
    { id: "vendido", label: "Vendido" },
  ];

  /* ---------- Utilidades ---------- */
  const uid = (p = "id") =>
    p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => Date.now();
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Persistência ---------- */
  let db = null;

  function blank() {
    return {
      users: [],
      listings: [],
      orders: [],
      threads: [],
      proposals: [],
      reviews: [],
      reports: [],
      disputes: [],
      notifications: [],
      session: null, // id do utilizador com sessão iniciada
      seededAt: null,
    };
  }

  function load() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : null;
    } catch (e) {
      db = null;
    }
    if (!db || !db.seededAt) {
      db = seed();
      persist();
    }
    return db;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      /* quota — ignora em modo demo */
    }
  }

  function reset() {
    db = seed();
    persist();
    return db;
  }

  /* ---------- Sessão / autenticação (RF01, RF03) ---------- */
  function currentUser() {
    load();
    return db.users.find((u) => u.id === db.session) || null;
  }

  function register({ name, email, password, type, nif }) {
    load();
    email = (email || "").trim().toLowerCase();
    if (!email || !password) throw new Error("Email e palavra-passe obrigatórios.");
    if (db.users.some((u) => u.email === email))
      throw new Error("Já existe uma conta com este email.");
    const user = {
      id: uid("u"),
      name: name || email.split("@")[0],
      email,
      password, // demo — nunca guardar em claro em produção
      type: type === "company" ? "company" : "buyer", // RF02
      photo: "",
      address: "",
      phone: "",
      nif: nif || "",
      nifVerified: false, // RF05
      premium: false, // RF30
      role: "user",
      createdAt: now(),
    };
    db.users.push(user);
    db.session = user.id;
    persist();
    return user;
  }

  function login(email, password) {
    load();
    email = (email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== password)
      throw new Error("Credenciais inválidas.");
    db.session = user.id;
    persist();
    return user;
  }

  // RF01 — login social simulado (Google/Apple)
  function socialLogin(provider) {
    load();
    const email = provider.toLowerCase() + ".demo@secondraw.pt";
    let user = db.users.find((u) => u.email === email);
    if (!user) {
      user = {
        id: uid("u"),
        name: provider + " Demo",
        email,
        password: null,
        type: "buyer",
        photo: "",
        address: "",
        phone: "",
        nif: "",
        nifVerified: false,
        premium: false,
        role: "user",
        provider,
        createdAt: now(),
      };
      db.users.push(user);
    }
    db.session = user.id;
    persist();
    return user;
  }

  function logout() {
    load();
    db.session = null;
    persist();
  }

  // RF03 — recuperação de palavra-passe (simulada)
  function requestPasswordReset(email) {
    load();
    email = (email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    // Token devolvido apenas para efeitos de demonstração
    return user ? uid("reset") : null;
  }

  function updateUser(id, patch) {
    load();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, patch);
    persist();
    return u;
  }

  // RF05 — pedido/aprovação de verificação de empresa (NIF/certidão)
  function requestVerification(userId) {
    return updateUser(userId, { verificationPending: true });
  }
  function setVerified(userId, verified) {
    return updateUser(userId, {
      nifVerified: verified,
      verificationPending: false,
    });
  }

  /* ---------- Anúncios (RF06–RF10) ---------- */
  function createListing(data) {
    load();
    const seller = currentUser();
    const listing = {
      id: uid("l"),
      sellerId: data.sellerId || (seller && seller.id),
      title: data.title || "Sem título",
      description: data.description || "",
      category: data.category || "madeira",
      condition: data.condition || "excedente",
      quantity: Number(data.quantity) || 1,
      unit: data.unit || "un",
      price: Number(data.price) || 0,
      location: data.location || "Portugal",
      photos: data.photos && data.photos.length ? data.photos : [],
      status: "ativo",
      featured: !!data.featured, // RF31
      createdAt: now(),
    };
    db.listings.unshift(listing);
    persist();
    return listing;
  }

  function updateListing(id, patch) {
    load();
    const l = db.listings.find((x) => x.id === id);
    if (!l) return null;
    Object.assign(l, patch);
    persist();
    return l;
  }

  function deleteListing(id) {
    load();
    db.listings = db.listings.filter((l) => l.id !== id);
    persist();
  }

  function getListing(id) {
    load();
    return db.listings.find((l) => l.id === id) || null;
  }

  /* ---------- Pesquisa / filtros / ordenação (RF11–RF13) ---------- */
  function searchListings(opts = {}) {
    load();
    let items = db.listings.filter((l) => l.status !== "vendido" || opts.includeSold);
    const q = (opts.q || "").trim().toLowerCase();
    if (q) {
      items = items.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q)
      );
    }
    if (opts.category) items = items.filter((l) => l.category === opts.category);
    if (opts.condition) items = items.filter((l) => l.condition === opts.condition);
    if (opts.location)
      items = items.filter((l) =>
        l.location.toLowerCase().includes(opts.location.toLowerCase())
      );
    if (opts.minPrice != null && opts.minPrice !== "")
      items = items.filter((l) => l.price >= Number(opts.minPrice));
    if (opts.maxPrice != null && opts.maxPrice !== "")
      items = items.filter((l) => l.price <= Number(opts.maxPrice));
    if (opts.minQty != null && opts.minQty !== "")
      items = items.filter((l) => l.quantity >= Number(opts.minQty));

    switch (opts.sort) {
      case "price-asc":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        items.sort((a, b) => b.price - a.price);
        break;
      case "recent":
        items.sort((a, b) => b.createdAt - a.createdAt);
        break;
      default:
        // destaque primeiro, depois mais recente (RF31)
        items.sort(
          (a, b) => b.featured - a.featured || b.createdAt - a.createdAt
        );
    }
    return items;
  }

  /* ---------- Transações (RF15–RF19) ---------- */
  function commissionFor(subtotal) {
    return Math.round(subtotal * COMMISSION_RATE * 100) / 100;
  }

  function createOrder({ buyerId, items, payment, delivery }) {
    load();
    // items: [{listingId, qty, unitPrice}]
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const commission = commissionFor(subtotal);
    const shipping = delivery === "courier" ? 12.5 : 0; // RF18
    const order = {
      id: uid("o"),
      buyerId,
      sellerId: getListing(items[0].listingId)?.sellerId,
      items,
      subtotal,
      commission,
      shipping,
      total: subtotal + commission + shipping,
      payment, // {method}
      delivery,
      status: "pago",
      createdAt: now(),
      reviewed: false,
    };
    db.orders.unshift(order);
    // marca anúncios como vendidos (RF10)
    items.forEach((i) => updateListing(i.listingId, { status: "vendido" }));
    // notifica o vendedor (RF21)
    if (order.sellerId)
      notify(order.sellerId, "sale", "Vendeste um lote! Nova encomenda recebida.", "#/vendas");
    persist();
    return order;
  }

  function ordersForBuyer(id) {
    load();
    return db.orders.filter((o) => o.buyerId === id);
  }
  function ordersForSeller(id) {
    load();
    return db.orders.filter((o) => o.sellerId === id);
  }
  function getOrder(id) {
    load();
    return db.orders.find((o) => o.id === id) || null;
  }
  function setOrderStatus(id, status) {
    load();
    const o = db.orders.find((x) => x.id === id);
    if (!o) return;
    o.status = status;
    if (o.buyerId)
      notify(o.buyerId, "order", "Estado da encomenda atualizado: " + status, "#/compras");
    persist();
  }

  /* ---------- Chat (RF20) ---------- */
  function findThread(a, b, listingId) {
    load();
    return db.threads.find(
      (t) =>
        t.listingId === listingId &&
        t.participants.includes(a) &&
        t.participants.includes(b)
    );
  }

  function openThread(userA, userB, listingId) {
    load();
    let t = findThread(userA, userB, listingId);
    if (!t) {
      t = {
        id: uid("t"),
        participants: [userA, userB],
        listingId,
        messages: [],
        createdAt: now(),
      };
      db.threads.unshift(t);
      persist();
    }
    return t;
  }

  function sendMessage(threadId, senderId, text) {
    load();
    const t = db.threads.find((x) => x.id === threadId);
    if (!t) return;
    t.messages.push({ senderId, text, at: now() });
    const other = t.participants.find((p) => p !== senderId);
    if (other) notify(other, "message", "Nova mensagem: " + text.slice(0, 40), "#/mensagens"); // RF21
    persist();
    return t;
  }

  function threadsForUser(id) {
    load();
    return db.threads
      .filter((t) => t.participants.includes(id))
      .sort((a, b) => {
        const la = a.messages.length ? a.messages[a.messages.length - 1].at : a.createdAt;
        const lb = b.messages.length ? b.messages[b.messages.length - 1].at : b.createdAt;
        return lb - la;
      });
  }

  /* ---------- Propostas / negociação (RF22) ---------- */
  function createProposal({ listingId, buyerId, amount, message }) {
    load();
    const listing = getListing(listingId);
    const p = {
      id: uid("p"),
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      amount: Number(amount),
      message: message || "",
      status: "pendente",
      at: now(),
    };
    db.proposals.unshift(p);
    notify(listing.sellerId, "proposal", "Nova proposta de preço recebida.", "#/vendas");
    persist();
    return p;
  }
  function respondProposal(id, status) {
    load();
    const p = db.proposals.find((x) => x.id === id);
    if (!p) return;
    p.status = status; // aceite / rejeitada
    notify(
      p.buyerId,
      "proposal",
      "A tua proposta foi " + status + ".",
      "#/anuncio/" + p.listingId
    );
    persist();
    return p;
  }
  function proposalsForListing(id) {
    load();
    return db.proposals.filter((p) => p.listingId === id);
  }
  function proposalsForUser(id) {
    load();
    return db.proposals.filter((p) => p.buyerId === id || p.sellerId === id);
  }

  /* ---------- Avaliações (RF23, RF24) ---------- */
  function createReview({ orderId, fromId, toId, stars, comment }) {
    load();
    const r = {
      id: uid("r"),
      orderId,
      fromId,
      toId,
      stars: Number(stars),
      comment: comment || "",
      at: now(),
    };
    db.reviews.unshift(r);
    const o = db.orders.find((x) => x.id === orderId);
    if (o) o.reviewed = true;
    notify(toId, "review", "Recebeste uma nova avaliação.", "#/perfil/" + toId);
    persist();
    return r;
  }
  function reviewsFor(userId) {
    load();
    return db.reviews.filter((r) => r.toId === userId);
  }
  function ratingFor(userId) {
    const rs = reviewsFor(userId);
    if (!rs.length) return { avg: 0, count: 0 };
    const avg = rs.reduce((s, r) => s + r.stars, 0) / rs.length;
    return { avg: Math.round(avg * 10) / 10, count: rs.length };
  }

  /* ---------- Denúncias (RF25) ---------- */
  function createReport({ targetType, targetId, reason, byId }) {
    load();
    const r = {
      id: uid("rep"),
      targetType, // 'listing' | 'user'
      targetId,
      reason,
      byId,
      status: "aberta",
      at: now(),
    };
    db.reports.unshift(r);
    persist();
    return r;
  }
  function resolveReport(id, status) {
    load();
    const r = db.reports.find((x) => x.id === id);
    if (r) r.status = status;
    persist();
  }

  /* ---------- Disputas (RF28) ---------- */
  function createDispute({ orderId, byId, reason }) {
    load();
    const d = {
      id: uid("d"),
      orderId,
      byId,
      reason,
      status: "aberta",
      at: now(),
    };
    db.disputes.unshift(d);
    persist();
    return d;
  }
  function resolveDispute(id, status, resolution) {
    load();
    const d = db.disputes.find((x) => x.id === id);
    if (d) {
      d.status = status;
      d.resolution = resolution || "";
    }
    persist();
  }

  /* ---------- Notificações (RF21) ---------- */
  function notify(userId, type, text, link) {
    load();
    db.notifications.unshift({
      id: uid("n"),
      userId,
      type,
      text,
      link: link || "",
      read: false,
      at: now(),
    });
    persist();
  }
  function notificationsFor(id) {
    load();
    return db.notifications.filter((n) => n.userId === id);
  }
  function markNotificationsRead(id) {
    load();
    db.notifications.forEach((n) => {
      if (n.userId === id) n.read = true;
    });
    persist();
  }

  /* ---------- Estatísticas backoffice (RF29) ---------- */
  function stats() {
    load();
    const sales = db.orders.reduce((s, o) => s + o.total, 0);
    const commissions = db.orders.reduce((s, o) => s + o.commission, 0);
    return {
      users: db.users.length,
      companies: db.users.filter((u) => u.type === "company").length,
      buyers: db.users.filter((u) => u.type === "buyer").length,
      listings: db.listings.length,
      activeListings: db.listings.filter((l) => l.status === "ativo").length,
      sold: db.listings.filter((l) => l.status === "vendido").length,
      orders: db.orders.length,
      sales: Math.round(sales * 100) / 100,
      commissions: Math.round(commissions * 100) / 100,
      openReports: db.reports.filter((r) => r.status === "aberta").length,
      openDisputes: db.disputes.filter((d) => d.status === "aberta").length,
    };
  }

  /* ---------- Coleções (para o backoffice) ---------- */
  const all = {
    users: () => (load(), db.users),
    listings: () => (load(), db.listings),
    orders: () => (load(), db.orders),
    reports: () => (load(), db.reports),
    disputes: () => (load(), db.disputes),
  };
  function userById(id) {
    load();
    return db.users.find((u) => u.id === id) || null;
  }

  /* ========================================================================
     Seed — dados de demonstração
     ======================================================================== */
  function seed() {
    const d = blank();
    const t = now();
    const day = 86400000;

    const mk = (o) => ({ ...o });

    // Utilizadores
    const admin = mk({
      id: "u_admin",
      name: "Admin SecondRaw",
      email: "admin@secondraw.pt",
      password: "admin",
      type: "company",
      role: "admin",
      photo: "",
      address: "Porto",
      phone: "+351 220 000 000",
      nif: "500000000",
      nifVerified: true,
      premium: true,
      createdAt: t - 120 * day,
    });
    const woodco = mk({
      id: "u_wood",
      name: "Marcenaria Douro",
      email: "vendas@marcenariadouro.pt",
      password: "demo",
      type: "company",
      role: "user",
      photo: "",
      address: "Vila Nova de Gaia",
      phone: "+351 223 111 222",
      nif: "501234567",
      nifVerified: true,
      premium: true,
      createdAt: t - 90 * day,
    });
    const metalco = mk({
      id: "u_metal",
      name: "Ribeiro Metalworks",
      email: "geral@ribeirometal.pt",
      password: "demo",
      type: "company",
      role: "user",
      photo: "",
      address: "Braga",
      phone: "+351 253 333 444",
      nif: "502345678",
      nifVerified: true,
      premium: false,
      createdAt: t - 60 * day,
    });
    const textileco = mk({
      id: "u_textile",
      name: "Fios de Guimarães",
      email: "loja@fiosguimaraes.pt",
      password: "demo",
      type: "company",
      role: "user",
      photo: "",
      address: "Guimarães",
      phone: "+351 253 555 666",
      nif: "503456789",
      nifVerified: false,
      verificationPending: true,
      premium: false,
      createdAt: t - 30 * day,
    });
    const buyer = mk({
      id: "u_buyer",
      name: "Marta Costa",
      email: "marta@cafenorte.pt",
      password: "demo",
      type: "buyer",
      role: "user",
      photo: "",
      address: "Porto",
      phone: "+351 912 000 111",
      nif: "",
      nifVerified: false,
      premium: false,
      createdAt: t - 45 * day,
    });
    const buyer2 = mk({
      id: "u_buyer2",
      name: "Ana Silva",
      email: "ana@atelierfio.pt",
      password: "demo",
      type: "buyer",
      role: "user",
      photo: "",
      address: "Lisboa",
      phone: "+351 913 222 333",
      nif: "",
      nifVerified: false,
      premium: false,
      createdAt: t - 20 * day,
    });
    d.users.push(admin, woodco, metalco, textileco, buyer, buyer2);

    // Anúncios
    const L = (o) => {
      const listing = {
        id: uid("l"),
        status: "ativo",
        featured: false,
        photos: [],
        unit: "un",
        ...o,
      };
      d.listings.push(listing);
      return listing;
    };
    const l1 = L({
      sellerId: woodco.id,
      title: "Offcuts de carvalho, secados em estufa",
      description:
        "2,4 toneladas de aparas de carvalho maciço de uma marcenaria. Comprimentos de 30 a 120 cm, ideais para mobiliário, revestimentos e peças pequenas. Grau A, sem tratamento químico.",
      category: "madeira",
      condition: "excedente",
      quantity: 2400,
      unit: "kg",
      price: 260,
      location: "Vila Nova de Gaia",
      featured: true,
      createdAt: t - 2 * day,
    });
    const l2 = L({
      sellerId: metalco.id,
      title: "Chapa de aço escovado",
      description:
        "640 m² de chapa de aço inox escovado, resultado do encerramento de uma fábrica. Espessura 1,5 mm. Perfeita para bancadas, fachadas e mobiliário industrial.",
      category: "metal",
      condition: "excedente",
      quantity: 640,
      unit: "m²",
      price: 14,
      location: "Braga",
      featured: true,
      createdAt: t - 5 * day,
    });
    const l3 = L({
      sellerId: textileco.id,
      title: "Rolos de mistura de lã (deadstock)",
      description:
        "1.180 metros de tecido de mistura de lã, fim de linha. Tons terra e cinza. Largura 1,5 m. Excelente para vestuário, estofos e acessórios.",
      category: "textil",
      condition: "novo",
      quantity: 1180,
      unit: "m",
      price: 7,
      location: "Guimarães",
      createdAt: t - 8 * day,
    });
    const l4 = L({
      sellerId: metalco.id,
      title: "Perfis de alumínio variados",
      description:
        "Lote de perfis de alumínio (cantoneiras, tubos e calhas) de sobras de produção. Cerca de 300 peças, comprimentos variados.",
      category: "metal",
      condition: "excedente",
      quantity: 300,
      unit: "un",
      price: 180,
      location: "Braga",
      createdAt: t - 12 * day,
    });
    const l5 = L({
      sellerId: woodco.id,
      title: "Painéis de contraplacado marítimo",
      description:
        "18 painéis de contraplacado marítimo 250x122 cm, 18 mm. Sobras de um projeto de construção naval. Resistentes à humidade.",
      category: "construcao",
      condition: "excedente",
      quantity: 18,
      unit: "painéis",
      price: 42,
      location: "Matosinhos",
      status: "reservado",
      createdAt: t - 15 * day,
    });
    const l6 = L({
      sellerId: textileco.id,
      title: "Retalhos de couro genuíno",
      description:
        "Caixa de 40 kg de retalhos de couro de curtume, várias cores. Ideal para marroquinaria, calçado e pequenos acessórios.",
      category: "textil",
      condition: "reciclado",
      quantity: 40,
      unit: "kg",
      price: 95,
      location: "Guimarães",
      createdAt: t - 18 * day,
    });
    const l7 = L({
      sellerId: metalco.id,
      title: "Placas de acrílico transparente",
      description:
        "25 placas de acrílico 100x200 cm, 5 mm, excedente de stock. Transparentes, sem riscos, com película protetora.",
      category: "plastico",
      condition: "novo",
      quantity: 25,
      unit: "placas",
      price: 28,
      location: "Braga",
      createdAt: t - 22 * day,
    });
    const l8 = L({
      sellerId: woodco.id,
      title: "Vigas de pinho recuperadas",
      description:
        "12 vigas de pinho recuperadas de uma casa antiga do século XIX. Secção 15x15 cm, 3 m. Pátina única, tratadas contra caruncho.",
      category: "madeira",
      condition: "usado",
      quantity: 12,
      unit: "vigas",
      price: 65,
      location: "Amarante",
      createdAt: t - 26 * day,
    });

    // Uma venda já concluída (para histórico + avaliação)
    const soldListing = L({
      sellerId: woodco.id,
      title: "Tampos de mesa em nogueira",
      description: "6 tampos de nogueira maciça, 180x90 cm. Já vendidos.",
      category: "madeira",
      condition: "excedente",
      quantity: 6,
      unit: "tampos",
      price: 210,
      location: "Vila Nova de Gaia",
      status: "vendido",
      createdAt: t - 40 * day,
    });

    const order = {
      id: "o_demo",
      buyerId: buyer.id,
      sellerId: woodco.id,
      items: [{ listingId: soldListing.id, qty: 2, unitPrice: 210 }],
      subtotal: 420,
      commission: commissionFor(420),
      shipping: 12.5,
      total: 420 + commissionFor(420) + 12.5,
      payment: { method: "mbway" },
      delivery: "courier",
      status: "entregue",
      createdAt: t - 35 * day,
      reviewed: true,
    };
    d.orders.push(order);

    // Avaliações
    d.reviews.push({
      id: uid("r"),
      orderId: order.id,
      fromId: buyer.id,
      toId: woodco.id,
      stars: 5,
      comment:
        "Madeira impecável, tal como descrita. Entrega rápida e comunicação excelente. Recomendo!",
      at: t - 33 * day,
    });
    d.reviews.push({
      id: uid("r"),
      orderId: order.id,
      fromId: woodco.id,
      toId: buyer.id,
      stars: 5,
      comment: "Compradora impecável, pagamento imediato.",
      at: t - 33 * day,
    });

    // Chat de exemplo
    const thread = {
      id: "t_demo",
      participants: [buyer2.id, textileco.id],
      listingId: l3.id,
      messages: [
        {
          senderId: buyer2.id,
          text: "Olá! Os rolos de lã ainda estão disponíveis? Precisava de 200 metros.",
          at: t - 3 * day,
        },
        {
          senderId: textileco.id,
          text: "Boa tarde! Sim, temos disponibilidade. Consigo reservar os 200 m para si.",
          at: t - 3 * day + 3600000,
        },
      ],
      createdAt: t - 3 * day,
    };
    d.threads.push(thread);

    // Proposta de exemplo
    d.proposals.push({
      id: uid("p"),
      listingId: l1.id,
      buyerId: buyer.id,
      sellerId: woodco.id,
      amount: 220,
      message: "Aceita 220€/t se levar tudo?",
      status: "pendente",
      at: t - 1 * day,
    });

    // Denúncia de exemplo
    d.reports.push({
      id: uid("rep"),
      targetType: "listing",
      targetId: l7.id,
      reason: "Preço suspeito / possível fraude",
      byId: buyer2.id,
      status: "aberta",
      at: t - 1 * day,
    });

    // Disputa de exemplo
    d.disputes.push({
      id: uid("d"),
      orderId: order.id,
      byId: buyer.id,
      reason: "Um dos tampos chegou com um risco não mencionado.",
      status: "aberta",
      at: t - 30 * day,
    });

    // Notificações iniciais
    d.notifications.push({
      id: uid("n"),
      userId: woodco.id,
      type: "proposal",
      text: "Nova proposta de preço em 'Offcuts de carvalho'.",
      link: "#/vendas",
      read: false,
      at: t - 1 * day,
    });

    d.seededAt = t;
    return d;
  }

  /* ---------- API pública ---------- */
  global.Store = {
    COMMISSION_RATE,
    CATEGORIES,
    CONDITIONS,
    STATUSES,
    load,
    reset,
    persist,
    // sessão
    currentUser,
    register,
    login,
    socialLogin,
    logout,
    requestPasswordReset,
    updateUser,
    requestVerification,
    setVerified,
    userById,
    // anúncios
    createListing,
    updateListing,
    deleteListing,
    getListing,
    searchListings,
    // transações
    commissionFor,
    createOrder,
    ordersForBuyer,
    ordersForSeller,
    getOrder,
    setOrderStatus,
    // chat
    openThread,
    findThread,
    sendMessage,
    threadsForUser,
    // propostas
    createProposal,
    respondProposal,
    proposalsForListing,
    proposalsForUser,
    // avaliações
    createReview,
    reviewsFor,
    ratingFor,
    // denúncias / disputas
    createReport,
    resolveReport,
    createDispute,
    resolveDispute,
    // notificações
    notify,
    notificationsFor,
    markNotificationsRead,
    // backoffice
    stats,
    all,
    // helpers
    uid,
  };
})(window);
