/* Genogram Builder — plain JS, SVG rendering, vector PDF via jsPDF + svg2pdf. */
(() => {
  'use strict';

  // ---------- constants ----------
  const S = 44, H = S / 2, GRID = 10;
  const COUPLE_DROP = 50;     // couple line sits this far below the lower partner's shape
  const SIB_GAP = 24;         // sibling bar sits this far above the children's shapes
  const GEN_GAP = 170;        // default vertical distance between generations
  const STORE = 'genogram.v1';
  const YEAR = new Date().getFullYear();
  const NS = 'http://www.w3.org/2000/svg';
  const DEFAULT_BG = '#fbfcfd';

  // drawing colours; recomputed from the background so lines stay visible on dark sheets
  let INK = '#1b2433', MUTED = '#556070', SHEET = DEFAULT_BG;

  const DASH = { solid: null, dashed: '8 5', dotted: '2 4', dashdot: '9 4 2 4', long: '14 6', sparse: '1 7' };
  const DASH_LABELS = { solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted', dashdot: 'Dash-dot', long: 'Long dash', sparse: 'Sparse dots' };
  const MARKS = { none: 'No mark', slash: 'One slash', double: 'Two slashes', cross: 'Cross (X)', dot: 'Dot' };
  const PATTERNS = {
    straight: 'Single line', double: 'Double line', triple: 'Triple line', wave: 'Wavy',
    zigzag: 'Zigzag', zigzagline: 'Zigzag + line', cutoff: 'Broken (cut off)', repaired: 'Broken, repaired'
  };
  const ARROWS = { none: 'No arrow', end: 'Arrow to second person', both: 'Arrows both ways' };
  const BG_PATTERNS = { grid: 'Grid', dots: 'Dots', lined: 'Lined', blank: 'Blank' };
  const LINK_GAP = 13;        // spacing between parallel connection lines joining the same two people

  // ethnicity picker; anything else can be typed in and is kept as-is
  const ETHNICITY = {
    'Broad groups': ['American Indian or Alaska Native', 'Asian', 'Black or African American', 'Hispanic or Latino',
      'Middle Eastern or North African', 'Native Hawaiian or Pacific Islander', 'White', 'Multiracial / mixed'],
    'Europe': ['English', 'Irish', 'Scottish', 'Welsh', 'German', 'Dutch', 'French', 'Italian', 'Spanish', 'Portuguese',
      'Polish', 'Ukrainian', 'Russian', 'Greek', 'Scandinavian', 'Eastern European', 'Jewish (Ashkenazi)'],
    'Americas': ['African American', 'Mexican', 'Puerto Rican', 'Cuban', 'Dominican', 'Central American', 'South American',
      'Caribbean', 'Haitian', 'Jamaican', 'Brazilian', 'Canadian', 'French Canadian', 'Appalachian', 'Cherokee', 'Navajo', 'Other Native American'],
    'Africa & Middle East': ['West African', 'East African', 'Nigerian', 'Ethiopian', 'Somali', 'South African',
      'Arab', 'Egyptian', 'Lebanese', 'Iranian / Persian', 'Turkish', 'Kurdish', 'Jewish (Sephardi / Mizrahi)'],
    'Asia & Pacific': ['Chinese', 'Indian', 'Pakistani', 'Bangladeshi', 'Filipino', 'Vietnamese', 'Korean', 'Japanese',
      'Thai', 'Hmong', 'Cambodian', 'Laotian', 'Indonesian', 'Native Hawaiian', 'Samoan', 'Aboriginal Australian', 'Maori'],
    'Other': ['Unknown', 'Prefer not to say']
  };

  // Built-in types. Colours 'ink' / 'muted' follow the background.
  const BUILTIN = {
    couple: [
      { id: 'married',    label: 'Married',         color: 'ink',   dash: 'solid',   mark: 'none',   start: 'm.',    end: 'ended', desc: 'Solid line joining the partners; by convention the male partner is on the left. "m." is the year they married.' },
      { id: 'engaged',    label: 'Engaged',         color: 'ink',   dash: 'dotted',  mark: 'none',   start: 'eng.',  end: 'ended', desc: 'Dotted line. "eng." is the year of engagement.' },
      { id: 'cohabiting', label: 'Living together', color: 'ink',   dash: 'dashed',  mark: 'none',   start: 'since', end: 'ended', desc: 'Dashed line: a committed couple living together without marriage.' },
      { id: 'dating',     label: 'Dating',          color: 'ink',   dash: 'long',    mark: 'none',   start: 'since', end: 'ended', desc: 'Long-dash line: a dating relationship, not living together.' },
      { id: 'separated',  label: 'Separated',       color: 'ink',   dash: 'solid',   mark: 'slash',  start: 'm.',    end: 'sep.',  desc: 'One slash through the couple line. "sep." is the year they separated.' },
      { id: 'divorced',   label: 'Divorced',        color: 'ink',   dash: 'solid',   mark: 'double', start: 'm.',    end: 'div.',  desc: 'Two slashes through the couple line. "div." is the year of divorce.' },
      { id: 'annulled',   label: 'Annulled',        color: 'ink',   dash: 'solid',   mark: 'cross',  start: 'm.',    end: 'ann.',  desc: 'A cross through the couple line: the marriage was annulled.' },
      { id: 'widowed',    label: 'Widowed',         color: 'ink',   dash: 'solid',   mark: 'dot',    start: 'm.',    end: 'wid.',  desc: 'A dot on the couple line: the marriage ended with a partner\'s death (that partner also carries an X).' },
      { id: 'affair',     label: 'Affair / casual', color: 'muted', dash: 'sparse',  mark: 'none',   start: 'since', end: 'ended', desc: 'Faint, sparse dotted line: an affair or short, casual relationship.' }
    ],
    child: [
      { id: 'bio',      label: 'Biological',          color: 'ink',   dash: 'solid',   desc: 'Solid line from the sibling bar down to the child.' },
      { id: 'adopted',  label: 'Adopted',             color: 'ink',   dash: 'dashed',  desc: 'Dashed line: the child was adopted by these parents.' },
      { id: 'foster',   label: 'Foster',              color: 'ink',   dash: 'dotted',  desc: 'Dotted line: a foster child living with these parents.' },
      { id: 'step',     label: 'Step-child',          color: 'ink',   dash: 'dashdot', desc: 'Dash-dot line: the child of one partner, raised by the couple.' },
      { id: 'guardian', label: 'Legal guardianship',  color: 'ink',   dash: 'long',    desc: 'Long-dash line: the adults are the child\'s legal guardians.' },
      { id: 'donor',    label: 'Donor / surrogate',   color: 'muted', dash: 'sparse',  desc: 'Faint, sparse dotted line: conceived through a donor or carried by a surrogate.' }
    ],
    link: [
      { id: 'harmony',      label: 'Harmony',        color: '#2e8b57', pattern: 'straight',   dash: 'solid',   arrow: 'none', desc: 'Single green line: a good, stable relationship.' },
      { id: 'close',        label: 'Close',          color: '#2e8b57', pattern: 'double',     dash: 'solid',   arrow: 'none', desc: 'Two green lines: close and supportive.' },
      { id: 'fused',        label: 'Fused',          color: '#2e8b57', pattern: 'triple',     dash: 'solid',   arrow: 'none', desc: 'Three green lines: overly close or enmeshed; little separation between the two.' },
      { id: 'love',         label: 'Love',           color: '#d6457a', pattern: 'double',     dash: 'solid',   arrow: 'none', desc: 'Two pink lines: romantic love.' },
      { id: 'friends',      label: 'Friendship',     color: '#2e8b57', pattern: 'straight',   dash: 'long',    arrow: 'none', desc: 'Long-dash green line: a friendship outside the family.' },
      { id: 'caregiver',    label: 'Caregiver',      color: '#1d6c75', pattern: 'straight',   dash: 'solid',   arrow: 'end',  desc: 'Teal arrow: the first person cares for the person the arrow points to.' },
      { id: 'focused',      label: 'Focused on',     color: '#3b6fb6', pattern: 'straight',   dash: 'solid',   arrow: 'end',  desc: 'Blue arrow: the first person\'s attention is focused on the other, often anxiously.' },
      { id: 'distant',      label: 'Distant',        color: 'muted',   pattern: 'straight',   dash: 'dotted',  arrow: 'none', desc: 'Dotted grey line: little contact or emotional connection.' },
      { id: 'indifferent',  label: 'Indifferent',    color: 'muted',   pattern: 'straight',   dash: 'dashed',  arrow: 'none', desc: 'Dashed grey line: aware of each other but apathetic.' },
      { id: 'nevermet',     label: 'Never met',      color: 'muted',   pattern: 'straight',   dash: 'sparse',  arrow: 'none', desc: 'Sparse dots: related, but the two have never met.' },
      { id: 'distrust',     label: 'Distrust',       color: '#c0392b', pattern: 'straight',   dash: 'dashdot', arrow: 'none', desc: 'Red dash-dot line: suspicion or lack of trust.' },
      { id: 'conflict',     label: 'Conflict',       color: '#c0392b', pattern: 'zigzag',     dash: 'solid',   arrow: 'none', desc: 'Red zigzag: ongoing discord or conflict.' },
      { id: 'hostile',      label: 'Hostile',        color: '#c0392b', pattern: 'zigzagline', dash: 'solid',   arrow: 'none', desc: 'Red zigzag over a line: hostile and entrenched conflict.' },
      { id: 'manipulative', label: 'Manipulative',   color: '#7d4bb3', pattern: 'wave',       dash: 'solid',   arrow: 'end',  desc: 'Purple wavy arrow: the first person manipulates the other.' },
      { id: 'controlling',  label: 'Controlling',    color: '#7d4bb3', pattern: 'zigzag',     dash: 'solid',   arrow: 'end',  desc: 'Purple zigzag arrow: the first person controls the other.' },
      { id: 'neglect',      label: 'Neglect',        color: '#9a5b1e', pattern: 'straight',   dash: 'dashed',  arrow: 'end',  desc: 'Brown dashed arrow: the first person neglects the other.' },
      { id: 'abuse',        label: 'Abuse',          color: '#8b1a1a', pattern: 'zigzag',     dash: 'solid',   arrow: 'end',  desc: 'Dark red zigzag arrow: the first person abuses the other.' },
      { id: 'violence',     label: 'Violence',       color: '#8b1a1a', pattern: 'zigzagline', dash: 'solid',   arrow: 'both', desc: 'Dark red zigzag over a line, arrows both ways: mutual physical violence.' },
      { id: 'cutoff',       label: 'Cut off',        color: 'ink',     pattern: 'cutoff',     dash: 'solid',   arrow: 'none', desc: 'Broken line with bars: no contact; the relationship has been cut off.' },
      { id: 'repaired',     label: 'Cut off, repaired', color: 'ink',  pattern: 'repaired',   dash: 'solid',   arrow: 'none', desc: 'Broken line bridged again: a cut-off that has since been repaired.' }
    ]
  };
  const CAT = {
    couple: { title: 'Couple relationships', noun: 'relationship type', blank: () => ({ label: 'New relationship', color: '#1b2433', dash: 'dashdot', mark: 'none', desc: '' }) },
    child:  { title: 'Child links', noun: 'child link', blank: () => ({ label: 'New child link', color: '#1b2433', dash: 'dashdot', desc: '' }) },
    link:   { title: 'Connection lines', noun: 'connection type', blank: () => ({ label: 'New connection', color: '#b5651d', pattern: 'straight', dash: 'dashed', arrow: 'none', desc: '' }) }
  };

  // ---------- state ----------
  let state, sel = null, mode = null;
  let history = [], future = [];
  let view = { x: 0, y: 0, k: 1 };
  const pick = { couple: 'married', child: 'bio', link: 'conflict', spec: 'link:conflict', panelSpec: 'couple:married', extraLink: 'close', eth: '' };
  const openRows = new Set();

  const $ = s => document.querySelector(s);
  const svgEl = $('#canvas'), world = $('#world'), panel = $('#panel'), stage = $('#stage');

  const blank = () => ({
    title: 'Untitled genogram', seq: 100,
    canvas: { color: DEFAULT_BG, pattern: 'grid', showEth: true },
    conditions: [],
    custom: { couple: [], child: [], link: [] },
    people: [], unions: [], emotions: []
  });

  function sample() {
    const s = blank();
    s.title = 'Sample family (example data)';
    s.conditions = [
      { id: 'cd1', label: 'Heart disease', color: '#d9534f', desc: 'Diagnosed cardiovascular disease, including heart attack.' },
      { id: 'cd2', label: 'Depression',    color: '#4a7fc1', desc: 'Diagnosed or treated depression.' },
      { id: 'cd3', label: 'Diabetes',      color: '#e0a526', desc: 'Type 1 or type 2 diabetes.' },
      { id: 'cd4', label: 'Substance use', color: '#8a5cb8', desc: 'Alcohol or drug misuse, current or past.' }
    ];
    s.custom.link.push({ id: 't1', label: 'Godparent', color: '#1d6c75', pattern: 'straight', dash: 'dashdot', arrow: 'end', desc: 'Custom type: godparent or chosen-family mentor; the arrow points to the godchild.' });
    const P = (id, name, sex, x, y, o = {}) => s.people.push(Object.assign(
      { id, name, sex, birth: '', death: '', deceased: false, proband: false, cond: [], ethnicity: [], note: '', x, y, parentUnion: null, childType: 'bio' }, o));
    P('p1', 'John', 'M', 300, 100, { birth: 1938, death: 2012, deceased: true, cond: ['cd1', 'cd3'], ethnicity: ['Irish', 'Scottish'], note: 'Heart attack' });
    P('p2', 'Mary', 'F', 420, 100, { birth: 1941, cond: ['cd3'], ethnicity: ['Italian'] });
    P('p3', 'Linda', 'F', 120, 270, { birth: 1967, cond: ['cd2'], ethnicity: ['Mexican'] });
    P('p4', 'Robert', 'M', 240, 270, { birth: 1965, parentUnion: 'u1', cond: ['cd4'] });
    P('p5', 'Susan', 'F', 520, 270, { birth: 1968, parentUnion: 'u1' });
    P('p6', 'Mark', 'M', 640, 270, { birth: 1966, ethnicity: ['African American'] });
    P('p7', 'Emily', 'F', 120, 440, { birth: 1990, proband: true, parentUnion: 'u2', cond: ['cd2'], note: 'Client' });
    P('p8', 'Daniel', 'M', 240, 440, { birth: 1993, parentUnion: 'u2', childType: 'adopted' });
    P('p9', 'Paul', 'M', -40, 440, { birth: 1960, note: 'Godfather' });
    s.unions.push(
      { id: 'u1', a: 'p1', b: 'p2', type: 'married', start: 1962, end: '' },
      { id: 'u2', a: 'p3', b: 'p4', type: 'divorced', start: 1988, end: 1998 },
      { id: 'u3', a: 'p5', b: 'p6', type: 'cohabiting', start: 2004, end: '' }
    );
    s.emotions.push(
      { id: 'e1', a: 'p7', b: 'p8', type: 'close' },
      { id: 'e2', a: 'p3', b: 'p4', type: 'conflict' },
      { id: 'e5', a: 'p3', b: 'p4', type: 'distrust' },
      { id: 'e3', a: 'p4', b: 'p5', type: 'cutoff' },
      { id: 'e4', a: 'p9', b: 'p7', type: 't1' }
    );
    return s;
  }

  // bring older saved files up to the current shape
  function normalize(s) {
    s.custom = s.custom || {};
    for (const k of ['couple', 'child', 'link']) s.custom[k] = s.custom[k] || [];
    s.emotions = s.emotions || [];
    s.canvas = Object.assign({ color: DEFAULT_BG, pattern: 'grid', showEth: true }, s.canvas || {});
    s.seq = Math.max(s.seq || 0, 100);
    if (!s.conditions) {
      const lg = s.legend || [];
      const used = new Set();
      s.people.forEach(p => (p.cond || []).forEach(i => used.add(i)));
      s.conditions = lg.map((c, i) => ({ id: 'c' + i, label: c.label || `Condition ${i + 1}`, color: c.color, desc: '' }))
        .filter((c, i) => lg[i].label || used.has(i));
      delete s.legend;
    }
    const ids = new Set(s.conditions.map(c => c.id));
    s.people.forEach(p => {
      p.cond = (p.cond || []).map(i => typeof i === 'number' ? 'c' + i : i).filter(id => ids.has(id));
      p.ethnicity = Array.isArray(p.ethnicity) ? p.ethnicity : [];
    });
    return s;
  }

  // ---------- lookups ----------
  const P = id => state.people.find(p => p.id === id);
  const U = id => state.unions.find(u => u.id === id);
  const E = id => state.emotions.find(e => e.id === id);
  const unionsOf = pid => state.unions.filter(u => pid && (u.a === pid || u.b === pid));
  const kidsOf = uid => state.people.filter(p => p.parentUnion === uid);
  const uid = pfx => pfx + (++state.seq);
  const nameOf = p => (p && p.name) || 'Unnamed';
  const pairKey = e => (e.a < e.b ? e.a + '|' + e.b : e.b + '|' + e.a);
  const linksBetween = (x, y) => state.emotions.filter(e => (e.a === x && e.b === y) || (e.a === y && e.b === x));
  const typesOf = cat => BUILTIN[cat].concat(state.custom[cat]);
  const typeOf = (cat, id) => typesOf(cat).find(t => t.id === id) || BUILTIN[cat][0];
  const isBuiltin = (cat, id) => BUILTIN[cat].some(t => t.id === id);
  const colorOf = c => (c === 'ink' ? INK : c === 'muted' ? MUTED : c);
  const hexOf = c => (c === 'ink' ? '#1b2433' : c === 'muted' ? '#556070' : c);

  function setPalette(bg) {
    SHEET = bg || DEFAULT_BG;
    const h = SHEET.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const dark = lum < 0.45;
    INK = dark ? '#e9eef3' : '#1b2433';
    MUTED = dark ? '#a6b1bd' : '#556070';
    return dark;
  }

  // ---------- history / persistence ----------
  function commit() {
    history.push(JSON.stringify(state));
    if (history.length > 200) history.shift();
    future = [];
  }
  function undo() {
    if (!history.length) return;
    future.push(JSON.stringify(state));
    state = JSON.parse(history.pop());
    validateSel(); renderAll();
  }
  function redo() {
    if (!future.length) return;
    history.push(JSON.stringify(state));
    state = JSON.parse(future.pop());
    validateSel(); renderAll();
  }
  function validateSel() {
    if (!sel) return;
    const ok = sel.kind === 'person' ? P(sel.id) : sel.kind === 'union' ? U(sel.id) : E(sel.id);
    if (!ok) sel = null;
  }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.people)) return normalize(s); }
    } catch (_) { /* ignore */ }
    return null;
  }

  // ---------- svg helpers ----------
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, o = {}) {
    const t = el('text', {
      x, y, 'text-anchor': o.anchor || 'middle', 'font-size': o.size || 12,
      'font-family': 'Helvetica, Arial, sans-serif', 'font-weight': o.weight || 'normal',
      'font-style': o.style || 'normal', fill: o.fill || INK
    }, parent);
    t.textContent = str;
    return t;
  }
  const textW = (str, size) => String(str).length * size * 0.56;
  function wrap(str, size, maxW) {
    const words = String(str || '').split(/\s+/).filter(Boolean), out = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (textW(next, size) > maxW && line) { out.push(line); line = w; } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  function shapePath(sex, x, y, h) {
    if (sex === 'M') return `M${x - h} ${y - h}h${2 * h}v${2 * h}h${-2 * h}Z`;
    if (sex === 'F') return `M${x - h} ${y}a${h} ${h} 0 1 0 ${2 * h} 0a${h} ${h} 0 1 0 ${-2 * h} 0Z`;
    const d = h * 1.2;
    return `M${x} ${y - d}L${x + d} ${y}L${x} ${y + d}L${x - d} ${y}Z`;
  }
  // slice i of n (clockwise from 12 o'clock) of a person's symbol
  function slicePath(sex, x, y, h, i, n) {
    if (n <= 1) return shapePath(sex, x, y, h);
    const rad = a => a * Math.PI / 180;
    const a0 = -90 + 360 * i / n, a1 = -90 + 360 * (i + 1) / n;
    if (sex === 'F') {
      const p0 = [x + h * Math.cos(rad(a0)), y + h * Math.sin(rad(a0))];
      const p1 = [x + h * Math.cos(rad(a1)), y + h * Math.sin(rad(a1))];
      return `M${x} ${y}L${p0[0]} ${p0[1]}A${h} ${h} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1[0]} ${p1[1]}Z`;
    }
    const d = h * 1.2;
    const edge = a => {
      const c = Math.cos(rad(a)), s = Math.sin(rad(a));
      const t = sex === 'M' ? h / Math.max(Math.abs(c), Math.abs(s)) : d / (Math.abs(c) + Math.abs(s));
      return [x + c * t, y + s * t];
    };
    const corners = sex === 'M' ? [-45, 45, 135, 225] : [-90, 0, 90, 180];
    const pts = [edge(a0)];
    for (const c of corners) if (c > a0 + 1e-6 && c < a1 - 1e-6) pts.push(edge(c));
    pts.push(edge(a1));
    return `M${x} ${y}` + pts.map(p => `L${p[0]} ${p[1]}`).join('') + 'Z';
  }

  function strokeOf(t, w = 2) {
    const o = { stroke: colorOf(t.color), 'stroke-width': w, fill: 'none' };
    if (DASH[t.dash]) o['stroke-dasharray'] = DASH[t.dash];
    return o;
  }
  function drawMark(g, x, y, mark, col) {
    const ln = (x1, y1, x2, y2) => el('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': 2 }, g);
    if (mark === 'slash') ln(x - 5, y + 9, x + 5, y - 9);
    else if (mark === 'double') { ln(x - 8.5, y + 9, x + 1.5, y - 9); ln(x - 1.5, y + 9, x + 8.5, y - 9); }
    else if (mark === 'cross') { ln(x - 7, y - 7, x + 7, y + 7); ln(x - 7, y + 7, x + 7, y - 7); }
    else if (mark === 'dot') el('circle', { cx: x, cy: y, r: 4.5, fill: col, stroke: 'none' }, g);
  }

  // connection line between two points (already trimmed off the shapes)
  function drawLink(g, x1, y1, x2, y2, t) {
    const col = colorOf(t.color);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const base = { stroke: col, 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    if (DASH[t.dash]) base['stroke-dasharray'] = DASH[t.dash];
    const seg = (ax, ay, bx, by, o = 0) => el('line', Object.assign({ x1: ax + nx * o, y1: ay + ny * o, x2: bx + nx * o, y2: by + ny * o }, base), g);
    const zig = () => {
      const n = Math.max(2, Math.floor(len / 8));
      let d = `M${x1} ${y1}`;
      for (let i = 1; i < n; i++) {
        const tt = i / n, s = i % 2 ? 5 : -5;
        d += `L${x1 + dx * tt + nx * s} ${y1 + dy * tt + ny * s}`;
      }
      el('path', Object.assign({ d: d + `L${x2} ${y2}` }, base), g);
    };
    const broken = bridged => {
      const mx = x1 + dx / 2, my = y1 + dy / 2, gap = 5;
      seg(x1, y1, mx - ux * gap, my - uy * gap);
      seg(mx + ux * gap, my + uy * gap, x2, y2);
      for (const s of [-gap, gap]) {
        const cx = mx + ux * s, cy = my + uy * s;
        el('line', Object.assign({}, base, { x1: cx + nx * 8, y1: cy + ny * 8, x2: cx - nx * 8, y2: cy - ny * 8, 'stroke-dasharray': null }), g);
      }
      if (bridged) el('path', Object.assign({}, base, { d: `M${mx - ux * 10} ${my - uy * 10}Q${mx - nx * 12} ${my - ny * 12} ${mx + ux * 10} ${my + uy * 10}`, 'stroke-dasharray': null }), g);
    };
    switch (t.pattern) {
      case 'double': seg(x1, y1, x2, y2, -2.5); seg(x1, y1, x2, y2, 2.5); break;
      case 'triple': seg(x1, y1, x2, y2, -5); seg(x1, y1, x2, y2, 0); seg(x1, y1, x2, y2, 5); break;
      case 'zigzag': zig(); break;
      case 'zigzagline': zig(); seg(x1, y1, x2, y2); break;
      case 'cutoff': broken(false); break;
      case 'repaired': broken(true); break;
      case 'wave': {
        const n = Math.max(2, Math.round(len / 12));
        let d = `M${x1} ${y1}`;
        for (let i = 0; i < n; i++) {
          const tm = (i + 0.5) / n, te = (i + 1) / n, s = i % 2 ? -7 : 7;
          d += `Q${x1 + dx * tm + nx * s} ${y1 + dy * tm + ny * s} ${x1 + dx * te} ${y1 + dy * te}`;
        }
        el('path', Object.assign({ d }, base), g);
        break;
      }
      default: seg(x1, y1, x2, y2);
    }
    const head = (tx, ty, vx, vy) => {
      const bx = tx - vx * 10, by = ty - vy * 10, px = -vy, py = vx;
      el('path', { d: `M${tx} ${ty}L${bx + px * 5} ${by + py * 5}L${bx - px * 5} ${by - py * 5}Z`, fill: col, stroke: 'none' }, g);
    };
    if (t.arrow === 'end' || t.arrow === 'both') head(x2, y2, ux, uy);
    if (t.arrow === 'both') head(x1, y1, -ux, -uy);
  }

  // small 30×20 previews used in the panel, the page-1 key and the guide
  function drawSample(g, cat, t) {
    if (cat === 'couple') {
      el('path', Object.assign({ d: 'M2 4V12H28V4' }, strokeOf(t, 1.8)), g);
      if (t.mark && t.mark !== 'none') {
        const sub = el('g', { transform: 'translate(15 12) scale(0.6)' }, g);
        drawMark(sub, 0, 0, t.mark, colorOf(t.color));
      }
    } else if (cat === 'child') {
      el('path', Object.assign({ d: 'M6 2H24' }, strokeOf({ color: 'ink', dash: 'solid' }, 1.4)), g);
      el('path', Object.assign({ d: 'M15 2V19' }, strokeOf(t, 1.8)), g);
    } else if (cat === 'link') {
      drawLink(g, 2, 10, 28, 10, t);
    } else if (cat === 'cond') {
      el('path', { d: shapePath('M', 15, 10, 8), fill: t.color, stroke: INK, 'stroke-width': 1.4 }, g);
    }
  }

  // ---------- geometry ----------
  function unionGeom(u) {
    if (!u.a) {                                   // sibling group with no parents on the chart
      const kids = kidsOf(u.id);
      if (!kids.length) return null;
      return { hidden: true, mx: kids.reduce((s, k) => s + k.x, 0) / kids.length };
    }
    const a = P(u.a), b = u.b ? P(u.b) : null;
    if (!a) return null;
    if (!b) return { single: true, mx: a.x, y: a.y + H, a };
    const L = a.x <= b.x ? a : b, R = L === a ? b : a;
    return { L, R, mx: (L.x + R.x) / 2, y: Math.max(a.y + coupleDrop(a), b.y + coupleDrop(b)) };
  }
  const clip = (str, n) => (str.length > n ? str.slice(0, n - 1) + '…' : str);
  // the text under a person's symbol: name, years, ethnicity, note
  function personLines(p) {
    const lines = [];
    if (p.name) lines.push({ s: p.name, size: 12, weight: 'bold' });
    const yrs = p.birth && p.death ? `${p.birth} - ${p.death}` : p.birth ? `b. ${p.birth}` : p.death ? `d. ${p.death}` : '';
    if (yrs) lines.push({ s: yrs, size: 11, fill: MUTED });
    if (state.canvas.showEth && (p.ethnicity || []).length) lines.push({ s: clip(p.ethnicity.join(', '), 34), size: 10.5, fill: MUTED });
    if (p.note) lines.push({ s: clip(p.note, 30), size: 10.5, style: 'italic', fill: MUTED });
    return lines;
  }
  // the couple line sits below both partners' labels, leaving room for its own year label
  function coupleDrop(p) {
    const lines = personLines(p);
    const last = (p.sex === 'U' ? 20 : 16) + lines.slice(0, -1).reduce((s, l) => s + l.size + 3, 0);
    return H + Math.max(COUPLE_DROP, lines.length ? last + 19 : 0);
  }
  function unionLabel(u) {
    const t = typeOf('couple', u.type);
    const parts = [];
    if (u.start) parts.push(`${t.start || 'since'} ${u.start}`);
    if (u.end) parts.push(`${t.end || 'ended'} ${u.end}`);
    return parts.join('  ');
  }

  // ---------- diagram ----------
  function drawDiagram(forExport) {
    const root = el('g', {});
    const gEmo = el('g', {}, root), gLines = el('g', {}, root), gPeople = el('g', {}, root);
    const hitStroke = { stroke: '#000', 'stroke-opacity': 0, 'stroke-width': 14, fill: 'none', class: 'hit' };
    const selStroke = { stroke: '#1d9aa8', 'stroke-opacity': 0.35, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

    // several connection types between the same two people sit side by side, each in its own colour
    const pairs = new Map();
    for (const e of state.emotions) {
      const k = pairKey(e);
      if (!pairs.has(k)) pairs.set(k, []);
      pairs.get(k).push(e);
    }
    for (const e of state.emotions) {
      const a = P(e.a), b = P(e.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      if (len < S + 20) continue;
      const t = (H + 8) / len;
      const grp = pairs.get(pairKey(e)), off = (grp.indexOf(e) - (grp.length - 1) / 2) * LINK_GAP;
      const sgn = e.a < e.b ? 1 : -1;               // same side whichever way each line points
      const ox = -dy / len * off * sgn, oy = dx / len * off * sgn;
      const x1 = a.x + dx * t + ox, y1 = a.y + dy * t + oy, x2 = b.x - dx * t + ox, y2 = b.y - dy * t + oy;
      const g = el('g', {}, gEmo);
      if (!forExport && sel && sel.kind === 'emotion' && sel.id === e.id)
        el('line', Object.assign({ x1, y1, x2, y2 }, selStroke, { 'stroke-width': 16 }), g);
      drawLink(g, x1, y1, x2, y2, typeOf('link', e.type));
      if (!forExport) el('line', Object.assign({ x1, y1, x2, y2, 'data-eid': e.id }, hitStroke), g);
    }

    for (const u of state.unions) {
      const geo = unionGeom(u);
      if (!geo) continue;
      const g = el('g', {}, gLines);
      const kids = kidsOf(u.id);
      const ink = { stroke: INK, 'stroke-width': 2, fill: 'none' };
      const isSel = !forExport && sel && sel.kind === 'union' && sel.id === u.id;

      if (!geo.single && !geo.hidden) {
        const t = typeOf('couple', u.type);
        const { L, R, mx, y } = geo;
        const d = `M${L.x} ${L.y + H}V${y}H${R.x}V${R.y + H}`;
        if (isSel) el('path', Object.assign({ d }, selStroke), g);
        el('path', Object.assign({ d }, strokeOf(t)), g);
        const sx = kids.length ? mx - Math.min(20, (R.x - L.x) / 4) : mx;
        drawMark(g, sx, y, t.mark, colorOf(t.color));
        const lab = unionLabel(u);
        if (lab) text(g, mx, y - 8, lab, { size: 10.5, fill: MUTED });
        if (!forExport) el('path', Object.assign({ d, 'data-uid': u.id }, hitStroke), g);
      }

      if (kids.length) {
        const mx = geo.mx;
        const sibY = Math.min(...kids.map(k => k.y)) - H - SIB_GAP;
        const xs = kids.map(k => k.x).concat(geo.hidden ? [] : [mx]);
        const bar = `M${Math.min(...xs)} ${sibY}H${Math.max(...xs)}`;
        if (isSel && (geo.hidden || geo.single)) el('path', Object.assign({ d: bar }, selStroke), g);
        if (!geo.hidden) el('path', Object.assign({ d: `M${mx} ${geo.y}V${sibY}` }, ink), g);
        el('path', Object.assign({ d: bar }, ink), g);
        for (const k of kids)
          el('path', Object.assign({ d: `M${k.x} ${sibY}V${k.y - H}` }, strokeOf(typeOf('child', k.childType))), g);
        if (geo.hidden && kids.length === 1) el('path', Object.assign({ d: `M${mx - 12} ${sibY}H${mx + 12}` }, ink), g);
        if (!forExport && (geo.single || geo.hidden))
          el('path', Object.assign({ d: (geo.single ? `M${mx} ${geo.y}V${sibY}` : '') + bar, 'data-uid': u.id }, hitStroke), g);
      }
    }

    for (const p of state.people) {
      const g = el('g', forExport ? {} : { 'data-pid': p.id, class: 'person-g' }, gPeople);
      const { x, y } = p;
      const lines = personLines(p);

      // backing plates so couple drops pass behind the labels
      let ty = y + H + (p.sex === 'U' ? 20 : 16);
      for (const ln of lines) {
        const w = textW(ln.s, ln.size) + 8;
        el('rect', { x: x - w / 2, y: ty - ln.size, width: w, height: ln.size + 4, fill: SHEET }, g);
        text(g, x, ty, ln.s, ln);
        ty += ln.size + 3;
      }

      if (!forExport && sel && sel.kind === 'person' && sel.id === p.id)
        el('rect', { x: x - H - 9, y: y - H - 9, width: S + 18, height: S + 18, rx: 6, fill: 'none', stroke: '#1d9aa8', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, g);
      if (!forExport && mode && mode.from === p.id)
        el('rect', { x: x - H - 9, y: y - H - 9, width: S + 18, height: S + 18, rx: 6, fill: '#1d9aa8', 'fill-opacity': 0.18, stroke: '#1d9aa8', 'stroke-width': 2 }, g);

      if (p.proband) {
        el('path', { d: shapePath(p.sex, x, y, H + 5), fill: 'none', stroke: INK, 'stroke-width': 1.5 }, g);
        const ax = x - H - 30, ay = y + H + 22, bx = x - H - 8, by = y + H;
        el('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: INK, 'stroke-width': 1.8 }, g);
        el('path', { d: `M${bx} ${by}l-10 2l6 6Z`, fill: INK, stroke: 'none' }, g);
      }
      el('path', { d: shapePath(p.sex, x, y, H), fill: SHEET, stroke: 'none' }, g);
      const conds = (p.cond || []).map(id => state.conditions.find(c => c.id === id)).filter(Boolean);
      conds.forEach((c, i) => el('path', { d: slicePath(p.sex, x, y, H, i, conds.length), fill: c.color, stroke: 'none' }, g));
      el('path', { d: shapePath(p.sex, x, y, H), fill: 'none', stroke: INK, 'stroke-width': 2 }, g);

      const age = p.birth ? (p.death ? p.death - p.birth : (p.deceased ? null : YEAR - p.birth)) : null;
      if (age !== null && age >= 0 && age < 130) {
        if (conds.length) el('circle', { cx: x, cy: y, r: 10, fill: SHEET, stroke: 'none' }, g);
        text(g, x, y + 4.5, String(age), { size: 12.5, weight: 'bold' });
      }
      if (p.deceased) {
        const r = H + 6;
        el('path', { d: `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`, stroke: INK, 'stroke-width': 2 }, g);
      }
      if (!forExport) el('rect', { x: x - H - 4, y: y - H - 4, width: S + 8, height: S + 8, fill: '#000', 'fill-opacity': 0 }, g);
    }
    return root;
  }

  function bounds() {
    if (!state.people.length) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of state.people) {
      const lines = personLines(p);
      const labW = Math.max(0, ...lines.map(l => textW(l.s, l.size))) / 2 + 6;
      const half = Math.max(H + 12, labW) + (p.proband ? 20 : 0);
      minX = Math.min(minX, p.x - half); maxX = Math.max(maxX, p.x + half);
      minY = Math.min(minY, p.y - H - 12);
      maxY = Math.max(maxY, p.y + H + 22 + lines.reduce((s, l) => s + l.size + 3, 0));
    }
    for (const u of state.unions) {
      const g = unionGeom(u);
      if (g && g.L) maxY = Math.max(maxY, g.y + 12);
    }
    return { minX, minY, maxX, maxY };
  }

  // ---------- rendering ----------
  function renderBackground() {
    const dark = setPalette(state.canvas.color);
    stage.style.background = SHEET;
    const line = dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,40,60,0.10)';
    const dot = dark ? 'rgba(255,255,255,0.22)' : 'rgba(20,40,60,0.22)';
    const defs = $('#canvas defs');
    defs.replaceChildren();
    const sw = 1 / Math.max(view.k, 0.4);
    const pat = state.canvas.pattern;
    const size = pat === 'lined' ? 30 : 20;
    const pt = el('pattern', { id: 'bgpat', patternUnits: 'userSpaceOnUse', width: size, height: size,
      patternTransform: `translate(${view.x} ${view.y}) scale(${view.k})` }, defs);
    if (pat === 'grid') el('path', { d: 'M20 0H0V20', fill: 'none', stroke: line, 'stroke-width': sw }, pt);
    else if (pat === 'dots') el('circle', { cx: 1, cy: 1, r: 1.1, fill: dot }, pt);
    else if (pat === 'lined') el('path', { d: 'M0 29.5H30', stroke: line, 'stroke-width': sw }, pt);
    $('#bg').setAttribute('fill', pat === 'blank' ? 'none' : 'url(#bgpat)');
  }
  function renderCanvas() {
    renderBackground();
    world.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
    world.replaceChildren(drawDiagram(false));
    $('#zoomLabel').textContent = Math.round(view.k * 100) + '%';
    $('#btnUndo').disabled = !history.length;
    $('#btnRedo').disabled = !future.length;
    persist();
  }
  function renderAll() {
    $('#docTitle').value = state.title;
    renderLinkSelect();
    renderCanvas();
    renderPanel();
    renderMode();
  }

  // ---------- selects ----------
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function typeOptions(cat, cur) {
    const o = t => `<option value="${esc(t.id)}"${t.id === cur ? ' selected' : ''}>${esc(t.label)}</option>`;
    const custom = state.custom[cat];
    return `<optgroup label="Built-in">${BUILTIN[cat].map(o).join('')}</optgroup>` +
      (custom.length ? `<optgroup label="Custom">${custom.map(o).join('')}</optgroup>` : '');
  }
  const mapOptions = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');

  // link "specs": kind:typeId, always read as <first person> ... <second person>
  function specOptions(cur, first, second) {
    const grp = (label, cat, kind) => `<optgroup label="${esc(label)}">` +
      typesOf(cat).map(t => `<option value="${kind}:${esc(t.id)}"${`${kind}:${t.id}` === cur ? ' selected' : ''}>${esc(t.label)}${isBuiltin(cat, t.id) ? '' : ' (custom)'}</option>`).join('') + '</optgroup>';
    return grp('Connection line', 'link', 'link') +
      grp('Partners', 'couple', 'couple') +
      grp(`${first} is parent of ${second}`, 'child', 'child') +
      grp(`${first} is child of ${second}`, 'child', 'parent') +
      `<optgroup label="Siblings"><option value="sibling"${cur === 'sibling' ? ' selected' : ''}>Siblings (same parents)</option></optgroup>`;
  }
  function specLabel(spec) {
    const [kind, id] = spec.split(':');
    if (kind === 'sibling') return 'siblings';
    if (kind === 'link') return `a "${typeOf('link', id).label}" line`;
    if (kind === 'couple') return `partners (${typeOf('couple', id).label})`;
    if (kind === 'child') return `parent → child (${typeOf('child', id).label})`;
    return `child → parent (${typeOf('child', id).label})`;
  }
  function specValid(spec) {
    const [kind, id] = spec.split(':');
    if (kind === 'sibling') return true;
    const cat = kind === 'link' ? 'link' : kind === 'couple' ? 'couple' : 'child';
    return typesOf(cat).some(t => t.id === id);
  }
  function renderLinkSelect() {
    if (!specValid(pick.spec)) pick.spec = 'link:conflict';
    $('#linkSpec').innerHTML = specOptions(pick.spec, 'First', 'second');
  }

  // ---------- inspector ----------
  let panelKey = null;
  function renderPanel() {
    const key = sel ? sel.kind + ':' + sel.id : '', top = panel.scrollTop;
    if (!sel) panelDoc();
    else if (sel.kind === 'person') panelPerson(P(sel.id));
    else if (sel.kind === 'union') panelUnion(U(sel.id));
    else if (sel.kind === 'emotion') panelEmotion(E(sel.id));
    fillPreviews();
    if (key === panelKey) panel.scrollTop = top;
    panelKey = key;
  }
  function fillPreviews() {
    panel.querySelectorAll('svg[data-prev]').forEach(svg => {
      const [cat, id] = svg.dataset.prev.split(':');
      svg.replaceChildren();
      const t = cat === 'cond' ? state.conditions.find(c => c.id === id) : typeOf(cat, id);
      if (t) drawSample(el('g', {}, svg), cat, t);
    });
  }
  const prev = (cat, id) => `<svg class="prev" viewBox="0 0 30 20" width="36" height="24" data-prev="${cat}:${esc(id)}" aria-hidden="true"></svg>`;

  function usage(cat, id) {
    if (cat === 'cond') return state.people.filter(p => (p.cond || []).includes(id)).length;
    if (cat === 'couple') return state.unions.filter(u => u.a && u.b && u.type === id).length;
    if (cat === 'child') return state.people.filter(p => p.parentUnion && p.childType === id).length;
    return state.emotions.filter(e => e.type === id).length;
  }

  function editRow(cat, t) {
    const key = `${cat}:${t.id}`, f = name => `ty|${cat}|${t.id}|${name}`;
    const n = usage(cat, t.id);
    let extra = '';
    if (cat === 'couple') extra = `<label class="field"><span>Mark on line</span><select id="${f('mark')}">${mapOptions(MARKS, t.mark)}</select></label>`;
    if (cat === 'link') extra = `
      <label class="field"><span>Line shape</span><select id="${f('pattern')}">${mapOptions(PATTERNS, t.pattern)}</select></label>
      <label class="field"><span>Direction</span><select id="${f('arrow')}">${mapOptions(ARROWS, t.arrow)}</select></label>`;
    return `
      <details class="trow" data-row="${key}"${openRows.has(key) ? ' open' : ''}>
        <summary>${prev(cat, t.id)}<span class="tlabel">${esc(t.label)}</span>${n ? `<span class="used" title="Used ${n} times">${n}</span>` : ''}</summary>
        <div class="tbody">
          <label class="field"><span>Name</span><input type="text" id="${f('label')}" value="${esc(t.label)}"></label>
          <div class="row">
            <label class="field" style="flex:none"><span>Colour</span><input type="color" id="${f('color')}" value="${esc(hexOf(t.color))}"></label>
            ${cat !== 'cond' ? `<label class="field"><span>Line style</span><select id="${f('dash')}">${mapOptions(DASH_LABELS, t.dash)}</select></label>` : ''}
          </div>
          ${extra}
          <label class="field"><span>Meaning (shown in the PDF guide)</span><textarea id="${f('desc')}" rows="2" placeholder="What this means">${esc(t.desc)}</textarea></label>
          <button type="button" class="danger small" data-del="${key}">Delete ${cat === 'cond' ? 'condition' : 'type'}</button>
        </div>
      </details>`;
  }
  function builtinRows(cat) {
    const key = `builtin:${cat}`;
    return `<details class="builtins" data-row="${key}"${openRows.has(key) ? ' open' : ''}>
      <summary>Built-in (${BUILTIN[cat].length})</summary>
      ${BUILTIN[cat].map(t => `<div class="trow ro" title="${esc(t.desc)}">${prev(cat, t.id)}<span class="tlabel">${esc(t.label)}</span></div>`).join('')}
    </details>`;
  }

  function panelDoc() {
    const cv = state.canvas;
    const typeSection = cat => `
      <div class="group">
        <h2>${CAT[cat].title}</h2>
        ${state.custom[cat].map(t => editRow(cat, t)).join('')}
        <button type="button" data-add="${cat}">+ Add ${CAT[cat].noun}</button>
        ${builtinRows(cat)}
      </div>`;
    panel.innerHTML = `
      <div class="group">
        <h2>Genogram</h2>
        <p class="stat">${state.people.length} people · ${state.unions.filter(u => u.a && u.b).length} couples · ${state.emotions.length} connections</p>
        <p class="hint">Click a person to edit them and add relatives. Use <b>Link</b> in the toolbar to join any two people. Drag people to arrange them; drag a couple line to move both partners.</p>
      </div>
      <div class="divider"></div>
      <div class="group">
        <h2>Background</h2>
        <div class="row">
          <label class="field" style="flex:none"><span>Colour</span><input type="color" id="cv_color" value="${esc(cv.color)}"></label>
          <div class="field"><span>Pattern</span>
            <div class="seg">${Object.entries(BG_PATTERNS).map(([k, l]) => `<button type="button" data-pattern="${k}" aria-pressed="${cv.pattern === k}">${l}</button>`).join('')}</div>
          </div>
        </div>
        <div class="swatches">${['#fbfcfd', '#ffffff', '#f6f1e4', '#eaf2ec', '#e8eef7', '#1d2530', '#0f1115'].map(c => `<button type="button" class="sw" data-bg="${c}" style="background:${c}" aria-label="Background ${c}"></button>`).join('')}</div>
        <p class="hint">The colour also goes into the PDF. The pattern is only a drawing aid on screen.</p>
        <label class="check"><input type="checkbox" id="cv_showEth"${cv.showEth ? ' checked' : ''}>Show ethnicity under names</label>
      </div>
      <div class="divider"></div>
      <div class="group">
        <h2>Conditions</h2>
        <p class="hint">Conditions shade a person's symbol. Several conditions split the symbol into equal slices.</p>
        ${state.conditions.map(c => editRow('cond', c)).join('')}
        <button type="button" data-add="cond">+ Add condition</button>
      </div>
      <div class="divider"></div>
      ${typeSection('couple')}
      ${typeSection('child')}
      ${typeSection('link')}
      <div class="divider"></div>
      <div class="group">
        <h2>Keyboard</h2>
        <dl class="keys">
          <dt>A</dt><dd>Add a person</dd>
          <dt>L</dt><dd>Link two people</dd>
          <dt>M / F / U</dt><dd>Set sex of selected person</dd>
          <dt>P / C / R / S</dt><dd>Add partner / child / parents / sibling</dd>
          <dt>X</dt><dd>Add ex-partner</dd>
          <dt>Del</dt><dd>Delete selection</dd>
          <dt>Esc</dt><dd>Cancel or deselect</dd>
          <dt>Ctrl+Z</dt><dd>Undo (Ctrl+Shift+Z redo)</dd>
          <dt>0</dt><dd>Fit to screen</dd>
        </dl>
      </div>`;
  }

  function panelPerson(p) {
    const us = unionsOf(p.id);
    const condChecks = state.conditions.map(c => `
      <label class="check"><input type="checkbox" id="pc|${esc(c.id)}"${(p.cond || []).includes(c.id) ? ' checked' : ''}>
        <span class="swatch" style="background:${esc(c.color)}"></span>${esc(c.label)}</label>`).join('');
    const unionPick = us.length > 1 ? `
      <label class="field"><span>New children belong to</span>
        <select id="p_union">${us.map(u => `<option value="${u.id}">${esc(nameOf(P(u.a)))}${u.b ? ' & ' + esc(nameOf(P(u.b))) : ' (single parent)'}</option>`).join('')}</select>
      </label>` : '';
    if (!specValid(pick.panelSpec)) pick.panelSpec = 'couple:married';

    panel.innerHTML = `
      <div class="group">
        <h2>Person</h2>
        <label class="field"><span>Name</span><input type="text" id="p_name" value="${esc(p.name)}" placeholder="Name"></label>
        <div class="field"><span>Sex</span>
          <div class="seg">
            ${[['M', 'Male'], ['F', 'Female'], ['U', 'Unknown']].map(([k, l]) => `<button type="button" data-sex="${k}" aria-pressed="${p.sex === k}">${l}</button>`).join('')}
          </div></div>
        <div class="row">
          <label class="field"><span>Born</span><input type="number" id="p_birth" value="${esc(p.birth)}" placeholder="Year"></label>
          <label class="field"><span>Died</span><input type="number" id="p_death" value="${esc(p.death)}" placeholder="Year"></label>
        </div>
        <label class="check"><input type="checkbox" id="p_deceased"${p.deceased ? ' checked' : ''}>Deceased</label>
        <label class="check"><input type="checkbox" id="p_proband"${p.proband ? ' checked' : ''}>Index person (client)</label>
        <label class="field"><span>Note</span><textarea id="p_note" placeholder="Occupation, diagnosis, role…">${esc(p.note)}</textarea></label>
      </div>
      ${connectionsSection(p)}
      <div class="divider"></div>
      <div class="group">
        <h2>Conditions</h2>
        ${condChecks || '<p class="hint">No conditions yet. Add one below.</p>'}
        <div class="row add-cond">
          <input type="text" id="p_newcond" placeholder="New condition">
          <input type="color" id="p_newcolor" value="#3aa17e" aria-label="Colour for the new condition">
          <button type="button" id="act_newcond">Add</button>
        </div>
      </div>
      <div class="group">
        <h2>Ethnicity</h2>
        ${(p.ethnicity || []).length ? `<div class="chips">${p.ethnicity.map((x, i) => `<span class="chip">${esc(x)}<button type="button" data-eth-del="${i}" aria-label="Remove ${esc(x)}">×</button></span>`).join('')}</div>`
          : '<p class="hint">None chosen. Pick one or more below, or type your own.</p>'}
        <select id="p_eth" aria-label="Add an ethnicity">${ethOptions(p)}</select>
        <div class="row add-cond">
          <input type="text" id="p_neweth" placeholder="Or type your own">
          <button type="button" id="act_neweth">Add</button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="group">
        <h2>Add new relative</h2>
        <label class="field"><span>Partner relationship</span><select id="pk_couple">${typeOptions('couple', pick.couple)}</select></label>
        <label class="field"><span>Child link</span><select id="pk_child">${typeOptions('child', pick.child)}</select></label>
        <div class="actions">
          <button type="button" id="act_partner">+ Partner</button>
          <button type="button" id="act_child">+ Child</button>
          <button type="button" id="act_parents">+ Parents</button>
          <button type="button" id="act_sibling">+ Sibling</button>
          <button type="button" id="act_ex" title="Adds a former partner with a Divorced line">+ Ex-partner</button>
          <button type="button" id="act_adopted" title="Adds a child with an Adopted (dashed) line">+ Adopted child</button>
        </div>
        ${unionPick}
        <label class="field"><span>Other relative, joined by</span><select id="pk_link">${typeOptions('link', pick.link)}</select></label>
        <button type="button" id="act_related">+ Related person</button>
      </div>
      <div class="group">
        <h2>Link to someone on the chart</h2>
        <select id="pk_spec" aria-label="Link type">${specOptions(pick.panelSpec, 'This person', 'the one you click')}</select>
        <button type="button" id="act_link">Link to… (then click them)</button>
      </div>
      <div class="divider"></div>
      <button type="button" class="danger" id="act_delete">Delete person</button>`;
  }

  // everything joined to this person, each editable in place
  function connectionsSection(p) {
    const name = q => `<button type="button" class="cx-name" data-goto="${esc(q.id)}" title="Go to ${esc(nameOf(q))}">${esc(nameOf(q))}</button>`;
    const del = (key, title) => `<button type="button" class="cx-x" data-cxdel="${key}" title="${esc(title)}" aria-label="${esc(title)}">×</button>`;
    const head = (q, rel, delBtn) => `<div class="cx-head">${name(q)}<span class="cx-rel">${esc(rel)}</span>${delBtn || ''}</div>`;
    const blocks = [];
    const sub = (title, items) => { if (items.length) blocks.push(`<div class="cx-sub">${title}</div>` + items.join('')); };

    sub('Partners', partnersOf(p.id).map(({ u, p: q }) => `
      <div class="cx">
        ${head(q, partnerTerm(u, q), del('u|' + u.id, `Remove ${nameOf(q)} as partner`))}
        <select id="cx|u|${esc(u.id)}|type" aria-label="Relationship with ${esc(nameOf(q))}">${typeOptions('couple', u.type)}</select>
        <div class="row">
          <input type="number" id="cx|u|${esc(u.id)}|start" value="${esc(u.start)}" placeholder="Started" aria-label="Year started">
          <input type="number" id="cx|u|${esc(u.id)}|end" value="${esc(u.end)}" placeholder="Ended" aria-label="Year ended">
        </div>
      </div>`));

    const pu = p.parentUnion && U(p.parentUnion);
    if (pu && pu.a) {
      const pars = parentsOf(p);
      blocks.push(`<div class="cx-sub">Parents</div>
        <div class="cx">
          ${pars.map(q => `<div class="cx-head">${name(q)}<span class="cx-rel">${esc(parentWord(p, q))}</span></div>`).join('')}
          <label class="field"><span>How ${esc(nameOf(p))} joined this family</span><select id="p_ctype">${typeOptions('child', p.childType || 'bio')}</select></label>
          <button id="act_detach" type="button" class="small">Detach from parents</button>
        </div>`);
    }

    sub('Children', childrenOf(p.id).sort(byChart).map(k => `
      <div class="cx">
        ${head(k, childWord(k), del('k|' + k.id, `Detach ${nameOf(k)} from their parents`))}
        <select id="cx|k|${esc(k.id)}|childType" aria-label="Child link for ${esc(nameOf(k))}">${typeOptions('child', k.childType || 'bio')}</select>
      </div>`));

    const sibs = pu ? state.people.filter(q => q !== p && parentNodes(q).some(x => parentNodes(p).includes(x))).sort(byChart) : [];
    if (sibs.length) {
      ancMemo = new Map();
      try {
        blocks.push(`<div class="cx-sub">Siblings</div><div class="cx">${sibs.map(q => head(q, relation(p, q).text)).join('')}
          ${pu.a ? '' : '<button id="act_detach" type="button" class="small">Leave this sibling group</button>'}</div>`);
      } finally { ancMemo = null; }
    }

    sub('Connection lines', state.emotions.filter(e => (e.a === p.id || e.b === p.id) && P(e.a) && P(e.b)).map(e => {
      const q = P(e.a === p.id ? e.b : e.a), t = typeOf('link', e.type);
      const dir = t.arrow === 'end' ? (e.a === p.id ? `toward ${nameOf(q)}` : `from ${nameOf(q)}`) : t.arrow === 'both' ? 'both ways' : '';
      return `
      <div class="cx">
        <div class="cx-head">${prev('link', e.type)}${name(q)}<span class="cx-rel">${esc(dir)}</span>${del('e|' + e.id, `Delete the ${t.label} line`)}</div>
        <div class="row">
          <select id="cx|e|${esc(e.id)}|type" aria-label="Line type with ${esc(nameOf(q))}">${typeOptions('link', e.type)}</select>
          ${t.arrow === 'end' ? `<button type="button" class="small cx-flip" data-cxflip="${esc(e.id)}" title="Point the arrow the other way">Reverse</button>` : ''}
        </div>
      </div>`;
    }));

    const n = partnersOf(p.id).length + parentsOf(p).length + childrenOf(p.id).length + sibs.length +
      state.emotions.filter(e => e.a === p.id || e.b === p.id).length;
    return `<div class="group cx-group">
      <h2>Connections${n ? ` (${n})` : ''}</h2>
      ${blocks.length ? blocks.join('') : '<p class="hint">No one is connected to this person yet. Use "Add new relative" or "Link to someone on the chart" below.</p>'}
    </div>`;
  }

  function ethOptions(p) {
    const have = new Set(p.ethnicity || []);
    const preset = new Set(Object.values(ETHNICITY).flat());
    const onChart = [...new Set(state.people.flatMap(q => q.ethnicity || []))].filter(x => !preset.has(x) && !have.has(x)).sort();
    const grp = (label, list) => {
      const items = list.filter(x => !have.has(x));
      return items.length ? `<optgroup label="${esc(label)}">${items.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('')}</optgroup>` : '';
    };
    return '<option value="">Choose to add…</option>' + grp('Already on this chart', onChart) +
      Object.entries(ETHNICITY).map(([k, v]) => grp(k, v)).join('');
  }
  function addEthnicity(p, value) {
    const v = String(value || '').trim();
    if (!v) return false;
    if ((p.ethnicity || []).some(x => x.toLowerCase() === v.toLowerCase())) { toast(`${v} is already listed.`); return false; }
    commit();
    p.ethnicity = (p.ethnicity || []).concat(v);
    return true;
  }

  function panelUnion(u) {
    const kids = kidsOf(u.id);
    if (!u.a) {
      panel.innerHTML = `
        <div class="group">
          <h2>Sibling group</h2>
          <h3>${kids.map(k => esc(nameOf(k))).join(', ')}</h3>
          <p class="hint">Siblings whose parents aren't on the chart. You can add parents any time.</p>
        </div>
        <div class="actions">
          <button type="button" id="u_sib">+ Sibling</button>
          <button type="button" id="u_parents">+ Parents</button>
        </div>
        <div class="divider"></div>
        <button type="button" class="danger" id="u_delete">Ungroup siblings</button>`;
      return;
    }
    const a = P(u.a), b = u.b ? P(u.b) : null;
    panel.innerHTML = `
      <div class="group">
        <h2>${b ? 'Couple' : 'Single parent'}</h2>
        <h3>${esc(nameOf(a))}${b ? ' & ' + esc(nameOf(b)) : ''}</h3>
        ${b ? `<label class="field"><span>Relationship</span><select id="u_type">${typeOptions('couple', u.type)}</select></label>
        <div class="row">
          <label class="field"><span>Started</span><input type="number" id="u_start" value="${esc(u.start)}" placeholder="Year"></label>
          <label class="field"><span>Ended</span><input type="number" id="u_end" value="${esc(u.end)}" placeholder="Year"></label>
        </div>` : '<p class="hint">Children drawn from one parent. Add a second parent to turn this into a couple.</p>'}
        <p class="stat">${kids.length} ${kids.length === 1 ? 'child' : 'children'}</p>
      </div>
      <div class="actions">
        <button type="button" id="u_child">+ Child</button>
        <button type="button" id="u_adopted">+ Adopted child</button>
        ${b ? '<button type="button" id="u_swap">Swap sides</button>' : '<button type="button" id="u_second">+ Second parent</button>'}
      </div>
      <div class="divider"></div>
      <button type="button" class="danger" id="u_delete">Delete relationship</button>`;
  }

  function panelEmotion(e) {
    const t = typeOf('link', e.type);
    const all = linksBetween(e.a, e.b);
    const others = all.filter(x => x !== e);
    const free = typesOf('link').find(x => !all.some(y => y.type === x.id));
    if (!free || all.some(y => y.type === pick.extraLink)) pick.extraLink = free ? free.id : e.type;
    panel.innerHTML = `
      <div class="group">
        <h2>Connection</h2>
        <h3>${esc(nameOf(P(e.a)))} → ${esc(nameOf(P(e.b)))}</h3>
        <label class="field"><span>Type</span><select id="e_type">${typeOptions('link', e.type)}</select></label>
        <p class="hint">${esc(t.desc)}</p>
        <button type="button" id="e_flip" class="small">Reverse direction</button>
      </div>
      <div class="divider"></div>
      <div class="group">
        <h2>All lines between these two</h2>
        <p class="hint">Each connection type gets its own line, drawn side by side in its own colour.</p>
        ${others.length ? others.map(x => `<button type="button" class="trow ro pickrow" data-eid="${esc(x.id)}">${prev('link', x.type)}<span class="tlabel">${esc(typeOf('link', x.type).label)}</span></button>`).join('') : ''}
        <div class="row add-cond">
          <select id="e_extra" aria-label="Another connection type">${typeOptions('link', pick.extraLink)}</select>
          <button type="button" id="e_add">+ Add</button>
        </div>
      </div>
      <div class="divider"></div>
      <button type="button" class="danger" id="e_delete">Delete line</button>`;
  }

  // ---------- inspector events ----------
  let editArmed = false;
  const TEXTY = 'input[type="text"], input[type="number"], input[type="color"], textarea';
  panel.addEventListener('focusin', e => {
    if (e.target.matches(TEXTY) && !editArmed && !e.target.id.startsWith('p_new')) { commit(); editArmed = true; }
  });
  panel.addEventListener('focusout', () => { editArmed = false; });
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const go = { p_neweth: 'act_neweth', p_newcond: 'act_newcond' }[e.target.id];
    if (go) { e.preventDefault(); $('#' + go).click(); }
  });
  panel.addEventListener('toggle', e => {
    const d = e.target;
    if (d.dataset && d.dataset.row) d.open ? openRows.add(d.dataset.row) : openRows.delete(d.dataset.row);
  }, true);

  const yearVal = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : ''; };

  function rowTarget(id) {
    const [, cat, tid, field] = id.split('|');
    const obj = cat === 'cond' ? state.conditions.find(c => c.id === tid) : state.custom[cat].find(t => t.id === tid);
    return { cat, tid, field, obj };
  }
  function refreshRow(cat, tid) {
    const row = panel.querySelector(`[data-row="${cat}:${tid}"]`);
    if (!row) return;
    const t = cat === 'cond' ? state.conditions.find(c => c.id === tid) : typeOf(cat, tid);
    row.querySelector('.tlabel').textContent = t.label;
    const svg = row.querySelector('svg[data-prev]');
    svg.replaceChildren(); drawSample(el('g', {}, svg), cat, t);
  }

  panel.addEventListener('input', e => {
    const t = e.target, id = t.id;
    if (!t.matches(TEXTY) || id.startsWith('p_new')) return;
    const p = sel && sel.kind === 'person' ? P(sel.id) : null;
    const u = sel && sel.kind === 'union' ? U(sel.id) : null;
    if (id.startsWith('ty|')) {
      const r = rowTarget(id);
      if (!r.obj) return;
      r.obj[r.field] = t.value;
      refreshRow(r.cat, r.tid);
      renderLinkSelect();
    }
    else if (id.startsWith('cx|u|')) {
      const [, , cid, field] = id.split('|'), cu = U(cid);
      if (!cu) return;
      cu[field] = yearVal(t.value);
    }
    else if (id === 'cv_color') state.canvas.color = t.value;
    else if (p && id === 'p_name') p.name = t.value;
    else if (p && id === 'p_birth') p.birth = yearVal(t.value);
    else if (p && id === 'p_death') {
      p.death = yearVal(t.value);
      if (p.death && !p.deceased) { p.deceased = true; const c = $('#p_deceased'); if (c) c.checked = true; }
    }
    else if (p && id === 'p_note') p.note = t.value;
    else if (u && id === 'u_start') u.start = yearVal(t.value);
    else if (u && id === 'u_end') u.end = yearVal(t.value);
    else return;
    renderCanvas();
  });

  panel.addEventListener('change', e => {
    const t = e.target, id = t.id;
    if (t.matches(TEXTY)) return;
    const p = sel && sel.kind === 'person' ? P(sel.id) : null;
    if (id === 'pk_couple') { pick.couple = t.value; return; }
    if (id === 'pk_child') { pick.child = t.value; return; }
    if (id === 'pk_link') { pick.link = t.value; return; }
    if (id === 'pk_spec') { pick.panelSpec = t.value; return; }
    if (id === 'e_extra') { pick.extraLink = t.value; return; }
    if (id === 'p_union') return;
    if (id === 'p_eth') { if (p && addEthnicity(p, t.value)) renderAll(); return; }
    commit();
    if (id.startsWith('ty|')) {
      const r = rowTarget(id);
      if (r.obj) { r.obj[r.field] = t.value; refreshRow(r.cat, r.tid); }
    }
    else if (id.startsWith('cx|')) {
      const [, kind, cid, field] = id.split('|');
      const obj = kind === 'u' ? U(cid) : kind === 'k' ? P(cid) : E(cid);
      if (obj) obj[field] = t.value;
      renderCanvas(); renderPanel(); return;
    }
    else if (id === 'cv_showEth') state.canvas.showEth = t.checked;
    else if (p && id === 'p_deceased') p.deceased = t.checked;
    else if (p && id === 'p_proband') {
      if (t.checked) state.people.forEach(o => { o.proband = false; });
      p.proband = t.checked;
    }
    else if (p && id.startsWith('pc|')) {
      const cid = id.slice(3), set = new Set(p.cond || []);
      t.checked ? set.add(cid) : set.delete(cid);
      p.cond = state.conditions.map(c => c.id).filter(c => set.has(c));
    }
    else if (p && id === 'p_ctype') { p.childType = t.value; renderCanvas(); renderPanel(); return; }
    else if (id === 'u_type') U(sel.id).type = t.value;
    else if (id === 'e_type') { E(sel.id).type = t.value; renderCanvas(); renderPanel(); return; }
    renderCanvas();
  });

  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const p = sel && sel.kind === 'person' ? P(sel.id) : null;
    if (b.dataset.sex && p) { setSex(p, b.dataset.sex); return; }
    if (b.dataset.pattern) { commit(); state.canvas.pattern = b.dataset.pattern; renderAll(); return; }
    if (b.dataset.bg) { commit(); state.canvas.color = b.dataset.bg; renderAll(); return; }
    if (b.dataset.add) { addType(b.dataset.add); return; }
    if (b.dataset.del) { deleteType(...b.dataset.del.split(':')); return; }
    if (b.dataset.eid) { sel = { kind: 'emotion', id: b.dataset.eid }; renderAll(); return; }
    if (b.dataset.goto) { sel = { kind: 'person', id: b.dataset.goto }; renderAll(); panel.scrollTop = 0; return; }
    if (b.dataset.cxflip) { commit(); const x = E(b.dataset.cxflip); if (x) [x.a, x.b] = [x.b, x.a]; renderAll(); return; }
    if (b.dataset.cxdel && p) { removeConnection(p, ...b.dataset.cxdel.split('|')); renderAll(); return; }
    if (b.dataset.ethDel && p) { commit(); p.ethnicity.splice(+b.dataset.ethDel, 1); renderAll(); return; }
    switch (b.id) {
      case 'act_partner': addPartner(p); break;
      case 'act_child': addChild(p, $('#p_union') ? $('#p_union').value : null); break;
      case 'act_parents': addParents(p); break;
      case 'act_sibling': addSibling(p); break;
      case 'act_ex': addPartner(p, 'divorced', true); break;
      case 'act_adopted': addChild(p, $('#p_union') ? $('#p_union').value : null, 'adopted'); break;
      case 'act_related': addRelated(p); break;
      case 'act_link': startLink(p.id, pick.panelSpec); return;
      case 'act_newcond': {
        const label = $('#p_newcond').value.trim();
        if (!label) { toast('Type a name for the condition first.'); $('#p_newcond').focus(); return; }
        commit();
        const c = { id: uid('cd'), label, color: $('#p_newcolor').value, desc: '' };
        state.conditions.push(c);
        p.cond = (p.cond || []).concat(c.id);
        break;
      }
      case 'act_neweth': {
        const inp = $('#p_neweth');
        if (!inp.value.trim()) { toast('Type an ethnicity first.'); inp.focus(); return; }
        if (!addEthnicity(p, inp.value)) return;
        break;
      }
      case 'act_detach': commit(); cleanupUnion(p.parentUnion, p.id); break;
      case 'act_delete': deletePerson(p.id); break;
      case 'u_child':
      case 'u_sib': { const u = U(sel.id); commit(); placeChild(u, 'U'); break; }
      case 'u_adopted': { const u = U(sel.id); commit(); placeChild(u, 'U', 'adopted'); break; }
      case 'u_parents': { const k = kidsOf(sel.id)[0]; if (k) addParents(k); break; }
      case 'u_swap': {
        commit(); const u = U(sel.id), a = P(u.a), bb = P(u.b);
        [a.x, bb.x] = [bb.x, a.x]; [a.y, bb.y] = [bb.y, a.y];
        renderCanvas(); return;
      }
      case 'u_second': { const u = U(sel.id); addPartner(P(u.a)); break; }
      case 'u_delete': deleteUnion(sel.id); break;
      case 'e_flip': { commit(); const x = E(sel.id); [x.a, x.b] = [x.b, x.a]; break; }
      case 'e_add': {
        const x = E(sel.id), type = $('#e_extra').value;
        const dup = linksBetween(x.a, x.b).find(y => y.type === type);
        if (dup) { sel = { kind: 'emotion', id: dup.id }; toast('They already have that line.'); break; }
        commit();
        const n = { id: uid('e'), a: x.a, b: x.b, type };
        state.emotions.push(n);
        sel = { kind: 'emotion', id: n.id };
        break;
      }
      case 'e_delete': commit(); state.emotions = state.emotions.filter(x => x.id !== sel.id); sel = null; break;
      default: return;
    }
    renderAll();
  });

  function removeConnection(p, kind, id) {
    commit();
    if (kind === 'e') { state.emotions = state.emotions.filter(e => e.id !== id); return; }
    if (kind === 'k') { const k = P(id); if (k) cleanupUnion(k.parentUnion, k.id); return; }
    const u = U(id);
    if (!u) return;
    if (!kidsOf(u.id).length) { state.unions = state.unions.filter(x => x !== u); return; }
    // with children, keep them attached to this person as a single parent
    const other = u.a === p.id ? u.b : u.a;
    u.a = p.id; u.b = null;
    toast(`${nameOf(P(other))} is no longer a partner. The children stay with ${nameOf(p)}.`);
  }

  function addType(cat) {
    commit();
    let t;
    if (cat === 'cond') {
      const palette = ['#3aa17e', '#d9534f', '#4a7fc1', '#e0a526', '#8a5cb8', '#e07b39', '#2b9bb3', '#b54f8f'];
      t = { id: uid('cd'), label: `Condition ${state.conditions.length + 1}`, color: palette[state.conditions.length % palette.length], desc: '' };
      state.conditions.push(t);
    } else {
      t = Object.assign({ id: uid('t') }, CAT[cat].blank());
      state.custom[cat].push(t);
    }
    openRows.add(`${cat}:${t.id}`);
    renderAll();
    const inp = document.getElementById(`ty|${cat}|${t.id}|label`);
    if (inp) { inp.focus(); inp.select(); }
  }
  function deleteType(cat, id) {
    commit();
    const n = usage(cat, id);
    if (cat === 'cond') {
      state.conditions = state.conditions.filter(c => c.id !== id);
      state.people.forEach(p => { p.cond = (p.cond || []).filter(c => c !== id); });
    } else {
      state.custom[cat] = state.custom[cat].filter(t => t.id !== id);
      const fb = BUILTIN[cat][0].id;
      if (cat === 'couple') state.unions.forEach(u => { if (u.type === id) u.type = fb; });
      if (cat === 'child') state.people.forEach(p => { if (p.childType === id) p.childType = fb; });
      if (cat === 'link') state.emotions.forEach(e => { if (e.type === id) e.type = fb; });
    }
    if (n) toast(cat === 'cond' ? `Removed from ${n} ${n === 1 ? 'person' : 'people'}.` : `${n} line${n === 1 ? '' : 's'} switched to "${BUILTIN[cat][0].label}".`);
    renderAll();
  }

  // ---------- editing operations ----------
  function newPerson(o) {
    const dir = o.dir || 1;
    const p = Object.assign({ id: uid('p'), name: '', sex: 'U', birth: '', death: '', deceased: false, proband: false, cond: [], ethnicity: [], note: '', x: 0, y: 0, parentUnion: null, childType: 'bio' }, o);
    delete p.dir;
    const spot = freeSpot(p.x, p.y, dir);
    p.x = spot.x; p.y = spot.y;
    state.people.push(p);
    return p;
  }
  function freeSpot(x, y, dir = 1) {
    x = Math.round(x / GRID) * GRID; y = Math.round(y / GRID) * GRID;
    for (let i = 0; i < 60; i++) {
      if (!state.people.some(o => Math.abs(o.x - x) < 90 && Math.abs(o.y - y) < 70)) break;
      x += 110 * dir;
    }
    return { x, y };
  }
  const opposite = s => (s === 'M' ? 'F' : s === 'F' ? 'M' : 'U');
  function selectPerson(p) { sel = { kind: 'person', id: p.id }; }
  function setSex(p, s) { commit(); p.sex = s; renderAll(); }

  function addPerson() {
    commit();
    const r = stage.getBoundingClientRect();
    const p = newPerson({ x: (r.width / 2 - view.x) / view.k, y: (r.height / 2 - view.y) / view.k });
    selectPerson(p); renderAll();
  }

  // ex-partners go on the opposite side from the usual partner slot, so current and former spouses don't collide
  function addPartner(p, type, ex) {
    if (!p) return;
    commit();
    type = type || pick.couple;
    const single = ex ? null : unionsOf(p.id).find(u => !u.b);
    const dir = (p.sex === 'F' ? -1 : 1) * (ex ? -1 : 1);
    const q = newPerson({ sex: opposite(p.sex), x: p.x + 120 * dir, y: p.y, dir });
    if (single) { single.b = q.id; single.type = type; }
    else state.unions.push({ id: uid('u'), a: p.id, b: q.id, type, start: '', end: '' });
    selectPerson(q);
  }

  function ensureUnionFor(p, unionId) {
    if (unionId && U(unionId)) return U(unionId);
    const us = unionsOf(p.id);
    if (us.length) return us[0];
    const u = { id: uid('u'), a: p.id, b: null, type: pick.couple, start: '', end: '' };
    state.unions.push(u);
    return u;
  }

  function addChild(p, unionId, childType) {
    if (!p) return;
    commit();
    placeChild(ensureUnionFor(p, unionId), 'U', childType);
  }
  function placeChild(u, sex = 'U', childType) {
    const g = unionGeom(u), kids = kidsOf(u.id);
    let x, y;
    if (kids.length) { x = Math.max(...kids.map(k => k.x)) + 110; y = kids[0].y; }
    else {
      const parents = [P(u.a), u.b && P(u.b)].filter(Boolean);
      x = g.mx; y = Math.max(...parents.map(q => q.y)) + GEN_GAP;
    }
    const c = newPerson({ sex, x, y, parentUnion: u.id, childType: childType || pick.child });
    selectPerson(c);
    return c;
  }

  function addParents(p) {
    if (!p) return;
    const u = p.parentUnion && U(p.parentUnion);
    if (u && u.a && !u.b) { addPartner(P(u.a)); return; }
    if (u && u.a) { toast(`${nameOf(p)} already has two parents on the chart.`); return; }
    commit();
    const kids = u ? kidsOf(u.id) : [p];
    const mx = kids.reduce((s, k) => s + k.x, 0) / kids.length;
    const top = Math.min(...kids.map(k => k.y));
    const f = newPerson({ sex: 'M', x: mx - 60, y: top - GEN_GAP, dir: -1 });
    const m = newPerson({ sex: 'F', x: f.x + 120, y: f.y });
    if (u) { u.a = f.id; u.b = m.id; u.type = pick.couple; }     // fill an existing sibling group
    else {
      const nu = { id: uid('u'), a: f.id, b: m.id, type: pick.couple, start: '', end: '' };
      state.unions.push(nu);
      p.parentUnion = nu.id;
    }
    selectPerson(f);
  }

  // siblings share a parent group; with no parents on the chart it's a parentless group (bar only)
  function addSibling(p) {
    if (!p) return;
    commit();
    let u = p.parentUnion && U(p.parentUnion);
    if (!u) {
      u = { id: uid('u'), a: null, b: null, type: pick.couple, start: '', end: '' };
      state.unions.push(u);
      p.parentUnion = u.id;
    }
    placeChild(u);
  }

  function addRelated(p) {
    if (!p) return;
    commit();
    const t = typeOf('link', pick.link);
    const q = newPerson({ x: p.x + 150, y: p.y, note: t.label });
    state.emotions.push({ id: uid('e'), a: p.id, b: q.id, type: t.id });
    selectPerson(q);
  }

  // drop a union that no longer draws anything meaningful
  function pruneUnion(u) {
    if (!u) return;
    const kids = kidsOf(u.id);
    if ((!u.a && kids.length < 2) || (u.a && !u.b && !kids.length)) {
      kids.forEach(k => { k.parentUnion = null; });
      state.unions = state.unions.filter(x => x !== u);
    }
  }
  function cleanupUnion(unionId, pid) {
    const c = P(pid);
    if (c) c.parentUnion = null;
    pruneUnion(U(unionId));
  }

  function deletePerson(id) {
    commit();
    state.emotions = state.emotions.filter(e => e.a !== id && e.b !== id);
    const me = P(id);
    if (me) me.parentUnion = null;
    for (const u of state.unions) {
      if (u.a === id) { u.a = u.b; u.b = null; }
      else if (u.b === id) u.b = null;
    }
    state.people = state.people.filter(p => p.id !== id);
    [...state.unions].forEach(pruneUnion);
    sel = null;
  }
  function deleteUnion(id) {
    commit();
    state.people.forEach(k => { if (k.parentUnion === id) k.parentUnion = null; });
    state.unions = state.unions.filter(u => u.id !== id);
    sel = null;
  }

  // ---------- linking two existing people ----------
  function startLink(fromId, spec) {
    mode = { from: fromId || null, spec };
    renderMode(); renderCanvas();
  }

  function isAncestor(anc, of) {
    const seen = new Set(), stack = [of];
    while (stack.length) {
      const cur = P(stack.pop());
      if (!cur || seen.has(cur.id)) continue;
      seen.add(cur.id);
      const u = cur.parentUnion && U(cur.parentUnion);
      if (!u || !u.a) continue;
      if (u.a === anc || u.b === anc) return true;
      stack.push(u.a); if (u.b) stack.push(u.b);
    }
    return false;
  }

  function completeLink(from, to, spec) {
    const [kind, tid] = spec.split(':');
    if (!from || !to || from.id === to.id) return 'Pick two different people.';
    commit();
    if (kind === 'link') {
      const dup = linksBetween(from.id, to.id).find(x => x.type === tid);
      if (dup) { history.pop(); sel = { kind: 'emotion', id: dup.id }; return 'They already have that line.'; }
      const e = { id: uid('e'), a: from.id, b: to.id, type: tid };
      state.emotions.push(e);
      sel = { kind: 'emotion', id: e.id };
      return `Linked ${nameOf(from)} → ${nameOf(to)} (${typeOf('link', tid).label}).`;
    }
    if (kind === 'couple') {
      const ex = state.unions.find(u => u.a && u.b && ((u.a === from.id && u.b === to.id) || (u.a === to.id && u.b === from.id)));
      if (ex) { ex.type = tid; sel = { kind: 'union', id: ex.id }; return 'Relationship type updated.'; }
      const single = unionsOf(from.id).find(u => !u.b) || unionsOf(to.id).find(u => !u.b);
      if (single) { single.b = single.a === from.id ? to.id : from.id; single.type = tid; sel = { kind: 'union', id: single.id }; }
      else {
        const u = { id: uid('u'), a: from.id, b: to.id, type: tid, start: '', end: '' };
        state.unions.push(u);
        sel = { kind: 'union', id: u.id };
      }
      return `${nameOf(from)} and ${nameOf(to)} are now partners.`;
    }
    if (kind === 'child' || kind === 'parent') {
      const parent = kind === 'child' ? from : to, child = kind === 'child' ? to : from;
      if (isAncestor(child.id, parent.id)) return `${nameOf(child)} is already an ancestor of ${nameOf(parent)}.`;
      const cur = child.parentUnion && U(child.parentUnion);
      child.childType = tid;
      if (cur && (cur.a === parent.id || cur.b === parent.id)) return 'Child link type updated.';
      if (cur && !cur.a) cur.a = parent.id;                          // sibling group gains a parent
      else if (cur && !cur.b) {
        const ex = state.unions.find(u => u.a && u.b && ((u.a === cur.a && u.b === parent.id) || (u.a === parent.id && u.b === cur.a)));
        if (ex) { child.parentUnion = ex.id; pruneUnion(cur); }
        else cur.b = parent.id;
      } else if (cur) return `${nameOf(child)} already has two parents. Detach them first.`;
      else child.parentUnion = ensureUnionFor(parent, null).id;
      selectPerson(child);
      return `${nameOf(child)} is now a child of ${nameOf(parent)}.`;
    }
    if (kind === 'sibling') {
      const fu = from.parentUnion && U(from.parentUnion), tu = to.parentUnion && U(to.parentUnion);
      if (fu && fu === tu) return 'They are already siblings.';
      if (fu) { to.parentUnion = fu.id; pruneUnion(tu); }
      else if (tu) from.parentUnion = tu.id;
      else {
        const u = { id: uid('u'), a: null, b: null, type: 'married', start: '', end: '' };
        state.unions.push(u);
        from.parentUnion = to.parentUnion = u.id;
      }
      return `${nameOf(from)} and ${nameOf(to)} are now siblings.`;
    }
    return '';
  }

  function onLinkClick(p) {
    if (!mode.from) { mode.from = p.id; renderMode(); renderCanvas(); return; }
    const msg = completeLink(P(mode.from), p, mode.spec);
    mode = null;
    if (msg) toast(msg);
    renderAll();
  }

  function renderMode() {
    const b = $('#modeBanner');
    svgEl.classList.toggle('linking', !!mode);
    $('#btnLink').setAttribute('aria-pressed', String(!!mode));
    if (!mode) { b.hidden = true; return; }
    b.textContent = mode.from
      ? `Now click the second person to link ${nameOf(P(mode.from))} as ${specLabel(mode.spec)}. Esc cancels.`
      : `Link: click the first person (${specLabel(mode.spec)}). Esc cancels.`;
    b.hidden = false;
  }

  // ---------- canvas interaction ----------
  let drag = null;
  const toWorld = (cx, cy) => {
    const r = svgEl.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
  };

  svgEl.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const pg = e.target.closest('[data-pid]');
    const ug = e.target.closest('[data-uid]');
    const eg = e.target.closest('[data-eid]');
    svgEl.setPointerCapture(e.pointerId);
    const w = toWorld(e.clientX, e.clientY);

    if (mode && pg) { onLinkClick(P(pg.dataset.pid)); return; }
    if (pg) {
      const p = P(pg.dataset.pid);
      const changed = !sel || sel.id !== p.id;
      sel = { kind: 'person', id: p.id };
      drag = { type: 'move', items: [p], start: w, orig: [{ x: p.x, y: p.y }], moved: false };
      if (changed) renderPanel();
      renderCanvas();
    } else if (ug && !mode) {
      const u = U(ug.dataset.uid);
      sel = { kind: 'union', id: u.id };
      const items = (u.a ? [P(u.a), u.b && P(u.b)] : kidsOf(u.id)).filter(Boolean);
      drag = { type: 'move', items, start: w, orig: items.map(p => ({ x: p.x, y: p.y })), moved: false };
      renderPanel(); renderCanvas();
    } else if (eg && !mode) {
      sel = { kind: 'emotion', id: eg.dataset.eid };
      renderPanel(); renderCanvas();
    } else {
      drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
      svgEl.classList.add('panning');
    }
  });

  svgEl.addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.type === 'pan') {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      view.x = drag.vx + dx; view.y = drag.vy + dy;
      world.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
      const pt = document.getElementById('bgpat');
      if (pt) pt.setAttribute('patternTransform', `translate(${view.x} ${view.y}) scale(${view.k})`);
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    const dx = w.x - drag.start.x, dy = w.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) * view.k < 3) return;
    if (!drag.moved) { commit(); drag.moved = true; }
    drag.items.forEach((p, i) => { p.x = drag.orig[i].x + dx; p.y = drag.orig[i].y + dy; });
    renderCanvas();
  });

  function endDrag() {
    if (!drag) return;
    if (drag.type === 'pan') {
      svgEl.classList.remove('panning');
      if (!drag.moved && sel && !mode) { sel = null; renderPanel(); renderCanvas(); }
    } else if (drag.moved) {
      drag.items.forEach(p => { p.x = Math.round(p.x / GRID) * GRID; p.y = Math.round(p.y / GRID) * GRID; });
      renderCanvas();
    }
    drag = null;
  }
  svgEl.addEventListener('pointerup', endDrag);
  svgEl.addEventListener('pointercancel', endDrag);

  function zoomAt(factor, cx, cy) {
    const k = Math.min(3, Math.max(0.2, view.k * factor));
    const f = k / view.k;
    view.x = cx - (cx - view.x) * f; view.y = cy - (cy - view.y) * f; view.k = k;
    renderCanvas();
  }
  svgEl.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svgEl.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  function fit() {
    const b = bounds(), r = stage.getBoundingClientRect();
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    const k = Math.min(1.5, Math.max(0.2, Math.min((r.width - 80) / w, (r.height - 80) / h)));
    view.k = k;
    view.x = (r.width - w * k) / 2 - b.minX * k;
    view.y = (r.height - h * k) / 2 - b.minY * k;
    renderCanvas();
  }

  // ---------- keyboard ----------
  document.addEventListener('keydown', e => {
    if (!dlg.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeExport(); } return; }
    const typing = e.target.matches('input, textarea, select');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveJSON(); return; }
    if (e.key === 'Escape') {
      if (typing) { e.target.blur(); return; }
      if (mode) mode = null; else sel = null;
      renderAll(); return;
    }
    if (typing || mod || e.altKey) return;
    const p = sel && sel.kind === 'person' ? P(sel.id) : null;
    const k = e.key.toLowerCase();
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!sel) return;
      e.preventDefault();
      if (sel.kind === 'person') deletePerson(sel.id);
      else if (sel.kind === 'union') deleteUnion(sel.id);
      else { commit(); state.emotions = state.emotions.filter(x => x.id !== sel.id); sel = null; }
      renderAll();
    }
    else if (k === 'a') addPerson();
    else if (k === 'l') startLink(null, pick.spec);
    else if (k === '0') fit();
    else if (p && (k === 'm' || k === 'f' || k === 'u')) setSex(p, k.toUpperCase());
    else if (p && k === 'p') { addPartner(p); renderAll(); }
    else if (p && k === 'x') { addPartner(p, 'divorced', true); renderAll(); }
    else if (p && k === 'c') { addChild(p, null); renderAll(); }
    else if (p && k === 'r') { addParents(p); renderAll(); }
    else if (p && k === 's') { addSibling(p); renderAll(); }
  }, true);

  // ---------- kinship: how two people are related, worked out from the lines on the chart ----------
  const WORD = {
    parent: ['father', 'mother', 'parent'], child: ['son', 'daughter', 'child'], sibling: ['brother', 'sister', 'sibling'],
    pibling: ['uncle', 'aunt', 'aunt/uncle'], nibling: ['nephew', 'niece', 'niece/nephew'],
    spouse: ['husband', 'wife', 'spouse'], ex: ['ex-husband', 'ex-wife', 'ex-spouse'], fiance: ['fiancé', 'fiancée', 'fiancé(e)']
  };
  const word = (p, k) => WORD[k][p.sex === 'M' ? 0 : p.sex === 'F' ? 1 : 2];
  const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
  const CURRENT = ['married', 'separated', 'widowed'];      // couple types that make in-laws and step-family

  // a parentless sibling group acts as one shared, unnamed parent
  function parentNodes(p) {
    const u = p && p.parentUnion && U(p.parentUnion);
    if (!u) return [];
    return u.a ? [u.a, u.b].filter(Boolean) : ['group:' + u.id];
  }
  let ancMemo = null;                                        // filled while a report is being written
  function ancestry(id) {
    if (ancMemo && ancMemo.has(id)) return ancMemo.get(id);
    const d = new Map([[id, 0]]), q = [id];
    while (q.length) {
      const cur = q.shift();
      for (const par of parentNodes(P(cur))) if (!d.has(par)) { d.set(par, d.get(cur) + 1); q.push(par); }
    }
    if (ancMemo) ancMemo.set(id, d);
    return d;
  }
  // generations from each person up to their nearest shared ancestor
  function bloodRel(a, b) {
    const A = ancestry(a.id), B = ancestry(b.id);
    let best = null;
    for (const [id, da] of A) {
      if (!B.has(id)) continue;
      const db = B.get(id);
      if (!best || da + db < best.da + best.db) best = { da, db };
    }
    return best;
  }
  const partnersOf = id => state.unions.filter(u => u.a && u.b && (u.a === id || u.b === id))
    .map(u => ({ u, p: P(u.a === id ? u.b : u.a) })).filter(x => x.p);
  const parentsOf = p => { const u = p.parentUnion && U(p.parentUnion); return u && u.a ? [u.a, u.b].filter(Boolean).map(P).filter(Boolean) : []; };
  const childrenOf = id => state.people.filter(k => { const u = k.parentUnion && U(k.parentUnion); return u && (u.a === id || u.b === id); });

  function childWord(k) {                                    // what child k is to their parents: "adopted son"
    const base = word(k, 'child');
    switch (k.childType || 'bio') {
      case 'bio': return base;
      case 'adopted': return 'adopted ' + base;
      case 'foster': return 'foster ' + base;
      case 'step': return 'step' + base;
      case 'guardian': return 'ward (legal guardianship)';
      case 'donor': return base + ' (donor / surrogate)';
      default: return `${base} (${typeOf('child', k.childType).label.toLowerCase()})`;
    }
  }
  function parentWord(k, par) {                              // what par is to child k: "adoptive mother"
    const base = word(par, 'parent');
    switch (k.childType || 'bio') {
      case 'bio': return base;
      case 'adopted': return 'adoptive ' + base;
      case 'foster': return 'foster ' + base;
      case 'step': return 'step' + base;
      case 'guardian': return 'legal guardian';
      case 'donor': return base + ' (donor / surrogate)';
      default: return `${base} (${typeOf('child', k.childType).label.toLowerCase()})`;
    }
  }
  function partnerTerm(u, b) {                               // what b is to their partner in couple u
    switch (u.type) {
      case 'married': return word(b, 'spouse');
      case 'separated': return word(b, 'spouse') + ' (separated)';
      case 'widowed': return b.deceased ? 'late ' + word(b, 'spouse') : ({ M: 'widower', F: 'widow' }[b.sex] || 'surviving spouse');
      case 'divorced': return word(b, 'ex');
      case 'annulled': return word(b, 'ex') + ' (annulled)';
      case 'engaged': return word(b, 'fiance');
      case 'cohabiting': return 'partner';
      case 'dating': return 'partner (dating)';
      case 'affair': return 'affair partner';
      default: return `partner (${typeOf('couple', u.type).label.toLowerCase()})`;
    }
  }
  function bloodTerm(a, b, r) {                              // what b is to a
    const { da, db } = r;
    const great = n => 'great-'.repeat(Math.max(0, n));
    if (da === 0) return db === 1 ? childWord(b) : great(db - 2) + 'grand' + word(b, 'child');
    if (db === 0) return da === 1 ? parentWord(a, b) : great(da - 2) + 'grand' + word(b, 'parent');
    if (da === 1 && db === 1) {
      const base = word(b, 'sibling'), types = [a.childType, b.childType];
      if (a.parentUnion !== b.parentUnion) return 'half-' + base;
      if (types.includes('step')) return 'step' + base;
      if (types.includes('foster')) return 'foster ' + base;
      return b.childType === 'adopted' ? 'adopted ' + base : base;
    }
    if (da === 1) return great(db - 2) + word(b, 'nibling');
    if (db === 1) return great(da - 2) + word(b, 'pibling');
    const n = Math.min(da, db) - 1, rm = Math.abs(da - db);
    return `${ORD[n - 1] || n + 'th'} cousin` + (rm === 0 ? '' : rm === 1 ? ' once removed' : rm === 2 ? ' twice removed' : ` ${rm} times removed`);
  }

  // what b is to a, phrased to follow "a's …"; rank orders relatives from closest outward
  function relation(a, b) {
    if (!a || !b || a.id === b.id) return null;
    const direct = partnersOf(a.id).find(x => x.p.id === b.id);
    if (direct) return { text: partnerTerm(direct.u, b), rank: 1 };
    const r = bloodRel(a, b);
    if (r) return { text: bloodTerm(a, b, r), rank: r.da + r.db };
    let best = null;
    const consider = (text, rank) => { if (!best || rank < best.rank) best = { text, rank }; };
    for (const { u, p: rel } of partnersOf(b.id)) {          // b is the partner of a's relative
      const rr = rel.id !== a.id && bloodRel(a, rel);
      if (!rr) continue;
      const cur = CURRENT.includes(u.type), rank = rr.da + rr.db + 1;
      if (cur && rr.da === 1 && rr.db === 0) consider('step' + word(b, 'parent'), rank);
      else if (cur && rr.da === 1 && rr.db === 1) consider(word(b, 'sibling') + '-in-law', rank);
      else if (cur && rr.da === 0 && rr.db === 1) consider(word(b, 'child') + '-in-law', rank);
      else consider(`${bloodTerm(a, rel, rr)} ${nameOf(rel)}'s ${partnerTerm(u, b)}`, rank);
    }
    for (const { u, p: mate } of partnersOf(a.id)) {         // b is a relative of a's partner
      const rr = mate.id !== b.id && bloodRel(mate, b);
      if (!rr) continue;
      const cur = CURRENT.includes(u.type), rank = rr.da + rr.db + 1;
      if (cur && rr.da === 1 && rr.db === 0) consider(word(b, 'parent') + '-in-law', rank);
      else if (cur && rr.da === 1 && rr.db === 1) consider(word(b, 'sibling') + '-in-law', rank);
      else if ((cur || u.type === 'cohabiting') && rr.da === 0 && rr.db === 1) consider('step' + word(b, 'child'), rank);
      else consider(`${partnerTerm(u, mate)} ${nameOf(mate)}'s ${bloodTerm(mate, b, rr)}`, rank);
    }
    return best || familyPath(a, b);
  }
  // last resort: walk the family lines one step at a time ("mother's husband's son")
  function familyPath(a, b) {
    const prev = new Map([[a.id, null]]), q = [a.id];
    while (q.length && !prev.has(b.id)) {
      const cur = P(q.shift());
      const steps = parentsOf(cur).map(x => [x, word(x, 'parent')])
        .concat(childrenOf(cur.id).map(x => [x, word(x, 'child')]))
        .concat(partnersOf(cur.id).map(x => [x.p, partnerTerm(x.u, x.p)]))
        .concat(cur.parentUnion ? state.people.filter(x => x !== cur && x.parentUnion === cur.parentUnion).map(x => [x, word(x, 'sibling')]) : []);
      for (const [nx, label] of steps) if (!prev.has(nx.id)) { prev.set(nx.id, { from: cur.id, label }); q.push(nx.id); }
    }
    if (!prev.has(b.id)) return null;
    const labels = [];
    for (let id = b.id; prev.get(id); id = prev.get(id).from) labels.unshift(prev.get(id).label);
    return labels.length > 6 ? null : { text: labels.join("'s "), rank: 10 + labels.length };
  }

  // one connection line, seen from person p ("Conflict with Robert", "Godparent from Paul")
  function linkFrom(e, p) {
    const t = typeOf('link', e.type), other = P(e.a === p.id ? e.b : e.a);
    if (t.arrow !== 'end') return `${t.label} with ${nameOf(other)}`;
    return e.a === p.id ? `${t.label}, toward ${nameOf(other)}` : `${t.label}, from ${nameOf(other)}`;
  }
  function yearsText(p) {
    const age = p.birth ? (p.death ? p.death - p.birth : (p.deceased ? null : YEAR - p.birth)) : null;
    const ageTxt = age !== null && age >= 0 && age < 130 ? ` (${p.death || p.deceased ? 'died at' : 'age'} ${age})` : '';
    if (p.birth && p.death) return `born ${p.birth}, died ${p.death}${ageTxt}`;
    if (p.birth) return `born ${p.birth}${ageTxt}${p.deceased ? ', deceased' : ''}`;
    if (p.death) return `died ${p.death}`;
    return p.deceased ? 'deceased' : '';
  }
  const listOf = arr => arr.join('; ');
  const byChart = (x, y) => (x.y - y.y) || (x.x - y.x);   // top to bottom, left to right, as drawn

  // the relationship summary as rows; the PDF and the text file both come from these
  function reportRows(o) {
    ancMemo = new Map();
    try {
      const rows = [];
      const people = state.people.slice().sort(byChart);
      const index = state.people.find(p => p.proband);
      const date = new Date().toISOString().slice(0, 10);
      const meaning = t => (o.rMeanings && t.desc ? ' ' + t.desc : '');
      rows.push({ t: 'title', text: 'Relationship summary', sub: `${state.title || 'Genogram'}  |  ${date}  |  written out from the lines drawn on the chart` });

      if (o.rOverview) {
        const n = s => state.people.filter(p => p.sex === s).length;
        const couples = state.unions.filter(u => u.a && u.b).length;
        const pc = state.people.filter(p => parentsOf(p).length).length;
        const dead = state.people.filter(p => p.deceased).length;
        const plural = (k, one, many) => `${k} ${k === 1 ? one : many}`;
        rows.push({ t: 'h', text: 'Overview' });
        rows.push({ t: 'p', text: `This genogram shows ${plural(state.people.length, 'person', 'people')} (${n('M')} male, ${n('F')} female` +
          `${n('U') ? `, ${n('U')} unknown` : ''})${dead ? `, ${dead} of whom ${dead === 1 ? 'has' : 'have'} died` : ''}. ` +
          `It has ${plural(couples, 'couple', 'couples')}, ${plural(pc, 'person', 'people')} shown with their parents, and ${plural(state.emotions.length, 'connection line', 'connection lines')}.` +
          (index ? ` The index person (the person the genogram is about) is ${nameOf(index)}.` : '') });
      }

      if (o.rIndex) {
        rows.push({ t: 'h', text: index ? `How everyone is related to ${nameOf(index)}` : 'How everyone is related to the index person' });
        if (!index) rows.push({ t: 'p', text: 'No one is marked as the index person yet. Select a person and tick "Index person (client)" to fill in this section.' });
        else {
          const list = people.filter(p => p !== index).map(p => ({ p, r: relation(index, p) }))
            .sort((x, y) => (x.r ? x.r.rank : 99) - (y.r ? y.r.rank : 99));
          for (const { p, r } of list) {
            let txt = r ? `${nameOf(index)}'s ${r.text}.` : 'No family tie is drawn between them.';
            const lk = linksBetween(index.id, p.id).map(e => {
              const t = typeOf('link', e.type);
              return t.arrow === 'end' ? `${t.label} (from ${nameOf(P(e.a))} toward ${nameOf(P(e.b))})` : t.label;
            });
            if (lk.length) txt += ` Connection: ${lk.join(', ')}.`;
            rows.push({ t: 'kv', label: nameOf(p), text: txt });
          }
          if (!list.length) rows.push({ t: 'p', text: `${nameOf(index)} is the only person on the chart.` });
        }
      }

      if (o.rPeople) {
        rows.push({ t: 'h', text: 'Person by person' });
        for (const p of people) {
          const detail = [];
          if (o.pSex) detail.push({ M: 'Male', F: 'Female', U: 'Sex unknown' }[p.sex] || 'Sex unknown');
          if (o.pYears && yearsText(p)) detail.push(yearsText(p));
          if (p.proband) detail.push('index person');
          rows.push({ t: 'person', text: nameOf(p), sub: detail.join('  ·  ') });
          const kv = (label, items) => { if (items && items.length) rows.push({ t: 'kv', label, text: Array.isArray(items) ? listOf(items) : items }); };
          if (o.pEth) kv('Ethnicity', (p.ethnicity || []).join(', '));
          if (o.pCond) kv('Conditions', (p.cond || []).map(id => state.conditions.find(c => c.id === id)).filter(Boolean).map(c => c.label).join(', '));
          if (o.pNote) kv('Note', p.note);
          const pars = parentsOf(p), mates = partnersOf(p.id), kids = childrenOf(p.id).sort(byChart);
          const sibs = people.filter(q => q !== p && parentNodes(q).some(x => parentNodes(p).includes(x)));
          if (o.pParents) kv('Parents', pars.map(x => `${nameOf(x)} (${parentWord(p, x)})`));
          if (o.pSiblings) kv('Siblings', sibs.map(x => `${nameOf(x)} (${relation(p, x).text})`));
          if (o.pPartners) kv('Partners', mates.map(({ u, p: m }) => { const y = unionLabel(u).replace(/  /g, ', '); return `${nameOf(m)} (${partnerTerm(u, m)}${y ? ', ' + y : ''})`; }));
          if (o.pChildren) {
            const many = new Set(kids.map(k => k.parentUnion)).size > 1;
            kv('Children', kids.map(k => {
              const u = U(k.parentUnion), other = u && P(u.a === p.id ? u.b : u.a);
              return `${nameOf(k)} (${childWord(k)}${many && other ? ', with ' + nameOf(other) : ''})`;
            }));
          }
          if (o.pExtended) {
            const near = new Set([p, ...pars, ...mates.map(x => x.p), ...kids, ...sibs]);
            const ext = people.filter(q => !near.has(q)).map(q => ({ q, r: relation(p, q) })).filter(x => x.r)
              .sort((x, y) => x.r.rank - y.r.rank);
            kv('Other family', ext.map(({ q, r }) => `${nameOf(q)} (${r.text})`));
          }
          if (o.pLinks) kv('Connections', state.emotions.filter(e => e.a === p.id || e.b === p.id).map(e => linkFrom(e, p)));
        }
      }

      if (o.rCouples) {
        const cs = state.unions.filter(u => u.a && u.b && P(u.a) && P(u.b));
        if (cs.length) {
          rows.push({ t: 'h', text: 'Couples' });
          for (const u of cs) {
            const t = typeOf('couple', u.type), y = unionLabel(u).replace(/  /g, ', '), kids = kidsOf(u.id).sort(byChart);
            rows.push({ t: 'kv', draw: g => drawSample(g, 'couple', t), label: `${nameOf(P(u.a))} & ${nameOf(P(u.b))}`,
              text: `${t.label}${y ? ` (${y})` : ''}. ${kids.length ? 'Children together: ' + kids.map(nameOf).join(', ') + '.' : 'No children together on the chart.'}${meaning(t)}` });
          }
        }
      }

      if (o.rFamilies) {
        const fams = state.unions.filter(u => kidsOf(u.id).length);
        if (fams.length) {
          rows.push({ t: 'h', text: 'Parents and their children' });
          for (const u of fams) {
            const kids = kidsOf(u.id).sort(byChart);
            const label = !u.a ? 'Parents not shown' : u.b ? `${nameOf(P(u.a))} & ${nameOf(P(u.b))}` : `${nameOf(P(u.a))} (single parent)`;
            rows.push({ t: 'kv', label, text: (u.a ? '' : 'Siblings: ') + kids.map(k => `${nameOf(k)} (${u.a ? childWord(k) : word(k, 'sibling')})`).join('; ') });
          }
        }
      }

      if (o.rLinks && state.emotions.length) {
        rows.push({ t: 'h', text: 'Connection lines', note: 'Each line is drawn in its own colour. Two people can have several, drawn side by side.' });
        const order = typesOf('link').map(t => t.id);
        const list = state.emotions.filter(e => P(e.a) && P(e.b)).slice()
          .sort((x, y) => pairKey(x).localeCompare(pairKey(y)) || order.indexOf(x.type) - order.indexOf(y.type));
        for (const e of list) {
          const t = typeOf('link', e.type), a = P(e.a), b = P(e.b);
          rows.push({ t: 'kv', draw: g => drawSample(g, 'link', t), label: t.arrow === 'end' ? `${nameOf(a)} to ${nameOf(b)}` : `${nameOf(a)} & ${nameOf(b)}`,
            text: `${t.label}.${t.arrow === 'end' ? ` Points from ${nameOf(a)} toward ${nameOf(b)}.` : ''}${meaning(t)}` });
        }
      }

      if (o.rEth) {
        const m = new Map();
        people.forEach(p => (p.ethnicity || []).forEach(x => { if (!m.has(x)) m.set(x, []); m.get(x).push(nameOf(p)); }));
        if (m.size) {
          rows.push({ t: 'h', text: 'Ethnic backgrounds' });
          for (const [x, names] of [...m].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])))
            rows.push({ t: 'kv', label: x, text: names.join(', ') });
          const none = people.filter(p => !(p.ethnicity || []).length);
          if (none.length) rows.push({ t: 'kv', label: 'Not recorded', text: none.map(nameOf).join(', ') });
        }
      }

      if (o.rCond) {
        const used = state.conditions.filter(c => usage('cond', c.id));
        if (used.length) {
          rows.push({ t: 'h', text: 'Conditions' });
          for (const c of used)
            rows.push({ t: 'kv', draw: g => drawSample(g, 'cond', c), label: c.label,
              text: people.filter(p => (p.cond || []).includes(c.id)).map(nameOf).join(', ') + '.' + meaning(c) });
        }
      }
      return rows;
    } finally { ancMemo = null; }
  }

  // lay the rows out on portrait pages
  function buildReportPages(rows, pageH) {
    const GW = 530, keyX = 116, drawLab = 66, drawTxt = 200;
    const saved = [INK, MUTED, SHEET];
    INK = '#1b2433'; MUTED = '#556070'; SHEET = '#ffffff';
    rows.forEach(r => {
      if (r.t === 'title') r.height = 58;
      else if (r.t === 'h') { r.lines = wrap(r.note || '', 10, GW); r.height = 34 + r.lines.length * 13; }
      else if (r.t === 'person') { r.lines = wrap(r.sub || '', 10, GW); r.height = 30 + r.lines.length * 13; }
      else if (r.t === 'p') { r.lines = wrap(r.text, 10.5, GW); r.height = r.lines.length * 14 + 8; }
      else {
        const lx = r.draw ? drawLab : 0, tx = r.draw ? drawTxt : keyX;
        r.labLines = wrap(r.label, r.draw ? 11 : 10, tx - lx - 10);
        r.lines = wrap(r.text || '', 10, GW - tx);
        r.height = Math.max(r.draw ? 44 : 0, Math.max(r.labLines.length, r.lines.length) * 13 + (r.draw ? 18 : 6));
      }
    });
    const pages = [[]]; let used = 0;
    rows.forEach((r, i) => {
      const next = rows[i + 1];
      const need = (r.t === 'h' || r.t === 'person') && next ? r.height + next.height : r.height;   // keep headings with what follows
      if (used + need > pageH - 16 && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(r); used += r.height;
    });
    const out = pages.map((list, pi) => {
      const Ht = list.reduce((s, r) => s + r.height, 0) + 16;
      const svg = el('svg', { xmlns: NS, width: GW, height: Ht, viewBox: `0 0 ${GW} ${Ht}` });
      el('rect', { x: 0, y: 0, width: GW, height: Ht, fill: '#ffffff' }, svg);
      let y = 0;
      for (const r of list) {
        if (r.t === 'title') {
          text(svg, 0, y + 24, r.text, { anchor: 'start', size: 20, weight: 'bold' });
          text(svg, 0, y + 42, r.sub, { anchor: 'start', size: 10.5, fill: MUTED });
        } else if (r.t === 'h') {
          text(svg, 0, y + 24, r.text.toUpperCase(), { anchor: 'start', size: 11, weight: 'bold', fill: '#1d6c75' });
          el('line', { x1: 0, y1: y + 29, x2: GW, y2: y + 29, stroke: '#d3d9e1', 'stroke-width': 1 }, svg);
          r.lines.forEach((ln, i) => text(svg, 0, y + 42 + i * 13, ln, { anchor: 'start', size: 10, style: 'italic', fill: MUTED }));
        } else if (r.t === 'person') {
          text(svg, 0, y + 20, r.text, { anchor: 'start', size: 13, weight: 'bold' });
          r.lines.forEach((ln, i) => text(svg, 0, y + 34 + i * 13, ln, { anchor: 'start', size: 10, fill: MUTED }));
        } else if (r.t === 'p') {
          r.lines.forEach((ln, i) => text(svg, 0, y + 14 + i * 14, ln, { anchor: 'start', size: 10.5 }));
        } else {
          const lx = r.draw ? drawLab : 0, tx = r.draw ? drawTxt : keyX, ty = y + (r.draw ? 18 : 11);
          if (r.draw) r.draw(el('g', { transform: `translate(2 ${y + 6}) scale(1.8)` }, svg));
          r.labLines.forEach((ln, i) => text(svg, lx, ty + i * 13, ln, r.draw ? { anchor: 'start', size: 11, weight: 'bold' } : { anchor: 'start', size: 10, weight: 'bold', fill: MUTED }));
          r.lines.forEach((ln, i) => text(svg, tx, ty + i * 13, ln, { anchor: 'start', size: 10 }));
          if (r.draw) el('line', { x1: lx, y1: y + r.height - 0.5, x2: GW, y2: y + r.height - 0.5, stroke: '#eef1f4', 'stroke-width': 1 }, svg);
        }
        y += r.height;
      }
      if (pages.length > 1) text(svg, GW, Ht - 2, `Relationship summary ${pi + 1} of ${pages.length}`, { anchor: 'end', size: 9, fill: MUTED });
      return { svg, W: GW, H: Ht };
    });
    [INK, MUTED, SHEET] = saved;
    return out;
  }

  function reportText(rows) {
    const out = [];
    for (const r of rows) {
      if (r.t === 'title') out.push(r.text.toUpperCase(), r.sub, '');
      else if (r.t === 'h') out.push('', r.text.toUpperCase(), '-'.repeat(r.text.length), ...(r.note ? [r.note, ''] : []));
      else if (r.t === 'person') out.push('', r.text + (r.sub ? '  -  ' + r.sub : ''));
      else if (r.t === 'p') out.push(r.text, '');
      else out.push(`  ${r.label}: ${r.text}`);
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  }

  // ---------- export: page 1 (diagram + compact key) ----------
  function usedKeyItems() {
    const items = [];
    const sym = (sex, extra) => g => {
      el('path', { d: shapePath(sex, 15, 10, 8), fill: SHEET, stroke: INK, 'stroke-width': 1.6 }, g);
      if (extra) extra(g);
    };
    if (state.people.some(p => p.sex === 'M')) items.push({ draw: sym('M'), label: 'Male' });
    if (state.people.some(p => p.sex === 'F')) items.push({ draw: sym('F'), label: 'Female' });
    if (state.people.some(p => p.sex === 'U')) items.push({ draw: sym('U'), label: 'Unknown sex' });
    if (state.people.some(p => p.deceased))
      items.push({ draw: sym('M', g => el('path', { d: 'M4 -1L26 21M26 -1L4 21', stroke: INK, 'stroke-width': 1.6 }, g)), label: 'Deceased' });
    if (state.people.some(p => p.proband))
      items.push({ draw: sym('F', g => el('path', { d: shapePath('F', 15, 10, 11), fill: 'none', stroke: INK, 'stroke-width': 1.2 }, g)), label: 'Index person' });
    for (const cat of ['couple', 'child', 'link'])
      for (const t of typesOf(cat)) if (usage(cat, t.id) && !(cat === 'child' && t.id === 'bio'))
        items.push({ draw: g => drawSample(g, cat, t), label: cat === 'child' ? t.label + ' child' : t.label });
    for (const c of state.conditions) if (usage('cond', c.id))
      items.push({ draw: g => drawSample(g, 'cond', c), label: c.label });
    return items;
  }

  function buildDiagramSVG(withGuideNote, withKey = true) {
    const b = bounds();
    const pad = 28, headH = 64;
    const dw = b.maxX - b.minX, dh = b.maxY - b.minY;
    const items = withKey ? usedKeyItems() : [];
    const W = Math.max(dw + pad * 2, 560);
    const rows = [[]]; let rowW = 0;
    const itemW = it => 38 + textW(it.label, 11) + 18;
    for (const it of items) {
      const w = itemW(it);
      if (rowW + w > W - pad * 2 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(it); rowW += w;
    }
    const keyH = withKey ? 30 + rows.length * 26 + (withGuideNote ? 16 : 0) : 8;
    const Htot = headH + dh + 20 + keyH;
    const rule = INK === '#1b2433' ? '#d3d9e1' : '#4a5563';

    const svg = el('svg', { xmlns: NS, width: W, height: Htot, viewBox: `0 0 ${W} ${Htot}` });
    el('rect', { x: 0, y: 0, width: W, height: Htot, fill: SHEET }, svg);
    text(svg, pad, 32, state.title || 'Genogram', { anchor: 'start', size: 20, weight: 'bold' });
    const date = new Date().toISOString().slice(0, 10);
    text(svg, pad, 50, `Genogram  |  ${state.people.length} people  |  ${date}`, { anchor: 'start', size: 11, fill: MUTED });
    el('line', { x1: pad, y1: headH - 4, x2: W - pad, y2: headH - 4, stroke: rule, 'stroke-width': 1 }, svg);

    const dg = drawDiagram(true);
    dg.setAttribute('transform', `translate(${(W - dw) / 2 - b.minX} ${headH + 8 - b.minY})`);
    svg.appendChild(dg);

    let ky = headH + dh + 20;
    if (!withKey) return { svg, W, H: Htot };
    el('line', { x1: pad, y1: ky, x2: W - pad, y2: ky, stroke: rule, 'stroke-width': 1 }, svg);
    text(svg, pad, ky + 20, 'KEY', { anchor: 'start', size: 10, weight: 'bold', fill: MUTED });
    ky += 30;
    for (const row of rows) {
      let kx = pad;
      for (const it of row) {
        it.draw(el('g', { transform: `translate(${kx} ${ky})` }, svg));
        text(svg, kx + 38, ky + 14, it.label, { anchor: 'start', size: 11 });
        kx += itemW(it);
      }
      ky += 26;
    }
    if (withGuideNote) text(svg, pad, ky + 6, 'The guide pages explain every symbol, line and colour.', { anchor: 'start', size: 10, style: 'italic', fill: MUTED });
    return { svg, W, H: Htot };
  }

  // ---------- export: guide pages ----------
  const SYMBOL_GUIDE = [
    { label: 'Male', desc: 'A square is a man or boy.', draw: g => el('path', { d: shapePath('M', 15, 10, 8), fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g) },
    { label: 'Female', desc: 'A circle is a woman or girl.', draw: g => el('path', { d: shapePath('F', 15, 10, 8), fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g) },
    { label: 'Unknown / other', desc: 'A diamond is a person whose sex is unknown, not stated, or non-binary.', draw: g => el('path', { d: shapePath('U', 15, 10, 7), fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g) },
    { label: 'Deceased', desc: 'An X through a symbol means the person has died. Their years read birth - death.', draw: g => { el('path', { d: shapePath('M', 15, 10, 8), fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g); el('path', { d: 'M4 -1L26 21M26 -1L4 21', stroke: INK, 'stroke-width': 1.6 }, g); } },
    { label: 'Index person', desc: 'A double outline and an arrow mark the person the genogram is about, usually the client.', draw: g => { el('path', { d: shapePath('F', 17, 9, 7), fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g); el('path', { d: shapePath('F', 17, 9, 9.5), fill: 'none', stroke: INK, 'stroke-width': 1 }, g); el('path', { d: 'M1 20L8 14', stroke: INK, 'stroke-width': 1.4 }, g); } },
    { label: 'Age', desc: 'The number inside a symbol is the person\'s age now, or their age at death.', draw: g => { el('path', { d: shapePath('M', 15, 10, 9), fill: '#fff', stroke: INK, 'stroke-width': 1.6 }, g); text(g, 15, 13.5, '42', { size: 9, weight: 'bold', fill: INK }); } },
    { label: 'Labels', desc: 'Under each symbol: name, then years (b. = born, d. = died), then ethnicity if shown, then any note in italics.', draw: g => { text(g, 15, 6, 'Name', { size: 7, weight: 'bold', fill: INK }); text(g, 15, 13, 'b. 1990', { size: 6, fill: MUTED }); text(g, 15, 19, 'note', { size: 6, style: 'italic', fill: MUTED }); } },
    { label: 'Conditions', desc: 'Coloured sections are conditions from the list at the end of this guide. Someone with several conditions has their symbol split into equal slices, starting at the top and going clockwise.', draw: g => { el('path', { d: slicePath('F', 15, 10, 8, 0, 2), fill: '#d9534f' }, g); el('path', { d: slicePath('F', 15, 10, 8, 1, 2), fill: '#4a7fc1' }, g); el('path', { d: shapePath('F', 15, 10, 8), fill: 'none', stroke: INK, 'stroke-width': 1.6 }, g); } },
    { label: 'Family unit', desc: 'Partners are joined by a line beneath them. Their children hang from a line dropped from the middle of it, and siblings share the horizontal bar, usually oldest on the left. A bar with no parents above it means siblings whose parents are not shown.', draw: g => { el('path', { d: 'M6 5V9H24V5M15 9V13M8 13H22M8 13V17M22 13V17', fill: 'none', stroke: INK, 'stroke-width': 1.4 }, g); el('rect', { x: 3, y: 0, width: 6, height: 5, fill: '#fff', stroke: INK, 'stroke-width': 1.2 }, g); el('circle', { cx: 24, cy: 2.5, r: 2.8, fill: '#fff', stroke: INK, 'stroke-width': 1.2 }, g); } },
    { label: 'Connection lines', desc: 'Coloured lines between two people describe how they relate emotionally or socially. An arrow shows direction: it points from the person doing it to the person it is done to.', draw: g => drawLink(g, 2, 10, 28, 10, { color: '#1d6c75', pattern: 'straight', dash: 'solid', arrow: 'end' }) }
  ];

  function guideRows(usedOnly) {
    const rows = [{ h: 'title' }];
    const sec = (title, note, items) => {
      if (!items.length) return;
      rows.push({ h: title, note });
      rows.push(...items);
    };
    sec('Symbols', '', SYMBOL_GUIDE);
    const typeItems = cat => typesOf(cat).map(t => ({
      label: t.label, desc: t.desc || '', custom: !isBuiltin(cat, t.id), used: usage(cat, t.id) > 0,
      draw: g => drawSample(g, cat, t)
    })).filter(r => !usedOnly || r.used);
    sec('Couple relationships', 'The line joining two partners. Years along it: m. married, eng. engaged, sep. separated, div. divorced, ann. annulled, wid. widowed.', typeItems('couple'));
    sec('Child links', 'The line from the sibling bar down to each child shows how the child joined the family.', typeItems('child'));
    sec('Connection lines', 'Lines drawn directly between two people.', typeItems('link'));
    sec('Conditions', 'Colours used to shade symbols.', state.conditions.map(c => ({
      label: c.label, desc: c.desc || '', used: usage('cond', c.id) > 0, draw: g => drawSample(g, 'cond', c)
    })).filter(r => !usedOnly || r.used));
    if (usedOnly) rows.forEach(r => { if (!r.h) r.used = false; });   // everything listed is on the chart; no stars needed
    return rows;
  }

  function buildGuidePages(pageH, usedOnly) {
    const GW = 530, labelX = 78, descX = 222, descW = GW - descX;
    const saved = [INK, MUTED, SHEET];
    INK = '#1b2433'; MUTED = '#556070'; SHEET = '#ffffff';      // the guide is always on white
    const measured = guideRows(usedOnly).map(r => {
      if (r.h === 'title') return Object.assign(r, { height: 58 });
      if (r.h) { r.noteLines = wrap(r.note, 10, GW); return Object.assign(r, { height: 30 + r.noteLines.length * 13 }); }
      r.labLines = wrap(r.label + (r.custom ? ' (custom)' : ''), 11, descX - labelX - 14);
      r.descLines = wrap(r.desc || 'No description.', 10, descW);
      r.height = Math.max(44, Math.max(r.labLines.length * 14, r.descLines.length * 13) + 18);
      return r;
    });
    const pages = [[]]; let used = 0;
    measured.forEach((r, i) => {
      const next = measured[i + 1];
      const need = r.h && r.h !== 'title' && next ? r.height + next.height : r.height;  // keep a heading with its first row
      if (used + need > pageH && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(r); used += r.height;
    });
    const out = pages.map((rows, pi) => {
      const Ht = rows.reduce((s, r) => s + r.height, 0) + 14;
      const svg = el('svg', { xmlns: NS, width: GW, height: Ht, viewBox: `0 0 ${GW} ${Ht}` });
      el('rect', { x: 0, y: 0, width: GW, height: Ht, fill: '#ffffff' }, svg);
      let y = 0;
      for (const r of rows) {
        if (r.h === 'title') {
          text(svg, 0, y + 24, 'How to read this genogram', { anchor: 'start', size: 20, weight: 'bold' });
          text(svg, 0, y + 42, `${state.title || 'Genogram'}  |  ${usedOnly ? 'the symbols, lines and colours used on this chart.' : 'every symbol, line and colour. Items marked * appear on this chart.'}`, { anchor: 'start', size: 10.5, fill: MUTED });
        } else if (r.h) {
          text(svg, 0, y + 20, r.h.toUpperCase(), { anchor: 'start', size: 11, weight: 'bold', fill: '#1d6c75' });
          el('line', { x1: 0, y1: y + 25, x2: GW, y2: y + 25, stroke: '#d3d9e1', 'stroke-width': 1 }, svg);
          r.noteLines.forEach((ln, i) => text(svg, 0, y + 38 + i * 13, ln, { anchor: 'start', size: 10, style: 'italic', fill: MUTED }));
        } else {
          r.draw(el('g', { transform: `translate(2 ${y + 6}) scale(1.8)` }, svg));
          r.labLines.forEach((ln, i) => text(svg, labelX, y + 18 + i * 14, (i === 0 && r.used ? '* ' : '') + ln, { anchor: 'start', size: 11, weight: 'bold' }));
          r.descLines.forEach((ln, i) => text(svg, descX, y + 18 + i * 13, ln, { anchor: 'start', size: 10, fill: r.desc ? INK : MUTED }));
          el('line', { x1: labelX, y1: y + r.height - 0.5, x2: GW, y2: y + r.height - 0.5, stroke: '#eef1f4', 'stroke-width': 1 }, svg);
        }
        y += r.height;
      }
      if (pages.length > 1) text(svg, GW, Ht - 2, `Guide ${pi + 1} of ${pages.length}`, { anchor: 'end', size: 9, fill: MUTED });
      return { svg, W: GW, H: Ht };
    });
    [INK, MUTED, SHEET] = saved;
    return out;
  }

  const fileBase = () => (state.title || 'genogram').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'genogram';
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function exportPDF(o) {
    if (!state.people.length) { toast('Add someone to the chart first.'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API.svg) {
      toast('The PDF library didn\'t load. Check that the vendor/ folder sits next to index.html.'); return;
    }
    const btn = $('#btnPdf'); btn.disabled = true; btn.textContent = 'Exporting…';
    const host = $('#exportHost');
    try {
      setPalette(state.canvas.color);
      const format = o.pageSize, m = 28;
      const main = o.chart ? buildDiagramSVG(o.guide && o.chartKey, o.chartKey) : null;
      const doc = new window.jspdf.jsPDF({ orientation: main && main.W >= main.H ? 'landscape' : 'portrait', unit: 'pt', format });
      let fresh = true;
      const newPage = () => { if (!fresh) doc.addPage(format, 'portrait'); fresh = false; };
      const place = async (page, fill) => {
        const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
        if (fill) { doc.setFillColor(fill); doc.rect(0, 0, pw, ph, 'F'); }
        host.replaceChildren(page.svg);
        const s = Math.min((pw - 2 * m) / page.W, (ph - 2 * m) / page.H, 1.25);
        await doc.svg(page.svg, { x: (pw - page.W * s) / 2, y: m, width: page.W * s, height: page.H * s });
      };
      const counts = [];
      if (main) {
        fresh = false;
        const bg = SHEET.toLowerCase();
        await place(main, bg !== '#ffffff' && bg !== DEFAULT_BG ? SHEET : null);
        counts.push('the chart');
      }
      // portrait pages are laid out for the portrait page height
      const portraitH = () => { const [w, h] = [doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight()]; return Math.max(w, h) - 2 * m; };
      let rows = null;
      if (o.report) {
        rows = reportRows(o);
        newPage();
        const pages = buildReportPages(rows, portraitH());
        for (let i = 0; i < pages.length; i++) { if (i) doc.addPage(format, 'portrait'); await place(pages[i]); }
        counts.push(`${pages.length} summary page${pages.length > 1 ? 's' : ''}`);
      }
      if (o.guide) {
        newPage();
        const guide = buildGuidePages(portraitH(), o.guideUsedOnly);
        for (let i = 0; i < guide.length; i++) { if (i) doc.addPage(format, 'portrait'); await place(guide[i]); }
        counts.push(`${guide.length} guide page${guide.length > 1 ? 's' : ''}`);
      }
      doc.setProperties({ title: state.title || 'Genogram', creator: 'Genogram Builder' });
      doc.save(fileBase() + '.pdf');
      if (o.txt && rows) download(new Blob(['\ufeff' + reportText(rows)], { type: 'text/plain;charset=utf-8' }), fileBase() + '-relationships.txt');
      toast(`PDF exported: ${counts.join(', ')}.${o.txt && rows ? ' The text file is saved too.' : ''}`);
    } catch (err) {
      console.error(err);
      toast('PDF export failed: ' + err.message);
    } finally {
      host.replaceChildren();
      renderBackground();
      btn.disabled = false; btn.textContent = 'Export PDF…';
    }
  }

  // ---------- export options dialog ----------
  const EXPORT_KEY = STORE + '.export';
  const EXPORT_DEFAULTS = {
    pageSize: 'letter', chart: true, chartKey: true, report: true, guide: true, guideUsedOnly: false,
    rOverview: true, rIndex: true, rPeople: true,
    pSex: true, pYears: true, pEth: true, pCond: true, pNote: true,
    pParents: true, pSiblings: true, pPartners: true, pChildren: true, pExtended: true, pLinks: true,
    rCouples: true, rFamilies: true, rLinks: true, rEth: true, rCond: true, rMeanings: true, txt: false
  };
  // [key, label, sub-options]; a section with `need` is switched off along with that option
  const EXPORT_FORM = [
    { h: 'Pages to include', items: [
      ['chart', 'The genogram chart', [['chartKey', 'Key of symbols under the chart']]],
      ['report', 'Relationship summary: the family written out in words'],
      ['guide', 'Guide explaining every symbol and line', [['guideUsedOnly', 'Only what appears on this chart']]]
    ] },
    { h: 'In the relationship summary', need: 'report', items: [
      ['rOverview', 'Overview: how many people, couples and lines'],
      ['rIndex', 'How everyone is related to the index person'],
      ['rPeople', 'Person by person', [
        ['pSex', 'Sex'], ['pYears', 'Years and age'], ['pEth', 'Ethnicity'], ['pCond', 'Conditions'], ['pNote', 'Notes'],
        ['pParents', 'Parents'], ['pSiblings', 'Brothers and sisters'], ['pPartners', 'Partners'], ['pChildren', 'Children'],
        ['pExtended', '"Other family" (grandparents, aunts, uncles, cousins, in-laws, step-family)'], ['pLinks', 'Connection lines']
      ]],
      ['rCouples', 'List of couples'],
      ['rFamilies', 'List of parents and their children'],
      ['rLinks', 'List of connection lines, each with its coloured line'],
      ['rEth', 'Ethnic backgrounds in the family'],
      ['rCond', 'Who has each condition'],
      ['rMeanings', 'Explain what each line and condition means']
    ] },
    { h: 'Also', need: 'report', items: [
      ['txt', 'Save the relationship summary as a text file too (easy to paste into an email or letter)']
    ] }
  ];
  function loadExportOpts() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem(EXPORT_KEY) || '{}') || {}; } catch (_) { o = {}; }
    try { const ps = localStorage.getItem(STORE + '.page'); if (ps && !o.pageSize) o.pageSize = ps; } catch (_) { /* ignore */ }
    return Object.assign({}, EXPORT_DEFAULTS, o);
  }
  const dlg = $('#exportDlg');
  function openExport() {
    if (!state.people.length) { toast('Add someone to the chart first.'); return; }
    const o = loadExportOpts();
    const index = state.people.find(p => p.proband);
    const box = (k, label) => `<label class="check"><input type="checkbox" data-opt="${k}"${o[k] ? ' checked' : ''}>${esc(label)}${
      k === 'rIndex' && !index ? ' <span class="hint">(no index person marked yet)</span>' : ''}</label>`;
    const item = ([k, label, subs]) => box(k, label) + (subs && subs.length ? `<div class="subopts" data-parent="${k}">${subs.map(s => box(...s)).join('')}</div>` : '');
    dlg.innerHTML = `
      <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
        <h2 id="dlgTitle">Export PDF</h2>
        <label class="field"><span>Paper size</span>
          <select id="x_page">${[['letter', 'Letter'], ['a4', 'A4'], ['legal', 'Legal'], ['a3', 'A3']].map(([v, l]) => `<option value="${v}"${o.pageSize === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
        </label>
        ${EXPORT_FORM.map(sec => `<fieldset${sec.need ? ` data-need="${sec.need}"` : ''}><legend>${esc(sec.h)}</legend>${sec.items.map(item).join('')}</fieldset>`).join('')}
        <div class="dlg-foot">
          <button type="button" id="x_all" class="small">Tick everything</button>
          <span class="spacer"></span>
          <button type="button" id="x_cancel">Cancel</button>
          <button type="button" id="x_go" class="primary">Export PDF</button>
        </div>
      </div>`;
    dlg.hidden = false;
    syncExport();
    $('#x_go').focus();
  }
  function readExport() {
    const o = { pageSize: $('#x_page').value };
    dlg.querySelectorAll('[data-opt]').forEach(c => { o[c.dataset.opt] = c.checked; });
    return o;
  }
  function syncExport() {                                   // grey out options whose parent is off
    const o = readExport();
    dlg.querySelectorAll('.subopts').forEach(d => d.classList.toggle('off', !o[d.dataset.parent]));
    dlg.querySelectorAll('fieldset[data-need]').forEach(f => f.classList.toggle('off', !o[f.dataset.need]));
    $('#x_go').disabled = !(o.chart || o.report || o.guide);
  }
  const closeExport = () => { dlg.hidden = true; dlg.replaceChildren(); $('#btnPdf').focus(); };
  dlg.addEventListener('change', syncExport);
  dlg.addEventListener('click', e => {
    if (e.target === dlg) { closeExport(); return; }
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'x_cancel') closeExport();
    else if (b.id === 'x_all') { dlg.querySelectorAll('[data-opt]').forEach(c => { if (c.dataset.opt !== 'guideUsedOnly') c.checked = true; }); syncExport(); }
    else if (b.id === 'x_go') {
      const o = readExport();
      try { localStorage.setItem(EXPORT_KEY, JSON.stringify(o)); } catch (_) { /* ignore */ }
      closeExport();
      exportPDF(o);
    }
  });

  function exportSVG() {
    if (!state.people.length) { toast('Add someone to the chart first.'); return; }
    setPalette(state.canvas.color);
    const { svg } = buildDiagramSVG(false);
    download(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), fileBase() + '.svg');
  }

  function saveJSON() {
    download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), fileBase() + '.genogram.json');
    toast('Saved.');
  }
  $('#fileInput').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const s = JSON.parse(await f.text());
      if (!s || !Array.isArray(s.people) || !Array.isArray(s.unions)) throw new Error('not a genogram file');
      commit(); state = normalize(s); sel = null; mode = null;
      renderAll(); fit();
      toast(`Opened ${f.name}.`);
    } catch (err) { toast(`Couldn't open ${f.name}: ${err.message}.`); }
  });

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  // ---------- top bar ----------
  let newArmed = false;
  $('#btnNew').addEventListener('click', () => {
    const b = $('#btnNew');
    if (!newArmed && state.people.length) {
      newArmed = true; b.textContent = 'Click again to clear';
      setTimeout(() => { newArmed = false; b.textContent = 'New'; }, 3000);
      return;
    }
    newArmed = false; b.textContent = 'New';
    commit();
    const keep = { conditions: state.conditions, custom: state.custom, canvas: state.canvas };
    state = Object.assign(blank(), keep);         // a new chart keeps your conditions, types and background
    sel = null; mode = null; renderAll(); fit();
  });
  $('#btnSample').addEventListener('click', () => { commit(); state = sample(); sel = null; mode = null; renderAll(); fit(); });
  $('#btnAddPerson').addEventListener('click', addPerson);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);
  $('#btnFit').addEventListener('click', fit);
  $('#btnTypes').addEventListener('click', () => { sel = null; mode = null; renderAll(); panel.scrollTop = 0; });
  $('#btnLink').addEventListener('click', () => {
    if (mode) { mode = null; renderAll(); return; }
    startLink(null, pick.spec);
  });
  $('#linkSpec').addEventListener('change', e => {
    pick.spec = e.target.value;
    if (mode) { mode.spec = pick.spec; renderMode(); }
  });
  $('#btnOpen').addEventListener('click', () => $('#fileInput').click());
  $('#btnSave').addEventListener('click', saveJSON);
  $('#btnPdf').addEventListener('click', openExport);
  $('#btnSvg').addEventListener('click', exportSVG);
  $('#btnZoomIn').addEventListener('click', () => { const r = stage.getBoundingClientRect(); zoomAt(1.2, r.width / 2, r.height / 2); });
  $('#btnZoomOut').addEventListener('click', () => { const r = stage.getBoundingClientRect(); zoomAt(1 / 1.2, r.width / 2, r.height / 2); });
  $('#docTitle').addEventListener('focus', () => commit());
  $('#docTitle').addEventListener('input', e => { state.title = e.target.value; persist(); });

  // ---------- boot ----------
  state = load() || sample();
  renderAll();
  requestAnimationFrame(fit);
  window.addEventListener('resize', () => renderCanvas());
})();
