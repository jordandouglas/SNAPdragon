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

function initPlots(){

	PLOT_DATA = {};
	DWELL_TIMES_CONTROLLER = [];
	VELOCITIES = [];
	DISTANCE_VS_TIME_CONTROLLER = [];

	variableSelectionMode = false;
	haveShownDVTerrorMessage = false; // If the distance versus time plot contains too much data it slows down the program.
									  // Show an error message once if the number of points becomes too great

	$("#plotDIV4").hide();

	$("#selectPlot1").val("none");
	$("#selectPlot2").val("none");
	$("#selectPlot3").val("none");
	$("#selectPlot4").val("none");




}


function update_DWELL_TIMES_CONTROLLER(DWELL_TIMES_UNSENT){


	if (DWELL_TIMES_UNSENT == null) return;


	// Add the new distance and time values to the pre-existing lists
	for (var simNum in DWELL_TIMES_UNSENT){

		if (simNum < 1) continue;
		if (DWELL_TIMES_CONTROLLER[simNum-1] == null) DWELL_TIMES_CONTROLLER[simNum-1] = [];

		for (var j = 0; j < DWELL_TIMES_UNSENT[simNum].length; j ++){

			// Update the dwell times list and sort it as we go
			sortedPush(DWELL_TIMES_CONTROLLER[simNum-1], DWELL_TIMES_UNSENT[simNum][j]);


		}

	}



}



function update_DISTANCE_VS_TIME(DISTANCE_VS_TIME_UNSENT){


	if (DISTANCE_VS_TIME_UNSENT == null) return;

	//console.log("DISTANCE_VS_TIME_UNSENT", DISTANCE_VS_TIME_UNSENT);

	// Add the new distance and time values to the pre-existing lists
	for (var simNum in DISTANCE_VS_TIME_UNSENT){

		//if (DISTANCE_VS_TIME_UNSENT[simNum] == null) continue;

		if (DISTANCE_VS_TIME_CONTROLLER[simNum-1] == null) DISTANCE_VS_TIME_CONTROLLER[simNum-1] = {sim: simNum, times: [], distances: []};
		if (VELOCITIES[simNum-1] == null) VELOCITIES[simNum-1] = {sim: simNum, times: [], distances: []};
		var DVT = DISTANCE_VS_TIME_CONTROLLER[simNum-1];
		var VELO = VELOCITIES[simNum-1];

		// Ensure that the list starts out at time zero
		if (DVT.times.length > 0 && DVT.times[0] != 0){
			DVT.times.unshift(0);
			DVT.distances.unshift(DVT.distances[0]);
		}

		for (var j = 0; j < DISTANCE_VS_TIME_UNSENT[simNum]["times"].length; j ++){


			// Update the distance vs time list
			DVT["times"].push(DISTANCE_VS_TIME_UNSENT[simNum]["times"][j]);
			DVT["distances"].push(DISTANCE_VS_TIME_UNSENT[simNum]["distances"][j]);





			// Update the velocity list
			var prevTime = VELO["times"].length >= 1 ? VELO["times"][VELO["times"].length-1] : 0; // Add zero or the last entry to get accumulative time
			VELO["times"].push(DISTANCE_VS_TIME_UNSENT[simNum]["times"][j] + prevTime);
			VELO["distances"].push(DISTANCE_VS_TIME_UNSENT[simNum]["distances"][j]);
			
				
			//var velocity = (DVT["distances"][lastIndex] - DVT["distances"][lastIndex-1]) / DISTANCE_VS_TIME_UNSENT[simNum]["times"][j];
			//console.log("travelled from", DVT["distances"][lastIndex-1], "to", DVT["distances"][lastIndex], "in time", DISTANCE_VS_TIME_UNSENT[simNum]["times"][j], "velocity", velocity);
			//sortedPush(VELOCITIES, velocity);



		}



	}

	//console.log("Got", DISTANCE_VS_TIME_CONTROLLER);


}



function drawPlots(forceUpdate = false, callback = function() { }){

	//console.trace();
	//console.log("drawPlots");
	
	// Only make a request if there exists a visible plot
	//console.log("visibilities", $("#plotDIV1").is(":visible"), $("#plotDIV2").is(":visible"), $("#plotDIV3").is(":visible"), $("#plotDIV4").is(":visible"));
	if (!$("#plotDIV1").is(":visible") && !$("#plotDIV2").is(":visible") && !$("#plotDIV3").is(":visible") && !$("#plotDIV4").is(":visible") && parseFloat($("#sequencesTableDIV").height()) == 0 ) {
		callback();
		return;
	}

	
	var toCall = () => new Promise((resolve) => getPlotData_controller(forceUpdate, resolve));
	toCall().then((plotData) => {

		//console.log("Called get data got", plotData);

		drawPlotsFromData(plotData, callback)
	});
	

}



function drawPlotsFromData(plotData, resolve = function() { }){

	update_PLOT_DATA(plotData)

	//console.log("drawPlotsFromData", PLOT_DATA);
	//console.trace();


	// If more data is available from the model then get it all before drawing the plots

	//else {

		window.requestAnimationFrame(function(){
			for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){


				if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "none") $("#plotCanvasContainer" + plt).html("");

				else if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "custom" && PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] != "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plt]["plotFunction"])();
				else if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "custom" || PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "parameterHeatmap") eval(PLOT_DATA["whichPlotInWhichCanvas"][plt]["plotFunction"])(plt);
			}

			if (plotData.moreData) {
				console.log("Need more data");
				drawPlots(false, resolve);
			}

			else resolve();

		});

	//}


	

}




function update_PLOT_DATA(plotData){

	//console.log("update_PLOT_DATA", plotData);

	PLOT_DATA = plotData;

	if (PLOT_DATA.sequences != null) {
		for (var i = 0; i < PLOT_DATA.sequences.length; i ++){
			renderTermination({primerSeq: PLOT_DATA.sequences[i], insertPositions: []});
		}
	}

	// Add the new values to the DISTANCE_VS_TIME_CONTROLLER data structure
	update_DISTANCE_VS_TIME(plotData["DVT_UNSENT"]);

	// Update the dwell times
	update_DWELL_TIMES_CONTROLLER(plotData["DWELL_TIMES_UNSENT"]);

}


function sequenceChangeRefresh(){


	console.log("sequenceChangeRefresh");



	DWELL_TIMES_CONTROLLER = [];
	VELOCITIES = [];
	DISTANCE_VS_TIME_CONTROLLER = [];

	resetAllPlots();
	PLOT_DATA = {};
	

	
}


function resetAllPlots(){


	if (PLOT_DATA["whichPlotInWhichCanvas"] == null) return;
	basesToDisplayTimes100 = 1;
	haveShownDVTerrorMessage = false;
	
	for (var i = 0; i < PLOT_DATA["whichPlotInWhichCanvas"].length; i ++){

		if (i+1 == 4) $("#plot4Buttons").hide(true);
		else{
			$("#downloadPlot" + (i+1)).hide(true);
			$("#plotOptions" + (i+1)).hide(true);
			$("#helpPlot" + (i+1)).hide(true);
		}
	}


}




function selectPlot(plotNum, deleteData = null){


	console.log("select plot", plotNum);

	var plotSelect = $("#selectPlot" + plotNum);
	var value = plotSelect.val();

	
	// Update the model
	selectPlot_controller(plotNum, value, deleteData, function(plotData){
		
		update_PLOT_DATA(plotData);

		//console.log(plotNum, value, "plotData", PLOT_DATA);

		// Delete the canvas and add it back later so it doesn't bug
		$("#plotCanvas" + plotNum).remove();

		if (plotNum == 4) $("#plotCanvasContainer" + plotNum).html('<canvas id="plotCanvas' + plotNum + '"height="150"></canvas>');
		else $("#plotCanvasContainer" + plotNum).html('<canvas id="plotCanvas' + plotNum + '"height="300" width="500"></canvas>');
	


		// Initialise the appropriate plot
		if (value == "distanceVsTime") {
			$("#plotLabel" + plotNum).html("Time elapsed: <span id='plotLabelVariable" + plotNum + "'>" + roundToSF(PLOT_DATA["timeElapsed"]) + "</span> s");
		}

		else if (value == "pauseHistogram") {
			$("#plotLabel" + plotNum).html("Mean time: <span id='plotLabelVariable" + plotNum + "'>" + 0 + "</span> s");
		}

		else if(value == "velocityHistogram"){
			$("#plotLabel" + plotNum).html("Mean velocity: <span id='plotLabelVariable" + plotNum + "'>" + 0 + "</span> bp/s");
		}
	
		else if (value == "parameterHeatmap") {
			$("#plotLabel" + plotNum).html("<br>");
		}


		else if (value == "tracePlot") {
			$("#plotLabel" + plotNum).html(`Effective sample size: <span id='plotLabelVariable` + plotNum + `'>0</span>`);
			//$("#plotLabel" + plotNum).html("");
		}



		if (value != "none") {


			// If there is a plot display the buttons
			$("#plotDIV" + plotNum).slideDown(300);


			if (plotNum == 4) {
				$("#plot4Buttons").show(true);
				showSitewisePlot(true);

			

			}
			else{
				showPlots(true);
				$("#plotOptions" + plotNum).show(true);
				$("#downloadPlot" + plotNum).show(true);
				$("#helpPlot" + plotNum).show(true);
                
                
                var helpSection = "";
                if (value == "distanceVsTime") helpSection = "Distance_vs_time";
                else if (value == "pauseHistogram") helpSection = "Time_histogram";
                else if (value == "velocityHistogram") helpSection = "Velocity_histogram";
                else if (value == "parameterHeatmap") helpSection = "Parameter_plot";
                else if (value == "tracePlot") helpSection = "MCMC_trace";
                else helpSection = "Dwell_time_per_site";
                
				$("#helpPlot" + plotNum).attr("href", "about/#" + helpSection);
			}


		}else{

			// If no plot then hide the buttons
			if (plotNum == 4) {
				showSitewisePlot(false);
				$("#plot4Buttons").hide(true);
			}
			else{
				$("#downloadPlot" + plotNum).hide(true);
				$("#plotOptions" + plotNum).hide(true);
				$("#helpPlot" + plotNum).hide(true);
			}
			$("#plotDIV" + plotNum).slideUp(100);

		}
	

	
	});

	

}









// Plot the free energy peaks and troughs
function draw_a_landscape_plot(dx, peaks, troughs, col, id, ymin = -2, ymax = 3){
	
	if (!ALLOW_ANIMATIONS) return;

	if (peaks[0] == maxHeight && peaks[1] == maxHeight && peaks[2] == maxHeight && peaks[3] == maxHeight && peaks[4] == maxHeight && peaks[5] == maxHeight) {
		var canvas = $('#' + id)[0];
		ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		return;
	}

	//console.log("Plotting", id, peaks, troughs);
	
	landscape_plot(function (x) {

		x = x + 1 * Math.PI;
		
		if (x + 1/2 * Math.PI + dx < (0/2 * Math.PI)){
			if (peaks[0] == maxHeight || peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[0] - troughs[0]) + 1/2 * (peaks[0] + troughs[0]);
		}
		if (x + 1/2 * Math.PI + dx < (2/2 * Math.PI)){
			if (peaks[0] == maxHeight || peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[0] - troughs[1]) + 1/2 * (peaks[0] + troughs[1]);
		}
		
		if (x + 1/2 * Math.PI + dx < (4/2 * Math.PI)){
			if (peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[1] - troughs[1]) + 1/2 * (peaks[1] + troughs[1]);
		}
		if (x + 1/2 * Math.PI + dx < (6/2 * Math.PI)){
			if (peaks[1] == maxHeight || peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[1] - troughs[2]) + 1/2 * (peaks[1] + troughs[2]);
		}
		
		if (x + 1/2 * Math.PI + dx < (8/2 * Math.PI)){
			if (peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[2] - troughs[2]) + 1/2 * (peaks[2] + troughs[2]);
		}
		if (x + 1/2 * Math.PI + dx < (10/2 * Math.PI)){
			if (peaks[2] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[2] - troughs[3]) + 1/2 * (peaks[2] + troughs[3]);
		}
		
		if (x + 1/2 * Math.PI + dx < (12/2 * Math.PI)){
			if (peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[3] - troughs[3]) + 1/2 * (peaks[3] + troughs[3]);
		}
		if (x + 1/2 * Math.PI + dx < (14/2 * Math.PI)){
			if (peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[3] - troughs[4]) + 1/2 * (peaks[3] + troughs[4]);
		}
		
		if (x + 1/2 * Math.PI + dx < (16/2 * Math.PI)){
			if (peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[4] - troughs[4]) + 1/2 * (peaks[4] + troughs[4]);
		}
		if (x + 1/2 * Math.PI + dx < (18/2 * Math.PI)){
			if (peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[4] - troughs[5]) + 1/2 * (peaks[4] + troughs[5]);
		}
		
		
		if (x + 1/2 * Math.PI + dx < (20/2 * Math.PI)){
			if (peaks[5] == maxHeight || peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[5] - troughs[5]) + 1/2 * (peaks[5] + troughs[5]);
		}
		if (x + 1/2 * Math.PI + dx < (22/2 * Math.PI)){
			if (peaks[5] == maxHeight || peaks[4] == maxHeight || peaks[3] == maxHeight) return ymax - 0.1;
			return -Math.sin(x + dx) * 1/2 * (peaks[5] - troughs[6]) + 1/2 * (peaks[5] + troughs[6]);
		}


			
	}, [1/2 * Math.PI, 17/2 * Math.PI, Math.floor(ymin - (ymax - ymin) * 0.2), Math.ceil(ymax + (ymax - ymin) * 0.2)], id, col);



	// Add a Delta G yaxis on the left hand side
	if ($("#" + id + "_deltaG").length == 0){
		var x = $("#" + id).offset().left - $("#navigationPanelTable").offset().left;
		var y = $("#" + id).offset().top + $("#" + id).height() - $("#navigationPanelTable").offset().top;
		var deltaG = `<div id="` + id + `_deltaG" style="position:absolute; left:` + x + `; top:` + y + `; font-family:Arial">&Delta;G</div>`;
		$("#navigationPanelTable").append(deltaG);
	}
	
}


// Plot the free energy peaks and troughs
function landscape_plot(fn, range, id, col) {


	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	var widthScale = (canvas.width / (range[1] - range[0]));
	//var heightScale = (canvas.height / (range[3] - range[2])),
	var first = true;




	// Add dashed lines corresponding to every few yvals. Only plot at nice numbers
	var result = getNiceAxesNumbers(range[2], range[3], canvas.height, false, false, 0, [1])
	range[2] = result["min"];
	range[3] = result["max"];
	var heightScale = result["widthOrHeightScale"];
	var yDashedLinePos = result["vals"];


	ctx.strokeStyle = "#696969";
	ctx.setLineDash([5, 3]);
	ctx.lineWidth = 1;

	for (var lineNum = 0; lineNum < yDashedLinePos.length; lineNum++){
		var y0 = heightScale * (yDashedLinePos[lineNum] - range[2]);
		ctx.beginPath();
		ctx.moveTo(0, y0);
		ctx.lineTo(canvas.width, y0);
		ctx.stroke();
	}

	ctx.setLineDash([]);
	ctx.strokeStyle = "black";

	
	ctx.beginPath();
	
	for (var x = 0; x < canvas.width; x++) {
		var xFnVal = (x / widthScale) - range[0],
			yGVal = (fn(xFnVal) - range[2]) * heightScale;
		
		yGVal = canvas.height - yGVal; // 0,0 is top-left
		if (first) {
			ctx.moveTo(x, yGVal);
			first = false;
		}
		else {
			ctx.lineTo(x, yGVal);
			//console.log("(x,y)= " + x + "," + yGVal);
		}
	}
	
	ctx.strokeStyle = col;
	ctx.lineWidth = 3;
	ctx.stroke(); 
	
	// Add circle
	ctx.beginPath();


	// Add circle to centre bottom of plot 
	xFnVal = (canvas.width / 2 / widthScale) - range[0];
    yGVal = canvas.height - Math.min((fn(xFnVal - 0.01) - range[2]), (fn(xFnVal) - range[2])) * heightScale;
	ctx_ellipse(ctx, canvas.width / 2, yGVal, 12, 12, 0, 0, 2 * Math.PI);
	

	ctx.fill();
	ctx.strokeStyle = "black";
	
	
	// Y-axis
	/*
	ctx.beginPath();
	ctx.moveTo(1,0);
	ctx.lineTo(1, canvas.height);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(1,1);
	ctx.lineTo(8,1);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(1,canvas.height - 1);
	ctx.lineTo(8,canvas.height - 1);
	ctx.stroke();
	*/

	ctx.font="12px Arial";
	ctx.textBaseline="bottom"; 
	ctx.fillText(-roundToSF(yDashedLinePos[0], 2, "none", true),5, heightScale * (yDashedLinePos[0] - range[2]));
	ctx.fillText(-roundToSF(yDashedLinePos[yDashedLinePos.length-1], 2, "none", true),5, heightScale * (yDashedLinePos[yDashedLinePos.length-1] - range[2]));


	
}








// Plot a time vs distance chart
function plotTimeChart(){
	

	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "distanceVsTime") canvasesToPrintTo.push(plt);
	}


	//console.log("DISTANCE_VS_TIME_CONTROLLER", DISTANCE_VS_TIME_CONTROLLER);
	//console.log("medianTimeSpentOnATemplate", PLOT_DATA["medianTimeSpentOnATemplate"], "medianDistanceTravelledPerTemplate", PLOT_DATA["medianDistanceTravelledPerTemplate"]);

	var index = DISTANCE_VS_TIME_CONTROLLER.length-1; // Index of the last list in the list
	if (index > 0 && DISTANCE_VS_TIME_CONTROLLER[index]["times"].length == 1) index--; // Use the second last value if this one is empty

	for (var j = 0; j < canvasesToPrintTo.length; j ++){

		

		var pltNum = canvasesToPrintTo[j];
		if ($("#plotDIV" + pltNum).is( ":hidden" )) continue;


		// Change the time elapsed label
		$("#plotLabelVariable" + pltNum).html(roundToSF(PLOT_DATA["timeElapsed"]));
		

		// Ymax and ymin
		var ymax = 0;
		var ymin = 0;
		if (index >=0 && PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"] == "automaticY"){
			
			//console.log("Looking for index", index, "DISTANCE_VS_TIME_CONTROLLER", DISTANCE_VS_TIME_CONTROLLER);
			ymin = 0;

			var distTravelled = DISTANCE_VS_TIME_CONTROLLER[index]["distances"][DISTANCE_VS_TIME_CONTROLLER[index]["distances"].length-1];
			if (1.1 * PLOT_DATA["medianDistanceTravelledPerTemplate"] >= distTravelled){
				ymax = 1.1 * PLOT_DATA["medianDistanceTravelledPerTemplate"];
			}else{
				ymax = distTravelled * 1.2;
			}

			ymax = roundToSF(ymax, 2, "ceil", true);
			if (ymin == ymax) ymax++;


		}else{
			ymin = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"][0] - 1;
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"][1];
		}

		var addDashedLines = ymax - ymin < 40; // Don't add dashed lines if there are too many
		


		// Xmax and xmin
		var xmax = 1;
		var xmin = 0;
		if (index >= 0 && PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"] == "automaticX"){


			xmin = 0;

			var acumTime = 0;
			for (var i = 0; i < DISTANCE_VS_TIME_CONTROLLER[index]["times"].length; i++){
				acumTime += DISTANCE_VS_TIME_CONTROLLER[index]["times"][i];
			}


			if (1.1 * PLOT_DATA["medianTimeSpentOnATemplate"] >= acumTime){
				xmax = 1.1* PLOT_DATA["medianTimeSpentOnATemplate"];
			}else{
				xmax = acumTime * 1.5;
			}
			
			
			xmax = roundToSF(xmax, 2, "ceil", true);

			if (xmin == xmax) xmax++;




		}else{

			xmin = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"][1];
		}



		// Show a warning message that the data is getting big
		if(!$("#plotCanvasContainer" + pltNum).is( ":hidden" ) && !haveShownDVTerrorMessage && $("#PreExp").val() != "hidden"){

			var numPoints = 0;
			for (var trial = 0; trial < DISTANCE_VS_TIME_CONTROLLER.length; trial++){
				if (DISTANCE_VS_TIME_CONTROLLER[trial] == null) continue;
				numPoints += DISTANCE_VS_TIME_CONTROLLER[trial]["distances"].length;
			}
			if (numPoints > 500000){
				haveShownDVTerrorMessage = true;
				addNotificationMessage("That is a lot of data! If SimPol starts to slow down you should minimise this plot.", 
									$("#plotCanvas" + pltNum).offset().left + 100,
									$("#plotCanvas" + pltNum).offset().top + 20,
									300);
			}

		}


		//console.log("Plotting values", DISTANCE_VS_TIME_CONTROLLER);
		step_plot(DISTANCE_VS_TIME_CONTROLLER, [xmin, xmax, ymin, ymax], "plotCanvas" + pltNum, "plotCanvasContainer" + pltNum, "#008CBA", addDashedLines, "Time (s)", "Distance (nt)", PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["canvasSizeMultiplier"]);
	}
	
}


// Download the data from the plot above as a .tsv file
function download_distanceVsTimeTSV(){




	var tsv="Distance (nt) versus time (s), DateTime " + getFormattedDateAndTime() + "\n\n";
	var trueSimNum = 1;
	for (var simNum = 0; simNum < DISTANCE_VS_TIME_CONTROLLER.length; simNum++){

		if (DISTANCE_VS_TIME_CONTROLLER[simNum] == null) continue;

		tsv += "trial\t" + trueSimNum + "\n";
		var xvalsSim = DISTANCE_VS_TIME_CONTROLLER[simNum]["times"];
		var yvalsSim = DISTANCE_VS_TIME_CONTROLLER[simNum]["distances"];

		tsv += "times\t";
		for (var timeNum = 0; timeNum < xvalsSim.length; timeNum++){
			tsv += xvalsSim[timeNum] + "\t";
		}

		tsv += "\ndistances\t";
		for (var distanceNum = 0; distanceNum < yvalsSim.length; distanceNum++){
			tsv += yvalsSim[distanceNum] + "\t";
		}
		tsv += "\n\n";
		
		trueSimNum++;

	}

	download("distance_vs_time.tsv", tsv);

}




// Produce a line plot where the y axis takes discrete values
function step_plot(vals, range, id, canvasDivID, col, addDashedLines = true, xlab = "", ylab = "", canvasSizeMultiplier = 1) {


	if ($("#" + canvasDivID).is( ":hidden" )) return;
	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	var axisGap = 45 * canvasSizeMultiplier;
	
	
	if (canvasDivID != null) {
		$("#" + id).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + id + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}

	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	
	

	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;



	var widthScale = (plotWidth / (range[1] - range[0]));
	var heightScale = (plotHeight / (range[3] - range[2]));

	
	if (!isNaN(range[1])) {


		
		// Refine xmax and xmin and select positions to add ticks
		var xlabPos = [];
		var xResult = getNiceAxesNumbers(range[0], range[1], plotWidth, range[0] == 0);
		range[0] = xResult["min"]
		range[1] = xResult["max"]
		widthScale = xResult["widthOrHeightScale"]
		xlabPos = xResult["vals"]
		//console.log("xResult", xResult);

		var ylabPos = [];
		var yResult = getNiceAxesNumbers(range[2], range[3], plotHeight, range[2] == 0);
		range[2] = yResult["min"]
		range[3] = yResult["max"]
		heightScale = yResult["widthOrHeightScale"]
		ylabPos = yResult["vals"]
		//console.log("yResult", yResult);



		// X min and max
		var axisPointMargin = 5 * canvasSizeMultiplier;
		ctx.font = 12 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="top"; 
		var tickLength = 10 * canvasSizeMultiplier;
		ctx.lineWidth = 1 * canvasSizeMultiplier;

		for (var labelID = 0; labelID < xlabPos.length; labelID++){
			var x0 = widthScale * (xlabPos[labelID] - range[0]) + axisGap;
			ctx.textAlign= labelID == 0 ? "left" : "center";
			ctx.fillText(xlabPos[labelID], x0, canvas.height - axisGap + axisPointMargin);

			// Draw a tick on the axis
			ctx.beginPath();
			ctx.moveTo(x0, canvas.height - axisGap - tickLength/2);
			ctx.lineTo(x0, canvas.height - axisGap + tickLength/2);
			ctx.stroke();

		}


		// Y min and max
		ctx.textBaseline="bottom"; 

		ctx.save()
		ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
		ctx.rotate(-Math.PI/2);
		for (var labelID = 0; labelID < ylabPos.length; labelID++){
			var y0 = heightScale * (ylabPos[labelID] - range[2]);
			ctx.fillText(ylabPos[labelID], y0, 0);

			// Draw a tick on the axis
			ctx.beginPath();
			ctx.moveTo(y0, axisPointMargin - tickLength/2);
			ctx.lineTo(y0, axisPointMargin + tickLength/2);
			ctx.stroke();


		}
		ctx.restore();


		// Add dashed lines corresponding to each yval
		if (addDashedLines){
			ctx.strokeStyle = "#696969";
			ctx.setLineDash([5, 3]);
			ctx.lineWidth = 1 * canvasSizeMultiplier;
			for (var linePos = Math.ceil(range[2]); linePos <= Math.floor(range[3]); linePos ++){

				var yPt = canvas.height - heightScale * (linePos - range[2]) - axisGap;
				//console.log("Plotting at",yPrime);
				ctx.beginPath();
				ctx.moveTo(axisGap,yPt);
				ctx.lineTo(canvas.width, yPt);
				ctx.stroke();

			}
		}

		ctx.setLineDash([])
		ctx.strokeStyle = col;
		ctx.lineWidth = 3 * canvasSizeMultiplier;
		
		
		// Plot first point
		var xPrime;
		var yPrime; 
		

		var pixelsPerSecond = (canvas.width - axisGap) / (range[1] - range[0]);
		var pixelsPerNucleotide = (canvas.height - axisGap) / (range[3] - range[2]);
		var finalXValue = 0;
		var finalYValue = 0; // Save the coordinates of the final plotted value so we can add the circle

		var acumTime = 0;
		var prevAcumTime = 0;
		for (var simNum = 0; simNum < vals.length; simNum++){

			if (vals[simNum] == null) continue;


			ctx.globalAlpha = simNum+1 == vals[vals.length-1]["sim"] ? 1 : 0.5;
			ctx.strokeStyle = simNum+1 == vals[vals.length-1]["sim"] ? col : "#b3b3b3";


			acumTime = 0;


			ctx.beginPath();
			var first = true;
			var xvalsSim = vals[simNum]["times"];
			var yvalsSim = vals[simNum]["distances"];
			//var plotEvery = Math.floor(Math.max(xvalsSim / 1000, 1));

			var currentTimePixel = 0; 		// We do not want to plot every single value because it is wasteful (and crashes the program). 
			var currentDistancePixel = 0; 	// So only plot values which will occupy a new pixel
			for (var valIndex = 0; valIndex < xvalsSim.length; valIndex ++){


				acumTime += xvalsSim[valIndex];
				//console.log("acumTime", acumTime, pixelsPerSecond, currentTimePixel, acumTime * pixelsPerSecond < currentTimePixel);
				if (acumTime * pixelsPerSecond < currentTimePixel && Math.ceil(yvalsSim[valIndex] * pixelsPerNucleotide) == currentDistancePixel) continue; // Do not plot if it will not generate a new pixel

				//console.log("Plotting", acumTime, yvalsSim[valIndex]);
				currentTimePixel = Math.ceil(acumTime * pixelsPerSecond);
				currentDistancePixel = Math.ceil(yvalsSim[valIndex] * pixelsPerNucleotide);
				finalXValue = acumTime;
				finalYValue = yvalsSim[valIndex];
				
				//if (valIndex != 0 && valIndex != xvalsSim.length-1 && valIndex % plotEvery != 1) continue;

				// If this point is in the future then all the remaining points in this list will be too. Break
				if (acumTime > range[1]){
					break;
				}

				// If this point is too early in time then do not plot it
				if (first && acumTime < range[0]){
					continue;
				}


				var xvalSim = Math.max(acumTime, range[0]); // If the value is too low then set its val to the minimum
				var yvalSim = Math.max(yvalsSim[valIndex], range[2]);
				var yvalSimPrev = Math.max(yvalsSim[valIndex-1], range[2]); // If the value is too low then set its val to the minimum
				
				
				xPrime = widthScale * (xvalSim - range[0]) + axisGap;
				yPrime = canvas.height - heightScale * (yvalSim - range[2]) - axisGap;
				
				if (first){
					ctx.moveTo(xPrime, yPrime);
					first = false;
				}
				

				// Plot this xval with the previous yval
				var yPrimePrev = canvas.height - heightScale * (yvalSimPrev - range[2]) - axisGap; // (0,0) is top left
				ctx.lineTo(xPrime, yPrimePrev);
				
				
				
				// Plot this xval with this yval
				ctx.lineTo(xPrime, yPrime);
			
			
			}
			

			ctx.stroke(); 
		
		}



		
		ctx.globalAlpha = 1;

		// Add circle to last x,y value in plot
		var lastIndex = vals.length-1;
		if (lastIndex >= 0){
			var lastYvals = vals[lastIndex]["distances"];

			if (finalXValue - range[0] >= 0 && finalYValue - range[2] >= 0) {
				ctx.beginPath();
				ctx.fillStyle = "#008CBA";
				xPrime = widthScale * (finalXValue - range[0]) + axisGap;
				yPrime = canvas.height - heightScale * (finalYValue - range[2]) - axisGap;
				ctx_ellipse(ctx, xPrime, yPrime, 5 * canvasSizeMultiplier, 5 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
				ctx.fill();
			}
		}
		
	
	
	}


	ctx.lineWidth = 3 * canvasSizeMultiplier;
	ctx.globalAlpha = 1;

	// Axes
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width, canvas.height - axisGap);
	ctx.stroke();
	
	

	// X label
	ctx.fillStyle = "black";
	ctx.font = 20 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="top"; 
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2;
	ctx.fillText(xlab, xlabXPos, xlabYPos);
	
	// Y label
	ctx.font = 20 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="bottom"; 
	ctx.save()
	var ylabXPos = axisGap / 2;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ylab, 0 ,0);
	ctx.restore();
	
	

}




function plot_MCMC_trace(){

	//console.log("plot_MCMC_trace", PLOT_DATA["whichPlotInWhichCanvas"]);

	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "tracePlot") canvasesToPrintTo.push(plt);
	}


	for (var j = 0; j < canvasesToPrintTo.length; j ++){


		var pltNum = canvasesToPrintTo[j];


		//console.log("burnin", PLOT_DATA["whichPlotInWhichCanvas"][pltNum].burnin);

		var yVar = PLOT_DATA["whichPlotInWhichCanvas"][pltNum].customParamY; 
		

		var xVals = PLOT_DATA["whichPlotInWhichCanvas"][pltNum].xData.vals;
		var yVals = PLOT_DATA["whichPlotInWhichCanvas"][pltNum].yData.vals;

		if (xVals == null) xVals = [];
		if (yVals == null) yVals = [];


		// Xmax and xmin
		var xmax = 1000;
		var xmin = 0;
		if (PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"] == "automaticX" && xVals.length > 0){

			xmin = xVals[0];
			xmax = xVals[xVals.length-1];


		}else{

			xmin = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["xRange"][1];
		}



		// Ymax and ymin
		var ymax = 1;
		var ymin = 0;
		if (PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"] == "automaticY"  && yVals.length > 0){

			ymin = minimumFromList(yVals);
			ymax = maximumFromList(yVals);

			ymin = roundToSF(ymin, 3, "floor", true);
			ymax = roundToSF(ymax, 3, "ceil", true);


		}else{

			ymin = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"][0];
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"][1];
		}


		// Epsilon decrease over time
		var epsilon = null;
		if (PLOT_DATA["whichPlotInWhichCanvas"][pltNum].exponentialDecay && yVar == "chiSq"){
			var epsilon_min = parseFloat($("#MCMC_chiSqthreshold_min").val());
			var epsilon_0 = parseFloat($("#MCMC_chiSqthreshold_0").val());
			var epsilon_gamma =parseFloat($("#MCMC_chiSqthreshold_gamma").val());
            
            if (PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["yRange"] == "automaticY"){
                ymin = 0;
                ymax = epsilon_0;
            }
			epsilon = {emin: epsilon_min, e0: epsilon_0, gamma: epsilon_gamma};
		}


		var range = [xmin, xmax, ymin, ymax];
        //console.log("ABC_EXPERIMENTAL_DATA", yVar, epsilon)
        

		// Print ESS
		$("#plotLabelVariable" + pltNum).html(Math.round(PLOT_DATA["whichPlotInWhichCanvas"][pltNum].ESS * 100) / 100);
		$("#plotLabelVariable" + pltNum).css("color", PLOT_DATA["whichPlotInWhichCanvas"][pltNum].ESS < 100 ? "red" : PLOT_DATA["whichPlotInWhichCanvas"][pltNum].ESS < 200 ? "#EE7600" : "black");

		
		var ylab = PLOT_DATA["whichPlotInWhichCanvas"][pltNum].yData.latexName != null ? PLOT_DATA["whichPlotInWhichCanvas"][pltNum].yData.latexName
				 : PLOT_DATA["whichPlotInWhichCanvas"][pltNum].yData.name != null ? PLOT_DATA["whichPlotInWhichCanvas"][pltNum].yData.name != null:
				 "Rho distance";
		trace_plot(xVals, yVals, range, epsilon, "plotCanvas" + pltNum, "plotCanvasContainer" + pltNum, PLOT_DATA["whichPlotInWhichCanvas"][pltNum].burnin,  "State", ylab, PLOT_DATA["whichPlotInWhichCanvas"][pltNum]["canvasSizeMultiplier"]);

	}


}





// Produce a line plot where the y axis takes discrete values
function trace_plot(xVals, yVals, range, epsilon = null, id, canvasDivID, burnin, xlab = "", ylab = "", canvasSizeMultiplier = 1) {


	if ($("#" + canvasDivID).is( ":hidden" )) return;
	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	var axisGap = 45 * canvasSizeMultiplier;
	var outerMargin = 5 * canvasSizeMultiplier;
	
	
	if (canvasDivID != null) {
		$("#" + id).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + id + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}

	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	
	var ctx = canvas.getContext('2d');

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var plotWidth = canvas.width - axisGap - outerMargin;
	var plotHeight = canvas.height - axisGap - outerMargin;
	var widthScale = 1;
	var heightScale = 1;
	
	
	// Refine xmax and xmin and select positions to add ticks
	var widthScale = 1;
	var xlabPos = [];
	if (xVals != null && xVals.length > 0){
		var xResult = getNiceAxesNumbers(range[0], range[1], plotWidth, range[0] == 0);
		range[0] = xResult["min"]
		range[1] = xResult["max"]
		widthScale = xResult["widthOrHeightScale"]
		xlabPos = xResult["vals"]

		//console.log("xResult", xResult);
		
	}

    
    
	var heightScale = 1;
	var ylabPos = [];
	if (yVals != null && yVals.length > 0){
		var yResult = getNiceAxesNumbers(range[2], range[3], plotHeight, range[2] == 0, false);
		range[2] = yResult["min"]
		range[3] = yResult["max"]
		heightScale = yResult["widthOrHeightScale"]
		ylabPos = yResult["vals"]

		
	}
	

	//var widthScale = (plotWidth / (range[1] - range[0]));
	//var heightScale = (plotHeight / (range[3] - range[2]));
	var col = "#008cba";


	
	if (xVals.length > 1) {
		
		ctx.lineWidth = 2 * canvasSizeMultiplier;
	
	
	
			// X min and max
			var axisPointMargin = 4 * canvasSizeMultiplier;
			ctx.font = 10 * canvasSizeMultiplier + "px Arial";
			ctx.textBaseline="top"; 
			var tickLength = 10 * canvasSizeMultiplier;
			ctx.lineWidth = 1 * canvasSizeMultiplier;

			for (var labelID = 0; labelID < xlabPos.length; labelID++){
				var x0 = widthScale * (xlabPos[labelID] - range[0]) + axisGap;
				ctx.textAlign= labelID == 0 ? "left" : "center";
				ctx.fillText(xlabPos[labelID], x0, canvas.height - axisGap + axisPointMargin);

				// Draw a tick on the axis
				ctx.beginPath();
				ctx.moveTo(x0, canvas.height - axisGap - tickLength/2);
				ctx.lineTo(x0, canvas.height - axisGap + tickLength/2);
				ctx.stroke();

			}



			// Y min and max
			ctx.textBaseline="bottom"; 

			ctx.save()
			ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
			ctx.rotate(-Math.PI/2);
			for (var labelID = 0; labelID < ylabPos.length; labelID++){
				var y0 = heightScale * (ylabPos[labelID] - range[2]);
				ctx.fillText(ylabPos[labelID], y0, 0);

				// Draw a tick on the axis
				ctx.beginPath();
				ctx.moveTo(y0, axisPointMargin - tickLength/2);
				ctx.lineTo(y0, axisPointMargin + tickLength/2);
				ctx.stroke();


			}
			ctx.restore();
	

		ctx.lineWidth = 1 * canvasSizeMultiplier;
		
		
		//var pixelsPerSecond = (canvas.width - axisGap) / (range[1] - range[0]);
		//var pixelsPerNucleotide = (canvas.height - axisGap) / (range[3] - range[2]);



		ctx.beginPath();
		var first = true;



		//var currentTimePixel = 0; 		// We do not want to plot every single value because it is wasteful (and crashes the program). 
		//var currentDistancePixel = 0; 	// So only plot values which will occupy a new pixel
      
      
		
		// Show the threshold epsilon decrease
		if (epsilon != null){
            //console.log("epsilon", epsilon);
            
            
            // Start the exponential decay curve
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = "black";
            
           
            //ctx.fillStyle = "#d3d3d3"; //#d3d3d3
            ctx.strokeStyle = "#d3d3d3";
         	ctx.beginPath();
            ctx.moveTo(axisGap, canvas.height - axisGap);
            
            
			var pixelY = 0;
			var converged = false;
			var pixelX = axisGap
			for (pixelX = axisGap; pixelX <= canvas.width - outerMargin; pixelX++){
				var trueX = (pixelX - axisGap) / widthScale + range[0];
				
                
				if (!converged){
					var trueY = Math.max(epsilon.e0 * Math.pow(epsilon.gamma, trueX), epsilon.emin);
                    var pixelY = plotHeight - heightScale * (trueY - range[2]) + outerMargin;
                    if (trueY <= epsilon.emin) converged = true;
                    
                    // Curved line
                    ctx.lineTo(pixelX, pixelY);
                    
				}else{
                    
                    // Straight horizontal line the rest of the way
                    var pixelY = canvas.height - heightScale * (epsilon.emin - range[2]) - axisGap;
                    ctx.lineTo(canvas.width - outerMargin, pixelY);
                    break;
                }
			}
            
            
            //ctx.lineTo(canvas.width - outerMargin, canvas.height - axisGap);
            ctx.stroke();
            //ctx.fill();
            //ctx.closePath();
            
            
            
	            		
			// Plot "epsilon" at the right side
			ctx.fillStyle = "#b20000";
			ctx.font = 20 * canvasSizeMultiplier + "px Arial";
			ctx.textAlign="right"; 
			ctx.textBaseline="bottom"; 
			pixelX = Math.max(pixelX, axisGap + 10*canvasSizeMultiplier);
			var trueX = (pixelX - axisGap) / widthScale + range[0];
			var trueY = Math.max(epsilon.e0 * Math.pow(epsilon.gamma, trueX), epsilon.emin);
			var pixelY = plotHeight - heightScale * (trueY - range[2]) + outerMargin; // - 10*canvasSizeMultiplier;
			ctx.fillText("\u03B5", pixelX, pixelY);
	            
		}
		

		


		// Burnin line in grey, main line in col
		ctx.strokeStyle = "#b20000";
		for (var valIndex = 0; valIndex < xVals.length; valIndex ++){


			var xval = xVals[valIndex];
			var yval = yVals[valIndex];


			//if (acumTime * pixelsPerSecond < currentTimePixel && Math.ceil(yvalsSim[valIndex] * pixelsPerNucleotide) == currentDistancePixel) continue; // Do not plot if it will not generate a new pixel
			//currentTimePixel = Math.ceil(acumTime * pixelsPerSecond);
			//currentDistancePixel = Math.ceil(yvalsSim[valIndex] * pixelsPerNucleotide);
			

			// If this point is in the future then all the remaining points in this list will be too. Break
			if (xval > range[1]){
				break;
			}

			// If this point is too early in time then do not plot it
			if (first && xval < range[0]){
				continue;
			}


			var xval = Math.max(xval, range[0]); // If the value is too low then set its val to the minimum
			var yval = Math.max(yval, range[2]);
			//var yvalPrev = Math.max(yVals[valIndex-1], range[2]); // If the value is too low then set its val to the minimum
			
			
			var xPrime = widthScale * (xval - range[0]) + axisGap;
			var yPrime = plotHeight - heightScale * (yval - range[2]) + outerMargin;


			if (first){
				ctx.moveTo(xPrime, yPrime);
				first = false;
			}



			// Plot this xval with the previous yval
			//var yPrimePrev = canvas.height - heightScale * (yvalPrev - range[2]) - axisGap; // (0,0) is top left
			//ctx.lineTo(xPrime, yPrimePrev);
			
			// Plot this xval with this yval
			ctx.lineTo(xPrime, yPrime);



			// Switch colour and start a new stroke
			if (valIndex == burnin){
				ctx.stroke(); 
				ctx.beginPath();
				ctx.strokeStyle = col;
				ctx.moveTo(xPrime, yPrime);
			}

		
		
		}
		

		ctx.stroke(); 
		
		
		ctx.globalAlpha = 1;


		// Add circle to last x,y value in plot
		var lastIndex = xVals.length-1;
		if (lastIndex >= 0){

			if (xVals[lastIndex] - range[0] >= 0 && yVals[lastIndex] - range[2] >= 0) {
				ctx.beginPath();
				ctx.fillStyle = "#008CBA";
				xPrime = widthScale * (xVals[lastIndex] - range[0]) + axisGap;
				yPrime =  plotHeight - heightScale * (yVals[lastIndex] - range[2]) + outerMargin;
				ctx_ellipse(ctx, xPrime, yPrime, 3 * canvasSizeMultiplier, 3 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
				ctx.fill();
			}
		}
		
	
	
	}


	ctx.lineWidth = 3 * canvasSizeMultiplier;
	ctx.globalAlpha = 1;

	// Axes
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, outerMargin);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width - outerMargin, canvas.height - axisGap);
	ctx.stroke();
	

	// X label
	ctx.fillStyle = "black";
	ctx.font = 20 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="top"; 
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2;
	ctx.fillText(xlab, xlabXPos, xlabYPos);
	
	
	
	
	
	

	// Y label
	ctx.textAlign="center"; 
	ctx.textBaseline="bottom"; 
	ctx.save()
	var ylabXPos = 2 * axisGap / 3;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	//ctx.fillText(ylab, 0 ,0);
	writeLatexLabelOnCanvas(ctx, ylab, 0, 0, 20 * canvasSizeMultiplier);
	ctx.restore();
	
	

}







function plot_velocity_distribution(){


	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "velocityHistogram") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return; 

	var maxDataPoints = 10000;


	for (var i = 0; i < canvasesToPrintTo.length; i++){

		if ($("#plotDIV" + canvasesToPrintTo[i]).is( ":hidden" )) continue;



		// VELOCITIES.push({dist: DVT["distances"][lastIndex], time: DVT["times"][lastIndex-1]});
		// Calculate the velocities with the given window size
		var velocitiesWindowSize = [];
		var windowSize = PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["windowSize"];
		//console.log("Plotting velocity", VELOCITIES);
		for (var sim = 0; sim < VELOCITIES.length; sim++){

			if (VELOCITIES[sim] == null || VELOCITIES[sim]["times"].length == 0) continue;

			
			var startTime = VELOCITIES[sim]["times"][0];
			var startDist = VELOCITIES[sim]["distances"][0];

			//console.log("Looking into", VELOCITIES[sim], "startTime", startTime, "startDist", startDist);
			

			for (var timeIndex = 1; timeIndex < VELOCITIES[sim]["times"].length; timeIndex++){


				if (velocitiesWindowSize.length > maxDataPoints) break;


				// Find the distance travelled after waiting for a time equal to the window size
				var thisTime = VELOCITIES[sim]["times"][timeIndex];
				if (thisTime - startTime >= windowSize){

					var totalDist = VELOCITIES[sim]["distances"][timeIndex-1] - startDist;


					if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["timeSpaceX"] == "logSpace") velocitiesWindowSize.push(Math.max(Math.log(totalDist / windowSize), -1000));

					//sortedPush(velocitiesWindowSize, totalDist / windowSize); // Add velocity to list (and keep it sorted)

					else velocitiesWindowSize.push(totalDist / windowSize);

					// Continue calculations with a new start time
					startDist = VELOCITIES[sim]["distances"][timeIndex-1]
					startTime += windowSize; // Set the startTime to the beginning of the next window size


					timeIndex--;


				}


			}

		}

		//console.log("velocitiesWindowSize", velocitiesWindowSize);

	
		// Print the mean velocity to the html
		$("#plotLabelVariable" + canvasesToPrintTo[i]).html(roundToSF(PLOT_DATA["velocity"]));


				
		histogram(velocitiesWindowSize, "plotCanvas" + canvasesToPrintTo[i], "plotCanvasContainer" + canvasesToPrintTo[i], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["xRange"], "Translocation velocity (bp/s)", "Probability", false, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["canvasSizeMultiplier"], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[i]]["timeSpaceX"] == "logSpace" );

	}
	

}



function plot_pause_distribution(){
	

	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "pauseHistogram") canvasesToPrintTo.push(plt);
	}

	//console.log("DWELL_TIMES_CONTROLLER", DWELL_TIMES_CONTROLLER);

	for (var canvasNum = 0; canvasNum < canvasesToPrintTo.length; canvasNum ++){
		
		var meanElongationDuration = 0;

		var timesToPlot = [];
		var xAxisLabel = "";


		// Each datapoint is time spent between catalysis events
		if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["perTime"] == "perCatalysis"){
			for (var i = 0; i < DWELL_TIMES_CONTROLLER.length; i ++){
				if (DWELL_TIMES_CONTROLLER[i] == null) continue;
				for (var j = 0; j < DWELL_TIMES_CONTROLLER[i].length; j ++){
					
					// If below minimum do not count towards the mean
					if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "pauseX" && DWELL_TIMES_CONTROLLER[i][j] < 1) continue;
					if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "shortPauseX" && (DWELL_TIMES_CONTROLLER[i][j] < 1 || DWELL_TIMES_CONTROLLER[i][j] > 25)) continue;
					
					meanElongationDuration += DWELL_TIMES_CONTROLLER[i][j];

					if(PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") timesToPlot.push(Math.max(Math.log(DWELL_TIMES_CONTROLLER[i][j]), -1000));
					else timesToPlot.push(DWELL_TIMES_CONTROLLER[i][j]);
				}
			}



			xAxisLabel = "Time until catalysis (s)";
			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "pauseX") xAxisLabel = "Pause time (s)";
			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"] == "shortPauseX") xAxisLabel = "Short pause time (s)";
			
			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") xAxisLabel = "log " + xAxisLabel;



		}


		// Each datapoint is time spent between catalysis events
		else if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["perTime"] == "perTemplate"){
			for (var i = 0; i < DWELL_TIMES_CONTROLLER.length-1; i ++){ // Stop before we reach the current template because it's not done yet
				if (DWELL_TIMES_CONTROLLER[i] == null) continue;
				var totalTimeOnThisTemplate = 0;
				for (var j = 0; j < DWELL_TIMES_CONTROLLER[i].length; j ++) totalTimeOnThisTemplate += DWELL_TIMES_CONTROLLER[i][j];

				if(totalTimeOnThisTemplate > 0 && PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") timesToPlot.push(Math.max(Math.log(totalTimeOnThisTemplate), -1000));
				else if(totalTimeOnThisTemplate > 0) timesToPlot.push(totalTimeOnThisTemplate);
				meanElongationDuration += totalTimeOnThisTemplate;
			}


			if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace") xAxisLabel = "log Time to copy template (s)";
			else xAxisLabel = "Time to copy template (s)";



		}

		meanElongationDuration /= timesToPlot.length;
		
		// Print the mean velocity to the html
		if (isNaN(meanElongationDuration)) meanElongationDuration = 0;
		$("#plotLabelVariable" + canvasesToPrintTo[canvasNum]).html(roundToSF(meanElongationDuration));

		//console.log("DWELL_TIMES_CONTROLLER", DWELL_TIMES_CONTROLLER.length, DWELL_TIMES_CONTROLLER);



		if ($("#plotDIV" + canvasesToPrintTo[canvasNum]).is( ":hidden" )) continue;
		histogram(timesToPlot, "plotCanvas" + canvasesToPrintTo[canvasNum], "plotCanvasContainer" + canvasesToPrintTo[canvasNum], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["xRange"], xAxisLabel, "Probability",  false, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["canvasSizeMultiplier"], PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["timeSpaceX"] == "logSpace" );
	}
	
	
	
}


function download_velocityHistogramTSV(plotNum){


	// Download the velocities given the current window size
	var maxDataPoints = 10000;
	var velocitiesWindowSize = [];
	var windowSize = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["windowSize"];
	//console.log("Plotting velocity", VELOCITIES);
	for (var sim = 0; sim < VELOCITIES.length; sim++){

		if (VELOCITIES[sim] == null || VELOCITIES[sim]["times"].length == 0) continue;

		
		var startTime = VELOCITIES[sim]["times"][0];
		var startDist = VELOCITIES[sim]["distances"][0];

		//console.log("Looking into", VELOCITIES[sim], "startTime", startTime, "startDist", startDist);
		

		for (var timeIndex = 1; timeIndex < VELOCITIES[sim]["times"].length; timeIndex++){


			if (velocitiesWindowSize.length > maxDataPoints) break;


			// Find the distance travelled after waiting for a time equal to the window size
			var thisTime = VELOCITIES[sim]["times"][timeIndex];
			if (thisTime - startTime >= windowSize){

				var totalDist = VELOCITIES[sim]["distances"][timeIndex-1] - startDist;


				if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceX"] == "logSpace") velocitiesWindowSize.push(Math.max(Math.log(totalDist / windowSize), -1000));

				//sortedPush(velocitiesWindowSize, totalDist / windowSize); // Add velocity to list (and keep it sorted)

				else velocitiesWindowSize.push(totalDist / windowSize);

				// Continue calculations with a new start time
				startDist = VELOCITIES[sim]["distances"][timeIndex-1]
				startTime += windowSize; // Set the startTime to the beginning of the next window size


				timeIndex--;


			}


		}

	}


	if (velocitiesWindowSize.length == 0) return;
	var tsv = "Elongation velocity(bp/s). Window size: " + windowSize + "s, DateTime " + getFormattedDateAndTime() + "\n";
	for (var i = 0; i < velocitiesWindowSize.length; i ++){
		tsv += velocitiesWindowSize[i] + "\t";
	}


	download("velocity_histogram.tsv", tsv);


}

// Download the data from the plot above as a .tsv file
function download_pauseHistogramTSV(){


	
	//if (DWELL_TIMES_CONTROLLER.length < 5) return;

	var tsv = "Time(s) between catalysis events, DateTime " + getFormattedDateAndTime() + "\n\n";
	var trueSimNum = 1;
	for (var simNum = 0; simNum < DWELL_TIMES_CONTROLLER.length; simNum++){
		if (DWELL_TIMES_CONTROLLER[simNum] == null) continue;
		tsv += "trial\t" + trueSimNum + "\n";
		tsv += "times\t";
		for (var timeNum = 0; timeNum < DWELL_TIMES_CONTROLLER[simNum].length; timeNum++){
			tsv += DWELL_TIMES_CONTROLLER[simNum][timeNum] + "\t";
		}
		tsv += "\n";
		trueSimNum ++;

	}
	
	if (tsv == "") return;


	download("time_histogram.tsv", tsv);


}

// Using homebrew functions because the default ones have upperlimits of ~100,000
function minimumFromList(list){

	var min = 1e20;
	for (var i = 0; i < list.length; i ++){
		min = Math.min(min, list[i]);
	}
	if (min == 1e20) return null;
	return min;

}


function maximumFromList(list){

	var max = -1e20;
	for (var i = 0; i < list.length; i ++){
		max = Math.max(max, list[i]);
	}
	if (max == -1e20) return null;
	return max;

}




// Assumes that values are sorted
function histogram(values, canvasID, canvasDivID, xRange = "automaticX", xlab = "", ylab = "Probability", hoverLabels = false, canvasSizeMultiplier = 1, logSpace = false, underlayFn = null, isInteger = false, col = "#008CBA"){

	if (canvasDivID != null && $("#" + canvasDivID).is( ":hidden" )) return;
	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	// Delete the canvas and add it back later so it doesn't bug
	if (canvasDivID != null) {
		$("#" + canvasID).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + canvasID + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}
	
	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	
	//console.log("vals", values);


	var ctx = canvas.getContext('2d');
	var axisGap = 45 * canvasSizeMultiplier;
	var binGap = 5 * canvasSizeMultiplier;
	var maxNumBins = 24;
	textbox = "";
	
	
	ctx.globalAlpha = 1;

	

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	
	var widthScale = plotWidth;
	var heightScale = plotHeight;
	

	if (values.length > 5){
		
		
		// If xRange is set to pauseX set min to 1 and max to whatever the maximum is
		// If xRange is set to shortPauseX set min to 1 and max to 25
		ctx.lineWidth = 0;
		var minVal = xRange == "automaticX" ? minimumFromList(values) : xRange == "pauseX" || xRange == "shortPauseX" ? 1  : xRange[0]; 
		var maxVal = xRange == "automaticX" || xRange == "pauseX" ? maximumFromList(values) : xRange == "shortPauseX" ? 25 : xRange[1];



		// Ensure that bin sizes increment by a nice number (eg. 1K, 2K, 2.5K, 5K for K = 10^N)
		var nbins = isInteger ? Math.ceil(maxVal - minVal) : Math.min(Math.ceil(Math.sqrt(values.length)), maxNumBins);
		if (minVal == maxVal) nbins = 1;

		var niceBinSizes = [1, 2, 2.5, 5];
		var niceBinSizeID = niceBinSizes.length - 1;
		var basePower = Math.ceil(log(maxVal - minVal, base = 10));
		
		var binSize = isInteger ? 1 : niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);
		
		
		if (minVal != maxVal) {
			while(true){
				if ((maxVal - minVal) / binSize - nbins >= 0 && (!isInteger || (isInteger && binSize % 1 == 0))) break;
                
               
				niceBinSizeID --;
				if (niceBinSizeID < 0) {
					niceBinSizeID = niceBinSizes.length - 1;
					basePower --;
				}
				binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);

			}
		}else{
			nbins = 1;
			binSize = 1;
		}
        
       
		
		
		
		minVal = minVal - minVal % binSize;
		maxVal = maxVal + binSize - maxVal % binSize;
		

		
		
		nbins = Math.ceil((maxVal - minVal) / binSize);
		//var binSize = (maxVal - minVal) / nbins;
		widthScale = (plotWidth - (nbins+1)*binGap) / (nbins);
        
        
        //console.log("binSize", binSize, nbins, minVal, maxVal);
		
		// console.log("MinVal", minVal, "maxVal", maxVal, "binSize", binSize, "nbins", nbins);


		
		// Find the bar heights
		var barHeights = [];
		for(var binID = 0; binID < nbins; binID ++){
		
        
			var y0 = 0;
			var minBinVal = binSize * binID + minVal;
			var maxBinVal = binSize * (binID+1) + minVal;
			
			
			// The largest bin's lower bound should be inclusive but all other bin's upper bound should be non-inclusive
			if (binID == nbins-1){
				for (var j = 0; j < values.length; j ++){
					if (values[j] >= minBinVal && values[j] <= maxBinVal) y0 += 1/values.length;
				}
			}
		
			else{
		
				for (var j = 0; j < values.length; j ++){
					if (values[j] >= minBinVal && values[j] < maxBinVal) y0 += 1/values.length;
				}
			}

			barHeights.push(logSpace ? Math.max(Math.log(y0), -1000) : y0);

		}

		var ymin = logSpace ? minimumFromList(barHeights) : 0;
		var ymax = roundToSF(maximumFromList(barHeights), 2, "none", true); // Math.min(Math.ceil(Math.max.apply(Math, barHeights) * 10.5) / 10, 1);
		

		// Prior distribution underlay (if applicable)
		drawHistogramPriorUnderlay(canvas, ctx, underlayFn, binSize, nbins, minVal, axisGap, binGap, heightScale, widthScale);



		// Plot the bars and add the hover events
		ctx.globalAlpha = 0.6;
		for(var binID = 0; binID < nbins; binID ++){
			var x0 = widthScale * binID + axisGap + binGap * (binID+1);
			ctx.fillStyle = col;
			ctx.fillRect(x0, heightScale, widthScale, barHeights[binID] / ymax * -heightScale);
		}
		
		
		// Add mouse hover event
		canvas.onmousemove = function(e) { 

			if (simulating) return;

			var rect = this.getBoundingClientRect(),
		        x = e.clientX - rect.left,
		        y = e.clientY - rect.top;
			
			histogram_mouse_over(x, y, canvas, ctx, binID, nbins, heightScale, widthScale, barHeights, minVal, ymax, col, binGap, axisGap, binSize, canvasSizeMultiplier, underlayFn); 
			add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier);
			add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels, canvasSizeMultiplier * 20, canvasSizeMultiplier * 3);
			
		};



		canvas.onmouseleave = function(e){
			histogram(values, canvasID, canvasDivID, xRange, xlab, ylab, hoverLabels, canvasSizeMultiplier, logSpace, underlayFn, isInteger, col);
		};
	

		add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier);
	
	}
	
	

	var newMouseMoveEvent = add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels, canvasSizeMultiplier * 20, canvasSizeMultiplier * 3);
	
	// Add xy label hover events
	if (newMouseMoveEvent != null) {
	
	
		// Add mouse hover event
		canvas.onmousemove = function(e) { 
		
			if (simulating) return;
			
			var rect = this.getBoundingClientRect(),
	        	x = e.clientX - rect.left,
	        	y = e.clientY - rect.top;
			if (values.length > 5){
					histogram_mouse_over(x, y, canvas, ctx, binID, nbins, heightScale, widthScale, barHeights, minVal, ymax, col, binGap, axisGap, binSize, canvasSizeMultiplier, underlayFn); 
					add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier);
			}
			newMouseMoveEvent = add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels, canvasSizeMultiplier * 20, canvasSizeMultiplier * 3);
			newMouseMoveEvent(x, y);
		};
			
			
	}
	


}


function drawHistogramPriorUnderlay(canvas, ctx, underlayFn, binSize, nbins, minVal, axisGap, binGap, heightScale, widthScale){

	// Plot the prior distribution underlay if there is one
	if (underlayFn != null){

		var maxX = binSize * (nbins) + minVal;
		var underlayScale = (maxX - minVal) / (canvas.width - axisGap - binGap);

		ctx.globalAlpha = 0.6;
		ctx.fillStyle = "#FFE92F"; //#d3d3d3
		ctx.beginPath();
		ctx.moveTo(axisGap, canvas.height - axisGap);

		// Find the maximum density in the prior curve
		var maxY_prior = 0;
		for (var xPix = axisGap; xPix < canvas.width; xPix++){
			var x = underlayScale * (xPix-axisGap-binGap) + minVal;
			var y = underlayFn(x, binSize);
			maxY_prior = Math.max(maxY_prior, y);
		}

        // 
		// Plot the prior curve
		// console.log("underlayFn maxX", minVal, maxX);
		for (var xPix = axisGap; xPix < canvas.width; xPix++){
        
			var x = underlayScale * (xPix-axisGap- binGap) + minVal;
			var y = underlayFn(x, binSize) / maxY_prior;

			var yPix = canvas.height - axisGap - y * heightScale; // -axisGap;
			ctx.lineTo(xPix, yPix);

		}

		ctx.lineTo(canvas.width, canvas.height - axisGap);

		//ctx.stroke();
		ctx.fill();


	}

}


function histogram_mouse_over(x, y, canvas, ctx, binID, nbins, heightScale, widthScale, barHeights, minVal, ymax, col, binGap, axisGap, binSize, canvasSizeMultiplier, underlayFn) {


	if (simulating) return;

	
	var textbox = "";
	ctx.clearRect(0, 0, canvas.width, canvas.height); 


	// Prior distribution underlay (if applicable)
	drawHistogramPriorUnderlay(canvas, ctx, underlayFn, binSize, nbins, minVal, axisGap, binGap, heightScale, widthScale);

	
	for(var binID = 0; binID < nbins; binID ++){
		
		
		var x0 = widthScale * binID + axisGap + binGap * (binID+1);
		ctx.globalAlpha = 0.6;
		ctx.lineWidth = 0;
		ctx.save();
		ctx.beginPath();
	   	ctx.rect(x0, heightScale, widthScale, barHeights[binID] / ymax * -heightScale);
	
		// Mouse is hovering over this bar
		if (x0 - binGap/2 <= x && x0 + widthScale + binGap/2 > x && y < canvas.height - axisGap){
		//if (ctx.isPointInPath(x, y)){
			
			// Add the bar with a different opacity
			ctx.globalAlpha = 1;
			ctx.fillStyle = col;
			ctx.fill();

			textbox = "P(" + roundToSF(binSize * binID + minVal) + " <= x < " + roundToSF(binSize * (binID+1) + minVal) + ") = " + roundToSF(barHeights[binID]);
			
		}else{

			// Add the bar
			ctx.fillStyle = col;
			ctx.fill();
			
			
		}
		ctx.restore();
		
	}
	
	
	
	
	// Add a box which says the coordinates of the current bar
	if (textbox != ""){
		
		ctx.font = 18 * canvasSizeMultiplier + "px Arial";
		ctx.textAlign= "left";
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#1e1e1e";
		
		// We don't want the text to go above or below the axis. The y-val of the textbox with respect to the cursor has a smooth rate of change.
		var dy = 60 - 120 / (canvas.height - axisGap) * y;
		//var dx = 20;
		var dx = 60 + (-ctx.measureText(textbox).width - 60) / (canvas.width - axisGap) * x;
		
		ctx.fillRect(x+dx-5, y+dy-3, ctx.measureText(textbox).width+10, 26);


		ctx.globalAlpha = 1;
		ctx.fillStyle = "#ebe9e7";
		ctx.textBaseline="top"; 
		ctx.fillText(textbox, x+dx, y+dy);
		
	}
	

	 
}



function log(num, base = null){
	
	if (num == 0) return 0;
	if (base == null) return Math.log(Math.abs(num));
	return Math.log(Math.abs(num)) / Math.log(base);
	
	
}

function add_histogram_labels(canvas, ctx, axisGap, binSize, minVal, maxVal, nbins, widthScale, heightScale, binGap, ymax, canvasSizeMultiplier){
	
	
	ctx.globalAlpha = 1;
	

	// Calculate the smallest order of magnitude across bars so we can express x-values in scientific notation. 
	// eg if mean order of magnitude is 5 then will express x-labels as 1.5e5, 20e5, etc.
	var meanBarOrderOfMagnitude = Math.ceil(log(binSize + minVal, 10)); 
	if (nbins == 1) meanBarOrderOfMagnitude = Math.ceil(log(binSize, 10)); 

	// X values on axis
	ctx.fillStyle = "black";
	var axisPointMargin = 4 * canvasSizeMultiplier;
	ctx.font = 12 * canvasSizeMultiplier + "px Arial";
	ctx.textBaseline="top"; 
	

	
	// Have 1 label for first and last bin and 2 or 0 in between
	if (meanBarOrderOfMagnitude <= 3 && meanBarOrderOfMagnitude >= -3) meanBarOrderOfMagnitude = 0;
	var orderOfMagnitudeString = meanBarOrderOfMagnitude == 0 ? "" :  meanBarOrderOfMagnitude == 0 ? "0" : "e" + meanBarOrderOfMagnitude;





	var binsEvery = nbins < 5 ? 1 : nbins < 10 ? 2 : nbins < 15 ? 3 : 4;
	var tickLength = 6 * canvasSizeMultiplier;
	ctx.lineWidth = 1 * canvasSizeMultiplier;
	for (i = 1; i <= nbins; i += binsEvery){

		var x0 = widthScale * (i-1) + axisGap + binGap * (i) + canvasSizeMultiplier;
		var txtLabel = roundToSF((minVal + binSize * (i-1)) * Math.pow(10, -meanBarOrderOfMagnitude), 3, "none", true) + orderOfMagnitudeString;


		//if (i == 1) ctx.textAlign= "left";
		 if ((canvas.width - x0) / canvas.width < 0.1) ctx.textAlign= "right";
		else ctx.textAlign= "center";

		ctx.fillText(txtLabel, x0, canvas.height - axisGap + axisPointMargin + 3 * canvasSizeMultiplier);


		// Draw axis tick
		ctx.beginPath();
		ctx.moveTo(x0, canvas.height - axisGap);
		ctx.lineTo(x0, canvas.height - axisGap + tickLength);
		ctx.stroke();

	} 



	// Y min and max
	ctx.save()
	ctx.font = 12 * canvasSizeMultiplier + "px Arial";
	ctx.textBaseline="bottom"; 
	ctx.textAlign="right"; 
	ctx.translate(axisGap - axisPointMargin, canvas.height - heightScale * 0 - axisGap);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(0, 0, 0);
	ctx.restore();

	ctx.save()
	ctx.font = 12 * canvasSizeMultiplier + "px Arial";
	ctx.textAlign="right"; 
	ctx.textBaseline="bottom"; 
	ctx.translate(axisGap - axisPointMargin, 0);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ymax, 0, 0);
	ctx.restore();
	
	
	
}



function add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, hoverLabels = false, fontSize = 20, linewidth = 3){


	ctx.font = fontSize + "px Arial";
	ctx.lineWidth = 3;
	ctx.globalAlpha = 1;
	
	
	// Axes
	ctx.strokeStyle = "black";
	ctx.lineWidth = linewidth;
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width, canvas.height - axisGap);
	ctx.stroke();
	
	
	
	if (!hoverLabels){

		// X title
		ctx.fillStyle = "black";
		ctx.textBaseline="top"; 
		var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
		var xlabYPos = canvas.height - 0.5 * axisGap;
		writeLatexLabelOnCanvas(ctx, xlab, xlabXPos, xlabYPos, fontSize);
		//ctx.fillText(xlab, xlabXPos, xlabYPos);
		
		// Y title
		ctx.textAlign="center"; 
		ctx.textBaseline="bottom"; 
		ctx.font = fontSize + "px Arial";
		ctx.save()
		var ylabXPos = 2 * axisGap / 3;
		var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
		ctx.translate(ylabXPos, ylabYPos);
		ctx.rotate(-Math.PI/2);
		ctx.fillText(ylab, 0 ,0);
		ctx.restore();
		
		return null;
	
	}
	
	// Allow user to change labels
	ctx.textAlign="center"; 
	ctx.textBaseline="top";
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2 - 5;
	
	
	// Draw a rectangle around the x label and the label inside the rectangle
	ctx.fillStyle = "#1e7d1e";
	var x0 = xlabXPos -1/2 * ctx.measureText(xlab).width - 10;
	var y0 = xlabYPos - 2;
	var w = ctx.measureText(xlab).width + 20;
	var h = 28;
	ctx.fillRect(x0, y0, w, h);
	ctx.fillStyle = "white";
	ctx.fillText(xlab, xlabXPos, xlabYPos);



	

	
	
	// Draw a rectangle around the y label
	ctx.textBaseline="bottom"; 
	ctx.fillStyle = "#1e7d1e";
	var ylabXPos = 2 * axisGap / 3;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;


	var y0Ylab = -ctx.measureText(ylab).width/2 - 10 + ylabYPos;
	var x0Ylab = -25 + ylabXPos
	var hYlab = ctx.measureText(ylab).width + 20;
	var wYlab = 28;
	ctx.fillRect(x0Ylab, y0Ylab, wYlab, hYlab);

	ctx.save()
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillStyle = "white";
	ctx.fillText(ylab, 0 ,0);
	ctx.restore();
	


	// Add a hover events over the axis labels

	// Add mouse hover event
	var mouseMoveEvent = function (mouseX, mouseY) {


		var mouseInXLab = x0 < mouseX && x0 + w > mouseX && y0 <= mouseY && y0 + h >= mouseY;
		var mouseInYLab = x0Ylab < mouseX && x0Ylab + wYlab > mouseX && y0Ylab <= mouseY && y0Ylab + hYlab >= mouseY;
		if (mouseInXLab || mouseInYLab){
			//$('#' + id).addClass("variable-cursor")
			$('#' + canvasID).css('cursor','pointer');
		}else{
			//$('#' + id).removeClass("variable-cursor")
			$('#' + canvasID).css('cursor','auto');
		}


	};

	/*
	canvas.addEventListener('click', function(e) { 
		
		if (simulating) return;
		
		var rect = this.getBoundingClientRect();
		var mouseX = e.clientX - rect.left;
		var mouseY = e.clientY - rect.top;
		var mouseInXLab = x0 < mouseX && x0 + w > mouseX && y0 <= mouseY && y0 + h >= mouseY;
		var mouseInYLab = x0Ylab < mouseX && x0Ylab + wYlab > mouseX && y0Ylab <= mouseY && y0Ylab + hYlab >= mouseY;
		
		if (mouseInXLab){
			highlightVariables(canvasID, "x");
		}
		else if (mouseInYLab) {
			highlightVariables(canvasID, "y");
		}
		
		
	}, false);
	*/
		
	return mouseMoveEvent;
	
	
}




// Create a graph above the simulation where each x value is a base and each y value is pause duration
function plot_time_vs_site(){

	//console.log("plot_time_vs_site", PLOT_DATA["pauseTimePerSite"]);

	if (PLOT_DATA["pauseTimePerSite"] == null) return;


	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "pauseSite") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return;
	
	for (var canvasNum = 0; canvasNum < canvasesToPrintTo.length; canvasNum ++){
		


		var pauseSum = PLOT_DATA["pauseTimePerSite"].reduce(function(a, b) { return a + b; }, 0);
		//basesToDisplayTimes100 = 1;


		// Create label function. Depends on what y-axis the user wants to see
		var ymin = 1000000;
		var labelFn = function(site, val){

			var preString = PLOT_DATA["whichPlotInWhichCanvas"][4].pauseSiteYVariable == "catalysisTimes" ? "time to catalysis at " + site : 
                            PLOT_DATA["whichPlotInWhichCanvas"][4].pauseSiteYVariable == "dwellTimes" ?  "dwell time at " + site :
                            "time where nascent strand has length " + site.substring(1);
			switch (PLOT_DATA["whichPlotInWhichCanvas"][4]["yAxis"]){
				case "timePercentage":
					if (val <= 0) return "";
					return "Total " + preString + ": " + roundToSF(val / pauseSum * 100) + "%";
				case "timeSeconds":
					if (val <= 0) return "";
					return "Mean " + preString + ": " + roundToSF(val / PLOT_DATA["npauseSimulations"]) + "s";
				case "logTimeSeconds":
					if (val <= ymin) return "";
					//console.log("Log time", pauseSum, "normal time", 
					return "Mean " + preString + " at " + site + ": " + roundToSF(Math.exp(val) / PLOT_DATA["npauseSimulations"]) + "s";
			}
		
		}
	

		var valuesToPlot = [];
		if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "logTimeSeconds"){

			// Find the minimum value
			ymin = 1000000;
			for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
				if (PLOT_DATA["pauseTimePerSite"][i] > 0) ymin = Math.min(Math.log(PLOT_DATA["pauseTimePerSite"][i]), ymin);
			}

			// Set all values to either their log value or ymin if the time is zero
			for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
				if (PLOT_DATA["pauseTimePerSite"][i] > 0) valuesToPlot.push(Math.log(PLOT_DATA["pauseTimePerSite"][i]));
				else valuesToPlot.push(ymin);
			}
		}else valuesToPlot = PLOT_DATA["pauseTimePerSite"];

		var ylab = PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "timePercentage" ? "Time (%)" : PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "timeSeconds" ? "Time (s)" : "log time(s)";

	
		if ($("#plotDIV" + canvasesToPrintTo[canvasNum]).is( ":hidden" )) return;
			sitewise_plot("plotCanvas" + canvasesToPrintTo[canvasNum], "plotCanvasContainer" + canvasesToPrintTo[canvasNum], "plotDIV" + canvasesToPrintTo[canvasNum], valuesToPlot, ylab, labelFn, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["canvasSizeMultiplier"]);

		
	}
	

	
}


// Download the previous plot data as .tsv
function download_pauseSiteTSV(){

	var tsv = "Site\tAveragePauseTime(s)\tDateTime "  + getFormattedDateAndTime() + "\n";
	for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
		tsv += (i+1) + "\t" + PLOT_DATA["pauseTimePerSite"][i] + "\n";
	}

	download("pause_times.tsv", tsv);


}



// Create a graph above the simulation where each x value is a base and each y value is pause duration
function plot_catalysis_time_vs_site(){

	console.log("plot_time_vs_site");

	if (PLOT_DATA["pauseTimePerSite"] == null) return;


	// Find the canvas to print onto
	var canvasesToPrintTo = [];
	for (var plt in PLOT_DATA["whichPlotInWhichCanvas"]){
		if (PLOT_DATA["whichPlotInWhichCanvas"][plt]["name"] == "pauseSite") canvasesToPrintTo.push(plt);
	}
	
	if (canvasesToPrintTo.length == 0) return;
	
	for (var canvasNum = 0; canvasNum < canvasesToPrintTo.length; canvasNum ++){
		


		var pauseSum = PLOT_DATA["pauseTimePerSite"].reduce(function(a, b) { return a + b; }, 0);
		//basesToDisplayTimes100 = 1;


		// Create label function. Depends on what y-axis the user wants to see
		var ymin = 1000000;
		var labelFn = function(site, val){


			switch (PLOT_DATA["whichPlotInWhichCanvas"][4]["yAxis"]){
				case "timePercentage":
					if (val <= 0) return "";
					return "Total time at " + site + ": " + roundToSF(val / pauseSum * 100) + "%";
				case "timeSeconds":
					if (val <= 0) return "";
					return "Mean time at " + site + ": " + roundToSF(val / PLOT_DATA["npauseSimulations"]) + "s";
				case "logTimeSeconds":
					if (val <= ymin) return "";
					//console.log("Log time", pauseSum, "normal time", 
					return "Mean time at " + site + ": " + roundToSF(Math.exp(val) / PLOT_DATA["npauseSimulations"]) + "s";
			}
		
		}
	

		var valuesToPlot = [];
		if (PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "logTimeSeconds"){

			// Find the minimum value
			ymin = 1000000;
			for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
				if (PLOT_DATA["pauseTimePerSite"][i] > 0) ymin = Math.min(Math.log(PLOT_DATA["pauseTimePerSite"][i]), ymin);
			}

			// Set all values to either their log value or ymin if the time is zero
			for (var i = 0; i < PLOT_DATA["pauseTimePerSite"].length; i ++){
				if (PLOT_DATA["pauseTimePerSite"][i] > 0) valuesToPlot.push(Math.log(PLOT_DATA["pauseTimePerSite"][i]));
				else valuesToPlot.push(ymin);
			}
		}else valuesToPlot = PLOT_DATA["pauseTimePerSite"];

		var ylab = PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "timePercentage" ? "Time (%)" : PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["yAxis"] == "timeSeconds" ? "Time (s)" : "log time(s)";
        
        
	
		//var pauseTimes = [0, 0.001, 0.01, 0.5, 10, 0.2, 3, 0.001, 0.01, 0.5, 10, 0.2, 3, 0.001, 0.01, 0.5, 10, 0.2, 3, 10, 0];
		if ($("#plotDIV" + canvasesToPrintTo[canvasNum]).is( ":hidden" )) return;
			sitewise_plot("plotCanvas" + canvasesToPrintTo[canvasNum], "plotCanvasContainer" + canvasesToPrintTo[canvasNum], "plotDIV" + canvasesToPrintTo[canvasNum], valuesToPlot, ylab, labelFn, PLOT_DATA["whichPlotInWhichCanvas"][canvasesToPrintTo[canvasNum]]["canvasSizeMultiplier"]);
		
	}
	
	
}





// Assumes that the first and last element of yvals is zero
// In firefox, safari and chrome, the maximum canvas width is around 32k pixels. In IE 8k (will ignore IE)
// If we have the canvas size multiplier (for downloading high res png) at 10 and each base is 25 pixels wide then we should never display more
// than 32000 / 25 / 10 = 128nt at a time
// So the plot will display 120nt at a time maximum with overlapping windows of 20bp
// eg. display 1-120 or 100-220, or 200-320 etc. The slot we see is indicated by basesToDisplayTimes100
function sitewise_plot(canvasID, canvasContainerID, canvasDivID, yvals, ylab = "", hoverOverTextBoxFn = function(){}, canvasSizeMultiplier = 1, xlab = "", hoverOver = -1, mouseX = null, mouseY = null, scrollPos = null){


	
	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;
	
	var axisGap = 30 * canvasSizeMultiplier;
	var startSite = (basesToDisplayTimes100-1) * 100 + 1;
	var endSite = Math.min(startSite + 119, yvals.length-1);

	$("#plots4").off("mouseleave"); // Remove the mouseleave event
	
	// Delete the canvas and add it back later so it doesn't bug
	if (canvasDivID != null) { 

		if (scrollPos == null) scrollPos = $("#" + canvasDivID).scrollLeft();

		$("#" + canvasID).remove();
		var canvasWidth = axisGap + canvasSizeMultiplier * (Math.min((PLOT_DATA["nbases"]), 120-1)*25);  // Width should cover all nucleotides
		
		var canvasHeight = canvasSizeMultiplier * 150;
		$("#" + canvasContainerID).html('<canvas id="' + canvasID + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');



		// Enable/disable the buttons to turn this plot into the next plot with different site range

		// Disable the minus button if we cannot decrease from here
		if (basesToDisplayTimes100 == 1){
			$("#minus100Sites").addClass("dropdown-disabled");
			$("#minus100Sites").prop("disabled", true);
		}else{
			$("#minus100Sites").removeClass("dropdown-disabled");
			$("#minus100Sites").prop("disabled", false);
		}


		// Disable the plus button if we cannot increase from here
		console.log("nbases", PLOT_DATA["nbases"]);
		var max = Math.ceil(parseFloat(PLOT_DATA["nbases"]) / 100);
		//if (PLOT_DATA["nbases"] % 100 <= 20) max--;
		if (basesToDisplayTimes100 == max){
			$("#plus100Sites").addClass("dropdown-disabled");
			$("#plus100Sites").prop("disabled", true);
		}else{
			$("#plus100Sites").removeClass("dropdown-disabled");
			$("#plus100Sites").prop("disabled", false);
		}


		// Set the label of the "Displaying XXX-YYY sites of ZZZ" label
		$("#numSitesDisplayed").html(startSite + "-" + endSite);
		$("#numSitesTotal").html(PLOT_DATA["nbases"]);


	}
	


	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	var ctx = canvas.getContext('2d');
	

	if (scrollPos != null) $("#" + canvasDivID).scrollLeft(scrollPos);

	ctx.lineWidth = 0 * canvasSizeMultiplier;

	
	ctx.globalAlpha = 1;

	

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var ymax = Math.max.apply(Math, yvals);
	var ymin = Math.min.apply(Math, yvals);
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	var widthScale = plotWidth;
	var heightScale = plotHeight / (ymax-ymin);




	var baseHeight = 25 * canvasSizeMultiplier;

	
	// Nucleotide colours"
	var colours = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}
	var textbox = ""; // To display above a bar



	if (yvals.length > 0){

		// Draw the first point
		//var prevX = $("#g1").offset().left - basesOffset;
		//ctx.moveTo(prevX, canvas.height - axisGap);


		for (var site = startSite; site <= endSite; site++){


			if (site == hoverOver) ctx.globalAlpha = 1;
			else ctx.globalAlpha = 0.7;
			//ctx.globalAlpha = 0.7;
			
			ctx.beginPath();


			var xVal = ((site-startSite)*25) * canvasSizeMultiplier + axisGap;
			
			
			
			var baseType = PLOT_DATA["templateSeq"][site-1];
			//var baseType = getBaseInSequenceAtPosition("g" + site);//$("#g" + site).attr("nt");
			var yVal = canvas.height - axisGap - (yvals[site]-ymin) * heightScale;
			var yValPrev = canvas.height - axisGap - (yvals[site-1]-ymin) * heightScale;
			var yValNext= canvas.height - axisGap - (yvals[site+1]-ymin) * heightScale;
			
			
			// Start the trace in the bottom left
			ctx.moveTo(xVal, canvas.height - axisGap);
			

			// Move upto the the point between this y value and the previous one
			var yMidPoint = (yValPrev + yVal) / 2;
			ctx.lineTo(xVal, yMidPoint);
			
			// Move to this y-value and 1/3rd way through this base
			//ctx.lineTo(xVal + baseHeight/3, yVal);
			
			// Move to this y-value and 1/2 way through this base
			ctx.lineTo(xVal + baseHeight/2, yVal);
			
			// Move to the midpoint between this and the next y-value
			yMidPoint = (yValNext + yVal) / 2;
			ctx.lineTo(xVal + baseHeight, yMidPoint);
			
			// Finally, we end up at the bottom right corner
			ctx.lineTo(xVal + baseHeight, canvas.height - axisGap);
			
			// Fill the area with the appropriate colour
			var baseName = baseType[0];
			ctx.fillStyle = colours[baseName];
			ctx.fill();
			
			
			
			// Create textbox to display if this bar is being hovered over
			if (site == hoverOver){
				textbox =  hoverOverTextBoxFn(baseName + site, yvals[site]);
			}

			
			// Add x axis labels
			ctx.globalAlpha = 1;
			if (site == hoverOver) ctx.font = "bold " + canvasSizeMultiplier * 30 + "px Courier";
			else ctx.font = "bold " + canvasSizeMultiplier * 20 + "px Courier";
			
			ctx.textAlign="center"; 
			ctx.textBaseline="top"; 
			ctx.fillText(baseName, xVal + baseHeight/2, canvas.height - axisGap + 5);
			

		}
		
		


		
		
		// Add mouse hover event
		canvas.onmousemove = function (e) {

			if (simulating && $("#PreExp").val() != "hidden") return;

			var rect = this.getBoundingClientRect(),
		        mouseX = e.clientX - rect.left,
				mouseY = e.clientY - rect.top;

			for (var site = startSite; site <= endSite; site++){
				
				var xVal = ((site-startSite)*25) * canvasSizeMultiplier + axisGap;
				
				// Mouse is hovering over this bar
				if (xVal <= mouseX && mouseX < xVal + baseHeight){

					// Redraw the graph but with this bar having a different opacity and with a label showing
					sitewise_plot(canvasID, canvasContainerID, canvasDivID, yvals, ylab, hoverOverTextBoxFn, canvasSizeMultiplier, xlab, site, mouseX, mouseY, $("#" + canvasDivID).scrollLeft());
					return;
					
				}
			}
			
			
			
			
		};


		// Remove highlighting when mouse leaves sitewise panel
		$("#plots4").mouseleave(function() {
			$("#plots4").off("mouseleave");
			sitewise_plot(canvasID, canvasContainerID, canvasDivID, yvals, ylab, hoverOverTextBoxFn, canvasSizeMultiplier, xlab, -1, null, null, $("#" + canvasDivID).scrollLeft());
		});
		



		

		
	}
	
	// Axes
	add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, false, font = canvasSizeMultiplier * 20, canvasSizeMultiplier * 3);
	
	// Add the hover label
	if (hoverOver!= -1 && textbox != "" && mouseY != null && mouseX != null){
			
			

			
		ctx.textAlign= "left";
		ctx.font = 18 * canvasSizeMultiplier + "px Arial";
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#1e1e1e";
		
		// We don't want the text to go above or below the axis. The y-val of the textbox with respect to the cursor has a smooth rate of change.
		var dy = 25 - 50 / (canvas.height - axisGap) * mouseY;
		var dx = -ctx.measureText(textbox).width / (canvas.width - axisGap) * mouseX;
		
		ctx.fillRect(mouseX + 5 + dx,  mouseY + 5 + dy, ctx.measureText(textbox).width + 4, -28);
	
		ctx.fillStyle = "#ebe9e7";
		ctx.textBaseline="bottom"; 
		ctx.fillText(textbox, mouseX + 7 + dx,  mouseY + dy);
			
	}
	
	

	
	
}


function download_misincorporationSiteTSV(){

	var tsv = "Site\tProbMisincorporate_A\tProbMisincorporate_C\tProbMisincorporate_G\tProbMisincorporate_T\tProbMisincorporate_U\n";
	for (site in PLOT_DATA["misincorporationCounts"]){
		tsv += site;
		for (var mutn in PLOT_DATA["misincorporationCounts"][site]){
			tsv += "\t" + (PLOT_DATA["misincorporationCounts"][site][mutn] / PLOT_DATA["nMisincorporationSimulations"]);
		} 
		tsv += "\n";
	}

	download("misincorporation_probabilities.tsv", tsv);


}





function plot_misincorporation_vs_site(){



	// If we do not want to show this plot type in the sitewise slot, then return now
	if (PLOT_DATA["whichPlotInWhichCanvas"]["4"]["name"] != "misincorporationSite") return;
	
	if (PLOT_DATA["misincorporationCounts"] == null) return;

	//console.log("misinc counts", misincorporationCounts);

	// Create label function
	var labelFn = function(site, vals){
		var toReturnA = "Misincorporation probabilities at " + site + ":  ";
		var toReturnB = "";
		for (var mutn in vals){
			if (vals[mutn] > 0){
				toReturnB += "P(" + mutn + ") = " + (Math.round(vals[mutn] / PLOT_DATA["nMisincorporationSimulations"] * 1000) / 1000) + ";  ";
			}
		}
		if (toReturnB != "") return toReturnA + toReturnB;
		
		return "";
	}
	

	misincorporation_plot("plotCanvas4", "plotCanvasContainer4", PLOT_DATA["misincorporationCounts"], PLOT_DATA["nMisincorporationSimulations"], "P(mutate)", labelFn);


}



// Assumes that the first and last element of yvals is zero
function misincorporation_plot(canvasID, canvasDivID, yvals, ntrials, ylab = "", hoverOverTextBoxFn = function(){}, canvasSizeMultiplier = 1, xlab = "", hoverOver = -1, mouseX = null, mouseY = null){
	


	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	var ctx = canvas.getContext('2d');
	var axisGap = 30;
	
	ctx.canvas.width  = axisGap + $("#g" + (PLOT_DATA["nbases"])).offset().left + $("#bases").scrollLeft() - $("#" + canvasDivID).offset().left; // Width should cover all nucleotides
	
	
	ctx.lineWidth = 0;
	ctx.globalAlpha = 1;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	
	// Find the maximum y value
	var ymax = 0;
	for (var site = 1; site < yvals.length-1; site++){
		var siteTotal = 0;
		for (var mutn in yvals[site]) siteTotal+= yvals[site][mutn];
		if (siteTotal > ymax) ymax = siteTotal;
		
	}
	if (ymax == 0) ymax = ntrials;
	ymax = ymax / ntrials;
	ymax = roundToSF(ymax * 1.1, 2, "none", true);
	
	
	
	
	
	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	var widthScale = plotWidth;
	var heightScale = plotHeight / ymax;



	var basesOffset =  -$("#" + canvasDivID).offset().left;// + $("#bases").scrollLeft();



	
	var baseMargin = 2;
	var baseHeight = 25 - 2*baseMargin;
	var yMargin = 0;



	
	
	// Nucleotide colours"
	var colours = {"A" : "#ed1c24", "U" : "#00aeef", "T" : "#1c75bc", "G" : "#00a14b", "C" : "#f7941e", "X" : "#ec008c"}
	var textbox = ""; // To display above a bar
	
	if (yvals.length > 0){

		// Draw the first point
		//var prevX = $("#g1").offset().left - basesOffset;
		//ctx.moveTo(prevX, canvas.height - axisGap);

		
		for (var site = 1; site < yvals.length-1; site++){
			
			
			if (site == hoverOver) ctx.globalAlpha = 1;
			else ctx.globalAlpha = 0.7;
			//ctx.globalAlpha = 0.7;
			

			var baseType = PLOT_DATA["templateSeq"][site-1];
			//var baseType = getBaseInSequenceAtPosition("g" + site);//$("#g" + site).attr("nt");
			var xVal = $("#g" + site).offset().left + basesOffset + baseMargin;
			
			// Add one bar for each non zero count
			var accumulativeY = canvas.height - axisGap;
			for (var mutn in yvals[site]){
				if (yvals[site][mutn] > 0){
					ctx.fillStyle = colours[mutn];
					var yVal = accumulativeY -  (yvals[site][mutn]/ntrials * heightScale);
					ctx.fillRect(xVal, yVal, baseHeight, accumulativeY - yVal)
					accumulativeY = yVal - yMargin;
				}
			}
			
		
			
			
			
			// Create textbox to display if this bar is being hovered over
			if (site == hoverOver){
				textbox = hoverOverTextBoxFn(baseType[0] + site, yvals[site]);
			}
			

			
			// Add x axis labels
			ctx.globalAlpha = 1;
			if (site == hoverOver) ctx.font = "bold 30px Courier";
			else ctx.font = "bold 22px Courier";
			
			ctx.textAlign="center"; 
			ctx.textBaseline="top"; 
			ctx.fillStyle = colours[baseType[0]];
			ctx.fillText(baseType[0], xVal + baseHeight/2, canvas.height - axisGap);
			

		}
		
		
	
		
		// Add mouse hover event
		canvas.onmousemove = function (e) {

			if (simulating) return;

			var rect = this.getBoundingClientRect(),
		        mouseX = e.clientX - rect.left,
				mouseY = e.clientY - rect.top;

			for (var site = 1; site < yvals.length-1; site++){
				
				var xVal = $("#g" + site).offset().left + basesOffset;
				
				// Mouse is hovering over this bar
				if (xVal <= mouseX && mouseX < xVal + baseHeight){
					

					// Redraw the graph but with this bar having a different opacity and with a label showing
					misincorporation_plot(canvasID, canvasDivID, yvals, ntrials, ylab, hoverOverTextBoxFn, xlab, site, mouseX, mouseY);
					return;
					
				}
			}
			
			
			
			
		};
		
		canvas.onmouseleave = function(e){
			misincorporation_plot(canvasID, canvasDivID, yvals, ntrials, ylab, hoverOverTextBoxFn, xlab);
		};
		


		

		
	}
	
	// Axes
	add_histogram_axes(canvasID, canvas, ctx, axisGap, xlab, ylab, false, 20 * canvasSizeMultiplier, canvasSizeMultiplier * 3);
	
	// Add the hover label
	if (hoverOver!= -1 && textbox != "" && mouseY != null && mouseX != null){
			

		ctx.textAlign= "left";
		ctx.font = "18px Arial";
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#1e1e1e";
		
		// We don't want the text to go above or below the axis. The y-val of the textbox with respect to the cursor has a smooth rate of change.
		var dy = 25 - 50 / (canvas.height - axisGap) * mouseY;
		var dx = -ctx.measureText(textbox).width / (canvas.width - axisGap) * mouseX;
		
		ctx.fillRect(mouseX + 5 + dx,  mouseY + 5 + dy, ctx.measureText(textbox).width + 4, -28);
	
		ctx.fillStyle = "#ebe9e7";
		ctx.textBaseline="bottom"; 
		ctx.fillText(textbox, mouseX + 7 + dx,  mouseY + dy);
			
	}
	
	

	
	
}





function constrainCustomPlotToBase(plotCanvasID, baseElement){
	
	
	PLOT_DATA["whichPlotInWhichCanvas"][plotCanvasID]["bases"] = [baseElement.attr('id').substring(1)];
	console.log("You have chosen", PLOT_DATA["whichPlotInWhichCanvas"][plotCanvasID]["bases"]);
	
	
	
}


function setVariableToRecord(plotCanvasID, element, axis){
	
	//console.log("You have chosen", element.attr('id'));

	if (element.attr('id') == "plotCanvas" + plotCanvasID) return;

	var varName = element.attr('id') == "SelectVariable" ? $("#SelectVariable").val() : element.attr('id'); // What is the name of the variable we are setting this axis to
	if (element.attr('id') == "SelectVariable") $("#SelectVariable").val("none"); // Reset the dropdown for next time
	
	setVariableToRecord_controller(plotCanvasID, varName, axis);
	
	
}



function download_customDataTSV(plotNum){


	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParam"] == "none") return;

	var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParam"];
	var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yData"]["name"];
	var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xData"]["vals"];
	var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yData"]["vals"];


	var tsv = xLab + " per trial, DateTime "  + getFormattedDateAndTime() + "\n";
	tsv += xLab + "\t";
	for (var i = 0; i < xvals.length; i ++){
		tsv += xvals[i] + "\t";
	}
	tsv += "\n";

	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customMetric"] != "n"){
		tsv += yLab + "\t";
		for (var i = 0; i < yvals.length; i ++){
			tsv += yvals[i] + "\t";
		}
		tsv += "\n";
	}

	download(xLab + ".tsv", tsv);


}





function download_heatmapDataTSV(plotNum){


	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamX"] == "none" || PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamY"] == "none") return;

	var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamX"];
	var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamY"];
	var zLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["metricZ"];
	var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xData"]["vals"];
	var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yData"]["vals"];
	var zvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zData"]["vals"];


	var tsv = xLab + " vs " + yLab + " per trial, DateTime "  + getFormattedDateAndTime() + "\n";
	tsv += xLab + "\t";
	for (var i = 0; i < xvals.length; i ++){
		tsv += xvals[i] + "\t";
	}
	tsv += "\n";


	tsv += yLab + "\t";
	for (var i = 0; i < yvals.length; i ++){
		tsv += yvals[i] + "\t";
	}
	tsv += "\n";

	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["metricZ"] != "none"){
		tsv += zLab + "\t";
		for (var i = 0; i < zvals.length; i ++){
			tsv += zvals[i] + "\t";
		}
		tsv += "\n";
	}

	download(xLab + ".tsv", tsv);


}






function getColourPalette(paletteName){

	switch(paletteName){

		case "blue":
			return Array(10).fill("#008CBA");
			break;
		case "rainbow":
			return ["#FF80CC", "#E680FF", "#9980FF", "#80B2FF", "#80FFFF", "#80FFB3", "#99FF80", "#E5FF80", "#FFCC80", "#FF8080"];
			break;
		case "purpleYellow": 
			return ["#9D00E5", "#AE31B3", "#B7499B", "#C06282", "#C97A69", "#D29351", "#DBAB38", "#E4C41F", "#E8D112", "#EDDD07"];
			break;
		case "yellowRed":
			return ["#FFFFBF", "#FFFF40", "#FFFF00", "#FFDB00", "#FFB600", "#FF9200", "#FF6D00", "#FF4900", "#FF2400", "#FF0000"];
			break;
		case "greyBlack":
			return ["#999999", "#919191", "#898989", "#7F7F7F", "#757575", "#6A6A6A", "#5D5D5D", "#4E4E4E", "#393939", "#0D0D0D"];
			break;
	}

	return null;


}




// Returns the colour of the current value
function getColourFromPalette(val, min, max, paletteName){

	var scaledVal = Math.floor(10 * (val - min) / (max - min)); // Normalise between 0 and 9
	if(scaledVal > 9) scaledVal = 9;
	if(scaledVal < 0) scaledVal = 0;
	var cols = getColourPalette(paletteName);

	return cols[scaledVal];
	
}






function plot_parameter_heatmap(plotNumCustom = null){


	// console.log("Drawing heatmap", PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]);

	if (plotNumCustom == null) plotNumCustom = 5;

	if (plotNumCustom != 5 && $("#plotDIV" + plotNumCustom).is( ":hidden" )) return;

	//console.log('PLOT_DATA["whichPlotInWhichCanvas"]', PLOT_DATA["whichPlotInWhichCanvas"]);
	

	
	// Empty plot
	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParamX"] == "none" || PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParamY"] == "none"){
		scatter_plot([], [], [0, 10, 0, 1], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], "Variable 1", "Variable 2", "Variable 3", "#008CBA", PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zColouring"]);
	}
	
	// X and Y variables
	else{
		


		var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["latexName"] != null ? PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["latexName"] : PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["name"];
		var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["latexName"] != null ? PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["latexName"] : PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["name"];
		var zLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"] == null ? null : PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]["latexName"] != null ? PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]["latexName"] : PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]["name"];
		var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["vals"];
		var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["vals"];
		var zvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"] == null ? null : PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zData"]["vals"];

		//console.log("xLab", xLab, "ylab", yLab, PLOT_DATA["whichPlotInWhichCanvas"]);

		if (xvals == null) xvals = [];
		if (yvals == null) yvals = [];
		if (zvals == null) zvals = [];
        

		// Filter out burn-in values
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom].burnin != null) {
			var burnin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom].burnin;
			xvals = xvals.slice(burnin, xvals.length)
			yvals = yvals.slice(burnin, yvals.length)
			zvals = zvals.slice(burnin, zvals.length)

		}


		// If y is probability make a histogram 
		if (xvals != null && PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParamY"] == "probability"){
        
            
        
            get_PHYSICAL_PARAMETERS_controller(function(params){
            
                var paramID = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParamX"];
                var isInteger = params[paramID] == null ? false : params[paramID].integer;

    			// Prior underlay?
    			var underlayFn = null;
    			if (params[paramID] != null && PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom].priorUnderlay){
               
    				//console.log("Adding a prior underlay");
                    
                
                    var xRange = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"];
                    
                    
                    // Get the prior probability density (and xmax / xmin if automaticX)
                    switch(params[paramID].distribution) {
                    
                    
                        // Uniform prior
                        case "Uniform":
                            var lower = params[paramID].uniformDistnLowerVal;
                            var upper = params[paramID].uniformDistnUpperVal;
                            if (xRange == "automaticX"){
                                var xmin = params[paramID]["zeroTruncated"] ? Math.max(0, lower - 0.25*(Math.abs(lower+upper+1))) : lower - 0.25*(Math.abs(lower+upper+1));
                                xRange = [xmin, upper + 0.25*(Math.abs(lower+upper+1))];
                            }
                           
                            var underlayFn = function(x, binsize = 1) {
                                if (x >= lower && x <= upper) return 1 / (upper - lower);
                                return 0;
                            };
                            
                            break;
                    
                    
                    
                        // Exponential prior
                        case "Exponential":
                            var rate =  params[paramID].exponentialDistnVal;
                            if (xRange == "automaticX"){
                                xRange = [0, 5/rate];
                            }
                           
                            var underlayFn = function(x, binsize = 1) {
                                if (x < 0) return 0;
                                return rate * Math.exp(-rate * x);
                            };
                            
                            break;
                    
                    
                        
                        // Normal prior
                        case "Normal":
                            var sd = params[paramID].normalSdVal;
                            var meanVal = params[paramID].normalMeanVal;
                            //console.log("Normal(", meanVal, ",", sd, ")");
                            if (xRange == "automaticX"){
                                var xmin = params[paramID]["zeroTruncated"] ? Math.max(meanVal - sd * 4, 0) : meanVal - sd * 4;
                                xRange = [xmin, meanVal + sd * 4];
                            }
                           
                            var underlayFn = function(x, binsize = 1) {
                                if (params[paramID]["zeroTruncated"] && x <= 0) return 0;
                                return 1 / (Math.sqrt(2 * Math.PI * sd * sd)) * Math.exp(-(x-meanVal) * (x-meanVal) / (2 * sd * sd));
                            };
                            
                            break;
                        
                        
                        
                        // Lognormal prior
                        case "Lognormal":
                            var sd = params[paramID].lognormalSdVal
                            var meanVal = params[paramID].lognormalMeanVal;
                            //console.log("Lognormal(", meanVal, ",", sd, ")");
                            if (xRange == "automaticX"){
                                var sd4 = Math.sqrt((Math.exp(Math.pow(sd, 2) - 1)) * Math.exp(2*meanVal + Math.pow(sd, 2))) * 4; // 4 standard deviations
                                var empMean = Math.exp(meanVal + sd*sd/2);
                                xRange = [Math.max(empMean - sd4, 0), empMean + sd4];
                            }
                            var underlayFn = function(x, binsize = 1) {
                                if (x <= 0) return 0;
                                return 1 / (x * sd * Math.sqrt(2 * Math.PI)) * Math.exp(-(Math.log(x)-meanVal) * (Math.log(x)-meanVal) / (2 * sd * sd));
                            };
                            
                            break;
                            
                            
                            
                        // Gamma prior
                        case "Gamma":
                            var shape = params[paramID].gammaShapeVal
                            var rateVal = params[paramID].gammaRateVal;
                            var scale = 1/rateVal;
                            //console.log("Gamma(", shape, ",", rateVal, ")");
                            if (xRange == "automaticX"){
                                var sd4 = Math.sqrt(shape * scale * scale) * 4; // 4 standard deviations
                                var empMean = shape * scale;
                                xRange = [Math.max(empMean - sd4, 0), empMean + sd4];
                            }
                            var underlayFn = function(x, binsize = 1) {
                                if (x <= 0) return 0;
                                return jStat.gamma.pdf(x, shape, scale);
                            };
                            
                            break;
                            
                            
                        
                        // Discrete uniform prior
                        case "DiscreteUniform":
                            var lower = params[paramID].uniformDistnLowerVal;
                            var upper = params[paramID].uniformDistnUpperVal;
                            //console.log("DiscreteUniform(", lower, ",", upper, ")");
                            if (xRange == "automaticX"){
                                var xmin = params[paramID]["zeroTruncated"] ? Math.max(0, lower - 1) : lower - 1;
                                xRange = [xmin, upper + 1];
                            }
                           
                            var underlayFn = function(x, binsize = 1) {
                                var upperTemp = upper + 1;
                                var lowerTemp = lower;
                                if (x >= lowerTemp && x <= upperTemp) return 1 / (upper - lower);
                                return 0;
                            };
                            
                            break;
                        
                        }
                    
                    
                        histogram(xvals, "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, xRange, xLab, "Probability", false, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], false, underlayFn, isInteger);
                    
                    
    			} else {
                    histogram(xvals, "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"], xLab, "Probability", false, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], false, null, isInteger);
                }
                    
    			return;
                    
            });
            
            return;
            
		}


		var xValsGood = [];
		var yValsGood = [];
		var zValsGood = [];
		var zmin, zmax;


		// Get the z-axis range and filter out points which are not within this range. 
		// If a colour gradient is being used then assign colours to the points
		if (zvals != null){

			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zRange"] == "automaticZ" && PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["metricZ"] != "none"){
				zmin = minimumFromList(zvals);
				zmax = maximumFromList(zvals);
				xValsGood = xvals;
				yValsGood = yvals;
				zValsGood = zvals;
			}else{
				zmin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zRange"][0];
				zmax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zRange"][1];


				if(PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["metricZ"] == "none"){
					xValsGood = xvals;
					yValsGood = yvals;
					zLab = "";
				}

				else{

					for (var trialID = 0; trialID < zvals.length; trialID++){

						if (zvals[trialID] <= zmax && zvals[trialID] >= zmin) {
							xValsGood.push(xvals[trialID]);
							yValsGood.push(yvals[trialID]);
							zValsGood.push(zvals[trialID]);
						}

					}
				}

			}

		}

		// There is no z-axis
		else{
			xValsGood = xvals;
			yValsGood = yvals;
		}


	
		// Get the x and y range
		var xmin, xmax, ymin, ymax;
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"] == "automaticX"){
			xmin = minimumFromList(xValsGood);
			xmax = maximumFromList(xValsGood);
		}else{
			xmin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][1];
		}

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"] == "automaticY"){
			ymin = minimumFromList(yValsGood);
			ymax = maximumFromList(yValsGood);
		}else{
			ymin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][0];
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][1];
		}


		xmin = roundToSF(xmin, 2, "floor", true);
		xmax = roundToSF(xmax, 2, "ceil", true);
		ymin = roundToSF(ymin, 2, "floor", true);
		ymax = roundToSF(ymax, 2, "ceil", true);
		zmin = roundToSF(zmin, 2, "floor", true);
		zmax = roundToSF(zmax, 2, "ceil", true);


		//console.log("ymax", ymax, "ymin", ymin, "yvals", yvals);
		//console.log("xmax", xmax, "xmin", xmin, "xvals", xvals, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]);
		
		//console.log("actual boundaries", Math.max.apply(Math, xvals), Math.min.apply(Math, xvals), Math.max.apply(Math, yvals), Math.min.apply(Math, yvals));
		//console.log("Magnitudes", orderOfMagnitudeXMin, orderOfMagnitudeXMax, orderOfMagnitudeYMin, orderOfMagnitudeYMax);


		// Set the point colouring
		var cols = "#008CBA"; // Either a single colour or a gradient
		var colouringFn = null;
		if(zvals != null && PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["metricZ"] != "none"){
			
			cols = [];
			colouringFn = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["zColouring"];
			for (var trialID = 0; trialID < zValsGood.length; trialID++){
				cols.push(getColourFromPalette(zValsGood[trialID], zmin, zmax, colouringFn));
			}
            
            //console.log("cols", xValsGood, zValsGood, cols);

		}


		if (zvals == null) scatter_plot(xValsGood, yValsGood, [xmin, xmax, ymin, ymax], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], xLab, yLab, "");
		else scatter_plot(xValsGood, yValsGood, [xmin, xmax, ymin, ymax, zmin, zmax], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], xLab, yLab, zLab, cols, colouringFn);


	}


}


function plot_custom(plotNumCustom = null){


	if (plotNumCustom == null) plotNumCustom = 5;

	if (plotNumCustom != 5 && $("#plotDIV" + plotNumCustom).is( ":hidden" )) return;

	//console.log("plotNumCustom", plotNumCustom, PLOT_DATA);
	
	// Empty plot
	if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customParam"] == "none"){
		scatter_plot([], [], [0, 10, 0, 1], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"]);
	}
	
	// X and Y variables
	else{
		


		var xLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["latexName"] != null ? PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["latexName"] : PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["name"];
		var yLab = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["name"];
		var xvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xData"]["vals"];
		var yvals = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yData"]["vals"];

		if (xvals == null) xvals = [];
		if (yvals == null) yvals = [];


		// If are is no y vals then make a histogram, or if there is x but y is 'prob' 
		if (xvals != null && PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["customMetric"] == "probability"){
			histogram(xvals, "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"], xLab, "Probability", false, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"]);
			return;
		}

		// Otherwise make a scatter plot
		var xmin, xmax, ymin, ymax;
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"] == "automaticX"){
			xmin = minimumFromList(xvals); 
			xmax = maximumFromList(xvals); 
		}else{
			xmin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][0];
			xmax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["xRange"][1];
		}

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"] == "automaticY"){
			ymin = minimumFromList(yvals);  
			ymax = maximumFromList(yvals);
		}else{
			ymin = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][0];
			ymax = PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["yRange"][1];
		}


		xmin = roundToSF(xmin, 2, "floor", true);
		xmax = roundToSF(xmax, 2, "ceil", true);
		ymin = roundToSF(ymin, 2, "floor", true);
		ymax = roundToSF(ymax, 2, "ceil", true);


		//console.log("ymax", ymax, "ymin", ymin, "yvals", yvals);
		//console.log("xmax", xmax, "xmin", xmin, "xvals", xvals, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]);
		
		//console.log("actual boundaries", Math.max.apply(Math, xvals), Math.min.apply(Math, xvals), Math.max.apply(Math, yvals), Math.min.apply(Math, yvals));
		//console.log("Magnitudes", orderOfMagnitudeXMin, orderOfMagnitudeXMax, orderOfMagnitudeYMin, orderOfMagnitudeYMax);
		

		scatter_plot(xvals, yvals, [xmin, xmax, ymin, ymax], "plotCanvas" + plotNumCustom, "plotCanvasContainer" + plotNumCustom, PLOT_DATA["whichPlotInWhichCanvas"][plotNumCustom]["canvasSizeMultiplier"], xLab, yLab);

	}
	
	

}



function getNiceAxesNumbers(min, max, plotWidthOrHeight, minAtZero = min == 0, zeroLabel = true, axisGap = 45, niceBinSizes = [1, 2, 5]){

	if (min > max) max = min+1;

	var maxNumLabels = 8;
	var nLabels = maxNumLabels;

	var niceBinSizeID = niceBinSizes.length - 1;
	var basePower = Math.floor(log(max, base = 10));
	
	var binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);


	if (minAtZero) min = 0;

	var numLoops = 0;	
	if (min != max) {
		while(true){


			if (numLoops > 50 || (max - min) / binSize - nLabels > 0) break;
			niceBinSizeID --;
			if (niceBinSizeID < 0) {
				niceBinSizeID = niceBinSizes.length - 1;
				basePower --;
			}
			binSize = niceBinSizes[niceBinSizeID] * Math.pow(10, basePower);
			numLoops++;

		}



		if (!minAtZero){
			if (min > 0) min = min - min % binSize;
			else		 min = min - (binSize + min % binSize);
		}

		if (max > 0) max = max + binSize - max % binSize;
		else		 max = max + binSize - (binSize + max % binSize);


		nLabels = Math.ceil((max - min) / binSize);

		


	}else{
		binSize = 1;
		if (!minAtZero) min--;
		max++;
		nLabels = Math.ceil((max - min) / binSize);
	}
	

	var widthOrHeightScale = (plotWidthOrHeight / (max - min));


	var vals = [];
	var tooBigByFactorOf =  Math.max(Math.ceil(nLabels / maxNumLabels), 1)
	for(var labelID = 0; labelID < nLabels; labelID ++){
		if (labelID == 0 && !zeroLabel) continue;
		if (labelID % tooBigByFactorOf == 0 && labelID * binSize / (max - min) < 0.95) vals.push(roundToSF(labelID * binSize + min));
	}




	return {min: min, max: max, vals: vals, widthOrHeightScale: widthOrHeightScale};
	


}




// Plot the values of x and y
function scatter_plot(xvals, yvals, range, id, canvasDivID, canvasSizeMultiplier, xlab = "Variable 1", ylab = "Variable 2", zlab = null, col = "#008CBA", colGradient = null) {
	

	if ($("#" + canvasDivID).is( ":hidden" )) return;


	if (canvasSizeMultiplier == null) canvasSizeMultiplier = 1;

	// Delete the canvas and add it back later so it doesn't bug
	if (canvasDivID != null) {
		$("#" + id).remove();
		var canvasWidth = canvasSizeMultiplier * 500;
		var canvasHeight = canvasSizeMultiplier * 300;
		$("#" + canvasDivID).html('<canvas id="' + id + '" height=' + canvasHeight + ' width=' + canvasWidth + '></canvas>');
	}
	
	

	var axisGap = 45 * canvasSizeMultiplier;
	var legendGap = zlab == null ? 3 * canvasSizeMultiplier : 45 * canvasSizeMultiplier; // If there are multiple colours then need a legend
	var topGap = 3 * canvasSizeMultiplier;
	
	var canvas = $('#' + id)[0];
	if (canvas == null) return;
	



	var ctx = canvas.getContext('2d');
	ctx.globalAlpha = 1;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	var plotWidth = canvas.width - axisGap - legendGap;
	var plotHeight = canvas.height - axisGap - topGap;


	var widthScale = 1;
	var xlabPos = [];
	if (xvals != null && xvals.length > 0){
		var xResult = getNiceAxesNumbers(range[0], range[1], plotWidth);
		range[0] = xResult["min"]
		range[1] = xResult["max"]
		widthScale = xResult["widthOrHeightScale"]
		xlabPos = xResult["vals"]

		//console.log("xResult", xResult);
		
	}


	var heightScale = 1;
	var ylabPos = [];
	if (yvals != null && yvals.length > 0){
		var yResult = getNiceAxesNumbers(range[2], range[3], plotHeight, range[2] == 0, false);
		range[2] = yResult["min"]
		range[3] = yResult["max"]
		heightScale = yResult["widthOrHeightScale"]
		ylabPos = yResult["vals"]

		//console.log("xResult", xResult);
		
	}





	
	if (xvals != null && xvals.length > 0 && yvals != null && yvals.length > 0) {
		ctx.lineWidth = 3 * canvasSizeMultiplier;
	
		// X min and max
		var axisPointMargin = 4 * canvasSizeMultiplier;
		ctx.font = 10 * canvasSizeMultiplier + "px Arial";
		ctx.textBaseline="top"; 
		ctx.textAlign="center"; 
		var tickLength = 10 * canvasSizeMultiplier;
		ctx.lineWidth = 1 * canvasSizeMultiplier;

		for (var labelID = 0; labelID < xlabPos.length; labelID++){
			var x0 = widthScale * (xlabPos[labelID] - range[0]) + axisGap;
			ctx.fillText(xlabPos[labelID], x0, canvas.height - axisGap + axisPointMargin);

			// Draw a tick on the axis
			ctx.beginPath();
			ctx.moveTo(x0, canvas.height - axisGap - tickLength/2);
			ctx.lineTo(x0, canvas.height - axisGap + tickLength/2);
			ctx.stroke();
			
		}



		// Y min and max
		ctx.textBaseline="bottom"; 
		ctx.textAlign="center"; 

		ctx.save()
		ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
		ctx.rotate(-Math.PI/2);
		for (var labelID = 0; labelID < ylabPos.length; labelID++){
			var y0 = heightScale * (ylabPos[labelID] - range[2]);
			ctx.fillText(ylabPos[labelID], y0, 0);
			
			// Draw a tick on the axis
			ctx.beginPath();
			ctx.moveTo(y0, axisPointMargin - tickLength/2);
			ctx.lineTo(y0, axisPointMargin + tickLength/2);
			ctx.stroke();
			
			
		}
		ctx.restore();



		ctx.beginPath();
		ctx.setLineDash([])
		ctx.lineWidth = 3 * canvasSizeMultiplier;

		for (var valIndex = 0; valIndex < Math.min(xvals.length, yvals.length); valIndex ++){
			
		
			
			xPrime = widthScale * (xvals[valIndex] - range[0]) + axisGap;
			yPrime = plotHeight - heightScale * (yvals[valIndex] - range[2]) + topGap;
			
			if (xPrime < axisGap || xPrime > plotWidth + axisGap || yPrime > plotHeight + topGap|| yPrime < 0) continue; // Don't plot if out of range
			
			// Add circle
			ctx.beginPath();
			ctx.fillStyle = !$.isArray(col) ? col : col[valIndex]; // The colour may be a single value or a list corresponding to each point
			ctx.globalAlpha = 0.7;
			ctx_ellipse(ctx, xPrime, yPrime, 4 * canvasSizeMultiplier, 4 * canvasSizeMultiplier, 0, 0, 2 * Math.PI);
			ctx.fill();
			
		}
		

	
	
	}
	
	
	// X label
	ctx.globalAlpha = 1;
	ctx.textBaseline="top";
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - axisGap / 2;
	ctx.fillStyle = "black";
	//ctx.fillText(xlab, xlabXPos, xlabYPos);
	writeLatexLabelOnCanvas(ctx, xlab, xlabXPos, xlabYPos, 20 * canvasSizeMultiplier);

	
	// Y label
	ctx.textBaseline="bottom"; 
	var ylabXPos = 2 * axisGap / 3 - 5*canvasSizeMultiplier;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.save()
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillStyle = "black";
	//ctx.fillText(ylab, 0 ,0);
	writeLatexLabelOnCanvas(ctx, ylab, 0, 0, 20 * canvasSizeMultiplier);
	ctx.restore();


	// Z label colour legend
	if (zlab != null){

		// Add the z-axis label name
		ctx.textBaseline="bottom"; 
		var zlabXPos = axisGap + plotWidth + legendGap;
		var zlabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
		ctx.save()
		ctx.translate(zlabXPos, zlabYPos);
		ctx.rotate(-Math.PI/2);
		ctx.fillStyle = "black";
		writeLatexLabelOnCanvas(ctx, zlab, 0, 0, 16 * canvasSizeMultiplier);
		//ctx.fillText(zlab, 0 ,0);
		ctx.restore();


		// Draw the colour gradient (a ladder of filled rectangles on top of each other)
		if(colGradient != null){

			ctx.globalAlpha = 1;
			var colGradientList = getColourPalette(colGradient);
			var colourStepSize = 3 * canvasSizeMultiplier;
			var rectX = axisGap + plotWidth + 5*canvasSizeMultiplier;
			var rectHeight = 12*canvasSizeMultiplier;
			var rectY0 = zlabYPos + rectHeight*(colGradientList.length)/2 - rectHeight;
			var rectWidth = 23*canvasSizeMultiplier;
			ctx.strokeStyle = "black";



			// The ladder
			for (var colID = 0; colID < colGradientList.length; colID++){

				var rectY = rectY0 - colID*rectHeight;
				ctx.fillStyle = colGradientList[colID]; // Rectangle filling
				ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

			}


			if(range.length > 4){

				ctx.textBaseline="middle"; 
			

				// Z min and max above and below the ladder
				if (!isNaN(range[4])){
					ctx.font = 10 * canvasSizeMultiplier + "px Arial";
					var zminYPos = rectY0 + rectHeight + 2*canvasSizeMultiplier;
					ctx.textAlign="right";
					ctx.save()
					ctx.translate(rectX + rectWidth/2, zminYPos);
					ctx.rotate(-Math.PI/2);
					ctx.fillStyle = "black";
					ctx.fillText(range[4], 0 ,0);
					ctx.restore();
				}


				if (!isNaN(range[5])){
					var zmaxYPos = rectY0 - (colGradientList.length-1)*rectHeight - 2*canvasSizeMultiplier ;
					ctx.textAlign="left";
					ctx.save()
					ctx.translate(rectX + rectWidth/2, zmaxYPos);
					ctx.rotate(-Math.PI/2);
					ctx.fillStyle = "black";
					ctx.fillText(range[5], 0 ,0);
					ctx.restore();
				}

			}



		}




	}
	

	
	ctx.lineWidth = 3*canvasSizeMultiplier;
	
	// Axes
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width - legendGap, canvas.height - axisGap);
	ctx.stroke();
	
	
	

}


// Adds superscripts (^) and subscripts (_) to an xxis label. Does not handle nested super/subscripts. Does not handle latex math environment
function writeLatexLabelOnCanvas(ctx, label, xPos, yPos, fontSize){

	ctx.textAlign="center"; 
	ctx.font = fontSize + "px Arial";


	//console.log("label", label);

	// Go through string and add 1 thin space for each super/subscript
	var spaceFreeLabel = "";
	var lengthOfCurrentSubscript = 0;
	var lengthOfCurrentSuperscript = 0;
	var isSuperscript = false;
	var isSubscript = false;
	var scripts = []; // Record the text of each super/subscript and all the base level text before it
	for (var i = 0; i < label.length; i ++){


		

		if (label[i] == "^") {
			isSuperscript = true;
			scripts.push({pretext: spaceFreeLabel, scripttext: "", super: true});
		}

		else if (label[i] == "_") {
			isSubscript = true;
			scripts.push({pretext: spaceFreeLabel, scripttext: "", super: false});
		}

		else if (label[i] == "[" || label[i] == "{") continue;

		else if (label[i] == "]" || label[i] == "}"){
			isSuperscript = false;
			isSubscript = false;
		}


		else if (isSuperscript || isSubscript) {
			scripts[scripts.length-1].scripttext += label[i];
			if (isSuperscript) lengthOfCurrentSuperscript ++;
			if (isSubscript) lengthOfCurrentSubscript ++;
		}

		else {

			// Add one thin space for each super/subscript character (take max of 2 lengths)
			var nSpaces = Math.max(lengthOfCurrentSuperscript, lengthOfCurrentSubscript);
			for (var j = 0; j < nSpaces; j ++) spaceFreeLabel += "\u2009";
			lengthOfCurrentSuperscript = 0;
			lengthOfCurrentSubscript = 0;

			// Add on the current character
			spaceFreeLabel += label[i];
		}

	}


	// Calculate position of left side of text given that the label is centred
	var leftPos = xPos - ctx.measureText(spaceFreeLabel).width / 2;


	// Print the main text
	ctx.fillText(spaceFreeLabel, xPos, yPos);



	// Print the superscripts and subscripts
	ctx.textAlign="left";
	var dySuperscript = 0;
	var dySubscript = 0;
	if (ctx.textBaseline == "top") dySubscript = fontSize/2;
	else if (ctx.textBaseline == "bottom") dySuperscript = -fontSize/2;
	else if (ctx.textBaseline == "middle") {
		dySubscript = fontSize/4;
		dySuperscript = -fontSize/4;
	}

	for (var i = 0; i < scripts.length; i ++){

		ctx.font = fontSize + "px Arial";
		var leftPosOfScript = leftPos + ctx.measureText(scripts[i].pretext).width;
		ctx.font = Math.floor(fontSize/2) + "px Arial";
		if (scripts[i].super) ctx.fillText(scripts[i].scripttext, leftPosOfScript, yPos + dySuperscript);
		else ctx.fillText(scripts[i].scripttext, leftPosOfScript, yPos + dySubscript);

	}

}


function showSitewisePlot(setTo = null){

	if ((setTo != null && !setTo) || (setTo == null && $("#showSitewisePlot").val() == "-")){ // Hide the sitewise plot

		$("#showSitewisePlot").val("+");
		$("#plotDIV4").slideUp(100);
		showSitewisePlot_controller(true); // Inform the model that the sitewise plots is hidden so that it stops sending through data

	}else{	// Show the sitewise plot

		$("#showSitewisePlot").val("-");
		$("#plotDIV4").slideDown(100);
		showSitewisePlot_controller(false);

		drawPlots();
	}

}


function showPlots(setTo = null){

	if ((setTo != null && !setTo) || (setTo == null && $("#showPlots").val() == "-")){ // Hide the plots

		$("#showPlots").val("+");
		$("#plotsTableDIV").slideUp(100);
		showPlots_controller(true); // Inform the model that the plots are hidden so that it stops sending through data


	}else{	// Show the plots

		$("#showPlots").val("-");
		$("#plotsTableDIV").slideDown(100);
		showPlots_controller(false);

		drawPlots();
	}


}




function getDownloadPlotTemplate(){
	

	
	return `
		
				<table id="downloadPopup" plotNum="XX_plotNum_XX" cellpadding=10 style='width:90%; margin:auto; font-size: 18px;'>
				
				<tr>
						<td> 
								Download as
								<select class="dropdown" style="width:6em; font-size:14px; text-align:center" name="SelectDownload" id="SelectDownload">
									<option value="tsv">tsv</option>
									<option value="png">png</option>
								</select>
						</td>
						
						
						<td> 
								<input type=button class="button" onClick=downloadPlotInFormat() value='Download' title="Download plot in the selected format" style="width:100px; float:right"></input>
						</td>
						
					</tr>
					
				</table>

	
	
	`;
	
	
	
	
}


function closeDialogs(){
	

		$("#mySidenav").unbind('click');
		$("#main").unbind('click');
		$("#downloadPopup").remove();
		$("#main").css("opacity", 1);
		$("#mySidenav").css("opacity", 1);

}


function downloadPlot(plotNum){


	closeDialogs();
	openDialog();
	
	
	var popupHTML = getDialogTemplate("Download " + $("#selectPlot" + plotNum + " :selected").text(), "", "600px");
	$(popupHTML).appendTo('body');
	var innerHTML = getDownloadPlotTemplate();
	innerHTML = innerHTML.replace("XX_plotNum_XX", plotNum);
	
	$("#dialogBody").html(innerHTML);
	
	
	
	
	



}


function downloadPlotInFormat(){
	
	var downloadPopup = $("#downloadPopup");
	if (downloadPopup == null) return;
	
	var plotNum = parseFloat(downloadPopup.attr("plotNum"));
	var downloadFormat = $("#SelectDownload").val();
	
	closeDialogs();
	
	
	console.log("Format of plot", plotNum, "is", downloadFormat);
	
	// Download as tsv
	if (downloadFormat == "tsv"){
	
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "distanceVsTime") {
			download_distanceVsTimeTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "pauseHistogram") {
			download_pauseHistogramTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "velocityHistogram") {
			download_velocityHistogramTSV(plotNum);
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "insertPlot") {	
			download_insertHistogramTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "custom") {	
			download_customDataTSV(plotNum);
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "parameterHeatmap") {	
			download_heatmapDataTSV(plotNum);
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "pauseSite") {	
			download_pauseSiteTSV();
		}
		else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] == "misincorporationSite") {	
			download_misincorporationSiteTSV();
		}
		
	}
	
	// Download as png
	else if (downloadFormat == "png"){
		
		
		// Remove the temporary canvas if it already exists
		$("#plotDIV5").remove();
		
		
		// Create an invisible canvas with a large size
		console.log("making a canvas png");
		
		var canvasHTML = `
						<div class="scrollbar" id="plotDIV5"  style="display:none; height:170px; display:block; overflow-x:scroll; overflow-y:auto;  position:relative"> 
							<div id="plotCanvasContainer5"> 
								<canvas id="plotCanvas5" width="1px" height="1px"></canvas> 
							</div>
						</div>`;
		$("#main").after(canvasHTML);
		
		
		
		// Create a copy of the canvas pointer

		PLOT_DATA["whichPlotInWhichCanvas"][5] = JSON.parse(JSON.stringify(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]));
		PLOT_DATA["whichPlotInWhichCanvas"][5]["canvasSizeMultiplier"] = 4; // How much bigger is this canvas than the original?

		
		// Call the function which makes the plot (it will be saved to the temporary canvas)
		eval(PLOT_DATA["whichPlotInWhichCanvas"][5]["plotFunction"])();
		
		
		// Delete this pointer
		delete PLOT_DATA["whichPlotInWhichCanvas"][5];
		
		
		// Save the temporary canvas to a file
		var tempCanvas = document.getElementById("plotCanvas5"); 
		//var image = tempCanvas.toDataURL("image/png");


		tempCanvas.toBlob(function(blob) {
			saveAs(blob, PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["name"] + ".png");
		}, "image/png");
		
		
		// Delete the temporary canvas
		$("#plotDIV5").remove();
		
		
	}
	
	
	
}


// Allow user to select a base
function highlightBases(plotCanvasID){
	
	stop_controller();
	variableSelectionMode = true;
	
	$("#" + plotCanvasID).addClass("variable");
	
	// Set the opacity of the whole page to low
	$('select:not(.variable):visible').fadeTo("slow", "0.3");
	$('input:not(.variable):visible').fadeTo("slow", "0.3");
	$('canvas:not(.variable):visible').fadeTo("slow", "0.3");
	$('img:not(.variable):visible').fadeTo("slow", "0.3");
	
	// Disable all buttons
	$('input:not(.variable):visible').prop('disabled', true);
	$('select:not(.variable):visible').prop('disabled', true);
	$('image:not(.variable):visible').prop('disabled', true);
	
	$('img.variable').css('cursor', 'pointer');
	
	
	// Enable these buttons
	$('.variable').prop('disabled', false);
	
	
	// Add click event over all img variable tabs
	$("img.variable:not(select)").click(function(){
		stopHighlightingVariables(plotCanvasID);
		constrainCustomPlotToBase(plotCanvasID[plotCanvasID.length-1], $(this));
	});
	
	// Restore if click on this canvas
	$("#" + plotCanvasID).click(function(){
		stopHighlightingVariables(plotCanvasID);
	});
	
	
	
	
}

// Allow user to select a variable
function highlightVariables(plotCanvasID, axis){

	stop_controller();
	variableSelectionMode = true;
	
	
	// Set the opacity of the whole page to low
	$('select:not(.variable):visible').fadeTo("slow", "0.3");
	$('input:not(.variable):visible').fadeTo("slow", "0.3");
	$('canvas:not(.variable):visible').fadeTo("slow", "0.3");
	$('img').fadeTo("slow", "0.3");
	
	
	// Disable all buttons
	$('input:not(.variable):visible').prop('disabled', true);
	$('select:not(.variable):visible').prop('disabled', true);
	$('image:visible').prop('disabled', true);
	


	// Change the cursor symbol
	//$('body, html').css('cursor', 'url(src/Images/cursor.png), auto');
	
	
	// Set each appropriate button to full opacity and green color
	$('input.variable').addClass("variable-active");
	$('select.variable').addClass("variable-active");
	$("#SelectVariable").show(true);
	//$('input.variable').addClass("variable-cursor");
	//$('select.variable').addClass("variable-cursor");	
	//$('canvas.variable').addClass("variable-cursor");	
	//$('img.variable').addClass("variable-cursor");	
	

	// Enable these buttons
	$('.variable').prop('disabled', false);
	
	
	// Add click event over all variable tabs
	$(".variable:not(select):not(img)").click(function(){
		stopHighlightingVariables(plotCanvasID);
		setVariableToRecord(plotCanvasID[plotCanvasID.length-1], $(this), axis);
	});
	
	// Add onChange event over all dropdowns
	$("select.variable").change(function(){
		stopHighlightingVariables(plotCanvasID);
		setVariableToRecord(plotCanvasID[plotCanvasID.length-1], $(this), axis);
	});
	

	
	
}


function stopHighlightingVariables(plotCanvasID){


	variableSelectionMode = false;

	
	// Set the opacity of the whole page to normal
	$('select:not(.variable):visible').fadeTo("medium", "1");
	$('input:not(.variable):visible').fadeTo("medium", "1");
	$('canvas:not(.variable):visible').fadeTo("medium", "1");
	$('img:visible').fadeTo("medium", "1");
	
	
	// Enable the buttons
	$("select:visible").prop('disabled', false);
	$("input:visible").prop('disabled', false);
	$("#SelectVariable").hide(true);
	
	// Restore default cursor
	//$('body, html').css('cursor', 'auto');
	$('img.variable').css('cursor', 'auto');
	
	// Get rid of green colours
	$('input.variable').removeClass("variable-active");
	$('select.variable').removeClass("variable-active");
	//$('input.variable').removeClass("variable-cursor");
	//$('select.variable').removeClass("variable-cursor");	
	//$('canvas.variable').removeClass("variable-cursor");	
	//$('img.variable').removeClass("variable-cursor");	
	
	// Remove mouse events
	$(".variable").unbind('click');
	$(".variable").unbind('change');
	

		

}




// Plots values according to a function
function plot_probability_distribution(distn_fn, xmin, xmax, canvasID, xlab = ""){
	
	if ($("#" + canvasID).length == 0) return;

	// Delete the canvas and add it back later so it doesn't bug
	//$("#" + canvasID).remove();
	//$("#" + canvasDivID).html('<canvas id="' + canvasID + '"height="100" width="200"></canvas>');
	
	var canvas = $('#' + canvasID)[0];
	if (canvas == null) return;
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	
	//console.log("vals", values);
	
	
	// Tidy up the xmin and xmax
	xmin = roundToSF(xmin, 2, "none", true);
	xmax = roundToSF(xmax, 2, "none", true);
	
	if (xmin == xmax) xmax = xmin+1;

	
	var axisGap = 35;
	var binGap = 5;
	var maxNumBins = 16;
	textbox = "";
	
	ctx.globalAlpha = 1;


	
	var plotWidth = canvas.width - axisGap;
	var plotHeight = canvas.height - axisGap;
	var widthScale = plotWidth / (xmax - xmin);
	
	
	if (distn_fn != null){
	
		// Find the position of all the coords
		var xVals = [];
		var yVals = [];
		for (var xVal = axisGap; xVal <= canvas.width; xVal++) {	
		
			var x = (xVal - axisGap) / widthScale + xmin;
			var yval = distn_fn(x); // There may be more than one element returned
		
			//console.log("Plotting", x, yval);
			if (yval.length > 1){
				for (var i = 0; i < yval.length; i++){
					xVals.push(xVal);
					yVals.push(yval[i]);
				}
			}else{
				xVals.push(xVal);
				yVals.push(yval);
			}
		
		}
	
		//console.log("Values", xVals, yVals, xmin, xmax);
	

		
		var ymax = maximumFromList(yVals);  
		ymax = roundToSF(ymax * 1.1, 1, "none", true);
	
	
		var heightScale = plotHeight / ymax;
	
		ctx.beginPath();
		//ctx.lineWidth = 1;
		ctx.fillStyle = "#008CBA";
		ctx.strokeStyle = "#008CBA";
		ctx.moveTo(axisGap, plotHeight);
		for (var i = 0; i < yVals.length; i ++){
			ctx.lineTo(xVals[i], plotHeight - yVals[i] * heightScale);
		}
		
		ctx.lineTo(canvas.width, plotHeight);
		ctx.fill();
		ctx.stroke();
	
	}else ymax = 1;
	
	
	
	// Axes
	ctx.lineWidth = 2;
	ctx.strokeStyle = "black";
	ctx.beginPath();
	ctx.moveTo(axisGap, 0);
	ctx.lineTo(axisGap, canvas.height - axisGap);
	ctx.lineTo(canvas.width, canvas.height - axisGap);
	ctx.stroke();
	
	
	// X label
	ctx.fillStyle = "black";
	ctx.font = "13px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="top"; 
	var xlabXPos = (canvas.width - axisGap) / 2 + axisGap;
	var xlabYPos = canvas.height - 0.65*axisGap;
	//ctx.fillText(xlab, xlabXPos, xlabYPos);
	writeLatexLabelOnCanvas(ctx, xlab, xlabXPos, xlabYPos, 20);
	
	// Y label
	ctx.font = "14px Arial";
	ctx.textAlign="center"; 
	ctx.textBaseline="bottom"; 
	ctx.save()
	var ylabXPos = 2 * axisGap / 5;
	var ylabYPos = canvas.height - (canvas.height - axisGap) / 2 - axisGap;
	ctx.translate(ylabXPos, ylabYPos);
	ctx.rotate(-Math.PI/2);
	ctx.fillText("Probability density", 0 ,0);
	ctx.restore();
	
	
	
	// X min and max
	var axisPointMargin = 1;
	ctx.font = "12px Arial";
	ctx.textBaseline="top"; 
	ctx.textAlign="left"; 
	ctx.fillText(xmin, axisGap, canvas.height - axisGap + 3 * axisPointMargin);
	ctx.textAlign="right"; 
	ctx.fillText(xmax, canvas.width, canvas.height - axisGap + 3 * axisPointMargin);




	// Y min and max
	ctx.save()
	ctx.font = "12px Arial";
	ctx.textBaseline="bottom"; 
	ctx.textAlign="right"; 
	ctx.translate(axisGap - axisPointMargin, canvas.height - axisGap);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(0, 0, 0);
	ctx.restore();

	ctx.save()
	ctx.font = "12px Arial";
	ctx.textAlign="right"; 
	ctx.textBaseline="bottom"; 
	ctx.translate(axisGap - axisPointMargin, 0);
	ctx.rotate(-Math.PI/2);
	ctx.fillText(ymax, 0, 0);
	ctx.restore();



}


function roundToSF(val, sf=2, ceilOrFloor = "none", precise = true){
	
	var magnitude = Math.floor(log(val, 10));

	if (val < 0 && ceilOrFloor == "ceil") ceilOrFloor = "floor";
	else if (val < 0 && ceilOrFloor == "floor") ceilOrFloor = "ceil";

	var num = val * tenToThePowerOf(sf-magnitude, precise);
	if (ceilOrFloor == "ceil") num = Math.ceil(num)
	else if (ceilOrFloor == "floor") num = Math.floor(num)
	else num = Math.round(num);

	num = num * tenToThePowerOf(magnitude-sf, precise);
	
	// Sometimes this picks up a trailing .00000000001 which we want to remove

	var expectedStringLength = 0;
	if (magnitude >= 0) expectedStringLength = magnitude >= sf ? magnitude+1 : sf+2; // Add 1 for the decimal point
	else expectedStringLength = 2 -magnitude + sf;
	if (num < 0) expectedStringLength++; // Also need the negative symbol



	num = parseFloat(num.toString().substring(0, expectedStringLength+1));
	
	return num;
		
}


// Compute 10^n without using Math.pow for negative n which presents numerical instabilities
function tenToThePowerOf(n, precise = false){

	if (!precise) return Math.pow(10, n);

	if (n == Infinity || n == -Infinity) return n;

	if (n == 0) return 1;
	var val = "1";
	if (n < 0) {
	
	
		for (var index = -1; index > n; index --){
			val = "0" + val;
		}
		val = "." + val;
	}

	else if (n > 0) {
		return Math.pow(10, n);

	}
	else {
		return 1;
	}
	//console.log(n, "->", parseFloat(val));
	return parseFloat(val);


}





function getPlotOptionsTemplate(){


	return `
		
				<table  id='settingsPopup' cellpadding=10 style='width:90%; margin:auto;' plotNum="XX_plotNum_XX">
				
					<tr>
						<td id="settingCell1" style="vertical-align:top"> 
							
						</td>
						
						<td id="settingCell2" style="vertical-align:top"> 
							
						</td>
					</tr>
					<tr>
						<td id="settingCell3" style="vertical-align:top"> 
							
						</td>
						
						
						<td id="settingCell4" style="vertical-align:top"> 
							
						</td>
					</tr>
					<tr>
						<td id="settingCell5" style="vertical-align:top"> 
							
						</td>
						
						
						<td id="settingCell6" style="vertical-align:top"> 
							
						</td>
					</tr>
					<tr>
						<td id="settingCell7" style="vertical-align:top"> 
							
						</td>
						
						
						<td id="settingCell8" style="vertical-align:top"> 
							
						</td>
					</tr>
					
				</table>

				<span style="float:right">
					<input type=button id='deleteDistn' class="button" onClick="deletePlots_controller(false, false, false, true, false, false, function() { saveSettings_controller(); });" value='Delete Data and Save' title="You must delete all parameter plot data before you save these settings (because you added a site-specific time recording)" style="display:none"></input>
					<input type=button id='submitDistn' class="button" onClick="saveSettings_controller()" value='Save' title="Submit your changes"></input>
				</span>

	`;

}



function distanceVsTimeOptionsTemplate1(){
	
	return `
		<legend><b>Time range</b></legend>
			<table>
				<tr style="cursor:pointer" onclick= " $('input[name=xRange][value=automaticX]').prop('checked', true); disableTextbox('#xMin_textbox'); disableTextbox('#xMax_textbox') ">
					<td>
						 <input type="radio" name="xRange" value="automaticX"> 
					</td>
					<td>Auto</td>
					<td></td>
				</tr>
				

				
				
			<tr style="cursor:pointer" onclick= " $('input[name=xRange][value=specifyX]').prop('checked', true); enableTextbox('#xMin_textbox'); enableTextbox('#xMax_textbox') ">
				<td>
					<input class="textboxBlue" type="radio" name="xRange" onclick="enableTextbox('#xMin_textbox'); enableTextbox('#xMax_textbox')"  value="specifyX">
				</td>
				<td>
					Min = 
				</td>
				<td>
					<input class="textboxBlue" type="number" style="width:5em; text-align:right" id="xMin_textbox" value = 0> XUNITS 
				</td>
			</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=xRange][value=specifyX]').prop('checked', true); enableTextbox('#xMin_textbox'); enableTextbox('#xMax_textbox') ">
				<td></td>
				<td>
					Max = 
				</td>
				<td>
					<input class="textboxBlue" type="number" style="width:5em; text-align:right" id="xMax_textbox" value = 1> XUNITS 
				</td>
			</tr>
		</table>
	`;
	
}


function distanceVsTimeOptionsTemplate2(){
	
	return `
		<legend><b>Distance range</b></legend>
		<table>
				<tr style="cursor:pointer" onclick= " $('input[name=yRange][value=automaticY]').prop('checked', true); disableTextbox('#yMin_textbox'); disableTextbox('#yMax_textbox') ">
					<td>
						 <input type="radio" name="yRange" value="automaticY"> 
					</td>
					<td>Auto</td>
					<td></td>
				</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=yRange][value=specifyY]').prop('checked', true); enableTextbox('#yMin_textbox'); enableTextbox('#yMax_textbox') ">
				<td>
					<input type="radio" name="yRange" onclick="enableTextbox('#yMin_textbox'); enableTextbox('#yMax_textbox')"  value="specifyY">
				</td>
				<td>
					Min = 
				</td>
				<td>
					<input class="textboxBlue" type="number" style="width:5em; text-align:right" id="yMin_textbox" value=YMINDEFAULT> YUNITS 
				</td>
			</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=yRange][value=specifyY]').prop('checked', true); enableTextbox('#yMin_textbox'); enableTextbox('#yMax_textbox') ">
				<td></td>
				<td>
					Max = 
				</td>
				<td>
					<input class="textboxBlue" type="number" style="width:5em; text-align:right" id="yMax_textbox" value=YMAXDEFAULT> YUNITS 
				</td>
			</tr>
		</table>
	`;
	
}





function distanceVsTimeOptionsTemplate3(){
	
	return `
		<legend><b>Z-axis range</b></legend>
		<table>
				<tr style="cursor:pointer" onclick= " $('input[name=zRange][value=automaticZ]').prop('checked', true); disableTextbox('#zMin_textbox'); disableTextbox('#zMax_textbox') ">
					<td>
						 <input type="radio" name="zRange" value="automaticZ"> 
					</td>
					<td>Auto</td>
					<td></td>
				</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=zRange][value=specifyZ]').prop('checked', true); enableTextbox('#zMin_textbox'); enableTextbox('#zMax_textbox') ">
				<td>
					<input type="radio" name="zRange" onclick="enableTextbox('#zMin_textbox'); enableTextbox('#zMax_textbox')"  value="specifyZ">
				</td>
				<td>
					Min = 
				</td>
				<td>
					<input class="textboxBlue" type="number" style="width:5em; text-align:right" id="zMin_textbox" value=ZMINDEFAULT> 
				</td>
			</tr>
			<tr style="cursor:pointer" onclick= " $('input[name=zRange][value=specifyZ]').prop('checked', true); enableTextbox('#zMin_textbox'); enableTextbox('#zMax_textbox') ">
				<td></td>
				<td>
					Max = 
				</td>
				<td>
					<input class="textboxBlue" type="number" style="width:5em; text-align:right" id="zMax_textbox" value=ZMAXDEFAULT> 
				</td>
			</tr>
		</table>
	`;
	
}




function heatmapZAxisLegend(){
	
	return `
		<legend><b>Point Colour</b></legend> 
		<select class="dropdown" title="Select the colour of the points in this plot" id = "zColouring" style="width:200px; vertical-align: middle; text-align:left;">
			<option value="blue">Blue</option>
			<option value="rainbow">Rainbow</option>
			<option value="greyBlack">Grey-black</option>
			<option value="yellowRed">Yellow-red</option>
			<option value="purpleYellow">Purple-yellow</option>
		</select>
	`;
	
}




function pauseHistogramOptionsTemplate(){
	
	return `
		<legend><b>Measure time taken</b></legend>
		<label style="cursor:pointer"> <input type="radio" onclick="perTemplateDeselected()" name="perTime" value="perCatalysis">To catalyse<br> </label>
		<label style="cursor:pointer"> <input type="radio" onclick="perTemplateSelected()"   name="perTime" value="perTemplate">To copy the template <br> </label>
	`;
	
}


function logSpaceTemplateX(){
	
	return `
		<legend><b>X-axis</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceX" value="linearSpace">Time (s)<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceX" value="logSpace">log time(s)<br> </label>
	`;
	
}


function logSpaceTemplateY(){
	
	return `
		<legend><b>Y-axis</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceY" value="linearSpace">Probability<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="timeSpaceY" value="logSpace">log Probability<br> </label>
	`;
	
}






function windowSizeOptionsTemplate(){
	
	return `
		<b>Window size</b>  <input id="windowSizeInput" type="number" class="textboxBlue" style="width:5em; text-align:right"></input>s.
	`;
	
}



function pauseSiteYVariableTemplate(){

	return `
		<legend><b>Variable (y-axis)</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="pauseSiteYVariable" value="catalysisTimes">Time to catalysis<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="pauseSiteYVariable" value="dwellTimes">Time spent at site<br> </label>
        <label style="cursor:pointer"> <input type="radio" name="pauseSiteYVariable" value="timePerTranscriptLength">Time per transcript length<br> </label>


	`;

}


function priorDistributionUnderlayTemplate(){

	return `
		<div">
			<div id="priorDistributionUnderlayDIV" style="display:none">
				<label style="cursor:pointer; line-height:22px"  title = "Plot the prior density of this parameter under the histogram."> 
					<input class="variable"  type="checkbox" onChange="userChangeModelSampling_controller()" id="priorUnderlayChk"></input> 
					Show prior distribution
				</label>
			</div>
		<div>
	`;

}


function pauseSiteOptionsTemplate(){

	return `
		<legend><b>Units</b></legend>
		<label style="cursor:pointer"> <input type="radio" name="Yaxis" value="timePercentage">Time (%)<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="Yaxis" value="timeSeconds">Time (s)<br> </label>
		<label style="cursor:pointer"> <input type="radio" name="Yaxis" value="logTimeSeconds">log time(s)<br> </label>
	`;

}







function parameterPlotSiteSpecificTemplate(varID){

	return `
		<div id="sitesToRecord_div` + varID + `" style="width:100%; display:none">
			<br>
			<legend>Constrain to the following sites:</legend>
			<label style="cursor:pointer"> <input type="radio" name="sitesToRecord` + varID + `" onChange="updateParameterPlotSettings()" onclick="disableTextbox('#sitesToRecord_textbox` + varID + `')" value="allSites">All sites<br> </label>
			<label style="cursor:pointer"  title="Enabling this will mean that only the specified template positions will be displayed in the plot. You may need to run the simulations again to acquire this data."> <input onChange="updateParameterPlotSettings()" type="radio" name="sitesToRecord` + varID + `" onclick="enableTextbox('#sitesToRecord_textbox` + varID + `')"  value="specifySites">Just these ones: 
				&nbsp;&nbsp;<input onfocusout="updateParameterPlotSettings()" onclick="updateParameterPlotSettings(true);" type="text" placeholder="eg. 10,13,20-30" style="width:15em; padding: 5 5" id="sitesToRecord_textbox` + varID + `"> </label>
		</div>
	`;


}


function customPlotSelectParameterTemplate(){
	
	return `
		<legend><b>Variable (x-axis)</b></legend>
		<select class="dropdown" onChange="updateParameterPlotSettings()" title="What do you want to show on the x-axis?" id = "customParamX" style="vertical-align: middle; text-align:right;">
			<option value="none">Select a variable...</option>
			
			<optgroup label="Measurements">
				<option value="velocity" style="color:white">Mean velocity (bp/s)</option>
				<option value="catalyTime" style="color:white">Mean catalysis time (s)</option>
				<option value="totalTime" style="color:white">Mean transcription time (s)</option>
				<option value="nascentLen" style="color:white">Nascent strand length (nt)</option>
			</optgroup>
			
			<optgroup label="Parameters" id="customParamX_params">
			
			</optgroup>
			
			
		</select><br>
		Calculated per trial.


		` + parameterPlotSiteSpecificTemplate("X") + priorDistributionUnderlayTemplate() + `

	`;
	
}


function customPlotSelectPropertyTemplate(){
	
	return `
		<legend><b>Variable (y-axis)</b></legend>
		<select class="dropdown" onChange="updateParameterPlotSettings()" title="What do you want to show on the y-axis?" id = "customParamY" style="vertical-align: middle; text-align:right;">
			<option value="probability">Probability</option>

			
			<optgroup label="Measurements">
				<option value="velocity" style="color:white">Mean velocity (bp/s)</option>
				<option value="catalyTime" style="color:white">Mean catalysis time (s)</option>
				<option value="totalTime" style="color:white">Mean transcription time (s)</option>
				<option value="nascentLen" style="color:white">Nascent strand length (nt)</option>
			</optgroup>
			
			<optgroup label="Parameters" id="customParamY_params">
			
			</optgroup>
			
			
		</select><br>
		Calculated per trial.

		` + parameterPlotSiteSpecificTemplate("Y") + `

	`;
	
}


function parameterHeatmapZAxisTemplate(){

	return `
		<legend><b>Variable (z-axis)</b></legend>
		<select class="dropdown" onChange="updateParameterPlotSettings()" title="What do you want to show on the z-axis?" id = "customParamZ" style="vertical-align: middle; text-align:right;">
			<option value="none">Select a variable...</option>

			<optgroup label="Measurements">
				<option value="velocity" style="color:white">Mean velocity (bp/s)</option>
				<option value="catalyTime" style="color:white">Mean catalysis time (s)</option>
				<option value="totalTime" style="color:white">Mean transcription time (s)</option>
				<option value="nascentLen" style="color:white">Nascent strand length (nt)</option>
			</optgroup>
			
			<optgroup label="Parameters" id="customParamZ_params">
			
			</optgroup>
			
		</select><br>
		Calculated per trial.

		` + parameterPlotSiteSpecificTemplate("Z") + `
	`;


}



function getTracePlotDropdownTemplate(){
	
	return `
		<legend><b>Y-axis variable</b></legend>
		<select class="dropdown" title="What do you want to show on the y-axis?" id = "traceVariableY" style="vertical-align: middle; text-align:right;">
		</select><br>
		Calculated per trial.
        
        <div>
            <div id="exponentialDecayChkDIV">
                <label style="cursor:pointer; line-height:22px"  title = "Plot the exponentially decaying value of &epsilon; behind X<sup>2</sup>."> 
                    <input class="variable"  type="checkbox" onChange="userChangeModelSampling_controller()" id="exponentialDecayChk"></input> 
                    Show &epsilon;
                </label>
            </div>
        <div>
	`;
	
}


function selectPosteriorDistributionTemplate(){
	
	return `
		<legend><b>Posterior distribution</b></legend>
		<select class="dropdown" title="Which posterior distribution do you want to display?" id="selectPosteriorDistn" onChange="changePosteriorDistribution()" style="vertical-align: middle; text-align:right; min-width: 100px">
		</select><br>
	`;
	
}


function getPosteriorCheckboxTemplate(){

	return `

		<legend><b>Data to plot:</b></legend>
		<select class="dropdown" title="Which data do you want to display?" id="selectPosteriorDistn" style="vertical-align: middle; text-align:right; min-width: 120px">
			<option value="-1" style="color:white">SimPol simulations</option>
		</select><br>
		
		
	`;


}


// Decrease the indices of the sites displayed in the long sitewise plot by 100
function minus100Sites(){

	if (basesToDisplayTimes100 == 1) return;
	basesToDisplayTimes100--;
	eval(PLOT_DATA["whichPlotInWhichCanvas"][4]["plotFunction"])(); // Draw the plot again

}


// Increase the indices of the sites displayed in the long sitewise plot by 100
function plus100Sites(){


	var max = Math.ceil(PLOT_DATA["nbases"] / 100);
	//if (PLOT_DATA["nbases"] % 100 <= 20) max--;
	if (basesToDisplayTimes100 == max) return;
	basesToDisplayTimes100++;
	eval(PLOT_DATA["whichPlotInWhichCanvas"][4]["plotFunction"])(); // Draw the plot again

}



function updateParameterPlotSettings(forceDeleteDistnToShow = false){


	// Only show the y-axis selection box when the x-axis variable has been selected 
	if ($("#customParamX").val() != "none"){
		$("#settingCell3").show(300);


		// Only show the z-axis selection box when the y-axis variable has been selected and is not 'probability'
		if ($("#customParamY").val() != "probability"){
			$("#settingCell4").show(300)
			$("#settingCell5").show(300);
			$("#priorDistributionUnderlayDIV").hide(0);

			// Only show the colour selection box when the z-axis variable has been selected
			if ($("#customParamZ").val() != "none"){
				$("#settingCell6").show(300);
				$("#settingCell7").show(300);
			}else{
				$("#settingCell6").hide(0);
				$("#settingCell7").hide(0);
			}

		}
		else{

			$("#settingCell4").hide(0);
			$("#settingCell5").hide(0);
			$("#settingCell6").hide(0);
			$("#settingCell7").hide(0);

			// Show the 'prior underlay' option
			var xVal = $("#customParamX").val();
			if (xVal != "velocity" && xVal != "catalyTime" && xVal != "totalTime" && xVal != "nascentLen") $("#priorDistributionUnderlayDIV").show(300);
			else $("#priorDistributionUnderlayDIV").hide(0);



		}


	}else{
		$("#settingCell3").hide(0);
		$("#settingCell4").hide(0);
		$("#settingCell5").hide(0);
		$("#settingCell6").hide(0);
		$("#settingCell7").hide(0);
		$("#priorDistributionUnderlayDIV").hide(0);
	}




	// Show the sites to record textbox if transcription time or catalysis time have been selected
	if ($("#customParamX").val() == "catalyTime") $("#sitesToRecord_divX").show(300);
	else $("#sitesToRecord_divX").hide(0);

	if ($("#customParamY").val() == "catalyTime") $("#sitesToRecord_divY").show(300);
	else $("#sitesToRecord_divY").hide(0);

	if ($("#customParamZ").val() == "catalyTime") $("#sitesToRecord_divZ").show(300);
	else $("#sitesToRecord_divZ").hide(0);


	// Grey out the submit button and show the delete button if the sites to record are new / different

	var xSiteRecordingUnchanged = ($("#sitesToRecord_textboxX").attr("oldvals") == null && $('input[name="sitesToRecordX"][value="allSites"]').prop("checked"))
								|| ($('input[name="sitesToRecordX"][value="specifySites"]').prop("checked") && $("#sitesToRecord_textboxX").val() == $("#sitesToRecord_textboxX").attr("oldvals"));
	
	var ySiteRecordingUnchanged = ($("#sitesToRecord_textboxY").attr("oldvals") == null && $('input[name="sitesToRecordY"][value="allSites"]').prop("checked"))
								|| ($('input[name="sitesToRecordY"][value="specifySites"]').prop("checked") && $("#sitesToRecord_textboxY").val() == $("#sitesToRecord_textboxY").attr("oldvals"));

	var zSiteRecordingUnchanged = ($("#sitesToRecord_textboxZ").attr("oldvals") == null && $('input[name="sitesToRecordZ"][value="allSites"]').prop("checked"))
								|| ($('input[name="sitesToRecordZ"][value="specifySites"]').prop("checked") && $("#sitesToRecord_textboxZ").val() == $("#sitesToRecord_textboxZ").attr("oldvals"));
	
	if (forceDeleteDistnToShow || !xSiteRecordingUnchanged || !ySiteRecordingUnchanged || !zSiteRecordingUnchanged){// || ySiteRecordingHasChanged || zSiteRecordingHasChanged){
		$("#deleteDistn").show(300);
		$("#submitDistn").hide(300);
	}else{
		$("#deleteDistn").hide(300);
		$("#submitDistn").show(300);
	}
	

}



function plotOptions(plotNum){


	
	closeDialogs();
	openDialog();
	
	
	var popupHTML = getDialogTemplate($("#selectPlot" + plotNum + " :selected").text() + " settings", "Choose the display settings for this plot", "600px");
		
	$(popupHTML).appendTo('body');
	
	
	var innerHTML = getPlotOptionsTemplate();

	innerHTML = innerHTML.replace("XX_plotNum_XX", plotNum);
	
	$("#dialogBody").html(innerHTML);

	switch($("#selectPlot" + plotNum).val()){
		

		case "distanceVsTime":

			console.log("PLOT_DATA", PLOT_DATA);

			$("#settingCell1").html(distanceVsTimeOptionsTemplate1().replace("XUNITS", "s").replace("XUNITS", "s"));
			$("#settingCell2").html(distanceVsTimeOptionsTemplate2().replace("YUNITS", "nt").replace("YUNITS", "nt").replace("YMINDEFAULT", 10).replace("YMAXDEFAULT", 100));


			console.log('PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"]', PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"]);

			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}

			// Set ymax and ymin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"] == "automaticY") $('input[name="yRange"][value="automaticY"]').click()
			else {
				$('input[name="yRange"][value="specifyY"]').click()
				$("#yMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][0]);
				$("#yMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][1]);
			}

			break;

		case "pauseHistogram":

			$("#settingCell3").html(distanceVsTimeOptionsTemplate1().replace("XUNITS", "s").replace("XUNITS", "s"));
			$("#settingCell1").html(pauseHistogramOptionsTemplate());
			//$("#settingCell2").html(logSpaceTemplateX());
			//$("#settingCell4").html(logSpaceTemplateY());

			// Per site or per template
			$('input[name="perTime"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["perTime"] + '"]').prop('checked', true);
			$('input[name="perTime"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["perTime"] + '"]').click();


			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click();
			else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "pauseX") $('input[name="xRange"][value="pauseX"]').click();
			else if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "shortPauseX") $('input[name="xRange"][value="shortPauseX"]').click();
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}


			// Log space or linear space
			$('input[name="timeSpaceX"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceX"] + '"]').prop('checked', true);
			$('input[name="timeSpaceY"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceY"] + '"]').prop('checked', true);


			break;


		case "velocityHistogram":


			$("#settingCell1").html(distanceVsTimeOptionsTemplate1().replace("Time range", "Velocity range").replace("XUNITS", "s").replace("XUNITS", "s"));
			$("#settingCell2").html(windowSizeOptionsTemplate());
			//$("#settingCell3").html(logSpaceTemplateX());
			//$("#settingCell4").html(logSpaceTemplateY());
			

			// Window size
			$("#windowSizeInput").val(roundToSF(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["windowSize"] ));

			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}


			// Log space or linear space
			$('input[name="timeSpaceX"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceX"] + '"]').prop('checked', true)
			$('input[name="timeSpaceY"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["timeSpaceY"] + '"]').prop('checked', true)


			break;
		
		
		case "pauseSite":

			
			$("#settingCell1").html(pauseSiteYVariableTemplate());
			$("#settingCell2").html(pauseSiteOptionsTemplate());

			$('input[name="pauseSiteYVariable"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["pauseSiteYVariable"] + '"]').prop('checked', true)
			$('input[name="Yaxis"][value="' + PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yAxis"] + '"]').prop('checked', true)
			break;


		
		case "parameterHeatmap": 
			

			// If sampling from posterior then only have parameters which are being estimated in the dropdown
			$("#settingCell8").html(getPosteriorCheckboxTemplate());
			$("#selectPosteriorDistn").attr("onChange", "populateHeatmapSettingsParameterDropdowns(" + plotNum + ")");
            
            
            // Add some loaders
            $("#settingCell1").html(getLoaderTemplate("settingsLoader", "Loading parameters...", false));


			getPosteriorDistributionNames(function(posteriorNames){

				for (var p in posteriorNames){
                    $("#selectPosteriorDistn").append(`<option value="` + p + `" > ` + posteriorNames[p] + `</option>`);
                }
                

                console.log("selectedPosteriorID", PLOT_DATA["whichPlotInWhichCanvas"][plotNum]);

				populateHeatmapSettingsParameterDropdowns(plotNum, true);
			});


			break;
			
			
			
		case "tracePlot":
		

			console.log("TP", PLOT_DATA["whichPlotInWhichCanvas"][plotNum]);

            
            $("#settingCell4").html(getLoaderTemplate("settingsLoader", "Loading...", false));
            
            
			
            
            
			
			getPosteriorDistributionNames(function(posteriorNames){
            
                // Create a dropdown list which contains all the posterior distributions to choose from
                $("#settingCell3").html(selectPosteriorDistributionTemplate());
                
                
				for (var p in posteriorNames){
					$("#selectPosteriorDistn").append(`<option value="` + p + `" > ` + posteriorNames[p] + `</option>`);
				}
				$("#selectPosteriorDistn").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum].selectedPosteriorID);
				changePosteriorDistribution();
			});

		
		
			$("#settingCell1").html(distanceVsTimeOptionsTemplate1().replace("Time range", "Trace range").replace("XUNITS", "").replace("XUNITS", "").replace('value="1"', 'value="1000"'));
			$("#settingCell2").html(distanceVsTimeOptionsTemplate2().replace("Distance range", "Y-axis range").replace("YUNITS", "").replace("YUNITS", "").replace("YMINDEFAULT", 0).replace("YMAXDEFAULT", 100));

			// Set xmax and xmin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
			else {
				$('input[name="xRange"][value="specifyX"]').click()
				$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
				$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
			}

			// Set ymax and ymin
			if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"] == "automaticY") $('input[name="yRange"][value="automaticY"]').click()
			else {
				$('input[name="yRange"][value="specifyY"]').click()
				$("#yMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][0]);
				$("#yMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][1]);
			}
			
            
            
           
			break;



	}




}



// Posterior distribution has been selected / changed. Now we need to populate the variables dropdown list
function changePosteriorDistribution(){



	var posteriorID = $("#selectPosteriorDistn").val();
	var plotNum = $("#settingsPopup").attr("plotNum");

	console.log("changePosteriorDistribution to", posteriorID, "for plot", plotNum);
	
    

	if (posteriorID == null) return;


	posteriorID = parseFloat(posteriorID);

	getParametersInPosteriorDistribution(posteriorID, function(params){
    
    
        // Create a dropdown list which contains all the parameters sampled in the prior
        $("#settingCell4").html(getTracePlotDropdownTemplate().replace("Calculated per trial.", ""));

		//$("#traceVariableY").html("");

		for (var paramID in params){
			$("#traceVariableY").append(`<option value="` + paramID + `" > ` + params[paramID].name + `</option>`);
		}
		$("#traceVariableY").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum].customParamY);
        
         // Exponential decay?
        console.log("exponentialDecayChk", PLOT_DATA["whichPlotInWhichCanvas"]);
        $("#exponentialDecayChk").prop('checked', (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["exponentialDecay"]));
        

	});


}


function populateHeatmapSettingsParameterDropdowns(plotNum, posteriorFromModel = false){





	var posteriorID = posteriorFromModel ? PLOT_DATA["whichPlotInWhichCanvas"][plotNum].selectedPosteriorID : $("#selectPosteriorDistn").val();

	// var functionToGetParameters = usingPosterior ? function(resolve) { get_ParametersWithPriors_controller(resolve) } : function(resolve) { get_PHYSICAL_PARAMETERS_controller(resolve) };
    console.log("posteriorID", posteriorID);
    

	getParametersInPosteriorDistribution(posteriorID, function(params){
    
        $("#selectPosteriorDistn").val(posteriorID); // PLOT_DATA["whichPlotInWhichCanvas"][plotNum].selectedPosteriorID);
    
        // X-axis parameter
        $("#settingCell1").html(customPlotSelectParameterTemplate());
        $("#settingCell3").html(customPlotSelectPropertyTemplate());
        $("#settingCell5").html(parameterHeatmapZAxisTemplate());
        
        
        if (posteriorID != -1){
            $('optgroup[label="Measurements"').remove();
        }
    
    
		console.log("params",params, params.length);
		for (var paramID in params){
			if ((posteriorID > -1 || !params[paramID]["hidden"]) && !params[paramID]["binary"] && params[paramID].name != null) {
				$("#customParamX_params").append(`<option value="` + paramID + `" style="color:white"> ` + params[paramID]["name"] + `</option>`);
				$("#customParamY_params").append(`<option value="` + paramID + `" style="color:white"> ` + params[paramID]["name"] + `</option>`);
				$("#customParamZ_params").append(`<option value="` + paramID + `" style="color:white"> ` + params[paramID]["name"] + `</option>`);
			}
		}

		$("#customParamX").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamX"]);
		$("#customParamY").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["customParamY"]);
		$("#customParamZ").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["metricZ"]);
		//updateParameterPlotSettings();


		// Z-axis
		$("#settingCell6").html(distanceVsTimeOptionsTemplate3().replace("ZMINDEFAULT", 0).replace("ZMAXDEFAULT", 1));


		// Z axis colouring
		$("#settingCell7").html(heatmapZAxisLegend());
		$("#zColouring").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zColouring"]);


		// Prior underlay
		$("#priorUnderlayChk").prop('checked', (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["priorUnderlay"]));
        

		// Y-axis attribute
		$("#settingCell2").html(distanceVsTimeOptionsTemplate1().replace("Time range", "X-axis range").replace("XUNITS", "").replace("XUNITS", ""));
		$("#settingCell4").html(distanceVsTimeOptionsTemplate2().replace("Distance range", "Y-axis range").replace("YUNITS", "").replace("YUNITS", "").replace("YMINDEFAULT", 0).replace("YMAXDEFAULT", 1));


		// Set xmax and xmin
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"] == "automaticX") $('input[name="xRange"][value="automaticX"]').click()
		else {
			$('input[name="xRange"][value="specifyX"]').click()
			$("#xMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][0]);
			$("#xMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["xRange"][1]);
		}


		// Set ymax and ymin
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"] == "automaticY") $('input[name="yRange"][value="automaticY"]').click()
		else {
			$('input[name="yRange"][value="specifyY"]').click()
			$("#yMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][0]);
			$("#yMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["yRange"][1]);
		}



		// Set zmax and zmin
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zRange"] == "automaticZ") $('input[name="zRange"][value="automaticZ"]').click()
		else {
			$('input[name="zRange"][value="specifyZ"]').click()
			$("#zMin_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zRange"][0]);
			$("#zMax_textbox").val(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["zRange"][1]);
		}


		// Site specific constraints. Set the html attr 'oldvals' to what it was when the settings dialog loaded
		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecordX"] == "allSites") $('input[name="sitesToRecordX"][value="allSites"]').click();
		else {
			$('input[name="sitesToRecordX"][value="specifySites"]').click();
			var recordingString = convertListToCommaString(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecordX"])
			$("#sitesToRecord_textboxX").val(recordingString);
			$("#sitesToRecord_textboxX").attr("oldvals", recordingString);
		}

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecordY"] == "allSites") $('input[name="sitesToRecordY"][value="allSites"]').click();
		else {
			$('input[name="sitesToRecordY"][value="specifySites"]').click();
			var recordingString = convertListToCommaString(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecordY"])
			$("#sitesToRecord_textboxY").val(recordingString);
			$("#sitesToRecord_textboxY").attr("oldvals", recordingString);
		}

		if (PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecordZ"] == "allSites") $('input[name="sitesToRecordZ"][value="allSites"]').click();
		else {
			$('input[name="sitesToRecordZ"][value="specifySites"]').click();
			var recordingString = convertListToCommaString(PLOT_DATA["whichPlotInWhichCanvas"][plotNum]["sitesToRecordZ"])
			$("#sitesToRecord_textboxZ").val(recordingString);
			$("#sitesToRecord_textboxZ").attr("oldvals", recordingString);
		}


	});


}


// If the perTemplate option is selected from the time histogram settings menu, then we hide the pause/short pause options
function perTemplateSelected(){
	//if ($('input[name="xRange"][value="pauseX"]').prop("checked") || $('input[name="xRange"][value="shortPauseX"]').prop("checked")) $('input[name="xRange"][value="automaticX"]').click();
}


// If the perTemplate option is selected from the time histogram settings menu, then we hide the pause/short pause options
function perTemplateDeselected(){
}





// Assumes input list is sorted
// Input: numeric array: [1,2,5,6,7,8,9,10]
// Output: string: "1,2,5-10"
function convertListToCommaString(list){

	if (typeof list === "string") list = list = JSON.parse("[" + list + "]");
	//console.log("Parsing list", list);
	var string = "";
	for (var i = 0; i < list.length; i ++){
		var thisNum = list[i];
		var nextNum = list[i+1];

		// If the next number is not the following integer then move on 
		if (nextNum == null || thisNum+1 != nextNum){
			string += nextNum != null ? (thisNum + ", ") : thisNum;
			continue;
		}

		// Otherwise we keep looping intil the next integer is not 1 greater than this one
		var incrSize = 1;
		while (i < list.length-1){
			if (thisNum + incrSize + 1 != list[i+incrSize + 1]) break;
			incrSize++;
		}
		nextNum = list[i+incrSize];
		i += incrSize;
		string += i < list.length-1 ? (thisNum + "-" + nextNum + ", ") : (thisNum + "-" + nextNum);

	}
	return string;


}



// Input: string: "1,2,5-10"
// Output: numeric array: [1,2,5,6,7,8,9,10]
function convertCommaStringToList(string){


	var list = [];
	var bits = string.split(",");
	for (var i = 0; i < bits.length; i ++){
		bit = bits[i].trim();
		if (bit == "") continue;

		if (bit.match("-")){
			var lowerUpper = bit.split("-");
			var lower = parseFloat(lowerUpper[0].trim());
			var upper = parseFloat(lowerUpper[1].trim());
			if (isNaN(lower) || isNaN(upper)) continue; // Don't add non-numbers
			for (var j = lower; j <= upper; j ++){
				if (list.indexOf(j) == -1) list.push(j); // Don't add duplicates
			} 

		}else {
			var floatBit = parseFloat(bit);
			if (!isNaN(floatBit) && list.indexOf(floatBit == -1)) list.push(floatBit); // Don't add non-numbers or duplicates
		}

	}

	function sortNumber(a,b) {
    		return a - b;
	}


	// TODO: remove duplicates
	return list.sort(sortNumber);


}





function closeDialogs(){
	
	$("#mySidenav").unbind('click');
	$("#main").unbind('click');
	$("#settingsPopup").remove();
	$("#main").css("opacity", 1);
	$("#mySidenav").css("opacity", 1);

	
	
}

function disableTextbox(selector){
	$(selector).attr("disabled", true);
	$(selector).addClass(".parameter-disabled");
	$(selector).removeClass("textboxBlue");
}

function enableTextbox(selector){
	$(selector).attr("disabled", false);
	$(selector).removeClass(".parameter-disabled");
	$(selector).addClass("textboxBlue");
}












// Push data into its correct position in a sorted array
function sortedPush( array, value ) {
	

	var index = binaryFind(array, value);
	array.splice(index, 0, value);

	
   // array.splice( _.sortedIndex( array, value ), 0, value );
}


// Finds the position within a sorted array of numbers to add the new element
function binaryFind(sortedArray, searchElement) {

  var minIndex = 0;
  var maxIndex = sortedArray.length - 1;
  var currentIndex;
  var currentElement;

  while (minIndex <= maxIndex) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = sortedArray[currentIndex];

    if (currentElement < searchElement) {
      minIndex = currentIndex + 1;
    }
    else if (currentElement > searchElement) {
      maxIndex = currentIndex - 1;
    }
    else {
      return currentIndex;
    }
  }      

  return currentElement < searchElement ? currentIndex + 1 : currentIndex;

}

