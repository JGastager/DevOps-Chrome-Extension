chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
});

chrome.tabs.onActivated.addListener(() => {
  chrome.runtime.sendMessage({ action: "refreshHeadlines" });
});



chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, { action: "refreshHeadlines" });
  }
});
