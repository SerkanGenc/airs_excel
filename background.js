chrome.runtime.onInstalled.addListener(function() {
    //console.log("background installed");
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { urlEquals : 'https://stars.bilkent.edu.tr/airs/index.php?do=advs'}
        })
        ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
      }]);
    });
  });