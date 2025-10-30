console.log("✅ Headliner content script loaded");

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "goToHeading") {
    const headings = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const el = headings[message.index];
    if (!el) return;

    // ✅ Scroll to the element smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // ✅ Blink red background animation
    el.classList.add("flash-highlight");
    setTimeout(() => el.classList.remove("flash-highlight"), 2000);
  }
});
