package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelReactionsServices;
import pt.uminho.ceb.biosystems.merlin.dataAccess.InitDataAccess;
import pt.uminho.ceb.biosystems.mew.utilities.datastructures.pair.Pair;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ReactionsController {

    @OpenApi(
        summary = "Listar reações de um workspace",
        operationId = "getReactions",
        path = "/api/{workspace}/reactions",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getReactions(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            var reactionsData = ModelReactionsServices.getMainTableData(false, workspace);
            List<Map<String, Object>> list = new ArrayList<>();
            String[] headers = {"index", "pathway", "name", "equation", "localisation", "notes", "reversible", "inModel"};
            Map<Integer, Pair<Integer, List<Object>>> dataMap = reactionsData.getReactionsData();
            for (Map.Entry<Integer, Pair<Integer, List<Object>>> entry : dataMap.entrySet()) {
                List<Object> row = entry.getValue().getB();
                Map<String, Object> reaction = new HashMap<>();
                reaction.put("id", reactionsData.getIdentifiers().get(entry.getKey()));
                for (int j = 0; j < row.size() && j < headers.length; j++) {
                    reaction.put(headers[j], row.get(j));
                }
                list.add(reaction);
            }
            ctx.json(list);
        } catch (Exception e) {
            ctx.status(500).result("Error fetching reactions for " + workspace + ": " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Criar uma nova reação",
        operationId = "createReaction",
        path = "/api/{workspace}/reactions",
        methods = HttpMethod.POST,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "201") }
    )
    public static void createReaction(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            Map<String, Object> body = ctx.bodyAsClass(Map.class);
            String name = (String) body.get("name");
            String equation = (String) body.get("equation");
            Boolean reversible = (Boolean) body.get("reversible");
            Boolean inModel = (Boolean) body.get("inModel");
            String localisation = (String) body.get("localisation");
            String pathway = (String) body.get("pathway");

            int compartmentId = 1; // Default compartment ID
            if ("outside".equalsIgnoreCase(localisation)) compartmentId = 3;
            else if ("periplasm".equalsIgnoreCase(localisation)) compartmentId = 2;

            var dbService = InitDataAccess.getInstance().getDatabaseService(workspace);
            Integer idNewReaction = dbService.insertNewReaction(
                inModel != null ? inModel : true,
                reversible != null && reversible ? -1000.0 : 0.0,
                1000.0,
                null,
                equation,
                false,
                false,
                false,
                name,
                "MANUAL",
                compartmentId,
                null
            );

            Map<String, Object> response = new HashMap<>();
            response.put("id", idNewReaction);
            response.put("name", name);
            response.put("equation", equation);
            response.put("reversible", reversible);
            response.put("inModel", inModel);
            response.put("localisation", localisation);
            response.put("pathway", pathway);
            response.put("notes", "Manually inserted via Web UI");

            ctx.status(201).json(response);
        } catch (Exception e) {
            ctx.status(500).result("Error creating reaction: " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Atualizar uma reação",
        operationId = "updateReaction",
        path = "/api/{workspace}/reactions/{id}",
        methods = HttpMethod.PUT,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true),
            @OpenApiParam(name = "id", description = "ID da reação", required = true)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void updateReaction(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            Map<String, Object> body = ctx.bodyAsClass(Map.class);
            Boolean inModel = (Boolean) body.get("inModel");
            Boolean reversible = (Boolean) body.get("reversible");
            String equation = (String) body.get("equation");

            if (inModel != null) {
                ModelReactionsServices.updateModelReactionInModelByReactionId(workspace, id, inModel);
            }
            if (reversible != null && equation != null) {
                ModelReactionsServices.updateModelReactionReversibleAndLowerBoundAndEquationByReactionId(
                    reversible, reversible ? -1000L : 0L, id, equation, workspace
                );
            }
            ctx.status(200).result("Reaction updated successfully");
        } catch (Exception e) {
            ctx.status(500).result("Error updating reaction: " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Remover uma reação",
        operationId = "deleteReaction",
        path = "/api/{workspace}/reactions/{id}",
        methods = HttpMethod.DELETE,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true),
            @OpenApiParam(name = "id", description = "ID da reação", required = true)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void deleteReaction(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            ModelReactionsServices.removeReactionByReactionId(workspace, id);
            ctx.status(200).result("Reaction removed successfully");
        } catch (Exception e) {
            ctx.status(500).result("Error removing reaction: " + e.getMessage());
        }
    }
}
