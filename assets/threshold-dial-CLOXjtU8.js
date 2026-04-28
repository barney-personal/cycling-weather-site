import{D as p,t as U}from"./qualify-CS5O-wsU.js";const N="cw-thresholds",_=["temp","rain","prob","wind","sun"],d=Object.freeze({tempMin:p.tempMin,rainMax:p.rainMax,probMax:p.probMax,windMax:p.windMax,sunPref:"sun-cloud"}),u={tempMin:{lo:0,hi:35},rainMax:{lo:0,hi:10},probMax:{lo:0,hi:100},windMax:{lo:10,hi:60}};function m(t,e,n,s){const c=typeof t=="number"?t:Number(t);return Number.isFinite(c)?Math.min(n,Math.max(e,c)):s}function g(t){return t==="sun"||t==="sun-cloud"||t==="all-but-rain"||t==="any"}function x(t,e){return t.tempMin===e.tempMin&&t.rainMax===e.rainMax&&t.probMax===e.probMax&&t.windMax===e.windMax&&t.sunPref===e.sunPref}function I(t){return U({tempMin:t.tempMin,rainMax:t.rainMax,probMax:t.probMax,windMax:t.windMax,codeIn:p.codeIn},t.sunPref)}function H(){if(typeof localStorage>"u")return{};try{const t=localStorage.getItem(N);if(!t)return{};const e=JSON.parse(t);return!e||typeof e!="object"?{}:e}catch{return{}}}function F(t){if(!(typeof localStorage>"u"))try{localStorage.setItem(N,JSON.stringify(t))}catch{}}function j(t){const e={};t.has("temp")&&(e.tempMin=Number(t.get("temp"))),t.has("rain")&&(e.rainMax=Number(t.get("rain"))),t.has("prob")&&(e.probMax=Number(t.get("prob"))),t.has("wind")&&(e.windMax=Number(t.get("wind")));const n=t.get("sun");return n&&g(n)&&(e.sunPref=n),e}function K(){return typeof location>"u"?{}:j(new URLSearchParams(location.search))}function B(t,e){if(x(e,d)){for(const n of _)t.delete(n);return}t.set("temp",String(e.tempMin)),t.set("rain",String(e.rainMax)),t.set("prob",String(e.probMax)),t.set("wind",String(e.windMax)),t.set("sun",e.sunPref)}function J(t){if(typeof location>"u")return;const e=new URLSearchParams(location.search);B(e,t);const n=e.toString(),s=`${location.pathname}${n?`?${n}`:""}${location.hash}`;history.replaceState(null,"",s)}function Y(t,e){const n=K(),s=H(),c={tempMin:m(n.tempMin??s.tempMin,u.tempMin.lo,u.tempMin.hi,d.tempMin),rainMax:m(n.rainMax??s.rainMax,u.rainMax.lo,u.rainMax.hi,d.rainMax),probMax:m(n.probMax??s.probMax,u.probMax.lo,u.probMax.hi,d.probMax),windMax:m(n.windMax??s.windMax,u.windMax.lo,u.windMax.hi,d.windMax),sunPref:g(n.sunPref??s.sunPref)?n.sunPref??s.sunPref:d.sunPref};return t?{...c,...t}:c}const z={sun:"Sun only","sun-cloud":"Sun + cloud","all-but-rain":"Anything but rain",any:"Any"};function G(t){const e=document.createElement("template");e.innerHTML=t.trim();const n=e.content.firstElementChild;if(!n)throw new Error("threshold-dial: empty template");return n}const W=`
<aside class="threshold-dial" role="dialog" aria-modal="false" aria-label="Threshold dial" hidden>
  <div class="threshold-dial-backdrop" data-dismiss="1"></div>
  <div class="threshold-dial-panel">
    <header class="threshold-dial-header">
      <h2 class="threshold-dial-title">What counts as ride-clean?</h2>
      <button type="button" class="threshold-dial-close" aria-label="Close threshold dial">×</button>
    </header>
    <p class="threshold-dial-help">Tweak any of these and the rankings recompute live.</p>
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
`;function V(t){const e=typeof t.trigger=="string"?document.querySelector(t.trigger):t.trigger;if(!e)throw new Error("mountThresholdDial: trigger not found");const n=e,s=typeof t.surface=="string"?document.querySelector(t.surface):t.surface??document.body;if(!s)throw new Error("mountThresholdDial: surface not found");const c=s,O=t.emitter??window;let a=Y(t.initial);const i=G(W);c.appendChild(i);const M=i.querySelector("#th-temp"),w=i.querySelector("#th-wind"),S=i.querySelector("#th-rain"),y=i.querySelector("#th-prob"),v=Array.from(i.querySelectorAll('input[name="th-sun"]')),E=i.querySelector('[data-output="temp"]'),L=i.querySelector('[data-output="wind"]'),D=i.querySelector('[data-output="rain"]'),P=i.querySelector('[data-output="prob"]');function C(){M.value=String(a.tempMin),w.value=String(a.windMax),S.value=String(a.rainMax),y.value=String(a.probMax),E.textContent=`${a.tempMin}°C`,L.textContent=`${a.windMax} km/h`,D.textContent=a.rainMax===0?"0 mm":`≤ ${a.rainMax} mm`,P.textContent=`< ${a.probMax}%`;for(const r of v)r.checked=r.value===a.sunPref;R()}function R(){const r=x(a,d);n.dataset.dirty=r?"0":"1";const o=r?"Defaults":`${a.tempMin}° · ${a.windMax}km/h · ${z[a.sunPref]}`,l=n.querySelector(".threshold-trigger-summary");l&&(l.textContent=o),n.setAttribute("aria-label",`Adjust ride-clean thresholds (current: ${o})`)}function A(){const r=I(a),o={state:{...a},thresholds:r,isDefault:x(a,d)};O.dispatchEvent(new CustomEvent("cwthresholds:change",{detail:o}))}function b(r){a={...a,...r},F(a),J(a),C(),A()}function f(r,o){r.addEventListener("input",()=>{const l=Number(r.value);o==="tempMin"&&(E.textContent=`${l}°C`),o==="windMax"&&(L.textContent=`${l} km/h`),o==="rainMax"&&(D.textContent=l===0?"0 mm":`≤ ${l} mm`),o==="probMax"&&(P.textContent=`< ${l}%`)}),r.addEventListener("change",()=>{const l=Number(r.value);b({[o]:l})})}f(M,"tempMin"),f(w,"windMax"),f(S,"rainMax"),f(y,"probMax");for(const r of v)r.addEventListener("change",()=>{r.checked&&g(r.value)&&b({sunPref:r.value})});function T(){i.hidden=!1,i.classList.add("is-open"),document.documentElement.classList.add("threshold-dial-open"),n.setAttribute("aria-expanded","true"),queueMicrotask(()=>M.focus())}function h(){i.hidden=!0,i.classList.remove("is-open"),document.documentElement.classList.remove("threshold-dial-open"),n.setAttribute("aria-expanded","false"),n.focus()}function k(){i.hidden?T():h()}n.addEventListener("click",k),n.setAttribute("aria-expanded","false"),n.setAttribute("aria-haspopup","dialog");function q(r){const o=r.target;o&&((o.dataset.dismiss==="1"||o.dataset.action==="done")&&h(),o.dataset.action==="reset"&&b({...d}),o.classList.contains("threshold-dial-close")&&h())}i.addEventListener("click",q);function $(r){r.key==="Escape"&&!i.hidden&&(r.stopPropagation(),h())}return document.addEventListener("keydown",$),C(),queueMicrotask(A),{get state(){return{...a}},get thresholds(){return I(a)},destroy(){n.removeEventListener("click",k),i.removeEventListener("click",q),document.removeEventListener("keydown",$),i.remove()},open:T,close:h}}export{V as m};
