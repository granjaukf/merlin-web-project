package pt.uminho.ceb.biosystems.merlin.web.controllers;

import io.javalin.http.Context;
import io.javalin.http.UploadedFile;
import io.javalin.openapi.HttpMethod;
import io.javalin.openapi.OpenApi;
import io.javalin.openapi.OpenApiContent;
import io.javalin.openapi.OpenApiResponse;
import io.javalin.openapi.OpenApiParam;
import io.javalin.openapi.OpenApiRequestBody;

import pt.uminho.ceb.biosystems.merlin.services.ProjectServices;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelGenesServices;
import pt.uminho.ceb.biosystems.merlin.services.model.ModelSequenceServices;
import pt.uminho.ceb.biosystems.merlin.core.utilities.Enumerators.SequenceType;
import pt.uminho.ceb.biosystems.merlin.bioapis.externalAPI.ncbi.CreateGenomeFile;
import pt.uminho.ceb.biosystems.merlin.bioapis.externalAPI.ncbi.containers.DocumentSummary;
import pt.uminho.ceb.biosystems.merlin.bioapis.externalAPI.ncbi.containers.DocumentSummarySet;
import pt.uminho.ceb.biosystems.merlin.bioapis.externalAPI.utilities.Enumerators.FileExtensions;
import pt.uminho.ceb.biosystems.merlin.utilities.io.FileUtils;
import pt.uminho.ceb.biosystems.mew.utilities.datastructures.pair.Pair;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class GenomeImportController {

    public static class NCBIImportRequest {
        public String taxonomyID;
        public String uid;
        public boolean isGenBank;
    }

    @OpenApi(summary = "Pesquisar montagens no NCBI por ID de Taxonomia", operationId = "searchNCBI", path = "/api/workspaces/ncbi-search", methods = HttpMethod.GET, queryParams = {
            @OpenApiParam(name = "taxonomyID", description = "ID de Taxonomia do organismo", required = true)
    }, responses = {
            @OpenApiResponse(status = "200", description = "Lista de montagens encontradas", content = {
                    @OpenApiContent(from = Map[].class)
            })
    })
    public static void searchNCBI(Context ctx) {
        String taxonomyID = ctx.queryParam("taxonomyID");
        if (taxonomyID == null || taxonomyID.isBlank()) {
            ctx.status(400).json(Map.of("error", "O parâmetro taxonomyID é obrigatório."));
            return;
        }

        try {
            DocumentSummarySet summaries = CreateGenomeFile.getESummaryFromNCBI(taxonomyID);
            List<Map<String, String>> results = new ArrayList<>();
            if (summaries != null && summaries.documentSummary != null) {
                for (DocumentSummary doc : summaries.documentSummary) {
                    results.add(doc.toHashMap());
                }
            }
            ctx.json(results);
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("error", "Erro ao pesquisar no NCBI: " + e.getMessage()));
        }
    }

    @OpenApi(summary = "Descarregar e importar genoma do NCBI", operationId = "importNCBI", path = "/api/{workspace}/import-ncbi", methods = HttpMethod.POST, pathParams = {
            @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true)
    }, requestBody = @OpenApiRequestBody(content = {
            @OpenApiContent(from = NCBIImportRequest.class)
    }), responses = {
            @OpenApiResponse(status = "200", description = "Genoma importado com sucesso")
    })
    public static void importNCBI(Context ctx) {
        String workspaceName = ctx.pathParam("workspace");
        try {
            NCBIImportRequest req = ctx.bodyAsClass(NCBIImportRequest.class);
            if (req.taxonomyID == null || req.uid == null) {
                ctx.status(400).json(Map.of("error", "Os campos taxonomyID e uid são obrigatórios."));
                return;
            }

            Long taxID = Long.parseLong(req.taxonomyID);

            // 1. search to get the correct assembly
            DocumentSummarySet summaries = CreateGenomeFile.getESummaryFromNCBI(req.taxonomyID);
            DocumentSummary selectedDoc = null;
            if (summaries != null && summaries.documentSummary != null) {
                for (DocumentSummary doc : summaries.documentSummary) {
                    if (req.uid.equals(doc.uid)) {
                        selectedDoc = doc;
                        break;
                    }
                }
            }

            if (selectedDoc == null) {
                ctx.status(404).json(Map.of("error", "Montagem com UID " + req.uid + " não encontrada no NCBI."));
                return;
            }

            // 2. create workspace/taxonomia directory
            CreateGenomeFile.createFolder(workspaceName, taxID);

            // 3. save assembly record info
            CreateGenomeFile.saveAssemblyRecordInfo(selectedDoc, workspaceName);

            // 4. Get FTP URLs and download
            ArrayList<String> ftpUrls = (ArrayList<String>) CreateGenomeFile.getFtpURLFromAssemblyUID(selectedDoc,
                    req.isGenBank);
            CreateGenomeFile.getFilesFromFtpURL(ftpUrls, workspaceName);

            // 4. path to downloaded files
            String taxonomyFolder = FileUtils.getWorkspaceTaxonomyFolderPath(workspaceName, taxID);
            File faaFile = new File(taxonomyFolder + File.separator + FileExtensions.PROTEIN_FAA.getName());
            File fnaFile = new File(taxonomyFolder + File.separator + FileExtensions.CDS_FROM_GENOMIC.getName());

            Map<String, String[]> faaMap = new HashMap<>();
            Map<String, String[]> fnaMap = new HashMap<>();

            // 5. parse downloaded files
            if (faaFile.exists()) {
                CreateGenomeFile.createGenomeFileFromFasta(workspaceName, taxID, faaFile, FileExtensions.PROTEIN_FAA,
                        faaMap);
            }
            if (fnaFile.exists()) {
                CreateGenomeFile.createGenomeFileFromFasta(workspaceName, taxID, fnaFile,
                        FileExtensions.CDS_FROM_GENOMIC, fnaMap);
            }

            // 6. update project tables
            ProjectServices.updateProjectsByGenomeID(workspaceName, taxID, selectedDoc.toHashMap());

            // 7. load genes and sequences
            Map<String, Integer> geneIDsMap = ModelGenesServices.getGeneIDsByQuery(workspaceName);

            if (!faaMap.isEmpty()) {
                Map<Integer, String[]> sequenceMap = new HashMap<>();
                for (String key : faaMap.keySet()) {
                    String[] array = faaMap.get(key);
                    Pair<String, String> pair = new Pair<>(array[0], array[3]);
                    Integer geneID = ModelGenesServices.loadGene(pair, key, geneIDsMap, "fasta file", workspaceName);
                    sequenceMap.put(geneID, Arrays.copyOfRange(array, 1, array.length));
                }
                ModelSequenceServices.loadFastaSequences(workspaceName, sequenceMap, SequenceType.PROTEIN);
            }

            if (!fnaMap.isEmpty()) {
                Map<Integer, String[]> sequenceMap = new HashMap<>();
                for (String key : fnaMap.keySet()) {
                    String[] array = fnaMap.get(key);
                    Pair<String, String> pair = new Pair<>(array[0], array[3]);
                    Integer geneID = ModelGenesServices.loadGene(pair, key, geneIDsMap, "fasta file", workspaceName);
                    sequenceMap.put(geneID, Arrays.copyOfRange(array, 1, array.length));
                }
                ModelSequenceServices.loadFastaSequences(workspaceName, sequenceMap, SequenceType.CDS_DNA);
            }

            ctx.json(Map.of("message", "Genoma importado com sucesso do NCBI!"));

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("error", "Erro ao importar genoma do NCBI: " + e.getMessage()));
        }
    }

    @OpenApi(summary = "Importar ficheiro FASTA local", operationId = "importFasta", path = "/api/{workspace}/import-fasta", methods = HttpMethod.POST, pathParams = {
            @OpenApiParam(name = "workspace", description = "Nome do workspace", required = true)
    }, queryParams = {
            @OpenApiParam(name = "type", description = "Tipo de ficheiro (protein, cds, genomic, rna, genbank)", required = true),
            @OpenApiParam(name = "taxonomyID", description = "ID de Taxonomia", required = true)
    }, responses = {
            @OpenApiResponse(status = "200", description = "Ficheiro importado com sucesso")
    })
    public static void importFasta(Context ctx) {
        String workspaceName = ctx.pathParam("workspace");
        String type = ctx.queryParam("type");
        String taxonomyIDStr = ctx.queryParam("taxonomyID");

        if (type == null || taxonomyIDStr == null) {
            ctx.status(400).json(Map.of("error", "Os parâmetros type e taxonomyID são obrigatórios."));
            return;
        }

        UploadedFile uploadedFile = ctx.uploadedFile("file");
        if (uploadedFile == null) {
            ctx.status(400).json(Map.of("error", "Nenhum ficheiro foi enviado."));
            return;
        }

        try {
            Long taxID = Long.parseLong(taxonomyIDStr);

            FileExtensions fileExtension;
            SequenceType sequenceType;

            switch (type.toLowerCase()) {
                case "protein":
                    fileExtension = FileExtensions.PROTEIN_FAA;
                    sequenceType = SequenceType.PROTEIN;
                    break;
                case "cds":
                    fileExtension = FileExtensions.CDS_FROM_GENOMIC;
                    sequenceType = SequenceType.CDS_DNA;
                    break;
                case "genomic":
                    fileExtension = FileExtensions.GENOMIC_FNA;
                    sequenceType = SequenceType.GENOMIC_DNA;
                    break;
                case "rna":
                    fileExtension = FileExtensions.RNA_FROM_GENOMIC;
                    sequenceType = SequenceType.RNA;
                    break;
                case "genbank":
                    fileExtension = FileExtensions.CUSTOM_GENBANK_FILE;
                    sequenceType = SequenceType.GENOMIC_DNA;
                    break;
                default:
                    ctx.status(400).json(Map.of("error", "Tipo de ficheiro inválido."));
                    return;
            }

            // save in temp file to parse
            File tempFile = File.createTempFile("import_", "_" + uploadedFile.filename(),
                    new File(FileUtils.getCurrentTempDirectory()));
            try (InputStream is = uploadedFile.content();
                    OutputStream os = new FileOutputStream(tempFile)) {
                is.transferTo(os);
            }

            Map<String, String[]> fastaMap = new HashMap<>();
            CreateGenomeFile.createGenomeFileFromFasta(workspaceName, taxID, tempFile, fileExtension, fastaMap);

            Map<String, Integer> geneIDsMap = ModelGenesServices.getGeneIDsByQuery(workspaceName);
            Map<Integer, String[]> sequenceMap = new HashMap<>();

            for (String key : fastaMap.keySet()) {
                String[] array = fastaMap.get(key);
                Pair<String, String> pair = new Pair<>(array[0], array[3]);
                Integer geneID = ModelGenesServices.loadGene(pair, key, geneIDsMap, "fasta file", workspaceName);
                sequenceMap.put(geneID, Arrays.copyOfRange(array, 1, array.length));
            }

            ModelSequenceServices.loadFastaSequences(workspaceName, sequenceMap, sequenceType);

            // Remove temporary file
            tempFile.delete();

            ctx.json(Map.of("message", "Ficheiro FASTA importado com sucesso!"));

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of("error", "Erro ao importar ficheiro FASTA: " + e.getMessage()));
        }
    }
}
