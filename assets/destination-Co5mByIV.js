const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./polar-DjZUplHj.js","./path-CXeFd1JH.js"])))=>i.map(i=>d[i]);
import{m as R,r as E,l as N,a as q}from"./data-DLBlaP8Y.js";import{f as S,a as A,r as B,_ as j}from"./climatology-line-C2Lrhry0.js";import{g as P,f as L,h as O}from"./destination-meta-xTBeTcjo.js";import{d as W,D as U,b as Z}from"./qualify-BbAyxwK0.js";function o(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}function _(t){if(!t)return"";const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function I(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}const G={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",96:"Thunder + hail",99:"Heavy thunder"},K={0:"☀",1:"🌤",2:"⛅",3:"☁",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",61:"🌧",63:"🌧",65:"🌧",71:"❄",73:"❄",75:"❄",77:"❄",80:"🌧",81:"🌧",82:"⛈",95:"⛈",96:"⛈",99:"⛈"};function V(t){return G[t]??`Code ${t}`}function Y(t){return K[t]??"·"}function z(t,e){return e?"go":t>=5?"edge":"no-go"}function Q(t,e){return t.latest?t.latest.results.find(i=>i.slug===e)??null:null}function J(t,e){return t.filter(i=>i.name===e).slice().sort((i,n)=>i.date.localeCompare(n.date)).slice(-30)}function X(t){return t.length===0?'<p class="dest-routes-empty">Curated route notes coming soon.</p>':`<ul class="dest-routes">${t.map(e=>`<li class="dest-route">
        <span class="dest-route-name">${o(e.name)}</span>
        ${e.distanceKm||e.ascentM?`<span class="dest-route-stats">${e.distanceKm?`${e.distanceKm} km`:""}${e.distanceKm&&e.ascentM?" · ":""}${e.ascentM?`${e.ascentM} m`:""}</span>`:""}
        ${e.note?`<span class="dest-route-note">${o(e.note)}</span>`:""}
      </li>`).join("")}</ul>`}function tt(t){return t.length===0?"":`<ul class="dest-tags" aria-label="Ride types">${t.map(e=>`<li class="dest-tag">${o(e)}</li>`).join("")}</ul>`}function et(t,e=3){if(t.length<e)return null;let i=Number.NEGATIVE_INFINITY,n=0;for(let p=0;p<=t.length-e;p++){let d=0;for(let l=p;l<p+e;l++){const m=t[l];d+=m.temp-m.precip*10-m.wind*.3}d>i&&(i=d,n=p)}const a=t[n].time.replace(/^0/,""),s=t[n+e-1].time.replace(/^0/,""),r=p=>{const d=Number.parseInt(p,10);return d<12?`${d}am`:d===12?"12pm":`${d-12}pm`};return{startIdx:n,endIdx:n+e-1,label:`Ride ${r(a)}–${r(s)}`}}function st(t,e){if(t.length===0)return"";const i=180,n=48,a=4,s=12,r=n-a-s,p=t.map(c=>c.temp),d=Math.min(...p),m=Math.max(...p)-d||1,h=i/Math.max(t.length-1,1),g=c=>a+r-(c-d)/m*r,f=t.map((c,y)=>`${(y*h).toFixed(1)},${g(c.temp).toFixed(1)}`).join(" "),M=t.map((c,y)=>{if(c.precip<=0)return"";const w=Math.min(r*.6,Math.max(2,c.precip/5*r*.6));return`<rect x="${(y*h-h*.2).toFixed(1)}" y="${(n-s-w).toFixed(1)}" width="${(h*.4).toFixed(1)}" height="${w.toFixed(1)}" class="spark-precip"/>`}).join("");let v="";if(e){const c=e.startIdx*h,y=e.endIdx*h;v=`<rect x="${(c-h*.3).toFixed(1)}" y="${a}" width="${(y-c+h*.6).toFixed(1)}" height="${r}" class="spark-window" rx="3"/>`}const T=t[0].time.replace(/^0/,""),D=t[t.length-1].time.replace(/^0/,""),C=t.map(c=>`<tr><td>${o(c.time)}</td><td>${c.temp.toFixed(0)}°</td><td>${c.precip.toFixed(1)}mm</td><td>${c.wind.toFixed(0)}km/h</td></tr>`).join("");return`<div class="dest-day-hourly">
    <svg class="dest-day-spark" viewBox="0 0 ${i} ${n}" preserveAspectRatio="none" aria-hidden="true">
      ${v}
      ${M}
      <polyline points="${f}" class="spark-temp"/>
    </svg>
    <div class="spark-axis" aria-hidden="true">
      <span>${o(T)}</span>
      <span>${o(D)}</span>
    </div>
    <table class="visually-hidden" aria-label="Hourly forecast">
      <thead><tr><th>Time</th><th>Temp</th><th>Precip</th><th>Wind</th></tr></thead>
      <tbody>${C}</tbody>
    </table>
  </div>`}function at(t,e,i){const n=t.hourly??[],a=et(n),s=st(n,a),r=a&&n.length>0?`<p class="dest-day-window">${o(a.label)}</p>`:"";return`<li class="dest-day${e?" is-qualify":""}" aria-label="${o(`Day ${i+1}: ${I(t.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${o(I(t.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${Y(t.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${t.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${t.precip_sum.toFixed(1)} mm · ${Math.round(t.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${t.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${o(V(t.weather_code))}</dd></div>
    </dl>
    ${s}
    ${r}
    ${e?'<p class="dest-day-badge">Qualifies</p>':""}
  </li>`}function nt(t){if(t.length===0)return'<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>';const e=t.map(a=>{const s=`hsl(${(220-(Math.min(35,Math.max(5,a.temp_max))-5)/30*202).toFixed(0)}, 55%, 55%)`,r=a.precip_sum>1?"wet":a.precip_sum>0?"light":"clean",p=`${a.date}: ${a.temp_max.toFixed(0)}°C, ${a.precip_sum.toFixed(1)} mm rain, ${a.wind_max.toFixed(0)} km/h wind${a.qualify?", qualified":""}`;return`<span class="dest-climatology-cell rain-${r}${a.qualify?" is-qualify":""}" style="--cell-fill:${s}" role="img" aria-label="${o(p)}"></span>`}).join(""),i=t.filter(a=>a.precip_sum<=.1).length,n=t.filter(a=>a.qualify).length;return`<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${e}</div>
    <p class="dest-climatology-summary">Last ${t.length} days · ${i} dry · ${n} would have qualified.</p>
  </div>`}function it(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?"this month":e.toLocaleDateString(void 0,{month:"long",timeZone:"UTC"})}function ot(t,e,i,n,a){const s=it(i??t.daily[0]?.date??""),r=i?new Date(`${i}T00:00:00Z`).getUTCMonth()+1:new Date().getUTCMonth()+1,d=e.bestMonths.includes(r)?`${s} sits inside the favoured riding window (${L(e.bestMonths)}).`:e.bestMonths.length>0?`${s} is outside the typical sweet spot (${L(e.bestMonths)}).`:"Best months are still being collected.",l=a?`Yes — the next 14 days produce a clean ${n}-day window.`:n>=5?`Maybe — the forecast shows a ${n}-day stretch that's almost there. Consider widening rain or wind tolerance.`:"Not yet — no contiguous clean window is in the next 14 days.";return`<dl class="dest-faq">
    <div>
      <dt>Is ${o(t.name)} good for cycling in ${o(s)}?</dt>
      <dd>${o(l)} ${o(d)}</dd>
    </div>
    <div>
      <dt>What's the climate like overall?</dt>
      <dd>${o(e.climateNote)}</dd>
    </div>
    <div>
      <dt>How would I get there?</dt>
      <dd>${e.airport?`Closest airport: ${o(e.airport)}.`:"Local rail or road access only."} Departure region: ${o(e.departureRegion)}.</dd>
    </div>
  </dl>`}function lt(t,e){t.innerHTML=`
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${o(e?`"${e}"`:"selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`}function rt(t){const{mount:e,data:i,slug:n}=t,a=t.thresholds??U,s=Q(i,n);if(!s){lt(e,n);return}const r=P(n),p=O(n),d=s.daily.map(u=>W(u,a)),l=Z(d),m=s.daily.reduce((u,x)=>u+(x.precip_sum<=a.rainMax&&x.precip_prob_max<a.probMax?1:0),0),h=["lake-district","peak-district","yorkshire-dales","south-wales","london-surrey-hills"].includes(n),g=l.length>=7&&(!h||s.median_temp>20),$=z(l.length,g),f=i.latest?.forecast_date??null,M=J(i.actuals_timeline,s.name),v=S(i.climatology,s.name),T=A(s.median_temp,v,i.climatology,s.name),D=B(T,`Climatology comparison for ${s.name}`),C=s.region?`<span class="dest-region">${o(s.region)}</span>`:"",c=$==="go"?"GO":$==="edge"?"EDGE":"NO-GO",y=l.startIdx!==null&&l.endIdx!==null?l.startIdx===l.endIdx?_(s.daily[l.startIdx]?.date??null):`${_(s.daily[l.startIdx]?.date??null)} → ${_(s.daily[l.endIdx]?.date??null)}`:"—",w=!g&&s.blocker?`<p class="dest-blocker">${o(s.blocker)}</p>`:"",H=p?"":'<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>';e.innerHTML=`
    <article class="dest-page" data-slug="${o(n)}" data-verdict="${$}">
      <p class="dest-back"><a class="dest-back-link" href="./index.html">← All destinations</a></p>

      <header class="dest-header hero hero-${$}" aria-labelledby="dest-title">
        <div class="hero-header">
          <span class="hero-verdict-pill verdict-${$}">${c}</span>
          <p class="hero-eyebrow">14-day outlook</p>
        </div>
        <h1 id="dest-title" class="hero-destination">
          <span class="dest-title-name">${o(s.name)}</span>
          ${C}
        </h1>
        <p class="hero-editorial">${o(r.terrain)}</p>
        <p class="hero-window">Best window: ${o(y)} · ${l.length} clean ${l.length===1?"day":"days"}${f?` · forecast ${o(_(f))}`:""}</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${s.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${m}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${l.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${w}
        ${D}
        ${tt(r.rideTypes)}
      </header>

      ${H}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${s.daily.map((u,x)=>at(u,d[x]===!0,x)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${o(s.name)}</h2>
        ${nt(M)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${X(r.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${ot(s,r,f,l.length,g)}
      </section>
    </article>`;const b=e.querySelector("#dest-polar-mount");b&&j(async()=>{const{mountPolar:u}=await import("./polar-DjZUplHj.js");return{mountPolar:u}},__vite__mapDeps([0,1]),import.meta.url).then(({mountPolar:u})=>{u({mount:b,days:s.daily,qualifies:d,label:s.name}),b.removeAttribute("aria-busy")}).catch(()=>{b.innerHTML='<p class="polar-empty">Polar chart unavailable.</p>',b.removeAttribute("aria-busy")})}R({mount:"#site-header",active:"forward"});E();const dt=new URLSearchParams(window.location.search),F=(dt.get("slug")??"").toLowerCase(),k=document.getElementById("dest-mount");k&&(k.dataset.slug=F,N().then(t=>{rt({mount:k,data:t,slug:F}),q("#footer-freshness",t);const e=t.latest?.results.find(i=>i.slug===F);e&&(document.title=`${e.name} · Cycling Weather`)}).catch(t=>{console.warn("destination: data.json fetch failed",t);const e=document.getElementById("footer-freshness");e&&(e.textContent="data.json offline — try again when reconnected."),k.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `}));
