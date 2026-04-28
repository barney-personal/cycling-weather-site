import{g as D}from"./destination-meta-xTBeTcjo.js";import{d as R,b as M,D as k}from"./qualify-B3rFEBhf.js";const E=30,S=5;function d(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}function L(t,e){const r=new Date(`${t}T00:00:00Z`);return r.setUTCDate(r.getUTCDate()+e),r.toISOString().slice(0,10)}function $(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function N(t){if(t.length===0)return 0;const e=[...t].sort((o,l)=>o-l),r=Math.floor(e.length/2);return e.length%2===0?(e[r-1]+e[r])/2:e[r]}function y(t){return`${t.slug}:${t.start}:${t.length}`}function q(t,e,r,o){const l=new Set(o.map(y)),a=[];for(const n of t){const i=D(n.slug).departureRegion;if(!(e.region!=="any"&&i!==e.region))for(const g of n.daily){if(g.date<e.start)continue;const s=L(g.date,e.length-1);if(s>e.end)continue;const c=n.daily.filter(p=>p.date>=g.date&&p.date<=s);if(c.length===0)continue;const f=c.map(p=>R(p,r)),m=f.filter(Boolean).length,h=M(f),u=N(c.map(p=>p.temp_max));a.push({slug:n.slug,name:n.name,region:i,start:g.date,endDate:s,length:e.length,qualifyCount:m,totalDays:c.length,bestRunLen:h.length,medianTemp:u,score:m*100+u,saved:l.has(y({slug:n.slug,start:g.date,length:e.length}))})}}return a.sort((n,i)=>i.score-n.score||n.name.localeCompare(i.name)||n.start.localeCompare(i.start)),a.slice(0,E)}function H(t,e,r){const o=r.find(i=>i.slug===t.slug),l=o?o.name:t.slug,a=L(t.start,t.length-1),n=`${$(t.start)} – ${$(a)}`;return`<li class="trip-sl-item">
    <a class="trip-sl-link" href="./destination.html?slug=${encodeURIComponent(t.slug)}">
      <span class="trip-sl-name">${d(l)}</span>
      <span class="trip-sl-meta">${d(n)} · ${t.length}d</span>
    </a>
    <button type="button" class="trip-sl-remove" data-idx="${e}" aria-label="Remove ${d(l)} from shortlist">×</button>
  </li>`}function U(t,e){if(t.length===0)return"";const r=t.map((o,l)=>H(o,l,e)).join("");return`<div class="trip-shortlist" role="region" aria-label="Saved trips">
    <div class="trip-sl-head">
      <h3 class="trip-sl-title">Shortlist <span class="trip-sl-count">${t.length}/${S}</span></h3>
      <button type="button" class="trip-sl-copy" aria-label="Copy shareable link to clipboard">Copy link</button>
    </div>
    <ol class="trip-sl-list">${r}</ol>
  </div>`}function I(t,e){const r=`./destination.html?slug=${encodeURIComponent(t.slug)}`,o=D(t.slug),l=`${$(t.start)} → ${$(t.endDate)}`,a=t.qualifyCount===t.totalDays?"go":t.qualifyCount>=Math.ceil(t.totalDays/2)?"edge":"no-go",n=a==="go"?"GO":a==="edge"?"EDGE":"NO-GO",i=t.saved?"Remove":"Save";return`<li class="trip-card" data-verdict="${a}">
    <div class="trip-card-rank" aria-hidden="true">${e}</div>
    <div class="trip-card-body">
      <header class="trip-card-head">
        <h3 class="trip-card-name"><a href="${r}">${d(t.name)}</a></h3>
        <span class="trip-card-region region-${d(t.region)}">${d(t.region)}</span>
        ${o.airport?`<span class="trip-card-airport">${d(o.airport)}</span>`:""}
      </header>
      <p class="trip-card-dates">${d(l)}</p>
      <dl class="trip-card-stats">
        <div><dt>Clean</dt><dd class="tabular">${t.qualifyCount}/${t.totalDays}</dd></div>
        <div><dt>Best run</dt><dd class="tabular">${t.bestRunLen}d</dd></div>
        <div><dt>Median</dt><dd class="tabular">${t.medianTemp.toFixed(0)}°C</dd></div>
      </dl>
    </div>
    <div class="trip-card-aside">
      <span class="trip-card-verdict verdict-${a}" aria-label="Verdict ${n}">${n}</span>
      <button type="button" class="trip-card-save${t.saved?" is-saved":""}" data-slug="${d(t.slug)}" data-start="${d(t.start)}" data-length="${t.length}" aria-label="${i} ${d(t.name)} ${d(l)}">${t.saved?"Saved":"Save"}</button>
    </div>
  </li>`}function B(t){const{mount:e,results:r,onShortlistChange:o}=t;let l=k,a={start:"",end:"",length:7,region:"any"},n=[...t.initialShortlist];function i(){if(!a.start||!a.end)return;const s=q(r,a,l,n),c=s.length>0?`${s.length} combination${s.length===1?"":"s"} found`:"",f=s.length===0?`<div class="trip-empty"><p class="trip-empty-title">No ${a.length}-day trips found in this window.</p><p class="trip-empty-hint">Try widening your date range, shortening the trip, or loosening thresholds.</p></div>`:`<ul class="trip-results" aria-label="Ranked trip combinations">${s.map((m,h)=>I(m,h+1)).join("")}</ul>`;e.innerHTML=U(n,r)+(c?`<p class="trip-summary" aria-live="polite">${d(c)}</p>`:"")+f}function g(s){const c=s.target;if(!(c instanceof HTMLElement))return;const f=c.closest(".trip-card-save");if(f){s.preventDefault();const{slug:u,start:p,length:v}=f.dataset;if(!u||!p||!v)return;const b={slug:u,start:p,length:Number(v)},x=y(b),C=n.findIndex(T=>y(T)===x);C>=0?n=n.filter((T,w)=>w!==C):n.length<S&&(n=[...n,b]),o(n),i();return}const m=c.closest(".trip-sl-remove");if(m){s.preventDefault();const u=Number(m.dataset.idx);if(!Number.isFinite(u)||u<0||u>=n.length)return;n=n.filter((p,v)=>v!==u),o(n),i();return}const h=c.closest(".trip-sl-copy");if(h){s.preventDefault(),typeof navigator?.clipboard?.writeText=="function"&&navigator.clipboard.writeText(window.location.href).catch(()=>{});const u=h.textContent;h.textContent="Copied!",setTimeout(()=>{h.textContent=u},2e3)}}return e.addEventListener("click",g),{setThresholds(s){l=s,i()},setConstraints(s){s.start===a.start&&s.end===a.end&&s.length===a.length&&s.region===a.region||(a=s,i())},destroy(){e.removeEventListener("click",g),e.innerHTML=""}}}export{B as mountTripMode};
