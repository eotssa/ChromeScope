var Spinner = {
   on : false,
   start : function() {
      if (!this.on) {
         var spinner ="<div id='spinner'>" +
                     "<span class='spinnerIcon'>" +
                        "<img src='images/spinner.gif'></img>" +
                     "</span><br><br>" +
                     "<span class='spinnerText'>" +
                        "<span>LOADING ARTICLES</span>" +
                     "</span><br><br>" +
                  "</div>";
         $("div#storyContainer").append(spinner);
         this.on = true;
      }
   },
   stop : function() {
      if (this.on) {
         $("div#storyContainer").children("#spinner").slideUp().remove();
         this.on = false;
      }
   }
}

function initalize() {
   Spinner.start();
   var feedParser = new FeedParser();
   $.when( feedParser.getFeed() ).done(function() {
      feedParser.createArticleObjects();
      var Articles = feedParser.getArticleObjects();
      Spinner.stop();
      DomBuilder.displayArticles(Articles);
   });
}

function initalizeOffline() {
   DomBuilder.displayOfflineMessage();
}


$(document).ready( function() {
   if (navigator.onLine) {
      initalize(); 
   }
   else {
      initalizeOffline();
   }
});


//When link clicked, launch story in new window. 
$(document).on("click", "a", function() {
   var linkUrl = $(this).attr('href');
   window.open( linkUrl, "_blank", [fullscreen='yes'] ); 
});