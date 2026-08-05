import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Database, TestTube, Network, LayoutDashboard, ChevronLeft, Dna, Atom } from 'lucide-react';
import merlinLogo from '../../assets/merlin_logo.png';

export default function Sidebar() {
    const { name } = useParams();

    const navItems = [
        { path: '', label: 'Overview', icon: LayoutDashboard },
        { path: 'reactions', label: 'Reactions', icon: TestTube },
        { path: 'proteins', label: 'Proteins', icon: Atom },
        { path: 'genes', label: 'Genes', icon: Dna },
        { path: 'metabolites', label: 'Metabolites', icon: Network },
    ];

    return (
        <div className="w-72 bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl z-20 shrink-0">
            {/* Logo area */}
            <div className="h-20 flex items-center justify-start px-6 bg-slate-950/50 backdrop-blur-sm border-b border-white/5 gap-3">
                <img src={merlinLogo} alt="Merlin" className="h-8 object-contain" />
                <span className="font-extrabold text-2xl tracking-tight text-white font-sans lowercase">merlin</span>
            </div>

            <div className="flex-1 overflow-y-auto py-8">
                <div className="px-6 mb-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="h-px bg-slate-700/50 flex-1"></div>
                    Workspace Model
                    <div className="h-px bg-slate-700/50 flex-1"></div>
                </div>
                <nav className="flex flex-col gap-1.5 px-3">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={`/workspace/${name}/${item.path}`}
                            end={item.path === ''}
                            className={({ isActive }) =>
                                `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                                    isActive
                                        ? 'bg-teal-600 text-white shadow-md shadow-teal-900/50 ring-1 ring-teal-500/50'
                                        : 'hover:bg-slate-800/80 hover:text-white'
                                }`
                            }
                        >
                            <item.icon 
                                size={18} 
                                className={`mr-3 transition-colors ${
                                    // Make icon slightly dimmer unless active/hovered
                                    'opacity-70 group-hover:opacity-100 group-hover:text-teal-300 group-[.bg-teal-600]:opacity-100 group-[.bg-teal-600]:text-teal-100'
                                }`} 
                            />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Bottom info area */}
            <div className="p-5 border-t border-white/5 bg-slate-950/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            Active Workspace
                        </div>
                        <div className="text-sm font-bold text-teal-300 truncate max-w-[150px]" title={name}>
                            {name}
                        </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
                        <Database size={14} className="text-slate-400" />
                    </div>
                </div>
                
                <NavLink 
                    to="/" 
                    className="flex items-center justify-center w-full py-2 px-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all ring-1 ring-inset ring-white/5 hover:ring-white/10"
                >
                    <ChevronLeft size={14} className="mr-1" />
                    Change Workspace
                </NavLink>
            </div>
        </div>
    );
}
