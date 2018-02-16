# KernBot

## A javascript library that dynamically kerns characters based on their font size.

KernBot uses traditional calligraphy methods to categorize letters by the types of letter strokes they are comprised of. It then calculates the relative value letter-spacing by comparing the character's stroke types to the adjacent letters.

## To Do:

* analyze the kerning of different fonts
* test on different font sizes
* build a more user friendly front-end to play with KernBot and analyze kerning data

## How It Works:

There are two components to KernBot: a **Kerning Library** that contains the data legend of the characters and their associated stroke types, and the actual **Kerning Bot** that automates the kerning calculations and action output.

```
const KerningLib = new KernLib(characterStrokeLegend, strokeDataReference);
const KerningBot = new KernBot(KerningLib);
```

The character stroke legend contains a list of character objects that the KernBot is looking to kern. Each character object also contains the stroke type before (to the left of the character) and after (to the right of the character).

```
// KernBot
const characterStrokeLegend = [
	// ...lowercase
	{ "char": "a", "before": "o", "after": "l" },
	{ "char": "b", "before": "l", "after": "o" },
	{ "char": "c", "before": "o", "after": "l" },
	// ...capitols
	{ "char": "A", "before": "u", "after": "d" },
	{ "char": "B", "before": "l", "after": "o" },
	{ "char": "C", "before": "o", "after": "l" },
	// ...numbers
	{ "char": "0", "before": "o", "after": "o" },
	{ "char": "1", "before": "l", "after": "l" },
	{ "char": "2", "before": "l", "after": "o" },
	{ "char": "3", "before": "l", "after": "o" },
	// ...special chars
	{ "char": ".", "before": "s", "after": "n" },
	{ "char": ",", "before": "s", "after": "n" },
	{ "char": ";", "before": "s", "after": "n" },
	{ "char": "(", "before": "n", "after": "s" },
	{ "char": ")", "before": "s", "after": "n" }
];
```


### Stroke Types

The "stroke type" is an opinionated list of predefined values. The stroke types are derived from traditional calligraphy methods. In calligrphy, a letter is written a certain way; usually by the type of stroke, its direction, and the order of each stroke.

The available stroke types are defined by their **data code**:
```
-------------+------------------+------------
Stroke Type  | Name             | Data Code
-------------+------------------+------------
 l           |  line            |  l
 o           |  curve           |  o
 /           |  slant up        |  u
 \           |  slant down      |  d
 *           |  spacial case    |  s
-------------+------------------+------------
```


### Stroke Type Combinations

All the stroke data types are *weighted*, meaning the amount of space to kern depends on the combination of stroke types between two characters.

[KernBot Stroke Types Concept](./images/KernBot-concept.jpg)

The weighted stroke types are defined below (and may need adjusting):
```
------+-----------------------
Code  | Stroke Combinations:
------+-----------------------
 ll   |  line-line
 ol   |  curve-line
 lo   |  line-curve
 cc   |  curve-curve
      |
 //   |  slantUp-slantUp
 \\   |  slantDown-slantDown
 /\   |  slantUp-slantDown
 \/   |  slantDown-slantUp
      |
 /l   |  slantUp-line
 l/   |  line-slantUp
 \l   |  slantDown-line
 l\   |  line-slantDown
      |
 o/   |  curve-slantUp
 /o   |  slantUp-curve
 o\   |  curve-slantDown
 \o   |  slantDown-curve
------+-----------------------


// in KernBot stroke combo weights is codified like so
const strokeDataReference = [
	{code: "ll", s1: "l", s2: "l", weight: 4},
	{code: "lo", s1: "l", s2: "o", weight: 3},
	{code: "lu", s1: "l", s2: "u", weight: 6},
	{code: "ld", s1: "l", s2: "d", weight: 6},
	{code: "ls", s1: "l", s2: "s", weight: 4},
	{code: "ln", s1: "l", s2: "n", weight: 2},
	{code: "ol", s1: "o", s2: "l", weight: 3},
	{code: "oo", s1: "o", s2: "o", weight: 2},
	{code: "ou", s1: "o", s2: "u", weight: 5},
	{code: "od", s1: "o", s2: "d", weight: 5},
	{code: "os", s1: "o", s2: "s", weight: 3},
	{code: "on", s1: "o", s2: "n", weight: 1},
	{code: "ul", s1: "u", s2: "l", weight: 6},
	{code: "uo", s1: "u", s2: "o", weight: 5},
	{code: "uu", s1: "u", s2: "u", weight: 8},
	{code: "ud", s1: "u", s2: "d", weight: 8},
	{code: "us", s1: "u", s2: "s", weight: 6},
	{code: "un", s1: "u", s2: "n", weight: 4},
	{code: "dl", s1: "d", s2: "l", weight: 6},
	{code: "do", s1: "d", s2: "o", weight: 5},
	{code: "du", s1: "d", s2: "u", weight: 8},
	{code: "dd", s1: "d", s2: "d", weight: 8},
	{code: "ds", s1: "d", s2: "s", weight: 6},
	{code: "dn", s1: "d", s2: "n", weight: 4},
	{code: "sl", s1: "s", s2: "l", weight: 4},
	{code: "so", s1: "s", s2: "o", weight: 3},
	{code: "su", s1: "s", s2: "u", weight: 6},
	{code: "sd", s1: "s", s2: "d", weight: 6},
	{code: "ss", s1: "s", s2: "s", weight: 4},
	{code: "sn", s1: "s", s2: "n", weight: 2},
	{code: "nl", s1: "n", s2: "l", weight: 2},
	{code: "no", s1: "n", s2: "o", weight: 1},
	{code: "nu", s1: "n", s2: "u", weight: 4},
	{code: "nd", s1: "n", s2: "d", weight: 4},
	{code: "ns", s1: "n", s2: "s", weight: 2},
	{code: "nn", s1: "n", s2: "n", weight: 0}
];
```


