$(document).ready(function() {	
var input = $('.clockpicker').clockpicker({
    placement: 'bottom',
    align: 'left',
    autoclose: true,
    'default': 'now'
});
}); // end jquery

$('.datepicker').datepicker({
    beforeShowDay: function(date){
          if (date.getMonth() == (new Date()).getMonth())
            switch (date.getDate()){
              case 4:
                return {
                  tooltip: 'Example tooltip',
                  classes: 'active'
                };
              case 8:
                return false;
              case 12:
                return "green";
          }
        }
});

// Equal height
$(function() {
	$('.md-equal').matchHeight();	
});


$(function(){
	//equalheight jquery start
	$(window).bind("load", function() {
		equalHeight($(".question .height"));
		equalHeight($(".answer"));
	});
	
});

$(window).resize(function() {	
	$(".question .height, .answer").css('height','auto');
	equalHeight($(".question .height"));
	equalHeight($(".answer"));
});


function equalHeight(group) {
	 var tallest = 0;
	 group.each(function() {
	 var thisHeight = jQuery(this).height();
	 if(thisHeight > tallest) {
	 tallest = thisHeight;
	 }
	 });
	 group.height(tallest);
}


var onImgLoad = function(selector, callback){
    $(selector).each(function(){
        if (this.complete || /*for IE 10-*/ $(this).height() > 0) {
            callback.apply(this);
        }
        else {
            $(this).on('load', function(){
                callback.apply(this);
            });
        }
    });
};

// Alert related functions
function resetAlert() {
  const alert = document.getElementById('alert');
  alert.classList.remove('alert-success', 'alert-danger');
}

function showSuccessMessage(message) {
  const alert = document.getElementById('alert');
  alert.innerHTML = message;
  alert.classList.add("alert-success");
}

function showErrorMessage(message) {
  const alert = document.getElementById('alert');
  alert.innerHTML = message;
  alert.classList.add("alert-danger");
}


