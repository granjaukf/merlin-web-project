import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import { PanelLeftClose, PanelLeftOpen, Database } from 'lucide-react';
import merlinLogo from '../../assets/merlin_logo.png';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { name } = useParams();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar com animação de deslize */}
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(true)} />

      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Topbar / Header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-4">
            {/* Botão de Toggle da Sidebar */}
            <button
              onClick={() => setCollapsed(prev => !prev)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
              title={collapsed ? "Mostrar barra lateral" : "Esconder barra lateral"}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            {/* Se a Sidebar estiver RECOLHIDA: Mostra o Logo e o Nome do Workspace AQUI no Topo! */}
            {collapsed ? (
              <div className="flex items-center gap-3 transition-opacity duration-200">
                <div className="flex items-center gap-2">
                  <img src={merlinLogo} alt="Merlin" className="h-6 object-contain" />
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans lowercase">
                    merlin
                  </span>
                </div>

                <span className="text-slate-300 font-light">/</span>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-slate-800 text-xs font-bold shadow-2xs">
                  <Database size={13} className="text-teal-600" />
                  <span className="tracking-tight">{name}</span>
                </div>
              </div>
            ) : (
              /* Se a Sidebar estiver ABERTA: Mostra breadcrumb limpo */
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</span>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-bold text-slate-800">{name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              Active: <strong className="font-bold">{name}</strong>
            </span>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden bg-slate-50 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 p-6 flex flex-col">
            <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col min-h-0">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
