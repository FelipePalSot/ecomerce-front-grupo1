/* =========================================================================
  assets/js/carrito.js
  Funciones:
  - Recalcula subtotales por ítem y resumen (Subtotal, Envío, Total)
  - Botón "Refrescar carrito"
  - Recalcula al modificar cantidades
  - Quitar ítems del carrito
  - Estado de carrito vacío
  - Live region (accesibilidad)
  - Persistencia simple de cantidades en localStorage
=========================================================================== */

(() => {
  // ---------- Formateador de moneda PEN ----------
  const PEN = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
  const formatPEN = (n) => {
    const num = typeof n === 'number' ? n : parseFloat(n || 0);
    return PEN.format(isFinite(num) ? Math.round(num * 100) / 100 : 0);
  };

  // ---------- Selectores base (coinciden con tu HTML) ----------
  const itemsSelector      = '.cart-item';
  const priceSelector      = '.cart-item-price';
  const qtySelector        = 'input[type="number"]';
  const subtotalSelector   = '.cart-item-subtotal';
  const removeBtnSelector  = '.cart-item-remove';
  const emptyMsgSelector   = '.cart-empty';
  const summarySubtotalEl  = document.getElementById('summary-subtotal');
  const summaryShippingEl  = document.getElementById('summary-shipping');
  const summaryTotalEl     = document.getElementById('summary-total');
  const refreshBtn         = document.getElementById('refresh-cart');
  const liveRegion         = document.getElementById('cart-live');

  // ---------- Helpers ----------
  // Lee números desde data-* (data-price, data-shipping) o desde texto ("S/ 12.34")
  const getNumeric = (el) => {
    if (!el) return 0;
    const dataVal = el.getAttribute('data-price') ?? el.getAttribute('data-shipping');
    if (dataVal != null && dataVal !== '' && !isNaN(parseFloat(dataVal))) {
      return parseFloat(dataVal);
    }
    const txt = (el.textContent || '').replace(/\s+/g, '');
    const num = parseFloat(txt.replace(',', '.').replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const clampQty = (val) => {
    let n = parseInt(val, 10);
    if (isNaN(n) || n < 1) n = 1;
    return n;
  };

  // Persistencia simple de cantidades (por id del input)
  const STORAGE_KEY = 'lp_cart_qty';
  const loadQtyState = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  };
  const saveQtyState = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  };
  const setQtyInState = (inputId, qty) => {
    if (!inputId) return;
    const st = loadQtyState();
    st[inputId] = qty;
    saveQtyState(st);
  };
  const deleteQtyInState = (inputId) => {
    if (!inputId) return;
    const st = loadQtyState();
    delete st[inputId];
    saveQtyState(st);
  };
  const restoreQuantitiesFromState = () => {
    const st = loadQtyState();
    Object.entries(st).forEach(([id, qty]) => {
      const el = document.getElementById(id);
      if (el && el.matches(qtySelector)) {
        el.value = clampQty(qty);
      }
    });
  };

  // Anuncia cambios del total para accesibilidad
  const announce = (msg) => {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = msg; }, 25);
  };

  // ---------- Cálculos ----------
  const recalcItem = (itemEl) => {
    const priceEl = itemEl.querySelector(priceSelector);
    const qtyEl   = itemEl.querySelector(qtySelector);
    const subEl   = itemEl.querySelector(subtotalSelector);

    const unit = getNumeric(priceEl);
    const qty  = clampQty(qtyEl?.value ?? 1);
    if (qtyEl) qtyEl.value = qty;

    const sub = unit * qty;
    if (subEl) subEl.textContent = formatPEN(sub);
    return sub;
  };

  const getItems = () => Array.from(document.querySelectorAll(itemsSelector));

  const updateEmptyState = () => {
    const items = getItems();
    const emptyMsg = document.querySelector(emptyMsgSelector);
    const summary  = summarySubtotalEl?.closest('.cart-summary');
    const hasItems = items.length > 0;

    if (emptyMsg) emptyMsg.hidden = hasItems;
    if (summary)  summary.style.display = hasItems ? '' : 'none';
  };

  const recalcSummary = () => {
    const items = getItems();
    let subtotal = 0;
    items.forEach((it) => { subtotal += recalcItem(it); });

    // Envío: usa data-shipping si existe, o parsea texto
    const shipping = getNumeric(summaryShippingEl);

    if (summarySubtotalEl) summarySubtotalEl.textContent = formatPEN(subtotal);
    if (summaryTotalEl)    summaryTotalEl.textContent    = formatPEN(subtotal + shipping);

    announce(`Total actualizado: ${formatPEN(subtotal + shipping)}`);
  };

  // Recalcula todo el carrito
  const refreshCart = () => {
    recalcSummary();
    updateEmptyState();
  };

  // ---------- Listeners ----------
  // Botón Refrescar
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshCart);
  }

  // Cambios de cantidad (con guardado)
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t && t.matches(`${itemsSelector} ${qtySelector}`)) {
      t.value = clampQty(t.value);
      setQtyInState(t.id, t.value);
      refreshCart();
    }
  });

  // Quitar ítem
  document.addEventListener('click', (e) => {
    const btn = e.target?.closest(removeBtnSelector);
    if (!btn) return;

    const item = btn.closest(itemsSelector);
    if (!item) return;

    const qtyEl = item.querySelector(qtySelector);
    if (qtyEl?.id) deleteQtyInState(qtyEl.id);

    item.remove();
    refreshCart();
  });

  // ---------- Inicio ----------
  restoreQuantitiesFromState(); // 1) Restaura cantidades guardadas
  refreshCart();                // 2) Calcula valores iniciales

  // ---------- (Opcional) Envío gratis por umbral ----------
  // const FREE_SHIPPING_THRESHOLD = 199; // ejemplo
  // En recalcSummary(), en lugar de "const shipping = getNumeric(summaryShippingEl);"
  // usa:
  // const rawShipping = getNumeric(summaryShippingEl);
  // const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : rawShipping;
})();

