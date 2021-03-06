# SimPol

An interactive graphical simulator of nucleic acid polymerases. SimPol is written in JavaScript and C++, and uses WebAssembly to enabling running the C++ module in a web environment. SimPol is currently in pre-release and is not yet complete. Overview:

  - Visualise and control polymerase translocation, NTP binding, NTP incorporation, NTP misincorporation and slippage during transcription
  - Simulate transcription elongation as a Markov process and visualise in real-time
  - Tweak the transcription elongation model and its parameters
  - Perform parameter/model inference using Markov chain Monte Carlo approximate Bayesian computation (MCMC-ABC)



To run the program on a web browser go to http://www.polymerase.nz. 

For instructions on running the SimPol C++ module from the command line see http://www.polymerase.nz/simpol/about/#Running_SimPol_from_the_command_line



Written by Jordan Douglas, University of Auckland, New Zealand, 2019
