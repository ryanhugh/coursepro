 var width = window.innerWidth;
 var height = 2000;
 var nodeWidth = 174;
 var nodeHeight = 50;

 var fill = d3.scale.category10();

 var force = d3.layout.force()
 	.charge(-18000)
 	.gravity(0.2)
 	.linkDistance(5)
 	.size([width, height])

 // force.resume = function () {
 // 	var alpha = force.alpha()
 // 	if (alpha < 0.005) {
 // 		alpha = 0.0055
 // 	}
 // 	else if (alpha < 0.11) {
 // 		alpha += 0.0006
 // 	}
 // 	return force.alpha(alpha);
 // };

 var container;

 function zoomed() {
 	container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
 }

 var zoom = d3.behavior.zoom()
 	.scaleExtent([1, 10])
 	.on("zoom", zoomed);

 var svg = d3.select("body").append("svg")
 	.attr("width", width)
 	.attr("height", height)
 	.call(zoom);

 // var drag = d3.behavior.drag()
 // 	.on('drag', function () {
 // 		// console.log(d3.event.sourceEvent.button);
 // 		if (d3.event.sourceEvent.button == 0) {
 // 			var mouse = d3.mouse(this);
 // 			d3.select(this)
 // 				.attr('x', mouse[0])
 // 				.attr('y', mouse[1]);
 // 		}

 // 	});

 var nodeDrag = d3.behavior.drag()
 	.on("dragstart", function (d, i) {
 		if (d3.event.sourceEvent.which == 1) // initiate on left mouse button only
 			dragInitiated = true // -> set dragInitiated to true
 		force.alpha(.007)
 	})
 	.on("drag", function (d, i) {
 		if (dragInitiated) // perform only if a drag was initiated
 			d.px += d3.event.dx
 		d.py += d3.event.dy
 		d.x += d3.event.dx
 		d.y += d3.event.dy
 		force.alpha(.007)
 			// tick()
 	})
 	.on("dragend", function (d, i) {
 		// if (d3.event.sourceEvent.which == 1) // only take gestures into account that
 		// force.resume() // were valid in "dragstart"
 		// d.fixed = true
 		// tick()
 		dragInitiated = false
 	}) // terminate drag gesture

 d3.json("thing2.json", function (error, graph) {
 	graph.nodes.forEach(function (node) {
 		node.x = node.cx = Math.random() * 100 + 200
 		node.y = node.cy = node.level * 200 + 50
 		node.x2 = function () {
 			return node.x + nodeWidth
 		}
 		node.y2 = function () {
 			return node.y + nodeHeight
 		}
 	})


 	container = svg.append("g");

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
 		// .on("drag", drag)
 		// .on('drag', function (a, b, c) {

 	// 	console.log(c);
 	// 	return;
 	// 	console.log(d3.event.sourceEvent.button);

 	// 	// if(d3.event.sourceEvent.button == 0){
 	// 	var mouse = d3.mouse(this);
 	// 	d3.select(this)
 	// 		.attr('x', mouse[0])
 	// 		.attr('y', mouse[1]);
 	// })

 	// .style("fill", function (d, i) {
 	// 	return fill(i);
 	// })
 	// .style("stroke", function (d, i) {
 	// 	return d3.rgb(fill(i & 3)).darker(2);
 	// })

 	//  style="transform: translate(-50%,-50%);"
 	node.html('<foreignObject width="' + nodeWidth + '" height="' + nodeHeight + '"><div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">Panel title</h3> </div> <div class="panel-body"> Panel content </div> </div></foreignObject>')


 	for (var i = 0; i < node[0].length; i++) {
 		node[0][i].querySelector('.panel-title').innerText = graph.nodes[i].name
 	}

 	force
 		.nodes(graph.nodes)
 		.links(graph.links)
 		.on("tick", tick)
 		.start();


 	var multiplyer = 1;
 	// setTimeout(function () {
 	// 	multiplyer = 10;
 	// 	force.start();
 	// }, 6000);

 	function tick(e) {
 		if (multiplyer === 15) {
 			var q = d3.geom.quadtree(graph.nodes),
 				i = 0,
 				n = graph.nodes.length;
 			while (++i < n) {
 				q.visit(collide(graph.nodes[i]));
 			}

 		}

 		graph.nodes.forEach(function (o, i) {

 			//possible to get the staticly set width and height here, node[0][o.index].lastChild.width.value
 			o.y += ((o.level * 200 + 50) - o.y) * e.alpha * multiplyer;
 			// if (o.x < 0) {}
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

 		// node.attr("x", function (d) {
 		// 		return d.x;
 		// 	})
 		// 	.attr("y", function (d) {
 		// 		return d.y;
 		// 	});

 		node.attr("transform", function (d) {
 			return "translate(" + d.x + "," + d.y + ")";
 		});
 	}

 	var safety = 0;
 	while (force.alpha() > 0.005) { // You'll want to try out different, "small" values for this
 		force.tick();
 		if (safety++ > 500) {
 			break; // Avoids infinite looping in case this solution was a bad idea
 		}
 	}

 	if (safety < 500) {
 		console.log('success??');
 	}

 	multiplyer = 10;

 	force.start();

 	var safety = 0;
 	while (force.alpha() > 0.005) { // You'll want to try out different, "small" values for this
 		force.tick();
 		if (safety++ > 500) {
 			break; // Avoids infinite looping in case this solution was a bad idea
 		}
 	}

 	if (safety < 500) {
 		console.log('success??');
 	}

 	setTimeout(function () {
 		force.start();

 		multiplyer = 15;

 	}.bind(this), 3000)

 });
 // svg.style("opacity", 1e-6)
 // .transition()
 //   .duration(1000)
 //   .style("opacity", 1);

 d3.select("body")
 	.on("mousedown", function () {
 		d3.event.stopPropagation();
 	})

 // var y = d3.scale.ordinal()
 // .domain(d3.range(7))
 // .rangePoints([0, 100 * 7], 1);

 // function mousedown() {
 // // nodes.forEach(function(o, i) {
 // //   o.x += (Math.random() - .5) * 40;
 // //   o.y += (Math.random() - .5) * 40;
 // // });
 // force.resume();
 // }


 // overlap = function (a, b) {
 // 	var _ref, _ref1, _ref2, _ref3;
 // 	return ((a.x <= (_ref = b.x) && _ref <= a.x2()) && (a.y <= (_ref1 = b.y) && _ref1 <= a.y2()))
 // 	 || ((a.x <= (_ref2 = b.x2()) && _ref2 <= a.x2()) && (a.y <= (_ref3 = b.y2()) && _ref3 <= a.y2()));
 // };

 function overlap(rect1, rect2) {
 	if (rect1.x < rect2.x + nodeWidth &&
 		rect1.x + nodeWidth > rect2.x &&
 		rect1.y < rect2.y + nodeHeight &&
 		nodeHeight + rect1.y > rect2.y) {
 		return true;
 		// collision detected!
 	}
 }


 collide = function (node) {
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

 // function overlap(a, b) {
 // 	return false;
 // 	return (a.x < b.x < a.x2() && a.y < b.y < a.y2()) ||
 // 		(a.x < b.x2() < a.x2() && a.y < b.y2() < a.y2())
 // }

 // function collide(node) {
 // 	var nx1, nx2, ny1, ny2, padding;
 // 	padding = 32;
 // 	nx1 = node.x - padding;
 // 	nx2 = node.x2() + padding;
 // 	ny1 = node.y - padding;
 // 	ny2 = node.y2() + padding;
 // 	return function (quad, x1, y1, x2, y2) {
 // 		var dx, dy;
 // 		if (quad.point && (quad.point !== node)) {
 // 			if (overlap(node, quad.point)) {
 // 				dx = Math.min(node.x2() - quad.point.x, quad.point.x2() - node.x) / 2;
 // 				node.x -= dx;
 // 				quad.point.x += dx;
 // 				dy = Math.min(node.y2() - quad.point.y, quad.point.y2() - node.y) / 2;
 // 				node.y -= dy;
 // 				quad.point.y += dy;
 // 			}
 // 		}
 // 		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
 // 	};
 // };
