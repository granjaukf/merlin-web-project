package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelProteinsServices;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ProteinsController {

    @OpenApi(
        summary = "Listar proteínas de um workspace",
        operationId = "getProteins",
        path = "/api/{workspace}/proteins",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getProteins(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            List<String[]> data = ModelProteinsServices.getMainTableData(workspace, false);
            List<Map<String, Object>> list = new ArrayList<>();
            for (String[] row : data) {
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("name", safeGet(row, 0));
                p.put("ecNumber", safeGet(row, 1));
                p.put("abbreviation", safeGet(row, 2));
                p.put("numReactions", safeGet(row, 3));
                p.put("numGenes", safeGet(row, 4));
                p.put("inModel", "true".equalsIgnoreCase(safeGet(row, 5)));
                list.add(p);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching proteins for " + workspace + ": " + e.getMessage());
        }
    }

    private static String safeGet(String[] arr, int i) {
        return (arr != null && i < arr.length && arr[i] != null) ? arr[i] : "";
    }
}
