var width = 2000;
var height = 2000;

var color = d3.scale.category20();

// var force = d3.layout.force()
// .linkDistance(50)
// .linkStrength(2)
// .charge(-500)
// .gravity(0)
// .theta(0)
// .size([width, height]);

var force = d3.layout.force()
	.gravity(.2)
	.friction(.4)
	.charge(-8000)
	.size([width, height]);

var svg = d3.select("body").append("svg")
	.attr("width", width)
	.attr("height", height);

d3.json("/thing2.json", function (error, graph) {
	if (error) throw error;

	var nodes = graph.nodes.slice(),
		links = [],
		bilinks = [];


	nodes.forEach(function (node, index) {
		node.xGoal = Math.random() * 1000;
		node.yGoal = (node.group || node.level) * 100
		node.depth = (node.group || node.level) + 1
	}.bind(this))

	graph.links.forEach(function (link) {
		var s = nodes[link.source],
			t = nodes[link.target],
			i = {}; // intermediate node
		nodes.push(i);
		links.push({
			source: s,
			target: i
		}, {
			source: i,
			target: t
		});
		bilinks.push([s, i, t]);
	});

	force
		.nodes(nodes)
		.links(links)
		.start();

	var link = svg.selectAll(".link")
		.data(bilinks)
		.enter().append("line")
		.attr("class", "link");



	var node = svg.selectAll(".node")
		.data(graph.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("width", "125")
		.attr("height", "50")
		.call(force.drag);

	// node.append("image")
	//     .attr("xlink:href", "https://github.com/favicon.ico")
	//     .attr("x", -8)
	//     .attr("y", -8)
	//     .attr("width", 16)
	//     .attr("height", 16);

	// node.append("text")
	//     .attr("dx", 12)
	//     .attr("dy", ".35em")
	//     .text(function(d) { return d.name });

	node.html('<foreignObject width="125" height="50" style="    transform: translate(-50%,-50%);"><div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">Panel title</h3> </div> <div class="panel-body"> Panel content </div> </div></foreignObject>')


	for (var i = 0; i < node[0].length; i++) {
		node[0][i].querySelector('.panel-title').innerText = nodes[i].name
	}

	// force.on("tick", function() {
	//   link.attr("x1", function(d) { return d.source.x; })
	//       .attr("y1", function(d) { return d.source.y; })
	//       .attr("x2", function(d) { return d.target.x; })
	//       .attr("y2", function(d) { return d.target.y; });


	setInterval(function () {

		// Push nodes toward their designated focus.
		nodes.forEach(function (o, i) {
			// o.y += (o.yGoal+50 - o.y) * .01;
			// o.x += (o.xGoal - o.x) * e.alpha*.01;
		});

	}.bind(this), 50)

	// force.on("tick", function(e) {



	//   // link.attr("d", function(d) {
	//   //   return "M" + d[0].x + "," + d[0].y
	//   //       + "S" + d[1].x + "," + d[1].y
	//   //       + " " + d[2].x + "," + d[2].y;
	//   // });

	//    link.attr("x1", function(d) { return d[0].x+125/2; })
	//       .attr("y1", function(d) { return d[0].y+25; })
	//       .attr("x2", function(d) { return d[2].x+125/2; })
	//       .attr("y2", function(d) { return d[2].y+25; });




	//   node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	// });

	var multiplyer = 1;
	// setTimeout(function () {
	//   multiplyer = 10
	// }.bind(this),6000)

	var yDelta = 150
	force.on("tick", function (e) {

		var ky = e.alpha * multiplyer;
		links.forEach(function (d, i) {
			d.target.y += (d.target.depth * yDelta - d.target.y) * 5 * ky;
			if (d.target.y < 50) {
				d.target.y = 50
			}
		});
		nodes.forEach(function (d, i) {



			if (d.children) {
				if (i > 0) {
					var childrenSumX = 0;
					d.children.forEach(function (d, i) {
						childrenSumX += d.x;
					});
					var childrenCount = d.children.length;
					d.x += ((childrenSumX / childrenCount) - d.x) * 5 * ky;
				}
				else {
					d.x += (width / 2 - d.x) * 5 * ky;
				};
			};
			if (d.y < 50) {
				d.y = 50
			}
			if (d.depth == 1) {
				d.y = 50
			}
		});

		// link.attr("x1", function(d) { return d[0].x; })
		//     .attr("y1", function(d) { return d[0].y; })
		//     .attr("x2", function(d) { return d[2].x; })
		//     .attr("y2", function(d) { return d[2].y; });


		link.attr("x1", function (d) {
				return d[0].x + 125 / 2;
			})
			.attr("y1", function (d) {
				return d[0].y + 25;
			})
			.attr("x2", function (d) {
				return d[2].x + 125 / 2;
			})
			.attr("y2", function (d) {
				return d[2].y + 25;
			});


		// node.attr("cx", function(d) { return d.x; })
		// .attr("cy", function(d) { return d.y; });

		node.attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		});
	});


});


//   var node = svg.selectAll(".node")
//       .data(graph.nodes)
//     .enter().append("circle")
//       .attr("class", "node")
//       .attr("r", 5)
//       .style("fill", function(d) { return color(d.group); })
//       .call(force.drag);

//   // node.append("title")
//   //     .text(function(d) { return d.name; });


//   node.append("text")
//       .attr("dx", 12)
//       .attr("dy", ".35em")
//       .text(function(d) { return d.name });


//   force.on("tick", function() {
//     link.attr("d", function(d) {
//       return "M" + d[0].x + "," + d[0].y
//           + "S" + d[1].x + "," + d[1].y
//           + " " + d[2].x + "," + d[2].y;
//     });
//     node.attr("transform", function(d) {
//       return "translate(" + d.x + "," + d.y + ")";
//     });
//   });
// });