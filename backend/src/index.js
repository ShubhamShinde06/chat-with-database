import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── helper: create connection from connection string ─────────────────────────
async function getConn(connStr) {
  const url = new URL(connStr);
  return mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.replace("/", ""),
    ssl:
      url.searchParams.get("ssl") === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

// ─── helper: read full schema from DB ────────────────────────────────────────
async function fetchSchema(conn) {
  const [tables] = await conn.query("SHOW TABLES");
  const tableNames = tables.map((r) => Object.values(r)[0]);
  const schema = {};
  for (const tbl of tableNames) {
    const [cols] = await conn.query(`DESCRIBE \`${tbl}\``);
    schema[tbl] = cols.map((c) => ({
      field: c.Field,
      type: c.Type,
      key: c.Key,
      nullable: c.Null === "YES",
    }));
  }
  return schema;
}

// ─── helper: schema object → readable text for Gemini prompt ─────────────────
function schemaToText(schema) {
  return Object.entries(schema)
    .map(([tbl, cols]) => {
      const colDefs = cols
        .map(
          (c) =>
            `  - ${c.field} ${c.type}${c.key === "PRI" ? " PRIMARY KEY" : c.key === "MUL" ? " (FK)" : ""}`,
        )
        .join("\n");
      return `Table: ${tbl}\n${colDefs}`;
    })
    .join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/connect
// Body: { connectionString }
// Returns: { success, tables, schema }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/connect", async (req, res) => {
  const { connectionString } = req.body;
  if (!connectionString)
    return res.status(400).json({ error: "connectionString required" });

  let conn;
  try {
    conn = await getConn(connectionString);
    const schema = await fetchSchema(conn);
    res.json({ success: true, tables: Object.keys(schema), schema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.end();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/query
// Body: { connectionString, schema, question }
// Returns: { sql, explanation, rows, columns }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/query", async (req, res) => {
  const { connectionString, schema, question } = req.body;
  if (!connectionString || !schema || !question)
    return res
      .status(400)
      .json({ error: "connectionString, schema, and question are required" });

  // Step 1: Gemini generates SQL
  let sql = "",
    explanation = "";
  try {
    const prompt = `You are an expert MySQL developer.

Database schema:
${schemaToText(schema)}

User question: "${question}"

Rules:
1. Write ONE valid MySQL SELECT query that answers the question.
2. Only use SELECT — never INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE.
3. Use backticks for table and column names.
4. Respond ONLY with a raw JSON object (no markdown, no code fences):
{"sql":"...","explanation":"..."}`;

    const result = await model.generateContent(prompt);
    const raw = result.response
      .text()
      .trim()
      .replace(/```json|```/gi, "") // strip any markdown fences
      .trim();

    const parsed = JSON.parse(raw);
    sql = parsed.sql;
    explanation = parsed.explanation;
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Gemini failed to generate SQL: " + err.message });
  }

  // Safety: only allow SELECT
  const firstWord = sql.trim().split(/\s+/)[0].toUpperCase();
  if (firstWord !== "SELECT")
    return res
      .status(403)
      .json({ error: "Only SELECT queries are allowed.", sql });

  // Step 2: Run SQL on real MySQL DB
  let conn;
  try {
    conn = await getConn(connectionString);
    const [rows, fields] = await conn.query(sql);
    res.json({ sql, explanation, rows, columns: fields.map((f) => f.name) });
  } catch (err) {
    res
      .status(500)
      .json({ error: "SQL execution failed: " + err.message, sql });
  } finally {
    if (conn) await conn.end();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tables/:table  — preview first 50 rows of any table
// Body: { connectionString }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/tables/:table", async (req, res) => {
  const { connectionString } = req.body;
  const tbl = req.params.table;
  let conn;
  try {
    conn = await getConn(connectionString);
    const [rows, fields] = await conn.query(
      `SELECT * FROM \`${tbl}\` LIMIT 50`,
    );
    res.json({ rows, columns: fields.map((f) => f.name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.end();
  }
});

const PORT = process.env.PORT || 8000

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
