import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Eye, X, BarChart3, HelpCircle, FileSpreadsheet } from 'lucide-react';

const ENTRY_TYPES = ['COMPOUND', 'GLYCAN', 'DRUGS', 'BIOMASS'];

const TYPE_BADGE: Record<string, string> = {
  both:     'bg-white text-slate-700 border border-slate-300',
  other:    'bg-slate-100 text-slate-500 border border-slate-200',
  reactant: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  product:  'bg-blue-50 text-blue-700 border border-blue-200',
};

const TYPE_LABEL: Record<string, string> = {
  both: 'Both', other: 'Other', reactant: 'Reactant', product: 'Product',
};

const emptyForm = {
  name: '', entryType: 'COMPOUND', formula: '',
  molecularWeight: '', charge: '', externalIdentifier: '',
};

export default function Metabolites() {
  const { name } = useParams();

  const [metabolites, setMetabolites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [inModelFilter, setInModelFilter] = useState<'All' | 'In Model'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'both' | 'reactant' | 'product' | 'other'>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Active tab (list / stats)
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Detail modal
  const [selectedMetabolite, setSelectedMetabolite] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('entry type');

  // Form modal (insert / edit)
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'insert' | 'edit'>('insert');
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formTarget, setFormTarget] = useState<any>(null); // metabolite being edited

  // ── Fetch list ──────────────────────────────────────────────────────────────

  const fetchMetabolites = async () => {
    setLoading(true);
    try {
      const inM = inModelFilter === 'In Model';
      const res = await fetch(`http://localhost:8085/api/${name}/metabolites?inModel=${inM}`);
      if (!res.ok) throw new Error('Failed to fetch metabolites');
      setMetabolites(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/metabolites/statistics`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchMetabolites(); }, [name, inModelFilter]);
  useEffect(() => { if (activeTab === 'stats') fetchStats(); }, [name, activeTab]);

  // ── Filters ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return metabolites.filter(m => {
      if (typeFilter !== 'All' && m.type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        if (searchColumn === 'all') {
          const hit = [m.name, m.formula, m.externalIdentifier].some(v => v && v.toLowerCase().includes(t));
          if (!hit) return false;
        } else {
          const val = m[searchColumn];
          if (!val || !String(val).toLowerCase().includes(t)) return false;
        }
      }
      return true;
    });
  }, [metabolites, searchTerm, searchColumn, typeFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, searchColumn, typeFilter, inModelFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filtered.slice(startIndex, startIndex + itemsPerPage);

  // ── Detail modal ─────────────────────────────────────────────────────────────

  const handleOpenDetail = async (m: any) => {
    setSelectedMetabolite(m);
    setDetailData(null);
    setLoadingDetail(true);
    setActiveDetailTab('entry type');
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/metabolites/${m.id}/detail`);
      if (!res.ok) throw new Error('Failed to fetch detail');
      setDetailData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Form (insert / edit) ──────────────────────────────────────────────────

  const handleOpenInsert = () => {
    setFormMode('insert');
    setFormData({ ...emptyForm });
    setFormTarget(null);
    setShowForm(true);
  };

  const handleOpenEdit = (m: any) => {
    setFormMode('edit');
    setFormData({
      name: m.name || '',
      entryType: m.entryType || 'COMPOUND',
      formula: m.formula || '',
      molecularWeight: m.molecularWeight || '',
      charge: m.charge || '',
      externalIdentifier: m.externalIdentifier || '',
    });
    setFormTarget(m);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formMode === 'insert') {
        const res = await fetch(`http://localhost:8085/api/${name}/metabolites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to insert metabolite');
        await fetchMetabolites();
      } else {
        const res = await fetch(`http://localhost:8085/api/${name}/metabolites/${formTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to update metabolite');
        await fetchMetabolites();
      }
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (m: any) => {
    if (!window.confirm(`Remove metabolite "${m.name}" from the workspace?`)) return;
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/metabolites/${m.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete metabolite');
      setMetabolites(prev => prev.filter(x => x.id !== m.id));
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  // ── CSV Export ───────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = ['Name', 'Compartment', 'Formula', 'External ID', 'Biochemical Reactions', 'Transport Reactions', 'Type'];
    const rows = metabolites.map(m => [m.name, m.compartment, m.formula, m.externalIdentifier, m.biochemicalReactions, m.transportReactions, m.type]);
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `metabolites_${name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden ring-1 ring-slate-900/5">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center bg-white shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Metabolites for {name}</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and filter all metabolites in this workspace model.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* List / Stats toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-950'}`}
            >Metabolites</button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-950'}`}
            ><BarChart3 size={14} />Statistics</button>
          </div>
          {!loading && activeTab === 'list' && (
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full ring-1 ring-inset ring-teal-600/20">
              {filtered.length} {filtered.length === 1 ? 'Metabolite' : 'Metabolites'}
            </span>
          )}
          <button
            onClick={handleOpenInsert}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-md shadow-teal-900/10 transition-colors"
          ><Plus size={16} />Insert Metabolite</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap gap-4 items-center text-sm bg-white shrink-0">
            {/* Search */}
            <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all overflow-hidden">
              <select
                value={searchColumn}
                onChange={e => setSearchColumn(e.target.value)}
                className="bg-slate-50 border-r border-slate-300 px-3 py-2 outline-none text-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="all">All Fields</option>
                <option value="name">Name</option>
                <option value="formula">Formula</option>
                <option value="externalIdentifier">External ID</option>
              </select>
              <div className="flex items-center">
                <Search size={14} className="ml-3 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search metabolites..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-[220px] px-3 py-2 outline-none text-slate-900 text-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span>Type:</span>
              <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200 shadow-inner">
                {(['All', 'both', 'reactant', 'product', 'other'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 capitalize ${typeFilter === t ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  >{t === 'All' ? 'All' : TYPE_LABEL[t]}</button>
                ))}
              </div>
            </div>

            {/* In Model filter */}
            <div className="flex items-center gap-3 ml-auto">
              <label className="text-sm font-medium text-slate-700">Status:</label>
              <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200 shadow-inner">
                {(['All', 'In Model'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setInModelFilter(f)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${inModelFilter === f ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                  >{f}</button>
                ))}
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-sm"
              ><FileSpreadsheet size={14} className="text-emerald-600" />Export CSV</button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30">
            {loading ? (
              <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading data...</span>
              </div>
            ) : currentRows.length > 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl m-4 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none z-10">
                    <tr>
                      <th className="px-4 py-3 text-center w-10">Info</th>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Compartment</th>
                      <th className="px-5 py-3">Formula</th>
                      <th className="px-5 py-3">External ID</th>
                      <th className="px-5 py-3 text-center">Biochem. Reactions</th>
                      <th className="px-5 py-3 text-center">Transport Reactions</th>
                      <th className="px-5 py-3 text-center">Type</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRows.map((m, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenDetail(m)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Details"
                          ><Eye size={16} /></button>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-800 max-w-[200px] truncate group-hover:text-teal-700 transition-colors" title={m.name}>{m.name || '-'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600 truncate">{m.compartment || '-'}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600 truncate">{m.formula || '-'}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-teal-600">{m.externalIdentifier || '-'}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">{m.biochemicalReactions}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">{m.transportReactions}</td>
                        <td className="px-5 py-3.5 text-center">
                          {m.type && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${TYPE_BADGE[m.type] || TYPE_BADGE.other}`}>
                              {TYPE_LABEL[m.type] || m.type}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Metabolite"
                            ><Pencil size={14} /></button>
                            <button
                              onClick={() => handleDelete(m)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Metabolite"
                            ><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <HelpCircle size={40} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No metabolites found matching filters</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="bg-white border-t border-slate-200/80 px-6 py-4 flex items-center justify-between text-sm shrink-0">
            <span className="text-slate-500">
              Showing <strong className="font-medium text-slate-900">{startIndex + 1}</strong> to <strong className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, filtered.length)}</strong> of <strong className="font-medium text-slate-900">{filtered.length}</strong> results
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
              >Previous</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
              >Next</button>
            </div>
          </div>
        </>
      ) : (
        /* Stats tab */
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50/50">
          {loadingStats ? (
            <div className="flex items-center justify-center h-full gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading statistics...</span>
            </div>
          ) : stats ? (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Reactants',                   value: stats.reactants,           desc: 'Metabolites that are reactants' },
                { title: 'Products',                    value: stats.products,            desc: 'Metabolites that are products' },
                { title: 'Both (Reactant & Product)',   value: stats.both,                desc: 'Appear as both reactant and product' },
                { title: 'Reactions with Reactants',    value: stats.reactionsReactants,  desc: 'Reactions that have reactants' },
                { title: 'Reactions with Products',     value: stats.reactionsProducts,   desc: 'Reactions that have products' },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-teal-500/30 transition-all group">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">{s.title}</h4>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-teal-600 transition-colors">{s.value ?? '—'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <BarChart3 size={40} className="text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Failed to load statistics</p>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {selectedMetabolite && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-3xl flex flex-col h-[520px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Metabolite Data</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedMetabolite.name}
                  {selectedMetabolite.externalIdentifier ? ` | ${selectedMetabolite.externalIdentifier}` : ''}
                  {selectedMetabolite.compartment ? ` | ${selectedMetabolite.compartment}` : ''}
                </p>
              </div>
              <button
                onClick={() => { setSelectedMetabolite(null); setDetailData(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              ><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white text-sm shrink-0 overflow-x-auto">
              {['entry type', 'synonyms', 'reactions', 'db links'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`px-5 py-3 border-b-2 font-bold capitalize transition-all duration-200 whitespace-nowrap ${activeDetailTab === tab ? 'border-teal-500 text-teal-600 bg-teal-50/10' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >{tab}</button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
              {loadingDetail ? (
                <div className="h-full flex items-center justify-center gap-3 text-slate-400">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading details...</span>
                </div>
              ) : detailData && detailData[activeDetailTab] && detailData[activeDetailTab].length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        {activeDetailTab === 'reactions' && (
                          <><th className="px-4 py-2">Reaction ID</th><th className="px-4 py-2">Equation</th><th className="px-4 py-2">Role</th></>
                        )}
                        {activeDetailTab === 'entry type' && <th className="px-4 py-2">Entry Type</th>}
                        {activeDetailTab === 'synonyms' && <th className="px-4 py-2">Synonym</th>}
                        {activeDetailTab === 'db links' && <><th className="px-4 py-2">Database</th><th className="px-4 py-2">Identifier</th></>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium bg-white">
                      {detailData[activeDetailTab].map((row: string[], rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50">
                          {row.map((cell: string, cIdx: number) => (
                            <td key={cIdx} className="px-4 py-2.5 max-w-xs truncate" title={cell}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <HelpCircle size={32} className="text-slate-300" />
                  <span className="text-xs font-semibold">No data available for this tab.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Insert / Edit Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {formMode === 'insert' ? 'Insert Metabolite' : 'Edit Metabolite'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              ><X size={20} /></button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  placeholder="e.g. Pyruvate"
                />
              </div>

              {/* Entry Type */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Entry Type</label>
                <select
                  value={formData.entryType}
                  onChange={e => setFormData({ ...formData, entryType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                >
                  {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Formula + Molecular Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Formula</label>
                  <input
                    value={formData.formula}
                    onChange={e => setFormData({ ...formData, formula: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="e.g. C3H4O3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Molecular Weight</label>
                  <input
                    value={formData.molecularWeight}
                    onChange={e => setFormData({ ...formData, molecularWeight: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="e.g. 88.06"
                  />
                </div>
              </div>

              {/* Charge + External Identifier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Charge</label>
                  <input
                    value={formData.charge}
                    onChange={e => setFormData({ ...formData, charge: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="e.g. -1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">External Identifier</label>
                  <input
                    value={formData.externalIdentifier}
                    onChange={e => setFormData({ ...formData, externalIdentifier: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    placeholder="e.g. C00022"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
                >Cancel</button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm shadow-teal-900/10 transition-all"
                >{formMode === 'insert' ? 'Insert' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
