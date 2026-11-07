
import { Project } from "../models/Project.js";
import { reviseProject } from "../services/ai.js";
import { applyOperations } from "../services/diff.js";

// Build file manifest containing path, hash and size
export function buildManifest(files) {
    const manifest = [];

    for (const [path, entry] of Object.entries(files || {})) {
        manifest.push({
            path,
            hash: entry.hash,
            size: entry.content?.length || 0
        });
    }

    return manifest;
}

// POST /api/projects/:id/chat
// Send a revision prompt and return updated project

export async function chat(req, res) {
    try {
        const { prompt } = req.body;

        // Validate prompt
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({
                error: "Prompt is required"
            });
        }

        // Check authentication
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        // Find project belonging to logged-in user
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!project) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        // Set project status to revising
        project.status = "revising";

        // Save user prompt immediately
        project.messages.push({
            role: "user",
            content: prompt.trim(),
            timestamp: new Date()
        });

        await project.save();

        try {
            // Build compact file manifest
            const manifest = buildManifest(project.files);

            // Collect existing file contents
            const relevantFiles = {};

            for (const [path, entry] of Object.entries(project.files || {})) {
                relevantFiles[path] = entry.content;
            }

            // Get recent messages (last 4)
            const recentMessages = project.messages
                .slice(-4)
                .map((m) => ({
                    role: m.role,
                    content: m.content
                }));

            console.log(
                `[AI] Revising project ${project._id}: "${prompt.slice(0, 80)}..." (${manifest.length} files)`
            );

            // Call AI revision service
            const result = await reviseProject(
                prompt.trim(),
                manifest,
                relevantFiles,
                recentMessages
            );

            if (!result || !Array.isArray(result.operations)) {
                throw new Error("Invalid response from AI revision service");
            }

            console.log(
                `[AI] Got ${result.operations.length} operations: ${result.description}`
            );

            // Apply AI operations to project files
            const {
                files: updatedFiles,
                applied,
                errors
            } = applyOperations(project.files, result.operations);

            if (errors?.length > 0) {
                console.warn("[Diff] Errors applying operations:", errors);
            }

            // Update project files
            project.files = updatedFiles;
            project.markModified("files");

            // Increment project version
            project.version += 1;

            // Update project status
            project.status = "completed";
            project.error = null;

            // Save assistant response
            project.messages.push({
                role: "assistant",
                content:
                    (result.description || "Project updated successfully.") +
                    (errors?.length > 0
                        ? `\n\nSome operations failed: ${errors.join(", ")}`
                        : ""),
                timestamp: new Date()
            });

            await project.save();

            // Convert files into frontend-friendly format
            const filesObj = {};

            for (const [path, entry] of Object.entries(project.files || {})) {
                filesObj[path] = entry.content;
            }

            // Return updated project
            return res.status(200).json({
                _id: project._id,
                name: project.name,
                description: project.description,
                files: filesObj,
                messages: project.messages,
                version: project.version,
                status: project.status,
                applied,
                errors,
                aiDescription: result.description
            });

        } catch (err) {
            console.error("[AI Revision Error]:", err);

            // Update project status after revision failure
            project.status = "failed";
            project.error = err.message;

            project.messages.push({
                role: "assistant",
                content: `Revision failed: ${err.message}`,
                timestamp: new Date()
            });

            await project.save();

            return res.status(500).json({
                error: err.message || "Failed to process revision request"
            });
        }

    } catch (err) {
        console.error("[Chat Controller Error]:", err);

        return res.status(500).json({
            error: "Something went wrong while processing your request"
        });
    }
}
