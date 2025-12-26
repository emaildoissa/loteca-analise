import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Concurso } from '../types';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';

export default function Historico() {
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('historico_loteca')
      .select('*')
      .order('concurso', { ascending: false });
    
    if (!error && data) setConcursos(data);
    setLoading(false);
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        console.log("CSV Parsed:", results.data);
        alert("Função de importação pronta para processar o CSV (Lógica de inserção no Supabase deve ser adicionada aqui).");
        // Aqui você mapearia results.data para o formato do Supabase e faria o insert.
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Histórico de Resultados</h1>
        <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
           <Upload size={16} /> Importar CSV
           <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 dark:bg-zinc-900 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Concurso</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Data</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Matriz</th>
                <th className="px-6 py-4 font-semibold text-gray-600">1 (Casa)</th>
                <th className="px-6 py-4 font-semibold text-gray-600">X (Empate)</th>
                <th className="px-6 py-4 font-semibold text-gray-600">2 (Fora)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Carregando...</td></tr>
              ) : concursos.map((c) => (
                <tr key={c.concurso} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-loteca-green">#{c.concurso}</td>
                  <td className="px-6 py-4 text-gray-500">{c.data_apuracao}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                      {c.matriz}
                    </span>
                  </td>
                  <td className="px-6 py-4">{c.qtd_1}</td>
                  <td className="px-6 py-4">{c.qtd_x}</td>
                  <td className="px-6 py-4">{c.qtd_2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}