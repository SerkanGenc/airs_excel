//console.log("popup installed");
var link = document.getElementById("btnSave") ;
var loader = document.getElementById("spinner");
link.addEventListener("click", function(e){
   //console.log("save button clicked");
   chrome.tabs.query({ active: true, currentWindow: true}, function(tabs){
      chrome.tabs.sendMessage(tabs[0].id, {text: "hello there"}) ;
   });
   loader.innerHTML = "<img src='img/loader.gif' width='20' height='20' />" ;
});

// Message from Content.js
chrome.runtime.onMessage.addListener(function(message, sender, senderResponse) {
   if ( message.finished) {
      loader.innerHTML = "<img src='img/ok.png' width='20' height='20' />" ; ;
   }
});