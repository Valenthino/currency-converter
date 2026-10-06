import { ImageResponse } from "next/og";
import { AppIconGlyph } from "@/lib/app-icon";

const VALID_SIZES = [192, 512];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const dimension = VALID_SIZES.includes(Number(size)) ? Number(size) : 192;
  return new ImageResponse(<AppIconGlyph size={dimension} />, {
    width: dimension,
    height: dimension,
  });
}
