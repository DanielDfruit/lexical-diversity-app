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
  const show = mode === "rolling";
  document.getElementById("windowSize").style.display = show ? "inline-block" : "none";
  document.getElementById("step").style.display = show ? "inline-block" : "none";
  document.getElementById("windowLabel").style.display = show ? "inline-block" : "none";
  document.getElementById("stepLabel").style.display = show ? "inline-block" : "none";
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

  updateModeUI(); // Initialize visibility
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
      document.getElementById("bookId").value = book.id;
      displayMetadata(book);
    };
    resultsList.appendChild(li);
  });
}

function displayMetadata(book) {
  const meta = document.getElementById("bookMeta");
  meta.innerHTML = `
    <p><strong>Title:</strong> ${book.title}</p>
    <p><strong>Author:</strong> ${book.author || "Unknown"}</p>
    <p><strong>Book ID:</strong> ${book.id}</p>
  `;
}

async function fetchTTR() {
  const bookIdEl = document.getElementById('bookId');
  if (!bookIdEl || !bookIdEl.value) {
    alert("Please select or enter a book ID.");
    return;
  }

  const bookId = bookIdEl.value;
  const mode = document.getElementById('mode').value;
  const windowSize = document.getElementById('windowSize').value;
  const step = document.getElementById('step').value;

  const url = new URL(`https://lexical-diversity-app.onrender.com/ttr`);
  url.searchParams.set("book_id", bookId);
  url.searchParams.set("mode", mode);
  if (mode === "rolling") {
    url.searchParams.set("window_size", windowSize);
    url.searchParams.set("step", step);
  }

  const svg = d3.select("#ttrPlot");
  svg.selectAll("*").remove();

  const analyzeBtn = document.getElementById("analyzeBtn");
  const loading = document.getElementById("loading");
  analyzeBtn.disabled = true;
  loading.style.display = "inline";

  try {
    const response = await fetch(url);
    const data = await response.json();

    const ttrData = data.ttr_curve;
    if (!Array.isArray(ttrData)) throw new Error("Malformed or missing TTR data");

    const margin = { top: 20, right: 30, bottom: 30, left: 50 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(ttrData, d => d.position))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    g.append("g")
      .call(d3.axisLeft(y));

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    g.selectAll("circle")
      .data(ttrData.filter((_, i) => i % Math.ceil(ttrData.length / 100) === 0)) // sample for performance
      .enter()
      .append("circle")
      .attr("cx", d => x(d.position))
      .attr("cy", d => y(d.ttr))
      .attr("r", 3)
      .attr("fill", "darkorange")
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`Word #${d.position}<br>TTR: ${d.ttr.toFixed(3)}`)
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
    
    g.append("path")
      .datum(ttrData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
          .x(d => x(d.position))
          .y(d => y(d.ttr))
      );

  } catch (err) {
    console.error("Error fetching or drawing TTR:", err);
    alert("Failed to fetch or display data.");
  } finally {
    analyzeBtn.disabled = false;
    loading.style.display = "none";
  }
}
