# LCSS 0.1.0 — Language and Layout Specification

This document defines LCSS, a stylesheet language that selects HTML elements and assigns them a deliberately small set of layout properties. A conforming implementation must follow these parsing, matching, cascade, and layout rules. “Must” indicates a requirement.

## 1. Processing model

An implementation processes a stylesheet against an HTML document in this order:

1. Parse rules and declarations. Invalid rules and declarations are discarded as described below.
2. Match each rule selector against each element in the document.
3. Resolve matching declarations to produce each element's computed LCSS properties.
4. Generate layout boxes and lay them out as specified in Sections 6–9.
5. Clip and expose overflow as specified in Section 9.

The root is the document's root element. The rendering host supplies the root's available width and height (the **root viewport**) and text measurement. LCSS does not define HTML parsing, font selection, glyph shaping, or painting beyond clipping and scrollbars.

## 2. Source syntax

A stylesheet is a sequence of rules. Comments use `/* ... */` and may appear between tokens. Whitespace separates tokens. Identifiers match `[A-Za-z_][A-Za-z0-9_-]*` and are case-sensitive except boolean literals and the reserved display/overflow values listed below, which are ASCII case-insensitive.

```lcss
(tags) selector {
  width: 100px;
  margin: 4px, 8px;
}

selector {
  display: flex;
}
```

A rule has an optional tag list, a selector, and a declaration block. A tag list is parentheses enclosing zero or more whitespace-separated identifiers. Tags name rules for `include`; they do not directly affect selector matching, declaration precedence, or layout. A rule without a tag list is valid.

A declaration is a modifier name, colon, one or more comma-separated values, and a semicolon. The final semicolon is required. A malformed rule is discarded in its entirety. A malformed declaration is discarded without discarding other declarations or rules. To recover, discard the malformed declaration through the next semicolon at the declaration-block level; if a closing brace occurs first, discard up to but not including that brace and continue parsing the enclosing stylesheet. A missing semicolon therefore consumes the following text through the next semicolon or closing brace. Unknown modifier names are ignored. An alias is equivalent to its canonical modifier name.

Lexical delimiters are whitespace, `:`, `,`, `;`, `{`, `}`, `(`, `)`, `!`, `&`, `|`, `^`, `+`, `*`, `/`, `=`, `<`, and `>`. They end an unquoted token and cannot occur inside one. The multi-character comparison operators `=>`, `<=`, and `==` are recognized as single operators before their component characters are tokenized. A percent sign attached to a number is part of its percentage unit; `%` is a modulus operator only when separated from its left operand by whitespace. Subtraction is recognized only as a standalone `-` token, with whitespace required on both sides: `1 - 2` is subtraction, while `1-2` is one unquoted string token and is not an expression. A leading minus remains part of a negative numeric literal (for example, `-2`). The symbolic operators are individual tokens even when adjacent to other tokens, so `a:1&b:2` tokenizes as `a : 1 & b : 2`. A quoted string is delimited by single quotes, cannot contain a quote or line break, and may contain any other character, including delimiters. In selector atoms, the first colon separates the attribute name from its value; selector values may be quoted or unquoted and obey the same token rules. Selector values must be strings or booleans for pseudo-attributes as specified below; ordinary attribute values are compared to the string form of either a string or number token. Boolean selector values are only valid for `hover`, `active`, and `focus`. The selector grammar is: `expr := unary (binary_operator unary)*`; `binary_operator := "and" | "&" | "or" | "|" | "xor" | "^"`; `unary := ("not" | "!")* (atom | "(" expr ")")`; `atom := identifier ":" (quoted_string | token)`. Evaluate the binary-operator sequence strictly left to right, with all binary operators at the same precedence. A keyword is parsed as an operator only where the grammar expects an operator. Where an atom is expected, an identifier followed by `:` starts an atom even if the identifier is `not`, `and`, `or`, or `xor`; thus `not:true` is an atom, while `not a:1` is negation. After the colon, a keyword token is a value, so `mode:and` compares the value `and`. A selector must consume all tokens before the rule's opening brace.

## 3. Selectors

### 3.1 Atoms

An attribute atom has the form `name:value`. It is true when the element has an HTML attribute named `name` whose complete value equals the selector string `value`, using a case-sensitive comparison. Attribute names are ASCII case-insensitive for HTML elements. No substring, token-list, or namespace matching is implied.

The pseudo-attributes are:

- `hover`, `active`, `focus`: compare the corresponding interaction state to a boolean value.
- `content`: compare the element's text content (descendant text concatenated in document order) to a string.
- `tag`: compare the HTML local tag name, ASCII case-insensitively, to a string.

Pseudo-attribute names are reserved and are not read as HTML attributes. An atom with a type-incompatible value is false. A missing ordinary attribute is false, including for an empty string value.

### 3.2 Expressions and precedence

Selectors support parentheses, unary `not` or `!`, and binary `and` or `&`, `or` or `|`, and `xor` or `^`. `xor` is true exactly when one operand is true. Precedence from highest to lowest is parentheses, `not`, then all binary operators at equal precedence. Binary operators associate left to right. Thus `a:1 or b:1 and c:1` means `(a:1 or b:1) and c:1`.

An invalid selector makes its whole rule match no elements. No implicit selector, descendant combinator, class shorthand, or ID shorthand exists.

## 4. Values, units, and expressions

Quoted strings use single quotes; a string cannot contain a single quote or line break. Unquoted literals are classified in this order:

1. Boolean: `true` or `false`, case-insensitively.
2. Number: optional `-`, then one or more digits, optionally followed by `.` and one or more digits. Examples: `0`, `-12`, `0.75`. A leading `+`, exponent, leading decimal point, or trailing decimal point is invalid.
3. Length: a valid number immediately followed by `px`, `%`, or `et` (ASCII case-insensitive).
4. String: any other nonempty unquoted token.

Units are pixels (`px`), percentage (`%`, also named `perct`), and font-size multiples (`et`). A percentage resolves against the containing block's content-box width for width, x, and horizontal margins/padding, and against its content-box height for height, y, and vertical margins/padding. `et` resolves against the element's computed font size, supplied by the host; if unavailable, it resolves against 16px. A length whose percentage basis is indefinite resolves to zero. Numbers and lengths are distinct types.

An unquoted declaration value may be a mathematical expression, evaluated before the receiving modifier's parameter type is checked. Expressions use infix operators and parentheses. Precedence, highest to lowest: parentheses; unary `!`; `^`; `*`, `/`, `%`; `+`, `-`; comparisons `=>`, `<=`, `==`, `<`, `>`. Operators at the same level associate left to right. `^` is exponentiation: `A ^ B` computes A raised to B. The exponent B must be a number (a boolean is first converted to 1 or 0); a length exponent is invalid. A number base produces a number, and a length base produces a length in the same unit as A. For real results, a negative base is valid only with an integer exponent; zero to a negative exponent and any operation with no real result are invalid. `=>` means greater than or equal to (`A => B` is 1 exactly when `A >= B`); `<=` means less than or equal. `!value` returns 1 when the operand is less than or equal to zero, otherwise 0. Comparisons return numeric 1 or 0. `%` is modulus only when separated from its left operand by whitespace; adjacent `%` denotes a percentage unit. Division or modulus by zero makes the expression invalid.

Strings convert to zero in numeric operations; booleans convert to 1/0. Comparisons involving strings are invalid. Unit conversion uses the percentage and `et` bases defined above. For addition, subtraction, and modulus, two same-unit lengths retain that unit. Unlike-unit lengths are first converted to pixels and produce pixels. A number combined with a length adopts the length's unit, with its numeric value treated as that many units; the result is a length. Modulus requires operands of compatible types and a nonzero divisor.

Multiplication returns a number for two numbers, the length's unit for one length and one number, and pixels for two lengths (convert both to pixels first). Division returns a number for two numbers or two lengths (convert unlike length units to pixels); it returns the numerator's unit for a length divided by a number. A number divided by a length is invalid. Comparisons allow two numbers, two same-unit lengths, or two lengths with unlike units (convert both to pixels), and return a number; comparing a number with a length is invalid. Exponentiation follows the base-unit rule above. Unary `!` returns a number. Boolean and string operands convert to numbers before arithmetic, so they cannot be combined directly with lengths except through the number/length rules just given. A standalone literal retains its type and unit. An invalid expression or a result of the wrong type invalidates that parameter, and thus its declaration. Expressions are only allowed in declaration values, not selectors.

## 5. Declarations and computed properties

### 5.1 Rule and declaration precedence

Rules are considered in source order. For a given element and canonical modifier, the first valid declaration from the earliest matching rule that declares that modifier wins. Later rules and later declarations of that modifier do not replace it. Aliases and canonical names refer to the same modifier for this rule. This first-match behavior is intentional and differs from the CSS cascade. Tags do not affect selector matching or precedence; they only name rules for `include`.

A declaration is valid when it has at least the required parameters, those parameters have the required types, and any stated minimum parameter count is met. Parameters beyond those used by a modifier are ignored. Invalid declarations are ignored. Unmentioned properties receive the defaults in Section 6.

### 5.2 Modifier table

`Length` means a `px`, `%`, or `et` value; `Number` means a number; `String` means a string. Extra parameters are ignored; a modifier still requires the stated minimum number of parameters and valid types for the parameters it uses.

| Canonical modifier | Alias | Parameters | Meaning |
| --- | --- | --- | --- |
| `margin-top` | `mt` | 1 Length | Top margin |
| `margin-right` | `mr` | 1 Length | Right margin |
| `margin-bottom` | `mb` | 1 Length | Bottom margin |
| `margin-left` | `ml` | 1 Length | Left margin |
| `margin` | `m` | 1–4 Lengths | Margin shorthand (5.3) |
| `padding-top` | `pt` | 1 Length | Top padding |
| `padding-right` | `pr` | 1 Length | Right padding |
| `padding-bottom` | `pb` | 1 Length | Bottom padding |
| `padding-left` | `pl` | 1 Length | Left padding |
| `padding` | `p` | 1–4 Lengths | Padding shorthand (5.3) |
| `x` | — | 1 Length | Position from containing block's left edge |
| `y` | — | 1 Length | Position from containing block's top edge |
| `width` | `w` | 1 Length | Content width |
| `height` | `h` | 1 Length | Content height |
| `general` | `g` | 1–4 Lengths | Sets x, y, width, height in that order |
| `display` | `d` | 1 String | `text`, `flex`, or `flex-grow` (ASCII case-insensitive) |
| `overflow` | `o` | 1–3 Strings | See Section 9; recognized values are ASCII case-insensitive; later parameters are ignored |
| `flex-weight` | `fw` | 1 Number or the exact string `Infinity` | Flex allocation weight; `infinity` and other capitalization variants are not special |
| `flex-grow-cap` | `fgc` | 1 Number or the exact string `Infinity` | Maximum growth weight; capitalization is exact |
| `flex-direction` | `fd` | 1 String | `x` or `y`, lowercase and case-sensitive; `X` and `Y` are invalid |
| `include` | `i` | 1 or more Strings | Include declarations from tagged rules (5.2.1) |

### 5.2.1 Includes

Each `include` parameter names a tag. All rules with that exact, case-sensitive tag contribute their declarations to the including rule, in stylesheet source order; the tagged rules' selectors are not evaluated. Expansion occurs at the include declaration's position, and an included rule's `include` declarations expand recursively. Multiple matching tagged rules all contribute, and a tag listed more than once contributes each time. If expanding a parameter would revisit a tag already on the current expansion path, skip that parameter to break the cycle; continue with other parameters and declarations. The include declaration itself is not a computed property. Included declarations participate in the normal first-valid-declaration precedence at their expansion position.

The `general` declaration sets the corresponding individual properties as though declared at that point in the winning rule. For each property, an explicit declaration takes precedence over a `general`-supplied value only within the same including source rule, regardless of their order. Declarations expanded by `include` count as declarations of the including source rule for this purpose; the tagged source rule does not retain a separate precedence identity. Across different matching source rules, the earliest matching rule that supplies the property wins, whether it supplied it explicitly or through `general`/`include`.

### 5.3 Spacing shorthand

One value applies to all four sides. Two values apply first to top/bottom and second to left/right. Three values apply to top, left/right, and bottom. Four values apply to top, right, bottom, left.

### 5.4 Fixed dimensions and spacing

Width and height are content-box dimensions; padding and borders are outside them. Borders are unsupported and have zero thickness. If width is specified, horizontal margins and padding are fixed at their computed values and cannot be changed by flex sizing or overflow fitting. If height is specified, vertical margins and padding are likewise fixed. When a dimension is not specified, layout may determine that dimension. Negative computed width, height, padding, or flex share is clamped to zero; margins may be negative.

## 6. Defaults

Every element starts with `margin` and `padding` of zero on all sides. Undefined x, y, width, and height are determined by layout. An undefined display computes to `text`.

For `text`, overflow defaults to axis `w`, and flex properties have no effect. For `flex` and `flex-grow`, flex direction defaults to `x`, flex weight to 1, and flex-grow cap to `Infinity`; overflow axis defaults to the flex direction (`w` for `x`, `h` for `y`). An explicitly provided overflow declaration replaces the entire overflow default, including omitted optional parameters.

The root's used content-box width and height always equal the root viewport width and height. Explicit `width` or `height` declarations on the root are parsed and participate in declaration resolution, but are ignored when determining its used dimensions; they do not override or resize the viewport. The root's used x and y are both zero, placing it at the viewport's top-left; explicit root `x` or `y` declarations are ignored for positioning. If the root has one or more element children and has no non-whitespace direct text node (text nodes inside descendants do not count), its display is `flex` and its flex direction is `x`, unless its computed declarations explicitly set display or direction.

## 7. Boxes and containing blocks

Each element has a border box, padding box, and content box. As borders are zero, border and padding box edges coincide. The content box is inset by padding. Margins lie outside the border box. The containing block for an element's children is its parent's content box. Child x/y coordinates are measured from that content box's top-left corner (the parent's padding-box inner edge); parent padding is therefore excluded from the child coordinate origin.

An explicit width or height sets that content-box dimension after resolving units. An undefined dimension is intrinsic in `text` layout and allocated by flex layout as defined below. Only direct text nodes contribute text to an element's intrinsic size; descendant text contributes through its child element's box. The host measures a sequence of direct text nodes as they occur in document order, preserving whitespace and line breaks according to the host's normal text measurement rules. Its intrinsic width is the longest unwrapped line and its intrinsic height is the sum of line heights at that width. Each child contributes its margin box extent (content size plus padding and margins) to its parent's intrinsic measurement. The parent's own intrinsic width and height describe its content box and exclude its own margins and padding; padding is added outside the measured content size. An empty element has intrinsic size zero. A flex container measured intrinsically by a text parent has main-axis intrinsic size equal to the sum of its children's occupied main-axis intrinsic sizes, and cross-axis intrinsic size equal to the maximum occupied cross-axis intrinsic size. If its flex direction is x, width is the sum and height the maximum; for y, height is the sum and width the maximum. Flex containers do not lay out direct text as flex items. Direct text is measured as an independent text run and contributes an intrinsic width and height; those dimensions are mapped onto main and cross axes according to flex direction and combined with the child-derived extents using the maximum on each axis. This affects intrinsic measurement only; direct text does not receive a flex allocation or a position among child boxes.

For `text` display, children are placed at their computed x/y (default 0,0), in document order, and do not automatically flow around or below one another. A child's x/y is its margin-box top-left relative to the parent's content-box origin. The parent's intrinsic content width is the maximum of its direct text width and each child's right margin-box edge (`x + child margin-box width`), clamped to at least zero; intrinsic height is computed correspondingly from bottom edges and direct text height. Child margins therefore count toward the parent's intrinsic size. A negative x or y does not increase intrinsic width or height, because it does not extend the right or bottom edge from the content origin; it may extend beyond the parent's top or left edge and is handled as overflow. Explicit dimensions override intrinsic dimensions.

## 8. Flex layout

A `flex` or `flex-grow` element lays out its element children in document order along its flex axis. The initial allocation pool is the parent's full content-box dimension on that axis. The flex total is the sum of every element child's applicable weight, including children with an explicit main-axis size. Each child without an explicit main-axis size receives a weighted outer slot equal to the full pool multiplied by its weight divided by that total; subtract that child's main-axis margins and padding to obtain its content size. A child with an explicit main-axis dimension keeps that explicit content size instead of receiving a weighted slot, but its weight still contributes to the total and it does not reserve its occupied size before flexible shares are calculated. Thus fixed-size children can leave unused space or cause overflow, and flexible children may receive less than the full pool. If the flex total is zero, each weighted size is zero. Negative computed content sizes are clamped to zero. The growth pool is calculated separately as specified in Section 9, where fixed children do reserve occupied space.

On the cross axis, a child with an undefined dimension fills the parent's content-box dimension minus the child's padding and margins. An explicit cross-axis dimension is retained. Flex layout ignores child `x` and `y` offsets: children start at the parent's content-box leading edge plus their leading margin on the cross axis, and are placed consecutively on the main axis with no gaps, in document order. No alignment, wrapping, or gap behavior is defined in version 0.1.0.

Weights are finite numbers or the special string `Infinity`; negative numeric weights are converted to their absolute value. A weight of zero gives the child zero main-axis content size. If one or more applicable weights are `Infinity`, finite weights receive zero share and the infinite-weight children divide the distributable space equally. This rule applies only to allocation; growth calculations handle infinite weights as specified in Section 9. If all applicable weights are zero, their shares are zero. Flex allocation is recalculated whenever growth changes a weight.

## 9. Overflow and growth

Overflow is evaluated after initial sizing. The **scrollport** is the element's content box. A viewport in this section means the containing block's content box; for the root, it is the root viewport. Each direct text run has measured bounds beginning at the top-left of its own element's content box, at local coordinate `(0,0)`, with its measured width and height. This applies to text and flex display; in a flex container direct text contributes at that origin and is not positioned among child boxes. To form overflow bounds, translate each text run's local bounds by the position of its element's content-box origin in the ancestor's coordinate space. The **scrollable overflow area** includes the element's content box, all direct text-run bounds within its subtree, and every descendant's border box (which includes its padding), expanded by that descendant's margins. The element's own padding is outside its scrollport and is not part of its scrollable overflow area. When collecting bounds for an ancestor, a descendant's own border box and margins always contribute. If either optional overflow parameter on that descendant is `hidden`, clip its contents and descendant boxes to its scrollport on both axes before including them in the ancestor's overflow area; bounds outside that scrollport do not propagate farther up the tree. Otherwise, descendant overflow is not clipped for ancestor-bound calculation, including on axes that the descendant itself does not scroll. After applying any intervening descendant clipping, combine the bounds to determine this element's overflow. A descendant margin or text bound extending beyond this element's scrollport creates overflow unless clipped by an intervening descendant with hidden overflow. Overflow axis parameter 1 is `w`/`width`, `h`/`height`, or `both` (ASCII case-insensitive). Parameter 2 may be `grow` or `hidden`. Parameter 3 may be `hidden`. If either optional parameter is `hidden`, this element's entire scrollable overflow area is clipped at its scrollport on both axes, and no scrollbar is exposed on either axis. Hidden clipping also disables growth, even when parameter 2 is `grow`; otherwise `grow` may run. With no hidden parameter, the selected axis/axes are scrollable and expose scrollbars when their overflow area exceeds the scrollport; overflow on unselected axes remains visible beyond the scrollport and has no scrollbar. A scrollbar's thickness and exact rendering are host-defined and do not alter LCSS sizing.

For text display without `grow`, let `W0,H0` be the pre-overflow content dimensions, using an explicit dimension where specified and otherwise the intrinsic dimension; let `Wv,Hv` be the containing viewport dimensions. A dimension explicitly set by `width`/`height` is fixed and is never changed. For axis `w`, let H be `H0` when height is fixed, otherwise `min(H0,Hv)`. Set an undefined height to H. If width is undefined and H is positive, set width to `max(W0, W0*H0/H)`; a fixed width remains W0. For axis `h`, let W be `W0` when width is fixed, otherwise `min(W0,Wv)`. Set an undefined width to W. If height is undefined and W is positive, set height to `max(H0, W0*H0/W)`; a fixed height remains H0. For axis `both`, first set each undefined dimension to its minimum of original and viewport size. Let `A=W0*H0`. If the resulting area is below A and both dimensions are undefined, select the dimension with the smaller fit ratio (`W/W0` versus `H/H0`; ties select width), and set it to `A` divided by the other dimension. This ratio comparison is performed only when both W0 and H0 are positive. If either is zero, A is zero and no area-preserving adjustment is made; retain the dimensions established by the initial fit step. Do not restore or clamp the selected dimension to its original size; it may exceed both its original size and viewport. If one dimension is fixed, keep it fixed and set the other undefined dimension to `A/fixed_dimension` when the fixed dimension is positive. If a required divisor is zero, retain the dimensions established by the initial fit step. Fixed dimensions are never changed. Any excess beyond the viewport remains scrollable on the selected axes. These rules preserve the original area where dimensions permit; they do not guarantee the fitted box stays within the viewport.

For flex and flex-grow display, an explicit overflow axis overrides the default flex-axis choice. `w` scrolls horizontally, `h` vertically, and `both` on both axes. If omitted, the default is the flex axis. Flex layout itself remains on its configured flex axis regardless of overflow axis.

Growth is requested by the overflowing child: it is attempted only when that child's overflow parameter 2 is `grow` and neither of that child's optional overflow parameters is `hidden`. Hidden clipping on the child disables its growth request. The child's overflow parameter 1 selects which of its overflowing axes are eligible to trigger growth; an unselected axis never triggers growth. The parent determines how to respond based on its display mode: a text parent can increase the child's undefined dimensions, while a flex parent can adjust the child's flex weight. The parent's own overflow parameters govern clipping and scrolling of the parent's overflow; they do not enable or disable a child's growth request. Text-parent growth sets an undefined child dimension to its intrinsic requirement only on selected overflowing axes; dimensions on other axes are unchanged. Explicit dimensions remain fixed. Ancestor scrollbars do not count as child overflow. A flex parent can address growth only when the child's selected overflowing axes include the parent's flex axis; if overflow is only on a selected cross axis, its flex weight is unchanged and normal overflow handling applies.

For flex-parent growth, a child with an explicit size on the parent's flex axis is excluded from flex allocation, so its flex weight cannot change its allocated size. Its weight remains unchanged and normal overflow handling applies. For an eligible child without an explicit main-axis size, use content sizes consistently. For each requesting child, after applying any earlier growth updates in document order, recompute its required size and the current flexible sibling weights. Let `R` be the distributable content size after subtracting fixed children's occupied sizes and the margins and padding of every flexible child (as in Section 8); this geometric remainder does not change when weights change. Let `S` be the sum of the other flexible siblings' current weights, and let `T` be the requesting child's current required content size. If `0 <= T < R` and `S > 0`, its target weight is `T*S/(R-T)`. If any other flexible sibling has weight `Infinity`, no finite increase can increase this child's share. Its weight remains unchanged; if it already has weight `Infinity`, the infinite-weight children continue to divide `R` equally. Otherwise, if `S = 0` and its current weight is positive, it already receives all of `R`, so its weight does not change. If `S = 0` and its weight is zero, its target weight is `Infinity` if the cap is `Infinity`, otherwise the cap; a zero cap leaves it unchanged. If `T >= R`, its weight remains unchanged and overflow is handled normally. Recompute all flexible allocations after the update. For a `flex-grow` parent, the original flex total `F` is captured before growth and remains fixed for the entire layout pass, as required by `flex-grow`; it is not recomputed after earlier updates. If any other flexible sibling currently has weight `Infinity`, a finite increase cannot increase the requesting child's share, so its weight remains unchanged. Otherwise, when `F` is finite and `R > 0`, its target weight is `T*F/R`; sibling allocations are recomputed using their current weights divided by the unchanged `F`. Thus the child's allocation may exceed the parent and cause parent overflow. If `R = 0`, its weight remains unchanged. If `F` is `Infinity` because the requesting child itself already has infinite weight and no other child does, it already receives all available space and its weight remains unchanged. These rules avoid undefined arithmetic such as `0*Infinity`.

Growth is performed once per layout pass in document order for each child requesting grow. Before processing each child, determine its current overflow and, for flex parents, recompute the sibling weights and target inputs as specified above. Growth never reduces the child's current weight. First compute the target weight using the applicable formula. Then compute the growth ceiling as `max(current_weight, flex-grow-cap)`, and assign `min(max(current_weight, target_weight), growth_ceiling)`. Thus a cap below the current weight does not lower it and prevents any further increase. `Infinity` is assigned only when the target or current weight is `Infinity` and the growth ceiling permits it. Multiple infinite weights share space equally as defined in Section 8. If the cap is reached before overflow is gone, remaining overflow is handled by the configured overflow axis.

## 10. Host-dependent behavior and version boundary

The host supplies viewport dimensions, computed font size, text measurement, interaction states, scrollbars, and painting. Given the same host inputs and DOM, an implementation must produce the same computed properties, box dimensions, positions, and overflow axes. Pixel rasterization and scrollbar appearance are outside this specification.

LCSS 0.1.0 does not define inheritance, CSS specificity, CSS pseudo-classes, relative/absolute/fixed positioning, borders, transforms, grid, flex wrapping, alignment, animation, media queries, or interaction event handling. Unsupported syntax has no effect as specified above.
