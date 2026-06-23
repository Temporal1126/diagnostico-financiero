import { useState, useMemo, useEffect, useRef } from "react";
import Head from "next/head";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer
} from "recharts";

// ─── UTILS ────────────────────────────────────────────────────────
const cur = n => Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
const fmtP = n => `${(n*100).toFixed(1)}%`;
const LC = { A:"#16A085", R:"#E67E22", B:"#C0392B" };
const LL = { A:"Aceptable", R:"Regular", B:"Bajo" };

// ─── SCORING ──────────────────────────────────────────────────────
function calcFinance(d) {
  const sales = parseFloat(d.sales)||0;
  const exps = ["salaries","merchandise","services","bizExpenses","financial","other"]
    .reduce((s,k)=>s+(parseFloat(d.expenses[k])||0),0);
  const net=sales-exps, marg=sales>0?net/sales:0;
  let sc=4;
  if(marg>0.30)sc=10; else if(marg>0.25)sc=9; else if(marg>0.20)sc=8;
  else if(marg>0.15)sc=7; else if(marg>0.10)sc=6; else if(marg>0.05)sc=5;
  const lt=sc<=5?"B":sc===6?"R":"A";
  const cmt=lt==="B"?"Utilidad en riesgo. Revisa urgentemente tus gastos y busca aumentar tus ventas.":
    lt==="R"?"Utilidad regular. Se recomienda aumentar ventas o reducir gastos para mejorar el margen.":
    "Utilidad aceptable. Mantén el equilibrio entre ventas y gastos.";
  return {sc,lt,net,marg,exps,sales,cmt};
}

function calcMarketing(d,f) {
  const spend=parseFloat(d.marketingSpend)||0;
  const ps=f.sales>0?spend/f.sales:0;
  const pp=f.net>0?spend/f.net:(spend>0?99:0);
  const s1=spend===0?4:ps<=0.009?4:ps<=0.025?10:ps<=0.05?9:ps<=0.075?8:ps<=0.1249?7:ps<=0.25?6:ps<=0.5?5:4;
  const s2=spend===0||f.net<=0?4:pp<=0.009?4:pp<=0.05?10:pp<=0.10?9:pp<=0.125?8:pp<=0.15?7:pp<=0.25?6:pp<=0.5?5:4;
  const sc=(s1+s2)/2;
  const lt=sc<=5?"B":sc<=7?"R":"A";
  const CMTS={
    BB:"Busca asesoría en marketing para tu negocio, con el fin de aumentar ventas y utilidad.",
    BR:"Busca asesoría en marketing; tu publicidad no está generando suficiente retorno.",
    BA:"Tu publicidad necesita generar más ventas; busca asesoría en marketing.",
    RB:"Tus gastos de publicidad generan ventas, pero es urgente planificar mejor tu inversión.",
    RR:"Es muy importante buscar asesoría para planificar adecuadamente tu inversión en publicidad.",
    RA:"Busca asesoría para planificar tu inversión en publicidad y obtener mejores resultados.",
    AB:"Con poca publicidad tu negocio genera ventas; es urgente fortalecer tu estrategia de marketing.",
    AR:"Con poca publicidad tienes ventas; es recomendable fortalecer tu estrategia de marketing.",
    AA:"Tus gastos de publicidad están generando ventas y utilidad; tu estrategia al parecer es funcional.",
  };
  return {sc,lt,ps,pp,s1,s2,spend,cmt:CMTS[f.lt+lt]||"Revisa tu estrategia de marketing."};
}

function calcInnovation(d) {
  const v=d.isInnovating;
  const sc=v==="yes"?10:v==="process"?7:5;
  const lt=sc<=6?"B":sc<=8?"R":"A";
  const CMTS={
    yes:"Tu estrategia de innovación afecta positivamente tus ventas; mantén esta política de manera permanente.",
    process:"Al parecer tu estrategia de innovación es adecuada; es importante mantenerla para elevar tus resultados.",
    no:"Es urgente que implementes acciones o estrategias para mejorar tus procesos o servicios.",
  };
  return {sc,lt,cmt:CMTS[v]||""};
}

function calcOperations(d,f) {
  const inv=d.inventory==="electronic"?10:d.inventory==="manual"?5:7;
  const emp=((d.employees==="yes"?10:8)+(d.selfSalary==="yes"?10:5))/2;
  const prod=d.hasIssues==="yes"?(10+(d.hasSolution==="yes"?10:d.hasSolution==="partial"?8:5))/2:5;
  const sc=(inv+emp+prod)/3;
  const lt=sc<=6?"B":"A";
  const CMTS={
    BB:"Es urgente asesorarse para iniciar de inmediato una estrategia de reingeniería de tu negocio.",
    BA:"Tu estrategia operativa es correcta pero no se refleja en resultados; revisa finanzas, marketing e innovación.",
    RB:"Es muy urgente implementar una estrategia para mejorar tus procesos operativos.",
    RA:"Tu estrategia operativa es correcta, pero no se refleja significativamente en tus resultados.",
    AB:"Si bien tus resultados son aceptables, es urgente implementar una estrategia de mejora operativa.",
    AR:"Si bien tus resultados son aceptables, tienes áreas de oportunidad para mejorar la operación.",
    AA:"Tus procesos operativos son buenos y esto se refleja directamente en tu salud financiera; mantente en esta estrategia.",
  };
  return {sc,lt,cmt:CMTS[f.lt+lt]||"Revisa tus procesos operativos."};
}

function getVerdict(total) {
  if(total<=15)return{v:"Muy Bajo",c:"#C0392B",d:"Necesitas asesorarte de manera integral para replantear tu negocio. Estás en riesgo de quiebra."};
  if(total<=20)return{v:"Regular a Bajo",c:"#E74C3C",d:"Debes implementar acciones inmediatas atendiendo las recomendaciones de este reporte."};
  if(total<=25)return{v:"Regular a Bajo",c:"#E67E22",d:"Debes implementar acciones atendiendo las recomendaciones que aparecen en este reporte."};
  if(total<=30)return{v:"Regular",c:"#F39C12",d:"Tu negocio presenta fortalezas, pero debes atender las áreas de oportunidad en el corto plazo."};
  if(total<=35)return{v:"Aceptable a Regular",c:"#2980B9",d:"Tu negocio presenta fortalezas; es necesario revisar las áreas de oportunidad de este reporte."};
  return{v:"Aceptable",c:"#27AE60",d:"Tu negocio presenta fortalezas, aunque siempre hay áreas de oportunidad para seguir mejorando."};
}

// ─── UI HELPERS ───────────────────────────────────────────────────
const STEP_LABELS=["General","Finanzas","Marketing","Innovación","Operaciones"];

function StepBar({current}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24}}>
      {STEP_LABELS.map((s,i)=>{
        const idx=i+1,done=current>idx,active=current===idx;
        return(
          <div key={s} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,background:done?"#16A085":active?"#1A3A5C":"#E2E8F0",color:done||active?"white":"#94A3B8",boxShadow:active?"0 0 0 3px rgba(26,58,92,0.2)":"none"}}>
                {done?"✓":idx}
              </div>
              <span style={{fontSize:10,color:active?"#1A3A5C":done?"#16A085":"#94A3B8",fontWeight:active?700:400,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<STEP_LABELS.length-1&&<div style={{width:28,height:2,background:done?"#16A085":"#E2E8F0",margin:"0 3px 16px"}}/>}
          </div>
        );
      })}
    </div>
  );
}

function Inp({value,onChange,placeholder,type="text",prefix}){
  return(
    <div style={{display:"flex",alignItems:"stretch",border:"1.5px solid #CBD5E1",borderRadius:8,overflow:"hidden",background:"white"}}>
      {prefix&&<span style={{padding:"0 10px",background:"#F1F5F9",color:"#64748B",fontSize:13,borderRight:"1px solid #CBD5E1",display:"flex",alignItems:"center"}}>{prefix}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{flex:1,padding:"10px 12px",border:"none",outline:"none",fontSize:14,color:"#2C3E50",background:"transparent",minWidth:0}}/>
    </div>
  );
}

function RadioGroup({options,value,onChange}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {options.map(({v,l,d})=>(
        <div key={v} onClick={()=>onChange(v)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:8,cursor:"pointer",userSelect:"none",transition:"all 0.15s",background:value===v?"rgba(26,58,92,0.05)":"white",border:`1.5px solid ${value===v?"#1A3A5C":"#CBD5E1"}`}}>
          <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,marginTop:1,border:`2px solid ${value===v?"#1A3A5C":"#CBD5E1"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {value===v&&<div style={{width:8,height:8,borderRadius:"50%",background:"#1A3A5C"}}/>}
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"#2C3E50"}}>{l}</div>
            {d&&<div style={{fontSize:12,color:"#7F8C8D",marginTop:2}}>{d}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({label,hint,children}){
  return(
    <div style={{marginBottom:18}}>
      <div style={{fontWeight:700,fontSize:13,color:"#1A3A5C",marginBottom:hint?2:6}}>{label}</div>
      {hint&&<div style={{fontSize:12,color:"#7F8C8D",marginBottom:6}}>{hint}</div>}
      {children}
    </div>
  );
}

function ScoreRing({total,verd}){
  const r=56,cx=70,cy=70,sw=12,circ=2*Math.PI*r;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <svg width={140} height={140}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={sw}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={verd.c} strokeWidth={sw}
          strokeDasharray={`${(total/40)*circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}/>
        <text x={cx} y={cy-5} textAnchor="middle" fontSize={30} fontWeight={900} fill={verd.c} fontFamily="inherit">{total.toFixed(1)}</text>
        <text x={cx} y={cy+14} textAnchor="middle" fontSize={11} fill="#94A3B8" fontFamily="inherit">de 40 pts</text>
      </svg>
      <div style={{fontWeight:800,fontSize:18,color:verd.c}}>{verd.v}</div>
    </div>
  );
}

function AreaCard({icon,title,score,letter,comment}){
  const c=LC[letter];
  return(
    <div style={{background:"white",borderRadius:12,padding:16,border:`2px solid ${c}25`,boxShadow:"0 2px 8px rgba(0,0,0,0.05)",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:14,fontWeight:700,color:"#1A3A5C"}}>{icon} {title}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:900,fontSize:20,color:c}}>{score.toFixed(1)}<span style={{fontSize:11,color:"#CBD5E1",fontWeight:400}}>/10</span></span>
          <div style={{background:c,color:"white",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{LL[letter]}</div>
        </div>
      </div>
      <div style={{height:5,background:"#F1F5F9",borderRadius:3,marginBottom:10,overflow:"hidden"}}>
        <div style={{width:`${(score/10)*100}%`,height:"100%",background:c,borderRadius:3}}/>
      </div>
      <p style={{fontSize:12,color:"#475569",margin:0,lineHeight:1.55}}>{comment}</p>
    </div>
  );
}

// ─── INIT ─────────────────────────────────────────────────────────
const INIT={
  businessName:"",rfc:"",city:"",activityType:"",email:"",
  sales:"",
  expenses:{salaries:"",merchandise:"",services:"",bizExpenses:"",financial:"",other:""},
  salesType:"a",purchaseType:"a",
  clientSource:"",marketingSpend:"",
  isInnovating:"",innovationDescription:"",
  inventory:"",employees:"",selfSalary:"",hasIssues:"",hasSolution:"",
};

// ─── MAIN ─────────────────────────────────────────────────────────
export default function Home(){
  const [step,setStep]=useState(0);
  const [d,setD]=useState(INIT);
  const [sending,setSending]=useState(false);
  const [emailSent,setEmailSent]=useState(false);
  const savedRef=useRef(false);

  const upd=(k,v)=>setD(p=>({...p,[k]:v}));
  const updE=(k,v)=>setD(p=>({...p,expenses:{...p.expenses,[k]:v}}));

  const R=useMemo(()=>{
    const f=calcFinance(d),m=calcMarketing(d,f),inn=calcInnovation(d),ops=calcOperations(d,f);
    const total=f.sc+m.sc+inn.sc+ops.sc;
    return{f,m,inn,ops,total,verd:getVerdict(total)};
  },[d]);

  const radar=[
    {area:"Finanzas",score:R.f.sc},{area:"Marketing",score:R.m.sc},
    {area:"Innovación",score:R.inn.sc},{area:"Operaciones",score:R.ops.sc}
  ];

  // Save to DB + send email when reaching results
  useEffect(()=>{
    if(step===6&&!savedRef.current){
      savedRef.current=true;
      // Save to Supabase
      fetch("/api/save-result",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          businessName:d.businessName,city:d.city,email:d.email,rfc:d.rfc,
          activityType:d.activityType,
          financeScore:R.f.sc,marketingScore:R.m.sc,
          innovationScore:R.inn.sc,operationsScore:R.ops.sc,
          totalScore:R.total,verdict:R.verd.v,
          financeLetter:R.f.lt,marketingLetter:R.m.lt,
          innovationLetter:R.inn.lt,operationsLetter:R.ops.lt,
          sales:R.f.sales,netProfit:R.f.net,margin:R.f.marg,
          marketingSpend:R.m.spend,isInnovating:d.isInnovating,
        })
      }).catch(console.error);
      // Send email
      if(d.email){
        setSending(true);
        fetch("/api/send-email",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            to:d.email,businessName:d.businessName,city:d.city,activityType:d.activityType,
            financeScore:R.f.sc,marketingScore:R.m.sc,innovationScore:R.inn.sc,operationsScore:R.ops.sc,
            totalScore:R.total,verdict:R.verd.v,verdictDesc:R.verd.d,
            financeLetter:R.f.lt,marketingLetter:R.m.lt,innovationLetter:R.inn.lt,operationsLetter:R.ops.lt,
            financeComment:R.f.cmt,marketingComment:R.m.cmt,innovationComment:R.inn.cmt,operationsComment:R.ops.cmt,
            sales:R.f.sales,netProfit:R.f.net,margin:R.f.marg,
            marketingSpend:R.m.spend,marketingPctSales:R.m.ps,
          })
        }).then(()=>setEmailSent(true)).catch(console.error).finally(()=>setSending(false));
      }
    }
  },[step]);

  const next=()=>setStep(s=>s+1);
  const back=()=>setStep(s=>s-1);

  const base={minHeight:"100vh",background:"#F0F4F8",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",padding:"20px 16px"};

  const wrap=children=>(
    <div style={base}><div style={{maxWidth:560,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <span style={{background:"#1A3A5C",color:"white",padding:"5px 14px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:0.5}}>💼 DIAGNÓSTICO FINANCIERO</span>
      </div>
      <StepBar current={step}/>
      <div style={{background:"white",borderRadius:16,padding:"24px 20px",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>{children}</div>
    </div></div>
  );

  const Btns=({ok=true})=>(
    <div style={{display:"flex",gap:10,marginTop:24}}>
      {step>0&&<button onClick={back} style={{flex:1,padding:"12px",borderRadius:8,border:"2px solid #CBD5E1",background:"white",fontWeight:600,fontSize:14,color:"#475569",cursor:"pointer"}}>← Atrás</button>}
      <button onClick={next} disabled={!ok} style={{flex:2,padding:"12px",borderRadius:8,border:"none",fontWeight:700,fontSize:14,cursor:ok?"pointer":"not-allowed",background:ok?"#1A3A5C":"#E2E8F0",color:ok?"white":"#94A3B8",transition:"all 0.2s"}}>
        {step===5?"📊 Ver mi Diagnóstico":"Continuar →"}
      </button>
    </div>
  );

  if(step===0) return(
    <>
      <Head><title>Diagnóstico de Salud Financiera — Sí Financia</title></Head>
      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#1A3A5C 0%,#2C5282 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",padding:24}}>
        <div style={{maxWidth:460,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:60,marginBottom:12}}>📊</div>
          <h1 style={{color:"white",fontSize:26,fontWeight:900,margin:"0 0 12px",lineHeight:1.2}}>Diagnóstico de<br/>Salud Financiera</h1>
          <p style={{color:"rgba(255,255,255,0.72)",fontSize:14,lineHeight:1.7,margin:"0 0 24px"}}>Evalúa tu negocio en <strong style={{color:"#F0C040"}}>4 áreas clave</strong> y recibe un diagnóstico personalizado con recomendaciones concretas para crecer.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
            {[["💰","Finanzas","Utilidad y márgenes"],["📣","Marketing","Publicidad y clientes"],["💡","Innovación","Crecimiento y mejora"],["⚙️","Operaciones","Procesos y equipo"]].map(([icon,t,sub])=>(
              <div key={t} style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                <div style={{fontWeight:700,fontSize:13,color:"white"}}>{t}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>{sub}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setStep(1)} style={{background:"white",color:"#1A3A5C",border:"none",padding:"14px 40px",borderRadius:10,fontWeight:800,fontSize:15,cursor:"pointer",width:"100%",boxShadow:"0 4px 20px rgba(0,0,0,0.25)",marginBottom:10}}>
            Comenzar Diagnóstico →
          </button>
          <a href="/admin" style={{display:"block",color:"rgba(255,255,255,0.55)",fontSize:12,marginTop:10,textDecoration:"none"}}>
            Panel de Administrador
          </a>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:12,marginTop:8}}>⏱ Aproximadamente 5 minutos</p>
        </div>
      </div>
    </>
  );

  if(step===1) return wrap(<>
    <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#1A3A5C"}}>Datos Generales</h2>
    <p style={{margin:"0 0 20px",color:"#64748B",fontSize:13}}>Cuéntanos sobre tu empresa</p>
    <Field label="Nombre del Negocio / Razón Social">
      <Inp value={d.businessName} onChange={v=>upd("businessName",v)} placeholder="Ej. Lavandería El Sol"/>
    </Field>
    <Field label="Correo Electrónico" hint="Para enviarte los resultados de tu diagnóstico">
      <Inp value={d.email} onChange={v=>upd("email",v)} type="email" prefix="✉" placeholder="tunegocio@correo.com"/>
    </Field>
    <Field label="RFC" hint="Registro Federal de Contribuyentes (opcional)">
      <Inp value={d.rfc} onChange={v=>upd("rfc",v)} placeholder="Ej. MARE900506LP1"/>
    </Field>
    <Field label="Ciudad / Municipio">
      <Inp value={d.city} onChange={v=>upd("city",v)} placeholder="Ej. Morelia, Mich."/>
    </Field>
    <Field label="Tipo de Actividad Empresarial">
      <RadioGroup value={d.activityType} onChange={v=>upd("activityType",v)} options={[
        {v:"industrial",l:"Industrial / Extractiva",d:"Transforman materias primas"},
        {v:"commercial",l:"Comercial",d:"Intermediarios entre productor y consumidor"},
        {v:"service",l:"Servicios",d:"Servicios intangibles (salud, educación, transporte)"},
      ]}/>
    </Field>
    <Btns ok={!!d.businessName&&!!d.activityType}/>
  </>);

  if(step===2) return wrap(<>
    <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#1A3A5C"}}>Finanzas</h2>
    <p style={{margin:"0 0 20px",color:"#64748B",fontSize:13}}>Ingresos y egresos del último mes</p>
    <Field label="Ventas totales del mes" hint="¿Cuánto vendió tu empresa el último mes?">
      <Inp value={d.sales} onChange={v=>upd("sales",v)} type="number" prefix="$" placeholder="35,000"/>
    </Field>
    <div style={{background:"#F8FAFC",borderRadius:10,padding:16,marginBottom:18,border:"1px solid #E2E8F0"}}>
      <div style={{fontWeight:700,fontSize:13,color:"#1A3A5C",marginBottom:12}}>📋 Desglose de Gastos</div>
      {[["salaries","Sueldos y salarios","Incluyendo el tuyo si te pagas"],["merchandise","Mercancía / Materia prima","Para la actividad del negocio"],["services","Servicios (agua, luz, tel.)","Servicios básicos del negocio"],["bizExpenses","Gastos del negocio","Renta, gasolina, publicidad"],["financial","Gastos financieros","Pagos de créditos o préstamos"],["other","Otros gastos","No relacionados con el negocio"]].map(([key,label,hint])=>(
        <div key={key} style={{marginBottom:8}}>
          <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:3}}>{label} <span style={{color:"#9CA3AF",fontWeight:400}}>— {hint}</span></div>
          <Inp value={d.expenses[key]} onChange={v=>updE(key,v)} type="number" prefix="$" placeholder="0"/>
        </div>
      ))}
    </div>
    {parseFloat(d.sales)>0&&(
      <div style={{borderRadius:10,padding:14,marginBottom:18,display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:8,background:R.f.net>=0?"#F0FDF4":"#FEF2F2",border:`1px solid ${R.f.net>=0?"#BBF7D0":"#FECACA"}`}}>
        {[["Gastos Totales",cur(R.f.exps),"#374151"],["Utilidad Neta",cur(R.f.net),R.f.net>=0?"#15803D":"#DC2626"],["Margen",fmtP(R.f.marg),R.f.net>=0?"#15803D":"#DC2626"]].map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center"}}><div style={{fontSize:11,color:"#6B7280"}}>{l}</div><div style={{fontWeight:800,fontSize:16,color:c}}>{v}</div></div>
        ))}
      </div>
    )}
    <Field label="¿Cómo son tus ventas a clientes?">
      <RadioGroup value={d.salesType} onChange={v=>upd("salesType",v)} options={[{v:"a",l:"Al contado"},{v:"b",l:"A crédito"},{v:"c",l:"Contado y a crédito"}]}/>
    </Field>
    <Field label="¿Cómo pagas a tus proveedores?">
      <RadioGroup value={d.purchaseType} onChange={v=>upd("purchaseType",v)} options={[{v:"a",l:"Al contado"},{v:"b",l:"A crédito"},{v:"c",l:"Contado y a crédito"}]}/>
    </Field>
    <Btns ok={!!d.sales&&parseFloat(d.sales)>0}/>
  </>);

  if(step===3) return wrap(<>
    <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#1A3A5C"}}>Marketing</h2>
    <p style={{margin:"0 0 20px",color:"#64748B",fontSize:13}}>¿Cómo atraes clientes a tu negocio?</p>
    <Field label="¿Cómo se enteran tus clientes de tu negocio?">
      <RadioGroup value={d.clientSource} onChange={v=>upd("clientSource",v)} options={[
        {v:"a",l:"Redes sociales",d:"Facebook, Instagram, TikTok, etc."},
        {v:"b",l:"Medios tradicionales",d:"Periódico, radio, folletos, volantes"},
        {v:"c",l:"Recomendación de clientes",d:"Boca a boca"},
        {v:"d",l:"Otro medio",d:"Señalética, directorio, etc."},
        {v:"e",l:"No utilizo publicidad",d:"Los clientes me encuentran solos"},
      ]}/>
    </Field>
    <Field label="Gasto mensual en publicidad" hint="Escribe 0 si no inviertes en publicidad actualmente">
      <Inp value={d.marketingSpend} onChange={v=>upd("marketingSpend",v)} type="number" prefix="$" placeholder="0"/>
    </Field>
    <Btns ok={!!d.clientSource&&d.marketingSpend!==""}/>
  </>);

  if(step===4) return wrap(<>
    <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#1A3A5C"}}>Innovación</h2>
    <p style={{margin:"0 0 20px",color:"#64748B",fontSize:13}}>Mejora continua de tu negocio</p>
    <div style={{background:"#EEF2FF",borderRadius:10,padding:12,marginBottom:20,border:"1px solid #C7D2FE"}}>
      <p style={{margin:0,fontSize:13,color:"#3730A3",lineHeight:1.5}}>💡 <strong>Innovar</strong> significa implementar nuevas ideas, procesos, productos o servicios que generen valor y aumenten la competitividad de tu negocio.</p>
    </div>
    <Field label="¿Estás innovando en tu empresa actualmente?">
      <RadioGroup value={d.isInnovating} onChange={v=>upd("isInnovating",v)} options={[
        {v:"yes",l:"Sí, estoy innovando",d:"He implementado mejoras o nuevas ideas recientemente"},
        {v:"process",l:"En proceso",d:"Estoy trabajando en ello, pero aún no lo consolido"},
        {v:"no",l:"No por ahora",d:"No he implementado cambios o mejoras recientes"},
      ]}/>
    </Field>
    {d.isInnovating&&d.isInnovating!=="no"&&(
      <Field label="¿En qué área(s) estás innovando?" hint="Descríbelo brevemente">
        <textarea value={d.innovationDescription} onChange={e=>upd("innovationDescription",e.target.value)}
          placeholder="Ej. Desarrollando una app para pedidos, mejoré mi proceso de entrega..."
          style={{width:"100%",padding:"10px 12px",border:"1.5px solid #CBD5E1",borderRadius:8,fontSize:13,minHeight:80,resize:"vertical",outline:"none",boxSizing:"border-box",color:"#2C3E50"}}/>
      </Field>
    )}
    <Btns ok={!!d.isInnovating}/>
  </>);

  if(step===5) return wrap(<>
    <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"#1A3A5C"}}>Operaciones</h2>
    <p style={{margin:"0 0 20px",color:"#64748B",fontSize:13}}>Procesos internos de tu negocio</p>
    <Field label="Control de inventario o materiales">
      <RadioGroup value={d.inventory} onChange={v=>upd("inventory",v)} options={[
        {v:"electronic",l:"Sistema electrónico",d:"Software, app o Excel para controlar inventario"},
        {v:"manual",l:"Control manual",d:"Libreta, apuntes o de memoria"},
        {v:"na",l:"No aplica",d:"Mi negocio no maneja inventario físico"},
      ]}/>
    </Field>
    <Field label="¿Tienes colaboradores en el negocio?">
      <RadioGroup value={d.employees} onChange={v=>upd("employees",v)} options={[
        {v:"yes",l:"Sí, tengo empleados o familiares que colaboran"},
        {v:"no",l:"No, solo trabajo yo"},
      ]}/>
    </Field>
    <Field label="¿Te asignas un sueldo fijo?" hint="¿Separas una cantidad fija para ti del dinero del negocio?">
      <RadioGroup value={d.selfSalary} onChange={v=>upd("selfSalary",v)} options={[
        {v:"yes",l:"Sí, me asigno un sueldo fijo mensual"},
        {v:"no",l:"No, tomo dinero del negocio según lo necesito"},
      ]}/>
    </Field>
    <Field label="Problemas en producción / servicio" hint="¿Identificas problemas en tu proceso o atención al cliente?">
      <RadioGroup value={d.hasIssues} onChange={v=>upd("hasIssues",v)} options={[
        {v:"yes",l:"Sí, conozco los problemas que tengo"},
        {v:"no",l:"No tengo problemas o no los he identificado"},
      ]}/>
    </Field>
    {d.hasIssues==="yes"&&(
      <Field label="¿Has implementado soluciones?">
        <RadioGroup value={d.hasSolution} onChange={v=>upd("hasSolution",v)} options={[
          {v:"yes",l:"Sí, ya implementé soluciones"},
          {v:"partial",l:"Parcialmente, estoy en ello"},
          {v:"no",l:"No, aún no actúo sobre ellos"},
        ]}/>
      </Field>
    )}
    <Btns ok={!!d.inventory&&!!d.employees&&!!d.selfSalary&&!!d.hasIssues&&(d.hasIssues!=="yes"||!!d.hasSolution)}/>
  </>);

  // RESULTS
  return(
    <div style={{minHeight:"100vh",background:"#F0F4F8",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",padding:"20px 16px"}}>
      <div style={{maxWidth:580,margin:"0 auto"}}>
        <div style={{background:"#1A3A5C",borderRadius:16,padding:20,marginBottom:14,color:"white",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1,marginBottom:4}}>DIAGNÓSTICO FINANCIERO</div>
          <div style={{fontSize:20,fontWeight:800}}>{d.businessName||"Tu Negocio"}</div>
          {d.city&&<div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginTop:2}}>{d.city}</div>}
          {d.email&&<div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{d.email}</div>}
        </div>

        {d.email&&(
          <div style={{background:emailSent?"#F0FDF4":"#FFF7ED",border:`1px solid ${emailSent?"#BBF7D0":"#FED7AA"}`,borderRadius:10,padding:12,marginBottom:14,textAlign:"center"}}>
            <p style={{fontSize:13,color:emailSent?"#15803D":"#92400E",margin:0}}>
              {sending?"⏳ Enviando tu diagnóstico al correo...":emailSent?`✅ Diagnóstico enviado a ${d.email}`:"📧 Preparando tu correo..."}
            </p>
          </div>
        )}

        <div style={{background:"white",borderRadius:16,padding:24,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.06)",textAlign:"center"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1A3A5C",marginBottom:16}}>Puntaje Total</div>
          <ScoreRing total={R.total} verd={R.verd}/>
          <p style={{fontSize:13,color:"#475569",marginTop:14,lineHeight:1.6,maxWidth:380,margin:"14px auto 0"}}>{R.verd.d}</p>
        </div>

        <div style={{background:"white",borderRadius:16,padding:24,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1A3A5C",marginBottom:12}}>Perfil por Área</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radar}>
              <PolarGrid stroke="#E2E8F0"/>
              <PolarAngleAxis dataKey="area" tick={{fontSize:12,fill:"#475569",fontWeight:600}}/>
              <PolarRadiusAxis domain={[0,10]} tick={false} axisLine={false}/>
              <Radar dataKey="score" stroke="#1A3A5C" fill="#1A3A5C" fillOpacity={0.15} strokeWidth={2} dot={{r:4,fill:"#1A3A5C",strokeWidth:0}}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <AreaCard icon="💰" title="Finanzas" score={R.f.sc} letter={R.f.lt} comment={R.f.cmt}/>
        <AreaCard icon="📣" title="Marketing" score={R.m.sc} letter={R.m.lt} comment={R.m.cmt}/>
        <AreaCard icon="💡" title="Innovación" score={R.inn.sc} letter={R.inn.lt} comment={R.inn.cmt}/>
        <AreaCard icon="⚙️" title="Operaciones" score={R.ops.sc} letter={R.ops.lt} comment={R.ops.cmt}/>

        <div style={{background:"white",borderRadius:16,padding:24,boxShadow:"0 4px 20px rgba(0,0,0,0.06)",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1A3A5C",marginBottom:14}}>💰 Resumen Financiero</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[["Ventas",cur(R.f.sales),"#1A3A5C"],["Gastos",cur(R.f.exps),"#E67E22"],["Utilidad",cur(R.f.net),R.f.net>=0?"#16A085":"#C0392B"],["Margen",fmtP(R.f.marg),R.f.net>=0?"#16A085":"#C0392B"],["Publicidad",cur(R.m.spend),"#7C3AED"],["% Ventas",fmtP(R.m.ps),"#7C3AED"]].map(([lbl,val,col])=>(
              <div key={lbl} style={{background:"#F8FAFC",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"#94A3B8",marginBottom:2,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{lbl}</div>
                <div style={{fontWeight:800,fontSize:14,color:col}}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <a href="/admin" style={{display:"flex",alignItems:"center",justifyContent:"center",background:"white",border:"2px solid #CBD5E1",color:"#475569",borderRadius:10,padding:"12px",fontWeight:700,fontSize:13,textDecoration:"none"}}>📊 Panel Admin</a>
          <button onClick={()=>{setStep(0);setD(INIT);savedRef.current=false;setEmailSent(false);}} style={{background:"white",border:"2px solid #1A3A5C",color:"#1A3A5C",borderRadius:10,padding:"12px",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 Nuevo Diagnóstico</button>
        </div>
      </div>
    </div>
  );
}
