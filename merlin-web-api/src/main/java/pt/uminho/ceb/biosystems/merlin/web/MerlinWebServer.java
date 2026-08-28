package pt.uminho.ceb.biosystems.merlin.web;

import io.javalin.Javalin;
import io.javalin.openapi.plugin.OpenApiPlugin;
import io.javalin.openapi.plugin.swagger.SwaggerPlugin;

import pt.uminho.ceb.biosystems.merlin.web.controllers.WorkspaceController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.StatsController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.ReactionsController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.ProteinsController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.GenesController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.MetabolitesController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.PathwaysController;
import pt.uminho.ceb.biosystems.merlin.web.controllers.GenomeImportController;

public class MerlinWebServer {

    public static void main(String[] args) {
        // Point to the Merlin GUI working dir so H2 databases are found
        String workspaceDir = System.getenv("MERLIN_HOME");
        if (workspaceDir == null) {
            workspaceDir = "/Users/granjaukf/Desktop/merlin-workspace/merlin-project/merlin-gui/target/merlin"; // fallback
                                                                                                                // só
                                                                                                                // para
                                                                                                                // desenvolvimento
        }
        System.setProperty("user.dir", workspaceDir);

        Javalin app = Javalin
                .create(config -> {
                    config.bundledPlugins.enableCors(cors -> cors.addRule(it -> it.anyHost()));

                    config.registerPlugin(new OpenApiPlugin(openapiConfig -> {
                        openapiConfig.withDefinitionConfiguration((version, definition) -> {
                            definition.withInfo(openApiInfo -> {
                                openApiInfo.setTitle("Merlin Web API");
                                openApiInfo.setVersion("1.0.0");
                            });
                        });
                    }));

                    config.registerPlugin(new SwaggerPlugin(swaggerConfig -> {
                        swaggerConfig.setUiPath("/swagger");
                        swaggerConfig.setDocumentationPath("/openapi");
                    }));
                });

        // routes
        app.get("/api/workspaces", WorkspaceController::getWorkspaces);
        app.post("/api/workspaces", WorkspaceController::createWorkspace);
        app.delete("/api/workspaces/{name}", WorkspaceController::deleteWorkspace);
        app.get("/api/workspaces/ncbi-search", GenomeImportController::searchNCBI);
        app.post("/api/{workspace}/import-ncbi", GenomeImportController::importNCBI);
        app.post("/api/{workspace}/import-fasta", GenomeImportController::importFasta);
        app.get("/api/{workspace}/stats", StatsController::getWorkspaceStats);
        app.get("/api/{workspace}/reactions", ReactionsController::getReactions);
        app.post("/api/{workspace}/reactions", ReactionsController::createReaction);
        app.put("/api/{workspace}/reactions/{id}", ReactionsController::updateReaction);
        app.delete("/api/{workspace}/reactions/{id}", ReactionsController::deleteReaction);
        app.get("/api/{workspace}/reactions/{id}/detail", ReactionsController::getReactionDetail);
        app.get("/api/{workspace}/proteins", ProteinsController::getProteins);
        app.get("/api/{workspace}/proteins/statistics", ProteinsController::getProteinStats);
        app.get("/api/{workspace}/proteins/{id}/detail", ProteinsController::getProteinDetail);
        app.post("/api/{workspace}/proteins", ProteinsController::createProtein);
        app.put("/api/{workspace}/proteins/{id}", ProteinsController::updateProtein);
        app.delete("/api/{workspace}/proteins/{id}", ProteinsController::deleteProtein);
        app.get("/api/{workspace}/genes", GenesController::getGenes);
        app.get("/api/{workspace}/genes/statistics", GenesController::getGeneStats);
        app.get("/api/{workspace}/genes/{id}/detail", GenesController::getGeneDetail);
        app.post("/api/{workspace}/genes", GenesController::createGene);
        app.put("/api/{workspace}/genes/{id}", GenesController::updateGene);
        app.delete("/api/{workspace}/genes", GenesController::deleteAllGenes);
        app.delete("/api/{workspace}/genes/{id}", GenesController::deleteGene);
        app.get("/api/{workspace}/metabolites", MetabolitesController::getMetabolites);
        app.get("/api/{workspace}/metabolites/statistics", MetabolitesController::getMetaboliteStats);
        app.get("/api/{workspace}/metabolites/{id}/detail", MetabolitesController::getMetaboliteDetail);
        app.post("/api/{workspace}/metabolites", MetabolitesController::createMetabolite);
        app.put("/api/{workspace}/metabolites/{id}", MetabolitesController::updateMetabolite);
        app.delete("/api/{workspace}/metabolites/{id}", MetabolitesController::deleteMetabolite);
        app.get("/api/{workspace}/pathways", PathwaysController::getPathways);
        app.get("/api/{workspace}/pathways/statistics", PathwaysController::getPathwayStats);
        app.get("/api/{workspace}/pathways/{id}/detail", PathwaysController::getPathwayDetail);

        app.start(8085);
        System.out.println("Merlin Web Server started on http://localhost:8085");
    }
}
