import { useState, useEffect } from "react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE
  : "http://localhost:4000";

function App() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [friendUser, setFriendUser] = useState("");
  const [friendFriend, setFriendFriend] = useState("");
  const [removeUser, setRemoveUser] = useState("");
  const [removeFriend, setRemoveFriend] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, postsRes, hashtagsRes] = await Promise.all([
        fetch(`${API}/users`),
        fetch(`${API}/posts`),
        fetch(`${API}/hashtags`),
      ]);
      setUsers(await usersRes.json());
      // posts now include likedBy array
      const postsJson = await postsRes.json();
      setPosts(postsJson.map((p) => ({ ...p, likedBy: p.likedBy || [] })));
      setTrendingHashtags(await hashtagsRes.json());
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  };

  const handlePost = async () => {
    if (!author || !title.trim()) return alert("Chọn tác giả & nhập tiêu đề");
    setLoading(true);
    try {
      await fetch(`${API}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author,
          title: title.trim(),
          hashtags: hashtags.trim(),
        }),
      });
      setTitle("");
      setHashtags("");
      await loadData();
    } catch (error) {
      console.error("Failed to create post:", error);
      alert("Không thể đăng bài. Vui lòng thử lại!");
    }
    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!friendUser || !friendFriend || friendUser === friendFriend) return;
    try {
      await fetch(`${API}/add-friend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: friendUser, friend: friendFriend }),
      });
      alert(`${friendUser} đã thêm ${friendFriend} làm bạn! 🎉`);
      setFriendUser("");
      setFriendFriend("");
    } catch (error) {
      console.error("Failed to add friend:", error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!removeUser || !removeFriend || removeUser === removeFriend) return;
    try {
      await fetch(`${API}/remove-friend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: removeUser, friend: removeFriend }),
      });
      alert(`${removeUser} đã xóa ${removeFriend} khỏi danh sách bạn bè! 💔`);
      setRemoveUser("");
      setRemoveFriend("");
    } catch (error) {
      console.error("Failed to remove friend:", error);
    }
  };

  const handleLike = async (postTitle, likedBy) => {
    if (!author) return alert("Chọn tác giả để like/unlike");
    try {
      const alreadyLiked = likedBy.includes(author);
      const endpoint = alreadyLiked ? "/unlike" : "/like";
      await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: author, post: postTitle }),
      });
      await loadData();
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleDeletePost = async (postTitle, postAuthor) => {
    if (!author) return alert("Chọn tác giả để xóa bài");
    if (author !== postAuthor) {
      return alert("Bạn chỉ có thể xóa bài viết của chính mình!");
    }

    if (confirm(`Bạn có chắc muốn xóa bài "${postTitle}"?`)) {
      try {
        await fetch(`${API}/delete-post`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ author, title: postTitle }),
        });
        alert("Đã xóa bài viết! 🗑️");
        await loadData();
      } catch (error) {
        console.error("Failed to delete post:", error);
        alert("Không thể xóa bài viết. Vui lòng thử lại!");
      }
    }
  };

  const filteredUsers = users.filter((u) =>
    u.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTimeAgo = () => {
    const minutes = Math.floor(Math.random() * 60);
    return minutes < 5 ? "vừa xong" : `${minutes} phút trước`;
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">Mini Social</div>
        <div className="search">
          <input
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="actions">
          <select value={author} onChange={(e) => setAuthor(e.target.value)}>
            <option value="">Chọn tác giả</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="profile card">
            <div className="avatar">
              {author ? author[0].toUpperCase() : "U"}
            </div>
            <div className="info">
              <strong>{author || "Khách"}</strong>
              <div className="muted">
                {author ? "Thành viên hoạt động" : "Vui lòng chọn tài khoản"}
              </div>
            </div>
          </div>

          <nav className="menu card">
            <a href="#" onClick={(e) => e.preventDefault()}>
              Trang chủ
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Thông báo
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Bạn bè
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Cài đặt
            </a>
          </nav>

          {/* Add Friend Section */}
          <div className="menu card">
            <h4 style={{ margin: "0 0 16px", fontSize: "16px" }}>Kết bạn</h4>
            <select
              value={friendUser}
              onChange={(e) => setFriendUser(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "8px",
                borderRadius: "8px",
                border: "2px solid #e2e8f0",
              }}
            >
              <option value="">Người gửi lời mời</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              value={friendFriend}
              onChange={(e) => setFriendFriend(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "8px",
                borderRadius: "8px",
                border: "2px solid #e2e8f0",
              }}
            >
              <option value="">Người nhận lời mời</option>
              {users
                .filter((u) => u !== friendUser)
                .map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
            </select>
            <button
              onClick={handleAddFriend}
              disabled={
                !friendUser || !friendFriend || friendUser === friendFriend
              }
              style={{
                width: "100%",
                padding: "10px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor:
                  friendUser && friendFriend && friendUser !== friendFriend
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  friendUser && friendFriend && friendUser !== friendFriend
                    ? 1
                    : 0.5,
              }}
            >
              Kết bạn
            </button>
          </div>

          {/* Remove Friend Section */}
          <div className="menu card">
            <h4 style={{ margin: "0 0 16px", fontSize: "16px" }}>Xóa bạn bè</h4>
            <select
              value={removeUser}
              onChange={(e) => setRemoveUser(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "8px",
                borderRadius: "8px",
                border: "2px solid #e2e8f0",
              }}
            >
              <option value="">Người xóa</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select
              value={removeFriend}
              onChange={(e) => setRemoveFriend(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "12px",
                padding: "8px",
                borderRadius: "8px",
                border: "2px solid #e2e8f0",
              }}
            >
              <option value="">Bạn bè cần xóa</option>
              {users
                .filter((u) => u !== removeUser)
                .map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
            </select>
            <button
              onClick={handleRemoveFriend}
              disabled={
                !removeUser || !removeFriend || removeUser === removeFriend
              }
              style={{
                width: "100%",
                padding: "10px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor:
                  removeUser && removeFriend && removeUser !== removeFriend
                    ? "pointer"
                    : "not-allowed",
                opacity:
                  removeUser && removeFriend && removeUser !== removeFriend
                    ? 1
                    : 0.5,
              }}
            >
              💔 Xóa bạn
            </button>
          </div>
        </aside>

        <main className="main">
          <section className="composer card">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                author
                  ? `Chào ${author}! Bạn đang nghĩ gì?`
                  : "Hãy chọn tài khoản để đăng bài..."
              }
              disabled={!author}
            />
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Thêm hashtags (cách nhau bằng dấu phẩy): webdev, nodejs, reactjs"
              disabled={!author}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "2px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "14px",
                marginTop: "8px",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
            />
            <div className="composer-actions">
              <div style={{ color: "#64748b", fontSize: "14px" }}>
                {title.length}/280 ký tự
                {hashtags && (
                  <span style={{ marginLeft: "12px" }}>
                    🏷️ {hashtags.split(",").filter((h) => h.trim()).length}{" "}
                    hashtags
                  </span>
                )}
              </div>
              <button
                onClick={handlePost}
                className="primary"
                disabled={loading || !author || !title.trim()}
              >
                {loading ? "⏳ Đang đăng..." : "✨ Đăng bài"}
              </button>
            </div>
          </section>

          <section className="feed">
            {loading && (
              <div className="loading card" style={{ height: "100px" }}></div>
            )}
            {posts.length === 0 && !loading && (
              <div
                className="card"
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#64748b",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
                <h3>Chưa có bài viết nào</h3>
                <p>Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
              </div>
            )}
            {posts.map((p, i) => (
              <article className="post card" key={i}>
                <div className="post-meta">
                  <div className="author">{p.author}</div>
                  <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                    {getTimeAgo()}
                  </div>
                </div>
                <h3 className="post-title">{p.title}</h3>
                {p.hashtags && p.hashtags.length > 0 && (
                  <div
                    style={{
                      margin: "8px 0",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    {p.hashtags.map((hashtag, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "rgba(99, 102, 241, 0.1)",
                          color: "#6366f1",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {hashtag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="post-footer">
                  <div className="likes">{p.likes} lượt thích</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="like"
                      onClick={() => handleLike(p.title, p.likedBy)}
                      style={{
                        background: p.likedBy.includes(author)
                          ? "rgba(24, 119, 242, 0.2)"
                          : undefined,
                        color: p.likedBy.includes(author)
                          ? "var(--primary)"
                          : undefined,
                      }}
                    >
                      {p.likedBy.includes(author) ? "Bỏ thích" : "Thích"}
                    </button>
                    <button
                      style={{
                        background: "#f1f5f9",
                        border: "2px solid #e2e8f0",
                        padding: "8px 16px",
                        borderRadius: "50px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      💬 Bình luận
                    </button>
                    <button
                      style={{
                        background: "#f1f5f9",
                        border: "2px solid #e2e8f0",
                        padding: "8px 16px",
                        borderRadius: "50px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      🔄 Chia sẻ
                    </button>
                    {author === p.author && (
                      <button
                        onClick={() => handleDeletePost(p.title, p.author)}
                        style={{
                          background: "#fef2f2",
                          border: "2px solid #fecaca",
                          color: "#dc2626",
                          padding: "8px 16px",
                          borderRadius: "50px",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        🗑️ Xóa
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>

        <aside className="rightcol">
          <div className="card">
            <h4>Người dùng ({filteredUsers.length})</h4>
            <ul className="user-list">
              {filteredUsers.map((u) => (
                <li key={u}>
                  {u}
                  {u === author && (
                    <span
                      style={{
                        color: "#10b981",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      • Online
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              📊 Thống kê
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tổng bài viết:</span>
                <strong>{posts.length}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Tổng thích:</span>
                <strong>{posts.reduce((sum, p) => sum + p.likes, 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Người dùng:</span>
                <strong>{users.length}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              🔥 Trending
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {trendingHashtags.length > 0 ? (
                trendingHashtags.map((item, idx) => (
                  <div key={idx} className="trending-item">
                    <div style={{ fontWeight: "600", color: "#6366f1" }}>
                      {item.hashtag}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {item.postCount} bài viết
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    textAlign: "center",
                    padding: "16px",
                  }}
                >
                  Chưa có hashtags nào. Hãy thêm hashtag khi đăng bài!
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              👋 Gợi ý kết bạn
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {["Alex Johnson", "Sarah Chen", "Mike Wilson", "Lisa Park"].map(
                (name, i) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: [
                          "#ff6b6b",
                          "#4ecdc4",
                          "#45b7d1",
                          "#f7b731",
                        ][i],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      {name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {
                          [
                            "12 bạn chung",
                            "8 bạn chung",
                            "15 bạn chung",
                            "5 bạn chung",
                          ][i]
                        }
                      </div>
                    </div>
                    <button
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        borderRadius: "20px",
                        border: "1px solid #6366f1",
                        color: "#6366f1",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Kết bạn
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              ⚡ Hoạt động gần đây
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "14px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ color: "#10b981" }}>✓</span>
                <span>
                  Bạn đã thích bài viết của <strong>Alice</strong>
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ color: "#f59e0b" }}>🔔</span>
                <span>
                  <strong>Bob</strong> đã bình luận bài viết của bạn
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ color: "#6366f1" }}>👥</span>
                <span>
                  <strong>Charlie</strong> đã kết bạn với bạn
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ color: "#ec4899" }}>❤️</span>
                <span>Bài viết của bạn nhận được 5 lượt thích</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              🎯 Mục tiêu tuần này
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>Đăng bài</span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    3/5
                  </span>
                </div>
                <div
                  style={{
                    background: "#e5e7eb",
                    height: "4px",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      background: "#6366f1",
                      width: "60%",
                      height: "100%",
                      borderRadius: "2px",
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>Tương tác</span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    12/20
                  </span>
                </div>
                <div
                  style={{
                    background: "#e5e7eb",
                    height: "4px",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      background: "#10b981",
                      width: "60%",
                      height: "100%",
                      borderRadius: "2px",
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>Kết bạn mới</span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    2/3
                  </span>
                </div>
                <div
                  style={{
                    background: "#e5e7eb",
                    height: "4px",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      background: "#f59e0b",
                      width: "67%",
                      height: "100%",
                      borderRadius: "2px",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
