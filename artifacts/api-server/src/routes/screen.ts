import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import ExcelJS from "exceljs";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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

For EACH candidate resume provided, you must:
1. Extract structured data (name, email, phone, education, skills, experience, projects)
2. Match candidate data with selected roles, job descriptions, company info, and custom keywords
3. Score candidate OUT OF 10 using: Skill Match 40%, Job Description Match 25%, Keyword Match 15%, Experience Match 10%, Education Match 10%
4. Determine best matching role and if NOT fit, suggest alternate role
5. Generate AI Summary (under 3 lines): if strong explain why; if weak explain gap
6. Extract mandatory fields: name, email, phone, graduation_year, college, degree

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
    "best_role": "string",
    "suggested_role": "string",
    "summary": "string under 3 lines",
    "skill_gap": "string",
    "resume_link": "filename"
  }
]

STRICT RULES:
- DO NOT return text outside JSON
- DO NOT skip any candidate
- If data is missing return "Not Found"
- Keep summary under 3 lines
- Ensure score is between 0-10
- Maintain 1 output object per resume`;

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
        userContent += `--- Resume ${i + 1} (File: ${resumeFiles[i].originalname}) ---\n${text}\n\n`;
      });

      userContent += `\nProcess ALL ${resumeFiles.length} resumes and return a JSON array with exactly ${resumeFiles.length} objects. Use the filename as the resume_link value.`;

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
      { header: "Role Fit", key: "role_fit", width: 10 },
      { header: "Best Role", key: "best_role", width: 22 },
      { header: "Suggested Role", key: "suggested_role", width: 22 },
      { header: "Summary", key: "summary", width: 50 },
      { header: "Skill Gap", key: "skill_gap", width: 40 },
      { header: "Resume Link", key: "resume_link", width: 30 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E40AF" },
    };

    results.forEach((result) => {
      const row = worksheet.addRow({
        ...result,
        skills_found: Array.isArray(result.skills_found) ? result.skills_found.join(", ") : result.skills_found,
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

      const fitCell = row.getCell("role_fit");
      if (result.role_fit === "YES") {
        fitCell.font = { color: { argb: "FF065F46" }, bold: true };
      } else {
        fitCell.font = { color: { argb: "FF991B1B" }, bold: true };
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
