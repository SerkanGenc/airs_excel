var link = document.getElementById("btnSave") ;
link.addEventListener("click", function(e){
   //console.log("save button clicked");
   chrome.tabs.query({ active: true, currentWindow: true}, function(tabs){
      chrome.tabs.sendMessage(tabs[0].id, {text: "hello there"}) ;
   });

});