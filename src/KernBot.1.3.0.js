/*

Author: Joey Grable
Version: 1.3.X
GIT: github.com/joeygrable94/KernBot

A javascript library that dynamically kerns characters based on their context.
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
	// characters
	class Character {
		constructor(char, before, after, entity, number) {
			this.char = char;
			this.strokes = {
				"before": before,
				"after": after
			}
			this.entity = entity || false,
			this.number = number || false,
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
	// HTML <tags> and &entities;
	class Element {
		constructor(context, string, elm, start, end, isEntity) {
			this.context = context;
			this.string = string;
			// the characters & length of the element
			this.char = elm;
			this.length = elm.length;
			// the start & end index of the element in the original string
			this.indexes = [start, end];
			// entities are rendered, <tags> are not
			this.isEntity = isEntity || false;
		}
	}
	// tag injected in a sequence
	class Tag {
		constructor(context, node, classIndex) {
			this.context = context;
			this.class = "char-"+classIndex;
			this.indexes = [classIndex];
			this.char = node.char;
			this.data = node;
			this.count = 0;
			this._increaseCount(1);
		}
		// increase the instance count
		_increaseCount(val=1) { return this.count += val; }
	}
	// nodes
	class Node {
		constructor(context, node, classIndex) {
			this.context = context;
			this.class = "char-"+classIndex;
			this.indexes = [classIndex];
			this.char = node.char;
			this.data = node;
			this.kerning = 0;
			this.count = 0;
			this._increaseCount(1);
		}
		// add kerning data to instance
		_addKerning(val) { return this.kerning = val; }
		// increase the instance count
		_increaseCount(val=1) { return this.count += val; }
		// add index to instance
		_addCharIndex(index) { return this.indexes.push( index ); }
	};
	// node pairs
	class NodePair {
		// build pair
		constructor(context, charPair, index) {
			this.context = context;
			this.indexes = [[index, index+1]];
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
			this.weight = charPair.weight;
			this.kern = null;
			this.letterSpace = null;
			this.count = 0;
			// run methods
			this._increaseCount(1);
			this._calcKerning();
		}
		// calc kerning relative to context fontsize
		_calcKerning() {
			let fontSize = parseFloat(getComputedStyle(this.context).fontSize);
			this.kern = ( Math.round((this.weight*100)/100).toFixed(2) / 100 ) * fontSize;
			this.letterSpace = "-" + this.kern.toString().substring(0, 5) + "px";
		}
		// increase the existance count
		_increaseCount(val=1) { return this.count += val; }
		// add a pair of indexes of where in a sequence the charPair exists
		_addCharIndex(pos) { return this.indexes.push([pos, pos+1]); }
	}
	// sequences
	class Sequence {
		constructor(context, string, HTML, sequence) {
			this.context = context;
			this.string = string;
			this.innerHTML = HTML;
			this.sequence = sequence;
		}
	}

	//	CONSTANTS
	// ===========================================================================
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
		{ "char": ":", "before": "s", "after": "n" },
		{ "char": "“", "before": "n", "after": "s" },
		{ "char": "”", "before": "s", "after": "n" },
		{ "char": "‘", "before": "n", "after": "s" },
		{ "char": "’", "before": "s", "after": "n" },
		{ "char": "'", "before": "s", "after": "s" },
		{ "char": "\"", "before": "s", "after": "s" },
		{ "char": "!", "before": "s", "after": "n" },
		{ "char": "?", "before": "s", "after": "n" },
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
	const entities = [
		{ "char": " ", "before": "s", "after": "s", "entity": null, "number": "&#32;", },
		{ "char": "!", "before": "s", "after": "s", "entity": null, "number": "&#33;", },
		{ "char": "\"", "before": "s", "after": "s", "entity": null, "number": "&#34;", },
		{ "char": "#", "before": "s", "after": "s", "entity": null, "number": "&#35;", },
		{ "char": "$", "before": "s", "after": "s", "entity": null, "number": "&#36;", },
		{ "char": "%", "before": "s", "after": "s", "entity": null, "number": "&#37;", },
		{ "char": "&", "before": "s", "after": "s", "entity": "&amp;", "number": "&#38;", },
		{ "char": "'", "before": "s", "after": "s", "entity": null, "number": "&#39;", },
		{ "char": "(", "before": "s", "after": "s", "entity": null, "number": "&#40;", },
		{ "char": ")", "before": "s", "after": "s", "entity": null, "number": "&#41;", },
		{ "char": "*", "before": "s", "after": "s", "entity": null, "number": "&#42;", },
		{ "char": "+", "before": "s", "after": "s", "entity": null, "number": "&#43;", },
		{ "char": ",", "before": "s", "after": "s", "entity": null, "number": "&#44;", },
		{ "char": "-", "before": "s", "after": "s", "entity": null, "number": "&#45;", },
		{ "char": ".", "before": "s", "after": "s", "entity": null, "number": "&#46;", },
		{ "char": "/", "before": "s", "after": "s", "entity": null, "number": "&#47;", },
		{ "char": "0", "before": "s", "after": "s", "entity": null, "number": "&#48;", },
		{ "char": "1", "before": "s", "after": "s", "entity": null, "number": "&#49;", },
		{ "char": "2", "before": "s", "after": "s", "entity": null, "number": "&#50;", },
		{ "char": "3", "before": "s", "after": "s", "entity": null, "number": "&#51;", },
		{ "char": "4", "before": "s", "after": "s", "entity": null, "number": "&#52;", },
		{ "char": "5", "before": "s", "after": "s", "entity": null, "number": "&#53;", },
		{ "char": "6", "before": "s", "after": "s", "entity": null, "number": "&#54;", },
		{ "char": "7", "before": "s", "after": "s", "entity": null, "number": "&#55;", },
		{ "char": "8", "before": "s", "after": "s", "entity": null, "number": "&#56;", },
		{ "char": "9", "before": "s", "after": "s", "entity": null, "number": "&#57;", },
		{ "char": ":", "before": "s", "after": "s", "entity": null, "number": "&#58;", },
		{ "char": ";", "before": "s", "after": "s", "entity": null, "number": "&#59;", },
		{ "char": "<", "before": "s", "after": "s", "entity": "&lt;", "number": "&#60;", },
		{ "char": "=", "before": "s", "after": "s", "entity": null, "number": "&#61;", },
		{ "char": ">", "before": "s", "after": "s", "entity": "&gt;", "number": "&#62;", },
		{ "char": "?", "before": "s", "after": "s", "entity": null, "number": "&#63;", },
		{ "char": "@", "before": "s", "after": "s", "entity": null, "number": "&#64;", },
		{ "char": "A", "before": "s", "after": "s", "entity": null, "number": "&#65;", },
		{ "char": "B", "before": "s", "after": "s", "entity": null, "number": "&#66;", },
		{ "char": "C", "before": "s", "after": "s", "entity": null, "number": "&#67;", },
		{ "char": "D", "before": "s", "after": "s", "entity": null, "number": "&#68;", },
		{ "char": "E", "before": "s", "after": "s", "entity": null, "number": "&#69;", },
		{ "char": "F", "before": "s", "after": "s", "entity": null, "number": "&#70;", },
		{ "char": "G", "before": "s", "after": "s", "entity": null, "number": "&#71;", },
		{ "char": "H", "before": "s", "after": "s", "entity": null, "number": "&#72;", },
		{ "char": "I", "before": "s", "after": "s", "entity": null, "number": "&#73;", },
		{ "char": "J", "before": "s", "after": "s", "entity": null, "number": "&#74;", },
		{ "char": "K", "before": "s", "after": "s", "entity": null, "number": "&#75;", },
		{ "char": "L", "before": "s", "after": "s", "entity": null, "number": "&#76;", },
		{ "char": "M", "before": "s", "after": "s", "entity": null, "number": "&#77;", },
		{ "char": "N", "before": "s", "after": "s", "entity": null, "number": "&#78;", },
		{ "char": "O", "before": "s", "after": "s", "entity": null, "number": "&#79;", },
		{ "char": "P", "before": "s", "after": "s", "entity": null, "number": "&#80;", },
		{ "char": "Q", "before": "s", "after": "s", "entity": null, "number": "&#81;", },
		{ "char": "R", "before": "s", "after": "s", "entity": null, "number": "&#82;", },
		{ "char": "S", "before": "s", "after": "s", "entity": null, "number": "&#83;", },
		{ "char": "T", "before": "s", "after": "s", "entity": null, "number": "&#84;", },
		{ "char": "U", "before": "s", "after": "s", "entity": null, "number": "&#85;", },
		{ "char": "V", "before": "s", "after": "s", "entity": null, "number": "&#86;", },
		{ "char": "W", "before": "s", "after": "s", "entity": null, "number": "&#87;", },
		{ "char": "X", "before": "s", "after": "s", "entity": null, "number": "&#88;", },
		{ "char": "Y", "before": "s", "after": "s", "entity": null, "number": "&#89;", },
		{ "char": "Z", "before": "s", "after": "s", "entity": null, "number": "&#90;", },
		{ "char": "[", "before": "s", "after": "s", "entity": null, "number": "&#91;", },
		{ "char": "\\", "before": "s", "after": "s", "entity": null, "number": "&#92;", },
		{ "char": "]", "before": "s", "after": "s", "entity": null, "number": "&#93;", },
		{ "char": "^", "before": "s", "after": "s", "entity": null, "number": "&#94;", },
		{ "char": "_", "before": "s", "after": "s", "entity": null, "number": "&#95;", },
		{ "char": "`", "before": "s", "after": "s", "entity": null, "number": "&#96;", },
		{ "char": "a", "before": "s", "after": "s", "entity": null, "number": "&#97;", },
		{ "char": "b", "before": "s", "after": "s", "entity": null, "number": "&#98;", },
		{ "char": "c", "before": "s", "after": "s", "entity": null, "number": "&#99;", },
		{ "char": "d", "before": "s", "after": "s", "entity": null, "number": "&#100;", },
		{ "char": "e", "before": "s", "after": "s", "entity": null, "number": "&#101;", },
		{ "char": "f", "before": "s", "after": "s", "entity": null, "number": "&#102;", },
		{ "char": "g", "before": "s", "after": "s", "entity": null, "number": "&#103;", },
		{ "char": "h", "before": "s", "after": "s", "entity": null, "number": "&#104;", },
		{ "char": "i", "before": "s", "after": "s", "entity": null, "number": "&#105;", },
		{ "char": "j", "before": "s", "after": "s", "entity": null, "number": "&#106;", },
		{ "char": "k", "before": "s", "after": "s", "entity": null, "number": "&#107;", },
		{ "char": "l", "before": "s", "after": "s", "entity": null, "number": "&#108;", },
		{ "char": "m", "before": "s", "after": "s", "entity": null, "number": "&#109;", },
		{ "char": "n", "before": "s", "after": "s", "entity": null, "number": "&#110;", },
		{ "char": "o", "before": "s", "after": "s", "entity": null, "number": "&#111;", },
		{ "char": "p", "before": "s", "after": "s", "entity": null, "number": "&#112;", },
		{ "char": "q", "before": "s", "after": "s", "entity": null, "number": "&#113;", },
		{ "char": "r", "before": "s", "after": "s", "entity": null, "number": "&#114;", },
		{ "char": "s", "before": "s", "after": "s", "entity": null, "number": "&#115;", },
		{ "char": "t", "before": "s", "after": "s", "entity": null, "number": "&#116;", },
		{ "char": "u", "before": "s", "after": "s", "entity": null, "number": "&#117;", },
		{ "char": "v", "before": "s", "after": "s", "entity": null, "number": "&#118;", },
		{ "char": "w", "before": "s", "after": "s", "entity": null, "number": "&#119;", },
		{ "char": "x", "before": "s", "after": "s", "entity": null, "number": "&#120;", },
		{ "char": "y", "before": "s", "after": "s", "entity": null, "number": "&#121;", },
		{ "char": "z", "before": "s", "after": "s", "entity": null, "number": "&#122;", },
		{ "char": "{", "before": "s", "after": "s", "entity": null, "number": "&#123;", },
		{ "char": "|", "before": "s", "after": "s", "entity": null, "number": "&#124;", },
		{ "char": "}", "before": "s", "after": "s", "entity": null, "number": "&#125;", },
		{ "char": "~", "before": "s", "after": "s", "entity": null, "number": "&#126;", },
		{ "char": "À", "before": "s", "after": "s", "entity": "&Agrave;", "number": "&#192;", },
		{ "char": "Á", "before": "s", "after": "s", "entity": "&Aacute;", "number": "&#193;", },
		{ "char": "Â", "before": "s", "after": "s", "entity": "&Acirc;", "number": "&#194;", },
		{ "char": "Ã", "before": "s", "after": "s", "entity": "&Atilde;", "number": "&#195;", },
		{ "char": "Ä", "before": "s", "after": "s", "entity": "&Auml;", "number": "&#196;", },
		{ "char": "Å", "before": "s", "after": "s", "entity": "&Aring;", "number": "&#197;", },
		{ "char": "Æ", "before": "s", "after": "s", "entity": "&AElig;", "number": "&#198;", },
		{ "char": "Ç", "before": "s", "after": "s", "entity": "&Ccedil;", "number": "&#199;", },
		{ "char": "È", "before": "s", "after": "s", "entity": "&Egrave;", "number": "&#200;", },
		{ "char": "É", "before": "s", "after": "s", "entity": "&Eacute;", "number": "&#201;", },
		{ "char": "Ê", "before": "s", "after": "s", "entity": "&Ecirc;", "number": "&#202;", },
		{ "char": "Ë", "before": "s", "after": "s", "entity": "&Euml;", "number": "&#203;", },
		{ "char": "Ì", "before": "s", "after": "s", "entity": "&Igrave;", "number": "&#204;", },
		{ "char": "Í", "before": "s", "after": "s", "entity": "&Iacute;", "number": "&#205;", },
		{ "char": "Î", "before": "s", "after": "s", "entity": "&Icirc;", "number": "&#206;", },
		{ "char": "Ï", "before": "s", "after": "s", "entity": "&Iuml;", "number": "&#207;", },
		{ "char": "Ð", "before": "s", "after": "s", "entity": "&ETH;", "number": "&#208;", },
		{ "char": "Ñ", "before": "s", "after": "s", "entity": "&Ntilde;", "number": "&#209;", },
		{ "char": "Ò", "before": "s", "after": "s", "entity": "&Ograve;", "number": "&#210;", },
		{ "char": "Ó", "before": "s", "after": "s", "entity": "&Oacute;", "number": "&#211;", },
		{ "char": "Ô", "before": "s", "after": "s", "entity": "&Ocirc;", "number": "&#212;", },
		{ "char": "Õ", "before": "s", "after": "s", "entity": "&Otilde;", "number": "&#213;", },
		{ "char": "Ö", "before": "s", "after": "s", "entity": "&Ouml;", "number": "&#214;", },
		{ "char": "Ø", "before": "s", "after": "s", "entity": "&Oslash;", "number": "&#216;", },
		{ "char": "Ù", "before": "s", "after": "s", "entity": "&Ugrave;", "number": "&#217;", },
		{ "char": "Ú", "before": "s", "after": "s", "entity": "&Uacute;", "number": "&#218;", },
		{ "char": "Û", "before": "s", "after": "s", "entity": "&Ucirc;", "number": "&#219;", },
		{ "char": "Ü", "before": "s", "after": "s", "entity": "&Uuml;", "number": "&#220;", },
		{ "char": "Ý", "before": "s", "after": "s", "entity": "&Yacute;", "number": "&#221;", },
		{ "char": "Þ", "before": "s", "after": "s", "entity": "&THORN;", "number": "&#222;", },
		{ "char": "ß", "before": "s", "after": "s", "entity": "&szlig;", "number": "&#223;", },
		{ "char": "à", "before": "s", "after": "s", "entity": "&agrave;", "number": "&#224;", },
		{ "char": "á", "before": "s", "after": "s", "entity": "&aacute;", "number": "&#225;", },
		{ "char": "â", "before": "s", "after": "s", "entity": "&acirc;", "number": "&#226;", },
		{ "char": "ã", "before": "s", "after": "s", "entity": "&atilde;", "number": "&#227;", },
		{ "char": "ä", "before": "s", "after": "s", "entity": "&auml;", "number": "&#228;", },
		{ "char": "å", "before": "s", "after": "s", "entity": "&aring;", "number": "&#229;", },
		{ "char": "æ", "before": "s", "after": "s", "entity": "&aelig;", "number": "&#230;", },
		{ "char": "ç", "before": "s", "after": "s", "entity": "&ccedil;", "number": "&#231;", },
		{ "char": "è", "before": "s", "after": "s", "entity": "&egrave;", "number": "&#232;", },
		{ "char": "é", "before": "s", "after": "s", "entity": "&eacute;", "number": "&#233;", },
		{ "char": "ê", "before": "s", "after": "s", "entity": "&ecirc;", "number": "&#234;", },
		{ "char": "ë", "before": "s", "after": "s", "entity": "&euml;", "number": "&#235;", },
		{ "char": "ì", "before": "s", "after": "s", "entity": "&igrave;", "number": "&#236;", },
		{ "char": "í", "before": "s", "after": "s", "entity": "&iacute;", "number": "&#237;", },
		{ "char": "î", "before": "s", "after": "s", "entity": "&icirc;", "number": "&#238;", },
		{ "char": "ï", "before": "s", "after": "s", "entity": "&iuml;", "number": "&#239;", },
		{ "char": "ð", "before": "s", "after": "s", "entity": "&eth;", "number": "&#240;", },
		{ "char": "ñ", "before": "s", "after": "s", "entity": "&ntilde;", "number": "&#241;", },
		{ "char": "ò", "before": "s", "after": "s", "entity": "&ograve;", "number": "&#242;", },
		{ "char": "ó", "before": "s", "after": "s", "entity": "&oacute;", "number": "&#243;", },
		{ "char": "ô", "before": "s", "after": "s", "entity": "&ocirc;", "number": "&#244;", },
		{ "char": "õ", "before": "s", "after": "s", "entity": "&otilde;", "number": "&#245;", },
		{ "char": "ö", "before": "s", "after": "s", "entity": "&ouml;", "number": "&#246;", },
		{ "char": "ø", "before": "s", "after": "s", "entity": "&oslash;", "number": "&#248;", },
		{ "char": "ù", "before": "s", "after": "s", "entity": "&ugrave;", "number": "&#249;", },
		{ "char": "ú", "before": "s", "after": "s", "entity": "&uacute;", "number": "&#250;", },
		{ "char": "û", "before": "s", "after": "s", "entity": "&ucirc;", "number": "&#251;", },
		{ "char": "ü", "before": "s", "after": "s", "entity": "&uuml;", "number": "&#252;", },
		{ "char": "ý", "before": "s", "after": "s", "entity": "&yacute;", "number": "&#253;", },
		{ "char": "þ", "before": "s", "after": "s", "entity": "&thorn;", "number": "&#254;", },
		{ "char": "ÿ", "before": "s", "after": "s", "entity": "&yuml;", "number": "&#255;", },
		{ "char": " ", "before": "s", "after": "s", "entity": "&nbsp;", "number": "&#160;", },
		{ "char": "¡", "before": "s", "after": "s", "entity": "&iexcl;", "number": "&#161;", },
		{ "char": "¢", "before": "s", "after": "s", "entity": "&cent;", "number": "&#162;", },
		{ "char": "£", "before": "s", "after": "s", "entity": "&pound;", "number": "&#163;", },
		{ "char": "¤", "before": "s", "after": "s", "entity": "&curren;", "number": "&#164;", },
		{ "char": "¥", "before": "s", "after": "s", "entity": "&yen;", "number": "&#165;", },
		{ "char": "¦", "before": "s", "after": "s", "entity": "&brvbar;", "number": "&#166;", },
		{ "char": "§", "before": "s", "after": "s", "entity": "&sect;", "number": "&#167;", },
		{ "char": "¨", "before": "s", "after": "s", "entity": "&uml;", "number": "&#168;", },
		{ "char": "©", "before": "s", "after": "s", "entity": "&copy;", "number": "&#169;", },
		{ "char": "ª", "before": "s", "after": "s", "entity": "&ordf;", "number": "&#170;", },
		{ "char": "«", "before": "s", "after": "s", "entity": "&laquo;", "number": "&#171;", },
		{ "char": "¬", "before": "s", "after": "s", "entity": "&not;", "number": "&#172;", },
		{ "char": " ", "before": "s", "after": "s", "entity": "&shy;", "number": "&#173;", },
		{ "char": "®", "before": "s", "after": "s", "entity": "&reg;", "number": "&#174;", },
		{ "char": "¯", "before": "s", "after": "s", "entity": "&macr;", "number": "&#175;", },
		{ "char": "°", "before": "s", "after": "s", "entity": "&deg;", "number": "&#176;", },
		{ "char": "±", "before": "s", "after": "s", "entity": "&plusmn;", "number": "&#177;", },
		{ "char": "²", "before": "s", "after": "s", "entity": "&sup2;", "number": "&#178;", },
		{ "char": "³", "before": "s", "after": "s", "entity": "&sup3;", "number": "&#179;", },
		{ "char": "´", "before": "s", "after": "s", "entity": "&acute;", "number": "&#180;", },
		{ "char": "µ", "before": "s", "after": "s", "entity": "&micro;", "number": "&#181;", },
		{ "char": "¶", "before": "s", "after": "s", "entity": "&para;", "number": "&#182;", },
		{ "char": "¸", "before": "s", "after": "s", "entity": "&cedil;", "number": "&#184;", },
		{ "char": "¹", "before": "s", "after": "s", "entity": "&sup1;", "number": "&#185;", },
		{ "char": "º", "before": "s", "after": "s", "entity": "&ordm;", "number": "&#186;", },
		{ "char": "»", "before": "s", "after": "s", "entity": "&raquo;", "number": "&#187;", },
		{ "char": "¼", "before": "s", "after": "s", "entity": "&frac14;", "number": "&#188;", },
		{ "char": "½", "before": "s", "after": "s", "entity": "&frac12;", "number": "&#189;", },
		{ "char": "¾", "before": "s", "after": "s", "entity": "&frac34;", "number": "&#190;", },
		{ "char": "¿", "before": "s", "after": "s", "entity": "&iquest;", "number": "&#191;", },
		{ "char": "×", "before": "s", "after": "s", "entity": "&times;", "number": "&#215;", },
		{ "char": "÷", "before": "s", "after": "s", "entity": "&divide;", "number": "&#247;", },
		{ "char": "∀", "before": "s", "after": "s", "entity": "&forall;", "number": "&#8704;", },
		{ "char": "∂", "before": "s", "after": "s", "entity": "&part;", "number": "&#8706;", },
		{ "char": "∃", "before": "s", "after": "s", "entity": "&exist;", "number": "&#8707;", },
		{ "char": "∅", "before": "s", "after": "s", "entity": "&empty;", "number": "&#8709;", },
		{ "char": "∇", "before": "s", "after": "s", "entity": "&nabla;", "number": "&#8711;", },
		{ "char": "∈", "before": "s", "after": "s", "entity": "&isin;", "number": "&#8712;", },
		{ "char": "∉", "before": "s", "after": "s", "entity": "&notin;", "number": "&#8713;", },
		{ "char": "∋", "before": "s", "after": "s", "entity": "&ni;", "number": "&#8715;", },
		{ "char": "∏", "before": "s", "after": "s", "entity": "&prod;", "number": "&#8719;", },
		{ "char": "∑", "before": "s", "after": "s", "entity": "&sum;", "number": "&#8721;", },
		{ "char": "−", "before": "s", "after": "s", "entity": "&minus;", "number": "&#8722;", },
		{ "char": "∗", "before": "s", "after": "s", "entity": "&lowast;", "number": "&#8727;", },
		{ "char": "√", "before": "s", "after": "s", "entity": "&radic;", "number": "&#8730;", },
		{ "char": "∝", "before": "s", "after": "s", "entity": "&prop;", "number": "&#8733;", },
		{ "char": "∞", "before": "s", "after": "s", "entity": "&infin;", "number": "&#8734;", },
		{ "char": "∠", "before": "s", "after": "s", "entity": "&ang;", "number": "&#8736;", },
		{ "char": "∧", "before": "s", "after": "s", "entity": "&and;", "number": "&#8743;", },
		{ "char": "∨", "before": "s", "after": "s", "entity": "&or;", "number": "&#8744;", },
		{ "char": "∩", "before": "s", "after": "s", "entity": "&cap;", "number": "&#8745;", },
		{ "char": "∪", "before": "s", "after": "s", "entity": "&cup;", "number": "&#8746;", },
		{ "char": "∫", "before": "s", "after": "s", "entity": "&int;", "number": "&#8747;", },
		{ "char": "∴", "before": "s", "after": "s", "entity": "&there4;", "number": "&#8756;", },
		{ "char": "∼", "before": "s", "after": "s", "entity": "&sim;", "number": "&#8764;", },
		{ "char": "≅", "before": "s", "after": "s", "entity": "&cong;", "number": "&#8773;", },
		{ "char": "≈", "before": "s", "after": "s", "entity": "&asymp;", "number": "&#8776;", },
		{ "char": "≠", "before": "s", "after": "s", "entity": "&ne;", "number": "&#8800;", },
		{ "char": "≡", "before": "s", "after": "s", "entity": "&equiv;", "number": "&#8801;", },
		{ "char": "≤", "before": "s", "after": "s", "entity": "&le;", "number": "&#8804;", },
		{ "char": "≥", "before": "s", "after": "s", "entity": "&ge;", "number": "&#8805;", },
		{ "char": "⊂", "before": "s", "after": "s", "entity": "&sub;", "number": "&#8834;", },
		{ "char": "⊃", "before": "s", "after": "s", "entity": "&sup;", "number": "&#8835;", },
		{ "char": "⊄", "before": "s", "after": "s", "entity": "&nsub;", "number": "&#8836;", },
		{ "char": "⊆", "before": "s", "after": "s", "entity": "&sube;", "number": "&#8838;", },
		{ "char": "⊇", "before": "s", "after": "s", "entity": "&supe;", "number": "&#8839;", },
		{ "char": "⊕", "before": "s", "after": "s", "entity": "&oplus;", "number": "&#8853;", },
		{ "char": "⊗", "before": "s", "after": "s", "entity": "&otimes;", "number": "&#8855;", },
		{ "char": "⊥", "before": "s", "after": "s", "entity": "&perp;", "number": "&#8869;", },
		{ "char": "⋅", "before": "s", "after": "s", "entity": "&sdot;", "number": "&#8901;", },
		{ "char": "Α", "before": "s", "after": "s", "entity": "&Alpha;", "number": "&#913;", },
		{ "char": "Β", "before": "s", "after": "s", "entity": "&Beta;", "number": "&#914;", },
		{ "char": "Γ", "before": "s", "after": "s", "entity": "&Gamma;", "number": "&#915;", },
		{ "char": "Δ", "before": "s", "after": "s", "entity": "&Delta;", "number": "&#916;", },
		{ "char": "Ε", "before": "s", "after": "s", "entity": "&Epsilon;", "number": "&#917;", },
		{ "char": "Ζ", "before": "s", "after": "s", "entity": "&Zeta;", "number": "&#918;", },
		{ "char": "Η", "before": "s", "after": "s", "entity": "&Eta;", "number": "&#919;", },
		{ "char": "Θ", "before": "s", "after": "s", "entity": "&Theta;", "number": "&#920;", },
		{ "char": "Ι", "before": "s", "after": "s", "entity": "&Iota;", "number": "&#921;", },
		{ "char": "Κ", "before": "s", "after": "s", "entity": "&Kappa;", "number": "&#922;", },
		{ "char": "Λ", "before": "s", "after": "s", "entity": "&Lambda;", "number": "&#923;", },
		{ "char": "Μ", "before": "s", "after": "s", "entity": "&Mu;", "number": "&#924;", },
		{ "char": "Ν", "before": "s", "after": "s", "entity": "&Nu;", "number": "&#925;", },
		{ "char": "Ξ", "before": "s", "after": "s", "entity": "&Xi;", "number": "&#926;", },
		{ "char": "Ο", "before": "s", "after": "s", "entity": "&Omicron;", "number": "&#927;", },
		{ "char": "Π", "before": "s", "after": "s", "entity": "&Pi;", "number": "&#928;", },
		{ "char": "Ρ", "before": "s", "after": "s", "entity": "&Rho;", "number": "&#929;", },
		{ "char": "Σ", "before": "s", "after": "s", "entity": "&Sigma;", "number": "&#931;", },
		{ "char": "Τ", "before": "s", "after": "s", "entity": "&Tau;", "number": "&#932;", },
		{ "char": "Υ", "before": "s", "after": "s", "entity": "&Upsilon;", "number": "&#933;", },
		{ "char": "Φ", "before": "s", "after": "s", "entity": "&Phi;", "number": "&#934;", },
		{ "char": "Χ", "before": "s", "after": "s", "entity": "&Chi;", "number": "&#935;", },
		{ "char": "Ψ", "before": "s", "after": "s", "entity": "&Psi;", "number": "&#936;", },
		{ "char": "Ω", "before": "s", "after": "s", "entity": "&Omega;", "number": "&#937;", },
		{ "char": "α", "before": "s", "after": "s", "entity": "&alpha;", "number": "&#945;", },
		{ "char": "β", "before": "s", "after": "s", "entity": "&beta;", "number": "&#946;", },
		{ "char": "γ", "before": "s", "after": "s", "entity": "&gamma;", "number": "&#947;", },
		{ "char": "δ", "before": "s", "after": "s", "entity": "&delta;", "number": "&#948;", },
		{ "char": "ε", "before": "s", "after": "s", "entity": "&epsilon;", "number": "&#949;", },
		{ "char": "ζ", "before": "s", "after": "s", "entity": "&zeta;", "number": "&#950;", },
		{ "char": "η", "before": "s", "after": "s", "entity": "&eta;", "number": "&#951;", },
		{ "char": "θ", "before": "s", "after": "s", "entity": "&theta;", "number": "&#952;", },
		{ "char": "ι", "before": "s", "after": "s", "entity": "&iota;", "number": "&#953;", },
		{ "char": "κ", "before": "s", "after": "s", "entity": "&kappa;", "number": "&#954;", },
		{ "char": "λ", "before": "s", "after": "s", "entity": "&lambda;", "number": "&#955;", },
		{ "char": "μ", "before": "s", "after": "s", "entity": "&mu;", "number": "&#956;", },
		{ "char": "ν", "before": "s", "after": "s", "entity": "&nu;", "number": "&#957;", },
		{ "char": "ξ", "before": "s", "after": "s", "entity": "&xi;", "number": "&#958;", },
		{ "char": "ο", "before": "s", "after": "s", "entity": "&omicron;", "number": "&#959;", },
		{ "char": "π", "before": "s", "after": "s", "entity": "&pi;", "number": "&#960;", },
		{ "char": "ρ", "before": "s", "after": "s", "entity": "&rho;", "number": "&#961;", },
		{ "char": "ς", "before": "s", "after": "s", "entity": "&sigmaf;", "number": "&#962;", },
		{ "char": "σ", "before": "s", "after": "s", "entity": "&sigma;", "number": "&#963;", },
		{ "char": "τ", "before": "s", "after": "s", "entity": "&tau;", "number": "&#964;", },
		{ "char": "υ", "before": "s", "after": "s", "entity": "&upsilon;", "number": "&#965;", },
		{ "char": "φ", "before": "s", "after": "s", "entity": "&phi;", "number": "&#966;", },
		{ "char": "χ", "before": "s", "after": "s", "entity": "&chi;", "number": "&#967;", },
		{ "char": "ψ", "before": "s", "after": "s", "entity": "&psi;", "number": "&#968;", },
		{ "char": "ω", "before": "s", "after": "s", "entity": "&omega;", "number": "&#969;", },
		{ "char": "ϑ", "before": "s", "after": "s", "entity": "&thetasym;", "number": "&#977;", },
		{ "char": "ϒ", "before": "s", "after": "s", "entity": "&upsih;", "number": "&#978;", },
		{ "char": "ϖ", "before": "s", "after": "s", "entity": "&piv;", "number": "&#982;", },
		{ "char": "Œ", "before": "s", "after": "s", "entity": "&OElig;", "number": "&#338;", },
		{ "char": "œ", "before": "s", "after": "s", "entity": "&oelig;", "number": "&#339;", },
		{ "char": "Š", "before": "s", "after": "s", "entity": "&Scaron;", "number": "&#352;", },
		{ "char": "š", "before": "s", "after": "s", "entity": "&scaron;", "number": "&#353;", },
		{ "char": "Ÿ", "before": "s", "after": "s", "entity": "&Yuml;", "number": "&#376;", },
		{ "char": "ƒ", "before": "s", "after": "s", "entity": "&fnof;", "number": "&#402;", },
		{ "char": "ˆ", "before": "s", "after": "s", "entity": "&circ;", "number": "&#710;", },
		{ "char": "˜", "before": "s", "after": "s", "entity": "&tilde;", "number": "&#732;", },
		{ "char": " ", "before": "s", "after": "s", "entity": "&ensp;", "number": "&#8194;", },
		{ "char": " ", "before": "s", "after": "s", "entity": "&emsp;", "number": "&#8195;", },
		{ "char": "", "before": "s", "after": "s", "entity": "&thinsp;", "number": "&#8201;", },
		{ "char": "", "before": "s", "after": "s", "entity": "&zwnj;", "number": "&#8204;", },
		{ "char": "", "before": "s", "after": "s", "entity": "&zwj;", "number": "&#8205;", },
		{ "char": "", "before": "s", "after": "s", "entity": "&lrm;", "number": "&#8206;", },
		{ "char": "", "before": "s", "after": "s", "entity": "&rlm;", "number": "&#8207;", },
		{ "char": "–", "before": "s", "after": "s", "entity": "&ndash;", "number": "&#8211;", },
		{ "char": "—", "before": "s", "after": "s", "entity": "&mdash;", "number": "&#8212;", },
		{ "char": "‘", "before": "s", "after": "s", "entity": "&lsquo;", "number": "&#8216;", },
		{ "char": "’", "before": "s", "after": "s", "entity": "&rsquo;", "number": "&#8217;", },
		{ "char": "‚", "before": "s", "after": "s", "entity": "&sbquo;", "number": "&#8218;", },
		{ "char": "“", "before": "s", "after": "s", "entity": "&ldquo;", "number": "&#8220;", },
		{ "char": "”", "before": "s", "after": "s", "entity": "&rdquo;", "number": "&#8221;", },
		{ "char": "„", "before": "s", "after": "s", "entity": "&bdquo;", "number": "&#8222;", },
		{ "char": "†", "before": "s", "after": "s", "entity": "&dagger;", "number": "&#8224;", },
		{ "char": "‡", "before": "s", "after": "s", "entity": "&Dagger;", "number": "&#8225;", },
		{ "char": "•", "before": "s", "after": "s", "entity": "&bull;", "number": "&#8226;", },
		{ "char": "…", "before": "s", "after": "s", "entity": "&hellip;", "number": "&#8230;", },
		{ "char": "‰", "before": "s", "after": "s", "entity": "&permil;", "number": "&#8240;", },
		{ "char": "′", "before": "s", "after": "s", "entity": "&prime;", "number": "&#8242;", },
		{ "char": "″", "before": "s", "after": "s", "entity": "&Prime;", "number": "&#8243;", },
		{ "char": "‹", "before": "s", "after": "s", "entity": "&lsaquo;", "number": "&#8249;", },
		{ "char": "›", "before": "s", "after": "s", "entity": "&rsaquo;", "number": "&#8250;", },
		{ "char": "‾", "before": "s", "after": "s", "entity": "&oline;", "number": "&#8254;", },
		{ "char": "€", "before": "s", "after": "s", "entity": "&euro;", "number": "&#8364;", },
		{ "char": "™", "before": "s", "after": "s", "entity": "&trade;", "number": "&#8482;", },
		{ "char": "←", "before": "s", "after": "s", "entity": "&larr;", "number": "&#8592;", },
		{ "char": "↑", "before": "s", "after": "s", "entity": "&uarr;", "number": "&#8593;", },
		{ "char": "→", "before": "s", "after": "s", "entity": "&rarr;", "number": "&#8594;", },
		{ "char": "↓", "before": "s", "after": "s", "entity": "&darr;", "number": "&#8595;", },
		{ "char": "↔", "before": "s", "after": "s", "entity": "&harr;", "number": "&#8596;", },
		{ "char": "↵", "before": "s", "after": "s", "entity": "&crarr;", "number": "&#8629;", },
		{ "char": "⌈", "before": "s", "after": "s", "entity": "&lceil;", "number": "&#8968;", },
		{ "char": "⌉", "before": "s", "after": "s", "entity": "&rceil;", "number": "&#8969;", },
		{ "char": "⌊", "before": "s", "after": "s", "entity": "&lfloor;", "number": "&#8970;", },
		{ "char": "⌋", "before": "s", "after": "s", "entity": "&rfloor;", "number": "&#8971;", },
		{ "char": "◊", "before": "s", "after": "s", "entity": "&loz;", "number": "&#9674;", },
		{ "char": "♠", "before": "s", "after": "s", "entity": "&spades;", "number": "&#9824;", },
		{ "char": "♣", "before": "s", "after": "s", "entity": "&clubs;", "number": "&#9827;", },
		{ "char": "♥", "before": "s", "after": "s", "entity": "&hearts;", "number": "&#9829;", },
		{ "char": "♦", "before": "s", "after": "s", "entity": "&diams;", "number": "&#9830;", },
	];
	const strokes = [
		new Stroke("l", 1),		// vertical stroke
		new Stroke("o", 2),		// round stroke
		new Stroke("u", 4),		// up slant stroke
		new Stroke("d", 4),		// down slant stroke
		new Stroke("s", 3),		// special case
		new Stroke("n", 0)		// none case
	];
	const selectorsDefault = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
	//const selectorsDefault = ["h1"];

	//	KernBot
	// ===========================================================================
	const KernBot = function(input) {
		// setup vars
		let self = this,
			track = true,
			selectors = selectorsDefault,
			output = document.createElement("div"),
			options = {};
		
		// add output id to easily find
		output.setAttribute("id", "KernBotOutput");
		// add created KernBotOutput to end of DOM
		document.body.appendChild(output);

		// set user options
		// VALIDATION?
		if (input !== undefined) {
			// if input track, set the options to input value
			if (input.track !== undefined) { track = input.track; }
			// if input selectors, set the options to input value
			if (input.selectors !== undefined) { selectors = input.selectors; }
			// if input outputID, set the options to input value
			if (input.outputID !== undefined) { output = self._getDocumentElement(input.outputID)[0]; }
		}

		// set default options
		options = {
			"track": track,
			"selectors": selectors,
			"output": output
		};
		// return a new KernBot.init object that initializes the options
		return new KernBot.init(options, characters, entities, strokes);
	}
	/**
	 * KernBot initialization function
	 * @param {object} options - the default or user input options for KernBot.
	 * @param [array] characters - and array of character objects that defines
	 *                             the before and after strokes of a character.
	 * @param [array] strokes - and array of stroke objects that define the character
	 *                             code for the stroke type and its kerning weight.
	 * @param [array] entities - an array of all HTML entites, used for parsing
	 *                             them out of the string sequence.
	 * @return log KernBot to console
	 */
	// KernBot object initialization
	KernBot.init = function(options, characters, entities, strokes) {
		// vars
		let self = this;
		self.strokes = strokes;
		self.strokePairs = self._buildPairsData("strokes");
		self.characters = self._buildStrokeData(characters);
		self.entities = self._buildStrokeData(entities);
		self.characterPairs = self._buildPairsData("characters");
		// operations
		self.track = options.track;
		self.selectors = options.selectors;
		self.output = options.output;
		self.HTMLelements = self._gatherElements(self.selectors);
		self.elmRegEx = new RegExp("(<(.|\n)*?>|&(.|\n)*?;)", "g");
		// data tracking
		self.sequences = [];
		self.nodes = [];
		self.nodePairs = [];
		// DEBUGING
		console.log(self);
		console.log(self.strokePairs);
		console.log(self.characterPairs);
		console.log(self.entities);
		console.log("=========================");
	}

	//	Kern CONTROLLER
	// ===========================================================================
	/**
	 * Run KernBot's Kern f(x)
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
				// an array: 0 = node sequnce, 1 = nodePairs sequence
				sequenceData = self._stringToSequence(element, string),
				HTMLstring = "";

			// prepare HTML string to write to DOM
			HTMLstring = self._prepareHTMLString(sequenceData[0]);

			// update the elements HTML with the span injected kerning data
			self._updateElementHTML(element, HTMLstring);

			// add this sequence to the array of sequences KernBot acts on
			self.sequences.push(new Sequence(element, string, HTMLstring, sequenceData[0]));

			// update KernBot tracking
			if (self.track) {
				self._update(element, sequenceData);
			}
		}
		// log self
		console.log(self);
		// return self
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
	 * builds array of stroke data
	 * @param [array] array - an array of character or entity objects with defined stroke data (before & after)
	 * @return [array] output - array of all the characters KernBot is aware of
	 */
	KernBot.prototype._buildStrokeData = function(array) {
		// return var
		let output = [];
		// loop through the characters
		for (let i = 0; i < array.length; i++) {
			// get strokes data
			let sBefore = this._getLegendData(array[i].before, "code", this.strokes),
				sAfter = this._getLegendData(array[i].after, "code", this.strokes);
			// add new character to output
			output.push(new Character(array[i].char, sBefore, sAfter, array[i].entity, array[i].number));
		}
		// return output
		return output;
	}
	/**
	 * builds array of stroke pairs and calculates their kerning weights
	 * @param [array] this.strokes - the input data of individuals strokes
	 * @return [array] output - array of every stroke pair
	 */
	KernBot.prototype._buildPairsData = function(array) {
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
		// output
		let output = null;
		// loop through the legend
		for (let i = 0; i < legend.length; i++) {
			// check character match
			if (legend[i][property] === key) {
				// return match character data
				output = legend[i];
			}
		}
		// check there is an output
		if (null !== output) {
			return output;
		} else {
			// return false
			return false;
		}
	}
	/**
	 * Updates the KernBot array of HTML elements
	 * @param "string" selectors - an array of selectors to get the HTML for
	 * @return [array] output - an array of HTML elements
	 */
	KernBot.prototype._gatherElements = function(selectors) {
		// output
		let output = [];
		// loop through selectors
		for (let i = 0; i < selectors.length; i++) {
			// gather elements
			let elements = this._getDocumentElement(selectors[i]);
			// loop through the elements, add to output
			for (let x = 0; x < elements.length; x++) {
				output.push(elements[x]);
			}
		}
		// return output
		return output;
	}
	/**
	 * Returns an array of elements with the input selector
	 * @param "string" selector - a string of the selector to find elements for (#id, .class, tag)
	 * @return [array] output - an array of HTML elements
	 */
	KernBot.prototype._getDocumentElement = function(selector) {
		// return vars
		let output = [];
		// switch
		switch (selector.substring(0,1)) {
			// IDs
			case "#":
				// get ID elements
				let byID = document.getElementById(selector.substring(1));
				// add HTMLelement
				output.push(byID);
				break;
			// Classes
			case ".":
				// get class elements
				let byClass = document.getElementsByClassName(selector.substring(1));
				// loop through individual elements
				for (let x = 0; x < byClass.length; x++) {
					// add HTMLelement
					output.push(byClass[x]);
				}
				break;
			// HTML tag
			default:
				// get tag elements
				let byTag = document.getElementsByTagName(selector.toUpperCase());
				// loop through individual elements
				for (let x = 0; x < byTag.length; x++) {
					// add HTMLelement
					output.push(byTag[x]);
				}
				break;
		}
		// return output
		return output;
	}
	/**
	 * Returns true if it is a DOM element
	 * @param {object} o - an html element to check
	 * @return (boolean) T/F
	 */
	KernBot.prototype._isElement = function(o) { return (
			typeof HTMLElement === "object" ?
			o instanceof HTMLElement :
			o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
	)}
	/**
	 * Returns true if it is a DOM node
	 * @param "string" html - an html string to convert to an html element
	 * @return (boolean) T/F
	 */
	 KernBot.prototype._isNode = function(o) { return (
			typeof Node === "object" ?
			o instanceof Node :
			o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
	)}
	/**
	 * Updates an elements innerHTML to its kerned sequence data
	 * @param "string" html - an html string to convert to an html element
	 * @return {object} HTML nodes array or false
	 */
	KernBot.prototype._toNodes = function(html) {
		return new DOMParser().parseFromString(html,'text/html').body.childNodes || false;
	}
	/**
	 * Checks KernBot sequences to see if the element has already been kerned
	 * @param {object} element - an HTML element
	 * @return (boolean) T/F - True if element exists in sequence
	 */
	KernBot.prototype._checkElementKerned = function(element) {
		// loop through all the sequences KernBot has already acted on
		for (let i = 0; i < this.sequences.length; i++) {
			// check element exists in the sequence element context
			return (this.sequences[i].context === element ? true : false);
		}
	}
	/**
	 * Check if current index is between the indexes of an element to inject
	 * @param (number) index - a point in a loop
	 * @param [array] element - the elements to loop through and check their index range
	 * @return {object} element or (boolean) False - the element that the index belongs to
	 */
	KernBot.prototype._checkInjectIndex = function(index, elements) {
		// loop through the elements
		for (let i = 0; i < elements.length; i++) {
			// check if current index is between the indexes of an element to inject
			if (elements[i].indexes[0] <= index && index < elements[i].indexes[1]) {
				return elements[i];
			}
		}
		// return false
		return false;
	}
	/**
	 * Outputs a sequence of characters and tags
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param "string" string - the string the break down into
	 * @return [array] output - an ordered sequence of Nodes
	 */
	KernBot.prototype._stringToSequence = function(context, string) {
		// vars
		let sequenceOutput = [],
			nodePairsOutput = [],
			elements = [];
		// parser vars
		let tagRegEx = new RegExp("<(.|\n)*?>", "g"),
			entityRegEx = new RegExp("&(.|\n)*?;", "g"),
			tags = string.match(tagRegEx) || [],
			entities = string.match(entityRegEx) || [],
			elms = tags.concat(entities),
			parsedEntities = string.replace(entityRegEx, ""),
			strippedString = parsedEntities.replace(tagRegEx,"");
		// loop through elms
		for (let i = 0; elms && i < elms.length; i++) {
			// splice vars
			let start = string.indexOf(elms[i]),
				end = start + elms[i].length,
				element = string.slice(start, end),
				isEntity = entityRegEx.test(element) || false;
			// store the element in an array for now
			elements.push(new Element(context, string, element, start, end, isEntity));
		}
		// outer loop vars
		let lastElementChar = false,
			classIndex = 0;
		// loop through the string
		for (let i = 0; i < string.length; i++) {
			// loop vars
			let previousChar = this._getLegendData(string[i-1], "char", this.characters) || false,
				currentChar = this._getLegendData(string[i], "char", this.characters) || false,
				nextChar = this._getLegendData(string[i+1], "char", this.characters) || false,
				charPair = false,
				// element injector
				injectNow = this._checkInjectIndex(i, elements),
				injectNext = this._checkInjectIndex(i+1, elements),
				injectEntity = false,
				skipInject = false,
				// nodes
				charNode = null,
				charNodePair = null;
			// update the class index
			classIndex++;
			// if current char and not injecting an element
			if (currentChar && !injectNow) {
				// set the char node
				charNode = new Node(context, currentChar, classIndex);
				// inject node into sequence
				sequenceOutput.push(charNode);
				// if has next char
				if (currentChar && nextChar) {
					// set char pair
					charPair = this._getLegendData(currentChar.char+nextChar.char, "pair", this.characterPairs);
					// create nodePair
					charNodePair = new NodePair(context, charPair, classIndex);
					// add char pair kerning data to sequence node
					charNode._addKerning(charNodePair.kern);
					// store node pair to output
					nodePairsOutput.push(charNodePair);
				}
			}
			// START of element: if injecting next and not NOW
			if (injectNext && !injectNow) {
				// save last element char for loop ref
				lastElementChar = injectNext.char.slice(-1);
				// inject an &entity; next
				if (injectNext.isEntity) {
					// get the entity to inject
					injectEntity = this._getLegendData(injectNext.char, "entity", this.entities) || this._getLegendData(injectNext.char, "number", this.entities);
					// set char pair
					if (currentChar && injectEntity) {
						// set char pair
						charPair = this._getLegendData(currentChar.char+injectEntity.char, "pair", this.characterPairs);
						// create nodePair
						charNodePair = new NodePair(context, charPair, classIndex);
						// add char pair kerning data to sequence node
						charNode._addKerning(charNodePair.kern);
						// store node pair to output
						nodePairsOutput.push(charNodePair);
					}
				}
			}
			// INJECT ITEM
			if (injectNow) {
				// END: if NOT injecting next, and at last entity char
				if (!injectNext && string[i]==lastElementChar) {
					// update the class index depending on the injected item length
					classIndex -= (injectNow.char.length-1);
					// inject an &entity; now
					if (injectNow.isEntity) {
						// get the entity to inject
						injectEntity = this._getLegendData(injectNow.char, "entity", this.entities) || this._getLegendData(injectNow.char, "number", this.entities);
						// set the char node
						charNode = new Node(context, injectEntity, classIndex);
						// set char pair
						if (injectEntity && nextChar) {
							// set char pair
							charPair = this._getLegendData(injectEntity.char+nextChar.char, "pair", this.characterPairs);
							charNodePair = new NodePair(context, charPair, classIndex);
							// add char pair kerning data to sequence node
							charNode._addKerning(charNodePair.kern);
							// store node pair to output
							nodePairsOutput.push(charNodePair);
						}
					// inject an <element> now
					} else {
						// set the char node
						charNode = new Tag(context, injectNow, classIndex);
					}
					// inject node into sequence
					sequenceOutput.push(charNode);
				}
			}
		}
		// return sequence & nodePairs
		return [sequenceOutput, nodePairsOutput];
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
			// check this sequence item type, write correct HTML
			switch (sequence[i].constructor.name) {
				// element to inject
				case "Tag":
					// element vars
					let elm = this._toNodes(sequence[i].char)[0],
						elmString = sequence[i].char;
					// if is HTML element
					if (this._isElement(elm)) {
						// add element class
						elm.classList.add("element-" + sequence[i].class.substring(5));
						// get the start tag of the element
						elmString = elm.outerHTML.match(this.elmRegEx)[0];
					}
					// add element to HTML
					HTMLstring += elmString;
					break;
				// node
				default:
					// inject node into a span wrapper with kerning data
					HTMLstring += "<span class=\"" + sequence[i].class + "\"";
					HTMLstring += "style=\"letter-spacing:" + "-" + sequence[i].kerning + "px" + ";\">";
					HTMLstring += sequence[i].char;
					HTMLstring += "</span>";
					break;
			}
		}
		// return string
		return HTMLstring;
	}
	/**
	 * Updates an elements innerHTML to its kerned sequence data
	 * @param {object} element - an html element to calculate kerning data
	 * @param "string" HTML - the html to put in the innerHTML of the element
	 * @return write the kerned string to the elements HTML
	 */
	KernBot.prototype._updateElementHTML = function(element, HTML) {
		// return: write the kerned string to the elements HTML
		return element.innerHTML = HTML;
	}

	//	NODE TRACKING
	// ===========================================================================
	/**
	 * Updates the Node data for each 'this.sequence' in KernBot
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param [array] sequence - an array containing the sequence of individual nodes
	 *                           and a sequence of node pairs
	 * @return 'this' this - makes method chainable
	 */
	KernBot.prototype._update = function(context, sequence) {
		// sequence vars
		let nodeSequence = sequence[0],
			nodePairSequence = sequence[1];
		// loop through each nodeSequence
		for (let x = 0; x < nodeSequence.length; x++) {
			// track node
			this._trackNode(context, x+1, nodeSequence[x]);
		}
		// loop through each nodePairSequence
		for (let y = 0; y < nodePairSequence.length; y++) {
			// track nodePair
			this._trackNode(context, y+1, nodePairSequence[y], true);
		}
		// return KernBot
		return this;
	}
	/**
	 * Keeps track of which node have been kerned
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param (number) index - the first chars index in <span class="char-INDEX">
	 * @param {object} node - the node to track
	 * @param (boolean) isNodePair - whether the node to track is a nodePair
	 * @return (number) 0 or >1 - (0 if updated Node), (nodes.length > 1 if added new Node)
	 */
	KernBot.prototype._trackNode = function(context, index, node, isNodePair = false) {
		// vars
		let checkNode = null;
		// check node or nodePair
		if (isNodePair) {
			checkNode = this._returnSameNodePairExists(context, node);
		} else {
			checkNode = this._returnSameNodeExists(context, node);
		}
		// check node exists in this context
		if (checkNode) {
			// increase count of the this node
			checkNode._increaseCount(1);
			// add the string index of this new instance of the node
			checkNode._addCharIndex(index);
			// return 0 length => updated existing node, did not add new node to array
			return 0;
		}
		// check whether to track a node or node pair
		switch (!isNodePair) {
			// add node to track
			case true:
				// return length of nodes array
				return this.nodes.push(node);
				break;
			// add nodePair to track
			case false:
				// return length of nodePairs array
				return this.nodePairs.push(node);
			// error occured tracking the node
			default:
				// log message to console
				return "an error occured trying to track the node";
				break;
		}
	}
	/**
	 * Loops through the nodes and checks if the same node exists
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param {object} node - the node to see if it exists
	 * @return {object} node OR (boolean) false - node if exists, false if node doesn't exists
	 */
	KernBot.prototype._returnSameNodeExists = function(context, node) {
		// setup vars
		let checkChar = node.char.toString(),
			checkContext = node.context,
			checkKerning = node.kerning;
		// loop through all the stored nodes
		for (let i = 0; i < this.nodes.length; i++) {			
			let sameContext = false,
				sameChar = false,
				sameKerning = false,
				thisNode = this.nodes[i],
				thisChar = this.nodes[i].char,
				thisContext = this.nodes[i].context,
				thisKerning = this.nodes[i].kerning;
			// check char
			if (checkChar === thisChar) { sameChar = true; }
			// check context
			if (checkContext === thisContext) { sameContext = true; }
			// check kerning
			if (checkKerning === thisKerning) { sameKerning = true; }
			// check all vars
			if (sameContext && sameChar && sameKerning) {
				// node exists
				return thisNode;
			}
		}
		// node does not exist
		return false;
	}
	/**
	 * Loops through the nodePairs and checks if the same pair exists
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param {object} node - the nodePair to see if it exists
	 * @return {object} nodePair OR (boolean) false - nodePair if exists, false if node doesn't exists
	 */
	KernBot.prototype._returnSameNodePairExists = function(context, node) {
		// setup vars
		let checkPair = node.pair.toString(),
			checkContext = node.context,
			checkKerning = node.kerning;
		// loop through all the stored nodes
		for (let i = 0; i < this.nodePairs.length; i++) {			
			let sameContext = false,
				sameChar = false,
				sameKerning = false,
				thisNodePair = this.nodePairs[i],
				thisPair = this.nodePairs[i].pair,
				thisContext = this.nodePairs[i].context,
				thisKerning = this.nodePairs[i].kerning;
			// check char
			if (checkPair === thisPair) { sameChar = true; }
			// check context
			if (checkContext === thisContext) { sameContext = true; }
			// check kerning
			if (checkKerning === thisKerning) { sameKerning = true; }
			// check all vars
			if (sameContext && sameChar && sameKerning) {
				// node exists
				return thisNodePair;
			}
		}
		// node does not exist
		return false;
	}

	// KERNBOT ANALYTICS
	// ===========================================================================
	/**
	 * Outputs a sequence's HTML
	 * @return f(x) this._updateElementHTML - update KernBot output html
	 */
	KernBot.prototype.outputSequencesHTML = function() {
		// output vars
		let HTMLstring = "";
		console.log(this.sequences);
		// loop through sequences
		for (let x = 0; x < this.sequences.length; x++) {
			// sequence vars
			let sequence = this.sequences[x],
				nodes = sequence.sequence,
				context = sequence.context;
			// start of sequence
			HTMLstring += "&lt;!-- SEQUCENCE "
			HTMLstring += context.tagName.toUpperCase();
			HTMLstring += "." + context.classList;
			HTMLstring += " --&gt;";
			HTMLstring += "<br/>";
			// loop through the sequence nodes
			for (let i = 0; i < nodes.length; i++) {
				// check this sequence item type, write correct HTML
				switch (nodes[i].constructor.name) {
					// element to inject
					case "Tag":
						// element vars
						let elm = this._toNodes(nodes[i].char)[0],
							element = nodes[i].char;
						// if is HTML element
						if (this._isElement(elm)) {
							// add element class
							elm.classList.add("element-" + nodes[i].class.substring(5));
							// get the start tag of the element
							element = elm.outerHTML.match(this.elmRegEx)[0];
						}
						// add element to HTML
						HTMLstring += "&lt;";
						HTMLstring += element.slice(1,-1);
						HTMLstring += "&gt;";
						HTMLstring += "<br/>";
						break;
					// node
					default:
						// inject node into a span wrapper with kerning data
						HTMLstring += "&lt;span class=\"" + nodes[i].class + "\"&gt;";
						HTMLstring += "style=\"letter-spacing:" + "-" + nodes[i].kerning + "px" + ";\"&gt;";
						HTMLstring += nodes[i].char;
						HTMLstring += "&lt;/span&gt;";
						HTMLstring += "<br/>";
						break;
				}
			}
			// next sequence item
			HTMLstring += "<br/>";
		}
		// update this.output html
		return this._updateElementHTML(this.output, HTMLstring);
	}
	/**
	 * Outputs a sequence's CSS
	 * @return f(x) this._updateElementHTML - update KernBot output html
	 */
	KernBot.prototype.outputSequencesCSS = function() {
		// output vars
		let HTMLstring = "";
		// loop through sequences
		for (let x = 0; x < this.sequences.length; x++) {
			// sequence vars
			let sequence = this.sequences[x],
				nodes = sequence.sequence,
				context = sequence.context.tagName,
				hasClass = sequence.context.getAttribute("class") || false,
				hasId = sequence.context.getAttribute("id") || false;
			// start of sequence
			HTMLstring += "/* SEQUCENCE " + context.toUpperCase() + " */";
			HTMLstring += "<br/>";
			// loop through the sequence nodes
			for (let i = 0; i < nodes.length; i++) {

				// context
				HTMLstring += context.toLowerCase();
				// any class or id of that existed on context
				if (hasClass) { HTMLstring += "."+hasClass; }
				if (hasId) { HTMLstring += "#"+hasId; }
				HTMLstring += " ";

				// check the type
				if (nodes[i].constructor.name == "Tag" || nodes[i].data.constructor.name == "Element") {
					// tag vars
					let tagNode = this._toNodes(nodes[i].char)[0] || false,
						tag = false;
					// set tag
					if (tagNode) { tag = tagNode.tagName.toLowerCase(); }
					// if tag
					if (tag) {
						// tag element
						HTMLstring += tag + ".element-" + nodes[i].class.substring(5);
						HTMLstring += " ";
						HTMLstring += "{ letter-spacing: 0px; }";
						HTMLstring += "<br/>";
					}
				} else {
					// node span
					HTMLstring += "span."+nodes[i].class+" {";
					HTMLstring += " ";
					HTMLstring += "letter-spacing: -" + nodes[i].kerning + "px;";
					HTMLstring += " ";
					HTMLstring += "}";
					HTMLstring += "<br/>";
				}
			}
			// next sequence item
			HTMLstring += "<br/>";
		}
		// update this.output html
		return this._updateElementHTML(this.output, HTMLstring);
	}
	/**
	 * Loops through the nodePairs and write them to the input ID element
	 * @return {action} write HTML string to the innerHTML of the input ID element
	 */
	KernBot.prototype.writeNodePairsToHTML = function() {
		// vars
		let HTMLstring = "<ul>";
		// loop through counted NodePairs
		for (let i = 0; i < this.nodePairs.length; i++) {
			// vars
			let elm = this.nodePairs[i],
				tag = elm.context.tagName.toLowerCase();
			HTMLstring += "<li>";
				HTMLstring += "<" + tag + ">";
					HTMLstring += "“";
					HTMLstring += "<span style=\"letter-spacing:" + elm.letterSpace + ";\">";
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
					HTMLstring += elm.letterSpace + "";
				HTMLstring += "<br>";
					HTMLstring += "Occurrences: ";
					HTMLstring += elm.count;
				HTMLstring += "</p>";
			HTMLstring += "</li>";
		}
		HTMLstring += "</ul>";
		// update this.output html
		return this._updateElementHTML(this.output, HTMLstring);
	}

	// KERNBOT IN GLOBAL SPACE
	// ===========================================================================
	// set KernBot.init prototype to KernBot's prototype
	KernBot.init.prototype = KernBot.prototype;
	// create "$KB" alias in the global object (shorthand)
	global.KernBot = global.$KB = KernBot;
	// return true if everything loaded properly
	return true;

// execute IIFE and pass dependencies
} (window, undefined));