// Scolia Color Changer v5
// Strategy: Replace colors in <style> tags and CSS rules TEXT directly
// This preserves transparency/alpha correctly since we only swap the hue

const DEFAULT_GREEN = '#5aab30';
let currentColor = DEFAULT_GREEN;
let observer = null;
let patchInterval = null;
let _insertRuleHooked = false;

// ─── Color math ───────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#','');
  return { r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16) };
}
function rgbToHex(r,g,b) {
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function hexToHsl(hex) {
  let {r,g,b}=hexToRgb(hex); r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}else{const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
  return{h:h*360,s:s*100,l:l*100};
}
function hslToHex(h,s,l) {
  s/=100;l/=100;const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0');};
  return `#${f(0)}${f(8)}${f(4)}`;
}
function isGreen(hex) {
  try{const{h,s,l}=hexToHsl(hex);return h>=75&&h<=175&&s>12&&l>3&&l<97;}catch(e){return false;}
}

// Remap a green hex to the equivalent shade of target color, preserving lightness
function remap(srcHex, tgtHex) {
  try {
    const s=hexToHsl(srcHex), t=hexToHsl(tgtHex);
    const newL = t.l + (s.l - 50) * 0.55;
    const newS = Math.min(100, t.s * (s.s / 55));
    return hslToHex(t.h, Math.max(0,Math.min(100,newS)), Math.max(3,Math.min(97,newL)));
  } catch(e){ return tgtHex; }
}

function parseColorStr(val) {
  if(!val) return null; val=val.trim();
  if(val.startsWith('#')) {
    if(val.length===4) val='#'+val[1]+val[1]+val[2]+val[2]+val[3]+val[3];
    if(val.length===7) return val.toLowerCase();
  }
  const m=val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if(m) return rgbToHex(+m[1],+m[2],+m[3]);
  return null;
}

// ─── The key function: replace green colors in a CSS text string ──────────────
// This correctly preserves rgba() alpha values!

function patchCSSText(css, tgt) {
  if(!css || typeof css !== 'string') return css;
  
  // Replace rgba(r,g,b,a) - MUST come before rgb() to avoid partial match
  css = css.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, (match,r,g,b,a) => {
    const hex = rgbToHex(+r,+g,+b);
    if(!isGreen(hex)) return match;
    const mapped = remap(hex, tgt);
    const {r:nr,g:ng,b:nb} = hexToRgb(mapped);
    return `rgba(${nr},${ng},${nb},${a})`; // alpha preserved!
  });

  // Replace rgb(r,g,b)
  css = css.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (match,r,g,b) => {
    const hex = rgbToHex(+r,+g,+b);
    if(!isGreen(hex)) return match;
    const mapped = remap(hex, tgt);
    const {r:nr,g:ng,b:nb} = hexToRgb(mapped);
    return `rgb(${nr},${ng},${nb})`;
  });

  // Replace hex colors #rrggbb and #rgb
  css = css.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
    let hex = match;
    if(hex.length===4) hex='#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    if(isGreen(hex.toLowerCase())) return remap(hex.toLowerCase(), tgt);
    return match;
  });

  return css;
}

// ─── Patch <style> tags ───────────────────────────────────────────────────────

function patchStyleEl(el, tgt) {
  if(!el || el.id.startsWith('scolia-')) return;
  const orig = el.textContent;
  if(!orig || orig.length < 3) return;
  const patched = patchCSSText(orig, tgt);
  if(patched !== orig) el.textContent = patched;
}

function patchAllStyleEls(tgt) {
  document.querySelectorAll('style').forEach(el => patchStyleEl(el, tgt));
}

// ─── Patch inline [style] attributes ─────────────────────────────────────────
// Only patch color/border/outline/shadow - NOT background-color of transparent elements!

function patchInlineStyle(el, tgt) {
  const attr = el.getAttribute('style');
  if(!attr) return;
  const patched = patchCSSText(attr, tgt);
  if(patched !== attr) el.setAttribute('style', patched);
}

function patchAllInlineStyles(tgt) {
  document.querySelectorAll('[style]').forEach(el => patchInlineStyle(el, tgt));
}

// ─── Patch SVG fill/stroke attributes ────────────────────────────────────────

function patchSVGEl(el, tgt) {
  for(const attr of ['fill','stroke','stop-color','color']) {
    const val = el.getAttribute(attr);
    if(!val || val==='none' || val==='currentColor') continue;
    const hex = parseColorStr(val);
    if(hex && isGreen(hex)) el.setAttribute(attr, remap(hex, tgt));
  }
}

function patchAllSVG(tgt) {
  document.querySelectorAll('[fill],[stroke],[stop-color]').forEach(el => patchSVGEl(el, tgt));
}

// ─── Patch CSSOM (already-applied rules in CSSStyleSheet objects) ─────────────
// This is the main one that catches Tailwind's compiled classes

function patchCSSRule(rule, tgt) {
  if(!rule.style) return;
  try {
    for(const prop of Array.from(rule.style)) {
      const val = rule.style.getPropertyValue(prop);
      if(!val) continue;
      const patched = patchCSSText(val, tgt);
      if(patched !== val) {
        rule.style.setProperty(prop, patched, rule.style.getPropertyPriority(prop));
      }
    }
  } catch(e) {}
}

function patchRuleList(rules, tgt) {
  if(!rules) return;
  try {
    for(const rule of rules) {
      patchCSSRule(rule, tgt);
      if(rule.cssRules) patchRuleList(rule.cssRules, tgt);
    }
  } catch(e) {}
}

function patchAllCSSOM(tgt) {
  try {
    for(const sheet of document.styleSheets) {
      try { patchRuleList(sheet.cssRules || [], tgt); } catch(e) {}
    }
  } catch(e) {}
}

// ─── CSS variable override ────────────────────────────────────────────────────

function patchCSSVars(tgt) {
  const entries = [];
  try {
    for(const sheet of document.styleSheets) {
      try {
        for(const rule of sheet.cssRules||[]) {
          const sel = rule.selectorText||'';
          if(!rule.style || !(sel===':root'||sel==='html'||sel==='body')) continue;
          for(const prop of Array.from(rule.style)) {
            if(!prop.startsWith('--')) continue;
            const val = rule.style.getPropertyValue(prop).trim();
            const hex = parseColorStr(val);
            if(hex && isGreen(hex)) entries.push(`${prop}: ${remap(hex,tgt)} !important`);
          }
        }
      } catch(e) {}
    }
  } catch(e) {}

  let el = document.getElementById('scolia-var-override');
  if(!el){ el=document.createElement('style'); el.id='scolia-var-override'; document.head.appendChild(el); }
  el.textContent = entries.length ? `:root { ${entries.join('; ')} }` : '';
}

// ─── Hook insertRule so future dynamic CSS injections are also patched ─────────

function hookInsertRule(tgt) {
  if(_insertRuleHooked) return;
  _insertRuleHooked = true;
  const orig = CSSStyleSheet.prototype.insertRule;
  CSSStyleSheet.prototype.insertRule = function(rule, idx) {
    return orig.call(this, patchCSSText(rule, currentColor), idx!==undefined?idx:0);
  };
}

// ─── MutationObserver ─────────────────────────────────────────────────────────

function startObserver(tgt) {
  if(observer) observer.disconnect();
  let debounce;
  observer = new MutationObserver(mutations => {
    let hasNew = false;
    for(const m of mutations) {
      for(const node of m.addedNodes) {
        if(node.nodeType!==1) continue;
        hasNew = true;
        if(node.tagName==='STYLE') setTimeout(()=>patchStyleEl(node, tgt), 0);
        node.querySelectorAll?.('style').forEach(s=>setTimeout(()=>patchStyleEl(s,tgt),0));
      }
      if(m.type==='attributes') {
        const el = m.target;
        if(m.attributeName==='style') patchInlineStyle(el, tgt);
        if(['fill','stroke','stop-color'].includes(m.attributeName)) patchSVGEl(el, tgt);
        hasNew = true;
      }
    }
    if(hasNew) {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        patchAllInlineStyles(tgt);
        patchAllSVG(tgt);
      }, 40);
    }
  });
  observer.observe(document.documentElement, {
    childList:true, subtree:true, attributes:true,
    attributeFilter:['style','fill','stroke','stop-color','class']
  });
}

// ─── Main apply ───────────────────────────────────────────────────────────────

function applyColor(tgt) {
  currentColor = tgt;
  hookInsertRule(tgt);
  patchCSSVars(tgt);
  patchAllStyleEls(tgt);
  patchAllCSSOM(tgt);       // ← patches compiled Tailwind classes in CSSOM
  patchAllInlineStyles(tgt);
  patchAllSVG(tgt);
  startObserver(tgt);
}

// ─── Messages + init ──────────────────────────────────────────────────────────

window.addEventListener('message', e => {
  if(e.source===window && e.data?.type==='SCOLIA_COLOR_CHANGE') {
    applyColor(e.data.color);
    try{ chrome.storage.local.set({scoliaColor:e.data.color}); }catch(e){}
  }
});

function init(color) {
  applyColor(color);
  if(patchInterval) clearInterval(patchInterval);
  patchInterval = setInterval(() => {
    patchAllStyleEls(color);
    patchAllCSSOM(color);
    patchAllSVG(color);
    patchCSSVars(color);
  }, 2500);
  [200,500,1000,2000,4000].forEach(t => setTimeout(()=>applyColor(color), t));
}

try {
  chrome.storage.local.get(['scoliaColor'], res => {
    const color = res.scoliaColor;
    if(color && color.toLowerCase() !== DEFAULT_GREEN) {
      document.readyState==='loading'
        ? document.addEventListener('DOMContentLoaded',()=>init(color))
        : init(color);
    }
  });
} catch(e) {}
