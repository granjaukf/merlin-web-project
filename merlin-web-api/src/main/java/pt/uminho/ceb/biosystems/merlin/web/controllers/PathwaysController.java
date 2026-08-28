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