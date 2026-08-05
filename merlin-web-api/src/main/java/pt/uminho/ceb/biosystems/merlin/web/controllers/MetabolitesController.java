package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelMetabolitesServices;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MetabolitesController {

    @OpenApi(
        summary = "Listar metabolitos de um workspace",
        operationId = "getMetabolites",
        path = "/api/{workspace}/metabolites",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getMetabolites(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            Map<Integer, String> compounds = ModelMetabolitesServices.getIdCompoundAndName(workspace);
            List<Map<String, Object>> list = new ArrayList<>();
            for (Map.Entry<Integer, String> entry : compounds.entrySet()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", entry.getKey());
                m.put("name", entry.getValue());
                list.add(m);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching metabolites for " + workspace + ": " + e.getMessage());
        }
    }
}
