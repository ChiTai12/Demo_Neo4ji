import express from "express";
import neo4j from "neo4j-driver";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const driver = neo4j.driver(
  "neo4j+s://80982c5a.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "7YKCiF8Xukl11il_LjTlDt38htovxRQNoPNLfhUaIzk")
);

// Lấy danh sách user
app.get("/users", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run("MATCH (u:User) RETURN u.name AS name");
    res.json(result.records.map((r) => r.get("name")));
  } finally {
    await session.close();
  }
});

// Thêm bạn bè
app.post("/add-friend", async (req, res) => {
  const { user, friend } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (a:User {name:$user}), (b:User {name:$friend}) MERGE (a)-[:FRIEND]->(b)`,
      { user, friend }
    );
    res.json({ success: true });
  } finally {
    await session.close();
  }
});

// Xóa bạn bè
app.post("/remove-friend", async (req, res) => {
  const { user, friend } = req.body;
  const session = driver.session();
  try {
    // Kiểm tra trước xem relationship có tồn tại không
    const found = await session.run(
      `MATCH (a:User {name:$user})-[r:FRIEND]->(b:User {name:$friend}) RETURN r LIMIT 1`,
      { user, friend }
    );
    if (found.records.length === 0) {
      return res.status(404).json({ error: "Quan hệ bạn bè không tồn tại" });
    }

    await session.run(
      `MATCH (a:User {name:$user})-[r:FRIEND]->(b:User {name:$friend}) DELETE r`,
      { user, friend }
    );
    res.json({ success: true });
  } finally {
    await session.close();
  }
});

// Lấy bài viết
app.get("/posts", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (p:Post)
      OPTIONAL MATCH (p)<-[:POSTED]-(u:User)
      OPTIONAL MATCH (p)<-[:LIKES]-(l:User)
      OPTIONAL MATCH (p)-[:HAS_TAG]->(h:Tag)
      RETURN p.title AS title, 
             COALESCE(u.name, 'Unknown') AS author, 
             count(DISTINCT l) AS likes,
             collect(DISTINCT h.name) AS hashtags,
             collect(DISTINCT l.name) AS likers
      ORDER BY p.title
    `);
    res.json(
      result.records.map((r) => ({
        title: r.get("title"),
        author: r.get("author"),
        likes: r.get("likes").toInt(),
        hashtags: r.get("hashtags"),
        likedBy: r.get("likers") || [],
      }))
    );
  } finally {
    await session.close();
  }
});

// Like bài viết
app.post("/like", async (req, res) => {
  const { user, post } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {name:$user}), (p:Post {title:$post})
      MERGE (u)-[:LIKES]->(p)
      `,
      { user, post }
    );
    res.json({ success: true });
  } finally {
    await session.close();
  }
});

// Unlike bài viết
app.post("/unlike", async (req, res) => {
  const { user, post } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {name:$user})-[l:LIKES]->(p:Post {title:$post})
      DELETE l
      `,
      { user, post }
    );
    res.json({ success: true });
  } finally {
    await session.close();
  }
});

// Đăng bài mới
app.post("/posts", async (req, res) => {
  const { title, author, hashtags } = req.body;
  const session = driver.session();
  try {
    // Tạo post và liên kết với user
    await session.run(
      `
      MATCH (u:User {name:$author})
      CREATE (p:Post {title:$title})
      MERGE (u)-[:POSTED]->(p)
      RETURN p
      `,
      { title, author }
    );

    // Xử lý hashtags nếu có
    if (hashtags && hashtags.trim()) {
      const hashtagList = hashtags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
        .map((tag) => (tag.startsWith("#") ? tag.slice(1) : tag)); // Bỏ dấu # nếu có

      for (const hashtag of hashtagList) {
        await session.run(
          `
          MATCH (p:Post {title:$title})
          MERGE (h:Tag {name:$hashtag})
          MERGE (p)-[:HAS_TAG]->(h)
          `,
          { title, hashtag }
        );
      }
    }

    res.json({ success: true });
  } finally {
    await session.close();
  }
});

// Lấy trending hashtags
app.get("/hashtags", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (h:Tag)<-[:HAS_TAG]-(p:Post)
      RETURN h.name AS hashtag, count(p) AS postCount
      ORDER BY postCount DESC
      LIMIT 10
    `);
    res.json(
      result.records.map((r) => ({
        hashtag: r.get("hashtag"),
        postCount: r.get("postCount").toInt(),
      }))
    );
  } finally {
    await session.close();
  }
});

// Xóa bài viết
app.post("/delete-post", async (req, res) => {
  const { author, title } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {name:$author})-[:POSTED]->(p:Post {title:$title})
      OPTIONAL MATCH (p)-[:HAS_TAG]->(t:Tag)
      DETACH DELETE p
      WITH t
      WHERE NOT (t)<-[:HAS_TAG]-(:Post)
      DELETE t
      `,
      { author, title }
    );
    res.json({ success: true });
  } finally {
    await session.close();
  }
});

// Tạo user mới (idempotent — dùng MERGE để không tạo trùng)
app.post("/users", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Tên user bắt buộc" });
  const session = driver.session();
  try {
    const result = await session.run(
      `MERGE (u:User {name:$name}) RETURN u.name AS name`,
      { name: name.trim() }
    );
    const created = result.records[0].get("name");
    res.json({ success: true, name: created });
  } finally {
    await session.close();
  }
});

// Xóa user (dùng DETACH DELETE để gỡ tất cả relationship trước khi xóa node)
app.post("/delete-user", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Tên user bắt buộc" });
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (u:User {name:$name})
      DETACH DELETE u
      `,
      { name: name.trim() }
    );
    res.json({ success: true });
  } finally {
    await session.close();
  }
});

app.listen(4000, () => console.log("Server running on port 4000"));
