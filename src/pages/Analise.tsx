import { Wand2, Loader2, Save, Trash2, Lock, Cloud } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Analise() {
  const [jogos, setJogos] = useState<any[]>([]);
  const [concurso, setConcurso] = useState<any>(null);
  const [selectedMatrix, setSelectedMatrix] = useState('7-4-3');
  const [palpite, setPalpite] = useState<string[]>(Array(14).fill(null));
  
  // Estado de controle
  const [jogoSalvo, setJogoSalvo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [acertos, setAcertos] = useState<number | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    // 1. Pega o concurso mais recente
    const { data: dadosConcurso } = await supabase.from('historico_loteca').select('*').order('concurso', { ascending: false }).limit(1).single();
    
    if (dadosConcurso) {
        setConcurso(dadosConcurso);
        setJogos(dadosConcurso.jogos || []);
        
        // 2. BUSCA NO BANCO SE JÁ TEM PALPITE SALVO (Nuvem)
        const { data: palpiteSalvo } = await supabase
            .from('meus_palpites')
            .select('*')
            .eq('concurso', dadosConcurso.concurso)
            .eq('tipo', 'loteca')
            .single();

        if (palpiteSalvo) {
            setPalpite(palpiteSalvo.dados);
            setJogoSalvo(true);
            
            // Calcula acertos se já tiver resultado
            if (dadosConcurso.qtd_1 > 0 || dadosConcurso.qtd_x > 0) {
                calcularAcertos(dadosConcurso.jogos, palpiteSalvo.dados);
            }
        }
    }
    setLoading(false);
  }

  const calcularAcertos = (jogosOficiais: any[], meuPalpite: string[]) => {
    let count = 0;
    jogosOficiais.forEach((j, i) => {
        if (j.r && j.r === meuPalpite[i]) count++;
    });
    setAcertos(count);
  };

  const gerarPalpiteIA = () => {
    if (jogoSalvo && !confirm("Você já tem um jogo salvo na nuvem. Quer apagar e gerar outro?")) return;

    const novo = Array(14).fill(null);
    const [meta1, metaX, meta2] = selectedMatrix.split('-').map(Number);
    let count = { '1': 0, 'X': 0, '2': 0 };

    const jogosOrdenados = jogos.map((j, index) => {
        const p1 = j.probM || 33;
        const pX = j.probX || 33;
        const p2 = j.probV || 33;
        const maxProb = Math.max(p1, pX, p2);
        
        let ideal = '1';
        if (pX === maxProb) ideal = 'X';
        if (p2 === maxProb) ideal = '2';
        
        return { index, maxProb, ideal };
    }).sort((a, b) => b.maxProb - a.maxProb);

    jogosOrdenados.forEach(item => {
        const { index, ideal } = item;
        if (ideal === '1' && count['1'] < meta1) { novo[index] = '1'; count['1']++; }
        else if (ideal === 'X' && count['X'] < metaX) { novo[index] = 'X'; count['X']++; }
        else if (ideal === '2' && count['2'] < meta2) { novo[index] = '2'; count['2']++; }
        else {
            if (count['1'] < meta1) { novo[index] = '1'; count['1']++; }
            else if (count['X'] < metaX) { novo[index] = 'X'; count['X']++; }
            else { novo[index] = '2'; count['2']++; }
        }
    });

    setPalpite(novo);
    setJogoSalvo(false);
    setAcertos(null);
  };

  const salvarNaNuvem = async () => {
    if (!concurso) return;
    setSaving(true);

    // SALVA NO SUPABASE (Upsert = Cria ou Atualiza)
    const payload = {
        concurso: concurso.concurso,
        tipo: 'loteca',
        dados: palpite
    };

    const { error } = await supabase
        .from('meus_palpites')
        .upsert(payload, { onConflict: 'concurso, tipo' });

    setSaving(false);

    if (error) {
        alert('Erro ao salvar na nuvem: ' + error.message);
    } else {
        setJogoSalvo(true);
        alert(`☁️ Jogo do Concurso ${concurso.concurso} SINCRONIZADO com sucesso!`);
    }
  };

  const limparPalpite = async () => {
    if (confirm("Apagar palpite da nuvem? Isso removerá do celular também.")) {
        setSaving(true);
        // Remove do banco
        await supabase.from('meus_palpites').delete().eq('concurso', concurso.concurso).eq('tipo', 'loteca');
        
        setPalpite(Array(14).fill(null));
        setJogoSalvo(false);
        setSaving(false);
    }
  };

  const handleManualClick = (i: number, op: string) => {
      if (jogoSalvo) return;
      const novo = [...palpite];
      novo[i] = op;
      setPalpite(novo);
  }

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Sincronizando com a nuvem...</div>;
  if (!concurso) return <div className="p-10 text-center">Nenhum concurso aberto. Importe um CSV no Histórico.</div>;

  const isFinalizado = concurso.qtd_1 > 0 || concurso.qtd_x > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold">Concurso #{concurso.concurso}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1">
                {jogoSalvo ? <span className="text-green-600 flex items-center gap-1"><Cloud size={14}/> Salvo na Nuvem</span> : 'Editando Localmente'}
            </p>
        </div>
        
        {acertos !== null && (
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-center animate-bounce">
                <div className="text-xs font-bold opacity-80">RESULTADO</div>
                <div className="text-xl font-black">{acertos} PONTOS</div>
            </div>
        )}
      </div>

      {/* Controles */}
      {!isFinalizado && (
          <div className="bg-white p-4 rounded-xl shadow border flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-20">
             <div className="flex items-center gap-2">
                 <span className="font-bold text-gray-700">IA:</span>
                 <select 
                    value={selectedMatrix} 
                    onChange={e => setSelectedMatrix(e.target.value)} 
                    disabled={jogoSalvo}
                    className="bg-gray-100 p-2 rounded border"
                 >
                    <option value="7-4-3">Padrão (7-4-3)</option>
                    <option value="5-5-4">Zebra (5-5-4)</option>
                 </select>
             </div>

             <div className="flex gap-2">
                 {!jogoSalvo ? (
                    <button onClick={gerarPalpiteIA} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 flex items-center gap-2">
                        <Wand2 size={18}/> Gerar Palpite
                    </button>
                 ) : (
                    <button onClick={limparPalpite} className="bg-red-100 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-200 flex items-center gap-2">
                        <Trash2 size={18}/> {saving ? 'Apagando...' : 'Apagar da Nuvem'}
                    </button>
                 )}
             </div>
          </div>
      )}

      {/* Lista de Jogos */}
      <div className="space-y-2">
        {jogos.map((j: any, i: number) => {
            const probM = j.probM || 0;
            const oficial = j.r;
            const meu = palpite[i];
            const acertou = oficial && meu === oficial;
            const errou = oficial && meu !== oficial;

            return (
            <div key={i} className={`bg-white p-3 rounded border flex items-center justify-between relative overflow-hidden ${acertou ? 'ring-2 ring-green-500 bg-green-50' : errou ? 'ring-2 ring-red-200 bg-red-50' : ''}`}>
                {probM > 0 && (
                    <div className="absolute bottom-0 left-0 h-1 bg-green-500 opacity-20" style={{width: `${probM}%`}}></div>
                )}

                <div className="w-1/3 text-right font-bold text-sm truncate">{j.m}</div>
                
                <div className="flex gap-1 mx-2 z-10">
                    {['1','X','2'].map(Op => {
                        const selecionado = meu === Op;
                        const ehOficial = oficial === Op;
                        
                        let style = "bg-gray-50 text-gray-300 border-gray-200";
                        if (selecionado) {
                            if (Op === '1') style = "bg-loteca-green text-white shadow-lg scale-110";
                            else if (Op === 'X') style = "bg-gray-500 text-white shadow-lg scale-110";
                            else style = "bg-loteca-yellow text-black shadow-lg scale-110";
                        }
                        if (jogoSalvo && !selecionado) style += " opacity-30";

                        return (
                            <button 
                                key={Op}
                                onClick={() => handleManualClick(i, Op)}
                                disabled={jogoSalvo || isFinalizado}
                                className={`w-8 h-8 rounded font-bold text-sm border flex items-center justify-center transition-all ${style}`}
                            >
                                {Op}
                                {ehOficial && <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>}
                            </button>
                        )
                    })}
                </div>

                <div className="w-1/3 text-left font-bold text-sm truncate">{j.v}</div>
            </div>
        )})}
      </div>

      {/* BARRA FIXA DE SALVAMENTO (NUVEM) */}
      {!isFinalizado && palpite.some(p => p !== null) && !jogoSalvo && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl flex justify-center z-50 animate-slideUp">
              <button 
                onClick={salvarNaNuvem}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white text-lg font-black py-4 px-12 rounded-full shadow-lg flex items-center gap-3 transform hover:scale-105 transition"
              >
                  {saving ? <Loader2 className="animate-spin"/> : <Save size={24} />} 
                  {saving ? 'SALVANDO...' : 'SALVAR NA NUVEM'}
              </button>
          </div>
      )}

      {/* STATUS SALVO */}
      {jogoSalvo && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-50">
              <Cloud size={18} className="text-blue-400"/>
              <span className="font-bold">Sincronizado e Seguro.</span>
          </div>
      )}
    </div>
  );
}
