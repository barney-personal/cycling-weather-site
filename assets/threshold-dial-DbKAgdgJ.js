import{D as L,t as K}from"./qualify-BbAyxwK0.js";const j="cw-thresholds",W=["temp","rain","prob","wind","sun"],f=Object.freeze({tempMin:L.tempMin,rainMax:L.rainMax,probMax:L.probMax,windMax:L.windMax,sunPref:"sun-cloud"}),p={tempMin:{lo:0,hi:35},rainMax:{lo:0,hi:10},probMax:{lo:0,hi:100},windMax:{lo:10,hi:60}};function q(e,t,n,s){const d=typeof e=="number"?e:Number(e);return Number.isFinite(d)?Math.min(n,Math.max(t,d)):s}function N(e){return e==="sun"||e==="sun-cloud"||e==="all-but-rain"||e==="any"}function $(e,t){return e.tempMin===t.tempMin&&e.rainMax===t.rainMax&&e.probMax===t.probMax&&e.windMax===t.windMax&&e.sunPref===t.sunPref}function z(e){return K({tempMin:e.tempMin,rainMax:e.rainMax,probMax:e.probMax,windMax:e.windMax,codeIn:L.codeIn},e.sunPref)}function B(){if(typeof localStorage>"u")return{};try{const e=localStorage.getItem(j);if(!e)return{};const t=JSON.parse(e);return!t||typeof t!="object"?{}:t}catch{return{}}}function V(e){if(!(typeof localStorage>"u"))try{localStorage.setItem(j,JSON.stringify(e))}catch{}}function Y(e){const t={};e.has("temp")&&(t.tempMin=Number(e.get("temp"))),e.has("rain")&&(t.rainMax=Number(e.get("rain"))),e.has("prob")&&(t.probMax=Number(e.get("prob"))),e.has("wind")&&(t.windMax=Number(e.get("wind")));const n=e.get("sun");return n&&N(n)&&(t.sunPref=n),t}function G(){return typeof location>"u"?{}:Y(new URLSearchParams(location.search))}function J(e,t){if($(t,f)){for(const n of W)e.delete(n);return}e.set("temp",String(t.tempMin)),e.set("rain",String(t.rainMax)),e.set("prob",String(t.probMax)),e.set("wind",String(t.windMax)),e.set("sun",t.sunPref)}function Q(e){if(typeof location>"u")return;const t=new URLSearchParams(location.search);J(t,e);const n=t.toString(),s=`${location.pathname}${n?`?${n}`:""}${location.hash}`;history.replaceState(null,"",s)}function X(e,t){const n=G(),s=B(),d={tempMin:q(n.tempMin??s.tempMin,p.tempMin.lo,p.tempMin.hi,f.tempMin),rainMax:q(n.rainMax??s.rainMax,p.rainMax.lo,p.rainMax.hi,f.rainMax),probMax:q(n.probMax??s.probMax,p.probMax.lo,p.probMax.hi,f.probMax),windMax:q(n.windMax??s.windMax,p.windMax.lo,p.windMax.hi,f.windMax),sunPref:N(n.sunPref??s.sunPref)?n.sunPref??s.sunPref:f.sunPref};return e?{...d,...e}:d}const R="cw:profile:v1",I=Object.freeze({heatPref:"mild",rainTolerance:"drizzle",windTolerance:"moderate",sunPref:f.sunPref,stringency:"comfort"}),Z=[{key:"heatPref",question:"How hot do you like it?",hint:"Sets the daily-high floor.",options:[{value:"cool",label:"Cool",detail:"12°C and up"},{value:"mild",label:"Mild",detail:"16°C and up"},{value:"warm",label:"Warm",detail:"20°C and up"},{value:"hot",label:"Hot",detail:"24°C and up"}]},{key:"rainTolerance",question:"Rain tolerance",hint:"Combines mm/day and forecast probability.",options:[{value:"dry",label:"Dry only",detail:"0 mm · <10% prob"},{value:"drizzle",label:"Drizzle OK",detail:"≤2 mm · <30% prob"},{value:"any",label:"I'll ride wet",detail:"up to 10 mm · <80% prob"}]},{key:"windTolerance",question:"Max wind you'll ride in",options:[{value:"calm",label:"Calm",detail:"<20 km/h"},{value:"moderate",label:"Moderate",detail:"<30 km/h"},{value:"blustery",label:"Blustery",detail:"<45 km/h"}]},{key:"sunPref",question:"Sky",hint:"Which weather codes count as ride-worthy.",options:[{value:"sun",label:"Sun only"},{value:"sun-cloud",label:"Sun + cloud"},{value:"all-but-rain",label:"Anything but rain"},{value:"any",label:"Any"}]},{key:"stringency",question:"Stringency",hint:"Biases the dial toward Tour or any-day cycling.",options:[{value:"tour",label:"Tour",detail:"tighter — race-day clean"},{value:"comfort",label:"Cycling-comfort",detail:"balanced (default)"},{value:"any-day",label:"Any-day rider",detail:"relaxed — wider windows"}]}],ee={cool:12,mild:16,warm:20,hot:24},te={dry:{rainMax:0,probMax:10},drizzle:{rainMax:2,probMax:30},any:{rainMax:10,probMax:80}},ne={calm:20,moderate:30,blustery:45},re={tour:{tempMin:4,rainMax:-2,probMax:-10,windMax:-5},comfort:{tempMin:0,rainMax:0,probMax:0,windMax:0},"any-day":{tempMin:-4,rainMax:2,probMax:20,windMax:5}};function D(e,t,n){return Math.min(n,Math.max(t,e))}function ae(e){const t=ee[e.heatPref],n=te[e.rainTolerance],s=ne[e.windTolerance],d=re[e.stringency];return{tempMin:D(t+d.tempMin,p.tempMin.lo,p.tempMin.hi),rainMax:D(n.rainMax+d.rainMax,p.rainMax.lo,p.rainMax.hi),probMax:D(n.probMax+d.probMax,p.probMax.lo,p.probMax.hi),windMax:D(s+d.windMax,p.windMax.lo,p.windMax.hi),sunPref:e.sunPref}}const ie=["cool","mild","warm","hot"],oe=["dry","drizzle","any"],le=["calm","moderate","blustery"],se=["tour","comfort","any-day"],ce=["sun","sun-cloud","all-but-rain","any"];function de(e){return typeof e=="string"&&ie.includes(e)}function ue(e){return typeof e=="string"&&oe.includes(e)}function pe(e){return typeof e=="string"&&le.includes(e)}function fe(e){return typeof e=="string"&&se.includes(e)}function he(e){return typeof e=="string"&&ce.includes(e)}function me(e){if(!e||typeof e!="object")return null;const t=e;return de(t.heatPref)&&ue(t.rainTolerance)&&pe(t.windTolerance)&&he(t.sunPref)&&fe(t.stringency)?{heatPref:t.heatPref,rainTolerance:t.rainTolerance,windTolerance:t.windTolerance,sunPref:t.sunPref,stringency:t.stringency}:null}function F(){if(typeof localStorage>"u")return null;try{const e=localStorage.getItem(R);return e?me(JSON.parse(e)):null}catch{return null}}function be(e){if(!(typeof localStorage>"u"))try{localStorage.setItem(R,JSON.stringify(e))}catch{}}function ye(){if(!(typeof localStorage>"u"))try{localStorage.removeItem(R)}catch{}}function Me(){return{tempMin:f.tempMin,rainMax:f.rainMax,probMax:f.probMax,windMax:f.windMax,sunPref:f.sunPref}}function we(e){const t=document.createElement("template");t.innerHTML=e.trim();const n=t.content.firstElementChild;if(!n)throw new Error("profile-picker: empty template");return n}function w(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function xe(e,t){const n=w(e.key),s=e.options.map(l=>{const r=t[e.key]===l.value?" checked":"",o=l.detail?`<span class="profile-option-detail">${w(l.detail)}</span>`:"";return`
        <label class="profile-option">
          <input type="radio" name="profile-${n}" value="${w(String(l.value))}"${r}>
          <span class="profile-option-label">${w(l.label)}</span>
          ${o}
        </label>
      `}).join(""),d=e.hint?`<p class="profile-question-hint">${w(e.hint)}</p>`:"";return`
    <fieldset class="profile-question" data-key="${n}">
      <legend class="profile-question-legend">${w(e.question)}</legend>
      ${d}
      <div class="profile-options">${s}</div>
    </fieldset>
  `}function ge(e){return`
<aside class="profile-picker" role="dialog" aria-modal="false" aria-labelledby="profile-picker-title" hidden>
  <div class="profile-picker-backdrop" data-dismiss="1"></div>
  <div class="profile-picker-panel">
    <header class="profile-picker-header">
      <h2 id="profile-picker-title" class="profile-picker-title">Calibrate your ride profile</h2>
      <button type="button" class="profile-picker-close" aria-label="Close profile picker">×</button>
    </header>
    <p class="profile-picker-help">Answer five quick questions; we'll set the threshold dial for you.</p>
    <form class="profile-picker-form" novalidate>
      ${Z.map(t=>xe(t,e)).join("")}
      <p class="profile-picker-status visually-hidden" role="status" aria-live="polite"></p>
      <footer class="profile-picker-footer">
        <button type="button" class="profile-picker-reset" data-action="reset">Reset to defaults</button>
        <button type="submit" class="profile-picker-apply" data-action="apply">Apply profile</button>
      </footer>
    </form>
  </div>
</aside>
  `}function Pe(e={}){const t=typeof e.surface=="string"?document.querySelector(e.surface):e.surface??document.body;if(!t)throw new Error("mountProfilePicker: surface not found");const n=t,s=e.emitter??window,d=e.opener??window;let l=F()??{...I};const r=we(ge(l));n.appendChild(r);const o=r.querySelector(".profile-picker-form"),b=r.querySelector(".profile-picker-status");function x(){const a=r.querySelectorAll('input[type="radio"]');for(const u of a){const y=u.name.replace(/^profile-/,"");u.checked=String(l[y])===u.value}}function T(){const a=new FormData(o);return{heatPref:a.get("profile-heatPref")??l.heatPref,rainTolerance:a.get("profile-rainTolerance")??l.rainTolerance,windTolerance:a.get("profile-windTolerance")??l.windTolerance,sunPref:a.get("profile-sunPref")??l.sunPref,stringency:a.get("profile-stringency")??l.stringency}}function g(a){b.textContent="",queueMicrotask(()=>{b.textContent=a})}function v(a){s.dispatchEvent(new CustomEvent("cwprofile:apply",{detail:a}))}function S(a){a?l={...l,...a}:l=F()??{...I},x(),r.hidden=!1,r.classList.add("is-open"),document.documentElement.classList.add("profile-picker-open"),queueMicrotask(()=>{r.querySelector('input[type="radio"]')?.focus()})}function m(){r.hidden=!0,r.classList.remove("is-open"),document.documentElement.classList.remove("profile-picker-open")}function E(a){a.preventDefault(),l=T(),be(l);const y=ae(l);v({state:y,profile:l}),g("Profile applied — thresholds updated."),m()}function C(){l={...I},ye(),x(),v({state:Me(),profile:null}),g("Profile reset to defaults."),m()}o.addEventListener("submit",E);function k(a){const u=a.target;u&&(u.dataset.dismiss==="1"&&m(),u.classList.contains("profile-picker-close")&&m(),u.dataset.action==="reset"&&C())}r.addEventListener("click",k);function A(a){a.key==="Escape"&&!r.hidden&&(a.stopPropagation(),m())}document.addEventListener("keydown",A);function P(a){const u=a.detail;S(u??void 0)}return d.addEventListener("cwprofile:open",P),{open:S,close:m,destroy(){o.removeEventListener("submit",E),r.removeEventListener("click",k),document.removeEventListener("keydown",A),d.removeEventListener("cwprofile:open",P),r.remove()}}}const ve={sun:"Sun only","sun-cloud":"Sun + cloud","all-but-rain":"Anything but rain",any:"Any"};function Se(e){const t=document.createElement("template");t.innerHTML=e.trim();const n=t.content.firstElementChild;if(!n)throw new Error("threshold-dial: empty template");return n}const Ee=`
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
`;function Le(e){const t=typeof e.trigger=="string"?document.querySelector(e.trigger):e.trigger;if(!t)throw new Error("mountThresholdDial: trigger not found");const n=t,s=typeof e.surface=="string"?document.querySelector(e.surface):e.surface??document.body;if(!s)throw new Error("mountThresholdDial: surface not found");const d=s,l=e.emitter??window;let r=X(e.initial);const o=Se(Ee);d.appendChild(o);const b=o.querySelector("#th-temp"),x=o.querySelector("#th-wind"),T=o.querySelector("#th-rain"),g=o.querySelector("#th-prob"),v=Array.from(o.querySelectorAll('input[name="th-sun"]')),S=o.querySelector('[data-output="temp"]'),m=o.querySelector('[data-output="wind"]'),E=o.querySelector('[data-output="rain"]'),C=o.querySelector('[data-output="prob"]');function k(){b.value=String(r.tempMin),x.value=String(r.windMax),T.value=String(r.rainMax),g.value=String(r.probMax),S.textContent=`${r.tempMin}°C`,m.textContent=`${r.windMax} km/h`,E.textContent=r.rainMax===0?"0 mm":`≤ ${r.rainMax} mm`,C.textContent=`< ${r.probMax}%`;for(const i of v)i.checked=i.value===r.sunPref;A()}function A(){const i=$(r,f);n.dataset.dirty=i?"0":"1";const c=i?"Defaults":`${r.tempMin}° · ${r.windMax}km/h · ${ve[r.sunPref]}`,h=n.querySelector(".threshold-trigger-summary");h&&(h.textContent=c),n.setAttribute("aria-label",`Adjust ride-clean thresholds (current: ${c})`)}function P(){const i=z(r),c={state:{...r},thresholds:i,isDefault:$(r,f)};l.dispatchEvent(new CustomEvent("cwthresholds:change",{detail:c}))}function a(i){r={...r,...i},V(r),Q(r),k(),P()}function u(i,c){i.addEventListener("input",()=>{const h=Number(i.value);c==="tempMin"&&(S.textContent=`${h}°C`),c==="windMax"&&(m.textContent=`${h} km/h`),c==="rainMax"&&(E.textContent=h===0?"0 mm":`≤ ${h} mm`),c==="probMax"&&(C.textContent=`< ${h}%`)}),i.addEventListener("change",()=>{const h=Number(i.value);a({[c]:h})})}u(b,"tempMin"),u(x,"windMax"),u(T,"rainMax"),u(g,"probMax");for(const i of v)i.addEventListener("change",()=>{i.checked&&N(i.value)&&a({sunPref:i.value})});function y(){o.hidden=!1,o.classList.add("is-open"),document.documentElement.classList.add("threshold-dial-open"),n.setAttribute("aria-expanded","true"),queueMicrotask(()=>b.focus())}function M(){o.hidden=!0,o.classList.remove("is-open"),document.documentElement.classList.remove("threshold-dial-open"),n.setAttribute("aria-expanded","false"),n.focus()}function O(){o.hidden?y():M()}n.addEventListener("click",O),n.setAttribute("aria-expanded","false"),n.setAttribute("aria-haspopup","dialog");function _(i){const c=i.target;if(!c)return;const h=c.closest("[data-action]");(c.dataset.dismiss==="1"||h?.dataset.action==="done")&&M(),h?.dataset.action==="reset"&&a({...f}),h?.dataset.action==="open-profile"&&(M(),window.dispatchEvent(new CustomEvent("cwprofile:open"))),c.classList.contains("threshold-dial-close")&&M()}o.addEventListener("click",_);function U(i){const c=i.detail;c?.state&&a({...c.state})}window.addEventListener("cwprofile:apply",U);function H(i){i.key==="Escape"&&!o.hidden&&(i.stopPropagation(),M())}return document.addEventListener("keydown",H),k(),queueMicrotask(P),{get state(){return{...r}},get thresholds(){return z(r)},destroy(){n.removeEventListener("click",O),o.removeEventListener("click",_),document.removeEventListener("keydown",H),window.removeEventListener("cwprofile:apply",U),o.remove()},open:y,close:M}}export{Pe as a,Le as m};
