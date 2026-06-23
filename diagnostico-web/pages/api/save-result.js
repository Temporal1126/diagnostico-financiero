import { supabaseAdmin } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const db = supabaseAdmin();
    const b = req.body;
    const { error } = await db.from("diagnosticos").insert([{
      business_name:    b.businessName || "",
      city:             b.city || "",
      email:            b.email || "",
      rfc:              b.rfc || "",
      activity_type:    b.activityType || "",
      finance_score:    b.financeScore,
      marketing_score:  b.marketingScore,
      innovation_score: b.innovationScore,
      operations_score: b.operationsScore,
      total_score:      b.totalScore,
      verdict:          b.verdict,
      finance_letter:   b.financeLetter,
      marketing_letter: b.marketingLetter,
      innovation_letter:b.innovationLetter,
      operations_letter:b.operationsLetter,
      sales:            b.sales,
      net_profit:       b.netProfit,
      margin:           b.margin,
      marketing_spend:  b.marketingSpend,
      is_innovating:    b.isInnovating,
      raw_data:         b,
    }]);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Error al guardar" });
  }
}
