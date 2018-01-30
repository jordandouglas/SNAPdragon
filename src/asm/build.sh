#!/bin/bash -e

echo "Building SimpolC..."

g++ -std=c++11 -o SimpolC cimpol.cpp Parameter.cpp XMLparser.cpp Model.cpp MCMC.cpp ExperimentalData.cpp PosteriorDistriutionSample.cpp Simulator.cpp State.cpp Settings.cpp FreeEnergy.cpp TranslocationRatesCache.cpp randomc/mersenne.cpp tinyxml/tinystr.cpp tinyxml/tinyxml.cpp tinyxml/tinyxmlerror.cpp tinyxml/tinyxmlparser.cpp 


echo "Done! Saved to SimpolC"