import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Quote, DollarSign, Save, Trash2, CheckCircle2, XCircle, Plus, Upload, PlayCircle } from 'lucide-react';

export default function AmbasMarcam() {
  const [jogosImportados, setJogosImportados] = useState<any[]>([]);
  const [minhasApostas, setMinhasApostas] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(true);

  const ODD_FIXA = 1.80;
  const APOSTA_FIXA = 5.00;

  useEffect(() => {
    carregarApostas();
  }, []);

  async function carregarApostas() {
    setLoading(true);
    // Busca apostas salvas do tipo 'ambas_marcam' no Supabase
    const { data } = await supabase.from('meus_palpites').select('*').eq('tipo', 'ambas_marcam');
    
    if (data && data.length > 0) {
        // O Supabase retorna linhas, vamos pegar o array de dados da primeira linha encontrada ou acumular
        // Simplificando: vamos usar uma linha única com ID fixo ou pegar a mais recente
        const ultimoSave = data[0]; 
        if (ultimoSave) {
            setMinhasApostas(ultimoSave.dados || []);
        }
    }
    setLoading(false);
  }

  const salvarNaNuvem = async (novasApostas: any[]) => {
      // Salva no banco com um ID fixo (ou concurso 0) para esse mercado
      // Usaremos concurso: 9999 apenas para diferenciar internamente
      const { error } = await supabase.from('meus_palpites').upsert({
          concurso: 9999, 
          tipo: 'ambas_marcam',
          dados: novasApostas
      }, { onConflict: 'concurso, tipo' });

      if (error) console.error('Erro ao salvar:', error);
  };

  const importarJson = () => {
      try {
          const dados = JSON.parse(jsonInput);
          setJogosImportados(dados);
          setShowInput(false);
      } catch (e) {
          alert("JSON Inválido. Verifique as aspas e vírgulas.");
      }
  };

  const apostar = (jogo: any) => {
      const novaAposta = {
          id: Date.now(), // ID único
          ...jogo,
          status: 'PENDENTE', // PENDENTE, GREEN, RED
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

  // Função para você marcar manualmente o resultado
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

  // Cálculo de Lucro Total
  const lucroTotal = minhasApostas.reduce((acc, curr) => acc + (curr.lucro || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      
      {/* HEADER FINANCEIRO */}
      <div className="bg-gradient-to-r from-violet-900 to-purple-800 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
          <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Quote /> AMBAS MARCAM (BTTS)
              </h1>
              <p className="text-purple-200 text-sm">Odd Fixa: <strong>{ODD_FIXA}</strong> • Entrada: <strong>R$ {APOSTA_FIXA.toFixed(2)}</strong></p>
          </div>
          <div className={`text-right px-6 py-3 rounded-lg border ${lucroTotal >= 0 ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
              <div className="text-xs text-purple-200 font-bold uppercase">Lucro Real</div>
              <div className="text-3xl font-black">{lucroTotal >= 0 ? '+' : ''}R$ {lucroTotal.toFixed(2)}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LADO ESQUERDO: IMPORTAR E ESCOLHER */}
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-700 flex items-center gap-2"><Plus size={20}/> Novos Jogos</h2>
                  <button onClick={() => setShowInput(!showInput)} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 flex gap-1 items-center">
                      <Upload size={14}/> Importar JSON
                  </button>
              </div>

              {showInput && (
                  <div className="bg-white p-4 rounded-xl shadow border animate-fadeIn">
                      <p className="text-xs text-gray-500 mb-2">Cole o JSON aqui:</p>
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
                          <button 
                            onClick={() => apostar(jogo)}
                            className="bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"
                          >
                              <PlayCircle size={16}/> Apostar SIM
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* LADO DIREITO: MINHAS APOSTAS (GERENCIAMENTO) */}
          <div className="bg-gray-50 p-6 rounded-xl border h-fit">
              <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><DollarSign size={20}/> Minhas Entradas</h2>
              
              {minhasApostas.length === 0 && <p className="text-gray-400 text-center text-sm">Nenhuma aposta ativa.</p>}

              <div className="space-y-3">
                  {minhasApostas.map((bet) => (
                      <div key={bet.id} className="bg-white p-3 rounded shadow-sm border relative">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <div className="font-bold text-sm">{bet.casa} x {bet.fora}</div>
                                  <div className="text-xs text-gray-500">Ambas Marcam: SIM @ {ODD_FIXA}</div>
                              </div>
                              <button onClick={() => remover(bet.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>

                          {/* BOTOES DE RESULTADO */}
                          <div className="flex gap-2 mt-2">
                              {bet.status === 'PENDENTE' && (
                                  <>
                                    <button onClick={() => mudarStatus(bet.id, 'GREEN')} className="flex-1 bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 py-1 rounded text-xs font-bold border border-gray-200 hover:border-green-300 transition">
                                        ✅ GREEN
                                    </button>
                                    <button onClick={() => mudarStatus(bet.id, 'RED')} className="flex-1 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 py-1 rounded text-xs font-bold border border-gray-200 hover:border-red-300 transition">
                                        ❌ RED
                                    </button>
                                  </>
                              )}

                              {bet.status === 'GREEN' && (
                                  <div className="w-full bg-green-500 text-white py-1 rounded text-xs font-bold text-center flex items-center justify-center gap-2">
                                      <CheckCircle2 size={14}/> GREEN (+R$ {(APOSTA_FIXA * ODD_FIXA - APOSTA_FIXA).toFixed(2)})
                                  </div>
                              )}

                              {bet.status === 'RED' && (
                                  <div className="w-full bg-red-500 text-white py-1 rounded text-xs font-bold text-center flex items-center justify-center gap-2">
                                      <XCircle size={14}/> RED (-R$ {APOSTA_FIXA.toFixed(2)})
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
}