package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.ProjectServices;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelGenesServices;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelProteinsServices;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelReactionsServices;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelMetabolitesServices;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class StatsController {

    @OpenApi(
        summary = "Obter estatísticas de um workspace",
        operationId = "getWorkspaceStats",
        path = "/api/{workspace}/stats",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getWorkspaceStats(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("isCompartmentalised", ProjectServices.isCompartmentalisedModel(workspace));
            var reactionsData = ModelReactionsServices.getMainTableData(false, workspace);
            stats.put("totalReactions", reactionsData.getReactionsOrder().size());
            stats.put("totalGenes", ModelGenesServices.countEntriesInGene(workspace));
            stats.put("totalGenesInModel", ModelGenesServices.countGenesInModel(workspace));
            List<Integer> proteinStats = ModelProteinsServices.getStats(workspace);
            stats.put("totalProteins", proteinStats.get(0));
            stats.put("totalEnzymes", proteinStats.get(1));
            java.util.ArrayList<Integer> metTypes = new java.util.ArrayList<>(java.util.Arrays.asList(0, 0, 0, 1));
            java.util.Map<Integer, String> metTypeMap = new java.util.HashMap<>();
            stats.put("totalMetabolites", ModelMetabolitesServices.getMainTableData(workspace, 0, false, metTypes, metTypeMap).size());
            ctx.json(stats);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching stats for " + workspace + ": " + e.getMessage());
        }
    }
}
