const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./polar-D324EqHo.js","./path-CXeFd1JH.js"])))=>i.map(i=>d[i]);
import{m as A,r as B,l as O,a as W}from"./data-13xNVvS7.js";import{d as j,D as U,b as G,_ as I}from"./qualify-B3rFEBhf.js";import{g as Z,f as H,h as K}from"./destination-meta-xTBeTcjo.js";import{f as V,a as Y,r as z}from"./climatology-line-BIbZZpuS.js";const Q=3,J=25,X=7,ee=2;function k(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function te(e,t){return e?e.destinations.find(a=>a.name===t)??null:null}function se(e,t){if(!e||!t||e.days.length===0)return null;const a=e.days.slice(0,X);let i=0,n=0,s=0,d=0;for(const c of a){if(c.models_count<ee)continue;n+=1;const l=c.temp_spread_c,o=c.precip_prob_spread_pct,h=typeof l=="number"&&Number.isFinite(l)&&l>=Q,m=typeof o=="number"&&Number.isFinite(o)&&o>=J;(h||m)&&(i+=1),typeof l=="number"&&Number.isFinite(l)&&l>s&&(s=l),typeof o=="number"&&Number.isFinite(o)&&o>d&&(d=o)}return n===0||i===0?null:{isSplit:!0,splitDays:i,scoredDays:n,maxTempSpread:Math.round(s*10)/10,maxProbSpread:Math.round(d),leadDays:a.length,models:t.models}}function ae(e){return e.startsWith("ecmwf")?"ECMWF":e.startsWith("gfs")?"GFS":e.startsWith("icon")?"ICON":e.startsWith("meteofrance")?"Météo-France":e.startsWith("gem")?"GEM":e.toUpperCase()}function ne(e){if(!e)return"";const t=e.splitDays===1?"day":"days",a=`Split forecast · ${e.splitDays} of next ${e.scoredDays} ${t}`,i=e.models.map(ae).join(", ")||"multiple models",n=e.maxTempSpread>0?`up to ${e.maxTempSpread.toFixed(1)}°C apart`:"",s=e.maxProbSpread>0?`${e.maxProbSpread}% rain-prob gap`:"",d=[n,s].filter(Boolean).join(" · ")||"model envelope nontrivial",c=`Models disagree (${k(i)}): ${k(d)} across the next ${e.scoredDays}-day window.`;return`<span class="confidence-chip confidence-split" role="note" title="${c}" aria-label="${c}">
      <span class="confidence-icon" aria-hidden="true">⚠</span>
      <span class="confidence-text">${k(a)}</span>
      <span class="visually-hidden">${c}</span>
    </span>`}function r(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function _(e){if(!e)return"";const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function N(e){const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}const ie={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",96:"Thunder + hail",99:"Heavy thunder"},oe={0:"☀",1:"🌤",2:"⛅",3:"☁",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",61:"🌧",63:"🌧",65:"🌧",71:"❄",73:"❄",75:"❄",77:"❄",80:"🌧",81:"🌧",82:"⛈",95:"⛈",96:"⛈",99:"⛈"};function re(e){return ie[e]??`Code ${e}`}function le(e){return oe[e]??"·"}function de(e,t){return t?"go":e>=5?"edge":"no-go"}function ce(e,t){return e.latest?e.latest.results.find(a=>a.slug===t)??null:null}function pe(e,t){return e.filter(a=>a.name===t).slice().sort((a,i)=>a.date.localeCompare(i.date)).slice(-30)}function ue(e){return e.length===0?'<p class="dest-routes-empty">Curated route notes coming soon.</p>':`<ul class="dest-routes">${e.map(t=>`<li class="dest-route">
        <span class="dest-route-name">${r(t.name)}</span>
        ${t.distanceKm||t.ascentM?`<span class="dest-route-stats">${t.distanceKm?`${t.distanceKm} km`:""}${t.distanceKm&&t.ascentM?" · ":""}${t.ascentM?`${t.ascentM} m`:""}</span>`:""}
        ${t.note?`<span class="dest-route-note">${r(t.note)}</span>`:""}
      </li>`).join("")}</ul>`}function me(e){return e.length===0?"":`<ul class="dest-tags" aria-label="Ride types">${e.map(t=>`<li class="dest-tag">${r(t)}</li>`).join("")}</ul>`}function he(e,t=3){if(e.length<t)return null;let a=Number.NEGATIVE_INFINITY,i=0;for(let c=0;c<=e.length-t;c++){let l=0;for(let o=c;o<c+t;o++){const h=e[o];l+=h.temp-h.precip*10-h.wind*.3}l>a&&(a=l,i=c)}const n=e[i].time.replace(/^0/,""),s=e[i+t-1].time.replace(/^0/,""),d=c=>{const l=Number.parseInt(c,10);return l<12?`${l}am`:l===12?"12pm":`${l-12}pm`};return{startIdx:i,endIdx:i+t-1,label:`Ride ${d(n)}–${d(s)}`}}function fe(e,t){if(e.length===0)return"";const a=180,i=48,n=4,s=12,d=i-n-s,c=e.map(p=>p.temp),l=Math.min(...c),h=Math.max(...c)-l||1,m=a/Math.max(e.length-1,1),$=p=>n+d-(p-l)/h*d,g=e.map((p,f)=>`${(f*m).toFixed(1)},${$(p.temp).toFixed(1)}`).join(" "),T=e.map((p,f)=>{if(p.precip<=0)return"";const w=Math.min(d*.6,Math.max(2,p.precip/5*d*.6));return`<rect x="${(f*m-m*.2).toFixed(1)}" y="${(i-s-w).toFixed(1)}" width="${(m*.4).toFixed(1)}" height="${w.toFixed(1)}" class="spark-precip"/>`}).join("");let v="";if(t){const p=t.startIdx*m,f=t.endIdx*m;v=`<rect x="${(p-m*.3).toFixed(1)}" y="${n}" width="${(f-p+m*.6).toFixed(1)}" height="${d}" class="spark-window" rx="3"/>`}const C=e[0].time.replace(/^0/,""),D=e[e.length-1].time.replace(/^0/,""),F=e.map(p=>`<tr><td>${r(p.time)}</td><td>${p.temp.toFixed(0)}°</td><td>${p.precip.toFixed(1)}mm</td><td>${p.wind.toFixed(0)}km/h</td></tr>`).join("");return`<div class="dest-day-hourly">
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
  </div>`}function ye(e,t,a){const i=e.hourly??[],n=he(i),s=fe(i,n),d=n&&i.length>0?`<p class="dest-day-window">${r(n.label)}</p>`:"";return`<li class="dest-day${t?" is-qualify":""}" aria-label="${r(`Day ${a+1}: ${N(e.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${r(N(e.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${le(e.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${e.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${e.precip_sum.toFixed(1)} mm · ${Math.round(e.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${e.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${r(re(e.weather_code))}</dd></div>
    </dl>
    ${s}
    ${d}
    ${t?'<p class="dest-day-badge">Qualifies</p>':""}
  </li>`}function $e(e){if(e.length===0)return'<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>';const t=e.map(n=>{const s=`hsl(${(220-(Math.min(35,Math.max(5,n.temp_max))-5)/30*202).toFixed(0)}, 55%, 55%)`,d=n.precip_sum>1?"wet":n.precip_sum>0?"light":"clean",c=`${n.date}: ${n.temp_max.toFixed(0)}°C, ${n.precip_sum.toFixed(1)} mm rain, ${n.wind_max.toFixed(0)} km/h wind${n.qualify?", qualified":""}`;return`<span class="dest-climatology-cell rain-${d}${n.qualify?" is-qualify":""}" style="--cell-fill:${s}" role="img" aria-label="${r(c)}"></span>`}).join(""),a=e.filter(n=>n.precip_sum<=.1).length,i=e.filter(n=>n.qualify).length;return`<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${t}</div>
    <p class="dest-climatology-summary">Last ${e.length} days · ${a} dry · ${i} would have qualified.</p>
  </div>`}function ge(e){const t=new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?"this month":t.toLocaleDateString(void 0,{month:"long",timeZone:"UTC"})}function be(e,t,a,i,n){const s=ge(a??e.daily[0]?.date??""),d=a?new Date(`${a}T00:00:00Z`).getUTCMonth()+1:new Date().getUTCMonth()+1,l=t.bestMonths.includes(d)?`${s} sits inside the favoured riding window (${H(t.bestMonths)}).`:t.bestMonths.length>0?`${s} is outside the typical sweet spot (${H(t.bestMonths)}).`:"Best months are still being collected.",o=n?`Yes — the next 14 days produce a clean ${i}-day window.`:i>=5?`Maybe — the forecast shows a ${i}-day stretch that's almost there. Consider widening rain or wind tolerance.`:"Not yet — no contiguous clean window is in the next 14 days.";return`<dl class="dest-faq">
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
  </dl>`}function xe(e,t){e.innerHTML=`
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${r(t?`"${t}"`:"selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`}function ve(e){const{mount:t,data:a,slug:i}=e,n=e.thresholds??U,s=ce(a,i);if(!s){xe(t,i);return}const d=Z(i),c=K(i),l=s.daily.map(u=>j(u,n)),o=G(l),h=s.daily.reduce((u,x)=>u+(x.precip_sum<=n.rainMax&&x.precip_prob_max<n.probMax?1:0),0),m=["lake-district","peak-district","yorkshire-dales","south-wales","london-surrey-hills"].includes(i),$=o.length>=7&&(!m||s.median_temp>20),y=de(o.length,$),g=a.latest?.forecast_date??null,T=pe(a.actuals_timeline,s.name),v=V(a.climatology,s.name),C=Y(s.median_temp,v,a.climatology,s.name),D=z(C,`Climatology comparison for ${s.name}`),F=te(a.model_spread,s.name),p=se(F,a.model_spread),f=ne(p),w=s.region?`<span class="dest-region">${r(s.region)}</span>`:"",S=y==="go"?"GO":y==="edge"?"EDGE":"NO-GO",P=o.startIdx!==null&&o.endIdx!==null?o.startIdx===o.endIdx?_(s.daily[o.startIdx]?.date??null):`${_(s.daily[o.startIdx]?.date??null)} → ${_(s.daily[o.endIdx]?.date??null)}`:"—",R=!$&&s.blocker?`<p class="dest-blocker">${r(s.blocker)}</p>`:"",q=c?"":'<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>';t.innerHTML=`
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
        <p class="hero-window">Best window: ${r(P)} · ${o.length} clean ${o.length===1?"day":"days"}${g?` · forecast ${r(_(g))}`:""}</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${s.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${h}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${o.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${R}
        ${D}
        ${me(d.rideTypes)}
      </header>

      ${q}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${s.daily.map((u,x)=>ye(u,l[x]===!0,x)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${r(s.name)}</h2>
        ${$e(T)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${ue(d.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${be(s,d,g,o.length,$)}
      </section>

      <section class="dest-section dest-section-ical" aria-labelledby="dest-ical-title">
        <h2 id="dest-ical-title" class="section-title">Calendar subscription</h2>
        <div id="dest-ical-mount" class="dest-ical-mount"></div>
      </section>
    </article>`;const E=t.querySelector("#dest-ical-mount");E&&I(async()=>{const{mountIcalSubscribe:u}=await import("./ical-subscribe-DbYA5N_Z.js");return{mountIcalSubscribe:u}},[],import.meta.url).then(({mountIcalSubscribe:u})=>{u({mount:E,href:`./ical/${s.slug}.ics`,label:s.name})});const b=t.querySelector("#dest-polar-mount");b&&I(async()=>{const{mountPolar:u}=await import("./polar-D324EqHo.js");return{mountPolar:u}},__vite__mapDeps([0,1]),import.meta.url).then(({mountPolar:u})=>{u({mount:b,days:s.daily,qualifies:l,label:s.name}),b.removeAttribute("aria-busy")}).catch(()=>{b.innerHTML='<p class="polar-empty">Polar chart unavailable.</p>',b.removeAttribute("aria-busy")})}A({mount:"#site-header",active:"forward"});B();const we=new URLSearchParams(window.location.search),L=(we.get("slug")??"").toLowerCase(),M=document.getElementById("dest-mount");M&&(M.dataset.slug=L,O().then(e=>{ve({mount:M,data:e,slug:L}),W("#footer-freshness",e);const t=e.latest?.results.find(a=>a.slug===L);t&&(document.title=`${t.name} · Cycling Weather`)}).catch(e=>{console.warn("destination: data.json fetch failed",e);const t=document.getElementById("footer-freshness");t&&(t.textContent="data.json offline — try again when reconnected."),M.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `}));
