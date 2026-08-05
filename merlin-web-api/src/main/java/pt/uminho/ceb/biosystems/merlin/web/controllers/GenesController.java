package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelGenesServices;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class GenesController {

    @OpenApi(
        summary = "Listar genes de um workspace",
        operationId = "getGenes",
        path = "/api/{workspace}/genes",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getGenes(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            Map<Integer, String> geneIds = ModelGenesServices.getGeneIds(workspace);
            List<Map<String, Object>> list = new ArrayList<>();
            for (Map.Entry<Integer, String> entry : geneIds.entrySet()) {
                Map<String, Object> g = new LinkedHashMap<>();
                g.put("id", entry.getKey());
                g.put("name", entry.getValue());
                list.add(g);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching genes for " + workspace + ": " + e.getMessage());
        }
    }
}
