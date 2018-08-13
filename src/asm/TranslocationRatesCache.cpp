﻿/* 
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


#include "State.h"
#include "Settings.h"
#include "TranslocationRatesCache.h"
#include "FreeEnergy.h"
#include "SimPol_vRNA_interface.h"


#include <iostream>
#include <vector>
#include <cstring>

using namespace std;




TranslocationRatesCache::TranslocationRatesCache(){
	
}


double TranslocationRatesCache::getTranslocationRates(State* state, bool fwd){
	

	int h = (int)hybridLen->getVal();


	// Polymerase is not backtracked. Use regular translocation table
	if (state->get_mRNAPosInActiveSite() > -2){
		
		
		int rowNum = state->get_nascentLength() - (h-1);
		int colNum = state->get_mRNAPosInActiveSite() + 1;
		
		double* rates = translocationRateTable[rowNum][colNum];

		// Parameterised translocation barrier height
		double backtrackBarrier = GDagSlide->getVal();

		if (currentModel->get_allowBacktracking()){


			// If in the 0 position and going backwards and the backtracking barrier is between 0 and -1, apply the backtrack penalty
			if (state->get_mRNAPosInActiveSite() == 0 && !fwd && currentModel->get_currentBacksteppingModel() == "backstep0") backtrackBarrier += deltaGDaggerBacktrack->getVal();

			// If in the -1 position and (going backwards and the backtracking barrier is between -1 and -2) OR (the backtracking barrier is between 0 and -1), apply the backtrack penalty
			else if (state->get_mRNAPosInActiveSite() == -1 && ((!fwd && currentModel->get_currentBacksteppingModel() == "backstep1") || currentModel->get_currentBacksteppingModel() == "backstep0")) backtrackBarrier += deltaGDaggerBacktrack->getVal();

		}

		double GDagRateModifier = exp(-backtrackBarrier);

		double forceGradientFwd = exp(( FAssist->getVal() * 1e-12 * (barrierPos->getVal()) * 1e-10) / (_kBT));
		double forceGradientBck = exp((-FAssist->getVal() * 1e-12 * (3.4-barrierPos->getVal()) * 1e-10) / (_kBT));
		double DGPostModifier = state->get_mRNAPosInActiveSite() == 1 ? exp(DGPost->getVal()) : 1;
		double RNAunfoldingBarrier = 1;
		
		

		double hypertranslocationGradientForward = 1; // Modify the rate of hypertranslocating forwards
		double hypertranslocationGradientBackwards = 1; // Modify the rate of translocating backwards when in a hypertranslocated state
		if (currentModel->get_allowHypertranslocation()){
			//if (compactState[1] > 0) hypertranslocationGradientForward = Math.exp(-PARAMS_JS.PHYSICAL_PARAMETERS["DGHyperDag"]["val"] * 0.5);
			//if (compactState[1] > 1) hypertranslocationGradientBackwards = Math.exp(PARAMS_JS.PHYSICAL_PARAMETERS["DGHyperDag"]["val"] * 0.5);
		}


		//cout << "F = " << FAssist->getVal() << ", delta1 = " << barrierPos->getVal() << endl;
		//cout << "kbck = " << rates[0] << ", kfwd = " << rates[1] << ", forceGradientFwd = " << forceGradientFwd << ", GDagRateModifier = " << GDagRateModifier  << endl;
		//if (fwd) cout << rates[1] * DGPostModifier * GDagRateModifier * hypertranslocationGradientForward * forceGradientFwd << endl;
		//else cout << rates[0] * DGPostModifier * GDagRateModifier * hypertranslocationGradientBackwards * forceGradientBck << endl;




		if (rates[0] != -1) {


			// RNA unfolding barrier heights 
			if (fwd && rates[1] != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
			else if (!fwd && rates[0] != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));

			//if (rates[0] >= INF || rates[1] >= INF || forceGradientFwd >= INF || forceGradientBck >= INF || GDagRateModifier >= INF)
				//cout << "rates[0]: " << rates[0] << ", rates[1]: " << rates[1] << ", forceGradientFwd: " << forceGradientFwd << " forceGradientBck: " << forceGradientBck << " GDagRateModifier: " << GDagRateModifier << endl;
			if (fwd) return rates[1] * DGPostModifier * GDagRateModifier * hypertranslocationGradientForward * forceGradientFwd * RNAunfoldingBarrier;
			else return rates[0] * DGPostModifier * GDagRateModifier * hypertranslocationGradientBackwards * forceGradientBck * RNAunfoldingBarrier;
		}


		// Temporarily set state to inactive so it lets us backtrack
		//int temp = compactState[3];
		//compactState[3] = false;
		
		// If rates are not in table then add them and return them
		double kbck = state->calculateBackwardRate(false, false); // Important to include false or will end up in infinite loop
		double kfwd = state->calculateForwardRate(false, false);
		translocationRateTable[rowNum][colNum][0] = kbck;
		translocationRateTable[rowNum][colNum][1] = kfwd;


		// RNA unfolding barrier heights 
		if (fwd && rates[1] != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
		else if (!fwd && rates[0] != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));


		if (fwd) return kfwd * DGPostModifier * GDagRateModifier * hypertranslocationGradientForward * forceGradientFwd * RNAunfoldingBarrier;
		else return kbck * DGPostModifier * GDagRateModifier * hypertranslocationGradientBackwards * forceGradientBck * RNAunfoldingBarrier;

		
		
	}
	
	
	// Polymerase is backtracked. Use backtracking table
	else{
		
		
		

		int rightHybridBase = state->get_mRNAPosInActiveSite() + state->get_nascentLength();
		int leftHybridBase = rightHybridBase + 1 - h;
		int indexNum = leftHybridBase - 1;

		auto rates = backtrackRateTable[indexNum];
		double backtrackBarrier = GDagSlide->getVal() + deltaGDaggerBacktrack->getVal();
		double GDagRateModifier = exp(-backtrackBarrier);
		double forceGradientFwd = exp(( FAssist->getVal() * 1e-12 * (barrierPos->getVal()) * 1e-10) / (_kBT));
		double forceGradientBck = exp((-FAssist->getVal() * 1e-12 * (3.4-barrierPos->getVal()) * 1e-10) / (_kBT));
		double RNAunfoldingBarrier = 1;
		
		if (rates[0] != -1) {


			// RNA unfolding barrier heights 
			if (fwd && rates[1] != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
			else if (!fwd && rates[0] != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));



			if (fwd) return rates[1] * GDagRateModifier * forceGradientFwd * RNAunfoldingBarrier;
			else return rates[0] * GDagRateModifier * forceGradientBck * RNAunfoldingBarrier;
		}
		
		
		// If rates are not in table then add them and return them
		double kbck = state->calculateBackwardRate(false, false); // Important to include false or will end up in infinite loop
		double kfwd = state->calculateForwardRate(false, false);
		backtrackRateTable[indexNum][0] = kbck;
		backtrackRateTable[indexNum][1] = kfwd;



		//if (rates[0] >= INF || rates[1] >= INF || forceGradientFwd >= INF || forceGradientBck >= INF || GDagRateModifier >= INF)
			//cout << "b rates[0]: " << rates[0] << ", rates[1]: " << rates[1] << ", forceGradientFwd: " << forceGradientFwd << " forceGradientBck: " << forceGradientBck << " GDagRateModifier: " << GDagRateModifier << endl;
			

		// RNA unfolding barrier heights 
		if (fwd && rates[1] != 0) RNAunfoldingBarrier = exp(-this->getDownstreamRNABlockadeBarrierHeight(state));
		else if (!fwd && rates[0] != 0) RNAunfoldingBarrier = exp(-this->getUpstreamRNABlockadeBarrierHeight(state));


		if (fwd) return kfwd * GDagRateModifier * forceGradientFwd * RNAunfoldingBarrier;
		else return kbck * GDagRateModifier * forceGradientBck * RNAunfoldingBarrier;

		
	}
		


}


void TranslocationRatesCache::buildTranslocationRateTable(string templSequence){

	// Don't calculate all at once, only calculating for active site positions 0 and 1. Simulation caches hypertranslocated rates as it goes. 
	
	// Rows are the lengths of the mRNA and cols are the position of the active site (minimum value -1, maximum value h-1). Backtracking rates are found in the backtracking table
	// Each entry is a tuple (kbck, kfwd)
	// There are n - h rows (n is total number of bases, h is hybrid length)
	// There are l + 1 entries in each row, where l is the length of the nascent strand in the row


	//cout << "Building translocation rate table..." << templSequence.length() << endl;

	if (hybridLen == nullptr || (int)hybridLen->getVal() <= 0) return;
	
	int h = (int)hybridLen->getVal();
	int nLengths = templSequence.length() - h + 1;
	int nPositions = h + 1;
	if (nLengths <= 0) return;
	this->translocationRateTable = new double**[nLengths];


	for(int nascentLen = h-1; nascentLen < templSequence.length(); nascentLen ++){
		
		int rowNum = nascentLen - (h-1);
		this->translocationRateTable[rowNum] = new double*[nPositions];

		for (int activeSitePos = -1; activeSitePos <= h-1; activeSitePos ++){
			int colNum = activeSitePos + 1;

			// Will leave it empty and add values only as they are needed
			this->translocationRateTable[rowNum][colNum] = new double[2]; 
			this->translocationRateTable[rowNum][colNum][0] = -1; 
			this->translocationRateTable[rowNum][colNum][1] = -1; 
		}
		
	}


}



void TranslocationRatesCache::buildBacktrackRateTable(string templSequence){


	// Once the polymerase has entered state -2 (ie backtracked by 2 positions) then all backtracking rates 
	// are the same per position across different nascent strand lengths. The bases added onto the nascent strand
	// which are coming out of the NTP pore don't matter. This assumption would no longer hold if we started
	// folding the 3' end of the nascent strand

	//cout << "Building backtrack rate table..." << templSequence.length() << endl;

	if (hybridLen == nullptr || (int)hybridLen->getVal() <= 0) return;


	int h = (int)hybridLen->getVal();
	if (templSequence.length() - h - 1 < 0) return;
	this->backtrackRateTable = new double*[templSequence.length() - h - 1];


	for (int leftHybridBase = 1; leftHybridBase <= templSequence.length() - h - 1; leftHybridBase ++){
		int indexNum = leftHybridBase - 1;

		// Will leave it empty and add values only as they are needed
		this->backtrackRateTable[indexNum] = new double[2];
		this->backtrackRateTable[indexNum][0] = -1; 
		this->backtrackRateTable[indexNum][1] = -1; 
	}


}




double TranslocationRatesCache::getUpstreamRNABlockadeBarrierHeight(State* state){

	//cout << "getUpstreamRNABlockadeBarrierHeight" << endl;

	if (!currentModel->get_allowmRNAfolding()) return 0;




	// If the barrier height has already been cached, return it
	int pos = state->getLeftNascentBaseNumber() - 1 - rnaFoldDistance->getVal();
	if (pos < 0) return 0;


	//cout << "pos " << pos << ":" << this->upstreamRNABlockadeTable[pos] << endl;
	if (this->upstreamRNABlockadeTable[pos] != -INF) return this->upstreamRNABlockadeTable[pos];


	// Otherwise calculate it
	double barrierHeight = 0;

	// Fold the RNA of this state
	State* clone = state->clone();
	clone->fold(true, false);


	// No structure
	if (clone->get_5primeStructure() == ""){

		barrierHeight = 0;

	}

	// Boundary model -> prohibit translocation if there is any structure here
	else if (currentModel->get_currentRNABlockadeModel() == "terminalBlockade"){


		string structure = clone->get_5primeStructure();
		if (structure.substr(structure.length()-1, 1) == ")") barrierHeight = INF;

		cout << "terminalBlockade " << structure << ":" << barrierHeight << endl;

	}


	// Otherwise we need to consider the current state and the back translocated state
	else {

		// Free energy of this structure
		float this_MFE = clone->get_5primeStructureMFE();
		string this_structure = clone->get_5primeStructure();


		// Free energy of the structure when polymerase moves upstream by 1 bp
		State* stateBck = clone->clone()->backward();
		stateBck->fold(true, false);
		float upstream_MFE = stateBck->get_5primeStructureMFE();
		string upstream_structure = stateBck->get_5primeStructure();

		if (this_structure.length() < 5) barrierHeight = 0;


		// Midpoint blockade: take the free energy of the two neighbouring structures and average them out
		else if (currentModel->get_currentRNABlockadeModel() == "midpointBlockade"){
			barrierHeight = (this_MFE + upstream_MFE) / 2 - this_MFE;
			cout << "Upstream midpoint barrier: " << barrierHeight << endl;
		}


		else if (currentModel->get_currentRNABlockadeModel() == "intersectionBlockade"){
			string transitionStructure = FreeEnergy::getSecondaryStructureStringIntersection(this_structure, upstream_structure);
			//cout << this_structure << "/" << upstream_structure  << "Transition intersection structure " << transitionStructure << endl;


			// Use RNAeval to compute the Gibbs energy of this structure
			string seq = clone->get_NascentSequence().substr(0, transitionStructure.length());
			char* seq_char = (char *) calloc(seq.length()+1, sizeof(char));
			char* structure_char = (char *) calloc(seq.length()+1, sizeof(char));
			strcpy(seq_char, seq.c_str());
			strcpy(structure_char, transitionStructure.c_str());

			barrierHeight = vRNA_eval(seq_char, structure_char) - this_MFE;
			cout << "Upstream intersection Gibbs energy: " << barrierHeight << endl;

			// Clean up
			free(seq_char);
			free(structure_char);
	


		}
		


	}

	delete clone;


	this->upstreamRNABlockadeTable[pos] = barrierHeight;
	return barrierHeight;




}


double TranslocationRatesCache::getDownstreamRNABlockadeBarrierHeight(State* state){



	//cout << "getDownstreamRNABlockadeBarrierHeight" << endl;

	if (true || !currentModel->get_allowmRNAfolding()) return 0;



	// If the barrier height has already been cached, return it
	int pos = state->getRightNascentBaseNumber() - 1 + rnaFoldDistance->getVal();
	if (pos < 0 || pos+1 > state->get_nascentLength() /* || pos >= templateSequence.length()*/) return 0;


	// TODO: CACHING NEED TO KNOW THE POSITION AND THE LENGTH
	// if (this->downstreamRNABlockadeTable[pos] != -INF) return this->downstreamRNABlockadeTable[pos];


	// Otherwise calculate it
	double barrierHeight = 0;

	// Fold the RNA of this state
	State* clone = state->clone();
	clone->fold(false, true);


	// No structure
	if (clone->get_3primeStructure() == ""){
		barrierHeight = 0;
	}


	// Boundary model -> prohibit translocation if there is any structure here
	else if (currentModel->get_currentRNABlockadeModel() == "terminalBlockade"){


		string structure = clone->get_3primeStructure();
		if (structure.substr(0, 1) == "(") barrierHeight = INF;

		//cout << "terminalBlockade " << structure << ":" << barrierHeight << endl;

	}


	// Otherwise we need to consider the current state and the forward translocated state
	else {


		// Free energy of this structure
		float this_MFE = clone->get_3primeStructureMFE();
		string this_structure = clone->get_3primeStructure();


		// Free energy of the structure when polymerase moves downstream by 1 bp
		State* stateFwd = clone->clone()->forward();
		stateFwd->fold(false, true);
		float downstream_MFE = stateFwd->get_3primeStructureMFE();
		string downstream_structure = stateFwd->get_3primeStructure();


		if (this_structure.length() < 5) barrierHeight = 0;

		// Midpoint blockade: take the free energy of the two neighbouring structures and average them out
		else if (currentModel->get_currentRNABlockadeModel() == "midpointBlockade"){
			barrierHeight = (this_MFE + downstream_MFE) / 2 - this_MFE;
			//cout << "Downstream midpoint barrier: " << barrierHeight << endl;
		}


		else if (currentModel->get_currentRNABlockadeModel() == "intersectionBlockade"){
			string transitionStructure = FreeEnergy::getSecondaryStructureStringIntersection(this_structure, "." + downstream_structure);
			//cout << this_structure << "/" << downstream_structure  << "Downstream transition intersection structure " << transitionStructure << endl;


			// Use RNAeval to compute the Gibbs energy of this structure
			string seq = clone->get_NascentSequence().substr(clone->getRightNascentBaseNumber(), transitionStructure.length());
			char* seq_char = (char *) calloc(seq.length()+1, sizeof(char));
			char* structure_char = (char *) calloc(seq.length()+1, sizeof(char));
			strcpy(seq_char, seq.c_str());
			strcpy(structure_char, transitionStructure.c_str());

			barrierHeight = vRNA_eval(seq_char, structure_char) - this_MFE;
			//cout << "Downstream Gibbs energy: " << barrierHeight << endl;

			// Clean up
			free(seq_char);
			free(structure_char);
	


		}


	}

	delete clone;


	// this->downstreamRNABlockadeTable[pos] = barrierHeight;
	return barrierHeight;

}





// Build a table of rates for translocating upstream from the current position.
// The active site position and transcript length don't matter - only the transcript position that is one basepair upstream of the polymerase matters
void TranslocationRatesCache::buildUpstreamRNABlockadeTable(string templSequence){
	this->upstreamRNABlockadeTable = new double[templSequence.length()];

	// Initialise all values at negative infinity
	for (int i = 0; i < templSequence.length(); i ++){
		this->upstreamRNABlockadeTable[i] = -INF; 
	}

}


// Build a table of rates for translocating downstream from the current position.
// The active site position and transcript length don't matter - only the transcript position that is one basepair downstream of the polymerase matters
void TranslocationRatesCache::buildDownstreamRNABlockadeTable(string templSequence){
	this->downstreamRNABlockadeTable = new double[templSequence.length()];

	// Initialise all values at negative infinity
	for (int i = 0; i < templSequence.length(); i ++){
		this->downstreamRNABlockadeTable[i] = -INF; 
	}
}