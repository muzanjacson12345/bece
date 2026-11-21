(() => {
  "use strict";

  const App = window.App;
  const firebaseApi = window.firebase;
  const host = document.getElementById("gems-body");
  if (!App || !firebaseApi || !host) return;

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const button = (label, handler, secondary = false) => {
    const node = make("button", secondary ? "btn btn-ghost" : "btn btn-primary", label);
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  };
  const signedInUser = () => firebaseApi.auth && firebaseApi.auth().currentUser;
  const formatGems = value => Number.isSafeInteger(value) ? value.toLocaleString() : "—";
  const formatDate = value => {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "Date unavailable";
    const date = new Date(timestamp);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date unavailable";
  };
  const titleFor = record => {
    const titles = {
      achievement_reward: "Achievement reward",
      event_reward: "Gem event prize",
      owner_adjustment: "Owner adjustment",
      marketplace_purchase: "Gem Shop purchase"
    };
    return titles[record.kind] || (record.action === "spend" ? "Gem spending" : "Gem transaction");
  };
  let loading = false;

  function showMessage(title, copy, actionLabel, action) {
    host.replaceChildren();
    const card = make("section", "card");
    card.append(make("h2", "", title), make("p", "muted", copy));
    if (actionLabel && action) card.append(button(actionLabel, action));
    host.append(card);
  }

  function renderHistory(records) {
    if (!records.length) {
      const empty = make("section", "card");
      empty.append(
        make("h3", "", "No Gem activity yet"),
        make("p", "muted", "When you unlock an achievement for the first time or earn an event prize, the transaction will appear here.")
      );
      host.append(empty);
      return;
    }

    const list = make("div", "stack");
    for (const record of records) {
      const amount = Number(record.amount);
      if (!Number.isSafeInteger(amount) || amount < 0) continue;
      const debit = record.direction === "debit" || record.action === "spend";
      const signedAmount = (debit ? "−" : "+") + formatGems(amount) + " Gems";
      const row = make("article", "card");
      const top = make("div", "row-between");
      top.append(make("strong", "", titleFor(record)), make("strong", debit ? "muted" : "good", signedAmount));
      row.append(top);

      if (record.description) row.append(make("p", "muted", record.description));
      else if (Array.isArray(record.achievementIds) && record.achievementIds.length) {
        row.append(make("p", "muted", record.achievementIds.length + " first-time achievement unlock(s)"));
      } else if (Number.isSafeInteger(record.rank)) {
        row.append(make("p", "muted", "Finished in position " + record.rank));
      }

      const details = [];
      details.push(formatDate(record.createdAt));
      const balanceAfter = Number(record.balanceAfter ?? record.balance);
      if (Number.isSafeInteger(balanceAfter) && balanceAfter >= 0) {
        details.push("Balance after: " + formatGems(balanceAfter));
      }
      row.append(make("p", "adm-sub", details.join(" · ")));
      list.append(row);
    }
    host.append(list);
  }

  async function renderGems() {
    if (loading) return;
    const user = signedInUser();
    if (!user) {
      showMessage(
        "Your Gem wallet",
        "Sign in to view your Gem balance and transaction history.",
        "Sign in",
        () => App.navigate("friends")
      );
      return;
    }

    loading = true;
    showMessage("Your Gem wallet", "Loading your balance and recent activity…");
    try {
      const db = firebaseApi.firestore();
      const [playerSnapshot, historySnapshot] = await Promise.all([
        db.collection("players").doc(user.uid).get(),
        db.collection("gemTransactions")
          .where("uid", "==", user.uid)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get()
      ]);
      if (!playerSnapshot || !playerSnapshot.exists) {
        throw new Error("Your player profile is not ready yet.");
      }

      const rawBalance = playerSnapshot.data().gems;
      const balance = rawBalance === undefined ? 0 : Number(rawBalance);
      const validBalance = Number.isSafeInteger(balance) && balance >= 0;

      host.replaceChildren();
      const summary = make("section", "card");
      summary.append(
        make("p", "eyebrow", "Your special currency"),
        make("h2", "", validBalance ? formatGems(balance) + " Gems" : "Balance unavailable"),
        make("p", "muted", "Gems are awarded for first-time achievement unlocks and eligible event prizes. Event entries and retries use Coins, not Gems.")
      );
      const actions = make("div", "button-row");
      actions.append(
        button("Refresh", () => renderGems(), true),
        button("Browse Gem events", () => App.navigate("events"))
      );
      summary.append(actions);
      host.append(summary);

      const heading = make("div", "page-intro");
      heading.append(
        make("h2", "", "Recent Gem activity"),
        make("p", "muted", "Your 50 most recent Gem transactions. Only you and the Owner can read your private transaction records.")
      );
      host.append(heading);

      const records = historySnapshot.docs
        .map(doc => ({ ...doc.data(), transactionId: doc.id }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      renderHistory(records);
    } catch (error) {
      showMessage(
        "Gem history is unavailable",
        (error && error.message) || "Please check your connection and try again.",
        "Try again",
        () => renderGems()
      );
    } finally {
      loading = false;
    }
  }

  window.renderGems = renderGems;
  if (App.screen === "gems") renderGems();
})();
