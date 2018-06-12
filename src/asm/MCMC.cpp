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


#include "MCMC.h"

#include "State.h"
#include "Model.h"
#include "Parameter.h"
#include "SimulatorPthread.h"
#include "Settings.h"




#include <iostream>
#include <list>
#include <math.h> 
#include <thread>

using namespace std;


list<ExperimentalData>::iterator MCMC::currentExperiment;
list<Parameter*> MCMC::parametersToEstimate;
bool MCMC::estimatingModel;
bool MCMC::hasAchievedBurnin;
bool MCMC::hasAchievedPreBurnin;
double MCMC::epsilon = 0;

int MCMC::nacceptances = 0;
int MCMC::nTrialsUntilBurnin = 0;
int MCMC::initialStateNum = 0;


PosteriorDistriutionSample* MCMC::previousMCMCstate;
PosteriorDistriutionSample* MCMC::currentMCMCstate;


void MCMC::initMCMC(){

	cout << "\nInitialising MCMC..." << endl;
	bool printToFile = outputFilename != "";


	// Sample parameters and model
	Settings::sampleAll();

	// Build a list of parameters which need to be estimated
	MCMC::estimatingModel = modelsToEstimate.size() > 1;
	MCMC::parametersToEstimate.clear();
	MCMC::hasAchievedBurnin = false;
	MCMC::hasAchievedPreBurnin = false;

	MCMC::tryToEstimateParameter(hybridLen);
	MCMC::tryToEstimateParameter(bubbleLeft);
	MCMC::tryToEstimateParameter(bubbleRight);
	MCMC::tryToEstimateParameter(GDagSlide);
	MCMC::tryToEstimateParameter(DGPost);
	MCMC::tryToEstimateParameter(barrierPos);
	MCMC::tryToEstimateParameter(kCat);
	MCMC::tryToEstimateParameter(Kdiss);
	MCMC::tryToEstimateParameter(RateBind);


	// 2 states stored in memory
	MCMC::previousMCMCstate = new PosteriorDistriutionSample(0);
	// MCMC::currentMCMCstate = new PosteriorDistriutionSample(0);

	// Load initial state from file
	if (_resumeFromLogfile){
		MCMC::previousMCMCstate->loadFromLogFile(outputFilename);
		MCMC::previousMCMCstate->setParametersFromState();
	}


	// Otherwise perform the first MCMC trial on the initial state
	else{

		MCMC::metropolisHastings(0, MCMC::previousMCMCstate, nullptr);
		MCMC::previousMCMCstate->printHeader(printToFile);
		MCMC::previousMCMCstate->print(printToFile);

	}


	cout << "Estimating the following " << parametersToEstimate.size() << " parameters:" << endl;
	for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
		(*it)->print();
	}
	cout << endl;


	MCMC::nacceptances = 0;
	MCMC::nTrialsUntilBurnin = 0;


	// Intialise epsilon to the initial threshold value
	MCMC::initialStateNum = MCMC::previousMCMCstate->getStateNumber() + 1;
	MCMC::epsilon = max(_chiSqthreshold_0 * pow(_chiSqthreshold_gamma, MCMC::initialStateNum-1), _chiSqthreshold_min);


}


void MCMC::beginMCMC(){


	//Settings::print();
	for (int n = MCMC::initialStateNum; n <= ntrials_abc; n ++){
		MCMC::perform_1_iteration(n);
	}

}




void MCMC::perform_1_iteration(int n){

	if ((n == MCMC::initialStateNum || n % logEvery == 0) && !_USING_GUI){
		cout << "Performing MCMC trial " << n << "; epsilon = " << MCMC::epsilon << "; Acceptance rate = " << ((double)MCMC::nacceptances/(n - MCMC::nTrialsUntilBurnin - MCMC::initialStateNum + 1)) <<  endl;
	}


	// Update threshold epsilon
	if (MCMC::epsilon > _chiSqthreshold_min){
		MCMC::epsilon = max(MCMC::epsilon * _chiSqthreshold_gamma, _chiSqthreshold_min);
	}


	// If almost at epsilon then switch to the large number of tests per datapoint
	if (!MCMC::hasAchievedPreBurnin && MCMC::epsilon <= _chiSqthreshold_min * 2){
		MCMC::hasAchievedPreBurnin = true;
		cout << "------- Pre-burn-in reached. Number of trials per datapoint = " << testsPerData << " -------" << endl;
	}
	
	
	// See if burnin has been achieved. Once it has, print it out in console and reset the acceptance rate
	if (!MCMC::hasAchievedBurnin && MCMC::epsilon <= _chiSqthreshold_min && MCMC::previousMCMCstate->get_chiSquared() <= MCMC::epsilon){
		MCMC::hasAchievedBurnin = true;
		MCMC::nTrialsUntilBurnin = n - MCMC::initialStateNum + 1;
		MCMC::nacceptances = 0;
		cout << "------- Burn-in achieved. Resetting acceptance rate. -------" << endl;
	}
	
	
	// Temp HACK: if burnin has not been achieved but it should have then exit
	if (!MCMC::hasAchievedBurnin && MCMC::epsilon <= _chiSqthreshold_min && MCMC::previousMCMCstate->get_chiSquared() > MCMC::epsilon){
		
		// Wait 500 states after convergence has failed until exiting
		double cutoff = log(_chiSqthreshold_min / _chiSqthreshold_0) / log(_chiSqthreshold_gamma) + 500;
		if (n > cutoff){
			cout << "------- Burn-in failed. Exiting now. -------" << endl;
			exit(0);
		}
	}
	


	// Make proposal and alter the parameters to those of the new state
	makeProposal();



	// Accept or reject
	MCMC::currentMCMCstate = new PosteriorDistriutionSample(n);
	bool accepted = MCMC::metropolisHastings(n, MCMC::currentMCMCstate, MCMC::previousMCMCstate);

	//currentMCMCstate->print(false);



	// Accept
	if (accepted){
		
		MCMC::nacceptances ++;
		//cout << "Accept" << endl;


		delete MCMC::previousMCMCstate;
		MCMC::previousMCMCstate = MCMC::currentMCMCstate;



		//currentMCMCstate->print(false);

		// Reset all parameters to make their new value final
		for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
			(*it)->acceptProposal();
		}
	}

	// If reject then restore parameters to those of the previous state
	// This code has no knowledge of which parameter was changed
	else{

		//cout << "Reject" << endl;



		delete MCMC::currentMCMCstate;
		MCMC::currentMCMCstate = MCMC::previousMCMCstate;
		MCMC::currentMCMCstate->setStateNumber(n);
		if (MCMC::estimatingModel) Settings::setModel(MCMC::currentMCMCstate->get_modelIndicator());



		// Revert all parameters to their cached previous values
		for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
			(*it)->rejectProposal();
		}
		currentModel->activateModel();

	}


	// Log
	if (n % logEvery == 0){
		MCMC::currentMCMCstate->print(outputFilename != "");
	}

}





int MCMC::getPreviousStateNumber(){
	return MCMC::previousMCMCstate->getStateNumber();
}



// Looks at the parameters to estimate (and model indicator?) and chooses one uniformly at random to change
// Will also change the global parameters
void MCMC::makeProposal(){


	// Determine how many parameters there are
	int nParams = parametersToEstimate.size();
	int nParamsIncludingModelIndicator = MCMC::estimatingModel ? nParams + 1 : nParams;
	double runifNum = (int)(Settings::runif() * (nParamsIncludingModelIndicator)); // Random integer in range [0, nParamsIncludingModelIndicator-1]

	// Change the model indicator
	if (runifNum >= nParams){
		Settings::sampleModel();
	}

	else {


		// Make proposal for one parameter. If a parameter has 2 instances then it has double the chance of being selected
		int index = 0;
		for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
	
			if (runifNum == index){
				(*it)->makeProposal();
				break;
			}
			index ++;

		}

		// Update the global settings to apply the parameters in this model
		currentModel->activateModel();

	}



}




// Apply a trial and accept / reject the newly proposed parameters
// The PosteriorDistriutionSample object parsed will be overwritten and populated with the appropriate details
// Returns true if accept, false if reject
// If the sampleNum is 0, it will always be accepted
bool MCMC::metropolisHastings(int sampleNum, PosteriorDistriutionSample* this_MCMCState, PosteriorDistriutionSample* prev_MCMCState){
	


	if (!MCMC::resetExperiment()){
		cout << "Could not initialise experiment" << endl;
		exit(0);
	}



	// Cache the parameter values in posterior row object
	for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
		this_MCMCState->addParameterEstimate((*it)->getID(), (*it)->getTrueVal());
	}
	if (MCMC::estimatingModel) this_MCMCState->set_modelIndicator(currentModel->getID());



	// Calculate prior probability
	this_MCMCState->set_logPriorProb(MCMC::calculateLogPriorProbability());


	// Efficiency: sample from the Metropolis prior-ratio now instead of after the simulation. If rejected then don't bother simulating
	if (sampleNum > 0){
		double runifNum = Settings::runif();
		double priorRatio = exp(this_MCMCState->get_logPriorProb() - prev_MCMCState->get_logPriorProb());

		// Reject
		if (runifNum > priorRatio){
			return false;
		}

		// Otherwise perform simulation to determine whether to accept

	}



	// Iterate through all experimental settings and perform simulations at each setting. The velocities generated are cached in the posterior object

	// Run simulations and stop if it exceeds threshold (unless this is the first trial)
	int ntrialsPerDatapoint = MCMC::getNTrials();
	double simulatedVelocity = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
	this_MCMCState->addSimulatedAndObservedValue(simulatedVelocity, MCMC::getExperimentalVelocity());
	if (this_MCMCState->get_chiSquared() > MCMC::epsilon && sampleNum > 0) {
		return false;
	}


	while (MCMC::nextExperiment()){

		// Run simulations and stop if it exceeds threshold (unless this is the first trial)
		ntrialsPerDatapoint = MCMC::getNTrials();
		simulatedVelocity = SimulatorPthread::performNSimulations(ntrialsPerDatapoint, false);
		this_MCMCState->addSimulatedAndObservedValue(simulatedVelocity, MCMC::getExperimentalVelocity());
		if (this_MCMCState->get_chiSquared() > MCMC::epsilon && sampleNum > 0) {
			return false;
		}

	}


	// Exceeds threshold -> reject
	if (this_MCMCState->get_chiSquared() > MCMC::epsilon && sampleNum > 0) return false;


	return true;

}


// Sees if this parameter should be estimated or not and if so adds to "parametersToEstimate"
void MCMC::tryToEstimateParameter(Parameter* param){

	if (param->get_isMetaParameter()){
		for (int i = 0; i < param->getNumberInstances(); i++){
			MCMC::tryToEstimateParameter(param->getParameterInstances().at(i));
		}
	}

	else if (param->getPriorDistributionName() != "Fixed") parametersToEstimate.push_back(param);

}

// Calculates the log prior probability of the current model/parameters
double MCMC::calculateLogPriorProbability(){

	double logPrior = 0;

	if (MCMC::estimatingModel) logPrior += log(currentModel->getPriorProb());
	for (list<Parameter*>::iterator it = parametersToEstimate.begin(); it != parametersToEstimate.end(); ++it){
		logPrior += (*it)->calculateLogPrior();
	}
	return logPrior;

}



// Apply the settings described in experiment 1 observation 1 to the current model settings 
bool MCMC::resetExperiment(){

	
	if (experiments.size() == 0) return false;
	currentExperiment = experiments.begin();

	// Apply settings
	Settings::clearParameterHardcodings();
	currentModel->activateModel();
	(*currentExperiment).reset();

	return true;


}


// Move onto the next experimental setting. If the current experiment has run out of observations then move onto next experiment
bool MCMC::nextExperiment(){

	// Attempt to apply the settings of the next observation in the current experiment
	Settings::clearParameterHardcodings();
	currentModel->activateModel();
	if ((*currentExperiment).next()) {
		//cout << "Next setting" << endl;
		//Settings::print();
		return true;
	}

	// If fails then move onto next experiment
	++currentExperiment;
	if (currentExperiment == experiments.end()) return false;

	(*currentExperiment).reset();

	//cout << "Next experiment" << endl;
	//Settings::print();

	return true;
}



// Returns the velocity of the current experiment
double MCMC::getExperimentalVelocity(){
	return (*currentExperiment).getObservation();
}



// Returns the number of trials to perform for the current experimrnt
int MCMC::getNTrials(){

	if ((*currentExperiment).getNTrials() != 0) return (*currentExperiment).getNTrials();

	// Run a different number of trials pre- and post- pre-burnin
	return MCMC::hasAchievedPreBurnin || _testsPerData_preburnin < 0 ? testsPerData : _testsPerData_preburnin; 

}


// Returns the number of trials to perform for the current experimrnt
int MCMC::getNTrialsPostBurnin(){

	if ((*currentExperiment).getNTrials() != 0) return (*currentExperiment).getNTrials();
	return testsPerData; 

}



