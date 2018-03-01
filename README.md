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
