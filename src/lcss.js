/* A small, dependency-free LCSS 0.1.0 parser and computed-style engine. */

const IDENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const NUMBER = /^-?\d+(?:\.\d+)?$/;
const LENGTH = /^(-?\d+(?:\.\d+)?)(px|%|et)$/i;

function tokenize(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) return { tokens: out, fatal: true };
      i = end + 2;
      continue;
    }
    if (c === "'") {
      const end = source.indexOf("'", i + 1);
      if (end < 0 || /[\r\n]/.test(source.slice(i + 1, end))) {
        out.push({ type: 'bad', value: '' }); i++;
      } else {
        out.push({ type: 'string', value: source.slice(i + 1, end) }); i = end + 1;
      }
      continue;
    }
    if ('{}():,;!&|^'.includes(c)) { out.push({ type: c, value: c }); i++; continue; }
    let j = i + 1;
    while (j < source.length && !/\s/.test(source[j]) && !'{}():,;!&|^\''.includes(source[j])) {
      if (source.startsWith('/*', j)) break;
      j++;
    }
    out.push({ type: 'word', value: source.slice(i, j) });
    i = j;
  }
  return { tokens: out, fatal: false };
}

const isWord = t => t && (t.type === 'word' || t.type === 'string');
const lower = s => s.toLowerCase();

function parseValue(t) {
  if (!t || !isWord(t)) return null;
  if (t.type === 'string') return { type: 'string', value: t.value };
  if (/^(true|false)$/i.test(t.value)) return { type: 'boolean', value: lower(t.value) === 'true' };
  if (NUMBER.test(t.value)) return { type: 'number', value: Number(t.value) };
  const m = t.value.match(LENGTH);
  if (m) return { type: 'length', value: Number(m[1]), unit: lower(m[2]) };
  return t.value ? { type: 'string', value: t.value } : null;
}

const aliases = {
  mt:'margin-top', mr:'margin-right', mb:'margin-bottom', ml:'margin-left', m:'margin',
  pt:'padding-top', pr:'padding-right', pb:'padding-bottom', pl:'padding-left', p:'padding',
  w:'width', h:'height', g:'general', d:'display', o:'overflow', fw:'flex-weight',
  fgc:'flex-grow-cap', fd:'flex-direction'
};
const sideNames = ['top','right','bottom','left'];
const modifierTypes = {
  'margin-top':['length'], 'margin-right':['length'], 'margin-bottom':['length'], 'margin-left':['length'],
  margin:['length'], 'padding-top':['length'], 'padding-right':['length'], 'padding-bottom':['length'], 'padding-left':['length'], padding:['length'],
  x:['length'], y:['length'], width:['length'], height:['length'], general:['length'],
  display:['string'], overflow:['string'], 'flex-weight':['number','infinity'], 'flex-grow-cap':['number','infinity'], 'flex-direction':['string']
};

function validDeclaration(name, values) {
  const canonical = aliases[name] || name;
  const types = modifierTypes[canonical];
  if (!types || !values.length) return null;
  const ranged = ['margin','padding','general','overflow'].includes(canonical);
  if (ranged ? values.length > (canonical === 'overflow' ? 3 : 4) : values.length !== 1) return null;
  for (let i=0;i<values.length;i++) {
    const v = values[i];
    const expected = types[0];
    if (expected === 'length' && v.type !== 'length') return null;
    if (expected === 'string' && v.type !== 'string') return null;
    if (expected === 'number' && !(v.type === 'number' || (v.type === 'string' && v.value === 'Infinity' && !v.quoted))) return null;
  }
  if (canonical === 'display' && !['text','flex','flex-grow'].includes(lower(values[0].value))) return null;
  if (canonical === 'flex-direction' && !['x','y'].includes(lower(values[0].value))) return null;
  if (canonical === 'overflow' && (!['w','width','h','height','both'].includes(lower(values[0].value)) || values.slice(1).some(v => !['grow','hidden'].includes(lower(v.value))))) return null;
  return { name: canonical, values };
}

function splitDeclarations(tokens) {
  const groups = [];
  let current = [];
  for (const t of tokens) {
    if (t.type === ';') { groups.push(current); current = []; }
    else current.push(t);
  }
  // The final semicolon is required; an unfinished final declaration is ignored.
  return groups;
}

function parseDeclarations(tokens) {
  const result = [];
  for (const group of splitDeclarations(tokens)) {
    const colon = group.findIndex(t => t.type === ':');
    if (colon !== 1 || !group[0] || group[0].type !== 'word') continue;
    const values = [];
    let part = [];
    let malformed = false;
    for (const t of group.slice(colon + 1)) {
      if (t.type === ',') {
        if (part.length !== 1) { malformed = true; break; }
        values.push(parseValue(part[0])); part = [];
      } else part.push(t);
    }
    if (part.length !== 1) malformed = true;
    else values.push(parseValue(part[0]));
    if (malformed || values.some(v => !v)) continue;
    const decl = validDeclaration(group[0].value, values);
    if (decl) result.push(decl);
  }
  return result;
}

function parseRules(source) {
  const lexed = tokenize(String(source));
  if (lexed.fatal) return [];
  const ts = lexed.tokens, rules = [];
  let i = 0;
  while (i < ts.length) {
    let start = i, open = -1, depth = 0, parens = 0;
    for (; i < ts.length; i++) {
      const t = ts[i];
      if (t.type === '(') parens++;
      if (t.type === ')') { if (--parens < 0) break; }
      if (!parens && t.type === '{') { open = i; break; }
      if (!parens && t.type === '}') break;
    }
    if (open < 0) { i = Math.max(i + 1, start + 1); continue; }
    let close = open + 1;
    while (close < ts.length && ts[close].type !== '}') close++;
    if (close >= ts.length) break;
    const head = ts.slice(start, open);
    let selector = head, tags = [];
    // A leading parenthesized group is metadata only when selector tokens follow it.
    if (head[0]?.type === '(') {
      let n = 1;
      while (n < head.length && head[n].type !== ')') n++;
      if (n < head.length && n < head.length - 1) {
        const tagTokens = head.slice(1, n);
        if (tagTokens.every(t => t.type === 'word') && tagTokens.every(t => IDENT.test(t.value))) {
          tags = tagTokens.map(t => t.value); selector = head.slice(n + 1);
        }
      }
    }
    // Discard malformed selectors at parse time; selector validity is checked below.
    const parsedSelector = parseSelector(selector);
    if (parsedSelector) rules.push({ tags, selector: parsedSelector, declarations: parseDeclarations(ts.slice(open + 1, close)) });
    i = close + 1;
  }
  return rules;
}

function parseSelector(tokens) {
  if (!tokens.length || tokens.some(t => t.type === 'bad')) return null;
  let i = 0;
  function atom() {
    const name = tokens[i++];
    if (!name || name.type !== 'word' || !IDENT.test(name.value) || tokens[i++]?.type !== ':') return null;
    const value = parseValue(tokens[i++]);
    return value ? { kind:'atom', name:name.value, value } : null;
  }
  function unary() {
    let not = false;
    while (tokens[i]?.type === '!' || (tokens[i]?.type === 'word' && tokens[i].value === 'not' && tokens[i+1]?.type !== ':')) { not = !not; i++; }
    let node;
    if (tokens[i]?.type === '(') {
      i++; node = expression();
      if (!node || tokens[i++]?.type !== ')') return null;
    } else node = atom();
    return node && not ? { kind:'not', child:node } : node;
  }
  function expression() {
    let node = unary(); if (!node) return null;
    while (i < tokens.length && (tokens[i].type === '&' || tokens[i].type === '|' || tokens[i].type === '^' || (tokens[i].type === 'word' && ['and','or','xor'].includes(tokens[i].value)))) {
      const op = tokens[i++]; const right = unary(); if (!right) return null;
      node = { kind:'binary', op: op.type === 'word' ? op.value : op.type, left:node, right };
    }
    return node;
  }
  const tree = expression();
  return tree && i === tokens.length ? tree : null;
}

function textContent(element) { return element.textContent ?? ''; }
function matchSelector(node, element, states) {
  if (node.kind === 'not') return !matchSelector(node.child, element, states);
  if (node.kind === 'binary') {
    const a = matchSelector(node.left, element, states), b = matchSelector(node.right, element, states);
    return ['and','&'].includes(node.op) ? a && b : ['or','|'].includes(node.op) ? a || b : a !== b;
  }
  const name = node.name, v = node.value;
  if (['hover','active','focus'].includes(name)) return v.type === 'boolean' && Boolean(states[name]) === v.value;
  if (name === 'content') return v.type === 'string' && textContent(element) === v.value;
  if (name === 'tag') return v.type === 'string' && element.localName?.toLowerCase() === v.value.toLowerCase();
  if (v.type !== 'string' && v.type !== 'number') return false;
  const attr = element.getAttribute?.(name.toLowerCase());
  return attr !== null && attr !== undefined && attr === String(v.value);
}

function expandRule(declarations) {
  const props = Object.create(null), explicit = new Set();
  for (const d of declarations) if (!['margin','padding','general'].includes(d.name) && !explicit.has(d.name)) {
    let value = d.values[0];
    if (['display','flex-direction'].includes(d.name) && value.type === 'string') value = { ...value, value: lower(value.value) };
    if (d.name === 'overflow') {
      const axis = lower(value.value);
      value = { ...value, value: axis === 'width' ? 'w' : axis === 'height' ? 'h' : axis,
        options: d.values.slice(1).map(v => lower(v.value)) };
    }
    if ((d.name === 'flex-weight' || d.name === 'flex-grow-cap') && value.type === 'number') value = { ...value, value: Math.abs(value.value) };
    props[d.name] = value; explicit.add(d.name);
  }
  for (const d of declarations) {
    const n = d.name, vs = d.values;
    if (n === 'margin' || n === 'padding') {
      const prefix = n + '-';
      const sides = vs.length === 1 ? [vs[0],vs[0],vs[0],vs[0]] : vs.length === 2 ? [vs[0],vs[1],vs[0],vs[1]] : vs.length === 3 ? [vs[0],vs[1],vs[2],vs[1]] : vs;
      sideNames.forEach((side,k) => { const key=prefix+side; if (!explicit.has(key) && !(key in props)) props[key]=sides[k]; });
    }
    if (n === 'general') ['x','y','width','height'].forEach((key,k) => { if (vs[k] && !explicit.has(key) && !(key in props)) props[key]=vs[k]; });
  }
  return props;
}

function computeStyles(root, stylesheet, interactionStates = new WeakMap()) {
  const rules = typeof stylesheet === 'string' ? parseRules(stylesheet) : stylesheet;
  const elements = [root, ...(root.querySelectorAll ? root.querySelectorAll('*') : [])];
  const computed = new Map();
  for (const element of elements) {
    const props = Object.create(null);
    for (const rule of rules) {
      const state = interactionStates instanceof WeakMap ? interactionStates.get(element) || {} : interactionStates(element) || {};
      if (!matchSelector(rule.selector, element, state)) continue;
      const expanded = expandRule(rule.declarations);
      for (const [key,value] of Object.entries(expanded)) if (!(key in props)) props[key] = value;
    }
    const hasElementChildren = element.children?.length > 0;
    const hasDirectText = Array.from(element.childNodes || []).some(n => n.nodeType === 3 && n.nodeValue.trim() !== '');
    const rootFlex = element === root && hasElementChildren && !hasDirectText;
    const display = props.display?.value ?? (rootFlex ? 'flex' : 'text');
    const result = {
      ...Object.fromEntries(Object.entries(props)),
      display,
      margin: Object.fromEntries(sideNames.map(s => [s, props[`margin-${s}`] || {type:'length',value:0,unit:'px'}])),
      padding: Object.fromEntries(sideNames.map(s => [s, props[`padding-${s}`] || {type:'length',value:0,unit:'px'}]))
    };
    if (display === 'flex' || display === 'flex-grow') {
      result['flex-direction'] = props['flex-direction'] || {type:'string',value:'x'};
      result['flex-weight'] = props['flex-weight'] || {type:'number',value:1};
      result['flex-grow-cap'] = props['flex-grow-cap'] || {type:'string',value:'Infinity'};
      result.overflow = props.overflow || {type:'string',value:result['flex-direction'].value === 'x' ? 'w' : 'h'};
    } else result.overflow = props.overflow || {type:'string',value:'w'};
    computed.set(element, Object.freeze(result));
  }
  return computed;
}

export { parseRules, parseSelector, computeStyles };
