/*

Author: Joey Grable
Version: 1.1.0
GIT: github.com/joeygrable94/KernBot

A javascript library that dynamically kerns characters based on their font size.
KernBot uses traditional calligraphy methods to categorize letters by the types
of letter strokes they are comprised of. It then calculates the relative value
letter-spacing by comparing the character's stroke types to the adjacent letters.

*/

// should KernBot accept jQuery to handle events and/or DOM manipulation?
(function(global, undefined) {

	// becuase javascript...
	"use strict";

	// window obj
	const root = global;

	//	CLASSES
	// ===========================================================================
	/*class Tracker {
		constructor() {
			this.count = 0;
			this.indexes = [];
		}
		_increaseCount(val = 1) { return this.count += val; }
		_addCharIndex(index) { return this.indexes.push( index ); }
		_addCharPairIndex(index) { return this.indexes.push([index, index+1]); }}*/
	// characters
	class Character {
		constructor(char, before, after) {
			this.char = char;
			this.strokes = {
				"before": before,
				"after": after
			}
			this.kerning;
			this.letterSpace;
		}
		_addKerning(value) { return this.kerning = value; }
		_addLetterSpace(value) { return this.letterSpace = value; }
	};
	// character pairs
	class CharacterPair {
		constructor(c1, c2, strokeData) {
			this.pair = c1.char + c2.char;
			this.c1 = {
				char: c1.char,
				strokes: {
					before: c1.strokes.before,
					after: c1.strokes.after
				}
			};
			this.c2 = {
				char: c2.char,
				strokes: {
					before: c2.strokes.before,
					after: c2.strokes.after
				}
			};
			this.kerning = strokeData;
			this.weight = strokeData.weight;
			this.letterSpace;
		}
		_addLetterSpace(value) { return this.letterSpace = value; }
	};
	// strokes
	class Stroke {
		constructor(s, w) {
			this.code = s;
			this.weight = w;
		}
	};
	// stroke pairs
	class StrokePair {
		constructor(s1, s2) {
			this.key = s1.code + s2.code;
			this.s1 = {
				"stroke": s1.code,
				"weight": s1.weight
			};
			this.s2 = {
				"stroke": s2.code,
				"weight": s2.weight
			};
			this.weight = this.calcKerning();
		}
		calcKerning() {
			return Math.round(this.s1.weight + this.s2.weight);
		}
	}
	// HTML tags
	class Tag {
		constructor(elm) {
			this.char = elm;
		}
	}
	// sequences
	class Sequence {
		constructor(context, string, HTML, sequence) {
			this.context = context;
			this.string = string;
			this.HTML = HTML;
			this.sequence = sequence;
		}
	}
	// nodes
	class Node {
		constructor(context, character, index) {
			this.context = context;
			this.indexes = [index];
			this.key = character.char;
			this.character = character;
			this.kerning = character.kerning;
			this.count = 0;
			this._increaseCount(1);
		}
		_increaseCount(val = 1) { return this.count += val; }
		_addCharIndex(index) { return this.indexes.push( index ); }
	};
	// node pairs
	class NodePair {
		constructor(context, charPair, index, kerning) {
			this.context = context;
			this.indexes = [ [index, index+1] ];
			this.pair = charPair.pair;
			this.c1 = {
				char: charPair.c1.char,
				strokes: {
					before: charPair.c1.strokes.before,
					after: charPair.c1.strokes.after
				}
			};
			this.c2 = {
				char: charPair.c2.char,
				strokes: {
					before: charPair.c2.strokes.before,
					after: charPair.c2.strokes.after
				}
			};
			this.kerning = kerning.kern;
			this.weight = kerning.weight;
			this.letterSpace = kerning.letterSpace;
			this.count = 0;
			this._increaseCount(1);
		}
		_increaseCount(val) { return this.count += val; }
		_addCharPairIndex(index) { return this.indexes.push([index, index+1]); }
	}

	//	CONSTANTS
	// ===========================================================================
	const strokes = [
		new Stroke("l", 1),		// vertical stroke
		new Stroke("o", 2),		// round stroke
		new Stroke("u", 4),		// up slant stroke
		new Stroke("d", 4),		// down slant stroke
		new Stroke("s", 3),		// special case
		new Stroke("n", 0)		// none case
	];
	const characters = [
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
		{ "char": "y", "before": "l", "after": "u" },
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
	const selectorsDefault = ["h1", "h2", "h3", "h4", "h5", "h6", "p","a","span"];
	//const selectorsDefault = ["h1", "h2"];

	//	KernBot
	// ===========================================================================
	let KernBot = function(input) {
		// set options default
		input = input || {
			"track": true,
			"selectors": selectorsDefault,
		};
		// return a new KernBot.init object that initializes the options
		return new KernBot.init(input, characters, strokes);
	}
	/**
	 * KernBot initialization function
	 * @param [array] characters - and array of character objects that defines
	 *                             the before and after strokes of a character
	 * @param [array] strokes - and array of stroke objects that define the character
	 *                             code for the stroke type and its kerning weight
	 * @return log message to console
	 */
	// KernBot object initialization
	KernBot.init = function(options, characters, strokes) {

		// vars
		let self = this;
		self.strokes = strokes;
		self.strokePairs = self._buildPairs("strokes");
		self.characters = self._buildCharacters(characters);
		self.characterPairs = self._buildPairs("characters");

		// operations
		self.track = options.track;
		self.selectors = options.selectors;
		self.HTMLelements = self._gatherElements(self.selectors);

		// data tracking
		self.sequences = [];
		self.nodes = [];
		self.nodePairs = [];

		// DEBUGING
		console.log(self);
		console.log(self.strokePairs);
		console.log(self.characterPairs);
		console.log("=========================");
	}

	//	Kern CONTROLLER
	// ===========================================================================
	/**
	 * Run KernBot's Kern f(x)
	 * @param [array] options - an array of classes, IDs, and/or HTML tags to kern
	 * @return 'this' self - makes method chainable
	 */
	KernBot.prototype.kern = function() {
		// store self
		let self = this;
		// loop through each HTML element
		for (let e = 0; e < self.HTMLelements.length; e++) {
			// check element already been kerned, break out of this loop
			if (self._checkElementKerned(self.HTMLelements[e])) { break; }
			// gather sequence vars
			let element = self.HTMLelements[e],
				string = element.innerHTML,
				sequence = self._stringToSequence(string),
				HTMLstring = "";
			// calculate the kerning for the sequence
			sequence = self._calcSequenceKerning(element, sequence);
			// prepare HTML string to write to DOM
			HTMLstring = self._prepareHTMLString(sequence);
			// update the elements HTML with the span injected kerning data
			self._updateElementHTML(element, HTMLstring);
			// add this sequence to the array of sequences KernBot acts on
			self.sequences.push(new Sequence(element, string, HTMLstring, sequence));
		}
		// update KernBot tracking
		if (self.track) {
			self._update();
		}
		// return KernBot
		return self;
	}

	//	KERNBOT HELPERS
	// ===========================================================================
	/**
	 * A simple logger
	 * @param "string" string - to output to console
	 * @return log message to console
	 */
	KernBot.prototype.log = function(string) {
		// return string to log
		return console.log(string);
	}
	/**
	 * builds array of characters
	 * @param [array] character - an array of character objects with defined stroke data (before & after)
	 * @return [array] output - array of all the characters KernBot is aware of
	 */
	KernBot.prototype._buildCharacters = function(characters) {
		let output = [];
		// loop through the characters
		for (let i = 0; i < characters.length; i++) {
			// get strokes data
			let sBefore = this._getLegendData(characters[i].before, "code", this.strokes),
				sAfter = this._getLegendData(characters[i].after, "code", this.strokes);
			output.push(new Character(characters[i].char, sBefore, sAfter));
		}
		// return output
		return output;
	}
	/**
	 * builds array of stroke pairs and calculates their kerning weights
	 * @param [array] this.strokes - the input data of individuals strokes
	 * @return [array] output - array of every stroke pair
	 */
	KernBot.prototype._buildPairs = function(array) {
		// output
		let output = [];
		// 2D loop through types
		for (let x = 0; x < this[array].length; x++) {
			// switch for which array to build
			switch (this[array][x].constructor.name) {
				// characters
				case "Character":
					for (let y = 0; y < this[array].length; y++) {
						let strokeData = this._getLegendData(
							this[array][x].strokes.after.code+this[array][y].strokes.after.code,
							"key",
							this.strokePairs
						);
						output.push(new CharacterPair(this[array][x], this[array][y], strokeData));
					}
					break;
				// strokes
				case "Stroke":
					for (let y = 0; y < this[array].length; y++) {
						output.push(new StrokePair(this[array][x], this[array][y]));
					}
					break;
				// incorrect usage
				default:
					return false;
					break;
			}
		}
		// return output
		return output;
	}
	/**
	 * Sorting function
	 * @param "string" field - the field to sort by
	 * @param (boolean) reverse - reverse the order? True or False
	 * @param f(x) primer - the function by which to determine the sort order
	 * 		EX: array.sort(sort_by('price', true, parseInt));
	 * 			array.sort(sort_by('city', false, function(a){return a.toUpperCase()}));
	 * @return [array] f(x) - a recursive function that returns the elements sorted
	 */
	KernBot.prototype._sortBy = function(field, reverse, primer) {
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
	/**
	 * Gets data from a legend
	 * @param "string" key - the key to search the legend for
	 * @param "string" property - the legend property to find the key in
	 * @param [array] legend - the legend to search through
	 * @return {object} legend[i] - an element by key[i] in the supplied legend
	 */
	KernBot.prototype._getLegendData = function(key, property, legend) {
		// loop through the legend
		for (let i = 0; i < legend.length; i++) {
			// check character match
			if (legend[i][property] === key) {
				// return match character data
				return legend[i];
			}
		}
	}
	/**
	 * Updates the KernBot array of HTML elements
	 * @param "string" selector - an array of selectors to get the HTML for
	 * @return [array] output - an array of HTML elements
	 */
	KernBot.prototype._gatherElements = function(selectors) {
		// output
		let output = [];
		// loop through selectors
		for (let i = 0; i < selectors.length; i++) {
			// switch
			switch (selectors[i].substring(0,1)) {
				// IDs
				case "#":
					// get ID elements
					let byID = document.getElementById(selectors[i].substring(1));
					// add HTMLelement
					output.push(byID);
					break;
				// Classes
				case ".":
					// get class elements
					let byClass = document.getElementsByClassName(selectors[i].substring(1));
					// loop through individual elements
					for (let x = 0; x < byClass.length; x++) {
						// add HTMLelement
						output.push(byClass[x]);
					}
					break;
				// HTML tag
				default:
					// get tag elements
					let byTag = document.getElementsByTagName(selectors[i].toUpperCase());
					// loop through individual elements
					for (let x = 0; x < byTag.length; x++) {
						// add HTMLelement
						output.push(byTag[x]);
					}
					break;
			}
		}
		// return output
		return output;
	}
	/**
	 * Checks KernBot sequences to see if the element has already been kerned
	 * @param {object} element - an HTML element
	 * @return (boolean) T/F - True if element exists in sequence
	 */
	KernBot.prototype._checkElementKerned = function(element) {
		// loop through all the sequences KernBot has already acted on
		for (let i = 0; i < this.sequences.length; i++) {
			// check element exists in the sequence context
			return (this.sequences[i].context === element ? true : false);
		}
	}
	/**
	 * Outputs a sequence of characters and tags
	 * @param "string" string - the string the break down into
	 * @return [array] output - an ordered sequence of Nodes
	 */
	KernBot.prototype._stringToSequence = function(string) {
		// output
		let output = [],
			elementExpression = /(<([^>]+)>)/ig,
			tags = string.match(elementExpression),
			parsedString = [string];
		// check if the string has HTML tags inside it
		if (null !== tags) {
			parsedString = this._parseStringFragments(string, tags);
		}
		// loop through parsed string fragments
		for (let x = 0; x < parsedString.length; x++) {
			// check if string fragment is an HTML tag
			if (elementExpression.test(parsedString[x])) {
				// add tag to output
				output.push(new Tag(parsedString[x]));
			} else {
				// loop through the string
				for (let y = 0; y < parsedString[x].length; y++) {
					// vars
					let currentChar = this._getLegendData(parsedString[x][y], "char", this.characters);
					// add character to output
					output.push(new Character(currentChar.char, currentChar.strokes.before, currentChar.strokes.after));
				}
			}
		}
		// return sequence
		return output;
	}
	/**
	 * Outputs a array of string fragments
	 * @param "string" string - the string the break down into
	 * @param [array] tags - a list of tags within the string
	 * @return [array] output - an array of string fragments
	 */
	KernBot.prototype._parseStringFragments = function(string, tags) {
		// output
		let output = [];
		// loop through tags
		for (let i = 0; i < tags.length+1; i++) {
			// if last loop
			if (i === tags.length) {
				// add remaining string
				output.push(string);
				// break out of loop
				break;
			}
			// string parse vars
			let start = string.indexOf(tags[i]),
				end = start + tags[i].length,
				tag = string.slice(start, end),
				before = string.slice(0,start);
			// update parsed string
			string = string.slice(end);
			// add element fragment
			output.push(before);
			output.push(tag);
		}
		// return output
		return output;
	}
	/**
	 * Loops through a sequence in context and calculates the kerning of each Node
	 * @param [array] sequence - the letters to calculate kerning for
	 * @return [array] output - an ordered sequence of kerned Nodes
	 */
	KernBot.prototype._calcSequenceKerning = function(context, sequence) {
		// output
		let output = [],
			fontSize = parseFloat(getComputedStyle(context).fontSize);
		// loop through sequence
		for (let i = 0; i < sequence.length; i++) {
			// vars
			let classIndex = i+1,
				current = sequence[i],
				next = sequence[i+1],
				afterNext = sequence[i+2],
				currentChar = null,
				nextChar = null,
				charPair = null,
				kerning = 0,
				letterSpace = "";
			// if no next character, break out of look
			if (undefined === next) { break; }
			// get char pair data
			charPair = this._getLegendData(
				current.char + next.char,
				"pair",
				this.characterPairs
			) || null;
			// calc kerning if there is a character pair
			if (null !== charPair) {
				// calculate kerning & letter-spacing
				kerning = ( Math.round((charPair.weight*100)/100).toFixed(2) / -100 ) * fontSize;
				letterSpace = kerning.toString().substring(0, 5);
				// set the kerning of the sequence Node
				sequence[i]._addKerning(kerning);
				sequence[i]._addLetterSpace(letterSpace);
			}
			// add sequence item to output
			output.push(sequence[i]);
		}
		// return updated sequence
		return output;
	}
	/**
	 * Returns an HTML string
	 * @param [array] sequence - kerned characters sequence
	 * @return "string" HTMLstring - injects Node character between
	 *         a <span> with class char# and letter-spacing styles
	 */
	KernBot.prototype._prepareHTMLString = function(sequence) {
		// vars
		let HTMLstring = "";
		// loop through the sequence
		for (let i = 0; i < sequence.length; i++) {
			// add span to html string
			HTMLstring += "<span class=\"" + "char-" + (i+1) + "\" style=\"letter-spacing:" + sequence[i].letterSpace + "px" + ";\">";
			HTMLstring += sequence[i].char;
			HTMLstring += "</span>";
		}
		// return string
		return HTMLstring;
	}
	/**
	 * Updates an elements innerHTML to its kerned sequence data
	 * @param {object} element - an html element to calculate kerning data
	 * @return 'this' this - makes method chainable
	 */
	KernBot.prototype._updateElementHTML = function(element, HTML) {
		// write the kerned string to the elements HTML
		element.innerHTML = HTML;
		// return this
		return this;
	}

	//	NODE TRACKING
	// ===========================================================================
	/**
	 * Updates the Node data for each 'this.sequence' in KernBot
	 * @return 'this' this - makes method chainable
	 */
	KernBot.prototype._update = function() {
		// loop through each sequence
		for (let x = 0; x < this.sequences.length; x++) {
			// vars
			let context = this.sequences[x].context,
				sequence = this.sequences[x].sequence;
			// loop through the sequence
			for (let i = 0; i < sequence.length; i++) {
				// vars
				let current = sequence[i],
					next = sequence[i+1],
					index = i+1,
					currentChar = this._getLegendData(current.char, "char", this.characters),
					nextChar = null,
					charPair = null;
				// track Node
				this._trackNode(context, currentChar, index);
				// if node has a next character
				if (undefined !== currentChar && next && next.constructor.name !== "Tag") {
					// get next char in sequence
					nextChar = this._getLegendData(next.char, "char", this.characters);
					// get char pair data
					charPair = this._getLegendData(currentChar.char+nextChar.char, "pair", this.characterPairs);
					// track NodePair
					this._trackNodePair(context, charPair, index);
				}
			}
		}
		// log KernBot
		console.log(this);
		// return KernBot
		return this;
	}
	/**
	 * Keeps track of which node have been kerned
	 * @param {object} context – the HTML element which KernBot is acting on
	 * @param [array] sequence - an array of character objects
	 * @return (number) 0 or >1 - (0 if updated Node), (nodes.length > 1 if added new Node)
	 */
	KernBot.prototype._trackNode = function(context, node, index) {
		// ensure input is a Node
		if (undefined !== node) {
			// get node data
			let checkNode = this._getLegendData(node.char, "key", this.nodes) || false,
				checkContext = this._checkSameContext(checkNode.context, context) || false;
			// check node exists in this context
			if (checkNode && checkContext) {
				// increase count of the this Node
				checkNode._increaseCount(1);
				// add the string index of this new instance of the Node
				checkNode._addCharIndex(index);
				// return true
				return 0;
			} else {
				// create a new node to track in context
				return this.nodes.push(new Node(context, node, index));
			}
		}
	}
	/**
	 * Keeps track of input node pair in a given context
	 * @param {object} context – the HTML element which KernBot is acting on
	 * @param {object} pair - the character pair to make a node pair of
	 * @param (num) index - the index of the first character in the node pair
	 * @return 'this' this - makes method chainable
	 */
	KernBot.prototype._trackNodePair = function(context, node, index) {
		// get node data
		let checkNodePair = this._getLegendData(node.pair, "pair", this.nodePairs) || false,
			checkContext = this._checkSameContext(checkNodePair.context, context) || false,
			kerning = { "kern": null, "weight": null, "letterSpace": null },
			fontSize = parseFloat(getComputedStyle(context).fontSize);
		// check node exists in this context
		if (checkNodePair && checkContext) {
			// increase count of the this Node
			checkNodePair._increaseCount(1);
			// add the string index of this new instance of the Node
			checkNodePair._addCharPairIndex(index);
			// return true
			return true;
		} else {
			// gather kerning data for node
			kerning.kern = ( Math.round((node.weight*100)/100).toFixed(2) / -100 ) * fontSize;
			kerning.weight = node.weight;
			kerning.letterSpace = kerning.kern.toString().substring(0, 5);
			// create a new node pair to track in context
			return this.nodePairs.push(new NodePair(context, node, index, kerning));
		}
	}
	/**
	 * Checks if two DOM elements are the same
	 * @param {object} element - the element to find
	 * @param {object} context - the context to check the element against
	 * @return (boolean) T/F
	 */
	KernBot.prototype._checkSameContext = function(element, context) {
		return (element === context ? true : false);
	}

	// KERNBOT TRAINING
	// ===========================================================================
	// output nodes to page
	KernBot.prototype.writeNodePairsToHTML = function(trainerID) {

		console.log(this);

		// vars
		let trainerHTML = document.getElementById(trainerID.substring(1)),
			HTMLstring = "<ul>";
		// loop through counted NodePairs
		for (let i = 0; i < this.nodePairs.length; i++) {
			// vars
			let elm = this.nodePairs[i],
				tag = elm.context.tagName.toLowerCase();
			HTMLstring += "<li>";
				HTMLstring += "<" + tag + ">";
					HTMLstring += "“";
					HTMLstring += "<span style=\"letter-spacing:" + elm.letterSpace + "px;\">";
					HTMLstring += elm.c1.char;
					HTMLstring += "</span>";
					HTMLstring += "<span>";
					HTMLstring += elm.c2.char;
					HTMLstring += "</span>"
					HTMLstring += "”";
				HTMLstring += "</" + tag + ">";
				HTMLstring += "<hr style=\"margin: 1em 0em\">";
				HTMLstring += "<p>";
					HTMLstring += "HTML context: ";
					HTMLstring += "&lt;" + tag + "&gt;";
				HTMLstring += "<br>";
					HTMLstring += "Kern Weight: ";
					HTMLstring += elm.weight;
				HTMLstring += "<br>";
					HTMLstring += "Letter Spacing: ";
					HTMLstring += elm.letterSpace + "px";
				HTMLstring += "<br>";
					HTMLstring += "Occurrences: ";
					HTMLstring += elm.count;
				HTMLstring += "</p>";
			HTMLstring += "</li>";
		}
		HTMLstring += "</ul>";
		return trainerHTML.innerHTML = HTMLstring;
	}

	// KERNBOT IN GLOBAL SPACE
	// ===========================================================================
	// Initialize the KernBot object methods
	KernBot.init.prototype = KernBot.prototype;
	// create "$KB" alias in the global object (shorthand)
	global.KernBot = global.$KB = KernBot;
	// return true if everything loaded properly
	return true;
// execute IIFE and pass dependencies
} (window, undefined));