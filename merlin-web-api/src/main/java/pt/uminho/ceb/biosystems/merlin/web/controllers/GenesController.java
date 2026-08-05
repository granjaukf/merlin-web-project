package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiResponse;
import io.javalin.openapi.OpenApiRequestBody;
import io.javalin.openapi.OpenApiContent;

import pt.uminho.ceb.biosystems.merlin.services.model.ModelGenesServices;
import pt.uminho.ceb.biosystems.merlin.core.containers.model.GeneContainer;
import pt.uminho.ceb.biosystems.merlin.core.utilities.Enumerators.SourceType;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class GenesController {

    public static class GeneRequest {
        public String locusTag;
        public String name;
        public String query;
        public String transcriptionDirection;
        public String leftEndPosition;
        public String rightEndPosition;
        public String origin;
    }

    @OpenApi(summary = "Listar genes de um workspace com colunas detalhadas", operationId = "getGenes", path = "/api/{workspace}/genes", methods = HttpMethod.GET, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) }, queryParams = {
                            @OpenApiParam(name = "encodedOnly", description = "Apenas genes codificantes", type = Boolean.class)
                    }, responses = { @OpenApiResponse(status = "200") })
    public static void getGenes(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        boolean encodedOnly = Boolean.parseBoolean(ctx.queryParam("encodedOnly"));
        try {
            List<String[]> genesList;
            if (encodedOnly) {
                genesList = ModelGenesServices.getEncodingGenes(workspace);
            } else {
                genesList = ModelGenesServices.getAllGenes2(workspace);
            }

            List<Map<String, Object>> list = new ArrayList<>();
            for (String[] item : genesList) {
                Map<String, Object> g = new LinkedHashMap<>();
                g.put("id", Integer.parseInt(item[0]));
                g.put("locusTag", item[1]);
                g.put("name", item[2]);
                g.put("subunits", Integer.parseInt(item[3]));
                g.put("proteins", Integer.parseInt(item[4]));
                g.put("identifier", item[5]);
                list.add(g);
            }
            ctx.json(list);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching genes for " + workspace + ": " + e.getMessage());
        }
    }

    @OpenApi(summary = "Obter detalhes de um gene específico (sinónimos, ortólogos, etc)", operationId = "getGeneDetail", path = "/api/{workspace}/genes/{id}/detail", methods = HttpMethod.GET, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true),
                    @OpenApiParam(name = "id", description = "ID do gene", required = true, type = Integer.class)
            }, responses = { @OpenApiResponse(status = "200") })
    public static void getGeneDetail(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            Map<String, List<List<String>>> details = ModelGenesServices.getRowInfo(workspace, id);
            ctx.json(details);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching gene details: " + e.getMessage());
        }
    }

    @OpenApi(summary = "Obter estatísticas de genes de um workspace", operationId = "getGeneStats", path = "/api/{workspace}/genes/statistics", methods = HttpMethod.GET, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) }, responses = {
                            @OpenApiResponse(status = "200") })
    public static void getGeneStats(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            double[] stats = ModelGenesServices.getStats(workspace);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("totalGenes", stats[0]);
            response.put("genesWithNoName", stats[1]);
            response.put("synonymsCount", stats[2]);
            response.put("averageSynonyms", stats[3]);
            response.put("proteinsEncoded", stats[4]);
            response.put("onlyEnzymes", stats[5]);
            response.put("onlyTransporters", stats[6]);
            response.put("bothEnzymesTransporters", stats[7]);
            response.put("genesInModel", stats[8]);
            ctx.json(response);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error fetching gene stats: " + e.getMessage());
        }
    }

    @OpenApi(summary = "Inserir um novo gene", operationId = "createGene", path = "/api/{workspace}/genes", methods = HttpMethod.POST, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) }, requestBody = @OpenApiRequestBody(content = {
                            @OpenApiContent(from = GeneRequest.class) }), responses = {
                                    @OpenApiResponse(status = "201") })
    public static void createGene(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        try {
            GeneRequest req = ctx.bodyAsClass(GeneRequest.class);
            GeneContainer gene = new GeneContainer((Integer) null); // yes, (Integer) null. java's compiler gets
                                                                    // confused by null, so we must spell it out.
            gene.setLocusTag(req.locusTag);
            gene.setName(req.name);
            gene.setExternalIdentifier(req.query != null ? req.query : req.locusTag);
            gene.setLeft_end_position(req.leftEndPosition);
            gene.setRight_end_position(req.rightEndPosition);
            gene.setTranscriptionDirection(req.transcriptionDirection);
            if (req.origin != null) {
                try {
                    gene.setOrigin(SourceType.valueOf(req.origin.toUpperCase()));
                } catch (Exception ignored) {
                }
            } else {
                gene.setOrigin(SourceType.MANUAL);
            }

            Integer newId = ModelGenesServices.insertNewGene(workspace, gene);
            ctx.status(201).json(Map.of("id", newId, "message", "Gene inserido com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error creating gene: " + e.getMessage());
        }
    }

    @OpenApi(summary = "Atualizar um gene existente", operationId = "updateGene", path = "/api/{workspace}/genes/{id}", methods = HttpMethod.PUT, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true),
                    @OpenApiParam(name = "id", description = "ID do gene", required = true, type = Integer.class)
            }, requestBody = @OpenApiRequestBody(content = { @OpenApiContent(from = GeneRequest.class) }), responses = {
                    @OpenApiResponse(status = "200") })
    public static void updateGene(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        try {
            GeneRequest req = ctx.bodyAsClass(GeneRequest.class);
            GeneContainer gene = new GeneContainer(id);
            gene.setLocusTag(req.locusTag);
            gene.setName(req.name);
            gene.setExternalIdentifier(req.query);
            gene.setLeft_end_position(req.leftEndPosition);
            gene.setRight_end_position(req.rightEndPosition);
            gene.setTranscriptionDirection(req.transcriptionDirection);
            if (req.origin != null) {
                try {
                    gene.setOrigin(SourceType.valueOf(req.origin.toUpperCase()));
                } catch (Exception ignored) {
                }
            }

            ModelGenesServices.updateGene(workspace, gene);
            ctx.status(200).json(Map.of("message", "Gene atualizado com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error updating gene: " + e.getMessage());
        }
    }

    @OpenApi(summary = "Remover um gene específico", operationId = "deleteGene", path = "/api/{workspace}/genes/{id}", methods = HttpMethod.DELETE, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true),
                    @OpenApiParam(name = "id", description = "ID do gene", required = true, type = Integer.class)
            }, queryParams = {
                    @OpenApiParam(name = "encodedOnly", description = "Apenas genes codificantes", type = Boolean.class)
            }, responses = { @OpenApiResponse(status = "200") })
    public static void deleteGene(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        int id = Integer.parseInt(ctx.pathParam("id"));
        boolean encodedOnly = Boolean.parseBoolean(ctx.queryParam("encodedOnly"));
        try {
            ModelGenesServices.removeGene(workspace, id, encodedOnly);
            ctx.status(200).json(Map.of("message", "Gene removido com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error deleting gene: " + e.getMessage());
        }
    }

    @OpenApi(summary = "Remover todos os genes do workspace", operationId = "deleteAllGenes", path = "/api/{workspace}/genes", methods = HttpMethod.DELETE, tags = {
            "Workspace Data" }, pathParams = {
                    @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true) }, queryParams = {
                            @OpenApiParam(name = "encodedOnly", description = "Apenas genes codificantes", type = Boolean.class)
                    }, responses = { @OpenApiResponse(status = "200") })
    public static void deleteAllGenes(Context ctx) {
        String workspace = ctx.pathParam("workspace");
        boolean encodedOnly = Boolean.parseBoolean(ctx.queryParam("encodedOnly"));
        try {
            if (encodedOnly) {
                ModelGenesServices.removeGenes(workspace, true);
            } else {
                ModelGenesServices.removeAllGenes(workspace);
            }
            ctx.status(200).json(Map.of("message", "Todos os genes foram removidos com sucesso"));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result("Error deleting all genes: " + e.getMessage());
        }
    }
}
