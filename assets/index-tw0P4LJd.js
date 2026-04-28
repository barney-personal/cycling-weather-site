import{m as q,r as L,l as C,a as x}from"./data-CxCXv4d3.js";import{D as _,r as k}from"./qualify-CS5O-wsU.js";import{m as E}from"./threshold-dial-CLOXjtU8.js";const R={go:"GO",edge:"EDGE","no-go":"NO-GO"},S={go:"Clean ride window detected",edge:"Marginal — a window may emerge","no-go":"No clean window in the next 14 days"};function o(e){return e.replace(/[&<>"']/g,n=>n==="&"?"&amp;":n==="<"?"&lt;":n===">"?"&gt;":n==='"'?"&quot;":"&#39;")}function y(e){if(!e)return"";const n=new Date(`${e}T00:00:00Z`);return Number.isNaN(n.getTime())?e:n.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function D(e){const n=y(e.lead_window_start),t=y(e.lead_window_end);return!n&&!t?e.top_best_run&&e.top_best_run>0?`Best clean run: ${e.top_best_run} day${e.top_best_run===1?"":"s"}`:"No clean run yet":n&&t&&n!==t?`Best window: ${n} → ${t} (${e.top_best_run??0} clean days)`:`Best window: ${n||t} (${e.top_best_run??0} clean days)`}function F(e){return e>0?"↑":e<0?"↓":"→"}function H(e){return e>0?"up":e<0?"down":"flat"}function N(e){if(e.length===0)return[];const n=e.filter(a=>a.qualifier_flip),t=e.filter(a=>!a.qualifier_flip&&a.rank_delta!==null&&Math.abs(a.rank_delta)>=2).sort((a,s)=>Math.abs(s.rank_delta??0)-Math.abs(a.rank_delta??0));return[...n,...t].slice(0,4)}function w(e){const n=o(e.name);if(e.qualifier_flip){const l=e.qualifier_now?"→ GO":"→ no-go";return`<li class="changelog-chip ${e.qualifier_now?"flip-go":"flip-nogo"}"><span class="changelog-name">${n}</span><span class="changelog-text">${l}</span></li>`}const t=e.rank_delta??0,a=F(t),s=`delta-${H(t)}`,r=Math.abs(t);return`<li class="changelog-chip ${s}"><span class="changelog-name">${n}</span><span class="changelog-text">${a}${r}</span></li>`}function B(e,n){e.innerHTML=`
    <section class="hero hero-empty" aria-live="polite">
      <p class="hero-eyebrow">Cycling Weather</p>
      <p class="hero-empty-msg">${o(n)}</p>
    </section>
  `}function O(e){const n=typeof e.mount=="string"?document.querySelector(e.mount):e.mount;if(!n)return;const{hero:t,latest:a,changelog:s}=e.data;if(!t||!a||a.results.length===0){B(n,"No snapshot yet — the daily forecast will appear here.");return}const r=t.verdict,l=t.editorial&&t.editorial.trim().length>0?t.editorial:`Top pick: ${t.top_name}.`,d=t.top_region?`<span class="hero-region">${o(t.top_region)}</span>`:"",p=typeof t.top_median_temp=="number"?`<span class="hero-stat"><span class="hero-stat-num">${t.top_median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>`:"",c=`<span class="hero-stat"><span class="hero-stat-num">${t.go_count}<span class="hero-stat-divider">/</span>${t.total_count}</span><span class="hero-stat-label">go destinations</span></span>`,f=t.top_best_run!==null&&t.top_best_run>0?`<span class="hero-stat"><span class="hero-stat-num">${t.top_best_run}</span><span class="hero-stat-label">clean-day run</span></span>`:"",u=N(s),h=u.length>0?`<div class="changelog-row" aria-label="What changed since yesterday">
           <p class="changelog-eyebrow">Since yesterday</p>
           <ul class="changelog-list">${u.map(w).join("")}</ul>
         </div>`:"",$=t.forecast_date||a.forecast_date,b=$?y($):"",M=`Forecast ${o($||"—")}${b?` · ${o(b)}`:""} · ${a.results.length} destinations · ${a.forecast_days}-day window`;n.innerHTML=`
    <section class="hero hero-${r}" aria-live="polite">
      <div class="hero-header">
        <span class="hero-verdict-pill verdict-${r}" aria-label="${o(S[r])}">${R[r]}</span>
        <p class="hero-eyebrow"><span class="visually-hidden">Today's </span>top pick</p>
      </div>
      <h1 class="hero-destination">
        <a class="hero-destination-link" href="./index.html#${o(t.top_slug)}">${o(t.top_name)}</a>
        ${d}
      </h1>
      <p class="hero-editorial">${o(l)}</p>
      <p class="hero-window">${o(D(t))}</p>
      <div class="hero-stats">${p}${f}${c}</div>
      ${h}
      <p class="hero-meta">${M}</p>
    </section>
  `}function i(e){return e.replace(/[&<>"']/g,n=>n==="&"?"&amp;":n==="<"?"&lt;":n===">"?"&gt;":n==='"'?"&quot;":"&#39;")}function j(e){const n=["th","st","nd","rd"],t=e%100;return`${e}${n[(t-20)%10]??n[t]??n[0]}`}function g(e){if(!e)return"";const n=new Date(`${e}T00:00:00Z`);return Number.isNaN(n.getTime())?e:n.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function G(e){return`hsl(${(220-(Math.min(35,Math.max(5,e))-5)/30*202).toFixed(0)}, 55%, 56%)`}function I(e,n){return e>1||n>=60?"wet":e>0||n>=25?"light":"clean"}function W(e){return e>=30?"blustery":e>=18?"breezy":"calm"}function v(e){return`./destination.html?slug=${encodeURIComponent(e)}`}function A(e,n){const t=k(e,n),a=new Map;return k(e,_).forEach((s,r)=>{a.set(s.result.name,r+1)}),t.map((s,r)=>({...s,rank:r+1,pythonRank:a.get(s.result.name)??r+1}))}function T(e){return e.result.daily.map((n,t)=>{const a=G(n.temp_max),s=I(n.precip_sum,n.precip_prob_max),r=W(n.wind_max),l=e.qualifies[t]===!0,d=["strip-cell",`rain-${s}`,`wind-${r}`,l?"is-qualify":""].filter(Boolean).join(" "),p=`${n.date}: ${n.temp_max.toFixed(0)}°C, ${n.precip_sum.toFixed(1)}mm rain (${Math.round(n.precip_prob_max)}% probability), ${n.wind_max.toFixed(0)} km/h wind${l?", qualifies":""}`;return`<span class="${d}" style="--cell-fill:${a}" role="img" aria-label="${i(p)}"></span>`}).join("")}function U(e){return e.qualifier?'<span class="status-pill verdict-go">GO</span>':e.bestRun>=5?`<span class="status-pill verdict-edge">EDGE · ${e.bestRun}d</span>`:'<span class="status-pill verdict-no-go">NO-GO</span>'}function Z(e){if(e.bestRun===0)return'<span class="run-badge run-zero">No clean run</span>';const n=e.bestStart&&e.bestEnd?e.bestStart===e.bestEnd?g(e.bestStart):`${g(e.bestStart)} → ${g(e.bestEnd)}`:"";return`<span class="run-badge"><span class="run-badge-num">${e.bestRun}</span><span class="run-badge-label">clean ${e.bestRun===1?"day":"days"}${n?` · ${i(n)}`:""}</span></span>`}function V(e){const n=e.result.region?`<span class="rank-card-region">${i(e.result.region)}</span>`:"",t=!e.qualifier&&e.result.blocker?`<p class="rank-card-blocker">${i(e.result.blocker)}</p>`:"";return`<li class="rank-card" id="${i(e.result.slug)}" data-slug="${i(e.result.slug)}" data-region="${i(e.result.region??"")}" data-qualifier="${e.qualifier?"1":"0"}">
    <a class="rank-card-link" href="${v(e.result.slug)}">
      <header class="rank-card-header">
        <span class="rank-card-rank" aria-label="Rank ${e.rank}">${e.rank}</span>
        <div class="rank-card-title">
          <span class="rank-card-name">${i(e.result.name)}</span>
          ${n}
        </div>
        ${U(e)}
      </header>
      <div class="rank-card-stats">
        <span class="rank-stat"><span class="rank-stat-num">${e.medianTemp.toFixed(1)}°</span><span class="rank-stat-label">median high</span></span>
        <span class="rank-stat"><span class="rank-stat-num">${e.dryDays}</span><span class="rank-stat-label">dry days</span></span>
        ${Z(e)}
      </div>
      <div class="rank-card-strip" aria-hidden="true">${T(e)}</div>
      ${t}
    </a>
  </li>`}function z(e){const n=e.result.region?`<span class="region">${i(e.result.region)}</span>`:"";return`<tr id="${i(e.result.slug)}-row" data-slug="${i(e.result.slug)}" data-region="${i(e.result.region??"")}" data-qualifier="${e.qualifier?"1":"0"}">
    <td class="rank">${e.rank}</td>
    <td><a class="dest dest-link" href="${v(e.result.slug)}">${i(e.result.name)}</a>${n}</td>
    <td class="cell-num">${e.medianTemp.toFixed(1)}°C</td>
    <td><div class="strip">${T(e)}</div></td>
    <td class="cell-num">${e.bestRun}${e.bestStart?` · ${i(g(e.bestStart))}`:""}</td>
    <td class="cell-num">${e.dryDays}</td>
    <td>${e.qualifier?'<span class="qualifier-badge">GO</span>':`<span class="blocker">${i(e.result.blocker??"")}</span>`}</td>
  </tr>`}function P(){return`<li class="rank-empty">
    <p class="rank-empty-title">No destinations match.</p>
    <p class="rank-empty-msg">Try widening your thresholds or pick a different region.</p>
  </li>`}function Q(){return'<tr class="rank-empty-row"><td colspan="7"><span class="rank-empty-title">No destinations match.</span> <span class="rank-empty-msg">Try widening your thresholds or pick a different region.</span></td></tr>'}function J(e){if(e.length===0)return"No destinations match the current filter.";const n=e[0];if(!n)return"";const t=`${n.result.name} ranks ${j(n.rank)} with median high ${n.medianTemp.toFixed(0)}°C and ${n.dryDays} dry days.`,a=e.filter(r=>r.qualifier).length,s=a===0?"No destinations currently qualify.":a===1?"1 destination currently qualifies.":`${a} destinations currently qualify.`;return`${t} ${s}`}function K(e,n){return n==="all"?e:n==="qualifiers"?e.filter(t=>t.qualifier):e.filter(t=>t.result.region===n)}function X(e){return Array.from(new Set(e.map(n=>n.region).filter(n=>typeof n=="string"&&n.length>0))).sort()}function Y(e,n){const t=X(e);return[{key:"all",label:"All"},{key:"qualifiers",label:"Qualifiers only"},...t.map(s=>({key:s,label:s}))].map(s=>`<button type="button" class="chip${s.key===n?" active":""}" data-filter="${i(String(s.key))}" role="tab" aria-selected="${s.key===n?"true":"false"}">${i(s.label)}</button>`).join("")}function m(e,n){const t=typeof e=="string"?document.querySelector(e):e;if(!t)throw new Error(`mountRanking: ${n} mount not found`);return t}function ee(e){const n=m(e.cardsMount,"cards"),t=m(e.tableMount,"table"),a=m(e.filtersMount,"filters"),s=e.liveRegionMount?m(e.liveRegionMount,"live region"):null;let r={thresholds:_,filter:"all"};function l(){const c=typeof performance<"u"&&typeof performance.now=="function"?performance.now():0,f=A(e.results,r.thresholds),u=K(f,r.filter);if(u.length===0?(n.innerHTML=P(),t.innerHTML=Q()):(n.innerHTML=u.map(V).join(""),t.innerHTML=u.map(z).join("")),s&&(s.textContent=J(u)),typeof performance<"u"&&typeof performance.mark=="function"){const h=typeof performance.now=="function"?performance.now()-c:0;h>16&&console.warn(`[ranking] render took ${h.toFixed(1)}ms (budget 16ms)`)}}function d(){a.innerHTML=Y(e.results,r.filter)}function p(c){const f=c.target?.closest("[data-filter]");if(!f)return;const u=f.dataset.filter??"all";r={...r,filter:u},d(),l()}return a.addEventListener("click",p),d(),l(),{setThresholds(c){r={...r,thresholds:c},l()},setFilter(c){r={...r,filter:c},d(),l()},destroy(){a.removeEventListener("click",p),n.innerHTML="",t.innerHTML="",a.innerHTML="",s&&(s.textContent="")}}}q({mount:"#site-header",active:"forward"});L();C().then(e=>{O({mount:"#hero-mount",data:e}),x("#footer-freshness",e);const n=e.latest;if(!n||n.results.length===0)return;const t=ee({cardsMount:"#rank-cards",tableMount:"#rank-body",filtersMount:"#filters",liveRegionMount:"#rank-summary",results:n.results});E({trigger:"#threshold-trigger"}),window.addEventListener("cwthresholds:change",a=>{const s=a.detail;t.setThresholds(s.thresholds)})}).catch(e=>{console.warn("homepage: data.json fetch failed",e);const n=document.getElementById("footer-freshness");n&&(n.textContent="data.json offline — try again when reconnected.");const t=document.getElementById("hero-mount");t&&!t.firstChild&&(t.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see today's ranking.</p>
        </section>
      `)});
