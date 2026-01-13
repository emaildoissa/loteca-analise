import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, Edit3, Save, X, Loader2, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

export default function Historico() {
  const [concursos, setConcursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Estados para Edição Manual
  const [modoEdicao, setModoEdicao] = useState(false);
  const [idEdicao, setIdEdicao] = useState<number>(0);
  const [dataEdicao, setDataEdicao] = useState('');
  const [jogosEdicao, setJogosEdicao] = useState<any[]>([]);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    setLoading(true);
    const { data } = await supabase.from('historico_loteca').select('*').order('concurso', { ascending: false });
    if (data) setConcursos(data);
    setLoading(false);
  }

  // --- FUNÇÃO 1: IMPORTAR CSV (O Jeito Rápido) ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
            const rows = results.data as any[];
            const payload = rows.map((row) => {
                const jogos = [];
                let q1 = 0, qX = 0, q2 = 0;
                let temResultado = false;

                for (let i = 1; i <= 14; i++) {
                    let res = row[`Res${i}`]; 
                    if (!res || res.trim() === '') res = null;
                    else temResultado = true;

                    if (res === '1') q1++; else if (res === '2') q2++; else if (res === 'X') qX++;

                    const p1 = parseFloat(row[`Prob${i}_1`] || '33');
                    const pX = parseFloat(row[`Prob${i}_X`] || '33');
                    const p2 = parseFloat(row[`Prob${i}_2`] || '33');

                    jogos.push({
                        m: row[`Time${i}M`] || `Time ${i}A`,
                        v: row[`Time${i}V`] || `Time ${i}B`,
                        r: res,
                        probM: p1, probX: pX, probV: p2
                    });
                }

                return {
                    concurso: parseInt(row['Concurso']),
                    data_apuracao: row['Data'],
                    jogos: jogos,
                    qtd_1: temResultado ? q1 : 0, qtd_x: temResultado ? qX : 0, qtd_2: temResultado ? q2 : 0
                };
            });

            const { error } = await supabase.from('historico_loteca').upsert(payload, { onConflict: 'concurso' });
            if (error) throw error;
            alert('CSV Importado com Sucesso!');
            fetchHistory();
        } catch (err) {
            console.error(err);
            alert("Erro no CSV.");
        } finally {
            setUploading(false);
            event.target.value = ''; 
        }
      }
    });
  };

  // --- FUNÇÃO 2: EDITAR MANUALMENTE (Para colocar resultados) ---
  const abrirEdicao = (c: any) => {
      setIdEdicao(c.concurso);
      setDataEdicao(c.data_apuracao);
      // Clone profundo para não afetar a lista antes de salvar
      setJogosEdicao(JSON.parse(JSON.stringify(c.jogos))); 
      setModoEdicao(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const salvarEdicao = async () => {
      let q1 = 0, qX = 0, q2 = 0;
      
      const jogosFinais = jogosEdicao.map(j => {
          if (j.r === '1') q1++;
          else if (j.r === 'X') qX++;
          else if (j.r === '2') q2++;
          return j;
      });

      const payload = {
          concurso: idEdicao,
          data_apuracao: dataEdicao,
          jogos: jogosFinais,
          qtd_1: q1, qtd_x: qX, qtd_2: q2
      };

      const { error } = await supabase.from('historico_loteca').upsert(payload, { onConflict: 'concurso' });
      if (!error) {
          alert('Dados atualizados!');
          setModoEdicao(false);
          fetchHistory();
      } else {
          alert('Erro ao salvar.');
      }
  };

  const toggleResultado = (index: number, valor: string) => {
      const novos = [...jogosEdicao];
      // Se clicar no que já está, limpa (volta a ser null). Se não, seta o valor.
      novos[index].r = novos[index].r === valor ? null : valor; 
      setJogosEdicao(novos);
  };

  const limparBanco = async () => {
    if (confirm('Apagar TUDO?')) {
        await supabase.from('historico_loteca').delete().neq('id', 0);
        fetchHistory();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* CABEÇALHO: Importar e Limpar */}
      {!modoEdicao && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Histórico de Jogos</h1>
                <p className="text-gray-500 text-sm">Gerencie via CSV ou Edição Manual</p>
            </div>
            <div className="flex gap-2">
                <button onClick={limparBanco} className="text-red-600 bg-red-50 px-3 py-2 rounded hover:bg-red-100"><Trash2 size={18}/></button>
                
                <label className="bg-loteca-green text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-emerald-700 flex items-center gap-2 shadow-lg font-bold transition transform hover:scale-105">
                    {uploading ? <Loader2 className="animate-spin"/> : <Upload size={20}/>} 
                    {uploading ? 'Lendo...' : 'Subir CSV Inteligente'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
            </div>
        </div>
      )}

      {/* TELA DE EDIÇÃO (Aparece ao clicar em Editar) */}
      {modoEdicao && (
        <div className="bg-white p-6 rounded-xl shadow-2xl border-2 border-blue-500 animate-fadeIn relative">
            <button onClick={() => setModoEdicao(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><X size={24}/></button>
            
            <div className="mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2"><Edit3 size={20}/> Editando Concurso #{idEdicao}</h2>
                <div className="mt-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Data do Sorteio</label>
                    <input type="date" value={dataEdicao} onChange={e => setDataEdicao(e.target.value)} className="block border rounded p-1 text-sm"/>
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">
                    <span className="w-6">#</span>
                    <span className="flex-1 text-right pr-2">Mandante</span>
                    <span className="w-32 text-center">Resultado Real</span>
                    <span className="flex-1 pl-2">Visitante</span>
                </div>

                {jogosEdicao.map((jogo, i) => (
                    <div key={i} className="flex items-center bg-gray-50 p-2 rounded hover:bg-gray-100 transition">
                        <span className="w-6 font-bold text-gray-400 text-sm">{i+1}</span>
                        
                        <div className="flex-1 text-right text-sm font-bold text-gray-700 truncate pr-3">{jogo.m}</div>

                        {/* Botões de Resultado (Estilo Toggle) */}
                        <div className="flex gap-1">
                            {['1', 'X', '2'].map(op => (
                                <button
                                    key={op}
                                    onClick={() => toggleResultado(i, op)}
                                    className={`w-10 h-8 rounded font-bold text-sm transition-all border
                                        ${jogo.r === op 
                                            ? (op==='1' ? 'bg-green-600 text-white border-green-700 shadow-inner' 
                                              : op==='X' ? 'bg-gray-600 text-white border-gray-700 shadow-inner' 
                                              : 'bg-yellow-500 text-white border-yellow-600 shadow-inner') 
                                            : 'bg-white text-gray-300 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {op}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 text-left text-sm font-bold text-gray-700 truncate pl-3">{jogo.v}</div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setModoEdicao(false)} className="px-6 py-3 rounded-lg text-gray-600 hover:bg-gray-100 font-bold">Cancelar</button>
                <button onClick={salvarEdicao} className="px-8 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg flex items-center gap-2">
                    <Save size={20}/> SALVAR RESULTADOS
                </button>
            </div>
        </div>
      )}

      {/* LISTAGEM DOS CONCURSOS */}
      {!modoEdicao && (
        <div className="bg-white rounded-xl shadow overflow-hidden border">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                <tr>
                    <th className="px-6 py-3">Concurso</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Ação</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {concursos.map((c) => {
                    const isAberto = c.qtd_1 === 0 && c.qtd_x === 0 && c.qtd_2 === 0;
                    return (
                    <tr key={c.concurso} className="hover:bg-blue-50 transition">
                        <td className="px-6 py-4">
                            <span className="text-lg font-bold text-gray-800">#{c.concurso}</span>
                            <div className="text-gray-400 text-xs">{c.data_apuracao}</div>
                        </td>
                        <td className="px-6 py-4">
                            {isAberto ? (
                                <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                    <Loader2 size={12} className="animate-spin-slow"/> EM ABERTO
                                </span>
                            ) : (
                                <span className="bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                    <CheckCircle size={12}/> {c.qtd_1} - {c.qtd_x} - {c.qtd_2}
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button 
                                onClick={() => abrirEdicao(c)}
                                className="text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ml-auto"
                            >
                                <Edit3 size={16}/> {isAberto ? 'Lançar Resultados' : 'Corrigir'}
                            </button>
                        </td>
                    </tr>
                )})}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
}