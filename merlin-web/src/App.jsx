import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WorkspaceSelection from './pages/WorkspaceSelection';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Reactions from './pages/Reactions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkspaceSelection />} />

        <Route path="/workspace/:name" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="reactions" element={<Reactions />} />
          <Route path="proteins" element={<div className="p-8 bg-white border border-slate-200 shadow-sm rounded-xl"><h2 className="text-xl font-bold text-slate-800">Proteins</h2><p className="text-slate-500 mt-2">Data will be loaded here...</p></div>} />
          <Route path="genes" element={<div className="p-8 bg-white border border-slate-200 shadow-sm rounded-xl"><h2 className="text-xl font-bold text-slate-800">Genes</h2><p className="text-slate-500 mt-2">Data will be loaded here...</p></div>} />
          <Route path="metabolites" element={<div className="p-8 bg-white border border-slate-200 shadow-sm rounded-xl"><h2 className="text-xl font-bold text-slate-800">Metabolites</h2><p className="text-slate-500 mt-2">Data will be loaded here...</p></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
