// Listen for clicks on the browser action (extension icon).
chrome.browserAction.onClicked.addListener(function(tab) {
    // Send a message to the content script in the active tab.
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {"message": "open_menu"});
    });
  });