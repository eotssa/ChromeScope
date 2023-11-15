var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-61636064-1']);
_gaq.push(['_trackPageview']);

(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = 'https://ssl.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

$(document).on( "click", "a", function() {
   var linkText =  $(this).attr("href") || "Unknown";
   _gaq.push(['_trackEvent', 'HeadlineLink', 'HeadlineLinkClicked', linkText]);
});