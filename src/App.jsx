import React, { Component, createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, Wallet, Wrench, Megaphone, LogOut, Briefcase, 
  PlusCircle, User, CheckCircle, ArrowLeft, Loader2, 
  MapPin, Calculator, CreditCard, Upload, FileText, Trash2, Calendar, 
  Clock, XCircle, Save, ChevronDown, ChevronUp, Printer, Eye,
  Users, Award, ArrowUp, ArrowDown, Filter, Download, PieChart, BarChart3, TrendingUp, Layers
} from 'lucide-react';

// --- DADOS DA EMPRESA ---
const EMPRESA = {
  nome: "TEMPORI PLANEJADOS LTDA",
  cnpj: "32.255.794/0001-20",
  endereco: "AV. ALVARO CALHEIROS, 1030, JATIUCA, MACEIÓ, ALAGOAS"
};

// --- UTILITÁRIOS ---
const validarCPF = (cpf) => {
  if (!cpf) return false;
  let strCPF = cpf.replace(/[^\d]+/g, '');
  if (strCPF.length !== 11 || /^(\d)\1+$/.test(strCPF)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(strCPF.substring(i-1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(strCPF.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(strCPF.substring(i-1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(strCPF.substring(10, 11))) return false;
  return true;
};

const BRL = (valor) => {
  if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
};

// --- COMPONENTES VISUAIS REUTILIZÁVEIS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border-0 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', className = "", ...props }) => {
  const base = "px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 focus:ring-2 focus:ring-offset-2 outline-none";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-md focus:ring-blue-500",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500",
    success: "bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = (props) => (
  <input 
    className={`w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none ${props.className || ''}`} 
    {...props} 
  />
);

const Select = (props) => (
  <select 
    className={`w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none ${props.className || ''}`} 
    {...props} 
  >
    {props.children}
  </select>
);

const StatusBadge = ({ status }) => {
  const colors = {
    vendido: "bg-green-100 text-green-800", aprovado: "bg-blue-100 text-blue-800",
    pendente: "bg-yellow-100 text-yellow-800", aberto: "bg-orange-100 text-orange-800",
    pago: "bg-teal-100 text-teal-800", realizado: "bg-indigo-100 text-indigo-800",
    cancelado: "bg-red-100 text-red-800"
  };
  const color = colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
  return <span className={`px-3 py-1 rounded-full text-xs uppercase font-extrabold tracking-wider ${color}`}>{status}</span>;
};

// --- ERROR BOUNDARY (PROTEÇÃO CONTRA TELA BRANCA) ---
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Erro:", error, errorInfo); }
  render() {
    if (this.state.hasError) return (
      <div className="p-10 text-red-600 bg-red-50 h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">Ops! Ocorreu um erro.</h1>
        <p className="bg-white p-4 border rounded mb-4 text-sm font-mono">{this.state.error?.message}</p>
        <Button variant="danger" onClick={()=>window.location.href='/'}>Recarregar Sistema</Button>
      </div>
    );
    return this.props.children;
  }
}

// --- CONFIGURAÇÃO ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// --- AUTH CONTEXT ---
const AuthContext = createContext({});
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { 
        setUser(session.user); 
        supabase.from('perfis').select('*').eq('id', session.user.id).single().then(({ data }) => setPerfil(data)); 
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if(session?.user) supabase.from('perfis').select('*').eq('id', session.user.id).single().then(({ data }) => setPerfil(data));
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={{ user, perfil, loading, logout: () => supabase.auth.signOut() }}>{!loading && children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

// --- SIDEBAR ---
function Sidebar() {
  const { perfil, logout } = useAuth();
  const location = useLocation();
  const menus = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20}/>, roles: ['admin', 'financeiro', 'consultor', 'conferente', 'montador', 'marketing'] },
    { name: 'Comercial', path: '/comercial', icon: <Briefcase size={20}/>, roles: ['admin', 'consultor', 'financeiro'] },
    { name: 'Parceiros', path: '/parceiros', icon: <Users size={20}/>, roles: ['admin', 'consultor', 'marketing'] },
    { name: 'Financeiro', path: '/financeiro', icon: <Wallet size={20}/>, roles: ['admin', 'financeiro'] },
    { name: 'Técnico / Obras', path: '/assistencia', icon: <Wrench size={20}/>, roles: ['admin', 'consultor', 'conferente', 'montador', 'financeiro'] },
    { name: 'Marketing', path: '/marketing', icon: <Megaphone size={20}/>, roles: ['admin', 'consultor', 'marketing', 'financeiro'] },
  ];
  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-[#0f172a] to-indigo-950 text-white flex flex-col h-screen fixed z-50 overflow-y-auto print:hidden shadow-2xl font-sans">
      <div className="p-8 pb-4 flex items-center gap-3">
        <div className="bg-gradient-to-tr from-blue-500 to-indigo-400 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Layers className="text-white" size={24} strokeWidth={1.5} />
        </div>
        <div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight leading-none">TemporiPro</h1>
            <p className="text-[10px] text-blue-300/80 font-medium tracking-wider mt-1 uppercase">Planejamento Inteligente</p>
        </div>
      </div>
      <div className="px-8 py-4 mb-4 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-lg font-bold text-blue-400">
              {perfil?.nome_completo?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200 leading-tight">{perfil?.nome_completo}</p>
            <p className="text-xs text-slate-500 capitalize">{perfil?.cargo}</p>
          </div>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menus.map(m => {
          if (perfil?.cargo !== 'admin' && !m.roles.includes(perfil?.cargo)) return null;
          const active = location.pathname.includes(m.path) && m.path !== '/';
          return (
            <Link key={m.path} to={m.path} className={`group flex gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 items-center font-medium ${active ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-blue-900/30' : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-100'}`}>
                <span className={`transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>{m.icon}</span>
                <span>{m.name}</span>
                {active && <ChevronDown size={16} className="ml-auto -rotate-90 opacity-50"/>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto">
          <button onClick={logout} className="flex gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-950/30 hover:text-red-300 w-full transition-all font-bold items-center">
            <LogOut size={20}/> <span>Sair do Sistema</span>
          </button>
      </div>
    </aside>
  );
}

// --- DASHBOARD ---
function Dashboard() {
  const [stats, setStats] = useState({ vendas: [], caixa: { saldo:0, aReceber10:0, aPagar10:0 } });
  
  useEffect(() => {
    const load = async () => {
      const { data: vendas } = await supabase.from('contratos').select('created_at, valor_total').eq('status', 'vendido').order('created_at');
      const { data: trans } = await supabase.from('transacoes').select('*');
      const { data: pags } = await supabase.from('pagamentos_contrato').select('*').neq('status', 'cancelado');
      
      const hoje = new Date();
      const em10Dias = new Date(); em10Dias.setDate(hoje.getDate() + 10);
      
      const saldoAtual = (trans?.filter(t=>t.status==='realizado'&&t.tipo==='receita').reduce((a,b)=>a+b.valor,0)||0) - (trans?.filter(t=>t.status==='realizado'&&t.tipo==='despesa').reduce((a,b)=>a+b.valor,0)||0) + (pags?.filter(p=>p.status==='pago').reduce((a,b)=>a+b.valor_parcela,0)||0);
      const receber10 = pags?.filter(p => p.status === 'pendente' && new Date(p.data_vencimento) <= em10Dias).reduce((a,b)=>a+b.valor_parcela,0)||0;
      const pagar10 = trans?.filter(t => t.tipo==='despesa' && t.status==='pendente' && new Date(t.data_movimento) <= em10Dias).reduce((a,b)=>a+b.valor,0)||0;

      setStats({ vendas: vendas || [], caixa: { saldo: saldoAtual, aReceber10: receber10, aPagar10: pagar10 } });
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Visão geral do seu negócio hoje.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-800 to-indigo-900 text-white p-8 rounded-3xl shadow-2xl shadow-indigo-900/30 col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10"><Wallet size={150}/></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
                <div><h2 className="text-xl font-bold text-blue-100 flex items-center gap-2 mb-1"><Clock size={22} className="text-blue-300"/> Fluxo de Caixa (10 Dias)</h2><p className="text-sm text-blue-300/80">Previsão baseada em parcelas e agendamentos.</p></div>
                <div className="text-right"><p className="text-sm text-blue-300 font-bold uppercase tracking-wider mb-1">Saldo Projetado</p><p className="text-4xl font-extrabold text-white tracking-tight">{BRL(stats.caixa.saldo + stats.caixa.aReceber10 - stats.caixa.aPagar10)}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
                <div><p className="text-xs text-blue-300 uppercase font-bold mb-1">Saldo Hoje</p><p className="font-bold text-2xl">{BRL(stats.caixa.saldo)}</p></div>
                <div><p className="text-xs text-emerald-300 uppercase font-bold mb-1 flex items-center gap-1"><ArrowUp size={14}/> A Receber</p><p className="font-bold text-2xl text-emerald-200">{BRL(stats.caixa.aReceber10)}</p></div>
                <div><p className="text-xs text-rose-300 uppercase font-bold mb-1 flex items-center gap-1"><ArrowDown size={14}/> A Pagar</p><p className="font-bold text-2xl text-rose-200">{BRL(stats.caixa.aPagar10)}</p></div>
            </div>
          </div>
        </div>
        <Card className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
           <div className="bg-white/20 p-4 rounded-full mb-4"><BarChart3 size={40} className="text-white"/></div>
           <h3 className="text-blue-100 font-bold uppercase tracking-wider text-sm mb-1">Total Vendas (Mês)</h3>
           <p className="text-4xl font-extrabold">{BRL(stats.vendas.reduce((a,b)=>a+b.valor_total,0))}</p>
        </Card>
      </div>
      <Card>
        <h3 className="font-bold text-slate-700 mb-8 flex items-center gap-3 text-xl"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={24}/></div> Evolução de Vendas Recentes</h3>
        <div className="h-64 flex items-end gap-3 px-4 pb-4 border-b border-slate-100">
          {stats.vendas.slice(-15).map((v, i) => {
            const height = Math.min((v.valor_total/20000)*100, 100);
            return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative">
              <div className="bg-gradient-to-t from-blue-400 to-indigo-400 rounded-t-xl hover:from-blue-500 hover:to-indigo-500 transition-all relative w-full" style={{height: `${height}%`, minHeight: '10%'}}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10">{BRL(v.valor_total)}</div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2 font-medium truncate">{new Date(v.created_at).toLocaleDateString().slice(0,5)}</p>
            </div>
          )})}
          {stats.vendas.length === 0 && <p className="w-full text-center text-slate-400 self-center font-medium">Sem dados de vendas suficientes para o gráfico.</p>}
        </div>
      </Card>
    </div>
  );
}

// --- FINANCEIRO 2.0 ---
function Financeiro() {
  const [tab, setTab] = useState('fluxo'); 
  const [extrato, setExtrato] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [novaTransacao, setNovaTransacao] = useState({ tipo: 'despesa', descricao: '', valor: '', categoria: 'Material', contrato_id: '', data_movimento: new Date().toISOString().split('T')[0] });
  const [filtroDataIni, setFiltroDataIni] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const { data: trans } = await supabase.from('transacoes').select('*, contratos(numero_contrato, clientes(nome))');
    const { data: recebs } = await supabase.from('pagamentos_contrato').select('*, contratos(numero_contrato, clientes(nome))').neq('status', 'cancelado');
    const { data: conts } = await supabase.from('contratos').select('*, clientes(nome)').neq('status', 'cancelado');

    const fluxo = [
      ...(trans||[]).map(t => ({...t, origem: 'manual', data: t.data_movimento})),
      ...(recebs||[]).map(r => ({id: `r-${r.id}`, origem: 'contrato', tipo: 'receita', descricao: `Parc. ${r.numero_parcela}/${r.total_parcelas_origem} - ${r.contratos?.clientes?.nome}`, valor: r.valor_parcela, categoria: 'Venda', data: r.data_vencimento, status: r.status, original_id: r.id}))
    ].sort((a,b) => new Date(b.data) - new Date(a.data));

    const audit = (conts||[]).map(c => {
      const gastos = (trans||[]).filter(t => t.contrato_id === c.id && t.tipo === 'despesa').reduce((a,b)=>a+b.valor,0);
      return { ...c, custo_real: gastos, lucro: c.valor_total - gastos, margem: c.valor_total ? ((c.valor_total - gastos)/c.valor_total)*100 : 0 };
    });

    setExtrato(fluxo); setAuditoria(audit); setContratos(conts||[]);
  };

  const salvarTransacao = async (e) => {
    e.preventDefault();
    await supabase.from('transacoes').insert([{ ...novaTransacao, contrato_id: novaTransacao.contrato_id || null, status: 'realizado' }]);
    setShowModal(false); setNovaTransacao({ tipo: 'despesa', descricao: '', valor: '', categoria: 'Material', contrato_id: '', data_movimento: new Date().toISOString().split('T')[0] });
    carregarDados();
  };

  const exportarCSV = () => {
    const dados = tab === 'fluxo' ? extrato : auditoria;
    const header = tab === 'fluxo' ? "Data,Descricao,Categoria,Valor,Status\n" : "Contrato,Cliente,Venda,Custo,Lucro\n";
    const csv = dados.map(i => tab === 'fluxo' ? `${i.data},${i.descricao},${i.categoria},${i.valor},${i.status}` : `${i.numero_contrato},${i.clientes?.nome},${i.valor_total},${i.custo_real},${i.lucro}`).join('\n');
    const blob = new Blob(["\uFEFF"+header+csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Relatorio_${tab}.csv`; link.click();
  };

  const itensVisiveis = (tab === 'fluxo' ? extrato : auditoria).filter(i => {
    const dataRef = tab === 'fluxo' ? i.data : i.created_at;
    if(filtroDataIni && new Date(dataRef) < new Date(filtroDataIni)) return false;
    if(filtroDataFim && new Date(dataRef) > new Date(filtroDataFim)) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Financeiro</h1><p className="text-slate-500">Gestão de caixa e resultados.</p></div>
          <div className="flex gap-3">
              <Button variant="secondary" onClick={exportarCSV}><Download size={18}/> Exportar</Button>
              <Button variant="secondary" onClick={()=>window.print()}><Printer size={18}/> Imprimir</Button>
              <Button onClick={() => setShowModal(true)} className="shadow-lg shadow-blue-500/30"><PlusCircle size={20}/> Lançar</Button>
          </div>
      </div>
      
      <Card className="flex flex-col md:flex-row gap-6 justify-between items-center bg-slate-50/50">
        <div className="flex p-1 bg-slate-200/50 rounded-xl">
          <button onClick={()=>setTab('fluxo')} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${tab==='fluxo'?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Fluxo de Caixa</button>
          <button onClick={()=>setTab('auditoria')} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${tab==='auditoria'?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Auditoria de Obras</button>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <Filter size={18} className="text-slate-400 ml-2"/> 
          <input type="date" className="border-0 bg-transparent font-medium text-slate-600 outline-none" value={filtroDataIni} onChange={e=>setFiltroDataIni(e.target.value)}/> 
          <span className="text-slate-300">à</span> 
          <input type="date" className="border-0 bg-transparent font-medium text-slate-600 outline-none" value={filtroDataFim} onChange={e=>setFiltroDataFim(e.target.value)}/>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                  {(tab==='fluxo' ? ['Data','Descrição','Categoria','Status','Valor'] : ['Contrato','Cliente','Venda','Custos','Resultado','Margem']).map((h,i) => (
                      <th key={i} className={`p-5 text-xs font-bold text-slate-500 uppercase tracking-wider ${i>=2?'text-right':''}`}>{h}</th>
                  ))}
              </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {itensVisiveis.map((t,i) => tab === 'fluxo' ? (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-medium text-slate-600">{new Date(t.data).toLocaleDateString()}</td>
                <td className="p-5 font-bold text-slate-700">{t.descricao}</td>
                <td className="p-5"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{t.categoria}</span></td>
                <td className="p-5"><StatusBadge status={t.status}/></td>
                <td className={`p-5 text-right font-extrabold ${t.tipo==='receita'?'text-emerald-600':'text-rose-600'}`}>{t.tipo==='despesa'?'-':''} {BRL(t.valor)}</td>
              </tr>
            ) : (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-mono font-bold text-blue-600">{t.numero_contrato}</td>
                <td className="p-5 font-medium text-slate-700">{t.clientes?.nome}</td>
                <td className="p-5 text-right font-bold text-slate-700">{BRL(t.valor_total)}</td>
                <td className="p-5 text-right font-bold text-rose-600">- {BRL(t.custo_real)}</td>
                <td className={`p-5 text-right font-extrabold ${t.lucro>=0?'text-emerald-600':'text-rose-600'}`}>{BRL(t.lucro)}</td>
                <td className="p-5 text-right"><span className={`px-3 py-1 rounded-full text-xs font-extrabold ${t.margem>30?'bg-emerald-100 text-emerald-700':t.margem>10?'bg-yellow-100 text-yellow-700':'bg-rose-100 text-rose-700'}`}>{t.margem.toFixed(1)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {itensVisiveis.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">Nenhum registro encontrado para o período.</div>}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Novo Lançamento</h2>
            <form onSubmit={salvarTransacao} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Select value={novaTransacao.tipo} onChange={e=>setNovaTransacao({...novaTransacao, tipo:e.target.value})}>
                  <option value="despesa">Saída</option><option value="receita">Entrada</option>
                </Select>
                <Input type="date" value={novaTransacao.data_movimento} onChange={e=>setNovaTransacao({...novaTransacao, data_movimento:e.target.value})}/>
              </div>
              <Input placeholder="Descrição" value={novaTransacao.descricao} onChange={e=>setNovaTransacao({...novaTransacao, descricao:e.target.value})}/>
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder="Valor" value={novaTransacao.valor} onChange={e=>setNovaTransacao({...novaTransacao, valor:e.target.value})}/>
                <Select value={novaTransacao.categoria} onChange={e=>setNovaTransacao({...novaTransacao, categoria:e.target.value})}>
                  <option>Material</option><option>Mão de Obra</option><option>Administrativo</option><option>Venda</option>
                </Select>
              </div>
              <Select value={novaTransacao.contrato_id} onChange={e=>setNovaTransacao({...novaTransacao, contrato_id:e.target.value})}>
                <option value="">-- Sem Vínculo (Opocional) --</option>{contratos.map(c=><option key={c.id} value={c.id}>{c.numero_contrato} - {c.clientes?.nome}</option>)}
              </Select>
              <div className="flex gap-3 mt-4">
                <Button type="button" variant="secondary" onClick={()=>setShowModal(false)} className="flex-1">Cancelar</Button>
                <Button className="flex-1">Confirmar Lançamento</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- 6. PARCEIROS ---
function Parceiros() {
  const [parceiros, setParceiros] = useState([]);
  const [novo, setNovo] = useState({ nome: '', tipo: 'Arquiteto', telefone: '' });
  useEffect(() => { carregarDados(); }, []);
  const carregarDados = async () => {
    const { data: partners } = await supabase.from('indicadores').select('*');
    const { data: vendas } = await supabase.from('contratos').select('indicador_id, valor_total').eq('status', 'vendido');
    const ranking = (partners || []).map(p => {
      const total = (vendas || []).filter(v => v.indicador_id === p.id).reduce((acc, curr) => acc + (curr.valor_total||0), 0);
      return { ...p, totalVendido: total };
    }).sort((a, b) => b.totalVendido - a.totalVendido);
    setParceiros(ranking);
  };
  const salvarParceiro = async (e) => {
    e.preventDefault(); await supabase.from('indicadores').insert([novo]);
    setNovo({ nome: '', tipo: 'Arquiteto', telefone: '' }); carregarDados();
  };
  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-extrabold text-slate-800">Parceiros</h1><p className="text-slate-500">Programa de relacionamento e ranking.</p></div>
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="h-fit">
          <h2 className="font-bold text-xl mb-6 flex items-center gap-2 text-blue-700"><PlusCircle size={24}/> Novo Parceiro</h2>
          <form onSubmit={salvarParceiro} className="space-y-4">
            <Input required placeholder="Nome Completo" value={novo.nome} onChange={e=>setNovo({...novo, nome:e.target.value})} />
            <Select value={novo.tipo} onChange={e=>setNovo({...novo, tipo:e.target.value})}><option>Arquiteto</option><option>Designer de Interiores</option><option>Engenheiro</option><option>Corretor</option></Select>
            <Input placeholder="Telefone/WhatsApp" value={novo.telefone} onChange={e=>setNovo({...novo, telefone:e.target.value})} />
            <Button className="w-full">Cadastrar Parceiro</Button>
          </form>
        </Card>
        <Card className="md:col-span-2 p-0 overflow-hidden"><div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100"><h2 className="font-bold text-xl flex items-center gap-3 text-yellow-700"><Award size={24}/> Ranking de Vendas</h2></div>
          <div className="divide-y divide-slate-50">
            {parceiros.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-full font-extrabold text-white text-lg shadow-md ${i===0?'bg-gradient-to-br from-yellow-400 to-orange-500':i===1?'bg-gradient-to-br from-slate-300 to-slate-400':i===2?'bg-gradient-to-br from-orange-300 to-red-400':'bg-blue-100 text-blue-600 shadow-none'}`}>{i+1}</div>
                  <div><p className="font-bold text-slate-800 text-lg">{p.nome}</p><p className="text-xs uppercase font-bold text-slate-400 tracking-wider">{p.tipo}</p></div>
                </div>
                <div className="text-right"><p className="font-extrabold text-emerald-600 text-xl">{BRL(p.totalVendido)}</p><p className="text-xs text-slate-400 font-medium">em vendas</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// --- 7. GESTÃO DE CONTRATO ---
function DetalhesContrato() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [contrato, setContrato] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [transacoesReais, setTransacoesReais] = useState([]);
  const [tab, setTab] = useState('geral');
  const [expandedAmbiente, setExpandedAmbiente] = useState(null);
  const [modoImpressao, setModoImpressao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCustoModal, setShowCustoModal] = useState(false);
  const [novoCusto, setNovoCusto] = useState({ descricao: '', valor: '', categoria: 'Material' });

  useEffect(() => { carregarTudo(); }, [id, location]);

  const carregarTudo = async () => {
    if(!id) return;
    const { data: cont } = await supabase.from('contratos').select('*, clientes(*), pendencias(*)').eq('id', id).single();
    const { data: pags } = await supabase.from('pagamentos_contrato').select('*').eq('contrato_id', id).order('data_vencimento');
    const { data: trans } = await supabase.from('transacoes').select('*').eq('contrato_id', id).eq('tipo', 'despesa').order('data_movimento');
    setContrato(cont); setPagamentos(pags||[]); setTransacoesReais(trans||[]);
    const searchParams = new URLSearchParams(location.search);
    if(searchParams.get('imprimir') === 'true') { setModoImpressao(true); setTimeout(() => window.print(), 1000); }
  };

  const atualizarData = async (campo, valor) => { await supabase.from('contratos').update({ [campo]: valor }).eq('id', id); setContrato(prev => ({...prev, [campo]: valor})); };

  const cancelarContrato = async () => {
    if(!window.confirm("ATENÇÃO: Deseja realmente cancelar?")) return;
    const motivo = prompt("Motivo:"); if(!motivo) return;
    setLoading(true);
    try {
      await supabase.from('contratos').update({ status: 'cancelado', motivo_cancelamento: motivo }).eq('id', id);
      await supabase.from('pendencias').update({ status: 'cancelado' }).eq('contrato_id', id);
      await supabase.from('pagamentos_contrato').update({ status: 'cancelado' }).eq('contrato_id', id);
      alert("Contrato cancelado."); navigate('/comercial');
    } catch(e) { alert("Erro: " + e.message); } finally { setLoading(false); }
  };

  const lancarCustoDireto = async (e) => {
    e.preventDefault();
    await supabase.from('transacoes').insert([{ tipo: 'despesa', contrato_id: id, descricao: novoCusto.descricao, valor: novoCusto.valor, categoria: novoCusto.categoria, data_movimento: new Date().toISOString().split('T')[0], status: 'realizado' }]);
    setShowCustoModal(false); setNovoCusto({ descricao: '', valor: '', categoria: 'Material' }); carregarTudo();
  };

  if(!contrato) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  
  if (modoImpressao) {
    return (
      <div className="bg-white min-h-screen p-12 font-serif text-slate-800">
        <div className="text-center border-b-4 border-double border-slate-800 pb-6 mb-10"><h1 className="text-3xl font-bold uppercase tracking-wider">{EMPRESA.nome}</h1><p className="text-slate-600 mt-2 font-medium">{EMPRESA.cnpj} | {EMPRESA.endereco}</p><h2 className="text-2xl font-bold mt-10 bg-slate-100 py-2 inline-block px-6 rounded">CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {contrato.numero_contrato}</h2></div>
        <div className="mb-8 text-justify leading-relaxed text-lg space-y-6 px-4">
           <p>Pelo presente instrumento, <strong>{EMPRESA.nome}</strong> (CONTRATADA) e <strong>{contrato.clientes.nome}</strong> (CONTRATANTE), inscrito no CPF sob nº <strong>{contrato.clientes.cpf}</strong>, residente e domiciliado(a) em <strong>{contrato.clientes.endereco}, {contrato.clientes.numero} - {contrato.clientes.bairro}</strong>.</p>
           <p><strong>CLÁUSULA PRIMEIRA - DO OBJETO:</strong> O presente contrato tem por objeto o fornecimento e instalação dos produtos descritos no orçamento aprovado, abrangendo os seguintes ambientes: <strong> {contrato.itens_venda?.map(i => i.nome).join(', ')}</strong>.</p>
           <p><strong>CLÁUSULA SEGUNDA - DO PREÇO E FORMA DE PAGAMENTO:</strong> O CONTRATANTE pagará à CONTRATADA o valor total de <strong>{BRL(contrato.valor_total)}</strong>, nas seguintes condições:</p>
           <div className="ml-8 my-6 border-l-4 pl-6 border-slate-300 grid grid-cols-2 gap-y-3 text-base font-medium bg-slate-50 p-4 rounded">{pagamentos.map((p, i) => (<div key={i}>{p.numero_parcela}ª parcela: {BRL(p.valor_parcela)} - Vencimento: {new Date(p.data_vencimento).toLocaleDateString()} ({p.metodo})</div>))}</div>
           <p><strong>CLÁUSULA TERCEIRA - DOS PRAZOS:</strong> Os prazos de entrega e instalação serão contados a partir da data da medição final técnica e aprovação do projeto executivo pelo contratante.</p>
        </div>
        <div className="mt-24 pt-10 border-t border-slate-800 grid grid-cols-2 gap-20 text-center font-bold"><div>__________________________________________<br/>{EMPRESA.nome}<br/><span className="text-xs font-normal">Contratada</span></div><div>__________________________________________<br/>{contrato.clientes.nome}<br/><span className="text-xs font-normal">Contratante</span></div></div>
        <div className="fixed bottom-10 right-10 print:hidden flex gap-4"><Button onClick={()=>window.print()}><Printer/> Imprimir Contrato</Button><Button variant="secondary" onClick={() => setModoImpressao(false)}>Voltar</Button></div>
      </div>
    );
  }

  const totalVendido = contrato.valor_total || 0;
  const totalGasto = transacoesReais.reduce((acc, t) => acc + (t.valor||0), 0);
  const lucroObra = totalVendido - totalGasto;

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4"><button onClick={() => navigate('/comercial')} className="p-3 hover:bg-white rounded-full shadow-sm border border-slate-100 transition"><ArrowLeft className="text-slate-600" /></button><div><h1 className="text-3xl font-extrabold text-slate-800">Contrato {contrato.numero_contrato}</h1><StatusBadge status={contrato.status}/></div></div>
        <div className="flex gap-3"><Button variant="secondary" onClick={() => setModoImpressao(true)}><Printer size={18}/> Imprimir</Button>{contrato.status !== 'cancelado' && <Button variant="danger" onClick={cancelarContrato} disabled={loading}><XCircle size={18}/> Cancelar Contrato</Button>}</div>
      </div>
      
      <Card className="p-2 bg-slate-50/80 flex gap-2">
          {['geral', 'cronograma', 'financeiro'].map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-6 py-3 rounded-xl font-bold capitalize transition-all flex-1 ${tab===t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}>{t}</button>
          ))}
      </Card>

      {tab === 'geral' && (
        <div className="grid md:grid-cols-2 gap-8">
          <Card><h3 className="font-bold text-xl mb-6 text-blue-700 flex items-center gap-2"><User/> Dados do Cliente</h3><div className="space-y-4 text-slate-600"><div className="flex justify-between border-b pb-2"><strong>Nome:</strong> <span>{contrato.clientes?.nome}</span></div><div className="flex justify-between border-b pb-2"><strong>CPF:</strong> <span>{contrato.clientes?.cpf}</span></div><div className="flex justify-between border-b pb-2"><strong>Contato:</strong> <span>{contrato.clientes?.telefone}</span></div><div><strong>Endereço:</strong> <p className="mt-1">{contrato.clientes?.endereco}, {contrato.clientes?.numero} - {contrato.clientes?.bairro}</p></div></div></Card>
          <Card><h3 className="font-bold text-xl mb-6 text-emerald-700 flex items-center gap-2"><Briefcase/> Ambientes & Itens</h3><div className="space-y-4">{contrato.itens_venda?.map((amb, i) => (<div key={i} className="border-2 border-slate-100 rounded-xl overflow-hidden"><button onClick={() => setExpandedAmbiente(expandedAmbiente === i ? null : i)} className="flex justify-between w-full items-center text-left p-4 bg-slate-50 hover:bg-slate-100 transition"><span className="font-bold flex items-center gap-3 text-slate-700"><Briefcase size={18} className="text-slate-400"/> {amb.nome}</span>{expandedAmbiente === i ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}</button>{expandedAmbiente === i && (<div className="p-4 bg-white border-t border-slate-100"><table className="w-full text-sm"><thead className="text-slate-400 font-bold uppercase text-xs"><tr><th className="text-left pb-2">Item</th><th className="text-right pb-2">Ref. Custo</th></tr></thead><tbody className="divide-y divide-slate-50">{amb.itens?.map((peca, k) => (<tr key={k}><td className="py-2 font-medium text-slate-600">{peca.descricao}</td><td className="py-2 text-right font-mono text-slate-500">{BRL(peca.custo)}</td></tr>))}</tbody></table></div>)}</div>))}</div></Card>
        </div>
      )}
      {tab === 'cronograma' && (<Card><h3 className="font-bold text-xl mb-8 flex items-center gap-2 text-amber-700"><Clock/> Gestão de Prazos</h3><div className="grid md:grid-cols-3 gap-8">{['data_medicao_tecnica', 'data_pedido_fabrica', 'data_previsao_chegada', 'data_chegada_real', 'data_agendamento_montagem', 'data_conclusao_obra'].map((c, i) => (<div key={c} className={`p-4 rounded-xl border-2 ${contrato[c] ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 bg-slate-50/30'}`}><label className="text-xs font-bold block mb-2 uppercase text-slate-500 tracking-wider flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">{i+1}</span> {c.replace('data_','').replace(/_/g,' ')}</label><Input type="date" value={contrato[c] || ''} onChange={e=>atualizarData(c, e.target.value)} className="bg-white"/></div>))}</div></Card>)}
      {tab === 'financeiro' && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100"><h3 className="text-emerald-800 font-bold mb-1">Valor Vendido</h3><p className="text-4xl font-extrabold text-emerald-600">{BRL(totalVendido)}</p></Card>
            <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-100"><h3 className="text-rose-800 font-bold mb-1">Custos Realizados</h3><p className="text-4xl font-extrabold text-rose-600">{BRL(totalGasto)}</p></Card>
            <Card className={`bg-gradient-to-br ${lucroObra>=0?'from-blue-50 to-indigo-50 border-blue-100':'from-orange-50 to-red-50 border-orange-100'}`}><h3 className={`${lucroObra>=0?'text-blue-800':'text-orange-800'} font-bold mb-1`}>Resultado da Obra</h3><p className={`text-4xl font-extrabold ${lucroObra>=0?'text-blue-600':'text-orange-600'}`}>{BRL(lucroObra)}</p></Card>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-0 overflow-hidden"><div className="p-6 bg-slate-50 border-b font-bold text-lg text-slate-700">Parcelas a Receber</div><table className="w-full text-left text-sm"><thead className="bg-white text-slate-500 border-b"><tr><th className="p-4">Vencimento</th><th className="p-4">Valor</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y divide-slate-50">{pagamentos.map(p => (<tr key={p.id} className="hover:bg-slate-50/50"><td className="p-4 font-medium">{new Date(p.data_vencimento).toLocaleDateString()}</td><td className="p-4 font-bold text-slate-700">{BRL(p.valor_parcela)}</td><td className="p-4"><StatusBadge status={p.status}/></td></tr>))}</tbody></table></Card>
            <Card className="p-0 overflow-hidden relative"><div className="p-6 bg-slate-50 border-b font-bold text-lg text-slate-700 flex justify-between items-center"><span>Despesas da Obra</span><Button size="sm" variant="danger" onClick={()=>setShowCustoModal(true)} className="text-xs px-3 py-1"><PlusCircle size={14}/> Lançar Custo</Button></div><table className="w-full text-left text-sm"><thead className="bg-white text-slate-500 border-b"><tr><th className="p-4">Data</th><th className="p-4">Descrição</th><th className="p-4 text-right">Valor</th></tr></thead><tbody className="divide-y divide-slate-50">{transacoesReais.map(t => (<tr key={t.id} className="hover:bg-slate-50/50"><td className="p-4 font-medium">{new Date(t.data_movimento).toLocaleDateString()}</td><td className="p-4">{t.descricao} <span className="text-slate-400 text-xs">({t.categoria})</span></td><td className="p-4 text-right font-bold text-rose-600">- {BRL(t.valor)}</td></tr>))}</tbody></table>{transacoesReais.length===0 && <div className="p-8 text-center text-slate-400 italic">Nenhum custo lançado para esta obra.</div>}</Card>
          </div>
        </div>
      )}
      {showCustoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-80 shadow-2xl">
            <h3 className="font-bold text-xl mb-6 text-rose-700">Novo Custo</h3>
            <form onSubmit={lancarCustoDireto} className="space-y-4">
              <Input required placeholder="Descrição (ex: Vidraçaria)" value={novoCusto.descricao} onChange={e=>setNovoCusto({...novoCusto, descricao:e.target.value})}/>
              <Input required type="number" placeholder="Valor R$" value={novoCusto.valor} onChange={e=>setNovoCusto({...novoCusto, valor:e.target.value})}/>
              <Select value={novoCusto.categoria} onChange={e=>setNovoCusto({...novoCusto, categoria:e.target.value})}>
                <option>Material</option><option>Mão de Obra</option><option>Instalação</option><option>Outros</option>
              </Select>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={()=>setShowCustoModal(false)} className="flex-1">Cancelar</Button>
                <Button variant="danger" className="flex-1">Salvar Despesa</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- 8. FLUXO COMERCIAL ---
function Orcamento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [etapa, setEtapa] = useState(1); 
  const [clienteNome, setClienteNome] = useState('');
  const [ambientes, setAmbientes] = useState([]); 
  const [descontoPercent, setDescontoPercent] = useState(0);
  const [indicadores, setIndicadores] = useState([]);
  const [indicadorId, setIndicadorId] = useState('');

  const FATOR_MULTIPLICACAO = 3.97;

  useEffect(() => { supabase.from('indicadores').select('*').then(({data}) => setIndicadores(data||[])) }, []);

  const custoGeral = ambientes.reduce((acc, amb) => acc + amb.custoTotal, 0);
  const valorVendaTabela = custoGeral * FATOR_MULTIPLICACAO;
  const valorDesconto = valorVendaTabela * (descontoPercent / 100);
  const valorFinal = valorVendaTabela - valorDesconto;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const promessas = files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const itens = text.split('\n').map(line => {
           const parts = line.split(/[;,]/);
           return parts.length > 1 ? { descricao: parts[0].trim(), custo: parseFloat(parts[1].replace(/[R$ ]/g, '').replace(',', '.')) || 0 } : null;
        }).filter(Boolean);
        const custoTotal = itens.reduce((a, b) => a + b.custo, 0);
        resolve({ nome: file.name.replace(/\.[^/.]+$/, ""), itens, custoTotal });
      };
      reader.readAsText(file);
    }));
    Promise.all(promessas).then(novos => setAmbientes([...ambientes, ...novos]));
  };

  const handleAprovar = async () => {
    if (!clienteNome) return alert("Preencha o nome.");
    const { data: orc, error } = await supabase.from('orcamentos').insert([{
      cliente_nome: clienteNome, ambientes: ambientes, custo_total: custoGeral, markup_percentual: (FATOR_MULTIPLICACAO - 1) * 100,
      valor_venda_sugerido: valorVendaTabela, desconto: valorDesconto, desconto_percentual: descontoPercent, valor_final: valorFinal, status: 'aprovado', vendedor_id: user.id, indicador_id: indicadorId || null
    }]).select().single();
    if (!error) navigate(`/fechamento/${orc.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      <div className="flex items-center gap-4"><button onClick={() => etapa===1?navigate('/comercial'):setEtapa(1)} className="p-3 hover:bg-white rounded-full shadow-sm border border-slate-100 transition"><ArrowLeft className="text-slate-600" /></button><div><h1 className="text-3xl font-extrabold text-slate-800">{etapa === 1 ? 'Nova Proposta' : 'Fechamento Comercial'}</h1><p className="text-slate-500">{etapa === 1 ? 'Importe os arquivos do Promob/SketchUp.' : 'Defina os valores finais para o cliente.'}</p></div></div>
      {etapa === 1 && (
        <div className="grid md:grid-cols-5 gap-8">
          <Card className="md:col-span-3 border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-400 transition-all group text-center flex flex-col justify-center items-center min-h-[400px]">
            <div className="p-6 bg-white rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform"><Upload size={40} className="text-blue-500"/></div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">Arraste ou clique para importar .txt</h2>
            <p className="text-slate-500 mb-6 max-w-xs mx-auto">Suporta múltiplos arquivos de ambientes.</p>
            <input type="file" multiple accept=".txt" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
            {ambientes.length > 0 && <div className="mt-8 w-full max-w-md text-left space-y-3 z-20 relative"><p className="font-bold text-slate-700 uppercase tracking-wider text-sm border-b pb-2">Ambientes Carregados ({ambientes.length})</p>{ambientes.map((amb, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-xl shadow-sm"><span className="font-bold flex items-center gap-3 text-slate-700"><FileText size={18} className="text-blue-400"/> {amb.nome}</span><button onClick={(e) => {e.stopPropagation(); setAmbientes(ambientes.filter((_, i) => i !== idx))}} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"><Trash2 size={18}/></button></div>))}</div>}
          </Card>
          <Card className="md:col-span-2 flex flex-col h-fit">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Dados da Proposta</h2>
            <div className="space-y-5 flex-1">
                <div><label className="block text-sm font-bold text-slate-600 mb-2">Nome do Cliente</label><Input placeholder="Ex: Sr. João Silva" value={clienteNome} onChange={e => setClienteNome(e.target.value)} /></div>
                <div><label className="block text-sm font-bold text-slate-600 mb-2">Profissional Indicador (Opcional)</label><Select value={indicadorId} onChange={e => setIndicadorId(e.target.value)}><option value="">-- Sem Indicação --</option>{indicadores.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.tipo})</option>)}</Select></div>
            </div>
            <Button onClick={() => ambientes.length > 0 ? setEtapa(2) : alert('Adicione arquivos.')} className="w-full mt-8 py-4 text-lg" disabled={ambientes.length === 0}>{ambientes.length === 0 ? 'Importe Arquivos Primeiro' : 'Gerar Valores'}</Button>
          </Card>
        </div>
      )}
      {etapa === 2 && (
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="h-fit bg-slate-50/50 border-slate-200"><h2 className="text-lg font-bold text-slate-700 uppercase mb-6 flex gap-2 items-center"><Calculator size={20}/> Ajuste Fino</h2><div className="space-y-6"><div><label className="text-sm font-bold text-slate-600 block mb-2">Desconto Comercial (%)</label><div className="relative"><Input type="number" className="pr-12 text-right font-bold text-lg" value={descontoPercent} onChange={e => setDescontoPercent(Number(e.target.value))} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span></div><p className="text-sm text-emerald-600 mt-2 font-bold text-right">Redução de {BRL(valorDesconto)}</p></div><div className="pt-6 border-t border-slate-200"><p className="text-sm text-slate-500 mb-1">Valor de Tabela (Base)</p><p className="text-xl font-bold text-slate-700 line-through decoration-red-400/50">{BRL(valorVendaTabela)}</p></div></div></Card>
          <Card className="md:col-span-2 relative overflow-hidden border-blue-100 shadow-blue-100/50">
            <div className="absolute top-0 right-0 p-6 opacity-10"><Briefcase size={120} className="text-blue-900"/></div>
            <div className="relative z-10">
                <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-6"><div><p className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Proposta para</p><h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">{clienteNome || 'Cliente'}</h2></div><div className="text-right"><p className="text-xs text-slate-400 font-bold uppercase mb-1">Data</p><p className="font-mono font-medium text-slate-600">{new Date().toLocaleDateString()}</p></div></div>
                <div className="space-y-4 mb-10">{ambientes.map((amb, idx) => (<div key={idx} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition"><h3 className="font-bold text-xl text-slate-700 flex items-center gap-3 group-hover:text-blue-700 transition"><span className="bg-blue-50 p-2 rounded-lg text-blue-500"><Briefcase size={20}/></span> {amb.nome}</h3><span className="font-extrabold text-xl text-slate-800">{BRL(amb.custoTotal * FATOR_MULTIPLICACAO)}</span></div>))}</div>
                <div className="flex flex-col items-end border-t border-slate-100 pt-8"><p className="text-slate-500 font-medium uppercase tracking-wider mb-2">Valor Final da Proposta</p><div className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-800 tracking-tighter">{BRL(valorFinal)}</div></div>
                <div className="mt-12 flex gap-4 justify-end"><Button onClick={handleAprovar} className="px-10 py-5 text-xl shadow-xl shadow-blue-500/20 hover:scale-105"><CheckCircle size={28} /> Aprovar e Fechar Negócio</Button></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Fechamento() {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [orcamento, setOrcamento] = useState(null); const [cliente, setCliente] = useState({ nome: '', cpf: '', email: '', telefone: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '' });
  const [pagamentos, setPagamentos] = useState([]); const [novoPagamento, setNovoPagamento] = useState({ metodo: 'CARTÃO DE CRÉDITO', parcelas: 1, valor: 0, dataInicio: new Date().toISOString().split('T')[0] });
  useEffect(() => { supabase.from('orcamentos').select('*').eq('id', id).single().then(({data}) => { if(data) { setOrcamento(data); setCliente(p=>({...p, nome: data.cliente_nome})); setNovoPagamento(p=>({...p, valor: data.valor_final})) } }); }, [id]);
  const buscarCep = async () => { const r = await fetch(`https://viacep.com.br/ws/${cliente.cep.replace(/\D/g,'')}/json/`); const d = await r.json(); if(!d.erro) setCliente(p=>({...p, endereco: d.logradouro, bairro: d.bairro, cidade: d.localidade})); };
  const addPag = () => { const v = novoPagamento.valor/novoPagamento.parcelas; const arr=[]; for(let i=0;i<novoPagamento.parcelas;i++){ const d=new Date(novoPagamento.dataInicio); d.setMonth(d.getMonth()+i); arr.push({metodo: novoPagamento.metodo, valor: v, vencimento: d.toISOString().split('T')[0], parcela: `${i+1}/${novoPagamento.parcelas}`}); } setPagamentos([...pagamentos, ...arr]); };
  const finalizar = async () => {
    if(!validarCPF(cliente.cpf)) return alert("CPF Inválido");
    const {data: cli, error: e1} = await supabase.from('clientes').insert([cliente]).select().single(); if(e1) return alert(e1.message);
    const descritivo = orcamento.ambientes ? orcamento.ambientes.map(a => a.nome).join(', ') : "Venda Geral";
    const {data: cont, error: e2} = await supabase.from('contratos').insert([{cliente_id: cli.id, vendedor_id: user.id, numero_contrato: `CTR-${Math.floor(Math.random()*100000)}`, valor_total: orcamento.valor_final, descricao_venda: descritivo, forma_pagamento: "Múltiplo", condicoes_pagamento: "Detalhado", orcamento_origem_id: orcamento.id, status: 'vendido', itens_venda: orcamento.ambientes, indicador_id: orcamento.indicador_id}]).select().single(); if(e2) return alert(e2.message);
    const parcs = pagamentos.map((p,i) => ({contrato_id: cont.id, metodo: p.metodo, valor_parcela: p.valor, data_vencimento: p.vencimento, numero_parcela: i+1, total_parcelas_origem: pagamentos.length, status: 'pendente'}));
    await supabase.from('pagamentos_contrato').insert(parcs); await supabase.from('pendencias').insert([{cliente_id: cli.id, contrato_id: cont.id, descricao: "Medição Técnica", status: 'aberto', observacao_tecnica: descritivo}]);
    navigate(`/contrato/${cont.id}?imprimir=true`);
  };
  if(!orcamento) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      <div><h1 className="text-3xl font-extrabold text-slate-800">Fechamento do Contrato</h1><p className="text-slate-500">Dados finais para emissão.</p></div>
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 space-y-6"><h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><User className="text-blue-500"/> Dados do Cliente</h2><div className="grid md:grid-cols-2 gap-4"><Input placeholder="Nome Completo" value={cliente.nome} onChange={e=>setCliente({...cliente, nome:e.target.value})} className="md:col-span-2" /><Input placeholder="CPF (000.000.000-00)" value={cliente.cpf} onChange={e=>setCliente({...cliente, cpf:e.target.value})} /><Input placeholder="Telefone/Celular" value={cliente.telefone} onChange={e=>setCliente({...cliente, telefone:e.target.value})} /><Input placeholder="CEP (Busca Automática)" value={cliente.cep} onChange={e=>setCliente({...cliente, cep:e.target.value})} onBlur={buscarCep} /><Input placeholder="Número" value={cliente.numero} onChange={e=>setCliente({...cliente, numero:e.target.value})} /><Input placeholder="Endereço" value={cliente.endereco} onChange={e=>setCliente({...cliente, endereco:e.target.value})} className="md:col-span-2 bg-slate-100" /><Input placeholder="Bairro" value={cliente.bairro} onChange={e=>setCliente({...cliente, bairro:e.target.value})} className="bg-slate-100"/><Input placeholder="Complemento" value={cliente.complemento} onChange={e=>setCliente({...cliente, complemento:e.target.value})} /></div></Card>
        <div className="space-y-6">
          <Card className="bg-slate-50/50 border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="text-emerald-500"/> Pagamento</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select value={novoPagamento.metodo} onChange={e=>setNovoPagamento({...novoPagamento, metodo:e.target.value})}>
                  {['CARTÃO DE CRÉDITO','BOLETO','PIX','DINHEIRO','TRANSFERÊNCIA'].map(m=><option key={m}>{m}</option>)}
                </Select>
                <Select value={novoPagamento.parcelas} onChange={e=>setNovoPagamento({...novoPagamento, parcelas:Number(e.target.value)})}>
                  {[...Array(24)].map((_,i)=><option key={i} value={i+1}>{i+1}x</option>)}
                </Select>
              </div>
              <Input type="number" placeholder="Valor R$" value={novoPagamento.valor} onChange={e=>setNovoPagamento({...novoPagamento, valor:Number(e.target.value)})} className="font-bold text-lg" />
              <Input type="date" value={novoPagamento.dataInicio} onChange={e=>setNovoPagamento({...novoPagamento, dataInicio:e.target.value})} label="1º Vencimento"/>
              <Button onClick={addPag} variant="success" className="w-full py-3">Adicionar Parcelas</Button>
            </div>
            <div className="mt-6 space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {pagamentos.map((p,i) => (
                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm">
                  <span className="font-bold text-slate-600">{p.parcela} - {p.metodo}</span>
                  <div className="text-right"><p className="font-extrabold text-slate-800">{BRL(p.valor)}</p><p className="text-xs text-slate-400">{new Date(p.vencimento).toLocaleDateString()}</p></div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="bg-slate-800 text-white border-0 shadow-xl shadow-slate-900/20"><h3 className="font-bold text-lg mb-4 border-b border-slate-700/50 pb-3">Resumo da Venda</h3><div className="space-y-3 mb-6"><div className="flex justify-between text-slate-300"><span>Total da Proposta:</span><span className="font-bold text-white">{BRL(orcamento.valor_final)}</span></div><div className="flex justify-between text-slate-300"><span>Total Lançado:</span><span className="font-bold text-emerald-400">{BRL(pagamentos.reduce((a,b)=>a+b.valor,0))}</span></div></div><Button onClick={finalizar} className="w-full py-4 text-lg shadow-lg shadow-blue-900/30">Finalizar e Imprimir Contrato</Button></Card>
        </div>
      </div>
    </div>
  );
}

function Comercial() { 
  const [activeTab, setActiveTab] = useState('contratos'); const [lista, setLista] = useState([]); const navigate = useNavigate();
  useEffect(() => { const f = () => supabase.from(activeTab).select(activeTab==='contratos'?'*, clientes(nome)':'*').order('created_at', {ascending:false}).then(({data})=>setLista(data||[])); f(); const i = setInterval(f, 2000); return ()=>clearInterval(i); }, [activeTab]);
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center"><div><h1 className="text-3xl font-extrabold text-slate-800">Comercial</h1><p className="text-slate-500">Gestão de vendas e propostas.</p></div><Link to="/novo-orcamento"><Button className="shadow-lg shadow-blue-500/30 py-3 px-6"><PlusCircle size={20}/> Nova Proposta</Button></Link></div>
      <Card className="p-2 bg-slate-50/80 flex gap-2 mb-6">
        <button onClick={()=>setActiveTab('contratos')} className={`px-6 py-3 rounded-xl font-bold transition-all flex-1 ${activeTab==='contratos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}>Contratos Fechados</button>
        <button onClick={()=>setActiveTab('orcamentos')} className={`px-6 py-3 rounded-xl font-bold transition-all flex-1 ${activeTab==='orcamentos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}>Propostas em Aberto</button>
      </Card>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100"><tr><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Ref.</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th><th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-50">{lista.map(i => (<tr key={i.id} onClick={()=>activeTab==='contratos' && navigate(`/contrato/${i.id}`)} className={`hover:bg-slate-50/50 transition-colors ${activeTab==='contratos'?'cursor-pointer group':''}`}><td className="p-5 font-mono font-bold text-blue-600 group-hover:text-blue-700 transition">{i.numero_contrato || `#${i.id}`}</td><td className="p-5 font-medium text-slate-700">{activeTab==='contratos'?i.clientes?.nome:i.cliente_nome}</td><td className="p-5 text-right font-extrabold text-slate-800">{BRL(i.valor_total || i.valor_final)}</td><td className="p-5 text-center"><StatusBadge status={i.status}/></td></tr>))}</tbody>
        </table>
        {lista.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">Nenhum registro encontrado.</div>}
      </Card>
    </div>
  );
}

// --- 8. OUTROS ---
function Assistencia() { const [t, setT] = useState([]); useEffect(() => { supabase.from('pendencias').select('*, clientes(nome,endereco), contratos(numero_contrato)').neq('status','cancelado').then(({data}) => setT(data||[])); }, []); return <div className="space-y-8"><div><h1 className="text-3xl font-extrabold text-slate-800">Técnico / Obras</h1><p className="text-slate-500">Minha rota de serviço.</p></div><div className="grid gap-6 md:grid-cols-3">{t.map(i=><Card key={i.id} className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all"><h3 className="font-bold text-lg text-slate-800 mb-1">{i.clientes?.nome}</h3><p className="text-xs font-mono text-blue-500 mb-4 bg-blue-50 inline-block px-2 py-1 rounded">{i.contratos?.numero_contrato}</p><p className="text-slate-600 italic border-l-2 border-slate-200 pl-4 py-2 bg-slate-50 rounded-r-lg">"{i.descricao}"</p></Card>)}</div></div>; }

// --- 9. ROTAS E LAYOUT FINAL ---
function LayoutContent({ children }) { return <div className="flex min-h-screen bg-[#f8fafc] font-sans"><Sidebar/><main className="flex-1 ml-72 p-10 print:ml-0 print:p-0 print:bg-white">{children}</main></div>; }
function Protegida({ children, cargosPermitidos }) { const { user, loading } = useAuth(); if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40}/></div>; if (!user) return <Navigate to="/login"/>; return <LayoutContent>{children}</LayoutContent>; }
function Login() { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const { user } = useAuth(); if (user) return <Navigate to="/"/>; return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-indigo-950"><Card className="w-96 shadow-2xl shadow-blue-900/20 p-8"><div className="text-center mb-8"><div className="bg-gradient-to-tr from-blue-500 to-indigo-400 p-3 rounded-2xl shadow-lg shadow-blue-500/20 inline-block mb-4"><Layers className="text-white" size={32} strokeWidth={1.5} /></div><h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">TemporiPro</h1><p className="text-slate-500 mt-2">Faça login para continuar.</p></div><form onSubmit={async (e) => { e.preventDefault(); await supabase.auth.signInWithPassword({email, password}); }} className="space-y-4"><Input placeholder="Seu Email" value={email} onChange={e=>setEmail(e.target.value)} /><Input type="password" placeholder="Sua Senha" value={password} onChange={e=>setPassword(e.target.value)} /><Button className="w-full py-3 text-lg shadow-lg shadow-blue-500/20">Entrar no Sistema</Button></form></Card></div>; }

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protegida cargosPermitidos={['admin','financeiro','consultor','conferente','montador','marketing']}><Dashboard /></Protegida>} />
            <Route path="/comercial" element={<Protegida cargosPermitidos={['consultor','financeiro','admin']}><Comercial /></Protegida>} />
            <Route path="/parceiros" element={<Protegida cargosPermitidos={['admin','consultor','marketing']}><Parceiros /></Protegida>} />
            <Route path="/novo-orcamento" element={<Protegida cargosPermitidos={['consultor','financeiro','admin']}><Orcamento /></Protegida>} />
            <Route path="/fechamento/:id" element={<Protegida cargosPermitidos={['consultor','financeiro','admin']}><Fechamento /></Protegida>} />
            <Route path="/contrato/:id" element={<Protegida cargosPermitidos={['consultor','financeiro','admin','conferente']}><DetalhesContrato /></Protegida>} />
            <Route path="/financeiro" element={<Protegida cargosPermitidos={['financeiro']}><Financeiro /></Protegida>} />
            <Route path="/assistencia" element={<Protegida cargosPermitidos={['consultor','conferente','montador','financeiro']}><Assistencia /></Protegida>} />
            <Route path="/marketing" element={<Protegida cargosPermitidos={['consultor','marketing','financeiro']}><Marketing /></Protegida>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}