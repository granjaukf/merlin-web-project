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

        // ─── Rotas ──────────────────────────────────────────────────────────────────
        app.get("/api/workspaces", WorkspaceController::getWorkspaces);
        app.post("/api/workspaces", WorkspaceController::createWorkspace);
        app.get("/api/{workspace}/stats", StatsController::getWorkspaceStats);
        app.get("/api/{workspace}/reactions", ReactionsController::getReactions);
        app.post("/api/{workspace}/reactions", ReactionsController::createReaction);
        app.put("/api/{workspace}/reactions/{id}", ReactionsController::updateReaction);
        app.delete("/api/{workspace}/reactions/{id}", ReactionsController::deleteReaction);
        app.get("/api/{workspace}/proteins", ProteinsController::getProteins);
        app.get("/api/{workspace}/genes", GenesController::getGenes);
        app.get("/api/{workspace}/metabolites", MetabolitesController::getMetabolites);

        app.start(8085);
        System.out.println("Merlin Web Server started on http://localhost:8085");
    }
}
