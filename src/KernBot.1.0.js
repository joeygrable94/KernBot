"use strict";
/*

Author: Joey Grable
Version: 1.0
GIT: github.com/joeygrable94/KernBot

A javascript library that dynamically kerns characters based on their font size.
KernBot uses traditional calligraphy methods to categorize letters by the types
of letter strokes they are comprised of. It then calculates the relative value
letter-spacing by comparing the character's stroke types to the adjacent letters.

*/





//	Nodes to track
// ==================================================
function Node(data) {
	this.char = data;
	this.count = 0;
}





//	Kerning Library Data
// ==================================================
// - a javascript library that optimizes the kerning of
//   individual letters for the font of an input div
function KernLib(characterLegend, strokeLegend) {
	// GLOBAL ref.
	let self = this;
	// legends / libs
	self.characterLegend = characterLegend;
	self.strokeLegend = strokeLegend;
	// constants
	self.characters = self.characterLegend.map(function(character, index, array) { return character.char; });
	self.nodes = [];
	self.counted = [];
	self.mostCommon = [];
	self.leastCommon = [];
	// initialize vars
	self.initiate();
}
// initiate Kern.lib
KernLib.prototype.initiate = function() {
	// create nodes for each character in the input character legend
	// 2D loop through the inputs
	for (let x = 0; x < this.characters.length; x++) {
		for (let y = 0; y < this.characters.length; y++) {
			// add every two character combination of
			// the input characters to the nodes array
			this.nodes.push(new Node(this.characters[x]+this.characters[y]));
		}
	}
}
// count the number of character combination occurrence of the input text
KernLib.prototype.countOccurrences = function(data) {
	// loop through the data
	for (let i = 0; i < data.length; i++) {
		// create temp var of 2 char string to match occurrence
		let toMatch = data.slice(i, i+2);
		// if the combo exists in the node data store the index
		this.countComboExists(toMatch);
	}
	// loop through nodes
	for (let i = 0; i < this.nodes.length; i++) {
		// count all nodes that occur
		if (this.nodes[i].count > 0) {
			// add this node to the counted array
			this.counted.push(this.nodes[i]);
		}
	}
	// sort all the counted nodes
	if (this.counted.sort(this.sortBy('count', true, parseInt))) {
		// find most common
		this.mostCommon = this.counted.filter(function(node, index, array) { return index < 10; });
		// find least common
		this.leastCommon = this.counted.filter(function(node, index, array) { return (node.count <= 1); });
	}
}
// check if the combination exists and increase its count if it does
KernLib.prototype.countComboExists = function(matchChars) {
	// loop through nodes, see if tracking node exists
	for (let i = 0; i < this.nodes.length; i++) {
		// strict check characters match
		if (this.nodes[i].char === matchChars) {
			// increase this nodes count by 1
			return this.nodes[i].count++
		}
	}
}
// sort counted nodes by...
//	array.sort(sort_by('price', true, parseInt));
//	array.sort(sort_by('city', false, function(a){return a.toUpperCase()}));
KernLib.prototype.sortBy = function(field, reverse, primer) {
	// store key
	var key = primer ?
		function(x) { return primer(x[field]); } :
		function(x) { return x[field]; }
	// reverse the order
	reverse = !reverse ? 1 : -1;
	// sort elements recursively
	return function(a, b) {
		return a = key(a),
			   b = key(b),
			   reverse * ((a > b) - (b > a));
	}
}





//	Character Kerning Legend
// ==================================================
//const characterInputs = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z', '0','1','2','3','4','5','6','7','8','9',' ','.',',',';','“','”','‘','’','!','@','#','$','%','^','&','*','(',')','[',']','{','}','/'];
const characterStrokeLegend = [
	{ "char": "a", "before": "o", "after": "l" },
	{ "char": "b", "before": "l", "after": "o" },
	{ "char": "c", "before": "o", "after": "l" },
	{ "char": "d", "before": "o", "after": "l" },
	{ "char": "e", "before": "o", "after": "o" },
	{ "char": "f", "before": "l", "after": "l" },
	{ "char": "g", "before": "o", "after": "o" },
	{ "char": "h", "before": "l", "after": "l" },
	{ "char": "i", "before": "l", "after": "l" },
	{ "char": "j", "before": "l", "after": "l" },
	{ "char": "k", "before": "l", "after": "l" },
	{ "char": "l", "before": "l", "after": "l" },
	{ "char": "m", "before": "l", "after": "l" },
	{ "char": "n", "before": "l", "after": "l" },
	{ "char": "o", "before": "o", "after": "o" },
	{ "char": "p", "before": "l", "after": "o" },
	{ "char": "q", "before": "o", "after": "l" },
	{ "char": "r", "before": "l", "after": "l" },
	{ "char": "s", "before": "l", "after": "l" },
	{ "char": "t", "before": "l", "after": "s" },
	{ "char": "u", "before": "s", "after": "l" },
	{ "char": "v", "before": "d", "after": "u" },
	{ "char": "w", "before": "d", "after": "u" },
	{ "char": "x", "before": "l", "after": "l" },
	{ "char": "y", "before": "s", "after": "u" },
	{ "char": "z", "before": "l", "after": "l" },
	{ "char": "A", "before": "u", "after": "d" },
	{ "char": "B", "before": "l", "after": "o" },
	{ "char": "C", "before": "o", "after": "l" },
	{ "char": "D", "before": "l", "after": "o" },
	{ "char": "E", "before": "l", "after": "l" },
	{ "char": "F", "before": "l", "after": "u" },
	{ "char": "G", "before": "o", "after": "s" },
	{ "char": "H", "before": "l", "after": "l" },
	{ "char": "I", "before": "l", "after": "l" },
	{ "char": "J", "before": "s", "after": "l" },
	{ "char": "K", "before": "l", "after": "s" },
	{ "char": "L", "before": "l", "after": "s" },
	{ "char": "M", "before": "l", "after": "l" },
	{ "char": "N", "before": "l", "after": "l" },
	{ "char": "O", "before": "o", "after": "o" },
	{ "char": "P", "before": "l", "after": "s" },
	{ "char": "Q", "before": "o", "after": "o" },
	{ "char": "R", "before": "l", "after": "s" },
	{ "char": "S", "before": "l", "after": "l" },
	{ "char": "T", "before": "d", "after": "u" },
	{ "char": "U", "before": "l", "after": "l" },
	{ "char": "V", "before": "d", "after": "u" },
	{ "char": "W", "before": "d", "after": "u" },
	{ "char": "X", "before": "l", "after": "l" },
	{ "char": "Y", "before": "d", "after": "u" },
	{ "char": "Z", "before": "l", "after": "l" },
	{ "char": "0", "before": "o", "after": "o" },
	{ "char": "1", "before": "l", "after": "l" },
	{ "char": "2", "before": "l", "after": "o" },
	{ "char": "3", "before": "l", "after": "o" },
	{ "char": "4", "before": "u", "after": "l" },
	{ "char": "5", "before": "l", "after": "s" },
	{ "char": "6", "before": "o", "after": "o" },
	{ "char": "7", "before": "l", "after": "u" },
	{ "char": "8", "before": "o", "after": "o" },
	{ "char": "9", "before": "l", "after": "o" },
	{ "char": " ", "before": "n", "after": "n" },
	{ "char": ".", "before": "s", "after": "n" },
	{ "char": ",", "before": "s", "after": "n" },
	{ "char": ";", "before": "s", "after": "n" },
	{ "char": "“", "before": "n", "after": "s" },
	{ "char": "”", "before": "s", "after": "n" },
	{ "char": "‘", "before": "n", "after": "s" },
	{ "char": "’", "before": "s", "after": "n" },
	{ "char": "!", "before": "s", "after": "n" },
	{ "char": "@", "before": "o", "after": "o" },
	{ "char": "#", "before": "u", "after": "u" },
	{ "char": "$", "before": "l", "after": "l" },
	{ "char": "%", "before": "s", "after": "s" },
	{ "char": "^", "before": "s", "after": "s" },
	{ "char": "&", "before": "o", "after": "s" },
	{ "char": "*", "before": "s", "after": "s" },
	{ "char": "(", "before": "n", "after": "s" },
	{ "char": ")", "before": "s", "after": "n" },
	{ "char": "[", "before": "n", "after": "s" },
	{ "char": "]", "before": "s", "after": "n" },
	{ "char": "{", "before": "n", "after": "s" },
	{ "char": "}", "before": "s", "after": "n" },
	{ "char": "/", "before": "s", "after": "s" }
];





//	Stroke Data
// ==================================================
// handle an individual stroke type
function Stroke(s, w) {
	// value
	this.stroke = s;
	// weight
	this.weight = w;
}
// compile stroke combinations data
function StrokeData(strokes) {
	// data
	this.data = [];
	// 2D loop through types
	for (let x = 0; x < strokes.length; x++) {
		for (let y = 0; y < strokes.length; y++) {
			// add combination to data array
			this.data.push({
				// stroke combination
				"code": strokes[x].stroke + strokes[y].stroke,
				// stroke 1
				"s1": strokes[x].stroke,
				// stroke 2
				"s2": strokes[y].stroke,
				// weight
				"weight": Math.round(strokes[x].weight + strokes[y].weight)
			});
		}
	}
	// return data
	return this.data;
}
// initialize all the strokes (options)
const strokeTypes = [
	new Stroke("l", 2),	// vertical stroke
	new Stroke("o", 1),	// round stroke
	new Stroke("u", 4),	// up slant stroke
	new Stroke("d", 4),	// down slant stroke
	new Stroke("s", 2),	// special case
	new Stroke("n", 0)	// none case
];
// build stroke combination data
const strokeDataReference = new StrokeData(strokeTypes);





//	KernBot
// ==================================================
function KernBot(lib) {
	// load kern bot data.. . .  .   .     .
	this.kernLib = lib;
	this.strokeLegend = this.kernLib.strokeLegend;
	this.characterLegend = this.kernLib.characterLegend;
}

// KernBot.kern
KernBot.prototype.kernClass = function(selector) {
	
	// get elements to kern
	let root = window,
		elements = document.getElementsByClassName(selector);

	// loop through every element
	for (let i = 0; i < elements.length; i++) {

		// element variables for kerning
		let kernObjs = [],
			elm = elements[i],
			string = elm.innerHTML,
			fontSize = parseFloat(getComputedStyle(elm).fontSize);

		// iterator variables
		let start = 1,
			count = start,
			end = string.length;

		// loop through the string length and build kerning objs
		while (count <= end) {
			// get loop array index
			let index = count-1;
			// gather char data
			let charData = this.getDataFromLegend(string[index], this.characterLegend, "char");
			// add letter to kern obj
			kernObjs.push({
				char: string[index],
				strokes: {
					before: charData.before,
					after: charData.after
				},
				kern: 0,
				letterSpace: null
			});
			// increase the count
			count++;
		}

		// reset the count
		count = start;
		// loop through the kerning objs to calculate their kerning based on their adjacent character stroke data
		while (count <= end) {
			// get loop array index
			let index = count-1,
				currentChar = kernObjs[index],
				previousChar = kernObjs[index-1] || null,
				strokeData = null;
			// get stroke data
			if (previousChar != null) {
				// stroke before and after pair data
				strokeData = this.getDataFromLegend(
					previousChar.strokes.after+currentChar.strokes.before,
					this.strokeLegend,
					"code"
				);
				// set the kerning value (out of 100) to the value in the stroke legend
				previousChar.kern = strokeData.weight
			}
			// increase the count
			count++;
		}

		// reset the count
		count = start;
		// loop through the kerning objs to calculate their letterspacing relative to the font size
		while (count <= end) {
			// get loop array index
			let index = count-1,
				currentChar = kernObjs[index],
				kernPercent = -currentChar.kern / 100;
			// calculate the letter spacing of the current char
			currentChar.letterSpace = kernPercent * fontSize + "px";
			// increase the count
			count++;
		}

		// prepare HTML string by passing it the string converted to an obj with kerning data
		let HTMLString = this.prepareHTMLString(kernObjs);
		
		// set innerHTML of this element to the new string with span letter spacing wraps
		elements[i].innerHTML = HTMLString;

	}

	// return false
	return false;
}
// get data from legend
KernBot.prototype.getDataFromLegend = function(key, legend, property) {
	// loop through the legend
	for (let i = 0; i < legend.length; i++) {
		// check character match
		if (legend[i][property] === key) {
			// return match character data
			return legend[i];
		}
	}
}
// prepare HTML string
KernBot.prototype.prepareHTMLString = function(data) {

	console.log(data);

	// vars
	let HTMLString = "";
	// loop through the length (plus 1 for the last character)
	for (let i = 0; i < data.length; i++) {
		// add span to html string
		HTMLString += "<span style=\"letter-spacing:"+ data[i].letterSpace +";\">";
		HTMLString += data[i].char;
		HTMLString += "</span>";
	}
	// add last character to html string
	HTMLString += "<span>";
	//HTMLString += data[data.length-1].c2.char;
	HTMLString += "</span>";
	// return string
	return HTMLString;

}





//	Test KernLib
// ==================================================
// Startup KernBot
const KerningLib = new KernLib(characterStrokeLegend, strokeDataReference);
const KerningBot = new KernBot(KerningLib);

// supply some data to analyze
//KerningLib.countOccurrences("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eget ipsum sed diam viverra gravida lacinia sed odio. Sed tempus tristique fermentum. Ut vel massa eu sapien venenatis vehicula. In tempus nisi ligula, id mollis lectus lobortis quis. Nulla tristique euismod tempor. Morbi vel placerat velit. Integer suscipit orci eu neque maximus facilisis. Cras cursus viverra nibh, ut eleifend leo. Morbi porttitor lacinia arcu, nec blandit lacus facilisis et. Donec id nisl nisl. Phasellus in convallis ipsum. Quisque vulputate vehicula tortor eget egestas. Cras hendrerit est quis sodales ultrices. Sed at varius enim, sed tristique nisl. Donec suscipit imperdiet leo, eu aliquam quam mattis id. Sed laoreet nunc a ultricies consequat. Mauris porttitor bibendum libero vel vulputate. Etiam scelerisque, nisi a viverra auctor, erat purus porttitor est, sit amet rhoncus dui libero a lorem. Praesent gravida nibh risus, eu aliquet urna suscipit et. Donec non augue eget purus tempor tincidunt sit amet consequat turpis. Aliquam sodales interdum dapibus. Quisque at sagittis metus. Vivamus sed tellus mauris. Cras suscipit eu ante id euismod. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse cursus hendrerit est, at mollis nisi faucibus vitae. Fusce vel arcu nec augue laoreet facilisis. Pellentesque luctus, massa vel luctus viverra, augue nisl semper mi, vel lacinia est sem vel lacus. Morbi mollis mollis ultricies. Sed ut consectetur nisi. Proin erat diam, aliquam nec lectus at, varius sagittis nisi. Nam at efficitur eros, a maximus massa. Nunc et leo non tellus lacinia tempus non a nulla. Mauris efficitur interdum enim in sodales. In non rhoncus tortor. Quisque accumsan eu tellus quis convallis. Proin at arcu in neque feugiat euismod. Donec suscipit, quam a fermentum iaculis, tellus urna scelerisque enim, ullamcorper imperdiet justo urna ac orci. Morbi at quam sem. Quisque ut velit non risus mollis tempus gravida quis diam. Duis dapibus facilisis fermentum. Duis luctus lacus suscipit, ultricies enim non, laoreet velit. Proin lobortis felis eu massa suscipit, ut volutpat sapien cursus. Nulla lacinia, tortor a bibendum viverra, nulla libero tristique sapien, ac rutrum dui ligula porttitor lacus. Praesent commodo ligula augue, nec eleifend ex accumsan eu. Vestibulum quis mauris id nulla semper congue id sit amet turpis. Nam feugiat auctor nibh, sodales ultricies quam egestas in. Proin erat nulla, vestibulum at malesuada ut, congue quis enim. Sed justo arcu, ornare eget risus tristique, consequat iaculis dolor. Aenean ultricies fermentum faucibus. Donec vitae ipsum ac turpis lobortis finibus vitae at lorem. Pellentesque id venenatis sem. Maecenas eget elit non mi porttitor consectetur. Aenean nisi tortor, sagittis sed scelerisque quis, finibus finibus nulla. Pellentesque ac vehicula est, id fringilla magna. Nulla facilisi. Nam eget rutrum urna. Vestibulum ex leo, cursus at sagittis id, aliquet sit amet sem. Quisque dignissim lacus at libero vehicula, ut aliquam magna vulputate. Mauris eu urna volutpat, cursus erat ut, sodales sapien. Pellentesque condimentum ipsum non pellentesque suscipit. Curabitur porta ex nec libero ornare, viverra luctus eros ultricies. Aenean egestas nunc quis est tempor tempor. Aenean metus nulla, faucibus nec lobortis eu, malesuada quis enim. Integer egestas nibh non euismod facilisis. Sed tristique mattis purus eu condimentum. Sed pretium, enim sit amet tincidunt laoreet, diam massa laoreet tellus, vel dignissim nibh nulla a neque. Etiam sit amet ipsum vestibulum, facilisis leo quis, ornare justo. Curabitur posuere dui et dapibus pellentesque. Donec suscipit vehicula lorem, convallis imperdiet turpis volutpat non. Donec tempus ultricies tempus. Praesent blandit mi non ex pellentesque, ut viverra libero dapibus. Phasellus molestie imperdiet purus, at sodales nisl. Vivamus ut eros elit. Etiam augue nulla, lacinia in vehicula placerat, tempus facilisis justo. Morbi ut orci eu tellus commodo vehicula. Phasellus euismod quis urna nec aliquam. Mauris et urna odio. Vivamus id nunc non mi faucibus tempus vel a augue. Mauris rutrum, justo ut blandit posuere, purus eros venenatis lacus, id auctor lectus ante sit amet ipsum. Phasellus molestie lacinia ex in laoreet. Nullam porttitor sodales lacus et auctor. Nulla hendrerit ornare volutpat. Proin in rhoncus purus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean in purus sed ante vulputate maximus. Curabitur maximus luctus dolor id pretium. Donec tincidunt tempor sem, feugiat pulvinar sapien hendrerit vel. Suspendisse accumsan est at nulla ultrices aliquet. Vestibulum sit amet velit eu massa commodo ullamcorper. Quisque tristique accumsan magna. Morbi sit amet luctus lacus. Proin ac lacinia dolor. Nullam vitae cursus urna. Curabitur fringilla nisl libero, eget auctor arcu aliquet facilisis. Donec libero dolor, aliquet ut cursus eu, dignissim ac libero. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque nec magna ac nunc porttitor lacinia non in magna. Pellentesque nisi tellus, fringilla vitae placerat eu, malesuada ac tellus. Sed consectetur euismod turpis consequat porttitor. Mauris sapien velit, condimentum non rutrum eget, mattis quis mi. Donec at velit pharetra tellus facilisis tempus ut eu quam. Aenean dapibus, ligula a egestas cursus, est est eleifend erat, sit amet vehicula risus felis ac nunc. Phasellus vestibulum euismod erat ut facilisis. Nunc et rhoncus ligula, non viverra ipsum. Nam suscipit, erat sed tincidunt sodales, ligula sem molestie sem, in efficitur metus risus sed odio. Praesent vulputate nulla vel sagittis eleifend. Nunc ut arcu diam. Nunc vel interdum dui. Curabitur id ex sit amet metus lobortis sodales nec convallis purus. Morbi tempor nisi eu felis sollicitudin tincidunt. Pellentesque hendrerit vulputate eros, nec fermentum sem posuere vel. Vivamus ut eleifend leo. Nam id eros a urna sodales dapibus. Etiam vitae arcu sed leo ultrices cursus. Suspendisse sed pharetra turpis. Mauris auctor metus pharetra blandit dignissim. Aliquam eu venenatis est. Nam porta, velit nec dapibus convallis, lacus ex iaculis nisl, eu ultricies leo neque vitae erat. Quisque eleifend scelerisque sollicitudin. Ut luctus lectus sit amet dolor malesuada sagittis. Proin est dolor, vulputate vel mauris eget, aliquam imperdiet lectus. Nam tincidunt lorem sit amet lectus imperdiet varius. Aliquam ac pellentesque est. Phasellus lobortis iaculis venenatis. Nulla suscipit justo ac ex egestas dapibus. Donec egestas mauris enim, at imperdiet lacus faucibus sit amet. Vivamus odio arcu, aliquet sed orci quis, sagittis placerat dui. Suspendisse pulvinar ultrices rutrum. Quisque vel metus vitae dui vulputate dignissim. Aliquam efficitur.");
//console.log(KerningLib.nodes);
//console.log(KerningLib.counted);
//console.log(KerningLib.mostCommon);
//console.log(KerningLib.leastCommon);
//console.log(KerningLib.characterLegend);
//console.log(KerningLib.strokeLegend);


// In the Browser
(function(window, document, undefined) {

	// code that should be taken care of right away
	window.onload = init;

	// initialize kerning
	function init(){

		KerningBot.kernClass("kernH1");
		KerningBot.kernClass("kernH2");
		KerningBot.kernClass("kernPara");

	}

})(window, document, undefined);






