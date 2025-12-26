import { useState } from 'react';
import { Wand2 } from 'lucide-react';

// Dados mockados para simular o concurso atual (normalmente viria de uma API ou DB)
const JOGOS_ATUAIS = [
  { id: 1, m: "Corinthians", v: "Palmeiras", probM: 0.30, probX: 0.35, probV: 0.35 },
  { id: 2, m: "São Paulo", v: "Flamengo", probM: 0.40, probX: 0.30, probV: 0.30 },
  { id: 3, m: "Cruzeiro", v: "Atlético-MG", probM: 0.33, probX: 0.34, probV: 0.33 },
  { id: 4, m: "Botafogo", v: "Fluminense", probM: 0.45, probX: 0.25, probV: 0.30 },
  { id: 5, m: "Grêmio", v: "Internacional", probM: 0.35, probX: 0.35, probV: 0.30 },
  { id: 6, m: "Vasco", v: "Bahia", probM: 0.50, probX: 0.30, probV: 0.20 },
  { id: 7, m: "Fortaleza", v: "Ceará", probM: 0.60, probX: 0.25, probV: 0.15 },
  { id: 8, m: "Athletico-PR", v: "Coritiba", probM: 0.55, probX: 0.30, probV: 0.15 },
  { id: 9, m: "Sport", v: "Náutico", probM: 0.45, probX: 0.30, probV: 0.25 },
  { id: 10, m: "Goiás", v: "Vila Nova", probM: 0.40, probX: 0.40, probV: 0.20 },
  { id: 11, m: "Vitória", v: "ABC", probM: 0.70, probX: 0.20, probV: 0.10 },
  { id: 12, m: "Ponte Preta", v: "Guarani", probM: 0.33, probX: 0.34, probV: 0.33 },
  { id: 13, m: "Avaí", v: "Figueirense", probM: 0.40, probX: 0.30, probV: 0.30 },
  { id: 14, m: "Criciúma", v: "Chapecoense", probM: 0.50, probX: 0.30, probV: 0.20 },
];

export default function Analise() {
  const [palpite, setPalpite] = useState<(string|null)[]>(Array(14).fill(null));
  const [selectedMatrix, setSelectedMatrix] = useState("7-4-3");

  const gerarPalpite = () => {
    // Parser da matriz desejada (ex: 7-4-3)
    const [target1, targetX, target2] = selectedMatrix.split('-').map(Number);
    let counts = { '1': 0, 'X': 0, '2': 0 };
    let newPalpite = Array(14).fill(null);

    // Algoritmo guloso simples para preencher baseado em probabilidade "imaginária"
    // 1. Clonar jogos e ordenar por "clareza" (maior probabilidade de um resultado)
    let jogosOrdenados = JOGOS_ATUAIS.map((j, idx) => ({...j, idx})).sort((a, b) => {
        const maxA = Math.max(a.probM, a.probX, a.probV);
        const maxB = Math.max(b.probM, b.probX, b.probV);
        return maxB - maxA; // Jogos mais "óbvios" primeiro
    });

    // 2. Preencher tentando respeitar a matriz
    jogosOrdenados.forEach(jogo => {
        const probs = [
            { r: '1', p: jogo.probM, can: counts['1'] < target1 },
            { r: 'X', p: jogo.probX, can: counts['X'] < targetX },
            { r: '2', p: jogo.probV, can: counts['2'] < target2 }
        ].sort((a, b) => b.p - a.p); // Tenta o mais provável primeiro

        for (let op of probs) {
            if (op.can) {
                newPalpite[jogo.idx] = op.r;
                counts[op.r as '1'|'X'|'2']++;
                break;
            }
        }
    });

    // 3. Fallback: Se sobrar buracos (caso a matriz seja impossível ou bug), preencher com o mais provável
    for(let i=0; i<14; i++) {
        if(!newPalpite[i]) newPalpite[i] = '1'; 
    }

    setPalpite(newPalpite);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gerador de Palpites (Concurso 1226)</h1>
          <p className="text-gray-500">Estimativa baseada em probabilidades e padrão matricial.</p>
        </div>
        <button 
          onClick={gerarPalpite}
          className="bg-loteca-green hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow flex items-center gap-2 transition"
        >
          <Wand2 size={20} />
          Gerar Palpite IA
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-3">Matriz Alvo:</label>
        <select 
          value={selectedMatrix} 
          onChange={(e) => setSelectedMatrix(e.target.value)}
          className="bg-gray-100 dark:bg-zinc-900 border-none rounded p-2 text-sm font-mono"
        >
          <option value="7-4-3">7-4-3 (Padrão Ouro)</option>
          <option value="6-4-4">6-4-4 (Equilibrada)</option>
          <option value="5-5-4">5-5-4 (Muitos Empates)</option>
          <option value="8-3-3">8-3-3 (Favoritos Casa)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {JOGOS_ATUAIS.map((jogo, i) => (
          <div key={jogo.id} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
             {/* Indicador de Palpite */}
             {palpite[i] && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${palpite[i] === '1' ? 'bg-loteca-green' : palpite[i] === 'X' ? 'bg-gray-400' : 'bg-loteca-yellow'}`}></div>
             )}

             <div className="flex-1 text-right pr-4">
                <span className="font-bold text-gray-800 dark:text-gray-200">{jogo.m}</span>
                <div className="text-xs text-gray-400">Mandante</div>
             </div>
             
             <div className="flex flex-col items-center px-2">
                <span className="text-xs text-gray-300 font-mono mb-1">Jogo {i + 1}</span>
                <div className="flex gap-1">
                    <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${palpite[i] === '1' ? 'bg-loteca-green text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400'}`}>1</div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${palpite[i] === 'X' ? 'bg-gray-500 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400'}`}>X</div>
                    <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm ${palpite[i] === '2' ? 'bg-loteca-yellow text-black shadow-md scale-110' : 'bg-gray-100 text-gray-400'}`}>2</div>
                </div>
             </div>

             <div className="flex-1 text-left pl-4">
                <span className="font-bold text-gray-800 dark:text-gray-200">{jogo.v}</span>
                <div className="text-xs text-gray-400">Visitante</div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}