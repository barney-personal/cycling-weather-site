import{D as h,t as _}from"./qualify-BbAyxwK0.js";const O="cw-thresholds",H=["temp","rain","prob","wind","sun"],d=Object.freeze({tempMin:h.tempMin,rainMax:h.rainMax,probMax:h.probMax,windMax:h.windMax,sunPref:"sun-cloud"}),u={tempMin:{lo:0,hi:35},rainMax:{lo:0,hi:10},probMax:{lo:0,hi:100},windMax:{lo:10,hi:60}};function b(t,e,n,l){const c=typeof t=="number"?t:Number(t);return Number.isFinite(c)?Math.min(n,Math.max(e,c)):l}function w(t){return t==="sun"||t==="sun-cloud"||t==="all-but-rain"||t==="any"}function x(t,e){return t.tempMin===e.tempMin&&t.rainMax===e.rainMax&&t.probMax===e.probMax&&t.windMax===e.windMax&&t.sunPref===e.sunPref}function N(t){return _({tempMin:t.tempMin,rainMax:t.rainMax,probMax:t.probMax,windMax:t.windMax,codeIn:h.codeIn},t.sunPref)}function F(){if(typeof localStorage>"u")return{};try{const t=localStorage.getItem(O);if(!t)return{};const e=JSON.parse(t);return!e||typeof e!="object"?{}:e}catch{return{}}}function j(t){if(!(typeof localStorage>"u"))try{localStorage.setItem(O,JSON.stringify(t))}catch{}}function K(t){const e={};t.has("temp")&&(e.tempMin=Number(t.get("temp"))),t.has("rain")&&(e.rainMax=Number(t.get("rain"))),t.has("prob")&&(e.probMax=Number(t.get("prob"))),t.has("wind")&&(e.windMax=Number(t.get("wind")));const n=t.get("sun");return n&&w(n)&&(e.sunPref=n),e}function B(){return typeof location>"u"?{}:K(new URLSearchParams(location.search))}function J(t,e){if(x(e,d)){for(const n of H)t.delete(n);return}t.set("temp",String(e.tempMin)),t.set("rain",String(e.rainMax)),t.set("prob",String(e.probMax)),t.set("wind",String(e.windMax)),t.set("sun",e.sunPref)}function Y(t){if(typeof location>"u")return;const e=new URLSearchParams(location.search);J(e,t);const n=e.toString(),l=`${location.pathname}${n?`?${n}`:""}${location.hash}`;history.replaceState(null,"",l)}function z(t,e){const n=B(),l=F(),c={tempMin:b(n.tempMin??l.tempMin,u.tempMin.lo,u.tempMin.hi,d.tempMin),rainMax:b(n.rainMax??l.rainMax,u.rainMax.lo,u.rainMax.hi,d.rainMax),probMax:b(n.probMax??l.probMax,u.probMax.lo,u.probMax.hi,d.probMax),windMax:b(n.windMax??l.windMax,u.windMax.lo,u.windMax.hi,d.windMax),sunPref:w(n.sunPref??l.sunPref)?n.sunPref??l.sunPref:d.sunPref};return t?{...c,...t}:c}const G={sun:"Sun only","sun-cloud":"Sun + cloud","all-but-rain":"Anything but rain",any:"Any"};function W(t){const e=document.createElement("template");e.innerHTML=t.trim();const n=e.content.firstElementChild;if(!n)throw new Error("threshold-dial: empty template");return n}const Q=`
<aside class="threshold-dial" role="dialog" aria-modal="false" aria-label="Threshold dial" hidden>
  <div class="threshold-dial-backdrop" data-dismiss="1"></div>
  <div class="threshold-dial-panel">
    <header class="threshold-dial-header">
      <h2 class="threshold-dial-title">What counts as ride-clean?</h2>
      <button type="button" class="threshold-dial-close" aria-label="Close threshold dial">×</button>
    </header>
    <p class="threshold-dial-help">Tweak any of these and the rankings recompute live.</p>
    <div class="threshold-dial-cta">
      <span class="threshold-dial-cta-label">New here?</span>
      <button type="button" class="threshold-dial-cta-button" data-action="open-profile" aria-label="Open the profile picker — answer five quick questions to set the dial automatically">
        Calibrate from a profile
        <span class="threshold-dial-cta-arrow" aria-hidden="true">→</span>
      </button>
    </div>
    <div class="threshold-dial-row" data-row="temp">
      <label for="th-temp">Min daily high</label>
      <input id="th-temp" type="range" min="0" max="35" step="1" />
      <output for="th-temp" data-output="temp"></output>
    </div>
    <div class="threshold-dial-row" data-row="wind">
      <label for="th-wind">Max wind</label>
      <input id="th-wind" type="range" min="10" max="60" step="1" />
      <output for="th-wind" data-output="wind"></output>
    </div>
    <div class="threshold-dial-row" data-row="rain">
      <label for="th-rain">Rain tolerance</label>
      <input id="th-rain" type="range" min="0" max="10" step="0.5" />
      <output for="th-rain" data-output="rain"></output>
    </div>
    <div class="threshold-dial-row" data-row="prob">
      <label for="th-prob">Max rain probability</label>
      <input id="th-prob" type="range" min="0" max="100" step="5" />
      <output for="th-prob" data-output="prob"></output>
    </div>
    <fieldset class="threshold-dial-row threshold-dial-radio">
      <legend>Sun preference</legend>
      <div class="threshold-dial-radio-group" data-row="sun">
        <label><input type="radio" name="th-sun" value="sun"><span>Sun only</span></label>
        <label><input type="radio" name="th-sun" value="sun-cloud"><span>Sun + cloud</span></label>
        <label><input type="radio" name="th-sun" value="all-but-rain"><span>Anything but rain</span></label>
      </div>
    </fieldset>
    <footer class="threshold-dial-footer">
      <button type="button" class="threshold-dial-reset" data-action="reset">Reset to defaults</button>
      <button type="button" class="threshold-dial-done" data-action="done">Done</button>
    </footer>
  </div>
</aside>
`;function X(t){const e=typeof t.trigger=="string"?document.querySelector(t.trigger):t.trigger;if(!e)throw new Error("mountThresholdDial: trigger not found");const n=e,l=typeof t.surface=="string"?document.querySelector(t.surface):t.surface??document.body;if(!l)throw new Error("mountThresholdDial: surface not found");const c=l,R=t.emitter??window;let r=z(t.initial);const i=W(Q);c.appendChild(i);const M=i.querySelector("#th-temp"),g=i.querySelector("#th-wind"),y=i.querySelector("#th-rain"),S=i.querySelector("#th-prob"),v=Array.from(i.querySelectorAll('input[name="th-sun"]')),E=i.querySelector('[data-output="temp"]'),L=i.querySelector('[data-output="wind"]'),D=i.querySelector('[data-output="rain"]'),P=i.querySelector('[data-output="prob"]');function C(){M.value=String(r.tempMin),g.value=String(r.windMax),y.value=String(r.rainMax),S.value=String(r.probMax),E.textContent=`${r.tempMin}°C`,L.textContent=`${r.windMax} km/h`,D.textContent=r.rainMax===0?"0 mm":`≤ ${r.rainMax} mm`,P.textContent=`< ${r.probMax}%`;for(const a of v)a.checked=a.value===r.sunPref;U()}function U(){const a=x(r,d);n.dataset.dirty=a?"0":"1";const o=a?"Defaults":`${r.tempMin}° · ${r.windMax}km/h · ${G[r.sunPref]}`,s=n.querySelector(".threshold-trigger-summary");s&&(s.textContent=o),n.setAttribute("aria-label",`Adjust ride-clean thresholds (current: ${o})`)}function A(){const a=N(r),o={state:{...r},thresholds:a,isDefault:x(r,d)};R.dispatchEvent(new CustomEvent("cwthresholds:change",{detail:o}))}function f(a){r={...r,...a},j(r),Y(r),C(),A()}function m(a,o){a.addEventListener("input",()=>{const s=Number(a.value);o==="tempMin"&&(E.textContent=`${s}°C`),o==="windMax"&&(L.textContent=`${s} km/h`),o==="rainMax"&&(D.textContent=s===0?"0 mm":`≤ ${s} mm`),o==="probMax"&&(P.textContent=`< ${s}%`)}),a.addEventListener("change",()=>{const s=Number(a.value);f({[o]:s})})}m(M,"tempMin"),m(g,"windMax"),m(y,"rainMax"),m(S,"probMax");for(const a of v)a.addEventListener("change",()=>{a.checked&&w(a.value)&&f({sunPref:a.value})});function k(){i.hidden=!1,i.classList.add("is-open"),document.documentElement.classList.add("threshold-dial-open"),n.setAttribute("aria-expanded","true"),queueMicrotask(()=>M.focus())}function p(){i.hidden=!0,i.classList.remove("is-open"),document.documentElement.classList.remove("threshold-dial-open"),n.setAttribute("aria-expanded","false"),n.focus()}function q(){i.hidden?k():p()}n.addEventListener("click",q),n.setAttribute("aria-expanded","false"),n.setAttribute("aria-haspopup","dialog");function T(a){const o=a.target;if(!o)return;const s=o.closest("[data-action]");(o.dataset.dismiss==="1"||s?.dataset.action==="done")&&p(),s?.dataset.action==="reset"&&f({...d}),s?.dataset.action==="open-profile"&&(p(),window.dispatchEvent(new CustomEvent("cwprofile:open"))),o.classList.contains("threshold-dial-close")&&p()}i.addEventListener("click",T);function $(a){const o=a.detail;o?.state&&f({...o.state})}window.addEventListener("cwprofile:apply",$);function I(a){a.key==="Escape"&&!i.hidden&&(a.stopPropagation(),p())}return document.addEventListener("keydown",I),C(),queueMicrotask(A),{get state(){return{...r}},get thresholds(){return N(r)},destroy(){n.removeEventListener("click",q),i.removeEventListener("click",T),document.removeEventListener("keydown",I),window.removeEventListener("cwprofile:apply",$),i.remove()},open:k,close:p}}export{d as D,u as S,X as m};
