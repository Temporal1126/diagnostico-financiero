import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

const VDT_COLORS={"Aceptable":"#27AE60","Aceptable a Regular":"#2980B9","Regular":"#F39C12","Regular a Bajo":"#E67E22","Muy Bajo":"#C0392B"};
const AREA_COLORS=["#1A3A5C","#E67E22","#7C3AED","#16A085"];
const cur=n=>Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});

function exportToExcel(data){
  const rows=data.map(r=>({
    "Fecha":new Date(r.created_at).toLocaleDateString("es-MX"),
    "Negocio":r.business_name||"",
    "Ciudad":r.city||"",
    "Correo":r.email||"",
    "RFC":r.rfc||"",
    "Actividad":{industrial:"Industrial",commercial:"Comercial",service:"Servicios"}[r.activity_type]||r.activity_type||"",
    "Puntaje Total":r.total_score,
    "Dictamen":r.verdict,
    "Finanzas":r.finance_score,
    "Calif. Finanzas":r.finance_letter,
    "Marketing":r.marketing_score,
    "Calif. Marketing":r.marketing_letter,
    "Innovación":r.innovation_score,
    "Calif. Innovación":r.innovation_letter,
    "Operaciones":r.operations_score,
    "Calif. Operaciones":r.operations_letter,
    "Ventas":r.sales,
    "Utilidad Neta":r.net_profit,
    "Margen %":(r.margin*100).toFixed(1)+"%",
    "Gasto Publicidad":r.marketing_spend,
  }));
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,"Diagnósticos",ws);
  XLSX.writeFile(wb,`diagnosticos-${new Date().toISOString().slice(0,10)}.xlsx`);
}

export default function Admin(){
  const [authed,setAuthed]=useState(false);
  const [pw,setPw]=useState("");
  const [err,setErr]=useState("");
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");

  const login=async()=>{
    const r=await fetch("/api/check-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
    const j=await r.json();
    if(j.ok){setAuthed(true);loadData(pw);}
    else setErr("Contraseña incorrecta");
  };

  const loadData=async(p=pw)=>{
    setLoading(true);
    try{
      const r=await fetch("/api/admin-data",{headers:{"x-admin-password":p}});
      const j=await r.json();
      setData(Array.isArray(j)?j:[]);
    }catch{setData([]);}
    setLoading(false);
  };

  const filtered=useMemo(()=>{
    if(!search)return data;
    const q=search.toLowerCase();
    return data.filter(r=>(r.business_name||"").toLowerCase().includes(q)||(r.city||"").toLowerCase().includes(q)||(r.email||"").toLowerCase().includes(q));
  },[data,search]);

  const stats=useMemo(()=>{
    if(!data.length)return null;
    const avg=k=>data.reduce((s,d)=>s+(d[k]||0),0)/data.length;
    const verdicts={},acts={};
    data.forEach(r=>{
      verdicts[r.verdict]=(verdicts[r.verdict]||0)+1;
      const a={industrial:"Industrial",commercial:"Comercial",service:"Servicios"}[r.activity_type]||"Otro";
      acts[a]=(acts[a]||0)+1;
    });
    return{
      total:data.length,avgTotal:avg("total_score"),
      areaAvgs:[
        {name:"Finanzas",score:+avg("finance_score").toFixed(1)},
        {name:"Marketing",score:+avg("marketing_score").toFixed(1)},
        {name:"Innovación",score:+avg("innovation_score").toFixed(1)},
        {name:"Operaciones",score:+avg("operations_score").toFixed(1)},
      ],
      verdictData:Object.entries(verdicts).sort((a,b)=>b[1]-a[1]).map(([v,n])=>({name:v,count:n})),
      actData:Object.entries(acts).sort((a,b)=>b[1]-a[1]).map(([n,c])=>({name:n,count:c})),
    };
  },[data]);

  const base={minHeight:"100vh",background:"#F0F4F8",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",padding:"20px 16px"};

  if(!authed) return(
    <div style={{...base,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Head><title>Admin — Diagnóstico Financiero</title></Head>
      <div style={{background:"white",borderRadius:16,padding:32,maxWidth:360,width:"100%",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>🔐</div>
        <h1 style={{fontSize:20,fontWeight:800,color:"#1A3A5C",marginBottom:4}}>Panel de Administrador</h1>
        <p style={{fontSize:13,color:"#64748B",marginBottom:24}}>Ingresa la contraseña para acceder</p>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
          placeholder="Contraseña"
          style={{width:"100%",padding:"11px 14px",border:"1.5px solid #CBD5E1",borderRadius:8,fontSize:14,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
        {err&&<p style={{color:"#C0392B",fontSize:13,marginBottom:12}}>{err}</p>}
        <button onClick={login} style={{width:"100%",padding:"12px",background:"#1A3A5C",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:"pointer"}}>Entrar</button>
        <a href="/" style={{display:"block",marginTop:16,fontSize:12,color:"#94A3B8",textDecoration:"none"}}>← Volver al diagnóstico</a>
      </div>
    </div>
  );

  return(
    <div style={base}>
      <Head><title>Admin — Diagnóstico Financiero</title></Head>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:"#1A3A5C",margin:0}}>📊 Panel de Administrador</h1>
            <p style={{fontSize:13,color:"#64748B",margin:"4px 0 0"}}>Diagnósticos de Salud Financiera — Sí Financia</p>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>loadData()} style={{padding:"9px 16px",background:"white",border:"1.5px solid #CBD5E1",borderRadius:8,fontSize:13,fontWeight:600,color:"#475569",cursor:"pointer"}}>🔄 Actualizar</button>
            <button onClick={()=>exportToExcel(data)} disabled={!data.length} style={{padding:"9px 16px",background:"#16A085",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:data.length?"pointer":"not-allowed"}}>⬇️ Exportar Excel</button>
            <a href="/" style={{padding:"9px 16px",background:"white",border:"1.5px solid #CBD5E1",borderRadius:8,fontSize:13,fontWeight:600,color:"#475569",textDecoration:"none"}}>← Salir</a>
          </div>
        </div>

        {loading?(
          <div style={{textAlign:"center",padding:60,color:"#64748B"}}>⏳ Cargando datos...</div>
        ):!stats?(
          <div style={{background:"white",borderRadius:16,padding:40,textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{fontSize:40,marginBottom:12}}>📭</div>
            <p style={{color:"#64748B"}}>Aún no hay diagnósticos registrados.</p>
          </div>
        ):(<>
          {/* KPI cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {[["📊","Total",stats.total.toString(),"#1A3A5C"],["⭐","Prom. Total",`${stats.avgTotal.toFixed(1)}/40`,"#F39C12"],
              ["💪","Área Fuerte",[...stats.areaAvgs].sort((a,b)=>b.score-a.score)[0].name,"#16A085"],
              ["🎯","Área Débil",[...stats.areaAvgs].sort((a,b)=>a.score-b.score)[0].name,"#E67E22"]
            ].map(([icon,label,val,col])=>(
              <div key={label} style={{background:"white",borderRadius:12,padding:16,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:20,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:11,color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
                <div style={{fontWeight:800,fontSize:16,color:col,marginTop:2}}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            {/* Bar chart */}
            <div style={{background:"white",borderRadius:16,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#1A3A5C",marginBottom:14}}>Puntajes Promedio por Área</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.areaAvgs} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:"#475569"}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,10]} tick={{fontSize:10,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>[`${v}/10`,"Promedio"]} contentStyle={{borderRadius:8,fontSize:12}}/>
                  <Bar dataKey="score" radius={[6,6,0,0]}>
                    {stats.areaAvgs.map((_,i)=><Cell key={i} fill={AREA_COLORS[i]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Verdict dist */}
            <div style={{background:"white",borderRadius:16,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#1A3A5C",marginBottom:14}}>Distribución de Dictámenes</div>
              {stats.verdictData.map(({name,count})=>(
                <div key={name} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{fontWeight:600,color:"#374151"}}>{name}</span>
                    <span style={{color:"#94A3B8"}}>{count} ({Math.round(count/stats.total*100)}%)</span>
                  </div>
                  <div style={{height:7,background:"#F1F5F9",borderRadius:4,overflow:"hidden"}}>
                    <div style={{width:`${(count/stats.total)*100}%`,height:"100%",background:VDT_COLORS[name]||"#94A3B8",borderRadius:4}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{background:"white",borderRadius:16,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:700,fontSize:14,color:"#1A3A5C"}}>Todos los Diagnósticos ({filtered.length})</div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, ciudad o correo..."
                style={{padding:"7px 12px",border:"1.5px solid #CBD5E1",borderRadius:8,fontSize:13,outline:"none",width:260}}/>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:"2px solid #F1F5F9"}}>
                    {["Fecha","Negocio","Ciudad","Correo","Total","Dictamen","Fin","Mkt","Inn","Ops","Ventas"].map(h=>(
                      <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"#94A3B8",fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r=>(
                    <tr key={r.id} style={{borderBottom:"1px solid #F8FAFC"}}>
                      <td style={{padding:"8px",color:"#94A3B8",whiteSpace:"nowrap"}}>{new Date(r.created_at).toLocaleDateString("es-MX")}</td>
                      <td style={{padding:"8px",fontWeight:600,color:"#374151"}}>{r.business_name||"—"}</td>
                      <td style={{padding:"8px",color:"#64748B"}}>{r.city||"—"}</td>
                      <td style={{padding:"8px",color:"#64748B"}}>{r.email||"—"}</td>
                      <td style={{padding:"8px",fontWeight:800,color:VDT_COLORS[r.verdict]||"#64748B"}}>{Number(r.total_score).toFixed(1)}</td>
                      <td style={{padding:"8px"}}><span style={{background:(VDT_COLORS[r.verdict]||"#94A3B8")+"20",color:VDT_COLORS[r.verdict]||"#94A3B8",padding:"2px 7px",borderRadius:4,fontWeight:600,fontSize:10,whiteSpace:"nowrap"}}>{r.verdict}</span></td>
                      <td style={{padding:"8px",color:"#475569"}}>{Number(r.finance_score).toFixed(1)}</td>
                      <td style={{padding:"8px",color:"#475569"}}>{Number(r.marketing_score).toFixed(1)}</td>
                      <td style={{padding:"8px",color:"#475569"}}>{Number(r.innovation_score).toFixed(1)}</td>
                      <td style={{padding:"8px",color:"#475569"}}>{Number(r.operations_score).toFixed(1)}</td>
                      <td style={{padding:"8px",color:"#475569",whiteSpace:"nowrap"}}>{cur(r.sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:"#94A3B8",fontSize:13}}>No se encontraron resultados para "{search}"</div>}
            </div>
          </div>
        </>)}
      </div>
    </div>
  );
}
