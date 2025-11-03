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

  // Count headlines per level
  const levelCounts = {};
  headings.forEach(h => {
    const level = parseInt(h.tag[1]);
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  });

  // Render total headlines per level
  const totalHeadings = document.getElementById('total-headings');
  totalHeadings.innerHTML = '';
  Object.keys(levelCounts).sort((a, b) => a - b).forEach(level => {
    const div = document.createElement('div');
    div.textContent = levelCounts[level];
    div.classList.add(`total-h${level}`);
    totalHeadings.appendChild(div);
  });

  // Add total count
  const totalDiv = document.createElement('div');
  totalDiv.textContent = headings.length;
  totalHeadings.appendChild(totalDiv);

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

const headlineOptions = {
  multipleH1: true,
  noH1: true,
  hierarchy: true
};

function checkWarnings(headings) {
  // Clear previous warnings/errors/success
  document.getElementById('warnings').innerHTML = '';
  document.getElementById('errors').innerHTML = '';
  document.getElementById('success').innerHTML = '';

  let warningCount = 0;
  let errorCount = 0;

  // Warnings
  if (headlineOptions.multipleH1) {
    const h1Count = headings.filter(h => h.tag === 'H1').length;
    if (h1Count > 1) {
      addWarning('warning', 'Multiple <h1> tags found on this page.');
      warningCount++;
    }
  }

  // Hierarchy warning: check for skipped heading levels
  if (headlineOptions.hierarchy === true) {
    let lastLevel = null;
    headings.forEach((h, i) => {
      const level = parseInt(h.tag[1]);
      if (lastLevel !== null && level > lastLevel + 1) {
        addWarning('warning', `Skipped hierarchy level. <${h.tag}> follows <${headings[i-1].tag}>.`);
        warningCount++;
      }
      lastLevel = level;
    });
  }

  // Errors
  if (headlineOptions.noH1 && !headings.some(h => h.tag === 'H1')) {
    addWarning('error', 'No <h1> tag found on this page.');
    errorCount++;
  }

  // If no warnings or errors, show success
  if (warningCount === 0 && errorCount === 0) {
    addWarning('success', 'No issues found on this page.');
  }
}

function addWarning(type, message) {
  let list;
  if (type === 'warning') {
    list = document.getElementById('warnings');
  } else if (type === 'error') {
    list = document.getElementById('errors');
  } else if (type === 'success') {
    list = document.getElementById('success');
  }
  if (list) {
    const li = document.createElement('li');
    li.textContent = message;
    list.appendChild(li);
  }
}

function updateHeadlines() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return new Promise(resolve => {
          if (document.readyState === "complete") {
            resolve(true);
          } else {
            window.addEventListener("load", () => resolve(true), { once: true });
          }
        });
      }
    }).then(() => {
      // Now the DOM is truly ready — extract headlines
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractOrderedHeadlines,
      }).then(([result]) => {
        const list = document.getElementById('headings');
        renderHeadlines(list, result.result);
        checkWarnings(result.result);
      }).catch(() => {
        document.getElementById('headings').innerHTML =
          '<li>Could not read headlines from this tab.</li>';
      });
    });
  });
}

updateHeadlines();

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "refreshHeadlines") {
    updateHeadlines();
  }
});
