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


 var svg = d3.select("body").append("svg")
 	.attr("width", width)
 	.attr("height", height);

 d3.json("thing2.json", function (error, graph) {
 	var link = svg.selectAll(".link")
 		.data(graph.links)
 		.enter().append("line")
 		.attr("class", "link")
 		.style("stroke-width", 4);


 	var node = svg.selectAll(".node")
 		.data(graph.nodes)
 		.enter().append("g")
 		.attr("class", "node")
 		.attr("width", nodeWidth)
 		.attr("height", nodeHeight)
 		// .style("fill", function (d, i) {
 		// 	return fill(i);
 		// })
 		// .style("stroke", function (d, i) {
 		// 	return d3.rgb(fill(i & 3)).darker(2);
 		// })
 		.call(force.drag)


 	node.html('<foreignObject width="125" height="50" style="    transform: translate(-50%,-50%);"><div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">Panel title</h3> </div> <div class="panel-body"> Panel content </div> </div></foreignObject>')


 	for (var i = 0; i < node[0].length; i++) {
 		node[0][i].querySelector('.panel-title').innerText = graph.nodes[i].name
 	}

 	force
 		.nodes(graph.nodes)
 		.links(graph.links)
 		.on("tick", tick)
 		.start();


 	var multiplyer = 1;
 	setTimeout(function () {
 		multiplyer = 10;
 		force.start();
 	}, 6000);

 	function tick(e) {
 		var k = e.alpha * multiplyer;
 		graph.nodes.forEach(function (o, i) {
 			console.log();


 			o.y += ((o.level * 200 + 50) - o.y) * k;
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
 });
 // svg.style("opacity", 1e-6)
 // .transition()
 //   .duration(1000)
 //   .style("opacity", 1);

 // d3.select("body")
 //   .on("mousedown", mousedown);

 // var y = d3.scale.ordinal()
 // .domain(d3.range(7))
 // .rangePoints([0, 100 * 7], 1);

 // function mousedown() {
 // nodes.forEach(function(o, i) {
 //   o.x += (Math.random() - .5) * 40;
 //   o.y += (Math.random() - .5) * 40;
 // });
 // force.resume();
 // }
