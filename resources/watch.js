/* eslint-disable */

import sane from 'sane';
import { resolve as resolvePath } from 'path';
import { spawn } from 'child_process';

process.env.PATH += ':./node_modules/.bin';

var cmd = resolvePath(__dirname);
var srcDir = resolvePath(cmd, '../src');

function exec(command, options) {
  return new Promise((resolve, reject) => {
    var child = spawn(command, options, {
      cmd: cmd,
      env: {
        ...process.env,
      },
      stdio: 'inherit'
    });
    child.on('exit', code => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error('Error code: ' + code));
      }
    });
  });
}

var watcher = sane(srcDir, { glob: ['**/*.js', '**/*.graphql'] })
  .on('ready', startWatch)
  .on('add', changeFile)
  .on('delete', deleteFile)
  .on('change', changeFile);

process.on('SIGINT', () => {
  console.log(CLEARLINE + yellow(invert('stopped watching')));
  watcher.close();
  process.exit();
});

var isChecking;
var needsCheck;
var toCheck = {};
var timeout;

function startWatch() {
  process.stdout.write(CLEARSCREEN + green(invert('watching...')));
}

function changeFile(filepath, root, stat) {
  if (!stat.isDirectory()) {
    toCheck[filepath] = true;
    debouncedCheck();
  }
}

function deleteFile(filepath) {
  delete toCheck[filepath];
  debouncedCheck();
}

function debouncedCheck() {
  needsCheck = true;
  clearTimeout(timeout);
  timeout = setTimeout(guardedCheck, 250);
}

function guardedCheck() {
  if (isChecking || !needsCheck) {
    return;
  }
  isChecking = true;
  var filepaths = Object.keys(toCheck);
  toCheck = {};
  needsCheck = false;
  checkFiles(filepaths).then(() => {
    isChecking = false;
    process.nextTick(guardedCheck);
  });
}

function checkFiles(filepaths) {
  console.log('\u001b[2J');

  return runTests(filepaths)
    // parseFiles(filepaths)
    // .then(() => runTests(filepaths))
    // .then(testSuccess => lintFiles(filepaths)
    //   .then(lintSuccess => testSuccess && lintSuccess))
    .catch(() => false)
    .then(success => {
      process.stdout.write(
        '\n' + (success ? '' : '\x07') + green(invert('watching...'))
      );
    });
}

// Checking steps

function parseFiles(filepaths) {
  console.log('Checking Syntax');

  return Promise.all(filepaths.map(filepath => {
    if (isJS(filepath) && !isTest(filepath)) {
      return exec('babel', [
        '--optional', 'runtime',
        '--out-file', '/dev/null',
        srcPath(filepath)
      ]);
    }
  }));
}

function runTests(filepaths) {
  console.log('\nRunning Tests');
  const cmd = [
    './node_modules/.bin/_mocha',
    '--compilers', 'js:babel-core/register',
    // '--reporter', 'progress',
    '--reporter', 'dot',
    '--require', 'babel-polyfill',
    '--require', './resources/mocha-bootload',
  ].concat(
    allTests(filepaths) ?
      filepaths.map(srcPath) :
      ['src/**/__tests__/**/*-test.js']
  );
  // console.log(cmd);
  return exec('babel-node', cmd).catch(() => false);
}

function lintFiles(filepaths) {
  console.log('Linting Code\n');

  return filepaths.reduce((prev, filepath) => prev.then(prevSuccess => {
    if (isJS(filepath)) {
      process.stdout.write('  ' + filepath + ' ...');
      return exec('eslint', [srcPath(filepath)])
        .catch(() => false)
        .then(success => {
          console.log(CLEARLINE + '  ' + (success ? CHECK : X)
            + ' ' + filepath);
          return prevSuccess && success;
        });
    }
    return prevSuccess;
  }), Promise.resolve(true));
}

// Filepath

function srcPath(filepath) {
  return resolvePath(srcDir, filepath);
}

// Predicates

function isJS(filepath) {
  return filepath.indexOf('.js') === filepath.length - 3;
}

function allTests(filepaths) {
  return filepaths.length > 0 && filepaths.every(isTest);
}

var TEST_PATH_RX = /^(?:.*?\/)?__tests__\/.+?-test\.js$/;

function isTest(filepath) {
  return TEST_PATH_RX.test(filepath);
}

// Print helpers

var CLEARSCREEN = '\u001b[2J';
var CLEARLINE = '\r\x1B[K';
var CHECK = green('\u2713');
var X = red('\u2718');

function invert(str) {
  return `\u001b[7m ${str} \u001b[27m`;
}

function red(str) {
  return `\x1B[K\u001b[1m\u001b[31m${str}\u001b[39m\u001b[22m`;
}

function green(str) {
  return `\x1B[K\u001b[1m\u001b[32m${str}\u001b[39m\u001b[22m`;
}

function yellow(str) {
  return `\x1B[K\u001b[1m\u001b[33m${str}\u001b[39m\u001b[22m`;
}
