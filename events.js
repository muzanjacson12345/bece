(() => {
  "use strict";

  const App = window.App;
  const firebaseApi = window.firebase;
  const host = document.getElementById("events-body");
  if (!App || !firebaseApi || !host) return;

  const meta = document.querySelector('meta[name="bece-gems-api"]');
  const gemsUrl = meta && meta.content ? meta.content.trim() : "";
  let apiBase = gemsUrl;
  if (apiBase.endsWith("/gems")) apiBase = apiBase.slice(0, -5);
  while (apiBase.endsWith("/")) apiBase = apiBase.slice(0, -1);

  const state = {
    loading: false,
    events: [],
    coins: null,
    screen: "list",
    event: null,
    attemptId: null,
    pendingAnswer: null,
    locked: false
  };

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const actionButton = (label, handler, secondary = false) => {
    const button = make("button", secondary ? "btn btn-ghost" : "btn btn-primary", label);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  };
  const toast = (message, tone = "info") => {
    if (typeof App.toast === "function") App.toast(message, tone);
  };
  const signedInUser = () => firebaseApi.auth && firebaseApi.auth().currentUser;
  const database = () => firebaseApi.firestore();
  const id = () => crypto.randomUUID();
  const formatCoins = value => Number.isSafeInteger(value) ? value.toLocaleString() : "—";
  const formatTime = value => {
    if (!Number.isSafeInteger(value) || value <= 0) return "Not scheduled";
    return new Date(value).toLocaleString();
  };

  async function callWorker(pathname, payload) {
    if (!apiBase) throw new Error("The secure event service is not configured.");
    const user = signedInUser();
    if (!user) throw new Error("Please sign in to use events.");
    const token = await user.getIdToken();
    const response = await fetch(apiBase + pathname, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await response.json(); }
    catch { throw new Error("The event service returned an unreadable response."); }
    if (!response.ok || !data || !data.ok) {
      if (response.status === 401) throw new Error("Please sign in again.");
      throw new Error(data && data.error ? data.error : "The event request could not be completed.");
    }
    return data;
  }

  function showMessage(title, copy, buttonLabel, handler) {
    host.replaceChildren();
    const card = make("div", "card");
    card.append(make("h2", "", title), make("p", "muted", copy));
    if (buttonLabel && handler) card.append(actionButton(buttonLabel, handler));
    host.append(card);
  }

  function renderLoading(message = "Loading events…") {
    showMessage("Gem events", message);
  }

  async function loadEventCards() {
    if (state.loading) return;
    const user = signedInUser();
    if (!user) {
      showMessage("Gem events", "Sign in to see events, enter with Coins and take part in the leaderboard.", "Open sign-in", () => App.navigate("friends"));
      return;
    }
    state.loading = true;
    renderLoading();
    try {
      const db = database();
      const [eventSnapshot, playerSnapshot] = await Promise.all([
        db.collection("gemEvents").where("status", "==", "active").limit(100).get(),
        db.collection("players").doc(user.uid).get().catch(() => null)
      ]);
      const now = Date.now();
      const events = eventSnapshot.docs
        // Keep closed events visible so players can finish paid attempts and
        // inspect final leaderboards. The Worker blocks new paid entries/retries.
        .map(doc => ({ ...doc.data(), eventId: doc.id }))
        .sort((a, b) => {
          const at = Number.isSafeInteger(a.opensAt) ? a.opensAt : 0;
          const bt = Number.isSafeInteger(b.opensAt) ? b.opensAt : 0;
          return at - bt;
        });
      state.coins = playerSnapshot && playerSnapshot.exists
        ? Number(playerSnapshot.data().coins) : null;

      const enriched = await Promise.all(events.map(async event => {
        try {
          const participantRef = db.collection("gemEvents").doc(event.eventId)
            .collection("participants").doc(user.uid);
          const participantSnapshot = await participantRef.get();
          const participant = participantSnapshot.exists ? participantSnapshot.data() : null;
          let attempt = null;
          if (participant && participant.lastAttemptId) {
            const attemptSnapshot = await participantRef.collection("attempts")
              .doc(participant.lastAttemptId).get();
            if (attemptSnapshot.exists) attempt = { ...attemptSnapshot.data(), attemptId: attemptSnapshot.id };
          }
          return { ...event, participant, attempt };
        } catch {
          return { ...event, participant: null, attempt: null };
        }
      }));
      state.events = enriched;
      renderEventCards();
    } catch (error) {
      showMessage("Could not load events", (error && error.message) || "Check your connection and try again.", "Try again", loadEventCards);
    } finally {
      state.loading = false;
    }
  }

  function renderEventCards() {
    host.replaceChildren();
    state.screen = "list";
    state.event = null;
    state.attemptId = null;
    const intro = make("div", "page-intro");
    intro.append(
      make("p", "eyebrow", "Spend Coins to enter"),
      make("h2", "", "Available Gem events"),
      make("p", "muted", "Every event has its own entry price, entry allowance and retry rules. Paying an entry or retry fee does not itself award Gems.")
    );
    host.append(intro);
    if (state.coins !== null) {
      host.append(make("p", "muted", "Your balance: " + formatCoins(state.coins) + " Coins"));
    }
    if (!state.events.length) {
      host.append(make("div", "card", "There are no open events right now. Check again later."));
      return;
    }
    const list = make("div", "stack");
    for (const event of state.events) list.append(makeEventCard(event));
    host.append(list);
  }

  function makeEventCard(event) {
    const card = make("article", "card");
    const heading = make("div", "page-intro");
    heading.append(
      make("p", "eyebrow", "Gem event"),
      make("h3", "", event.title || "Event"),
      make("p", "muted", event.description || "Take part in this event.")
    );
    const metadata = make("div", "muted");
    metadata.append(
      make("p", "", "Entry: " + formatCoins(event.entryCostCoins) + " Coins"),
      make("p", "", "Allowed entries: " + (event.maxEntriesPerUser || "—")),
      make("p", "", "Questions: " + (event.questionCount || (Array.isArray(event.questionIds) ? event.questionIds.length : "—"))),
      make("p", "", "Opens: " + formatTime(event.opensAt)),
      make("p", "", "Closes: " + formatTime(event.closesAt))
    );
    if (event.retryEnabled) {
      metadata.append(make("p", "", "Retry: " + formatCoins(event.retryCostCoins) + " Coins · up to " + event.maxRetriesPerEntry + " per entry"));
    } else {
      metadata.append(make("p", "", "Paid retries are disabled"));
    }
    card.append(heading, metadata);

    const participant = event.participant;
    const attempt = event.attempt;
    const entriesUsed = participant && Number.isSafeInteger(participant.entriesUsed) ? participant.entriesUsed : 0;
    const entriesLeft = Math.max(0, (event.maxEntriesPerUser || 0) - entriesUsed);
    const now = Date.now();
    const upcoming = Number.isSafeInteger(event.opensAt) && event.opensAt > now;
    const closed = Number.isSafeInteger(event.closesAt) && event.closesAt <= now;
    const activeAttempt = attempt && ["ready", "in_progress"].includes(attempt.status);
    card.append(make("p", "muted", "Your paid entries used: " + entriesUsed + " · remaining: " + entriesLeft));

    if (upcoming) {
      card.append(make("p", "muted", "This event has not opened yet."));
    } else if (closed) {
      card.append(make("p", "muted", "This event has closed."));
    }

    if (attempt && attempt.status === "in_progress") {
      card.append(actionButton("Resume attempt", () => startAttempt(event, attempt.attemptId)));
    } else if (attempt && attempt.status === "ready") {
      card.append(actionButton("Start attempt", () => startAttempt(event, attempt.attemptId)));
    } else if (attempt && attempt.status === "completed") {
      card.append(make("p", "muted", "Last result: " + (attempt.correctCount || 0) + "/" + (attempt.questionIndex || 0) + " correct"));
      if (event.retryEnabled && (attempt.retriesUsed || 0) < event.maxRetriesPerEntry && !upcoming && !closed) {
        card.append(actionButton("Retry this entry · " + formatCoins(event.retryCostCoins) + " Coins", () => retryAttempt(event, attempt)));
      }
    }

    if (entriesLeft > 0 && !activeAttempt && !upcoming && !closed) {
      card.append(actionButton("Enter event · " + formatCoins(event.entryCostCoins) + " Coins", () => enterEvent(event), true));
    } else if (activeAttempt) {
      card.append(make("p", "muted", "Finish or resume your current attempt before paying for another entry."));
    }
    card.append(actionButton("View leaderboard", () => showLeaderboard(event), true));
    return card;
  }

  async function enterEvent(event) {
    const fee = Number(event.entryCostCoins);
    if (!Number.isSafeInteger(fee) || fee < 1) return toast("This event has an invalid entry fee.", "warn");
    if (state.coins !== null && state.coins < fee) return toast("You do not have enough Coins to enter.", "warn");
    if (!window.confirm("Enter " + (event.title || "this event") + " for " + fee + " Coins?")) return;
    try {
      const result = await callWorker("/events/enter", { eventId: event.eventId, operationId: id() });
      if (!result.result || !result.result.attemptId) throw new Error("The entry was charged, but the attempt ID was missing. Refresh the Events screen.");
      toast("Entry confirmed. Your new attempt is ready.");
      await startAttempt(event, result.result.attemptId);
    } catch (error) {
      toast((error && error.message) || "Could not enter this event.", "warn");
      await loadEventCards();
    }
  }

  async function retryAttempt(event, attempt) {
    const fee = Number(event.retryCostCoins);
    if (!Number.isSafeInteger(fee) || fee < 1) return toast("This event has an invalid retry fee.", "warn");
    if (state.coins !== null && state.coins < fee) return toast("You do not have enough Coins for a retry.", "warn");
    if (!window.confirm("Pay " + fee + " Coins to retry this event entry?")) return;
    try {
      const result = await callWorker("/events/retry", {
        eventId: event.eventId,
        attemptId: attempt.attemptId,
        operationId: id()
      });
      if (!result.result || !result.result.attemptId) throw new Error("The retry was paid, but the new attempt ID was missing. Refresh the Events screen.");
      toast("Retry confirmed. A new attempt is ready.");
      await startAttempt(event, result.result.attemptId);
    } catch (error) {
      toast((error && error.message) || "Could not retry this event.", "warn");
      await loadEventCards();
    }
  }

  async function startAttempt(event, attemptId) {
    state.event = event;
    state.attemptId = attemptId;
    state.pendingAnswer = null;
    state.screen = "quiz";
    await loadNextQuestion();
  }

  async function loadNextQuestion() {
    const event = state.event;
    const attemptId = state.attemptId;
    if (!event || !attemptId) return loadEventCards();
    renderLoading("Preparing your next question…");
    try {
      const response = await callWorker("/events/next", { eventId: event.eventId, attemptId });
      const questionId = response.result && response.result.questionId;
      const question = questionId && App.questionById(questionId);
      if (!question || !Array.isArray(question.options)) {
        throw new Error("This question is missing from the app's question bank. Please contact the Owner.");
      }
      renderQuestion(event, attemptId, response.result, question);
    } catch (error) {
      showMessage("Could not open the event question", (error && error.message) || "Please try again.", "Back to events", loadEventCards);
    }
  }

  function renderQuestion(event, attemptId, current, question) {
    host.replaceChildren();
    state.screen = "quiz";
    state.locked = false;
    const wrap = make("article", "card");
    wrap.append(
      make("p", "eyebrow", event.title || "Gem event"),
      make("h2", "", "Question " + (current.questionIndex + 1) + " of " + current.totalQuestions),
      make("p", "muted", question.topic || ""),
      make("h3", "", question.question)
    );
    const options = make("div", "duel-opts");
    question.options.forEach(option => {
      const button = make("button", "option", option.text);
      button.type = "button";
      button.addEventListener("click", () => submitAnswer(event, attemptId, current.questionId, option.key, question, options, wrap));
      options.append(button);
    });
    wrap.append(options);
    host.append(wrap, actionButton("Leave attempt", () => {
      if (window.confirm("Leave this attempt for now? You can resume it later from Events.")) loadEventCards();
    }, true));
  }

  async function submitAnswer(event, attemptId, questionId, answerKey, question, options, wrap) {
    if (state.locked) return;
    if (!state.pendingAnswer) {
      state.pendingAnswer = { questionId, answerKey, operationId: id() };
    } else if (state.pendingAnswer.questionId !== questionId || state.pendingAnswer.answerKey !== answerKey) {
      return;
    }

    const pending = state.pendingAnswer;
    state.locked = true;
    options.querySelectorAll("button").forEach(button => { button.disabled = true; });

    let retryButton = wrap.querySelector("[data-retry-answer]");
    if (!retryButton) {
      retryButton = actionButton("Retry saving my answer", sendPendingAnswer);
      retryButton.dataset.retryAnswer = "true";
      retryButton.hidden = true;
      wrap.append(retryButton);
    }

    async function sendPendingAnswer() {
      if (!state.pendingAnswer || state.pendingAnswer.operationId !== pending.operationId) return;
      state.locked = true;
      retryButton.disabled = true;
      retryButton.hidden = true;
      try {
        const response = await callWorker("/events/answer", {
          eventId: event.eventId,
          attemptId,
          questionId: pending.questionId,
          answerKey: pending.answerKey,
          operationId: pending.operationId
        });
        const result = response.result;
        if (!result) throw new Error("The event answer could not be verified.");
        state.pendingAnswer = null;
        retryButton.remove();
        const feedback = make("p", result.correct ? "duel-fb good" : "duel-fb bad",
          result.correct ? "Correct!" : "Not quite. " + (question.explanation || ""));
        wrap.append(feedback);
        if (result.done) {
          wrap.append(make("h3", "", "Attempt complete"));
          wrap.append(make("p", "muted", "Your verified score: " + result.score.correctCount + "/" + result.score.totalQuestions));
          wrap.append(actionButton("View event leaderboard", () => showLeaderboard(event)));
          wrap.append(actionButton("Back to events", loadEventCards, true));
        } else {
          wrap.append(actionButton("Next question", loadNextQuestion));
        }
      } catch (error) {
        state.locked = false;
        retryButton.hidden = false;
        retryButton.disabled = false;
        toast("Your answer has not been confirmed. Retry saving the same answer; do not choose a different option. " +
          ((error && error.message) || ""), "warn");
      }
    }

    await sendPendingAnswer();
  }

  async function showLeaderboard(event) {
    const user = signedInUser();
    if (!user) return toast("Sign in to view the leaderboard.", "warn");
    renderLoading("Loading the event leaderboard…");
    try {
      const snapshot = await database().collection("gemEvents").doc(event.eventId)
        .collection("leaderboard").get();
      const rows = snapshot.docs.map(doc => doc.data()).sort((a, b) =>
        (Number(b.correctCount) || 0) - (Number(a.correctCount) || 0)
        || (Number(a.elapsedMs) || 0) - (Number(b.elapsedMs) || 0)
      ).slice(0, 20);
      host.replaceChildren();
      const card = make("article", "card");
      card.append(make("p", "eyebrow", event.title || "Gem event"), make("h2", "", "Leaderboard"));
      if (!rows.length) card.append(make("p", "muted", "No completed attempts yet."));
      else {
        const list = make("ol", "adm-list");
        rows.forEach((row, index) => {
          const elapsed = Math.round((Number(row.elapsedMs) || 0) / 1000);
          list.append(make("li", "adm-row", (index + 1) + ". " + (row.displayName || "Student") +
            " — " + row.correctCount + "/" + row.totalQuestions + " correct · " + elapsed + "s"));
        });
        card.append(list);
      }
      card.append(actionButton("Back to events", loadEventCards));
      host.append(card);
    } catch (error) {
      showMessage("Could not load the leaderboard", (error && error.message) || "Please try again.", "Back to events", loadEventCards);
    }
  }

  App.on("screen", screen => {
    if (screen === "events") loadEventCards();
  });
  if (App.screen === "events") loadEventCards();
})();
