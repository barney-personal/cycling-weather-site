function i(e){return e.replace(/[&<>"']/g,t=>t==="&"?"&amp;":t==="<"?"&lt;":t===">"?"&gt;":t==='"'?"&quot;":"&#39;")}function h(e){try{return new URL(e,location.href).toString()}catch{return e}}function f(e){return e.replace(/^https?:\/\//,"webcal://").replace(/^webcals:\/\//,"webcal://")}function v(e){return e?typeof e=="string"?document.querySelector(e):e:null}function m(e){const t=v(e.mount);if(!t)return;const n=e.variant??"destination",u=e.label??(n==="all-go"?"every GO destination":"this destination"),o=h(e.href),b=f(o),p=n==="all-go"?"Subscribe to every GO destination":`Subscribe to ${u}`,y=n==="all-go"?"Get a calendar feed of every cycling-clean window across all destinations. Calendar apps re-fetch this URL on their own schedule (typically daily) — events update as the forecast moves.":`Get a calendar feed of clean windows for ${u}. Calendar apps re-fetch this URL on their own schedule (typically daily) — events update as the forecast moves.`;t.innerHTML=`
    <div class="ical-subscribe" data-variant="${i(n)}">
      <div class="ical-subscribe-head">
        <span class="ical-subscribe-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M8 3v4"/>
            <path d="M16 3v4"/>
            <circle cx="12" cy="14" r="2.2"/>
          </svg>
        </span>
        <h3 class="ical-subscribe-title">${i(p)}</h3>
      </div>
      <p class="ical-subscribe-body">${i(y)}</p>
      <div class="ical-subscribe-actions">
        <a class="ical-subscribe-btn" href="${i(b)}" rel="noopener">Add to Calendar</a>
        <button type="button" class="ical-subscribe-copy" data-url="${i(o)}" aria-label="Copy subscription URL to clipboard">Copy URL</button>
      </div>
      <code class="ical-subscribe-url" aria-label="Subscription URL">${i(o)}</code>
      <p class="ical-subscribe-status" role="status" aria-live="polite"></p>
    </div>`;const d=t.querySelector(".ical-subscribe-copy"),s=t.querySelector(".ical-subscribe-status");let c=null;d?.addEventListener("click",async()=>{const l=d.dataset.url??"";if(!l)return;let r=!1;try{navigator.clipboard?.writeText&&(await navigator.clipboard.writeText(l),r=!0)}catch{}if(!r)try{const a=document.createElement("textarea");a.value=l,a.setAttribute("readonly",""),a.style.position="absolute",a.style.left="-9999px",document.body.appendChild(a),a.select(),document.execCommand("copy"),document.body.removeChild(a),r=!0}catch{r=!1}s&&(s.textContent=r?"Copied — paste into your calendar app's 'Subscribe to URL'.":"Couldn't copy — long-press the URL above to copy manually.",s.dataset.tone=r?"ok":"warn",c&&clearTimeout(c),c=setTimeout(()=>{s.textContent="",delete s.dataset.tone},5e3))})}export{m as mountIcalSubscribe};
