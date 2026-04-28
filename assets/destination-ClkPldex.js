const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./polar-DjZUplHj.js","./path-CXeFd1JH.js"])))=>i.map(i=>d[i]);
import{m as L,r as C,l as I,a as R}from"./data-By_xB9v0.js";import{_ as N}from"./preload-helper-CmsKOCeN.js";import{g as E,f as F,h as q}from"./destination-meta-xTBeTcjo.js";import{d as S,D as A,b as B}from"./qualify-BbAyxwK0.js";function i(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}function x(t){if(!t)return"";const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function H(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}const j={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",96:"Thunder + hail",99:"Heavy thunder"},P={0:"☀",1:"🌤",2:"⛅",3:"☁",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",61:"🌧",63:"🌧",65:"🌧",71:"❄",73:"❄",75:"❄",77:"❄",80:"🌧",81:"🌧",82:"⛈",95:"⛈",96:"⛈",99:"⛈"};function O(t){return j[t]??`Code ${t}`}function W(t){return P[t]??"·"}function U(t,e){return e?"go":t>=5?"edge":"no-go"}function Z(t,e){return t.latest?t.latest.results.find(o=>o.slug===e)??null:null}function G(t,e){return t.filter(o=>o.name===e).slice().sort((o,n)=>o.date.localeCompare(n.date)).slice(-30)}function K(t){return t.length===0?'<p class="dest-routes-empty">Curated route notes coming soon.</p>':`<ul class="dest-routes">${t.map(e=>`<li class="dest-route">
        <span class="dest-route-name">${i(e.name)}</span>
        ${e.distanceKm||e.ascentM?`<span class="dest-route-stats">${e.distanceKm?`${e.distanceKm} km`:""}${e.distanceKm&&e.ascentM?" · ":""}${e.ascentM?`${e.ascentM} m`:""}</span>`:""}
        ${e.note?`<span class="dest-route-note">${i(e.note)}</span>`:""}
      </li>`).join("")}</ul>`}function V(t){return t.length===0?"":`<ul class="dest-tags" aria-label="Ride types">${t.map(e=>`<li class="dest-tag">${i(e)}</li>`).join("")}</ul>`}function Y(t,e=3){if(t.length<e)return null;let o=Number.NEGATIVE_INFINITY,n=0;for(let p=0;p<=t.length-e;p++){let d=0;for(let l=p;l<p+e;l++){const y=t[l];d+=y.temp-y.precip*10-y.wind*.3}d>o&&(o=d,n=p)}const a=t[n].time.replace(/^0/,""),s=t[n+e-1].time.replace(/^0/,""),r=p=>{const d=Number.parseInt(p,10);return d<12?`${d}am`:d===12?"12pm":`${d-12}pm`};return{startIdx:n,endIdx:n+e-1,label:`Ride ${r(a)}–${r(s)}`}}function z(t,e){if(t.length===0)return"";const o=180,n=48,a=4,s=12,r=n-a-s,p=t.map(c=>c.temp),d=Math.min(...p),y=Math.max(...p)-d||1,m=o/Math.max(t.length-1,1),g=c=>a+r-(c-d)/y*r,b=t.map((c,u)=>`${(u*m).toFixed(1)},${g(c.temp).toFixed(1)}`).join(" "),_=t.map((c,u)=>{if(c.precip<=0)return"";const h=Math.min(r*.6,Math.max(2,c.precip/5*r*.6));return`<rect x="${(u*m-m*.2).toFixed(1)}" y="${(n-s-h).toFixed(1)}" width="${(m*.4).toFixed(1)}" height="${h.toFixed(1)}" class="spark-precip"/>`}).join("");let v="";if(e){const c=e.startIdx*m,u=e.endIdx*m;v=`<rect x="${(c-m*.3).toFixed(1)}" y="${a}" width="${(u-c+m*.6).toFixed(1)}" height="${r}" class="spark-window" rx="3"/>`}const k=t[0].time.replace(/^0/,""),M=t[t.length-1].time.replace(/^0/,""),T=t.map(c=>`<tr><td>${i(c.time)}</td><td>${c.temp.toFixed(0)}°</td><td>${c.precip.toFixed(1)}mm</td><td>${c.wind.toFixed(0)}km/h</td></tr>`).join("");return`<div class="dest-day-hourly">
    <svg class="dest-day-spark" viewBox="0 0 ${o} ${n}" preserveAspectRatio="none" aria-hidden="true">
      ${v}
      ${_}
      <polyline points="${b}" class="spark-temp"/>
    </svg>
    <div class="spark-axis" aria-hidden="true">
      <span>${i(k)}</span>
      <span>${i(M)}</span>
    </div>
    <table class="visually-hidden" aria-label="Hourly forecast">
      <thead><tr><th>Time</th><th>Temp</th><th>Precip</th><th>Wind</th></tr></thead>
      <tbody>${T}</tbody>
    </table>
  </div>`}function Q(t,e,o){const n=t.hourly??[],a=Y(n),s=z(n,a),r=a&&n.length>0?`<p class="dest-day-window">${i(a.label)}</p>`:"";return`<li class="dest-day${e?" is-qualify":""}" aria-label="${i(`Day ${o+1}: ${H(t.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${i(H(t.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${W(t.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${t.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${t.precip_sum.toFixed(1)} mm · ${Math.round(t.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${t.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${i(O(t.weather_code))}</dd></div>
    </dl>
    ${s}
    ${r}
    ${e?'<p class="dest-day-badge">Qualifies</p>':""}
  </li>`}function J(t){if(t.length===0)return'<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>';const e=t.map(a=>{const s=`hsl(${(220-(Math.min(35,Math.max(5,a.temp_max))-5)/30*202).toFixed(0)}, 55%, 55%)`,r=a.precip_sum>1?"wet":a.precip_sum>0?"light":"clean",p=`${a.date}: ${a.temp_max.toFixed(0)}°C, ${a.precip_sum.toFixed(1)} mm rain, ${a.wind_max.toFixed(0)} km/h wind${a.qualify?", qualified":""}`;return`<span class="dest-climatology-cell rain-${r}${a.qualify?" is-qualify":""}" style="--cell-fill:${s}" role="img" aria-label="${i(p)}"></span>`}).join(""),o=t.filter(a=>a.precip_sum<=.1).length,n=t.filter(a=>a.qualify).length;return`<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${e}</div>
    <p class="dest-climatology-summary">Last ${t.length} days · ${o} dry · ${n} would have qualified.</p>
  </div>`}function X(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?"this month":e.toLocaleDateString(void 0,{month:"long",timeZone:"UTC"})}function tt(t,e,o,n,a){const s=X(o??t.daily[0]?.date??""),r=o?new Date(`${o}T00:00:00Z`).getUTCMonth()+1:new Date().getUTCMonth()+1,d=e.bestMonths.includes(r)?`${s} sits inside the favoured riding window (${F(e.bestMonths)}).`:e.bestMonths.length>0?`${s} is outside the typical sweet spot (${F(e.bestMonths)}).`:"Best months are still being collected.",l=a?`Yes — the next 14 days produce a clean ${n}-day window.`:n>=5?`Maybe — the forecast shows a ${n}-day stretch that's almost there. Consider widening rain or wind tolerance.`:"Not yet — no contiguous clean window is in the next 14 days.";return`<dl class="dest-faq">
    <div>
      <dt>Is ${i(t.name)} good for cycling in ${i(s)}?</dt>
      <dd>${i(l)} ${i(d)}</dd>
    </div>
    <div>
      <dt>What's the climate like overall?</dt>
      <dd>${i(e.climateNote)}</dd>
    </div>
    <div>
      <dt>How would I get there?</dt>
      <dd>${e.airport?`Closest airport: ${i(e.airport)}.`:"Local rail or road access only."} Departure region: ${i(e.departureRegion)}.</dd>
    </div>
  </dl>`}function et(t,e){t.innerHTML=`
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${i(e?`"${e}"`:"selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`}function st(t){const{mount:e,data:o,slug:n}=t,a=t.thresholds??A,s=Z(o,n);if(!s){et(e,n);return}const r=E(n),p=q(n),d=s.daily.map(h=>S(h,a)),l=B(d),y=s.daily.reduce((h,f)=>h+(f.precip_sum<=a.rainMax&&f.precip_prob_max<a.probMax?1:0),0),m=["lake-district","peak-district","yorkshire-dales","south-wales","london-surrey-hills"].includes(n),g=l.length>=7&&(!m||s.median_temp>20),$=U(l.length,g),b=o.latest?.forecast_date??null,_=G(o.actuals_timeline,s.name),v=s.region?`<span class="dest-region">${i(s.region)}</span>`:"",k=$==="go"?"GO":$==="edge"?"EDGE":"NO-GO",M=l.startIdx!==null&&l.endIdx!==null?l.startIdx===l.endIdx?x(s.daily[l.startIdx]?.date??null):`${x(s.daily[l.startIdx]?.date??null)} → ${x(s.daily[l.endIdx]?.date??null)}`:"—",T=!g&&s.blocker?`<p class="dest-blocker">${i(s.blocker)}</p>`:"",c=p?"":'<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>';e.innerHTML=`
    <article class="dest-page" data-slug="${i(n)}" data-verdict="${$}">
      <p class="dest-back"><a class="dest-back-link" href="./index.html">← All destinations</a></p>

      <header class="dest-header hero hero-${$}" aria-labelledby="dest-title">
        <div class="hero-header">
          <span class="hero-verdict-pill verdict-${$}">${k}</span>
          <p class="hero-eyebrow">14-day outlook</p>
        </div>
        <h1 id="dest-title" class="hero-destination">
          <span class="dest-title-name">${i(s.name)}</span>
          ${v}
        </h1>
        <p class="hero-editorial">${i(r.terrain)}</p>
        <p class="hero-window">Best window: ${i(M)} · ${l.length} clean ${l.length===1?"day":"days"}${b?` · forecast ${i(x(b))}`:""}</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${s.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${y}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${l.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${T}
        ${V(r.rideTypes)}
      </header>

      ${c}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${s.daily.map((h,f)=>Q(h,d[f]===!0,f)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${i(s.name)}</h2>
        ${J(_)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${K(r.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${tt(s,r,b,l.length,g)}
      </section>
    </article>`;const u=e.querySelector("#dest-polar-mount");u&&N(async()=>{const{mountPolar:h}=await import("./polar-DjZUplHj.js");return{mountPolar:h}},__vite__mapDeps([0,1]),import.meta.url).then(({mountPolar:h})=>{h({mount:u,days:s.daily,qualifies:d,label:s.name}),u.removeAttribute("aria-busy")}).catch(()=>{u.innerHTML='<p class="polar-empty">Polar chart unavailable.</p>',u.removeAttribute("aria-busy")})}L({mount:"#site-header",active:"forward"});C();const at=new URLSearchParams(window.location.search),D=(at.get("slug")??"").toLowerCase(),w=document.getElementById("dest-mount");w&&(w.dataset.slug=D,I().then(t=>{st({mount:w,data:t,slug:D}),R("#footer-freshness",t);const e=t.latest?.results.find(o=>o.slug===D);e&&(document.title=`${e.name} · Cycling Weather`)}).catch(t=>{console.warn("destination: data.json fetch failed",t);const e=document.getElementById("footer-freshness");e&&(e.textContent="data.json offline — try again when reconnected."),w.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `}));
