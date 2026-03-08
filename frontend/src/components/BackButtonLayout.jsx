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
    <>
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 1200,
          border: "1px solid rgba(15, 23, 42, 0.2)",
          background: "rgba(255, 255, 255, 0.95)",
          color: "#0f172a",
          borderRadius: "999px",
          padding: "8px 14px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 10px 24px -16px rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(6px)",
        }}
      >
        Back
      </button>
      <Outlet />
    </>
  );
}
