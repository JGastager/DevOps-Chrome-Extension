function extractHeadlines() {
  const headings = [];
  for (let i = 1; i <= 6; i++) {
    document.querySelectorAll(`h${i}`).forEach(el => {
      headings.push({ tag: `H${i}`, text: el.textContent.trim() });
    });
  }
  return headings;
}

function renderHeadlines(list, headings) {
  list.innerHTML = '';
  headings.forEach(h => {
    const li = document.createElement('li');
    li.textContent = `${h.tag}: ${h.text}`;
    list.appendChild(li);
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractHeadlines,
  }).then(([result]) => {
    const list = document.getElementById('headings');
    renderHeadlines(list, result.result);
  });
});