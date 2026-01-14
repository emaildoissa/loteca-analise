import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Target, BrainCircuit, BarChart3, Wallet, CloudOff, Zap } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [historicoUser, setHistoricoUser] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>({ q1: 0, qX: 0, q2: 0 });
  
  // Estados Financeiros
  const [lucroZebra, setLucroZebra] = useState(0);
  const [lucroExtras, setLucroExtras] = useState(0); // <--- Novo Estado para Ambas Marcam
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosDaNuvem();
  }, []);

  async function carregarDadosDaNuvem() {
    try {
        // 1. Busca Resultados Oficiais (Gabarito da Loteca)
        const { data: oficial } = await supabase.from('historico_loteca').select('*').order('concurso', { ascending: false });
        
        // 2. Busca SEUS JOGOS SALVOS NA NUVEM
        const { data: meusJogos } = await supabase.from('meus_palpites').select('*');

        if (!oficial || !meusJogos) {
            setLoading(false);
            return;
        }

        let g1 = 0, gX = 0, g2 = 0;
        let totalAcertos = 0;
        let jogosDisputados = 0;
        let somaZebras = 0;
        let somaExtras = 0; // <--- Variável para somar o lucro da nova aba
        const userHistory: any[] = [];

        // --- CÁLCULO 1: LOTECA E ZEBRAS (Dependem dos Concursos Oficiais) ---
        oficial.forEach(conc => {
            g1 += conc.qtd_1; gX += conc.qtd_x; g2 += conc.qtd_2;

            // Loteca 14 Pontos
            const meuPalpiteLoteca = meusJogos.find(p => p.concurso === conc.concurso && p.tipo === 'loteca');
            if (meuPalpiteLoteca && (conc.qtd_1 > 0 || conc.qtd_x > 0)) {
                const palpite = meuPalpiteLoteca.dados;
                let acertos = 0;
                conc.jogos.forEach((j: any, i: number) => {
                    if (j.r && j.r === palpite[i]) acertos++;
                });
                userHistory.push({ concurso: conc.concurso, acertos });
                totalAcertos += acertos;
                jogosDisputados++;
            }

            // Zebras (Semanais)
            const carteiraZebra = meusJogos.find(p => p.concurso === conc.concurso && p.tipo === 'zebra');
            if (carteiraZebra) {
                carteiraZebra.dados.forEach((bet: any) => {
                    const jogoReal = conc.jogos[bet.jogoIndex];
                    if (jogoReal?.r) {
                        const valorAposta = 10; 
                        if (jogoReal.r === bet.tipo) somaZebras += ((valorAposta * bet.odd) - valorAposta);
                        else somaZebras -= valorAposta;
                    }
                });
            }
        });

        // --- CÁLCULO 2: AMBAS MARCAM / EXTRAS (Lista Contínua) ---
        // Procura o registro especial 'ambas_marcam' (que usa ID 9999 ou qualquer outro, filtramos pelo tipo)
        const apostasExtras = meusJogos.filter(p => p.tipo === 'ambas_marcam');
        
        apostasExtras.forEach(registro => {
            if (registro.dados && Array.isArray(registro.dados)) {
                registro.dados.forEach((bet: any) => {
                    // Soma o lucro que já foi calculado e salvo na página AmbasMarcam
                    somaExtras += (bet.lucro || 0);
                });
            }
        });

        // Atualiza Estados
        setGlobalStats({ q1: g1, qX: gX, q2: g2 });
        setLucroZebra(somaZebras);
        setLucroExtras(somaExtras); // <--- Atualiza o estado novo
        setHistoricoUser(userHistory);
        
        setStats({
            jogosDisputados,
            media: jogosDisputados > 0 ? (totalAcertos / jogosDisputados).toFixed(1) : 0,
            ultimo: userHistory.length > 0 ? userHistory[0].acertos : '-'
        });

    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
    } finally {
        setLoading(false);
    }
  }

  // Gráficos
  const dataBar = {
    labels: historicoUser.map(h => `#${h.concurso}`).reverse(),
    datasets: [{
      label: 'Seus Acertos',
      data: historicoUser.map(h => h.acertos).reverse(),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }]
  };

  const dataPie = {
    labels: ['Casa (1)', 'Empate (X)', 'Fora (2)'],
    datasets: [{
      data: [globalStats.q1, globalStats.qX, globalStats.q2],
      backgroundColor: ['#22c55e', '#94a3b8', '#eab308'],
      borderWidth: 0,
    }],
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Calculando finanças...</div>;

  // Cálculo do Saldo TOTAL (Zebras + Extras)
  const saldoGeral = lucroZebra + lucroExtras;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-loteca-green"/> Dashboard Financeiro
            </h1>
            <p className="text-gray-500">Acompanhamento unificado da Nuvem.</p>
        </div>
        
        {/* SALDO GERAL (Resumão) */}
        <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${saldoGeral >= 0 ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'}`}>
            <span className="text-xs font-bold uppercase">Banca Total</span>
            <span className="text-2xl font-black">{saldoGeral >= 0 ? '+' : ''}R$ {saldoGeral.toFixed(2)}</span>
        </div>
      </div>

      {/* KPI CARDS (AGORA SÃO 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Loteca Técnica */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Média (14 Pontos)</p>
                  <h2 className="text-3xl font-black text-blue-600">{stats.media}</h2>
              </div>
              <div className="bg-blue-50 p-3 rounded-full text-blue-500"><Target size={20}/></div>
          </div>

          {/* Card 2: Zebras (Semanal) */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Lucro Zebras</p>
                  <h2 className={`text-2xl font-black ${lucroZebra >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {lucroZebra >= 0 ? '+' : ''}{lucroZebra.toFixed(0)}
                  </h2>
              </div>
              <div className={`${lucroZebra >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'} p-3 rounded-full`}><Wallet size={20}/></div>
          </div>

          {/* Card 3: Apostas Rápidas (Ambas Marcam) - NOVO! */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-b-4 border-b-purple-500">
              <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Lucro Extras</p>
                  <h2 className={`text-2xl font-black ${lucroExtras >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                    {lucroExtras >= 0 ? '+' : ''}{lucroExtras.toFixed(0)}
                  </h2>
              </div>
              <div className="bg-purple-50 p-3 rounded-full text-purple-500"><Zap size={20}/></div>
          </div>

          {/* Card 4: Histórico */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Jogos Salvos</p>
                  <h2 className="text-3xl font-black text-gray-600">{historicoUser.length}</h2>
              </div>
              <div className="bg-gray-100 p-3 rounded-full text-gray-500"><BrainCircuit size={20}/></div>
          </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">Sua Evolução na Loteca</h3>
              {historicoUser.length > 0 ? (
                  <div className="h-64"><Bar data={dataBar} options={{ maintainAspectRatio: false, scales: { y: { min: 0, max: 14 } } }} /></div>
              ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed rounded-lg">
                      <CloudOff size={32} className="mb-2 opacity-50"/>
                      <p>Sem histórico de 14 pontos.</p>
                  </div>
              )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">Tendência da Banca</h3>
              <div className="h-48 flex justify-center"><Doughnut data={dataPie} /></div>
          </div>
      </div>
    </div>
  );
}