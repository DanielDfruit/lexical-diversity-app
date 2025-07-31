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

function searchBooks() {
  const query = document.getElementById('searchBox').value.trim().toLowerCase();
  const dropdown = document.getElementById("resultsDropdown");
  const buildButton = document.getElementById("buildGraphBtn");

  if (!query || query.length < 3) return;

  const matches = allBooks.filter(book =>
    book.title.toLowerCase().includes(query) ||
    (book.author && book.author.toLowerCase().includes(query))
  );

  dropdown.innerHTML = "";
  matches.slice(0, 25).forEach(book => {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = `${book.title} by ${book.author} (ID: ${book.id})`;
    dropdown.appendChild(option);
  });

  if (matches.length > 0) {
    dropdown.style.display = "inline-block";
    buildButton.style.display = "inline-block";
  } else {
    dropdown.style.display = "none";
    buildButton.style.display = "none";
  }
}

async function fetchTTR(bookId = null) {
  if (!bookId) {
    bookId = document.getElementById('resultsDropdown').value || document.getElementById('bookId').value;
  }

  if (!bookId) return;

  const url = `https://lexical-diversity-app.onrender.com/ttr?book_id=${bookId}`;
  const svg = d3.select("#ttrPlot");
  svg.selectAll("*").remove();

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data.ttr_curve)) {
      throw new Error("Malformed or missing TTR data");
    }

    const ttrData = data.ttr_curve;

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

document.addEventListener("DOMContentLoaded", () => {
  loadBookList();

  document.getElementById("searchBtn").addEventListener("click", searchBooks);

  document.getElementById("buildGraphBtn").addEventListener("click", () => {
    const bookId = document.getElementById("resultsDropdown").value;
    fetchTTR(bookId);
  });

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBooks();
      }
    });
  }
});
