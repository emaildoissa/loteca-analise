import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, Target, Trash2, ShieldCheck, Save, Loader2 } from 'lucide-react';

export default function CacaZebras() {
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [carteiraAtual, setCarteiraAtual] = useState<any[]>([]);
  const [lucroTotal, setLucroTotal] = useState<number>(0);
  const [concursoAtual, setConcursoAtual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const VALOR_APOSTA = 10; 

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    // 1. Busca todos os concursos (Histórico Oficial)
    const { data: todosConcursos } = await supabase.from('historico_loteca').select('*').order('concurso', { ascending: false });
    // 2. Busca todas as suas apostas Zebra salvas (Nuvem)
    const { data: minhasApostas } = await supabase.from('meus_palpites').select('*').eq('tipo', 'zebra');

    if (todosConcursos && todosConcursos.length > 0) {
        const atual = todosConcursos[0]; 
        setConcursoAtual(atual);
        filtrarMelhoresOportunidades(atual.jogos);
        
        // Carrega carteira da semana (se existir no banco)
        const carteiraSalva = minhasApostas?.find(p => p.concurso === atual.concurso);
        if (carteiraSalva) setCarteiraAtual(carteiraSalva.dados);

        // CALCULA LUCRO TOTAL (VITALÍCIO)
        if (minhasApostas) {
            let soma = 0;
            minhasApostas.forEach(betRow => {
                const concursoRef = todosConcursos.find(c => c.concurso === betRow.concurso);
                if (concursoRef) {
                    betRow.dados.forEach((bet: any) => {
                        const jogoReal = concursoRef.jogos[bet.jogoIndex];
                        if (jogoReal?.r) {
                            if (jogoReal.r === bet.tipo) soma += ((VALOR_APOSTA * bet.odd) - VALOR_APOSTA);
                            else soma -= VALOR_APOSTA;
                        }
                    });
                }
            });
            setLucroTotal(soma);
        }
    }
    setLoading(false);
  }

  const filtrarMelhoresOportunidades = (jogos: any[]) => {
    const lista: any[] = [];
    jogos.forEach((jogo: any, index: number) => {
        const calcOdd = (prob: number) => prob > 0 ? ((100 / prob) * 0.9).toFixed(2) : "0.00";
        const analisar = (tipo: string, prob: number, time: string) => {
            const odd = parseFloat(calcOdd(prob));
            if (odd >= 2.20 && odd <= 4.50 && prob >= 25) {
                let qualidade = 'BOA';
                if (prob >= 35) qualidade = 'OURO';
                lista.push({ id: `${index}-${tipo}`, jogoIndex: index, partida: `${jogo.m} x ${jogo.v}`, time: time, tipo: tipo, odd: odd, prob: prob, qualidade: qualidade });
            }
        };
        analisar('1', jogo.probM || 33, jogo.m);
        analisar('X', jogo.probX || 33, 'EMPATE');
        analisar('2', jogo.probV || 33, jogo.v);
    });
    setOportunidades(lista.sort((a, b) => b.prob - a.prob).slice(0, 5));
  };

  // --- FUNÇÕES DE SALVAR NA NUVEM ---
  const atualizarNuvem = async (novaCarteira: any[]) => {
      if (!concursoAtual) return;
      setSaving(true);
      
      const { error } = await supabase.from('meus_palpites').upsert({
          concurso: concursoAtual.concurso,
          tipo: 'zebra',
          dados: novaCarteira
      }, { onConflict: 'concurso, tipo' });

      setSaving(false);
      if (error) alert("Erro ao salvar: " + error.message);
  };

  const apostar = (item: any) => {
      if (carteiraAtual.some(a => a.id === item.id)) return;
      const nova = [...carteiraAtual, item];
      setCarteiraAtual(nova);
      atualizarNuvem(nova); // Salva automático
  };

  const remover = (id: string) => {
      const nova = carteiraAtual.filter(a => a.id !== id);
      setCarteiraAtual(nova);
      atualizarNuvem(nova); // Salva automático
  };

  if (loading) return <div className="p-10 text-center">Carregando carteira da nuvem...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg border border-gray-700 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2 text-yellow-400"><TrendingUp size={20}/> LUCRO VITALÍCIO</h1>
                <p className="text-gray-400 text-xs mt-1">Soma de todos os concursos na nuvem</p>
            </div>
            <div className={`text-3xl font-black ${lucroTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{lucroTotal >= 0 ? '+' : ''}R$ {lucroTotal.toFixed(2)}</div>
          </div>
          <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg border border-blue-700 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2 text-blue-300"><Target size={20}/> CONCURSO #{concursoAtual?.concurso}</h1>
                <p className="text-blue-200 text-xs mt-1">{saving ? 'Salvando na nuvem...' : 'Apostas sincronizadas'}</p>
            </div>
            {saving ? <Loader2 className="animate-spin"/> : <div className="text-3xl font-black">{carteiraAtual.length}</div>}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* OPORTUNIDADES */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-700">Sugestões Sniper</h2>
            {oportunidades.map((op, i) => {
                const jaNaCarteira = carteiraAtual.some(a => a.id === op.id);
                return (
                <div key={i} className={`p-4 rounded-xl border ${jaNaCarteira ? 'bg-gray-50 opacity-50' : 'bg-white border-l-4 border-l-green-500'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">{op.partida}</div>
                            <div className="text-lg font-black text-gray-800">{op.time}</div>
                            <div className="text-xs text-green-700 font-bold">Odd {op.odd}</div>
                        </div>
                        <button onClick={() => apostar(op)} disabled={jaNaCarteira || saving} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-xs disabled:bg-gray-300">
                            {jaNaCarteira ? 'Salvo' : 'Pegar'}
                        </button>
                    </div>
                </div>
            )})}
          </div>

          {/* MINHA CARTEIRA */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
             <h2 className="text-lg font-bold text-slate-700 mb-4 flex gap-2"><DollarSign/> Carteira (Salva na Nuvem)</h2>
             {carteiraAtual.length === 0 && <p className="text-gray-400 text-center text-sm">Nenhuma aposta.</p>}
             <div className="space-y-3">
                {carteiraAtual.map((bet, i) => (
                    <div key={i} className="bg-white p-3 rounded shadow-sm border flex justify-between items-center">
                        <div>
                            <div className="text-xs text-gray-400 font-bold">{bet.partida}</div>
                            <div className="font-bold text-slate-800">{bet.time}</div>
                            <div className="text-xs font-mono text-slate-500">Odd {bet.odd}</div>
                        </div>
                        <button onClick={() => remover(bet.id)} disabled={saving} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                    </div>
                ))}
             </div>
          </div>
      </div>
    </div>
  );
}
