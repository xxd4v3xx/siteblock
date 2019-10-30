// Copyright 2012 Constantine Sapuntzakis
//

function onload() {
   var ws = window.location.search;
   if (ws !== undefined) {
      var kvs = ws.substring(1).split('&');
      for (var i = 0; i < kvs.length; i++) {
         var kv = kvs[i].split('=');
         if (kv[0] === 'url') {
            let u = document.getElementById("url");

            var url = decodeURIComponent(kv[1]);
            u.href = url;
            u.appendChild(document.createTextNode(url));
         }
         else if (kv[0] === 'till') {
            let u = document.getElementById("till");

            let value = decodeURIComponent(kv[1]);
            u.innerText = value;
         }
         else if (kv[0] === 'todays_total') {
            let u = document.getElementById("todays_total");

            let value = decodeURIComponent(kv[1]);
            u.innerText = value;
         }
      }
   }

   if( (new Date()).getHours() >= 19 ){
      document.body.style.background = 'black';
      document.body.style.color = 'white';
   }
}

document.addEventListener('DOMContentLoaded', onload);

document.addEventListener("keypress", function onEvent(event) {
   if (event.key === "x") {
       window.close();
   }
});