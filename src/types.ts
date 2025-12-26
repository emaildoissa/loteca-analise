export interface Jogo {
  mandante: string;
  visitante: string;
  resultado?: '1' | 'X' | '2'; // Pode ser nulo se for o concurso atual
}

export interface Concurso {
  id?: number;
  concurso: number;
  data_apuracao: string;
  jogos: Jogo[];
  qtd_1: number;
  qtd_x: number;
  qtd_2: number;
  matriz?: string;
}

export interface MatrizStat {
  matriz: string;
  count: number;
  percent: number;
}