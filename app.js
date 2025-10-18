class LinkStateRoutingSimulator {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.connectMode = false;
        this.firstSelectedNode = null;
        this.animationSpeed = 5;
        this.showRoutingTables = false;
        this.isAnimating = false;
        
        // Separate counters for each node type - CRITICAL for correct labeling
        this.senderCount = 0;
        this.routerCount = 0; 
        this.receiverCount = 0;
        
        this.nodeCounters = {
            sender: 1,
            router: 1,
            receiver: 1
        };
        
        this.svg = document.getElementById('networkCanvas');
        this.statusMessage = document.getElementById('statusMessage');
        this.senderSelect = document.getElementById('senderSelect');
        this.receiverSelect = document.getElementById('receiverSelect');
        
        this.initializeEventListeners();
        this.initializeTabs();
        this.createSampleNetwork();
        this.updateDropdowns();
        
        // Show initial success message
        this.showStatus('Link State Routing Simulator initialized successfully. Add nodes or send packets to begin!', 'success');
    }
    
    initializeEventListeners() {
        // Node control buttons
        document.getElementById('addSender').addEventListener('click', () => this.addNode('sender'));
        document.getElementById('addRouter').addEventListener('click', () => this.addNode('router'));
        document.getElementById('addReceiver').addEventListener('click', () => this.addNode('receiver'));
        document.getElementById('removeNode').addEventListener('click', () => this.removeSelectedNode());
        
        // Connection controls
        document.getElementById('connectMode').addEventListener('click', () => this.toggleConnectMode());
        
        // Animation controls
        document.getElementById('sendPacket').addEventListener('click', () => this.sendPacket());
        document.getElementById('resetNetwork').addEventListener('click', () => this.resetNetwork());
        
        // Display options
        document.getElementById('showRoutingTables').addEventListener('change', (e) => {
            this.showRoutingTables = e.target.checked;
            this.updateDisplay();
        });
        
        document.getElementById('showDijkstraTable').addEventListener('change', (e) => {
            const tableContainer = document.getElementById('dijkstraTableContainer');
            if (e.target.checked) {
                tableContainer.style.display = 'block';
            } else {
                tableContainer.style.display = 'none';
            }
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
        });
        
        // Canvas events - Fixed dragging implementation
        this.svg.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.svg.addEventListener('mouseup', () => this.handleMouseUp());
        this.svg.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Prevent context menu on right click
        this.svg.addEventListener('contextmenu', (e) => e.preventDefault());
        
        this.dragging = false;
        this.dragNode = null;
        this.dragOffset = { x: 0, y: 0 };
    }
    
    initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }
    
    createSampleNetwork() {
        // Clear existing network
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
        this.connectMode = false;
        this.firstSelectedNode = null;
        
        // Reset counters properly
        this.senderCount = 0;
        this.routerCount = 0;
        this.receiverCount = 0;
        this.nodeCounters = { sender: 1, router: 1, receiver: 1 };
        
        // Sample network data
        const sampleNodes = [
            { id: 'S1', type: 'sender', label: 'S1', x: 100, y: 200, selected: false },
            { id: 'S2', type: 'sender', label: 'S2', x: 100, y: 400, selected: false },
            { id: 'R1', type: 'router', label: 'R1', x: 300, y: 150, selected: false },
            { id: 'R2', type: 'router', label: 'R2', x: 300, y: 450, selected: false },
            { id: 'R3', type: 'router', label: 'R3', x: 550, y: 200, selected: false },
            { id: 'R4', type: 'router', label: 'R4', x: 550, y: 400, selected: false },
            { id: 'D1', type: 'receiver', label: 'D1', x: 750, y: 200, selected: false },
            { id: 'D2', type: 'receiver', label: 'D2', x: 750, y: 400, selected: false }
        ];
        
        const sampleLinks = [
            { from: 'S1', to: 'R1', cost: 2 },
            { from: 'S2', to: 'R2', cost: 1 },
            { from: 'R1', to: 'R3', cost: 3 },
            { from: 'R1', to: 'R2', cost: 5 },
            { from: 'R2', to: 'R4', cost: 2 },
            { from: 'R3', to: 'R4', cost: 4 },
            { from: 'R3', to: 'D1', cost: 1 },
            { from: 'R4', to: 'D2', cost: 2 },
            { from: 'S1', to: 'R2', cost: 6 },
            { from: 'R3', to: 'D2', cost: 5 }
        ];
        
        this.nodes = sampleNodes;
        this.links = sampleLinks;
        
        // Update counters to next available numbers based on initial network
        // Initial network has: S1, S2 (2 senders), R1-R4 (4 routers), D1, D2 (2 receivers)
        this.senderCount = 2;
        this.routerCount = 4;
        this.receiverCount = 2;
        
        this.nodeCounters.sender = 3;  // Next sender will be S3
        this.nodeCounters.router = 5;  // Next router will be R5
        this.nodeCounters.receiver = 3; // Next receiver will be D3
        
        this.updateDisplay();
    }
    
    addNode(type) {
        // Generate unique ID and label with correct prefixes
        let prefix;
        if (type === 'sender') {
            prefix = 'S';
        } else if (type === 'router') {
            prefix = 'R';
        } else if (type === 'receiver') {
            prefix = 'D';  // D for Destination
        }
        
        const id = prefix + this.nodeCounters[type];
        const label = id;
        
        // Create new node with random position within canvas bounds
        const node = {
            id: id,
            type: type,
            label: label,
            x: Math.random() * 700 + 100,  // Keep nodes within visible area
            y: Math.random() * 400 + 100,  // Keep nodes within visible area
            selected: false
        };
        
        // Add to nodes array and increment counter
        this.nodes.push(node);
        this.nodeCounters[type]++;
        
        // Also update individual counters for tracking
        if (type === 'sender') this.senderCount++;
        else if (type === 'router') this.routerCount++;
        else if (type === 'receiver') this.receiverCount++;
        
        // CRITICAL: Force immediate visual update
        this.updateDisplay();
        this.updateDropdowns();
        
        // Show success message
        this.showStatus(`Added ${type} node ${label} successfully`, 'success');
        
        console.log(`Added node:`, node); // Debug log
        console.log(`Total nodes: ${this.nodes.length}, Senders: ${this.senderCount}, Routers: ${this.routerCount}, Receivers: ${this.receiverCount}`);
    }
    
    removeSelectedNode() {
        if (!this.selectedNode) {
            this.showStatus('Please select a node to remove', 'error');
            return;
        }
        
        const nodeId = this.selectedNode.id;
        
        // Remove all links connected to this node
        this.links = this.links.filter(link => link.from !== nodeId && link.to !== nodeId);
        
        // Remove the node
        this.nodes = this.nodes.filter(node => node.id !== nodeId);
        
        this.selectedNode = null;
        this.updateDisplay();
        this.updateDropdowns();
        this.showStatus(`Removed node ${nodeId}`, 'success');
    }
    
    toggleConnectMode() {
        this.connectMode = !this.connectMode;
        this.firstSelectedNode = null;
        
        const button = document.getElementById('connectMode');
        if (this.connectMode) {
            button.textContent = 'Exit Connect Mode';
            button.classList.add('connect-active');
            this.svg.classList.add('connect-mode');
            this.showStatus('Connect mode enabled. Click two nodes to connect them.', 'info');
        } else {
            button.textContent = 'Connect Nodes';
            button.classList.remove('connect-active');
            this.svg.classList.remove('connect-mode');
            this.showStatus('Connect mode disabled', 'info');
        }
    }
    
    handleCanvasClick(event) {
        const rect = this.svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const clickedNode = this.getNodeAtPosition(x, y);
        
        if (this.connectMode) {
            if (clickedNode) {
                this.handleConnectModeClick(clickedNode);
            }
        } else {
            this.selectNode(clickedNode);
        }
    }
    
    handleConnectModeClick(node) {
        if (!this.firstSelectedNode) {
            this.firstSelectedNode = node;
            this.showStatus(`Selected ${node.label}. Click another node to connect.`, 'info');
        } else {
            if (this.firstSelectedNode === node) {
                this.showStatus('Cannot connect a node to itself', 'error');
                return;
            }
            
            // Check if link already exists
            const linkExists = this.links.some(link => 
                (link.from === this.firstSelectedNode.id && link.to === node.id) ||
                (link.from === node.id && link.to === this.firstSelectedNode.id)
            );
            
            if (linkExists) {
                this.showStatus('Link already exists between these nodes', 'error');
            } else {
                const cost = parseInt(document.getElementById('linkCost').value) || 1;
                this.addLink(this.firstSelectedNode.id, node.id, cost);
                this.showStatus(`Connected ${this.firstSelectedNode.label} to ${node.label} with cost ${cost}`, 'success');
            }
            
            this.firstSelectedNode = null;
        }
    }
    
    addLink(fromId, toId, cost) {
        this.links.push({ from: fromId, to: toId, cost: cost });
        this.updateDisplay();
    }
    
    selectNode(node) {
        // Deselect all nodes
        this.nodes.forEach(n => n.selected = false);
        
        if (node) {
            node.selected = true;
            this.selectedNode = node;
        } else {
            this.selectedNode = null;
        }
        
        this.updateDisplay();
    }
    
    getNodeAtPosition(x, y) {
        const radius = 25;
        return this.nodes.find(node => {
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) <= radius;
        });
    }
    
    getNodeLabel(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        return node ? node.label : nodeId;
    }
    
    handleMouseDown(event) {
        // Prevent dragging during animation to avoid glitches
        if (this.isAnimating) {
            return;
        }
        
        const rect = this.svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const node = this.getNodeAtPosition(x, y);
        if (node && !this.connectMode) {
            this.dragging = true;
            this.dragNode = node;
            
            // Calculate offset for smooth dragging
            this.dragOffset = {
                x: x - node.x,
                y: y - node.y
            };
            
            this.selectNode(node);
            
            // Prevent default to avoid any browser drag behavior
            event.preventDefault();
        }
    }
    
    handleMouseMove(event) {
        if (this.dragging && this.dragNode && !this.isAnimating) {
            const rect = this.svg.getBoundingClientRect();
            
            // Calculate new position with offset for smooth dragging
            let newX = event.clientX - rect.left - this.dragOffset.x;
            let newY = event.clientY - rect.top - this.dragOffset.y;
            
            // Constrain to canvas boundaries (with node radius)
            newX = Math.max(25, Math.min(875, newX));
            newY = Math.max(25, Math.min(575, newY));
            
            // Update node position
            this.dragNode.x = newX;
            this.dragNode.y = newY;
            
            // CRITICAL: Immediate redraw for smooth dragging
            this.updateDisplay();
            
            // Prevent default to avoid any browser behavior
            event.preventDefault();
        }
    }
    
    handleMouseUp() {
        if (this.dragging) {
            this.dragging = false;
            this.dragNode = null;
            this.dragOffset = { x: 0, y: 0 };
            
            // Final clean redraw to ensure everything is properly positioned
            this.updateDisplay();
            
            console.log('Drag completed');
        }
    }
    
    async sendPacket() {
        if (this.isAnimating) {
            this.showStatus('Animation already in progress', 'error');
            return;
        }
        
        const senderId = this.senderSelect.value;
        const receiverId = this.receiverSelect.value;
        
        if (!senderId || !receiverId) {
            this.showStatus('Please select both sender and receiver', 'error');
            return;
        }
        
        // Run Dijkstra with step recording
        const result = this.dijkstraWithSteps(senderId, receiverId);
        
        if (!result.path || result.path.length === 0) {
            this.showStatus('No path found between sender and receiver', 'error');
            return;
        }
        
        // Display Dijkstra table if checkbox is checked
        this.displayDijkstraTable(result.steps);
        
        this.isAnimating = true;
        this.showStatus(`Sending packet from ${senderId} to ${receiverId}...`, 'info');
        
        try {
            // Animate request packet
            await this.animatePacket(result.path, 'request');
            
            // Wait a moment
            await this.sleep(500);
            
            // Animate response packet (reverse path)
            const reversePath = [...result.path].reverse();
            await this.animatePacket(reversePath, 'response');
            
            this.showStatus('Packet transmission completed successfully', 'success');
        } catch (error) {
            this.showStatus('Error during packet animation', 'error');
        } finally {
            this.isAnimating = false;
            this.clearPackets();
            this.clearActiveLinks();
        }
    }
    
    dijkstraWithSteps(sourceId, targetId) {
        const steps = [];
        const distances = {};
        const previous = {};
        const visited = new Set();
        const unvisited = new Set();
        
        // Initialize distances
        this.nodes.forEach(node => {
            distances[node.id] = node.id === sourceId ? 0 : Infinity;
            previous[node.id] = null;
            unvisited.add(node.id);
        });
        
        // Record initial state (iteration 0)
        steps.push({
            iteration: 0,
            current: sourceId,
            distances: {...distances},
            visited: new Set(),
            previous: {...previous}
        });
        
        let iteration = 1;
        
        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current = null;
            let minDistance = Infinity;
            
            for (const nodeId of unvisited) {
                if (distances[nodeId] < minDistance) {
                    minDistance = distances[nodeId];
                    current = nodeId;
                }
            }
            
            if (current === null || distances[current] === Infinity) {
                break; // No path exists
            }
            
            // Mark as visited
            visited.add(current);
            unvisited.delete(current);
            
            // Update distances to neighbors
            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    const alt = distances[current] + neighbor.cost;
                    if (alt < distances[neighbor.id]) {
                        distances[neighbor.id] = alt;
                        previous[neighbor.id] = current;
                    }
                }
            }
            
            // Record this step
            steps.push({
                iteration: iteration,
                current: current,
                distances: {...distances},
                visited: new Set(visited),
                previous: {...previous}
            });
            
            iteration++;
            
            // Stop if we reached destination
            if (current === targetId) break;
        }
        
        // Reconstruct path
        const path = [];
        let current = targetId;
        
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }
        
        return { path: path.length > 1 ? path : null, steps };
    }
    
    dijkstra(sourceId, targetId) {
        const result = this.dijkstraWithSteps(sourceId, targetId);
        return result.path;
    }
    
    getNeighbors(nodeId) {
        const neighbors = [];
        
        this.links.forEach(link => {
            if (link.from === nodeId) {
                neighbors.push({ id: link.to, cost: link.cost });
            } else if (link.to === nodeId) {
                neighbors.push({ id: link.from, cost: link.cost });
            }
        });
        
        return neighbors;
    }
    
    displayDijkstraTable(steps) {
        const tableContainer = document.getElementById('dijkstraTableContainer');
        if (!document.getElementById('showDijkstraTable').checked) {
            tableContainer.style.display = 'none';
            return;
        }
        
        tableContainer.style.display = 'block';
        
        // Create table HTML
        let html = '<h3>Dijkstra\'s Algorithm Execution Steps</h3>';
        html += '<div class="table-wrapper"><table class="dijkstra-table">';
        
        // Header row
        html += '<thead><tr>';
        html += '<th>Iteration</th>';
        html += '<th>Current Node</th>';
        
        // Add column for each node
        const sortedNodes = [...this.nodes].sort((a, b) => {
            // Sort by type first (sender, router, receiver), then by label
            const typeOrder = { sender: 1, router: 2, receiver: 3 };
            if (typeOrder[a.type] !== typeOrder[b.type]) {
                return typeOrder[a.type] - typeOrder[b.type];
            }
            return a.label.localeCompare(b.label);
        });
        
        for (let node of sortedNodes) {
            html += '<th>' + this.escapeHtml(node.label) + '</th>';
        }
        html += '<th>Visited Nodes</th>';
        html += '</tr></thead>';
        
        // Data rows
        html += '<tbody>';
        for (let step of steps) {
            html += '<tr>';
            html += '<td>' + step.iteration + '</td>';
            
            // Current node
            const currentNode = this.nodes.find(n => n.id === step.current);
            html += '<td class="current-node">' + (currentNode ? this.escapeHtml(currentNode.label) : '-') + '</td>';
            
            // Distance for each node
            for (let node of sortedNodes) {
                const dist = step.distances[node.id];
                const distStr = dist === Infinity ? '∞' : dist;
                const isVisited = step.visited.has(node.id);
                const isCurrent = node.id === step.current;
                let cellClass = '';
                if (isCurrent) cellClass = 'current-node';
                else if (isVisited) cellClass = 'visited-node';
                html += '<td class="' + cellClass + '">' + distStr + '</td>';
            }
            
            // Visited nodes list
            const visitedLabels = Array.from(step.visited).map(id => {
                const n = this.nodes.find(node => node.id === id);
                return n ? n.label : id;
            }).sort().join(', ');
            html += '<td>' + this.escapeHtml(visitedLabels) + '</td>';
            
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        
        // Add explanation
        html += '<div class="table-explanation">';
        html += '<p><strong>How to read this table:</strong></p>';
        html += '<ul>';
        html += '<li><strong>Iteration:</strong> Step number in the algorithm</li>';
        html += '<li><strong>Current Node:</strong> Node being processed in this step (highlighted in yellow)</li>';
        html += '<li><strong>Distance columns:</strong> Shortest known distance from source to each node</li>';
        html += '<li><strong>∞ (infinity):</strong> Node not yet reachable or distance unknown</li>';
        html += '<li><strong>Visited Nodes:</strong> Nodes that have been fully processed (green background)</li>';
        html += '<li>The algorithm selects the unvisited node with minimum distance in each iteration</li>';
        html += '<li>Distances are updated when a shorter path is found through the current node</li>';
        html += '</ul></div>';
        
        tableContainer.innerHTML = html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async animatePacket(path, type) {
        if (path.length < 2) return;
        
        const packet = this.createPacket(type);
        
        for (let i = 0; i < path.length - 1; i++) {
            const fromNode = this.nodes.find(n => n.id === path[i]);
            const toNode = this.nodes.find(n => n.id === path[i + 1]);
            
            // Highlight the active link
            this.highlightLink(fromNode.id, toNode.id);
            
            // Animate packet movement
            await this.movePacket(packet, fromNode, toNode);
            
            // Remove link highlight
            this.clearActiveLinks();
        }
    }
    
    createPacket(type) {
        const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        packet.setAttribute('r', '8');
        packet.setAttribute('class', `packet ${type}`);
        this.svg.appendChild(packet);
        return packet;
    }
    
    async movePacket(packet, fromNode, toNode) {
        const duration = 2000 / this.animationSpeed; // Base duration adjusted by speed
        const steps = 60;
        const stepTime = duration / steps;
        
        for (let step = 0; step <= steps; step++) {
            const progress = step / steps;
            const x = fromNode.x + (toNode.x - fromNode.x) * progress;
            const y = fromNode.y + (toNode.y - fromNode.y) * progress;
            
            packet.setAttribute('cx', x);
            packet.setAttribute('cy', y);
            
            await this.sleep(stepTime);
        }
    }
    
    highlightLink(fromId, toId) {
        const links = this.svg.querySelectorAll('.link');
        links.forEach(link => {
            const linkFromId = link.getAttribute('data-from');
            const linkToId = link.getAttribute('data-to');
            
            if ((linkFromId === fromId && linkToId === toId) || 
                (linkFromId === toId && linkToId === fromId)) {
                link.classList.add('active');
            }
        });
    }
    
    clearActiveLinks() {
        const links = this.svg.querySelectorAll('.link');
        links.forEach(link => link.classList.remove('active'));
    }
    
    clearPackets() {
        const packets = this.svg.querySelectorAll('.packet');
        packets.forEach(packet => packet.remove());
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    resetNetwork() {
        // Stop any ongoing animations
        this.isAnimating = false;
        
        // Clear packets and active links
        this.clearPackets();
        this.clearActiveLinks();
        
        // Reset connect mode
        this.connectMode = false;
        this.firstSelectedNode = null;
        const connectButton = document.getElementById('connectMode');
        connectButton.textContent = 'Connect Nodes';
        connectButton.classList.remove('connect-active');
        this.svg.classList.remove('connect-mode');
        
        // Recreate sample network
        this.createSampleNetwork();
        this.updateDropdowns();
        
        this.showStatus('Network reset to sample configuration', 'success');
    }
    
    updateDropdowns() {
        // Update sender dropdown
        this.senderSelect.innerHTML = '<option value="">Choose a sender</option>';
        this.nodes.filter(node => node.type === 'sender').forEach(node => {
            const option = document.createElement('option');
            option.value = node.id;
            option.textContent = node.label;
            this.senderSelect.appendChild(option);
        });
        
        // Update receiver dropdown
        this.receiverSelect.innerHTML = '<option value="">Choose a receiver</option>';
        this.nodes.filter(node => node.type === 'receiver').forEach(node => {
            const option = document.createElement('option');
            option.value = node.id;
            option.textContent = node.label;
            this.receiverSelect.appendChild(option);
        });
    }
    
    updateDisplay() {
        // CRITICAL: Force immediate canvas redraw for all network changes
        console.log(`Updating display with ${this.nodes.length} nodes and ${this.links.length} links`);
        
        // Store any existing packets to avoid clearing them during drag
        const existingPackets = Array.from(this.svg.querySelectorAll('.packet'));
        
        // Clear existing elements except defs and packets
        const elementsToRemove = [];
        for (let child of this.svg.children) {
            if (child.tagName !== 'defs' && !child.classList.contains('packet')) {
                elementsToRemove.push(child);
            }
        }
        
        elementsToRemove.forEach(element => {
            this.svg.removeChild(element);
        });
        
        // Draw links first (behind nodes)
        this.links.forEach(link => {
            const fromNode = this.nodes.find(n => n.id === link.from);
            const toNode = this.nodes.find(n => n.id === link.to);
            
            if (fromNode && toNode) {
                this.drawLink(fromNode, toNode, link.cost);
            }
        });
        
        // Draw nodes on top of links - MUST show immediately
        this.nodes.forEach(node => {
            this.drawNode(node);
        });
        
        // Draw routing tables if enabled
        if (this.showRoutingTables) {
            this.drawRoutingTables();
        }
        
        // Force SVG refresh to ensure immediate visual update
        this.svg.style.display = 'none';
        this.svg.offsetHeight; // Trigger reflow
        this.svg.style.display = 'block';
    }
    
    drawLink(fromNode, toNode, cost) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x);
        line.setAttribute('y1', fromNode.y);
        line.setAttribute('x2', toNode.x);
        line.setAttribute('y2', toNode.y);
        line.setAttribute('class', 'link');
        line.setAttribute('data-from', fromNode.id);
        line.setAttribute('data-to', toNode.id);
        this.svg.appendChild(line);
        
        // Add cost label
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        
        const costLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        costLabel.setAttribute('x', midX);
        costLabel.setAttribute('y', midY - 5);
        costLabel.setAttribute('class', 'link-cost');
        costLabel.textContent = cost;
        this.svg.appendChild(costLabel);
    }
    
    drawNode(node) {
        // CRITICAL: Ensure every node is drawn immediately and correctly
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `node ${node.type} ${node.selected ? 'selected' : ''}`);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', '25');
        
        // Ensure proper colors based on node type
        if (node.type === 'sender') {
            circle.setAttribute('fill', '#22c55e');
            circle.setAttribute('stroke', '#16a34a');
        } else if (node.type === 'router') {
            circle.setAttribute('fill', '#3b82f6');
            circle.setAttribute('stroke', '#2563eb');
        } else if (node.type === 'receiver') {
            circle.setAttribute('fill', '#f97316');
            circle.setAttribute('stroke', '#ea580c');
        }
        
        circle.setAttribute('stroke-width', node.selected ? '3' : '2');
        if (node.selected) {
            circle.setAttribute('stroke', 'var(--color-primary)');
        }
        
        group.appendChild(circle);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', node.x);
        text.setAttribute('y', node.y);
        text.setAttribute('fill', 'white');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-size', '12px');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('pointer-events', 'none');
        text.textContent = node.label;
        group.appendChild(text);
        
        this.svg.appendChild(group);
        
        console.log(`Drew node: ${node.label} (${node.type}) at (${node.x}, ${node.y})`);
    }
    
    drawRoutingTables() {
        const routers = this.nodes.filter(node => node.type === 'router');
        
        routers.forEach(router => {
            const routingTable = this.calculateRoutingTable(router.id);
            if (Object.keys(routingTable).length > 0) {
                this.drawRoutingTable(router, routingTable);
            }
        });
    }
    
    calculateRoutingTable(routerId) {
        const table = {};
        const allDestinations = this.nodes.filter(node => node.id !== routerId);
        
        allDestinations.forEach(dest => {
            const path = this.dijkstra(routerId, dest.id);
            if (path && path.length > 1) {
                table[dest.id] = path[1]; // Next hop
            }
        });
        
        return table;
    }
    
    drawRoutingTable(router, table) {
        const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreignObject.setAttribute('x', router.x + 35);
        foreignObject.setAttribute('y', router.y - 30);
        foreignObject.setAttribute('width', '120');
        foreignObject.setAttribute('height', '80');
        
        const div = document.createElement('div');
        div.className = 'routing-table';
        
        let tableHTML = '<table><tr><th>Dest</th><th>Next</th></tr>';
        Object.entries(table).forEach(([dest, next]) => {
            tableHTML += `<tr><td>${dest}</td><td>${next}</td></tr>`;
        });
        tableHTML += '</table>';
        
        div.innerHTML = tableHTML;
        foreignObject.appendChild(div);
        this.svg.appendChild(foreignObject);
    }
    
    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        
        // Auto-hide after 3 seconds for success/info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.statusMessage.className = 'status-message';
            }, 3000);
        }
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LinkStateRoutingSimulator();
});