#!/bin/bash -e

echo "Building SimpolC..."

g++ -std=c++11 -fpermissive -pthread -o SimpolC cimpol.cpp HTMLobject.cpp Coordinates.cpp SimPol_vRNA_interface.c \
   Parameter.cpp SlippageLandscapes.cpp XMLparser.cpp ParameterHeatmapData.cpp Plots.cpp PlotSettings.cpp \
    BayesianCalculations.cpp Model.cpp MCMC.cpp ExperimentalData.cpp WasmMessengerNull.cpp SimulatorPthread.cpp \
    PosteriorDistriutionSample.cpp Simulator.cpp State.cpp Sequence.cpp Settings.cpp FreeEnergy.cpp TranslocationRatesCache.cpp \
    Polymerase.cpp randomc/mersenne.cpp tinyxml/tinystr.cpp tinyxml/tinyxml.cpp tinyxml/tinyxmlerror.cpp tinyxml/tinyxmlparser.cpp  \
	ViennaRNA/dist_vars.c ViennaRNA/data_structures.c \
	ViennaRNA/part_func.c ViennaRNA/read_epars.c ViennaRNA/treedist.c ViennaRNA/energy_par.c ViennaRNA/inverse.c \
	ViennaRNA/ProfileDist.c ViennaRNA/RNAstruct.c ViennaRNA/utils.c ViennaRNA/mfe.c ViennaRNA/fold.c ViennaRNA/naview.c \
	ViennaRNA/stringdist.c ViennaRNA/params.c ViennaRNA/subopt.c ViennaRNA/list.c ViennaRNA/Lfold.c \
	ViennaRNA/cofold.c ViennaRNA/part_func_co.c ViennaRNA/ProfileAln.c ViennaRNA/duplex.c ViennaRNA/alifold.c \
	ViennaRNA/alipfold.c ViennaRNA/aln_util.c ViennaRNA/LPfold.c ViennaRNA/string_utils.c ViennaRNA/part_func_up.c \
	ViennaRNA/ribo.c ViennaRNA/findpath.c ViennaRNA/convert_epars.c ViennaRNA/MEA.c ViennaRNA/aliLfold.c ViennaRNA/mm.c \
	ViennaRNA/2Dfold.c ViennaRNA/2Dpfold.c ViennaRNA/plex_functions.c ViennaRNA/ali_plex.c \
	ViennaRNA/c_plex.c ViennaRNA/plex.c ViennaRNA/snofold.c ViennaRNA/snoop.c ViennaRNA/move_set.c ViennaRNA/gquad.c ViennaRNA/eval.c \
	ViennaRNA/constraints.c ViennaRNA/ligand.c ViennaRNA/perturbation_fold.c ViennaRNA/centroid.c \
	ViennaRNA/structure_utils.c ViennaRNA/model.c ViennaRNA/file_formats.c ViennaRNA/dp_matrices.c \
	ViennaRNA/exterior_loops.c ViennaRNA/hairpin_loops.c \
	ViennaRNA/interior_loops.c ViennaRNA/multibranch_loops.c ViennaRNA/boltzmann_sampling.c \
	ViennaRNA/constraints_SHAPE.c ViennaRNA/constraints_hard.c ViennaRNA/constraints_soft.c \
	ViennaRNA/alphabet.c ViennaRNA/equilibrium_probs.c ViennaRNA/file_formats_msa.c


echo "Done! Saved to SimpolC"
