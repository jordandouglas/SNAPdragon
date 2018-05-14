/*
                  minimum free energy folding
                  for a set of aligned sequences

                  c Ivo Hofacker

                  Vienna RNA package
*/

/**
*** \file alifold.c
**/

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <ctype.h>
#include <string.h>
#include <limits.h>

#include "fold_vars.h"
#include "data_structures.h"
#include "mfe.h"
#include "fold.h"
#include "eval.h"
#include "utils.h"
#include "energy_par.h"
#include "params.h"
#include "ribo.h"
#include "gquad.h"
#include "alifold.h"
#include "aln_util.h"
#include "loop_energies.h"

#ifdef _OPENMP
#include <omp.h>
#endif

/*
#################################
# GLOBAL VARIABLES              #
#################################
*/

/*
#################################
# PRIVATE VARIABLES             #
#################################
*/

/* some backward compatibility stuff */
PRIVATE vrna_fold_compound_t  *backward_compat_compound = NULL;
PRIVATE int                 backward_compat           = 0;

#ifdef _OPENMP

#pragma omp threadprivate(backward_compat_compound, backward_compat)

#endif

/*
#################################
# PRIVATE FUNCTION DECLARATIONS #
#################################
*/

PRIVATE float   wrap_alifold( const char **strings,
                              char *structure,
                              vrna_param_t *parameters,
                              int is_constrained,
                              int is_circular);

/*
#################################
# BEGIN OF FUNCTION DEFINITIONS #
#################################
*/

PUBLIC float
vrna_alifold( const char **strings,
              char *structure){

  float                 mfe;
  vrna_fold_compound_t  *vc;
  vrna_md_t             md;

  vrna_md_set_default(&md);

  vc  = vrna_fold_compound_comparative(strings, &md, VRNA_OPTION_DEFAULT);
  mfe = vrna_mfe(vc, structure);

  vrna_fold_compound_free(vc);

  return mfe;
}

PUBLIC float
vrna_circalifold( const char **sequences,
                  char *structure){

  float                 mfe;
  vrna_fold_compound_t  *vc;
  vrna_md_t             md;

  vrna_md_set_default(&md);
  md.circ = 1;

  vc  = vrna_fold_compound_comparative(sequences, &md, VRNA_OPTION_DEFAULT);
  mfe = vrna_mfe(vc, structure);

  vrna_fold_compound_free(vc);

  return mfe;
}


PRIVATE float
wrap_alifold( const char **strings,
              char *structure,
              vrna_param_t *parameters,
              int is_constrained,
              int is_circular){

  vrna_fold_compound_t  *vc;
  vrna_param_t        *P;

#ifdef _OPENMP
/* Explicitly turn off dynamic threads */
  omp_set_dynamic(0);
#endif

  /* we need the parameter structure for hard constraints */
  if(parameters){
    P = vrna_params_copy(parameters);
  } else {
    vrna_md_t md;
    set_model_details(&md);
    md.temperature = temperature;
    P = vrna_params(&md);
  }
  P->model_details.circ = is_circular;

  vc = vrna_fold_compound_comparative(strings, &(P->model_details), VRNA_OPTION_DEFAULT);

  if(parameters){ /* replace params if necessary */
    free(vc->params);
    vc->params = P;
  } else {
    free(P);
  }

  /* handle hard constraints in pseudo dot-bracket format if passed via simple interface */
  if(is_constrained && structure)
    vrna_constraints_add(vc, (const char *)structure, VRNA_CONSTRAINT_DB_DEFAULT);

  if(backward_compat_compound && backward_compat)
    vrna_fold_compound_free(backward_compat_compound);

  backward_compat_compound  = vc;
  backward_compat           = 1;

  return vrna_mfe(vc, structure);
}


/*###########################################*/
/*# deprecated functions below              #*/
/*###########################################*/

#ifdef  VRNA_BACKWARD_COMPAT

PUBLIC void
free_alifold_arrays(void){

  if(backward_compat_compound && backward_compat){
    vrna_fold_compound_free(backward_compat_compound);
    backward_compat_compound  = NULL;
    backward_compat           = 0;
  }
}

PUBLIC float
alifold(const char **strings,
        char *structure){

  return wrap_alifold(strings, structure, NULL, fold_constrained, 0);
}

PUBLIC float circalifold( const char **strings,
                          char *structure) {

  return wrap_alifold(strings, structure, NULL, fold_constrained, 1);
}

PUBLIC void 
update_alifold_params(void){

  vrna_fold_compound_t *v;

  if(backward_compat_compound && backward_compat){
    v = backward_compat_compound;

    if(v->params)
      free(v->params);

    vrna_md_t md;
    set_model_details(&md);
    v->params = vrna_params(&md);
  }
}

PUBLIC float
energy_of_ali_gquad_structure(const char **sequences,
                              const char *structure,
                              int n_seq,
                              float *energy){

  unsigned int  n;
  short         *pt;
  int           *loop_idx;

  if(sequences[0] != NULL){
    
    vrna_fold_compound_t  *vc;

    vrna_md_t md;
    set_model_details(&md);
    md.gquad = 1;

    vc = vrna_fold_compound_comparative(sequences, &md, VRNA_OPTION_EVAL_ONLY);

    energy[0] = vrna_eval_structure(vc, structure);
    energy[1] = vrna_eval_covar_structure(vc, structure);

    vrna_fold_compound_free(vc);
  }
  else vrna_message_error("energy_of_alistruct(): no sequences in alignment!");

  return energy[0];

}

PUBLIC  float
energy_of_alistruct(const char **sequences,
                    const char *structure,
                    int n_seq,
                    float *energy){

  short         *pt;

  if(sequences[0] != NULL){
    vrna_fold_compound_t  *vc;

    vrna_md_t md;
    set_model_details(&md);

    vc = vrna_fold_compound_comparative(sequences, &md, VRNA_OPTION_EVAL_ONLY);

    energy[0] = vrna_eval_structure(vc, structure);
    energy[1] = vrna_eval_covar_structure(vc, structure);

    vrna_fold_compound_free(vc);
  }
  else vrna_message_error("energy_of_alistruct(): no sequences in alignment!");

  return energy[0];
}

#endif