import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import CatSwiper from "./components/CatSwiper";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <CatSwiper />
    </>
  );
}

export default App;
