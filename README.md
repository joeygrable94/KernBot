# KernBot

## A javascript library that dynamically kerns characters based on their font size.

KernBot uses traditional calligraphy methods to categorize letters by the types of letter strokes they are comprised of. It then calculates the relative value letter-spacing by comparing the character's stroke types to the adjacent letters.

## How It Works:

There are two components to KernBot:
* a Kerning Library that contains the data legend of the characters and their associated stroke types
* and the actual Kerning Bot that automates the kerning calculations and action output.

```
const KerningLib = new KernLib(characterStrokeLegend, strokeDataReference);
const KerningBot = new KernBot(KerningLib);
```

