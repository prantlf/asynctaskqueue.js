(() => {
  const test = tehanu('AsyncTaskQueue')
  const { strictEqual } = tehanuTeas

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
})()
