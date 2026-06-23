import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

const cur = n => Number(n||0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
const fmtP = n => `${(n*100).toFixed(1)}%`;
const LC = {A:"#16A085",R:"#E67E22",B:"#C0392B"};
const LL = {A:"Aceptable",R:"Regular",B:"Bajo"};
const VC = {"Aceptable":"#27AE60","Aceptable a Regular":"#2980B9","Regular":"#F39C12","Regular a Bajo":"#E67E22","Muy Bajo":"#C0392B"};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const d = req.body;
  if (!d.to) return res.status(400).json({error:"Email requerido"});

  const date = new Date().toLocaleDateString("es-MX",{year:"numeric",month:"long",day:"numeric"});
  const actLabel = {industrial:"Industrial",commercial:"Comercial",service:"Servicios"}[d.activityType]||"";
  const vColor = VC[d.verdict] || "#64748B";

  const areas = [
    {icon:"💰",title:"Finanzas",sc:d.financeScore,lt:d.financeLetter,cmt:d.financeComment},
    {icon:"📣",title:"Marketing",sc:d.marketingScore,lt:d.marketingLetter,cmt:d.marketingComment},
    {icon:"💡",title:"Innovación",sc:d.innovationScore,lt:d.innovationLetter,cmt:d.innovationComment},
    {icon:"⚙️",title:"Operaciones",sc:d.operationsScore,lt:d.operationsLetter,cmt:d.operationsComment},
  ];

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#2C3E50;background:#F8FAFC}
.card{background:white;border-radius:12px;padding:20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.header{background:#1A3A5C;color:white;border-radius:12px;padding:22px 24px;margin-bottom:14px}
.header h1{font-size:20px;font-weight:800;margin:0 0 4px}
.header p{margin:0;opacity:.65;font-size:12px}
.total-num{font-size:48px;font-weight:900;color:${vColor};line-height:1}
.verdict{font-size:17px;font-weight:800;color:${vColor};margin-top:6px}
.badge{color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;display:inline-block}
.bar-bg{height:5px;background:#E2E8F0;border-radius:3px;margin:6px 0 8px}
.bar-fg{height:5px;border-radius:3px}
.fin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.fin-cell{background:#F8FAFC;border-radius:8px;padding:10px}
.fin-lbl{font-size:9px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.fin-val{font-size:14px;font-weight:800;margin-top:2px}
.footer{text-align:center;color:#94A3B8;font-size:10px;margin-top:16px;padding-top:14px;border-top:1px solid #E2E8F0}
</style></head><body>
<div class="header">
  <h1>${d.businessName||"Mi Negocio"}</h1>
  <p>${[d.city,actLabel,date].filter(Boolean).join(" · ")}</p>
</div>
<div class="card" style="text-align:center">
  <div class="total-num">${Number(d.totalScore).toFixed(1)}<span style="font-size:16px;color:#94A3B8"> / 40</span></div>
  <div class="verdict">${d.verdict}</div>
  <p style="font-size:12px;color:#475569;margin-top:8px;line-height:1.5">${d.verdictDesc||""}</p>
</div>
<div class="card">
  <h3 style="font-size:14px;color:#1A3A5C;margin-bottom:12px">Resultados por Área</h3>
  ${areas.map(a=>`
  <div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <strong style="font-size:13px;color:#1A3A5C">${a.icon} ${a.title}</strong>
      <span><strong style="color:${LC[a.lt]};font-size:16px">${Number(a.sc).toFixed(1)}/10</strong>
        <span class="badge" style="background:${LC[a.lt]};margin-left:6px">${LL[a.lt]}</span></span>
    </div>
    <div class="bar-bg"><div class="bar-fg" style="width:${(a.sc/10)*100}%;background:${LC[a.lt]}"></div></div>
    <p style="font-size:11px;color:#475569;line-height:1.45;margin:0">${a.cmt||""}</p>
  </div>`).join("")}
</div>
<div class="card">
  <h3 style="font-size:14px;color:#1A3A5C;margin-bottom:4px">Resumen Financiero</h3>
  <div class="fin-grid">
    ${[["Ventas",cur(d.sales),"#1A3A5C"],["Gastos",cur(d.sales-(d.netProfit||0)),"#E67E22"],["Utilidad",cur(d.netProfit),Number(d.netProfit)>=0?"#16A085":"#C0392B"],["Margen",fmtP(d.margin||0),Number(d.netProfit)>=0?"#16A085":"#C0392B"],["Publicidad",cur(d.marketingSpend),"#7C3AED"],["% Ventas",fmtP(d.marketingPctSales||0),"#7C3AED"]].map(([l,v,c])=>`
    <div class="fin-cell"><div class="fin-lbl">${l}</div><div class="fin-val" style="color:${c}">${v}</div></div>`).join("")}
  </div>
</div>
<div class="footer">Diagnóstico de Salud Financiera para Emprendedores · ${date}</div>
</body></html>`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Diagnóstico Financiero <onboarding@resend.dev>",
      to: [d.to],
      subject: `Tu Diagnóstico Financiero — ${d.businessName||"Mi Negocio"}`,
      html,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: "Error al enviar el correo" });
  }
}
