/**
REFACTORING

(function($) {

	// vars (selectors)
	var $navCard = $('section#mainNav');

	// function handler
	function onBtnClick(e) {
		var $this = $(this),
			$selectors = $(".selector"),
			className = ".is-open";
		// toggle class
		$this.toggleClass(className);
		$selectors.toggleClass(className);
	}

	// when document ready
	$(document).ready(function() {

		// handle specific events
		$navCard.on("click", onBtnClick);
		
	});

} (jQuery));
**/