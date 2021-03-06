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


#include "../../../src/asm/Parameter.h"
#include "../../../src/asm/XMLparser.h"
#include "../../../src/asm/Settings.h"
#include "../../../src/asm/Model.h"
#include "../../../src/asm/Simulator.h"
#include "../../../src/asm/State.h"
#include "../../../src/asm/Plots.h"
#include "../../../src/asm/FreeEnergy.h"
#include "../../../src/asm/TranslocationRatesCache.h"
#include "../../../src/asm/SimulatorPthread.h"
#include "../../../src/asm/BayesianCalculations.h"
#include "../../../src/asm/SimPol_vRNA_interface.h"
#include "../../../src/asm/SimulatorResultSummary.h"
#include "../../../src/asm/MultipleSequenceAlignment.h"
#include "../../../src/asm/PhyloTree.h"
#include "../../../src/asm/EvolutionSimulator.h"



#include <iostream>
#include <string>
#include <random>
#include <vector>
#include <map>
#include <chrono>
#include <ctime>
#include <thread>
#include <fstream>
#include <sstream>

using namespace std;




/* Optional arguments: 
                
                -fasta <filename>: load in a .fasta alignment file
                -tree <filename>: load in a .nexus tree file (optional)
                -xml <filename>: load in an .xml SimPol session file (optional)
                -o <filename>: file to plot the mean time-to-catalysis matrix into

*/

int main(int argc, char** argv) { 

    
    cout << "Starting PhyloPause" << endl;
    _USING_PHYLOPAUSE = true;
    _RECORD_PAUSE_TIMES = true;
    bool neutral_evolution = false;
    bool pause_site_search = false;
    auto startTime = std::chrono::system_clock::now();


    // Parse arguments
    bool doMCMC = false;
    for (int i = 1; i < argc; i ++){

        string arg = string(argv[i]);

        if(arg == "-xml" && i+1 < argc) {
            i++;
            _inputXMLfilename = string(argv[i]);
        }
        
        
        else if(arg == "-fasta" && i+1 < argc) {
            i++;
           _inputFastaFileName = string(argv[i]);
        }


        else if(arg == "-tree" && i+1 < argc) {
            i++;
            _inputTreeFileName = string(argv[i]);
        }


        else if(arg == "-o" && i+1 < argc) {
            i++;
            _outputFilename = string(argv[i]);
        }


        else if(arg == "-neutral") {
            neutral_evolution = true;
        }


        else if(arg == "-search") {
            pause_site_search = true;
        }
       
       /*
        else if(arg == "-nthreads" && i+1 < argc) {
            i++;
            N_THREADS = atoi(argv[i]);
        }
        */

        else {
            cout << "Invalid command line arguments" << endl;
            exit(0);
        }
        
    }

    // Initialise the thermodynamic parameter table
    FreeEnergy::init_BP_parameters();
    

    Settings::init();
    currentModel = new Model();
    Settings::activatePolymerase("RNAP");
    Settings::sampleAll();
    Settings::initSequences();



    if (!pause_site_search && _inputFastaFileName == ""){
        cout << "Input alignment file required. Please provide the location of a .fasta file with -fasta" << endl;
        exit(0);
    }


    if (_inputXMLfilename == ""){
        //cout << "SimPol session .xml was not specified. Using ../pauser.xml" << endl;
        cout << "Input SimPol session required. Please provide the location of an .xml file with -xml. If you do not have one use pauser.xml." << endl;
        exit(0);
        //_inputXMLfilename = "../pauser.xml";
    }


    if (_inputXMLfilename != ""){
        char* filename = new char[_inputXMLfilename.length() + 1];
        strcpy(filename, _inputXMLfilename.c_str());
        bool succ = XMLparser::parseXMLFromFilename(filename, nullptr);
        delete [] filename;
        if (!succ) exit(1);

    }


    Settings::sampleAll();
    currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
    currentSequence->initRNAunfoldingTable();
    SimulatorPthread::init(); 
    _GUI_PLOTS->init();
    if (PrimerType == "ssRNA") vRNA_init(complementSequence.c_str());



     // Erase all contents of the output file so we can append to the end of it
        if (_outputFilename != ""){
            ofstream* outputFile = new ofstream(_outputFilename);
            if (!outputFile->is_open()) {
                cout << "Cannot open file " << _outputFilename << endl;
                exit(0);
            }

            (*outputFile) << "";
            outputFile->close();
        }



    // Search for pause sites and print to a file
    if (pause_site_search) {

        cout << "Searching for pause sites..." << endl;
        EvolutionSimulator::generateSequencesWithPauseSite(5, 101, 51, 1000000, _outputFilename);
    
    } 

    // Neutral evolution on sequences in the alignment
    else if (neutral_evolution) {

        //cout << "Simulating neutral evolution on input sequences..." << endl;



        // Load in the alignment
        _PP_multipleSequenceAlignment = new MultipleSequenceAlignment();
        string errorMsg = _PP_multipleSequenceAlignment->parseFromFastaFile(_inputFastaFileName);

        if (errorMsg != "") {
            cout << errorMsg << endl;
            exit(1);
        }
        cout << "Alignment successfully parsed." << endl;



        for (int seqNum = 0; seqNum < _PP_multipleSequenceAlignment->get_nseqs(); seqNum++){

            Sequence* seq = _PP_multipleSequenceAlignment->getSequenceAtIndex(seqNum);
            cout << "Simulating neutral evolution on " << seq->getID() << endl;
            EvolutionSimulator::simulateEvolution(seq, 51, 100, 10, 4, _outputFilename);

        }




    }


    // Compute pause statistics for the MSA
    else {


        // Load in the alignment
        _PP_multipleSequenceAlignment = new MultipleSequenceAlignment();
        string errorMsg = _PP_multipleSequenceAlignment->parseFromFastaFile(_inputFastaFileName);

        if (errorMsg != "") {
            cout << errorMsg << endl;
            exit(1);
        }
        cout << "Alignment successfully parsed." << endl;

        

        // Begin PhyloPause
        cout << "Beginning PhyloPause" << endl;
        _PP_multipleSequenceAlignment->PhyloPause();

        


    }

    
    auto endTime = std::chrono::system_clock::now();
    std::chrono::duration<double> elapsed_seconds = endTime-startTime;
    cout << "Done! Time elapsed: " << elapsed_seconds.count() << "s" << endl;

    return 0;

}