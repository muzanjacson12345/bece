(() => {
  "use strict";

  const App = window.App;
  const firebaseApi = () => window.firebase;
  const host = document.getElementById("gem-marketplace-body");
  if (!App || !host) return;

  const meta = document.querySelector('meta[name="bece-gems-api"]');
  let apiBase = meta && meta.content ? meta.content.trim() : "";
  if (apiBase.endsWith("/gems")) apiBase = apiBase.slice(0, -5);
  while (apiBase.endsWith("/")) apiBase = apiBase.slice(0, -1);

  const make = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const button = (label, handler, secondary = false) => {
    const node = make("button", secondary ? "btn btn-ghost" : "btn btn-primary", label);
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  };
  const user = () => {
    const fb = firebaseApi();
    return fb && fb.auth ? fb.auth().currentUser : null;
  };
  const format = value => Number.isSafeInteger(value) ? value.toLocaleString() : "—";
  const state = { loading: false, busy: false, catalog: [], player: {}, inventory: {}, equipped: {} };

  function installCosmeticStyles() {
    if (!document.getElementById("gem-marketplace-styles")) {
      const style = document.createElement("style");
      style.id = "gem-marketplace-styles";
      style.textContent = [
        '.gem-frame-preview{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2,#eef2f8);font-size:20px}',
        '.gem-frame-preview.sapphire{border:3px solid #3988e8;box-shadow:0 0 0 2px #3988e833}',
        '.gem-frame-preview.royal{border:3px solid #9b68df;box-shadow:0 0 0 2px #9b68df33}',
        '.gem-frame-preview.aurora{border:3px solid #31b9a5;box-shadow:0 0 0 2px #31b9a533}',
        '.gem-market-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}',
        '.gem-market-item{display:flex;flex-direction:column;gap:10px}',
        '.gem-market-item .gem-market-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto}',
        '.gem-market-item p{margin:0}',
        '.gem-market-balance{font-size:1.25rem;font-weight:800}'
      ].join("");
      document.head.append(style);
    }
    delete document.documentElement.dataset.gemFrame;
  }

  function showMessage(title, copy, retry) {
    host.replaceChildren();
    const card = make("section", "card");
    card.append(make("h2", "", title), make("p", "muted", copy));
    if (retry) card.append(button("Try again", retry));
    host.append(card);
  }

  async function callWorker(path, payload = {}) {
    if (!apiBase) throw new Error("The secure Gem service is not configured.");
    const currentUser = user();
    if (!currentUser) throw new Error("Please sign in before using the Gem Marketplace.");
    const token = await currentUser.getIdToken();
    const response = await fetch(apiBase + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify(payload)
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("The secure Gem service returned an unreadable response."); }
    if (!response.ok || !data || !data.ok) {
      if (data && data.code === "USER_BANNED") throw new Error("This account cannot use purchases while banned.");
      throw new Error(data && data.error ? data.error : "The Gem Marketplace could not complete that request.");
    }
    return data;
  }

  async function loadState() {
    const currentUser = user();
    if (!currentUser) throw new Error("Please sign in to use the Gem Marketplace.");
    const fb = firebaseApi();
    if (!fb || !fb.firestore) throw new Error("The BECE Hub account service is still connecting. Please try again.");
    const db = fb.firestore();
    const [catalogResponse, playerSnapshot, inventorySnapshot, itemsSnapshot] = await Promise.all([
      callWorker("/gem-shop/catalog"),
      db.collection("players").doc(currentUser.uid).get(),
      db.collection("gemInventories").doc(currentUser.uid).get(),
      db.collection("gemInventories").doc(currentUser.uid).collection("items").get()
    ]);
    if (!playerSnapshot || !playerSnapshot.exists) throw new Error("Your player profile is not ready yet.");
    state.catalog = Array.isArray(catalogResponse.catalog) ? catalogResponse.catalog : [];
    state.player = playerSnapshot.data() || {};
    state.equipped = inventorySnapshot && inventorySnapshot.exists
      ? ((inventorySnapshot.data() || {}).equipped || {}) : {};
    state.inventory = {};
    itemsSnapshot.docs.forEach(doc => { state.inventory[doc.id] = doc.data() || {}; });
    installCosmeticStyles();
  }

  function itemCard(item) {
    const card = make("article", "card gem-market-item");
    const head = make("div", "row-between");
    const name = make("h3", "", item.name);
    const price = make("strong", "gem-market-balance", "💎 " + format(item.price));
    head.append(name, price);
    card.append(head);

    const preview = make("div", "gem-frame-preview " + item.style, "A");
    card.append(preview);
    card.append(make("p", "muted", item.description || ""));

    const bottom = make("div", "gem-market-bottom");
    const owned = state.inventory[item.id] && state.inventory[item.id].owned === true;
    const equipped = state.equipped[item.slot] === item.id;
    if (!owned) {
      const buy = button("Buy for " + format(item.price) + " Gems", () => purchase(item));
      buy.disabled = state.busy || Number(state.player.gems || 0) < item.price;
      bottom.append(buy);
    } else {
      bottom.append(
        make("span", "muted", equipped ? "Equipped" : "Owned"),
        button(equipped ? "Unequip" : "Equip", () => equip(item, !equipped), true)
      );
    }
    card.append(bottom);
    return card;
  }

  function render() {
    host.replaceChildren();
    const top = make("section", "card");
    const balance = Number(state.player.gems);
    top.append(
      make("p", "eyebrow", "Your Gem balance"),
      make("div", "gem-market-balance", Number.isSafeInteger(balance) && balance >= 0 ? "💎 " + format(balance) + " Gems" : "Balance unavailable"),
      make("p", "muted", "Every item is a permanent cosmetic. Buy it once, keep it forever, and equip or unequip it whenever you like.")
    );
    const actions = make("div", "button-row");
    actions.append(
      button("Refresh", () => renderMarketplace(), true),
      button("Gem wallet & history", () => App.navigate("gems"), true)
    );
    top.append(actions);
    host.append(top);

    const cosmetics = state.catalog.filter(item => item.category === "cosmetic");
  }

  async function renderMarketplace() {
    if (state.loading || state.busy) return;
    state.loading = true;
    showMessage("Gem Marketplace", "Loading the secure catalogue and your inventory…");
    try {
      await loadState();
      render();
    } catch (error) {
      showMessage("Gem Marketplace unavailable", error && error.message ? error.message : "Please check your connection.", () => renderMarketplace());
    } finally {
      state.loading = false;
    }
  }

  async function purchase(item) {
    if (state.busy) return;
    const balance = Number(state.player.gems || 0);
    if (!Number.isSafeInteger(balance) || balance < item.price) {
      App.toast("You do not have enough Gems for this item.", "warn");
      return;
    }
    state.busy = true;
    render();
    try {
      const response = await callWorker("/gem-shop/purchase", {
        itemId: item.id,
        operationId: crypto.randomUUID()
      });
      if (!response.result || !Number.isSafeInteger(response.result.gems) || response.result.gems < 0) {
        throw new Error("The Gem service returned an invalid balance.");
      }
      App.toast("Purchased " + item.name + "!");
      await loadState();
    } catch (error) {
      App.toast("Purchase not completed: " + (error && error.message ? error.message : "Please try again."), "warn");
      try { await loadState(); } catch (_) {}
    } finally {
      state.busy = false;
      render();
    }
  }

  async function equip(item, shouldEquip) {
    if (state.busy) return;
    state.busy = true;
    render();
    try {
      await callWorker("/gem-shop/equip", {
        itemId: item.id,
        equipped: shouldEquip,
        operationId: crypto.randomUUID()
      });
      await loadState();
      App.toast(shouldEquip ? item.name + " equipped." : item.name + " unequipped.");
    } catch (error) {
      App.toast("Could not update that cosmetic: " + (error && error.message ? error.message : "Please try again."), "warn");
      try { await loadState(); } catch (_) {}
    } finally {
      state.busy = false;
      render();
    }
  }

  installCosmeticStyles();
  window.renderGemMarketplace = renderMarketplace;
  App.on("screen", screen => { if (screen === "gem-marketplace") renderMarketplace(); });
  if (App.screen === "gem-marketplace") renderMarketplace();
})();
