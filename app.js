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

async function fetchTTR() {
  const bookId = document.getElementById('bookId').value;
  const url = `https://lexical-diversity-app.onrender.com/ttr?book_id=${bookId}`;

  const svg = d3.select("#ttrPlot");
  svg.selectAll("*").remove();

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(data);  // Inspect backend response

    const ttrData = data.ttr_curve;
    if (!Array.isArray(ttrData)) {
      throw new Error("Malformed or missing TTR data");
    }

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
  }
}

function searchBooks() {
  const query = document.getElementById('searchBox').value.trim().toLowerCase();
  if (!query || query.length < 3) return;

  const matches = allBooks.filter(book =>
    book.title.toLowerCase().includes(query) ||
    (book.author && book.author.toLowerCase().includes(query))
  );

  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = "";

  matches.slice(0, 25).forEach(book => {
    const li = document.createElement("li");
    li.textContent = `${book.title} by ${book.author} (ID: ${book.id})`;
    li.style.cursor = "pointer";
    li.onclick = () => {
      document.getElementById("bookId").value = book.id;
      fetchTTR();
    };
    resultsList.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadBookList(); // 🔼 fetch books.json on startup

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBooks();
      }
    });
  }
});
