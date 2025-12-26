import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { MatrizStat } from '../types';

const COLORS = ['#009045', '#F4C900', '#EF4444', '#3B82F6', '#8B5CF6'];

export default function Dashboard() {
  const [stats, setStats] = useState<MatrizStat[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [lastContest, setLastContest] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    // Buscar último concurso
    const { data: last } = await supabase
      .from('historico_loteca')
      .select('*')
      .order('concurso', { ascending: false })
      .limit(1)
      .single();
    
    setLastContest(last);

    // Buscar distribuição de matrizes
    const { data } = await supabase.from('historico_loteca').select('matriz');
    
    if (data) {
      setTotalGames(data.length);
      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.matriz] = (counts[item.matriz] || 0) + 1;
      });

      const processed = Object.entries(counts)
        .map(([key, value]) => ({
          matriz: key,
          count: value,
          percent: Math.round((value / data.length) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      setStats(processed);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
      
      {/* Cards Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border-l-4 border-loteca-green">
          <h3 className="text-gray-500 text-sm uppercase">Último Concurso</h3>
          <p className="text-2xl font-bold">{lastContest?.concurso || '...'}</p>
          <p className="text-sm text-gray-400">{lastContest?.data_apuracao}</p>
          <div className="mt-2 text-xs font-mono bg-gray-100 p-1 rounded inline-block">
            Matriz: {lastContest?.matriz}
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border-l-4 border-loteca-yellow">
          <h3 className="text-gray-500 text-sm uppercase">Concursos Analisados</h3>
          <p className="text-2xl font-bold">{totalGames}</p>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm uppercase">Matriz Mais Comum</h3>
          <p className="text-2xl font-bold">{stats[0]?.matriz || '...'}</p>
          <p className="text-sm text-gray-400">{stats[0]?.percent}% das vezes</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Top 5 Matrizes (Distribuição)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats as any}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {stats.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs mt-2">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i]}}></span>
                  {s.matriz} ({s.percent}%)
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Frequência Absoluta</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="matriz" type="category" width={60} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" fill="#009045" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}