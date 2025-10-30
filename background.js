chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.setOptions({
    enabled: true
  }).then(() => {
    chrome.sidePanel.open();
  });
});