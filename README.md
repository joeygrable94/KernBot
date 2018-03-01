# KernBot
[Working example of v1.3.X](http://joeygrable.com/git/KernBot/)

## A javascript library that dynamically kerns characters based on their font size.
KernBot uses calligraphic methods to categorize letters by the shape of their strokes.
It then uses the stroke information of each letter in a sentence, compairs the letter
and its stroke shape to the adjacent characters in the sentence, then calculates the 
kerning and letter-spacing based on the weight stroke types.

## To Do:
* UPDATE developer comments
* UPDATE readme.md
* build a more user friendly front-end to play with KernBot and analyze kerning data
* test on different font sizes and font families
* analyze the kerning of different font variations
* introduce a Perceptron to train the KernBot to adjust the stroke weights depending on the font & context

## How It Works:
```
// load KernBot with defaults
let TestKernBot = new KernBot();

// or load with custom options
let TestKernBot = new KernBot({
	"track": true,
	"selectors": [".kern-para", "#title", "h1"]
});

// run KernBot's kern Function
TestKernBot.kern();
```

### Characters are made of Strokes:
In calligraphy each letter is constructed of various strokes of the pen, each with a definite
but unique shape. It is important to note that each character has a stroke shape on both
its left and right sides. The left and the right stroke shapes are not necessarily the same.
```
-------------+------------------+------------+-------------------------------
Stroke Type  | Name             | Data Code  | Example Characters
-------------+------------------+------------+-------------------------------
 l           |  line            |  l         |  H,i,t,E,N,n,M,m,L,D...
 o           |  curve           |  o         |  O,o,C,c,e,G,D...
 /           |  slant up        |  u         |  A,V,v,W,w,J...
 \           |  slant down      |  d         |  A,V,v,W,w,Y,L...
 *           |  spacial case    |  s         |  a,g,K...
' '          |  no case         |  n         |  &amp;,spaces,comma,period...
-------------+------------------+------------+-------------------------------
```

For Example, the character "A" is made of three strokes: an up slant stroke on the left side,
a down slant stroke on the right and a cross bar.
```
left:  /  -  \  :right
        / - \
         /-\
          A
```

We only need to analyze the left and right side of the character to determine the stroke shape
and calculate the kerning. So we ignore the cross bar stroke, or any unique strokes and special cases
Instead, the stroke shapes of every character is aproximated for both their left and right sides.

KernBot catagorizes characters like so:
```
const characters = [
	{ "char": "a", "before": "o", "after": "l" },
	{ "char": "b", "before": "l", "after": "o" },
	{ "char": "c", "before": "o", "after": "l" },
	... lowercase
	{ "char": "y", "before": "l", "after": "u" },
	{ "char": "z", "before": "l", "after": "l" },
	{ "char": "A", "before": "u", "after": "d" },
	{ "char": "B", "before": "l", "after": "o" },
	{ "char": "C", "before": "o", "after": "l" },
	... CAPITALS
	{ "char": "Y", "before": "d", "after": "u" },
	{ "char": "Z", "before": "l", "after": "l" },
	... numbers
	{ "char": "0", "before": "o", "after": "o" },
	{ "char": "1", "before": "l", "after": "l" },
	{ "char": "2", "before": "l", "after": "o" },
	{ "char": "3", "before": "l", "after": "o" },
	... special characters
	{ "char": " ", "before": "n", "after": "n" },
	{ "char": ".", "before": "s", "after": "n" },
	{ "char": ",", "before": "s", "after": "n" },
	{ "char": "$", "before": "l", "after": "l" },
	{ "char": "&", "before": "o", "after": "s" },
	{ "char": "(", "before": "n", "after": "s" },
	{ "char": ")", "before": "s", "after": "n" },
];
```

### Characters have Neighboring Characters
As acknoledged before each character has a stroke shape on both its left and right sides.
In a word characters directly next to eachother have different combonations of their strokes
depending on the characters and their stroke shape on the adjacent side as the neighboring character.

The kerning is calucalted relative to the combination of stroke types between two characters.

My initial sketch for this concept is linked in my images folder, and I think best visualizes
how a string is broken into character pairs and then the pairs stroke type is analysed, then
the kerning and letter-space between that character pair is calculated and appened to the character node.

[KernBot Stroke Types Concept](./images/KernBot-concept.jpg)
```
------+-----------------------+-------------------------
Code  | Stroke Combinations:  | Example Character Pair
------+-----------------------+-------------------------
 ll   |  line-line            |  Hh, lD, il, HB
 ol   |  curve-line           |  DE, Qu
 lo   |  line-curve           |  hc
 oo   |  curve-curve          |  oc, eo, oe
      |                       |  
 uu   |  slantUp-slantUp      |  VA
 dd   |  slantDown-slantDown  |  AV
 ud   |  slantUp-slantDown    |  WV
 du   |  slantDown-slantUp    |  AA
      |                       |  
 ul   |  slantUp-line         |  Ti
 lu   |  line-slantUp         |  lA
 dl   |  slantDown-line       |  Al
 ld   |  line-slantDown       |  lV
      |                       |  
 ou   |  curve-slantUp        |  OA
 uo   |  slantUp-curve        |  Vo
 od   |  curve-slantDown      |  ov
 do   |  slantDown-curve      |  Ac
------+-----------------------+-------------------------
(does not include 's' special shapes and 'n' non-shapes)

// in KernBot stroke combo weights is codified like so
const strokeDataReference = [
	{code: "uu", s1: "u", s2: "u", weight: 8},
	{code: "ud", s1: "u", s2: "d", weight: 8},
	{code: "du", s1: "d", s2: "u", weight: 8},
	{code: "dd", s1: "d", s2: "d", weight: 8},
	{code: "lu", s1: "l", s2: "u", weight: 6},
	{code: "ld", s1: "l", s2: "d", weight: 6},
	{code: "ul", s1: "u", s2: "l", weight: 6},
	{code: "us", s1: "u", s2: "s", weight: 6},
	{code: "dl", s1: "d", s2: "l", weight: 6},
	{code: "ds", s1: "d", s2: "s", weight: 6},
	{code: "su", s1: "s", s2: "u", weight: 6},
	{code: "sd", s1: "s", s2: "d", weight: 6},
	{code: "ou", s1: "o", s2: "u", weight: 5},
	{code: "od", s1: "o", s2: "d", weight: 5},
	{code: "uo", s1: "u", s2: "o", weight: 5},
	{code: "do", s1: "d", s2: "o", weight: 5},
	{code: "ll", s1: "l", s2: "l", weight: 4},
	{code: "ls", s1: "l", s2: "s", weight: 4},
	{code: "un", s1: "u", s2: "n", weight: 4},
	{code: "dn", s1: "d", s2: "n", weight: 4},
	{code: "sl", s1: "s", s2: "l", weight: 4},
	{code: "ss", s1: "s", s2: "s", weight: 4},
	{code: "nu", s1: "n", s2: "u", weight: 4},
	{code: "nd", s1: "n", s2: "d", weight: 4},
	{code: "lo", s1: "l", s2: "o", weight: 3},
	{code: "ol", s1: "o", s2: "l", weight: 3},
	{code: "os", s1: "o", s2: "s", weight: 3},
	{code: "so", s1: "s", s2: "o", weight: 3},
	{code: "ln", s1: "l", s2: "n", weight: 2},
	{code: "oo", s1: "o", s2: "o", weight: 2},
	{code: "sn", s1: "s", s2: "n", weight: 2},
	{code: "nl", s1: "n", s2: "l", weight: 2},
	{code: "ns", s1: "n", s2: "s", weight: 2},
	{code: "on", s1: "o", s2: "n", weight: 1},
	{code: "no", s1: "n", s2: "o", weight: 1},
	{code: "nn", s1: "n", s2: "n", weight: 0}
];
```


