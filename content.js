chrome.runtime.onMessage.addListener((message) => {
  
  if (message.action === "goToHeading") {
    const headings = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const el = headings[message.index];
    if (!el) return;

    // Smooth scroll to element
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Determine heading level (1–6)
    const level = el.tagName[1]; // e.g. "H2" → "2"

    // Set highlight color dynamically
    const highlightColor = getComputedStyle(document.documentElement)
      .getPropertyValue(`--headliner-h${level}-color`)
      .trim();

    document.documentElement.style.setProperty('--headliner-highlight-color', highlightColor);

    // Trigger blinking animation
    el.classList.add("headliner-highlight");

    // Cleanup after 2 seconds
    setTimeout(() => {
      el.classList.remove("headliner-highlight");
      document.documentElement.style.removeProperty('--headliner-highlight-color');
    }, 2000);
  }
});

const observer = new MutationObserver(() => {
  chrome.runtime.sendMessage({ action: "refreshHeadlines" });
});

observer.observe(document.body, { childList: true, subtree: true });
