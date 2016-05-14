var width = window.innerWidth;
var height = window.innerHeight;
var nodeWidth = 174;
var nodeHeight = 50;

var force = d3.layout.force()
	.charge(-18000)
	.gravity(0.2)
	.linkDistance(5)
	.size([width, height])

var svg = d3.select("body").append("svg")
	.attr("width", width)
	.attr("height", height)


d3.select("body")
	.on("mousedown", function () {
		d3.event.stopPropagation();
	})


var container = svg.append("g");


function zoomed() {
	container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}



function overlap(rect1, rect2) {
	if (rect1.x < rect2.x + nodeWidth &&
		rect1.x + nodeWidth > rect2.x &&
		rect1.y < rect2.y + nodeHeight &&
		nodeHeight + rect1.y > rect2.y) {
		return true;
	}
}


function collide(node) {
	var nx1, nx2, ny1, ny2, padding;
	padding = 0;
	nx1 = node.x - padding;
	nx2 = node.x2() + padding;
	ny1 = node.y - padding;
	ny2 = node.y2() + padding;
	return function (quad, x1, y1, x2, y2) {
		var dy;
		if (quad.point && (quad.point !== node)) {
			if (overlap(node, quad.point)) {
				// dy = Math.min(node.y2() - quad.point.y, quad.point.y2() - node.y) / 4;
				// node.y -= dy;
				// quad.point.y += dy;
				var dx = Math.min(node.x2() - quad.point.x, quad.point.x2() - node.x) / 2;
				node.x -= dx;
				quad.point.x += dx;
			}
		}
		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	};
};




var zoom = d3.behavior.zoom()
	.scaleExtent([1, 10])
	.on("zoom", zoomed);

svg.call(zoom)


var dragStartedByRightButton = false;
var nodeDrag = d3.behavior.drag()
	.on("dragstart", function (d, i) {
		if (d3.event.sourceEvent.which == 3) {
			dragStartedByRightButton = true
			return;
		}
		else {
			dragStartedByRightButton = false;
			force.alpha(.007)
		}
	})
	.on("drag", function (d, i) {
		if (dragStartedByRightButton) {
			return;
		}
		d.px += d3.event.dx
		d.py += d3.event.dy
		d.x += d3.event.dx
		d.y += d3.event.dy
		force.alpha(.007)
	})


d3.json("thing2.json", function (error, graph) {
	graph.nodes.forEach(function (node) {
		// node.x = node.cx = Math.random() * 100 + 200
		node.y = node.cy = (node.level || node.group) * 200 + 50
		node.x2 = function () {
			return node.x + nodeWidth
		}
		node.y2 = function () {
			return node.y + nodeHeight
		}
	})


	var link = container.selectAll(".link")
		.data(graph.links)
		.enter().append("line")
		.attr("class", "link")
		.style("stroke-width", 4);


	var node = container.selectAll(".node")
		.data(graph.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("width", nodeWidth)
		.attr("height", nodeHeight)
		.on("mousedown", function () {
			d3.event.stopPropagation();
		})
		.call(nodeDrag)

	node.html('<foreignObject width="' + nodeWidth + '" height="' + nodeHeight + '"><div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">Panel title</h3> </div> <div class="panel-body"> Panel content </div> </div></foreignObject>')


	for (var i = 0; i < node[0].length; i++) {
		node[0][i].querySelector('.panel-title').innerText = graph.nodes[i].name
	}

	var multiplyer = 1;

	function tick(e) {
		var q = d3.geom.quadtree(graph.nodes);
		var i = 0;
		var n = graph.nodes.length;
		while (++i < n) {
			q.visit(collide(graph.nodes[i]));
		}

		graph.nodes.forEach(function (o, i) {
			//possible to get the staticly set width and height here, node[0][o.index].lastChild.width.value
			o.y += (((o.level || o.group) * 200 + 50) - o.y) * e.alpha * multiplyer;
		});

		link.attr("x1", function (d) {
				return d.source.x + nodeWidth / 2;
			})
			.attr("y1", function (d) {
				return d.source.y + nodeHeight / 2;
			})
			.attr("x2", function (d) {
				return d.target.x + nodeWidth / 2;
			})
			.attr("y2", function (d) {
				return d.target.y + nodeHeight / 2;
			});

		node.attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		});
	}

	force
		.nodes(graph.nodes)
		.links(graph.links)
		.on("tick", tick)
		.start();

	// return;
 	
	// Two step process:
	// make nodes find the nodes near them
	var safety = 0;
	// D3 cuts off at .005 alpha and freezes everything
	// the higher it is, the faster it loads, but it will not be done when it moves to the next step
	// You'll want to try out different, "small" values for this
	while (force.alpha() > 0.1) { 
		force.tick();
		if (safety++ > 500) {
			// Avoids infinite looping in case this solution was a bad idea
			break; 
		}
	}
	console.log(safety);

	//2. make nodes go towards their depth level
	multiplyer = 10;
	force.start();

	safety = 0;
	while (force.alpha() > 0.01) {
		force.tick();
		if (safety++ > 500) {
			break;
		}
	}
	console.log(safety);
});
