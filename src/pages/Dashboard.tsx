import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Target, BrainCircuit, BarChart3, Wallet, CloudOff } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [historicoUser, setHistoricoUser] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>({ q1: 0, qX: 0, q2: 0 });
  const [lucroZebra, setLucroZebra] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosDaNuvem();
  }, []);

  async function carregarDadosDaNuvem() {
    try {
        // 1. Busca Resultados Oficiais (Gabarito)
        const { data: oficial } = await supabase.from('historico_loteca').select('*').order('concurso', { ascending: false });
        
        // 2. Busca SEUS JOGOS SALVOS NA NUVEM (A correção vital)
        const { data: meusJogos } = await supabase.from('meus_palpites').select('*');

        if (!oficial || !meusJogos) {
            setLoading(false);
            return;
        }

        let g1 = 0, gX = 0, g2 = 0; // Estatísticas globais
        let totalAcertos = 0;
        let jogosDisputados = 0;
        let somaZebras = 0;
        const userHistory: any[] = [];

        // CRUZA OS DADOS: OFICIAL vs SEUS JOGOS
        oficial.forEach(conc => {
            // Soma estatísticas da banca
            g1 += conc.qtd_1; gX += conc.qtd_x; g2 += conc.qtd_2;

            // --- ANÁLISE LOTECA (14 PONTOS) ---
            // Procura se você salvou este concurso na nuvem
            const meuPalpiteLoteca = meusJogos.find(p => p.concurso === conc.concurso && p.tipo === 'loteca');

            if (meuPalpiteLoteca && (conc.qtd_1 > 0 || conc.qtd_x > 0)) {
                // Se tem resultado oficial e você jogou
                const palpite = meuPalpiteLoteca.dados; // Array de 14 palpites
                let acertos = 0;
                conc.jogos.forEach((j: any, i: number) => {
                    if (j.r && j.r === palpite[i]) acertos++;
                });
                
                userHistory.push({ concurso: conc.concurso, acertos });
                totalAcertos += acertos;
                jogosDisputados++;
            }

            // --- ANÁLISE FINANCEIRA (ZEBRAS) ---
            const minhaCarteiraZebra = meusJogos.find(p => p.concurso === conc.concurso && p.tipo === 'zebra');
            
            if (minhaCarteiraZebra) {
                const bets = minhaCarteiraZebra.dados; // Array de apostas
                bets.forEach((bet: any) => {
                    const jogoReal = conc.jogos[bet.jogoIndex];
                    if (jogoReal?.r) {
                        // Se o jogo já aconteceu, calcula lucro/prejuízo
                        // Considerando aposta fixa de R$ 10 (ou o valor que salvou)
                        const valorAposta = 10; 
                        if (jogoReal.r === bet.tipo) {
                            somaZebras += ((valorAposta * bet.odd) - valorAposta);
                        } else {
                            somaZebras -= valorAposta;
                        }
                    }
                });
            }
        });

        // Atualiza Estados
        setGlobalStats({ q1: g1, qX: gX, q2: g2 });
        setLucroZebra(somaZebras);
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

  // Configuração dos Gráficos
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

  if (loading) return <div className="p-10 text-center animate-pulse">Buscando histórico na nuvem...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-loteca-green"/> Visão Geral (Nuvem)
            </h1>
            <p className="text-gray-500">Seu histórico oficial salvo no banco de dados.</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Sua Média</p>
                  <h2 className="text-3xl font-black text-blue-600">{stats.media} <span className="text-sm text-gray-400 font-normal">/ 14</span></h2>
              </div>
              <div className="bg-blue-50 p-3 rounded-full text-blue-500"><Target size={24}/></div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Lucro Zebras (Total)</p>
                  <h2 className={`text-3xl font-black ${lucroZebra >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {lucroZebra >= 0 ? '+' : ''}R$ {lucroZebra.toFixed(2)}
                  </h2>
              </div>
              <div className={`${lucroZebra >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'} p-3 rounded-full`}><Wallet size={24}/></div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Histórico Salvo</p>
                  <h2 className="text-3xl font-black text-purple-600">{historicoUser.length}</h2>
              </div>
              <div className="bg-purple-50 p-3 rounded-full text-purple-500"><BrainCircuit size={24}/></div>
          </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">Sua Evolução</h3>
              {historicoUser.length > 0 ? (
                  <div className="h-64"><Bar data={dataBar} options={{ maintainAspectRatio: false, scales: { y: { min: 0, max: 14 } } }} /></div>
              ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed rounded-lg">
                      <CloudOff size={32} className="mb-2 opacity-50"/>
                      <p>Nenhum jogo encontrado na Nuvem.</p>
                      <p className="text-xs">Certifique-se de clicar em "Salvar na Nuvem" nas abas Palpites e Zebras.</p>
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
