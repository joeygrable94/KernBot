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
	const characters = [
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