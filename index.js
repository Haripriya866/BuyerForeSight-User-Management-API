const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "users.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);

    const rowCountResult = await db.get(
      "SELECT COUNT(*) as rowCount FROM users",
    );
    if (rowCountResult.rowCount === 0) {
      await Promise.all([
        db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
          "haripriya",
          "haripriya@gmail.com",
        ]),
        db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
          "priya",
          "priya@gmail.com",
        ]),
      ]);
    }

    app.get("/users", async (request, response) => {
      try {
        const { search, sort = "name", order = "asc" } = request.query;
        let sql = "SELECT * FROM users";
        let params = [];

        if (search && search.trim() !== "") {
          sql += " WHERE email LIKE ?";
          params = [`%${search.trim()}%`];
        }

        const allowedSortColumns = ["id", "name", "email"];
        const safeSort = allowedSortColumns.includes(sort) ? sort : "name";

        const sqlSortDirection = order === "desc" ? "DESC" : "ASC";

        sql += ` ORDER BY ${safeSort} ${sqlSortDirection}`;

        const users = await db.all(sql, params);
        response.json(users);
      } catch (error) {
        response.status(500).json({ error: "Failed to fetch users" });
      }
    });

    app.get("/users/:id", async (request, response) => {
      try {
        const { id } = request.params;
        const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
        if (!user)
          return response.status(404).json({ error: "User not found" });
        response.json(user);
      } catch (error) {
        response.status(500).json({ error: error.message });
      }
    });

    app.post("/users", async (request, response) => {
      try {
        const { name, email } = request.body;
        if (!name?.trim() || !email?.trim())
          return response
            .status(400)
            .json({ error: "Name and email required fields" });
        const createUser = await db.run(
          "INSERT INTO users (name, email) VALUES (?, ?)",
          [name, email],
        );
        response
          .status(201)
          .json({
            message: "User created successfully",
            id: createUser.lastID,
          });
      } catch (error) {
        response.status(500).json({ error: error.message });
      }
    });

    app.put("/users/:id", async (request, response) => {
      try {
        const { id } = request.params;
        const { name, email } = request.body;

        if (!name?.trim() || !email?.trim())
          return response
            .status(400)
            .json({ error: "Name and email required fields" });

        const user = await db.get("SELECT id FROM users WHERE id = ?", [id]);
        if (!user) {
          return response.status(404).json({ error: "User not found" });
        }

        await db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [
          name,
          email,
          id,
        ]);
        response.json({ message: "User updated successfully" });
      } catch (error) {
        response.status(500).json({ error: error.message });
      }
    });

    app.delete("/users/:id", async (request, response) => {
      try {
        const { id } = request.params;

        const user = await db.get("SELECT id FROM users WHERE id = ?", [id]);
        if (!user) {
          return response.status(404).json({ error: "User not found" });
        }

        await db.run("DELETE FROM users WHERE id = ?", [id]);
        response.json({ message: "User deleted" });
      } catch (error) {
        response.status(500).json({ error: error.message });
      }
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();
