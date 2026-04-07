import "./demo.css";
import "./v-scroll.js";

const APP_EL = document.querySelector("#app"),
  ITEM_TOTAL = 100;

const createItem = (index) => `
  <p class="item">Welcome to vibe ${index}</p>
`;

const render = () => {
  const items = Array.from({ length: ITEM_TOTAL }, (_, index) => createItem(index)).join("");

  APP_EL.innerHTML = `
    <main class="page">
      <v-scroll class="demo-scroll">
        ${items}
      </v-scroll>
    </main>
  `;
};

render();
