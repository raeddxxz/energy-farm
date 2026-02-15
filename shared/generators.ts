/**
 * Dados dos 6 geradores de energia
 * Preços convertidos de USDT para RDX (taxa fixa 0.001 USDT = 1 RDX)
 * Ordenados do mais barato ao mais caro
 */

export interface Generator {
  id: string;
  name: string;
  nameKey: string;
  cost: number;
  totalProfit: number;
  lifespan: number;
  dailyProfit: number;
  icon: string;
}

export const GENERATORS: Generator[] = [
  {
    id: "catavento",
    name: "Catavento",
    nameKey: "generator.catavento",
    cost: 500,
    totalProfit: 625,
    lifespan: 30,
    dailyProfit: 20.8,
    icon: "🌪️",
  },
  {
    id: "placa_solar",
    name: "Placa Solar",
    nameKey: "generator.placaSolar",
    cost: 1000,
    totalProfit: 1500,
    lifespan: 35,
    dailyProfit: 42.9,
    icon: "☀️",
  },
  {
    id: "turbina_eolica",
    name: "Turbina Eólica",
    nameKey: "generator.turbinaEolica",
    cost: 5000,
    totalProfit: 8750,
    lifespan: 40,
    dailyProfit: 218.75,
    icon: "💨",
  },
  {
    id: "usina_solar",
    name: "Usina Solar",
    nameKey: "generator.usinaSolar",
    cost: 25000,
    totalProfit: 50000,
    lifespan: 50,
    dailyProfit: 1000,
    icon: "🔆",
  },
  {
    id: "hidreletrica",
    name: "Hidrelétrica",
    nameKey: "generator.hidreletrica",
    cost: 100000,
    totalProfit: 250000,
    lifespan: 60,
    dailyProfit: 4166.7,
    icon: "💧",
  },
  {
    id: "reator_nuclear",
    name: "Reator Nuclear",
    nameKey: "generator.reatorNuclear",
    cost: 1000000,
    totalProfit: 3000000,
    lifespan: 80,
    dailyProfit: 37500,
    icon: "⚛️",
  },
];

export function getGeneratorById(id: string): Generator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
