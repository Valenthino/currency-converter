import { getRates } from "@/lib/rates";

export async function GET() {
  const payload = await getRates();
  return Response.json(payload);
}
