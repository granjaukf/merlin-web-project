package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiContent;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiRequestBody;
import io.javalin.openapi.OpenApiResponse;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelProteinsServices;
import pt.uminho.ceb.biosystems.merlin.core.containers.model.ProteinContainer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ProteinsController {

    public static class ProteinRequest {
        public String name;
        public String classType; // e.g. "ENZYME", "TRANSPORTER", etc.
        public String ecNumber;
    }

    @OpenApi(
        summary = "Listar proteínas de um workspace",
        operationId = "getProteins",
        path = "/api/{workspace}/proteins",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        queryParams = {
            @OpenApiParam(name = "encodedOnly", description = "Apenas proteínas no modelo (codificadas no genoma)", type = Boolean.class)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getProteins(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        boolean encodedOnly = Boolean.parseBoolean(ctx.queryParam("encodedOnly"));
        try {
            List<String[]> data = ModelProteinsServices.getMainTableData(workspace, encodedOnly);
            List<Map<String, Object>> list = new ArrayList<>();
            for (String[] row : data) {
                Map<String, Object> p = new LinkedHashMap<>();
                p.put("name", safeGet(row, 0));
                p.put("ecNumber", safeGet(row, 1));
                p.put("numReactions", safeGet(row, 2));
                p.put("identifier", safeGet(row, 3));
                p.put("inModel", "true".equalsIgnoreCase(safeGet(row, 5)));
                p.put("id", safeGet(row, 6).isEmpty() ? null : Integer.parseInt(safeGet(row, 6)));
                p.put("numGenes", safeGet(row, 7).isEmpty() ? 0 : Integer.parseInt(safeGet(row, 7)));
                list.add(p);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching proteins for " + workspace + ": " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Obter detalhes de uma proteína específica",
        operationId = "getProteinDetail",
        path = "/api/{workspace}/proteins/{id}/detail",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true),
            @OpenApiParam(name = "id", description = "ID da proteína", required = true, type = Integer.class)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getProteinDetail(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            List<List<String[]>> info = ModelProteinsServices.getRowInfo(workspace, id);
            Map<String, List<List<String>>> details = new LinkedHashMap<>();

            // Map sublists to matching labels for original Merlin tabs
            // Tab 0: Encoded Reactions
            List<List<String>> reactionsList = new ArrayList<>();
            if (info.size() > 0 && info.get(0) != null) {
                for (String[] r : info.get(0)) {
                    reactionsList.add(List.of(safeGet(r, 0), safeGet(r, 1), safeGet(r, 2), safeGet(r, 3), safeGet(r, 4)));
                }
            }
            details.put("reactions", reactionsList);

            // Tab 1: Encoding genes
            List<List<String>> genesList = new ArrayList<>();
            if (info.size() > 1 && info.get(1) != null) {
                for (String[] g : info.get(1)) {
                    genesList.add(List.of(safeGet(g, 0), safeGet(g, 1)));
                }
            }
            details.put("encoding genes", genesList);

            // Tab 2: Pathways
            List<List<String>> pathwaysList = new ArrayList<>();
            if (info.size() > 2 && info.get(2) != null) {
                for (String[] p : info.get(2)) {
                    pathwaysList.add(List.of(safeGet(p, 0), safeGet(p, 1)));
                }
            }
            details.put("pathways", pathwaysList);

            // Tab 3: Gene-Protein-Reaction
            List<List<String>> gprList = new ArrayList<>();
            if (info.size() > 3 && info.get(3) != null) {
                for (String[] gp : info.get(3)) {
                    gprList.add(List.of(safeGet(gp, 0), safeGet(gp, 1)));
                }
            }
            details.put("gene-protein-reaction", gprList);

            // Tab 4: Synonyms (Aliases Class P)
            List<List<String>> synonymsList = new ArrayList<>();
            if (info.size() > 4 && info.get(4) != null) {
                for (String[] s : info.get(4)) {
                    synonymsList.add(List.of(safeGet(s, 0)));
                }
            }
            details.put("synonyms", synonymsList);

            // Tab 5: Compartments
            List<List<String>> compartmentsList = new ArrayList<>();
            if (info.size() > 5 && info.get(5) != null) {
                for (String[] c : info.get(5)) {
                    compartmentsList.add(List.of(safeGet(c, 0)));
                }
            }
            details.put("compartments", compartmentsList);

            ctx.json(details);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching protein details: " + e.getMessage());
        }
    }

    @OpenApi(
        summary = "Obter estatísticas de proteínas de um workspace",
        operationId = "getProteinStats",
        path = "/api/{workspace}/proteins/statistics",
        methods = HttpMethod.GET,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void getProteinStats(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            List<Integer> stats = ModelProteinsServices.getStats(workspace);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("totalProteins", stats.size() > 0 ? stats.get(0) : 0);
            response.put("totalEnzymes", stats.size() > 1 ? stats.get(1) : 0);
            response.put("synonymsCount", stats.size() > 2 ? stats.get(2) : 0);
            response.put("averageSynonyms", stats.size() > 3 ? stats.get(3) : 0);
            response.put("onlyEnzymes", stats.size() > 4 ? stats.get(4) : 0);
            response.put("onlyTransporters", stats.size() > 5 ? stats.get(5) : 0);
            response.put("complexes", stats.size() > 6 ? stats.get(6) : 0);
            response.put("associatedToGenes", stats.size() > 7 ? stats.get(7) : 0);
            ctx.json(response);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching protein stats: " + e.getMessage());
        }
    }

    // ─── POST /api/{workspace}/proteins ────────────────────────────────────────

    @OpenApi(
        summary = "Inserir uma nova proteína",
        operationId = "createProtein",
        path = "/api/{workspace}/proteins",
        methods = HttpMethod.POST,
        tags = {"Workspace Data"},
        pathParams = { @OpenApiParam(name = "workspace", required = true) },
        requestBody = @OpenApiRequestBody(content = { @OpenApiContent(from = ProteinRequest.class) }),
        responses = { @OpenApiResponse(status = "201") }
    )
    public static void createProtein(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            ProteinRequest req = ctx.bodyAsClass(ProteinRequest.class);
            String classType = (req.classType != null && !req.classType.isBlank()) ? req.classType : "ENZYME";
            Integer newId = ModelProteinsServices.insertProtein(workspace, req.name, classType);
            ctx.status(201).json(Map.of("id", newId != null ? newId : -1, "message", "Proteína inserida com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error creating protein: " + e.getMessage());
        }
    }

    // ─── PUT /api/{workspace}/proteins/{id} ─────────────────────────────────────

    @OpenApi(
        summary = "Atualizar uma proteína existente",
        operationId = "updateProtein",
        path = "/api/{workspace}/proteins/{id}",
        methods = HttpMethod.PUT,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", required = true),
            @OpenApiParam(name = "id", required = true, type = Integer.class)
        },
        requestBody = @OpenApiRequestBody(content = { @OpenApiContent(from = ProteinRequest.class) }),
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void updateProtein(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            ProteinRequest req = ctx.bodyAsClass(ProteinRequest.class);
            ProteinContainer protein = new ProteinContainer(req.ecNumber != null ? req.ecNumber : "");
            protein.setIdProtein(id);
            protein.setName(req.name);
            if (req.classType != null) protein.setClass_(req.classType);
            if (req.ecNumber != null) protein.setExternalIdentifier(req.ecNumber);
            ModelProteinsServices.updateProtein(workspace, protein, new String[0], new String[0], new String[0], new String[0]);
            ctx.status(200).json(Map.of("message", "Proteína atualizada com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error updating protein: " + e.getMessage());
        }
    }

    // ─── DELETE /api/{workspace}/proteins/{id} ──────────────────────────────────

    @OpenApi(
        summary = "Remover uma proteína específica",
        operationId = "deleteProtein",
        path = "/api/{workspace}/proteins/{id}",
        methods = HttpMethod.DELETE,
        tags = {"Workspace Data"},
        pathParams = {
            @OpenApiParam(name = "workspace", required = true),
            @OpenApiParam(name = "id", required = true, type = Integer.class)
        },
        responses = { @OpenApiResponse(status = "200") }
    )
    public static void deleteProtein(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            ModelProteinsServices.removeProtein(workspace, id);
            ctx.status(200).json(Map.of("message", "Proteína removida com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error deleting protein: " + e.getMessage());
        }
    }

    private static String safeGet(String[] arr, int i) {
        return (arr != null && i < arr.length && arr[i] != null) ? arr[i] : "";
    }
}
