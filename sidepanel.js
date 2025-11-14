function extractOrderedHeadlines() {
    const headings = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headings.map(el => ({
        tag: el.tagName,
        text: el.textContent.trim()
    }));
}

function extractOutline() {
// All valid HTML5 sectioning elements
const SECTIONING = new Set([
    'ARTICLE',
    'ASIDE',
    'NAV',
    'SECTION',
    'MAIN',
    'FOOTER',
    'ADDRESS'
]);
  const HEADING   = new Set(['H1','H2','H3','H4','H5','H6']);

  // Section node: { type:'section', tag, heading:null|{tag,text,children:[]}, children:[] }
  // Heading node: { type:'heading', tag:'H2', text, level:2, children:[] }

  const root = { type:'section', tag:'ROOT', heading:null, children:[], _stack:[] };

  function withSection(fn, section) {
    const prev = currentSection;
    currentSection = section;
    fn();
    currentSection = prev;
  }

  function addHeadingToSection(section, headingNode) {
    // Maintain a heading stack per section to nest H1–H6 correctly
    if (!section._stack) section._stack = [];
    const stack = section._stack;

    const level = headingNode.level;

    // First heading in a section becomes its "title" (but children nest under it)
    if (!section.heading) {
      section.heading = headingNode;
      stack.length = 1;
      stack[0] = headingNode;
      return;
    }

    // Otherwise place by level relative to stack
    while (stack.length && level <= stack[stack.length - 1].level) {
      stack.pop();
    }
    if (stack.length === 0) {
      // Sibling of the section title
      section.children.push(headingNode);
      stack.push(headingNode);
    } else {
      // Child of the last heading in stack
      stack[stack.length - 1].children.push(headingNode);
      stack.push(headingNode);
    }
  }

  let currentSection = root;

  function walk(node) {
    if (node.nodeType !== 1) return; // element only
    const tag = node.tagName;

    if (SECTIONING.has(tag)) {
      const section = { type:'section', tag, heading:null, children:[], _stack:[] };
      currentSection.children.push(section);
      withSection(() => {
        // Traverse the inside of this section
        for (let child of node.children) {
          walk(child);
        }
      }, section);
      return;
    }

    if (HEADING.has(tag)) {
      const headingNode = {
        type:'heading',
        tag,
        text: node.textContent.trim(),
        level: parseInt(tag[1], 10),
        children: []
      };
      addHeadingToSection(currentSection, headingNode);
      return;
    }

    // Recurse through other elements
    for (let child of node.children) {
      walk(child);
    }
  }

  walk(document.body);

  // Clean internal stacks before returning
  const strip = (n) => {
    delete n._stack;
    if (n.children) n.children.forEach(strip);
    if (n.heading) strip(n.heading);
    return n;
  };
  return strip(root).children;
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
    const totalHeadings = document.querySelector('#headlines .summary');
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
        li.textContent = h.text ? h.text : `untitled`;
        li.classList.add(h.tag.toLowerCase());
        if (!h.text) {
            li.classList.add('empty');
        }

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

function renderOutline(list, outline) {
    list.innerHTML = '';
    if (!outline || outline.length === 0) return;

    let currentLevel = 1;
    let parents = [list];

    // flatten the outline tree into a linear list with pseudo-levels
    function flatten(nodes, level = 1, arr = []) {
        nodes.forEach(node => {
            // determine label text
            const label = node.heading ? `${node.heading.text} (${node.heading.tag} in <${node.tag.toLowerCase()}>)` : node.text ? `${node.text} (${node.tag})` : `untitled`;

            const tagClass = node.tag.toLowerCase();

            const empty = !node.heading && !node.text;

            arr.push({
                text: label,
                tagClass,
                level,
                empty
            });

            // collect children
            const children = [];
            if (node.type === 'section') {
                if (node.heading?.children?.length) children.push(...node.heading.children);
                if (node.children?.length) children.push(...node.children);
            } else if (node.type === 'heading' && node.children?.length) {
                children.push(...node.children);
            }

            if (children.length > 0) flatten(children, level + 1, arr);
        });
        return arr;
    }

    const flat = flatten(outline);

    // render just like headlines
    flat.forEach((item) => {
        const level = item.level;

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
        li.textContent = item.text;
        li.classList.add(item.tagClass);
        if (item.empty) {
            li.classList.add('empty');
        }
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
    document.querySelector('#issues .warnings').innerHTML = '';
    document.querySelector('#issues .errors').innerHTML = '';
    document.querySelector('#issues .success').innerHTML = '';
    const issuesNav = document.querySelector('nav .issues');
    if (issuesNav) {
        Array.from(issuesNav.querySelectorAll('span')).forEach(span => span.remove());
    }

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
                addWarning('warning', `Skipped hierarchy level. <${h.tag}> follows <${headings[i - 1].tag}>.`);
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

    if (warningCount > 0 || errorCount > 0) {
        if (warningCount > 0) {
            const spanWarnings = document.createElement('span');
            spanWarnings.className = 'warning-hint';
            spanWarnings.textContent = warningCount;
            document.querySelector('nav .issues').appendChild(spanWarnings);
        }
        if (errorCount > 0) {
            const spanErrors = document.createElement('span');
            spanErrors.className = 'error-hint';
            spanErrors.textContent = errorCount;
            document.querySelector('nav .issues').appendChild(spanErrors);
        }
    } else {
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

updateHeadlines();

function updateHeadlines() {
  console.info("Updating headlines and outline in side panel...");
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return new Promise(resolve => {
          if (document.readyState === "complete") resolve(true);
          else window.addEventListener("load", () => resolve(true), { once: true });
        });
      }
    }).then(() => {
      // --- Extract headlines ---
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractOrderedHeadlines,
      }).then(([result]) => {
        const headlinesSection = document.querySelector('#headlines');
        const list = headlinesSection.querySelector('.tree');
        renderHeadlines(list, result.result);
        checkWarnings(result.result);

        // --- Extract structural outline ---
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractOutline
        }).then(([outlineResult]) => {
          const outlineSection = document.querySelector('#outlining');
          const outlineList = outlineSection.querySelector('.tree');
          renderOutline(outlineList, outlineResult.result);
        });
      }).catch(() => {
        document.querySelector('#headlines .tree').innerHTML =
          '<li>Could not read headlines from this tab.</li>';
      });
    });
  });
}


chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "refreshHeadlines") {
        updateHeadlines();
    }
});

function highlightNavAndShowSection() {
    const navItems = document.querySelectorAll('nav li');
    const sections = document.querySelectorAll('section');
    navItems.forEach((li, idx) => {
        li.addEventListener('click', () => {
            navItems.forEach(item => item.classList.remove('active'));
            li.classList.add('active');
            sections.forEach((sec, secIdx) => {
                sec.style.display = secIdx === idx ? 'block' : 'none';
            });
        });
    });
}

// Call this after DOM is loaded
document.addEventListener('DOMContentLoaded', highlightNavAndShowSection);
