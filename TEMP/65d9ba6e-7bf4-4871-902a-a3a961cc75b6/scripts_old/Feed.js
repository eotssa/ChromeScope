var DomBuilder = (function(){    
   function toTitleCase(str){
      return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
   }

   function buildArticleDiv(Article){
      var picture;
      if(Article.Img && Article.Img.src){
         picture = "<img class='pic'       title='"+
                     Article.Img.title +"' src='"  +
                     Article.Img.src   +"' alt='"  +
                     Article.Img.alt   +"'></img>";    
      }
      else{
         picture = "<img class='picDefault'       title='Default Image'" +
                        "src='images/nbalogo.png' alt='Default Image'></img>";
      }

      var thumbnails = "<span class='thumbnails'>";
      if (Article.isVideo) {
          thumbnails += "<img class='videoThumbnail' src='images/videoIcon.png'></img>";
      }
      else if (Article.isAudio) {
          thumbnails += "<img class='audioThumbnail' src='images/audioIcon.png'></img>";
      }
      else {
         thumbnails += "<img class='textThumbnail' src='images/textIcon.png'></img>";
      }

      thumbnails += "</span>";

      var tags = "<span class='tags'>";
      for(var i = 0; i < Article.Tags.length; i++){
         var tag = Article.Tags[i];
         tags += "<span class='tag'><a href='"+ tag.url + "'>" + toTitleCase(tag.label) + "</a></span>";
      }
      tags += "</span>";

      var picContainer = "<a href="+ Article.Title.url +">" +
                            "<span class='picContainer'>"   +
                                 picture +
                            "</span>"    +
                         "</a>";
      var titleDiv     =  "<div class='title'><a href='" + 
                             Article.Title.url +"'>"     +
                             Article.Title.text + "</a>" +
                          "</div>";
      var date            = "<span class='date'>"+ Article.Date +"</span>"; 
      var dateAndTitleDiv = "<div class='dateAndTitle'>"+ titleDiv + date + thumbnails + tags +"</div>";
      var descDiv         = "<div class='description'>"+ Article.Desc +"</div>";
      var articleDiv      = "<div class='story'>"+ picContainer + dateAndTitleDiv + descDiv +"</div>";
      return articleDiv;
   }

   function noArticlesFound(){
      var storyContainer = $("#storyContainer");
      storyContainer.css("text-align","center");
      var message = "<p id='noStoryMessage'>No headlines yet for today, check back again later!</p>";
      storyContainer.append(message);
   }

   return {
      displayArticles   : function(articleObjects){
         if(!articleObjects.length){
            noArticlesFound();
         }
         var ArticleList = "";
         for(var i = 0; i < articleObjects.length; i++){
            var Article    = articleObjects[i];
            var ArticleDiv = buildArticleDiv(Article);
            ArticleList    = ArticleList + "<br>" + ArticleDiv;
         }
         $("#storyContainer").append(ArticleList);
      },

      displayOfflineMessage : function(){
         var storyContainer = $("#storyContainer");
         storyContainer.css("text-align","center");
         var message = "<p id='noConnectionMessage'>No internet connection detected.<br>Please check your connection and try again!</p>";
         storyContainer.append(message);
      }
   };
})();


var FeedParser = (function(){

   return function(){
      /*****************************/
      /* --- Private Variables --- */
      /*****************************/
      var currentPage     = 1;
      var pageGrabLimit   = 2;
      var url             = "http://www.tsn.ca/nba/nba-tab-view-element-7.161/all-7.162?ot=example.AjaxPageLayout.ot&&parentMaximumSize=40&parentPageSize=13&pageNum=";
      var rawArticles     = "";
      var articleObjects  = [];
      
      /*****************************/
      /* --- Public Functions --- */
      /*****************************/
      this.getFeed = function(){
         var promises = [];
         var fullURL;
         
         while(currentPage <= pageGrabLimit){
            fullURL = url + currentPage;
            var promise = performAjaxCall(fullURL);
            promises.push(promise);
            currentPage += 1;
         }
         return $.when.apply($, promises);
      };

      this.getFeedOffline = function(){
         rawArticles = $("<div></div>").append(OfflineFeedText).find("li.feed-item");
      };

      this.createArticleObjects = function(){
         rawArticles.each(function(index){
            try{
               var article = this;
               var Article;
               if( $(article).hasClass("5") ){
                  Article  = createArticleObjSuper(article);
               }
               else{
                  Article  = createArticleObjNormal(article);
               }
               if( ! jQuery.isEmptyObject(Article) ) {
                  articleObjects.push(Article);
               }
            }
            catch(error){
               //Error parsing article, skipping.
               console.log(error);
            }
         });
         sortArticlesAscending();
      };

      this.getArticleObjects = function(){
         return articleObjects;
      };

      /*****************************/
      /* --- Private Functions --- */
      /*****************************/
      function performAjaxCall(fullURL){
         var promise = $.get(fullURL, function(data) {
            var grabbedItems = $("<div></div>").append(data).find("li.feed-item");
         rawArticles = $(rawArticles).add(grabbedItems);
        });
         return promise;
      }
      //article object creator for normal headlines
      function createArticleObjNormal(article){
         var Article       = {};
         if( $(article).text().trim() == ""){
            return Article;
         }
         Article["Title"]     = extractTitleNormal(article);
         Article["Desc"]      = extractDescNormal (article);
         Article["Date"]      = extractDate       (article);
         Article["Tags"]      = extractTags       (article);

         Article["isVideo"]  = isVideo(Article["Title"].url);
         Article["isAudio"]  = isAudio(Article["Title"].url);

         if($(article).hasClass('2') || $(article).hasClass('3')){
            //0, 1 articles don't have pictures.
            Article["Img"] = extractImage($(article));
         }
         
         return Article;
      }
      //article object creator for super headlines
      function createArticleObjSuper(article){
         var Article      = {};
         if( $(article).text().trim() == ""){
            return Article;
         }
         Article["Title"]     = extractTitleSuper(article);
         Article["Desc" ]     = extractDescSuper (article);
         Article["Date" ]     = extractDate      (article);
         Article["Tags" ]     = extractTags      (article);
         Article["Img"]       = extractImage     (article);

         Article["isVideo"]  = isVideo(Article["Title"].url);
         Article["isAudio"]  = isAudio(Article["Title"].url);
         
         return Article;
      }

      //article element extraction functions
      function extractTitleNormal(article){
         var articleContent = getArticleContentContainer(article);
         var titleObj = {"text" : "", "url" : ""};
         if(articleContent){
            var titleCont = articleContent.children("a");
            titleObj.url  = sanitizeUrl( $(titleCont).attr("href") );
            titleObj.text = $(titleCont).text();
         }
         return titleObj;
      }
      function extractDescNormal(article){
         var desc = "";
         var articleContent = getArticleContentContainer(article);
         if(articleContent){
            var descContainer = $(articleContent).children("p");
            desc = descContainer.text();
         }
         return desc;
      }
      function extractTitleSuper(article){
         var titleContainer = $(article)
                          .find("article.article-feed div.headline-super a");
         var titleObj = {"text" : "", "url" : ""};
         if(titleContainer){
            titleObj.text = $(titleContainer).children().first().text(); 
            titleObj.url  = sanitizeUrl( $(titleContainer).attr("href") );
         }
         return titleObj;
      }
      function extractDescSuper(article){
         var desc = "";
         var descContainer = $(article)
                         .children("article.article-feed").children("p");
         if(descContainer){
            desc = descContainer.text();
         }
         return desc;
      }
      function extractDate(article){
         var date = $(article).find("div.date p").text();
         var formattedDate = date.trim(); 
         return formattedDate;
      }
      function extractTags(article){
         var tags = [];
         $(article).find("div.tags ul li").each( function(index){
            var tag = $(this).children("h4").html();
            var labelText = $(tag).text();
            var labelUrl  = sanitizeUrl($(tag).attr("href"));
            tags[index]   = { "label" : labelText, "url": labelUrl }
         });
         return tags;
      }
      function extractImage(article){
         var mediaContainer = getArticleMediaContainer(article);
         var Image = {  
                     "title" : "", "height"    : "", 
                     "width" : "", "alt"       : "", 
                     "src"   : ""
                   } 
         var imageTag = $(mediaContainer).children("img");
         if(mediaContainer && imageTag.length){
            Image.title     = $(imageTag).attr("title");
            Image.alt       = $(imageTag).attr("alt");
            Image.height    = $(imageTag).prop("height");
            Image.width     = $(imageTag).prop("width");
            Image.src       = sanitizeImgUrl( $(imageTag).attr("src") );
         }
         return Image;  
      }


      //Helpers
      function getArticleContentContainer(article){
         var container = $(article)
                     .find("article.article-feed div.headline div.article-content"); 
         return container;
      }
      function getArticleMediaContainer(article){
         var container = $(article).find("article.article-feed div.headline a div.media"); 
         if(!container.length){
            container = $(article).find("article.article-feed div.headline-super a div.media");
         }
         return container;
      }
      function isVideo(articleUrl) {
         if( (articleUrl.indexOf("http://www.tsn.ca/nba/video/") != -1) || 
             (articleUrl.indexOf("https://www.tsn.ca/nba/video/") != -1) ) {
            return true;
         }

         return false;
      }
      function isAudio(articleUrl) {
         if( (articleUrl.indexOf("http://www.tsn.ca/nba/radio/") != -1) || 
             (articleUrl.indexOf("https://www.tsn.ca/nba/radio/") != -1) ) {
            return true;
         }
         else if( (articleUrl.indexOf("http://www.tsn.ca/radio/") != -1) || 
                  (articleUrl.indexOf("https://www.tsn.ca/radio/") != -1) ) {
            return true;
         }

         return false;
      }
      function sanitizeUrl(extractedUrl){
         extractedUrl = extractedUrl.trim();
         var sanitizedUrl = extractedUrl.replace(/chrome-extension:\/\/[0-9a-zA-Z]+[\/]/g, 
                                        "https://www.tsn.ca/");
         
         if(sanitizedUrl == extractedUrl && 
            (extractedUrl.indexOf("http://www.tsn.ca") && extractedUrl.indexOf("https://www.tsn.ca"))  != 0){
            
            if( extractedUrlStartsWithSubdomain(extractedUrl) ){
               sanitizedUrl = "https://www.tsn.ca" + sanitizedUrl;
            }
            else{
               sanitizedUrl = "https://www.tsn.ca/nba" + sanitizedUrl;
            }
         }
         return sanitizedUrl;
      }
      function sanitizeImgUrl(extractedUrl){
         extractedUrl = extractedUrl.trim();
         var sanitizedUrl = extractedUrl.replace(/chrome-extension:\/\/[0-9a-zA-Z]+[\/]/g, 
                                       "https://www.tsn.ca/");

         if(sanitizedUrl == extractedUrl && 
            (extractedUrl.indexOf("http://") && extractedUrl.indexOf("https://"))  != 0) {
            sanitizedUrl = "https://www.tsn.ca" + sanitizedUrl;
         }

         return sanitizedUrl;
      }        
      function extractedUrlStartsWithSubdomain(extractedUrl){
         var subdomains =  [
                              "/nhl"    , "/nfl", "/mlb", "/nba", "cfl", "/auto-racing",
                              "/golf"   , "/soccer", "/hockey-canada", "/tennis", "/curling", "ncaa",
                              "/nascar" , "/chl", "/ahl", "/figure-skating", "/skiing", "/world-cup",
                              "/ufc"    , "/world-juniors", "/canada-games", "/boxing", "rugby", "/cis",
                              "/olympics", "/lacrosse", "/cycling"
                           ];
         //var others = ["/more-sports", "/video", "/radio", "/tv", "/fantasy"]
         for(var i =0; i<subdomains.length; i++){
            if(extractedUrl.indexOf( subdomains[i] ) == 0){
               return true;
            }
         }
         return false;
      }
      function getArticleAgeMins(articleObjIndex){
         //Check to see if the age is specified as hours, minutes, or an actual shorthand date.
         //Convert hours to mins if hours found. If > 24hrs, return max value.
         var MINS_IN_A_DAY = 1440;
         var Article    = articleObjects[articleObjIndex];
         var articleAge = parseInt(Article.Date);
         var articleAgeMins;
         if(articleAge){
            //Article age < 1 day old.
            var timeLetter = Article.Date.charAt( ("" + articleAge).length );
            articleAgeMins = (timeLetter == 'h') ? articleAge * 60 : articleAge;
         }
         else{
            //Article > 1 day old. 
            var articleDayOfMonthStringIndex = Article.Date.lastIndexOf(" ") + 1;
            var articleDayOfMonth = Article.Date.substring(articleDayOfMonthStringIndex);
            var date = new Date();
            var todayDayOfMonth = date.getDate();
            var dayOffset =  todayDayOfMonth - articleDayOfMonth;
            if(dayOffset < 0){
               //article from last month
               //Passing 0 as day number gives you the last day of previous month.
               var LastMonth = new Date(date.getFullYear(), date.getMonth(), 0);
               var daysLastMonth = LastMonth.getDate();
               dayOffset = (daysLastMonth - articleDayOfMonth) + todayDayOfMonth; 
            }
            articleAgeMins = MINS_IN_A_DAY * dayOffset;
         }
         return articleAgeMins;
      }
      function sortArticlesAscending(){
         var len = articleObjects.length;
         var value, item; 
         var i, j;
         for (i = 0; i < len; i++) {
            item  = articleObjects[i];
            value = getArticleAgeMins(i);
            for (j = i - 1; j > -1 && getArticleAgeMins(j) > value; j--) {
               articleObjects[j+1] = articleObjects[j];
            }
            articleObjects[j+1] = item;
         }
      }
   }
})();


var Spinner = {
   on : false,
   start : function(){
      if(!this.on){
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
   stop : function(){
      if(this.on){
         $("div#storyContainer").children("#spinner").slideUp().remove();
         this.on = false;
      }
   }
}


function initalize(){
   Spinner.start();
   var feedParser = new FeedParser();
   $.when( feedParser.getFeed() ).done(function(){
      feedParser.createArticleObjects();
      var Articles = feedParser.getArticleObjects();
      Spinner.stop();
      DomBuilder.displayArticles(Articles);
   });
}

function initalizeOffline(){
   DomBuilder.displayOfflineMessage();
}


$(document).ready( function() {
   if(navigator.onLine){
      initalize(); 
   }
   else{
      initalizeOffline();
   }
});


//When link clicked, launch story in new window. 
$(document).on( "click", "a", function() {
   var linkUrl = $(this).attr('href');
   window.open(linkUrl,"_blank",[fullscreen='yes']); 
});
