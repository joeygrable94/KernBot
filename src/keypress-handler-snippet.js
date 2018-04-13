
let keys = {};

// check keypress
onkeydown = onkeyup = function(event) {
	
	// add the key pressed to keys map
	keys[event.keyCode] = event.type === "keydown";

	// key handler
	let map = {
		"ctrl":  17,
		"shift": 16,
		"a":     65,
		// ... add desired keys to track
	};
	// tests if the key or keys are being tracked by KB key handler
	function testKey(check){ return keys[check] || keys[map[check]]; }
	function testKeys() {
		var keylist = arguments;
		for(var i = 0; i < keylist.length; i++) {
			if(!testKey(keylist[i])) { return false; }
		}
		return true;
	}

	//console.log(testKeys(13, 16, 65));
	//console.log(testKey(65));
	console.log(testKey('a'));
	//console.log(testKeys('shift', 'a'));

}