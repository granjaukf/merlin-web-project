import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Eye, BarChart3, HelpCircle, X, FileSpreadsheet } from 'lucide-react';

export default function Pathways() {
  const { name } = useParams();
  const [pathways, setPathways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Detail modal
  const [selectedPathway, setSelectedPathway] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('reactions');

  const fetchPathways = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/pathways`);
      if (!res.ok) throw new Error('Failed to fetch pathways');
      setPathways(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/pathways/statistics`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchPathways(); }, [name]);
  useEffect(() => { if (activeTab === 'stats') fetchStats(); }, [name, activeTab]);

  const filtered = useMemo(() => {
    return pathways.filter(p => {
      if (!searchTerm.trim()) return true;
      const t = searchTerm.toLowerCase();
      return (p.name && p.name.toLowerCase().includes(t))
        || (p.code && p.code.toLowerCase().includes(t));
    });
  }, [pathways, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Reactions', 'Proteins'];
    const rows = filtered.map(p => [p.code, p.name, p.numReactions, p.numProteins]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `pathways_${name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenDetail = async (p: any) => {
    setSelectedPathway(p);
    setDetailData(null);
    setLoadingDetail(true);
    setActiveDetailTab('reactions');
    try {
      const res = await fetch(`http://localhost:8085/api/${name}/pathways/${p.id}/detail`);
      if (!res.ok) throw new Error('Failed to fetch detail');
      setDetailData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden ring-1 ring-slate-900/5">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200/80 flex justify-between items-center bg-white shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pathways for {name}</h2>
          <p className="text-sm text-slate-500 mt-1">Browse metabolic pathways and their associated reactions and enzymes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-950'}`}
            >Pathways</button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${activeTab === 'stats' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-950'}`}
            ><BarChart3 size={14} />Statistics</button>
          </div>
          {!loading && activeTab === 'list' && (
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full ring-1 ring-inset ring-teal-600/20">
              {filtered.length} {filtered.length === 1 ? 'Pathway' : 'Pathways'}
            </span>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap gap-4 items-center text-sm bg-white shrink-0">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all overflow-hidden">
              <Search size={14} className="ml-3 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-[280px] px-3 py-2 outline-none text-slate-900 text-sm placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-sm"
            ><FileSpreadsheet size={14} className="text-emerald-600" />Export CSV</button>
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
                      <th className="px-5 py-3">Code</th>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3 text-center">Reactions</th>
                      <th className="px-5 py-3 text-center">Proteins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRows.map((p, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenDetail(p)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Details"
                          ><Eye size={16} /></button>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-teal-600">{p.code || '-'}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800 max-w-[300px] truncate group-hover:text-teal-700 transition-colors" title={p.name}>{p.name || '-'}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">{p.numReactions}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-800">{p.numProteins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <HelpCircle size={40} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No pathways found</p>
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
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
              >Previous</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium transition-all"
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
                { title: 'Total Pathways', value: stats.totalPathways, desc: 'All pathways in database' },
                { title: 'Without Name', value: stats.withoutName, desc: 'Pathways missing name' },
                { title: 'Without SBML', value: stats.withoutSbml, desc: 'Pathways without SBML annotation' },
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

      {/* Detail Modal */}
      {selectedPathway && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl w-full max-w-3xl flex flex-col h-[520px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pathway Data</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedPathway.code} | {selectedPathway.name}
                </p>
              </div>
              <button
                onClick={() => { setSelectedPathway(null); setDetailData(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              ><X size={20} /></button>
            </div>

            <div className="flex border-b border-slate-200 bg-white text-sm shrink-0 overflow-x-auto">
              {['reactions', 'enzymes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`px-5 py-3 border-b-2 font-bold capitalize transition-all duration-200 whitespace-nowrap ${activeDetailTab === tab ? 'border-teal-500 text-teal-600 bg-teal-50/10' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >{tab}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
              {loadingDetail ? (
                <div className="h-full flex items-center justify-center gap-3 text-slate-400">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading details...</span>
                </div>
              ) : detailData && detailData[activeDetailTab]?.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        {activeDetailTab === 'reactions' && (<><th className="px-4 py-2">Reaction ID</th><th className="px-4 py-2">Equation</th></>)}
                        {activeDetailTab === 'enzymes' && (<><th className="px-4 py-2">EC Number</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Class</th></>)}
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
    </div>
  );
}