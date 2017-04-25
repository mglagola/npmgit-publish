#! /usr/bin/env node

'use strict';

const Promise = require('bluebird');
global.Promise = Promise;

const program = require('commander');
const _exec = require("child_process").exec;
const fs = Promise.promisifyAll(require("fs"));
const chalk = require('chalk');

function exec (cmd, ignoreStterr = false) {
    return new Promise((resolve, reject) => {
        _exec(cmd, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            } else if (!ignoreStterr && stderr) {
                return reject(stderr);
            } else {
                return resolve(stdout);
            }
        });
    });
}

const logGreen = (message) => console.log(chalk.green(message));
const logRed = (message) => console.log(chalk.red(message));

program.version('1.0');

program
    .command('publish <message>')
    .action(async (message) => {
        if (!message) {
            console.error('No git tag message supplied, see help');
            return;
        }

        try {
            const isDirty = (await exec('git status -s')).length > 0;
            if (isDirty) {
                throw new Error('Seems like you have uncommitted changes locally, aborting publish');
            }

            const data = await fs.readFileAsync('package.json', 'utf8');
            const json = JSON.parse(data);
            const version = json.version;
            logGreen(`Published npm version: ${version}`);
            await exec('npm publish');
            await exec(`git tag -a v${version} -m "${message}"`);
            logGreen(`Git tagged version: ${version} with message: ${message}`);
            await exec(`git push --tags`, true);
            logGreen(`Pushed tagged version, ${version}, to git repo`);
            process.exit(0);
        } catch (error) {
            logRed(error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
