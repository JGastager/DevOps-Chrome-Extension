function extractOrderedHeadlines() {
  const headings = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  return headings.map(el => ({
    tag: el.tagName,
    text: el.textContent.trim()
  }));
}

function renderHeadlines(list, headings) {
  list.innerHTML = '';
  if (headings.length === 0) return;

  const rootLevel = Math.min(...headings.map(h => parseInt(h.tag[1])));
  const levelColors = {
    1: '#0074D9', // Blue
    2: '#2ECC40', // Green
    3: '#3D9970', // Olive
    4: '#39CCCC', // Teal
    5: '#7FDBFF', // Light Blue
    6: '#01FF70'  // Neon Green
  };

  headings.forEach(h => {
    const li = document.createElement('li');
    const level = parseInt(h.tag[1]);
    li.textContent = `${h.tag}: ${h.text}`;
    li.style.marginLeft = (level - rootLevel) * 15 + 'px';
    li.style.color = levelColors[level] || '#000';
    list.appendChild(li);
  });
}

function updateHeadlines() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractOrderedHeadlines,
    }).then(([result]) => {
      const list = document.getElementById('headings');
      renderHeadlines(list, result.result);
    }).catch(() => {
      const list = document.getElementById('headings');
      list.innerHTML = '<li>Could not read headlines from this tab.</li>';
    });
  });
}

updateHeadlines();

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "refreshHeadlines") {
    updateHeadlines();
  }
});
