const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./polar-DjZUplHj.js","./path-CXeFd1JH.js"])))=>i.map(i=>d[i]);
import{m as H,r as q,l as E,a as F}from"./data-DMgXfQBQ.js";import{_ as R}from"./preload-helper-CmsKOCeN.js";import{g as S,f as v,h as N}from"./destination-meta-xTBeTcjo.js";import{d as I,D as O,b as A}from"./qualify-BbAyxwK0.js";function a(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}function y(t){if(!t)return"";const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function w(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}const B={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",96:"Thunder + hail",99:"Heavy thunder"},P={0:"☀",1:"🌤",2:"⛅",3:"☁",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",61:"🌧",63:"🌧",65:"🌧",71:"❄",73:"❄",75:"❄",77:"❄",80:"🌧",81:"🌧",82:"⛈",95:"⛈",96:"⛈",99:"⛈"};function U(t){return B[t]??`Code ${t}`}function j(t){return P[t]??"·"}function W(t,e){return e?"go":t>=5?"edge":"no-go"}function Z(t,e){return t.latest?t.latest.results.find(n=>n.slug===e)??null:null}function z(t,e){return t.filter(n=>n.name===e).slice().sort((n,l)=>n.date.localeCompare(l.date)).slice(-30)}function G(t){return t.length===0?'<p class="dest-routes-empty">Curated route notes coming soon.</p>':`<ul class="dest-routes">${t.map(e=>`<li class="dest-route">
        <span class="dest-route-name">${a(e.name)}</span>
        ${e.distanceKm||e.ascentM?`<span class="dest-route-stats">${e.distanceKm?`${e.distanceKm} km`:""}${e.distanceKm&&e.ascentM?" · ":""}${e.ascentM?`${e.ascentM} m`:""}</span>`:""}
        ${e.note?`<span class="dest-route-note">${a(e.note)}</span>`:""}
      </li>`).join("")}</ul>`}function K(t){return t.length===0?"":`<ul class="dest-tags" aria-label="Ride types">${t.map(e=>`<li class="dest-tag">${a(e)}</li>`).join("")}</ul>`}function Q(t,e,n){return`<li class="dest-day${e?" is-qualify":""}" aria-label="${a(`Day ${n+1}: ${w(t.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${a(w(t.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${j(t.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${t.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${t.precip_sum.toFixed(1)} mm · ${Math.round(t.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${t.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${a(U(t.weather_code))}</dd></div>
    </dl>
    ${e?'<p class="dest-day-badge">Qualifies</p>':""}
  </li>`}function V(t){if(t.length===0)return'<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>';const e=t.map(i=>{const s=`hsl(${(220-(Math.min(35,Math.max(5,i.temp_max))-5)/30*202).toFixed(0)}, 55%, 55%)`,d=i.precip_sum>1?"wet":i.precip_sum>0?"light":"clean",m=`${i.date}: ${i.temp_max.toFixed(0)}°C, ${i.precip_sum.toFixed(1)} mm rain, ${i.wind_max.toFixed(0)} km/h wind${i.qualify?", qualified":""}`;return`<span class="dest-climatology-cell rain-${d}${i.qualify?" is-qualify":""}" style="--cell-fill:${s}" role="img" aria-label="${a(m)}"></span>`}).join(""),n=t.filter(i=>i.precip_sum<=.1).length,l=t.filter(i=>i.qualify).length;return`<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${e}</div>
    <p class="dest-climatology-summary">Last ${t.length} days · ${n} dry · ${l} would have qualified.</p>
  </div>`}function Y(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?"this month":e.toLocaleDateString(void 0,{month:"long",timeZone:"UTC"})}function J(t,e,n,l,i){const s=Y(n??t.daily[0]?.date??""),d=n?new Date(`${n}T00:00:00Z`).getUTCMonth()+1:new Date().getUTCMonth()+1,c=e.bestMonths.includes(d)?`${s} sits inside the favoured riding window (${v(e.bestMonths)}).`:e.bestMonths.length>0?`${s} is outside the typical sweet spot (${v(e.bestMonths)}).`:"Best months are still being collected.",o=i?`Yes — the next 14 days produce a clean ${l}-day window.`:l>=5?`Maybe — the forecast shows a ${l}-day stretch that's almost there. Consider widening rain or wind tolerance.`:"Not yet — no contiguous clean window is in the next 14 days.";return`<dl class="dest-faq">
    <div>
      <dt>Is ${a(t.name)} good for cycling in ${a(s)}?</dt>
      <dd>${a(o)} ${a(c)}</dd>
    </div>
    <div>
      <dt>What's the climate like overall?</dt>
      <dd>${a(e.climateNote)}</dd>
    </div>
    <div>
      <dt>How would I get there?</dt>
      <dd>${e.airport?`Closest airport: ${a(e.airport)}.`:"Local rail or road access only."} Departure region: ${a(e.departureRegion)}.</dd>
    </div>
  </dl>`}function X(t,e){t.innerHTML=`
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${a(e?`"${e}"`:"selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`}function ee(t){const{mount:e,data:n,slug:l}=t,i=t.thresholds??O,s=Z(n,l);if(!s){X(e,l);return}const d=S(l),m=N(l),c=s.daily.map(r=>I(r,i)),o=A(c),_=s.daily.reduce((r,p)=>r+(p.precip_sum<=i.rainMax&&p.precip_prob_max<i.probMax?1:0),0),x=["lake-district","peak-district","yorkshire-dales","south-wales","london-surrey-hills"].includes(l),g=o.length>=7&&(!x||s.median_temp>20),u=W(o.length,g),$=n.latest?.forecast_date??null,D=z(n.actuals_timeline,s.name),k=s.region?`<span class="dest-region">${a(s.region)}</span>`:"",M=u==="go"?"GO":u==="edge"?"EDGE":"NO-GO",T=o.startIdx!==null&&o.endIdx!==null?o.startIdx===o.endIdx?y(s.daily[o.startIdx]?.date??null):`${y(s.daily[o.startIdx]?.date??null)} → ${y(s.daily[o.endIdx]?.date??null)}`:"—",C=!g&&s.blocker?`<p class="dest-blocker">${a(s.blocker)}</p>`:"",L=m?"":'<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>';e.innerHTML=`
    <article class="dest-page" data-slug="${a(l)}" data-verdict="${u}">
      <p class="dest-back"><a class="dest-back-link" href="./index.html">← All destinations</a></p>

      <header class="dest-header hero hero-${u}" aria-labelledby="dest-title">
        <div class="hero-header">
          <span class="hero-verdict-pill verdict-${u}">${M}</span>
          <p class="hero-eyebrow">14-day outlook</p>
        </div>
        <h1 id="dest-title" class="hero-destination">
          <span class="dest-title-name">${a(s.name)}</span>
          ${k}
        </h1>
        <p class="hero-editorial">${a(d.terrain)}</p>
        <p class="hero-window">Best window: ${a(T)} · ${o.length} clean ${o.length===1?"day":"days"}${$?` · forecast ${a(y($))}`:""}</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${s.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${_}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${o.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${C}
        ${K(d.rideTypes)}
      </header>

      ${L}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${s.daily.map((r,p)=>Q(r,c[p]===!0,p)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${a(s.name)}</h2>
        ${V(D)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${G(d.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${J(s,d,$,o.length,g)}
      </section>
    </article>`;const h=e.querySelector("#dest-polar-mount");h&&R(async()=>{const{mountPolar:r}=await import("./polar-DjZUplHj.js");return{mountPolar:r}},__vite__mapDeps([0,1]),import.meta.url).then(({mountPolar:r})=>{r({mount:h,days:s.daily,qualifies:c,label:s.name}),h.removeAttribute("aria-busy")}).catch(()=>{h.innerHTML='<p class="polar-empty">Polar chart unavailable.</p>',h.removeAttribute("aria-busy")})}H({mount:"#site-header",active:"forward"});q();const te=new URLSearchParams(window.location.search),b=(te.get("slug")??"").toLowerCase(),f=document.getElementById("dest-mount");f&&(f.dataset.slug=b,E().then(t=>{ee({mount:f,data:t,slug:b}),F("#footer-freshness",t);const e=t.latest?.results.find(n=>n.slug===b);e&&(document.title=`${e.name} · Cycling Weather`)}).catch(t=>{console.warn("destination: data.json fetch failed",t);const e=document.getElementById("footer-freshness");e&&(e.textContent="data.json offline — try again when reconnected."),f.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `}));
