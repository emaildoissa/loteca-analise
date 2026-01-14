import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Quote, DollarSign, Trash2, CheckCircle2, XCircle, Plus, Upload, PlayCircle, Download } from 'lucide-react';

export default function AmbasMarcam() {
  const [jogosImportados, setJogosImportados] = useState<any[]>([]);
  const [minhasApostas, setMinhasApostas] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving] = useState(false);

  // CONFIGURAÇÃO
  const ODD_FIXA = 1.80; // Você pode mudar isso se quiser
  const APOSTA_FIXA = 5.00;

  useEffect(() => {
    carregarApostas();
  }, []);

  async function carregarApostas() {
    const { data } = await supabase.from('meus_palpites').select('*').eq('tipo', 'ambas_marcam');
    if (data && data.length > 0) {
        const ultimoSave = data[0]; 
        if (ultimoSave) setMinhasApostas(ultimoSave.dados || []);
    }
  }

  const salvarNaNuvem = async (novasApostas: any[]) => {
      setSaving(true);
      const { error } = await supabase.from('meus_palpites').upsert({
          concurso: 9999, 
          tipo: 'ambas_marcam',
          dados: novasApostas
      }, { onConflict: 'concurso, tipo' });
      setSaving(false);
      if (error) console.error('Erro ao salvar:', error);
  };

  const importarJson = () => {
      try {
          const dados = JSON.parse(jsonInput);
          if(Array.isArray(dados)) {
            setJogosImportados(dados);
            setShowInput(false);
          } else {
            alert("O JSON precisa ser uma lista [...]");
          }
      } catch (e) {
          alert("JSON Inválido.");
      }
  };

  const exportarParaIA = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(minhasApostas, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "historico_apostas.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const apostar = (jogo: any) => {
      const novaAposta = {
          id: Date.now(),
          ...jogo,
          golsCasa: '', 
          golsFora: '',
          status: 'PENDENTE',
          lucro: 0
      };
      const novaLista = [novaAposta, ...minhasApostas];
      setMinhasApostas(novaLista);
      salvarNaNuvem(novaLista);
  };

  const remover = (id: number) => {
      const novaLista = minhasApostas.filter(a => a.id !== id);
      setMinhasApostas(novaLista);
      salvarNaNuvem(novaLista);
  };

  const mudarStatus = (id: number, novoStatus: string) => {
      const novaLista = minhasApostas.map(aposta => {
          if (aposta.id === id) {
              let lucro = 0;
              if (novoStatus === 'GREEN') lucro = (APOSTA_FIXA * ODD_FIXA) - APOSTA_FIXA;
              if (novoStatus === 'RED') lucro = -APOSTA_FIXA;
              return { ...aposta, status: novoStatus, lucro };
          }
          return aposta;
      });
      setMinhasApostas(novaLista);
      salvarNaNuvem(novaLista);
  };

  const atualizarPlacar = (id: number, time: 'casa' | 'fora', valor: string) => {
      const novaLista = minhasApostas.map(aposta => {
          if (aposta.id === id) {
              return { 
                  ...aposta, 
                  [time === 'casa' ? 'golsCasa' : 'golsFora']: valor 
              };
          }
          return aposta;
      });
      setMinhasApostas(novaLista);
      salvarNaNuvem(novaLista);
  };

  const lucroTotal = minhasApostas.reduce((acc, curr) => acc + (curr.lucro || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-violet-900 to-purple-800 text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Quote /> APOSTAS RÁPIDAS
              </h1>
              <p className="text-purple-200 text-sm">Odd Fixa: <strong>{ODD_FIXA}</strong> • Entrada: <strong>R$ {APOSTA_FIXA.toFixed(2)}</strong></p>
          </div>
          
          <div className="flex gap-4 items-center">
              <button 
                onClick={exportarParaIA}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border border-white/20 transition"
              >
                  <Download size={16}/> Exportar (IA)
              </button>

              <div className={`text-right px-6 py-2 rounded-lg border ${lucroTotal >= 0 ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
                  <div className="text-[10px] text-purple-200 font-bold uppercase">Lucro Real</div>
                  <div className="text-2xl font-black">{lucroTotal >= 0 ? '+' : ''}R$ {lucroTotal.toFixed(2)}</div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* ESQUERDA: IMPORTAR */}
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-700 flex items-center gap-2"><Plus size={20}/> Novos Jogos</h2>
                  <button onClick={() => setShowInput(!showInput)} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 flex gap-1 items-center font-bold">
                      <Upload size={14}/> Importar JSON
                  </button>
              </div>

              {showInput && (
                  <div className="bg-white p-4 rounded-xl shadow border animate-fadeIn">
                      <p className="text-xs text-gray-500 mb-2">Cole o JSON:</p>
                      <textarea 
                        className="w-full h-32 p-2 border rounded text-xs font-mono bg-gray-50"
                        value={jsonInput}
                        onChange={e => setJsonInput(e.target.value)}
                        placeholder='[{"hora": "15:00", "casa": "Time A", "fora": "Time B"}]'
                      ></textarea>
                      <button onClick={importarJson} className="w-full bg-purple-600 text-white font-bold py-2 rounded mt-2 hover:bg-purple-700">
                          CARREGAR JOGOS
                      </button>
                  </div>
              )}

              {jogosImportados.length === 0 && !showInput && (
                  <div className="p-8 border-2 border-dashed rounded-xl text-center text-gray-400">
                      Cole o JSON para começar.
                  </div>
              )}

              <div className="space-y-2">
                  {jogosImportados.map((jogo, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-purple-500 flex justify-between items-center hover:shadow-md transition">
                          <div>
                              <span className="text-xs font-bold text-gray-400">{jogo.hora}</span>
                              <div className="font-bold text-gray-800">{jogo.casa} x {jogo.fora}</div>
                          </div>
                          <button onClick={() => apostar(jogo)} className="bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2">
                              <PlayCircle size={16}/> Apostar
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* DIREITA: MINHAS APOSTAS */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 max-h-[400px] md:max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="font-bold text-gray-700 flex items-center gap-2"><DollarSign size={20}/> Minhas Entradas</h2>
                 {saving && <span className="text-xs text-purple-600 animate-pulse">Salvando...</span>}
              </div>
              
              {minhasApostas.length === 0 && <p className="text-gray-400 text-center text-sm py-8">Nenhuma aposta ativa.</p>}

              <div className="space-y-3">
                  {minhasApostas.map((bet) => (
                      <div key={bet.id} className="bg-white p-3 rounded shadow-sm border relative">
                          <div className="flex justify-between items-start mb-2">
                              <div className="w-full">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-bold w-1/3 text-right truncate">{bet.casa}</span>
                                      <div className="flex gap-1 items-center">
                                          <input type="text" placeholder="0" className="w-8 h-8 text-center border rounded bg-gray-50 font-bold" value={bet.golsCasa || ''} onChange={(e) => atualizarPlacar(bet.id, 'casa', e.target.value)} />
                                          <span className="text-gray-400">x</span>
                                          <input type="text" placeholder="0" className="w-8 h-8 text-center border rounded bg-gray-50 font-bold" value={bet.golsFora || ''} onChange={(e) => atualizarPlacar(bet.id, 'fora', e.target.value)} />
                                      </div>
                                      <span className="text-sm font-bold w-1/3 text-left truncate">{bet.fora}</span>
                                  </div>
                              </div>
                              <button onClick={() => remover(bet.id)} className="text-gray-300 hover:text-red-500 absolute top-2 right-2"><Trash2 size={14}/></button>
                          </div>

                          <div className="flex gap-2 mt-2">
                              {bet.status === 'PENDENTE' && (
                                  <>
                                    <button onClick={() => mudarStatus(bet.id, 'GREEN')} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1 rounded text-xs font-bold border border-green-200">✅ GREEN</button>
                                    <button onClick={() => mudarStatus(bet.id, 'RED')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-1 rounded text-xs font-bold border border-red-200">❌ RED</button>
                                  </>
                              )}
                              {bet.status === 'GREEN' && <div className="w-full bg-green-500 text-white py-1 rounded text-xs font-bold text-center flex items-center justify-center gap-2"><CheckCircle2 size={14}/> +R$ {(APOSTA_FIXA * ODD_FIXA - APOSTA_FIXA).toFixed(2)}</div>}
                              {bet.status === 'RED' && <div className="w-full bg-red-500 text-white py-1 rounded text-xs font-bold text-center flex items-center justify-center gap-2"><XCircle size={14}/> -R$ {APOSTA_FIXA.toFixed(2)}</div>}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}