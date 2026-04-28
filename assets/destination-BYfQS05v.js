const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./polar-DjZUplHj.js","./path-CXeFd1JH.js"])))=>i.map(i=>d[i]);
import{m as S,r as R,l as H,a as q}from"./data-CxCXv4d3.js";import{g as N,f as _,h as F}from"./destination-meta-xTBeTcjo.js";import{d as I,D as P,b as A}from"./qualify-CS5O-wsU.js";const B="modulepreload",O=function(t,e){return new URL(t,e).href},x={},U=function(e,n,l){let o=Promise.resolve();if(n&&n.length>0){const r=document.getElementsByTagName("link"),d=document.querySelector("meta[property=csp-nonce]"),u=d?.nonce||d?.getAttribute("nonce");o=Promise.allSettled(n.map(a=>{if(a=O(a,l),a in x)return;x[a]=!0;const m=a.endsWith(".css"),w=m?'[rel="stylesheet"]':"";if(!!l)for(let h=r.length-1;h>=0;h--){const y=r[h];if(y.href===a&&(!m||y.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${a}"]${w}`))return;const c=document.createElement("link");if(c.rel=m?"stylesheet":B,m||(c.as="script"),c.crossOrigin="",c.href=a,u&&c.setAttribute("nonce",u),document.head.appendChild(c),m)return new Promise((h,y)=>{c.addEventListener("load",h),c.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${a}`)))})}))}function s(r){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=r,window.dispatchEvent(d),!d.defaultPrevented)throw r}return o.then(r=>{for(const d of r||[])d.status==="rejected"&&s(d.reason);return e().catch(s)})};function i(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}function b(t){if(!t)return"";const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{month:"short",day:"numeric",timeZone:"UTC"})}function D(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?t:e.toLocaleDateString(void 0,{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"})}const j={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Rain showers",81:"Heavy showers",82:"Violent showers",95:"Thunderstorm",96:"Thunder + hail",99:"Heavy thunder"},W={0:"☀",1:"🌤",2:"⛅",3:"☁",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",61:"🌧",63:"🌧",65:"🌧",71:"❄",73:"❄",75:"❄",77:"❄",80:"🌧",81:"🌧",82:"⛈",95:"⛈",96:"⛈",99:"⛈"};function Z(t){return j[t]??`Code ${t}`}function z(t){return W[t]??"·"}function G(t,e){return e?"go":t>=5?"edge":"no-go"}function K(t,e){return t.latest?t.latest.results.find(n=>n.slug===e)??null:null}function Q(t,e){return t.filter(n=>n.name===e).slice().sort((n,l)=>n.date.localeCompare(l.date)).slice(-30)}function V(t){return t.length===0?'<p class="dest-routes-empty">Curated route notes coming soon.</p>':`<ul class="dest-routes">${t.map(e=>`<li class="dest-route">
        <span class="dest-route-name">${i(e.name)}</span>
        ${e.distanceKm||e.ascentM?`<span class="dest-route-stats">${e.distanceKm?`${e.distanceKm} km`:""}${e.distanceKm&&e.ascentM?" · ":""}${e.ascentM?`${e.ascentM} m`:""}</span>`:""}
        ${e.note?`<span class="dest-route-note">${i(e.note)}</span>`:""}
      </li>`).join("")}</ul>`}function Y(t){return t.length===0?"":`<ul class="dest-tags" aria-label="Ride types">${t.map(e=>`<li class="dest-tag">${i(e)}</li>`).join("")}</ul>`}function J(t,e,n){return`<li class="dest-day${e?" is-qualify":""}" aria-label="${i(`Day ${n+1}: ${D(t.date)}`)}">
    <header class="dest-day-header">
      <span class="dest-day-date">${i(D(t.date))}</span>
      <span class="dest-day-glyph" aria-hidden="true">${z(t.weather_code)}</span>
    </header>
    <p class="dest-day-temp"><span class="dest-day-temp-num">${t.temp_max.toFixed(0)}°</span><span class="dest-day-temp-unit">C high</span></p>
    <dl class="dest-day-stats">
      <div><dt>Rain</dt><dd>${t.precip_sum.toFixed(1)} mm · ${Math.round(t.precip_prob_max)}%</dd></div>
      <div><dt>Wind</dt><dd>${t.wind_max.toFixed(0)} km/h</dd></div>
      <div><dt>Sky</dt><dd>${i(Z(t.weather_code))}</dd></div>
    </dl>
    ${e?'<p class="dest-day-badge">Qualifies</p>':""}
  </li>`}function X(t){if(t.length===0)return'<p class="dest-climatology-empty">Actuals are still ripening — they accumulate as the daily snapshots mature.</p>';const e=t.map(o=>{const s=`hsl(${(220-(Math.min(35,Math.max(5,o.temp_max))-5)/30*202).toFixed(0)}, 55%, 55%)`,r=o.precip_sum>1?"wet":o.precip_sum>0?"light":"clean",d=`${o.date}: ${o.temp_max.toFixed(0)}°C, ${o.precip_sum.toFixed(1)} mm rain, ${o.wind_max.toFixed(0)} km/h wind${o.qualify?", qualified":""}`;return`<span class="dest-climatology-cell rain-${r}${o.qualify?" is-qualify":""}" style="--cell-fill:${s}" role="img" aria-label="${i(d)}"></span>`}).join(""),n=t.filter(o=>o.precip_sum<=.1).length,l=t.filter(o=>o.qualify).length;return`<div class="dest-climatology">
    <div class="dest-climatology-strip" aria-hidden="true">${e}</div>
    <p class="dest-climatology-summary">Last ${t.length} days · ${n} dry · ${l} would have qualified.</p>
  </div>`}function ee(t){const e=new Date(`${t}T00:00:00Z`);return Number.isNaN(e.getTime())?"this month":e.toLocaleDateString(void 0,{month:"long",timeZone:"UTC"})}function te(t,e,n,l,o){const s=ee(n??t.daily[0]?.date??""),r=n?new Date(`${n}T00:00:00Z`).getUTCMonth()+1:new Date().getUTCMonth()+1,u=e.bestMonths.includes(r)?`${s} sits inside the favoured riding window (${_(e.bestMonths)}).`:e.bestMonths.length>0?`${s} is outside the typical sweet spot (${_(e.bestMonths)}).`:"Best months are still being collected.",a=o?`Yes — the next 14 days produce a clean ${l}-day window.`:l>=5?`Maybe — the forecast shows a ${l}-day stretch that's almost there. Consider widening rain or wind tolerance.`:"Not yet — no contiguous clean window is in the next 14 days.";return`<dl class="dest-faq">
    <div>
      <dt>Is ${i(t.name)} good for cycling in ${i(s)}?</dt>
      <dd>${i(a)} ${i(u)}</dd>
    </div>
    <div>
      <dt>What's the climate like overall?</dt>
      <dd>${i(e.climateNote)}</dd>
    </div>
    <div>
      <dt>How would I get there?</dt>
      <dd>${e.airport?`Closest airport: ${i(e.airport)}.`:"Local rail or road access only."} Departure region: ${i(e.departureRegion)}.</dd>
    </div>
  </dl>`}function se(t,e){t.innerHTML=`
    <section class="dest-404" aria-labelledby="dest-404-title">
      <p class="dest-404-eyebrow">404</p>
      <h1 id="dest-404-title" class="dest-404-title">No destination ${i(e?`"${e}"`:"selected")}.</h1>
      <p class="dest-404-msg">Either the slug is wrong, or the destination has been removed from the daily snapshot. Try the home page for the current ranking.</p>
      <a class="dest-404-link" href="./index.html">← Back to today's ranking</a>
    </section>`}function ae(t){const{mount:e,data:n,slug:l}=t,o=t.thresholds??P,s=K(n,l);if(!s){se(e,l);return}const r=N(l),d=F(l),u=s.daily.map(p=>I(p,o)),a=A(u),m=s.daily.reduce((p,g)=>p+(g.precip_sum<=o.rainMax&&g.precip_prob_max<o.probMax?1:0),0),w=["lake-district","peak-district","yorkshire-dales","south-wales","london-surrey-hills"].includes(l),$=a.length>=7&&(!w||s.median_temp>20),c=G(a.length,$),h=n.latest?.forecast_date??null,y=Q(n.actuals_timeline,s.name),M=s.region?`<span class="dest-region">${i(s.region)}</span>`:"",T=c==="go"?"GO":c==="edge"?"EDGE":"NO-GO",C=a.startIdx!==null&&a.endIdx!==null?a.startIdx===a.endIdx?b(s.daily[a.startIdx]?.date??null):`${b(s.daily[a.startIdx]?.date??null)} → ${b(s.daily[a.endIdx]?.date??null)}`:"—",L=!$&&s.blocker?`<p class="dest-blocker">${i(s.blocker)}</p>`:"",E=d?"":'<p class="dest-fallback">Curated guide notes are still being written for this destination.</p>';e.innerHTML=`
    <article class="dest-page" data-slug="${i(l)}" data-verdict="${c}">
      <p class="dest-back"><a class="dest-back-link" href="./index.html">← All destinations</a></p>

      <header class="dest-header hero hero-${c}" aria-labelledby="dest-title">
        <div class="hero-header">
          <span class="hero-verdict-pill verdict-${c}">${T}</span>
          <p class="hero-eyebrow">14-day outlook</p>
        </div>
        <h1 id="dest-title" class="hero-destination">
          <span class="dest-title-name">${i(s.name)}</span>
          ${M}
        </h1>
        <p class="hero-editorial">${i(r.terrain)}</p>
        <p class="hero-window">Best window: ${i(C)} · ${a.length} clean ${a.length===1?"day":"days"}${h?` · forecast ${i(b(h))}`:""}</p>
        <div class="hero-stats">
          <span class="hero-stat"><span class="hero-stat-num">${s.median_temp.toFixed(1)}°</span><span class="hero-stat-label">median high</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${m}</span><span class="hero-stat-label">dry days</span></span>
          <span class="hero-stat"><span class="hero-stat-num">${a.length}</span><span class="hero-stat-label">best clean run</span></span>
        </div>
        ${L}
        ${Y(r.rideTypes)}
      </header>

      ${E}

      <section class="dest-section dest-section-polar" aria-labelledby="dest-polar-title">
        <h2 id="dest-polar-title" class="section-title">14-day rhythm</h2>
        <div id="dest-polar-mount" class="dest-polar-mount" aria-busy="true"></div>
      </section>

      <section class="dest-section" aria-labelledby="dest-forecast-title">
        <h2 id="dest-forecast-title" class="section-title">Day-by-day</h2>
        <ul class="dest-day-grid">
          ${s.daily.map((p,g)=>J(p,u[g]===!0,g)).join("")}
        </ul>
      </section>

      <section class="dest-section" aria-labelledby="dest-climatology-title">
        <h2 id="dest-climatology-title" class="section-title">Recent actuals · ${i(s.name)}</h2>
        ${X(y)}
      </section>

      <section class="dest-section" aria-labelledby="dest-routes-title">
        <h2 id="dest-routes-title" class="section-title">Signature routes</h2>
        ${V(r.routes)}
      </section>

      <section class="dest-section" aria-labelledby="dest-faq-title">
        <h2 id="dest-faq-title" class="section-title">Quick answers</h2>
        ${te(s,r,h,a.length,$)}
      </section>
    </article>`;const f=e.querySelector("#dest-polar-mount");f&&U(async()=>{const{mountPolar:p}=await import("./polar-DjZUplHj.js");return{mountPolar:p}},__vite__mapDeps([0,1]),import.meta.url).then(({mountPolar:p})=>{p({mount:f,days:s.daily,qualifies:u,label:s.name}),f.removeAttribute("aria-busy")}).catch(()=>{f.innerHTML='<p class="polar-empty">Polar chart unavailable.</p>',f.removeAttribute("aria-busy")})}S({mount:"#site-header",active:"forward"});R();const ne=new URLSearchParams(window.location.search),k=(ne.get("slug")??"").toLowerCase(),v=document.getElementById("dest-mount");v&&(v.dataset.slug=k,H().then(t=>{ae({mount:v,data:t,slug:k}),q("#footer-freshness",t);const e=t.latest?.results.find(n=>n.slug===k);e&&(document.title=`${e.name} · Cycling Weather`)}).catch(t=>{console.warn("destination: data.json fetch failed",t);const e=document.getElementById("footer-freshness");e&&(e.textContent="data.json offline — try again when reconnected."),v.innerHTML=`
        <section class="hero hero-page-header" aria-label="Offline">
          <p class="hero-eyebrow">Offline</p>
          <h1 class="hero-destination"><span class="hero-destination-link">Couldn't reach the daily refresh</span></h1>
          <p class="hero-editorial">The site shell loaded from cache, but data.json couldn't be fetched. Reconnect and reload to see this destination's outlook.</p>
        </section>
      `}));
