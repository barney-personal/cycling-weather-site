const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./polar-D324EqHo.js","./path-CXeFd1JH.js"])))=>i.map(i=>d[i]);
import{m as R,r as q,l as B,a as A}from"./data-Dp-Xtcsy.js";import{d as W,D as O,b as j,_ as U}from"./qualify-B3rFEBhf.js";import{g as G,f as E,h as Z}from"./destination-meta-xTBeTcjo.js";import{f as K,a as Y,r as V}from"./climatology-line-BIbZZpuS.js";const z=3,Q=25,J=7,X=2;function k(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function ee(e,t){return e?e.destinations.find(a=>a.name===t)??null:null}function te(e,t){if(!e||!t||e.days.length===0)return null;const a=e.days.slice(0,J);let i=0,n=0,s=0,d=0;for(const c of a){if(c.models_count<X)continue;n+=1;const l=c.temp_spread_c,o=c.precip_prob_spread_pct,m=typeof l=="number"&&Number.isFinite(l)&&l>=z,u=typeof o=="number"&&Number.isFinite(o)&&o>=Q;(m||u)&&(i+=1),typeof l=="number"&&Number.isFinite(l)&&l>s&&(s=l),typeof o=="number"&&Number.isFinite(o)&&o>d&&(d=o)}return n===0||i===0?null:{isSplit:!0,splitDays:i,scoredDays:n,maxTempSpread:Math.round(s*10)/10,maxProbSpread:Math.round(d),leadDays:a.length,models:t.models}}function se(e){return e.startsWith("ecmwf")?"ECMWF":e.startsWith("gfs")?"GFS":e.startsWith("icon")?"ICON":e.startsWith("meteofrance")?"Météo-France":e.startsWith("gem")?"GEM":e.toUpperCase()}function ae(e){if(!e)return"";const t=e.splitDays===1?"day":"days",a=`Split forecast · ${e.splitDays} of next ${e.scoredDays} ${t}`,i=e.models.map(se).join(", ")||"multiple models",n=e.maxTempSpread>0?`up to ${e.maxTempSpread.toFixed(1)}°C apart`:"",s=e.maxProbSpread>0?`${e.maxProbSpread}% rain-prob gap`:"",d=[n,s].filter(Boolean).join(" · ")||"model envelope nontrivial",c=`Models disagree (${k(i)}): ${k(d)} across the next ${e.scoredDays}-day window.`;return`<span class="confidence-chip confidence-split" role="note" title="${c}" aria-label="${c}">
      <span class="confidence-icon" aria-hidden="true">⚠</span>
      <span class="confidence-text">${k(a)}</span>
      <span class="visually-hidden">${c}</span>
    </span>`}function r(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function _(e){if(!e)return"";const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function H(e){const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}const ne={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",96:"Thunder + hail",99:"Heavy thunder"},ie={0:"☀",1:"🌤",2:"⛅",3:"☁",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",61:"🌧",63:"🌧",65:"🌧",71:"❄",73:"❄",75:"❄",77:"❄",80:"🌧",81:"🌧",82:"⛈",95:"⛈",96:"⛈",99:"⛈"};function oe(e){return ne[e]??`Code ${e}`}function re(e){return ie[e]??"·"}function le(e,t){return t?"go":e>=5?"edge":"no-go"}function de(e,t){return e.latest?e.latest.results.find(a=>a.slug===t)??null:null}function ce(e,t){return e.filter(a=>a.name===t).slice().sort((a,i)=>a.date.localeCompare(i.date)).slice(-30)}function pe(e){return e.length===0?'<p class="dest-routes-empty">Curated route notes coming soon.</p>':`<ul class="dest-routes">${e.map(t=>`<li class="dest-route">
        <span class="dest-route-name">${r(t.name)}</span>
        ${t.distanceKm||t.ascentM?`<span class="dest-route-stats">${t.distanceKm?`${t.distanceKm} km`:""}${t.distanceKm&&t.ascentM?" · ":""}${t.ascentM?`${t.ascentM} m`:""}</span>`:""}
        ${t.note?`<span class="dest-route-note">${r(t.note)}</span>`:""}
      </li>`).join("")}</ul>`}function ue(e){return e.length===0?"":`<ul class="dest-tags" aria-label="Ride types">${e.map(t=>`<li class="dest-tag">${r(t)}</li>`).join("")}</ul>`}function me(e,t=3){if(e.length<t)return null;let a=Number.NEGATIVE_INFINITY,i=0;for(let c=0;c<=e.length-t;c++){let l=0;for(let o=c;o<c+t;o++){const m=e[o];l+=m.temp-m.precip*10-m.wind*.3}l>a&&(a=l,i=c)}const n=e[i].time.replace(/^0/,""),s=e[i+t-1].time.replace(/^0/,""),d=c=>{const l=Number.parseInt(c,10);return l<12?`${l}am`:l===12?"12pm":`${l-12}pm`};return{startIdx:i,endIdx:i+t-1,label:`Ride ${d(n)}–${d(s)}`}}function he(e,t){if(e.length===0)return"";const a=180,i=48,n=4,s=12,d=i-n-s,c=e.map(p=>p.temp),l=Math.min(...c),m=Math.max(...c)-l||1,u=a/Math.max(e.length-1,1),$=p=>n+d-(p-l)/m*d,g=e.map((p,f)=>`${(f*u).toFixed(1)},${$(p.temp).toFixed(1)}`).join(" "),T=e.map((p,f)=>{if(p.precip<=0)return"";const w=Math.min(d*.6,Math.max(2,p.precip/5*d*.6));return`<rect x="${(f*u-u*.2).toFixed(1)}" y="${(i-s-w).toFixed(1)}" width="${(u*.4).toFixed(1)}" height="${w.toFixed(1)}" class="spark-precip"/>`}).join("");let v="";if(t){const p=t.startIdx*u,f=t.endIdx*u;v=`<rect x="${(p-u*.3).toFixed(1)}" y="${n}" width="${(f-p+u*.6).toFixed(1)}" height="${d}" class="spark-window" rx="3"/>`}const C=e[0].time.replace(/^0/,""),D=e[e.length-1].time.replace(/^0/,""),F=e.map(p=>`<tr><td>${r(p.time)}</td><td>${p.temp.toFixed(0)}°</td><td>${p.precip.toFixed(1)}mm</td><td>${p.wind.toFixed(0)}km/h</td></tr>`).join("");return`<div class="dest-day-hourly">
    <svg class="dest-day-spark" viewBox="0 0 ${a} ${i}" preserveAspectRatio="none" aria-hidden="true">
      ${v}
      ${T}
      <polyline points="${g}" class="spark-temp"/>
    </svg>
    <div class="spark-axis" aria-hidden="true">
      <span>${r(C)}</span>
      <span>${r(D)}</span>
    </div>
    <table class="visually-hidden" aria-label="Hourly forecast">
      <thead><tr><th>Time</th><th>Temp</th><th>Precip</th><th>Wind</th></tr></thead>
      <tbody>${F}</tbody>
    </table>
  </div>`}function fe(e,t,a){const i=e.hourly??[],n=me(i),s=he(i,n),d=n&&i.length>0?`<p class="dest-day-window">${r(n.label)}</p>`:"";return`<li class="dest-day${t?" is-qualify":""}" aria-label="${r(`Day ${a+1}: ${H(e.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${r(H(e.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${re(e.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${e.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${e.precip_sum.toFixed(1)} mm · ${Math.round(e.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${e.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${r(oe(e.weather_code))}</dd></div>
    </dl>
    ${s}
    ${d}
    ${t?'<p class="dest-day-badge">Qualifies</p>':""}
  </li>`}function ye(e){if(e.length===0)return'<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>';const t=e.map(n=>{const s=`hsl(${(220-(Math.min(35,Math.max(5,n.temp_max))-5)/30*202).toFixed(0)}, 55%, 55%)`,d=n.precip_sum>1?"wet":n.precip_sum>0?"light":"clean",c=`${n.date}: ${n.temp_max.toFixed(0)}°C, ${n.precip_sum.toFixed(1)} mm rain, ${n.wind_max.toFixed(0)} km/h wind${n.qualify?", qualified":""}`;return`<span class="dest-climatology-cell rain-${d}${n.qualify?" is-qualify":""}" style="--cell-fill:${s}" role="img" aria-label="${r(c)}"></span>`}).join(""),a=e.filter(n=>n.precip_sum<=.1).length,i=e.filter(n=>n.qualify).length;return`<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${t}</div>
    <p class="dest-climatology-summary">Last ${e.length} days · ${a} dry · ${i} would have qualified.</p>
  </div>`}function $e(e){const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?"this month":t.toLocaleDateString(void 0,{month:"long",timeZone:"UTC"})}function ge(e,t,a,i,n){const s=$e(a??e.daily[0]?.date??""),d=a?new Date(`${a}T00:00:00Z`).getUTCMonth()+1:new Date().getUTCMonth()+1,l=t.bestMonths.includes(d)?`${s} sits inside the favoured riding window (${E(t.bestMonths)}).`:t.bestMonths.length>0?`${s} is outside the typical sweet spot (${E(t.bestMonths)}).`:"Best months are still being collected.",o=n?`Yes — the next 14 days produce a clean ${i}-day window.`:i>=5?`Maybe — the forecast shows a ${i}-day stretch that's almost there. Consider widening rain or wind tolerance.`:"Not yet — no contiguous clean window is in the next 14 days.";return`<dl class="dest-faq">
    <div>
      <dt>Is ${r(e.name)} good for cycling in ${r(s)}?</dt>
      <dd>${r(o)} ${r(l)}</dd>
    </div>
    <div>
      <dt>What's the climate like overall?</dt>
      <dd>${r(t.climateNote)}</dd>
    </div>
    <div>
      <dt>How would I get there?</dt>
      <dd>${t.airport?`Closest airport: ${r(t.airport)}.`:"Local rail or road access only."} Departure region: ${r(t.departureRegion)}.</dd>
    </div>
  </dl>`}function be(e,t){e.innerHTML=`
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${r(t?`"${t}"`:"selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`}function xe(e){const{mount:t,data:a,slug:i}=e,n=e.thresholds??O,s=de(a,i);if(!s){be(t,i);return}const d=G(i),c=Z(i),l=s.daily.map(h=>W(h,n)),o=j(l),m=s.daily.reduce((h,x)=>h+(x.precip_sum<=n.rainMax&&x.precip_prob_max<n.probMax?1:0),0),u=["lake-district","peak-district","yorkshire-dales","south-wales","london-surrey-hills"].includes(i),$=o.length>=7&&(!u||s.median_temp>20),y=le(o.length,$),g=a.latest?.forecast_date??null,T=ce(a.actuals_timeline,s.name),v=K(a.climatology,s.name),C=Y(s.median_temp,v,a.climatology,s.name),D=V(C,`Climatology comparison for ${s.name}`),F=ee(a.model_spread,s.name),p=te(F,a.model_spread),f=ae(p),w=s.region?`<span class="dest-region">${r(s.region)}</span>`:"",S=y==="go"?"GO":y==="edge"?"EDGE":"NO-GO",I=o.startIdx!==null&&o.endIdx!==null?o.startIdx===o.endIdx?_(s.daily[o.startIdx]?.date??null):`${_(s.daily[o.startIdx]?.date??null)} → ${_(s.daily[o.endIdx]?.date??null)}`:"—",N=!$&&s.blocker?`<p class="dest-blocker">${r(s.blocker)}</p>`:"",P=c?"":'<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>';t.innerHTML=`
    <article class="dest-page" data-slug="${r(i)}" data-verdict="${y}">
      <p class="dest-back"><a class="dest-back-link" href="./index.html">← All destinations</a></p>

      <header class="dest-header hero hero-${y}" aria-labelledby="dest-title">
        <div class="hero-header">
          <span class="hero-verdict-pill verdict-${y}">${S}</span>
          <p class="hero-eyebrow">14-day outlook</p>
          ${f}
        </div>
        <h1 id="dest-title" class="hero-destination">
          <span class="dest-title-name">${r(s.name)}</span>
          ${w}
        </h1>
        <p class="hero-editorial">${r(d.terrain)}</p>
        <p class="hero-window">Best window: ${r(I)} · ${o.length} clean ${o.length===1?"day":"days"}${g?` · forecast ${r(_(g))}`:""}</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${s.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${m}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${o.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${N}
        ${D}
        ${ue(d.rideTypes)}
      </header>

      ${P}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${s.daily.map((h,x)=>fe(h,l[x]===!0,x)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${r(s.name)}</h2>
        ${ye(T)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${pe(d.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${ge(s,d,g,o.length,$)}
      </section>
    </article>`;const b=t.querySelector("#dest-polar-mount");b&&U(async()=>{const{mountPolar:h}=await import("./polar-D324EqHo.js");return{mountPolar:h}},__vite__mapDeps([0,1]),import.meta.url).then(({mountPolar:h})=>{h({mount:b,days:s.daily,qualifies:l,label:s.name}),b.removeAttribute("aria-busy")}).catch(()=>{b.innerHTML='<p class="polar-empty">Polar chart unavailable.</p>',b.removeAttribute("aria-busy")})}R({mount:"#site-header",active:"forward"});q();const ve=new URLSearchParams(window.location.search),L=(ve.get("slug")??"").toLowerCase(),M=document.getElementById("dest-mount");M&&(M.dataset.slug=L,B().then(e=>{xe({mount:M,data:e,slug:L}),A("#footer-freshness",e);const t=e.latest?.results.find(a=>a.slug===L);t&&(document.title=`${t.name} · Cycling Weather`)}).catch(e=>{console.warn("destination: data.json fetch failed",e);const t=document.getElementById("footer-freshness");t&&(t.textContent="data.json offline — try again when reconnected."),M.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `}));
