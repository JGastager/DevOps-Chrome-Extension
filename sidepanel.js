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

  // Helper to create nested ULs for each heading level
  let currentLevel = 1;
  let parents = [list];

  headings.forEach((h, index) => {
    const level = parseInt(h.tag[1]);
    // Adjust nesting
    while (level > currentLevel) {
      const ul = document.createElement('ul');
      parents[parents.length - 1].appendChild(ul);
      parents.push(ul);
      currentLevel++;
    }
    while (level < currentLevel) {
      parents.pop();
      currentLevel--;
    }

    const li = document.createElement('li');
    li.textContent = h.text;
    li.classList.add(h.tag.toLowerCase());

    li.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.tabs.sendMessage(tab.id, {
          action: "goToHeading",
          index
        });
      });
    });

    parents[parents.length - 1].appendChild(li);
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
