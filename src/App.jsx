import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import ReturnConfirmation from "./ReturnConfirmation";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/return/:token" element={<ReturnConfirmation />} />
    </Routes>
  );
}

export default App;
