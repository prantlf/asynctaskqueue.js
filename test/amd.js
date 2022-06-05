require.config({
  paths: {
    tehanu: '../node_modules/tehanu/dist/index.min',
    tape: '../node_modules/tehanu-repo-tape/dist/index.min',
    teas: '../node_modules/tehanu-teas/dist/index.min',
    underscore: '../node_modules/underscore/underscore-umd-min',
    jquery: '../node_modules/jquery//dist/jquery.min',
    asynctaskqueue: '../asynctaskqueue-min'
  },
  deps: ['tehanu', 'teas', 'asynctaskqueue', 'tape'],
  callback: ({ factory, run }, { strictEqual }, AsyncTaskQueue, reporter) => {
    const test = factory('AsyncTaskQueue AMD')

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

    run({ reporter })
  }
})
