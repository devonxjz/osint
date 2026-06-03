<!-- frontend/src/lib/DomainDossierPanel.svelte -->

<script lang="ts">
  import type { ScannerState } from './scanner.svelte';
  import cytoscape from 'cytoscape';

  // Svelte 5 Prop binding
  let { scanner }: { scanner: ScannerState } = $props();

  let dossier = $derived(scanner.domainDossier);
  let whois = $derived(dossier?.whois);
  let subdomains = $derived(dossier?.subdomains || []);
  let certificates = $derived(dossier?.certificates || []);
  let wildcardDetected = $derived(dossier?.wildcardDetected || false);

  // Tab State - Default to 'graph' for an immediate visual premium impression
  let activeTab = $state<'graph' | 'dossier'>('graph');
  
  // Cytoscape Instance and Selection State
  let cy: any = null;
  let selectedNode = $state<any>(null);
  let isLabelsVisible = $state(true);
  let layoutTimeout: any = null;

  // Debounced layout execution to prevent screen stutters during real-time streaming scans
  function debouncedLayout() {
    if (layoutTimeout) clearTimeout(layoutTimeout);
    layoutTimeout = setTimeout(() => {
      runAutoLayout();
    }, 350); // Batch and layout updates every 350ms
  }

  // Derive graph structure reactively from the backend dynamic dossier
  let graphData = $derived(dossier?.graph || { nodes: [], edges: [] });

  // Svelte 5 `$effect` to initialize Cytoscape once when container is mounted
  $effect(() => {
    if (activeTab === 'graph' && typeof document !== 'undefined') {
      const cyContainer = document.getElementById('cy');
      if (cyContainer && !cy) {
        // Obsidian-style Graph View Aesthetic
        cy = cytoscape({
          container: cyContainer,
          elements: [],
          motionBlur: true,
          motionBlurOpacity: 0.15,
          textureOnViewport: true,
          pixelRatio: 'auto',
          wheelSensitivity: 0.15,
          style: [
            {
              selector: 'node',
              style: {
                'label': isLabelsVisible ? 'data(label)' : '',
                'color': '#a3a3a3', // Obsidian-style floating light grey label
                'font-size': '9px',
                'font-family': 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                'font-weight': 'normal',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'background-color': '#9ca3af', // Soft silver-grey node circles
                'width': (node: any) => {
                  const degree = node.degree();
                  const baseSize = node.data('group') === 'domain' ? 14 : 7;
                  return Math.min(26, Math.max(baseSize, baseSize + degree * 1.5)) + 'px';
                },
                'height': (node: any) => {
                  const degree = node.degree();
                  const baseSize = node.data('group') === 'domain' ? 14 : 7;
                  return Math.min(26, Math.max(baseSize, baseSize + degree * 1.5)) + 'px';
                },
                'border-width': '0px', // Flat, borderless nodes
                'overlay-opacity': 0,
                'text-background-opacity': 0, // Borderless, transparent text labels
                'transition-property': 'background-color, width, height, color, opacity',
                'transition-duration': 0.15
              }
            },
            // Specific Obsidian color-coding for different node groups
            {
              selector: 'node[group="domain"]',
              style: {
                'background-color': '#8b5cf6', // Bright purple for the main entry domain
                'color': '#c084fc',
                'font-weight': 'bold',
                'font-size': '11px'
              }
            },
            {
              selector: 'node[group="subdomain"]',
              style: {
                'background-color': '#3b82f6', // Obsidian sky-blue for subdomains
                'color': '#93c5fd'
              }
            },
            {
              selector: 'node[group="infrastructure"]',
              style: {
                'background-color': '#10b981', // Emerald green for IPs
                'color': '#6ee7b7'
              }
            },
            {
              selector: 'node[type="Port"]',
              style: {
                'background-color': '#f59e0b', // Amber orange for Shodan open ports
                'color': '#fcd34d',
                'font-size': '8px'
              }
            },
            {
              selector: 'node[group="person"]',
              style: {
                'background-color': '#ec4899', // Hot pink for names
                'color': '#fbcfe8'
              }
            },
            {
              selector: 'node[group="contact"]',
              style: {
                'background-color': '#f43f5e', // Rose red for emails/contacts
                'color': '#fecdd3'
              }
            },
            {
              selector: 'node[group="tracker"]',
              style: {
                'background-color': '#f59e0b', // Amber for Google Analytics/trackers
                'color': '#fcd34d'
              }
            },
            {
              selector: 'node[group="social"]',
              style: {
                'background-color': '#a855f7', // Purple/magenta for socials
                'color': '#e9d5ff'
              }
            },
            {
              selector: 'node[group="hidden"]',
              style: {
                'background-color': '#ef4444', // Crimson red for hidden pages/robots
                'color': '#fca5a5'
              }
            },
            {
              selector: 'node[group="history"]',
              style: {
                'background-color': '#6b7280', // Cool grey for archival records
                'color': '#d1d5db'
              }
            },
            {
              selector: 'node[group="evidence"]',
              style: {
                'background-color': '#14b8a6', // Teal for exposed docs
                'color': '#99f6e4'
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 0.6, // Elegant, ultra-thin connections
                'line-color': 'rgba(63, 63, 70, 0.4)', // Neutral dark grey edge lines
                'target-arrow-shape': 'none', // Flat, non-directional connections
                'curve-style': 'straight', // STRAIGHT lines render 5x faster and match Obsidian exactly!
                'transition-property': 'line-color, width, opacity',
                'transition-duration': 0.15
              }
            },
            {
              selector: 'node.hovered',
              style: {
                'background-color': '#ffffff', // Glow white on hover
                'color': '#ffffff',
                'font-weight': 'bold',
                'font-size': '10px',
                'scale': 1.15
              }
            },
            {
              selector: 'node.highlighted',
              style: {
                'color': '#ffffff',
                'opacity': 1.0
              }
            },
            {
              selector: 'edge.highlighted',
              style: {
                'width': 1.0,
                'line-color': '#8b5cf6', // Glow purple-indigo for connection lines
                'opacity': 0.8
              }
            },
            {
              selector: 'edge.dimmed',
              style: {
                'opacity': 0.1
              }
            },
            {
              selector: 'node.dimmed',
              style: {
                'opacity': 0.3
              }
            },
            {
              selector: 'node:selected',
              style: {
                'border-width': '2px',
                'border-color': '#ffffff',
                'color': '#ffffff'
              }
            }
          ],
          layout: {
            name: 'cose',
            animate: true,
            animationDuration: 450,
            fit: true,
            padding: 40,
            nodeOverlap: 4,
            nodeRepulsion: (node: any) => 7500, // Highly spacious repulsive force
            idealEdgeLength: (edge: any) => 90,
            edgeElasticity: (edge: any) => 100,
            nestingFactor: 5,
            gravity: 12, // Lower gravity for more open, airy layout
            numIter: 1000,
            initialTemp: 1000,
            coolingFactor: 0.99,
            minTemp: 1.0
          }
        });

        // Interactive hover event listener mappings for Obsidian effect
        cy.on('mouseover', 'node', (evt: any) => {
          const node = evt.target;
          const neighborhood = node.neighborhood();
          
          cy.elements().addClass('dimmed');
          node.removeClass('dimmed').addClass('hovered');
          neighborhood.removeClass('dimmed').addClass('highlighted');
          
          // Highlight connected edges
          node.connectedEdges().removeClass('dimmed').addClass('highlighted');
        });

        cy.on('mouseout', 'node', (evt: any) => {
          cy.elements().removeClass('dimmed').removeClass('hovered').removeClass('highlighted');
        });

        // Interactive tap event listener mappings
        cy.on('tap', 'node', (evt: any) => {
          const node = evt.target;
          selectedNode = {
            id: node.data('id'),
            label: node.data('label'),
            type: node.data('type'),
            group: node.data('group'),
            properties: node.data('properties')
          };
        });

        cy.on('tap', (evt: any) => {
          if (evt.target === cy) {
            selectedNode = null;
          }
        });

        // Springy physics pulling with collision avoidance on drag (highly optimized, cached neighbors to lock 60fps)
        let startPos: any = null;
        let originalPositions: { [id: string]: { x: number, y: number } } = {};
        let firstHopNodes: any[] = [];
        let secondHopNodes: any[] = [];

        cy.on('grab', 'node', (evt: any) => {
          const node = evt.target;
          startPos = { ...node.position() };
          
          originalPositions = {};
          cy.nodes().forEach((n: any) => {
            originalPositions[n.id()] = { ...n.position() };
          });

          // Cache 1-hop neighbors
          const firstHop = node.neighborhood('node');
          firstHopNodes = firstHop.toArray();
          const firstHopIds = new Set(firstHopNodes.map(n => n.id()));

          // Cache 2-hop neighbors
          const secondHopSet = new Set<string>();
          firstHopNodes.forEach((n: any) => {
            n.neighborhood('node').forEach((s: any) => {
              const sid = s.id();
              if (sid !== node.id() && !firstHopIds.has(sid)) {
                secondHopSet.add(sid);
              }
            });
          });
          
          secondHopNodes = Array.from(secondHopSet).map(id => cy.getElementById(id)).filter(n => n.length > 0);
        });

        cy.on('drag', 'node', (evt: any) => {
          if (!startPos) return;

          const node = evt.target;
          const currentPos = node.position();

          // Calculate overall drag displacement
          const dx = currentPos.x - startPos.x;
          const dy = currentPos.y - startPos.y;

          // Move 1-hop neighbors (pull 45%) and apply collision avoidance (min 50px distance)
          firstHopNodes.forEach((n: any) => {
            const orig = originalPositions[n.id()];
            if (orig) {
              let targetX = orig.x + dx * 0.45;
              let targetY = orig.y + dy * 0.45;

              // Collision avoidance with dragged node (maintain min 50px)
              const dist = Math.hypot(targetX - currentPos.x, targetY - currentPos.y);
              if (dist < 50) {
                const angle = Math.atan2(targetY - currentPos.y, targetX - currentPos.x);
                targetX = currentPos.x + Math.cos(angle) * 50;
                targetY = currentPos.y + Math.sin(angle) * 50;
              }

              n.position({ x: targetX, y: targetY });
            }
          });

          // Move 2-hop neighbors (pull 15%) and apply collision avoidance (min 90px distance)
          secondHopNodes.forEach((n: any) => {
            const nid = n.id();
            const orig = originalPositions[nid];
            if (orig) {
              let targetX = orig.x + dx * 0.15;
              let targetY = orig.y + dy * 0.15;

              // Collision avoidance with dragged node (maintain min 90px)
              const dist = Math.hypot(targetX - currentPos.x, targetY - currentPos.y);
              if (dist < 90) {
                const angle = Math.atan2(targetY - currentPos.y, targetX - currentPos.x);
                targetX = currentPos.x + Math.cos(angle) * 90;
                targetY = currentPos.y + Math.sin(angle) * 90;
              }

              n.position({ x: targetX, y: targetY });
            }
          });
        });

        cy.on('free', 'node', () => {
          startPos = null;
          originalPositions = {};
          firstHopNodes = [];
          secondHopNodes = [];
        });
      }
    }

    return () => {
      if (layoutTimeout) clearTimeout(layoutTimeout);
      if (cy) {
        cy.destroy();
        cy = null;
      }
    };
  });

  // Separate effect to reconcile elements when graphData updates (smooth batches)
  $effect(() => {
    if (cy && graphData) {
      const elements = [
        ...graphData.nodes.map((n: any) => ({
          data: { 
            id: n.id, 
            label: n.label, 
            type: n.type,
            group: n.group,
            properties: n.properties || {}
          }
        })),
        ...graphData.edges.map((e: any) => ({
          data: { 
            source: e.source, 
            target: e.target, 
            relation: e.relation 
          }
        }))
      ];

      const currentIds = new Set(cy.elements().map((el: any) => el.id()));
      const targetIds = new Set(elements.map((el: any) => el.data.id || `${el.data.source}-${el.data.target}`));

      // 1. Remove obsolete elements
      cy.elements().forEach((el: any) => {
        const id = el.id();
        if (!targetIds.has(id)) {
          cy.remove(el);
        }
      });

      // 2. Add or update elements
      const elementsToAdd: any[] = [];
      elements.forEach((el: any) => {
        const id = el.data.id || `${el.data.source}-${el.data.target}`;
        if (currentIds.has(id)) {
          const existing = cy.getElementById(id);
          if (existing.length > 0) {
            existing.data(el.data);
          }
        } else {
          // Smart positioning: spawn new nodes near their parent node to avoid a sudden jump from (0,0)
          if (!el.data.source) {
            const connectedEdge = graphData.edges.find((edge: any) => edge.target === el.data.id || edge.source === el.data.id);
            if (connectedEdge) {
              const parentId = connectedEdge.source === el.data.id ? connectedEdge.target : connectedEdge.source;
              const parentNode = cy.getElementById(parentId);
              if (parentNode.length > 0) {
                const parentPos = parentNode.position();
                el.position = {
                  x: parentPos.x + (Math.random() - 0.5) * 60,
                  y: parentPos.y + (Math.random() - 0.5) * 60
                };
              }
            }
          }
          elementsToAdd.push(el);
        }
      });

      if (elementsToAdd.length > 0) {
        cy.add(elementsToAdd);
      }

      // Re-run layout to position new elements smoothly if something changed (debounced layout)
      if (elementsToAdd.length > 0 || currentIds.size !== targetIds.size) {
        debouncedLayout();
      }
    }
  });

  // Effect to toggle labels reactively without recreating the graph
  $effect(() => {
    if (cy) {
      cy.style()
        .selector('node')
        .style('label', isLabelsVisible ? 'data(label)' : '')
        .update();
    }
  });

  // Effect to automatically resize and recalculate cytoscape container bounds when switching back to the graph tab
  $effect(() => {
    if (activeTab === 'graph' && cy) {
      // Small timeout ensures the DOM display: none is fully unapplied before resizing
      setTimeout(() => {
        if (cy) {
          cy.resize();
          cy.fit(); // Automatically center and fit elements nicely so the analyst doesn't see blank/cut off space
        }
      }, 50);
    }
  });

  // Floating Control panel actions
  function runAutoLayout() {
    if (cy) {
      cy.layout({
        name: 'cose',
        animate: true,
        animationDuration: 450,
        fit: true,
        padding: 40,
        nodeOverlap: 4,
        nodeRepulsion: (node: any) => 7500,
        idealEdgeLength: (edge: any) => 90,
        edgeElasticity: (edge: any) => 100,
        nestingFactor: 5,
        gravity: 12,
        numIter: 1000,
        initialTemp: 1000,
        coolingFactor: 0.99,
        minTemp: 1.0
      }).run();
    }
  }

  function fitView() {
    if (cy) {
      cy.fit();
    }
  }

  function exportPng() {
    if (cy) {
      try {
        // Ensure container has calculated sizes and export in super crisp high-res 2x resolution
        cy.resize();
        const png64 = cy.png({ 
          full: true, 
          bg: '#08080a',
          scale: 2 // High-quality 2x scaling for crystal-clear reports
        });
        const a = document.createElement('a');
        a.href = png64;
        a.download = `osint_graph_${scanner.target.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        document.body.appendChild(a); // Append to DOM for bulletproof cross-browser compatibility
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error('Failed to export graph to PNG:', err);
      }
    }
  }

  function exportJson() {
    if (cy) {
      try {
        // Export the clean, logical OSINT intelligence structure (nodes, relations, metadata)
        // instead of serializing Cytoscape's internal CSS stylesheet rules!
        const exportedData = {
          target: scanner.target,
          timestamp: new Date().toISOString(),
          nodes: cy.nodes().map((node: any) => ({
            id: node.id(),
            label: node.data('label'),
            type: node.data('type'),
            group: node.data('group'),
            properties: node.data('properties') || {}
          })),
          edges: cy.edges().map((edge: any) => ({
            source: edge.source().id(),
            target: edge.target().id(),
            relation: edge.data('relation') || ''
          }))
        };

        const jsonStr = JSON.stringify(exportedData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `osint_intel_${scanner.target.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export graph to JSON:', err);
      }
    }
  }

  // Click-to-Investigate HITL action
  function handleHitlAction() {
    if (!selectedNode) return;
    const label = selectedNode.label;
    
    // Programmatically populate target bar & initiate next deep dive scan
    scanner.target = label;
    scanner.startScan();
    
    // Reset selection drawer cleanly
    selectedNode = null;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="domain-dossier-wrapper">
  {#if scanner.target.trim()}
    <!-- Interactive Tab Selector -->
    <div class="tabs-container">
      <button 
        class="tab-btn" 
        class:active={activeTab === 'graph'} 
        onclick={() => activeTab = 'graph'}
      >
        {scanner.t.networkGraph}
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'dossier'} 
        onclick={() => activeTab = 'dossier'}
      >
        {scanner.t.dossierView}
      </button>
    </div>

    <!-- TAB 1: Network Graph & Interactive Investigator Workbench -->
    <div class="glass-panel graph-panel-container transition-fade" class:hidden={activeTab !== 'graph'}>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h3 class="panel-section-title" style="margin: 0;">{scanner.t.investigatorRelationalGraph}</h3>
          <p class="panel-section-subtitle" style="margin-top: 4px;">
            {scanner.t.graphInstructions}
          </p>
        </div>
      </div>

      <div class="cy-wrapper">
        <!-- Cytoscape Target Anchor -->
        <div id="cy" class="cytoscape-container"></div>

        <!-- Obsidian Scanning Overlay / Radar Dot -->
        {#if scanner.isScanning}
          <div class="graph-scan-status">
            <span class="pulse-radar-dot"></span>
            <span class="scan-status-text">{scanner.t.scanningTarget}</span>
          </div>
        {/if}

        <!-- Floating Graph Controls Panel (Vertical Stack like Obsidian) -->
        <div class="graph-controls-panel" style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
          <button onclick={fitView} title="Fit Graph View" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; width: 56px; border-radius: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
            <span>Fit</span>
          </button>
          <button onclick={runAutoLayout} title="Rearrange Layout" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; width: 56px; border-radius: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Layout</span>
          </button>
          <button onclick={() => isLabelsVisible = !isLabelsVisible} title="Toggle Node Labels" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; width: 56px; border-radius: 8px;">
            {#if isLabelsVisible}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            {/if}
            <span>Labels</span>
          </button>
          <button onclick={exportPng} title="Export PNG Image" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; width: 56px; border-radius: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>PNG</span>
          </button>
          <button onclick={exportJson} title="Export JSON Structure" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; width: 56px; border-radius: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            <span>JSON</span>
          </button>
        </div>

        <!-- Sliding Side Panel Detail Drawer -->
        {#if selectedNode}
          <div class="detail-drawer transition-slide">
            <div class="drawer-header">
              <h4 class="drawer-title">{scanner.t.nodeDossier}</h4>
              <button class="close-btn" onclick={() => selectedNode = null}>✕</button>
            </div>
            
            <div class="drawer-content">
              <div class="drawer-row">
                <span class="drawer-lbl">Label:</span>
                <span class="drawer-val highlight-val">{selectedNode.label}</span>
              </div>
              <div class="drawer-row">
                <span class="drawer-lbl">Type:</span>
                <span class="drawer-val font-mono">{selectedNode.type}</span>
              </div>
              <div class="drawer-row">
                <span class="drawer-lbl">Group:</span>
                <span class="drawer-val text-capitalize">{selectedNode.group}</span>
              </div>

              <!-- Custom mapped metadata attributes -->
              {#if selectedNode.properties && Object.keys(selectedNode.properties).length > 0}
                <div class="properties-section">
                  <h5 class="section-title">{scanner.t.attributes}</h5>
                  {#each Object.entries(selectedNode.properties) as [key, val]}
                    <div class="drawer-row nested-row">
                      <span class="drawer-lbl">{key}:</span>
                      <span class="drawer-val font-mono text-sm">{typeof val === 'object' ? JSON.stringify(val) : val}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Contextual HITL Pivot Investigation Action -->
              <button class="hitl-action-btn font-mono" onclick={handleHitlAction}>
                {#if selectedNode.group === 'domain' || selectedNode.group === 'subdomain'}
                  {scanner.t.auditOutboundLinks}
                {:else if selectedNode.group === 'contact'}
                  {scanner.t.initiateBreachSearch}
                {:else if selectedNode.group === 'evidence'}
                  {scanner.t.examineHeaderMetadata}
                {:else}
                  {scanner.t.pivotInvestigation}
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- TAB 2: Standard Dossier View (Grids & Tables) -->
    <div class="dossier-view-container" class:hidden={activeTab !== 'dossier'}>
      <!-- SECTION 1: Target Header Panel -->
      <div class="glass-panel main-header-panel">
        <div class="status-indicator">
          <span class="pulse-dot" class:active={scanner.isScanning}></span>
          <span class="status-text">{scanner.isScanning ? scanner.t.auditingInfrastructure : scanner.t.auditComplete}</span>
        </div>
        <h2 class="target-title-display" style="display: flex; align-items: center; gap: 8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          {scanner.target.trim()}
        </h2>
        <div class="metadata-grid">
          <div class="meta-item">
            <span class="meta-label">{scanner.t.type}</span>
            <span class="meta-value domain-pill">{scanner.t.domainInfrastructure}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">{scanner.t.subdomainsResolved}</span>
            <span class="meta-value" style="color: {subdomains.length > 0 ? 'var(--accent-green)' : 'var(--text-secondary)'}">
              {subdomains.length} Node(s)
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">{scanner.t.wildcardDnsStatus}</span>
            <span class="meta-value" style="color: {wildcardDetected ? 'var(--accent-orange)' : 'var(--accent-green)'}">
              {wildcardDetected ? scanner.t.detected : scanner.t.cleanDirect}
            </span>
          </div>
        </div>
      </div>

      <!-- SECTION 2: WHOIS Domain Metadata -->
      {#if whois || scanner.isScanning}
        <div class="glass-panel whois-panel transition-fade">
          <h3 class="panel-section-title">{scanner.t.whoisRegistration}</h3>
          {#if whois}
            <div class="identity-info-grid">
              <div class="details-list">
                <div class="detail-row">
                  <span class="row-lbl">{scanner.t.registrar}:</span>
                  <span class="row-val">{whois.registrar || 'Unknown'}</span>
                </div>
                {#if whois.created}
                  <div class="detail-row">
                    <span class="row-lbl">{scanner.t.createdDate}:</span>
                    <span class="row-val font-mono">{new Date(whois.created).toLocaleDateString()}</span>
                  </div>
                {/if}
                {#if whois.nameservers && whois.nameservers.length > 0}
                  <div class="detail-row">
                    <span class="row-lbl">{scanner.t.nameservers}:</span>
                    <span class="row-val font-mono">{whois.nameservers.join(', ')}</span>
                  </div>
                {/if}
                {#if whois.status && whois.status.length > 0}
                  <div class="detail-row">
                    <span class="row-lbl">{scanner.t.registryStatus}:</span>
                    <span class="row-val font-mono text-sm" style="color: var(--accent-blue);">
                      {whois.status.join(', ')}
                    </span>
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            <div class="loading-placeholder">
              <div class="spinner-small"></div>
              <span>{scanner.t.queryingWhois}</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- SECTION 3: Subdomain Resolution Matrix -->
      <div class="glass-panel subdomains-panel transition-fade">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h3 class="panel-section-title" style="margin: 0;">{scanner.t.resolvedSubdomains}</h3>
            <p class="panel-section-subtitle" style="margin-top: 4px;">
              {scanner.t.subdomainsDesc}
            </p>
          </div>
          {#if wildcardDetected}
            <span class="status-badge wildcard-badge">{scanner.t.wildcardProxyBypass}</span>
          {/if}
        </div>

        {#if subdomains.length > 0}
          <div class="subdomains-grid">
            {#each subdomains as sub}
              <div class="subdomain-card">
                <div class="subdomain-info">
                  <span class="subdomain-name">{sub.subdomain}</span>
                  <span class="subdomain-ip font-mono">IP: {sub.ip}</span>
                </div>
                <div class="badge-row">
                  {#if sub.isCloudflare}
                    <span class="status-badge cf-badge">{scanner.t.cloudflareProxy}</span>
                  {:else}
                    <span class="status-badge direct-badge">{scanner.t.directIpNode}</span>
                  {/if}
                  <a
                    href="http://{sub.subdomain}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inspect-link"
                  >
                    {scanner.t.visitBtn}
                  </a>
                </div>
              </div>
            {/each}
          </div>
        {:else if scanner.isScanning}
          <div class="loading-placeholder">
            <div class="spinner-small"></div>
            <span>{scanner.t.bruteForcingSubdomains}</span>
          </div>
        {:else}
          <span class="no-results-msg">{scanner.t.noActiveSubdomains}</span>
        {/if}
      </div>

      <!-- SECTION 4: Certificate Log Audit -->
      {#if certificates.length > 0 || scanner.isScanning}
        <div class="glass-panel certs-panel transition-fade">
          <h3 class="panel-section-title">{scanner.t.certLogAudit}</h3>
          <p class="panel-section-subtitle">
            {scanner.t.certLogDesc}
          </p>

          {#if certificates.length > 0}
            <div class="certs-list">
              {#each certificates as cert}
                <div class="cert-row">
                  <span class="cert-host font-mono">{cert.subdomain}</span>
                  <span class="cert-ip font-mono">{cert.ip}</span>
                  {#if cert.isCloudflare}
                    <span class="cf-indicator">Cloudflare</span>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="loading-placeholder">
              <div class="spinner-small"></div>
              <span>{scanner.t.interrogatingCertLogs}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .domain-dossier-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
  }

  .glass-panel {
    background: var(--bg-card);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease, border-color 0.3s ease;
  }

  .glass-panel:hover {
    border-color: var(--accent-blue);
  }

  .main-header-panel {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
    position: relative;
    overflow: hidden;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    position: absolute;
    top: 24px;
    right: 24px;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--accent-green);
  }

  .pulse-dot.active {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.9);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    }
    100% {
      transform: scale(0.9);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }

  .status-text {
    font-size: 11px;
    text-transform: uppercase;
    font-family: var(--font-mono);
    color: var(--text-secondary);
    letter-spacing: 0.05em;
  }

  .target-title-display {
    font-size: 28px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 20px 0;
    font-feature-settings: "tnum";
    letter-spacing: -0.02em;
    word-break: break-all;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-label {
    font-size: 11px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .meta-value {
    font-size: 15px;
    color: var(--text-primary);
    font-weight: 700;
  }

  .domain-pill {
    background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .panel-section-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 16px 0;
    letter-spacing: -0.01em;
  }

  .panel-section-subtitle {
    font-size: 12px;
    color: var(--text-secondary);
    margin: -8px 0 20px 0;
    line-height: 1.5;
  }

  /* --- Details Rows --- */
  .details-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .row-lbl {
    color: var(--text-secondary);
  }

  .row-val {
    font-weight: 600;
    color: var(--text-primary);
    text-align: right;
  }

  /* --- Subdomain Grid --- */
  .subdomains-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .subdomain-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    transition: all 0.2s ease;
  }

  .subdomain-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(99, 102, 241, 0.15);
  }

  .subdomain-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .subdomain-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .subdomain-ip {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
  }

  .cf-badge {
    background: rgba(99, 102, 241, 0.15);
    color: var(--accent-blue);
    border: 1px solid rgba(99, 102, 241, 0.25);
  }

  .direct-badge {
    background: rgba(148, 163, 184, 0.15);
    color: var(--text-secondary);
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  .wildcard-badge {
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent-orange);
    border: 1px solid rgba(245, 158, 11, 0.25);
  }

  .inspect-link {
    font-size: 11px;
    color: var(--accent-blue);
    text-decoration: none;
    font-weight: 700;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .inspect-link:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: rgba(99, 102, 241, 0.2);
  }

  /* --- Certs Log --- */
  .certs-list {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.03);
    overflow: hidden;
  }

  .cert-row {
    display: grid;
    grid-template-columns: 1fr 120px 80px;
    font-size: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    align-items: center;
  }

  .cert-row:last-child {
    border-bottom: none;
  }

  .cert-host {
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cert-ip {
    color: var(--text-secondary);
  }

  .cf-indicator {
    color: var(--accent-blue);
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 800;
  }

  /* --- Placeholders & Spinners --- */
  .no-results-msg {
    font-size: 13px;
    color: var(--text-secondary);
    font-style: italic;
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 13px;
    background: rgba(255, 255, 255, 0.02);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .transition-fade {
    animation: fadeIn 0.4s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- Relational Graph UI & Glassmorphic Drawer Styles --- */
  .tabs-container {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
  }

  .tab-btn {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .tab-btn.active {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
    border-color: var(--accent-blue);
    color: var(--text-primary);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
  }

  .cy-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .cytoscape-container {
    width: 100%;
    min-height: 620px;
    background-color: #0b0e14; /* Authentic Obsidian dark canvas background */
    background-image: radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 24px 24px; /* Dotted grid classic Obsidian view */
    border-radius: 16px;
    transition: border-color 0.3s ease;
  }

  /* Obsidian-style vertical floating control panel on the top-left */
  .graph-controls-panel {
    position: absolute;
    top: 16px;
    left: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(24, 24, 27, 0.85); /* Dark flat Obsidian zinc overlay */
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  .graph-controls-panel button {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #e4e4e7;
    font-size: 11px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 90px;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .graph-controls-panel button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
    transform: translateX(2px);
  }

  /* Glowing progressive scan banner */
  .graph-scan-status {
    position: absolute;
    bottom: 16px;
    left: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(9, 9, 11, 0.9);
    border: 1px solid rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.15);
    padding: 10px 16px;
    border-radius: 30px;
    z-index: 10;
    font-family: var(--font-mono);
    font-size: 11px;
    color: #e4e4e7;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .pulse-radar-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #8b5cf6;
    position: relative;
    display: inline-block;
  }

  .pulse-radar-dot::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #8b5cf6;
    animation: radar-pulse 1.8s infinite ease-out;
  }

  @keyframes radar-pulse {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(3.5);
      opacity: 0;
    }
  }

  .scan-status-text {
    letter-spacing: 0.03em;
    font-weight: 600;
  }

  /* Authentic Obsidian side details panel */
  .detail-drawer {
    position: absolute;
    top: 16px;
    right: 16px;
    bottom: 16px;
    width: 330px;
    background: rgba(20, 20, 23, 0.92); /* Deeper Obsidian flat obsidian-dark */
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: -12px 0 40px rgba(0, 0, 0, 0.6);
    z-index: 15;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.2);
  }

  .drawer-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
    transition: color 0.15s ease;
  }

  .close-btn:hover {
    color: #ffffff;
  }

  .drawer-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
  }

  .drawer-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: 13px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .nested-row {
    padding-left: 8px;
    font-size: 12px;
    border-bottom: none;
  }

  .drawer-lbl {
    color: #a1a1aa;
    font-size: 12px;
  }

  .drawer-val {
    font-weight: 600;
    color: #f4f4f5;
    word-break: break-all;
    text-align: right;
    max-width: 70%;
  }

  .highlight-val {
    color: #a78bfa; /* Lavender highlight */
  }

  .properties-section {
    margin-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 12px;
  }

  .properties-section .section-title {
    margin: 0 0 10px 0;
    font-size: 11px;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  .hitl-action-btn {
    margin-top: auto;
    background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); /* Obsidian dynamic purple gradient button */
    border: none;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hitl-action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(124, 58, 237, 0.4);
    filter: brightness(1.1);
  }

  .transition-slide {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  .hidden {
    display: none !important;
  }
</style>
