async function fetchTTR() {
  const bookId = document.getElementById('bookId').value;
  const url = `https://lexical-diversity-app.onrender.com/ttr?book_id=${bookId}`;

  const svg = d3.select("#ttrPlot");
  svg.selectAll("*").remove();

  const response = await fetch(url);
  const data = await response.json();

  const ttrData = data.ttr_curve;

  const margin = {top: 20, right: 30, bottom: 30, left: 50},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
      .domain(d3.extent(ttrData, d => d.position))
      .range([0, width]);

  const y = d3.scaleLinear()
      .domain([0, 1])  // TTR is always between 0 and 1
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
}
