import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "../css/style.css";
import "../css/responsive.css";
import "../css/print.css";

class AppErrorBoundary extends Component {
  state = { error: null };

  componentDidMount() {
    document.getElementById("root")?.setAttribute("data-app-ready", "true");
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Mini Market POS failed to render", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-error" role="alert">
          <h1>The app could not be displayed</h1>
          <p>{this.state.error.message || "An unexpected error occurred."}</p>
          <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
