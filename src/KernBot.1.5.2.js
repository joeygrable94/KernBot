/*

Author: Joey Grable
Version: 1.5.X
GIT: github.com/joeygrable94/KernBot

A javascript library that dynamically kerns characters based on their context.
KernBot uses traditional calligraphy methods to categorize letters by the types
of letter strokes they are comprised of. It then calculates the relative value
letter-spacing by comparing the character's stroke types to the adjacent letters.

RegEx
	start or end tag	=> new RegExp("<(.|\n|\d)*?>|</(.|\n|\d)*?>", "g");
	start tag			=> new RegExp("<(.|\n|\d)*?>", "g");
	end tag				=> new RegExp("</", "g");
	&entity; or &123;	=> new RegExp("&(.|\n)*?;|&#(.|\d)*?;", "g");

*/

// should KernBot accept jQuery to handle events and/or DOM manipulation => NO, wanted an ES6 solution?
(function(global, undefined) {

	// becuase javascript...
	"use strict";

	// window obj
	const root = global;
	const doc = document;
	const contextClass = "kb-context";
	const nodeClass = "kb-char";





//	HELPER FUNCTIONS (GLOBAL CONTEXT)
// ===========================================================================
	/**
	 * Gets data from a legend
	 * @param "string" key - the key to search the legend for
	 * @param "string" property - the legend property to find the key in
	 * @param [array] legend - the legend to search through
	 * @return {object} legend[i] - an element by key[i] in the supplied legend
	 */
	const _getLegendData = function(key, property, legend) {
		// output
		let output = null;
		// loop through the legend
		for (let i = 0; i < legend.length; i++) {
			// check property matches key
			if (legend[i][property] === key) {
				// return matching value in legend
				output = legend[i];
			}
		}
		// check there is an output and return it, or return false
		return (null !== output) ? output : false;
	};
	/**
	 * Checks if an array contains a value
	 * @param "string"/{object}/[array] needle — the item being searched for
	 * @param [array] hayArray - the array to search through
	 * @return (boolean) T/F
	 **/
	const _arrayContains = function(needle, hayArray) {
		return (hayArray.indexOf(needle) > -1);
	}
	/**
	 * Removes a specified item from an array if it exists
	 * @param "string"/{object}/[array] item - the item to find and remove
	 * @param [array] from - the array to remove the item from
	 * @return 
	 */
	const _arrayRemove = function(item, from) {
		var found = from.indexOf(item);
		if (found !== -1) {
			from.splice(found, 1);
			found = from.indexOf(item);
		}
	}
	/**
	 * Sorting function
	 * @param "string" field - the field to sort by
	 * @param (boolean) reverse - reverse the order? True or False
	 * @param f(x) primer - the function by which to determine the sort order
	 * 		EX: array.sort(_sortBy('weight', false, parseInt}));
	 * @return [array] f(x) - a recursive function that returns the elements sorted
	 */
	const _sortBy = function(field, reverse, primer) {
		// store key
		let key = primer ?
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
	};
	/**
	 * Returns true if it is a DOM element
	 * @param {object} html - an html element to check
	 * @return (boolean) T/F
	 */
	const _isElement = function(html) { return (
			typeof HTMLElement === "object" ?
			html instanceof HTMLElement :
			html && typeof html === "object" && html !== null && html.nodeType === 1 && typeof html.nodeName === "string"
	)};
	/**
	 * Tests whether a given node is inside of a given context
	 * @param {object} node - the node to start from
	 * @param {object} context - the context to search for
	 * @return (boolean) - T/F
	 */
	const _isInside = function(node, context) {
		// loop through each parent
		for (; node != null; node = node.parentNode) {
			// if the node's parent matches its context
			if (node == context) { return true; }
		}
		// return false
		return false;
	};
	/**
	 * Returns if an html element is a DOM node
	 * @param {object} html - an html element to check if is a DOM node
	 * @return (boolean) T/F
	 */
	 const _isNode = function(html) { return (
			typeof Node === "object" ?
			html instanceof Node :
			html && typeof html === "object" && typeof html.nodeType === "number" && typeof html.nodeName === "string"
	)};
	/**
	 * converts an html string to html nodes
	 * @param "string" html - an html string to convert to an html element
	 * @return {object} HTML nodes array or false if can't convert string to node
	 */
	const _toNodes = function(html) {
		return new DOMParser().parseFromString(html,'text/html').body.childNodes || false;
	};
	/**
	 * Updates an elements innerHTML to its kerned sequence data
	 * @param {object} element - an html element to calculate kerning data
	 * @param "string" HTML - the html to put in the innerHTML of the element
	 * @return write the kerned string to the elements HTML
	 */
	const _updateElementHTML = function(element, HTML) {
		// return: write the kerned string to the elements HTML
		return (element.innerHTML = HTML) ? true : false;
	};
	/**
	 * Returns the specific querySelector string for an element
	 * @param {object} element - an html element to calculate kerning data
	 * @return write the kerned string to the elements HTML
	 */
	const _getElementTagIDandClasses = function(element) {
		// gather sequence vars
		let tag = element.tagName.toLowerCase(),
			classes = element.classList || false,
			ids = element.getAttribute("id") || false,
			querySelector = tag;
		// set id
		if (ids) { querySelector += "#"+ids; }
		// set classes
		for (let i = 0; classes && i < classes.length; i++) {
				querySelector += "."+classes[i];
		}
		// return querySelector
		return querySelector;
	};
	/**
	 * builds array of stroke data
	 * @param [array] array - an array of character or entity objects with defined stroke data (before & after)
	 * @return [array] output - array of all the characters KernBot is aware of
	 */
	const _buildCharacterStrokes = function(chars, strokes) {
		// return var
		let output = [];
		// loop through the characters
		for (let i = 0; i < chars.length; i++) {
			// get strokes data
			let sBefore = _getLegendData(chars[i].b, "code", strokes),
				sAfter = _getLegendData(chars[i].a, "code", strokes);
			// add new character to output
			output.push(new Character(chars[i].char, sBefore, sAfter, chars[i].entity, chars[i].number));
		}
		// return output
		return output;
	};
	/**
	 * builds array of stroke pairs and calculates their kerning weights
	 * @param [array] this.strokes - the input data of individuals strokes
	 * @return [array] output - array of every stroke pair
	 */
	const _buildStrokePairs = function(strokes) {
		// output
		let output = [];
		// 2D loop through types
		for (let x = 0; x < strokes.length; x++) {	
			for (let y = 0; y < strokes.length; y++) {
				output.push(new StrokePair(strokes[x], strokes[y]));
			};
		};
		// return output
		return output;
	};





//	CLASSES
// ===========================================================================
	/**
	 * CHARACTERS
	 * 
	 * simple Obj with characters and their associated stroke data
	 */
	class Character {
		constructor(char, before, after, entity, number) {
			this.char = char;
			this.strokes = {
				"b": before,
				"a": after
			};
			this.entity = entity || null;
			this.number = number || null;
		};
	};
	/**
	 * CHARACTERPAIRS
	 * 
	 * pairs of characters and their associated strokes
	 */
	class CharacterPair {
		constructor(c1, c2, strokeData) {
			console.log(strokeData);
			this.pair = c1.char + c2.char;
			this.c1 = c1;
			this.c2 = c2;
			this.kerning = strokeData;
			this.weight = strokeData.weight;
			this.letterSpace;
		};
		_addLetterSpace(value) { return this.letterSpace = value; };
	};
	/**
	 * STROKE
	 * 
	 * simple Obj with a stroke code, its associated kerning weight
	 * and a brief descriptor of the stroke type
	 */
	class Stroke {
		constructor(s, w, desc) {
			this.code = s;
			this.weight = w;
			this.desc = desc;
		};
	};
	/**
	 * STROKEPAIR
	 * 
	 * stroke combinations and their calculated kerning weight
	 */
	class StrokePair {
		constructor(s1, s2) {
			this.key = s1.code + s2.code;
			this.s1 = s1;
			this.s2 = s2;
			this.weight = this.calcWeight();
		};
		calcWeight() { return Math.round(this.s1.weight.value + this.s2.weight.value); };
	};
	/**
	 * ELEMENT
	 * 
	 * HTML <tags> and &entities; in a sequence
	 */
	class Element {
		constructor(string, elm, start, end, isEntity) {
			this.string = string;				// the original string the entity appears in
			this.char = elm;					// the characters
			this.range = [start, end];			// the start & end index of the element in the original string
			this.isEntity = isEntity || false;	// entities are rendered, <tags> are not
		};
	};
	/**
	 * NODE
	 * 
	 * nodes in a sequence for a specific context
	 * contains context and sequence specific kerning data (weight)
	 */
	class Node {
		constructor(context, node, classIndex, isTag=false) {
			this.context = context;
			this.class = classIndex;
			this.indexes = [classIndex];
			this.char = node.char;
			this.data = node;
			this.isTag = isTag;
			this.isTagClosure = this._checkIsTagEnd(node, isTag);
			this.weight = new Subject(0);
			this.kerning = new Subject(0);
			this.count = 0;
			this._increaseCount(1);
		};
		// chech if is <tag>, then test if is a closure </tag>
		_checkIsTagEnd(node, tag) { return tag ? /<\//g.test(node.char) : false; };
		// increase the instance count
		_increaseCount(value=1) { return this.count += value; };
		// add index to instance
		_addCharIndex(index) { return this.indexes.push( index ); };
		// assess weight
		_setWeight(value) { return this.weight.assess(value); };
		// assess kerning
		_setKerning(value) { return this.kerning.assess(value); };
	};
	/**
	 * NODEPAIR
	 */
	class NodePair {
		// build pair
		constructor(context, c1, c2, index) {
			this.context = context;
			this.indexes = [[index, index+1]];
			this.char = c1.char + c2.char;
			this.c1 = {
				char: c1.char,
				strokes: {
					b: c1.data.strokes.b,
					a: c1.data.strokes.a
				}
			};
			this.c2 = {
				char: c2.char,
				strokes: {
					b: c2.data.strokes.b,
					a: c2.data.strokes.a
				}
			};
			this.weight = {
				c1: c1.data.strokes.a.weight,
				c2: c2.data.strokes.b.weight,
				total: c1.data.strokes.a.weight + c2.data.strokes.b.weight
			}
			this.kerning = new Subject(this._calcKerning(context));
			this.letterSpace = this._setLetterSpace();
			this.count = 0;
			// run methods
			this._increaseCount(1);
		};
		// calc kerning relative to context fontsize
		_calcKerning(context) {
			let fontSize = parseFloat(getComputedStyle(context).fontSize);
			return ((Math.round((this.weight.total*100)/100).toFixed(2) / 100 ) * fontSize);
		};
		// set letter spacing from kerning value
		_setLetterSpace() { return ("-" + this.kerning.value.toString().substring(0, 5) + "px"); };
		// increase the existance count
		_increaseCount(val=1) { return this.count += val; };
		// add a pair of indexes of where in a sequence the charPair exists
		_addCharIndex(pos) { return this.indexes.push([pos, pos+1]); };
	};
	/**
	 * SEQUENCE
	 * 
	 * conains the context, string, and node data
	 * used by KernBot to kern this sequence
	 */
	class Sequence {
		// constructor
		constructor(context) {
			this.context = context;
			this.string = context.innerHTML;
			this.nodes = this._convertStringToNodes();
			this.pairs = this._calcKerningFromNodePairs();
			this.nodeStrings = this._prepareKernedNodeString();
			this.isKerned = false;
		};
		/**
		 * Outputs a sequence of nodes (parsed characters, <tags> and &entities;)
		 * @param {object} context - the COM context (element) the string exists at
		 * @param "string" string - the string the break down into
		 * @return [array] output - an ordered sequence of Nodes
		 */
		_convertStringToNodes() {
			// vars
			let sequence = [],
				elements = this._parseStringElements(this.string);
			// outer loop vars
			let lastElementChar = false,
				classIndex = 0;
			// loop through the string
			for (let i = 0; i < this.string.length; i++) {
				// loop vars
				let charNow = _getLegendData(this.string[i], "char", CharacterData) || false,
					elmNow = this._checkIndexElementsRange(i, elements),
					elmNext = this._checkIndexElementsRange(i+1, elements),
					inject = false,
					seqNode = null;
				// update the class index
				classIndex++;
				// INJECT CHARACTER (NOT ELEMENT)
				// if not injecting an element and current character exists
				if (charNow && !elmNow) {
					// set the char node
					seqNode = new Node(this.context, charNow, classIndex);
				}
				// INJECT ELEMENT (NOT CHARACTER)
				// START OF ELEMENT: if injecting element next and not NOW
				if (!elmNow && elmNext) {
					// save last element char for loop ref
					lastElementChar = elmNext.char.slice(-1);
				}
				// END OF ELEMENT: if injecting now, NOT injecting next, and loop is at last element char
				if ((elmNow && !elmNext) && (lastElementChar && this.string[i] == lastElementChar)) {
					// update the class index depending on the injected item length
					classIndex -= (elmNow.char.length-1);
					// inject an &entity; now
					if (elmNow.isEntity) {
						// get the entity to inject
						inject = _getLegendData(elmNow.char, "entity", CharacterData)
							  || _getLegendData(elmNow.char, "number", CharacterData);
						// set the node for the $entity;
						seqNode = new Node(this.context, inject, classIndex);
					// inject an <element> now
					} else {
						// set the node for a <tag>
						seqNode = new Node(this.context, elmNow, classIndex, true);
					}
				}
				// if node exists
				if (seqNode) {
					// inject node into sequence
					sequence.push(seqNode);
				}
			}
			// return sequence
			return sequence;
		};
		/**
		 * Parses HTML <tags> and &entity; from a string and returns those string elements in an array
		 * @param "string" string - the string the break down into
		 * @return [array] output - the elements in the string and associated data
		 */
		_parseStringElements(string) {
			// parser vars
			let output = [],
				items = string.match(/<(.|\n|\d)*?>|&(.|\n)*?;|&#(.|\d)*?;/g);
			// loop through elms
			for (let i = 0; items && i < items.length; i++) {
				// splice vars
				let start = string.indexOf(items[i]),
					end = start + items[i].length,
					element = string.slice(start, end),
					isEntity = /&(.|\n)*?;|&#(.|\d)*?;/g.test(element);
				// store the element in an array for now
				output.push(new Element(string, element, start, end, isEntity));
			}
			// return array of elements data in the string
			return output;
		};
		/**
		 * Check if current index is between the indexes of an element to inject
		 * @param (number) index - a point in a loop
		 * @param [array] array - the elements to loop through and check their index range
		 * @return {object} element or (boolean) False - the element that the index belongs to
		 */
		_checkIndexElementsRange(index, array) {
			// loop through the elements
			for (let i = 0; i < array.length; i++) {
				// check if current index is between the indexes of an element to inject
				if (array[i].range[0] <= index && index < array[i].range[1]) {
					// return the element within range
					return array[i];
				}
			}
			// return false
			return false;
		};
		/** 
		 * Looks at node pairs and calculates the first node's letter-spacing
		 * @param {object} context - the HTML context (element) the string exists at
		 * @param [array] sequence - the sequence of nodes from input string
		 * @return [array] nodePairs - all the combinations of nodePairs (node-node) in the sequence
		 */
		_calcKerningFromNodePairs() {
			// output & loop vars
			let nodePairs = [],
				before = null;
			// loop through the sequence
			for (let i = 0; i < this.nodes.length; i++) {
				// loop vars
				let current = this.nodes[i],
					next = this.nodes[i+1] || false,
					charPair = false,
					charNodePair = false,
					classIndex = i+1;

				//console.log(current);

				// in order to kern, there must be an adjacent character (next)
				if (next) {
					// CHAR | CHAR
					if (!current.isTag && !next.isTag) {
						// create nodePair
						charNodePair = new NodePair(this.context, current, next, classIndex);
						// store node pair to output
						nodePairs.push(charNodePair);
						// add char pair kerning data to current sequence node
						current._setWeight(charNodePair.weight.total);
						current._setKerning(charNodePair.kerning.value);
					}
					// CHAR | TAG
					if (!current.isTag && next.isTag) {
						// set the current node to the item before the tag
						before = current;
					}
					// TAG | CHAR + before tag is char
					if (current.isTag && !next.isTag && before) {
						// create nodePair
						charNodePair = new NodePair(this.context, before, next, classIndex);
						// store node pair to output
						nodePairs.push(charNodePair);
						// add char pair kerning data to sequence node
						before.weight = before.data.strokes.a.weight + next.data.strokes.b.weight;
						before.kerning = charNodePair.kerning;
					}
				}
			}
			// return array
			return nodePairs;
		};
		/**
		 * Prepares a kerned node as an HTML string an returns them in an array
		 * @param [array] sequence - kerned characters sequence
		 * @return [array] output - an array of each html element as a string
		 *         a <span> with class char# and letter-spacing styles
		 */
		_prepareKernedNodeString() {
			// vars
			let output = [];
			// loop through the sequence
			for (let i = 0; i < this.nodes.length; i++) {
				// vars
				let currentChar = this.nodes[i];
				// check this sequence item type, write correct HTML
				// ELEMENT
				if (currentChar.isTag) {
					// element vars, &entity; or <tag>
					let currentElm = _toNodes(currentChar.char)[0] || false;
					// if is an html <tag>
					if (currentElm && _isElement(currentElm)) {
						// add element class
						currentElm.classList.add(nodeClass);
						currentElm.classList.add("elm-" + currentChar.class);
						// get the start tag of the element
						currentChar.char = currentElm.outerHTML.match(/<(.|\n|\d)*?>|&(.|\n)*?;|&#(.|\d)*?;/g)[0];
					}
					// add element to HTML
					output.push(currentChar.char);
				// NODE
				} else {
					// inject node into a span wrapper with kerning data
					let nodeString = "",
						currentNode = null;
					nodeString += "<span class=\"" + nodeClass + " char-" + this.nodes[i].class + "\">";
					nodeString += this.nodes[i].char;
					nodeString += "</span>";
					// add element to output
					output.push(nodeString);
				}
			}
			// return output
			return output;
		}
	};
	/**
	 * MEDIATOR
	 * 
	 * used by KB.UI to mediate event handling
	 * 
	 * TODO:
	 * - add an Eventer.JS to simplify the html code (clean up DOM)
	 */
	class Mediator {
		// constructor
		constructor() {
			// types of handlers
			this.handlers = {
				all: []		// runs on all actions
			}
		};
		// add a f(x) handler to the Mediator
		on(type, fn, context=this) {
			type = type || "all";
			fn = typeof fn === "function" ? fn: context[fn];
			if (typeof this.handlers[type] === "undefined") {
				this.handlers[type] = [];
			}
			this.handlers[type].push({ fn: fn, context: context });
		};
		// remove a f(x) handler from the Mediator
		remove(type, fn, context=this) {
			try {
				this._getHandlers("remove", type, fn, context);
			} catch(error) {
				console.warn(error);
			}
		};
		// act on a handler type, passing along any supplied data
		act(type, data) {
			try {
				this._getHandlers("act", type, data);
			} catch(error) {
				console.warn(error);
			}
		};
		// returns the f(x) handlers for a specific Mediator type
		_getHandlers(action, type, arg, context=this) {
			type = type || "all";
			let handlers = this.handlers[type];
			for (let i = 0; handlers && i < handlers.length; i++) {
				switch (action) {
					case "act":
						handlers[i].fn.call(handlers[i].context, arg);
						break;
					case "remove":
						if (handlers[i].fn === arg && handlers[i].context === context) {
							handlers.splice(i,1);
						} else {
							throw "Mediator._getHandlers => not a valid handler action";
						}
						break;
					default:
						throw "invalid handler action";
						break;
				}
			}
		};
	};
	/**
	 * SUBJECT
	 * 
	 * maintains list of observers (any number of Observer objects may observe a Subject)
	 * lets observer objects subscribe or unsubscribe
	 * notifies observers when this subject's state changes
	 */
	class Subject {
		// constructor
		constructor(value, context) {
			// provided scope or window
			this.context = context || root;
			// data handlers | observers | watchers
			this.observers = [];
			// assess data
			this.value = this.assess(value);
			// return subjects value
			return this;
		};
		// assess the value of the data
		assess(data) {
			// TODO: implement a deep search to check if two objects or arrays are the EXACT same??
			// if a value provided and/or is different from the existing value
			if (arguments.length && data !== this.value) {
				// update the subject value
				this.value = data;
				// attempt to notify Observers of data changes
				try {
					// notify observers up data updates
					this._getObservers("update", data);
				} catch(error) {
					// log errors
					console.warn(error);
				}
			}
			// return this data
			return this.value;
		};
		// add an Observer f(x) to be notified of Subject data change
		subscribe(fn, ctx) {
			// check if a Observer specific context supplied or use Subject context
			ctx = ctx || this.context;
			// add input f(x) to handlers array
			this.observers.push({ fn: fn, context: ctx });
		};
		// remove an Observer f(x) that watches this Subject data
		unsubscribe(fn, ctx) {
			try {
				// check if a Observer specific context supplied or use Subject context
				ctx = ctx || this.context;
				this._getObservers("remove", fn, ctx);
			} catch(error) {
				// log errors
				console.warn(error);
			}
		};
		// returns the subject observers f(x)
		_getObservers(action, arg, ctx) {
			// loop through the observers
			for (let i = 0; this.observers && i < this.observers.length; i++) {
				switch (action) {
					case "remove":
						if (this.observers[i].fn === arg && this.observers[i].context === ctx) {
							this.observers.splice(i,1);
						} else {
							throw "Subject._getObservers => not a valid observer handler action";
						}
						break;
					case "update":
						this.observers[i].fn.call(this.observers[i].context, arg);
						break;
					default:
						throw "Subject._getObservers => invalid observer action";
						break;
				}
			}
		};
	};
	/**
	 * COMPUTE
	 * 
	 * a f(x) that computes a function on multiple Subjects (dependecies)
	 * when any Subject dependency changes the Compute f(x) handler is updated
	 */
	const Compute = function(dependencies, handler, context) {
		// initial value
		let initial = new Subject(handler(), context);
		// register this handler for each dependency
		let listener = function() { return initial.assess(handler()); };
		dependencies.forEach((dependency) => {
			dependency.subscribe(listener, context);
		});
		// restrict from manually updating Observer value
		let getter = () => initial;
		getter.subscribe = initial.subscribe;
		return getter();
	};





//	CHARACTER & STROKE DATA
// ===========================================================================
	let StrokeData = [
		new Stroke("n", 0, "no stroke weight"),
		new Stroke("l", 1, "vertical stroke"),
		new Stroke("o", 2, "round stroke"),
		new Stroke("u", 3, "up slant stroke"),
		new Stroke("d", 3, "down slant stroke"),
		new Stroke("x", 1.5, "special case 1"),
		new Stroke("y", 2.5, "special case 2"),
		new Stroke("z", 3.5, "special case 3")
	];
	//	Characters
	let CharacterData = [
		{ "char": " ", "b": "n", "a": "n", "entity": null, "number": "&#32;", },
		{ "char": "!", "b": "l", "a": "l", "entity": null, "number": "&#33;", },
		{ "char": "\"", "b": "z", "a": "z", "entity": null, "number": "&#34;", },
		{ "char": "#", "b": "u", "a": "u", "entity": null, "number": "&#35;", },
		{ "char": "$", "b": "l", "a": "l", "entity": null, "number": "&#36;", },
		{ "char": "%", "b": "z", "a": "z", "entity": null, "number": "&#37;", },
		{ "char": "&", "b": "o", "a": "d", "entity": "&amp;", "number": "&#38;", },
		{ "char": "'", "b": "l", "a": "l", "entity": null, "number": "&#39;", },
		{ "char": "(", "b": "o", "a": "z", "entity": null, "number": "&#40;", },
		{ "char": ")", "b": "z", "a": "o", "entity": null, "number": "&#41;", },
		{ "char": "*", "b": "o", "a": "o", "entity": null, "number": "&#42;", },
		{ "char": "+", "b": "z", "a": "z", "entity": null, "number": "&#43;", },
		{ "char": ",", "b": "z", "a": "l", "entity": null, "number": "&#44;", },
		{ "char": "-", "b": "z", "a": "z", "entity": null, "number": "&#45;", },
		{ "char": ".", "b": "z", "a": "n", "entity": null, "number": "&#46;", },
		{ "char": "/", "b": "u", "a": "u", "entity": null, "number": "&#47;", },
		{ "char": "0", "b": "o", "a": "o", "entity": null, "number": "&#48;", },
		{ "char": "1", "b": "l", "a": "l", "entity": null, "number": "&#49;", },
		{ "char": "2", "b": "l", "a": "l", "entity": null, "number": "&#50;", },
		{ "char": "3", "b": "l", "a": "o", "entity": null, "number": "&#51;", },
		{ "char": "4", "b": "u", "a": "l", "entity": null, "number": "&#52;", },
		{ "char": "5", "b": "l", "a": "o", "entity": null, "number": "&#53;", },
		{ "char": "6", "b": "o", "a": "o", "entity": null, "number": "&#54;", },
		{ "char": "7", "b": "z", "a": "u", "entity": null, "number": "&#55;", },
		{ "char": "8", "b": "o", "a": "o", "entity": null, "number": "&#56;", },
		{ "char": "9", "b": "o", "a": "o", "entity": null, "number": "&#57;", },
		{ "char": ":", "b": "l", "a": "l", "entity": null, "number": "&#58;", },
		{ "char": ";", "b": "z", "a": "l", "entity": null, "number": "&#59;", },
		{ "char": "<", "b": "l", "a": "z", "entity": "&lt;", "number": "&#60;", },
		{ "char": "=", "b": "l", "a": "l", "entity": null, "number": "&#61;", },
		{ "char": ">", "b": "z", "a": "l", "entity": "&gt;", "number": "&#62;", },
		{ "char": "?", "b": "z", "a": "n", "entity": null, "number": "&#63;", },
		{ "char": "@", "b": "o", "a": "o", "entity": null, "number": "&#64;", },
		{ "char": "A", "b": "u", "a": "d", "entity": null, "number": "&#65;", },
		{ "char": "B", "b": "l", "a": "o", "entity": null, "number": "&#66;", },
		{ "char": "C", "b": "o", "a": "l", "entity": null, "number": "&#67;", },
		{ "char": "D", "b": "l", "a": "o", "entity": null, "number": "&#68;", },
		{ "char": "E", "b": "l", "a": "l", "entity": null, "number": "&#69;", },
		{ "char": "F", "b": "l", "a": "u", "entity": null, "number": "&#70;", },
		{ "char": "G", "b": "o", "a": "l", "entity": null, "number": "&#71;", },
		{ "char": "H", "b": "l", "a": "l", "entity": null, "number": "&#72;", },
		{ "char": "I", "b": "l", "a": "l", "entity": null, "number": "&#73;", },
		{ "char": "J", "b": "z", "a": "l", "entity": null, "number": "&#74;", },
		{ "char": "K", "b": "l", "a": "z", "entity": null, "number": "&#75;", },
		{ "char": "L", "b": "l", "a": "d", "entity": null, "number": "&#76;", },
		{ "char": "M", "b": "l", "a": "l", "entity": null, "number": "&#77;", },
		{ "char": "N", "b": "l", "a": "l", "entity": null, "number": "&#78;", },
		{ "char": "O", "b": "o", "a": "o", "entity": null, "number": "&#79;", },
		{ "char": "P", "b": "l", "a": "u", "entity": null, "number": "&#80;", },
		{ "char": "Q", "b": "o", "a": "o", "entity": null, "number": "&#81;", },
		{ "char": "R", "b": "l", "a": "z", "entity": null, "number": "&#82;", },
		{ "char": "S", "b": "z", "a": "z", "entity": null, "number": "&#83;", },
		{ "char": "T", "b": "d", "a": "u", "entity": null, "number": "&#84;", },
		{ "char": "U", "b": "l", "a": "l", "entity": null, "number": "&#85;", },
		{ "char": "V", "b": "d", "a": "u", "entity": null, "number": "&#86;", },
		{ "char": "W", "b": "d", "a": "u", "entity": null, "number": "&#87;", },
		{ "char": "X", "b": "z", "a": "z", "entity": null, "number": "&#88;", },
		{ "char": "Y", "b": "d", "a": "u", "entity": null, "number": "&#89;", },
		{ "char": "Z", "b": "l", "a": "l", "entity": null, "number": "&#90;", },
		{ "char": "[", "b": "l", "a": "z", "entity": null, "number": "&#91;", },
		{ "char": "\\", "b": "d", "a": "d", "entity": null, "number": "&#92;", },
		{ "char": "]", "b": "z", "a": "l", "entity": null, "number": "&#93;", },
		{ "char": "^", "b": "z", "a": "z", "entity": null, "number": "&#94;", },
		{ "char": "_", "b": "z", "a": "z", "entity": null, "number": "&#95;", },
		{ "char": "`", "b": "z", "a": "z", "entity": null, "number": "&#96;", },
		{ "char": "a", "b": "o", "a": "l", "entity": null, "number": "&#97;", },
		{ "char": "b", "b": "l", "a": "o", "entity": null, "number": "&#98;", },
		{ "char": "c", "b": "o", "a": "l", "entity": null, "number": "&#99;", },
		{ "char": "d", "b": "o", "a": "l", "entity": null, "number": "&#100;", },
		{ "char": "e", "b": "o", "a": "o", "entity": null, "number": "&#101;", },
		{ "char": "f", "b": "l", "a": "u", "entity": null, "number": "&#102;", },
		{ "char": "g", "b": "o", "a": "l", "entity": null, "number": "&#103;", },
		{ "char": "h", "b": "l", "a": "l", "entity": null, "number": "&#104;", },
		{ "char": "i", "b": "l", "a": "l", "entity": null, "number": "&#105;", },
		{ "char": "j", "b": "z", "a": "l", "entity": null, "number": "&#106;", },
		{ "char": "k", "b": "l", "a": "z", "entity": null, "number": "&#107;", },
		{ "char": "l", "b": "l", "a": "l", "entity": null, "number": "&#108;", },
		{ "char": "m", "b": "l", "a": "l", "entity": null, "number": "&#109;", },
		{ "char": "n", "b": "l", "a": "l", "entity": null, "number": "&#110;", },
		{ "char": "o", "b": "o", "a": "o", "entity": null, "number": "&#111;", },
		{ "char": "p", "b": "l", "a": "o", "entity": null, "number": "&#112;", },
		{ "char": "q", "b": "o", "a": "l", "entity": null, "number": "&#113;", },
		{ "char": "r", "b": "l", "a": "u", "entity": null, "number": "&#114;", },
		{ "char": "s", "b": "z", "a": "z", "entity": null, "number": "&#115;", },
		{ "char": "t", "b": "l", "a": "l", "entity": null, "number": "&#116;", },
		{ "char": "u", "b": "l", "a": "l", "entity": null, "number": "&#117;", },
		{ "char": "v", "b": "d", "a": "u", "entity": null, "number": "&#118;", },
		{ "char": "w", "b": "d", "a": "u", "entity": null, "number": "&#119;", },
		{ "char": "x", "b": "l", "a": "l", "entity": null, "number": "&#120;", },
		{ "char": "y", "b": "l", "a": "u", "entity": null, "number": "&#121;", },
		{ "char": "z", "b": "l", "a": "l", "entity": null, "number": "&#122;", },
		{ "char": "{", "b": "l", "a": "z", "entity": null, "number": "&#123;", },
		{ "char": "|", "b": "l", "a": "l", "entity": null, "number": "&#124;", },
		{ "char": "}", "b": "z", "a": "l", "entity": null, "number": "&#125;", },
		{ "char": "~", "b": "z", "a": "z", "entity": null, "number": "&#126;", },
		{ "char": "À", "b": "u", "a": "d", "entity": "&Agrave;", "number": "&#192;", },
		{ "char": "Á", "b": "u", "a": "d", "entity": "&Aacute;", "number": "&#193;", },
		{ "char": "Â", "b": "u", "a": "d", "entity": "&Acirc;", "number": "&#194;", },
		{ "char": "Ã", "b": "u", "a": "d", "entity": "&Atilde;", "number": "&#195;", },
		{ "char": "Ä", "b": "u", "a": "d", "entity": "&Auml;", "number": "&#196;", },
		{ "char": "Å", "b": "u", "a": "d", "entity": "&Aring;", "number": "&#197;", },
		{ "char": "Æ", "b": "u", "a": "l", "entity": "&AElig;", "number": "&#198;", },
		{ "char": "Ç", "b": "o", "a": "l", "entity": "&Ccedil;", "number": "&#199;", },
		{ "char": "È", "b": "l", "a": "l", "entity": "&Egrave;", "number": "&#200;", },
		{ "char": "É", "b": "l", "a": "l", "entity": "&Eacute;", "number": "&#201;", },
		{ "char": "Ê", "b": "l", "a": "l", "entity": "&Ecirc;", "number": "&#202;", },
		{ "char": "Ë", "b": "l", "a": "l", "entity": "&Euml;", "number": "&#203;", },
		{ "char": "Ì", "b": "l", "a": "l", "entity": "&Igrave;", "number": "&#204;", },
		{ "char": "Í", "b": "l", "a": "l", "entity": "&Iacute;", "number": "&#205;", },
		{ "char": "Î", "b": "l", "a": "l", "entity": "&Icirc;", "number": "&#206;", },
		{ "char": "Ï", "b": "l", "a": "l", "entity": "&Iuml;", "number": "&#207;", },
		{ "char": "Ð", "b": "l", "a": "o", "entity": "&ETH;", "number": "&#208;", },
		{ "char": "Ñ", "b": "l", "a": "l", "entity": "&Ntilde;", "number": "&#209;", },
		{ "char": "Ò", "b": "o", "a": "o", "entity": "&Ograve;", "number": "&#210;", },
		{ "char": "Ó", "b": "o", "a": "o", "entity": "&Oacute;", "number": "&#211;", },
		{ "char": "Ô", "b": "o", "a": "o", "entity": "&Ocirc;", "number": "&#212;", },
		{ "char": "Õ", "b": "o", "a": "o", "entity": "&Otilde;", "number": "&#213;", },
		{ "char": "Ö", "b": "o", "a": "o", "entity": "&Ouml;", "number": "&#214;", },
		{ "char": "Ø", "b": "o", "a": "o", "entity": "&Oslash;", "number": "&#216;", },
		{ "char": "Ù", "b": "l", "a": "l", "entity": "&Ugrave;", "number": "&#217;", },
		{ "char": "Ú", "b": "l", "a": "l", "entity": "&Uacute;", "number": "&#218;", },
		{ "char": "Û", "b": "l", "a": "l", "entity": "&Ucirc;", "number": "&#219;", },
		{ "char": "Ü", "b": "l", "a": "l", "entity": "&Uuml;", "number": "&#220;", },
		{ "char": "Ý", "b": "d", "a": "u", "entity": "&Yacute;", "number": "&#221;", },
		{ "char": "Þ", "b": "l", "a": "o", "entity": "&THORN;", "number": "&#222;", },
		{ "char": "ß", "b": "l", "a": "o", "entity": "&szlig;", "number": "&#223;", },
		{ "char": "à", "b": "o", "a": "l", "entity": "&agrave;", "number": "&#224;", },
		{ "char": "á", "b": "o", "a": "l", "entity": "&aacute;", "number": "&#225;", },
		{ "char": "â", "b": "o", "a": "l", "entity": "&acirc;", "number": "&#226;", },
		{ "char": "ã", "b": "o", "a": "l", "entity": "&atilde;", "number": "&#227;", },
		{ "char": "ä", "b": "o", "a": "l", "entity": "&auml;", "number": "&#228;", },
		{ "char": "å", "b": "o", "a": "l", "entity": "&aring;", "number": "&#229;", },
		{ "char": "æ", "b": "o", "a": "l", "entity": "&aelig;", "number": "&#230;", },
		{ "char": "ç", "b": "o", "a": "l", "entity": "&ccedil;", "number": "&#231;", },
		{ "char": "è", "b": "o", "a": "l", "entity": "&egrave;", "number": "&#232;", },
		{ "char": "é", "b": "o", "a": "l", "entity": "&eacute;", "number": "&#233;", },
		{ "char": "ê", "b": "o", "a": "l", "entity": "&ecirc;", "number": "&#234;", },
		{ "char": "ë", "b": "o", "a": "l", "entity": "&euml;", "number": "&#235;", },
		{ "char": "ì", "b": "l", "a": "l", "entity": "&igrave;", "number": "&#236;", },
		{ "char": "í", "b": "l", "a": "l", "entity": "&iacute;", "number": "&#237;", },
		{ "char": "î", "b": "l", "a": "l", "entity": "&icirc;", "number": "&#238;", },
		{ "char": "ï", "b": "l", "a": "l", "entity": "&iuml;", "number": "&#239;", },
		{ "char": "ð", "b": "o", "a": "o", "entity": "&eth;", "number": "&#240;", },
		{ "char": "ñ", "b": "l", "a": "l", "entity": "&ntilde;", "number": "&#241;", },
		{ "char": "ò", "b": "o", "a": "o", "entity": "&ograve;", "number": "&#242;", },
		{ "char": "ó", "b": "o", "a": "o", "entity": "&oacute;", "number": "&#243;", },
		{ "char": "ô", "b": "o", "a": "o", "entity": "&ocirc;", "number": "&#244;", },
		{ "char": "õ", "b": "o", "a": "o", "entity": "&otilde;", "number": "&#245;", },
		{ "char": "ö", "b": "o", "a": "o", "entity": "&ouml;", "number": "&#246;", },
		{ "char": "ø", "b": "o", "a": "o", "entity": "&oslash;", "number": "&#248;", },
		{ "char": "ù", "b": "z", "a": "z", "entity": "&ugrave;", "number": "&#249;", },
		{ "char": "ú", "b": "l", "a": "l", "entity": "&uacute;", "number": "&#250;", },
		{ "char": "û", "b": "l", "a": "l", "entity": "&ucirc;", "number": "&#251;", },
		{ "char": "ü", "b": "l", "a": "l", "entity": "&uuml;", "number": "&#252;", },
		{ "char": "ý", "b": "z", "a": "u", "entity": "&yacute;", "number": "&#253;", },
		{ "char": "þ", "b": "l", "a": "o", "entity": "&thorn;", "number": "&#254;", },
		{ "char": "ÿ", "b": "z", "a": "u", "entity": "&yuml;", "number": "&#255;", },
		{ "char": " ", "b": "n", "a": "n", "entity": "&nbsp;", "number": "&#160;", },
		{ "char": "¡", "b": "l", "a": "l", "entity": "&iexcl;", "number": "&#161;", },
		{ "char": "¢", "b": "o", "a": "l", "entity": "&cent;", "number": "&#162;", },
		{ "char": "£", "b": "z", "a": "z", "entity": "&pound;", "number": "&#163;", },
		{ "char": "¤", "b": "l", "a": "l", "entity": "&curren;", "number": "&#164;", },
		{ "char": "¥", "b": "l", "a": "l", "entity": "&yen;", "number": "&#165;", },
		{ "char": "¦", "b": "l", "a": "l", "entity": "&brvbar;", "number": "&#166;", },
		{ "char": "§", "b": "l", "a": "l", "entity": "&sect;", "number": "&#167;", },
		{ "char": "¨", "b": "l", "a": "l", "entity": "&uml;", "number": "&#168;", },
		{ "char": "©", "b": "o", "a": "o", "entity": "&copy;", "number": "&#169;", },
		{ "char": "ª", "b": "l", "a": "l", "entity": "&ordf;", "number": "&#170;", },
		{ "char": "«", "b": "n", "a": "n", "entity": "&laquo;", "number": "&#171;", },
		{ "char": "¬", "b": "z", "a": "z", "entity": "&not;", "number": "&#172;", },
		{ "char": " ", "b": "z", "a": "z", "entity": "&shy;", "number": "&#173;", },
		{ "char": "®", "b": "o", "a": "o", "entity": "&reg;", "number": "&#174;", },
		{ "char": "¯", "b": "z", "a": "z", "entity": "&macr;", "number": "&#175;", },
		{ "char": "°", "b": "o", "a": "o", "entity": "&deg;", "number": "&#176;", },
		{ "char": "±", "b": "l", "a": "l", "entity": "&plusmn;", "number": "&#177;", },
		{ "char": "²", "b": "z", "a": "z", "entity": "&sup2;", "number": "&#178;", },
		{ "char": "³", "b": "z", "a": "z", "entity": "&sup3;", "number": "&#179;", },
		{ "char": "´", "b": "z", "a": "z", "entity": "&acute;", "number": "&#180;", },
		{ "char": "µ", "b": "l", "a": "u", "entity": "&micro;", "number": "&#181;", },
		{ "char": "¶", "b": "d", "a": "l", "entity": "&para;", "number": "&#182;", },
		{ "char": "¸", "b": "z", "a": "l", "entity": "&cedil;", "number": "&#184;", },
		{ "char": "¹", "b": "z", "a": "z", "entity": "&sup1;", "number": "&#185;", },
		{ "char": "º", "b": "z", "a": "z", "entity": "&ordm;", "number": "&#186;", },
		{ "char": "»", "b": "n", "a": "n", "entity": "&raquo;", "number": "&#187;", },
		{ "char": "¼", "b": "n", "a": "n", "entity": "&frac14;", "number": "&#188;", },
		{ "char": "½", "b": "n", "a": "n", "entity": "&frac12;", "number": "&#189;", },
		{ "char": "¾", "b": "n", "a": "n", "entity": "&frac34;", "number": "&#190;", },
		{ "char": "¿", "b": "o", "a": "d", "entity": "&iquest;", "number": "&#191;", },
		{ "char": "×", "b": "l", "a": "l", "entity": "&times;", "number": "&#215;", },
		{ "char": "÷", "b": "n", "a": "n", "entity": "&divide;", "number": "&#247;", },
		{ "char": "∀", "b": "d", "a": "u", "entity": "&forall;", "number": "&#8704;", },
		{ "char": "∂", "b": "o", "a": "o", "entity": "&part;", "number": "&#8706;", },
		{ "char": "∃", "b": "l", "a": "l", "entity": "&exist;", "number": "&#8707;", },
		{ "char": "∅", "b": "o", "a": "o", "entity": "&empty;", "number": "&#8709;", },
		{ "char": "∇", "b": "d", "a": "u", "entity": "&nabla;", "number": "&#8711;", },
		{ "char": "∈", "b": "o", "a": "l", "entity": "&isin;", "number": "&#8712;", },
		{ "char": "∉", "b": "o", "a": "l", "entity": "&notin;", "number": "&#8713;", },
		{ "char": "∋", "b": "l", "a": "o", "entity": "&ni;", "number": "&#8715;", },
		{ "char": "∏", "b": "l", "a": "l", "entity": "&prod;", "number": "&#8719;", },
		{ "char": "∑", "b": "l", "a": "l", "entity": "&sum;", "number": "&#8721;", },
		{ "char": "−", "b": "z", "a": "z", "entity": "&minus;", "number": "&#8722;", },
		{ "char": "∗", "b": "z", "a": "z", "entity": "&lowast;", "number": "&#8727;", },
		{ "char": "√", "b": "n", "a": "n", "entity": "&radic;", "number": "&#8730;", },
		{ "char": "∝", "b": "n", "a": "n", "entity": "&prop;", "number": "&#8733;", },
		{ "char": "∞", "b": "n", "a": "n", "entity": "&infin;", "number": "&#8734;", },
		{ "char": "∠", "b": "n", "a": "n", "entity": "&ang;", "number": "&#8736;", },
		{ "char": "∧", "b": "z", "a": "z", "entity": "&and;", "number": "&#8743;", },
		{ "char": "∨", "b": "d", "a": "u", "entity": "&or;", "number": "&#8744;", },
		{ "char": "∩", "b": "l", "a": "l", "entity": "&cap;", "number": "&#8745;", },
		{ "char": "∪", "b": "l", "a": "l", "entity": "&cup;", "number": "&#8746;", },
		{ "char": "∫", "b": "l", "a": "l", "entity": "&int;", "number": "&#8747;", },
		{ "char": "∴", "b": "u", "a": "d", "entity": "&there4;", "number": "&#8756;", },
		{ "char": "∼", "b": "n", "a": "n", "entity": "&sim;", "number": "&#8764;", },
		{ "char": "≅", "b": "l", "a": "l", "entity": "&cong;", "number": "&#8773;", },
		{ "char": "≈", "b": "l", "a": "l", "entity": "&asymp;", "number": "&#8776;", },
		{ "char": "≠", "b": "l", "a": "l", "entity": "&ne;", "number": "&#8800;", },
		{ "char": "≡", "b": "l", "a": "l", "entity": "&equiv;", "number": "&#8801;", },
		{ "char": "≤", "b": "l", "a": "l", "entity": "&le;", "number": "&#8804;", },
		{ "char": "≥", "b": "l", "a": "l", "entity": "&ge;", "number": "&#8805;", },
		{ "char": "⊂", "b": "o", "a": "l", "entity": "&sub;", "number": "&#8834;", },
		{ "char": "⊃", "b": "l", "a": "o", "entity": "&sup;", "number": "&#8835;", },
		{ "char": "⊄", "b": "o", "a": "l", "entity": "&nsub;", "number": "&#8836;", },
		{ "char": "⊆", "b": "o", "a": "l", "entity": "&sube;", "number": "&#8838;", },
		{ "char": "⊇", "b": "l", "a": "o", "entity": "&supe;", "number": "&#8839;", },
		{ "char": "⊕", "b": "o", "a": "o", "entity": "&oplus;", "number": "&#8853;", },
		{ "char": "⊗", "b": "o", "a": "o", "entity": "&otimes;", "number": "&#8855;", },
		{ "char": "⊥", "b": "u", "a": "d", "entity": "&perp;", "number": "&#8869;", },
		{ "char": "⋅", "b": "n", "a": "n", "entity": "&sdot;", "number": "&#8901;", },
		{ "char": "Α", "b": "u", "a": "d", "entity": "&Alpha;", "number": "&#913;", },
		{ "char": "Β", "b": "l", "a": "o", "entity": "&Beta;", "number": "&#914;", },
		{ "char": "Γ", "b": "l", "a": "u", "entity": "&Gamma;", "number": "&#915;", },
		{ "char": "Δ", "b": "u", "a": "d", "entity": "&Delta;", "number": "&#916;", },
		{ "char": "Ε", "b": "l", "a": "l", "entity": "&Epsilon;", "number": "&#917;", },
		{ "char": "Ζ", "b": "l", "a": "l", "entity": "&Zeta;", "number": "&#918;", },
		{ "char": "Η", "b": "l", "a": "l", "entity": "&Eta;", "number": "&#919;", },
		{ "char": "Θ", "b": "o", "a": "o", "entity": "&Theta;", "number": "&#920;", },
		{ "char": "Ι", "b": "l", "a": "l", "entity": "&Iota;", "number": "&#921;", },
		{ "char": "Κ", "b": "l", "a": "z", "entity": "&Kappa;", "number": "&#922;", },
		{ "char": "Λ", "b": "u", "a": "d", "entity": "&Lambda;", "number": "&#923;", },
		{ "char": "Μ", "b": "l", "a": "l", "entity": "&Mu;", "number": "&#924;", },
		{ "char": "Ν", "b": "l", "a": "l", "entity": "&Nu;", "number": "&#925;", },
		{ "char": "Ξ", "b": "l", "a": "l", "entity": "&Xi;", "number": "&#926;", },
		{ "char": "Ο", "b": "o", "a": "o", "entity": "&Omicron;", "number": "&#927;", },
		{ "char": "Π", "b": "l", "a": "l", "entity": "&Pi;", "number": "&#928;", },
		{ "char": "Ρ", "b": "l", "a": "u", "entity": "&Rho;", "number": "&#929;", },
		{ "char": "Σ", "b": "l", "a": "l", "entity": "&Sigma;", "number": "&#931;", },
		{ "char": "Τ", "b": "d", "a": "u", "entity": "&Tau;", "number": "&#932;", },
		{ "char": "Υ", "b": "d", "a": "u", "entity": "&Upsilon;", "number": "&#933;", },
		{ "char": "Φ", "b": "o", "a": "o", "entity": "&Phi;", "number": "&#934;", },
		{ "char": "Χ", "b": "l", "a": "l", "entity": "&Chi;", "number": "&#935;", },
		{ "char": "Ψ", "b": "l", "a": "l", "entity": "&Psi;", "number": "&#936;", },
		{ "char": "Ω", "b": "l", "a": "l", "entity": "&Omega;", "number": "&#937;", },
		{ "char": "α", "b": "o", "a": "l", "entity": "&alpha;", "number": "&#945;", },
		{ "char": "β", "b": "l", "a": "o", "entity": "&beta;", "number": "&#946;", },
		{ "char": "γ", "b": "d", "a": "u", "entity": "&gamma;", "number": "&#947;", },
		{ "char": "δ", "b": "o", "a": "o", "entity": "&delta;", "number": "&#948;", },
		{ "char": "ε", "b": "o", "a": "l", "entity": "&epsilon;", "number": "&#949;", },
		{ "char": "ζ", "b": "l", "a": "l", "entity": "&zeta;", "number": "&#950;", },
		{ "char": "η", "b": "l", "a": "l", "entity": "&eta;", "number": "&#951;", },
		{ "char": "θ", "b": "o", "a": "o", "entity": "&theta;", "number": "&#952;", },
		{ "char": "ι", "b": "l", "a": "l", "entity": "&iota;", "number": "&#953;", },
		{ "char": "κ", "b": "l", "a": "l", "entity": "&kappa;", "number": "&#954;", },
		{ "char": "λ", "b": "z", "a": "d", "entity": "&lambda;", "number": "&#955;", },
		{ "char": "μ", "b": "l", "a": "l", "entity": "&mu;", "number": "&#956;", },
		{ "char": "ν", "b": "l", "a": "l", "entity": "&nu;", "number": "&#957;", },
		{ "char": "ξ", "b": "l", "a": "l", "entity": "&xi;", "number": "&#958;", },
		{ "char": "ο", "b": "o", "a": "o", "entity": "&omicron;", "number": "&#959;", },
		{ "char": "π", "b": "l", "a": "l", "entity": "&pi;", "number": "&#960;", },
		{ "char": "ρ", "b": "l", "a": "o", "entity": "&rho;", "number": "&#961;", },
		{ "char": "ς", "b": "o", "a": "l", "entity": "&sigmaf;", "number": "&#962;", },
		{ "char": "σ", "b": "o", "a": "o", "entity": "&sigma;", "number": "&#963;", },
		{ "char": "τ", "b": "l", "a": "l", "entity": "&tau;", "number": "&#964;", },
		{ "char": "υ", "b": "l", "a": "l", "entity": "&upsilon;", "number": "&#965;", },
		{ "char": "φ", "b": "o", "a": "o", "entity": "&phi;", "number": "&#966;", },
		{ "char": "χ", "b": "l", "a": "l", "entity": "&chi;", "number": "&#967;", },
		{ "char": "ψ", "b": "l", "a": "l", "entity": "&psi;", "number": "&#968;", },
		{ "char": "ω", "b": "o", "a": "o", "entity": "&omega;", "number": "&#969;", },
		{ "char": "ϑ", "b": "o", "a": "o", "entity": "&thetasym;", "number": "&#977;", },
		{ "char": "ϒ", "b": "l", "a": "l", "entity": "&upsih;", "number": "&#978;", },
		{ "char": "ϖ", "b": "o", "a": "o", "entity": "&piv;", "number": "&#982;", },
		{ "char": "Œ", "b": "o", "a": "l", "entity": "&OElig;", "number": "&#338;", },
		{ "char": "œ", "b": "o", "a": "o", "entity": "&oelig;", "number": "&#339;", },
		{ "char": "Š", "b": "z", "a": "z", "entity": "&Scaron;", "number": "&#352;", },
		{ "char": "š", "b": "z", "a": "z", "entity": "&scaron;", "number": "&#353;", },
		{ "char": "Ÿ", "b": "d", "a": "u", "entity": "&Yuml;", "number": "&#376;", },
		{ "char": "ƒ", "b": "l", "a": "l", "entity": "&fnof;", "number": "&#402;", },
		{ "char": "ˆ", "b": "n", "a": "n", "entity": "&circ;", "number": "&#710;", },
		{ "char": "˜", "b": "n", "a": "n", "entity": "&tilde;", "number": "&#732;", },
		{ "char": " ", "b": "n", "a": "n", "entity": "&ensp;", "number": "&#8194;", },
		{ "char": " ", "b": "n", "a": "n", "entity": "&emsp;", "number": "&#8195;", },
		{ "char": "", "b": "n", "a": "n", "entity": "&thinsp;", "number": "&#8201;", },
		{ "char": "", "b": "n", "a": "n", "entity": "&zwnj;", "number": "&#8204;", },
		{ "char": "", "b": "n", "a": "n", "entity": "&zwj;", "number": "&#8205;", },
		{ "char": "", "b": "n", "a": "n", "entity": "&lrm;", "number": "&#8206;", },
		{ "char": "", "b": "n", "a": "n", "entity": "&rlm;", "number": "&#8207;", },
		{ "char": "–", "b": "n", "a": "n", "entity": "&ndash;", "number": "&#8211;", },
		{ "char": "—", "b": "n", "a": "n", "entity": "&mdash;", "number": "&#8212;", },
		{ "char": "‘", "b": "n", "a": "z", "entity": "&lsquo;", "number": "&#8216;", },
		{ "char": "’", "b": "z", "a": "n", "entity": "&rsquo;", "number": "&#8217;", },
		{ "char": "‚", "b": "z", "a": "n", "entity": "&sbquo;", "number": "&#8218;", },
		{ "char": "“", "b": "n", "a": "z", "entity": "&ldquo;", "number": "&#8220;", },
		{ "char": "”", "b": "z", "a": "n", "entity": "&rdquo;", "number": "&#8221;", },
		{ "char": "„", "b": "z", "a": "n", "entity": "&bdquo;", "number": "&#8222;", },
		{ "char": "†", "b": "l", "a": "l", "entity": "&dagger;", "number": "&#8224;", },
		{ "char": "‡", "b": "l", "a": "l", "entity": "&Dagger;", "number": "&#8225;", },
		{ "char": "•", "b": "o", "a": "o", "entity": "&bull;", "number": "&#8226;", },
		{ "char": "…", "b": "n", "a": "n", "entity": "&hellip;", "number": "&#8230;", },
		{ "char": "‰", "b": "n", "a": "n", "entity": "&permil;", "number": "&#8240;", },
		{ "char": "′", "b": "z", "a": "n", "entity": "&prime;", "number": "&#8242;", },
		{ "char": "″", "b": "z", "a": "n", "entity": "&Prime;", "number": "&#8243;", },
		{ "char": "‹", "b": "n", "a": "z", "entity": "&lsaquo;", "number": "&#8249;", },
		{ "char": "›", "b": "z", "a": "n", "entity": "&rsaquo;", "number": "&#8250;", },
		{ "char": "‾", "b": "n", "a": "n", "entity": "&oline;", "number": "&#8254;", },
		{ "char": "€", "b": "o", "a": "l", "entity": "&euro;", "number": "&#8364;", },
		{ "char": "™", "b": "z", "a": "z", "entity": "&trade;", "number": "&#8482;", },
		{ "char": "←", "b": "n", "a": "n", "entity": "&larr;", "number": "&#8592;", },
		{ "char": "↑", "b": "n", "a": "n", "entity": "&uarr;", "number": "&#8593;", },
		{ "char": "→", "b": "n", "a": "n", "entity": "&rarr;", "number": "&#8594;", },
		{ "char": "↓", "b": "n", "a": "n", "entity": "&darr;", "number": "&#8595;", },
		{ "char": "↔", "b": "n", "a": "n", "entity": "&harr;", "number": "&#8596;", },
		{ "char": "↵", "b": "n", "a": "n", "entity": "&crarr;", "number": "&#8629;", },
		{ "char": "⌈", "b": "l", "a": "l", "entity": "&lceil;", "number": "&#8968;", },
		{ "char": "⌉", "b": "l", "a": "l", "entity": "&rceil;", "number": "&#8969;", },
		{ "char": "⌊", "b": "l", "a": "l", "entity": "&lfloor;", "number": "&#8970;", },
		{ "char": "⌋", "b": "l", "a": "l", "entity": "&rfloor;", "number": "&#8971;", },
		{ "char": "◊", "b": "n", "a": "n", "entity": "&loz;", "number": "&#9674;", },
		{ "char": "♠", "b": "n", "a": "n", "entity": "&spades;", "number": "&#9824;", },
		{ "char": "♣", "b": "n", "a": "n", "entity": "&clubs;", "number": "&#9827;", },
		{ "char": "♥", "b": "n", "a": "n", "entity": "&hearts;", "number": "&#9829;", },
		{ "char": "♦", "b": "n", "a": "n", "entity": "&diams;", "number": "&#9830;", },
	];
	// build data
	CharacterData = _buildCharacterStrokes(CharacterData, StrokeData);
	StrokeData = StrokeData.sort(_sortBy("weight", true, function(a) { return Math.round(a*10); }));
	let StrokePairs = _buildStrokePairs(StrokeData).sort(_sortBy("weight", true, parseInt));
	//console.log(CharacterData);
	//console.log(StrokeData);
	//console.log(StrokePairs);





//	KERNBOT
// ===========================================================================
	class KernBot {

		/**
		 * build KernBot
		 * @param {object} input – user options
		 */
		constructor(input) {
			// default vars
			this.selectors = ["h1","h2","h3","h4","h5","h6","p"];
			this.output = doc.querySelector("#KernBotOutput");
			// options
			let options = {};
			// set user options — VALIDATION?
			if (typeof input === Object) {
				// if input selectors, set the options to input value
				if (input.selectors !== undefined) { this.selectors = input.selectors; }
				// if input outputID, set the options to input value
				if (input.outputID !== undefined) {
					this.output = doc.querySelector(input.outputID);
				}
			}
			// set options
			options = {
				"selectors": this.selectors,
				"output": this.output
			}
			// return a new KernBot.init object that initializes the options
			return this.KernBotBuilder(options);
		}

		/**
		 * KernBot initialization function
		 * @param {object} options - the default or user input options for KernBot.
		 * @param [array] CharacterData - and array of character objects that defines
		 *                             the before and after strokes of a character,
		 *                             also includes the &entity; and &number; code
		 *                             for parsing a string into a sequence.
		 * @param [array] strokes - and array of stroke objects that define the character
		 *                             code for the stroke type and its kerning weight.
		 * @return log KernBot to console
		 */
		KernBotBuilder(options) {

			// configuration
			let self = this;
			self.Mediate = new Mediator();
			self.kbcid = 1;
			self.output = options.output;
			
			// SUBJCETS & OBSERVERS
			self.sequences = [];
			self.selectors = new Subject(options.selectors);
			self.contexts;



			// gather contexts using the Compute f(x) const (dependents: KB.selectors)
			self.contexts = Compute([self.selectors], function() {
				// return gathered contexts
				return self._gatherSequenceContext(self.selectors.value);
			}, self);

			console.log(self.selectors);
			console.log(self.contexts);
			/*
			// add new selector
			let newSelectors = ["h1", "h2"]
			// assess new selectors
			self.selectors.assess(newSelectors);
			*/
			// for each context
			self.contexts.value.forEach((function(element, index) {
				// add a unique ID to each context
				element.removeAttribute("id");
				element.setAttribute("id", "kbcid-"+(self.kbcid));
				self.kbcid++
				// add KB context class to element for later tracking in KB.UI
				element.classList.add(contextClass);
				// add this sequence to the array of sequences KernBot acts on
				self.sequences.push(new Sequence(element));
			// bind each context to this KernBot
			}).bind(self));



			// SUBSCRIBERS
			// Selectors
			self.selectors.subscribe(function() {
				console.log("selectors array changed");
			}, self);
			//self.selectors.assess(/* new selectors array */);
			// Contexts
			self.contexts.subscribe(function() {
				console.log("context array changed");
			}, self);
			//self.contexts.assess(/* new contexts array */);



			// UI key handler & key actions (rules)
			self.keysPressed = {};
			self.keyActions = {};
			self.keyActions = {
				root: {
					"k b Enter":			"initiate KernBot",
				},
				sequence: {
					"a":					"add clicked context to KernBot Sequences",
					"r":					"remove clicked context to KernBot Sequence",
				},
				node: {
					"c ArrowLeft":			"go to previous character in sequence",
					"c ArrowRight":			"go to next character in sequence",
					"k ArrowLeft":			"kern left (decrease weight)",
					"k ArrowRight":			"kern right (increase weight)",
				}
			}

			// handle document events
			self._eventsHandler();

			// render KB.UI
			this._renderUI();

			// DEBUG
			console.log("============= INIT =============");
			console.log(self);
			console.log("============= RUN =============");
		};



		//	KB KERNING METHODS
		// ===========================================================================
		/**
		 * kern all sequences f(x)
		 * @return 'this' - makes method chainable
		 */
		kernAll() {
			// loop through all sequences to kern
			for (let i = 0; i < this.sequences.length; i++) {
				// update the DOM context of this sequence with the sequence's kerned nodes
				if (!this.sequences[i].isKerned && _updateElementHTML(this.sequences[i].context, this.sequences[i].nodeStrings.join(""))) {
					// update this sequence kerned status
					this.sequences[i].isKerned = true;
				}
			}
			// render KB.UI
			this._renderUI();
			// return this
			return this;
		}
		/**
		 * unkern all sequences f(x)
		 * @return 'this' - makes method chainable
		 */
		unkernAll() {
			// loop through all sequences to unkern
			for (let i = 0; i < this.sequences.length; i++) {
				// update the DOM context of this kerned sequence with the sequence's original string
				if (this.sequences[i].isKerned && _updateElementHTML(this.sequences[i].context, this.sequences[i].string)) {
					// update this sequence kerned status
					this.sequences[i].isKerned = false;
				}
			}
			// render KB.UI
			this._renderUI();
			// return this
			return this;
		}
		/**
		 * kern given sequence f(x)
		 * @return 'this' - makes method chainable
		 */
		kern(sequence) {
			// loop through all sequences to kern
			// update the DOM context of this sequence with the sequence's kerned nodes
			if (!sequence.isKerned && _updateElementHTML(sequence.context, sequence.nodeStrings.join(""))) {
				// update this sequence kerned status
				sequence.isKerned = true;
			}
			// render KB.UI
			this._renderUI();
			// return this
			return this;
		}
		/**
		 * unkern given sequence f(x)
		 * @return 'this' - makes method chainable
		 */
		unkern(sequence) {
			// update the DOM context of this kerned sequence with the sequence's original string
			if (sequence.isKerned && _updateElementHTML(sequence.context, sequence.string)) {
				// update this sequence kerned status
				sequence.isKerned = false;
			}
			// render KB.UI
			this._renderUI();
			// return this
			return this;
		}



		//	KB HELPER METHODS
		// ===========================================================================
		/**
		 * returns an array of sequence contexts (HTML elements to kern)
		 * @param [array] | "string" selectors - selector(s) to get HTML for
		 * @return [array] output - an array of HTML elements
		 */
		_gatherSequenceContext(selectors) {
			// output
			let output = [];
			// control flow
			switch (selectors.constructor.name) {
				// a single selector
				case "String":
					// gather contexts
					let contexts = doc.querySelectorAll(selectors);
					// loop through each context
					for (let e = 0; contexts.length > 0 && e < contexts.length; e++) {
						// add context to output
						output.push(contexts[e]);
					}
					break;
				// array of selectors
				case "Array":
					// loop through selectors
					for (let i = 0; i < selectors.length; i++) {
						// gather contexts
						let contexts = doc.querySelectorAll(selectors[i]);
						// loop through each context
						for (let e = 0; contexts.length > 0 && e < contexts.length; e++) {
							// add context to output
							output.push(contexts[e]);
						}
					}
					break;
			}
			// return output
			return output;
		};
		/**
		 * Adds the CSS letter-spacing styles to the nodes in the given sequence
		 * @param [array] sequence - an array of nodes with kerning data
		 * @return (boolean) - T/F
		 */
		_styleSequenceLetterSpacing(sequence) {
			// loop vars
			let context = false,
				kerned = false;
			// loop through each node
			for (let i = 0; i < sequence.length; i++) {
				// vars
				let node = sequence[i],
					selector = "",
					element = null;
				// if context not yet set — set context from its current child in the loop
				if (!context) { context = node.context; }
				// add the context to the selector
				selector += _getElementTagIDandClasses(context);
				// check if tag
				if (node.isTag && !node.isTagClosure) {
					// set tag selector
					let tag = _toNodes(node.char);
					selector += " " + _getElementTagIDandClasses(tag[0]);
				// check if char
				} else {
					// set char node selector
					selector += " span" + "."+nodeClass + ".char-"+node.class;
				}
				// gather element
				element = doc.querySelector(selector) || false;
				// if element is valid DOM element
				if (element) {
					// add letter-spacing styles to element
					element.style.letterSpacing = -node.kerning.value + "px";
					kerned = true;
				}
			}
			// return if the node styles were kerned
			return kerned;
		};



		// KERNBOT UI (BETA)
		// UI GENERAL METHODS
		// ===========================================================================
		/**
		 * updates the UI environment
		 * @return 'this' - makes method chainable
		 */
		_renderUI() {
			// loop through the sequences KernBot is acting on
			for (let i = 0; i < this.sequences.length; i++) {
				if (this.sequences[i].isKerned) {
					// update the letter spacing of the sequence nodes
					this._styleSequenceLetterSpacing(this.sequences[i].nodes);
				}
			}
			// log UI
			console.log(this);
		};



		// UI SEQUENCE SPECIFIC METHODS
		// ===========================================================================



		// EVENT HANDLER
		// ===========================================================================
		_eventsHandler() {

			// ROOT (window)
			// KEYDOWN
			root.addEventListener("keydown", (function(event) {
				// prevent default
				//event.preventDefault();
				// add the current key pressed to keys map
				this.keysPressed[event.key] = true;
				
				// test which key(s) are pressed for UI
				//console.log(this._testKeys("c", "ArrowRight"), "go to next character");
				//console.log(this._testKeys("c", "ArrowLeft"), "go to previous character");

			}).bind(this));

			// KEYUP
			root.addEventListener("keyup", (function(event) {
				// add the current key pressed to keys map
				this.keysPressed[event.key] = false;
			}).bind(this));

			// CONTEXTS
			// loop through each sequence context
			for (let i = 0; i < this.contexts.value.length; i++) {
				// vars
				let context = this.contexts.value[i];
				// CLICK STATE
				// add a click event listener to each context
				context.addEventListener("click", (function(event) {
					// void defualt action
					event.preventDefault();
					// get sequence to analyze
					let seq = _getLegendData(context, "context", this.sequences);
					// kern or unkern sequence
					if (!seq.isKerned) {
						this.kern(seq);
					} else {
						this.unkern(seq);
					}
				// bind click function to 'this' kernbot
				}).bind(this));
			}
		};
		/**
		 * Tests if the key or keys are being tracked by KB key handler
		 * @param "string" check - the key to check if pressed
		 * @return (boolean) keys - whether or not the key is being tracking by KB
		 */
		_testKey(check) { return this.keysPressed[check]; }
		_testKeys() {
			let keylist = arguments;
			for(var i = 0; i < keylist.length; i++) {
				if(!this._testKey(keylist[i])) { return false; }
			}
			return true;
		};

	// END KernBot class
	// ===========================================================================
	}; 



	// KERNBOT IN GLOBAL SPACE
	// ===========================================================================
	// create "$KB" alias in the global object (shorthand)
	global.KernBot = global.$KB = KernBot;

	// return true if everything loaded properly
	return true;

// execute IIFE and pass dependencies
} (window, undefined));