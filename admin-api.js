(() => {
  const API_BASE = "https://mavie-catalogo-backend--dumpsss70.replit.app";
  const catalog = document.body.dataset.mavieCatalog || "no-prices";
  const searchOverlay = document.getElementById("searchOverlay");
  const overlaySearch = document.getElementById("overlaySearch");
  const productSearch = document.getElementById("productSearch");
  const emptyState = document.getElementById("emptyState");
  const cards = Array.from(document.querySelectorAll(".product-card"));
  const deletedPages = new Set();
  let adminToken = null;

  function apiUrl(path) {
    return `${API_BASE.replace(/\/$/, "")}${path}`;
  }
  function closeMenu() {
    const trigger = document.getElementById("menuTrigger");
    const menu = document.getElementById("mobileNav");
    menu?.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  }
  function applyProductVisibility() {
    const query = (productSearch?.value || "").trim().toLowerCase();
    let visibleCount = 0;
    cards.forEach((card) => {
      const page = Number(card.dataset.page);
      const searchable = card.textContent?.toLowerCase() || "";
      const visible = !deletedPages.has(page) && (!query || searchable.includes(query));
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount > 0;
  }
  function syncProductCounts() {
      const available = cards.filter((card) => !deletedPages.has(Number(card.dataset.page)));
      document.querySelectorAll(".category-button").forEach((button) => {
        const category = button.dataset.category;
        const count = category === "Todos" ? available.length : available.filter((card) => {
          return card.querySelector(".product-category")?.textContent?.trim() === category;
        }).length;
        const countElement = button.querySelector("span");
        if (countElement) countElement.textContent = String(count).padStart(2, "0");
      });
    }
      function openSearch(value = "") {
    closeMenu();
    if (!searchOverlay) return;
    searchOverlay.classList.add("open");
    searchOverlay.setAttribute("aria-hidden", "false");
    if (overlaySearch) {
      overlaySearch.value = value;
      overlaySearch.focus();
    }
    if (productSearch && value !== productSearch.value) {
      productSearch.value = value;
      productSearch.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function closeSearch() {
    searchOverlay?.classList.remove("open");
    searchOverlay?.setAttribute("aria-hidden", "true");
  }
  function installSearch() {
    document.getElementById("searchTrigger")?.addEventListener("click", () => openSearch(productSearch?.value || ""));
    document.getElementById("closeSearch")?.addEventListener("click", closeSearch);
    searchOverlay?.addEventListener("click", (event) => {
      if (event.target === searchOverlay) closeSearch();
    });
    overlaySearch?.addEventListener("input", () => {
      if (!productSearch) return;
      productSearch.value = overlaySearch.value;
      productSearch.dispatchEvent(new Event("input", { bubbles: true }));
    });
    productSearch?.addEventListener("input", applyProductVisibility);
    applyProductVisibility();
  }
  function adminMarkup() {
    document.body.insertAdjacentHTML("beforeend", `<div class="admin-overlay" id="adminOverlay" aria-hidden="true">
      <div class="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="adminTitle">
        <button class="dialog-close" id="closeAdmin" type="button" aria-label="Cerrar administrador">×</button>
        <div class="admin-content" id="adminContent"></div>
      </div>
    </div>`);
  }
  function showAdminError(message) {
    const error = document.getElementById("adminError");
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  }
  function openAdmin() {
    closeMenu();
    const overlay = document.getElementById("adminOverlay");
    if (!overlay) return;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    if (adminToken) renderAdminProducts();
    else renderAdminLogin();
  }
  function closeAdmin() {
    const overlay = document.getElementById("adminOverlay");
    overlay?.classList.remove("open");
    overlay?.setAttribute("aria-hidden", "true");
  }
  function renderAdminLogin() {
    const content = document.getElementById("adminContent");
    if (!content) return;
    content.innerHTML = `<p class="kicker">MAVIE BEAUTY</p><h2 id="adminTitle">Administrador</h2>
      <p class="admin-copy">Ingresa la contraseña para administrar los productos de este catálogo.</p>
      <form id="adminLoginForm" class="admin-form"><label for="adminPassword">Contraseña</label>
        <input id="adminPassword" type="password" autocomplete="current-password" required>
        <p class="admin-error" id="adminError" hidden></p>
        <button class="primary-button" type="submit">Continuar <span aria-hidden="true">↗</span></button>
      </form>`;
    document.getElementById("adminPassword")?.focus();
    document.getElementById("adminLoginForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("adminPassword");
      const submit = event.currentTarget.querySelector("button");
      if (!(input instanceof HTMLInputElement) || !(submit instanceof HTMLButtonElement)) return;
      submit.disabled = true;
      try {
        const response = await fetch(apiUrl("/api/mavie/admin/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalog, password: input.value }),
        });
        if (!response.ok) {
          showAdminError(response.status === 401 ? "Contraseña incorrecta." : "No se pudo conectar con el administrador.");
          return;
        }
        const data = await response.json();
        adminToken = data.token;
        renderAdminProducts();
      } catch {
        showAdminError("No se pudo conectar con el administrador.");
      } finally {
        submit.disabled = false;
      }
    });
  }
  function renderAdminProducts() {
      const content = document.getElementById("adminContent");
      if (!content) return;
      const available = cards.filter((card) => !deletedPages.has(Number(card.dataset.page)));
      const deleted = cards.filter((card) => deletedPages.has(Number(card.dataset.page)));
      const renderRows = (items, attribute, label) => items.map((card) => {
        const page = Number(card.dataset.page);
        const title = card.querySelector("h3")?.textContent?.trim() || "Producto";
        return `<div class="admin-product-row"><span><small>${String(page).padStart(2, "0")}</small>${title}</span>
          <button type="button" data-admin-${attribute}="${page}">${label}</button></div>`;
      }).join("");
      content.innerHTML = `<p class="kicker">MAVIE BEAUTY</p><h2 id="adminTitle">Productos</h2>
        <p class="admin-copy">${available.length} productos visibles en este catálogo.</p>
        <div class="admin-product-section-label">Productos visibles</div>
        <div class="admin-product-list">${available.length ? renderRows(available, "delete", "Eliminar") : '<p class="admin-copy">No hay productos disponibles en este catálogo.</p>'}</div>
        <div class="admin-product-section-label">Productos eliminados</div>
        <div class="admin-product-list">${deleted.length ? renderRows(deleted, "restore", "Volver a poner") : '<p class="admin-copy">No hay productos eliminados.</p>'}</div>`;
      content.querySelectorAll("[data-admin-delete]").forEach((button) => {
        button.addEventListener("click", () => deleteProduct(Number(button.dataset.adminDelete)));
      });
      content.querySelectorAll("[data-admin-restore]").forEach((button) => {
        button.addEventListener("click", () => restoreProduct(Number(button.dataset.adminRestore)));
      });
    }
      async function deleteProduct(page) {
    const title = cards.find((card) => Number(card.dataset.page) === page)?.querySelector("h3")?.textContent?.trim();
    if (!window.confirm(`¿Eliminar "${title || "este producto"}" de este catálogo?`)) return;
    const button = document.querySelector(`[data-admin-delete="${page}"]`);
    if (button instanceof HTMLButtonElement) button.disabled = true;
    try {
      const response = await fetch(apiUrl(`/api/mavie/catalogs/${catalog}/products/${page}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (response.status === 401) {
        adminToken = null;
        renderAdminLogin();
        showAdminError("La sesión expiró. Ingresa la contraseña nuevamente.");
        return;
      }
      if (!response.ok) {
        showAdminError("No se pudo eliminar el producto.");
        return;
      }
      deletedPages.add(page);
      syncProductCounts();
      applyProductVisibility();
      renderAdminProducts();
    } catch {
      showAdminError("No se pudo conectar con el administrador.");
    }
  }
  async function restoreProduct(page) {
      const title = cards.find((card) => Number(card.dataset.page) === page)?.querySelector("h3")?.textContent?.trim();
      const button = document.querySelector(`[data-admin-restore="${page}"]`);
      if (button instanceof HTMLButtonElement) button.disabled = true;
      try {
        const response = await fetch(apiUrl(`/api/mavie/catalogs/${catalog}/products/${page}/restore`), {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (response.status === 401) {
          adminToken = null;
          renderAdminLogin();
          showAdminError("La sesión expiró. Ingresa la contraseña nuevamente.");
          return;
        }
        if (!response.ok) {
          showAdminError("No se pudo volver a poner el producto.");
          return;
        }
        deletedPages.delete(page);
        syncProductCounts();
        applyProductVisibility();
        renderAdminProducts();
      } catch {
        showAdminError("No se pudo conectar con el administrador.");
      }
    }
      async function loadDeletedProducts() {
    try {
      const response = await fetch(apiUrl(`/api/mavie/deleted?catalog=${encodeURIComponent(catalog)}`), { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog state unavailable");
      const data = await response.json();
      (data.deletedPages || []).forEach((page) => deletedPages.add(Number(page)));
      syncProductCounts();
      applyProductVisibility();
    } catch (error) {
      console.error("No se pudo cargar el estado del catálogo.", error);
    }
  }
  function watchCatalogChanges() {
      if (typeof EventSource === "undefined") return;
      const events = new EventSource(apiUrl(`/api/mavie/events?catalog=${encodeURIComponent(catalog)}`));
      events.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.catalog === catalog) {
            if (data.action === "restored" || data.deleted === false) deletedPages.delete(Number(data.page));
            else deletedPages.add(Number(data.page));
            syncProductCounts();
            applyProductVisibility();
            if (adminToken) renderAdminProducts();
          }
        } catch {}
      };
    }
      function installMenu() {
    const trigger = document.getElementById("menuTrigger");
    const menu = document.getElementById("mobileNav");
    trigger?.addEventListener("click", () => {
      const open = !menu?.classList.contains("open");
      menu?.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    });
    menu?.addEventListener("click", (event) => {
      const action = event.target.closest("[data-menu-action]")?.dataset.menuAction;
      if (action === "search") openSearch(productSearch?.value || "");
      if (action === "admin") openAdmin();
    });
    document.addEventListener("click", (event) => {
      if (menu?.classList.contains("open") && !event.target.closest(".site-header")) closeMenu();
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    adminMarkup();
    document.getElementById("closeAdmin")?.addEventListener("click", closeAdmin);
    document.getElementById("adminOverlay")?.addEventListener("click", (event) => {
      if (event.target.id === "adminOverlay") closeAdmin();
    });
    installMenu();
    installSearch();
    loadDeletedProducts();
    watchCatalogChanges();
  });
})();