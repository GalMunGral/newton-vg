import { solve3 } from "./solver.js";

const a = Math.random() - 0.5;
const b = Math.random() - 0.5;
const c = Math.random() - 0.5;
const d = Math.random() - 0.5;

const ts = solve3(a, b, c, d);

console.log(`(${a})*t^3+(${b})*t^2+(${c})*t+(${d})=0`);
for (let t of ts) {
  console.log("sol=", t, a * t ** 3 + b * t ** 2 + c * t + d);
}
