// Comfort-criteria counterfactuals (analysis only; November 19, 2026 reassessment options B, C and E).
// The app is NOT changed. This module rewrites the app script source in memory, before it runs in the test VM,
// with exact substitutions. Each substitution must match exactly once, so a later edit to index.html fails
// loudly here instead of silently testing something else. With every option off, each rewritten expression
// reduces to the original one (checked by running CF=none against the stored baseline).
//
// Options (comma-separated in CF, e.g. CF=B,C,E; CF=none for the rewritten-but-inert baseline):
//   B  Readiness window: a plan is ready when the bedroom is in the sleeping band (65–69°F) at any trace point
//      from bedtime through bedtime + 30 min, instead of only at the bedtime instant. A trace that ends before
//      bedtime + 30 min (a stage that ends at bedtime) counts as provisionally ready; the plan that continues
//      past bedtime decides. The warm, cold and severe-warm run rules are unchanged, so a bedroom that stays
//      above 70°F for 15 minutes after bedtime still fails.
//   C  Edge tolerance 0.5°F on the warm, cold and severe-warm run counters (a run starts above high + 0.5,
//      below low − 0.5, above high + 1.5). The 65°F floor, recovery entry, bedtime readiness and the D3
//      severity (degree-minutes outside the band) keep the exact band.
//   E  Absence: protection checks plus return comfort only. On rows with no occupants the warm, cold and
//      severe-warm runs do not accumulate (they reset), and when the absence begins before the 30-minute
//      recovery deadline, that deadline moves to the end of the absence (the return). The 65°F floor,
//      equipment and moisture checks, and the existing return-comfort test still apply. The bedroom at the
//      return instant, in the band that applies after return, counts as recovery. The ordering of
//      plans that do not qualify (ensembleUntil) still uses the 30-minute deadline for a case that never
//      recovers.
'use strict';
const OPTIONS={B:'readinessWindowMin',C:'edgeF',E:'absenceProtectionOnly'};
function parse(spec){
    const cf={readinessWindowMin:0,edgeF:0,absenceProtectionOnly:false};
    for(const key of String(spec||'').split(',').map(s=>s.trim()).filter(s=>s&&s!=='none')){
        if(!OPTIONS[key])throw new Error('unknown counterfactual '+key);
        if(key==='B')cf.readinessWindowMin=30;
        if(key==='C')cf.edgeF=.5;
        if(key==='E')cf.absenceProtectionOnly=true;
    }
    return cf;
}
const SUBSTITUTIONS=[
    // Recovery deadline (E): declared with the comfort run counters, carried through checkpoints.
    ['let warmRun=0,warmMax=0,coldRun=0,coldMax=0,severeRun=0,severeMax=0,recovery=null,',
     'let cfRecoveryDeadline=M.recoveryMinutes,warmRun=0,warmMax=0,coldRun=0,coldMax=0,severeRun=0,severeMax=0,recovery=null,'],
    ['const capture=time=>{if(options.capture&&time%300000===0)checkpoints.push({time,',
     'const capture=time=>{if(options.capture&&time%300000===0)checkpoints.push({time,cfRecoveryDeadline,'],
    ['tempMissDegMin=carry.tempMissDegMin??0;',
     'tempMissDegMin=carry.tempMissDegMin??0;cfRecoveryDeadline=carry.cfRecoveryDeadline??M.recoveryMinutes;'],
    // Run counters (C edge, E absence) and the recovery deadline (E).
    ['        if(elapsed>(activeRecovery?(recovery??Infinity):M.recoveryMinutes)){warmRun=comfortT>band.high?warmRun+dt*60:0;warmMax=Math.max(warmMax,warmRun);coldRun=coldT<band.low?coldRun+dt*60:0;coldMax=Math.max(coldMax,coldRun);severeRun=comfortT>band.high+1?severeRun+dt*60:0;severeMax=Math.max(severeMax,severeRun);}',
     '        const cfAway=CF.absenceProtectionOnly&&row.occupants===0;\n'+
     '        if(cfAway&&(row.from-start.getTime())/60000<=cfRecoveryDeadline+1e-6)cfRecoveryDeadline=Math.max(cfRecoveryDeadline,elapsed);\n'+
     '        if(cfAway){warmRun=0;coldRun=0;severeRun=0;}\n'+
     '        else if(elapsed>(activeRecovery?(recovery??Infinity):cfRecoveryDeadline)){warmRun=comfortT>band.high+CF.edgeF?warmRun+dt*60:0;warmMax=Math.max(warmMax,warmRun);coldRun=coldT<band.low-CF.edgeF?coldRun+dt*60:0;coldMax=Math.max(coldMax,coldRun);severeRun=comfortT>band.high+1+CF.edgeF?severeRun+dt*60:0;severeMax=Math.max(severeMax,severeRun);}'],
    ["!activeRecovery&&elapsed>=M.recoveryMinutes&&recovery===null?'Does not reach acceptable temperature within 30 minutes.'",
     "!activeRecovery&&elapsed>=cfRecoveryDeadline&&!(CF.absenceProtectionOnly&&row.occupants===0)&&recovery===null?'Does not reach acceptable temperature within 30 minutes.'"],
    ['const recovered=recovery!==null&&(activeRecovery||recovery<=M.recoveryMinutes);',
     'const recovered=recovery!==null&&(activeRecovery||recovery<=cfRecoveryDeadline);'],
    // E: the return state (the end of the absence, before the first occupied step) counts as recovery when it
    // is in the band that applies after return; otherwise recovery would be credited one step after the return.
    ['        if(recovery===null&&comfortT<=band.high&&coldT>=band.low)recovery=elapsed;',
     '        if(CF.absenceProtectionOnly&&recovery===null&&row.occupants>0&&(row.from-start.getTime())/60000<=cfRecoveryDeadline+1e-6&&\n'+
     '            previousZones[0]<=band.high&&previousZones[0]>=band.low)recovery=(row.from-start.getTime())/60000;\n'+
     '        if(recovery===null&&comfortT<=band.high&&coldT>=band.low)recovery=elapsed;'],
    // Readiness window (B).
    ['const ready=!bounds.bedtime||!!atBedtime&&atBedtime.bedroom>=sleepPolicy.low-1e-6&&atBedtime.bedroom<=sleepPolicy.high+1e-6;',
     'const cfInSleep=p=>p.bedroom>=sleepPolicy.low-1e-6&&p.bedroom<=sleepPolicy.high+1e-6,cfWindow=CF.readinessWindowMin*60000,cfBed=+bounds.bedtime;\n'+
     '    const ready=!bounds.bedtime||!!atBedtime&&(cfInSleep(atBedtime)||cfWindow>0&&(+sim.trace.at(-1).time<cfBed+cfWindow||sim.trace.some(p=>+p.time>=cfBed&&+p.time<=cfBed+cfWindow&&cfInSleep(p))));'],
];
function transform(spec){
    const cf=parse(spec);
    return source=>{
        let out=source;
        for(const [from,to] of SUBSTITUTIONS){
            const n=out.split(from).length-1;
            if(n!==1)throw new Error('counterfactual substitution matched '+n+' times: '+from.slice(0,80));
            out=out.replace(from,()=>to);
        }
        return 'const CF=Object.freeze('+JSON.stringify(cf)+');\n'+out;
    };
}
module.exports={parse,transform,SUBSTITUTIONS};
