let allBooks = [];

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
  const rollingParams = document.getElementById("rollingParams");
  rollingParams.style.display = (mode === "rolling") ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  loadBookList();

  document.getElementById("searchBtn").addEventListener("click", searchBooks);
  document.getElementById("mode").addEventListener("change", updateModeUI);
  document.getElementById("analyzeBtn").addEventListener("click", fetchTTR);

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchBooks();
    });
  }

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
  const id = role === "primary" ? "metaPrimary" : "metaCompare";
  const el = document.getElementById(id);
  if (el) el.remove();
}

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

const params = new URLSearchParams();
params.set("mode", mode);
params.set("metric", metric);  // 👈 add metric

if (mode === "rolling") {
  params.set("window_size", windowSize);
  params.set("step", step);
}

  const svg = d3.select("#ttrPlot");
  svg.selectAll("*").remove();

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
    const fetches = [bookId, compareId].filter(Boolean).map(fetchSingle);
    const results = await Promise.all(fetches);

    const margin = { top: 50, right: 120, bottom: 50, left: 60 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const allData = results.flatMap(r => r.data);
    const x = d3.scaleLinear()
      .domain(d3.extent(allData, d => d.position))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 1])
      .range([height, 0]);
    
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [800, 500]])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  // Handle zoom toggle
  let zoomEnabled = false;
  
  d3.select("#zoom-toggle").on("click", function () {
    zoomEnabled = !zoomEnabled;
    if (zoomEnabled) {
      svg.call(zoom);
      d3.select(this).text("Disable Zoom");
    } else {
      svg.on(".zoom", null);
      d3.select(this).text("Enable Zoom");
      container.attr("transform", null);
    }
  });

 // Optional reset button
  d3.select("#reset-zoom").on("click", () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });
    // Gridlines
    g.append("g")
      .call(d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat(""))
      .attr("stroke-opacity", 0.2);

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(",")));

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(10));

    // Axis Labels
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", height + margin.top + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Word Position");

    svg.append("text")
      .attr("transform", `rotate(-90)`)
      .attr("x", -(height + margin.top + margin.bottom) / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Token Type Ratio (TTR)");

    // Title
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Lexical Diversity (TTR)");

    const line = d3.line()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.position))
      .y(d => y(d.ttr));

    const colors = ["steelblue", "crimson"];
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(255,255,255,0.95)")
      .style("padding", "6px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("font-size", "13px");

    results.forEach((result, idx) => {
      const color = colors[idx % colors.length];
      const sampled = result.data.filter((_, i) => i % Math.ceil(result.data.length / 100) === 0);

      g.append("path")
        .datum(result.data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line);

      g.selectAll(`circle.book-${idx}`)
        .data(sampled)
        .enter()
        .append("circle")
        .attr("class", `book-${idx}`)
        .attr("cx", d => x(d.position))
        .attr("cy", d => y(d.ttr))
        .attr("r", 3)
        .attr("fill", color)
        .on("mouseover", (event, d) => {
          tooltip
            .style("display", "block")
            .html(`Book ID: <b>${result.id}</b><br>Word #: ${d3.format(",")(d.position)}<br>TTR: ${d.ttr.toFixed(3)}`);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("display", "none"));
    });

    // Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width + margin.left + 10},${margin.top})`);

    results.forEach((result, idx) => {
      const color = colors[idx % colors.length];
      const label = idx === 0 ? "Primary Book" : "Comparison Book";

      legend.append("circle")
        .attr("cx", 0)
        .attr("cy", idx * 20)
        .attr("r", 5)
        .style("fill", color);

      legend.append("text")
        .attr("x", 10)
        .attr("y", idx * 20 + 4)
        .text(label)
        .style("font-size", "12px")
        .attr("alignment-baseline", "middle");
    });

  } catch (err) {
    console.error("Error fetching or displaying TTR:", err);
    alert("Failed to fetch or display data.");
  } finally {
    analyzeBtn.disabled = false;
    loading.style.display = "none";
  }
}
