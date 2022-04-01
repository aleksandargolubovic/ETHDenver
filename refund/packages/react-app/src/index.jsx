import React from "react";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import { BrowserRouter } from "react-router-dom";
import ReactDOM from "react-dom";
import App from "./App";
//import "./index.css";

import "./assets/scss/black-dashboard-react.scss";
import "./assets/demo/demo.css";
import "./assets/css/nucleo-icons.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import ThemeContextWrapper from "./components/ThemeWrapper";
import BackgroundColorWrapper from "./components/BackgroundColorWrapper";

//const subgraphUri = "http://localhost:8000/subgraphs/name/scaffold-eth/your-contract";

// const client = new ApolloClient({
//   uri: subgraphUri,
//   cache: new InMemoryCache(),
// });

ReactDOM.render(
    //<ThemeSwitcherProvider themeMap={themes} defaultTheme={prevTheme || "dark"}>
  <ThemeContextWrapper>
    <BackgroundColorWrapper>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BackgroundColorWrapper>
  </ThemeContextWrapper>,
    //</BackgroundColorWrapper></ThemeSwitcherProvider>,
  document.getElementById("root"),
);
