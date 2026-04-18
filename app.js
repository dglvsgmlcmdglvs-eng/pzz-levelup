// ===== DATA =====
const products = {
  pizzas: [
    {
      id: 1,
      name: "Mista",
      desc: "Molho de tomate, mussarela, Presunto",
      price: 28.00,
      imagem:"/img/mista.webp",
      emoji:"🍕",
    },
    {
      id: 2,
      name: "Calabresa",
      desc: "Calabresa fatiada, cebola, azeitona, mussarela",
      price: 28.00,
      imagem: "/img/calabresa.webp",
      emoji:"🍕",
    },
    {
      id: 3,
      name: "Frango c/ Catupiry",
      desc: "Frango desfiado, catupiry, milho, mussarela",
      price: 28.00,
      imagem: "/img/frangocatupy.webp",
      emoji:"🍕",
    },
    {
      id: 4,
      name: "Queijo",
      desc: "Queijo Mussarela",
      price: 28.00,
      imagem:"/img/queijo.webp",
      emoji:"🍕",
    },
    {
      id: 5,
      name: "Portuguesa",
      desc: "Presunto, ovos, cebola, azeitona, ervilha, mussarela",
      price: 28.00,
      imagem:"/img/portuguesa.webp",
      emoji:"🍕",
    },
  ],
  pasteis: [
  {
    id: 201,
    name: "Pastel de Carne",
    desc: "Carne moída temperada",
    price: 8.9,
    imagem:"/img/pastelcarne.webp",
    emoji:"🥟",
  },
  {
    id: 202,
    name: "Pastel de Queijo",
    desc: "Queijo derretido",
    price: 7.9,
    imagem:"/img/pastelqueijo.webp",
    emoji:"🥟",
  },
  {
    id: 203,
    name: "Pastel de Frango",
    desc: "Frango desfiado temperado",
    price: 8.5,
    imagem:"/img/pastelfrango.webp",
    emoji:"🥟",
  },
    {
    id: 204,
    name: "Pastel Misto",
    desc: "queijo mussarela , Presunto",
    price: 8.9,
    imagem:"/img/pastelmisto.webp",
    emoji:"🥟",
  },
  ],

  acompanhamentos: [
    {
      id: 501,
      name: "Batata Frita P",
      desc: "Porção pequena crocante",
      price: 9.9,
      imagem: "img/batata-p.webp",
      emoji: "🍟",
    },
    {
      id: 502,
      name: "Batata Frita G",
      desc: "Porção grande crocante",
      price: 15.9,
      imagem: "img/batata-g.webp",
      emoji: "🍟",
    },
    {
      id: 503,
      name: "Batata com Cheddar",
      desc: "Batata crocante com cheddar cremoso",
      price: 18.9,
      imagem: "img/batata-cheddar.webp",
      emoji: "🍟",
    },
    {
      id: 504,
      name: "Mega Cheddar 🔥",
      desc: "Porção grande com muito cheddar cremoso",
      price: 22.9,
      imagem: "img/mega-cheddar.webp",
      emoji: "🍟",
    }
  ],
  
  bebidas: [
    {
      id: 101,
      name: "São Geraldo 1L",
      desc: "Refrigerante São Geraldo 1 litro",
      price: 12.00,
      imagem:"/img/saogeraldo.webp",
      emoji: "🥤",
    },
    {
      id: 102,
      name: "Guaraná 1L",
      desc: "Refrigerante Guaraná 1 litro",
      price: 10.0,
      imagem:"/img/guarana1l.webp",
      emoji: "🥤",
    },
    {
      id: 103,
      name: "bebida indispensável",
      desc: "",
      price: 14.9,
      emoji: "🍊",
    },
    {
      id: 104,
      name: "bebida indispensável",
      desc: "",
      price: 4.9,
      emoji: "💧",
    },
    {
      id: 105,
      name: "bebida indispensável",
      desc: "",
      price: 15.9,
      emoji: "🍺",
    },
    {
      id: 106,
      name: "bebida indispensável",
      desc: "",
      price: 13.9,
      emoji: "🍇",
    },
  ],
};

// ===== STATE =====
let cart = [];
let currentCategory = "pizzas";

// ===== RENDER PRODUCTS =====
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const items = products[currentCategory];

  grid.innerHTML = items
    .map((p) => {
      const inCart = cart.find((c) => c.id === p.id);
      const qty = inCart ? inCart.qty : 0;

      return `
      <div class="product-card">
        <div class="product-img">
  <img src="${p.imagem}" alt="${p.name}" />
</div>
        <div class="product-info">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-desc">${escapeHtml(p.desc)}</div>
          <div class="product-bottom">
            <span class="product-price">R$ ${formatPrice(p.price)}</span>
            ${
              qty === 0
                ? `<button class="add-btn" onclick="addToCart(${p.id})" aria-label="Adicionar ${escapeHtml(p.name)}">+</button>`
                : `<div class="qty-controls">
                    <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
                  </div>`
            }
          </div>
        </div>
      </div>`;
    })
    .join("");
}

// ===== CART LOGIC =====
function addToCart(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const existing = cart.find((c) => c.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  updateUI();
}

function changeQty(productId, delta) {
  const item = cart.find((c) => c.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((c) => c.id !== productId);
  }

  updateUI();
}

function findProduct(id) {
  for (const category of Object.values(products)) {
    const found = category.find((p) => p.id === id);
    if (found) return found;
  }
  return null;
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// ===== RENDER CART =====
function renderCart() {
  const container = document.getElementById("cartItems");
  const footer = document.getElementById("cartFooter");
  const countEl = document.getElementById("cartCount");

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  countEl.textContent = totalItems;

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Seu carrinho está vazio</p>';
    footer.style.display = "none";
    return;
  }

  footer.style.display = "block";
  document.getElementById("cartTotal").textContent =
    `R$ ${formatPrice(getCartTotal())}`;

  container.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">R$ ${formatPrice(item.price)}</div>
      </div>
      <div class="cart-item-qty">
        <button onclick="changeQty(${item.id}, -1)">−</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${item.id}, 1)">+</button>
      </div>
    </div>`,
    )
    .join("");
}

// ===== CART SIDEBAR TOGGLE =====
function toggleCart() {
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("cartOverlay");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("open");
}

function closeCart() {
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

// ===== CATEGORY TABS =====
function switchCategory(btn) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  currentCategory = btn.dataset.category;
  renderProducts();
}

// ===== NAVIGATION =====
function goToCheckout() {
  if (cart.length === 0) return;

  closeCart();

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("checkoutPage").classList.add("active");

  renderOrderSummary();
  window.scrollTo(0, 0);
}

function goToMenu() {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("menuPage").classList.add("active");
  window.scrollTo(0, 0);
}

function renderOrderSummary() {
  const container = document.getElementById("orderSummary");
  const total = getCartTotal();

  loadCustomerFromCache();

  container.innerHTML = `
    <h3>Resumo do Pedido</h3>
    ${cart
      .map(
        (item) => `
      <div class="summary-item">
        <span>${item.qty}x ${escapeHtml(item.name)}</span>
        <span>R$ ${formatPrice(item.price * item.qty)}</span>
      </div>`,
      )
      .join("")}
    <div class="summary-total">
      <span>Total</span>
      <span>R$ ${formatPrice(total)}</span>
    </div>
  `;
}

// ===== CHECKOUT =====
const API_URL = "https://pzz-bn4k.onrender.com/api";
let otpVerified = { checkout: false, track: false };

function hasValidSession(phoneDigits) {
  const token = localStorage.getItem("pzz_session_token");
  const savedDigits = localStorage.getItem("pzz_telefone_digits");
  return token && savedDigits === phoneDigits;
}

// ===== OTP =====
async function sendOtp(context) {
  const phoneInput =
    context === "checkout"
      ? document.getElementById("telefone")
      : document.getElementById("trackPhone");
  const btn =
    context === "checkout"
      ? document.getElementById("btnSendCodeCheckout")
      : document.getElementById("btnSendCodeTrack");
  const otpGroup = document.getElementById(
    context === "checkout" ? "otpGroupCheckout" : "otpGroupTrack",
  );
  const statusEl = document.getElementById(
    context === "checkout" ? "otpStatusCheckout" : "otpStatusTrack",
  );

  const phone = phoneInput.value.trim();
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10) {
    alert("Digite um telefone válido");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Enviando...";

  try {
    const res = await fetch(`${API_URL}/otp/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: digits }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao enviar código");
      btn.disabled = false;
      btn.textContent = "Enviar código";
      return;
    }

    otpGroup.style.display = "block";
    statusEl.textContent = "";
    otpVerified[context] = false;

    // Countdown
    let seconds = 60;
    btn.textContent = `Reenviar (${seconds}s)`;
    const interval = setInterval(() => {
      seconds--;
      btn.textContent = `Reenviar (${seconds}s)`;
      if (seconds <= 0) {
        clearInterval(interval);
        btn.disabled = false;
        btn.textContent = "Reenviar código";
      }
    }, 1000);
  } catch {
    alert("Erro ao conectar com o servidor");
    btn.disabled = false;
    btn.textContent = "Enviar código";
  }
}

async function verifyOtp(context) {
  const phoneInput =
    context === "checkout"
      ? document.getElementById("telefone")
      : document.getElementById("trackPhone");
  const otpInput = document.getElementById(
    context === "checkout" ? "otpCheckout" : "otpTrack",
  );
  const statusEl = document.getElementById(
    context === "checkout" ? "otpStatusCheckout" : "otpStatusTrack",
  );

  const digits = phoneInput.value.replace(/\D/g, "");
  const codigo = otpInput.value.trim();

  if (codigo.length !== 6) return;

  statusEl.textContent = "⏳";
  statusEl.className = "otp-status";

  try {
    const res = await fetch(`${API_URL}/otp/verificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: digits, codigo }),
    });

    const data = await res.json();

    if (res.ok && data.verificado) {
      otpVerified[context] = true;
      statusEl.textContent = "✅ Verificado";
      statusEl.className = "otp-status otp-ok";
      otpInput.disabled = true;

      // Salvar token de sessão
      if (data.session_token) {
        const digits = phoneInput.value.replace(/\D/g, "");
        localStorage.setItem("pzz_session_token", data.session_token);
        localStorage.setItem("pzz_telefone", phoneInput.value);
        localStorage.setItem("pzz_telefone_digits", digits);
      }

      // Preencher dados do cliente se for checkout
      if (context === "checkout") {
        fetchCustomerData(phoneInput.value.replace(/\D/g, ""));
      }
    } else {
      otpVerified[context] = false;
      statusEl.textContent = "❌ " + (data.erro || "Código inválido");
      statusEl.className = "otp-status otp-err";
    }
  } catch {
    statusEl.textContent = "❌ Erro de conexão";
    statusEl.className = "otp-status otp-err";
  }
}

// Auto-verify when 6 digits entered
// document.getElementById("otpCheckout").addEventListener("input", (e) => {
//   e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
//   if (e.target.value.length === 6) verifyOtp("checkout");
// });

// document.getElementById("otpTrack").addEventListener("input", (e) => {
//   e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
//   if (e.target.value.length === 6) verifyOtp("track");
// });

async function submitOrder(e) {
  e.preventDefault();

  // if (!otpVerified.checkout) {
  //   alert("Verifique seu telefone com o código antes de enviar o pedido");
  //   return;
  // }

  const form = document.getElementById("checkoutForm");
  const submitBtn = form.querySelector(".btn-submit");
  const formData = new FormData(form);

  const order = {
    items: cart.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      subtotal: item.price * item.qty,
    })),
    total: getCartTotal(),
    customer: {
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      rua: formData.get("rua"),
      numero: formData.get("numero"),
      complemento: formData.get("complemento"),
      bairro: formData.get("bairro"),
    },
    pagamento: formData.get("pagamento"),
    troco: formData.get("troco") || null,
    session_token: localStorage.getItem("pzz_session_token") || "",
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const res = await fetch(`${API_URL}/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.erro || "Erro ao enviar pedido");
      return;
    }

    // Salvar telefone para consultas futuras
    localStorage.setItem("pzz_telefone", formData.get("telefone"));

    const customerData = {
      nome: formData.get("nome"),
      telefone: formData.get("telefone"),
      rua: formData.get("rua"),
      numero: formData.get("numero"),
      complemento: formData.get("complemento"),
      bairro: formData.get("bairro"),
    };

    saveCustomerToCache(customerData);

    sendOrderToWhatsApp(data.pedido);

    document.getElementById("successModal").classList.add("open");
  } catch (e) {
    console.error(e);
    alert("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar Pedido";
  }
}

function resetOrder() {
  cart = [];
  document.getElementById("checkoutForm").reset();
  document.getElementById("successModal").classList.remove("open");
  // Reset OTP state
  // otpVerified.checkout = false;
  // document.getElementById("otpGroupCheckout").style.display = "none";
  // document.getElementById("otpCheckout").value = "";
  // document.getElementById("otpCheckout").disabled = false;
  // document.getElementById("otpStatusCheckout").textContent = "";
  // document.getElementById("btnSendCodeCheckout").disabled = false;
  // document.getElementById("btnSendCodeCheckout").textContent = "Enviar código";
  lastFetchedPhone = "";
  goToMenu();
  updateUI();
}

// ===== PAYMENT: SHOW TROCO FIELD =====
document.querySelectorAll('input[name="pagamento"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const trocoGroup = document.getElementById("trocoGroup");
    trocoGroup.style.display = e.target.value === "dinheiro" ? "block" : "none";
  });
});

// ===== PHONE MASK =====
document.getElementById("telefone").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 6) {
    v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  } else if (v.length > 2) {
    v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  } else if (v.length > 0) {
    v = `(${v}`;
  }
  e.target.value = v;

  // Auto-check session for this phone
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 10 && hasValidSession(digits)) {
    // otpVerified.checkout = true;
    // document.getElementById("otpGroupCheckout").style.display = "block";
    // document.getElementById("otpStatusCheckout").textContent =
    //   "✅ Telefone já verificado";
    // document.getElementById("otpStatusCheckout").className =
    //   "otp-status otp-ok";
    // document.getElementById("otpCheckout").disabled = true;
    // document.getElementById("btnSendCodeCheckout").style.display = "none";
    fetchCustomerData(digits);
  } else {
    // otpVerified.checkout = false;
    // document.getElementById("otpGroupCheckout").style.display = "none";
    // document.getElementById("otpStatusCheckout").textContent = "";
    // document.getElementById("otpCheckout").disabled = false;
    // document.getElementById("btnSendCodeCheckout").style.display = "";
  }
});

// ===== AUTO-FILL CUSTOMER DATA =====
let lastFetchedPhone = "";

async function fetchCustomerData(phoneDigits) {
  if (phoneDigits === lastFetchedPhone) return;
  lastFetchedPhone = phoneDigits;

  const token = localStorage.getItem("pzz_session_token") || "";

  try {
    const res = await fetch(`${API_URL}/cliente/dados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: phoneDigits, session_token: token }),
    });

    const data = await res.json();
    if (!res.ok || !data.encontrado) return;

    // Preencher apenas campos vazios (não sobrescrever o que o usuário já digitou)
    const fields = {
      nome: "nome",
      rua: "rua",
      numero: "numero",
      complemento: "complemento",
      bairro: "bairro",
    };
    for (const [key, id] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el && !el.value.trim()) {
        el.value = data[key] || "";
      }
    }
  } catch {
    // Silencioso - não é crítico
  }
}

// ===== HELPERS =====
function formatPrice(value) {
  return value.toFixed(2).replace(".", ",");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateUI() {
  renderProducts();
  renderCart();
}

// ===== TRACKING =====
const STATUS_LABELS = {
  pendente: { label: "Pendente", icon: "🕐", color: "#f59e0b" },
  preparando: { label: "Preparando", icon: "👨‍🍳", color: "#3b82f6" },
  saiu_para_entrega: {
    label: "Saiu para entrega",
    icon: "🛵",
    color: "#8b5cf6",
  },
  entregue: { label: "Entregue", icon: "✅", color: "#10b981" },
  cancelado: { label: "Cancelado", icon: "❌", color: "#ef4444" },
};

const STATUS_STEPS = [
  "pendente",
  "preparando",
  "saiu_para_entrega",
  "entregue",
];

function goToTracking() {
  closeCart();
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("trackingPage").classList.add("active");

  // Reset OTP UI
  // document.getElementById("otpGroupTrack").style.display = "none";
  // document.getElementById("otpTrack").value = "";
  // document.getElementById("otpTrack").disabled = false;
  // document.getElementById("otpStatusTrack").textContent = "";
  // document.getElementById("btnSendCodeTrack").disabled = false;
  // document.getElementById("btnSendCodeTrack").textContent = "Enviar código";
  document.getElementById("trackingResults").innerHTML = "";

  // Se tem token salvo, pula verificação
  const token = localStorage.getItem("pzz_session_token");
  const saved = localStorage.getItem("pzz_telefone");

  if (token && saved) {
    document.getElementById("trackPhone").value = saved;
    // otpVerified.track = true;
    searchOrders();
  } else {
    // otpVerified.track = false;
    if (saved) {
      document.getElementById("trackPhone").value = saved;
    }
  }
  window.scrollTo(0, 0);
}

// ===== WHATSAPP INTEGRATION =====
function formatOrderMessage(order) {
  const items = order.items
    .map(
      (item) => `${item.qty}x ${item.name} - R$ ${formatPrice(item.subtotal)}`,
    )
    .join("\n");

  const address = `${order.customer.rua}, ${order.customer.numero}${
    order.customer.complemento ? " " + order.customer.complemento : ""
  } - ${order.customer.bairro}`;

  const message = `*Novo Pedido PZZ*

*Cliente:*
${order.customer.nome}
${order.customer.telefone}

*Endereço:*
${address}

*Itens do Pedido:*
${items}

*Total: R$ ${formatPrice(order.total)}*
*Pagamento: ${order.pagamento}*${
    order.troco ? `\n*Troco: R$ ${order.troco}*` : ""
  }`;

  return message;
}

function sendOrderToWhatsApp(order) {
  const message = formatOrderMessage(order);
  const encodedMessage = encodeURIComponent(message);
  const companyNumber = "5585987526252"; // Número da empresa
  const whatsappLink = `https://wa.me/${companyNumber}?text=${encodedMessage}`;

  // Abrir WhatsApp em nova aba/janela
  window.open(whatsappLink, "_blank");
}

async function searchOrders() {
  const phone = document.getElementById("trackPhone").value.trim();
  if (!phone) {
    alert("Digite seu telefone");
    return;
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    alert("Telefone inválido");
    return;
  }

  // if (!otpVerified.track) {
  //   alert("Verifique seu telefone com o código antes de buscar");
  //   return;
  // }

  const sessionToken = localStorage.getItem("pzz_session_token") || "";

  const container = document.getElementById("trackingResults");
  container.innerHTML = '<p class="tracking-loading">Buscando pedidos...</p>';

  try {
    const res = await fetch(`${API_URL}/pedidos/consulta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: digits,
        // codigo_otp: otpCode,
        session_token: sessionToken,
      }),
    });
    const pedidos = await res.json();

    if (!res.ok) {
      // Token expirado — limpar e pedir verificação
      if (sessionToken) {
        localStorage.removeItem("pzz_session_token");
        // otpVerified.track = false;
        container.innerHTML =
          '<p class="tracking-empty">Sessão expirada. Verifique seu telefone novamente.</p>';
      } else {
        container.innerHTML = `<p class="tracking-empty">${pedidos.erro || "Erro ao buscar"}</p>`;
      }
      return;
    }

    if (pedidos.length === 0) {
      container.innerHTML =
        '<p class="tracking-empty">Nenhum pedido encontrado para esse telefone.</p>';
      return;
    }

    // Salvar telefone para consultas futuras
    localStorage.setItem("pzz_telefone", phone);

    container.innerHTML = pedidos
      .map((p) => {
        const st = STATUS_LABELS[p.status] || STATUS_LABELS.pendente;
        const stepIndex = STATUS_STEPS.indexOf(p.status);
        const isCanceled = p.status === "cancelado";

        const progressBar = isCanceled
          ? `<div class="progress-canceled">Pedido cancelado</div>`
          : `<div class="progress-bar" style="--progress: ${stepIndex <= 0 ? 0 : (stepIndex / (STATUS_STEPS.length - 1)) * 100}%">
              ${STATUS_STEPS.map((s, i) => {
                const info = STATUS_LABELS[s];
                const done = i <= stepIndex;
                return `<div class="progress-step ${done ? "done" : ""}">
                  <div class="step-dot">${done ? info.icon : ""}</div>
                  <span class="step-label">${info.label}</span>
                </div>`;
              }).join("")}
            </div>`;

        const data = new Date(p.criado_em + "Z").toLocaleString("pt-BR");

        return `
        <div class="tracking-card">
          <div class="tracking-card-header">
            <div>
              <strong>Pedido #${p.id}</strong>
              <span class="tracking-date">${data}</span>
            </div>
            <span class="status-badge" style="background: ${st.color}">${st.icon} ${st.label}</span>
          </div>
          ${progressBar}
          <div class="tracking-items">
            ${p.itens.map((i) => `<span class="tracking-item">${i.quantidade}x ${escapeHtml(i.nome)}</span>`).join("")}
          </div>
          <div class="tracking-total">Total: <strong>R$ ${formatPrice(p.total)}</strong></div>
        </div>`;
      })
      .join("");
  } catch (e) {
    console.error(e);
    container.innerHTML =
      '<p class="tracking-empty">Erro ao conectar com o servidor.</p>';
  }
}

// Máscara no telefone de tracking
document.getElementById("trackPhone").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 6) {
    v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  } else if (v.length > 2) {
    v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  } else if (v.length > 0) {
    v = `(${v}`;
  }
  e.target.value = v;

  // Auto-check session for this phone
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 10 && hasValidSession(digits)) {
    // otpVerified.track = true;
    // document.getElementById("otpGroupTrack").style.display = "block";
    // document.getElementById("otpStatusTrack").textContent =
    //   "✅ Telefone já verificado";
    // document.getElementById("otpStatusTrack").className = "otp-status otp-ok";
    // document.getElementById("otpTrack").disabled = true;
    // document.getElementById("btnSendCodeTrack").style.display = "none";
  } else {
    // otpVerified.track = false;
    // document.getElementById("otpGroupTrack").style.display = "none";
    // document.getElementById("otpStatusTrack").textContent = "";
    // document.getElementById("otpTrack").disabled = false;
    // document.getElementById("btnSendCodeTrack").style.display = "";
  }
});

function saveCustomerToCache(data) {
  localStorage.setItem("pzz_customer", JSON.stringify(data));
}

function getCustomerFromCache() {
  const data = localStorage.getItem("pzz_customer");
  return data ? JSON.parse(data) : null;
}

function loadCustomerFromCache() {
  const data = getCustomerFromCache();
  if (!data) return;

  const fields = ["nome", "telefone", "rua", "numero", "complemento", "bairro"];

  fields.forEach((field) => {
    const el = document.getElementById(field);
    if (el && !el.value) {
      el.value = data[field] || "";
    }
  });
}

// Enter para buscar
document.getElementById("trackPhone").addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchOrders();
});

// ===== INIT =====
renderProducts();
renderCart();
loadCustomerFromCache();
