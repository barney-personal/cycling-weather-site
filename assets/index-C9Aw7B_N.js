import{m as W}from"./header-CdR4ctKe.js";import{D as $,r as I,t as Z}from"./qualify-CS5O-wsU.js";import{l as z}from"./data-DO2zHL4L.js";const K={go:"GO",edge:"EDGE","no-go":"NO-GO"},V={go:"Clean ride window detected",edge:"Marginal — a window may emerge","no-go":"No clean window in the next 14 days"};function m(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function T(e){if(!e)return"";const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function J(e){const t=T(e.lead_window_start),n=T(e.lead_window_end);return!t&&!n?e.top_best_run&&e.top_best_run>0?`Best clean run: ${e.top_best_run} day${e.top_best_run===1?"":"s"}`:"No clean run yet":t&&n&&t!==n?`Best window: ${t} → ${n} (${e.top_best_run??0} clean days)`:`Best window: ${t||n} (${e.top_best_run??0} clean days)`}function Y(e){return e>0?"↑":e<0?"↓":"→"}function Q(e){return e>0?"up":e<0?"down":"flat"}function X(e){if(e.length===0)return[];const t=e.filter(a=>a.qualifier_flip),n=e.filter(a=>!a.qualifier_flip&&a.rank_delta!==null&&Math.abs(a.rank_delta)>=2).sort((a,r)=>Math.abs(r.rank_delta??0)-Math.abs(a.rank_delta??0));return[...t,...n].slice(0,4)}function ee(e){const t=m(e.name);if(e.qualifier_flip){const s=e.qualifier_now?"→ GO":"→ no-go";return`<li class="changelog-chip ${e.qualifier_now?"flip-go":"flip-nogo"}"><span class="changelog-name">${t}</span><span class="changelog-text">${s}</span></li>`}const n=e.rank_delta??0,a=Y(n),r=`delta-${Q(n)}`,i=Math.abs(n);return`<li class="changelog-chip ${r}"><span class="changelog-name">${t}</span><span class="changelog-text">${a}${i}</span></li>`}function te(e,t){e.innerHTML=`
    <section class="hero hero-empty" aria-live="polite">
      <p class="hero-eyebrow">Cycling Weather</p>
      <p class="hero-empty-msg">${m(t)}</p>
    </section>
  `}function ne(e){const t=typeof e.mount=="string"?document.querySelector(e.mount):e.mount;if(!t)return;const{hero:n,latest:a,changelog:r}=e.data;if(!n||!a||a.results.length===0){te(t,"No snapshot yet — the daily forecast will appear here.");return}const i=n.verdict,s=n.editorial&&n.editorial.trim().length>0?n.editorial:`Top pick: ${n.top_name}.`,o=n.top_region?`<span class="hero-region">${m(n.top_region)}</span>`:"",f=typeof n.top_median_temp=="number"?`<span class="hero-stat"><span class="hero-stat-num">${n.top_median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>`:"",d=`<span class="hero-stat"><span class="hero-stat-num">${n.go_count}<span class="hero-stat-divider">/</span>${n.total_count}</span><span class="hero-stat-label">go destinations</span></span>`,g=n.top_best_run!==null&&n.top_best_run>0?`<span class="hero-stat"><span class="hero-stat-num">${n.top_best_run}</span><span class="hero-stat-label">clean-day run</span></span>`:"",p=X(r),y=p.length>0?`<div class="changelog-row" aria-label="What changed since yesterday">
           <p class="changelog-eyebrow">Since yesterday</p>
           <ul class="changelog-list">${p.map(ee).join("")}</ul>
         </div>`:"",M=n.forecast_date||a.forecast_date,x=M?T(M):"",v=`Forecast ${m(M||"—")}${x?` · ${m(x)}`:""} · ${a.results.length} destinations · ${a.forecast_days}-day window`;t.innerHTML=`
    <section class="hero hero-${i}" aria-live="polite">
      <div class="hero-header">
        <span class="hero-verdict-pill verdict-${i}" aria-label="${m(V[i])}">${K[i]}</span>
        <p class="hero-eyebrow"><span class="visually-hidden">Today's </span>top pick</p>
      </div>
      <h1 class="hero-destination">
        <a class="hero-destination-link" href="./index.html#${m(n.top_slug)}">${m(n.top_name)}</a>
        ${o}
      </h1>
      <p class="hero-editorial">${m(s)}</p>
      <p class="hero-window">${m(J(n))}</p>
      <div class="hero-stats">${f}${g}${d}</div>
      ${y}
      <p class="hero-meta">${v}</p>
    </section>
  `}function u(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function ae(e){const t=["th","st","nd","rd"],n=e%100;return`${e}${t[(n-20)%10]??t[n]??t[0]}`}function L(e){if(!e)return"";const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function re(e){return`hsl(${(220-(Math.min(35,Math.max(5,e))-5)/30*202).toFixed(0)}, 55%, 56%)`}function se(e,t){return e>1||t>=60?"wet":e>0||t>=25?"light":"clean"}function ie(e){return e>=30?"blustery":e>=18?"breezy":"calm"}function B(e){return`./destination.html?slug=${encodeURIComponent(e)}`}function oe(e,t){const n=I(e,t),a=new Map;return I(e,$).forEach((r,i)=>{a.set(r.result.name,i+1)}),n.map((r,i)=>({...r,rank:i+1,pythonRank:a.get(r.result.name)??i+1}))}function U(e){return e.result.daily.map((t,n)=>{const a=re(t.temp_max),r=se(t.precip_sum,t.precip_prob_max),i=ie(t.wind_max),s=e.qualifies[n]===!0,o=["strip-cell",`rain-${r}`,`wind-${i}`,s?"is-qualify":""].filter(Boolean).join(" "),f=`${t.date}: ${t.temp_max.toFixed(0)}°C, ${t.precip_sum.toFixed(1)}mm rain (${Math.round(t.precip_prob_max)}% probability), ${t.wind_max.toFixed(0)} km/h wind${s?", qualifies":""}`;return`<span class="${o}" style="--cell-fill:${a}" role="img" aria-label="${u(f)}"></span>`}).join("")}function le(e){return e.qualifier?'<span class="status-pill verdict-go">GO</span>':e.bestRun>=5?`<span class="status-pill verdict-edge">EDGE · ${e.bestRun}d</span>`:'<span class="status-pill verdict-no-go">NO-GO</span>'}function ue(e){if(e.bestRun===0)return'<span class="run-badge run-zero">No clean run</span>';const t=e.bestStart&&e.bestEnd?e.bestStart===e.bestEnd?L(e.bestStart):`${L(e.bestStart)} → ${L(e.bestEnd)}`:"";return`<span class="run-badge"><span class="run-badge-num">${e.bestRun}</span><span class="run-badge-label">clean ${e.bestRun===1?"day":"days"}${t?` · ${u(t)}`:""}</span></span>`}function ce(e){const t=e.result.region?`<span class="rank-card-region">${u(e.result.region)}</span>`:"",n=!e.qualifier&&e.result.blocker?`<p class="rank-card-blocker">${u(e.result.blocker)}</p>`:"";return`<li class="rank-card" id="${u(e.result.slug)}" data-slug="${u(e.result.slug)}" data-region="${u(e.result.region??"")}" data-qualifier="${e.qualifier?"1":"0"}">
    <a class="rank-card-link" href="${B(e.result.slug)}">
      <header class="rank-card-header">
        <span class="rank-card-rank" aria-label="Rank ${e.rank}">${e.rank}</span>
        <div class="rank-card-title">
          <span class="rank-card-name">${u(e.result.name)}</span>
          ${t}
        </div>
        ${le(e)}
      </header>
      <div class="rank-card-stats">
        <span class="rank-stat"><span class="rank-stat-num">${e.medianTemp.toFixed(1)}°</span><span class="rank-stat-label">median high</span></span>
        <span class="rank-stat"><span class="rank-stat-num">${e.dryDays}</span><span class="rank-stat-label">dry days</span></span>
        ${ue(e)}
      </div>
      <div class="rank-card-strip" aria-hidden="true">${U(e)}</div>
      ${n}
    </a>
  </li>`}function de(e){const t=e.result.region?`<span class="region">${u(e.result.region)}</span>`:"";return`<tr id="${u(e.result.slug)}-row" data-slug="${u(e.result.slug)}" data-region="${u(e.result.region??"")}" data-qualifier="${e.qualifier?"1":"0"}">
    <td class="rank">${e.rank}</td>
    <td><a class="dest dest-link" href="${B(e.result.slug)}">${u(e.result.name)}</a>${t}</td>
    <td class="cell-num">${e.medianTemp.toFixed(1)}°C</td>
    <td><div class="strip">${U(e)}</div></td>
    <td class="cell-num">${e.bestRun}${e.bestStart?` · ${u(L(e.bestStart))}`:""}</td>
    <td class="cell-num">${e.dryDays}</td>
    <td>${e.qualifier?'<span class="qualifier-badge">GO</span>':`<span class="blocker">${u(e.result.blocker??"")}</span>`}</td>
  </tr>`}function pe(){return`<li class="rank-empty">
    <p class="rank-empty-title">No destinations match.</p>
    <p class="rank-empty-msg">Try widening your thresholds or pick a different region.</p>
  </li>`}function fe(){return'<tr class="rank-empty-row"><td colspan="7"><span class="rank-empty-title">No destinations match.</span> <span class="rank-empty-msg">Try widening your thresholds or pick a different region.</span></td></tr>'}function he(e){if(e.length===0)return"No destinations match the current filter.";const t=e[0];if(!t)return"";const n=`${t.result.name} ranks ${ae(t.rank)} with median high ${t.medianTemp.toFixed(0)}°C and ${t.dryDays} dry days.`,a=e.filter(i=>i.qualifier).length,r=a===0?"No destinations currently qualify.":a===1?"1 destination currently qualifies.":`${a} destinations currently qualify.`;return`${n} ${r}`}function me(e,t){return t==="all"?e:t==="qualifiers"?e.filter(n=>n.qualifier):e.filter(n=>n.result.region===t)}function ge(e){return Array.from(new Set(e.map(t=>t.region).filter(t=>typeof t=="string"&&t.length>0))).sort()}function be(e,t){const n=ge(e);return[{key:"all",label:"All"},{key:"qualifiers",label:"Qualifiers only"},...n.map(r=>({key:r,label:r}))].map(r=>`<button type="button" class="chip${r.key===t?" active":""}" data-filter="${u(String(r.key))}" role="tab" aria-selected="${r.key===t?"true":"false"}">${u(r.label)}</button>`).join("")}function _(e,t){const n=typeof e=="string"?document.querySelector(e):e;if(!n)throw new Error(`mountRanking: ${t} mount not found`);return n}function ye(e){const t=_(e.cardsMount,"cards"),n=_(e.tableMount,"table"),a=_(e.filtersMount,"filters"),r=e.liveRegionMount?_(e.liveRegionMount,"live region"):null;let i={thresholds:$,filter:"all"};function s(){const d=typeof performance<"u"&&typeof performance.now=="function"?performance.now():0,g=oe(e.results,i.thresholds),p=me(g,i.filter);if(p.length===0?(t.innerHTML=pe(),n.innerHTML=fe()):(t.innerHTML=p.map(ce).join(""),n.innerHTML=p.map(de).join("")),r&&(r.textContent=he(p)),typeof performance<"u"&&typeof performance.mark=="function"){const y=typeof performance.now=="function"?performance.now()-d:0;y>16&&console.warn(`[ranking] render took ${y.toFixed(1)}ms (budget 16ms)`)}}function o(){a.innerHTML=be(e.results,i.filter)}function f(d){const g=d.target?.closest("[data-filter]");if(!g)return;const p=g.dataset.filter??"all";i={...i,filter:p},o(),s()}return a.addEventListener("click",f),o(),s(),{setThresholds(d){i={...i,thresholds:d},s()},setFilter(d){i={...i,filter:d},o(),s()},destroy(){a.removeEventListener("click",f),t.innerHTML="",n.innerHTML="",a.innerHTML="",r&&(r.textContent="")}}}const j="cw-thresholds",$e=["temp","rain","prob","wind","sun"],b=Object.freeze({tempMin:$.tempMin,rainMax:$.rainMax,probMax:$.probMax,windMax:$.windMax,sunPref:"sun-cloud"}),Me={sun:"Sun only","sun-cloud":"Sun + cloud","all-but-rain":"Anything but rain",any:"Any"};function S(e,t,n,a){const r=typeof e=="number"?e:Number(e);return Number.isFinite(r)?Math.min(n,Math.max(t,r)):a}function C(e){return e==="sun"||e==="sun-cloud"||e==="all-but-rain"||e==="any"}function xe(){try{const e=localStorage.getItem(j);if(!e)return{};const t=JSON.parse(e);return!t||typeof t!="object"?{}:t}catch{return{}}}function ke(e){try{localStorage.setItem(j,JSON.stringify(e))}catch{}}function ve(){const e={};if(typeof location>"u")return e;const t=new URLSearchParams(location.search);t.has("temp")&&(e.tempMin=Number(t.get("temp"))),t.has("rain")&&(e.rainMax=Number(t.get("rain"))),t.has("prob")&&(e.probMax=Number(t.get("prob"))),t.has("wind")&&(e.windMax=Number(t.get("wind")));const n=t.get("sun");return n&&C(n)&&(e.sunPref=n),e}function we(e){if(typeof location>"u")return;const t=new URLSearchParams(location.search);if(q(e,b))for(const i of $e)t.delete(i);else t.set("temp",String(e.tempMin)),t.set("rain",String(e.rainMax)),t.set("prob",String(e.probMax)),t.set("wind",String(e.windMax)),t.set("sun",e.sunPref);const a=t.toString(),r=`${location.pathname}${a?`?${a}`:""}${location.hash}`;history.replaceState(null,"",r)}function q(e,t){return e.tempMin===t.tempMin&&e.rainMax===t.rainMax&&e.probMax===t.probMax&&e.windMax===t.windMax&&e.sunPref===t.sunPref}function _e(){const e=xe(),t=ve();return{tempMin:S(t.tempMin??e.tempMin,0,35,b.tempMin),rainMax:S(t.rainMax??e.rainMax,0,10,b.rainMax),probMax:S(t.probMax??e.probMax,0,100,b.probMax),windMax:S(t.windMax??e.windMax,10,60,b.windMax),sunPref:C(t.sunPref??e.sunPref)?t.sunPref??e.sunPref:b.sunPref}}function O(e){return Z({tempMin:e.tempMin,rainMax:e.rainMax,probMax:e.probMax,windMax:e.windMax,codeIn:$.codeIn},e.sunPref)}function Se(e){const t=document.createElement("template");t.innerHTML=e.trim();const n=t.content.firstElementChild;if(!n)throw new Error("threshold-dial: empty template");return n}const Le=`
<aside class="threshold-dial" role="dialog" aria-modal="false" aria-label="Threshold dial" hidden>
  <div class="threshold-dial-backdrop" data-dismiss="1"></div>
  <div class="threshold-dial-panel">
    <header class="threshold-dial-header">
      <h2 class="threshold-dial-title">What counts as ride-clean?</h2>
      <button type="button" class="threshold-dial-close" aria-label="Close threshold dial">×</button>
    </header>
    <p class="threshold-dial-help">Tweak any of these and the rankings recompute live.</p>
    <div class="threshold-dial-row" data-row="temp">
      <label for="th-temp">Min daily high</label>
      <input id="th-temp" type="range" min="0" max="35" step="1" />
      <output for="th-temp" data-output="temp"></output>
    </div>
    <div class="threshold-dial-row" data-row="wind">
      <label for="th-wind">Max wind</label>
      <input id="th-wind" type="range" min="10" max="60" step="1" />
      <output for="th-wind" data-output="wind"></output>
    </div>
    <div class="threshold-dial-row" data-row="rain">
      <label for="th-rain">Rain tolerance</label>
      <input id="th-rain" type="range" min="0" max="10" step="0.5" />
      <output for="th-rain" data-output="rain"></output>
    </div>
    <div class="threshold-dial-row" data-row="prob">
      <label for="th-prob">Max rain probability</label>
      <input id="th-prob" type="range" min="0" max="100" step="5" />
      <output for="th-prob" data-output="prob"></output>
    </div>
    <fieldset class="threshold-dial-row threshold-dial-radio">
      <legend>Sun preference</legend>
      <div class="threshold-dial-radio-group" data-row="sun">
        <label><input type="radio" name="th-sun" value="sun"><span>Sun only</span></label>
        <label><input type="radio" name="th-sun" value="sun-cloud"><span>Sun + cloud</span></label>
        <label><input type="radio" name="th-sun" value="all-but-rain"><span>Anything but rain</span></label>
      </div>
    </fieldset>
    <footer class="threshold-dial-footer">
      <button type="button" class="threshold-dial-reset" data-action="reset">Reset to defaults</button>
      <button type="button" class="threshold-dial-done" data-action="done">Done</button>
    </footer>
  </div>
</aside>
`;function Ee(e){const t=typeof e.trigger=="string"?document.querySelector(e.trigger):e.trigger;if(!t)throw new Error("mountThresholdDial: trigger not found");const n=t,a=typeof e.surface=="string"?document.querySelector(e.surface):e.surface??document.body;if(!a)throw new Error("mountThresholdDial: surface not found");const r=a,i=e.emitter??window;let s={..._e(),...e.initial??{}};const o=Se(Le);r.appendChild(o);const f=o.querySelector("#th-temp"),d=o.querySelector("#th-wind"),g=o.querySelector("#th-rain"),p=o.querySelector("#th-prob"),y=Array.from(o.querySelectorAll('input[name="th-sun"]')),M=o.querySelector('[data-output="temp"]'),x=o.querySelector('[data-output="wind"]'),v=o.querySelector('[data-output="rain"]'),R=o.querySelector('[data-output="prob"]');function D(){f.value=String(s.tempMin),d.value=String(s.windMax),g.value=String(s.rainMax),p.value=String(s.probMax),M.textContent=`${s.tempMin}°C`,x.textContent=`${s.windMax} km/h`,v.textContent=s.rainMax===0?"0 mm":`≤ ${s.rainMax} mm`,R.textContent=`< ${s.probMax}%`;for(const l of y)l.checked=l.value===s.sunPref;G()}function G(){const l=q(s,b);n.dataset.dirty=l?"0":"1";const c=l?"Defaults":`${s.tempMin}° · ${s.windMax}km/h · ${Me[s.sunPref]}`,h=n.querySelector(".threshold-trigger-summary");h&&(h.textContent=c),n.setAttribute("aria-label",`Adjust ride-clean thresholds (current: ${c})`)}function N(){const l=O(s),c={state:{...s},thresholds:l,isDefault:q(s,b)};i.dispatchEvent(new CustomEvent("cwthresholds:change",{detail:c}))}function E(l){s={...s,...l},ke(s),we(s),D(),N()}function w(l,c){l.addEventListener("input",()=>{const h=Number(l.value);c==="tempMin"&&(M.textContent=`${h}°C`),c==="windMax"&&(x.textContent=`${h} km/h`),c==="rainMax"&&(v.textContent=h===0?"0 mm":`≤ ${h} mm`),c==="probMax"&&(R.textContent=`< ${h}%`)}),l.addEventListener("change",()=>{const h=Number(l.value);E({[c]:h})})}w(f,"tempMin"),w(d,"windMax"),w(g,"rainMax"),w(p,"probMax");for(const l of y)l.addEventListener("change",()=>{l.checked&&C(l.value)&&E({sunPref:l.value})});function P(){o.hidden=!1,o.classList.add("is-open"),document.documentElement.classList.add("threshold-dial-open"),n.setAttribute("aria-expanded","true"),queueMicrotask(()=>f.focus())}function k(){o.hidden=!0,o.classList.remove("is-open"),document.documentElement.classList.remove("threshold-dial-open"),n.setAttribute("aria-expanded","false"),n.focus()}function A(){o.hidden?P():k()}n.addEventListener("click",A),n.setAttribute("aria-expanded","false"),n.setAttribute("aria-haspopup","dialog");function F(l){const c=l.target;c&&((c.dataset.dismiss==="1"||c.dataset.action==="done")&&k(),c.dataset.action==="reset"&&E({...b}),c.classList.contains("threshold-dial-close")&&k())}o.addEventListener("click",F);function H(l){l.key==="Escape"&&!o.hidden&&(l.stopPropagation(),k())}return document.addEventListener("keydown",H),D(),queueMicrotask(N),{get state(){return{...s}},get thresholds(){return O(s)},destroy(){n.removeEventListener("click",A),o.removeEventListener("click",F),document.removeEventListener("keydown",H),o.remove()},open:P,close:k}}W({mount:"#site-header",active:"forward"});z().then(e=>{ne({mount:"#hero-mount",data:e});const t=e.latest;if(!t||t.results.length===0)return;const n=ye({cardsMount:"#rank-cards",tableMount:"#rank-body",filtersMount:"#filters",liveRegionMount:"#rank-summary",results:t.results});Ee({trigger:"#threshold-trigger"}),window.addEventListener("cwthresholds:change",a=>{const r=a.detail;n.setThresholds(r.thresholds)})});
