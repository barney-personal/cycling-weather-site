function u(t){return t.replace(/[&<>"']/g,e=>e==="&"?"&amp;":e==="<"?"&lt;":e===">"?"&gt;":e==='"'?"&quot;":"&#39;")}function _(t,e){return t?t.destinations.find(a=>a.name===e)??null:null}function C(t,e,a,l){if(!a||!e||e.sample_size<=0||e.median_temp_max===null||typeof t!="number"||!Number.isFinite(t))return null;const r=e.median_temp_max,d=t-r,n=Math.abs(d),s=a.window_label||"this week",h=a.years||e.years||5,c=l||"this destination";let o,i;if(n<.6)o="tracking",i=`${c} is tracking with the ${h}y median for ${s}.`;else{o=d>0?"warmer":"cooler";const m=n>=10?Math.round(n):Math.round(n*10)/10,f=Number.isInteger(m)?`${m.toFixed(0)}°C`:`${m.toFixed(1)}°C`;i=`${c} is ${f} ${o==="warmer"?"warmer":"cooler"} than the ${h}y median for ${s}.`}return i.length>120&&(i=`${i.slice(0,119)}…`),{headline:i,tone:o,delta:d,deltaAbs:n,windowLabel:s,years:h,median:r,current:t}}function g(t,e){if(!t)return"";const a=t.tone,l=u(t.headline);return`<aside class="climatology-line climatology-${a}" role="note" aria-live="polite">
      <span class="climatology-icon" aria-hidden="true">${a==="warmer"?"▲":a==="cooler"?"▼":"≈"}</span>
      <p class="climatology-text">${l}</p>
      <table class="visually-hidden" aria-label="${u(e??"Climatology comparison")}">
        <thead><tr><th>Window</th><th>${t.years}y median high</th><th>This week median high</th><th>Delta</th></tr></thead>
        <tbody><tr>
          <td>${u(t.windowLabel)}</td>
          <td>${t.median.toFixed(1)}°C</td>
          <td>${t.current.toFixed(1)}°C</td>
          <td>${(t.delta>=0?"+":"")+t.delta.toFixed(1)}°C</td>
        </tr></tbody>
      </table>
    </aside>`}export{C as a,_ as f,g as r};
