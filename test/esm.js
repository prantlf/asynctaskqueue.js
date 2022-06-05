import test from '../node_modules/tehanu/dist/suite.min.mjs?name=AsyncTaskQueue'
import '../node_modules/tehanu-repo-tape/dist/index.min.mjs'
import { strictEqual } from '../node_modules/tehanu-teas/dist/index.min.mjs'
import '../node_modules/underscore/underscore-umd-min.js'
import '../node_modules/jquery//dist/jquery.min.js'
import '../asynctaskqueue-min.js'

const { Task } = AsyncTaskQueue.prototype

test('constructor', function() {
  const worker = function () {}
  const task = new Task(worker)
  strictEqual(task.worker, worker, 'worker should be stored')
})

test('promise', function() {
  const task = new Task(function () {})
  const promise = task.promise()
  strictEqual(promise.state(), 'pending', 'promise should be pending initially')
  task.deferred.resolve()
  strictEqual(promise.state(), 'resolved', 'earlier promise should be resolved')
  strictEqual(task.promise().state(), 'resolved', 'new promise should be resolved')
})
