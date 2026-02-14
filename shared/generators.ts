/**
 * Dados dos 6 geradores de energia
 * Ordenados do mais barato ao mais caro
 */

export interface Generator {
  id: string;
  name: string;
  nameKey: string; // chave de tradução
  cost: number;
  totalProfit: number;
  lifespan: number; // em dias
  dailyProfit: number;
  icon: string;
}

export const GENERATORS: Generator[] = [
  {
    id: "catavento",
    name: "Catavento",
    nameKey: "generator.catavento",
    cost: 0.5,
    totalProfit: 0.625,
    lifespan: 30,
    dailyProfit: 0.0208,
    icon: "🌪️",
  },
  {
    id: "placa_solar",
    name: "Placa Solar",
    nameKey: "generator.placaSolar",
    cost: 1,
    totalProfit: 1.5,
    lifespan: 35,
    dailyProfit: 0.0429,
    icon: "☀️",
  },
  {
    id: "turbina_eolica",
    name: "Turbina Eólica",
    nameKey: "generator.turbinaEolica",
    cost: 5,
    totalProfit: 8.75,
    lifespan: 40,
    dailyProfit: 0.21875,
    icon: "💨",
  },
  {
    id: "usina_solar",
    name: "Usina Solar",
    nameKey: "generator.usinaSolar",
    cost: 25,
    totalProfit: 50,
    lifespan: 50,
    dailyProfit: 1,
    icon: "🔆",
  },
  {
    id: "hidreletrica",
    name: "Hidrelétrica",
    nameKey: "generator.hidreletrica",
    cost: 100,
    totalProfit: 250,
    lifespan: 60,
    dailyProfit: 4.1667,
    icon: "💧",
  },
  {
    id: "reator_nuclear",
    name: "Reator Nuclear",
    nameKey: "generator.reatorNuclear",
    cost: 1000,
    totalProfit: 3000,
    lifespan: 80,
    dailyProfit: 37.5,
    icon: "⚛️",
  },
];

export function getGeneratorById(id: string): Generator | undefined {
  return GENERATORS.find((g) => g.id === id);
}
