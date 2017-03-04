$(document).ready(function() {
  $('.image-link').magnificPopup({type:'image', closeOnContentClick: true});

  $(function() {
  $('a[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top
        }, 1000);
        return false;
      }
    }
  });
});

/* javascript za dinamički prikaz navigacije (sakrivanje/prikazivanje) na mobilnim uređajima */

  var respmenu 		= $('#respmenu');
  var	menu 			= $('#nav>ul');

  $(respmenu).on('click', function(e) {
      e.preventDefault();
      menu.slideToggle();
  });

  $(window).resize(function(){
      var sirina = $(window).width();
      if(sirina > 768 && menu.is(':hidden')) {
          menu.removeAttr('style');
      }
  });

});
