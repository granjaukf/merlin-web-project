import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
    Database,
    ChevronLeft,
    ShieldCheck,
    CircleDotDashed,
    Monitor,
    Presentation,
    PanelLeftClose
} from 'lucide-react';
import merlinLogo from '../../assets/merlin_logo.png';

interface SidebarProps {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
    const { name } = useParams();

    const menuTree = [
        {
            id: 'model',
            label: 'model',
            icon: CircleDotDashed,
            children: [
                { path: 'genes', label: 'genes', icon: Presentation },
                { path: 'proteins', label: 'proteins', icon: Presentation },
                { path: 'metabolites', label: 'metabolites', icon: Presentation },
                { path: 'reactions', label: 'reactions', icon: Presentation },
                { path: 'pathways', label: 'pathways', icon: Presentation },
            ]
        },
        {
            id: 'annotation',
            label: 'annotation',
            icon: Monitor,
            children: [
                { path: 'enzymes', label: 'enzymes', icon: Presentation },
                { path: 'compartments', label: 'compartments', icon: Presentation },
            ]
        },
        {
            path: 'validation',
            label: 'validation',
            icon: ShieldCheck
        }
    ];

    return (
        <aside
            className={`bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl z-20 shrink-0 font-sans select-none transition-all duration-300 ease-in-out overflow-hidden ${
                collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-72 opacity-100'
            }`}
        >
            {/* Header: Logo merlin + Botão de Recolher */}
            <div className="h-16 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-sm border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <img src={merlinLogo} alt="Merlin" className="h-7 object-contain" />
                    <span className="font-extrabold text-xl tracking-tight text-white font-sans lowercase">merlin</span>
                </div>
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                        title="Esconder barra lateral"
                    >
                        <PanelLeftClose size={18} />
                    </button>
                )}
            </div>

            {/* Tree Navigation Container */}
            <div className="flex-1 overflow-y-auto py-6 px-4">
                <div className="relative pl-2">
                    {/* Main vertical line from Workspace root */}
                    <div className="absolute left-[15px] top-8 bottom-4 w-px bg-slate-700/60"></div>

                    {/* Workspace Root Node (Database) */}
                    <div className="flex items-center gap-2.5 relative">
                        <div className="w-6 h-6 flex items-center justify-center relative shrink-0">
                            <div className="absolute left-[7px] w-3 h-px bg-slate-700/60"></div>
                            <div className="absolute left-[10px] w-2 h-2 rounded-full border border-blue-400/80 bg-slate-900 z-10"></div>
                        </div>
                        <NavLink
                            to={`/workspace/${name}`}
                            end
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-base font-semibold transition-all duration-150 -ml-2 select-none w-full ${
                                    isActive
                                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                        : 'text-slate-100 hover:text-white hover:bg-slate-800/40'
                                }`
                            }
                        >
                            <Database size={20} className="text-slate-200 fill-slate-800 shrink-0" />
                            <span className="tracking-wide truncate">{name || 'Workspace'}</span>
                        </NavLink>
                    </div>

                    {/* Children of the Workspace */}
                    <div className="pl-6 flex flex-col gap-1">
                        {menuTree.map((node) => {
                            const hasChildren = node.children && node.children.length > 0;

                            return (
                                <div key={node.label} className="relative">
                                    {hasChildren && (
                                        <div className="absolute left-[11px] top-7 bottom-3 w-px bg-slate-700/60"></div>
                                    )}

                                    <div className="flex items-center gap-2 py-1.5 relative">
                                        <div className="absolute left-[-15px] w-[18px] h-px bg-slate-700/60"></div>
                                        <div className="absolute left-[-8px] w-2 h-2 rounded-full border border-blue-400/80 bg-slate-900 z-10"></div>

                                        {node.path ? (
                                            <NavLink
                                                to={`/workspace/${name}/${node.path}`}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 ${
                                                        isActive
                                                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                                            : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                                                    }`
                                                }
                                            >
                                                <node.icon size={18} className="shrink-0" />
                                                <span>{node.label}</span>
                                            </NavLink>
                                        ) : (
                                            <div className="flex items-center gap-2.5 px-2 py-1.5 text-slate-300 text-sm font-semibold">
                                                <node.icon size={18} className="shrink-0" />
                                                <span>{node.label}</span>
                                            </div>
                                        )}
                                    </div>

                                    {hasChildren && (
                                        <div className="pl-5 flex flex-col">
                                            {node.children.map((child) => (
                                                <div key={child.label} className="relative flex items-center py-1">
                                                    <div className="absolute left-[-14px] w-[14px] h-px bg-slate-700/60"></div>

                                                    <NavLink
                                                        to={`/workspace/${name}/${child.path}`}
                                                        className={({ isActive }) =>
                                                            `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium w-full transition-all duration-150 ${
                                                                isActive
                                                                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold'
                                                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                                                            }`
                                                        }
                                                    >
                                                        <child.icon size={16} className="shrink-0" />
                                                        <span>{child.label}</span>
                                                    </NavLink>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom info area */}
            <div className="p-5 border-t border-white/5 bg-slate-950/30 backdrop-blur-sm shrink-0">
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
        </aside>
    );
}
