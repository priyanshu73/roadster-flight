import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { initDrivingHarness } from '../../src/testing/DrivingHarness';
import { runHandlingSuite } from '../../src/testing/HandlingSuite';
import { validateCity } from '../../src/world/City';
import { VEHICLE_TUNING } from '../../src/vehicle/VehicleTuning';

await initDrivingHarness();
const city = validateCity(
  JSON.parse(readFileSync('public/cities/new-york-midtown/district.json', 'utf8')),
);
const results = runHandlingSuite(city);
const folder = 'artifacts/handling';
mkdirSync(folder, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  timestep: 1 / 60,
  tuning: VEHICLE_TUNING,
  results,
};
writeFileSync(`${folder}/telemetry.json`, JSON.stringify(report));
const columns = [
  'scenario',
  'time',
  'phase',
  'keys',
  'x',
  'y',
  'z',
  'localX',
  'localZ',
  'speed',
  'forwardSpeed',
  'lateralSpeed',
  'verticalSpeed',
  'yawDegrees',
  'yawRate',
  'steering',
  'pressure',
  'boostForce',
  'hopImpulse',
  'airYawTorque',
  'grounded',
  'contacts',
];
const rows = results.flatMap((r) =>
  r.samples.map((s) =>
    [
      r.id,
      s.time,
      s.phase,
      s.keys.join('+'),
      ...s.position,
      s.localX,
      s.localZ,
      s.speed,
      s.forwardSpeed,
      s.lateralSpeed,
      s.verticalSpeed,
      s.yawDegrees,
      s.yawRate,
      s.steering,
      s.pressure,
      s.boostForce,
      s.hopImpulse,
      s.airYawTorque,
      s.grounded,
      s.wheelContacts.filter(Boolean).length,
    ].join(','),
  ),
);
writeFileSync(`${folder}/telemetry.csv`, columns.join(',') + '\n' + rows.join('\n') + '\n');
const checks = results.flatMap((r) => r.checks);
for (const r of results) {
  const failed = r.checks.filter((c) => !c.passed);
  console.log(
    `${failed.length ? 'FAIL' : 'PASS'} ${r.name} — yaw ${r.samples.at(-1)!.yawDegrees.toFixed(1)}°, speed ${(r.samples.at(-1)!.speed * 3.6).toFixed(1)} km/h`,
  );
  failed.forEach((c) =>
    console.log(`     ${c.name}: ${c.actual.toFixed(3)} (expected ${c.expected})`),
  );
}
const data = JSON.stringify(report).replaceAll('<', '\\u003c');
writeFileSync(
  `${folder}/report.html`,
  String.raw`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Roadster handling lab</title><style>
*{box-sizing:border-box}body{margin:0;padding:35px;background:#10171e;color:#e4eaf0;font:14px system-ui}h1{font-size:30px;letter-spacing:-1px;margin:0 0 8px}p{color:#9cabb8;line-height:1.7}header{margin-bottom:28px}select,input{background:#23313e;color:white;border:1px solid #466071;padding:10px;font:inherit}select{max-width:100%;width:420px}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin:25px 0}.panel{background:#16232d;border:1px solid #30404d;padding:20px}h2{font-size:13px;font-weight:500;margin:0 0 14px;color:#b7c6d0}canvas{width:100%;height:300px}#checks{line-height:2}.pass{color:#90dbb2}.fail{color:#ff827d}input{width:100%}.readout{font:12px ui-monospace,monospace;white-space:pre-wrap;line-height:1.8}a{color:#98caff}table{border-collapse:collapse;width:100%;font-size:12px}th,td{text-align:left;border-bottom:1px solid #30404d;padding:10px}th{color:#a7b7c4}@media(max-width:800px){.layout{grid-template-columns:1fr}body{padding:16px}}</style>
<header><h1>ROADSTER / HANDLING LAB</h1><p>Real Rapier 3D simulation · same vehicle, input buffer and Midtown colliders as the game · fixed 60 Hz<br>Deterministic scripted inputs. No browser, GPU or manual computer use required to run this suite.</p><strong class="${checks.every((c) => c.passed) ? 'pass' : 'fail'}">${results.length} scenarios · ${checks.filter((c) => c.passed).length}/${checks.length} checks passed</strong></header>
<select id="scenario" aria-label="Scenario"></select><div class="layout"><section class="panel"><h2>TOP-DOWN TRAJECTORY · X / Z METRES</h2><canvas id="top"></canvas></section><section class="panel"><h2>3D TRAJECTORY · HEIGHT EXAGGERATED FOR INSPECTION</h2><canvas id="iso"></canvas></section></div><input id="scrub" type="range" min="0" value="0" aria-label="Simulation tick"><div class="layout"><section class="panel"><h2>TICK TELEMETRY</h2><div class="readout" id="readout"></div></section><section class="panel"><h2>BEHAVIOUR CHECKS</h2><div id="checks"></div></section></div><section class="panel"><h2>HEADING (RED) · HEIGHT (BLUE) · PRESSURE (GREEN), NORMALISED</h2><canvas id="series"></canvas></section><p><a href="telemetry.json">Full 60 Hz JSON</a> · <a href="telemetry.csv">CSV log</a></p><section class="panel"><h2>ALL SCENARIOS</h2><table><thead><tr><th>Scenario</th><th>Result</th><th>Final yaw</th><th>Peak height</th></tr></thead><tbody id="summary"></tbody></table></section>
<script>const report=${data};const results=report.results,select=document.querySelector('#scenario'),scrub=document.querySelector('#scrub');results.forEach((r,i)=>select.add(new Option(r.name,i)));document.querySelector('#summary').innerHTML=results.map(r=>'<tr><td>'+r.name+'</td><td class="'+(r.checks.every(c=>c.passed)?'pass':'fail')+'">'+(r.checks.every(c=>c.passed)?'PASS':'FAIL')+'</td><td>'+r.samples.at(-1).yawDegrees.toFixed(1)+'°</td><td>'+Math.max(...r.samples.map(s=>s.height)).toFixed(2)+' m</td></tr>').join('');
function canvas(id){const c=document.querySelector('#'+id);c.width=c.clientWidth*devicePixelRatio;c.height=300*devicePixelRatio;const ctx=c.getContext('2d');ctx.scale(devicePixelRatio,devicePixelRatio);return {ctx,w:c.clientWidth,h:300}}
function path(id,samples,index,iso){const{ctx,w,h}=canvas(id);const pts=samples.map(s=>iso?[s.localX*.8-s.localZ*.6,-s.height*4+s.localX*.3+s.localZ*.4]:[s.localX,-s.localZ]);const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),minx=Math.min(0,...xs),maxx=Math.max(0,...xs),miny=Math.min(0,...ys),maxy=Math.max(0,...ys),scale=Math.min((w-60)/Math.max(10,maxx-minx),(h-60)/Math.max(10,maxy-miny));const project=p=>[w/2+(p[0]-(minx+maxx)/2)*scale,h/2+(p[1]-(miny+maxy)/2)*scale];ctx.strokeStyle='#29404e';for(let x=0;x<w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.strokeStyle='#8fb6ca';ctx.lineWidth=2;ctx.beginPath();pts.forEach((p,i)=>{const q=project(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke();const p=project(pts[index]);ctx.fillStyle='#ff675e';ctx.beginPath();ctx.arc(...p,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c8d6dd';ctx.fillText('Path bounds: '+(maxx-minx).toFixed(1)+' × '+(maxy-miny).toFixed(1)+' m',10,18)}
function draw(){const r=results[+select.value],s=r.samples[+scrub.value];path('top',r.samples,+scrub.value,false);path('iso',r.samples,+scrub.value,true);const{ctx,w,h}=canvas('series');for(const[field,color]of[['yawDegrees','#ff756b'],['height','#80b7ff'],['pressure','#8de3aa']]){const max=Math.max(1,...r.samples.map(s=>Math.abs(s[field])));ctx.strokeStyle=color;ctx.beginPath();r.samples.forEach((s,i)=>{const x=i/(r.samples.length-1)*w,y=h/2-s[field]/max*(h/2-15);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}ctx.strokeStyle='#fff8';ctx.beginPath();ctx.moveTo(+scrub.value/(r.samples.length-1)*w,0);ctx.lineTo(+scrub.value/(r.samples.length-1)*w,h);ctx.stroke();document.querySelector('#readout').textContent='Time: '+s.time.toFixed(3)+' s · phase: '+s.phase+'\nKeys: '+(s.keys.join(' + ')||'none')+'\nPosition: '+s.position.map(n=>n.toFixed(2)).join(', ')+' m\nSpeed: '+(s.speed*3.6).toFixed(1)+' km/h · vertical: '+s.verticalSpeed.toFixed(2)+' m/s\nYaw: '+s.yawDegrees.toFixed(1)+'° · yaw rate: '+s.yawRate.toFixed(3)+' rad/s\nSteering: '+(s.steering*180/Math.PI).toFixed(1)+'° · side slip: '+s.lateralSpeed.toFixed(2)+' m/s\nPressure: '+s.pressure.toFixed(1)+'% · boost: '+s.boostForce+' N\nHop impulse: '+s.hopImpulse.toFixed(0)+' Ns · air yaw torque: '+s.airYawTorque.toFixed(0)+' Nm\nWheel contacts: '+s.wheelContacts.filter(Boolean).length+'/4 · grounded: '+s.grounded;document.querySelector('#checks').innerHTML=r.checks.map(c=>'<div class="'+(c.passed?'pass':'fail')+'">'+(c.passed?'PASS':'FAIL')+' · '+c.name+' ('+c.actual.toFixed(3)+'; '+c.expected+')</div>').join('')}
function change(){scrub.max=results[+select.value].samples.length-1;scrub.value=scrub.max;draw()}select.onchange=change;scrub.oninput=draw;window.onresize=draw;change();</script></html>`,
);
console.log(
  `\n${results.length} scenarios; ${checks.filter((c) => c.passed).length}/${checks.length} checks passed. Report: ${folder}/report.html`,
);
if (checks.some((c) => !c.passed)) process.exitCode = 1;
