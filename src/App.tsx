import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Calculator, Trophy, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Historico from './pages/Historico';
import Analise from './pages/Analise';

function NavLink({ to, icon: Icon, children, onClick }: any) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
        isActive 
          ? 'bg-white/10 text-white font-bold' 
          : 'text-white/80 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={18} className={isActive ? "text-loteca-yellow" : ""} />
      <span>{children}</span>
    </Link>
  );
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans">
        {/* Navbar */}
        <nav className="bg-loteca-green shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center gap-2 font-bold text-xl text-white">
                <div className="bg-white p-1.5 rounded-full">
                  <Trophy className="text-loteca-green" size={20} />
                </div>
                <span>Loteca <span className="text-loteca-yellow">Analyzer</span></span>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:flex gap-2">
                <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
                <NavLink to="/analise" icon={Calculator}>Palpites</NavLink>
                <NavLink to="/historico" icon={History}>Histórico</NavLink>
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden text-white p-2 hover:bg-white/10 rounded"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-loteca-green p-4 space-y-2 animate-in slide-in-from-top-2">
              <NavLink to="/" icon={LayoutDashboard} onClick={() => setIsMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="/analise" icon={Calculator} onClick={() => setIsMenuOpen(false)}>Palpites</NavLink>
              <NavLink to="/historico" icon={History} onClick={() => setIsMenuOpen(false)}>Histórico</NavLink>
            </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in duration-500">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/analise" element={<Analise />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">© 2025 Loteca Analyzer. Feito para estudos.</p>
            <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">
              Este aplicativo utiliza estatísticas baseadas em histórico público. 
              Apostas envolvem riscos financeiros. Jogue com responsabilidade.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;