package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiContent;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiRequestBody;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelMetabolitesServices;
import pt.uminho.ceb.biosystems.mew.utilities.datastructures.pair.Pair;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MetabolitesController {

    /** compound_id + compartment_id * ID_CREATOR = speciesId */
    private static final int ID_CREATOR = 1_000_000;

    public static class MetaboliteRequest {
        public String name;
        public String entryType;
        public String formula;
        public String molecularWeight;
        public String charge;
        public String externalIdentifier;
    }

    // ─── GET /api/{workspace}/metabolites ──────────────────────────────────────

    @OpenApi(
        summary = "Listar metabolitos de um workspace (tabela completa)",
        operationId = "getMetabolites",
        path = "/api/{workspace}/metabolites",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        queryParams = { @OpenApiParam(name = "inModel", description = "Apenas metabolitos no modelo", type = Boolean.class) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getMetabolites(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        boolean inModel = Boolean.parseBoolean(ctx.queryParam("inModel"));
        try {
            Map<Integer, String> typeMap = new HashMap<>();
            // types[0]=glycan, types[1]=compound, types[2]=drugs, types[3]=all
            ArrayList<Integer> types = new ArrayList<>(Arrays.asList(0, 0, 0, 1)); // all types

            Map<Integer, List<Object>> data = ModelMetabolitesServices.getMainTableData(workspace, 0, inModel, types, typeMap);

            List<Map<String, Object>> list = new ArrayList<>();
            for (Map.Entry<Integer, List<Object>> entry : data.entrySet()) {
                int speciesId = entry.getKey();
                List<Object> row = entry.getValue();
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", speciesId);
                m.put("compoundId", speciesId % ID_CREATOR);
                m.put("name",                safeStr(row, 1));
                m.put("compartment",         safeStr(row, 2));
                m.put("formula",             safeStr(row, 3));
                m.put("externalIdentifier",  safeStr(row, 4));
                m.put("biochemicalReactions", safeInt(row, 5));
                m.put("transportReactions",   safeInt(row, 6));
                m.put("type", typeMap.getOrDefault(speciesId, "other"));
                list.add(m);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching metabolites: " + e.getMessage());
        }
    }

    // ─── GET /api/{workspace}/metabolites/statistics ───────────────────────────

    @OpenApi(
        summary = "Estatísticas de metabolitos de um workspace",
        operationId = "getMetaboliteStats",
        path = "/api/{workspace}/metabolites/statistics",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getMetaboliteStats(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            List<Pair<Integer, String>> stats = ModelMetabolitesServices.getStats(workspace);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("reactants",            stats.size() > 0 ? stats.get(0).getA() : 0);
            response.put("products",             stats.size() > 1 ? stats.get(1).getA() : 0);
            response.put("reactionsReactants",   stats.size() > 2 ? stats.get(2).getA() : 0);
            response.put("reactionsProducts",    stats.size() > 3 ? stats.get(3).getA() : 0);
            response.put("both",                 stats.size() > 4 ? stats.get(4).getA() : 0);
            ctx.json(response);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching metabolite stats: " + e.getMessage());
        }
    }

    // ─── GET /api/{workspace}/metabolites/{id}/detail ──────────────────────────

    @OpenApi(
        summary = "Detalhes de um metabolito específico",
        operationId = "getMetaboliteDetail",
        path = "/api/{workspace}/metabolites/{id}/detail",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", required = true),
            @OpenApiParam(name = "id", required = true, type = Integer.class)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getMetaboliteDetail(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int speciesId = Integer.parseInt(ctx.pathParam("id"));
        try {
            Map<String, List<ArrayList<String>>> info = ModelMetabolitesServices.getRowInfo(workspace, speciesId);
            ctx.json(info);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching metabolite detail: " + e.getMessage());
        }
    }

    // ─── POST /api/{workspace}/metabolites ─────────────────────────────────────

    @OpenApi(
        summary = "Inserir um novo metabolito",
        operationId = "createMetabolite",
        path = "/api/{workspace}/metabolites",
        methods = HttpMethod.POST,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", required = true) },
        requestBody = @OpenApiRequestBody(content = { @OpenApiContent(from = MetaboliteRequest.class) }),
        responses = { @OpenApiResponse(status = "201") }
    )
    public static void createMetabolite(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            MetaboliteRequest req = ctx.bodyAsClass(MetaboliteRequest.class);
            String extId = req.externalIdentifier != null ? req.externalIdentifier.trim() : "";
            if (!extId.isEmpty()) {
                ModelMetabolitesServices.insertData(
                    extId,
                    req.name,
                    req.entryType != null ? req.entryType : "COMPOUND",
                    req.formula,
                    req.molecularWeight,
                    req.charge,
                    workspace
                );
            } else {
                ModelMetabolitesServices.insertData(
                    req.name,
                    req.entryType != null ? req.entryType : "COMPOUND",
                    req.formula,
                    req.molecularWeight,
                    req.charge,
                    workspace
                );
            }
            ctx.status(201).json(Map.of("message", "Metabolito inserido com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error creating metabolite: " + e.getMessage());
        }
    }

    // ─── PUT /api/{workspace}/metabolites/{id} ─────────────────────────────────

    @OpenApi(
        summary = "Atualizar um metabolito existente",
        operationId = "updateMetabolite",
        path = "/api/{workspace}/metabolites/{id}",
        methods = HttpMethod.PUT,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", required = true),
            @OpenApiParam(name = "id", required = true, type = Integer.class)
        },
        requestBody = @OpenApiRequestBody(content = { @OpenApiContent(from = MetaboliteRequest.class) }),
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void updateMetabolite(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int speciesId = Integer.parseInt(ctx.pathParam("id"));
        int compoundId = speciesId % ID_CREATOR;
        try {
            MetaboliteRequest req = ctx.bodyAsClass(MetaboliteRequest.class);
            Short charge = null;
            if (req.charge != null && !req.charge.trim().isEmpty()) {
                try { charge = Short.parseShort(req.charge.trim()); } catch (NumberFormatException ignored) {}
            }
            ModelMetabolitesServices.updateDataByInternalId(
                compoundId,
                req.name,
                req.entryType,
                req.formula,
                req.molecularWeight,
                charge,
                req.externalIdentifier,
                workspace
            );
            ctx.status(200).json(Map.of("message", "Metabolito atualizado com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error updating metabolite: " + e.getMessage());
        }
    }

    // ─── DELETE /api/{workspace}/metabolites/{id} ──────────────────────────────

    @OpenApi(
        summary = "Remover um metabolito específico",
        operationId = "deleteMetabolite",
        path = "/api/{workspace}/metabolites/{id}",
        methods = HttpMethod.DELETE,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", required = true),
            @OpenApiParam(name = "id", required = true, type = Integer.class)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void deleteMetabolite(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int speciesId = Integer.parseInt(ctx.pathParam("id"));
        int compoundId = speciesId % ID_CREATOR;
        try {
            String externalId = ModelMetabolitesServices.getCompoundExternalIdentifierByInternalID(workspace, compoundId);
            if (externalId != null && !externalId.trim().isEmpty()) {
                ModelMetabolitesServices.removeCompoundByExternalIdentifier(workspace, externalId);
            } else {
                Map<Integer, List<Object>> data = ModelMetabolitesServices.getMainTableData(workspace, 0, false, new ArrayList<>(Arrays.asList(0, 0, 0, 1)), new HashMap<>());
                List<Object> row = data.get(speciesId);
                String name = row != null ? safeStr(row, 1) : "";
                String formula = row != null ? safeStr(row, 3) : "";
                ModelMetabolitesServices.removeCompoundByData(workspace, null, name, formula);
            }
            ctx.status(200).json(Map.of("message", "Metabolito removido com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error deleting metabolite: " + e.getMessage());
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private static String safeStr(List<Object> row, int idx) {
        if (row == null || idx >= row.size() || row.get(idx) == null) return "";
        return row.get(idx).toString();
    }

    private static int safeInt(List<Object> row, int idx) {
        try { return Integer.parseInt(safeStr(row, idx)); } catch (Exception e) { return 0; }
    }
}
