var DomBuilder = (function() {

   function toTitleCase(str) {
      return str.replace(/\w\S*/g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
   }

   function buildPictureDom(Article) {
      var picture = "";
      if (Article.Img && Article.Img.src) {
         picture = "<img class='pic'       title='"+
                     Article.Img.title +"' src='"  +
                     Article.Img.src   +"' alt='"  +
                     Article.Img.alt   +"'></img>";    
      }
      else {
         picture = "<img class='picDefault'       title='Default Image'" +
                        "src='images/nbalogo.png' alt='Default Image'></img>";
      }


      var picContainer = "<a href="+ Article.Title.url +">" +
                      "<span class='picContainer'>"   +
                           picture +
                      "</span>"    +
                   "</a>";

      return picContainer;
   }

   function buildTagDom(Article) {
      var tags = "<span class='tags'>";

      for (var i = 0; i < Article.Tags.length; i++) {
         var tag = Article.Tags[i];
         tags += "<span class='tag'><a href='"+ tag.url + "'>" + toTitleCase(tag.label) + "</a></span>";
      }

      tags += "</span>";

      return tags;
   }

   function buildThumbnailDom(Article) {
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

      return thumbnails;
   }

   function buildArticleDiv(Article) {
      var picContainer = buildPictureDom(Article);
      var tags = buildTagDom(Article);
      var thumbnails = buildThumbnailDom(Article);

      var titleDiv =  "<div class='title'><a href='" + 
                          Article.Title.url +"'>"     +
                          Article.Title.text + "</a>" +
                       "</div>";

      var date            = "<span class='date'>"+ Article.Date +"</span>"; 
      var dateAndTitleDiv = "<div class='dateAndTitle'>"+ titleDiv + date + thumbnails + tags +"</div>";
      var descDiv         = "<div class='description'>"+ Article.Desc +"</div>";
      var articleDiv      = "<div class='story'>"+ picContainer + dateAndTitleDiv + descDiv +"</div>";

      return articleDiv;
   }

   function noArticlesFound() {
      var storyContainer = $("#storyContainer");
      storyContainer.css("text-align","center");
      var message = "<p id='noStoryMessage'>No headlines yet for today, check back again later!</p>";
      storyContainer.append(message);
   }

   return {
      displayArticles   : function(articleObjects) {
         if (!articleObjects.length) {
            noArticlesFound();
         }

         var ArticleList = "";

         for (var i = 0; i < articleObjects.length; i++) {
            var Article    = articleObjects[i];
            var ArticleDiv = buildArticleDiv(Article);
            ArticleList    = ArticleList + "<br>" + ArticleDiv;
         }

         $("#storyContainer").append(ArticleList);
      },

      displayOfflineMessage : function() {
         var storyContainer = $("#storyContainer");
         storyContainer.css("text-align","center");
         var message = "<p id='noConnectionMessage'>No internet connection detected.<br>Please check your connection and try again!</p>";
         storyContainer.append(message);
      }
   };
})();