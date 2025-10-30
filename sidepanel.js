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


  headings.forEach((h, index) => {
    const li = document.createElement('li');
    li.textContent = h.text;
    li.classList.add(h.tag.toLowerCase());

    // ✅ send headline index to content script on click
    li.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, {
          action: "goToHeading",
          index
        });
      });
    });

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
