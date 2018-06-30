#! /usr/bin/env node

const Promise = require('bluebird');
global.Promise = Promise;

const pkg = require('./package.json');
const program = require('commander');
const _exec = require("child_process").exec;
const fs = Promise.promisifyAll(require("fs"));
const chalk = require('chalk');
const { logVersionCheck } = require('validate-package-version');

const isNil = (x) => x === null || x === undefined;
const isEmpty = (value) => {
    if (isNil(value)) {
        return true;
    }
    switch (typeof value) {
    case 'string':
        return value.length === 0;
    case 'object':
        return Object.keys(value).length === 0;
    default:
        return false;
    }
};

function exec (cmd, ignoreStterr = false) {
    return new Promise((resolve, reject) => {
        _exec(cmd, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            } else if (!ignoreStterr && !isEmpty(stderr)) {
                return reject(stderr);
            } else {
                return resolve(stdout);
            }
        });
    });
}

const act = (func, ignoreVersionCheck = false) => async (...args) => {
    if (!ignoreVersionCheck) {
        await logVersionCheck(pkg);
    }
    return func(...args);
};

program
    .command('publish <message>')
    .description('Publishes to npm and tags git at the same time based off package.json version')
    .option('-i, --ignore-dirty')
    .action(act(async (message, options) => {
        if (!message) {
            console.error('No git tag message supplied, see help');
            return;
        }

        try {
            const { ignoreDirty = false } = options;
            const isDirty = (await exec('git status -s')).length > 0;
            if (isDirty && !ignoreDirty) {
                throw new Error('Seems like you have uncommitted changes locally, aborting publish');
            }

            const data = await fs.readFileAsync('package.json', 'utf8');
            const json = JSON.parse(data);
            const version = json.version;
            await exec('npm publish', true);
            console.log(`Published npm version: ${chalk.bold.green(version)}`);
            await exec(`git tag -a v${version} -m "${message}"`);
            console.log(`Git tagged version: ${chalk.bold.green(version)} with message: ${chalk.bold.green(message)}`);
            await exec(`git push --tags`, true);
            console.log(`Pushed tagged version, ${chalk.bold.green(version)}, to git repo`);
            process.exit(0);
        } catch (error) {
            console.log(chalk.red(error));
            process.exit(1);
        }
    }));

program
    .version(pkg.version)
    .description(pkg.description)
    .parse(process.argv);
