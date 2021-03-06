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
				"b": before,
				"a": after
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
					b: c1.strokes.b,
					a: c1.strokes.a
				}
			};
			this.c2 = {
				char: c2.char,
				strokes: {
					b: c2.strokes.b,
					a: c2.strokes.a
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
					b: charPair.c1.strokes.b,
					a: charPair.c1.strokes.a
				}
			};
			this.c2 = {
				char: charPair.c2.char,
				strokes: {
					b: charPair.c2.strokes.b,
					a: charPair.c2.strokes.a
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
		{ "char": "a", "b": "o", "a": "l" },
		{ "char": "b", "b": "l", "a": "o" },
		{ "char": "c", "b": "o", "a": "l" },
		{ "char": "d", "b": "o", "a": "l" },
		{ "char": "e", "b": "o", "a": "o" },
		{ "char": "f", "b": "l", "a": "l" },
		{ "char": "g", "b": "o", "a": "o" },
		{ "char": "h", "b": "l", "a": "l" },
		{ "char": "i", "b": "l", "a": "l" },
		{ "char": "j", "b": "l", "a": "l" },
		{ "char": "k", "b": "l", "a": "l" },
		{ "char": "l", "b": "l", "a": "l" },
		{ "char": "m", "b": "l", "a": "l" },
		{ "char": "n", "b": "l", "a": "l" },
		{ "char": "o", "b": "o", "a": "o" },
		{ "char": "p", "b": "l", "a": "o" },
		{ "char": "q", "b": "o", "a": "l" },
		{ "char": "r", "b": "l", "a": "l" },
		{ "char": "s", "b": "l", "a": "l" },
		{ "char": "t", "b": "l", "a": "s" },
		{ "char": "u", "b": "s", "a": "l" },
		{ "char": "v", "b": "d", "a": "u" },
		{ "char": "w", "b": "d", "a": "u" },
		{ "char": "x", "b": "l", "a": "l" },
		{ "char": "y", "b": "l", "a": "u" },
		{ "char": "z", "b": "l", "a": "l" },
		{ "char": "A", "b": "u", "a": "d" },
		{ "char": "B", "b": "l", "a": "o" },
		{ "char": "C", "b": "o", "a": "l" },
		{ "char": "D", "b": "l", "a": "o" },
		{ "char": "E", "b": "l", "a": "l" },
		{ "char": "F", "b": "l", "a": "u" },
		{ "char": "G", "b": "o", "a": "s" },
		{ "char": "H", "b": "l", "a": "l" },
		{ "char": "I", "b": "l", "a": "l" },
		{ "char": "J", "b": "s", "a": "l" },
		{ "char": "K", "b": "l", "a": "s" },
		{ "char": "L", "b": "l", "a": "s" },
		{ "char": "M", "b": "l", "a": "l" },
		{ "char": "N", "b": "l", "a": "l" },
		{ "char": "O", "b": "o", "a": "o" },
		{ "char": "P", "b": "l", "a": "s" },
		{ "char": "Q", "b": "o", "a": "o" },
		{ "char": "R", "b": "l", "a": "s" },
		{ "char": "S", "b": "l", "a": "l" },
		{ "char": "T", "b": "d", "a": "u" },
		{ "char": "U", "b": "l", "a": "l" },
		{ "char": "V", "b": "d", "a": "u" },
		{ "char": "W", "b": "d", "a": "u" },
		{ "char": "X", "b": "l", "a": "l" },
		{ "char": "Y", "b": "d", "a": "u" },
		{ "char": "Z", "b": "l", "a": "l" },
		{ "char": "0", "b": "o", "a": "o" },
		{ "char": "1", "b": "l", "a": "l" },
		{ "char": "2", "b": "l", "a": "o" },
		{ "char": "3", "b": "l", "a": "o" },
		{ "char": "4", "b": "u", "a": "l" },
		{ "char": "5", "b": "l", "a": "s" },
		{ "char": "6", "b": "o", "a": "o" },
		{ "char": "7", "b": "l", "a": "u" },
		{ "char": "8", "b": "o", "a": "o" },
		{ "char": "9", "b": "l", "a": "o" },
		{ "char": " ", "b": "n", "a": "n" },
		{ "char": ".", "b": "s", "a": "n" },
		{ "char": ",", "b": "s", "a": "n" },
		{ "char": ";", "b": "s", "a": "n" },
		{ "char": ":", "b": "s", "a": "n" },
		{ "char": "“", "b": "n", "a": "s" },
		{ "char": "”", "b": "s", "a": "n" },
		{ "char": "‘", "b": "n", "a": "s" },
		{ "char": "’", "b": "s", "a": "n" },
		{ "char": "'", "b": "s", "a": "s" },
		{ "char": "\"", "b": "s", "a": "s" },
		{ "char": "!", "b": "s", "a": "n" },
		{ "char": "?", "b": "s", "a": "n" },
		{ "char": "@", "b": "o", "a": "o" },
		{ "char": "#", "b": "u", "a": "u" },
		{ "char": "$", "b": "l", "a": "l" },
		{ "char": "%", "b": "s", "a": "s" },
		{ "char": "^", "b": "s", "a": "s" },
		{ "char": "&", "b": "o", "a": "s" },
		{ "char": "*", "b": "s", "a": "s" },
		{ "char": "(", "b": "n", "a": "s" },
		{ "char": ")", "b": "s", "a": "n" },
		{ "char": "[", "b": "n", "a": "s" },
		{ "char": "]", "b": "s", "a": "n" },
		{ "char": "{", "b": "n", "a": "s" },
		{ "char": "}", "b": "s", "a": "n" },
		{ "char": "/", "b": "s", "a": "s" }
	];
	const entities = [
		{ "char": " ", "b": "s", "a": "s", "entity": null, "number": "&#32;", },
		{ "char": "!", "b": "s", "a": "s", "entity": null, "number": "&#33;", },
		{ "char": "\"", "b": "s", "a": "s", "entity": null, "number": "&#34;", },
		{ "char": "#", "b": "s", "a": "s", "entity": null, "number": "&#35;", },
		{ "char": "$", "b": "s", "a": "s", "entity": null, "number": "&#36;", },
		{ "char": "%", "b": "s", "a": "s", "entity": null, "number": "&#37;", },
		{ "char": "&", "b": "s", "a": "s", "entity": "&amp;", "number": "&#38;", },
		{ "char": "'", "b": "s", "a": "s", "entity": null, "number": "&#39;", },
		{ "char": "(", "b": "s", "a": "s", "entity": null, "number": "&#40;", },
		{ "char": ")", "b": "s", "a": "s", "entity": null, "number": "&#41;", },
		{ "char": "*", "b": "s", "a": "s", "entity": null, "number": "&#42;", },
		{ "char": "+", "b": "s", "a": "s", "entity": null, "number": "&#43;", },
		{ "char": ",", "b": "s", "a": "s", "entity": null, "number": "&#44;", },
		{ "char": "-", "b": "s", "a": "s", "entity": null, "number": "&#45;", },
		{ "char": ".", "b": "s", "a": "s", "entity": null, "number": "&#46;", },
		{ "char": "/", "b": "s", "a": "s", "entity": null, "number": "&#47;", },
		{ "char": "0", "b": "s", "a": "s", "entity": null, "number": "&#48;", },
		{ "char": "1", "b": "s", "a": "s", "entity": null, "number": "&#49;", },
		{ "char": "2", "b": "s", "a": "s", "entity": null, "number": "&#50;", },
		{ "char": "3", "b": "s", "a": "s", "entity": null, "number": "&#51;", },
		{ "char": "4", "b": "s", "a": "s", "entity": null, "number": "&#52;", },
		{ "char": "5", "b": "s", "a": "s", "entity": null, "number": "&#53;", },
		{ "char": "6", "b": "s", "a": "s", "entity": null, "number": "&#54;", },
		{ "char": "7", "b": "s", "a": "s", "entity": null, "number": "&#55;", },
		{ "char": "8", "b": "s", "a": "s", "entity": null, "number": "&#56;", },
		{ "char": "9", "b": "s", "a": "s", "entity": null, "number": "&#57;", },
		{ "char": ":", "b": "s", "a": "s", "entity": null, "number": "&#58;", },
		{ "char": ";", "b": "s", "a": "s", "entity": null, "number": "&#59;", },
		{ "char": "<", "b": "s", "a": "s", "entity": "&lt;", "number": "&#60;", },
		{ "char": "=", "b": "s", "a": "s", "entity": null, "number": "&#61;", },
		{ "char": ">", "b": "s", "a": "s", "entity": "&gt;", "number": "&#62;", },
		{ "char": "?", "b": "s", "a": "s", "entity": null, "number": "&#63;", },
		{ "char": "@", "b": "s", "a": "s", "entity": null, "number": "&#64;", },
		{ "char": "A", "b": "s", "a": "s", "entity": null, "number": "&#65;", },
		{ "char": "B", "b": "s", "a": "s", "entity": null, "number": "&#66;", },
		{ "char": "C", "b": "s", "a": "s", "entity": null, "number": "&#67;", },
		{ "char": "D", "b": "s", "a": "s", "entity": null, "number": "&#68;", },
		{ "char": "E", "b": "s", "a": "s", "entity": null, "number": "&#69;", },
		{ "char": "F", "b": "s", "a": "s", "entity": null, "number": "&#70;", },
		{ "char": "G", "b": "s", "a": "s", "entity": null, "number": "&#71;", },
		{ "char": "H", "b": "s", "a": "s", "entity": null, "number": "&#72;", },
		{ "char": "I", "b": "s", "a": "s", "entity": null, "number": "&#73;", },
		{ "char": "J", "b": "s", "a": "s", "entity": null, "number": "&#74;", },
		{ "char": "K", "b": "s", "a": "s", "entity": null, "number": "&#75;", },
		{ "char": "L", "b": "s", "a": "s", "entity": null, "number": "&#76;", },
		{ "char": "M", "b": "s", "a": "s", "entity": null, "number": "&#77;", },
		{ "char": "N", "b": "s", "a": "s", "entity": null, "number": "&#78;", },
		{ "char": "O", "b": "s", "a": "s", "entity": null, "number": "&#79;", },
		{ "char": "P", "b": "s", "a": "s", "entity": null, "number": "&#80;", },
		{ "char": "Q", "b": "s", "a": "s", "entity": null, "number": "&#81;", },
		{ "char": "R", "b": "s", "a": "s", "entity": null, "number": "&#82;", },
		{ "char": "S", "b": "s", "a": "s", "entity": null, "number": "&#83;", },
		{ "char": "T", "b": "s", "a": "s", "entity": null, "number": "&#84;", },
		{ "char": "U", "b": "s", "a": "s", "entity": null, "number": "&#85;", },
		{ "char": "V", "b": "s", "a": "s", "entity": null, "number": "&#86;", },
		{ "char": "W", "b": "s", "a": "s", "entity": null, "number": "&#87;", },
		{ "char": "X", "b": "s", "a": "s", "entity": null, "number": "&#88;", },
		{ "char": "Y", "b": "s", "a": "s", "entity": null, "number": "&#89;", },
		{ "char": "Z", "b": "s", "a": "s", "entity": null, "number": "&#90;", },
		{ "char": "[", "b": "s", "a": "s", "entity": null, "number": "&#91;", },
		{ "char": "\\", "b": "s", "a": "s", "entity": null, "number": "&#92;", },
		{ "char": "]", "b": "s", "a": "s", "entity": null, "number": "&#93;", },
		{ "char": "^", "b": "s", "a": "s", "entity": null, "number": "&#94;", },
		{ "char": "_", "b": "s", "a": "s", "entity": null, "number": "&#95;", },
		{ "char": "`", "b": "s", "a": "s", "entity": null, "number": "&#96;", },
		{ "char": "a", "b": "s", "a": "s", "entity": null, "number": "&#97;", },
		{ "char": "b", "b": "s", "a": "s", "entity": null, "number": "&#98;", },
		{ "char": "c", "b": "s", "a": "s", "entity": null, "number": "&#99;", },
		{ "char": "d", "b": "s", "a": "s", "entity": null, "number": "&#100;", },
		{ "char": "e", "b": "s", "a": "s", "entity": null, "number": "&#101;", },
		{ "char": "f", "b": "s", "a": "s", "entity": null, "number": "&#102;", },
		{ "char": "g", "b": "s", "a": "s", "entity": null, "number": "&#103;", },
		{ "char": "h", "b": "s", "a": "s", "entity": null, "number": "&#104;", },
		{ "char": "i", "b": "s", "a": "s", "entity": null, "number": "&#105;", },
		{ "char": "j", "b": "s", "a": "s", "entity": null, "number": "&#106;", },
		{ "char": "k", "b": "s", "a": "s", "entity": null, "number": "&#107;", },
		{ "char": "l", "b": "s", "a": "s", "entity": null, "number": "&#108;", },
		{ "char": "m", "b": "s", "a": "s", "entity": null, "number": "&#109;", },
		{ "char": "n", "b": "s", "a": "s", "entity": null, "number": "&#110;", },
		{ "char": "o", "b": "s", "a": "s", "entity": null, "number": "&#111;", },
		{ "char": "p", "b": "s", "a": "s", "entity": null, "number": "&#112;", },
		{ "char": "q", "b": "s", "a": "s", "entity": null, "number": "&#113;", },
		{ "char": "r", "b": "s", "a": "s", "entity": null, "number": "&#114;", },
		{ "char": "s", "b": "s", "a": "s", "entity": null, "number": "&#115;", },
		{ "char": "t", "b": "s", "a": "s", "entity": null, "number": "&#116;", },
		{ "char": "u", "b": "s", "a": "s", "entity": null, "number": "&#117;", },
		{ "char": "v", "b": "s", "a": "s", "entity": null, "number": "&#118;", },
		{ "char": "w", "b": "s", "a": "s", "entity": null, "number": "&#119;", },
		{ "char": "x", "b": "s", "a": "s", "entity": null, "number": "&#120;", },
		{ "char": "y", "b": "s", "a": "s", "entity": null, "number": "&#121;", },
		{ "char": "z", "b": "s", "a": "s", "entity": null, "number": "&#122;", },
		{ "char": "{", "b": "s", "a": "s", "entity": null, "number": "&#123;", },
		{ "char": "|", "b": "s", "a": "s", "entity": null, "number": "&#124;", },
		{ "char": "}", "b": "s", "a": "s", "entity": null, "number": "&#125;", },
		{ "char": "~", "b": "s", "a": "s", "entity": null, "number": "&#126;", },
		{ "char": "À", "b": "s", "a": "s", "entity": "&Agrave;", "number": "&#192;", },
		{ "char": "Á", "b": "s", "a": "s", "entity": "&Aacute;", "number": "&#193;", },
		{ "char": "Â", "b": "s", "a": "s", "entity": "&Acirc;", "number": "&#194;", },
		{ "char": "Ã", "b": "s", "a": "s", "entity": "&Atilde;", "number": "&#195;", },
		{ "char": "Ä", "b": "s", "a": "s", "entity": "&Auml;", "number": "&#196;", },
		{ "char": "Å", "b": "s", "a": "s", "entity": "&Aring;", "number": "&#197;", },
		{ "char": "Æ", "b": "s", "a": "s", "entity": "&AElig;", "number": "&#198;", },
		{ "char": "Ç", "b": "s", "a": "s", "entity": "&Ccedil;", "number": "&#199;", },
		{ "char": "È", "b": "s", "a": "s", "entity": "&Egrave;", "number": "&#200;", },
		{ "char": "É", "b": "s", "a": "s", "entity": "&Eacute;", "number": "&#201;", },
		{ "char": "Ê", "b": "s", "a": "s", "entity": "&Ecirc;", "number": "&#202;", },
		{ "char": "Ë", "b": "s", "a": "s", "entity": "&Euml;", "number": "&#203;", },
		{ "char": "Ì", "b": "s", "a": "s", "entity": "&Igrave;", "number": "&#204;", },
		{ "char": "Í", "b": "s", "a": "s", "entity": "&Iacute;", "number": "&#205;", },
		{ "char": "Î", "b": "s", "a": "s", "entity": "&Icirc;", "number": "&#206;", },
		{ "char": "Ï", "b": "s", "a": "s", "entity": "&Iuml;", "number": "&#207;", },
		{ "char": "Ð", "b": "s", "a": "s", "entity": "&ETH;", "number": "&#208;", },
		{ "char": "Ñ", "b": "s", "a": "s", "entity": "&Ntilde;", "number": "&#209;", },
		{ "char": "Ò", "b": "s", "a": "s", "entity": "&Ograve;", "number": "&#210;", },
		{ "char": "Ó", "b": "s", "a": "s", "entity": "&Oacute;", "number": "&#211;", },
		{ "char": "Ô", "b": "s", "a": "s", "entity": "&Ocirc;", "number": "&#212;", },
		{ "char": "Õ", "b": "s", "a": "s", "entity": "&Otilde;", "number": "&#213;", },
		{ "char": "Ö", "b": "s", "a": "s", "entity": "&Ouml;", "number": "&#214;", },
		{ "char": "Ø", "b": "s", "a": "s", "entity": "&Oslash;", "number": "&#216;", },
		{ "char": "Ù", "b": "s", "a": "s", "entity": "&Ugrave;", "number": "&#217;", },
		{ "char": "Ú", "b": "s", "a": "s", "entity": "&Uacute;", "number": "&#218;", },
		{ "char": "Û", "b": "s", "a": "s", "entity": "&Ucirc;", "number": "&#219;", },
		{ "char": "Ü", "b": "s", "a": "s", "entity": "&Uuml;", "number": "&#220;", },
		{ "char": "Ý", "b": "s", "a": "s", "entity": "&Yacute;", "number": "&#221;", },
		{ "char": "Þ", "b": "s", "a": "s", "entity": "&THORN;", "number": "&#222;", },
		{ "char": "ß", "b": "s", "a": "s", "entity": "&szlig;", "number": "&#223;", },
		{ "char": "à", "b": "s", "a": "s", "entity": "&agrave;", "number": "&#224;", },
		{ "char": "á", "b": "s", "a": "s", "entity": "&aacute;", "number": "&#225;", },
		{ "char": "â", "b": "s", "a": "s", "entity": "&acirc;", "number": "&#226;", },
		{ "char": "ã", "b": "s", "a": "s", "entity": "&atilde;", "number": "&#227;", },
		{ "char": "ä", "b": "s", "a": "s", "entity": "&auml;", "number": "&#228;", },
		{ "char": "å", "b": "s", "a": "s", "entity": "&aring;", "number": "&#229;", },
		{ "char": "æ", "b": "s", "a": "s", "entity": "&aelig;", "number": "&#230;", },
		{ "char": "ç", "b": "s", "a": "s", "entity": "&ccedil;", "number": "&#231;", },
		{ "char": "è", "b": "s", "a": "s", "entity": "&egrave;", "number": "&#232;", },
		{ "char": "é", "b": "s", "a": "s", "entity": "&eacute;", "number": "&#233;", },
		{ "char": "ê", "b": "s", "a": "s", "entity": "&ecirc;", "number": "&#234;", },
		{ "char": "ë", "b": "s", "a": "s", "entity": "&euml;", "number": "&#235;", },
		{ "char": "ì", "b": "s", "a": "s", "entity": "&igrave;", "number": "&#236;", },
		{ "char": "í", "b": "s", "a": "s", "entity": "&iacute;", "number": "&#237;", },
		{ "char": "î", "b": "s", "a": "s", "entity": "&icirc;", "number": "&#238;", },
		{ "char": "ï", "b": "s", "a": "s", "entity": "&iuml;", "number": "&#239;", },
		{ "char": "ð", "b": "s", "a": "s", "entity": "&eth;", "number": "&#240;", },
		{ "char": "ñ", "b": "s", "a": "s", "entity": "&ntilde;", "number": "&#241;", },
		{ "char": "ò", "b": "s", "a": "s", "entity": "&ograve;", "number": "&#242;", },
		{ "char": "ó", "b": "s", "a": "s", "entity": "&oacute;", "number": "&#243;", },
		{ "char": "ô", "b": "s", "a": "s", "entity": "&ocirc;", "number": "&#244;", },
		{ "char": "õ", "b": "s", "a": "s", "entity": "&otilde;", "number": "&#245;", },
		{ "char": "ö", "b": "s", "a": "s", "entity": "&ouml;", "number": "&#246;", },
		{ "char": "ø", "b": "s", "a": "s", "entity": "&oslash;", "number": "&#248;", },
		{ "char": "ù", "b": "s", "a": "s", "entity": "&ugrave;", "number": "&#249;", },
		{ "char": "ú", "b": "s", "a": "s", "entity": "&uacute;", "number": "&#250;", },
		{ "char": "û", "b": "s", "a": "s", "entity": "&ucirc;", "number": "&#251;", },
		{ "char": "ü", "b": "s", "a": "s", "entity": "&uuml;", "number": "&#252;", },
		{ "char": "ý", "b": "s", "a": "s", "entity": "&yacute;", "number": "&#253;", },
		{ "char": "þ", "b": "s", "a": "s", "entity": "&thorn;", "number": "&#254;", },
		{ "char": "ÿ", "b": "s", "a": "s", "entity": "&yuml;", "number": "&#255;", },
		{ "char": " ", "b": "s", "a": "s", "entity": "&nbsp;", "number": "&#160;", },
		{ "char": "¡", "b": "s", "a": "s", "entity": "&iexcl;", "number": "&#161;", },
		{ "char": "¢", "b": "s", "a": "s", "entity": "&cent;", "number": "&#162;", },
		{ "char": "£", "b": "s", "a": "s", "entity": "&pound;", "number": "&#163;", },
		{ "char": "¤", "b": "s", "a": "s", "entity": "&curren;", "number": "&#164;", },
		{ "char": "¥", "b": "s", "a": "s", "entity": "&yen;", "number": "&#165;", },
		{ "char": "¦", "b": "s", "a": "s", "entity": "&brvbar;", "number": "&#166;", },
		{ "char": "§", "b": "s", "a": "s", "entity": "&sect;", "number": "&#167;", },
		{ "char": "¨", "b": "s", "a": "s", "entity": "&uml;", "number": "&#168;", },
		{ "char": "©", "b": "s", "a": "s", "entity": "&copy;", "number": "&#169;", },
		{ "char": "ª", "b": "s", "a": "s", "entity": "&ordf;", "number": "&#170;", },
		{ "char": "«", "b": "s", "a": "s", "entity": "&laquo;", "number": "&#171;", },
		{ "char": "¬", "b": "s", "a": "s", "entity": "&not;", "number": "&#172;", },
		{ "char": " ", "b": "s", "a": "s", "entity": "&shy;", "number": "&#173;", },
		{ "char": "®", "b": "s", "a": "s", "entity": "&reg;", "number": "&#174;", },
		{ "char": "¯", "b": "s", "a": "s", "entity": "&macr;", "number": "&#175;", },
		{ "char": "°", "b": "s", "a": "s", "entity": "&deg;", "number": "&#176;", },
		{ "char": "±", "b": "s", "a": "s", "entity": "&plusmn;", "number": "&#177;", },
		{ "char": "²", "b": "s", "a": "s", "entity": "&sup2;", "number": "&#178;", },
		{ "char": "³", "b": "s", "a": "s", "entity": "&sup3;", "number": "&#179;", },
		{ "char": "´", "b": "s", "a": "s", "entity": "&acute;", "number": "&#180;", },
		{ "char": "µ", "b": "s", "a": "s", "entity": "&micro;", "number": "&#181;", },
		{ "char": "¶", "b": "s", "a": "s", "entity": "&para;", "number": "&#182;", },
		{ "char": "¸", "b": "s", "a": "s", "entity": "&cedil;", "number": "&#184;", },
		{ "char": "¹", "b": "s", "a": "s", "entity": "&sup1;", "number": "&#185;", },
		{ "char": "º", "b": "s", "a": "s", "entity": "&ordm;", "number": "&#186;", },
		{ "char": "»", "b": "s", "a": "s", "entity": "&raquo;", "number": "&#187;", },
		{ "char": "¼", "b": "s", "a": "s", "entity": "&frac14;", "number": "&#188;", },
		{ "char": "½", "b": "s", "a": "s", "entity": "&frac12;", "number": "&#189;", },
		{ "char": "¾", "b": "s", "a": "s", "entity": "&frac34;", "number": "&#190;", },
		{ "char": "¿", "b": "s", "a": "s", "entity": "&iquest;", "number": "&#191;", },
		{ "char": "×", "b": "s", "a": "s", "entity": "&times;", "number": "&#215;", },
		{ "char": "÷", "b": "s", "a": "s", "entity": "&divide;", "number": "&#247;", },
		{ "char": "∀", "b": "s", "a": "s", "entity": "&forall;", "number": "&#8704;", },
		{ "char": "∂", "b": "s", "a": "s", "entity": "&part;", "number": "&#8706;", },
		{ "char": "∃", "b": "s", "a": "s", "entity": "&exist;", "number": "&#8707;", },
		{ "char": "∅", "b": "s", "a": "s", "entity": "&empty;", "number": "&#8709;", },
		{ "char": "∇", "b": "s", "a": "s", "entity": "&nabla;", "number": "&#8711;", },
		{ "char": "∈", "b": "s", "a": "s", "entity": "&isin;", "number": "&#8712;", },
		{ "char": "∉", "b": "s", "a": "s", "entity": "&notin;", "number": "&#8713;", },
		{ "char": "∋", "b": "s", "a": "s", "entity": "&ni;", "number": "&#8715;", },
		{ "char": "∏", "b": "s", "a": "s", "entity": "&prod;", "number": "&#8719;", },
		{ "char": "∑", "b": "s", "a": "s", "entity": "&sum;", "number": "&#8721;", },
		{ "char": "−", "b": "s", "a": "s", "entity": "&minus;", "number": "&#8722;", },
		{ "char": "∗", "b": "s", "a": "s", "entity": "&lowast;", "number": "&#8727;", },
		{ "char": "√", "b": "s", "a": "s", "entity": "&radic;", "number": "&#8730;", },
		{ "char": "∝", "b": "s", "a": "s", "entity": "&prop;", "number": "&#8733;", },
		{ "char": "∞", "b": "s", "a": "s", "entity": "&infin;", "number": "&#8734;", },
		{ "char": "∠", "b": "s", "a": "s", "entity": "&ang;", "number": "&#8736;", },
		{ "char": "∧", "b": "s", "a": "s", "entity": "&and;", "number": "&#8743;", },
		{ "char": "∨", "b": "s", "a": "s", "entity": "&or;", "number": "&#8744;", },
		{ "char": "∩", "b": "s", "a": "s", "entity": "&cap;", "number": "&#8745;", },
		{ "char": "∪", "b": "s", "a": "s", "entity": "&cup;", "number": "&#8746;", },
		{ "char": "∫", "b": "s", "a": "s", "entity": "&int;", "number": "&#8747;", },
		{ "char": "∴", "b": "s", "a": "s", "entity": "&there4;", "number": "&#8756;", },
		{ "char": "∼", "b": "s", "a": "s", "entity": "&sim;", "number": "&#8764;", },
		{ "char": "≅", "b": "s", "a": "s", "entity": "&cong;", "number": "&#8773;", },
		{ "char": "≈", "b": "s", "a": "s", "entity": "&asymp;", "number": "&#8776;", },
		{ "char": "≠", "b": "s", "a": "s", "entity": "&ne;", "number": "&#8800;", },
		{ "char": "≡", "b": "s", "a": "s", "entity": "&equiv;", "number": "&#8801;", },
		{ "char": "≤", "b": "s", "a": "s", "entity": "&le;", "number": "&#8804;", },
		{ "char": "≥", "b": "s", "a": "s", "entity": "&ge;", "number": "&#8805;", },
		{ "char": "⊂", "b": "s", "a": "s", "entity": "&sub;", "number": "&#8834;", },
		{ "char": "⊃", "b": "s", "a": "s", "entity": "&sup;", "number": "&#8835;", },
		{ "char": "⊄", "b": "s", "a": "s", "entity": "&nsub;", "number": "&#8836;", },
		{ "char": "⊆", "b": "s", "a": "s", "entity": "&sube;", "number": "&#8838;", },
		{ "char": "⊇", "b": "s", "a": "s", "entity": "&supe;", "number": "&#8839;", },
		{ "char": "⊕", "b": "s", "a": "s", "entity": "&oplus;", "number": "&#8853;", },
		{ "char": "⊗", "b": "s", "a": "s", "entity": "&otimes;", "number": "&#8855;", },
		{ "char": "⊥", "b": "s", "a": "s", "entity": "&perp;", "number": "&#8869;", },
		{ "char": "⋅", "b": "s", "a": "s", "entity": "&sdot;", "number": "&#8901;", },
		{ "char": "Α", "b": "s", "a": "s", "entity": "&Alpha;", "number": "&#913;", },
		{ "char": "Β", "b": "s", "a": "s", "entity": "&Beta;", "number": "&#914;", },
		{ "char": "Γ", "b": "s", "a": "s", "entity": "&Gamma;", "number": "&#915;", },
		{ "char": "Δ", "b": "s", "a": "s", "entity": "&Delta;", "number": "&#916;", },
		{ "char": "Ε", "b": "s", "a": "s", "entity": "&Epsilon;", "number": "&#917;", },
		{ "char": "Ζ", "b": "s", "a": "s", "entity": "&Zeta;", "number": "&#918;", },
		{ "char": "Η", "b": "s", "a": "s", "entity": "&Eta;", "number": "&#919;", },
		{ "char": "Θ", "b": "s", "a": "s", "entity": "&Theta;", "number": "&#920;", },
		{ "char": "Ι", "b": "s", "a": "s", "entity": "&Iota;", "number": "&#921;", },
		{ "char": "Κ", "b": "s", "a": "s", "entity": "&Kappa;", "number": "&#922;", },
		{ "char": "Λ", "b": "s", "a": "s", "entity": "&Lambda;", "number": "&#923;", },
		{ "char": "Μ", "b": "s", "a": "s", "entity": "&Mu;", "number": "&#924;", },
		{ "char": "Ν", "b": "s", "a": "s", "entity": "&Nu;", "number": "&#925;", },
		{ "char": "Ξ", "b": "s", "a": "s", "entity": "&Xi;", "number": "&#926;", },
		{ "char": "Ο", "b": "s", "a": "s", "entity": "&Omicron;", "number": "&#927;", },
		{ "char": "Π", "b": "s", "a": "s", "entity": "&Pi;", "number": "&#928;", },
		{ "char": "Ρ", "b": "s", "a": "s", "entity": "&Rho;", "number": "&#929;", },
		{ "char": "Σ", "b": "s", "a": "s", "entity": "&Sigma;", "number": "&#931;", },
		{ "char": "Τ", "b": "s", "a": "s", "entity": "&Tau;", "number": "&#932;", },
		{ "char": "Υ", "b": "s", "a": "s", "entity": "&Upsilon;", "number": "&#933;", },
		{ "char": "Φ", "b": "s", "a": "s", "entity": "&Phi;", "number": "&#934;", },
		{ "char": "Χ", "b": "s", "a": "s", "entity": "&Chi;", "number": "&#935;", },
		{ "char": "Ψ", "b": "s", "a": "s", "entity": "&Psi;", "number": "&#936;", },
		{ "char": "Ω", "b": "s", "a": "s", "entity": "&Omega;", "number": "&#937;", },
		{ "char": "α", "b": "s", "a": "s", "entity": "&alpha;", "number": "&#945;", },
		{ "char": "β", "b": "s", "a": "s", "entity": "&beta;", "number": "&#946;", },
		{ "char": "γ", "b": "s", "a": "s", "entity": "&gamma;", "number": "&#947;", },
		{ "char": "δ", "b": "s", "a": "s", "entity": "&delta;", "number": "&#948;", },
		{ "char": "ε", "b": "s", "a": "s", "entity": "&epsilon;", "number": "&#949;", },
		{ "char": "ζ", "b": "s", "a": "s", "entity": "&zeta;", "number": "&#950;", },
		{ "char": "η", "b": "s", "a": "s", "entity": "&eta;", "number": "&#951;", },
		{ "char": "θ", "b": "s", "a": "s", "entity": "&theta;", "number": "&#952;", },
		{ "char": "ι", "b": "s", "a": "s", "entity": "&iota;", "number": "&#953;", },
		{ "char": "κ", "b": "s", "a": "s", "entity": "&kappa;", "number": "&#954;", },
		{ "char": "λ", "b": "s", "a": "s", "entity": "&lambda;", "number": "&#955;", },
		{ "char": "μ", "b": "s", "a": "s", "entity": "&mu;", "number": "&#956;", },
		{ "char": "ν", "b": "s", "a": "s", "entity": "&nu;", "number": "&#957;", },
		{ "char": "ξ", "b": "s", "a": "s", "entity": "&xi;", "number": "&#958;", },
		{ "char": "ο", "b": "s", "a": "s", "entity": "&omicron;", "number": "&#959;", },
		{ "char": "π", "b": "s", "a": "s", "entity": "&pi;", "number": "&#960;", },
		{ "char": "ρ", "b": "s", "a": "s", "entity": "&rho;", "number": "&#961;", },
		{ "char": "ς", "b": "s", "a": "s", "entity": "&sigmaf;", "number": "&#962;", },
		{ "char": "σ", "b": "s", "a": "s", "entity": "&sigma;", "number": "&#963;", },
		{ "char": "τ", "b": "s", "a": "s", "entity": "&tau;", "number": "&#964;", },
		{ "char": "υ", "b": "s", "a": "s", "entity": "&upsilon;", "number": "&#965;", },
		{ "char": "φ", "b": "s", "a": "s", "entity": "&phi;", "number": "&#966;", },
		{ "char": "χ", "b": "s", "a": "s", "entity": "&chi;", "number": "&#967;", },
		{ "char": "ψ", "b": "s", "a": "s", "entity": "&psi;", "number": "&#968;", },
		{ "char": "ω", "b": "s", "a": "s", "entity": "&omega;", "number": "&#969;", },
		{ "char": "ϑ", "b": "s", "a": "s", "entity": "&thetasym;", "number": "&#977;", },
		{ "char": "ϒ", "b": "s", "a": "s", "entity": "&upsih;", "number": "&#978;", },
		{ "char": "ϖ", "b": "s", "a": "s", "entity": "&piv;", "number": "&#982;", },
		{ "char": "Œ", "b": "s", "a": "s", "entity": "&OElig;", "number": "&#338;", },
		{ "char": "œ", "b": "s", "a": "s", "entity": "&oelig;", "number": "&#339;", },
		{ "char": "Š", "b": "s", "a": "s", "entity": "&Scaron;", "number": "&#352;", },
		{ "char": "š", "b": "s", "a": "s", "entity": "&scaron;", "number": "&#353;", },
		{ "char": "Ÿ", "b": "s", "a": "s", "entity": "&Yuml;", "number": "&#376;", },
		{ "char": "ƒ", "b": "s", "a": "s", "entity": "&fnof;", "number": "&#402;", },
		{ "char": "ˆ", "b": "s", "a": "s", "entity": "&circ;", "number": "&#710;", },
		{ "char": "˜", "b": "s", "a": "s", "entity": "&tilde;", "number": "&#732;", },
		{ "char": " ", "b": "s", "a": "s", "entity": "&ensp;", "number": "&#8194;", },
		{ "char": " ", "b": "s", "a": "s", "entity": "&emsp;", "number": "&#8195;", },
		{ "char": "", "b": "s", "a": "s", "entity": "&thinsp;", "number": "&#8201;", },
		{ "char": "", "b": "s", "a": "s", "entity": "&zwnj;", "number": "&#8204;", },
		{ "char": "", "b": "s", "a": "s", "entity": "&zwj;", "number": "&#8205;", },
		{ "char": "", "b": "s", "a": "s", "entity": "&lrm;", "number": "&#8206;", },
		{ "char": "", "b": "s", "a": "s", "entity": "&rlm;", "number": "&#8207;", },
		{ "char": "–", "b": "s", "a": "s", "entity": "&ndash;", "number": "&#8211;", },
		{ "char": "—", "b": "s", "a": "s", "entity": "&mdash;", "number": "&#8212;", },
		{ "char": "‘", "b": "s", "a": "s", "entity": "&lsquo;", "number": "&#8216;", },
		{ "char": "’", "b": "s", "a": "s", "entity": "&rsquo;", "number": "&#8217;", },
		{ "char": "‚", "b": "s", "a": "s", "entity": "&sbquo;", "number": "&#8218;", },
		{ "char": "“", "b": "s", "a": "s", "entity": "&ldquo;", "number": "&#8220;", },
		{ "char": "”", "b": "s", "a": "s", "entity": "&rdquo;", "number": "&#8221;", },
		{ "char": "„", "b": "s", "a": "s", "entity": "&bdquo;", "number": "&#8222;", },
		{ "char": "†", "b": "s", "a": "s", "entity": "&dagger;", "number": "&#8224;", },
		{ "char": "‡", "b": "s", "a": "s", "entity": "&Dagger;", "number": "&#8225;", },
		{ "char": "•", "b": "s", "a": "s", "entity": "&bull;", "number": "&#8226;", },
		{ "char": "…", "b": "s", "a": "s", "entity": "&hellip;", "number": "&#8230;", },
		{ "char": "‰", "b": "s", "a": "s", "entity": "&permil;", "number": "&#8240;", },
		{ "char": "′", "b": "s", "a": "s", "entity": "&prime;", "number": "&#8242;", },
		{ "char": "″", "b": "s", "a": "s", "entity": "&Prime;", "number": "&#8243;", },
		{ "char": "‹", "b": "s", "a": "s", "entity": "&lsaquo;", "number": "&#8249;", },
		{ "char": "›", "b": "s", "a": "s", "entity": "&rsaquo;", "number": "&#8250;", },
		{ "char": "‾", "b": "s", "a": "s", "entity": "&oline;", "number": "&#8254;", },
		{ "char": "€", "b": "s", "a": "s", "entity": "&euro;", "number": "&#8364;", },
		{ "char": "™", "b": "s", "a": "s", "entity": "&trade;", "number": "&#8482;", },
		{ "char": "←", "b": "s", "a": "s", "entity": "&larr;", "number": "&#8592;", },
		{ "char": "↑", "b": "s", "a": "s", "entity": "&uarr;", "number": "&#8593;", },
		{ "char": "→", "b": "s", "a": "s", "entity": "&rarr;", "number": "&#8594;", },
		{ "char": "↓", "b": "s", "a": "s", "entity": "&darr;", "number": "&#8595;", },
		{ "char": "↔", "b": "s", "a": "s", "entity": "&harr;", "number": "&#8596;", },
		{ "char": "↵", "b": "s", "a": "s", "entity": "&crarr;", "number": "&#8629;", },
		{ "char": "⌈", "b": "s", "a": "s", "entity": "&lceil;", "number": "&#8968;", },
		{ "char": "⌉", "b": "s", "a": "s", "entity": "&rceil;", "number": "&#8969;", },
		{ "char": "⌊", "b": "s", "a": "s", "entity": "&lfloor;", "number": "&#8970;", },
		{ "char": "⌋", "b": "s", "a": "s", "entity": "&rfloor;", "number": "&#8971;", },
		{ "char": "◊", "b": "s", "a": "s", "entity": "&loz;", "number": "&#9674;", },
		{ "char": "♠", "b": "s", "a": "s", "entity": "&spades;", "number": "&#9824;", },
		{ "char": "♣", "b": "s", "a": "s", "entity": "&clubs;", "number": "&#9827;", },
		{ "char": "♥", "b": "s", "a": "s", "entity": "&hearts;", "number": "&#9829;", },
		{ "char": "♦", "b": "s", "a": "s", "entity": "&diams;", "number": "&#9830;", },
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
			output = null,
			options = {};

		// set user options
		// VALIDATION?
		if (input !== undefined) {
			// if input track, set the options to input value
			if (input.track !== undefined) { track = input.track; }
			// if input selectors, set the options to input value
			if (input.selectors !== undefined) { selectors = input.selectors; }
			// if input outputID, set the options to input value
			if (input.outputID !== undefined) {
				output = self._getDocumentElement(input.outputID)[0];
			} else {
				// create output div
				output = document.createElement("div");
				// add output id to easily find
				output.setAttribute("id", "KernBotOutput");
				// add created KernBotOutput to end of DOM
				document.body.appendChild(output);
			}
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
		
		// RegEx
		self.RegExElm = new RegExp("<(.|\n|\d)*?>|&(.|\n)*?;|&#(.|\d)*?;", "g");
		self.RegExEntity = new RegExp("&(.|\n)*?;|&#(.|\d)*?;", "g");
		self.RegExEndTag = new RegExp("</", "g");
		
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
	 * kern f(x)
	 * @return 'this' self - makes method chainable
	 */
	KernBot.prototype.kern = function() {
		// store self
		let self = this;
		// loop through each HTML element
		for (let e = 0; e < self.HTMLelements.length; e++) {
			// gather sequence vars
			let element = self.HTMLelements[e];
			// check element already been kerned
			if (self._checkElementKerned(element)) {
				// get the sequence data for this HTML element
				let sequence = self._getLegendData(element, "context", self.sequences);
				// update the elements HTML with the span injected kerning data
				self._updateElementHTML(element, sequence.innerHTML);
			// if element not kerned yet
			} else {
				// prepare sequnce nodes
				let string = element.innerHTML,
					sequenceNodes = self._stringToSequenceNodes(element, string),
					sequenceNodePairs = self._calcNodePairsKerning(element, sequenceNodes),
					HTMLstring = "";
				// prepare HTML string to write to DOM
				HTMLstring = self._prepareHTMLString(sequenceNodes);
				// update the elements HTML with the span injected kerning data
				self._updateElementHTML(element, HTMLstring);
				// add this sequence to the array of sequences KernBot acts on
				self.sequences.push(new Sequence(element, string, HTMLstring, sequenceNodes));
				// update KernBot tracking
				if (self.track) { self._update(element, sequenceNodes, sequenceNodePairs); }
			}
		}
		// log self
		console.log(self);
		// return self
		return self;
	}
	/**
	 * unkern f(x)
	 * @return 'this' self - makes method chainable
	 */
	KernBot.prototype.unkern = function() {
		// store self
		let self = this;
		// loop through each HTML element
		for (let e = 0; e < self.HTMLelements.length; e++) {
			// store current HTML element in var
			let element = self.HTMLelements[e];
			// ensure the HTML element is already kerned
			if (self._checkElementKerned(element)) {
				// get the sequence data for this HTML element
				let sequence = self._getLegendData(element, "context", self.sequences);
				// update the elements HTML with the span injected kerning data
				self._updateElementHTML(element, sequence.string);
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
			let sBefore = this._getLegendData(array[i].b, "code", this.strokes),
				sAfter = this._getLegendData(array[i].a, "code", this.strokes);
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
							this[array][x].strokes.a.code+this[array][y].strokes.a.code,
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
	KernBot.prototype._toNodes = function(html) { return new DOMParser().parseFromString(html,'text/html').body.childNodes || false; }
	/**
	 * Checks KernBot sequences to see if the element has already been kerned
	 * @param {object} element - an HTML element
	 * @return (boolean) T/F - True if element exists in sequence
	 */
	KernBot.prototype._checkElementKerned = function(element) {
		// output
		let kerned = false;
		// loop through all the sequences KernBot has already acted on
		for (let i = 0; i < this.sequences.length; i++) {
			// check element exists in the sequence element context
			kerned = (this.sequences[i].context === element ? true : false);
			// if already kerned - return true
			if (kerned) { return true; }
		}
		// return kerned
		return kerned;
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
	KernBot.prototype._stringToSequenceNodes = function(context, string) {
		// vars
		let sequence = [],
			elements = this._parseElements(context, string);
		// outer loop vars
		let lastElementChar = false,
			classIndex = 0;
		// loop through the string
		for (let i = 0; i < string.length; i++) {
			// loop vars
			let previousChar = this._getLegendData(string[i-1], "char", this.characters) || this._getLegendData(string[i-1], "char", this.entities) || false,
				currentChar = this._getLegendData(string[i], "char", this.characters) || this._getLegendData(string[i], "char", this.entities) || false,
				nextChar = this._getLegendData(string[i+1], "char", this.characters) || this._getLegendData(string[i+1], "char", this.entities) || false,
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
			// INJECT NODE
			// if current char and not injecting an element
			if (currentChar && !injectNow) {
				// set the char node
				charNode = new Node(context, currentChar, classIndex);
			}
			// START of an element: if injecting next and not NOW
			if (injectNext && !injectNow) {
				// save last element char for loop ref
				lastElementChar = injectNext.char.slice(-1);
			}
			// INJECT ITEM
			// END: if injecting now, NOT injecting next, and at last entity char
			if (injectNow && !injectNext && string[i]==lastElementChar) {
				// update the class index depending on the injected item length
				classIndex -= (injectNow.char.length-1);
				// inject an &entity; now
				if (injectNow.isEntity) {
					// get the entity to inject
					injectEntity = this._getLegendData(injectNow.char, "entity", this.entities) || this._getLegendData(injectNow.char, "number", this.entities);
					// set the char node
					charNode = new Node(context, injectEntity, classIndex);
				// inject an <element> now
				} else {
					// set the char node
					charNode = new Tag(context, injectNow, classIndex);
				}
			}

			// if node exists
			if (charNode) {
				// inject node into sequence
				sequence.push(charNode);
			}
		}
		// return sequence
		return sequence;
	}
	/**
	 * Parses out the HTML <tags> and &entity; and returns those string elements
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param "string" string - the string the break down into
	 * @return [array] output - the elements in the string and associated data
	 */
	KernBot.prototype._parseElements = function(context, string) {
		// parser vars
		let output = [],
			items = string.match(this.RegExElm);
		// loop through elms
		for (let i = 0; items && i < items.length; i++) {
			// splice vars
			let start = string.indexOf(items[i]),
				end = start + items[i].length,
				element = string.slice(start, end),
				isEntity = this.RegExEntity.test(element) || false;
			// store the element in an array for now
			output.push(new Element(context, string, element, start, end, isEntity));
		}
		// return array of elements data in the string
		return output;
	}
	/** 
	 * Looks at node pairs and calculates the first node's letter-spacing
	 * @param {object} context - the HTML context (element) the string exists at
	 * @param [array] sequence - the sequence of nodes from input string
	 * @return [array] nodePairs - all the combinations of nodePairs (node-node) in the sequence
	 */
	KernBot.prototype._calcNodePairsKerning = function(context, sequence) {
		// output & loop vars
		let nodePairs = [],
			beforeTag = null;
		// loop through the string
		for (let i = 0; i < sequence.length; i++) {
			// loop vars
			let currentItem = sequence[i],
				nextItem = sequence[i+1],
				charPair = false,
				charNodePair = false,
				classIndex = i+1;
			// check node pairs
			switch (currentItem.constructor.name) {
				// node
				case "Node":
					// node | node
					if (nextItem && nextItem.constructor.name == "Node") {
						// set char pair
						if (charPair = this._getLegendData(currentItem.char+nextItem.char, "pair", this.characterPairs)) {
							// create nodePair
							charNodePair = new NodePair(context, charPair, classIndex);
							// add char pair kerning data to sequence node
							currentItem._addKerning(charNodePair.kern);
							// store node pair to output
							nodePairs.push(charNodePair);
						}
					// node | tag
					} else if (nextItem && nextItem.constructor.name == "Tag") {
						// set the current node to the item before the tag
						beforeTag = currentItem;
					}
					break;
				// tag
				case "Tag":
					// tag | node
					if (nextItem.constructor.name == "Node") {
						// check if the before tag is set
						if (beforeTag) {
							if (charPair = this._getLegendData(beforeTag.char+nextItem.char, "pair", this.characterPairs)) {
								// create nodePair
								charNodePair = new NodePair(context, charPair, classIndex);
								// add char pair kerning data to sequence node
								beforeTag._addKerning(charNodePair.kern);
								// store node pair to output
								nodePairs.push(charNodePair);
							}
						}
					}
					break;
				// default
				default:
					// must be Node or Tag
					break;
			}
		}
		// return array
		return nodePairs;
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
						elmString = elm.outerHTML.match(this.RegExElm)[0];
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
	KernBot.prototype._update = function(context, sequence, nodePairs) {
		// loop over each node in sequence
		for (let x = 0; x < sequence.length; x++) {
			// track node
			this._trackNode(context, x+1, sequence[x]);
		}
		// loop through each nodePair
		for (let y = 0; y < nodePairs.length; y++) {
			// track nodePair
			this._trackNode(context, y+1, nodePairs[y], true);
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
	 * Loops through the nodePairs and write them to the input ID element
	 * @return f(x) this._updateElementHTML - update KernBot output html with nodePairs
	 */
	KernBot.prototype.writeNodePairsToHTML = function() {
		// vars
		let HTMLstring = "<ul>";
		// loop through counted NodePairs
		for (let i = 0; i < this.nodePairs.length; i++) {
			// vars
			let elm = this.nodePairs[i],
				tag = elm.context.tagName.toLowerCase();
			// start list item
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
				HTMLstring += "<br>—————<br>";
					HTMLstring += "First Char: ";
					HTMLstring += elm.c1.char;
				HTMLstring += "<br>";
					HTMLstring += "Stroke (after): ";
					HTMLstring += elm.c1.strokes.a.code;
				HTMLstring += "<br>—————<br>";
					HTMLstring += "Second Char: ";
					HTMLstring += elm.c2.char;
				HTMLstring += "<br>";
					HTMLstring += "Stroke (before): ";
					HTMLstring += elm.c2.strokes.b.code;
				HTMLstring += "<br>—————<br>";
					HTMLstring += "Char Combination: ";
					HTMLstring += elm.pair;
				HTMLstring += "<br>";
					HTMLstring += "Stroke Combination: ";
					HTMLstring += elm.c1.strokes.a.code;
					HTMLstring += elm.c2.strokes.b.code;
				HTMLstring += "<br>=====<br>";
					HTMLstring += "Kern Weight: ";
					HTMLstring += elm.weight;
				HTMLstring += "<br>";
					HTMLstring += "Letter Spacing: ";
					HTMLstring += elm.letterSpace + "";
				HTMLstring += "</p>";
			HTMLstring += "</li>";
		}
		HTMLstring += "</ul>";
		// update this.output html
		return this._updateElementHTML(this.output, HTMLstring);
	}
	/**
	 * Outputs a sequence's HTML
	 * @return f(x) this._updateElementHTML - update KernBot output html
	 */
	KernBot.prototype.outputSequencesHTML = function() {
		// output vars
		let HTMLstring = "";
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
							element = elm.outerHTML.match(this.RegExElm)[0];
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
						HTMLstring += "&lt;"
						HTMLstring += "span class=\"" + nodes[i].class + "\" ";
						HTMLstring += "style=\"letter-spacing:" + "-" + nodes[i].kerning + "px" + ";\"";
						HTMLstring += "&gt;";
						HTMLstring += nodes[i].char;
						HTMLstring += "&lt;";
						HTMLstring += "/span";
						HTMLstring += "&gt;";
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
				context = sequence.context,
				contextTag = context.tagName.toLowerCase(),
				hasClass = sequence.context.getAttribute("class") || false,
				hasId = sequence.context.getAttribute("id") || false;
			// start of sequence
			HTMLstring += "/** SEQUCENCE "
			HTMLstring += context.tagName.toUpperCase();
			HTMLstring += "." + context.classList;
			HTMLstring += " **/";
			HTMLstring += "<br/>";
			// loop through the sequence nodes
			for (let i = 0; i < nodes.length; i++) {
				// check this sequence item type, write correct HTML
				switch (nodes[i].constructor.name) {
					// tag to inject
					case "Tag":
						// check the tag
						if(!this.RegExEndTag.test(nodes[i].char)) {
							// tag vars
							let tagNode = this._toNodes(nodes[i].char)[0] || false,
								tag = false;
							// set tag
							if (tagNode) { tag = tagNode.tagName.toLowerCase(); }
							// if tag
							if (tag) {
								// the tag context & any class or id of that existed on context
								HTMLstring += contextTag;
								if (hasId) { HTMLstring += "#"+hasId; }
								if (hasClass) { HTMLstring += "."+hasClass; }
								HTMLstring += " ";
								// tag element
								HTMLstring += tag + ".element-" + nodes[i].class.substring(5);
								HTMLstring += " ";
								HTMLstring += "{ letter-spacing: 0px; }";
								HTMLstring += "<br/>";
							}
						// is ending tag
						} else {
							// commented message
							HTMLstring += "/* ending tag - skip .element-";
							HTMLstring += nodes[i].class.substring(5);
							HTMLstring += " */";
							HTMLstring += "<br/>";
							// break this loop
							break;
						}
						break;
					// node
					default:
						
						// the span context & any class or id of that existed on context
						HTMLstring += contextTag;
						if (hasId) { HTMLstring += "#"+hasId; }
						if (hasClass) { HTMLstring += "."+hasClass; }
						HTMLstring += " ";

						// node span
						HTMLstring += "span."+nodes[i].class+" {";
						HTMLstring += " ";
						HTMLstring += "letter-spacing: -" + nodes[i].kerning + "px;";
						HTMLstring += " ";
						HTMLstring += "}";
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