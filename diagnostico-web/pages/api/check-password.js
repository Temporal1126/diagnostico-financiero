export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body;
  res.status(200).json({ ok: password === process.env.ADMIN_PASSWORD });
}
