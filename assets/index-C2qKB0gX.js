import{m as F,r as H,l as O,a as N}from"./data-BLyrmZHu.js";import{f as I,a as G,r as B,_ as j}from"./climatology-line-C2Lrhry0.js";import{r as b,d as A,D as $,E as v}from"./qualify-BbAyxwK0.js";import{m as U}from"./threshold-dial-BAX7mtK-.js";function T(e){return`hsl(${(220-(Math.min(35,Math.max(5,e))-5)/30*202).toFixed(0)}, 55%, 56%)`}function M(e,n){return e>1||n>=60?"wet":e>0||n>=25?"light":"clean"}function L(e){return e>=30?"blustery":e>=18?"breezy":"calm"}const P={go:"GO",edge:"EDGE","no-go":"NO-GO"},W={go:"Clean ride window detected",edge:"Marginal — a window may emerge","no-go":"No clean window in the next 14 days"},Z=7,V=3;function l(e){return e.replace(/[&<>"']/g,n=>n==="&"?"&amp;":n==="<"?"&lt;":n===">"?"&gt;":n==='"'?"&quot;":"&#39;")}function _(e){if(!e)return"";const n=new Date(`${e}T00:00:00Z`);return Number.isNaN(n.getTime())?e:n.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function z(e){const n=_(e.lead_window_start),t=_(e.lead_window_end);return!n&&!t?e.top_best_run&&e.top_best_run>0?`Best clean run: ${e.top_best_run} day${e.top_best_run===1?"":"s"}`:"No clean run yet":n&&t&&n!==t?`Best window: ${n} → ${t} (${e.top_best_run??0} clean days)`:`Best window: ${n||t} (${e.top_best_run??0} clean days)`}function Q(e){return e>0?"↑":e<0?"↓":"→"}function Y(e){return e>0?"up":e<0?"down":"flat"}function J(e){if(e.length===0)return[];const n=e.filter(a=>a.qualifier_flip),t=e.filter(a=>!a.qualifier_flip&&a.rank_delta!==null&&Math.abs(a.rank_delta)>=2).sort((a,s)=>Math.abs(s.rank_delta??0)-Math.abs(a.rank_delta??0));return[...n,...t].slice(0,4)}function K(e){const n=l(e.name);if(e.qualifier_flip){const i=e.qualifier_now?"→ GO":"→ no-go";return`<li class="changelog-chip ${e.qualifier_now?"flip-go":"flip-nogo"}"><span class="changelog-name">${n}</span><span class="changelog-text">${i}</span></li>`}const t=e.rank_delta??0,a=Q(t),s=`delta-${Y(t)}`,r=Math.abs(t);return`<li class="changelog-chip ${s}"><span class="changelog-name">${n}</span><span class="changelog-text">${a}${r}</span></li>`}function X(e){return e.slice(0,Z).map(n=>{const t=T(n.temp_max),a=M(n.precip_sum,n.precip_prob_max),s=L(n.wind_max),r=A(n,$);return`<span class="${["strip-cell",`rain-${a}`,`wind-${s}`,r?"is-qualify":""].filter(Boolean).join(" ")}" style="--cell-fill:${t}" aria-hidden="true"></span>`}).join("")}function ee(e){return`./destination.html?slug=${encodeURIComponent(e)}`}function ne(e){return b(e,$).filter(t=>t.qualifier).slice(0,V).map(t=>t.result)}function te(e){const n=ne(e);if(n.length===0)return"";const t=n.map(a=>{const s=a.region?`<span class="top-go-region">${l(a.region)}</span>`:"",r=`${a.median_temp.toFixed(1)}° median high`,i=`${a.name}${a.region?`, ${a.region}`:""} — GO, ${r}, ${a.best_run} clean-day run; open destination page.`;return`<li class="top-go-card">
        <a class="top-go-link" href="${ee(a.slug)}" aria-label="${l(i)}">
          <span class="top-go-header">
            <span class="top-go-pill verdict-go" aria-hidden="true">GO</span>
            <span class="top-go-temp" aria-hidden="true">${a.median_temp.toFixed(1)}°</span>
          </span>
          <span class="top-go-title">
            <span class="top-go-name">${l(a.name)}</span>
            ${s}
          </span>
          <span class="top-go-strip" aria-hidden="true">${X(a.daily)}</span>
        </a>
      </li>`}).join("");return`<div class="top-go-row" aria-label="Top GO destinations">
      <p class="top-go-eyebrow">Top ${n.length} GO ${n.length===1?"destination":"destinations"}</p>
      <ul class="top-go-list">${t}</ul>
    </div>`}function ae(e,n){e.innerHTML=`
    <section class="hero hero-empty" aria-live="polite">
      <p class="hero-eyebrow">Cycling Weather</p>
      <p class="hero-empty-msg">${l(n)}</p>
    </section>
  `}function se(e){const n=typeof e.mount=="string"?document.querySelector(e.mount):e.mount;if(!n)return;const{hero:t,latest:a,changelog:s,climatology:r}=e.data;if(!t||!a||a.results.length===0){ae(n,"No snapshot yet — the daily forecast will appear here.");return}const i=t.verdict,c=t.editorial&&t.editorial.trim().length>0?t.editorial:`Top pick: ${t.top_name}.`,p=t.top_region?`<span class="hero-region">${l(t.top_region)}</span>`:"",u=typeof t.top_median_temp=="number"?`<span class="hero-stat"><span class="hero-stat-num">${t.top_median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>`:"",f=`<span class="hero-stat"><span class="hero-stat-num">${t.go_count}<span class="hero-stat-divider">/</span>${t.total_count}</span><span class="hero-stat-label">go destinations</span></span>`,d=t.top_best_run!==null&&t.top_best_run>0?`<span class="hero-stat"><span class="hero-stat-num">${t.top_best_run}</span><span class="hero-stat-label">clean-day run</span></span>`:"",m=J(s),C=m.length>0?`<div class="changelog-row" aria-label="What changed since yesterday">
           <p class="changelog-eyebrow">Since yesterday</p>
           <ul class="changelog-list">${m.map(K).join("")}</ul>
         </div>`:"",q=te(a.results),R=I(r,t.top_name),S=G(t.top_median_temp,R,r,t.top_name),w=B(S,`Climatology comparison for ${t.top_name}`),y=t.forecast_date||a.forecast_date,k=y?_(y):"",D=`Forecast ${l(y||"—")}${k?` · ${l(k)}`:""} · ${a.results.length} destinations · ${a.forecast_days}-day window`;n.innerHTML=`
    <section class="hero hero-${i}" aria-live="polite">
      <div class="hero-header">
        <span class="hero-verdict-pill verdict-${i}" aria-label="${l(W[i])}">${P[i]}</span>
        <p class="hero-eyebrow"><span class="visually-hidden">Today's </span>top pick</p>
      </div>
      <h1 class="hero-destination">
        <a class="hero-destination-link" href="./index.html#${l(t.top_slug)}">${l(t.top_name)}</a>
        ${p}
      </h1>
      <p class="hero-editorial">${l(c)}</p>
      <p class="hero-window">${l(z(t))}</p>
      <div class="hero-stats">${u}${d}${f}</div>
      ${w}
      ${q}
      ${C}
      <p class="hero-meta">${D}</p>
    </section>
  `}function o(e){return e.replace(/[&<>"']/g,n=>n==="&"?"&amp;":n==="<"?"&lt;":n===">"?"&gt;":n==='"'?"&quot;":"&#39;")}function re(e){const n=["th","st","nd","rd"],t=e%100;return`${e}${n[(t-20)%10]??n[t]??n[0]}`}function h(e){if(!e)return"";const n=new Date(`${e}T00:00:00Z`);return Number.isNaN(n.getTime())?e:n.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function x(e){return`./destination.html?slug=${encodeURIComponent(e)}`}function ie(e,n){const t=b(e,n),a=new Map;return b(e,$).forEach((s,r)=>{a.set(s.result.name,r+1)}),t.map((s,r)=>({...s,rank:r+1,pythonRank:a.get(s.result.name)??r+1}))}function E(e){return e.result.daily.map((n,t)=>{const a=T(n.temp_max),s=M(n.precip_sum,n.precip_prob_max),r=L(n.wind_max),i=e.qualifies[t]===!0,c=["strip-cell",`rain-${s}`,`wind-${r}`,i?"is-qualify":""].filter(Boolean).join(" "),p=`${n.date}: ${n.temp_max.toFixed(0)}°C, ${n.precip_sum.toFixed(1)}mm rain (${Math.round(n.precip_prob_max)}% probability), ${n.wind_max.toFixed(0)} km/h wind${i?", qualifies":""}`;return`<span class="${c}" style="--cell-fill:${a}" role="img" aria-label="${o(p)}"></span>`}).join("")}function oe(e){return e.qualifier?'<span class="status-pill verdict-go">GO</span>':e.bestRun>=v?`<span class="status-pill verdict-edge">EDGE · ${e.bestRun}d</span>`:'<span class="status-pill verdict-no-go">NO-GO</span>'}function le(e){if(e.bestRun===0)return'<span class="run-badge run-zero">No clean run</span>';const n=e.bestStart&&e.bestEnd?e.bestStart===e.bestEnd?h(e.bestStart):`${h(e.bestStart)} → ${h(e.bestEnd)}`:"";return`<span class="run-badge"><span class="run-badge-num">${e.bestRun}</span><span class="run-badge-label">clean ${e.bestRun===1?"day":"days"}${n?` · ${o(n)}`:""}</span></span>`}function ce(e){const n=e.result.region?`<span class="rank-card-region">${o(e.result.region)}</span>`:"",t=!e.qualifier&&e.result.blocker?`<p class="rank-card-blocker">${o(e.result.blocker)}</p>`:"";return`<li class="rank-card" id="${o(e.result.slug)}" data-slug="${o(e.result.slug)}" data-region="${o(e.result.region??"")}" data-qualifier="${e.qualifier?"1":"0"}">
    <a class="rank-card-link" href="${x(e.result.slug)}">
      <header class="rank-card-header">
        <span class="rank-card-rank" aria-label="Rank ${e.rank}">${e.rank}</span>
        <div class="rank-card-title">
          <span class="rank-card-name">${o(e.result.name)}</span>
          ${n}
        </div>
        ${oe(e)}
      </header>
      <div class="rank-card-stats">
        <span class="rank-stat"><span class="rank-stat-num">${e.medianTemp.toFixed(1)}°</span><span class="rank-stat-label">median high</span></span>
        <span class="rank-stat"><span class="rank-stat-num">${e.dryDays}</span><span class="rank-stat-label">dry days</span></span>
        ${le(e)}
      </div>
      <div class="rank-card-strip" aria-hidden="true">${E(e)}</div>
      ${t}
    </a>
  </li>`}function ue(e){if(e.qualifier)return'<span class="qualifier-badge">GO</span>';const n=e.result.blocker?` <span class="blocker">· ${o(e.result.blocker)}</span>`:"";return e.bestRun>=v?`<span class="status-pill verdict-edge">EDGE · ${e.bestRun}d</span>${n}`:`<span class="status-pill verdict-no-go">NO-GO</span>${n}`}function de(e){const n=e.result.region?`<span class="region">${o(e.result.region)}</span>`:"";return`<tr id="${o(e.result.slug)}-row" data-slug="${o(e.result.slug)}" data-region="${o(e.result.region??"")}" data-qualifier="${e.qualifier?"1":"0"}">
    <td class="rank">${e.rank}</td>
    <td><a class="dest dest-link" href="${x(e.result.slug)}">${o(e.result.name)}</a>${n}</td>
    <td class="cell-num">${e.medianTemp.toFixed(1)}°C</td>
    <td><div class="strip">${E(e)}</div></td>
    <td class="cell-num">${e.bestRun}${e.bestStart?` · ${o(h(e.bestStart))}`:""}</td>
    <td class="cell-num">${e.dryDays}</td>
    <td>${ue(e)}</td>
  </tr>`}function pe(){return`<li class="rank-empty">
    <p class="rank-empty-title">No destinations match.</p>
    <p class="rank-empty-msg">Try widening your thresholds or pick a different region.</p>
  </li>`}function fe(){return'<tr class="rank-empty-row"><td colspan="7"><span class="rank-empty-title">No destinations match.</span> <span class="rank-empty-msg">Try widening your thresholds or pick a different region.</span></td></tr>'}function me(e){if(e.length===0)return"No destinations match the current filter.";const n=e[0];if(!n)return"";const t=`${n.result.name} ranks ${re(n.rank)} with median high ${n.medianTemp.toFixed(0)}°C and ${n.dryDays} dry days.`,a=e.filter(r=>r.qualifier).length,s=a===0?"No destinations currently qualify.":a===1?"1 destination currently qualifies.":`${a} destinations currently qualify.`;return`${t} ${s}`}function ge(e,n){return n==="all"?e:n==="qualifiers"?e.filter(t=>t.qualifier):e.filter(t=>t.result.region===n)}function he(e){return Array.from(new Set(e.map(n=>n.region).filter(n=>typeof n=="string"&&n.length>0))).sort()}function $e(e,n){const t=he(e);return[{key:"all",label:"All"},{key:"qualifiers",label:"Qualifiers only"},...t.map(s=>({key:s,label:s}))].map(s=>`<button type="button" class="chip${s.key===n?" active":""}" data-filter="${o(String(s.key))}" role="tab" aria-selected="${s.key===n?"true":"false"}">${o(s.label)}</button>`).join("")}function g(e,n){const t=typeof e=="string"?document.querySelector(e):e;if(!t)throw new Error(`mountRanking: ${n} mount not found`);return t}function ye(e){const n=g(e.cardsMount,"cards"),t=g(e.tableMount,"table"),a=g(e.filtersMount,"filters"),s=e.liveRegionMount?g(e.liveRegionMount,"live region"):null;let r={thresholds:$,filter:"all"};function i(){const u=typeof performance<"u"&&typeof performance.now=="function"?performance.now():0,f=ie(e.results,r.thresholds),d=ge(f,r.filter);if(d.length===0?(n.innerHTML=pe(),t.innerHTML=fe()):(n.innerHTML=d.map(ce).join(""),t.innerHTML=d.map(de).join("")),s&&(s.textContent=me(d)),typeof performance<"u"&&typeof performance.mark=="function"){const m=typeof performance.now=="function"?performance.now()-u:0;m>16&&console.warn(`[ranking] render took ${m.toFixed(1)}ms (budget 16ms)`)}}function c(){a.innerHTML=$e(e.results,r.filter)}function p(u){const f=u.target?.closest("[data-filter]");if(!f)return;const d=f.dataset.filter??"all";r={...r,filter:d},c(),i()}return a.addEventListener("click",p),c(),i(),{setThresholds(u){r={...r,thresholds:u},i()},setFilter(u){r={...r,filter:u},c(),i()},destroy(){a.removeEventListener("click",p),n.innerHTML="",t.innerHTML="",a.innerHTML="",s&&(s.textContent="")}}}const be=36*60*60*1e3;function _e(e){return e.replace(/[&<>"']/g,n=>n==="&"?"&amp;":n==="<"?"&lt;":n===">"?"&gt;":n==='"'?"&quot;":"&#39;")}function ke(e,n){const t=Date.parse(e);if(!Number.isFinite(t))return e;const s=Math.max(0,n-t)/36e5;if(s<24){const i=Math.max(1,Math.round(s));return`${i} hour${i===1?"":"s"} ago`}const r=Math.floor(s/24);if(r<14)return`${r} day${r===1?"":"s"} ago`;try{return new Date(t).toLocaleDateString(void 0,{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}catch{return e}}function ve(e,n=Date.now()){const t=Date.parse(e);return Number.isFinite(t)?n-t>be:!1}function Te(e){const n=typeof e.mount=="string"?document.querySelector(e.mount):e.mount;if(!n)return;const t=e.now??Date.now();if(!(e.force===!0||ve(e.generatedAt,t))){n.innerHTML="";return}const s=e.generatedAt?ke(e.generatedAt,t):"an unknown time ago";n.innerHTML=`
    <div class="stale-banner" role="status" aria-live="polite">
      <span class="stale-banner-icon" aria-hidden="true">⚠</span>
      <span class="stale-banner-text">Forecast may be stale — last refreshed ${_e(s)}.</span>
    </div>
  `}const Me=(()=>{try{return new URLSearchParams(window.location.search).get("stale")==="1"}catch{return!1}})();F({mount:"#site-header",active:"forward"});H();O().then(e=>{Te({mount:"#stale-banner-mount",generatedAt:e.generated_at,force:Me}),se({mount:"#hero-mount",data:e}),N("#footer-freshness",e);const n=e.latest;if(!n||n.results.length===0)return;const t=ye({cardsMount:"#rank-cards",tableMount:"#rank-body",filtersMount:"#filters",liveRegionMount:"#rank-summary",results:n.results});U({trigger:"#threshold-trigger"}),window.addEventListener("cwthresholds:change",s=>{const r=s.detail;t.setThresholds(r.thresholds)});const a=document.getElementById("world-map-mount");if(a){const s=()=>{j(async()=>{const{mountWorldMap:r}=await import("./world-map-THgiJqcb.js");return{mountWorldMap:r}},[],import.meta.url).then(({mountWorldMap:r})=>{r({mount:a,results:n.results}),a.removeAttribute("aria-busy")}).catch(r=>{console.warn("world-map: import failed",r),a.innerHTML='<p class="world-map-empty">Map unavailable offline.</p>',a.removeAttribute("aria-busy")})};if(typeof IntersectionObserver>"u")s();else{const r=new IntersectionObserver(i=>{for(const c of i)if(c.isIntersecting){r.disconnect(),s();break}},{rootMargin:"200px 0px"});r.observe(a)}}}).catch(e=>{console.warn("homepage: data.json fetch failed",e);const n=document.getElementById("footer-freshness");n&&(n.textContent="data.json offline — try again when reconnected.");const t=document.getElementById("hero-mount");t&&!t.firstChild&&(t.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see today's ranking.</p>
        </section>
      `)});
