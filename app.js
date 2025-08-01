let allBooks = [];
let chart = null;

async function loadBookList() {
  try {
    const response = await fetch("books.json");
    allBooks = await response.json();
    console.log(`Loaded ${allBooks.length} books`);
  } catch (err) {
    console.error("Failed to load book list:", err);
  }
}

function updateModeUI() {
  const mode = document.getElementById("mode").value;
  document.getElementById("rollingParams").style.display = (mode === "rolling") ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  loadBookList();

  document.getElementById("searchBtn").addEventListener("click", searchBooks);
  document.getElementById("mode").addEventListener("change", updateModeUI);
  document.getElementById("analyzeBtn").addEventListener("click", fetchTTR);
  document.getElementById("zoom-toggle").addEventListener("click", toggleZoom);
  document.getElementById("reset-zoom").addEventListener("click", resetZoom);

  document.getElementById("searchBox").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBooks();
  });

  updateModeUI();
});

function searchBooks() {
  const query = document.getElementById('searchBox').value.trim().toLowerCase();
  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = "";

  if (!query || query.length < 3) return;

  const matches = allBooks.filter(book =>
    book.title.toLowerCase().includes(query) ||
    (book.author && book.author.toLowerCase().includes(query))
  );

  matches.slice(0, 25).forEach(book => {
    const li = document.createElement("li");
    li.textContent = `${book.title} by ${book.author} (ID: ${book.id})`;
    li.style.cursor = "pointer";
    li.onclick = () => {
      const bookIdInput = document.getElementById("bookId");
      const compareIdInput = document.getElementById("compareId");
      const alreadyUsed = [bookIdInput.value, compareIdInput.value].includes(book.id);

      if (!bookIdInput.value || (alreadyUsed && compareIdInput.value)) {
        bookIdInput.value = book.id;
        displayMetadata(book, "primary");
      } else if (!compareIdInput.value) {
        compareIdInput.value = book.id;
        displayMetadata(book, "compare");
      } else {
        bookIdInput.value = book.id;
        displayMetadata(book, "primary");
        compareIdInput.value = "";
        clearMetadata("compare");
      }
    };
    resultsList.appendChild(li);
  });
}

function displayMetadata(book, role) {
  const container = document.getElementById("bookMeta");
  const sectionId = role === "primary" ? "metaPrimary" : "metaCompare";
  let section = document.getElementById(sectionId);

  if (!section) {
    section = document.createElement("div");
    section.id = sectionId;
    section.classList.add("book-meta-card");
    container.appendChild(section);
  }

  section.innerHTML = `
    <h3>${role === "primary" ? "Primary Book" : "Comparison Book"}</h3>
    <p><strong>Title:</strong> ${book.title}</p>
    <p><strong>Author:</strong> ${book.author || "Unknown"}</p>
    <p><strong>Book ID:</strong> ${book.id}</p>
  `;
}

function clearMetadata(role) {
  const el = document.getElementById(role === "primary" ? "metaPrimary" : "metaCompare");
  if (el) el.remove();
}

let chart; // Global scope

async function fetchTTR() {
  const bookId = document.getElementById('bookId').value;
  const compareId = document.getElementById('compareId').value;
  const mode = document.getElementById('mode').value;
  const metric = document.getElementById('metric').value;
  const windowSize = document.getElementById('windowSize').value;
  const step = document.getElementById('step').value;

  if (!bookId && !compareId) {
    alert("Please select at least one book.");
    return;
  }

  const params = new URLSearchParams({ mode, metric });
  if (mode === "rolling") {
    params.set("window_size", windowSize);
    params.set("step", step);
  }

  const analyzeBtn = document.getElementById("analyzeBtn");
  const loading = document.getElementById("loading");
  analyzeBtn.disabled = true;
  loading.style.display = "inline";

  const fetchSingle = async (id) => {
    const url = new URL(`https://lexical-diversity-app.onrender.com/ttr`);
    url.searchParams.set("book_id", id);
    params.forEach((val, key) => url.searchParams.set(key, val));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch TTR for book ID ${id}`);
    const json = await res.json();
    return { id, data: json.ttr_curve };
  };

  try {
    const results = await Promise.all(
      [bookId, compareId].filter(Boolean).map(fetchSingle)
    );

    const datasets = results.map((result, idx) => ({
      label: idx === 0 ? "Primary Book" : "Comparison Book",
      data: result.data.map(d => ({ x: d.position, y: d.ttr })),
      borderColor: idx === 0 ? "rgba(70, 130, 180, 0.4)" : "rgba(220, 20, 60, 0.4)",
      backgroundColor: idx === 0 ? "rgba(70, 130, 180, 0.1)" : "rgba(220, 20, 60, 0.1)",
      pointRadius: 0,
      tension: 0.3,
      fill: false
    }));

    const ctx = document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Word Position' }
          },
          y: {
            min: 0,
            max: 1,
            title: { display: true, text: 'TTR' }
          }
        },
        plugins: {
          zoom: {
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x'
            },
            pan: {
              enabled: true,
              mode: 'x',
              modifierKey: 'ctrl'
            }
          },
          legend: { display: true },
          tooltip: { enabled: true }
        }
      }
    });

  } catch (err) {
    alert(err.message);
  } finally {
    analyzeBtn.disabled = false;
    loading.style.display = "none";
  }
}

