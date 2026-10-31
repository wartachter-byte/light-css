# LCSS core

This repository contains a small JavaScript implementation of the parsing,
selector matching, and computed-property stages in `target.md`. It does not
perform box layout or paint; the returned property map is intended as the input
to a host layout engine.

```js
import { computeStyles, parseRules } from './lcss.js';

const rules = parseRules(`
  (demo) tag:section {
    display: flex;
    flex-direction: x;
    padding: 8px, 12px;
  }
  tag:button and active:true { margin: 4px; }
`);

// `document.documentElement` and descendants are keys in this Map.
const styles = computeStyles(document.documentElement, rules);
const sectionStyle = styles.get(document.querySelector('section'));
```

Computed values are represented as `{ type, value, unit? }` objects. `margin`
and `padding` are also exposed as side maps (`top`, `right`, `bottom`, `left`),
with zero-pixel defaults. Pass interaction states as a `WeakMap` keyed by element,
or as a callback `(element) => ({ hover, active, focus })`:

```js
const styles = computeStyles(document.documentElement, source, element => ({
  hover: element.matches(':hover'),
  active: element.matches(':active'),
  focus: element.matches(':focus'),
}));
```

Rules are evaluated in source order, and the first valid declaration for each
property wins. Tags are retained as rule metadata and do not affect matching.
