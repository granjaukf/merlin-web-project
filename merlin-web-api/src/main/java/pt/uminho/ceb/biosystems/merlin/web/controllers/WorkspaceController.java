package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiContent;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.DatabaseServices;
import pt.uminho.ceb.biosystems.merlin.services.ProjectServices;
import pt.uminho.ceb.biosystems.merlin.core.utilities.Enumerators.Compartments;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelCompartmentServices;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WorkspaceController {

    public static class WorkspaceRequest {
        public String name;
        public String taxonomyID;
    }

    @OpenApi(summary = "Obter todos os workspaces", operationId = "getWorkspaces", path = "/api/workspaces", methods = HttpMethod.GET, tags = {
            "Workspaces" }, responses = {
                    @OpenApiResponse(status = "200", description = "Lista de nomes de bases de dados", content = {
                            @OpenApiContent(from = String[].class) })
            })
    public static void getWorkspaces(Context ctx) {
        try {
            List<String> databases = DatabaseServices.getDatabasesAvailable();
            ctx.json(databases);
        } catch (Exception e) {
            ctx.status(500).result("Error fetching workspaces: " + e.getMessage());
        }
    }

    @OpenApi(summary = "Criar um novo workspace", operationId = "createWorkspace", path = "/api/workspaces", methods = HttpMethod.POST, tags = {
            "Workspaces" }, requestBody = @io.javalin.openapi.OpenApiRequestBody(content = {
                    @OpenApiContent(from = WorkspaceRequest.class) }), responses = {
                            @OpenApiResponse(status = "201", description = "Workspace criado com sucesso"),
                            @OpenApiResponse(status = "400", description = "Nome inválido ou já existente")
                    })
    public static void createWorkspace(Context ctx) {
        try {
            WorkspaceRequest req = ctx.bodyAsClass(WorkspaceRequest.class);
            String name = req.name;
            String taxonomyIDStr = req.taxonomyID;

            if (name == null || name.isBlank()) {
                ctx.status(400).json(Map.of("error", "Invalid name provided."));
                return;
            }

            List<String> existingWorkspaces = DatabaseServices.getDatabasesAvailable();
            if (existingWorkspaces.contains(name)) {
                ctx.status(400).json(Map.of("error", "Workspace with the provided name already exists."));
                return;
            }

            // 1. Gera a BD
            DatabaseServices.generateDatabase(name);

            // Confirmação de que foi criada
            if (!DatabaseServices.getDatabasesAvailable().contains(name)) {
                ctx.status(500).json(Map.of("error", "Failed to verify workspace creation."));
                return;
            }

            // 2. Injeta os dados base (Compartments INSIDE/OUTSIDE)
            if (ModelCompartmentServices.getCompartmentByAbbreviation(name, Compartments.INSIDE.getAbbreviation()) == null) {
                ModelCompartmentServices.insertNameAndAbbreviation(name, Compartments.INSIDE.getName().toString(), Compartments.INSIDE.getAbbreviation());
            }
            if (ModelCompartmentServices.getCompartmentByAbbreviation(name, Compartments.OUTSIDE.getAbbreviation()) == null) {
                ModelCompartmentServices.insertNameAndAbbreviation(name, Compartments.OUTSIDE.getName().toString(), Compartments.OUTSIDE.getAbbreviation());
            }

            // 3. Associa a taxonomia (se fornecida)
            Long taxonomyID = null;
            if (taxonomyIDStr != null && !taxonomyIDStr.isBlank()) {
                taxonomyID = Long.parseLong(taxonomyIDStr);
                ProjectServices.updateOrganismID(name, taxonomyID);
            }

            // Retorna sucesso
            Map<String, Object> response = new HashMap<>();
            response.put("name", name);
            if (taxonomyID != null) {
                response.put("taxonomyID", taxonomyID);
            }
            ctx.status(201).json(response);

        } catch (NumberFormatException e) {
            ctx.status(400).json(Map.of("error", "taxonomyID must be a valid number."));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("error", "Error creating workspace: " + e.getMessage()));
        }
    }
}
