chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: true });
});

chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: true }).then(() => {
    chrome.sidePanel.open();
  });
});

chrome.tabs.onActivated.addListener(() => {
  chrome.runtime.sendMessage({ action: "refreshHeadlines" });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.runtime.sendMessage({ action: "refreshHeadlines" });
  }
});
