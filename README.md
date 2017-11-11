# save-command
Have a long command you need to type out manually multiple times? Or terminal session ends offten requiring you to re-enter commands every time?
This module solves that! Setup the command, Confifure it and BOOM its now a few keystrokes to type instead of a arthritis inducingly long command!

### USAGE:
set - sets up the command(Your command needs to be surrounded by quotes). Use "#varname" as placeholders for variables.
  save-command set test-command "<your command>"
  save-command set test-command "echo #somthing && cd #longpath"

load - loads & executes the command
  save-command load hello-world

config - Starts the configurator for a command(interactive).
  save-command config hello-world

del - Deletes a command from the config
  save-command del hello-world

EXAMPLE:
  'hello-world':{
    vars:{
      world:'world'
    },
    command:'echo Hello #world'
  }

RESULT:

Hello world
