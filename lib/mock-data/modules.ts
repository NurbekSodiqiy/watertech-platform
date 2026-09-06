export interface Module {
  id: string;
  topic: string;
  format: string;
  duration: string;
  test: string;
  level: "Boshlang'ich" | "O'rta" | "Ekspert";
}

export const modules: Module[] = [
  { id: "mod-1", topic: "[Joy egallovchi — Mahsulot asoslari]", format: "Video", duration: "18 daq", test: "Ha", level: "Boshlang'ich" },
  { id: "mod-2", topic: "[Joy egallovchi — Aniqlash savollari]", format: "Interaktiv", duration: "25 daq", test: "Ha", level: "Boshlang'ich" },
  { id: "mod-3", topic: "[Joy egallovchi — E'tirozlar bilan ishlash]", format: "Rolli o'yin", duration: "40 daq", test: "Ha", level: "O'rta" },
  { id: "mod-4", topic: "[Joy egallovchi — Texnik xususiyatlar]", format: "O'qish", duration: "30 daq", test: "Yo'q", level: "O'rta" },
  { id: "mod-5", topic: "[Joy egallovchi — Muzokara taktikasi]", format: "Video", duration: "22 daq", test: "Ha", level: "Ekspert" },
  { id: "mod-6", topic: "[Joy egallovchi — Tender jarayoni]", format: "O'qish", duration: "35 daq", test: "Ha", level: "Ekspert" },
];
