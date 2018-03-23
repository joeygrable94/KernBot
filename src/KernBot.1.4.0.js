/*

Author: Joey Grable
Version: 1.4.X
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
			this.entity = entity || null;
			this.number = number || null;
		}
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
	// sequences
	class Sequence {
		constructor(context, string, html, sequence, pairs) {
			this.context = context;
			this.string = string;
			this.innerText = html;
			this.sequence = sequence;
			this.pairs = pairs;
		}
	}
	// HTML <tags> and &entities; in a sequence
	class Element {
		constructor(string, elm, start, end, isEntity) {
			// the original string the entity appears in
			this.string = string;
			// the characters
			this.char = elm;
			// the start & end index of the element in the original string
			this.range = [start, end];
			// entities are rendered, <tags> are not
			this.isEntity = isEntity || false;
		}
	}
	// nodes in a sequence for a specific context
	class Node {
		constructor(context, node, classIndex, isTag=false) {
			this.context = context;
			this.class = "char-"+classIndex;
			this.indexes = [classIndex];
			this.char = node.char;
			this.data = node;
			this.isTag = isTag;
			this.isTagClosure = this._checkIsTagEnd(node, isTag);
			this.kerning = 0;
			this.count = 0;
			this._increaseCount(1);
		}
		// chech if is <tag>, then test if is a closure </tag>
		_checkIsTagEnd(node, tag) { return tag ? /<\//g.test(node.char) : false; }
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
			this.kerning = this._calcKerning(context);
			this.letterSpace = this._setLetterSpace();
			this.count = 0;
			// run methods
			this._increaseCount(1);
		}
		// calc kerning relative to context fontsize
		_calcKerning(context) {
			let fontSize = parseFloat(getComputedStyle(context).fontSize);
			return ((Math.round((this.weight.total*100)/100).toFixed(2) / 100 ) * fontSize);
		}
		// set letter spacing from kerning value
		_setLetterSpace() {
			return ("-" + this.kerning.toString().substring(0, 5) + "px");
		}
		// increase the existance count
		_increaseCount(val=1) { return this.count += val; }
		// add a pair of indexes of where in a sequence the charPair exists
		_addCharIndex(pos) { return this.indexes.push([pos, pos+1]); }
	}





	//	CONSTANTS
	// ===========================================================================
	const strokes = [
		new Stroke("n", 0),		// no stroke weight
		new Stroke("l", 0.5),	// vertical stroke
		new Stroke("o", 1),		// round stroke
		new Stroke("u", 2),		// up slant stroke
		new Stroke("d", 2),		// down slant stroke
		new Stroke("s", 3),		// special case
	];
	//	Characters
	const characters = [
		{ "char": " ", "b": "n", "a": "n", "entity": null, "number": "&#32;", },
		{ "char": "!", "b": "l", "a": "l", "entity": null, "number": "&#33;", },
		{ "char": "\"", "b": "s", "a": "s", "entity": null, "number": "&#34;", },
		{ "char": "#", "b": "u", "a": "u", "entity": null, "number": "&#35;", },
		{ "char": "$", "b": "l", "a": "l", "entity": null, "number": "&#36;", },
		{ "char": "%", "b": "s", "a": "s", "entity": null, "number": "&#37;", },
		{ "char": "&", "b": "o", "a": "d", "entity": "&amp;", "number": "&#38;", },
		{ "char": "'", "b": "l", "a": "l", "entity": null, "number": "&#39;", },
		{ "char": "(", "b": "o", "a": "s", "entity": null, "number": "&#40;", },
		{ "char": ")", "b": "s", "a": "o", "entity": null, "number": "&#41;", },
		{ "char": "*", "b": "o", "a": "o", "entity": null, "number": "&#42;", },
		{ "char": "+", "b": "s", "a": "s", "entity": null, "number": "&#43;", },
		{ "char": ",", "b": "s", "a": "l", "entity": null, "number": "&#44;", },
		{ "char": "-", "b": "s", "a": "s", "entity": null, "number": "&#45;", },
		{ "char": ".", "b": "s", "a": "n", "entity": null, "number": "&#46;", },
		{ "char": "/", "b": "u", "a": "u", "entity": null, "number": "&#47;", },
		{ "char": "0", "b": "o", "a": "o", "entity": null, "number": "&#48;", },
		{ "char": "1", "b": "l", "a": "l", "entity": null, "number": "&#49;", },
		{ "char": "2", "b": "l", "a": "l", "entity": null, "number": "&#50;", },
		{ "char": "3", "b": "l", "a": "o", "entity": null, "number": "&#51;", },
		{ "char": "4", "b": "u", "a": "l", "entity": null, "number": "&#52;", },
		{ "char": "5", "b": "l", "a": "o", "entity": null, "number": "&#53;", },
		{ "char": "6", "b": "o", "a": "o", "entity": null, "number": "&#54;", },
		{ "char": "7", "b": "s", "a": "u", "entity": null, "number": "&#55;", },
		{ "char": "8", "b": "o", "a": "o", "entity": null, "number": "&#56;", },
		{ "char": "9", "b": "o", "a": "o", "entity": null, "number": "&#57;", },
		{ "char": ":", "b": "l", "a": "l", "entity": null, "number": "&#58;", },
		{ "char": ";", "b": "s", "a": "l", "entity": null, "number": "&#59;", },
		{ "char": "<", "b": "l", "a": "s", "entity": "&lt;", "number": "&#60;", },
		{ "char": "=", "b": "l", "a": "l", "entity": null, "number": "&#61;", },
		{ "char": ">", "b": "s", "a": "l", "entity": "&gt;", "number": "&#62;", },
		{ "char": "?", "b": "s", "a": "n", "entity": null, "number": "&#63;", },
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
		{ "char": "J", "b": "s", "a": "l", "entity": null, "number": "&#74;", },
		{ "char": "K", "b": "l", "a": "s", "entity": null, "number": "&#75;", },
		{ "char": "L", "b": "l", "a": "d", "entity": null, "number": "&#76;", },
		{ "char": "M", "b": "l", "a": "l", "entity": null, "number": "&#77;", },
		{ "char": "N", "b": "l", "a": "l", "entity": null, "number": "&#78;", },
		{ "char": "O", "b": "o", "a": "o", "entity": null, "number": "&#79;", },
		{ "char": "P", "b": "l", "a": "u", "entity": null, "number": "&#80;", },
		{ "char": "Q", "b": "o", "a": "o", "entity": null, "number": "&#81;", },
		{ "char": "R", "b": "l", "a": "s", "entity": null, "number": "&#82;", },
		{ "char": "S", "b": "s", "a": "s", "entity": null, "number": "&#83;", },
		{ "char": "T", "b": "d", "a": "u", "entity": null, "number": "&#84;", },
		{ "char": "U", "b": "l", "a": "l", "entity": null, "number": "&#85;", },
		{ "char": "V", "b": "d", "a": "u", "entity": null, "number": "&#86;", },
		{ "char": "W", "b": "d", "a": "u", "entity": null, "number": "&#87;", },
		{ "char": "X", "b": "s", "a": "s", "entity": null, "number": "&#88;", },
		{ "char": "Y", "b": "d", "a": "u", "entity": null, "number": "&#89;", },
		{ "char": "Z", "b": "l", "a": "l", "entity": null, "number": "&#90;", },
		{ "char": "[", "b": "l", "a": "s", "entity": null, "number": "&#91;", },
		{ "char": "\\", "b": "d", "a": "d", "entity": null, "number": "&#92;", },
		{ "char": "]", "b": "s", "a": "l", "entity": null, "number": "&#93;", },
		{ "char": "^", "b": "s", "a": "s", "entity": null, "number": "&#94;", },
		{ "char": "_", "b": "s", "a": "s", "entity": null, "number": "&#95;", },
		{ "char": "`", "b": "s", "a": "s", "entity": null, "number": "&#96;", },
		{ "char": "a", "b": "o", "a": "l", "entity": null, "number": "&#97;", },
		{ "char": "b", "b": "l", "a": "o", "entity": null, "number": "&#98;", },
		{ "char": "c", "b": "o", "a": "l", "entity": null, "number": "&#99;", },
		{ "char": "d", "b": "o", "a": "l", "entity": null, "number": "&#100;", },
		{ "char": "e", "b": "o", "a": "o", "entity": null, "number": "&#101;", },
		{ "char": "f", "b": "l", "a": "u", "entity": null, "number": "&#102;", },
		{ "char": "g", "b": "o", "a": "l", "entity": null, "number": "&#103;", },
		{ "char": "h", "b": "l", "a": "l", "entity": null, "number": "&#104;", },
		{ "char": "i", "b": "l", "a": "l", "entity": null, "number": "&#105;", },
		{ "char": "j", "b": "s", "a": "l", "entity": null, "number": "&#106;", },
		{ "char": "k", "b": "l", "a": "s", "entity": null, "number": "&#107;", },
		{ "char": "l", "b": "l", "a": "l", "entity": null, "number": "&#108;", },
		{ "char": "m", "b": "l", "a": "l", "entity": null, "number": "&#109;", },
		{ "char": "n", "b": "l", "a": "l", "entity": null, "number": "&#110;", },
		{ "char": "o", "b": "o", "a": "o", "entity": null, "number": "&#111;", },
		{ "char": "p", "b": "l", "a": "o", "entity": null, "number": "&#112;", },
		{ "char": "q", "b": "o", "a": "l", "entity": null, "number": "&#113;", },
		{ "char": "r", "b": "l", "a": "u", "entity": null, "number": "&#114;", },
		{ "char": "s", "b": "s", "a": "s", "entity": null, "number": "&#115;", },
		{ "char": "t", "b": "l", "a": "l", "entity": null, "number": "&#116;", },
		{ "char": "u", "b": "l", "a": "l", "entity": null, "number": "&#117;", },
		{ "char": "v", "b": "d", "a": "u", "entity": null, "number": "&#118;", },
		{ "char": "w", "b": "d", "a": "u", "entity": null, "number": "&#119;", },
		{ "char": "x", "b": "l", "a": "l", "entity": null, "number": "&#120;", },
		{ "char": "y", "b": "l", "a": "u", "entity": null, "number": "&#121;", },
		{ "char": "z", "b": "l", "a": "l", "entity": null, "number": "&#122;", },
		{ "char": "{", "b": "l", "a": "s", "entity": null, "number": "&#123;", },
		{ "char": "|", "b": "l", "a": "l", "entity": null, "number": "&#124;", },
		{ "char": "}", "b": "s", "a": "l", "entity": null, "number": "&#125;", },
		{ "char": "~", "b": "s", "a": "s", "entity": null, "number": "&#126;", },
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
		{ "char": "ù", "b": "s", "a": "s", "entity": "&ugrave;", "number": "&#249;", },
		{ "char": "ú", "b": "l", "a": "l", "entity": "&uacute;", "number": "&#250;", },
		{ "char": "û", "b": "l", "a": "l", "entity": "&ucirc;", "number": "&#251;", },
		{ "char": "ü", "b": "l", "a": "l", "entity": "&uuml;", "number": "&#252;", },
		{ "char": "ý", "b": "s", "a": "u", "entity": "&yacute;", "number": "&#253;", },
		{ "char": "þ", "b": "l", "a": "o", "entity": "&thorn;", "number": "&#254;", },
		{ "char": "ÿ", "b": "s", "a": "u", "entity": "&yuml;", "number": "&#255;", },
		{ "char": " ", "b": "n", "a": "n", "entity": "&nbsp;", "number": "&#160;", },
		{ "char": "¡", "b": "l", "a": "l", "entity": "&iexcl;", "number": "&#161;", },
		{ "char": "¢", "b": "o", "a": "l", "entity": "&cent;", "number": "&#162;", },
		{ "char": "£", "b": "s", "a": "s", "entity": "&pound;", "number": "&#163;", },
		{ "char": "¤", "b": "l", "a": "l", "entity": "&curren;", "number": "&#164;", },
		{ "char": "¥", "b": "l", "a": "l", "entity": "&yen;", "number": "&#165;", },
		{ "char": "¦", "b": "l", "a": "l", "entity": "&brvbar;", "number": "&#166;", },
		{ "char": "§", "b": "l", "a": "l", "entity": "&sect;", "number": "&#167;", },
		{ "char": "¨", "b": "l", "a": "l", "entity": "&uml;", "number": "&#168;", },
		{ "char": "©", "b": "o", "a": "o", "entity": "&copy;", "number": "&#169;", },
		{ "char": "ª", "b": "l", "a": "l", "entity": "&ordf;", "number": "&#170;", },
		{ "char": "«", "b": "n", "a": "n", "entity": "&laquo;", "number": "&#171;", },
		{ "char": "¬", "b": "s", "a": "s", "entity": "&not;", "number": "&#172;", },
		{ "char": " ", "b": "s", "a": "s", "entity": "&shy;", "number": "&#173;", },
		{ "char": "®", "b": "o", "a": "o", "entity": "&reg;", "number": "&#174;", },
		{ "char": "¯", "b": "s", "a": "s", "entity": "&macr;", "number": "&#175;", },
		{ "char": "°", "b": "o", "a": "o", "entity": "&deg;", "number": "&#176;", },
		{ "char": "±", "b": "l", "a": "l", "entity": "&plusmn;", "number": "&#177;", },
		{ "char": "²", "b": "s", "a": "s", "entity": "&sup2;", "number": "&#178;", },
		{ "char": "³", "b": "s", "a": "s", "entity": "&sup3;", "number": "&#179;", },
		{ "char": "´", "b": "s", "a": "s", "entity": "&acute;", "number": "&#180;", },
		{ "char": "µ", "b": "l", "a": "u", "entity": "&micro;", "number": "&#181;", },
		{ "char": "¶", "b": "d", "a": "l", "entity": "&para;", "number": "&#182;", },
		{ "char": "¸", "b": "s", "a": "l", "entity": "&cedil;", "number": "&#184;", },
		{ "char": "¹", "b": "s", "a": "s", "entity": "&sup1;", "number": "&#185;", },
		{ "char": "º", "b": "s", "a": "s", "entity": "&ordm;", "number": "&#186;", },
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
		{ "char": "−", "b": "s", "a": "s", "entity": "&minus;", "number": "&#8722;", },
		{ "char": "∗", "b": "s", "a": "s", "entity": "&lowast;", "number": "&#8727;", },
		{ "char": "√", "b": "n", "a": "n", "entity": "&radic;", "number": "&#8730;", },
		{ "char": "∝", "b": "n", "a": "n", "entity": "&prop;", "number": "&#8733;", },
		{ "char": "∞", "b": "n", "a": "n", "entity": "&infin;", "number": "&#8734;", },
		{ "char": "∠", "b": "n", "a": "n", "entity": "&ang;", "number": "&#8736;", },
		{ "char": "∧", "b": "s", "a": "s", "entity": "&and;", "number": "&#8743;", },
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
		{ "char": "Κ", "b": "l", "a": "s", "entity": "&Kappa;", "number": "&#922;", },
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
		{ "char": "λ", "b": "s", "a": "d", "entity": "&lambda;", "number": "&#955;", },
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
		{ "char": "Š", "b": "s", "a": "s", "entity": "&Scaron;", "number": "&#352;", },
		{ "char": "š", "b": "s", "a": "s", "entity": "&scaron;", "number": "&#353;", },
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
		{ "char": "‘", "b": "n", "a": "s", "entity": "&lsquo;", "number": "&#8216;", },
		{ "char": "’", "b": "s", "a": "n", "entity": "&rsquo;", "number": "&#8217;", },
		{ "char": "‚", "b": "s", "a": "n", "entity": "&sbquo;", "number": "&#8218;", },
		{ "char": "“", "b": "n", "a": "s", "entity": "&ldquo;", "number": "&#8220;", },
		{ "char": "”", "b": "s", "a": "n", "entity": "&rdquo;", "number": "&#8221;", },
		{ "char": "„", "b": "s", "a": "n", "entity": "&bdquo;", "number": "&#8222;", },
		{ "char": "†", "b": "l", "a": "l", "entity": "&dagger;", "number": "&#8224;", },
		{ "char": "‡", "b": "l", "a": "l", "entity": "&Dagger;", "number": "&#8225;", },
		{ "char": "•", "b": "o", "a": "o", "entity": "&bull;", "number": "&#8226;", },
		{ "char": "…", "b": "n", "a": "n", "entity": "&hellip;", "number": "&#8230;", },
		{ "char": "‰", "b": "n", "a": "n", "entity": "&permil;", "number": "&#8240;", },
		{ "char": "′", "b": "s", "a": "n", "entity": "&prime;", "number": "&#8242;", },
		{ "char": "″", "b": "s", "a": "n", "entity": "&Prime;", "number": "&#8243;", },
		{ "char": "‹", "b": "n", "a": "s", "entity": "&lsaquo;", "number": "&#8249;", },
		{ "char": "›", "b": "s", "a": "n", "entity": "&rsaquo;", "number": "&#8250;", },
		{ "char": "‾", "b": "n", "a": "n", "entity": "&oline;", "number": "&#8254;", },
		{ "char": "€", "b": "o", "a": "l", "entity": "&euro;", "number": "&#8364;", },
		{ "char": "™", "b": "s", "a": "s", "entity": "&trade;", "number": "&#8482;", },
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





	//	KernBot
	// ===========================================================================
	const KernBot = function(input) {
		// setup vars
		let self = this,
			track = true,
			selectors = ["h1", "h2", "h3", "h4", "h5", "h6", "p"],
			output = null,
			options = {};
		// set user options — VALIDATION?
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
		return new KernBot.init(options, characters, strokes);
	}
	/**
	 * KernBot initialization function
	 * @param {object} options - the default or user input options for KernBot.
	 * @param [array] characters - and array of character objects that defines
	 *                             the before and after strokes of a character,
	 *                             also includes the &entity; and &number; code
	 *                             for parsing a string into a sequence.
	 * @param [array] strokes - and array of stroke objects that define the character
	 *                             code for the stroke type and its kerning weight.
	 * @return log KernBot to console
	 */
	// KernBot object initialization
	KernBot.init = function(options, characters, strokes) {
		
		// vars
		let self = this;
		self.strokes = strokes;
		self.characters = self._buildCharacterStrokes(characters, strokes);
		self.strokePairs = self._buildStrokePairs(strokes);

		// configuration
		self.track = options.track;
		self.selectors = options.selectors;
		self.output = options.output;

		// Node data
		self.nodes = [];
		self.nodePairs = [];

		// operations
		self.HTMLelements = self._gatherElements(self.selectors);
		self.sequences = self._generateSequences(self.HTMLelements);

		// tracking
		if (this.track) { this._updateAll(); }

		// DEBUG
		console.log(self);
		console.log("=========================");
	}





	//	KB GENERAL METHODS
	// ===========================================================================
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
			// check property matches key
			if (legend[i][property] === key) {
				// return matching value in legend
				output = legend[i];
			}
		}
		// check there is an output and return it, or return false
		return (null !== output) ? output : false;
	}
	/**
	 * Sorting function
	 * @param "string" field - the field to sort by
	 * @param (boolean) reverse - reverse the order? True or False
	 * @param f(x) primer - the function by which to determine the sort order
	 * 		EX: array.sort(sort_by('weight', false, parseInt}));
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
	 * Returns true if it is a DOM element
	 * @param {object} html - an html element to check
	 * @return (boolean) T/F
	 */
	KernBot.prototype._isElement = function(html) { return (
			typeof HTMLElement === "object" ?
			html instanceof HTMLElement :
			html && typeof html === "object" && html !== null && html.nodeType === 1 && typeof html.nodeName === "string"
	)}
	/**
	 * Returns if an html element is a DOM node
	 * @param {object} html - an html element to check if is a DOM node
	 * @return (boolean) T/F
	 */
	 KernBot.prototype._isNode = function(html) { return (
			typeof Node === "object" ?
			html instanceof Node :
			html && typeof html === "object" && typeof html.nodeType === "number" && typeof html.nodeName === "string"
	)}
	/**
	 * converts an html string to html nodes
	 * @param "string" html - an html string to convert to an html element
	 * @return {object} HTML nodes array or false if can't convert string to node
	 */
	KernBot.prototype._toNodes = function(html) {
		return new DOMParser().parseFromString(html,'text/html').body.childNodes
			|| false;
	}
	/**
	 * Parses HTML <tags> and &entity; from a string and returns those string elements in an array
	 * @param "string" string - the string the break down into
	 * @return [array] output - the elements in the string and associated data
	 */
	KernBot.prototype._parseStringElements = function(string) {
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
	}
	/**
	 * Check if current index is between the indexes of an element to inject
	 * @param (number) index - a point in a loop
	 * @param [array] array - the elements to loop through and check their index range
	 * @return {object} element or (boolean) False - the element that the index belongs to
	 */
	KernBot.prototype._checkIndexElementsRange = function(index, array) {
		// loop through the elements
		for (let i = 0; i < array.length; i++) {
			// check if current index is between the indexes of an element to inject
			if (array[i].range[0] <= index && index < array[i].range[1]) {
				// return the element who's range is between the index value
				return array[i];
			}
		}
		// return false
		return false;
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





	//	KB SPECIFIC METHODS 
	// ===========================================================================
	/**
	 * builds array of stroke data
	 * @param [array] array - an array of character or entity objects with defined stroke data (before & after)
	 * @return [array] output - array of all the characters KernBot is aware of
	 */
	KernBot.prototype._buildCharacterStrokes = function(chars, strokes) {
		// return var
		let output = [];
		// loop through the characters
		for (let i = 0; i < chars.length; i++) {
			// get strokes data
			let sBefore = this._getLegendData(chars[i].b, "code", strokes),
				sAfter = this._getLegendData(chars[i].a, "code", strokes);
			// add new character to output
			output.push(new Character(chars[i].char, sBefore, sAfter, chars[i].entity, chars[i].number));
		}
		// return output
		return output;
	}
	/**
	 * builds array of stroke pairs and calculates their kerning weights
	 * @param [array] this.strokes - the input data of individuals strokes
	 * @return [array] output - array of every stroke pair
	 */
	KernBot.prototype._buildStrokePairs = function(strokes) {
		// output
		let output = [];
		// 2D loop through types
		for (let x = 0; x < this.strokes.length; x++) {	
			for (let y = 0; y < this.strokes.length; y++) {
				output.push(new StrokePair(this.strokes[x], this.strokes[y]));
			}
		}
		// return output
		return output;
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
	 * Generates kerned sequences for all the input HTML elements
	 * @param {object} elements - the HTML elements to kern
	 * @return [array] output - an array of sequences
	 */
	KernBot.prototype._generateSequences = function(elements) {
		// return array
		let output = [];
		// loop through each HTML element
		for (let e = 0; e < elements.length; e++) {
			// prepare sequnce nodes
			let string = elements[e].innerHTML,
				sequenceNodes = this._stringToSequenceNodes(elements[e], string),
				sequenceNodePairs = this._calcNodePairsKerning(elements[e], sequenceNodes),
				HTMLstring = "";
			// prepare HTML string to write to DOM
			HTMLstring = this._prepareSequenceHTMLString(sequenceNodes);
			// add this sequence to the array of sequences KernBot acts on
			output.push(new Sequence(elements[e], string, HTMLstring, sequenceNodes, sequenceNodePairs));
		}
		// return output
		return output;
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
			elements = this._parseStringElements(string);
		// outer loop vars
		let lastElementChar = false,
			classIndex = 0;
		// loop through the string
		for (let i = 0; i < string.length; i++) {
			// loop vars
			let charNow = this._getLegendData(string[i], "char", this.characters) || false,
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
				seqNode = new Node(context, charNow, classIndex);
			}
			// INJECT ELEMENT (NOT CHARACTER)
			// START OF ELEMENT: if injecting element next and not NOW
			if (!elmNow && elmNext) {
				// save last element char for loop ref
				lastElementChar = elmNext.char.slice(-1);
			}
			// END OF ELEMENT: if injecting now, NOT injecting next, and loop is at last element char
			if ((elmNow && !elmNext) && (lastElementChar && string[i] == lastElementChar)) {
				// update the class index depending on the injected item length
				classIndex -= (elmNow.char.length-1);
				// inject an &entity; now
				if (elmNow.isEntity) {
					// get the entity to inject
					inject = this._getLegendData(elmNow.char, "entity", this.characters)
						  || this._getLegendData(elmNow.char, "number", this.characters);
					// set the node for the $entity;
					seqNode = new Node(context, inject, classIndex);
				// inject an <element> now
				} else {
					// set the node for a <tag>
					seqNode = new Node(context, elmNow, classIndex, true);
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
			before = null;
		// loop through the sequence
		for (let i = 0; i < sequence.length; i++) {
			// loop vars
			let current = sequence[i],
				next = sequence[i+1],
				charPair = false,
				charNodePair = false,
				classIndex = i+1;
			// in order to kern, there must be an adjacent character (next)
			if (next) {
				// CHAR | CHAR
				if (!current.isTag && !next.isTag) {
					// create nodePair
					charNodePair = new NodePair(context, current, next, classIndex);
					// store node pair to output
					nodePairs.push(charNodePair);
					// add char pair kerning data to current sequence node
					current._addKerning(charNodePair.kerning);
				}
				// CHAR | TAG
				if (!current.isTag && next.isTag) {
					// set the current node to the item before the tag
					before = current;
				}
				// TAG | CHAR
				if (current.isTag && !next.isTag) {
					// check if the before tag is set
					if (before) {
						// create nodePair
						charNodePair = new NodePair(context, before, next, classIndex);
						// store node pair to output
						nodePairs.push(charNodePair);
						// add char pair kerning data to sequence node
						before._addKerning(charNodePair.kerning);
					}
				}
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
	KernBot.prototype._prepareSequenceHTMLString = function(sequence) {
		// vars
		let HTMLstring = "";
		// loop through the sequence
		for (let i = 0; i < sequence.length; i++) {
			// check this sequence item type, write correct HTML
			// ELEMENT
			if (sequence[i].isTag) {
				// element vars, &entity; or <tag>
				let elm = this._toNodes(sequence[i].char)[0],
					elmString = sequence[i].char;
				// if is an html <tag>
				if (this._isElement(elm)) {
					// add element class
					elm.classList.add("element-" + sequence[i].class.substring(5));
					// get the start tag of the element
					elmString = elm.outerHTML.match(/<(.|\n|\d)*?>|&(.|\n)*?;|&#(.|\d)*?;/g)[0];
				}
				// add element to HTML
				HTMLstring += elmString;
			// NODE
			} else {
				// inject node into a span wrapper with kerning data
				HTMLstring += "<span class=\"" + sequence[i].class + "\"";
				HTMLstring += "style=\"letter-spacing:" + "-" + sequence[i].kerning + "px" + ";\">";
				HTMLstring += sequence[i].char;
				HTMLstring += "</span>";
			}
		}
		// return string
		return HTMLstring;
	}





	//	Kern CONTROLLER
	// ===========================================================================
	/**
	 * kern f(x)
	 * @return 'this' self - makes method chainable
	 */
	KernBot.prototype.kern = function() {
		// loop through all sequences to kern
		for (let i = 0; i < this.sequences.length; i++) {
			// update the DOM context of the sequence with the kerned sequence innerText
			this._updateElementHTML(this.sequences[i].context, this.sequences[i].innerText);
		}
		// log this
		console.log(this);
		// return this
		return this;
	}
	/**
	 * unkern f(x)
	 * @return 'this' self - makes method chainable
	 */
	KernBot.prototype.unkern = function() {
		// loop through all sequences to unkern
		for (let i = 0; i < this.sequences.length; i++) {
			// update the DOM context of the kerned sequence with the original sequence string
			this._updateElementHTML(this.sequences[i].context, this.sequences[i].string);
		}
		// log this
		console.log(this);
		// return this
		return this;
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
	KernBot.prototype._updateAll = function() {
		// loop over every sequence KernBot is tracking
		for (let i = 0; i < this.sequences; i++) {
			// loop over each node in this sequence
			for (let x = 0; x < this.sequence[i].sequence.length; x++) {
				// track node
				this._trackNode(this.sequence[i].context, x+1, this.sequence[i].sequence[x]);
			}
			// loop through each nodePair
			for (let y = 0; y < this.sequence[i].pairs.length; y++) {
				// track nodePair
				this._trackNode(this.sequence[i].context, y+1, this.sequence[i].pairs[y], true);
			}
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
		let checkNode = isNodePair ? this._returnNodeMatch(context, node, this.nodePairs) : this._returnNodeMatch(context, node, this.nodes);
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
	 * @param {object} node - the node to search for
	 * @param [array] search - the array to look for the node in
	 * @return 
	 */
	KernBot.prototype._returnNodeMatch = function(context, node, search) {
		// setup vars
		let checkChar = node.char,
			checkContext = node.context,
			checkKerning = node.kerning;
		// loop through the searching arrray
		for (let i = 0; i < search.length; i++) {
			// search vars
			let sameContext = false,
				sameChar = false,
				sameKerning = false,
				thisNode = search[i],
				thisChar = thisNode.char,
				thisContext = thisNode.context,
				thisKerning = thisNode.kerning;
			// check char
			if (checkChar === thisChar) { sameChar = true; }
			// check context
			if (checkContext === thisContext) { sameContext = true; }
			// check kerning
			if (checkKerning === thisKerning) { sameKerning = true; }
			// check all vars
			if (sameChar && sameContext && sameKerning) {
				// match exists, return it
				return thisNode;
			}
		}
		// default, return false
		return false;
	}





	// KERNBOT UI
	// ===========================================================================
	KernBot.prototype.calibrate = function() {
		// loop through the first 94 characters
		for (let i = 0; i < 3; i++) {
			//console.log(this.characters[i].char);
			let strokes = prompt(this.characters[i].char + " : has the strokes\nbefore: " + this.characters[i].strokes.a.code + "\nafter: " + this.characters[i].strokes.b.code),
				before = strokes.substring(0,1),
				after = strokes.substring(1,2),
				SDataBefore = this._getLegendData(before, "code", this.strokes),
				SDataAfter = this._getLegendData(after, "code", this.strokes);
			// check valid strokes input
			if (SDataBefore && SDataAfter) {
				// update characters stroke data
				this.characters[i].strokes.a = SDataBefore;
				this.characters[i].strokes.b = SDataAfter;
			}
		}
		console.log(this.characters);
		// return this
		//return this._updateElementHTML(this.output, this.characters);
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