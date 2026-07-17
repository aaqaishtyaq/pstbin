import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon — same # mark as app/icon.svg */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111111",
        color: "#eeeeee",
        fontSize: 110,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontWeight: 700,
        letterSpacing: "-0.04em",
        borderRadius: 36,
      }}
    >
      #
    </div>,
    { ...size },
  );
}
