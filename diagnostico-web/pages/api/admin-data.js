import { supabaseAdmin } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (req.headers["x-admin-password"] !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: "No autorizado" });

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("diagnosticos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: "Error al obtener datos" });
  }
}
