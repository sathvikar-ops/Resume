import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import ExcelJS from "exceljs";
import { randomUUID } from "crypto";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

interface StoredFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  expiresAt: number;
}

const resumeStore = new Map<string, StoredFile>();
const FILE_TTL_MS = 2 * 60 * 60 * 1000;

function storeResume(file: Express.Multer.File): string {
  const id = randomUUID();
  resumeStore.set(id, {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
    expiresAt: Date.now() + FILE_TTL_MS,
  });
  return id;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, file] of resumeStore.entries()) {
    if (file.expiresAt < now) resumeStore.delete(id);
  }
}, 15 * 60 * 1000);

interface CandidateResult {
  name: string;
  email: string;
  phone: string;
  graduation_year: string;
  college: string;
  degree: string;
  skills_found: string[];
  score: number;
  role_fit: string;
  best_role: string;
  suggested_role: string;
  role_reason: string;
  summary: string;
  skill_gap: string;
  resume_link: string;
}

async function extractTextFromBuffer(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  try {
    if (mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword" ||
      filename.toLowerCase().endsWith(".docx") ||
      filename.toLowerCase().endsWith(".doc")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else {
      return buffer.toString("utf-8");
    }
  } catch (err) {
    return `[Error parsing file: ${filename}]`;
  }
}

const SYSTEM_PROMPT = `You are an AI Resume Screening Engine for HR Recruiters.

Your job is to analyze structured and unstructured data from multiple sources and generate accurate candidate evaluations.

For EACH candidate resume provided, follow these steps IN ORDER:

STEP 1 — Extract candidate data:
  Extract: name, email, phone, education (degree, college, graduation year), skills, tools, experience, projects.

STEP 2 — Score the candidate OUT OF 10:
  Skill Match → 40%
  Job Description Match → 25%
  Keyword Match → 15%
  Experience Match → 10%
  Education Match → 10%

STEP 3 — Decide the suggested_role:
  - Compare the candidate's skills and experience against ALL provided roles.
  - Choose the single role that best matches this specific candidate's profile.
  - This is your "suggested_role". Write it down first before writing anything else for that candidate.

STEP 4 — Write role_reason for that EXACT suggested_role:
  - CRITICAL: role_reason MUST explain why you chose the suggested_role you just decided in STEP 3.
  - role_reason must mention specific skills, tools, or experience FROM THIS CANDIDATE'S RESUME that directly justify the suggested_role.
  - role_reason must name the suggested_role explicitly. Example: "Suggested as SDE Backend because the candidate has 3 years of Java and Spring Boot experience matching the backend JD requirements."
  - Do NOT write a reason for a different role. The role named in role_reason must exactly match suggested_role.

STEP 5 — Generate AI Summary (under 3 lines):
  - If strong: explain key matching skills.
  - If weak: explain skill gaps.

STEP 6 — Identify skill_gap:
  - List skills required by the job descriptions that are missing from this candidate's resume.

STRICT OUTPUT FORMAT: Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "graduation_year": "string",
    "college": "string",
    "degree": "string",
    "skills_found": ["skill1", "skill2"],
    "score": 8.5,
    "role_fit": "YES or NO",
    "best_role": "string — same value as suggested_role",
    "suggested_role": "string — the single best-fit role for this candidate",
    "role_reason": "string — must start with 'Suggested as [suggested_role] because ...' and cite specific skills/experience from this resume",
    "summary": "string under 3 lines",
    "skill_gap": "string",
    "resume_link": "RESUME_ID_PLACEHOLDER"
  }
]

STRICT RULES:
- DO NOT return text outside JSON
- DO NOT skip any candidate
- If data is missing return "Not Found"
- Keep summary under 3 lines
- Ensure score is between 0–10
- Maintain 1 output object per resume
- role_reason MUST be about the same role as suggested_role — never mix them up`;

router.get("/resume/:id", (req: Request, res: Response) => {
  const file = resumeStore.get(req.params.id);
  if (!file) {
    res.status(404).json({ error: "Resume not found or expired. Please re-run the screening." });
    return;
  }

  const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
  const contentType = isPdf
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    isPdf
      ? `inline; filename="${file.originalname}"`
      : `attachment; filename="${file.originalname}"`
  );
  res.send(file.buffer);
});

router.post(
  "/screen",
  upload.fields([
    { name: "jobDescriptions", maxCount: 10 },
    { name: "companyInfo", maxCount: 1 },
    { name: "shortlistedResumes", maxCount: 20 },
    { name: "resumes", maxCount: 50 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const roles: string[] = JSON.parse(req.body.roles || "[]");
      const customKeywords: string[] = JSON.parse(req.body.customKeywords || "[]");

      const resumeFiles = files["resumes"] || [];
      if (resumeFiles.length === 0) {
        res.status(400).json({ error: "At least one resume file is required" });
        return;
      }

      const resumeIds = resumeFiles.map((f) => storeResume(f));

      const jdFiles = files["jobDescriptions"] || [];
      const companyFiles = files["companyInfo"] || [];
      const shortlistedFiles = files["shortlistedResumes"] || [];

      const jdTexts = await Promise.all(
        jdFiles.map((f) => extractTextFromBuffer(f.buffer, f.mimetype, f.originalname))
      );
      const companyTexts = await Promise.all(
        companyFiles.map((f) => extractTextFromBuffer(f.buffer, f.mimetype, f.originalname))
      );
      const shortlistedTexts = await Promise.all(
        shortlistedFiles.map((f) => extractTextFromBuffer(f.buffer, f.mimetype, f.originalname))
      );
      const resumeTexts = await Promise.all(
        resumeFiles.map((f) => extractTextFromBuffer(f.buffer, f.mimetype, f.originalname))
      );

      let userContent = `SELECTED ROLES: ${roles.join(", ")}\n\n`;

      if (customKeywords.length > 0) {
        userContent += `CUSTOM KEYWORDS: ${customKeywords.join(", ")}\n\n`;
      }

      if (jdTexts.length > 0) {
        userContent += `JOB DESCRIPTIONS:\n${jdTexts.map((t, i) => `--- JD ${i + 1} ---\n${t}`).join("\n\n")}\n\n`;
      }

      if (companyTexts.length > 0) {
        userContent += `COMPANY INFORMATION:\n${companyTexts.join("\n\n")}\n\n`;
      }

      if (shortlistedTexts.length > 0) {
        userContent += `PREVIOUSLY SHORTLISTED RESUMES (use as benchmark):\n${shortlistedTexts.map((t, i) => `--- Shortlisted ${i + 1} ---\n${t}`).join("\n\n")}\n\n`;
      }

      userContent += `CANDIDATE RESUMES TO SCREEN:\n`;
      resumeTexts.forEach((text, i) => {
        userContent += `--- Resume ${i + 1} (ID: ${resumeIds[i]}, File: ${resumeFiles[i].originalname}) ---\n${text}\n\n`;
      });

      userContent += `\nProcess ALL ${resumeFiles.length} resumes and return a JSON array with exactly ${resumeFiles.length} objects. For resume_link, use the Resume ID provided above for that candidate (e.g. "${resumeIds[0]}").`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";

      let results: CandidateResult[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          results = JSON.parse(jsonMatch[0]);
        } else {
          results = JSON.parse(content);
        }
      } catch {
        req.log.error({ content }, "Failed to parse AI response as JSON");
        res.status(500).json({ error: "Failed to parse AI response", details: content.slice(0, 500) });
        return;
      }

      results = results.map((r, i) => {
        const suggestedRole = r.suggested_role && r.suggested_role !== "Not Found" ? r.suggested_role : r.best_role;

        let roleReason = r.role_reason || "";
        if (
          roleReason &&
          roleReason !== "Not Found" &&
          suggestedRole &&
          suggestedRole !== "Not Found" &&
          !roleReason.toLowerCase().includes(suggestedRole.toLowerCase())
        ) {
          roleReason = `Suggested as ${suggestedRole} because: ${roleReason}`;
        }

        return {
          ...r,
          suggested_role: suggestedRole,
          best_role: suggestedRole,
          role_reason: roleReason,
          resume_link: `/api/resume/${resumeIds[i] ?? r.resume_link}`,
        };
      });

      res.json({ results, processedCount: results.length });
    } catch (err: unknown) {
      req.log.error({ err }, "Error in screen route");
      res.status(500).json({ error: "Internal server error", details: String(err) });
    }
  }
);

router.post("/download-excel", async (req: Request, res: Response) => {
  try {
    const { results }: { results: CandidateResult[] } = req.body;

    if (!results || !Array.isArray(results)) {
      res.status(400).json({ error: "results array is required" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resume Screening Results");

    worksheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Graduation Year", key: "graduation_year", width: 15 },
      { header: "College", key: "college", width: 25 },
      { header: "Degree", key: "degree", width: 25 },
      { header: "Skills Found", key: "skills_found", width: 40 },
      { header: "Score (0-10)", key: "score", width: 12 },
      { header: "Role Suggestion", key: "suggested_role", width: 25 },
      { header: "Role Suggestion Reason", key: "role_reason", width: 40 },
      { header: "Summary", key: "summary", width: 50 },
      { header: "Skill Gap", key: "skill_gap", width: 40 },
      { header: "Resume Link", key: "resume_link", width: 40 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };

    results.forEach((result) => {
      const roleSuggestion =
        result.suggested_role && result.suggested_role !== "Not Found"
          ? result.suggested_role
          : result.best_role && result.best_role !== "Not Found"
          ? result.best_role
          : "General Fit";

      const row = worksheet.addRow({
        name: result.name,
        email: result.email,
        phone: result.phone,
        graduation_year: result.graduation_year,
        college: result.college,
        degree: result.degree,
        skills_found: Array.isArray(result.skills_found) ? result.skills_found.join(", ") : result.skills_found,
        score: result.score,
        suggested_role: roleSuggestion,
        role_reason: result.role_reason || "",
        summary: result.summary,
        skill_gap: result.skill_gap,
        resume_link: result.resume_link,
      });

      const scoreCell = row.getCell("score");
      const score = Number(result.score);
      if (score >= 7.5) {
        scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
        scoreCell.font = { color: { argb: "FF065F46" } };
      } else if (score >= 5) {
        scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
        scoreCell.font = { color: { argb: "FF92400E" } };
      } else {
        scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        scoreCell.font = { color: { argb: "FF991B1B" } };
      }
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { wrapText: true, vertical: "top" };
        });
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="resume-screening-results.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: unknown) {
    req.log.error({ err }, "Error generating Excel");
    res.status(500).json({ error: "Failed to generate Excel", details: String(err) });
  }
});

export default router;
