<!-- TODO:
elements (makes multiple layers)
text
--->

# Syntax
General block:
```lcss
(tags) selector {
	modifiers
}
```
Tags is a set of strings seperated by a space.
A selector matches against HTML atributes and their values ('attribute' is the attribute name, 'value' is the value):
```lcss
attribute:value { ... }
attribute:value and attribute2:value { ... }
/* alternative: & */
attribute:value or attribute2:value { ... }
/* alternative: | */
attribute:value xor attribute2:value { ... }
/* alternative: ^ */
not attribute:value { ... }
/* alternative: ! */
/* Order of operations: 1: everything in parantheses (like in PEMDAS). 2: not. 3: and / or / xor (left to right) */
/* xor = Exclusive OR */
```
modifiers:
```lcss
... {
	modifier-name: value, value2, value3, etc.;
	modifier2: value, value2, value3, etc.;
	example-math: a + b, a - b, a / b, a * b, a + (a * b), a ^ b;
}
```
If a modifier is defined twice or more times, then the modifier which is matched earliest will always be the value to use (so like in <div class="a b">, 'a' will always win).
Math is defined follows traditional parantheses nesting and uses 'a operator b' syntax (exception for '!', it can do '!NNN'), the symbols are:
* 1: '=>': larger than or equal, A > B = 0, A => B = 1
* 1: '<=': less than or equal, A < B = 0, A <= B = 1
* 1: '==': equals, A == B = 1, A != B = 0
* 1: '<' : less than, A < B = 1, A > B = 0
* 1: '>' : larger than, A > B = 1, A < B = 0
* 2: '+' : addition
* 2: '-' : subtraction
* 3: '*' : multiplication
* 3: '/' : division
* 3: '%' : modulus, same level as * and /, should be differed from Unit perct by it having a space between N and % (e.g. 'NNN %')
* 4: '^' : power
* 4: '!' : not, N > 0 -> 0, N =< 0 -> 1, 
* 5: '(' and ')' : parantheses
Order of Precedence is according to levels, where the higher levels go first and then the lower levels (1 is lowest, 5 is highest)
an operation is always done on the values, however, if there are 2 different units, the resulting unit must be chosen based on these rules:
* px to num 	: px, num -> px 	(copied)
* px to et		: px, et -> px		(converted, -> # Units)
* px to perct	: px, perct -> px	(converted, -> # Units)
* et to perct	: px, both -> px	(converted, -> # Units)
* et to num		: et, num -> et		(copied)
* perct to num	: perct, num -> perct (copied)
NOTE: bools evaluate to num's based on this: True -> 1, False -> 0
NOTE: str's evaluate to num's with the value 0.
NOTE: ^^^ occurs first

# Units
NNN stands for a value of variable length, anything else is a way to define which unit is being used.
Lengths:
* NNNpx : pixels (name: px)
* NNN% : percentage of the parent container, modifier-reliant, e.g. width: 100% makes the width 100% the width of the parent (name: perct)
* NNNet : font size (name: et)
General:
* NNN : number (only if it obeys US writing conventions for numbers, '.' to seperate integer and floating point part, '-' at start for negative. name: num)
* 'NNN' or NNN : string (in '' it is always a string, without, it must not be a number or bool to be a string. name: str)
* NNN : boolean (only if NNN equals 'True' or 'False' case-insensitive. name: bool)

# Selectors
Psuedo-attributes:
* 'hover' : True / False
* 'active' : True / False
* 'focus' : True / False
* 'content' : content of the container
* 'tag' : tag of the HTML tag

# Modifiers
Modifiers are ignored and treated as undefined if they dont follow the parameter rules.
NOTE: borders are not yet implemented, as such, they should be seen as always having a value of 0px.
NOTE: margin & padding operate similair to CSS, if a width and/or height is defined, margin and/or padding cannot be overwritten. any overflow: -> ## Overflow
| Category | Modifier | Alias | Parameters | Description |
| --- | --- | --- | --- | --- |
| Margin and Padding | 'margin-top' | 'mt' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'margin-bottom' | 'mb' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'margin-left' | 'ml' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'margin-right' | 'mr' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'margin' | 'm' | 1 - margin-top / all / top+bottom, 2 - margin-bottom / left+right, 3 - margin-left, 4 - margin-right, rest - ignored | ^^^ |
| Margin and Padding | 'padding-top' | 'pt' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'padding-bottom' | 'pb' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'padding-left' | 'pl' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'padding-right' | 'pr' | 1 - Length, rest - ignored | same as CSS |
| Margin and Padding | 'padding' | 'p' | 1 - padding-top / all / top+bottom, 2 - padding-bottom / left+right, 3 - padding-left, 4 - padding-right, rest - ignored | ^^^ |
| Position and Size | 'x' | — | 1 - Length, rest - ignored | same as CSS, relative to parent |
| Position and Size | 'y' | — | 1 - Length, rest - ignored | same as CSS, relative to parent |
| Position and Size | 'width' | 'w' | 1 - Length, rest - ignored | same as CSS, absolute / relative to parent, exclude margin and/or padding |
| Position and Size | 'height' | 'h' | 1 - Length, rest - ignored | same as CSS, absolute / relative to parent, exclude margin and/or padding |
| Position and Size | 'general' | 'g' | 1 - x, 2 - y, 3 - w, 4 - h, rest - ignored | ^^^ |
| Display | 'display' | 'd' | 1 - str ('text', 'flex' or 'flex-grow') | -> # Display |
| Dispaly | 'overflow' | 'o' | 1 - str ('width', 'w', 'height', 'h', 'both'), 2 - str ('grow' / 'hidden'), 3 - str ('hidden'), rest - ignored | -> ## Flex / -> ## Flex-grow / -> ## Text |
| Flex | 'flex-weight' | 'fw' | 1 - num, rest - ignored | -> ## Flex / ## Flex-grow |
| Flex | 'flex-grow-cap' | 'fgc' | 1 - num, rest - ignored | -> ## Flex / ## Flex-grow & # Grow |
| Flex | 'flex-direction' | 'fd' | 1 - str ('x' or 'y'), rest - ignored | -> ## Flex / ## Flex-grow |
| Reference | 'include' | 'i' | 1 - str, 2 - str, etc. | 1 till N is a style tag name and the corresponding modifiers should just be copied into this block, updates on the correspoding block also cause updated in the block using include, not an actual tag = ignored, appears more than once = all occurences included, nested include = nested include is executed, cycle include = ignore the deepest include that caused the problem (only for the specific param that caused it though) |

# Display
Throughout all of this, margin & padding have to be included in any eqautions.
The root obeys to # Defaults, but if any amount of children are in root and there is no content, it shall obey { display: flex; flex-direction: x; } + defaults.
## Flex
The sum of the flex-weight of all children is reffered to as flex-total. Missing values are to be used as defaults, zero -> object is 0px by 0px, negative -> become positive similair to the absolute operation.
If flex-total is zero, then all (flex-weight / flex-total) should resolve to 0.
flex-direction = 'x':	The children's height is that of the parent (minus margin & padding) and the width is { parent-width * (flex-weight / flex-total) } (minus margin & padding).
flex-direction = 'y':	The children's width is that of the parent (minus margin & padding) and the height is { parent-height * (flex-weight / flex-total) } (minus margin & padding).
If the height or width (whatever is on the flex-direction) has been statically defined, that will overwrite ALWAYS.

# Overflow
Original Area is width * height before any overflow logic is applied.
In case of overflow, it is decided by the 'display' and 'overflow' modifier:
* overflow-2 / overflow-3 = 'hidden':
	* No scrollbars will appear, sections outside the viewport are simply inaccesible.
* overflow-2 = 'grow':
	* -> ## Grow
* display = 'text':
	* overflow-1 = 'height' / 'h':
		* The width is set to the width of the viewport and height is added to maintain the original area. scrollbar along the y axis.
	* overflow-1 = 'width' / 'w':
		* The height is set to the height of the viewport and width is added to maintain the original area. scrollbar along the x axis.
	* overflow-1 = 'both':
		* The height and width are set to reduce the distance of the outer bottom-right corner to the bottom-right corner of the viewport. scrollbar along x and y axis.
* display = 'flex' / 'flex-grow':
	* Scrollbar along the flex-axis

## Grow
Happens after initical overflow modificiation (-> # Overflow), decided by the parent 'display' modifier:
* display = 'text':
	* Size is increased so its large enought to fit all content without showing scrollbars (parent, grandparent, etc. scrollbars excluded)
* display = 'flex';
	* flex-weight is increased untill the overflow is gone, flex-weight is Infinity and/or flex-weight is >= flex-grow-cap. flex-total and siblings are updated accordingly.
	* NOTE: if it reaches the cap, the system stops growing any larger under all circumstances.
* display = 'flex-grow':
	* flex-weight is increased untill the overflow is gone, flex-weight is Infinity and/or flex-weight is >= flex-grow-cap. flex-total is not updated, siblings are. This always causes an overflow in the parent.
	* NOTE: if it reaches the cap, the system stops growing any larger under all circumstances.

# Defaults
## Basics
margin: 0px 0px 0px 0px
padding: 0px 0px 0px 0px
x, y, width and height are left to be auto-generated by any other systems.
## display
if undefined, treat it defined as display: text
if defined, but 'grow' or 'hidden' is omitted, then it should keep being omitted.
if defined:
	display = 'text':
		overflow: 'w'
		'flex-*' (* means anything of any length in # Modifiers) are unrelevant for this display mode.
	display = 'flex' / 'flex-grow':
		flex-direction: x
		flex-weight: 1
		flex-grow-cap: Infinity
		overflow: { value of flex-direction, x -> w, y -> h }

