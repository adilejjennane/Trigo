
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const PI = Math.PI;
const TAU = 2 * Math.PI;

function normalizeAngle(a) {
  let x = a % TAU;
  if (x < 0) x += TAU;
  return x;
}
function gcd(a, b) { if (!b) return a; return gcd(b, a % b); }
function simplifyFraction(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }
function radToNiceLabel(rad) {
  const k = rad / PI, tol = 1e-6;
  for (let q = 1; q <= 12; q++) {
    const num = Math.round(k * q);
    if (Math.abs(k * q - num) < tol) {
      const [n, d] = simplifyFraction(num, q);
      if (d === 1) { if (n === 0) return "0"; if (n === 1) return "π"; if (n === -1) return "-π"; return `${n}π`; }
      if (n === 0) return "0";
      const numStr = n === 1 ? "" : (n === -1 ? "-" : `${n}`);
      return `${numStr}π/${d}`;
    }
  }
  return `${(rad).toFixed(2)} rad`;
}
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const baseAngles = [0, PI/6, PI/4, PI/3, PI/2, 2*PI/3, 3*PI/4, 5*PI/6, PI, 7*PI/6, 5*PI/4, 4*PI/3, 3*PI/2, 5*PI/3, 7*PI/4, 11*PI/6];
function approxEqual(a,b,eps=1e-6){return Math.abs(normalizeAngle(a)-normalizeAngle(b))<eps;}

const STORAGE_KEY = "trigoTrainerV1";
function loadState(){ try{const raw = localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null;}catch{ return null; } }
function saveState(state){ try{localStorage.setItem(STORAGE_KEY, JSON.stringify(state));}catch{} }

const initialProgress = {
  flashcards: { attempts:0, correct:0, history:[] },
  visual: { attempts:0, correct:0, history:[] },
  steps: { attempts:0, correct:0, history:[] },
  equations: { attempts:0, correct:0, history:[] }
};

const FLASHCARDS = [
  { front: "Valeurs remarquables — sin", back: "sin(0)=0, sin(π/6)=1/2, sin(π/4)=√2/2, sin(π/3)=√3/2, sin(π/2)=1." },
  { front: "Valeurs remarquables — cos", back: "cos(0)=1, cos(π/6)=√3/2, cos(π/4)=√2/2, cos(π/3)=1/2, cos(π/2)=0." },
  { front: "Signes par quadrant", back: "Q1: sin+, cos+ • Q2: sin+, cos- • Q3: sin-, cos- • Q4: sin-, cos+" },
  { front: "Périodicité", back: "sin(x+2π)=sin x, cos(x+2π)=cos x. Période fondamentale 2π." },
  { front: "Parité", back: "sin(-x)=-sin x (impaire), cos(-x)=cos x (paire)." },
  { front: "Complémentaire", back: "sin(π/2 - x)=cos x, cos(π/2 - x)=sin x." },
  { front: "Formules d'addition (sin)", back: "sin(a±b)=sin a cos b ± cos a sin b." },
  { front: "Formules d'addition (cos)", back: "cos(a±b)=cos a cos b ∓ sin a sin b." },
  { front: "Angles associés (π±x)", back: "sin(π - x)=sin x, sin(π + x)=-sin x; cos(π - x)=-cos x, cos(π + x)=-cos x." },
  { front: "Double angle", back: "sin(2x)=2 sin x cos x; cos(2x)=cos^2 x - sin^2 x=1-2sin^2 x=2cos^2 x-1." },
  { front: "Identité fondamentale", back: "sin^2 x + cos^2 x = 1 (pour tout x)." },
  { front: "Tangente (rappel)", back: "tan x = sin x / cos x quand cos x ≠ 0; tan(x+π)=tan x." },
];

function Pill({active, onClick, children}){
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-full text-sm font-medium border ${active?"bg-black text-white border-black":"bg-white text-black border-gray-300"}`}>
      {children}
    </button>
  );
}
function Card({children}){ return <div className="rounded-2xl shadow-md p-4 bg-white">{children}</div> }
function SectionTitle({children}){ return <h2 className="text-lg font-semibold mb-2">{children}</h2> }

function TrigoCircle({angle, setAngle, showGuides=true}){
  const ref = useRef(null);
  const [size, setSize] = useState(280);
  useEffect(()=>{
    function onResize(){
      const w = ref.current?.parentElement?.clientWidth || 320;
      setSize(Math.min(360, Math.max(240, w - 20)));
    }
    onResize();
    window.addEventListener('resize', onResize);
    return ()=>window.removeEventListener('resize', onResize);
  },[]);

  const r = size/2 - 16;
  const cx = size/2, cy = size/2;
  const ax = cx + r * Math.cos(angle);
  const ay = cy - r * Math.sin(angle);

  function setFromEvent(e){
    const rect = ref.current.getBoundingClientRect();
    const x = (e.touches? e.touches[0].clientX: e.clientX) - rect.left;
    const y = (e.touches? e.touches[0].clientY: e.clientY) - rect.top;
    const dx = x - cx, dy = cy - y;
    let a = Math.atan2(dy, dx);
    if (a<0) a+= TAU;
    setAngle(a);
  }

  return (
    <div ref={ref} className="w-full flex justify-center">
      <svg width={size} height={size} className="touch-none select-none"
           onMouseDown={setFromEvent} onMouseMove={(e)=>{if(e.buttons===1) setFromEvent(e);}}
           onTouchStart={setFromEvent} onTouchMove={setFromEvent}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="#fafafa" stroke="#e5e7eb" strokeWidth={2} />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#e5e7eb" />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#e5e7eb" />
        <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="#111827" strokeWidth={2} markerEnd="url(#arrow)" />
        <circle cx={ax} cy={ay} r={6} fill="#111827" />
        {baseAngles.map((a,i)=>{
          const tx = cx + r * Math.cos(a), ty = cy - r * Math.sin(a);
          const ix = cx + (r-8)*Math.cos(a), iy = cy - (r-8)*Math.sin(a);
          return (<g key={i}><line x1={ix} y1={iy} x2={tx} y2={ty} stroke="#d1d5db" /></g>);
        })}
        {showGuides && (<>
          <line x1={ax} y1={ay} x2={ax} y2={cy} stroke="#60a5fa" strokeDasharray="4 4" />
          <line x1={ax} y1={ay} x2={cx} y2={ay} stroke="#34d399" strokeDasharray="4 4" />
        </>)}
      </svg>
    </div>
  );
}

function Flashcards({progress, updateProgress}){
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  function next(correct){
    const newProg = { ...progress };
    newProg.attempts += 1; if (correct) newProg.correct += 1;
    newProg.history.push({ t: Date.now(), score: newProg.correct/newProg.attempts });
    updateProgress(newProg); setFlipped(false); setI((i+1)%FLASHCARDS.length);
  }
  return (
    <Card>
      <SectionTitle>Flashcards — formules clés</SectionTitle>
      <div className={`rounded-xl border ${flipped?"bg-gray-900 text-white":"bg-white"} p-6 text-center`} onClick={()=>setFlipped(!flipped)}>
        <div className="text-sm text-gray-500 mb-2">Tape pour retourner</div>
        <div className="text-xl font-semibold min-h-[64px] flex items-center justify-center">
          {flipped? FLASHCARDS[i].back : FLASHCARDS[i].front}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={()=>next(false)} className="flex-1 px-3 py-2 rounded-xl border border-gray-300">Difficile</button>
        <button onClick={()=>next(true)} className="flex-1 px-3 py-2 rounded-xl bg-black text-white">Facile</button>
      </div>
    </Card>
  );
}

function VisualMode({progress, updateProgress}){
  const [angle, setAngle] = useState(randChoice(baseAngles));
  const [target, setTarget] = useState(()=>makeVisualQuestion());

  function makeVisualQuestion(){
    const a = randChoice(baseAngles);
    const kind = Math.random()<0.5?"sign":"value";
    if (kind === "sign") {
      return { kind, a, prompt: `À l'angle ${radToNiceLabel(a)}, quels sont les signes de sin et cos ?`,
        options:["sin+, cos+","sin+, cos-","sin-, cos-","sin-, cos+"],
        answer: signIndex(a) };
    } else {
      const useSin = Math.random()<0.5;
      const val = exactValue(useSin?"sin":"cos", a);
      return { kind, a, prompt: `${useSin?"sin":"cos"}(${radToNiceLabel(a)}) = ?`, options: shuffle([val, ...distractors(val)]), answer:0 };
    }
  }
  function signIndex(a){ const s = Math.sin(a), c = Math.cos(a);
    if (s>0 && c>0) return 0; if (s>0 && c<0) return 1; if (s<0 && c<0) return 2; return 3; }
  function exactValue(kind, a){
    const t = 1/Math.sqrt(2), u = Math.sqrt(3)/2, r = normalizeAngle(a);
    const ra = [0, PI/6, PI/4, PI/3, PI/2];
    const vals = { sin: {0:0,[PI/6]:1/2,[PI/4]:t,[PI/3]:u,[PI/2]:1}, cos: {0:1,[PI/6]:u,[PI/4]:t,[PI/3]:1/2,[PI/2]:0} };
    function valLabel(x){
      if (Math.abs(x) < 1e-9) return "0";
      if (Math.abs(x-1) < 1e-6) return "1";
      if (Math.abs(x+1) < 1e-6) return "-1";
      if (Math.abs(Math.abs(x)-t) < 1e-6) return (x>0?"√2/2":"-√2/2");
      if (Math.abs(Math.abs(x)-u) < 1e-6) return (x>0?"√3/2":"-√3/2");
      if (Math.abs(Math.abs(x)-0.5) < 1e-6) return (x>0?"1/2":"-1/2");
      return x.toFixed(3);
    }
    const quad = r <= PI/2 ? 1 : r <= PI ? 2 : r <= 3*PI/2 ? 3 : 4;
    let ref = r; if (quad===2) ref = PI - r; else if (quad===3) ref = r - PI; else if (quad===4) ref = TAU - r;
    let closest = ra.reduce((p,c)=> Math.abs(c-ref) < Math.abs(p-ref)? c: p, 0);
    let base = vals[kind][closest];
    if (kind==="sin"){ if (quad===3||quad===4) base = -base; } else { if (quad===2||quad===3) base = -base; }
    return valLabel(base);
  }
  function distractors(trueLabel){
    const pool = ["0","1","-1","√2/2","-√2/2","√3/2","-√3/2","1/2","-1/2"]; 
    const out = []; while (out.length<3){ const c = randChoice(pool); if (!out.includes(c) && c!==trueLabel) out.push(c); }
    return out;
  }
  function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
  function answer(idx){
    const correct = idx===target.answer;
    const newProg={...progress}; newProg.attempts++; if(correct) newProg.correct++;
    newProg.history.push({t:Date.now(), score:newProg.correct/newProg.attempts});
    updateProgress(newProg); setTarget(makeVisualQuestion()); setAngle(randChoice(baseAngles));
  }
  return (
    <Card>
      <SectionTitle>Exercices visuels — cercle trigonométrique</SectionTitle>
      <div className="text-sm text-gray-500 mb-2">Déplace le point sur le cercle au doigt, puis réponds au quiz.</div>
      <TrigoCircle angle={angle} setAngle={setAngle} />
      <div className="mt-4">
        <div className="font-medium mb-2">{target.prompt}</div>
        <div className="grid grid-cols-2 gap-2">
          {target.options.map((opt,idx)=>
            <button key={idx} onClick={()=>answer(idx)} className="px-3 py-2 rounded-xl border border-gray-300">{opt}</button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StepsMode({progress, updateProgress}){
  const [x, setX] = useState(PI/6);
  const [formula, setFormula] = useState("sin(π − x)");
  const steps = useMemo(()=>{
    const f = formula.replaceAll(" ", "");
    const isSin = f.startsWith("sin");
    const isPiMinus      = f.includes("π−x") || f.includes("π-x");
    const isPiPlus       = f.includes("π+x");
    const isPiOver2Minus = f.includes("π/2−x") || f.includes("π/2-x");
    const isPiOver2Plus  = f.includes("π/2+x");

    const out = [];
    out.push({ desc: "Angle de départ x sur le cercle.", angle: x });

    if (isPiMinus) {
      out.push({ desc: "Symétrie par rapport à Oy (π − x).", angle: normalizeAngle(PI - x) });
    } else if (isPiPlus) {
      out.push({ desc: "Translation de π (symétrie centrale).", angle: normalizeAngle(x + PI) });
    } else if (isPiOver2Minus) {
      out.push({ desc: "Complémentaire : on prend l’angle π/2 − x.", angle: normalizeAngle(PI/2 - x) });
    } else if (isPiOver2Plus) {
      out.push({ desc: "Complémentaire décalé : on prend l’angle π/2 + x.", angle: normalizeAngle(PI/2 + x) });
    }

    let labelRight = "";
    if (isPiOver2Minus) labelRight = isSin ? "cos x" : "sin x";
    else if (isPiOver2Plus) labelRight = isSin ? "cos x" : "-sin x";
    else if (isPiMinus) labelRight = isSin ? "sin x" : "-cos x";
    else if (isPiPlus) labelRight = isSin ? "-sin x" : "-cos x";
    else labelRight = isSin ? "sin x" : "cos x";

    const sVal = Math.sin(x), cVal = Math.cos(x);
    let result;
    if (isPiOver2Minus) result = isSin ? cVal : sVal;
    else if (isPiOver2Plus) result = isSin ? cVal : -sVal;
    else if (isPiMinus)     result = isSin ?  sVal : -cVal;
    else if (isPiPlus)      result = isSin ? -sVal : -cVal;
    else                    result = isSin ?  sVal :  cVal;

    out.push({ desc: `Conclusion : ${f} = ${labelRight}.`, angle: out.at(-1).angle, result });
    return out;
  }, [x, formula]);

  function validate(){
    const newProg={...progress}; newProg.attempts++; newProg.correct++;
    newProg.history.push({t:Date.now(), score:newProg.correct/newProg.attempts});
    updateProgress(newProg);
  }

  return (
    <Card>
      <SectionTitle>Étapes guidées — angles associés</SectionTitle>
      <div className="flex flex-col gap-3">
        <label className="text-sm">Choisis une formule à illustrer</label>
        <div className="grid grid-cols-2 gap-2">
          {["sin(π − x)", "sin(π + x)", "cos(π − x)", "cos(π + x)", "sin(π/2 − x)", "cos(π/2 − x)", "sin(π/2 + x)", "cos(π/2 + x)"].map(f=>
            <button key={f} className={`px-3 py-2 rounded-xl border ${formula===f?"bg-black text-white border-black":"border-gray-300"}`} onClick={()=>{setFormula(f);}}>{f}</button>
          )}
        </div>
        <label className="text-sm">Choisis x</label>
        <input type="range" min={0} max={TAU} step={0.01} value={x} onChange={e=>setX(Number(e.target.value))} />
        <div className="text-sm text-gray-500">x = {radToNiceLabel(x)}</div>
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="font-medium mb-2">Illustration</div>
          <TrigoCircle angle={steps.at(0).angle} setAngle={()=>{}} />
          {steps.length>1 && <>
            <div className="mt-3"><TrigoCircle angle={steps.at(1).angle} setAngle={()=>{}} /></div>
          </>}
          <div className="mt-2">{steps.at(-1).desc}</div>
          {steps.at(-1).result!==undefined && (
            <div className="mt-2 text-sm text-green-600">Valeur numérique (pour x choisi) : {(steps.at(-1).result).toFixed(3)}</div>
          )}
          <div className="mt-3">
            <button className="px-3 py-2 rounded-xl border border-gray-300" onClick={validate}>Marquer comme compris</button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EquationsMode({progress, updateProgress}){
  const [question, setQuestion] = useState(makeEqQuestion());
  function toBase(term){
    const isSin = term.startsWith("sin");
    if (term.includes("π/2 − x")||term.includes("π/2 - x")) return { kind: isSin?"cos":"sin", sign: +1 };
    if (term.includes("π/2 + x")) return { kind: isSin?"cos":"sin", sign: isSin? +1 : -1 };
    if (term.includes("π − x")||term.includes("π - x")) return { kind: isSin?"sin":"cos", sign: isSin? +1 : -1 };
    if (term.includes("π + x")) return { kind: isSin?"sin":"cos", sign: -1 };
    return { kind:isSin?"sin":"cos", sign:1 };
  }
  function makeEqQuestion(){
    const left = randChoice(["sin x","cos x"]);
    const forms = [
      "sin(π − x)", "sin(π + x)", "cos(π − x)", "cos(π + x)",
      "sin(π/2 − x)", "cos(π/2 − x)", "sin(π/2 + x)", "cos(π/2 + x)"
    ];
    const right = randChoice(forms);
    const eqLabel = `${left} = ${right}`;
    const L = toBase(left), R = toBase(right);
    const sols = (()=>{
      const list=[]; for (let a of baseAngles){
        const s = Math.sin(a), c = Math.cos(a);
        const leftVal = (L.kind==="sin"? s: c) * L.sign;
        const rightVal = (R.kind==="sin"? s: c) * R.sign;
        if (Math.abs(leftVal - rightVal) < 1e-6) list.push(a);
      }
      const uniq=[]; list.forEach(a=>{ if(!uniq.some(b=>approxEqual(a,b))) uniq.push(a)});
      return uniq.sort((x,y)=>x-y);
    })();
    function fmt(list){ return list.length? list.map(radToNiceLabel).join(", ") : "∅"; }
    const correct = fmt(sols);
    const opts = [correct];
    const all = [...baseAngles];
    while (opts.length<4){
      const k = Math.max(0, Math.min(4, Math.floor(Math.random()*4)));
      const fake = fmt(all.sort(()=>Math.random()-0.5).slice(0,k));
      if (!opts.includes(fake)) opts.push(fake);
    }
    const shuffled = opts.sort(()=>Math.random()-0.5);
    return { eqLabel, options: shuffled, answerIdx: shuffled.indexOf(correct) };
  }
  function submit(idx){
    const correct = idx===question.answerIdx;
    const newProg={...progress}; newProg.attempts++; if(correct) newProg.correct++;
    newProg.history.push({t:Date.now(), score:newProg.correct/newProg.attempts});
    updateProgress(newProg); setQuestion(makeEqQuestion());
  }
  return (
    <Card>
      <SectionTitle>Équations trigonométriques (angles remarquables)</SectionTitle>
      <div className="mb-2 text-sm text-gray-600">Résous dans [0, 2π). Choisis la bonne liste de solutions.</div>
      <div className="p-3 rounded-xl bg-gray-50 border">{question.eqLabel}</div>
      <div className="grid grid-cols-1 gap-2 mt-3">
        {question.options.map((opt,idx)=>
          <button key={idx} onClick={()=>submit(idx)} className="text-left px-3 py-2 rounded-xl border">{`{ ${opt} }`}</button>
        )}
      </div>
    </Card>
  );
}

function ProgressView({store}){
  const data = useMemo(()=>{
    const arr=[]; for (const [mode, obj] of Object.entries(store.progress)){
      for (const h of obj.history){ arr.push({ mode, t:h.t, score: Math.round(h.score*100) }); }
    }
    return arr.sort((a,b)=>a.t-b.t).map(p=> ({...p, label: new Date(p.t).toLocaleDateString(undefined,{month:'short', day:'numeric'}) }));
  },[store.progress]);
  const summary = Object.fromEntries(Object.entries(store.progress).map(([k,v])=>[k, { rate: v.attempts? Math.round(100*v.correct/v.attempts): 0, attempts: v.attempts }]));
  return (
    <Card>
      <SectionTitle>Progression</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(summary).map(([mode, s])=> (
          <div key={mode} className="p-3 rounded-xl border bg-gray-50">
            <div className="text-sm text-gray-600">{mode}</div>
            <div className="text-2xl font-semibold">{s.rate}%</div>
            <div className="text-xs text-gray-500">{s.attempts} questions</div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{left:12,right:12}}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
            <Tooltip formatter={(v)=>`${v}%`} labelFormatter={(l,i)=> `${data[i]?.mode || ''}`} />
            <Line type="monotone" dataKey="score" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function TrigoTrainer(){
  const [tab, setTab] = useState("flashcards");
  const [store, setStore] = useState(()=>{
    const s = loadState();
    return s || { progress: JSON.parse(JSON.stringify(initialProgress)) };
  });
  useEffect(()=>{ saveState(store); },[store]);
  function updateProgress(mode){ return (newProg)=> setStore(s=> ({ ...s, progress: { ...s.progress, [mode]: newProg } })); }

  return (
    <div className="min-h-screen text-gray-900 p-4 max-w-xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">TrigoTrainer • Cercle trigonométrique</h1>
        <div className="text-sm text-gray-600">Terminale (programme FR) — mobile-first</div>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[["flashcards","Flashcards"],["visual","Cercle (visuel)"],["steps","Étapes guidées"],["equations","Équations"],["progress","Progression"]].map(([key,label])=> (
          <Pill key={key} active={tab===key} onClick={()=>setTab(key)}>{label}</Pill>
        ))}
      </div>

      {tab==="flashcards" && (<Flashcards progress={store.progress.flashcards} updateProgress={updateProgress("flashcards")} />)}
      {tab==="visual" && (<VisualMode progress={store.progress.visual} updateProgress={updateProgress("visual")} />)}
      {tab==="steps" && (<StepsMode progress={store.progress.steps} updateProgress={updateProgress("steps")} />)}
      {tab==="equations" && (<EquationsMode progress={store.progress.equations} updateProgress={updateProgress("equations")} />)}
      {tab==="progress" && (<ProgressView store={store} />)}

      <footer className="mt-6 text-xs text-gray-500">
        Astuce : sur mobile, touche le cercle pour régler l'angle. Les scores sont sauvegardés automatiquement en local.
      </footer>
    </div>
  );
}
