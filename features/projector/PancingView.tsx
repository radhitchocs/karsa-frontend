'use client';

import { useEffect, useRef } from 'react';
import type { Participant } from '@/domain/model';

const NS = 'http://www.w3.org/2000/svg';
const VARIANTS = ['round', 'slim', 'fat'] as const;
const ROWS = [215, 345, 475, 605];
const COLORS = [
  { body: '#FFD93D', fin: '#FF9F43', belly: '#FFF4D6' },
  { body: '#FF6B9D', fin: '#B197FC', belly: '#FFE8F3' },
  { body: '#6BCBFF', fin: '#7DFFB3', belly: '#E0F7FF' },
  { body: '#7DFFB3', fin: '#FF6B9D', belly: '#E0FFF5' },
  { body: '#FF9F43', fin: '#FFD93D', belly: '#FFF4D6' },
  { body: '#B197FC', fin: '#6BCBFF', belly: '#EDE8FF' },
];
const BODY_RX: Record<string, number> = { round: 85, slim: 105, fat: 90 };

const trunc = (n: string) => (n.length > 12 ? n.slice(0, 11) + '…' : n);

function fit(t: SVGTextElement, maxW: number) {
  let fs = 22;
  t.setAttribute('font-size', String(fs));
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  const w = t.getComputedTextLength();
  if (w > maxW) {
    fs = Math.max(10, Math.floor((fs * maxW) / w));
    t.setAttribute('font-size', String(fs));
  }
}

function fitBanner(t: SVGTextElement, maxW: number, maxFs: number) {
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  let fs = maxFs;
  t.setAttribute('font-size', String(fs));
  while (fs > 14 && t.getComputedTextLength() > maxW) {
    fs -= 2;
    t.setAttribute('font-size', String(fs));
  }
}

function spawnFish(
  school: SVGGElement,
  pid: string,
  name: string,
  v: string,
  colors: { body: string; fin: string; belly: string },
  y: number,
  x0: number,
  dur: number,
  delay: number,
  left: boolean,
) {
  const wagDur = Math.max(0.35, 0.55 - (34 / dur) * 0.25);

  const lane = document.createElementNS(NS, 'g');
  lane.setAttribute('class', `lane swim${left ? ' left' : ''}`);
  lane.dataset.pid = pid;
  lane.dataset.v = v;
  lane.style.cssText = [
    `--y:${y}px`,
    `--x0:${x0}px`,
    `--dur:${dur}s`,
    `--delay:${delay}s`,
    `--fish-color:${colors.body}`,
    `--fin-color:${colors.fin}`,
    `--belly-color:${colors.belly}`,
    `--wag-dur:${wagDur}s`,
  ].join(';');

  const burst = document.createElementNS(NS, 'use');
  burst.setAttribute('class', 'burst');
  burst.setAttribute('href', '#pp-burst');
  burst.setAttribute('x', '-150'); burst.setAttribute('y', '-150');
  burst.setAttribute('width', '300'); burst.setAttribute('height', '300');
  lane.appendChild(burst);

  const aim = document.createElementNS(NS, 'circle');
  aim.setAttribute('class', 'aim'); aim.setAttribute('r', '95');
  lane.appendChild(aim);

  const drift = document.createElementNS(NS, 'g');
  drift.setAttribute('class', 'drift');
  const driftDelay = (Math.random() * -8).toFixed(2);
  const driftDur = (5 + Math.random() * 4).toFixed(1);
  drift.style.cssText = `--drift-delay:${driftDelay}s;--drift-dur:${driftDur}s`;

  const sc = document.createElementNS(NS, 'g');
  sc.setAttribute('transform', 'scale(.85)');

  const bob = document.createElementNS(NS, 'g');
  bob.setAttribute('class', 'bob');
  bob.style.animationDelay = `${(-Math.random() * 2).toFixed(2)}s`;

  const undulate = document.createElementNS(NS, 'g');
  undulate.setAttribute('class', 'undulate');
  undulate.style.animationDelay = `${(-Math.random() * 1.5).toFixed(2)}s`;

  const fishWag = document.createElementNS(NS, 'g');
  fishWag.setAttribute('class', 'fish wag');

  const labelClones: SVGElement[] = [];
  const symbol = document.getElementById(`pp-fish-${v}`);
  if (symbol) {
    for (const ch of Array.from(symbol.children)) {
      const el = ch as SVGElement;
      if (el.classList.contains('label')) {
        labelClones.push(el.cloneNode(true) as SVGElement);
      } else {
        fishWag.appendChild(el.cloneNode(true));
      }
    }
  }
  fishWag.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  if (left) fishWag.querySelector('.flip')?.setAttribute('transform', 'scale(-1 1)');

  undulate.appendChild(fishWag);
  bob.appendChild(undulate);
  // label appended AFTER undulate so it paints on top of fish body
  labelClones.forEach((lc) => bob.appendChild(lc));
  sc.appendChild(bob);
  drift.appendChild(sc);
  lane.appendChild(drift);
  school.appendChild(lane);

  const t = bob.querySelector('text') as SVGTextElement | null;
  if (t) {
    t.textContent = trunc(name);
    const label = bob.querySelector('.label') as SVGElement | null;
    const maxW = Number((label as SVGGElement | null)?.dataset?.w ?? 108);
    fit(t, maxW);
  }

  return lane;
}

// ── SVG Symbols + CSS ─────────────────────────────────────────────────────────

const SYMBOLS_HTML = `
<style>
:root{--ink:#000;--fish-color:#FFD93D;--fin-color:#FF9F43;--belly-color:#FFF4D6}
symbol *{stroke:var(--ink);stroke-width:4;stroke-linejoin:round;stroke-linecap:round}
symbol text{stroke:none}
.body{fill:var(--fish-color)}
.belly{fill:var(--belly-color);stroke-width:2}
.tail,.fin{fill:var(--fin-color)}
.tail-tip{fill:var(--fin-color)}
.gill{fill:none;stroke-width:3}
.mouth{fill:none}
.plate{fill:#FFF4D6}
.name{font-family:"Arial Black","Segoe UI Black",ui-sans-serif,system-ui,sans-serif;font-weight:800;fill:#000}
.lane{transform:translate(var(--x0),var(--y));will-change:transform}
.swim{animation:swim-r var(--dur,40s) linear var(--delay,0s) infinite}
.swim.left{animation-name:swim-l}
@keyframes swim-r{from{transform:translate(-260px,var(--y))}to{transform:translate(1540px,var(--y))}}
@keyframes swim-l{from{transform:translate(1540px,var(--y))}to{transform:translate(-260px,var(--y))}}
.drift{animation:drift var(--drift-dur,7s) ease-in-out var(--drift-delay,0s) infinite alternate}
@keyframes drift{from{transform:translateY(-10px) rotate(-3deg)}to{transform:translateY(10px) rotate(3deg)}}
.bob{animation:bob 2.2s ease-in-out infinite alternate}
@keyframes bob{from{transform:translateY(-5px)}to{transform:translateY(5px)}}
.undulate{transform-box:fill-box;transform-origin:center;animation:undulate var(--wag-dur,.5s) ease-in-out infinite alternate}
@keyframes undulate{from{transform:scaleX(.97) rotate(-1.5deg)}to{transform:scaleX(1.03) rotate(1.5deg)}}
.wag .tail-root{transform-box:fill-box;transform-origin:100% 50%;animation:wag-root var(--wag-dur,.5s) ease-in-out infinite alternate}
.wag .tail-tip{transform-box:fill-box;transform-origin:100% 50%;animation:wag-tip var(--wag-dur,.5s) ease-in-out calc(var(--wag-dur,.5s)*.15) infinite alternate}
@keyframes wag-root{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
@keyframes wag-tip{from{transform:rotate(-18deg)}to{transform:rotate(18deg)}}
.wag .fin-dorsal{transform-box:fill-box;transform-origin:50% 100%;animation:flap-d var(--wag-dur,.5s) ease-in-out infinite alternate-reverse}
.wag .fin-pec{transform-box:fill-box;transform-origin:0% 50%;animation:flap-p calc(var(--wag-dur,.5s)*1.3) ease-in-out infinite alternate}
@keyframes flap-d{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
@keyframes flap-p{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
.eye{transform-box:fill-box;transform-origin:center;animation:blink 4s infinite}
@keyframes blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.08)}}
.burst,.aim,.banner{display:none}
.aiming .aim{display:block;fill:none;stroke:var(--ink);stroke-width:6;stroke-dasharray:16 12;transform-box:fill-box;transform-origin:center;animation:spin 3s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.caught .burst{display:block;transform-box:fill-box;transform-origin:center;animation:burst-in .5s ease-out both}
.caught .fish{transform-box:fill-box;transform-origin:center;animation:thrash .55s ease-out both}
@keyframes thrash{0%{transform:rotate(-14deg) scale(.9)}15%{transform:rotate(18deg) scale(1.05)}30%{transform:rotate(-16deg)}45%{transform:rotate(14deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(6deg)}100%{transform:rotate(0) scale(1.1)}}
@keyframes burst-in{0%{transform:scale(.05) rotate(-30deg);opacity:0}55%{transform:scale(1.2) rotate(5deg);opacity:1}80%{transform:scale(.94) rotate(-2deg)}100%{transform:scale(1) rotate(0)}}
.ripple{opacity:0;transform-box:fill-box;transform-origin:center}
.ripple.play .rr1{animation:rr .85s ease-out both}
.ripple.play .rr2{animation:rr .95s ease-out .14s both}
.ripple.play .rr3{animation:rr 1.05s ease-out .28s both}
@keyframes rr{from{transform:scale(.1);opacity:.85}to{transform:scale(1.3);opacity:0}}
.sw-seg{transform-box:fill-box}
.sw-seg-1{transform-origin:50% 100%;animation:sw1 3.2s ease-in-out infinite alternate}
.sw-seg-2{transform-origin:50% 100%;animation:sw2 3.2s ease-in-out .4s infinite alternate}
.sw-seg-3{transform-origin:50% 100%;animation:sw3 3.2s ease-in-out .8s infinite alternate}
@keyframes sw1{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
@keyframes sw2{from{transform:rotate(-5deg)}to{transform:rotate(7deg)}}
@keyframes sw3{from{transform:rotate(-8deg)}to{transform:rotate(5deg)}}
@keyframes wave-a{from{transform:translateX(0)}to{transform:translateX(-256px)}}
@keyframes wave-b{from{transform:translateX(0)}to{transform:translateX(-256px)}}
.wave-a{animation:wave-a 4s linear infinite}
.wave-b{animation:wave-b 7s linear infinite}
.banner.show{display:block}
.banner.show .bn{transform-box:fill-box;transform-origin:center;animation:bpop .55s cubic-bezier(.34,1.56,.64,1) both}
@keyframes bpop{from{transform:scale(.15) rotate(-5deg)}to{transform:scale(1) rotate(0)}}
.sunburst{opacity:0}
.sunburst.flash{animation:sbflash .85s ease-out both}
@keyframes sbflash{0%{opacity:0;transform:scale(.3) rotate(0deg)}30%{opacity:.9;transform:scale(1) rotate(12deg)}100%{opacity:0;transform:scale(1.3) rotate(25deg)}}
.pond-paused .swim,.pond-paused .drift,.pond-paused .bob,.pond-paused .undulate,
.pond-paused .wag .tail-root,.pond-paused .wag .tail-tip,
.pond-paused .wag .fin-dorsal,.pond-paused .wag .fin-pec,
.pond-paused .wave-a,.pond-paused .wave-b,.pond-paused .sw-seg-1,
.pond-paused .sw-seg-2,.pond-paused .sw-seg-3,.pond-paused .eye{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style>

<symbol id="pp-fish-round" viewBox="-150 -110 300 220">
  <g class="flip">
    <path style="fill:#000;stroke:none" d="M-68,7 C-62,62 62,62 62,7 C62,-58 -5,-80 -68,7Z" transform="translate(5,5)"/>
    <g class="tail-root"><path class="tail" d="M-62,0 L-138,-44 Q-118,0 -138,44 Z"/></g>
    <path class="fin fin-dorsal" d="M-22,-46 Q8,-98 42,-40 Q16,-43 -22,-46 Z"/>
    <path class="body" d="M-62,0 C-62,-72 62,-72 62,0 C62,72 -62,72 -62,0Z"/>
    <path class="fin fin-pec" d="M10,28 Q40,50 4,56 Q-6,48 10,28 Z"/>
    <path class="belly" d="M-30,40 Q0,58 30,40 Q20,18 0,14 Q-20,18 -30,40Z"/>
    <path class="gill" d="M22,-30 Q30,0 22,30"/>
    <path class="mouth" d="M68,6 Q76,14 82,6"/>
    <g class="eye"><circle cx="62" cy="-32" r="11" fill="#FFF4D6"/><circle cx="64" cy="-32" r="5" fill="#000" style="stroke-width:2"/></g>
    <g class="tail-tip" style="transform:translateX(-62px)"><path fill="var(--fin-color)" stroke="var(--ink)" stroke-width="4" d="M0,0 L-40,-26 Q-26,0 -40,26 Z"/></g>
  </g>
  <g class="label" data-w="108">
    <rect class="plate" x="-60" y="-17" width="120" height="34" rx="8"/>
    <text class="name" y="1" font-size="22" text-anchor="middle" dominant-baseline="central">NAMA</text>
  </g>
</symbol>

<symbol id="pp-fish-slim" viewBox="-150 -110 300 220">
  <g class="flip">
    <path style="fill:#000;stroke:none" d="M-90,5 C-80,38 80,38 88,5 C88,-38 0,-52 -90,5Z" transform="translate(5,5)"/>
    <g class="tail-root"><path class="tail" d="M-90,0 L-144,-36 Q-128,0 -144,36 Z"/></g>
    <path class="fin fin-dorsal" d="M-26,-34 Q-4,-70 26,-33 Q6,-31 -26,-34 Z"/>
    <path class="body" d="M-90,0 C-90,-48 88,-48 88,0 C88,48 -90,48 -90,0Z"/>
    <path class="fin fin-pec" d="M4,18 Q28,36 2,44 Q-8,38 4,18 Z"/>
    <path class="belly" d="M-30,24 Q0,36 30,24 Q18,10 0,8 Q-18,10 -30,24Z"/>
    <path class="gill" d="M18,-18 Q24,0 18,18"/>
    <path class="mouth" d="M84,4 Q90,10 96,4"/>
    <g class="eye"><circle cx="78" cy="-12" r="9" fill="#FFF4D6"/><circle cx="80" cy="-12" r="4" fill="#000" style="stroke-width:2"/></g>
    <g class="tail-tip" style="transform:translateX(-90px)"><path fill="var(--fin-color)" stroke="var(--ink)" stroke-width="4" d="M0,0 L-30,-20 Q-20,0 -30,20 Z"/></g>
  </g>
  <g class="label" data-w="112">
    <rect class="plate" x="-62" y="-15" width="124" height="30" rx="8"/>
    <text class="name" y="1" font-size="22" text-anchor="middle" dominant-baseline="central">NAMA</text>
  </g>
</symbol>

<symbol id="pp-fish-fat" viewBox="-150 -110 300 220">
  <g class="flip">
    <path style="fill:#000;stroke:none" d="M-72,6 C-60,78 72,78 72,6 C72,-78 -12,-90 -72,6Z" transform="translate(5,5)"/>
    <g class="tail-root"><path class="tail" d="M-74,0 L-142,-50 Q-122,0 -142,50 Z"/></g>
    <path class="fin fin-dorsal" d="M-26,-55 Q5,-108 44,-48 Q16,-51 -26,-55 Z"/>
    <path class="body" d="M-74,0 C-74,-82 72,-82 72,0 C72,82 -74,82 -74,0Z"/>
    <path class="fin fin-pec" d="M12,34 Q46,62 8,68 Q-4,58 12,34 Z"/>
    <path class="belly" d="M-32,52 Q0,70 32,52 Q24,28 0,22 Q-24,28 -32,52Z"/>
    <path class="gill" d="M20,-40 Q30,0 20,40"/>
    <path class="mouth" d="M70,10 Q80,20 86,8"/>
    <g class="eye"><circle cx="58" cy="-44" r="12" fill="#FFF4D6"/><circle cx="60" cy="-44" r="5.5" fill="#000" style="stroke-width:2"/></g>
    <g class="tail-tip" style="transform:translateX(-74px)"><path fill="var(--fin-color)" stroke="var(--ink)" stroke-width="4" d="M0,0 L-44,-30 Q-30,0 -44,30 Z"/></g>
  </g>
  <g class="label" data-w="108">
    <rect class="plate" x="-60" y="-18" width="120" height="36" rx="8"/>
    <text class="name" y="1" font-size="22" text-anchor="middle" dominant-baseline="central">NAMA</text>
  </g>
</symbol>

<symbol id="pp-rope" viewBox="0 0 8 100" preserveAspectRatio="none"><rect width="8" height="100" fill="#000" style="stroke:none"/></symbol>

<symbol id="pp-hook" viewBox="-72 -75 104 195">
  <path d="M0,-30 V62 Q0,102 -30,102 Q-54,102 -54,74" fill="none" style="stroke-width:22"/>
  <path d="M0,-30 V62 Q0,102 -30,102 Q-54,102 -54,74" fill="none" style="stroke:#FF9F43;stroke-width:10"/>
  <path d="M-54,78 L-68,56 L-44,62 Z" fill="#000"/>
  <rect x="-10" y="6" width="20" height="28" rx="5" fill="#B197FC"/>
  <circle cy="-48" r="20" fill="#FF6B9D"/>
  <path d="M-10,-56 Q-6,-64 2,-64" fill="none" style="stroke:#FFF4D6;stroke-width:4"/>
</symbol>

<symbol id="pp-rock" viewBox="0 0 120 80">
  <path d="M8,78 L6,76 L22,30 L58,14 L98,34 L114,76 L112,78 Z" fill="#B197FC" stroke="#000" stroke-width="4"/>
  <path d="M58,14 L52,40 L66,56" fill="none" stroke="#000" stroke-width="3"/>
</symbol>

<symbol id="pp-seaweed" viewBox="-10 -10 60 195">
  <g class="sw-seg sw-seg-1">
    <path style="fill:#7DFFB3;stroke:#000;stroke-width:4;stroke-linejoin:round"
          d="M12,182 C0,152 6,118 14,90 C20,70 20,64 18,58
             C22,64 26,72 28,92 C34,120 28,154 20,182 Z"/>
    <g class="sw-seg sw-seg-2">
      <path style="fill:#7DFFB3;stroke:#000;stroke-width:4;stroke-linejoin:round"
            d="M18,58 C12,40 14,22 16,4 C16,-2 17,-6 18,-8
               C19,-6 20,-2 20,4 C22,22 24,40 22,58 Z"/>
    </g>
  </g>
</symbol>

<symbol id="pp-bubble" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#FFF4D6"/><path d="M12,18 Q14,12 20,10" fill="none" style="stroke-width:3"/></symbol>

<symbol id="pp-burst" viewBox="-150 -150 300 300">
  <polygon points="0,-140 30,-92 70,-96 78,-56 133,-43 96,0 112,37 78,56 82,113 30,91 0,118 -30,91 -82,113 -78,56 -112,37 -96,0 -133,-43 -78,-56 -70,-96 -30,-92" fill="#FFF4D6" stroke="#000" stroke-width="4"/>
  <polygon points="0,-96 20,-63 48,-66 53,-39 91,-30 66,0 78,25 53,39 56,78 20,63 0,82 -20,63 -56,78 -53,39 -78,25 -66,0 -91,-30 -53,-39 -48,-66 -20,-63" fill="#FFD93D" stroke="none"/>
</symbol>

<symbol id="pp-ripple" viewBox="-140 -40 280 80">
  <ellipse class="rr1" rx="40" ry="10" fill="none" stroke="#000" stroke-width="3"/>
  <ellipse class="rr2" rx="90" ry="22" fill="none" stroke="#000" stroke-width="3"/>
  <ellipse class="rr3" rx="135" ry="34" fill="none" stroke="#000" stroke-width="3"/>
</symbol>

<symbol id="pp-pond-bg" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#FFF4D6" style="stroke:none"/>
  <rect x="0" y="116" width="1280" height="604" fill="#CDEBFF" style="stroke:none"/>
  <rect x="-4" y="672" width="1288" height="52" fill="#FFD93D" style="stroke:none"/>
  <rect x="2" y="2" width="1276" height="716" fill="none" style="stroke:#000;stroke-width:4"/>
</symbol>

<symbol id="pp-wave-a" viewBox="0 0 256 28" preserveAspectRatio="none">
  <path d="M0,14 Q32,0 64,14 Q96,28 128,14 Q160,0 192,14 Q224,28 256,14" fill="none" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M0,14 Q32,0 64,14 Q96,28 128,14 Q160,0 192,14 Q224,28 256,14" fill="none" stroke="#6BCBFF" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
</symbol>
<symbol id="pp-wave-b" viewBox="0 0 256 20" preserveAspectRatio="none">
  <path style="fill:#6BCBFF;stroke:none"
        d="M0,10 Q32,0 64,10 Q96,20 128,10 Q160,0 192,10 Q224,20 256,10 L256,20 L0,20 Z"/>
  <path style="fill:none;stroke:#000;stroke-width:3;stroke-linejoin:round;stroke-linecap:round"
        d="M0,10 Q32,0 64,10 Q96,20 128,10 Q160,0 192,10 Q224,20 256,10"/>
</symbol>

<symbol id="pp-sunburst" viewBox="-240 -240 480 480">
  <polygon points="0,-220 28,-110 110,-180 60,-80 200,-80 110,-10 190,90 80,60 80,210 0,110 -80,210 -80,60 -190,90 -110,-10 -200,-80 -60,-80 -110,-180 -28,-110" fill="#FFD93D" stroke="#000" stroke-width="4"/>
  <polygon points="0,-140 18,-72 72,-116 38,-52 128,-52 72,-6 122,58 52,38 52,134 0,72 -52,134 -52,38 -122,58 -72,-6 -128,-52 -38,-52 -72,-116 -18,-72" fill="#FFF4D6" stroke="none"/>
</symbol>

<symbol id="pp-fish-mini" viewBox="0 0 90 56"><path class="tail" d="M30,28 L6,10 Q14,28 6,46 Z"/><ellipse class="body" cx="55" cy="28" rx="30" ry="20"/><circle cx="68" cy="22" r="4" fill="#000" style="stroke-width:1"/></symbol>
<symbol id="pp-fish-mini-slim" viewBox="0 0 90 56"><path class="tail" d="M22,28 L5,13 Q11,28 5,43 Z"/><ellipse class="body" cx="54" cy="28" rx="34" ry="14"/><circle cx="72" cy="25" r="3.5" fill="#000" style="stroke-width:1"/></symbol>
`;

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  participants: Participant[];
  lastPick: { participantId: string; participantName: string; timestamp: number } | null;
};

export function PancingView({ participants, lastPick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const schoolRef = useRef<SVGGElement>(null);
  const rigRef = useRef<SVGGElement>(null);
  const rigInRef = useRef<SVGGElement>(null);
  const hookFlipRef = useRef<SVGGElement>(null);
  const rippleRef = useRef<SVGUseElement>(null);
  const bannerRef = useRef<SVGGElement>(null);
  const bannerNameRef = useRef<SVGTextElement>(null);
  const sunburstRef = useRef<SVGUseElement>(null);
  const prevPickKeyRef = useRef<number | null>(null);
  const animatingRef = useRef(false);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  // Pause animations when tab is hidden
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    function onVis() { el!.classList.toggle('pond-paused', document.hidden); }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Spawn fish when participants change
  useEffect(() => {
    const school = schoolRef.current;
    if (!school) return;
    Array.from(school.children).forEach((c) => c.remove());
    participants.forEach((p, i) => {
      const v = VARIANTS[i % 3];
      const colors = COLORS[i % 6];
      const y = ROWS[i % 4] + (i % 3 - 1) * 14;
      const x0 = 160 + ((i * 5) % 3) * 400 + (i % 2) * 90;
      const dur = 34 + ((i * 7) % 5) * 6;
      const delay = -(i * 5.3);
      spawnFish(school, p.id, p.name, v, colors, y, x0, dur, delay, i % 2 === 1);
    });
  }, [participants]);

  // Trigger catch animation when lastPick changes
  useEffect(() => {
    if (!lastPick) return;
    const pickKey = lastPick.timestamp;
    if (prevPickKeyRef.current === pickKey) return;
    prevPickKeyRef.current = pickKey;

    const svg = svgRef.current;
    const school = schoolRef.current;
    const rig = rigRef.current;
    const rigIn = rigInRef.current;
    const hookFlip = hookFlipRef.current;
    const ripple = rippleRef.current;
    const banner = bannerRef.current;
    const bannerName = bannerNameRef.current;
    if (!svg || !school || !rig || !rigIn || !hookFlip || !ripple || !banner) return;

    if (animatingRef.current) {
      rig.getAnimations().forEach((a) => a.cancel());
      rigIn.getAnimations().forEach((a) => a.cancel());
      rig.style.transform = `translate(640px,-260px)`;
      banner.classList.remove('show');
      animatingRef.current = false;
    }

    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const T = (x: number, y: number) => `translate(${x}px,${y}px)`;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, reduce() ? 0 : ms));

    function toSvgPt(x: number, y: number) {
      const p = svg!.createSVGPoint();
      p.x = x; p.y = y;
      const ctm = svg!.getScreenCTM();
      return ctm ? p.matrixTransform(ctm.inverse()) : p;
    }

    function fishCenter(lane: Element) {
      const body = lane.querySelector('.body');
      if (!body) return { x: 640, y: 400 };
      const r = body.getBoundingClientRect();
      return toSvgPt(r.left + r.width / 2, r.top + r.height / 2);
    }

    async function mv(fx: number, fy: number, tx: number, ty: number, ms: number, ease: string) {
      if (reduce()) { rig!.style.transform = T(tx, ty); return; }
      const a = rig!.animate(
        [{ transform: T(fx, fy) }, { transform: T(tx, ty) }],
        { duration: ms, easing: ease, fill: 'forwards' },
      );
      await a.finished;
      rig!.style.transform = T(tx, ty);
      a.cancel();
    }

    async function runAnimation() {
      animatingRef.current = true;

      banner!.classList.remove('show');
      ripple!.classList.remove('play');
      rig!.getAnimations().forEach((a) => a.cancel());
      rig!.style.transform = T(640, -260);

      const old = rigIn!.querySelector('.lane') as SVGGElement | null;
      if (old) {
        const oldPid = old.dataset.pid;
        old.remove();
        if (oldPid) {
          const ps = participantsRef.current;
          const idx = ps.findIndex((x) => x.id === oldPid);
          if (idx >= 0) {
            const op = ps[idx];
            spawnFish(
              school!,
              op.id, op.name,
              VARIANTS[idx % 3], COLORS[idx % 6],
              ROWS[idx % 4] + (idx % 3 - 1) * 14,
              160 + ((idx * 5) % 3) * 400 + (idx % 2) * 90,
              34 + ((idx * 7) % 5) * 6,
              -Math.random() * 30,
              idx % 2 === 1,
            );
          }
        }
      }

      const targetLane = Array.from(school!.children).find(
        (l) => (l as SVGGElement).dataset.pid === lastPick!.participantId,
      ) as SVGGElement | undefined;

      if (!targetLane) {
        if (bannerName) {
          bannerName.textContent = lastPick!.participantName;
          fitBanner(bannerName, 580, 58);
        }
        banner!.classList.add('show');
        animatingRef.current = false;
        return;
      }

      const p = fishCenter(targetLane);
      const isLeft = targetLane.classList.contains('left');
      const dir = isLeft ? -1 : 1;
      const rx = (BODY_RX[targetLane.dataset.v ?? 'round'] ?? 85) * 0.85;

      targetLane.classList.remove('swim');
      targetLane.style.setProperty('--x0', `${p.x}px`);
      targetLane.style.setProperty('--y', `${p.y}px`);
      targetLane.classList.add('aiming');
      school!.appendChild(targetLane);

      const rigX = p.x + dir * rx + 54 * dir;
      const rigY = p.y - 72;
      hookFlip!.setAttribute('transform', `scale(${dir} 1)`);
      ripple!.setAttribute('x', String(rigX - 140));

      const swing = (rigX - 640) * 0.25;
      if (reduce()) {
        rig!.style.transform = T(rigX, 44);
      } else {
        const a1 = rig!.animate(
          [
            { transform: T(640, -260) },
            { transform: T(rigX + swing, 60), offset: 0.45 },
            { transform: T(rigX, 44) },
          ],
          { duration: 1600, easing: 'cubic-bezier(.25,.8,.35,1)', fill: 'forwards' },
        );
        await a1.finished;
        rig!.style.transform = T(rigX, 44);
        a1.cancel();
      }
      ripple!.classList.add('play');
      await mv(rigX, 44, rigX, rigY, 1050, 'ease-in');

      targetLane.style.setProperty('--x0', `${p.x - rigX}px`);
      targetLane.style.setProperty('--y', `${p.y - rigY}px`);
      rigIn!.appendChild(targetLane);
      targetLane.classList.remove('aiming');
      targetLane.classList.add('caught');

      if (sunburstRef.current) {
        sunburstRef.current.setAttribute('x', String(rigX - 240));
        sunburstRef.current.setAttribute('y', String(rigY - 240));
        sunburstRef.current.style.display = 'block';
        sunburstRef.current.classList.remove('flash');
        void sunburstRef.current.getBoundingClientRect();
        sunburstRef.current.classList.add('flash');
      }

      await sleep(600);

      await mv(rigX, rigY, 640 - (p.x - rigX), 172 - (p.y - rigY), 1700, 'ease-in-out');

      if (bannerName) {
        bannerName.textContent = lastPick!.participantName;
        fitBanner(bannerName, 580, 58);
      }
      banner!.classList.add('show');
      animatingRef.current = false;
    }

    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => runAnimation());
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [lastPick]);

  return (
    <div className="w-full" style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
      {/* Hidden symbols + CSS */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="0" height="0"
        style={{ position: 'absolute' }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SYMBOLS_HTML }}
      />

      {/* Pond SVG */}
      <svg
        ref={svgRef}
        viewBox="0 0 1280 720"
        style={{ width: '100%', height: '100%', display: 'block' }}
        role="img"
        aria-label="Kolam pancing peserta"
      >
        {/* Background (flat, no battlement) */}
        <use href="#pp-pond-bg" width="1280" height="720" />

        {/* Wave layer A: front, faster */}
        <clipPath id="pp-wclip-a">
          <rect x="0" y="104" width="1280" height="32" />
        </clipPath>
        <g clipPath="url(#pp-wclip-a)">
          <g className="wave-a">
            {Array.from({ length: 12 }, (_, i) => (
              <use key={i} href="#pp-wave-a" x={i * 256} y="104" width="256" height="28" />
            ))}
          </g>
        </g>

        {/* Wave layer B: back, slower */}
        <clipPath id="pp-wclip-b">
          <rect x="0" y="126" width="1280" height="24" />
        </clipPath>
        <g clipPath="url(#pp-wclip-b)">
          <g className="wave-b">
            {Array.from({ length: 12 }, (_, i) => (
              <use key={i} href="#pp-wave-b" x={i * 256} y="126" width="256" height="20" />
            ))}
          </g>
        </g>

        {/* Decorations */}
        <use href="#pp-rock" x="60" y="584" width="150" height="100" />
        <use href="#pp-rock" x="1040" y="610" width="120" height="80" />
        <use href="#pp-seaweed" x="240" y="516" width="60" height="175" />
        <use href="#pp-seaweed" x="1148" y="500" width="60" height="175" style={{ animationDelay: '-1.6s' }} />

        {/* Mini background fish */}
        {[
          [170, COLORS[0].body, false],
          [290, COLORS[1].body, true],
          [410, COLORS[2].body, false],
          [530, COLORS[3].body, true],
          [650, COLORS[4].body, false],
          [250, COLORS[5].body, true],
        ].map(([y, c, left], i) => (
          <g
            key={i}
            className={`lane swim mini${left ? ' left' : ''}`}
            style={{
              ['--y' as string]: `${y}px`,
              ['--x0' as string]: `${200 + i * 130}px`,
              ['--dur' as string]: `${70 + i * 5}s`,
              ['--delay' as string]: `${-i * 9}s`,
            }}
          >
            <use
              href={left ? '#pp-fish-mini-slim' : '#pp-fish-mini'}
              x="-45" y="-28" width="90" height="56"
              style={{ ['--fish-color' as string]: c as string, ['--fin-color' as string]: c as string }}
              transform={left ? 'scale(-1 1)' : undefined}
            />
          </g>
        ))}

        {/* Ripple */}
        <use ref={rippleRef} className="ripple" href="#pp-ripple" x="0" y="76" width="280" height="80" />

        {/* Flat sunburst flash */}
        <use
          ref={sunburstRef}
          className="sunburst"
          href="#pp-sunburst"
          x="400" y="200"
          width="480" height="480"
          style={{ display: 'none' }}
        />

        {/* Named fish */}
        <g ref={schoolRef} />

        {/* Rig */}
        <g ref={rigRef} style={{ transform: 'translate(640px,-260px)' }}>
          <g ref={rigInRef} className="bob">
            <use href="#pp-rope" x="-4" y="-950" width="8" height="902" />
            <g ref={hookFlipRef}>
              <use href="#pp-hook" x="-72" y="-75" width="104" height="195" />
            </g>
          </g>
        </g>

        {/* Banner */}
        <g ref={bannerRef} className="banner" transform="translate(640 380)">
          <g className="bn">
            <rect x="-346" y="76" width="692" height="6" fill="#000" style={{ stroke: 'none' }} />
            <rect x="-346" y="-76" width="692" height="6" fill="#000" style={{ stroke: 'none' }} />
            <rect x="-346" y="-76" width="6" height="152" fill="#000" style={{ stroke: 'none' }} />
            <rect x="340" y="-76" width="6" height="152" fill="#000" style={{ stroke: 'none' }} />
            <rect x="-340" y="-70" width="680" height="146" rx="0" fill="#FFD93D" style={{ stroke: 'none' }} />
            <text
              fontSize="18"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily='"Arial Black","Segoe UI Black",ui-sans-serif,system-ui,sans-serif'
              fontWeight="800"
              fill="#000"
              y="-36"
              letterSpacing="4"
            >
              BERHASIL DIPANCING!
            </text>
            <text
              ref={bannerNameRef}
              fontSize="58"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily='"Arial Black","Segoe UI Black",ui-sans-serif,system-ui,sans-serif'
              fontWeight="800"
              fill="#000"
              y="28"
            >
              Tertangkap!
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
