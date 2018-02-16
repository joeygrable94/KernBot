# KernBot

## A javascript library that dynamically kerns characters based on their font size.

KernBot uses traditional calligraphy methods to categorize letters by the types of letter strokes they are comprised of. It then calculates the relative value letter-spacing by comparing the character's stroke types to the adjacent letters.

## How It Works:

There are two components to KernBot: a **Kerning Library** that contains the data legend of the characters and their associated stroke types, and the actual **Kerning Bot** that automates the kerning calculations and action output.

```
const KerningLib = new KernLib(characterStrokeLegend, strokeDataReference);
const KerningBot = new KernBot(KerningLib);
```

The character stroke legend contains a list of character objects that the KernBot is looking to kern. Each character object also contains the stroke type before (to the left of the character) and after (to the right of the character).

```
const characterStrokeLegend = [
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
```


### Stroke Types

The "stroke type" is an opinionated list of predefined values. The stroke types are derived from traditional calligraphy methods. In calligrphy, a letter is written a certain way; usually by the type of stroke, its direction, and the order of each stroke.


```
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
