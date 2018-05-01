/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SimPol.

    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/


function destroySecondaryStructure(){
		$("#mRNAsvg").remove();
		$("#bases").height(300);
		$("#bases").children().show(0);
}


function renderSecondaryStructure(data){
	
	
	
		//console.log("data", data);
		//return;
		if (data == null || data.vertices == null) return;

		$("#bases").children().show(0);
		for (var i = 0; i < data["toHide"].length; i ++){
			$(data["toHide"][i]).hide(0);
		}
	
		$("#bases").height(800);
		var yShift = 100;
		var width = parseFloat($("#pol").offset().left) + $("#bases").scrollLeft();
		var height = parseFloat($("#bases").height()) - yShift - 100;
		
		$("#mRNAsvg").remove();
		$("#bases").append("<svg id=mRNAsvg width=" + width + " height=" + height + " style='left:" + 0 + "px; top:" + yShift + "px; position:absolute; z-index: 2'></svg>")
	
		var svg = d3.select("#mRNAsvg");




		var nodes = data["vertices"];
		var edges = data["bonds"];

		var repulsionForce = -10;
		var wallRepulsionForce = -5 * nodes.length;
		var wallReplusionDistance = 100; // How close does something need to be to a wall to experience repulsion
		
		//console.log("Plotting edges", edges, "vertices", nodes);



		

		var dist = function(d){
			return d.bp ? 25 : d.terminal ? 50 : 20;
		}
		
		var gravity = function(alpha) {
		    return function(d) {
		        d.y += (d.startY - d.y) * alpha;
		        d.x += (d.startX - d.x) * alpha;
		    };
		}

		 //var simulation = d3.forceSimulation()
		     //.force("link", d3.forceLink())
		     //.force("charge", d3.forceManyBody().strength(-20))
		     //.force("center", d3.forceCenter(width / 2, height / 2));
		
		var linkForce  = d3.forceLink(edges).distance(dist).strength(2);

								

		 var links = svg.selectAll("foo")
		     .data(edges)
		     .enter()
		     .append("line")
		     .style("stroke", "#858280")
		     .style("stroke-width", function(d) { return d.bp ? 5 : 2; } );

		 var color = d3.scaleOrdinal(d3.schemeCategory20);

		 var node = svg.selectAll("img")
		     .data(nodes)
		     .enter()
		     .append("g")
		     .call(d3.drag()
		         .on("start", dragstarted)
		         .on("drag", dragged)
		         .on("end", dragended));


		 var nodeImage = node.append("image")
		     .attr("xlink:href", d => "src/Images/" + d.src + ".png")
		     .attr("height", "22px")
		     .attr("width", d => d.fixed ? 0 : d.src == "5RNA" ? "77px" : "22px" )
		     .attr("x", d => d.fixed ? d.fx - $("#bases").scrollLeft() : d.startX)
		     .attr("y", d => d.fixed ? d.fy : d.startY);


		

	     var simulation = d3.forceSimulation(nodes)
			.alphaDecay(0.007)
			.force("linkForce",linkForce)
			.force("charge", d3.forceManyBody().strength(repulsionForce))
			//.force("gravity", gravity(0.5))
			.on("tick", tick)
			//.force("center", d3.forceCenter($("#pol").offset().left, 100));


		 //simulation.nodes(nodes);
		 //simulation.force("link")
		    // .links(edges);


		
		var dx = function(dvertex) {

			if (dvertex.fixed) return dvertex.x = dvertex.fx;



			// Ensure that the item has not passed through the wall 
			var distanceToLeftWall_start = dvertex.startX; // (dvertex.src == "5RNA" ? 38 : 11) - dvertex.startX; 
			var distanceToRightWall_start = width  - (dvertex.src == "5RNA" ? 77 : 22) - dvertex.startX;
			dvertex.x = Math.max(-distanceToLeftWall_start, Math.min(distanceToRightWall_start, dvertex.x)); 



			/*
			// Calculate wall repulsion force. Do not accept non-positive distances to the wall
			var distanceToLeftWall_end = Math.max(distanceToLeftWall_start + dvertex.x, 1); 
			var distanceToRightWall_end = Math.max(distanceToRightWall_start - dvertex.x, 1);

			if (distanceToLeftWall_end < wallReplusionDistance) dvertex.x += -wallRepulsionForce / (distanceToLeftWall_end * distanceToLeftWall_end * distanceToLeftWall_end);
			if (distanceToRightWall_end < wallReplusionDistance) dvertex.x += wallRepulsionForce / (distanceToRightWall_end * distanceToRightWall_end * distanceToRightWall_end);
			*/

			return dvertex.x; 



		};
		var dy = function(dvertex) {
			if (dvertex.fixed) return dvertex.y = dvertex.fy;


			// Ensure that the item has not passed through the wall 
			var distanceToTopWall_start = dvertex.startY; // (dvertex.src == "5RNA" ? 38 : 11) - dvertex.startX; 
			var distanceToBottomWall_start = height - 22 - dvertex.startY;
			dvertex.y = Math.max(-distanceToTopWall_start, Math.min(distanceToBottomWall_start, dvertex.y)); 


			/*
			// Calculate wall repulsion force. Do not accept non-positive distances to the wall
			var distanceToTopWall_end = Math.max(distanceToTopWall_start + dvertex.y, 1); 
			var distanceToBottomWall_end = Math.max(distanceToBottomWall_start - dvertex.y, 1);

			if (distanceToTopWall_end < wallReplusionDistance) dvertex.y += -wallRepulsionForce / (distanceToTopWall_end * distanceToTopWall_end * distanceToTopWall_end);
			if (distanceToBottomWall_end < wallReplusionDistance) dvertex.y += wallRepulsionForce / (distanceToBottomWall_end * distanceToBottomWall_end * distanceToBottomWall_end);
			*/


			return dvertex.y; // = Math.max(11 - dvertex.startY, Math.min(height - 22 - dvertex.startY, dvertex.y));
		};


		//simulation.on("tick", function() { 
		function tick(){
			
		//	node.attr("transform", (d) => "translate(" + dx(d) + "," + dy(d) + ")")
		
			

			node.attr("transform", function(dvertex){
				return "translate(" + dx(dvertex) + "," + dy(dvertex) + ")";
			});
			
			node.attr("x", function(dvertex) { dx(dvertex) }); 
			node.attr("y", function(dvertex) { dy(dvertex) });
			
			
		
		
			links.attr("x1", function(d) {
			    return d.source.x + (d.src == "5RNA" ? 38 : 11) + d.source.startX;
				//return Math.max(10, Math.min(width - 10, d.source.x));
			 })
			 .attr("y1", function(d) {
			    return d.source.y + (d.src == "5RNA" ? 38 : 11) + d.source.startY;
				//return Math.max(10, Math.min(height - 10, d.source.y));
			 })
			 .attr("x2", function(d) {
			    return d.target.x + (d.src == "5RNA" ? 38 : 11) + d.target.startX;
				//return Math.max(10, Math.min(width - 10, d.target.x));
			 })
			 .attr("y2", function(d) {
			    return d.target.y + (d.src == "5RNA" ? 38 : 11) + d.target.startY;
				//return Math.max(10, Math.min(height - 10, d.target.y));
			 })


		 };

		 function dragstarted(d) {
			
			 if (d.fixed) return;
			
		     if (!d3.event.active) simulation.alphaTarget(0.3).restart();
		     d.fx = d.x;
		     d.fy = d.y;
		 }

		 function dragged(d) {
			
			if (d.fixed) return;
			
		    d.fx = d3.event.x;
		    d.fy = d3.event.y;
		 }

		 function dragended(d) {
			
			if (d.fixed) return;
			
		    if (!d3.event.active) simulation.alphaTarget(0);
		    d.fx = null;
		    d.fy = null;
		 }
	
}







