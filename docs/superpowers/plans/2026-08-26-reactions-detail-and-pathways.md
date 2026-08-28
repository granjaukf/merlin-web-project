# Reactions Detail Fix + Pathways Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the hardcoded Reactions detail tabs by creating a backend endpoint and wiring the frontend to real data, then create a full Pathways page with table, stats, and detail modal.

**Architecture:** Add a `GET /api/{workspace}/reactions/{id}/detail` endpoint using the existing `ModelReactionsServices.getRowInfo()` service. Create a new `PathwaysController` with list/stats/detail endpoints using `ModelPathwaysServices`. Build a `Pathways.tsx` page following the established pattern of Genes/Proteins/Metabolites pages.

**Tech Stack:** Java/Javalin backend, React 19 + TypeScript + Tailwind CSS frontend, Playwright E2E tests, merlin-services layer for DB access.

## Global Constraints

- Backend port: 8085 (hardcoded in MerlinWebServer.java)
- Frontend dev port: 5174 (`--strictPort`)
- React 19 (supports `inert` attribute)
- Icons from `lucide-react`
- E2E tests use `workers: 1` with globalSetup/globalTeardown
- Single git repo, commits go directly to main
- Conversation language: European Portuguese

---

## File Structure

### Modified Files
- `merlin-web-api/.../controllers/ReactionsController.java` — add `getReactionDetail` endpoint
- `merlin-web/src/pages/Reactions.tsx` — replace hardcoded tabs with API-driven data
- `merlin-web/src/App.tsx` — add Pathways route
- `merlin-web-api/.../MerlinWebServer.java` — register PathwaysController routes

### New Files
- `merlin-web-api/.../controllers/PathwaysController.java` — list, stats, detail endpoints
- `merlin-web/src/pages/Pathways.tsx` — full page with table, stats, detail modal
- `merlin-web-e2e/tests/reactions-detail.spec.ts` — E2E test for reactions detail
- `merlin-web-e2e/tests/pathways.spec.ts` — E2E test for pathways page

---

## Task 1: Create Reactions Detail Backend Endpoint

**Files:**
- Modify: `merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/controllers/ReactionsController.java`
- Reference: `merlin-services/.../ModelReactionsServices.java:407-560` (getRowInfo method)

**Interfaces:**
- Consumes: `ModelReactionsServices.getRowInfo(int id, String name, String databaseName)` returns `Pair<Map<String,String>, List<List<List<String>>>>`
  - First element: metabolites map (identifier → name)
  - Second element: list of tabs:
    - [0]: metabolites (stoichiometry) — each row: [name, formula, identifier, compartment, coefficient]
    - [1]: enzymes — each row: [ecNumber, enzymeName, inModel]
    - [2]: properties — each row: [propertyName, propertyValue]
    - [3]: synonyms — each row: [synonym]
    - [4]: pathways — each row: [pathwayName]
    - [5]: source — single row: [sourceName]
    - [6]: db links — each row: [dbName, identifier, url]
    - [7]: gene rules (optional) — each row: [booleanRule]
- Produces: `GET /api/{workspace}/reactions/{id}/detail` → JSON with tabs

- [ ] **Step 1: Add getReactionDetail method to ReactionsController.java**

Add after the `deleteReaction` method (around line 130):

```java
@OpenApi(
    summary = "Obter detalhes de uma reação específica",
    operationId = "getReactionDetail",
    path = "/api/{workspace}/reactions/{id}/detail",
    methods = HttpMethod.GET,
    tags = {"Workspace Data"},
    pathParams = {
        @OpenApiParam(name = "workspace", required = true),
        @OpenApiParam(name = "id", required = true, type = Integer.class)
    },
    responses = { @OpenApiResponse(status = "200") }
)
public static void getReactionDetail(Context ctx) {
    String workspace = ctx.pathParam("workspace");
    int id = Integer.parseInt(ctx.pathParam("id"));
    try {
        Pair<Map<String,String>, List<List<List<String>>>> result =
            ModelReactionsServices.getRowInfo(id, "", workspace);

        List<List<List<String>>> tabs = result.getB();
        Map<String, Object> response = new LinkedHashMap<>();

        // Tab 0: metabolites (stoichiometry)
        response.put("metabolites", safeGetList(tabs, 0));

        // Tab 1: enzymes
        response.put("enzymes", safeGetList(tabs, 1));

        // Tab 2: properties
        response.put("properties", safeGetList(tabs, 2));

        // Tab 3: synonyms
        response.put("synonyms", safeGetList(tabs, 3));

        // Tab 4: pathways
        response.put("pathways", safeGetList(tabs, 4));

        // Tab 5: source
        response.put("source", safeGetList(tabs, 5));

        // Tab 6: db links
        response.put("db links", safeGetList(tabs, 6));

        // Tab 7: gene rules (optional)
        if (tabs.size() > 7) {
            response.put("gene rules", safeGetList(tabs, 7));
        }

        ctx.json(response);
    } catch (Exception e) {
        e.printStackTrace();
        ctx.status(500).result("Error fetching reaction detail: " + e.getMessage());
    }
}

private static List<List<String>> safeGetList(List<List<List<String>>> tabs, int index) {
    if (tabs == null || index >= tabs.size() || tabs.get(index) == null) {
        return new ArrayList<>();
    }
    return tabs.get(index);
}
```

- [ ] **Step 2: Register the new endpoint in MerlinWebServer.java**

Add after the existing reactions DELETE route (around line 55):

```java
app.get("/api/{workspace}/reactions/{id}/detail", ReactionsController::getReactionDetail);
```

- [ ] **Step 3: Verify compilation**

Run: `cd merlin-web-api && mvn -q compile`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/controllers/ReactionsController.java merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/MerlinWebServer.java
git commit -m "feat: add reaction detail endpoint using ModelReactionsServices.getRowInfo"
```

---

## Task 2: Wire Reactions.tsx Detail Modal to Real API Data

**Files:**
- Modify: `merlin-web/src/pages/Reactions.tsx` (detail modal section, lines ~480-660)

**Interfaces:**
- Consumes: `GET /api/{workspace}/reactions/{id}/detail` from Task 1
- Produces: Updated detail modal with real data from API

- [ ] **Step 1: Add state and fetch function for detail data**

In the Reactions component, add state variables after the existing state declarations (around line 30):

```typescript
const [detailData, setDetailData] = useState<any>(null);
const [loadingDetail, setLoadingDetail] = useState(false);
```

Add fetch function after `fetchReactions`:

```typescript
const fetchReactionDetail = async (reaction: any) => {
    setLoadingDetail(true);
    setDetailData(null);
    try {
        const res = await fetch(`http://localhost:8085/api/${name}/reactions/${reaction.id}/detail`);
        if (!res.ok) throw new Error('Failed to fetch detail');
        setDetailData(await res.json());
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingDetail(false);
    }
};
```

- [ ] **Step 2: Update the Eye button click handler**

Replace the existing Eye button `onClick` handler to call the API:

```typescript
onClick={() => {
    setSelectedReaction(reaction);
    fetchReactionDetail(reaction);
}}
```

- [ ] **Step 3: Replace hardcoded 'enzymes' tab with API data**

Replace the hardcoded enzymes tab content (lines ~549-568) with:

```typescript
{activeTab === 'enzymes' && (
    <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Associated Enzymes & EC Numbers</h4>
        {loadingDetail ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        ) : detailData?.enzymes?.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 divide-y divide-slate-100 text-sm">
                {detailData.enzymes.map((e: string[], idx: number) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                            <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded ring-1 ring-teal-500/10">{e[0]}</span>
                            <h5 className="font-bold text-slate-800 mt-1">{e[1]}</h5>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${e[2] === 'true' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                            {e[2] === 'true' ? 'In Model' : 'Not in Model'}
                        </span>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-slate-400">No enzymes associated with this reaction.</p>
        )}
    </div>
)}
```

- [ ] **Step 4: Replace hardcoded 'synonyms' tab with API data**

Replace the hardcoded synonyms tab (lines ~592-601) with:

```typescript
{activeTab === 'synonyms' && (
    <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Synonyms</h4>
        {loadingDetail ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        ) : detailData?.synonyms?.length > 0 ? (
            <ul className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {detailData.synonyms.map((s: string[], idx: number) => (
                    <li key={idx} className="py-2">{s[0]}</li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-slate-400">No synonyms available.</p>
        )}
    </div>
)}
```

- [ ] **Step 5: Replace hardcoded 'source' tab with API data**

Replace the hardcoded source tab (lines ~612-622) with:

```typescript
{activeTab === 'source' && (
    <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Source Annotation</h4>
        {loadingDetail ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        ) : detailData?.source?.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-sm">
                <p className="text-slate-600 leading-relaxed">
                    This reaction was loaded from <strong className="text-slate-800">{detailData.source[0][0]}</strong>.
                </p>
            </div>
        ) : (
            <p className="text-sm text-slate-400">No source information available.</p>
        )}
    </div>
)}
```

- [ ] **Step 6: Replace hardcoded 'db links' tab with API data**

Replace the hardcoded db links tab (lines ~624-645) with:

```typescript
{activeTab === 'db links' && (
    <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Database Cross-References</h4>
        {loadingDetail ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        ) : detailData?.['db links']?.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3 text-sm">
                {detailData['db links'].map((link: string[], idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{link[0]}</span>
                        {link[2] && link[2] !== 'null' ? (
                            <a href={link[2]} target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold hover:underline">
                                {link[1]} ↗
                            </a>
                        ) : (
                            <span className="text-slate-400">{link[1] || 'Not available'}</span>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-slate-400">No database links available.</p>
        )}
    </div>
)}
```

- [ ] **Step 7: Add 'gene rules' tab if available**

Add after the 'db links' tab rendering:

```typescript
{activeTab === 'gene rules' && (
    <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gene-Protein-Reaction Rules</h4>
        {loadingDetail ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        ) : detailData?.['gene rules']?.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-2 text-sm font-mono">
                {detailData['gene rules'].map((rule: string[], idx: number) => (
                    <div key={idx} className="py-2 px-3 bg-slate-50 rounded-lg text-slate-700">{rule[0]}</div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-slate-400">No GPR rules available for this reaction.</p>
        )}
    </div>
)}
```

- [ ] **Step 8: Update the tabs list to include 'gene rules' when available**

Find the tabs definition (around line 490) and update to conditionally include 'gene rules':

```typescript
const tabs = ['reaction', 'enzymes', 'properties', 'synonyms', 'pathways', 'source', 'db links'];
if (detailData?.['gene rules']?.length > 0) {
    tabs.push('gene rules');
}
```

- [ ] **Step 9: Verify TypeScript compilation**

Run: `cd merlin-web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add merlin-web/src/pages/Reactions.tsx
git commit -m "feat: wire Reactions detail modal to real API data"
```

---

## Task 3: Create Pathways Backend Controller

**Files:**
- Create: `merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/controllers/PathwaysController.java`
- Modify: `merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/MerlinWebServer.java`

**Interfaces:**
- Consumes: `ModelPathwaysServices.getMainTableData(db, namesIndex, identifiers)` returns `Map<Integer, List<Object>>` — each row: ["", code, name, numReactions, numProteins]
- Consumes: `ModelPathwaysServices.getStats(db)` returns `List<Integer>` — [total, noName, noSbml]
- Consumes: `ModelPathwaysServices.getRowInfo(db, pathwayId)` returns `Map<String, List<List<String>>>` — {reactions: [[id, equation]], enzymes: [[ec, name, class, inModel]]}
- Consumes: `ModelPathwaysServices.getPathwaysNames(db)` returns `Map<Integer, String>`
- Produces: `GET /api/{workspace}/pathways` → list of pathways
- Produces: `GET /api/{workspace}/pathways/statistics` → stats
- Produces: `GET /api/{workspace}/pathways/{id}/detail` → detail tabs

- [ ] **Step 1: Create PathwaysController.java**

Create `merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/controllers/PathwaysController.java`:

```java
package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelPathwaysServices;
import pt.uminho.ceb.biosystems.mew.utilities.datastructures.pair.Pair;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class PathwaysController {

    @OpenApi(
        summary = "Listar pathways de um workspace",
        operationId = "getPathways",
        path = "/api/{workspace}/pathways",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getPathways(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            Map<Integer, Pair<String, String>> namesIndex = new HashMap<>();
            Map<Integer, Integer> identifiers = new HashMap<>();
            Map<Integer, List<Object>> data = ModelPathwaysServices.getMainTableData(workspace, namesIndex, identifiers);

            List<Map<String, Object>> list = new ArrayList<>();
            for (Map.Entry<Integer, List<Object>> entry : data.entrySet()) {
                int id = entry.getKey();
                List<Object> row = entry.getValue();
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("id", id);
                p.put("code", safeStr(row, 1));
                p.put("name", safeStr(row, 2));
                p.put("numReactions", safeInt(row, 3));
                p.put("numProteins", safeInt(row, 4));
                list.add(p);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching pathways: " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Estatísticas de pathways de um workspace",
        operationId = "getPathwayStats",
        path = "/api/{workspace}/pathways/statistics",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getPathwayStats(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            List<Integer> stats = ModelPathwaysServices.getStats(workspace);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("totalPathways", stats.size() > 0 ? stats.get(0) : 0);
            response.put("withoutName", stats.size() > 1 ? stats.get(1) : 0);
            response.put("withoutSbml", stats.size() > 2 ? stats.get(2) : 0);
            ctx.json(response);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching pathway stats: " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Detalhes de um pathway específico",
        operationId = "getPathwayDetail",
        path = "/api/{workspace}/pathways/{id}/detail",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", required = true),
            @OpenApiParam(name = "id", required = true, type = Integer.class)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getPathwayDetail(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            Map<String, List<List<String>>> info = ModelPathwaysServices.getRowInfo(workspace, id);
            ctx.json(info);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching pathway detail: " + e.getMessage());
        }
    }

    private static String safeStr(List<Object> row, int idx) {
        if (row == null || idx >= row.size() || row.get(idx) == null) return "";
        return row.get(idx).toString();
    }

    private static int safeInt(List<Object> row, int idx) {
        try { return Integer.parseInt(safeStr(row, idx)); } catch (Exception e) { return 0; }
    }
}
```

- [ ] **Step 2: Register routes in MerlinWebServer.java**

Add after the metabolites routes (around line 77):

```java
app.get("/api/{workspace}/pathways", PathwaysController::getPathways);
app.get("/api/{workspace}/pathways/statistics", PathwaysController::getPathwayStats);
app.get("/api/{workspace}/pathways/{id}/detail", PathwaysController::getPathwayDetail);
```

Also add the import at the top:

```java
import pt.uminho.ceb.biosystems.merlin.web.controllers.PathwaysController;
```

- [ ] **Step 3: Verify compilation**

Run: `cd merlin-web-api && mvn -q compile`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/controllers/PathwaysController.java merlin-web-api/src/main/java/pt/uminho/ceb/biosystems/merlin/web/MerlinWebServer.java
git commit -m "feat: add PathwaysController with list, stats, and detail endpoints"
```

---

## Task 4: Create Pathways.tsx Page

**Files:**
- Create: `merlin-web/src/pages/Pathways.tsx`
- Modify: `merlin-web/src/App.tsx` (add route)

**Interfaces:**
- Consumes: `GET /api/{workspace}/pathways` from Task 3
- Consumes: `GET /api/{workspace}/pathways/statistics` from Task 3
- Consumes: `GET /api/{workspace}/pathways/{id}/detail` from Task 3
- Produces: Full page with table, stats tab, and detail modal

- [ ] **Step 1: Create Pathways.tsx**

Create `merlin-web/src/pages/Pathways.tsx` following the pattern of Proteins.tsx:

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Eye, BarChart3, HelpCircle, X } from 'lucide-react';

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
```

- [ ] **Step 2: Add route in App.tsx**

Add after the metabolites route (around line 23):

```tsx
<Route path="pathways" element={<Pathways />} />
```

Add import at the top:

```tsx
import Pathways from './pages/Pathways';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd merlin-web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add merlin-web/src/pages/Pathways.tsx merlin-web/src/App.tsx
git commit -m "feat: add Pathways page with table, stats, and detail modal"
```

---

## Task 5: Fix Compartments Route Bug

**Files:**
- Modify: `merlin-web/src/App.tsx` (fix route casing)

**Interfaces:**
- None (standalone fix)

- [ ] **Step 1: Fix route casing in App.tsx**

Find the Compartments route (around line 24) and change from:

```tsx
<Route path="Compartments" element={<div ...>...</div>} />
```

To:

```tsx
<Route path="compartments" element={<div className="p-8 bg-white border border-slate-200 shadow-sm rounded-xl"><h2 className="text-xl font-bold text-slate-800">Compartments</h2><p className="text-slate-500 mt-2">Data will be loaded here...</p></div>} />
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd merlin-web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add merlin-web/src/App.tsx
git commit -m "fix: correct Compartments route casing to match sidebar link"
```

---

## Task 6: E2E Tests for Reactions Detail and Pathways

**Files:**
- Create: `merlin-web-e2e/tests/reactions-detail.spec.ts`
- Create: `merlin-web-e2e/tests/pathways.spec.ts`

**Interfaces:**
- Consumes: existing `kegg` workspace (read-only, has reactions and pathways)
- Consumes: `createWorkspace` from `tests/support/api.ts`

- [ ] **Step 1: Create reactions-detail.spec.ts**

Create `merlin-web-e2e/tests/reactions-detail.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('reaction detail', () => {
  test('detail modal opens and shows real data', async ({ page }) => {
    await page.goto('/workspace/kegg/reactions');
    await expect(page.getByRole('heading', { name: 'Reactions for kegg' })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible();

    await page.locator('button[title="View Details"]').first().click();
    await expect(page.getByText('Reaction Data')).toBeVisible({ timeout: 10_000 });

    // Enzymes tab should show real data, not hardcoded
    await page.getByRole('button', { name: 'enzymes' }).click();
    await expect(page.locator('.font-mono').first()).toBeVisible({ timeout: 10_000 });

    // Synonyms tab
    await page.getByRole('button', { name: 'synonyms' }).click();
    await expect(page.locator('h4:has-text("Synonyms")')).toBeVisible();

    // Source tab
    await page.getByRole('button', { name: 'source' }).click();
    await expect(page.locator('h4:has-text("Source")')).toBeVisible();
  });
});
```

- [ ] **Step 2: Create pathways.spec.ts**

Create `merlin-web-e2e/tests/pathways.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('pathways', () => {
  test('table loads for kegg workspace', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.getByRole('heading', { name: 'Pathways for kegg' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('search filters pathways', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.getByRole('table').first()).toBeVisible({ timeout: 20_000 });

    const countBefore = await page.locator('tbody tr').count();
    const firstRow = page.locator('tbody tr').first();
    const firstName = await firstRow.locator('td').nth(2).innerText();

    await page.getByPlaceholder('Search by name or code').fill(firstName);
    await expect(page.locator('tbody tr').first()).toBeVisible();
    const countAfter = await page.locator('tbody tr').count();
    expect(countAfter).toBeLessThanOrEqual(countBefore);
    expect(countAfter).toBeGreaterThanOrEqual(1);
  });

  test('stats tab loads', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.getByRole('heading', { name: 'Pathways for kegg' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Statistics' }).click();
    await expect(page.getByText('Total Pathways')).toBeVisible({ timeout: 10_000 });
  });

  test('detail modal opens', async ({ page }) => {
    await page.goto('/workspace/kegg/pathways');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });

    await page.locator('button[title="View Details"]').first().click();
    await expect(page.getByText('Pathway Data')).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 3: Run all E2E tests**

Run: `cd merlin-web-e2e && npm test`
Expected: All tests pass (existing 14 + new 5 = 19 total)

- [ ] **Step 4: Commit**

```bash
git add merlin-web-e2e/tests/reactions-detail.spec.ts merlin-web-e2e/tests/pathways.spec.ts
git commit -m "test: add E2E tests for reactions detail and pathways page"
```

---

## Task 7: Final Verification and Cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Run full E2E suite**

Run: `cd merlin-web-e2e && npm test`
Expected: All 19 tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `cd merlin-web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run Maven compile**

Run: `cd merlin-web-api && mvn -q compile`
Expected: No errors

- [ ] **Step 4: Verify all routes work in browser**

Manually verify:
- `/workspace/kegg/reactions` → click Eye → detail modal shows real data
- `/workspace/kegg/pathways` → table loads, stats work, detail modal works
- Sidebar links all work correctly

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Reactions detail backend endpoint | 30 min |
| 2 | Wire Reactions.tsx to real API | 45 min |
| 3 | Pathways backend controller | 30 min |
| 4 | Pathways.tsx page | 45 min |
| 5 | Fix Compartments route bug | 5 min |
| 6 | E2E tests | 30 min |
| 7 | Final verification | 15 min |
| **Total** | | **~3.5 hours** |

This plan is well within the 2.5-week timeframe, leaving ample buffer for unexpected issues and additional polish.


O QUE NAO VAI TER:
BLAST/Diamond
- TranSyT
- Compartments annotation
- Biomass equation
- Model curation tools (reversibility, blocked reactions)
- MEMOTE
- Network visualization
