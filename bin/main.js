#! /usr/bin/env node
const fs = require('fs-extra');
const child_process = require('child_process');
const readline = require('readline');

const appname = 'save-command';
const configName = 'config.json';
const delimiter = '#';
const delimiterRegex = /(#\w+)/gi;

const sample = {
  'hello-world':{
    vars:{
      world:'world'
    },
    command:'echo Hello #world'
  }
};

function usage(configFile){
  console.log(`
CLI Aliases: save-command, scommand

Config location: ${configFile}
Module location: ${__filename}


USAGE:
set - sets up the command(Your command needs to be surrounded by quotes). Use "${delimiter}<name>" as placeholders for variables.
  save-command set test-command "<your command>"
  save-command set test-command "echo $somthing && cd $longpath"

load - loads & executes the command
  save-command load hello-world

config - Starts the configurator for a command(interactive).
  save-command config hello-world

del - Deletes a command from the config
  save-command del hello-world

EXAMPLE:

${JSON.stringify(sample ,null, 2)}

RESULT:

Hello world

    `);
}
class SaveCommands{
  constructor(){
    this.config = {};
    this.configFile = '';
    let args = this.args = process.argv.slice(2);
    let configBase;
    if(process.platform === 'win32'){
      this.configFile = `${process.env.USERPROFILE}\\AppData\\Local\\${appname}\\${configName}`;
    }else if(process.platform === 'darwin'){
      this.configFile = `/Users/${process.env.USER}/library/Application Support/${appname}/${configName}`;
    }else{ //linux
      this.configFile = `/var/tmp/${appname}/${configName}`;
    }
    configBase = this.configFile.substr(0, this.configFile.length - configName.length);
    if(!fs.existsSync(configBase)){
      fs.ensureDirSync(configBase);
      fs.writeJsonSync(this.configFile, sample, {spaces:2});
    }
    let action = args[0];
    if(!action){
      usage(this.configFile);
      return;
    }
    switch(action){
    case 'load': this.load(); break;
    case 'set': this.set(); break;
    case 'del': this.del(); break;
    case 'config': this.configCommand(); break;
    }
  }
  load(){
    const { args, configFile } = this;
    let runCommand = args[1];
    fs.readJson(configFile, (err, obj)=>{
      if(err){
        throw new Error(`There was a error reading "${configFile}". Error: ${err.toString()}`);
      }
      let keys = Object.keys(obj);
      if(!runCommand){
        let o = keys.map(e => `"${e}"`);
        throw new Error(`No command was specified. Use any of: ${o.join(', ')} commands.`);
      }
      if(!keys.includes(runCommand) && runCommand){
        throw new Error(`"${runCommand}" has not been configured yet in config`);
      }
      let interpolated = this.interpolate(runCommand, obj[runCommand]);
      this.exec(runCommand, interpolated);
    });
  }
  set(){
    const { args, configFile } = this;
    let runCommand = args[1];
    if(!runCommand){
      return process.exit();
    }
    let newCommand = {vars:{}};
    let command = args[2];
    if(!command.length){
      throw new Error(`"${runCommand}" requires a command to be set`);
    }
    let vars = command.match(delimiterRegex);
    if(vars && vars.length){
      vars.forEach(i => {
        i = i.replace(delimiter, '');
        newCommand.vars[i] = '';
      });
      console.log(`"${runCommand}" has been set but the vars has not been configured! Use "save-command config ${runCommand} <var>=<value>"`);
    }
    newCommand.command = command;
    fs.readJson(configFile, (err, obj)=>{
      if(err){
        throw new Error(`There was a error reading "${configFile}". Error: ${err.toString()}`);
      }
      let combine = Object.assign({}, obj, {[runCommand]:newCommand});
      fs.writeJsonSync(configFile, combine, {spaces:2});
    });
  }
  del(){
    const { args, configFile } = this;
    let runCommand = args[1];

    if(!runCommand){
      throw new Error('No command was specified.');
    }
    fs.readJson(configFile, (err, obj)=>{
      if(err){
        throw new Error(`There was a error reading "${configFile}". Error: ${err.toString()}`);
      }
      if(obj[runCommand]){
        delete obj[runCommand];
        console.log(`"${runCommand}" was deleted!`);
        fs.writeJsonSync(configFile, obj, {spaces:2});
      }
    });
  }
  interpolate(runCommand, obj){
    return obj.command.replace(delimiterRegex, (capture) =>{
      let t = capture.replace(delimiter, '');
      if(!obj.vars[t]){
        throw new Error(`"${runCommand}" is missing a variable. "${capture}" is not specified in vars or is empty`);
      }
      return obj.vars[t];
    });
  }
  exec(runCommand, command){
    let child = child_process.exec(command);

    child.stderr.pipe(process.stdout);
    child.stdout.pipe(process.stdout);
  }
  configCommand(){
    const { args, configFile } = this;
    let runCommand = args[1];
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    fs.readJson(configFile, (err, obj)=>{
      if(err){
        throw new Error(`There was a error reading "${configFile}". Error: ${err.toString()}`);
      }
      if(!obj[runCommand]) return process.exit();
      let vars = obj[runCommand].vars;
      if(!Object.keys(vars).length){
         console.log(`"${runCommand}" does not need any configuration!`);
         process.exit();
         return;
      }
      let varmap = {};
      let keys = Object.keys(vars);
      let chain = Promise.resolve([]);

      keys.forEach(_var => {
        chain = chain.then(() => {
          return new Promise(resolve => {
            rl.question(`${runCommand} - Enter the variable value for "${_var}" = `, (answer) => {
              varmap[_var] = answer;
              c += 1;
              resolve();
            });
          });
        });
      });

      chain.then(() => {
        rl.close();
        obj[runCommand].vars = varmap;
        fs.writeJsonSync(configFile , obj, {spaces:2});
        console.log(`"${runCommand}" configured!`);
      });
    });
  }
}

module.exports = new SaveCommands();
