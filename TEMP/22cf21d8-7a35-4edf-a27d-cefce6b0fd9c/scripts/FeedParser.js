var FeedParser = (function() {

   return function() {
      /*****************************/
      /* --- Private Variables --- */
      /*****************************/
      var currentPage     = 1;
      var pageGrabLimit   = 2;
      var url             = "https://www.tsn.ca/nba/nba-tab-view-element-7.161/all-7.162?ot=example.AjaxPageLayout.ot&&parentMaximumSize=40&parentPageSize=13&pageNum=";
      var rawArticles     = "";
      var articleObjects  = [];
      
      /*****************************/
      /* --- Public Functions --- */
      /*****************************/
      this.getFeed = function() {
         var promises = [];
         var fullURL;
         
         while(currentPage <= pageGrabLimit) {
            fullURL = url + currentPage;
            var promise = performAjaxCall(fullURL);
            promises.push(promise);
            currentPage += 1;
         }

         return $.when.apply($, promises);
      };

      this.getFeedOffline = function() {
         rawArticles = $("<div></div>").append(OfflineFeedText).find("li.feed-item");
      };

      this.createArticleObjects = function() {
         rawArticles.each(function(index) {
            try {
               var article = this;
               var Article;

               if ( $(article).find("article").hasClass("super-promo") ||
                    $(article).find("article").hasClass("medium-promo")) {
                  // At this point promo articles are class 5 or 7 (for super/medium respect.)
                  Article  = createPromoArticleObj(article);
               }
               else if ( $(article).find("article").is("#feed-widget") ) {
                  // TODO - A Feed widget contains a list of mutiple videos in one article obj for a
                  //        all for a specific category. (aka "Countdown to training camp")
                  //      - They don't have desc's/dates or anything besides a title/pic, so it is going 
                  //        to make sense to potentially handle these on a separate video screen under their 
                  //        category along with the regular TSN video feed (which is easily accessible at another
                  //        URL)
                  //      - Could just store them in memory and when a video link is clicked then we call the main 
                  //        video link and process the ones in memory along with the new ones...
                  //      - Just skip for now so errors don't occur.
                  // Feed widget 'articles' are class 0.
                  return true; //continue
               }
               else {
                  // At this point regular articles are class 2 or 3.
                  Article  = createRegularArticleObj(article);
               }

               if ( ! jQuery.isEmptyObject(Article) ) {
                  articleObjects.push(Article);
               }
            }
            catch(error) {
               //Error parsing article, skipping.
               console.log(error);
            }
         });

         sortArticlesAscending();
      };

      this.getArticleObjects = function() {
         return articleObjects;
      };

      /*****************************/
      /* --- Private Functions --- */
      /*****************************/
      function performAjaxCall(fullURL) {
         var promise = $.get(fullURL, function(data) {
            var grabbedItems = $("<div></div>").append(data).find("li.feed-item");
            rawArticles = $(rawArticles).add(grabbedItems);
         });

         return promise;
      }

      // article object creator for normal headlines
      function createRegularArticleObj(article) {
         var Article = {};

         if ( $(article).text().trim() == "") {
            return Article;
         }

         Article["Title"]    = extractRegularTitle(article);
         Article["Desc"]     = extractRegularDesc (article);
         Article["Date"]     = extractDate       (article);
         Article["Tags"]     = extractTags       (article);

         Article["isVideo"]  = isVideo(Article["Title"].url);
         Article["isAudio"]  = isAudio(Article["Title"].url);

         if ($(article).hasClass('2') || $(article).hasClass('3')) {
            //0, 1 articles don't have pictures.
            Article["Img"] = extractImage($(article));
         }
         
         return Article;
      }

      //article object creator for super headlines
      function createPromoArticleObj(article) {
         var Article      = {};
         if ( $(article).text().trim() == "") {
            return Article;
         }
         Article["Title"]     = extractPromoTitle(article);
         Article["Desc" ]     = extractPromoDesc (article);
         Article["Date" ]     = extractDate      (article);
         Article["Tags" ]     = extractTags      (article);
         Article["Img"]       = extractImage     (article);

         Article["isVideo"]  = isVideo(Article["Title"].url);
         Article["isAudio"]  = isAudio(Article["Title"].url);
         
         return Article;
      }

      //article element extraction functions
      function extractRegularTitle(article) {
         var articleContent = getRegularArticleContentContainer(article);
         var titleObj = {"text" : "", "url" : ""};

         if (articleContent) {
            var titleCont = articleContent.children("a");
            titleObj.url  = sanitizeUrl( $(titleCont).attr("href") );
            titleObj.text = $(titleCont).text();
         }   

         return titleObj;
      }

      function extractRegularDesc(article) {
         var desc = "";
         var articleContent = getRegularArticleContentContainer(article);

         if (articleContent) {
            var descContainer = $(articleContent).children("p");
            desc = descContainer.text();
         }
         return desc;
      }

      function extractPromoTitle(article) {
         var titleContainer = $(article)
                          .find("article.article-feed div.headline-super a");

         if (!titleContainer.length) {
            titleContainer = $(article)
                          .find("article.article-feed div.headline-medium a");
         }

         var titleObj = {"text" : "", "url" : ""};

         if (titleContainer) {
            titleObj.text = $(titleContainer).children().first().text(); 
            titleObj.url  = sanitizeUrl( $(titleContainer).attr("href") );
         }

         return titleObj;
      }

      function extractPromoDesc(article) {
         var desc = "";
         var descContainer = $(article)
                         .children("article.article-feed").children("p");
         if (descContainer) {
            desc = descContainer.text();
         }
         return desc;
      }

      function extractDate(article) {
         var date = $(article).find("div.date p").text();
         var formattedDate = date.trim(); 
         return formattedDate;
      }

      function extractTags(article) {
         var tags = [];
         $(article).find("div.tags ul li").each( function(index) {
            var tag = $(this).children("h4").html();
            var labelText = $(tag).text();
            var labelUrl  = sanitizeUrl($(tag).attr("href"));
            tags[index]   = { "label" : labelText, "url": labelUrl }
         });

         return tags;
      }

      function extractImage(article) {
         var mediaContainer = getArticleMediaContainer(article);
         var Image = {  
            "title" : "", "height"    : "", 
            "width" : "", "alt"       : "", 
            "src"   : ""
         } 

         var imageTag = $(mediaContainer).children("img");

         if (mediaContainer && imageTag.length) {
            Image.title     = $(imageTag).attr("title");
            Image.alt       = $(imageTag).attr("alt");
            Image.height    = $(imageTag).prop("height");
            Image.width     = $(imageTag).prop("width");
            Image.src       = sanitizeImgUrl( $(imageTag).attr("data-src") );
         }

         return Image;  
      }


      //Helpers
      function getRegularArticleContentContainer(article) {
         var container = $(article)
                     .find("article.article-feed div.headline div.article-content"); 

         return container;
      }
      
      function getArticleMediaContainer(article) {
         var container = $(article).find("article.article-feed div.headline div.media a div"); 
         
         if (!container.length) {
            container = $(article).find("article.article-feed div.headline-super a div.media");
         }

         if (!container.length) {
            container = $(article).find("article.article-feed div.headline-medium a div.media");
         }

         return container;
      }

      function isVideo(articleUrl) {
         if ( (articleUrl.indexOf("http://www.tsn.ca/nhl/video/") != -1) ||
             (articleUrl.indexOf("https://www.tsn.ca/nhl/video/") != -1) ) {
            return true;
         }

         return false;
      }

      function isAudio(articleUrl) {
         if ( (articleUrl.indexOf("http://www.tsn.ca/nhl/radio/") != -1) || 
             (articleUrl.indexOf("https://www.tsn.ca/nhl/radio/") != -1) ) {
            return true;
         }
         else if ( (articleUrl.indexOf("http://www.tsn.ca/radio/") != -1) || 
                  (articleUrl.indexOf("https://www.tsn.ca/radio/") != -1) ) {
            return true;
         }

         return false;
      }

      function sanitizeUrl(extractedUrl) {
         extractedUrl = extractedUrl.trim();
         var sanitizedUrl = extractedUrl.replace(/chrome-extension:\/\/[0-9a-zA-Z]+[\/]/g, 
                                        "https://www.tsn.ca/");
         
         if (sanitizedUrl == extractedUrl && 
            (extractedUrl.indexOf("http://www.") && extractedUrl.indexOf("https://www.")) != 0) {
            
            if ( extractedUrlStartsWithSubdomain(extractedUrl) ) {
               sanitizedUrl = "https://www.tsn.ca" + sanitizedUrl;
            }
            else {
               sanitizedUrl = "https://www.tsn.ca/nhl" + sanitizedUrl;
            }
         }

         return sanitizedUrl;
      }

      function sanitizeImgUrl(extractedUrl) {
         extractedUrl = extractedUrl.trim();
         var sanitizedUrl = extractedUrl.replace(/chrome-extension:\/\/[0-9a-zA-Z]+[\/]/g, 
                                       "https://www.tsn.ca/");

         if (sanitizedUrl == extractedUrl && 
            (extractedUrl.indexOf("http://") && extractedUrl.indexOf("https://"))  != 0) {
            sanitizedUrl = "https://www.tsn.ca" + sanitizedUrl;
         }

         return sanitizedUrl;
      }   

      function extractedUrlStartsWithSubdomain(extractedUrl) {
         var subdomains =  [
                              "/nhl"    , "/nfl", "/mlb", "/nba", "cfl", "/auto-racing",
                              "/golf"   , "/soccer", "/hockey-canada", "/tennis", "/curling", "ncaa",
                              "/nascar" , "/chl", "/ahl", "/figure-skating", "/skiing", "/world-cup",
                              "/ufc"    , "/world-juniors", "/canada-games", "/boxing", "rugby", "/cis",
                              "/olympics", "/lacrosse", "/cycling", "/must-see"
                           ];

         //var others = ["/more-sports", "/video", "/radio", "/tv", "/fantasy"]
         for (var i =0; i<subdomains.length; i++) {
            if (extractedUrl.indexOf( subdomains[i] ) == 0) {
               return true;
            }
         }

         return false;
      }

      function getArticleAgeMins(articleObjIndex) {
         //Check to see if the age is specified as hours, minutes, or an actual shorthand date.
         //Convert hours to mins if hours found. If > 24hrs, return max value.
         var MINS_IN_A_DAY = 1440;
         var Article    = articleObjects[articleObjIndex];
         var articleAge = parseInt(Article.Date);
         var articleAgeMins;

         if (articleAge) {
            //Article age < 1 day old.
            var timeLetter = Article.Date.charAt( ("" + articleAge).length );
            articleAgeMins = (timeLetter == 'h') ? articleAge * 60 : articleAge;
         }
         else {
            //Article > 1 day old. 
            var articleDayOfMonthStringIndex = Article.Date.lastIndexOf(" ") + 1;
            var articleDayOfMonth = Article.Date.substring(articleDayOfMonthStringIndex);
            var date = new Date();
            var todayDayOfMonth = date.getDate();
            var dayOffset =  todayDayOfMonth - articleDayOfMonth;

            if (dayOffset < 0) {
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

      function sortArticlesAscending() {
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
