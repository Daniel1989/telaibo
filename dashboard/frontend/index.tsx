/** @jsxImportSource https://esm.sh/react@18.2.0 */
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { App } from "./components/App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

const root = createRoot(rootElement);
root.render(<App />);