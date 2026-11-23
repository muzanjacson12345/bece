
/* Open the compact flashcard panel when its Quick Access link is used. */
document.addEventListener("click", event => {
  const link = event.target.closest('a[href="#flashcard-studio"]');
  if (!link) return;
  const panel = document.getElementById("flashcard-disclosure");
  if (panel) panel.open = true;
}, true);
