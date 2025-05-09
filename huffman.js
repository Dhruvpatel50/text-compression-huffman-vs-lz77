  class PriorityQueue {
    constructor() {
        this.nodes = [];
    }

    enqueue(node) {
        this.nodes.push(node);
        this.bubbleUp();
    }

    dequeue() {
        const min = this.nodes[0];
        const end = this.nodes.pop();
        if (this.nodes.length > 0) {
            this.nodes[0] = end;
            this.sinkDown();
        }
        return min;
    }

    size() {
        return this.nodes.length;
    }

    // Helper methods for maintaining heap order
    bubbleUp() {
        let index = this.nodes.length - 1;
        const element = this.nodes[index];

        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            let parent = this.nodes[parentIndex];

            if (element.freq >= parent.freq) break;

            this.nodes[index] = parent;
            this.nodes[parentIndex] = element;
            index = parentIndex;
        }
    }

    sinkDown() {
        let index = 0;
        const length = this.nodes.length;
        const element = this.nodes[0];

        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIndex < length) {
                leftChild = this.nodes[leftChildIndex];
                if (leftChild.freq < element.freq) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                rightChild = this.nodes[rightChildIndex];
                if (
                    (swap === null && rightChild.freq < element.freq) ||
                    (swap !== null && rightChild.freq < leftChild.freq)
                ) {
                    swap = rightChildIndex;
                }
            }

            if (swap === null) break;

            this.nodes[index] = this.nodes[swap];
            this.nodes[swap] = element;
            index = swap;
        }
    }
}

function clearTree() {
    d3.select("#huffman-tree").selectAll("*").remove();
    document.getElementById('results').innerHTML = '';
    document.getElementById('compressed-content').innerHTML = '';
    document.getElementById('huffman-mapping').innerHTML = '';
    const ctx = document.getElementById('compressionChart').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
}

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
}
// Huffman Coding implementation
class HuffmanNode {
    constructor(char, freq) {
        this.char = char;
        this.freq = freq;
        this.left = null;
        this.right = null;
    }
}

function buildHuffmanTree(text) {
    const freqMap = new Map();
    for (let char of text) {
        if (char !== ' ') {  // Ignore spaces
            freqMap.set(char, (freqMap.get(char) || 0) + 1);
        }
    }

    // Initialize the priority queue with individual characters and their frequencies
    const pq = new PriorityQueue();
    for (let [char, freq] of freqMap) {
        pq.enqueue(new HuffmanNode(char, freq));
    }

    // Build the Huffman Tree
    while (pq.size() > 1) {
        const left = pq.dequeue();
        const right = pq.dequeue();
        const parent = new HuffmanNode(null, left.freq + right.freq);
        parent.left = left;
        parent.right = right;
        pq.enqueue(parent);
    }

    // The last remaining node is the root of the Huffman Tree
    return pq.dequeue();
}

function buildHuffmanCodes(node, code = '', map = new Map()) {
    if (node.char) {
        map.set(node.char, code);
    } else {
        buildHuffmanCodes(node.left, code + '0', map);
        buildHuffmanCodes(node.right, code + '1', map);
    }
    return map;
}

function huffmanCompress(text) {
    const root = buildHuffmanTree(text);
    const huffmanCodes = buildHuffmanCodes(root);
    let compressed = '';

    // Compress text while preserving spaces
    for (let char of text) {
        if (char === ' ') {
            compressed += ' ';  // Preserve space directly
        } else {
            compressed += huffmanCodes.get(char);
        }
    }
    return { compressed, huffmanCodes, root };
}

function huffmanDecompress(compressed, huffmanCodes) {
    const reverseMap = new Map(Array.from(huffmanCodes, entry => entry.reverse()));
    let current = '';
    let decompressed = '';
    for (let bit of compressed) {
        if (bit === ' ') {
            decompressed += ' ';  // Preserve space directly
        } else {
            current += bit;
            if (reverseMap.has(current)) {
                decompressed += reverseMap.get(current);
                current = '';
            }
        }
    }
    return decompressed;
}

// LZ77 Compression (a simple version of Lempel-Ziv)
function lz77Compress(text, searchBufferSize = 255, lookaheadBufferSize = 15) {
const compressed = [];
let i = 0;

while (i < text.length) {
let matchLength = 0;
let matchDistance = 0;

// Set up the search buffer and lookahead buffer
const searchStart = Math.max(0, i - searchBufferSize);
const searchBuffer = text.slice(searchStart, i);

// Look for the longest match in the search buffer
for (let j = 0; j < searchBuffer.length; j++) {
    let length = 0;
    while (
        length < lookaheadBufferSize &&
        i + length < text.length &&
        searchBuffer[j + length] === text[i + length]
    ) {
        length++;
    }

    if (length > matchLength) {
        matchLength = length;
        matchDistance = searchBuffer.length - j;
    }
}

if (matchLength > 3) {
    // Encode as (distance, length, next character)
    compressed.push([matchDistance, matchLength, text[i + matchLength] || '']);
    i += matchLength + 1;
} else {
    // Encode as a literal character
    compressed.push(text[i]);
    i++;
}
}

return compressed;
}

// LZ77 Decompression
function lz77Decompress(compressed) {
    let decompressed = '';

    for (const token of compressed) {
        if (typeof token === 'string') {
            // Direct character
            decompressed += token;
        } else {
            const [distance, length, nextChar] = token;
            const start = decompressed.length - distance;
            const matchedSubstring = decompressed.slice(start, start + length);
            decompressed += matchedSubstring + nextChar;
        }
    }

    return decompressed;
}

function compressText() {
    clearTree();
    const input = document.getElementById('input-text').value;
    const fileInput = document.getElementById('file-input');

    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            processCompression(e.target.result);
        };
        reader.readAsText(fileInput.files[0]);
    } else {
        processCompression(input);
    }
}

function processCompression(text) {
    const originalSize = text.length * 8;  // Assuming 8 bits per character

    // Huffman Compression
    const huffmanResult = huffmanCompress(text);
    const huffmanCompressed = huffmanResult.compressed;
    const huffmanDecompressed = huffmanDecompress(huffmanCompressed, huffmanResult.huffmanCodes);
    const huffmanSize = huffmanCompressed.length;

    // LZ77 Compression
    const lz77Compressed = lz77Compress(text);
    const lz77Size = lz77Compressed.length * 8;  // Assuming 8 bits per character

    // Calculate compression ratios
    const huffmanRatio = (originalSize - huffmanSize) / originalSize * 100;
    const lz77Ratio = (originalSize - lz77Size) / originalSize * 100;

    // Display results
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <h3>Compression Results:</h3>
        <p>Original Size: ${originalSize} bits</p>
        <p>Huffman Compressed Size: ${huffmanSize} bits</p>
        <p>Huffman Compression Ratio: ${huffmanRatio.toFixed(2)}%</p>
        <p>LZ77 Compressed Size: ${lz77Size} bits</p>
        <p>LZ77 Compression Ratio: ${lz77Ratio.toFixed(2)}%</p>
        <p>Decompression Check: ${text === huffmanDecompressed ? 'Successful' : 'Failed'}</p>
    `;

    // Display compressed content
    const compressedContentDiv = document.getElementById('compressed-content');
    compressedContentDiv.innerHTML = `
        <h3>Compressed Content (Huffman):</h3>
        <p>${huffmanCompressed}</p>
    `;

    // Display Huffman mapping
    const huffmanMappingDiv = document.getElementById('huffman-mapping');
    let mappingHtml = '<h3>Huffman Mapping:</h3><ul>';
    for (let [char, code] of huffmanResult.huffmanCodes) {
        mappingHtml += `<li>${char === ' ' ? '(space)' : char} -> ${code}</li>`;
    }
    mappingHtml += '</ul>';
    huffmanMappingDiv.innerHTML = mappingHtml;

    // Create chart
    createCompressionChart(originalSize, huffmanSize, lz77Size);

    // Visualize Huffman Tree
    visualizeHuffmanTree(huffmanResult.root);
}

function createCompressionChart(original, huffman, lz77) {
    const ctx = document.getElementById('compressionChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Original', 'Huffman', 'LZ77'],
            datasets: [{
                label: 'Size (bits)',
                data: [original, huffman, lz77],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function visualizeHuffmanTree(root) {
    // Clear previous visualization
    d3.select("#huffman-tree").selectAll("*").remove();

    // Set up dimensions and margins
    const width = 800;
    const height = 500;
    const margin = { top: 20, right: 0, bottom: 30, left: 120 };

    // Create an SVG canvas
    const svg = d3.select("#huffman-tree")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Modify the tree layout to set the size and rotate the orientation to be upright
    const treemap = d3.tree().size([width - margin.left - margin.right, height - margin.top - margin.bottom]);

    // Convert Huffman tree to D3 hierarchical format
    function convertToD3Format(node) {
        const d3Node = {
            name: node.char ? `${node.char} (${node.freq})` : node.freq.toString(),
            children: []
        };
        if (node.left) d3Node.children.push(convertToD3Format(node.left));
        if (node.right) d3Node.children.push(convertToD3Format(node.right));
        return d3Node;
    }

    const d3Root = d3.hierarchy(convertToD3Format(root));
    const treeData = treemap(d3Root);

    // Add links with curve styling
    svg.selectAll(".link")
        .data(treeData.descendants().slice(1))
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => `
            M${d.x},${d.y}
            C${d.x},${(d.y + d.parent.y) / 2}
            ${d.parent.x},${(d.y + d.parent.y) / 2}
            ${d.parent.x},${d.parent.y}
        `)
        .style("fill", "none")
        .style("stroke", "#3498db")
        .style("stroke-width", "2px");

    // Add nodes with color and shadow styling
    const node = svg.selectAll(".node")
        .data(treeData.descendants())
        .enter()
        .append("g")
        .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => `translate(${d.x},${d.y})`);

    // Node circle styling
    node.append("circle")
        .attr("r", 10)
        .style("fill", d => d.children ? "#2ecc71" : "#e74c3c")
        .style("stroke", "#34495e")
        .style("stroke-width", "2px")
        .style("filter", "drop-shadow(1px 1px 5px rgba(0, 0, 0, 0.3))");

    // Node text styling
    node.append("text")
        .attr("dy", ".35em")
        .attr("y", d => d.children ? -15 : 15)
        .style("text-anchor", "middle")
        .style("font-family", "Arial, sans-serif")
        .style("font-size", "14px")
        .style("fill", "#2c3e50")
        .text(d => d.data.name);
}