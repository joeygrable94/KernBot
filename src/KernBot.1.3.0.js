/*

Author: Joey Grable
Version: 1.2.0
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
	/*
	class Tracker {
		constructor() {
			this.count = 0;
			this.indexes = [];
		}
		_increaseCount(val = 1) { return this.count += val; }
		_addCharIndex(index) { return this.indexes.push( index ); }
		_addCharPairIndex(index) { return this.indexes.push([index, index+1]); }
	}
	*/
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
	// HTML <tags> and &entities;
	class Element {
		constructor(elm, string, stripped, start, end, injectAt, isEntity) {
			// the characters & length of the element
			this.char = elm;
			this.length = elm.length;
			// a string that contains elements
			this.string = string;
			// a string stripped of all elements
			this.stripped = stripped;
			this.strippedLength = stripped.length;
			// the start & end index of the element in the original string
			this.stringIndex = [start, end];
			// where to inject the element in the stripped string
			this.injectAt = injectAt;
			// entities are rendered, <tags> are not
			this.isEntity = isEntity || false;
		}
	}
	// nodes
	class Node {
		constructor(context, character, index) {
			this.context = context;
			this.indexes = [index];
			this.char = character.char;
			this.character = character;
			this.kerning = 0;
			this.count = 0;
			this._increaseCount(1);
		}
		_addKerning(val) { return this.kerning = val; }
		_increaseCount(val = 1) { return this.count += val; }
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
		// increase the existance count
		_increaseCount(val) { return this.count += val; }
		// add a pair of indexes of where in a sequence the charPair exists
		_addCharPairIndex(pos1, pos2) {
			return this.indexes.push([pos1, pos2]);
		}
		// calc kerning relative to context fontsize
		_calcKerning() {
			let fontSize = parseFloat(getComputedStyle(this.context).fontSize);
			this.kern = ( Math.round((this.weight*100)/100).toFixed(2) / 100 ) * fontSize;
			this.letterSpace = "-" + this.kern.toString().substring(0, 5) + "px";
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
	const strokes = [
		new Stroke("l", 1),		// vertical stroke
		new Stroke("o", 2),		// round stroke
		new Stroke("u", 4),		// up slant stroke
		new Stroke("d", 4),		// down slant stroke
		new Stroke("s", 3),		// special case
		new Stroke("n", 0)		// none case
	];
	const entities = [
		{ "char": " ", "entity": null, "number": "&#32;" },
		{ "char": "!", "entity": null, "number": "&#33;" },
		{ "char": "\"", "entity": null, "number": "&#34;" },
		{ "char": "#", "entity": null, "number": "&#35;" },
		{ "char": "$", "entity": null, "number": "&#36;" },
		{ "char": "%", "entity": null, "number": "&#37;" },
		{ "char": "&", "entity": "&amp;", "number": "&#38;" },
		{ "char": "'", "entity": null, "number": "&#39;" },
		{ "char": "(", "entity": null, "number": "&#40;" },
		{ "char": ")", "entity": null, "number": "&#41;" },
		{ "char": "*", "entity": null, "number": "&#42;" },
		{ "char": "+", "entity": null, "number": "&#43;" },
		{ "char": ",", "entity": null, "number": "&#44;" },
		{ "char": "-", "entity": null, "number": "&#45;" },
		{ "char": ".", "entity": null, "number": "&#46;" },
		{ "char": "/", "entity": null, "number": "&#47;" },
		{ "char": "0", "entity": null, "number": "&#48;" },
		{ "char": "1", "entity": null, "number": "&#49;" },
		{ "char": "2", "entity": null, "number": "&#50;" },
		{ "char": "3", "entity": null, "number": "&#51;" },
		{ "char": "4", "entity": null, "number": "&#52;" },
		{ "char": "5", "entity": null, "number": "&#53;" },
		{ "char": "6", "entity": null, "number": "&#54;" },
		{ "char": "7", "entity": null, "number": "&#55;" },
		{ "char": "8", "entity": null, "number": "&#56;" },
		{ "char": "9", "entity": null, "number": "&#57;" },
		{ "char": ":", "entity": null, "number": "&#58;" },
		{ "char": ";", "entity": null, "number": "&#59;" },
		{ "char": "<", "entity": "&lt;", "number": "&#60;" },
		{ "char": "=", "entity": null, "number": "&#61;" },
		{ "char": ">", "entity": "&gt;", "number": "&#62;" },
		{ "char": "?", "entity": null, "number": "&#63;" },
		{ "char": "@", "entity": null, "number": "&#64;" },
		{ "char": "A", "entity": null, "number": "&#65;" },
		{ "char": "B", "entity": null, "number": "&#66;" },
		{ "char": "C", "entity": null, "number": "&#67;" },
		{ "char": "D", "entity": null, "number": "&#68;" },
		{ "char": "E", "entity": null, "number": "&#69;" },
		{ "char": "F", "entity": null, "number": "&#70;" },
		{ "char": "G", "entity": null, "number": "&#71;" },
		{ "char": "H", "entity": null, "number": "&#72;" },
		{ "char": "I", "entity": null, "number": "&#73;" },
		{ "char": "J", "entity": null, "number": "&#74;" },
		{ "char": "K", "entity": null, "number": "&#75;" },
		{ "char": "L", "entity": null, "number": "&#76;" },
		{ "char": "M", "entity": null, "number": "&#77;" },
		{ "char": "N", "entity": null, "number": "&#78;" },
		{ "char": "O", "entity": null, "number": "&#79;" },
		{ "char": "P", "entity": null, "number": "&#80;" },
		{ "char": "Q", "entity": null, "number": "&#81;" },
		{ "char": "R", "entity": null, "number": "&#82;" },
		{ "char": "S", "entity": null, "number": "&#83;" },
		{ "char": "T", "entity": null, "number": "&#84;" },
		{ "char": "U", "entity": null, "number": "&#85;" },
		{ "char": "V", "entity": null, "number": "&#86;" },
		{ "char": "W", "entity": null, "number": "&#87;" },
		{ "char": "X", "entity": null, "number": "&#88;" },
		{ "char": "Y", "entity": null, "number": "&#89;" },
		{ "char": "Z", "entity": null, "number": "&#90;" },
		{ "char": "[", "entity": null, "number": "&#91;" },
		{ "char": "\\", "entity": null, "number": "&#92;" },
		{ "char": "]", "entity": null, "number": "&#93;" },
		{ "char": "^", "entity": null, "number": "&#94;" },
		{ "char": "_", "entity": null, "number": "&#95;" },
		{ "char": "`", "entity": null, "number": "&#96;" },
		{ "char": "a", "entity": null, "number": "&#97;" },
		{ "char": "b", "entity": null, "number": "&#98;" },
		{ "char": "c", "entity": null, "number": "&#99;" },
		{ "char": "d", "entity": null, "number": "&#100;" },
		{ "char": "e", "entity": null, "number": "&#101;" },
		{ "char": "f", "entity": null, "number": "&#102;" },
		{ "char": "g", "entity": null, "number": "&#103;" },
		{ "char": "h", "entity": null, "number": "&#104;" },
		{ "char": "i", "entity": null, "number": "&#105;" },
		{ "char": "j", "entity": null, "number": "&#106;" },
		{ "char": "k", "entity": null, "number": "&#107;" },
		{ "char": "l", "entity": null, "number": "&#108;" },
		{ "char": "m", "entity": null, "number": "&#109;" },
		{ "char": "n", "entity": null, "number": "&#110;" },
		{ "char": "o", "entity": null, "number": "&#111;" },
		{ "char": "p", "entity": null, "number": "&#112;" },
		{ "char": "q", "entity": null, "number": "&#113;" },
		{ "char": "r", "entity": null, "number": "&#114;" },
		{ "char": "s", "entity": null, "number": "&#115;" },
		{ "char": "t", "entity": null, "number": "&#116;" },
		{ "char": "u", "entity": null, "number": "&#117;" },
		{ "char": "v", "entity": null, "number": "&#118;" },
		{ "char": "w", "entity": null, "number": "&#119;" },
		{ "char": "x", "entity": null, "number": "&#120;" },
		{ "char": "y", "entity": null, "number": "&#121;" },
		{ "char": "z", "entity": null, "number": "&#122;" },
		{ "char": "{", "entity": null, "number": "&#123;" },
		{ "char": "|", "entity": null, "number": "&#124;" },
		{ "char": "}", "entity": null, "number": "&#125;" },
		{ "char": "~", "entity": null, "number": "&#126;" },
		{ "char": "À", "entity": "&Agrave;", "number": "&#192;" },
		{ "char": "Á", "entity": "&Aacute;", "number": "&#193;" },
		{ "char": "Â", "entity": "&Acirc;", "number": "&#194;" },
		{ "char": "Ã", "entity": "&Atilde;", "number": "&#195;" },
		{ "char": "Ä", "entity": "&Auml;", "number": "&#196;" },
		{ "char": "Å", "entity": "&Aring;", "number": "&#197;" },
		{ "char": "Æ", "entity": "&AElig;", "number": "&#198;" },
		{ "char": "Ç", "entity": "&Ccedil;", "number": "&#199;" },
		{ "char": "È", "entity": "&Egrave;", "number": "&#200;" },
		{ "char": "É", "entity": "&Eacute;", "number": "&#201;" },
		{ "char": "Ê", "entity": "&Ecirc;", "number": "&#202;" },
		{ "char": "Ë", "entity": "&Euml;", "number": "&#203;" },
		{ "char": "Ì", "entity": "&Igrave;", "number": "&#204;" },
		{ "char": "Í", "entity": "&Iacute;", "number": "&#205;" },
		{ "char": "Î", "entity": "&Icirc;", "number": "&#206;" },
		{ "char": "Ï", "entity": "&Iuml;", "number": "&#207;" },
		{ "char": "Ð", "entity": "&ETH;", "number": "&#208;" },
		{ "char": "Ñ", "entity": "&Ntilde;", "number": "&#209;" },
		{ "char": "Ò", "entity": "&Ograve;", "number": "&#210;" },
		{ "char": "Ó", "entity": "&Oacute;", "number": "&#211;" },
		{ "char": "Ô", "entity": "&Ocirc;", "number": "&#212;" },
		{ "char": "Õ", "entity": "&Otilde;", "number": "&#213;" },
		{ "char": "Ö", "entity": "&Ouml;", "number": "&#214;" },
		{ "char": "Ø", "entity": "&Oslash;", "number": "&#216;" },
		{ "char": "Ù", "entity": "&Ugrave;", "number": "&#217;" },
		{ "char": "Ú", "entity": "&Uacute;", "number": "&#218;" },
		{ "char": "Û", "entity": "&Ucirc;", "number": "&#219;" },
		{ "char": "Ü", "entity": "&Uuml;", "number": "&#220;" },
		{ "char": "Ý", "entity": "&Yacute;", "number": "&#221;" },
		{ "char": "Þ", "entity": "&THORN;", "number": "&#222;" },
		{ "char": "ß", "entity": "&szlig;", "number": "&#223;" },
		{ "char": "à", "entity": "&agrave;", "number": "&#224;" },
		{ "char": "á", "entity": "&aacute;", "number": "&#225;" },
		{ "char": "â", "entity": "&acirc;", "number": "&#226;" },
		{ "char": "ã", "entity": "&atilde;", "number": "&#227;" },
		{ "char": "ä", "entity": "&auml;", "number": "&#228;" },
		{ "char": "å", "entity": "&aring;", "number": "&#229;" },
		{ "char": "æ", "entity": "&aelig;", "number": "&#230;" },
		{ "char": "ç", "entity": "&ccedil;", "number": "&#231;" },
		{ "char": "è", "entity": "&egrave;", "number": "&#232;" },
		{ "char": "é", "entity": "&eacute;", "number": "&#233;" },
		{ "char": "ê", "entity": "&ecirc;", "number": "&#234;" },
		{ "char": "ë", "entity": "&euml;", "number": "&#235;" },
		{ "char": "ì", "entity": "&igrave;", "number": "&#236;" },
		{ "char": "í", "entity": "&iacute;", "number": "&#237;" },
		{ "char": "î", "entity": "&icirc;", "number": "&#238;" },
		{ "char": "ï", "entity": "&iuml;", "number": "&#239;" },
		{ "char": "ð", "entity": "&eth;", "number": "&#240;" },
		{ "char": "ñ", "entity": "&ntilde;", "number": "&#241;" },
		{ "char": "ò", "entity": "&ograve;", "number": "&#242;" },
		{ "char": "ó", "entity": "&oacute;", "number": "&#243;" },
		{ "char": "ô", "entity": "&ocirc;", "number": "&#244;" },
		{ "char": "õ", "entity": "&otilde;", "number": "&#245;" },
		{ "char": "ö", "entity": "&ouml;", "number": "&#246;" },
		{ "char": "ø", "entity": "&oslash;", "number": "&#248;" },
		{ "char": "ù", "entity": "&ugrave;", "number": "&#249;" },
		{ "char": "ú", "entity": "&uacute;", "number": "&#250;" },
		{ "char": "û", "entity": "&ucirc;", "number": "&#251;" },
		{ "char": "ü", "entity": "&uuml;", "number": "&#252;" },
		{ "char": "ý", "entity": "&yacute;", "number": "&#253;" },
		{ "char": "þ", "entity": "&thorn;", "number": "&#254;" },
		{ "char": "ÿ", "entity": "&yuml;", "number": "&#255;" },
		{ "char": " ", "entity": "&nbsp;", "number": "&#160;" },
		{ "char": "¡", "entity": "&iexcl;", "number": "&#161;" },
		{ "char": "¢", "entity": "&cent;", "number": "&#162;" },
		{ "char": "£", "entity": "&pound;", "number": "&#163;" },
		{ "char": "¤", "entity": "&curren;", "number": "&#164;" },
		{ "char": "¥", "entity": "&yen;", "number": "&#165;" },
		{ "char": "¦", "entity": "&brvbar;", "number": "&#166;" },
		{ "char": "§", "entity": "&sect;", "number": "&#167;" },
		{ "char": "¨", "entity": "&uml;", "number": "&#168;" },
		{ "char": "©", "entity": "&copy;", "number": "&#169;" },
		{ "char": "ª", "entity": "&ordf;", "number": "&#170;" },
		{ "char": "«", "entity": "&laquo;", "number": "&#171;" },
		{ "char": "¬", "entity": "&not;", "number": "&#172;" },
		{ "char": " ", "entity": "&shy;", "number": "&#173;" },
		{ "char": "®", "entity": "&reg;", "number": "&#174;" },
		{ "char": "¯", "entity": "&macr;", "number": "&#175;" },
		{ "char": "°", "entity": "&deg;", "number": "&#176;" },
		{ "char": "±", "entity": "&plusmn;", "number": "&#177;" },
		{ "char": "²", "entity": "&sup2;", "number": "&#178;" },
		{ "char": "³", "entity": "&sup3;", "number": "&#179;" },
		{ "char": "´", "entity": "&acute;", "number": "&#180;" },
		{ "char": "µ", "entity": "&micro;", "number": "&#181;" },
		{ "char": "¶", "entity": "&para;", "number": "&#182;" },
		{ "char": "¸", "entity": "&cedil;", "number": "&#184;" },
		{ "char": "¹", "entity": "&sup1;", "number": "&#185;" },
		{ "char": "º", "entity": "&ordm;", "number": "&#186;" },
		{ "char": "»", "entity": "&raquo;", "number": "&#187;" },
		{ "char": "¼", "entity": "&frac14;", "number": "&#188;" },
		{ "char": "½", "entity": "&frac12;", "number": "&#189;" },
		{ "char": "¾", "entity": "&frac34;", "number": "&#190;" },
		{ "char": "¿", "entity": "&iquest;", "number": "&#191;" },
		{ "char": "×", "entity": "&times;", "number": "&#215;" },
		{ "char": "÷", "entity": "&divide;", "number": "&#247;" },
		{ "char": "∀", "entity": "&forall;", "number": "&#8704;" },
		{ "char": "∂", "entity": "&part;", "number": "&#8706;" },
		{ "char": "∃", "entity": "&exist;", "number": "&#8707;" },
		{ "char": "∅", "entity": "&empty;", "number": "&#8709;" },
		{ "char": "∇", "entity": "&nabla;", "number": "&#8711;" },
		{ "char": "∈", "entity": "&isin;", "number": "&#8712;" },
		{ "char": "∉", "entity": "&notin;", "number": "&#8713;" },
		{ "char": "∋", "entity": "&ni;", "number": "&#8715;" },
		{ "char": "∏", "entity": "&prod;", "number": "&#8719;" },
		{ "char": "∑", "entity": "&sum;", "number": "&#8721;" },
		{ "char": "−", "entity": "&minus;", "number": "&#8722;" },
		{ "char": "∗", "entity": "&lowast;", "number": "&#8727;" },
		{ "char": "√", "entity": "&radic;", "number": "&#8730;" },
		{ "char": "∝", "entity": "&prop;", "number": "&#8733;" },
		{ "char": "∞", "entity": "&infin;", "number": "&#8734;" },
		{ "char": "∠", "entity": "&ang;", "number": "&#8736;" },
		{ "char": "∧", "entity": "&and;", "number": "&#8743;" },
		{ "char": "∨", "entity": "&or;", "number": "&#8744;" },
		{ "char": "∩", "entity": "&cap;", "number": "&#8745;" },
		{ "char": "∪", "entity": "&cup;", "number": "&#8746;" },
		{ "char": "∫", "entity": "&int;", "number": "&#8747;" },
		{ "char": "∴", "entity": "&there4;", "number": "&#8756;" },
		{ "char": "∼", "entity": "&sim;", "number": "&#8764;" },
		{ "char": "≅", "entity": "&cong;", "number": "&#8773;" },
		{ "char": "≈", "entity": "&asymp;", "number": "&#8776;" },
		{ "char": "≠", "entity": "&ne;", "number": "&#8800;" },
		{ "char": "≡", "entity": "&equiv;", "number": "&#8801;" },
		{ "char": "≤", "entity": "&le;", "number": "&#8804;" },
		{ "char": "≥", "entity": "&ge;", "number": "&#8805;" },
		{ "char": "⊂", "entity": "&sub;", "number": "&#8834;" },
		{ "char": "⊃", "entity": "&sup;", "number": "&#8835;" },
		{ "char": "⊄", "entity": "&nsub;", "number": "&#8836;" },
		{ "char": "⊆", "entity": "&sube;", "number": "&#8838;" },
		{ "char": "⊇", "entity": "&supe;", "number": "&#8839;" },
		{ "char": "⊕", "entity": "&oplus;", "number": "&#8853;" },
		{ "char": "⊗", "entity": "&otimes;", "number": "&#8855;" },
		{ "char": "⊥", "entity": "&perp;", "number": "&#8869;" },
		{ "char": "⋅", "entity": "&sdot;", "number": "&#8901;" },
		{ "char": "Α", "entity": "&Alpha;", "number": "&#913;" },
		{ "char": "Β", "entity": "&Beta;", "number": "&#914;" },
		{ "char": "Γ", "entity": "&Gamma;", "number": "&#915;" },
		{ "char": "Δ", "entity": "&Delta;", "number": "&#916;" },
		{ "char": "Ε", "entity": "&Epsilon;", "number": "&#917;" },
		{ "char": "Ζ", "entity": "&Zeta;", "number": "&#918;" },
		{ "char": "Η", "entity": "&Eta;", "number": "&#919;" },
		{ "char": "Θ", "entity": "&Theta;", "number": "&#920;" },
		{ "char": "Ι", "entity": "&Iota;", "number": "&#921;" },
		{ "char": "Κ", "entity": "&Kappa;", "number": "&#922;" },
		{ "char": "Λ", "entity": "&Lambda;", "number": "&#923;" },
		{ "char": "Μ", "entity": "&Mu;", "number": "&#924;" },
		{ "char": "Ν", "entity": "&Nu;", "number": "&#925;" },
		{ "char": "Ξ", "entity": "&Xi;", "number": "&#926;" },
		{ "char": "Ο", "entity": "&Omicron;", "number": "&#927;" },
		{ "char": "Π", "entity": "&Pi;", "number": "&#928;" },
		{ "char": "Ρ", "entity": "&Rho;", "number": "&#929;" },
		{ "char": "Σ", "entity": "&Sigma;", "number": "&#931;" },
		{ "char": "Τ", "entity": "&Tau;", "number": "&#932;" },
		{ "char": "Υ", "entity": "&Upsilon;", "number": "&#933;" },
		{ "char": "Φ", "entity": "&Phi;", "number": "&#934;" },
		{ "char": "Χ", "entity": "&Chi;", "number": "&#935;" },
		{ "char": "Ψ", "entity": "&Psi;", "number": "&#936;" },
		{ "char": "Ω", "entity": "&Omega;", "number": "&#937;" },
		{ "char": "α", "entity": "&alpha;", "number": "&#945;" },
		{ "char": "β", "entity": "&beta;", "number": "&#946;" },
		{ "char": "γ", "entity": "&gamma;", "number": "&#947;" },
		{ "char": "δ", "entity": "&delta;", "number": "&#948;" },
		{ "char": "ε", "entity": "&epsilon;", "number": "&#949;" },
		{ "char": "ζ", "entity": "&zeta;", "number": "&#950;" },
		{ "char": "η", "entity": "&eta;", "number": "&#951;" },
		{ "char": "θ", "entity": "&theta;", "number": "&#952;" },
		{ "char": "ι", "entity": "&iota;", "number": "&#953;" },
		{ "char": "κ", "entity": "&kappa;", "number": "&#954;" },
		{ "char": "λ", "entity": "&lambda;", "number": "&#955;" },
		{ "char": "μ", "entity": "&mu;", "number": "&#956;" },
		{ "char": "ν", "entity": "&nu;", "number": "&#957;" },
		{ "char": "ξ", "entity": "&xi;", "number": "&#958;" },
		{ "char": "ο", "entity": "&omicron;", "number": "&#959;" },
		{ "char": "π", "entity": "&pi;", "number": "&#960;" },
		{ "char": "ρ", "entity": "&rho;", "number": "&#961;" },
		{ "char": "ς", "entity": "&sigmaf;", "number": "&#962;" },
		{ "char": "σ", "entity": "&sigma;", "number": "&#963;" },
		{ "char": "τ", "entity": "&tau;", "number": "&#964;" },
		{ "char": "υ", "entity": "&upsilon;", "number": "&#965;" },
		{ "char": "φ", "entity": "&phi;", "number": "&#966;" },
		{ "char": "χ", "entity": "&chi;", "number": "&#967;" },
		{ "char": "ψ", "entity": "&psi;", "number": "&#968;" },
		{ "char": "ω", "entity": "&omega;", "number": "&#969;" },
		{ "char": "ϑ", "entity": "&thetasym;", "number": "&#977;" },
		{ "char": "ϒ", "entity": "&upsih;", "number": "&#978;" },
		{ "char": "ϖ", "entity": "&piv;", "number": "&#982;" },
		{ "char": "Œ", "entity": "&OElig;", "number": "&#338;" },
		{ "char": "œ", "entity": "&oelig;", "number": "&#339;" },
		{ "char": "Š", "entity": "&Scaron;", "number": "&#352;" },
		{ "char": "š", "entity": "&scaron;", "number": "&#353;" },
		{ "char": "Ÿ", "entity": "&Yuml;", "number": "&#376;" },
		{ "char": "ƒ", "entity": "&fnof;", "number": "&#402;" },
		{ "char": "ˆ", "entity": "&circ;", "number": "&#710;" },
		{ "char": "˜", "entity": "&tilde;", "number": "&#732;" },
		{ "char": " ", "entity": "&ensp;", "number": "&#8194;" },
		{ "char": " ", "entity": "&emsp;", "number": "&#8195;" },
		{ "char": "", "entity": "&thinsp;", "number": "&#8201;" },
		{ "char": "", "entity": "&zwnj;", "number": "&#8204;" },
		{ "char": "", "entity": "&zwj;", "number": "&#8205;" },
		{ "char": "", "entity": "&lrm;", "number": "&#8206;" },
		{ "char": "", "entity": "&rlm;", "number": "&#8207;" },
		{ "char": "–", "entity": "&ndash;", "number": "&#8211;" },
		{ "char": "—", "entity": "&mdash;", "number": "&#8212;" },
		{ "char": "‘", "entity": "&lsquo;", "number": "&#8216;" },
		{ "char": "’", "entity": "&rsquo;", "number": "&#8217;" },
		{ "char": "‚", "entity": "&sbquo;", "number": "&#8218;" },
		{ "char": "“", "entity": "&ldquo;", "number": "&#8220;" },
		{ "char": "”", "entity": "&rdquo;", "number": "&#8221;" },
		{ "char": "„", "entity": "&bdquo;", "number": "&#8222;" },
		{ "char": "†", "entity": "&dagger;", "number": "&#8224;" },
		{ "char": "‡", "entity": "&Dagger;", "number": "&#8225;" },
		{ "char": "•", "entity": "&bull;", "number": "&#8226;" },
		{ "char": "…", "entity": "&hellip;", "number": "&#8230;" },
		{ "char": "‰", "entity": "&permil;", "number": "&#8240;" },
		{ "char": "′", "entity": "&prime;", "number": "&#8242;" },
		{ "char": "″", "entity": "&Prime;", "number": "&#8243;" },
		{ "char": "‹", "entity": "&lsaquo;", "number": "&#8249;" },
		{ "char": "›", "entity": "&rsaquo;", "number": "&#8250;" },
		{ "char": "‾", "entity": "&oline;", "number": "&#8254;" },
		{ "char": "€", "entity": "&euro;", "number": "&#8364;" },
		{ "char": "™", "entity": "&trade;", "number": "&#8482;" },
		{ "char": "←", "entity": "&larr;", "number": "&#8592;" },
		{ "char": "↑", "entity": "&uarr;", "number": "&#8593;" },
		{ "char": "→", "entity": "&rarr;", "number": "&#8594;" },
		{ "char": "↓", "entity": "&darr;", "number": "&#8595;" },
		{ "char": "↔", "entity": "&harr;", "number": "&#8596;" },
		{ "char": "↵", "entity": "&crarr;", "number": "&#8629;" },
		{ "char": "⌈", "entity": "&lceil;", "number": "&#8968;" },
		{ "char": "⌉", "entity": "&rceil;", "number": "&#8969;" },
		{ "char": "⌊", "entity": "&lfloor;", "number": "&#8970;" },
		{ "char": "⌋", "entity": "&rfloor;", "number": "&#8971;" },
		{ "char": "◊", "entity": "&loz;", "number": "&#9674;" },
		{ "char": "♠", "entity": "&spades;", "number": "&#9824;" },
		{ "char": "♣", "entity": "&clubs;", "number": "&#9827;" },
		{ "char": "♥", "entity": "&hearts;", "number": "&#9829;" },
		{ "char": "♦", "entity": "&diams;", "number": "&#9830;" }
	];
	//const selectorsDefault = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
	const selectorsDefault = ["h1", "h2"];

	//	KernBot
	// ===========================================================================
	let KernBot = function(input) {
		// setup vars
		let track = true,
			selectors = selectorsDefault,
			options = {};
		// set options
		if (undefined !== input) {
			if (undefined !== input.track) {
				track = input.track;
			} else if (undefined !== input.selectors) {
				selectors = selectorsDefault;
			}
		}
		// set default options
		options = {
			"track": track,
			"selectors": selectors
		};
		// return a new KernBot.init object that initializes the options
		return new KernBot.init(options, characters, strokes, entities);
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
	KernBot.init = function(options, characters, strokes, entities) {

		// vars
		let self = this;
		self.strokes = strokes;
		self.strokePairs = self._buildPairs("strokes");
		self.characters = self._buildCharacters(characters);
		self.characterPairs = self._buildPairs("characters");
		self.entities = entities;

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
		console.log(self.entities);
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
			return false;
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
	KernBot.prototype._stringToSequence = function(context, string) {
		// vars
		let sequenceOutput = [],
			nodePairsOutput = [],
			elements = [];
		// parser vars
		let elmRegEx = new RegExp("(<(.|\n)*?>|&(.|\n)*?;)", "g"),
			entityRegEx = new RegExp("&(.|\n)*?;", "g"),
			// <tags> and &entities;
			containsElments = elmRegEx.test(string),
			elms = string.match(elmRegEx) || false,
			lengthOfAllElm = 0,
			// string info
			stringLength = string.length,
			stripped = string.replace(elmRegEx,""),
			strippedLength = stripped.length;
		// loop through tags
		for (let i = 0; elms && i < elms.length; i++) {
			// splice vars
			let elmStart = string.indexOf(elms[i]),
				elmEnd = elmStart + elms[i].length,
				element = string.slice(elmStart, elmEnd),
				elmLength = element.length,
				isEntity = entityRegEx.test(element) || false;
			// entities take up one character length when HTML is rendered
			if (isEntity) { lengthOfAllElm -= 1; }
			// ensure the length is a positive value
			if (lengthOfAllElm < 0) { lengthOfAllElm *= -1 }
			// create new element calculate where to inject it
			let injectAt = elmStart-lengthOfAllElm,
				newElement = new Element(element, string, stripped, elmStart, elmEnd, injectAt, isEntity);
			// store the element in an array for now
			elements.push(newElement);
			// update length of all elements to splice if multiple elements
			lengthOfAllElm += elmLength;
		}
		// loop vars
		let previousEntity = null;
		// loop through the string
		for (let i = 0; i < stripped.length; i++) {
			// vars
			let current = stripped[i],
				next = stripped[i+1],
				classIndex = i+1,
				currentChar = this._getLegendData(current, "char", this.characters),
				nextChar = this._getLegendData(next, "char", this.characters) || false,
				charPair = this._getLegendData(currentChar.char+nextChar.char, "pair", this.characterPairs) || false,
				injectElement = this._getLegendData(i, "injectAt", elements) || false,
				entityExists = this._getLegendData(injectElement.char, "entity", this.entities) || this._getLegendData(injectElement.char, "number", this.entities) || false,
				charNode = new Node(context, currentChar, classIndex),
				charNodePair = null;
			
			// ensure the loop is not checking for a previous entity
			// then add current character to sequence array
			if (previousEntity === null) {
				sequenceOutput.push(charNode);
			}
			
			// check for HTML element to inject into sequence
			if (injectElement) {
				// if the previous char was an HTML entity
				if (previousEntity) {
					// update the previous char in char pair
					charPair = this._getLegendData(previousEntity.char+currentChar.char, "pair", this.characterPairs);
					// reset the previous entity and reset the loop index,
					// will redo this loop but skip the previous entity
					previousEntity = null; i--;
				} else {
					// inject element into sequence array
					sequenceOutput.push(injectElement);
				}
				// check if element to inject is an &entity; or <tag>
				if (injectElement.isEntity && entityExists) {
					// store the previous entity and update the next char in char pair
					previousEntity = entityExists;
					charPair = this._getLegendData(currentChar.char+entityExists.char, "pair", this.characterPairs);
				}
			}

			// check for next character and create NodePair
			if (nextChar && charPair) {
				// char pair vars
				charNodePair = new NodePair(context, charPair, classIndex);
				// add char pair kerning data to sequence node
				charNode._addKerning(charNodePair.kern);
				// store node pair to output
				nodePairsOutput.push(charNodePair);
			}
		}
		// return sequence
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
			// add span to html string
			HTMLstring += "<span class=\"" + "char-" + (i+1) + "\" style=\"letter-spacing:" + "-" + sequence[i].kerning + "px" + ";\">";
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
			this._trackNodePair(context, y+1, nodePairSequence[y]);
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
	KernBot.prototype._trackNode = function(context, index, node) {
		// vars
		let checkNode = this._checkSameNodeExists(context, node);
		// check node exists in this context
		if (checkNode) {
			// increase count of the this node
			checkNode._increaseCount(1);
			// add the string index of this new instance of the node
			checkNode._addCharIndex(index);
			// return true
			return true;
		}
		// add node to track
		this.nodes.push(node);
	}


	KernBot.prototype._trackNodePair = function(context, index, nodePair) {
		// vars
		let checkNode = this._checkSameNodePairExists(context, nodePair);
		// check nodePair exists in this context
		if (checkNode) {
			// increase count of the this nodePair
			checkNode._increaseCount(1);
			// add the string index of this new instance of the nodePair
			checkNode._addCharPairIndex(index, index+1);
			// return true
			return true;
		}
		// add nodePair to track
		this.nodePairs.push(nodePair);
	}
	/**
	 * Loops through the nodes and checks if the same node exists
	 */
	KernBot.prototype._checkSameNodeExists = function(context, node) {
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
			if (checkChar === thisChar) {
				sameChar = true;
			}
			// check context
			if (checkContext === thisContext) {
				sameContext = true;
			}
			// check kerning
			if (checkKerning === thisKerning) {
				sameKerning = true;
			}
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
	 */
	KernBot.prototype._checkSameNodePairExists = function(context, node) {
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
			if (checkPair === thisPair) {
				sameChar = true;
			}
			// check context
			if (checkContext === thisContext) {
				sameContext = true;
			}
			// check kerning
			if (checkKerning === thisKerning) {
				sameKerning = true;
			}
			// check all vars
			if (sameContext && sameChar && sameKerning) {
				// node exists
				return thisNodePair;
			}
		}
		// node does not exist
		return false;
	}

	// KERNBOT TRAINING
	// ===========================================================================
	// output nodes to page
	KernBot.prototype.writeNodePairsToHTML = function(trainerID) {
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