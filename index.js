#! /usr/bin/env node

'use strict';

const Promise = require('bluebird');
global.Promise = Promise;

const program = require('commander');
const _exec = require("child_process").exec;
const fs = Promise.promisifyAll(require("fs"));

function exec (cmd) {
    return new Promise((resolve, reject) => {
        _exec(cmd, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            } else if (stderr) {
                return reject(stderr);
            } else {
                return resolve(stdout);
            }
        });
    });
}

program.version('1.0');

program
    .command('publish <message>')
    .action(async (message) => {
        if (!message) {
            console.error('No git tag message supplied, see help');
            return;
        }

        try {
            const data = await fs.readFileAsync('package.json', 'utf8');
            const json = JSON.parse(data);
            const version = json.version;
            await exec('npm publish');
            await exec(`git tag -a v${version} -m "${message}"`);
            await exec(`git push --tags`);
            console.log(`Published and tagged version ${version}`);
            process.exit(0);
        } catch (error) {
            throw error;
        }
    });

program.parse(process.argv);
