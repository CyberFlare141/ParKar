import { Outlet, useNavigate } from "react-router-dom";

export default function BackButtonLayout() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          zIndex: 1200,
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "0 16px",
          pointerEvents: "none",
          background: "rgba(11, 13, 16, 0.92)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          style={{
            pointerEvents: "auto",
            border: "1px solid rgba(45, 212, 191, 0.28)",
            background: "rgba(17, 20, 24, 0.96)",
            color: "#e2e8f0",
            borderRadius: "999px",
            padding: "8px 14px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 10px 24px -16px rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          Back
        </button>
      </div>

      <div
        style={{
          paddingTop: "64px",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
