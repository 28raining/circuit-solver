import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// //fixme - go back to strict mode
// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

createRoot(document.getElementById("root")).render(<App />);
