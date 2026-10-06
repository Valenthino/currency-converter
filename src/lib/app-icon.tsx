export function AppIconGlyph({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1c1c1e",
        borderRadius: size * 0.22,
      }}
    >
      <span
        style={{
          fontSize: size * 0.58,
          color: "#ff9f0a",
          fontFamily: "sans-serif",
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        ¤
      </span>
    </div>
  );
}
