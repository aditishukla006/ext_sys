const API = "https://ext-sys.onrender.com/api/keywords";
let editing = null;

// SECTION SWITCH
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");

  if (id === "list") loadKeywords();
}

// ADD / UPDATE
async function addOrUpdate() {
  const input = document.getElementById("keywordInput");
  let value = input.value.trim();
  if (!value) return alert("Enter keyword");

  // Split multiple keywords by comma and trim each
  let keywords = value.split(",").map(k => k.trim()).filter(Boolean);

  if (editing) {
    if (keywords.length > 1) {
      alert("Can only edit one keyword at a time");
      return;
    }
    await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldKeyword: editing, newKeyword: keywords[0] })
    });
    editing = null;
  } else {
    const body = keywords.length > 1 ? { keywords } : { keyword: keywords[0] };

    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.success) {
      alert(`Added: ${data.added.join(", ")}\nSkipped: ${data.skipped.join(", ")}`);
    } else {
      alert("Error adding keywords");
    }
  }

  input.value = "";
  showSection("list");
}


// LIST
async function loadKeywords() {
  const res = await fetch(API);
  const data = await res.json();
  const list = document.getElementById("keywordList");
  list.innerHTML = "";

  data.forEach(k => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${k}
      <span>
        <button onclick="edit('${k}')">✏️</button>
        <button onclick="remove('${k}')">❌</button>
      </span>
    `;
    list.appendChild(li);
  });
}

// EDIT
function edit(k) {
  editing = k;
  showSection("add");
  document.getElementById("keywordInput").value = k;
}

// DELETE ONE
async function remove(k) {
  await fetch(`${API}/${encodeURIComponent(k)}`, { method: "DELETE" });
  loadKeywords();
}

async function searchKeyword() {
  const q = document.getElementById("searchInput").value.trim();
  const list = document.getElementById("searchList");

  // clear list if empty input
  if (!q) {
    list.innerHTML = "";
    return;
  }

  const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = "<li>No keywords found</li>";
    return;
  }

  data.forEach(k => {
    const li = document.createElement("li");
    li.innerText = k;
    list.appendChild(li);
  });
}


// DELETE ALL
async function deleteAll() {
  if (!confirm("Delete ALL keywords?")) return;
  await fetch(`${API}/all`, { method: "DELETE" });
  alert("All deleted");
}
