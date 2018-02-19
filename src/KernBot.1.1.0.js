/*

Author: Joey Grable
Version: 1.1.0
GIT: github.com/joeygrable94/KernBot

A javascript library that dynamically kerns characters based on their font size.
KernBot uses traditional calligraphy methods to categorize letters by the types
of letter strokes they are comprised of. It then calculates the relative value
letter-spacing by comparing the character's stroke types to the adjacent letters.

*/
(function(global, jQuery, undefined) {

	"use strict";
	const root = global; // window
	// Strokes
	const strokeTypes = [
		// vertical stroke
		new Stroke("l", 2),
		// round stroke
		new Stroke("o", 1),
		// up slant stroke
		new Stroke("u", 4),
		// down slant stroke
		new Stroke("d", 4),
		// special case
		new Stroke("s", 2),
		// none case
		new Stroke("n", 0)
	];
	const strokeLegend = new StrokeCombinations(strokeTypes);
	// Character
	const characters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", " ", ".", ",", ";", "“", "”", "‘", "’", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "[", "]", "{", "}", "/"];
	const characterLegend = [
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
	// Nodes 
	function Node(character, strokeBefore, strokeAfter) {
		this.char = character;
		this.strokes = {
			before: strokeBefore,
			after: strokeAfter
		};
	}
	// NodePairs
	function NodePair(character1, character2, strokeData) {
		this.pair = character1.char + character2.char;
		this.c1 = {
			char: character1.char,
			strokes: {
				before: character1.strokes.before,
				after: character1.strokes.after
			}
		}
		this.c2 = {
			char: character2.char,
			strokes: {
				before: character2.strokes.before,
				after: character2.strokes.after
			}
		}
		this.kern = {
			code: strokeData.code,
			weight: strokeData.weight
		};
		this.count = 0;
	}
	// increase the NodePair count
	NodePair.prototype.increaseCount = function() { return this.count+=1; }
	// Strokes
	function Stroke(s, w) {
		this.stroke = s;
		this.weight = w;
	}
	// Stroke Combinations
	function StrokeCombinations(strokes) {
		// data
		this.data = [];
		// 2D loop through types
		for (let x = 0; x < strokes.length; x++) {
			for (let y = 0; y < strokes.length; y++) {
				// add combination to data array
				this.data.push({
					// stroke combination
					"code": strokes[x].stroke + strokes[y].stroke,
					// stroke 1 (left)
					"s1": strokes[x].stroke,
					// stroke 2 (right)
					"s2": strokes[y].stroke,
					// weight
					"weight": Math.round(strokes[x].weight + strokes[y].weight)
				});
			}
		}
		// return stroke data
		return this.data;
	}
	//	KernBot
	// ==================================================
	let KernBot = function() {
		// return a new LazyLoader object that initializes the passed elements
		return new KernBot.init(characterLegend, strokeLegend);
	}
	// KernBot object initialization
	KernBot.init = function(characterData, strokeData) {

		// vars
		let self = this;
		self.characterLegend = characterData;
		self.strokeLegend = strokeData;
		self.HTMLelements = [];
		self.nodes = [];
		self.counted = [];
		self.mostCommon = [];
		self.leastCommon = [];

		// initialize KernBot
		self.initializeKernBot();

	}
	// initialize KernBot
	KernBot.prototype.initializeKernBot = function() {
		// loop through the character legend
		for (let x = 0; x < this.characterLegend.length; x++) {
			for (let y = 0; y < this.characterLegend.length; y++) {
				let char1 = new Node(
					this.characterLegend[x].char,
					this.characterLegend[x].before,
					this.characterLegend[x].after
				);
				let char2 = new Node(
					this.characterLegend[y].char,
					this.characterLegend[y].before,
					this.characterLegend[y].after
				);
				let charComboStrokeData = this.getLegendData(
					char1.strokes.after + char2.strokes.before,
					"code",
					this.strokeLegend
				);
				// add character combo + kerning data to nodes array
				this.nodes.push(new NodePair(char1, char2, charComboStrokeData));
			}
		}
		// return true
		return true;
	}
	// sort nodes by...
	KernBot.prototype.sortBy = function(field, reverse, primer) {
		//	EX: array.sort(sort_by('price', true, parseInt));
		//	EX: array.sort(sort_by('city', false, function(a){return a.toUpperCase()}));
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
	// get data from legend
	KernBot.prototype.getLegendData = function(key, property, legend) {
		// loop through the legend
		for (let i = 0; i < legend.length; i++) {
			// check character match
			if (legend[i][property] === key) {
				// return match character data
				return legend[i];
			}
		}
	}
	// count the number of occurrences of the NodePairs
	KernBot.prototype.updateNodeCount = function(data) {
		// loop through nodes
		for (let i = 0; i < data.length; i++) {
			// count all nodes that occur
			if (data[i].count > 0) {
				// add this node to the counted array
				this.counted.push(data[i]);
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
	// Kern function
	KernBot.prototype.kern = function(options) {
		// input option
		let self = this;
		// gather the HTML elements
		self.gatherElements(options.classes);
		self.gatherElements(options.ids);
		self.gatherElements(options.tags);

		console.log(self);

		// loop through each HTML element
		for (let e = 0; e < self.HTMLelements.length; e++) {
			// write the HTML to the element
			self.writeElementToHTML(self.HTMLelements[e]);
		}
		// update KernBot node count
		self.updateNodeCount(self.nodes);
		// return this (makes method chainable)
		return self;
	}
	// gather all the HTML elements to run KernBot on
	KernBot.prototype.gatherElements = function(selector) {
		// check the type
		let self = this,
			input = typeof selector,
			output = [],
			elements = null;
		// if a single selector
		if (input === "string") {
			// add HTML elements
			elements = self.getElementHTML(selector);
		}
		// if an array of selectors
		if (Array.isArray(selector)) {
			// loop through list of selectors
			for (let x = 0; x < selector.length; x++) {
				// add HTML elements
				elements = self.getElementHTML(selector[x]);
			}
		}
		// loop through the elements and add to KernBot.HTMLelements
		for (let i = 0; i < elements.length; i++) {
			self.HTMLelements.push(elements[i]);
		}
	}
	// output an array of HTML elements with input selector
	KernBot.prototype.getElementHTML = function(selector) {
		// vars
		let firstChar = selector.substring(0,1),
			output = [];
		// switch
		switch (firstChar) {
			// IDs
			case "#":
				let byID = document.getElementById(selector.substring(1));
				output.push(byID);
				break;
			// Classes
			case ".":
				let byClass = document.getElementsByClassName(selector.substring(1));
				for (let x = 0; x < byClass.length; x++) {
					output.push(byClass[x]);
				}
				break;
			// HTML tag
			default:
				let byTag = document.getElementsByTagName(selector.toUpperCase());
				for (let y = 0; y < byTag.length; y++) {
					output.push(byTag[y]);
				}
				break;
		}
		return output;
	}
	// write the HTML to the DOM element
	KernBot.prototype.writeElementToHTML = function(element) {
		// prepare element and HTML string
		let self = this,
			kernElm = self.kernSequence(element),
			elmHTML = self.prepareHTMLString(kernElm);
		// write the kerned string to the elements HTML
		element.innerHTML = elmHTML;
		// return self (makes method chainable)
		return self;
	}
	// Kern Element
	KernBot.prototype.kernSequence = function(element) {
		// vars
		let self = this,
			string = element.innerHTML,
			fontSize = parseFloat(getComputedStyle(element).fontSize),
			letterSequence = [];
		// loop through the string
		for (let i = 0; i < string.length; i++) {
			// vars
			let currentChar = self.getLegendData(string[i], "char", self.characterLegend),
				previousChar = self.getLegendData(string[i-1], "char", self.characterLegend) || null,
				matchKey = null, nodeData = 0, kernData = 0, letterSpace = 0;
			// skip the first character loop
			if (previousChar != null) {
				matchKey = previousChar.char + currentChar.char;
				nodeData = self.getLegendData(matchKey, "pair", self.nodes);
				kernData = nodeData.kern.weight;
				letterSpace = (-kernData / 100) * fontSize + "px";
				// increase the count of the NodePair
				nodeData.increaseCount();
			}
			// add a letter object to the output
			letterSequence.push({
				char: currentChar.char,
				strokes: {
					before: currentChar.before,
					after: currentChar.after
				},
				kern: kernData,
				letterSpace: letterSpace,
			});
		}
		// return all the kerned letters in a list
		return letterSequence;
	}
	// prepare HTML string
	KernBot.prototype.prepareHTMLString = function(data) {
		// vars
		let HTMLString = "";
		// loop through the data
		for (let i = 0; i < data.length; i++) {
			// add span to html string
			HTMLString += "<span style=\"letter-spacing:"+ data[i].letterSpace +";\">";
			HTMLString += data[i].char;
			HTMLString += "</span>";
		}
		// return string
		return HTMLString;
	}
	// output nodes to page
	KernBot.prototype.writeNodePairsToHTML = function(selector) {
		// vars
		let self = this,
			trainerHTML = self.getElementHTML(selector),
			trainerOutput = trainerHTML[0],
			HTMLstring = "<ul>";
		// loop through counted NodePairs
		for (let i = 0; i < self.counted.length; i++) {
			HTMLstring += "<li>";
				HTMLstring += "<h3>";
					HTMLstring += "“" + self.counted[i].pair + "”";
				HTMLstring += "</h3>";
				HTMLstring += "<p>";
					HTMLstring += "Count: " + self.counted[i].count;
				HTMLstring += "<br>";
					HTMLstring += "Kern Weight: " + self.counted[i].kern.weight;
				HTMLstring += "</p>";
			HTMLstring += "</li>";
		}
		HTMLstring += "</ul>";
		return trainerOutput.innerHTML = HTMLstring;

	}
	// Initialize the KernBot object methods
	KernBot.init.prototype = KernBot.prototype;
	// create "$KB" alias in the global object (shorthand)
	global.KernBot = global.$KB = KernBot;
// execute IIFE and pass dependencies
} (window, jQuery, undefined));