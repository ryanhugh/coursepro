 var width = window.innerWidth;
 var height = 2000;
 var nodeWidth = 125;
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
 	graph.nodes.forEach(function(node){
 		node.x = node.cx = 0
 		node.y = node.cy = node.level * 200+50
 		// node.fixed = true
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


 	node.html('<foreignObject width="164" height="50" style="transform: translate(-50%,-50%);"><div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">Panel title</h3> </div> <div class="panel-body"> Panel content </div> </div></foreignObject>')


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
 		var k = e.alpha * multiplyer;
 		graph.nodes.forEach(function (o, i) {

 			//possible to get the staticly set width and height here, node[0][o.index].lastChild.width.value
 			o.y += ((o.level * 200 + 50) - o.y) * k;
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
