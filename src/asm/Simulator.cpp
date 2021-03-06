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


#include "Settings.h"
#include "Simulator.h"
#include "State.h"
#include "Plots.h"
//#include "sfmt/include/sfmt/SFMT.h"
#include "randomc/randomc.h"
//#include "RandomLib/Random.hpp"


//#include "RandomTest-master/CmRandom.h"
//#include "RandomTest-master/CmDistribution.h"

#include <iostream>
#include <random>
#include <chrono>
#include <ctime>

using namespace std;



Simulator::Simulator(Plots* plots){

	// Each simulator instance has its own mersenne twister instance to allow multithreading
	random_device rd; 
	sfmt = new CRandomMersenne(rd());

	simulateForSeconds = -1;
	this->animatingGUI = false;
    this->simulator_plots = plots;
    this->sitewise_summary = nullptr;
    
    this->resultSummary_GUI = nullptr;

}


Simulator::Simulator(SitewiseSummary* sitewise_summary){

    random_device rd; 
    sfmt = new CRandomMersenne(rd());
    
    simulateForSeconds = -1;
    this->animatingGUI = false;
    this->simulator_plots = nullptr;
    this->sitewise_summary = sitewise_summary;
    this->resultSummary_GUI = nullptr;
     
}




Plots* Simulator::getPlots(){
    return this->simulator_plots;
}



// Performs the number of trials specified in summary and populates the object with summary statistics of the simulations 
void Simulator::perform_N_Trials(SimulatorResultSummary* summary, State* state, bool verbose){


	int N = summary->get_ntrials();

	// Generate plots?
	if (_RECORD_PAUSE_TIMES || (_plotFolderName != "" && !_RUNNING_ABC) && this->simulator_plots) this->simulator_plots->init();


	//currentModel->print();
	simulateForSeconds = -1; 
	this->animatingGUI = false;


	
	if (verbose) {
		cout << "Performing " << N << " trials" << endl;
		//cout << templateSequence << endl;
		if (currentModel->get_assumeBindingEquilibrium()) cout << "Binding assumed to be at equilibrium" << endl;
		if (currentModel->get_assumeTranslocationEquilibrium()) cout << "Translocation assumed to be at equilibrium" << endl;
	}

	//state->transcribe(10);
	//state->print();

	//cout << "bck = " <<  state->calculateBackwardRate(true) << endl;


	double meanMeanVelocity = 0;
	double meanMeanTime = 0;
	State* clonedState;
	double result[3];
	for (int n = 1; n <= N; n ++){
		if (verbose && (n == 1 || n % 100 == 0)) cout << "Starting trial " << n << endl;

		result[0] = 0;
		result[1] = 0;
		result[2] = 0;
		clonedState = state->clone();
		if ((_plotFolderName != "" && !_RUNNING_ABC) || _RECORD_PAUSE_TIMES && this->simulator_plots) this->simulator_plots->refreshPlotData(clonedState); // New simulation -> refresh plot data
		performSimulation(clonedState, result);
		if ((_RECORD_PAUSE_TIMES || !_RUNNING_ABC) && this->simulator_plots) this->simulator_plots->updateParameterPlotData(clonedState); // Update parameter plot before starting next trial

		//cout << "Finished trial and length is " << clonedState->get_nascentLength() << endl;
		summary->add_transcriptLength(clonedState->get_nascentLength());
		//cout << "Added length " << clonedState->get_nascentLength() << endl;

		delete clonedState;
		meanMeanVelocity += result[0] / N;
		meanMeanTime += result[1] / N;
		//velocities.at(n-1) = result[0];
		//times.at(n-1) = result[1];
	}





	if (verbose) {

		// Calculate standard deviations
		/*
		double sdVelocity = 0;
		double sdTime = 0;
		for (int n = 1; n <= N; n ++){
			sdVelocity += pow(velocities.at(n-1) - meanMeanVelocity, 2) / N;
			sdTime += pow(times.at(n-1) - meanMeanTime, 2) / N;
		}
		sdVelocity = sqrt(sdVelocity);
		sdTime = sqrt(sdTime);
		*/

		//cout << "Mean velocity = " << meanMeanVelocity << "bp/s (sd = " << sdVelocity << ")"<< endl;
		//cout << "Mean time to copy template = " << meanMeanTime << "s (sd = " << sdTime << ")" << endl;

		cout << "Mean velocity = " << meanMeanVelocity << "bp/s" << endl;
		cout << "Mean time to copy template = " << meanMeanTime << "s" << endl;
	}

	_GUI_simulating = false;

	summary->set_meanVelocity(meanMeanVelocity);
	summary->set_meanTimeElapsed(meanMeanTime);


}


// Initialises N trials to be performed in hidden or animation mode. Does not simulate
void Simulator::initialise_GUI_simulation(SimulatorResultSummary* summary, double msUntilStop){

    int N = summary->get_ntrials();
	this->nTrialsTotalGUI = N;
	this->nTrialsCompletedGUI = 0;
	this->simulateForSeconds = msUntilStop / 1000;
	this->niterationsUntilLastTimeoutCheck = 0;
    
    
    // Reset the simulator summary
    if (this->resultSummary_GUI != nullptr){
        this->resultSummary_GUI->clear();
        delete this->resultSummary_GUI;
    }
    
    this->resultSummary_GUI = summary;

}


// Samples a single action in animated mode. Does not perform the action, it just returns the action (or a list of actions)
list<int> Simulator::sample_action_GUI(){

	// Upto 3 reactions may be sampled at a time (depending on equilibrium assumptions)
	this->actionsToReturn.clear();
	this->animatingGUI = true;
	
	


	// Move onto next trial if terminated
	if (_currentStateGUI->isTerminated()) {

		if (!_RUNNING_ABC && this->simulator_plots) this->simulator_plots->updateParameterPlotData(_currentStateGUI); // Update parameter plot before starting next trial
		Settings::sampleAll(); // Resample the parameters
		delete _currentStateGUI;
		_currentStateGUI = new State(true, true);
		this->nTrialsCompletedGUI++;
		if ((!_RUNNING_ABC || _RECORD_PAUSE_TIMES)  && this->simulator_plots) this->simulator_plots->refreshPlotData(_currentStateGUI); // New simulation -> refresh plot data
		currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
		currentSequence->initRNAunfoldingTable();

		// Return now if have performed all N trials
		if (this->nTrialsCompletedGUI >= this->nTrialsTotalGUI) return this->actionsToReturn;

	}



	// This function will populate the list of actions to do but won't actually do them
	double result[3];
	result[0] = 0;
	result[1] = 0;
	result[2] = 0;
	performSimulation(_currentStateGUI, result);

	return this->actionsToReturn;

}




// Performs upto N trials and then returns with whatever progress has been made after msUntilStop has elapsed. 
void Simulator::perform_N_Trials_and_stop_GUI(double* toReturn){

	this->animatingGUI = false;
	//this->timer_start(1000);

	// Simulate until time elapses
	double meanMeanVelocity = 0;
	double meanMeanTime = 0;
	double result[3];

    cout << nTrialsTotalGUI << endl;
    

    

	for (int n = 1; n <= nTrialsTotalGUI; n ++){
		//if (n == 1 || n % 100 == 0) cout << "Starting trial " << n << endl;
		//cout << "Starting trial " << n << endl;


		result[0] = 0;
		result[1] = 0;
		result[2] = 0;
        
        


		if ((!_RUNNING_ABC || _RECORD_PAUSE_TIMES) && this->simulator_plots)  this->simulator_plots->refreshPlotData(_currentStateGUI); // New simulation -> refresh plot data
		currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
		currentSequence->initRNAunfoldingTable();
		performSimulation(_currentStateGUI, result);


		// If 3rd element is 0, then the current simulation was interrupted by a timeout
		if (result[2] == 0){
			//cout << "Stopped simulation after timeout - completed " << (n-1) << " trials" << endl;
			inSimulationTimeElapsedCurrentSimulation = result[1];
			meanMeanVelocity = meanMeanVelocity / (n-1);

			toReturn[0] = meanMeanVelocity;
			toReturn[1] = double(n-1);
			toReturn[2] = 0; // Have not finished yet
			return;
		}

		else {
			nTrialsCompletedGUI++;
			meanMeanVelocity += result[0];
			meanMeanTime += result[1];
            
            
            // Update the final transcript length of this simulation
            this->resultSummary_GUI->add_transcriptLength(_currentStateGUI->get_nascentLength());

			if (!_RUNNING_ABC && this->simulator_plots) this->simulator_plots->updateParameterPlotData(_currentStateGUI); // Update parameter plot before starting next trial
			Settings::sampleAll(); // Resample the parameters
			delete _currentStateGUI;
			_currentStateGUI = new State(true, !_USING_PAUSER);
		}

	}

	meanMeanVelocity = meanMeanVelocity / nTrialsTotalGUI;
	toReturn[0] = meanMeanVelocity;
	toReturn[1] = double(nTrialsTotalGUI);
	toReturn[2] = 1; // Finished simulating
	_GUI_simulating = false;
	return;



}


// Resumes the trials initiated by perform_N_Trials_and_stop_GUI() and then returns with whatever progress has been made after msUntilStop has elapsed
void Simulator::resume_trials_GUI(double* toReturn){


	this->animatingGUI = false;
	
	// Simulate until time elapses
	double meanMeanVelocity = 0;
	double meanMeanTime = 0;

	// Resume simulating from the previous state and with the same time elapsed
	double result[3];
	result[0] = 0;
	result[1] = inSimulationTimeElapsedCurrentSimulation;
	result[2] = 0;

	for (int n = nTrialsCompletedGUI+1; n <= nTrialsTotalGUI; n ++){
		//if (n == 1 || n % 100 == 0) cout << "Starting trial " << n << endl;
		//cout << "Starting trial " << n << endl;
        
		performSimulation(_currentStateGUI, result);

		// If 3rd element is 0, then the current simulation was interrupted by a timeout
		if (result[2] == 0){
			//cout << "Stopped simulation after timeout - completed " << (n-1) << " trials" << endl;
			inSimulationTimeElapsedCurrentSimulation = result[1];
			meanMeanVelocity = meanMeanVelocity / (n-1);
			toReturn[0] = meanMeanVelocity;
			toReturn[1] = double(n-1);
			toReturn[2] = 0; // Have not finished yet
			return;
		}
		else {
			nTrialsCompletedGUI++;
			meanMeanVelocity += result[0];
			meanMeanTime += result[1];

		}


		// Restart from initial state for the next simulation
		if (!_RUNNING_ABC && this->simulator_plots) this->simulator_plots->updateParameterPlotData(_currentStateGUI); // Update parameter plot before starting next trial
		Settings::sampleAll(); // Resample the parameters
		delete _currentStateGUI;
		_currentStateGUI = new State(true, !_USING_PAUSER);
		result[0] = 0;
		result[1] = 0;
		result[2] = 0;


		if ((!_RUNNING_ABC || _RECORD_PAUSE_TIMES) && this->simulator_plots) this->simulator_plots->refreshPlotData(_currentStateGUI); // New simulation -> refresh plot data
		currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
		currentSequence->initRNAunfoldingTable();

	}

	meanMeanVelocity = meanMeanVelocity / nTrialsTotalGUI;
	toReturn[0] = meanMeanVelocity;
	toReturn[1] = double(nTrialsTotalGUI);
	toReturn[2] = 1; // Finished simulating
	return;


}


double Simulator::rexp(double rate){
	return -log(runif()) / rate;
	//return -log(sfmt->Random()) / rate;
}


double Simulator::runif(){
	//return this->distribution(this->generator);
	return sfmt->Random();
	//return (double)generator()/generator.max();
}




// Returns the total number of GUI trials
int Simulator::getNtrialsTotal_GUI(){
	return this->nTrialsTotalGUI;
}


// Returns the number of GUI trials remaining
int Simulator::getNtrialsCompleted_GUI(){
	return this->nTrialsCompletedGUI;
}


void Simulator::performSimulation(State* s, double* toReturn) {


	//cout << "Beginning" << endl;

	double timeElapsed = 0;

	// Detect if the polymerase has stalled at a position
	int lastBaseTranscribed = s->get_nascentLength();
	double timeElapsedSinceLastCatalysis = 0;


	// GUI timeout function
	int checkTimeoutEveryNIterations = 10000;
	
	
	    
    // Terminate if slippage/mutations have occurred
 	if(s->get_thereHaveBeenMutations()) {
		if (!this->animatingGUI) executeAction(s, 6);
		else this->actionsToReturn.push_back(6);
 	}
	
	
	while(!s->isTerminated()){
        


		// Check if GUI timeout has been reached (if there is a timeout)
		if (simulateForSeconds != -1 && _animationSpeed == "hidden"){
			this->niterationsUntilLastTimeoutCheck ++;

			// Make time comparison only once in a while because this operation is slow
			if (this->niterationsUntilLastTimeoutCheck >= checkTimeoutEveryNIterations){
				this->niterationsUntilLastTimeoutCheck = 0;
				chrono::duration<double> elapsed_seconds = chrono::system_clock::now() - _interfaceSimulation_startTime;
				double time = elapsed_seconds.count();
				if (time >= simulateForSeconds){


					cout << "Timeout reached " << time << endl;
					// If timeout has been reached then return the current time elapsed
					toReturn[0] = 0;
					toReturn[1] += timeElapsed; // Total time taken
					toReturn[2] = 0; // Failure
					return;

				} 

			}

		} 
        
        
        
        
        // Sitewise summary updates
        if (this->sitewise_summary){
        
        
        
        
            // If state is posttranslocated and cannot move upstream, then declare an RNA ratchet event
            if (s->get_mRNAPosInActiveSite() == 1 && !s->NTPbound() && s->calculateBackwardRate(true, false) == 0){
                this->sitewise_summary->declare_ratchet_at_site(s->get_nascentLength());
            }
            
            
        
            // If state is hypertranslocated and cannot move upstream, then declare a blockade-induced hypertranslocation arrest
            if (s->get_mRNAPosInActiveSite() > 1 && s->calculateBackwardRate(true, false) == 0){
                this->sitewise_summary->declare_RNA_arrest_at_site(s->get_nascentLength());
                s->terminate();
                break;
            }
        
        
        
        
        }





		// Check if in-simulation time limit has been exceeded
		if (arrestTime->getVal(true) > 0 && timeElapsed >= arrestTime->getVal(true)) {

			//cout << "In-simulation timeout reached " << timeElapsed << endl;


            // Label the next nucleotide as having been transcribed (so that arrests do not underinflate pause times)
            if(this->simulator_plots) this->simulator_plots->update_timeWaitedUntilNextCatalysis(s->get_nascentLength() + 1);


			// If timeout has been reached then return the current time elapsed
			toReturn[0] = s->get_nascentLength(); // Returns the final transcript length instead of velocity
			toReturn[1] += timeElapsed; // Total time taken
			toReturn[2] = 1; // Success
			return;

		} 



		// Arrest if have gone beyond the end of the sequence
		if ((s->get_mRNAPosInActiveSite() <= 1 && s->get_mRNAPosInActiveSite() <= 1 && s->getRightTemplateBaseNumber() > templateSequence.length()) ||
			(s->get_mRNAPosInActiveSite() == 0 && s->getRightTemplateBaseNumber() == templateSequence.length()) ){
		

			if (!this->animatingGUI) {
				s->terminate();
				break;
			}
			else {
				this->actionsToReturn.push_back(6); // 6 = terminate
				return;
			}
		}




		// If NTP is not bound and we are in posttranslocated state, and user has requested to assume binding equilibrium but NOT translocation
		bool justBindingEquilibrium =     currentModel->get_assumeBindingEquilibrium() 
								 && !currentModel->get_assumeTranslocationEquilibrium() 
								 && s->get_mRNAPosInActiveSite() == 1 && !s->NTPbound();


		// If NTP is not bound and we are in pre/posttranslocated state, and user has requested to assume translocation equilibrium but NOT binding
		bool justTranslocationEquilibrium =  !currentModel->get_assumeBindingEquilibrium()
											&&  currentModel->get_assumeTranslocationEquilibrium() 
                                            && s->get_activated()
											&& (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1) && !s->NTPbound();



		// If we are in pre/posttranslocated state, and user has requested to assume translocation equilibrium AND binding equilibrium
		bool bindingAndTranslocationEquilibrium =   currentModel->get_assumeBindingEquilibrium()
													&& currentModel->get_assumeTranslocationEquilibrium() 
                                                    && s->get_activated()
													&& (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1) && !s->NTPbound();


		bool nothingEquilibrium = !currentModel->get_assumeBindingEquilibrium() && !currentModel->get_assumeTranslocationEquilibrium();



		bool beforeEndOfTemplate = s->get_nascentLength() + 1 < templateSequence.length();
		bool afterStartOfTemplate = s->get_nascentLength() > s->get_initialLength();
		double geometricTime = -1;




		// Geometric speed boost whereby the number of cycles spent in a set of states is sampled from the geometric distribution. 
		// This is faster because the inner loop is smaller, especially when the back and forth rate is very high eg. NTP binding/release
		if (currentModel->get_allowGeometricCatalysis() && beforeEndOfTemplate && afterStartOfTemplate && s->get_activated() && !bindingAndTranslocationEquilibrium && (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1)){


			

			// Geometric sampling speed boost for when nothing is at equilibrium (and backtracking/hypertranslocation prohibited)
			if (nothingEquilibrium && !currentModel->get_allowBacktracking() && !currentModel->get_allowHypertranslocation() && s->get_mRNAPosInActiveSite() == 1) {
				geometricTime = geometricTranslocationBindingSampling(s);
			}


			// Geometric sampling speed boost for when just binding is kinetic (or both kinetic but backtracking/hypertranslocation are not prohibited)
			else if (!currentModel->get_allowInactivation() && ((nothingEquilibrium && s->get_mRNAPosInActiveSite() == 1) || justTranslocationEquilibrium)){
				geometricTime = geometricBindingSampling(s);
			}

			// Geometric sampling speed boost for when translocation is kinetic and binding is at equilibrium
			else if (justBindingEquilibrium && !currentModel->get_allowBacktracking() && !currentModel->get_allowHypertranslocation() && s->get_mRNAPosInActiveSite() == 1){
				geometricTime = geometricTranslocationSampling(s);
			}


		}







		// Geometric sampling was a success. End of trial
		if (geometricTime != -1){


			// If animation mode then return right away
			if (this->animatingGUI) return;


			//cout << "geometricTime" << endl;
			timeElapsed += geometricTime;
			if (s->get_nascentLength() != lastBaseTranscribed){
				timeElapsedSinceLastCatalysis = 0;
				lastBaseTranscribed = s->get_nascentLength();
			} 
			else timeElapsedSinceLastCatalysis += geometricTime;
		}


		// Geometric sampling did not apply. Do it the normal way
		else if (geometricTime == -1) {



			// Calculate the initial rates (these may be modified if any equilibirum assumptions are made)
			double kBck = s->calculateBackwardRate(true, false);
			double kFwd = s->calculateForwardRate(true, false);
			double kRelease = s->calculateReleaseNTPRate(false);
			double kBindOrCat = s->calculateBindOrCatNTPrate(false);
			double kActivate = s->calculateActivateRate(false);
			double kDeactivate = s->calculateDeactivateRate(false);
			double kCleave = s->calculateCleavageRate(false); // Can only cleave if backtracked in which case equilibrium assumptions do not apply



			// Assume equilbirium between bound and unbound states but NOT pre and post translocated states
			if (justBindingEquilibrium){

				//cout << "justBindingEquilibrium" << endl;

				// Calculate probability of NTP being bound or unbound. If concentration is zero it will never bind
				double KD = Kdiss->getVal(true);
				double NTPconcentration = 0;
				if (currentModel->get_useFourNTPconcentrations()){
					string toBind = Settings::complementSeq(templateSequence.substr(s->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
					if (toBind == "A") NTPconcentration = ATPconc->getVal(true);
					else if (toBind == "C") NTPconcentration = CTPconc->getVal(true);
					else if (toBind == "G") NTPconcentration = GTPconc->getVal(true);
					else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal(true);
				}
				else NTPconcentration = NTPconc->getVal(true);
				double probabilityBound = (NTPconcentration/KD) / (NTPconcentration/KD + 1);
				if (!s->get_activated()) probabilityBound = 0;
				double probabilityUnbound = 1 - probabilityBound;


				// Mofify the rates
				kBindOrCat = s->calculateCatalysisRate(true) * probabilityBound; // Can only catalyse if NTP bound
				kFwd = kFwd * probabilityUnbound; // Can only translocate if NTP is not bound
				kBck = kBck * probabilityUnbound;


			}


			// Assume equilbirium between pre and post translocated states but NOT between bound and unbound states
			else if (justTranslocationEquilibrium){

				// Get rate of translocating from 0 to -1
				int currentTranslocationPosition = s->get_mRNAPosInActiveSite();

				if (s->get_mRNAPosInActiveSite() == 1)  s->backward(); 
				double k0_1 = s->calculateForwardRate(true, true);
				double k0_minus1 = s->calculateBackwardRate(true, true);


				// Get rate of translocating from 1 to 2
				s->forward(); 
				s->set_terminated(false);
				double k1_0 = s->calculateBackwardRate(true, true);
				double k1_2 = s->calculateForwardRate(true, true);

				// Move back to original position
				if (currentTranslocationPosition != s->get_mRNAPosInActiveSite()) s->backward();



				double eqConstantFwdTranslocation = k0_1 / k1_0;
				double probabilityPosttranslocated = 1;
				double probabilityPretranslocated = 0;

				if (eqConstantFwdTranslocation != INFINITY && eqConstantFwdTranslocation != 0){
					probabilityPosttranslocated = eqConstantFwdTranslocation / (eqConstantFwdTranslocation + 1);
					probabilityPretranslocated = 1 - probabilityPosttranslocated;
				}


				//console.log("k0_1", k0_1, "k1_0", k1_0, "probabilityPosttranslocated", probabilityPosttranslocated);


				// Can only bind NTP if not beyond the end of the sequence, go forward to terminate
				if (s->get_activated() && s->get_mRNAPosInActiveSite() + 1 < templateSequence.length()) kBindOrCat = s->calculateBindOrCatNTPrate(true) * probabilityPosttranslocated;
				else kBindOrCat = 0;

				//cout << "kBindOrCat " << kBindOrCat << " eqConstantFwdTranslocation " << eqConstantFwdTranslocation << endl;


				kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
				kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated
                
                
                // Can only deactivate from the pretranslocatd (or backstep1 state)
                kDeactivate = kDeactivate * probabilityPretranslocated;


			}


			// Assume equilbirium between pre and post translocated states AND between bound and unbound states
			else if (bindingAndTranslocationEquilibrium){


				//if (s->get_nascentLength() == 4028){
					//cout << "XXX" << endl;
				//}



				// Get rate of translocating from 0 to -1
				int currentTranslocationPosition = s->get_mRNAPosInActiveSite();

				if (s->get_mRNAPosInActiveSite() == 1)  s->backward(); 
				double k0_1 = s->calculateForwardRate(true, true);
				double k0_minus1 = s->calculateBackwardRate(true, true);
				//double boltzmannG0 = exp(-(s->calculateTranslocationFreeEnergy(true)));


				// Get rate of translocating from 1 to 2
				s->forward(); 
				s->set_terminated(false);
				double k1_0 = s->calculateBackwardRate(true, true);
				double k1_2 = s->calculateForwardRate(true, true);
				//double boltzmannG1 = exp(-(s->calculateTranslocationFreeEnergy(true)));

				// Move back to original position
				if (currentTranslocationPosition != s->get_mRNAPosInActiveSite()) s->backward();


				double boltzmannG0 = 0;
				double boltzmannG1 = 1;
				double boltzmannGN = 0;
				if (k1_0 != 0 && s->getLeftTemplateBaseNumber() >= 1 && s->getLeftTemplateBaseNumber() - bubbleLeft->getVal(true) -1 > 2){
					boltzmannG0 = 1;
					boltzmannG1 = k0_1 / k1_0;
				}


				//console.log("sampledBaseToAdd", sampledBaseToAdd);


				// Get KD and [NTP]
				if (s->get_mRNAPosInActiveSite() + 1 < templateSequence.length()){

					kBindOrCat = s->calculateBindOrCatNTPrate(true);
					
					if (kBindOrCat != 0){

						double NTPconcentration = 0;
						if (currentModel->get_useFourNTPconcentrations()){
							string toBind = Settings::complementSeq(templateSequence.substr(s->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
							if (toBind == "A") NTPconcentration = ATPconc->getVal(true);
							else if (toBind == "C") NTPconcentration = CTPconc->getVal(true);
							else if (toBind == "G") NTPconcentration = GTPconc->getVal(true);
							else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal(true);
						}
						else NTPconcentration = NTPconc->getVal(true);

						double KD = Kdiss->getVal(true);
						boltzmannGN = boltzmannG1 * NTPconcentration / KD;
						if (!s->get_activated()) boltzmannGN = 0;
					}

				}

			


				// Calculate the probabilities of being in the 3 states (0, 1 and 1N)
				/*
				var A = KD / NTPconc;
				var B = k0_1 / k1_0;
				var probabilityPretranslocated = A / (A*B + A + B);
				var probabilityPosttranslocated = A*B / (A*B + A + B);
				var probabilityBound = B / (A*B + A + B);
				*/



				double normalisationZ = boltzmannG0 + boltzmannG1 + boltzmannGN;

				double probabilityPretranslocated = boltzmannG0 / normalisationZ;
				double probabilityPosttranslocated = boltzmannG1 / normalisationZ;
				double probabilityBound = boltzmannGN / normalisationZ;
			
			

				// Can only catalyse if not beyond the end of the sequence, go forward to terminate
				if (s->get_nascentLength() + 1 < templateSequence.length()){
					kBindOrCat = s->calculateCatalysisRate(true) * probabilityBound; // Can only catalyse if NTP bound
				}


				kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
				kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated
				kDeactivate = kDeactivate * probabilityPretranslocated; // Can only deactivate pretranslocated (or backstep1) state



			}



			double rates[] = { kBck, kFwd, kRelease, kBindOrCat, kActivate, kDeactivate, 0, kCleave };
			int numReactions = (sizeof(rates)/sizeof(*rates));

			double rateSum = 0;
			for (int i = 0; i < numReactions; i ++) {
				//cout << rates.at(i) << ", ";
				rateSum += rates[i];
			}
			//cout << endl;

			
			// No operations
			if (rateSum <= 0){
				// cout << "No operations to apply" << endl;
                
	            if (!this->animatingGUI) {
                    s->terminate();
                    break;
                }
                else {
                    this->actionsToReturn.push_back(6); // 6 = terminate
                    return;
                }
			}
 			
			
			// Generate a random number to determine which reaction to apply
			double runifNum = runif() * rateSum; //runif() * rateSum;
			double cumsum = 0;
			int reactionToDo = -1;

			
			
			for (int i = 0; i < numReactions; i ++) {
				cumsum += rates[i];
				if (runifNum < cumsum) {
					reactionToDo = i;
					break;
				}
			}



			

			//if (s->get_nascentLength() == 3984 && s->get_mRNAPosInActiveSite() == 0 && this->nTrialsCompletedGUI > 1400){
				//cout << nTrialsCompletedGUI << ": reactionToDo " << reactionToDo << ", bck:" << rates[0] << ", fwd:" << rates[1] << ", rel:" << rates[2] << ", cat:" << rates[3] << endl;
			//}
			
			
			double reactionTime = rexp(rateSum); // Random exponential
			
			//cout << "sampled reaction " << reactionToDo  << ", time elapsed = " << timeElapsed << endl;

			//if (reactionToDo == -1){
				//cout << nTrialsCompletedGUI << ", runifNum:" << runifNum << ", reactionToDo " << reactionToDo << ", bck:" << rates[0] << ", fwd:" << kFwd << ", rel:" << rates[2] << ", cat:" << rates[3] << endl;
				//cout << "DGtaudag->getVal(true) " << DGtaudag->getVal(true) << " exp(-DGtaudag->getVal(true)) " << exp(-DGtaudag->getVal(true)) << " exp(-9.079) " << exp(-9.079) <<  endl;
			//}




			int actionsToDoList[3] = {reactionToDo, -2, -2};

			// If assume binding equilibrium and sampled catalysis then this is actually a double operation (bind then catalysis)
			if (justBindingEquilibrium && reactionToDo == 3) {
				actionsToDoList[0] = 3;
				actionsToDoList[1] = 3;
			}

			// If assume translocation equilibrium
			else if (justTranslocationEquilibrium){

				if (reactionToDo == 3 && s->get_mRNAPosInActiveSite() == 0){

					// Need to be in posttranslocated state before binding 
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 3;
				}

				else if (reactionToDo == 1 && s->get_mRNAPosInActiveSite() == 0) {

					// Need to be in posttranslocated state before moving forward 
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 1;
				}

				else if (reactionToDo == 0 && s->get_mRNAPosInActiveSite() == 1) {

					// Need to be in pretranslocated state before moving backwards 
					actionsToDoList[0] = 0;
					actionsToDoList[1] = 0;
				}

			}

			// If assume binding AND translocation equilibrium. NTP is required to be unbound
			else if (bindingAndTranslocationEquilibrium){

				if (reactionToDo == 3 && s->get_mRNAPosInActiveSite() == 0){

					// Forward, bind, catalyse
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 3;
					actionsToDoList[2] = 3;
				}

				else if (reactionToDo == 3 && s->get_mRNAPosInActiveSite() == 1) {

					// Bind, catalyse
					actionsToDoList[0] = 3;
					actionsToDoList[1] = 3;
				}

				else if (reactionToDo == 1 && s->get_mRNAPosInActiveSite() == 0) {

					// Forward, forward
					actionsToDoList[0] = 1;
					actionsToDoList[1] = 1;
				}

				else if (reactionToDo == 0 && s->get_mRNAPosInActiveSite() == 1) {

					// Backwards, backwards
					actionsToDoList[0] = 0;
					actionsToDoList[1] = 0;
				}

			}



			// Apply the reaction(s) unless in animation mode
			for (int i = 0; i < 3; i ++){
				if (actionsToDoList[i] == -2) break;

				// Update the plots immediately before the final reaction in the list has been applied
				if ((_RECORD_PAUSE_TIMES || (_USING_GUI && !_RUNNING_ABC) || _plotFolderName != "") && (i == 2 || actionsToDoList[i+1] == -2) && this->simulator_plots) this->simulator_plots->updatePlotData(s, actionsToDoList[i], actionsToDoList, reactionTime);

				if (!this->animatingGUI) executeAction(s, actionsToDoList[i]);
				else this->actionsToReturn.push_back(actionsToDoList[i]);

			}



			// Return now if in animation mode
			if (this->animatingGUI) return;



			timeElapsed += reactionTime;

			if (s->get_nascentLength() != lastBaseTranscribed){
				timeElapsedSinceLastCatalysis = 0;
				lastBaseTranscribed = s->get_nascentLength();
			} 
			else timeElapsedSinceLastCatalysis += reactionTime;


		}


		
		//s.print();
	}


	//cout << "Done" << endl;

	// Total time taken
	toReturn[1] += timeElapsed;
	timeElapsed = toReturn[1];

	// Calculate mean velocity
	int distanceTravelled = s->get_nascentLength() - s->get_initialLength();
	double velocity = timeElapsed > 0 ? distanceTravelled / timeElapsed : 0;
	//cout << "distanceTravelled = " << distanceTravelled << endl;
	//cout << "timeElapsed = " << timeElapsed << endl;
	//cout << "velocity = " << velocity << endl;
	/*
	cout << "kcat " << kCat->getVal(true) << " KD " << Kdiss->getVal(true) << "[ATP] = " << ATPconc->getVal(true) << "F = " << FAssist->getVal(true) << "DGslide = " << DGtaudag->getVal(true) << endl;
	cout << "Trans eq: " << currentModel->get_assumeTranslocationEquilibrium() << " Bind eq " << currentModel->get_assumeBindingEquilibrium() << endl;
	*/
	//cout << s->get_initialLength() << ";" "distanceTravelled = " << distanceTravelled << endl;
	toReturn[0] = velocity;
    
    
    
    
    chrono::duration<double> elapsed_seconds = chrono::system_clock::now() - _interfaceSimulation_startTime;
    double time = elapsed_seconds.count();
    if (time >= simulateForSeconds) toReturn[2] = 0; // Timeout
	else toReturn[2] = 1; // Success



    // If it terminated before reaching the end of the sequence then set the proportion of time spent at this final length accordingly
    if(this->simulator_plots) simulator_plots->onTerminate(s, timeElapsed, arrestTime->getVal(true));
	
}



// Assumes binding to be at equilibrium
double Simulator::geometricTranslocationSampling(State* s){

	if (s->isTerminated()) return -1;
	if (!s->get_activated()) return -1;
	if (s->NTPbound()) return -1;
	if (s->get_mRNAPosInActiveSite() != 1) return -1;

	//cout << "geometricTranslocationSampling" << endl;

	// Get forward and backward rates
	double kBck = s->calculateBackwardRate(true, true);
	s->backward(); 
	double kFwd  = s->calculateForwardRate(true, true);
	s->forward();


	double kDeactivate = s->calculateDeactivateRate(true);
    if (currentModel->get_currentBacksteppingModel_int() == -1) kDeactivate = 0;

	//s->print();
	//cout << "geometricTranslocationSampling kbck " << kBck << endl;


	// Get time spent in bound and unbound states
	double KD = Kdiss->getVal(true);
	double NTPconcentration = 0;
	if (currentModel->get_useFourNTPconcentrations()){
		string toBind = Settings::complementSeq(templateSequence.substr(s->get_nascentLength(),1), PrimerType.substr(2) == "RNA");
		if (toBind == "A") NTPconcentration = ATPconc->getVal(true);
		else if (toBind == "C") NTPconcentration = CTPconc->getVal(true);
		else if (toBind == "G") NTPconcentration = GTPconc->getVal(true);
		else if (toBind == "U" || toBind == "T") NTPconcentration = UTPconc->getVal(true);
	}
	else NTPconcentration = NTPconc->getVal(true);
	double probabilityBound = (NTPconcentration/KD) / (NTPconcentration/KD + 1);
	double probabilityUnbound = 1 - probabilityBound;


	// Mofify the rates
	double kcat = s->calculateCatalysisRate(true) * probabilityBound; // Can only catalyse if NTP bound
	kBck = kBck * probabilityUnbound; // Can only translocate if NTP is not bound



	// Rate of going back then forward, vs back then deactivate
	double kFwdInact = kFwd + kDeactivate;
	double kBckFwd = kBck * kFwd / kFwdInact;
	double kBckInact = kBck * kDeactivate / kFwdInact;


	double rate = kBck + kcat;


	// Keep sampling until it is NOT back-forward
	double runifNum = runif() * rate;
	double totalReactionTime = 0;
	while(runifNum < kBckFwd){
		totalReactionTime += rexp(rate);  // Time taken to go back
		totalReactionTime += rexp(kFwdInact); // Time taken to come forward again without inactivating
		runifNum = runif() * rate;
	}
	totalReactionTime += rexp(rate);



	int actionsToDoList[2] = {-2, -2};

	// Back then inactivate
	if (runifNum - kBckFwd < kBckInact){
		totalReactionTime += rexp(kFwdInact); // Rate inactivation after going backwards
		actionsToDoList[0] = 0;
		actionsToDoList[1] = 5;
	}


	// Bind then catalyse
	else if (runifNum - kBckFwd < kBckInact + kcat){
		actionsToDoList[0] = 3;
		actionsToDoList[1] = 3;
	}
   

	// Apply the reaction(s) unless in animation mode
	for (int i = 0; i < 2; i ++){
		if (actionsToDoList[i] == -2) break;

		// Update the plots immediately before the final reaction in the list has been applied
		if ((_RECORD_PAUSE_TIMES || (_USING_GUI && !_RUNNING_ABC) || _plotFolderName != "") && (i == 1 || actionsToDoList[i+1] == -2) && this->simulator_plots) this->simulator_plots->updatePlotData(s, actionsToDoList[i], actionsToDoList, totalReactionTime);

		if (!this->animatingGUI) executeAction(s, actionsToDoList[i]);
		else this->actionsToReturn.push_back(actionsToDoList[i]);

	}


	
	return totalReactionTime;

}





// Assumes neither binding nor translocation to be at equilibrium
double Simulator::geometricTranslocationBindingSampling(State* s){

	if (s->isTerminated()) return -1;
	if (s->NTPbound()) return -1;
	if (!s->get_activated()) return -1;
	if (s->get_mRNAPosInActiveSite() != 1) return -1;
	

	// Get forward and backward rates
	double kBck = s->calculateBackwardRate(true, true); // Back = from 1 to 0
	s->backward(); 
	double kFwd  = s->calculateForwardRate(true, true); // Forward = from 0 to 1
	s->forward();


	//cout << "kBck " << kBck << " kFwd " << kFwd << endl;
	//s->print();
	//cout << "geometricTranslocationBindingSampling " << endl;// << kBck << " kFwd " << kFwd << endl;


	// Rate of going back then forward, vs back, then deactivate
	double kDeactivate = s->calculateDeactivateRate(true);
    if (currentModel->get_currentBacksteppingModel_int() == -1) kDeactivate = 0;
	double kFwdInact = kFwd + kDeactivate;
	double kBckFwd = kBck * kFwd / kFwdInact;
	double kBckInact = kBck * kDeactivate / kFwdInact;


	// Rate of binding then releasing, vs binding then catalysing
	double kRelease = s->calculateReleaseNTPRate(true);
	double kBind = s->calculateBindOrCatNTPrate(true);
	double kcat = s->calculateCatalysisRate(true);
	double rateRelCat = kRelease + kcat;
	double rateBindRelease = kBind * kRelease / rateRelCat;
	double rateBindCat = kBind * kcat / rateRelCat;

	double rate_bindRelease_or_backforward = rateBindRelease + kBckFwd;
	double rate = kBind + kBck; // + kDeactivate;


	// Keep sampling until it is NOT bind-release or back-forward 
	double runifNum = runif() * rate;
	double totalReactionTime = 0;
	//int n = 0;
	while(runifNum < rate_bindRelease_or_backforward){

		// Bind-release
		if (runifNum < rateBindRelease) {
			totalReactionTime += rexp(rate);  // Time taken to bind
			totalReactionTime += rexp(rateRelCat); // Time taken to release
		}

		// Back-forward
		else{
			totalReactionTime += rexp(rate); // Time taken to go back
			totalReactionTime += rexp(kFwdInact); // Time taken to come forward again
		}
		//n++;
		runifNum = runif() * rate;
	}

	totalReactionTime += rexp(rate);
	//cout << n << endl;


	int actionsToDoList[2] = {-2, -2};


	// Bind then catalyse
	if (runifNum - rate_bindRelease_or_backforward < rateBindCat){

		totalReactionTime += rexp(rateRelCat); // Rate cat after binding

		// Actions to do: bind, catalyse
		actionsToDoList[0] = 3;
		actionsToDoList[1] = 3;

	}


	// Back then inactivate
	else if (runifNum - rate_bindRelease_or_backforward <  rateBindCat + kBckInact){

		totalReactionTime += rexp(kFwdInact); // Rate inactivation after going backwards

		// Actions to do: back, deactivate
		actionsToDoList[0] = 0;
		actionsToDoList[1] = 5;

	}


	
	else{

		cout << "ERROR 4242" << endl;
        exit(0);

	}


	// Apply the reaction(s) unless in animation mode
	for (int i = 0; i < 2; i ++){
		if (actionsToDoList[i] == -2) break;

		// Update the plots immediately before the final reaction in the list has been applied
		if ((_RECORD_PAUSE_TIMES || (_USING_GUI && !_RUNNING_ABC) || _plotFolderName != "") && (i == 1 || actionsToDoList[i+1] == -2) && this->simulator_plots) this->simulator_plots->updatePlotData(s, actionsToDoList[i], actionsToDoList, totalReactionTime);

		if (!this->animatingGUI) executeAction(s, actionsToDoList[i]);
		else this->actionsToReturn.push_back(actionsToDoList[i]);

		//cout << "Pushing " << actionsToDoList[i] << endl;

	}


	
	return totalReactionTime;


}




// Assumes binding to be kinetic
double Simulator::geometricBindingSampling(State* s){

	if (s->isTerminated()) return 0-1;
	if (s->NTPbound()) return -1;
	if (!s->get_activated()) return -1;
	if (s->get_mRNAPosInActiveSite() != 0 && s->get_mRNAPosInActiveSite() != 1) return -1;
	

	double kBck = s->calculateBackwardRate(true, true);
	double kFwd = s->calculateForwardRate(true, true);
	double kRelease = s->calculateReleaseNTPRate(true);
	double kBind = s->calculateBindOrCatNTPrate(true);
	double kcat = s->calculateCatalysisRate(true);
	double kDeactivate = s->calculateDeactivateRate(true);
    if (currentModel->get_currentBacksteppingModel_int() == -1) kDeactivate = 0;

	//s->print();
	//cout << "geometricBindingSampling " << s->get_mRNAPosInActiveSite() << endl;


	bool assumeTranslocationEquilibrium =  	!currentModel->get_assumeBindingEquilibrium()
											&&  currentModel->get_assumeTranslocationEquilibrium() 
											&&  (s->get_mRNAPosInActiveSite() == 0 || s->get_mRNAPosInActiveSite() == 1) && !s->NTPbound();


	if (assumeTranslocationEquilibrium){


		//cout << "XXXX" << endl;

		// Get rate of translocating from 0 to -1
		int currentTranslocationPosition = s->get_mRNAPosInActiveSite();

		if (s->get_mRNAPosInActiveSite() == 1)  s->backward(); 
		double k0_1 = s->calculateForwardRate(true, true);
		double k0_minus1 = s->calculateBackwardRate(true, true);


		// Get rate of translocating from 1 to 2
		s->forward(); 
		double k1_0 = s->calculateBackwardRate(true, true);
		double k1_2 = s->calculateForwardRate(true, true);


		// Move back to original position
		if (currentTranslocationPosition != s->get_mRNAPosInActiveSite()) s->backward();



		// Percentage of time spent in either state
		double eqConstantFwdTranslocation = k0_1 / k1_0;
		double probabilityPosttranslocated = 1;
		double probabilityPretranslocated = 0;
		if (eqConstantFwdTranslocation != INFINITY && eqConstantFwdTranslocation != 0){
			probabilityPosttranslocated = eqConstantFwdTranslocation / (eqConstantFwdTranslocation + 1);
			probabilityPretranslocated = 1 - probabilityPosttranslocated;
		}

		//console.log("k0_1", k0_1, "k1_0", k1_0, "probabilityPosttranslocated", probabilityPosttranslocated);


		kFwd = k1_2 * probabilityPosttranslocated; // Can only enter hypertranslocated state from posttranslocated
		//kRelease = kRelease * probabilityPosttranslocated;
		kBind = kBind * probabilityPosttranslocated;
		//kcat = kcat * probabilityPosttranslocated;
		kBck = k0_minus1 * probabilityPretranslocated; // Can only backtrack from pretranslocated
        
        // Can only deactivate form pretranslocated position (or backstep1)
		kDeactivate = kDeactivate*probabilityPretranslocated;


	}
	//cout << "kBind=" << kBind << endl;

    // THIS WILL NOT WORK IF TRANSLOCATION NOT AT EQUILIBRIUM
	double rateRelCat = kRelease + kcat;
	double rateBindRelease = kBind * kRelease / rateRelCat;
	double rate = kBck + kFwd + kBind + kDeactivate; // + kRelease


	//cout << "kBck = " << kBck << " kFwd = " << kFwd << " kRelease = " << kRelease << " kBind = " << kBind << " kcat = " << kcat << " rateRelCat = " << rateRelCat << " rateBindRelease = " << rateBindRelease << " rate = " << rate << endl;


	// Keep sampling until it is NOT bind release
	double runifNum = runif() * rate;
	double totalReactionTime = 0;
	while(runifNum < rateBindRelease){
		totalReactionTime += rexp(rate);  // Time taken to bind
		totalReactionTime += rexp(rateRelCat); // Time taken to release
		runifNum = runif() * rate;
	}
	totalReactionTime += rexp(rate); // Add the time of the next action


	// Choose next action uniformly
	kRelease = 0;
	double rateBindCat = kBind * kcat / rateRelCat;// assumeTranslocationEquilibrium ? kBind : kBind * kcat / rateRelCat;
	double rates[] = { kBck, kFwd, kRelease, rateBindCat, 0, kDeactivate };
	int numReactions = (sizeof(rates)/sizeof(*rates));
	double sum = kBck + kFwd + kRelease + rateBindCat + kDeactivate;
	runifNum = runif() * sum;
	double cumsum = 0;
	int toDo = -1;
	for (int i = 0; i < (sizeof(rates)/sizeof(*rates)); i ++){
		cumsum += rates[i];
		if (runifNum < cumsum) {
			toDo = i;
			break;
		}

	}


	//cout << "rateBindCat = " << rateBindCat << " numReactions = " << numReactions << " sum = " << sum << " toDo = " << toDo << endl;



	// If next action is bindcat then add the time for catalysis
	int actionsToDoList[3] = {toDo, -2, -2};

	if (!assumeTranslocationEquilibrium && toDo == 3) {
		totalReactionTime += rexp(rateRelCat);
		actionsToDoList[0] = 3;
		actionsToDoList[1] = 3;
	}


	else if(assumeTranslocationEquilibrium){


		if (toDo == 3) {
			totalReactionTime += rexp(rateRelCat);
			if (s->get_mRNAPosInActiveSite() == 0) {

				// Need to be in posttranslocated state before binding 
				actionsToDoList[0] = 1;
				actionsToDoList[1] = 3;
				actionsToDoList[2] = 3;
			}
			else if (s->get_mRNAPosInActiveSite() == 1) {

				// Need to be in posttranslocated state before binding 
				actionsToDoList[0] = 3;
				actionsToDoList[1] = 3;

			}
		}

		else if (toDo == 1 && s->get_mRNAPosInActiveSite() == 0) {

			// Need to be in posttranslocated state before moving forward 
			actionsToDoList[0] = 1;
			actionsToDoList[1] = 1;

		}
		else if (toDo == 0 && s->get_mRNAPosInActiveSite() == 1) {

			// Need to be in pretranslocated state before moving backwards 
			actionsToDoList[0] = 0;
			actionsToDoList[1] = 0;
		}

	}



	// Apply the reaction(s) unless in animation mode
	for (int i = 0; i < 3; i ++){
		if (actionsToDoList[i] == -2) break;

		// Update the plots immediately before the final reaction in the list has been applied
		if ((_RECORD_PAUSE_TIMES || (_USING_GUI && !_RUNNING_ABC) || _plotFolderName != "") && (i == 2 || actionsToDoList[i+1] == -2) && this->simulator_plots) this->simulator_plots->updatePlotData(s, actionsToDoList[i], actionsToDoList, totalReactionTime);

		if (!this->animatingGUI) executeAction(s, actionsToDoList[i]);
		else this->actionsToReturn.push_back(actionsToDoList[i]);

	}

	
	return totalReactionTime;

}


void Simulator::executeAction(State* s, int reactionToDo) {


	switch (reactionToDo) {
		case -1:
			s->print();
			cout << "Error: sampled action -1" << endl;
			exit(0);
			break;
		case 0:
			s->backward();
			break;
		case 1:
			s->forward();
			break;
		case 2:
			s->releaseNTP();
			break;
		case 3:
			s->bindNTP();
			break;
		case 4:
			s->activate();
			break;
		case 5:
			s->deactivate();
			break;
		case 6:
			s->terminate();
			break;
		case 7:
			s->cleave();
			break;
	}

}
